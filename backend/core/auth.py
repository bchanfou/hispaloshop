"""
Authentication & authorization helpers.
Imported by route modules and server.py.
"""
from fastapi import HTTPException, Header, Request
from typing import Optional, List
import logging
import hashlib
from .database import db
from .models import User

logger = logging.getLogger(__name__)


def _hash_session_token(token: str) -> str:
    """Hash session token for storage. SHA-256 is safe here because tokens are high-entropy UUIDs."""
    return hashlib.sha256(token.encode()).hexdigest()


def _normalize_role(raw_role: Optional[str]) -> str:
    role = str(raw_role or '').lower().replace('-', '_')
    role_map = {
        'superadmin': 'super_admin',
        'consumer': 'customer',
        'seller': 'producer',
    }
    return role_map.get(role, role)


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """Authenticate via session token (cookie or Authorization header)."""
    session_token = request.cookies.get('session_token')
    if not session_token and authorization:
        if authorization.startswith('Bearer '):
            session_token = authorization.replace('Bearer ', '')
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": _hash_session_token(session_token)}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check session expiry explicitly (TTL cleanup is async, up to ~60s delay)
    from datetime import datetime, timezone
    expires_at = session_doc.get("expires_at")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
        except (ValueError, TypeError):
            pass  # If expires_at is malformed, let TTL handle cleanup

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return User(**user_doc)


async def require_role(user: User, allowed_roles: List[str]):
    """Raise 403 if user role not in allowed_roles. super_admin has access to all admin routes."""
    user_role = _normalize_role(getattr(user, 'role', None))
    normalized_allowed_roles = [_normalize_role(role) for role in allowed_roles]

    # super_admin has access to everything
    if user_role == "super_admin":
        return
    if "admin" in normalized_allowed_roles and user_role == "super_admin":
        return
    if user_role not in normalized_allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def require_super_admin(user: User):
    """Raise 403 if user is not super_admin."""
    if _normalize_role(getattr(user, 'role', None)) != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")


async def get_optional_user(request: Request) -> Optional[User]:
    """Return current user or None (no exception)."""
    try:
        # Extract authorization header manually when calling directly
        auth_header = request.headers.get("authorization")
        return await get_current_user(request, authorization=auth_header)
    except (HTTPException, Exception):
        return None


async def get_current_user_optional(request: Request) -> Optional[User]:
    """Backward-compatible alias used by older route modules."""
    return await get_optional_user(request)
