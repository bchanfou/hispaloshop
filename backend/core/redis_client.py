from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from uuid import UUID

import redis.asyncio as redis

from core.config import settings

logger = logging.getLogger(__name__)


def _build_redis_client():
    """Build a Redis client from REDIS_URL (preferred) or fall back to defaults."""
    url = getattr(settings, "REDIS_URL", None)
    if url:
        return redis.Redis.from_url(url, decode_responses=True)
    # Fallback: local Redis with no auth (development only)
    return redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


class RedisManager:
    """Centralized Redis access for cache, rate limiting and websocket presence."""

    def __init__(self) -> None:
        self.client = _build_redis_client()
        self._local_rate_fallback: Dict[str, tuple[int, datetime]] = {}

    async def get_cache(self, key: str) -> Optional[str]:
        return await self.client.get(f"cache:{key}")

    async def set_cache(self, key: str, value: str, ttl: int = 3600) -> None:
        await self.client.setex(f"cache:{key}", ttl, value)

    async def check_rate_limit(self, key: str, max_requests: int, window: int) -> bool:
        redis_key = f"rate:{key}"
        try:
            current = await self.client.incr(redis_key)
            if current == 1:
                await self.client.expire(redis_key, window)
            return current <= max_requests
        except redis.RedisError:
            logger.warning("Redis unavailable for rate limiting, using in-memory fallback for key: %s", key)
            # Fail-open fallback for local/dev environments without Redis.
            now = datetime.now(timezone.utc)
            current, expires_at = self._local_rate_fallback.get(redis_key, (0, now + timedelta(seconds=window)))
            if now > expires_at:
                current = 0
                expires_at = now + timedelta(seconds=window)
            current += 1
            self._local_rate_fallback[redis_key] = (current, expires_at)

            # Prevent unbounded memory growth: evict expired entries periodically
            if len(self._local_rate_fallback) > 10_000:
                expired_keys = [k for k, (_, exp) in self._local_rate_fallback.items() if now > exp]
                for k in expired_keys:
                    del self._local_rate_fallback[k]
                # If still too large after evicting expired, drop oldest half
                if len(self._local_rate_fallback) > 10_000:
                    sorted_keys = sorted(self._local_rate_fallback, key=lambda k: self._local_rate_fallback[k][1])
                    for k in sorted_keys[:len(sorted_keys) // 2]:
                        del self._local_rate_fallback[k]

            return current <= max_requests

    async def set_user_online(self, user_id: UUID, socket_id: str) -> None:
        await self.client.hset(f"presence:{user_id}", mapping={"socket": socket_id, "ts": str(datetime.now(timezone.utc).timestamp())})
        await self.client.expire(f"presence:{user_id}", 60)

    async def publish_message(self, channel: str, message: str) -> None:
        await self.client.publish(f"ws:{channel}", message)

    async def subscribe_channel(self, channel: str):
        pubsub = self.client.pubsub()
        await pubsub.subscribe(f"ws:{channel}")
        return pubsub


redis_manager = RedisManager()
