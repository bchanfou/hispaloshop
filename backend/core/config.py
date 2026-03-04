"""
Configuration — all values from environment variables.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database
# Provide safe local defaults so the API can boot in dev/CI when env vars are missing.
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hispaloshop')

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
