"""
CSRF Protection Middleware — Double-submit cookie pattern.
The frontend reads the csrf_token cookie via JS and sends it
back as X-CSRF-Token header on mutating requests.
"""
import secrets
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE = "csrf_token"

# Paths exempt from CSRF (webhooks receive external POST requests)
CSRF_EXEMPT_PREFIXES = (
    "/webhooks",
    "/api/webhooks",
    "/health",
    "/api/health",
    "/ws/",
)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
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
        cookie_token = request.cookies.get(CSRF_COOKIE)
        header_token = request.headers.get(CSRF_HEADER)

        if not cookie_token or not header_token:
            raise HTTPException(status_code=403, detail="CSRF token missing")

        if not secrets.compare_digest(cookie_token, header_token):
            raise HTTPException(status_code=403, detail="CSRF token invalid")

        return await call_next(request)
