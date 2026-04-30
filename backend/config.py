from decimal import Decimal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from pydantic import Field, validator
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/hispaloshop"

    JWT_SECRET: str = Field(
        default=None,
        env="JWT_SECRET"
    )
    JWT_ALGORITHM: str = "HS256"
    
    @validator('JWT_SECRET', pre=True, always=True)
    def validate_jwt_secret(cls, v):
        if not v or v == "your-secret-key-change-in-production":
            raise ValueError(
                "JWT_SECRET must be set in environment variables. "
                "Generate with: openssl rand -hex 32"
            )
        return v

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_CONNECT_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_ELITE: str = ""
    STRIPE_PRICE_PRO_ANNUAL: str = ""
    STRIPE_PRICE_ELITE_ANNUAL: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    # Used for generating affiliate redirect links (/r/{code})
    BACKEND_URL: str | None = None

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    FIREBASE_CREDENTIALS: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_ORG_ID: str = ""

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None

    AFFILIATE_ATTRIBUTION_DAYS: int = 548
    AFFILIATE_COOKIE_NAME: str = "hispaloshop_ref"
    AFFILIATE_MIN_PAYOUT_CENTS: int = 1000
    TIER_RECALCULATION_DAY: int = 1

    # Resolve env file relative to this module so scripts work from any CWD.
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).with_name(".env")),
        extra='ignore'  # Allow extra env vars for backwards compatibility
    )


settings = Settings()

# ── HARDCODED DEFAULTS (Overridable via DB) ──────────────────────────────

COMMISSION_RATES_DEFAULTS = {
    "FREE": Decimal("0.20"),
    "PRO": Decimal("0.18"),
    "ELITE": Decimal("0.17"),
}

INFLUENCER_TIER_RATES_DEFAULTS = {
    "hercules": Decimal("0.03"),
    "atenea": Decimal("0.05"),
    "zeus": Decimal("0.07"),
}

# Canonical simplified influencer ladder used by the active Mongo runtime.
# Amounts are expressed in cents where applicable.
INFLUENCER_TIER_CONFIG_DEFAULTS = {
    "hercules": {
        "min_gmv_cents": 0,
        "min_followers": 0,
        "commission_bps": 300,
        "name": "Hercules",
        "commission_rate": 0.03,
    },
    "atenea": {
        "min_gmv_cents": 500_000,
        "min_followers": 2_500,
        "commission_bps": 500,
        "name": "Atenea",
        "commission_rate": 0.05,
    },
    "zeus": {
        "min_gmv_cents": 2_000_000,
        "min_followers": 10_000,
        "commission_bps": 700,
        "name": "Zeus",
        "commission_rate": 0.07,
    },
}

# Backward-compatibility alias (existing code imports INFLUENCER_TIER_CONFIG)
INFLUENCER_TIER_CONFIG = INFLUENCER_TIER_CONFIG_DEFAULTS

# ── Platform-wide plans configuration defaults ───────────────────────────

PLANS_CONFIG_DEFAULTS = {
    "seller_plans": {
        "FREE": {
            "commission_rate": 0.20,
            "price_monthly_eur": 0,
            "price_annual_eur": 0,
            "shipping_base_cents": 590,
            "shipping_free_threshold_cents": None,
            "label": "Free",
        },
        "PRO": {
            "commission_rate": 0.18,
            "price_monthly_eur": 79,
            "price_annual_eur": 806,
            "shipping_base_cents": 390,
            "shipping_free_threshold_cents": 3000,
            "label": "Pro",
        },
        "ELITE": {
            "commission_rate": 0.17,
            "price_monthly_eur": 249,
            "price_annual_eur": 2540,
            "shipping_base_cents": 290,
            "shipping_free_threshold_cents": 2000,
            "label": "Elite",
        },
    },
    "influencer_tiers": {
        "hercules": {"commission_rate": 0.03, "label": "Hercules"},
        "atenea": {"commission_rate": 0.05, "label": "Atenea"},
        "zeus": {"commission_rate": 0.07, "label": "Zeus"},
    },
    "first_purchase_discount_pct": 10,
    "attribution_months": 18,
    "influencer_coupon_stackable": False,
}

# ── Unified in-memory cache (5-min TTL, refreshed on demand) ─────────────

_plans_cache: dict = {"data": None, "fetched_at": None}


async def get_plans_config(db=None, fresh: bool = False) -> dict:
    """
    Get plans configuration from DB (if available) or defaults.

    Args:
        db: MongoDB connection (optional).
        fresh: Force fetch from DB even if cache is still warm.

    Returns:
        Plans config dict with seller_plans, influencer_tiers, etc.
    """
    import copy
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    cache = _plans_cache

    if not fresh and cache["data"] is not None and cache["fetched_at"] is not None:
        age_seconds = (now - cache["fetched_at"]).total_seconds()
        if age_seconds < 300:
            return copy.deepcopy(cache["data"])

    result = copy.deepcopy(PLANS_CONFIG_DEFAULTS)

    if db is not None:
        try:
            db_config = await db.plans_config.find_one({"_id": "current"}, {"_id": 0})
            if db_config:
                for plan_name, db_plan in db_config.get("seller_plans", {}).items():
                    if plan_name in result["seller_plans"]:
                        result["seller_plans"][plan_name].update(db_plan)
                for tier_name, db_tier in db_config.get("influencer_tiers", {}).items():
                    if tier_name in result["influencer_tiers"]:
                        result["influencer_tiers"][tier_name].update(db_tier)
                for key in ("first_purchase_discount_pct", "attribution_months", "influencer_coupon_stackable"):
                    if key in db_config:
                        result[key] = db_config[key]
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("[PLANS] Could not read DB config, using defaults: %s", exc)

    cache["data"] = result
    cache["fetched_at"] = now
    return copy.deepcopy(result)


def invalidate_plans_cache() -> None:
    """Invalidate the plans cache so the next call fetches fresh data."""
    _plans_cache["data"] = None
    _plans_cache["fetched_at"] = None

INFLUENCER_TIER_ORDER = ["hercules", "atenea", "zeus"]

# Legacy aliases from older ladders collapse into the 3-tier model.
INFLUENCER_TIER_ALIASES = {
    "perseo": "hercules",
    "aquiles": "hercules",
    "artemisa": "atenea",
    "apolo": "zeus",
    "titan": "zeus",
    "atenea": "atenea",
    "hercules": "hercules",
    "zeus": "zeus",
    "HERCULES": "hercules",
    "ATENEA": "atenea",
    "ZEUS": "zeus",
}


def normalize_influencer_tier(tier: str | None, commission_rate: float | None = None) -> str:
    if commission_rate is not None:
        try:
            rate = float(commission_rate)
        except (TypeError, ValueError):
            rate = None
        if rate is not None:
            if rate >= 0.07:
                return "zeus"
            if rate >= 0.05:
                return "atenea"
            return "hercules"

    if not tier:
        return "hercules"

    normalized = INFLUENCER_TIER_ALIASES.get(tier, str(tier).lower()).lower()
    return normalized if normalized in INFLUENCER_TIER_CONFIG else "hercules"
