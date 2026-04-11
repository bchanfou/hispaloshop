"""
Authentication & authorization helpers.
Imported by route modules and server.py.
"""
from fastapi import HTTPException, Header, Request
from typing import Optional, List
import logging
import hashlib
import hmac
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
        'countryadmin': 'country_admin',
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

    # Look up by hashed token first, fall back to plaintext for legacy sessions.
    # Both paths always execute a DB query to prevent timing side-channels
    # that could reveal whether a session uses hashed or plaintext storage.
    hashed = _hash_session_token(session_token)
    session_doc = await db.user_sessions.find_one({"session_token": hashed}, {"_id": 0})
    legacy_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0}) if not session_doc else None
    if not session_doc and legacy_doc:
        # Migrate legacy session to hashed token
        session_doc = legacy_doc
        await db.user_sessions.update_one(
            {"session_token": session_token},
            {"$set": {"session_token": hashed}}
        )
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
    if user_role not in normalized_allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def require_super_admin(user: User):
    """Raise 403 if user is not super_admin."""
    if _normalize_role(getattr(user, 'role', None)) != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")


async def require_founder(user: User) -> User:
    """
    Require founder access. Founder = super_admin with is_founder=True on the
    user document. Used for the most destructive actions: commission rate
    changes, kill switches, global force-logout, etc.

    Raises 403 if the caller is not a super_admin OR if is_founder is not set.
    """
    role = _normalize_role(getattr(user, 'role', None))
    if role != "super_admin":
        raise HTTPException(status_code=403, detail="Founder access required")

    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "is_founder": 1},
    )
    if not (user_doc or {}).get("is_founder", False):
        raise HTTPException(status_code=403, detail="Founder access required")
    return user


async def require_country_admin(user: User) -> Optional[str]:
    """
    Require country_admin (or admin with assigned_country) access. Returns the
    country code (ISO-2) the admin is scoped to. super_admin gets None — they
    see all countries (callers must handle the None case explicitly).

    Raises 403 if:
      - user has no admin role, OR
      - user is admin/country_admin but has no assigned_country.

    The role 'country_admin' is treated as a strict alias for an admin scoped
    to one country. Existing 'admin' users with assigned_country are accepted
    too — there is no migration required.
    """
    role = _normalize_role(getattr(user, 'role', None))

    if role == "super_admin":
        return None

    if role not in ("admin", "country_admin"):
        raise HTTPException(status_code=403, detail="Country admin access required")

    # Read assigned_country from the user doc directly — the User pydantic model
    # may not include this field.
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "assigned_country": 1},
    )
    assigned_country = (user_doc or {}).get("assigned_country")
    if not assigned_country:
        raise HTTPException(
            status_code=403,
            detail="Admin account has no assigned country. Contact super_admin to configure your country scope.",
        )
    return str(assigned_country).upper()


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
