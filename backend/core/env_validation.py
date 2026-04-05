"""
Startup validation of critical environment variables.

Policy (per section 0.2 of the launch roadmap):
- `MONGO_URL` and `JWT_SECRET` are ALWAYS required (pydantic validates these
  at import time in core/config.py — they raise before we even get here).
- In `production` / `staging`: the following are ALSO required and will raise
  RuntimeError at startup if missing: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  ANTHROPIC_API_KEY, FCM_SERVICE_ACCOUNT_JSON, FRONTEND_URL, BACKEND_URL.
- In `development`: missing vars are logged as warnings with a clear
  "degraded capabilities" message so new devs can clone + run without having
  every third-party account.

The goal is to fail LOUD and EARLY in staging/prod, and be friendly in dev.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.config import Settings

logger = logging.getLogger(__name__)


# Map: config attribute name → human description shown when missing
_STAGING_PROD_REQUIRED: dict[str, str] = {
    "STRIPE_SECRET_KEY": "Stripe checkout & payouts",
    "STRIPE_WEBHOOK_SECRET": "Stripe webhook signature verification",
    "ANTHROPIC_API_KEY": "AI assistants (David / Rebeca / Pedro / Commercial)",
    "FCM_SERVICE_ACCOUNT_JSON": "Push notifications (Firebase Cloud Messaging)",
    "FRONTEND_URL": "CORS allowlist and email link generation",
}


def _effective_backend_url(settings: "Settings") -> str | None:
    return settings.BACKEND_URL or settings.AUTH_BACKEND_URL


def validate_environment(settings: "Settings") -> None:
    """
    Validate critical env vars based on the current ENV.

    Raises RuntimeError in staging/production if any critical var is missing.
    Logs warnings in development and continues with degraded capabilities.
    """
    env = (settings.ENV or "development").lower()
    is_strict = env in {"production", "staging"}

    missing: list[tuple[str, str]] = []

    for attr, description in _STAGING_PROD_REQUIRED.items():
        value = getattr(settings, attr, None)
        if not value:
            missing.append((attr, description))

    # BACKEND_URL has its own fallback chain (BACKEND_URL → AUTH_BACKEND_URL)
    if not _effective_backend_url(settings):
        missing.append(("BACKEND_URL", "public API URL for emails and webhooks"))

    if not missing:
        logger.info("[STARTUP] All critical env vars present (env=%s)", env)
        return

    if is_strict:
        lines = [f"  - {attr}: {desc}" for attr, desc in missing]
        joined = "\n".join(lines)
        raise RuntimeError(
            f"Missing required env vars in {env}:\n{joined}\n"
            f"See backend/.env.example for the full list."
        )

    # Development: degraded-mode warning
    header = f"[STARTUP] Development mode - degraded capabilities ({len(missing)} missing):"
    lines = [f"  - {attr} missing -> {desc} disabled" for attr, desc in missing]
    logger.warning("%s\n%s", header, "\n".join(lines))
    logger.warning(
        "[STARTUP] This is fine for local dev. Set ENV=staging or ENV=production "
        "to enforce these vars."
    )


def log_optional_capabilities(settings: "Settings") -> None:
    """Log one-line status of optional integrations (not blocking)."""
    statuses: list[str] = []

    def _status(name: str, ok: bool) -> None:
        statuses.append(f"{name}={'ON' if ok else 'off'}")

    _status("sentry", bool(settings.SENTRY_DSN))
    _status("resend_email", bool(settings.RESEND_API_KEY))
    _status("cloudinary", bool(settings.CLOUDINARY_CLOUD_NAME))
    _status("redis", bool(settings.REDIS_URL))
    _status("openai_embeddings", bool(settings.OPENAI_API_KEY))
    _status("google_oauth", bool(settings.GOOGLE_CLIENT_ID))
    _status("google_translate", bool(settings.GOOGLE_TRANSLATE_API_KEY))
    _status("web_push_vapid", bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY))
    _status("chat_encryption", bool(settings.CHAT_ENCRYPTION_KEY))

    logger.info("[STARTUP] Optional integrations: %s", " ".join(statuses))
