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
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION', '0.20'))

# Email configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Supported languages and countries
SUPPORTED_LANGUAGES = {
    'es': 'Español',
    'en': 'English',
    'fr': 'Français',
    'de': 'Deutsch',
    'pt': 'Português',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'ru': 'Русский'
}

TRANSLATION_LANGUAGES = ['es', 'en', 'fr', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'ru']

SUPPORTED_COUNTRIES = {
    'ES': {'name': 'Spain', 'currency': 'EUR', 'language': 'es'},
    'US': {'name': 'United States', 'currency': 'USD', 'language': 'en'},
    'GB': {'name': 'United Kingdom', 'currency': 'GBP', 'language': 'en'},
    'FR': {'name': 'France', 'currency': 'EUR', 'language': 'fr'},
    'DE': {'name': 'Germany', 'currency': 'EUR', 'language': 'de'},
    'IT': {'name': 'Italy', 'currency': 'EUR', 'language': 'it'},
    'PT': {'name': 'Portugal', 'currency': 'EUR', 'language': 'pt'},
    'MX': {'name': 'Mexico', 'currency': 'MXN', 'language': 'es'},
    'AR': {'name': 'Argentina', 'currency': 'ARS', 'language': 'es'},
    'CO': {'name': 'Colombia', 'currency': 'COP', 'language': 'es'},
    'CL': {'name': 'Chile', 'currency': 'CLP', 'language': 'es'},
    'BR': {'name': 'Brazil', 'currency': 'BRL', 'language': 'pt'},
    'JP': {'name': 'Japan', 'currency': 'JPY', 'language': 'ja'},
    'KR': {'name': 'South Korea', 'currency': 'KRW', 'language': 'ko'},
    'CN': {'name': 'China', 'currency': 'CNY', 'language': 'zh'},
    'IN': {'name': 'India', 'currency': 'INR', 'language': 'hi'},
    'AE': {'name': 'United Arab Emirates', 'currency': 'AED', 'language': 'ar'},
    'SA': {'name': 'Saudi Arabia', 'currency': 'SAR', 'language': 'ar'},
    'RU': {'name': 'Russia', 'currency': 'RUB', 'language': 'ru'},
    'CA': {'name': 'Canada', 'currency': 'CAD', 'language': 'en'},
    'AU': {'name': 'Australia', 'currency': 'AUD', 'language': 'en'}
}

SUPPORTED_CURRENCIES = {
    'EUR': {'symbol': '€', 'name': 'Euro'},
    'USD': {'symbol': '$', 'name': 'US Dollar'},
    'GBP': {'symbol': '£', 'name': 'British Pound'},
    'MXN': {'symbol': '$', 'name': 'Mexican Peso'},
    'ARS': {'symbol': '$', 'name': 'Argentine Peso'},
    'COP': {'symbol': '$', 'name': 'Colombian Peso'},
    'CLP': {'symbol': '$', 'name': 'Chilean Peso'},
    'BRL': {'symbol': 'R$', 'name': 'Brazilian Real'},
    'JPY': {'symbol': '¥', 'name': 'Japanese Yen'},
    'KRW': {'symbol': '₩', 'name': 'South Korean Won'},
    'CNY': {'symbol': '¥', 'name': 'Chinese Yuan'},
    'INR': {'symbol': '₹', 'name': 'Indian Rupee'},
    'AED': {'symbol': 'د.إ', 'name': 'UAE Dirham'},
    'SAR': {'symbol': '﷼', 'name': 'Saudi Riyal'},
    'RUB': {'symbol': '₽', 'name': 'Russian Ruble'},
    'CAD': {'symbol': '$', 'name': 'Canadian Dollar'},
    'AUD': {'symbol': '$', 'name': 'Australian Dollar'}
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
