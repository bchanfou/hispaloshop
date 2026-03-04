from pathlib import Path
import os
from uuid import uuid4

from config import INFLUENCER_TIER_ORDER, normalize_influencer_tier
from models import InfluencerProfile
from services.subscriptions import get_influencer_commission_rate


def test_normalize_tier_supports_legacy_aliases():
    assert normalize_influencer_tier("hercules") == "hercules"
    assert normalize_influencer_tier("atenea") == "hercules"
    assert normalize_influencer_tier("titan") == "zeus"
    assert normalize_influencer_tier("AQUILES") == "aquiles"
    assert normalize_influencer_tier(None) == "perseo"


def test_commission_rates_for_5_tiers():
    assert get_influencer_commission_rate("perseo") == 0.03
    assert get_influencer_commission_rate("aquiles") == 0.04
    assert get_influencer_commission_rate("hercules") == 0.05
    assert get_influencer_commission_rate("apolo") == 0.06
    assert get_influencer_commission_rate("zeus") == 0.07


def test_influencer_profile_get_commission_bps_by_tier():
    profile = InfluencerProfile(user_id=uuid4())
    for tier, expected in [("perseo", 300), ("aquiles", 400), ("hercules", 500), ("apolo", 600), ("zeus", 700)]:
        profile.tier = tier
        assert profile.get_commission_bps() == expected


def test_influencer_profile_recalculate_tier_5_thresholds():
    profile = InfluencerProfile(user_id=uuid4())
    profile.monthly_gmv_cents = 0
    assert profile.recalculate_tier() == "perseo"
    profile.monthly_gmv_cents = 50_000
    assert profile.recalculate_tier() == "aquiles"
    profile.monthly_gmv_cents = 200_000
    assert profile.recalculate_tier() == "hercules"
    profile.monthly_gmv_cents = 750_000
    assert profile.recalculate_tier() == "apolo"
    profile.monthly_gmv_cents = 2_000_000
    assert profile.recalculate_tier() == "zeus"


def test_public_tiers_endpoint_returns_5_levels():
    os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
    os.environ.setdefault("DB_NAME", "hispaloshop_test")
    get_influencer_tiers = __import__("routes.subscriptions", fromlist=["get_influencer_tiers"]).get_influencer_tiers
    payload = __import__("asyncio").run(get_influencer_tiers())
    keys = [tier["key"] for tier in payload["tiers"]]
    assert keys == INFLUENCER_TIER_ORDER


def test_migration_maps_legacy_tier_values():
    migration = Path("alembic/versions/20260416_0013_unify_influencer_tiers_5_levels.py").read_text(encoding="utf-8")
    assert "WHEN tier IN ('hercules', 'HERCULES') THEN 'perseo'" in migration
    assert "WHEN tier IN ('atenea', 'ATENEA') THEN 'hercules'" in migration
    assert "WHEN tier IN ('titan', 'TITAN') THEN 'zeus'" in migration
