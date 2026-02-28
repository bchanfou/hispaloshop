"""
Configuration — all values from environment variables.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# API Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Email
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://www.hispaloshop.com')

# Platform
PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION', '0.20'))

# CORS
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
