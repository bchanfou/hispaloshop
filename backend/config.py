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

# Canonical simplified influencer ladder used by the active Mongo runtime.
# Amounts are expressed in cents where applicable.
INFLUENCER_TIER_CONFIG = {
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
