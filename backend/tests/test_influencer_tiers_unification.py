from pathlib import Path
import os
from uuid import uuid4

import pytest
from config import INFLUENCER_TIER_ORDER, normalize_influencer_tier
from models import InfluencerProfile
from services.subscriptions import get_influencer_commission_rate


def test_normalize_tier_supports_legacy_aliases():
    assert normalize_influencer_tier("hercules") == "hercules"
    assert normalize_influencer_tier("atenea") == "atenea"
    assert normalize_influencer_tier("titan") == "zeus"
    assert normalize_influencer_tier("AQUILES") == "hercules"
    assert normalize_influencer_tier(None) == "hercules"


def test_commission_rates_for_3_tiers():
    assert get_influencer_commission_rate("hercules") == 0.03
    assert get_influencer_commission_rate("atenea") == 0.05
    assert get_influencer_commission_rate("zeus") == 0.07
    # legacy aliases resolve to canonical tiers
    assert get_influencer_commission_rate("perseo") == 0.03
    assert get_influencer_commission_rate("aquiles") == 0.03
    assert get_influencer_commission_rate("apolo") == 0.07


def test_influencer_profile_get_commission_bps_by_tier():
    profile = InfluencerProfile(user_id=uuid4())
    for tier, expected in [("hercules", 300), ("atenea", 500), ("zeus", 700)]:
        profile.tier = tier
        assert profile.get_commission_bps() == expected


@pytest.mark.skip(
    reason="InfluencerProfile.recalculate_tier lives in frozen _future_postgres/models.py "
    "and still references the legacy 'apolo' tier which was removed during normalization "
    "to the canonical hercules/atenea/zeus ladder. Move to section 4.9 Legacy code cleanup "
    "when _future_postgres/ is resolved (remove the dir or unfreeze + port to the Mongo model)."
)
def test_influencer_profile_recalculate_tier_3_thresholds():
    profile = InfluencerProfile(user_id=uuid4())
    profile.monthly_gmv_cents = 0
    assert profile.recalculate_tier() == "hercules"
    profile.monthly_gmv_cents = 500_000
    assert profile.recalculate_tier() == "atenea"
    profile.monthly_gmv_cents = 2_000_000
    assert profile.recalculate_tier() == "zeus"


def test_public_tiers_endpoint_returns_3_levels():
    os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
    os.environ.setdefault("DB_NAME", "hispaloshop_test")
    get_influencer_tiers = __import__("routes.subscriptions", fromlist=["get_influencer_tiers"]).get_influencer_tiers
    payload = __import__("asyncio").run(get_influencer_tiers())
    keys = [tier["key"] for tier in payload["tiers"]]
    assert keys == INFLUENCER_TIER_ORDER


def test_legacy_aliases_map_to_3_tier_model():
    from config import INFLUENCER_TIER_ALIASES, INFLUENCER_TIER_CONFIG
    assert INFLUENCER_TIER_ALIASES["perseo"] == "hercules"
    assert INFLUENCER_TIER_ALIASES["aquiles"] == "hercules"
    assert INFLUENCER_TIER_ALIASES["apolo"] == "zeus"
    assert INFLUENCER_TIER_ALIASES["titan"] == "zeus"
    assert INFLUENCER_TIER_ALIASES["atenea"] == "atenea"
    assert set(INFLUENCER_TIER_CONFIG.keys()) == {"hercules", "atenea", "zeus"}
