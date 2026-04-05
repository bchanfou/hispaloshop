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

    env = os.getenv("ENV", os.getenv("ENVIRONMENT", "production"))
    # SENTRY_RELEASE preferido (git SHA, convencional).
    # APP_VERSION y RAILWAY_GIT_COMMIT_SHA son fallbacks.
    release = (
        os.getenv("SENTRY_RELEASE")
        or os.getenv("RAILWAY_GIT_COMMIT_SHA")
        or os.getenv("APP_VERSION")
        or "unknown"
    )

    sentry_sdk.init(
        dsn=dsn,
        environment=env,
        release=release,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE", "0.1")),
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            AsyncioIntegration(),
        ],
        before_send=_before_send,
        # Don't send PII (emails, IPs) by default
        send_default_pii=False,
    )
    logger.info("[SENTRY] Initialized (env=%s, release=%s)", env, release)


def _before_send(event, hint):
    """Filter out expected HTTP errors (401, 404, 429) from Sentry reports."""
    # Check if the exception is an expected HTTP error
    exc_info = hint.get("exc_info")
    if exc_info:
        exc_type, exc_value, _ = exc_info
        # Filter FastAPI/Starlette HTTPExceptions with expected status codes
        status = getattr(exc_value, "status_code", None)
        if status in (401, 403, 404, 405, 422, 429):
            return None

    # Also filter warning-level messages mentioning these codes (legacy path)
    if event.get("level") == "warning":
        message = str(event.get("message", ""))
        if any(code in message for code in ("401", "404", "429")):
            return None

    return event
