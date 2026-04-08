"""
Configuration — Pydantic v2 Settings con validaciones estrictas.
Fase 0: Eliminados todos los defaults inseguros.
"""
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


_CURRENT_FILE = Path(__file__).resolve()
_BACKEND_DIR = _CURRENT_FILE.parents[1]
_REPO_ROOT = _CURRENT_FILE.parents[2]


class Settings(BaseSettings):
    """Configuracion validada en startup. Falla fast si faltan vars criticas."""
    
    model_config = SettingsConfigDict(
        # Soporta arranque desde la raiz del repo o desde /backend.
        env_file=(
            str(_REPO_ROOT / ".env"),
            str(_BACKEND_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra='ignore'  # Permitir variables extra en .env (ej: PORT)
    )
    
    # ============================================
    # SEGURIDAD - SIN DEFAULTS INSEGUROS
    # ============================================
    JWT_SECRET: str = Field(...)
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    
    # ============================================
    # BASE DE DATOS - MongoDB unica fuente de verdad
    # ============================================
    MONGO_URL: str = Field(...)
    DB_NAME: str = Field(default="hispaloshop")
    
    # ============================================
    # PAGOS - Stripe opcional en startup; requerido para checkout y payouts
    # ============================================
    STRIPE_SECRET_KEY: str = Field(default="")
    STRIPE_WEBHOOK_SECRET: str = Field(default="")
    STRIPE_PUBLISHABLE_KEY: str = Field(default="")
    
    # ============================================
    # CONFIGURACION GENERAL
    # ============================================
    ENV: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    PORT: int = Field(default=8000)  # Puerto para el servidor
    
    # ============================================
    # CORS - explicito, no wildcard en produccion
    # ============================================
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173"
    )
    
    # ============================================
    # REDIS (opcional para MVP)
    # ============================================
    REDIS_URL: Optional[str] = Field(default=None)
    
    # ============================================
    # CLOUDINARY (para imagenes) - opcional
    # ============================================
    CLOUDINARY_CLOUD_NAME: Optional[str] = Field(default=None)
    CLOUDINARY_API_KEY: Optional[str] = Field(default=None)
    CLOUDINARY_API_SECRET: Optional[str] = Field(default=None)
    
    # ============================================
    # EMAIL
    # ============================================
    RESEND_API_KEY: Optional[str] = Field(default=None)
    EMAIL_FROM: str = Field(default="Hispaloshop <noreply@hispaloshop.com>")
    FRONTEND_URL: str = Field(default="https://www.hispaloshop.com")
    AUTH_BACKEND_URL: str = Field(default="http://localhost:8000")
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    
    # ============================================
    # APPLE SIGN IN
    # ============================================
    APPLE_CLIENT_ID: Optional[str] = Field(default=None)  # App Bundle ID or Service ID
    APPLE_TEAM_ID: Optional[str] = Field(default=None)    # Apple Developer Team ID
    APPLE_KEY_ID: Optional[str] = Field(default=None)     # Private Key ID
    APPLE_PRIVATE_KEY: Optional[str] = Field(default=None)  # Private Key content (PEM)
    
    # ============================================
    # PLATAFORMA
    # ============================================
    PLATFORM_COMMISSION: float = Field(default=0.20)
    
    # ============================================
    # OPENAI (para embeddings y recomendaciones)
    # ============================================
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    OPENAI_ORG_ID: Optional[str] = Field(default=None)

    # ============================================
    # GOOGLE CLOUD TRANSLATION
    # ============================================
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = Field(default=None)

    # ============================================
    # ANTHROPIC (Claude — AI assistants David/Rebeca/Pedro/Commercial)
    # ============================================
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    HISPAL_AI_MODEL: str = Field(default="claude-haiku-4-5-20251001")
    HISPAL_AI_RATE_LIMIT_RPM: int = Field(default=20)
    COMMERCIAL_AI_MODEL: str = Field(default="claude-sonnet-4-6")
    REBECA_AI_MODEL: str = Field(default="claude-haiku-4-5-20251001")

    # ============================================
    # FCM (Firebase Cloud Messaging — push notifications)
    # JSON-encoded service account credentials.
    # ============================================
    FCM_SERVICE_ACCOUNT_JSON: Optional[str] = Field(default=None)

    # ============================================
    # WEB PUSH (VAPID keys — generate with `npx web-push generate-vapid-keys`)
    # VAPID_PUBLIC_KEY must also be exposed to frontend as REACT_APP_VAPID_PUBLIC_KEY.
    # VAPID_PRIVATE_KEY must stay backend-only.
    # ============================================
    VAPID_PUBLIC_KEY: Optional[str] = Field(default=None)
    VAPID_PRIVATE_KEY: Optional[str] = Field(default=None)
    VAPID_EMAIL: str = Field(default="mailto:admin@hispaloshop.com")

    # ============================================
    # CHAT ENCRYPTION (AES-256-GCM, 32-byte hex key)
    # Generate with: openssl rand -hex 32
    # ============================================
    CHAT_ENCRYPTION_KEY: Optional[str] = Field(default=None)

    # ============================================
    # STRIPE BILLING (separate webhook for subscription events)
    # ============================================
    STRIPE_BILLING_WEBHOOK_SECRET: Optional[str] = Field(default=None)

    # ============================================
    # BACKEND URL (public URL of this API — used in emails and webhooks)
    # Alias: AUTH_BACKEND_URL (legacy name, still accepted for backward compat)
    # Priority: BACKEND_URL → AUTH_BACKEND_URL → default
    # ============================================
    BACKEND_URL: Optional[str] = Field(default=None)

    # ============================================
    # MONITORING — Sentry error tracking
    # ============================================
    SENTRY_DSN: Optional[str] = Field(default=None)
    SENTRY_RELEASE: Optional[str] = Field(default=None)  # git SHA preferred
    SENTRY_TRACES_RATE: float = Field(default=0.1)

    # ============================================
    # OBSERVABILITY — structured logging
    # Values: DEBUG | INFO | WARNING | ERROR | CRITICAL
    # ============================================
    LOG_LEVEL: str = Field(default="INFO")

    # ============================================
    # CRON ADMIN TOKEN (long-lived admin JWT for GitHub Actions crons)
    # Stored as GH Actions secret, passed as Bearer token to /api/admin/cron/*
    # ============================================
    CRON_ADMIN_TOKEN: Optional[str] = Field(default=None)

    # ============================================
    # CSRF
    # ============================================
    CSRF_ENABLED: bool = Field(default=True)
    
    # ============================================
    # VALIDADORES
    # ============================================
    
    @field_validator('JWT_SECRET')
    @classmethod
    def validate_jwt_secret(cls, v, info):
        """JWT_SECRET debe ser seguro (>=32 chars)"""
        if not v or len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        
        # Solo validar valores de ejemplo en produccion
        env = info.data.get('ENV', 'development')
        if env == 'production':
            forbidden = ["your-secret-key", "change-me", "secret123", "test123", "password", "123456", "jwt-secret"]
            if any(forbidden_val in v.lower() for forbidden_val in forbidden):
                raise ValueError("JWT_SECRET no puede contener valores de ejemplo conocidos en produccion")
        
        return v
    
    @field_validator('MONGO_URL')
    @classmethod
    def validate_mongo_url(cls, v):
        """MONGO_URL debe ser una URL valida de MongoDB"""
        if not v:
            raise ValueError("MONGO_URL es obligatoria")
        if not v.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("MONGO_URL debe ser una URL valida de MongoDB (mongodb:// o mongodb+srv://)")
        return v
    
    @field_validator('STRIPE_SECRET_KEY')
    @classmethod
    def validate_stripe_key(cls, v):
        """Permitir vacio para arrancar sin pagos; validar si viene informado."""
        if not v:
            return ""
        if not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError("STRIPE_SECRET_KEY debe empezar con sk_test_ o sk_live_")
        return v

    @field_validator('ALLOWED_ORIGINS')
    @classmethod
    def validate_allowed_origins(cls, v):
        """Normalizar lista csv de origenes permitidos."""
        if not v:
            raise ValueError("ALLOWED_ORIGINS no puede estar vacio")
        origins = [origin.strip().rstrip("/") for origin in v.split(",") if origin.strip()]
        if not origins:
            raise ValueError("ALLOWED_ORIGINS debe contener al menos un origen")
        return ",".join(origins)

    @field_validator('DEBUG', mode='before')
    @classmethod
    def normalize_debug_flag(cls, v):
        """Aceptar flags habituales de despliegue como release/production."""
        if isinstance(v, str):
            normalized = v.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production", ""}:
                return False
        return v

    @field_validator('FRONTEND_URL', 'AUTH_BACKEND_URL')
    @classmethod
    def validate_urls(cls, v):
        if not v:
            raise ValueError("La URL no puede estar vacia")
        if not v.startswith(("http://", "https://")):
            raise ValueError("La URL debe empezar con http:// o https://")
        return v.rstrip("/")

    @field_validator('BACKEND_URL')
    @classmethod
    def validate_backend_url(cls, v):
        """BACKEND_URL es opcional; si viene, debe ser URL valida."""
        if not v:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("BACKEND_URL debe empezar con http:// o https://")
        return v.rstrip("/")

    @field_validator('LOG_LEVEL')
    @classmethod
    def validate_log_level(cls, v):
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        normalized = (v or "INFO").upper()
        if normalized not in valid:
            raise ValueError(f"LOG_LEVEL debe ser uno de {valid}, recibido: {v}")
        return normalized

    @property
    def effective_backend_url(self) -> str:
        """BACKEND_URL si esta seteada, sino AUTH_BACKEND_URL (legacy)."""
        return self.BACKEND_URL or self.AUTH_BACKEND_URL


# Instancia global - falla en import si vars obligatorias no estan
settings = Settings()

# ============================================
# COMPATIBILIDAD HACIA ATRAS
# Variables exportadas para codigo existente
# ============================================
MONGO_URL = settings.MONGO_URL
DB_NAME = settings.DB_NAME
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
STRIPE_SECRET_KEY = settings.STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY = settings.STRIPE_PUBLISHABLE_KEY
STRIPE_API_KEY = settings.STRIPE_SECRET_KEY  # Compatibilidad
ENV = settings.ENV
DEBUG = settings.DEBUG
ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS
CORS_ORIGINS = settings.ALLOWED_ORIGINS  # Compatibilidad
REDIS_URL = settings.REDIS_URL
CLOUDINARY_CLOUD_NAME = settings.CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY = settings.CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET = settings.CLOUDINARY_API_SECRET
RESEND_API_KEY = settings.RESEND_API_KEY
EMAIL_FROM = settings.EMAIL_FROM
FRONTEND_URL = settings.FRONTEND_URL
AUTH_BACKEND_URL = settings.AUTH_BACKEND_URL
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
PLATFORM_COMMISSION = settings.PLATFORM_COMMISSION
OPENAI_API_KEY = settings.OPENAI_API_KEY
OPENAI_ORG_ID = settings.OPENAI_ORG_ID
