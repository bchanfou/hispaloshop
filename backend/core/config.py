"""
Configuration — Pydantic v2 Settings con validaciones estrictas.
Fase 0: Eliminados todos los defaults inseguros.
"""
import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    """Configuracion validada en startup. Falla fast si faltan vars criticas."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
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
    # PAGOS - Stripe obligatorio
    # ============================================
    STRIPE_SECRET_KEY: str = Field(...)
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
    EMAIL_FROM: str = Field(default="Hispaloshop <onboarding@resend.dev>")
    FRONTEND_URL: str = Field(default="https://www.hispaloshop.com")
    
    # ============================================
    # PLATAFORMA
    # ============================================
    PLATFORM_COMMISSION: float = Field(default=0.20)
    
    # ============================================
    # EMERGENT LLM (para AI features)
    # ============================================
    EMERGENT_LLM_KEY: Optional[str] = Field(default=None)
    
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
        """STRIPE_SECRET_KEY debe empezar con sk_test_ o sk_live_"""
        if not v:
            raise ValueError("STRIPE_SECRET_KEY es obligatoria")
        if not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError("STRIPE_SECRET_KEY debe empezar con sk_test_ o sk_live_")
        return v


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
PLATFORM_COMMISSION = settings.PLATFORM_COMMISSION
EMERGENT_LLM_KEY = settings.EMERGENT_LLM_KEY
