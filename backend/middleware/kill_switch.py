"""
Kill switch middleware.

Founder can flip 4 flags from /super-admin/system/kill-switches:

  - registrations: blocks /api/auth/register and onboarding endpoints
  - checkout: blocks /api/payments/create-checkout and buy-now
  - readonly: blocks ALL POST/PUT/PATCH/DELETE except super_admin
  - all: blocks every non-superadmin request

Flags live in db.platform_config (single doc, _id="current"). Read-through
cache with 10s TTL so we don't hit Mongo on every request. The cache is
intentionally short — when the founder flips a switch, the platform converges
to the new state in seconds.

The middleware skips its own /super-admin/* routes so the founder can always
toggle the switches back off.
"""
from __future__ import annotations

import time
import logging
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


_CACHE: dict = {"switches": {}, "fetched_at": 0.0}
_CACHE_TTL_SECONDS = 10.0


async def get_kill_switches(force_refresh: bool = False) -> dict:
    """Read kill switches from db.platform_config (cached)."""
    now = time.time()
    if not force_refresh and (now - _CACHE["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _CACHE["switches"]

    try:
        from core.database import db
        doc = await db.platform_config.find_one({"_id": "current"}, {"_id": 0, "kill_switches": 1})
    except Exception as exc:
        logger.warning("[KILL_SWITCH] Could not fetch platform_config: %s", exc)
        doc = None

    switches = (doc or {}).get("kill_switches") or {}
    _CACHE["switches"] = switches
    _CACHE["fetched_at"] = now
    return switches


def invalidate_kill_switch_cache() -> None:
    """Force the next call to re-read from DB. Called from the toggle endpoint."""
    _CACHE["fetched_at"] = 0.0


# Path matching: case-insensitive prefix tests after normalising the
# /api prefix away. Bypasses the matcher for routes that the founder
# uses to disable the switches.
_BYPASS_PREFIXES = (
    "/super-admin/",
    "/api/super-admin/",
)
_REGISTRATION_PATHS = (
    "/auth/register",
    "/auth/signup",
    "/api/auth/register",
    "/api/auth/signup",
    "/producer-registration",
    "/importer-registration",
    "/api/producer-registration",
    "/api/importer-registration",
)
_CHECKOUT_PATHS = (
    "/payments/create-checkout",
    "/api/payments/create-checkout",
    "/checkout/buy-now",
    "/api/checkout/buy-now",
)
_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def _user_role_from_request(request: Request) -> Optional[str]:
    """
    Lightweight role lookup that does NOT raise. Used by the middleware to
    decide whether to bypass switches for super_admin without depending on
    the auth dependency tree.
    """
    try:
        # Reuse the same session-token logic as core.auth without raising.
        from core.auth import _hash_session_token
        from core.database import db
        token = request.cookies.get("session_token")
        if not token:
            auth_header = request.headers.get("authorization") or ""
            if auth_header.startswith("Bearer "):
                token = auth_header[len("Bearer "):]
        if not token:
            return None
        hashed = _hash_session_token(token)
        session = await db.user_sessions.find_one({"session_token": hashed}, {"_id": 0, "user_id": 1})
        if not session:
            session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0, "user_id": 1})
        if not session:
            return None
        user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "role": 1})
        if not user_doc:
            return None
        return str(user_doc.get("role", "")).lower()
    except Exception:
        return None


class KillSwitchMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path or ""
        method = request.method.upper()

        # Bypass: super-admin routes (founder must always be able to flip switches off).
        if any(path.startswith(p) for p in _BYPASS_PREFIXES):
            return await call_next(request)

        # CORS preflight is always allowed.
        if method == "OPTIONS":
            return await call_next(request)

        switches = await get_kill_switches()
        if not switches:
            return await call_next(request)

        # If "all" is on, every non-super_admin request is rejected.
        if switches.get("all"):
            role = await _user_role_from_request(request)
            if role != "super_admin":
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Plataforma temporalmente fuera de servicio. Vuelve más tarde."},
                )

        # Registrations off: block registration paths.
        if switches.get("registrations") and any(p in path for p in _REGISTRATION_PATHS):
            return JSONResponse(
                status_code=503,
                content={"detail": "Los registros están temporalmente cerrados."},
            )

        # Checkout off: block checkout paths.
        if switches.get("checkout") and any(p in path for p in _CHECKOUT_PATHS):
            return JSONResponse(
                status_code=503,
                content={"detail": "El checkout está temporalmente cerrado. Intenta más tarde."},
            )

        # Read-only: block writes for everyone except super_admin.
        if switches.get("readonly") and method in _WRITE_METHODS:
            role = await _user_role_from_request(request)
            if role != "super_admin":
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Plataforma en modo solo-lectura. Solo super admins pueden escribir."},
                )

        return await call_next(request)
