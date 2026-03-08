"""
Cache module - re-exports from redis_client for compatibility
"""
from core.redis_client import redis_manager

# Export redis_client for modules that expect it
redis_client = redis_manager.client if redis_manager else None

__all__ = ['redis_client', 'redis_manager']
