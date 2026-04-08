import hashlib

from fastapi import HTTPException, Request

from core.redis_client import redis_manager


class RateLimiter:
    def __init__(self) -> None:
        self.limits = {
            "login": (10, 300),           # 10 per 5 min (aumentado para usuarios móviles)
            "register": (5, 3600),        # 5 per hour por IP (protección contra bots)
            "register_strict": (2, 3600), # 2 per hour por email (protección adicional)
            "forgot_password": (3, 900),  # 3 per 15 min
            "reset_password": (3, 900),  # 3 per 15 min
            "checkout": (10, 60),        # 10 per min
            "hispal_ai": (20, 3600),     # 20 per hour
            "commercial_ai": (50, 3600), # 50 per hour
            "payment_create": (10, 60),  # 10 per min
            "upload": (30, 60),          # 30 per min
            "create_post": (10, 3600),   # 10 posts per hour
            "create_comment": (30, 300), # 30 comments per 5 min
            "create_story": (20, 3600),  # 20 stories per hour
            "verify_email": (5, 300),    # 5 per 5 min
            "resend_verification": (3, 300),  # 3 per 5 min
            "contact": (3, 3600),        # 3 per hour (contact form)
            "api_general": (100, 60),    # 100 per min
        }

    async def check(self, request: Request, endpoint_type: str) -> None:
        user = getattr(request.state, "user", None)
        if user:
            key = f"user:{user.id}:{endpoint_type}"
        else:
            key = f"anon:{self._get_device_fingerprint(request)}:{endpoint_type}"

        max_requests, window = self.limits.get(endpoint_type, self.limits["api_general"])
        
        # Para registro, aplicar doble rate limit: por IP y por email (si está disponible)
        if endpoint_type == "register":
            # Rate limit por IP (anti-bot)
            ip_allowed = await redis_manager.check_rate_limit(key, max_requests=max_requests, window=window)
            if not ip_allowed:
                raise HTTPException(
                    status_code=429, 
                    detail="Demasiados intentos de registro desde esta ubicación. Por favor, espera 1 hora o contacta soporte."
                )
            
            # Rate limit adicional por email (anti-spam) - se verificará en el handler
            return
            
        if not await redis_manager.check_rate_limit(key, max_requests=max_requests, window=window):
            raise HTTPException(status_code=429, detail="Límite de intentos excedido. Inténtalo de nuevo en unos minutos.")

    def _get_device_fingerprint(self, request: Request) -> str:
        """Generate a device fingerprint for rate limiting.
        
        Para reducir falsos positivos en regiones con NAT (Asia, corporativas),
        usamos una combinación de IP + headers que varían por dispositivo.
        """
        user_agent = request.headers.get("user-agent", "")
        accept_language = request.headers.get("accept-language", "")
        accept_encoding = request.headers.get("accept-encoding", "")
        dnt = request.headers.get("dnt", "")  # Do Not Track
        
        # Obtener IP real considerando proxies
        forwarded = request.headers.get("x-forwarded-for")
        real_ip = request.headers.get("x-real-ip")
        
        if forwarded:
            # Tomar la IP más a la izquierda (origen real)
            ip = forwarded.split(",")[-1].strip()
        elif real_ip:
            ip = real_ip
        else:
            ip = request.client.host if request.client else "unknown"
        
        # Hash más granular: IP /24 (red) + características del dispositivo
        # Esto permite que usuarios en la misma red corporativa pero dispositivos diferentes
        # tengan fingerprints distintos
        try:
            # Para IPv4, usar solo los primeros 3 octetos (/24)
            if "." in ip and ":" not in ip:
                ip_network = ".".join(ip.split(".")[:3]) + ".0"
            else:
                ip_network = ip
        except:
            ip_network = ip
        
        raw = f"{ip_network}:{user_agent}:{accept_language}:{accept_encoding}:{dnt}"
        return hashlib.sha256(raw.encode()).hexdigest()[:20]


rate_limiter = RateLimiter()
