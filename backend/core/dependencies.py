"""
FastAPI dependencies for authentication and authorization
"""
from fastapi import HTTPException, Header, Request
from typing import Optional
import logging
import hashlib
from .database import db
from ..models.user import User

logger = logging.getLogger(__name__)


def _hash_session_token(token: str) -> str:
    """Hash session token for storage. SHA-256 is safe here because tokens are high-entropy UUIDs."""
    return hashlib.sha256(token.encode()).hexdigest()

# Auth helpers
async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """
    Get current authenticated user from session token or Authorization header.
    Raises HTTPException if not authenticated.
    """
    session_token = request.cookies.get('session_token')
    
    # Log for debugging
    logger.info(f"[get_current_user] Cookies received: {dict(request.cookies)}")
    logger.info(f"[get_current_user] Authorization header: {authorization[:20] if authorization else 'None'}...")
    
    if not session_token and authorization:
        if authorization.startswith('Bearer '):
            session_token = authorization.replace('Bearer ', '')
    
    if not session_token:
        logger.warning("[get_current_user] No session token found")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logger.info(f"[get_current_user] Using session token: {session_token[:20]}...")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": _hash_session_token(session_token)},
        {"_id": 0}
    )
    
    if not session_doc:
        logger.warning(f"[get_current_user] Session not found in DB for token: {session_token[:20]}...")
        raise HTTPException(status_code=401, detail="Invalid session")
    
    logger.info(f"[get_current_user] Session found for user: {session_doc.get('user_id')}")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        logger.error(f"[get_current_user] User document not found for user_id: {session_doc['user_id']}")
        raise HTTPException(status_code=401, detail="User not found")
    
    logger.info(f"[get_current_user] Authenticated user: {user_doc.get('email')}")
    
    return User(**user_doc)


def require_role(allowed_roles: list):
    """
    DEPRECATED — Not used. The active require_role is in core.auth
    and is called as: await require_role(user, ["admin", "producer"])
    This factory pattern exists but nothing imports it.
    """
    async def role_checker(user: User = get_current_user) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker
