from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import UUID

import redis.asyncio as redis

from config import settings


class RedisManager:
    """Centralized Redis access for cache, rate limiting and websocket presence."""

    def __init__(self) -> None:
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
        )
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
            # Fail-open fallback for local/dev environments without Redis.
            now = datetime.utcnow()
            current, expires_at = self._local_rate_fallback.get(redis_key, (0, now + timedelta(seconds=window)))
            if now > expires_at:
                current = 0
                expires_at = now + timedelta(seconds=window)
            current += 1
            self._local_rate_fallback[redis_key] = (current, expires_at)
            return current <= max_requests

    async def set_user_online(self, user_id: UUID, socket_id: str) -> None:
        await self.client.hset(f"presence:{user_id}", mapping={"socket": socket_id, "ts": str(datetime.utcnow().timestamp())})
        await self.client.expire(f"presence:{user_id}", 60)

    async def publish_message(self, channel: str, message: str) -> None:
        await self.client.publish(f"ws:{channel}", message)

    async def subscribe_channel(self, channel: str):
        pubsub = self.client.pubsub()
        await pubsub.subscribe(f"ws:{channel}")
        return pubsub


redis_manager = RedisManager()
