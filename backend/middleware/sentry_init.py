"""
Sentry SDK initialization for the FastAPI backend.
Call init_sentry() at app startup — noop if SENTRY_DSN is not set.
"""
import os
import logging

logger = logging.getLogger(__name__)


def init_sentry():
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        logger.info("[SENTRY] SENTRY_DSN not set — Sentry disabled")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
    except ImportError:
        logger.warning("[SENTRY] sentry-sdk not installed — skipping")
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("ENVIRONMENT", "production"),
        release=os.getenv("APP_VERSION", "1.0.0"),
        traces_sample_rate=0.1,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            AsyncioIntegration(),
        ],
        before_send=_before_send,
    )
    logger.info("[SENTRY] Initialized (env=%s)", os.getenv("ENVIRONMENT", "production"))


def _before_send(event, hint):
    """Filter out expected errors (404, 401) from Sentry reports."""
    if event.get("level") == "warning":
        message = str(event.get("message", ""))
        if "404" in message or "401" in message:
            return None
    return event
