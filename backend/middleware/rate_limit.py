import hashlib

from fastapi import HTTPException, Request

from core.redis_client import redis_manager


class RateLimiter:
    def __init__(self) -> None:
        self.limits = {
            "login": (5, 300),
            "register": (3, 3600),
            "checkout": (10, 60),
            "api_general": (100, 60),
        }

    async def check(self, request: Request, endpoint_type: str) -> None:
        user = getattr(request.state, "user", None)
        if user:
            key = f"user:{user.id}:{endpoint_type}"
        else:
            key = f"anon:{self._get_device_fingerprint(request)}:{endpoint_type}"

        max_requests, window = self.limits.get(endpoint_type, self.limits["api_general"])
        if not await redis_manager.check_rate_limit(key, max_requests=max_requests, window=window):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")

    def _get_device_fingerprint(self, request: Request) -> str:
        user_agent = request.headers.get("user-agent", "")
        accept_language = request.headers.get("accept-language", "")
        forwarded = request.headers.get("x-forwarded-for")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        raw = f"{user_agent}:{accept_language}:{ip}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


rate_limiter = RateLimiter()
