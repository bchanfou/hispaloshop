"""
Security utilities: password hashing, token generation
"""
import hashlib
import uuid

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_verification_token() -> str:
    """Generate a 64-character verification token"""
    return uuid.uuid4().hex + uuid.uuid4().hex
