"""
CSRF Protection Middleware — Double-submit cookie pattern.
The frontend reads the csrf_token cookie via JS and sends it
back as X-CSRF-Token header on mutating requests.
"""
import os
import secrets
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE = "csrf_token"

# Paths exempt from CSRF (webhooks receive external POST requests,
# upload/multipart endpoints are already protected by JWT auth)
CSRF_EXEMPT_PREFIXES = (
    "/webhooks",
    "/api/webhooks",
    "/health",
    "/api/health",
    "/ws/",
    "/api/upload",
    "/api/posts",
    "/api/reels",
    "/api/stories",
    "/api/users/upload-avatar",
    "/api/internal-chat/upload-image",
    # Auth endpoints: users don't have a CSRF cookie before first GET
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/google",
    "/api/auth/refresh",
    "/api/track/visit",
        "/api/seed-data",
        "/api/chat/message",
        "/api/payments/create-checkout",
)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Disable CSRF when env var is set (JWT + CORS already protect against CSRF)
        if os.getenv("CSRF_ENABLED", "true").lower() == "false":
            return await call_next(request)

        path = request.url.path

        # Safe methods: just ensure the cookie exists
        if request.method in CSRF_SAFE_METHODS:
            response = await call_next(request)
            if CSRF_COOKIE not in request.cookies:
                token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=CSRF_COOKIE,
                    value=token,
                    httponly=False,
                    secure=request.url.scheme == "https",
                    samesite="strict",
                    max_age=86400,
                )
            return response

        # Exempt paths (webhooks, WS, health)
        if any(path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        # Mutating methods: verify double-submit token
        # CSRF attacks require an existing authenticated session.
        # If the request carries no credentials at all, skip CSRF and let
        # the auth dependency return 401 — that is the correct HTTP status for
        # "unauthenticated". A 403 here would be misleading.
        has_bearer = request.headers.get("Authorization", "").strip().startswith("Bearer ")
        has_session = bool(request.cookies.get("session_token"))
        if not has_bearer and not has_session:
            return await call_next(request)

        cookie_token = request.cookies.get(CSRF_COOKIE)
        header_token = request.headers.get(CSRF_HEADER)

        if not cookie_token or not header_token:
            return JSONResponse(status_code=403, content={"detail": "CSRF token missing"})

        if not secrets.compare_digest(cookie_token, header_token):
            return JSONResponse(status_code=403, content={"detail": "CSRF token invalid"})

        return await call_next(request)
