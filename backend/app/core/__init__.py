"""
Core module exports.
"""
from .config import (
    db,
    client,
    logger,
    EMERGENT_LLM_KEY,
    STRIPE_API_KEY,
    STRIPE_SECRET_KEY,
    PLATFORM_COMMISSION,
    RESEND_API_KEY,
    EMAIL_FROM,
    FRONTEND_URL,
    SUPPORTED_LANGUAGES,
    TRANSLATION_LANGUAGES,
    SUPPORTED_COUNTRIES,
    SUPPORTED_CURRENCIES,
    EXCHANGE_RATES
)
from .security import (
    hash_password,
    generate_verification_token,
    get_current_user,
    require_role,
    require_super_admin
)
from .email import send_email

__all__ = [
    'db',
    'client', 
    'logger',
    'EMERGENT_LLM_KEY',
    'STRIPE_API_KEY',
    'STRIPE_SECRET_KEY',
    'PLATFORM_COMMISSION',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'FRONTEND_URL',
    'SUPPORTED_LANGUAGES',
    'TRANSLATION_LANGUAGES',
    'SUPPORTED_COUNTRIES',
    'SUPPORTED_CURRENCIES',
    'EXCHANGE_RATES',
    'hash_password',
    'generate_verification_token',
    'get_current_user',
    'require_role',
    'require_super_admin',
    'send_email'
]
