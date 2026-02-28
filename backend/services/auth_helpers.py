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

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://www.hispaloshop.com')
AUTH_BACKEND_URL = os.environ.get('AUTH_BACKEND_URL', '')


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
    if not RESEND_API_KEY or RESEND_API_KEY == 'PLACEHOLDER_RESEND_KEY':
        logger.error(f"[EMAIL] Cannot send to {to}: Resend not configured")
        return
    try:
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html})
        logger.info(f"[EMAIL] Sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send to {to}: {e}")
        raise
