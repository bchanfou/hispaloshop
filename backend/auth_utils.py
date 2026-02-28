"""
Authentication utilities for Hispaloshop.
Password hashing (bcrypt), verification, and progressive migration.
"""
import hashlib
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Request, HTTPException, Header
from pydantic import BaseModel

from db import db

logger = logging.getLogger("server")


# =================== PASSWORD HASHING ===================

def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')

def _legacy_sha256(password: str) -> str:
    """Legacy SHA256 hash for migration compatibility."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password. Supports bcrypt and legacy SHA256."""
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        return _bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    return _legacy_sha256(password) == stored_hash

def needs_rehash(stored_hash: str) -> bool:
    """Check if hash needs migration from SHA256 to bcrypt."""
    return not (stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'))


# =================== USER MODEL ===================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    role: str = "customer"
    email_verified: bool = False
    locale: dict = {}
    profile_image: Optional[str] = None


# =================== AUTH DEPENDENCIES ===================

def generate_session_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """Get authenticated user from session token (cookie or header)."""
    session_token = request.cookies.get("session_token")
    
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
        else:
            session_token = authorization
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**{k: user.get(k, v.default if hasattr(v, 'default') else None) for k, v in User.__fields__.items() if k in user or hasattr(v, 'default')})

async def get_optional_user(request: Request) -> Optional[User]:
    """Get user if authenticated, None otherwise."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
