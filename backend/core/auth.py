"""
Authentication & authorization helpers.
Imported by route modules and server.py.
"""
from fastapi import HTTPException, Header, Request
from typing import Optional, List
import logging
from .database import db
from .models import User

logger = logging.getLogger(__name__)


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """Authenticate via session token (cookie or Authorization header)."""
    session_token = request.cookies.get('session_token')
    if not session_token and authorization:
        if authorization.startswith('Bearer '):
            session_token = authorization.replace('Bearer ', '')
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return User(**user_doc)


async def require_role(user: User, allowed_roles: List[str]):
    """Raise 403 if user role not in allowed_roles. super_admin has access to all admin routes."""
    # super_admin has access to everything
    if user.role == "super_admin":
        return
    if "admin" in allowed_roles and user.role == "super_admin":
        return
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def require_super_admin(user: User):
    """Raise 403 if user is not super_admin."""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")


async def get_optional_user(request: Request) -> Optional[User]:
    """Return current user or None (no exception)."""
    try:
        # Extract authorization header manually when calling directly
        auth_header = request.headers.get("authorization")
        return await get_current_user(request, authorization=auth_header)
    except (HTTPException, Exception):
        return None
