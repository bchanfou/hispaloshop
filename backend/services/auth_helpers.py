"""
Auth helpers: password hashing, verification tokens, email sending.
Shared by server.py and routes/auth.py.
"""
import hashlib
import uuid
import random
import os
import logging
import bcrypt as _bcrypt
import resend
from core.config import settings

logger = logging.getLogger(__name__)

RESEND_API_KEY = settings.RESEND_API_KEY or os.environ.get('RESEND_API_KEY')
EMAIL_FROM = settings.EMAIL_FROM or os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = settings.FRONTEND_URL or os.environ.get('FRONTEND_URL', 'https://www.hispaloshop.com')
AUTH_BACKEND_URL = settings.AUTH_BACKEND_URL or os.environ.get('AUTH_BACKEND_URL', '')


def _get_email_config():
    api_key = (settings.RESEND_API_KEY or os.environ.get('RESEND_API_KEY') or '').strip()
    email_from = settings.EMAIL_FROM or os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
    return api_key, email_from


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')


def _legacy_sha256(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        return _bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    return _legacy_sha256(password) == stored_hash


def needs_rehash(stored_hash: str) -> bool:
    return not (stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'))


def generate_verification_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def generate_verification_code() -> str:
    return str(random.randint(100000, 999999))


def send_email(to: str, subject: str, html: str):
    api_key, email_from = _get_email_config()
    if not api_key or api_key == 'PLACEHOLDER_RESEND_KEY':
        logger.error(f"[EMAIL] Cannot send to {to}: Resend not configured")
        return
    try:
        resend.api_key = api_key
        resend.Emails.send({"from": email_from, "to": [to], "subject": subject, "html": html})
        logger.info(f"[EMAIL] Sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send to {to}: {e}")
        raise
