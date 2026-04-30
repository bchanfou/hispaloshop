"""
Unit tests for the unified plans config in backend/config.py.

Tests cover:
- Default values returned when no DB is available
- Cache warm/cold paths
- Cache invalidation
- normalize_influencer_tier helper
- Backward-compatibility aliases (COMMISSION_RATES, INFLUENCER_TIER_RATES)
"""
import copy
import pytest

from config import (
    COMMISSION_RATES_DEFAULTS,
    INFLUENCER_TIER_RATES_DEFAULTS,
    INFLUENCER_TIER_CONFIG_DEFAULTS,
    INFLUENCER_TIER_CONFIG,  # backward-compat alias
    PLANS_CONFIG_DEFAULTS,
    _plans_cache,
    get_plans_config,
    invalidate_plans_cache,
    normalize_influencer_tier,
)
from core.monetization import COMMISSION_RATES, INFLUENCER_TIER_RATES


# ── COMMISSION_RATES_DEFAULTS ─────────────────────────────────

def test_commission_rates_defaults_values():
    from decimal import Decimal
    assert COMMISSION_RATES_DEFAULTS["FREE"] == Decimal("0.20")
    assert COMMISSION_RATES_DEFAULTS["PRO"] == Decimal("0.18")
    assert COMMISSION_RATES_DEFAULTS["ELITE"] == Decimal("0.17")


def test_influencer_tier_rates_defaults_values():
    from decimal import Decimal
    assert INFLUENCER_TIER_RATES_DEFAULTS["hercules"] == Decimal("0.03")
    assert INFLUENCER_TIER_RATES_DEFAULTS["atenea"] == Decimal("0.05")
    assert INFLUENCER_TIER_RATES_DEFAULTS["zeus"] == Decimal("0.07")


# ── Backward-compatibility aliases ───────────────────────────

def test_monetization_commission_rates_alias():
    """COMMISSION_RATES in core.monetization is the same object as COMMISSION_RATES_DEFAULTS."""
    assert COMMISSION_RATES is COMMISSION_RATES_DEFAULTS


def test_monetization_influencer_tier_rates_alias():
    """INFLUENCER_TIER_RATES in core.monetization is the same object as INFLUENCER_TIER_RATES_DEFAULTS."""
    assert INFLUENCER_TIER_RATES is INFLUENCER_TIER_RATES_DEFAULTS


def test_influencer_tier_config_backward_compat():
    """INFLUENCER_TIER_CONFIG is an alias for INFLUENCER_TIER_CONFIG_DEFAULTS."""
    assert INFLUENCER_TIER_CONFIG is INFLUENCER_TIER_CONFIG_DEFAULTS


def test_influencer_tier_config_has_commission_bps():
    """Backward-compat: commission_bps present for code that reads it."""
    assert INFLUENCER_TIER_CONFIG_DEFAULTS["hercules"]["commission_bps"] == 300
    assert INFLUENCER_TIER_CONFIG_DEFAULTS["atenea"]["commission_bps"] == 500
    assert INFLUENCER_TIER_CONFIG_DEFAULTS["zeus"]["commission_bps"] == 700


# ── PLANS_CONFIG_DEFAULTS ─────────────────────────────────────

def test_plans_config_defaults_structure():
    assert "seller_plans" in PLANS_CONFIG_DEFAULTS
    assert "influencer_tiers" in PLANS_CONFIG_DEFAULTS
    assert "first_purchase_discount_pct" in PLANS_CONFIG_DEFAULTS
    assert "attribution_months" in PLANS_CONFIG_DEFAULTS


def test_plans_config_defaults_seller_plans():
    plans = PLANS_CONFIG_DEFAULTS["seller_plans"]
    assert plans["FREE"]["commission_rate"] == 0.20
    assert plans["PRO"]["commission_rate"] == 0.18
    assert plans["ELITE"]["commission_rate"] == 0.17


def test_plans_config_defaults_influencer_tiers():
    tiers = PLANS_CONFIG_DEFAULTS["influencer_tiers"]
    assert tiers["hercules"]["commission_rate"] == 0.03
    assert tiers["atenea"]["commission_rate"] == 0.05
    assert tiers["zeus"]["commission_rate"] == 0.07


# ── get_plans_config (no DB) ──────────────────────────────────

@pytest.mark.asyncio
async def test_get_plans_config_returns_defaults_without_db():
    """When no DB is given, returns hardcoded defaults."""
    invalidate_plans_cache()
    config = await get_plans_config(db=None)

    assert config["seller_plans"]["FREE"]["commission_rate"] == 0.20
    assert config["seller_plans"]["PRO"]["commission_rate"] == 0.18
    assert config["seller_plans"]["ELITE"]["commission_rate"] == 0.17
    assert config["influencer_tiers"]["hercules"]["commission_rate"] == 0.03
    assert config["influencer_tiers"]["atenea"]["commission_rate"] == 0.05
    assert config["influencer_tiers"]["zeus"]["commission_rate"] == 0.07
    assert config["first_purchase_discount_pct"] == 10
    assert config["attribution_months"] == 18


@pytest.mark.asyncio
async def test_get_plans_config_returns_deep_copies():
    """Mutating the returned dict must not corrupt the cache."""
    invalidate_plans_cache()
    config1 = await get_plans_config(db=None)
    config1["seller_plans"]["FREE"]["commission_rate"] = 0.99

    invalidate_plans_cache()
    config2 = await get_plans_config(db=None)
    assert config2["seller_plans"]["FREE"]["commission_rate"] == 0.20


@pytest.mark.asyncio
async def test_get_plans_config_caches_result():
    """Second call returns identical values (from cache) without hitting DB."""
    invalidate_plans_cache()
    config1 = await get_plans_config(db=None)
    config2 = await get_plans_config(db=None)
    assert config1 == config2
    assert config1 is not config2  # deep copies, not the same object


# ── invalidate_plans_cache ────────────────────────────────────

def test_invalidate_plans_cache_clears_data():
    _plans_cache["data"] = {"some": "data"}
    _plans_cache["fetched_at"] = "something"
    invalidate_plans_cache()
    assert _plans_cache["data"] is None
    assert _plans_cache["fetched_at"] is None


# ── get_plans_config with DB override ────────────────────────

@pytest.mark.asyncio
async def test_get_plans_config_merges_db_overrides():
    """DB overrides are merged on top of defaults."""
    invalidate_plans_cache()

    class _FakeCollection:
        async def find_one(self, *args, **kwargs):
            return {
                "seller_plans": {
                    "PRO": {"commission_rate": 0.15}
                }
            }

    class _FakeDB:
        plans_config = _FakeCollection()

    config = await get_plans_config(db=_FakeDB(), fresh=True)
    assert config["seller_plans"]["PRO"]["commission_rate"] == 0.15
    # Other plans unchanged
    assert config["seller_plans"]["FREE"]["commission_rate"] == 0.20
    assert config["seller_plans"]["ELITE"]["commission_rate"] == 0.17


@pytest.mark.asyncio
async def test_get_plans_config_db_error_falls_back_to_defaults():
    """If DB raises, defaults are returned and no exception propagates."""
    invalidate_plans_cache()

    class _BadCollection:
        async def find_one(self, *args, **kwargs):
            raise RuntimeError("DB unavailable")

    class _BadDB:
        plans_config = _BadCollection()

    config = await get_plans_config(db=_BadDB(), fresh=True)
    assert config["seller_plans"]["FREE"]["commission_rate"] == 0.20


@pytest.mark.asyncio
async def test_get_plans_config_fresh_bypasses_cache():
    """fresh=True forces a DB fetch even if cache is warm."""
    invalidate_plans_cache()

    call_count = {"n": 0}

    class _CountingCollection:
        async def find_one(self, *args, **kwargs):
            call_count["n"] += 1
            return None

    class _CountingDB:
        plans_config = _CountingCollection()

    await get_plans_config(db=_CountingDB())
    assert call_count["n"] == 1

    await get_plans_config(db=_CountingDB())  # should hit cache
    assert call_count["n"] == 1

    await get_plans_config(db=_CountingDB(), fresh=True)  # force refresh
    assert call_count["n"] == 2


# ── normalize_influencer_tier ─────────────────────────────────

def test_normalize_influencer_tier_canonical():
    assert normalize_influencer_tier("hercules") == "hercules"
    assert normalize_influencer_tier("atenea") == "atenea"
    assert normalize_influencer_tier("zeus") == "zeus"


def test_normalize_influencer_tier_legacy_aliases():
    assert normalize_influencer_tier("perseo") == "hercules"
    assert normalize_influencer_tier("aquiles") == "hercules"
    assert normalize_influencer_tier("artemisa") == "atenea"
    assert normalize_influencer_tier("apolo") == "zeus"
    assert normalize_influencer_tier("titan") == "zeus"


def test_normalize_influencer_tier_uppercase_aliases():
    assert normalize_influencer_tier("HERCULES") == "hercules"
    assert normalize_influencer_tier("ATENEA") == "atenea"
    assert normalize_influencer_tier("ZEUS") == "zeus"


def test_normalize_influencer_tier_none_returns_hercules():
    assert normalize_influencer_tier(None) == "hercules"


def test_normalize_influencer_tier_unknown_returns_hercules():
    assert normalize_influencer_tier("unknown_tier") == "hercules"


def test_normalize_influencer_tier_by_commission_rate():
    assert normalize_influencer_tier(None, commission_rate=0.03) == "hercules"
    assert normalize_influencer_tier(None, commission_rate=0.05) == "atenea"
    assert normalize_influencer_tier(None, commission_rate=0.07) == "zeus"
    assert normalize_influencer_tier(None, commission_rate=0.08) == "zeus"
    assert normalize_influencer_tier(None, commission_rate=0.04) == "hercules"
    # Exact boundary: 0.05 → atenea, 0.06 → atenea, just below 0.07 → atenea
    assert normalize_influencer_tier(None, commission_rate=0.06) == "atenea"
    assert normalize_influencer_tier(None, commission_rate=0.0699) == "atenea"
    # Just below 0.05 → hercules
    assert normalize_influencer_tier(None, commission_rate=0.0499) == "hercules"
