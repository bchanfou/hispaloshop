"""
Middleware de seguridad para Hispaloshop API.
Fase 0: Security headers, rate limiting, y protecciones básicas.
"""
import time
from fastapi import Request, HTTPException
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


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
        import os
        if os.environ.get("ENV", "development").lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

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
    Rate limiting simple en memoria.
    NOTA: En producción usar Redis para rate limiting distribuido.
    """
    
    def __init__(self, app, requests_per_minute: int = 100, burst_size: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.requests = {}  # {client_id: [(timestamp, count)]}
    
    def _get_client_id(self, request: Request) -> str:
        """Identifica al cliente por IP + User-Agent hash"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        user_agent = request.headers.get("User-Agent", "")
        # Simple hash para identificar cliente
        return f"{client_ip}:{hash(user_agent) % 10000}"
    
    async def dispatch(self, request: Request, call_next):
        client_id = self._get_client_id(request)
        now = time.time()
        
        # Limpiar requests antiguos (> 1 minuto)
        if client_id in self.requests:
            self.requests[client_id] = [
                (ts, count) for ts, count in self.requests[client_id]
                if now - ts < 60
            ]
        
        # Contar requests recientes
        recent_requests = sum(
            count for ts, count in self.requests.get(client_id, [])
        )
        
        # Verificar burst (requests muy rápidos)
        very_recent = sum(
            count for ts, count in self.requests.get(client_id, [])
            if now - ts < 5  # últimos 5 segundos
        )
        
        if very_recent >= self.burst_size:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded (burst). Please slow down."
            )
        
        if recent_requests >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded ({self.requests_per_minute} requests/minute). Please slow down."
            )
        
        # Registrar request
        if client_id not in self.requests:
            self.requests[client_id] = []
        self.requests[client_id].append((now, 1))
        
        # Limpiar memoria periódicamente (cada 100 requests únicos)
        if len(self.requests) > 10000:
            self._cleanup_old_entries(now)
        
        return await call_next(request)
    
    def _cleanup_old_entries(self, now: float):
        """Limpia entradas antiguas para evitar memory leak"""
        to_remove = []
        for client_id, requests in self.requests.items():
            recent = [(ts, count) for ts, count in requests if now - ts < 60]
            if not recent:
                to_remove.append(client_id)
            else:
                self.requests[client_id] = recent
        
        for client_id in to_remove[:1000]:  # Limpiar máximo 1000
            del self.requests[client_id]


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
        
        import os
        import logging
        logger = logging.getLogger("hispaloshop")

        # Log all requests in development
        if os.getenv("ENV") == "development" or os.getenv("DEBUG") == "true":
            print(f"[{request.method}] {request.url.path} - {response.status_code} ({duration:.3f}s)")

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
