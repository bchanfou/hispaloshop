"""
Security utilities: password hashing, token generation
"""
import hashlib
import uuid
import bcrypt as _bcrypt


def hash_password(password: str) -> str:
    """Hash password using bcrypt (secure)."""
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')

def generate_verification_token() -> str:
    """Generate a 64-character verification token"""
    return uuid.uuid4().hex + uuid.uuid4().hex
