"""
Core configuration and database setup for Hispaloshop backend.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

# Logger setup
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys and Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION', '0.20'))

# Email configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Supported languages and countries — import from central constants
from core.constants import (
    SUPPORTED_LANGUAGES as _LANGS,
    SUPPORTED_COUNTRIES as _COUNTRIES,
    SUPPORTED_CURRENCIES as _CURRENCIES,
    TRANSLATION_LANGUAGES,
)

SUPPORTED_LANGUAGES = {code: info["native"] for code, info in _LANGS.items()}

# Derive legacy format from central constants (backwards compat)
SUPPORTED_COUNTRIES = {
    code: {"name": info["name"], "currency": info["currency"], "language": info["languages"][0]}
    for code, info in _COUNTRIES.items()
}

SUPPORTED_CURRENCIES = {
    code: {"symbol": info["symbol"], "name": info["name"]}
    for code, info in _CURRENCIES.items()
}

# Exchange rates (base: EUR)
EXCHANGE_RATES = {
    'EUR': 1.0,
    'USD': 1.08,
    'GBP': 0.85,
    'MXN': 18.5,
    'ARS': 950.0,
    'COP': 4200.0,
    'CLP': 1000.0,
    'BRL': 5.3,
    'JPY': 162.0,
    'KRW': 1420.0,
    'CNY': 7.8,
    'INR': 90.0,
    'AED': 4.0,
    'SAR': 4.05,
    'RUB': 100.0,
    'CAD': 1.47,
    'AUD': 1.65
}
