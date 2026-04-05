"""
Middleware de seguridad para Hispaloshop API.
Fase 0: Security headers, rate limiting, y protecciones básicas.
"""
import logging
import os
import time
from fastapi import Request, HTTPException
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("hispaloshop")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware que añade headers de seguridad estándar a todas las respuestas.
    OWASP Top 10 protection headers.
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Prevenir MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevenir clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HTTPS Strict Transport Security (enabled in production)
        if os.environ.get("ENV", "development").lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content Security Policy — prevent XSS execution
        # Must stay in sync with <meta http-equiv="Content-Security-Policy"> in index.html
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net https://*.i.posthog.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com "
            "https://i.pravatar.cc https://lh3.googleusercontent.com https://via.placeholder.com https://media.giphy.com "
            "https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; "
            "media-src 'self' blob: https://res.cloudinary.com; "
            "connect-src 'self' wss: ws: https://api.anthropic.com https://api.stripe.com https://*.hispaloshop.com "
            "http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000 "
            "https://*.i.posthog.com https://us.i.posthog.com https://api.giphy.com https://upload.cloudinary.com https://*.sentry.io "
            "https://accounts.google.com https://oauth2.googleapis.com; "
            "worker-src 'self' blob:; "
            "frame-src https://js.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com https://accounts.google.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # Control de referrer
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Política de permisos (evita acceso a APIs sensibles)
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting simple en memoria con sliding-window counters.
    NOTA: En producción usar Redis para rate limiting distribuido.
    """

    # Hard cap on tracked clients to prevent unbounded memory growth.
    _MAX_CLIENTS = 50_000

    def __init__(self, app, requests_per_minute: int = 100, burst_size: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        # Sliding window: {client_id: [timestamp, ...]}  (one entry per request)
        self.requests: dict[str, list[float]] = {}
        self._last_full_cleanup = 0.0

    def _get_client_id(self, request: Request) -> str:
        """Identifica al cliente por IP solamente (User-Agent es spoofeable)."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        env = os.getenv("ENV", "development").lower()
        if env != "production":
            origin = request.headers.get("origin", "")
            if request.method == "OPTIONS" or origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
                return await call_next(request)

        client_id = self._get_client_id(request)
        now = time.time()

        # Periodic full cleanup every 60s to evict stale clients
        if now - self._last_full_cleanup > 60:
            self._cleanup_all(now)
            self._last_full_cleanup = now

        # Evict oldest client if we hit the hard cap (prevent memory exhaustion)
        if client_id not in self.requests and len(self.requests) >= self._MAX_CLIENTS:
            self._evict_oldest(now)

        # Get or create client window, prune entries older than 60s
        timestamps = self.requests.get(client_id, [])
        cutoff = now - 60
        timestamps = [ts for ts in timestamps if ts > cutoff]

        # Verificar burst (requests muy rápidos — last 5 seconds)
        burst_cutoff = now - 5
        very_recent = sum(1 for ts in timestamps if ts > burst_cutoff)

        if very_recent >= self.burst_size:
            self.requests[client_id] = timestamps
            return Response(
                content='{"detail":"Rate limit exceeded (burst). Please slow down."}',
                status_code=429,
                media_type="application/json",
            )

        if len(timestamps) >= self.requests_per_minute:
            self.requests[client_id] = timestamps
            return Response(
                content='{"detail":"Rate limit exceeded. Please slow down."}',
                status_code=429,
                media_type="application/json",
            )

        # Registrar request
        timestamps.append(now)
        self.requests[client_id] = timestamps

        return await call_next(request)

    def _cleanup_all(self, now: float):
        """Remove all stale clients in one pass."""
        cutoff = now - 60
        stale = [cid for cid, ts_list in self.requests.items() if not ts_list or ts_list[-1] <= cutoff]
        for cid in stale:
            del self.requests[cid]

    def _evict_oldest(self, now: float):
        """Evict the least-recently-active 10% of clients."""
        cutoff = now - 60
        # First try removing fully expired entries
        stale = [cid for cid, ts_list in self.requests.items() if not ts_list or ts_list[-1] <= cutoff]
        if stale:
            for cid in stale:
                del self.requests[cid]
            return
        # If all are active, remove the 10% with oldest last-request
        by_age = sorted(self.requests.items(), key=lambda kv: kv[1][-1] if kv[1] else 0)
        to_remove = max(1, len(by_age) // 10)
        for cid, _ in by_age[:to_remove]:
            del self.requests[cid]


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para logging de requests (útil para debugging y seguridad).
    """
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Procesar request
        response = await call_next(request)
        
        # Calcular duración
        duration = time.time() - start_time
        
        # Log all requests in development
        if os.getenv("ENV") == "development" or os.getenv("DEBUG") == "true":
            logger.debug(
                "[%s] %s - %d (%.3fs)",
                request.method, request.url.path, response.status_code, duration,
            )

        # Log slow requests (>2s) in all environments
        if duration > 2.0:
            logger.warning(
                "Slow request: %s %s took %.2fs (status %d)",
                request.method, request.url.path, duration, response.status_code,
            )

        return response


# Factory functions para fácil configuración
def setup_security_middleware(app, env: str = "development"):
    """
    Configura todos los middlewares de seguridad en la app FastAPI.
    
    Usage:
        from middleware.security import setup_security_middleware
        setup_security_middleware(app, settings.ENV)
    """
    from fastapi.middleware.cors import CORSMiddleware
    from core.config import settings
    
    # 1. CORS restrictivo (ya configurado en main.py, pero doble check)
    origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    # En producción, validar que no haya wildcard
    if env == "production":
        if "*" in origins:
            raise ValueError("Wildcard '*' not allowed in ALLOWED_ORIGINS in production")
    
    # 2. Trusted Hosts en producción
    if env == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[
                "hispaloshop.com",
                "www.hispaloshop.com",
                "*.hispaloshop.com",
                "localhost",
                "127.0.0.1"
            ]
        )
    
    # 3. Security Headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 4. Rate Limiting
    app.add_middleware(RateLimitMiddleware, requests_per_minute=100, burst_size=20)
    
    # 5. Request Logging (solo en desarrollo)
    if env == "development":
        app.add_middleware(RequestLoggingMiddleware)
