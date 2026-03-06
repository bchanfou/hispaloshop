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

# Canonical influencer tier ladder for both modern and legacy APIs.
# Amounts are expressed in cents where applicable.
INFLUENCER_TIER_CONFIG = {
    "perseo": {"min_gmv_cents": 0, "commission_bps": 300, "name": "Perseo", "commission_rate": 0.03},
    "aquiles": {"min_gmv_cents": 50_000, "commission_bps": 400, "name": "Aquiles", "commission_rate": 0.04},
    "hercules": {"min_gmv_cents": 200_000, "commission_bps": 500, "name": "Hercules", "commission_rate": 0.05},
    "apolo": {"min_gmv_cents": 750_000, "commission_bps": 600, "name": "Apolo", "commission_rate": 0.06},
    "zeus": {"min_gmv_cents": 2_000_000, "commission_bps": 700, "name": "Zeus", "commission_rate": 0.07},
}

INFLUENCER_TIER_ORDER = ["perseo", "aquiles", "hercules", "apolo", "zeus"]

# Backward-compatible aliases from older 3-tier naming.
INFLUENCER_TIER_ALIASES = {
    "atenea": "hercules",  # legacy 5% tier
    "titan": "zeus",       # legacy 7% tier
    "HERCULES": "perseo",
    "ATENEA": "hercules",
    "TITAN": "zeus",
}


def normalize_influencer_tier(tier: str | None) -> str:
    if not tier:
        return "perseo"
    normalized = INFLUENCER_TIER_ALIASES.get(tier, tier).lower()
    return normalized if normalized in INFLUENCER_TIER_CONFIG else "perseo"
