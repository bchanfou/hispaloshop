"""
Security utilities: password hashing, token generation, authentication.
"""
import hashlib
import uuid
from fastapi import Request, Header, HTTPException, Depends
from typing import Optional, List
from ..core.config import db
from ..models.user import User


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_verification_token() -> str:
    """Generate a 64-character verification token."""
    return uuid.uuid4().hex + uuid.uuid4().hex


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """
    Get current authenticated user from session or Authorization header.
    """
    session_token = None
    
    # Try to get token from cookie first
    session_token = request.cookies.get('session_token')
    
    # If not in cookie, try Authorization header
    if not session_token and authorization:
        if authorization.startswith('Bearer '):
            session_token = authorization[7:]
        else:
            session_token = authorization
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find user by session token
    user_doc = await db.users.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return User(**user_doc)


async def require_role(user: User, allowed_roles: List[str]):
    """Check if user has one of the allowed roles."""
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied. Required role: {allowed_roles}"
        )


async def require_super_admin(user: User):
    """Check if user is a super admin."""
    if user.role != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Super Admin privileges required."
        )
