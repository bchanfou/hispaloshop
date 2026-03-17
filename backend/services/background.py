"""
Safe background task launcher.
Wraps asyncio.create_task with error logging so exceptions are never silently lost.
"""
import asyncio
import logging
from typing import Coroutine

logger = logging.getLogger(__name__)


def create_safe_task(coro: Coroutine, *, name: str = "background") -> asyncio.Task:
    """
    Launch an async coroutine as a background task with automatic error logging.
    Unlike raw asyncio.create_task, exceptions are caught and logged instead of
    being silently swallowed (Python 3.8+ only logs unhandled task exceptions as warnings).
    """
    async def _wrapper():
        try:
            await coro
        except Exception as exc:
            logger.error("[BG_TASK:%s] Unhandled exception: %s", name, exc, exc_info=True)

    return asyncio.create_task(_wrapper(), name=name)
