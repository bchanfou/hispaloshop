"""
Per-user rate limiting helper for section 3.5.

Stores counters in db.rate_limit_counters_v2 with a TTL index. Each
counter is keyed by (user_id, action, time_bucket). The time_bucket
truncates the timestamp to the appropriate window so we never have to
delete documents — TTL takes care of cleanup.

If the user crosses the same limit 3 times in a single day, the helper
inserts a moderation_actions entry of type=restrict_features with
duration 1h and actor=system. The user receives a notification.

This module is intentionally framework-agnostic — call check_and_inc()
from any FastAPI route. It does not replace the existing security/
RateLimitMiddleware which throttles per IP.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException

from core.database import db

logger = logging.getLogger(__name__)


# (max_per_window, window_seconds)
LIMITS = {
    "create_post": (20, 24 * 3600),
    "create_reel": (20, 24 * 3600),
    "create_story": (30, 24 * 3600),
    "create_comment": (60, 3600),
    "create_review": (5, 24 * 3600),
    "create_report": (10, 24 * 3600),
    "create_hashtag": (5, 24 * 3600),
    "send_message": (100, 24 * 3600),
}

ANTI_BURST = ("create_post", "create_reel")
ANTI_BURST_MAX = 3
ANTI_BURST_WINDOW = 60


def _bucket_for(window_seconds: int) -> str:
    now = datetime.now(timezone.utc)
    if window_seconds <= 60:
        return now.strftime("%Y%m%d%H%M")
    if window_seconds <= 3600:
        return now.strftime("%Y%m%d%H")
    return now.strftime("%Y%m%d")


async def check_and_inc(user_id: str, action: str) -> None:
    """
    Increment the counter for (user, action). Raises HTTPException(429)
    if the limit is exceeded. After the third 429 in 24h on the same
    action, applies an automatic restrict_features for 1 hour.
    """
    if action not in LIMITS:
        return  # unknown action — no limit configured

    max_count, window = LIMITS[action]
    bucket = _bucket_for(window)
    key = f"{user_id}:{action}:{bucket}"
    expires = datetime.now(timezone.utc) + timedelta(seconds=window + 60)

    # Atomic increment + upsert
    doc = await db.rate_limit_counters_v2.find_one_and_update(
        {"_id": key},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {
                "user_id": user_id,
                "action": action,
                "bucket": bucket,
                "expires_at": expires,
            },
        },
        upsert=True,
        return_document=True,
    )
    count = (doc or {}).get("count", 1)

    # Anti-burst (always-on, hardcoded)
    if action in ANTI_BURST:
        burst_bucket = _bucket_for(ANTI_BURST_WINDOW)
        burst_key = f"{user_id}:{action}_burst:{burst_bucket}"
        burst_doc = await db.rate_limit_counters_v2.find_one_and_update(
            {"_id": burst_key},
            {
                "$inc": {"count": 1},
                "$setOnInsert": {
                    "user_id": user_id,
                    "action": f"{action}_burst",
                    "bucket": burst_bucket,
                    "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ANTI_BURST_WINDOW + 30),
                },
            },
            upsert=True,
            return_document=True,
        )
        if (burst_doc or {}).get("count", 0) > ANTI_BURST_MAX:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas publicaciones en poco tiempo. Espera un momento.",
                headers={"Retry-After": str(ANTI_BURST_WINDOW)},
            )

    if count > max_count:
        # Track strikes — count distinct buckets in the last 24h where the user
        # crossed the limit. After 3 strikes, auto restrict for 1 hour.
        strike_key = f"{user_id}:{action}_strike:{datetime.now(timezone.utc).strftime('%Y%m%d')}"
        strike_doc = await db.rate_limit_counters_v2.find_one_and_update(
            {"_id": strike_key},
            {
                "$inc": {"count": 1},
                "$setOnInsert": {
                    "user_id": user_id,
                    "action": f"{action}_strike",
                    "bucket": "day",
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
                },
            },
            upsert=True,
            return_document=True,
        )
        strikes = (strike_doc or {}).get("count", 1)
        if strikes >= 3:
            await _apply_auto_restrict(user_id, action)

        raise HTTPException(
            status_code=429,
            detail=f"Has alcanzado el límite de {max_count} para esta acción. Vuelve a intentarlo más tarde.",
            headers={"Retry-After": str(window)},
        )


async def _apply_auto_restrict(user_id: str, action: str) -> None:
    """Insert a moderation_actions entry restricting the user for 1h."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=1)
    try:
        await db.moderation_actions.insert_one({
            "action_id": f"mact_{uuid.uuid4().hex[:14]}",
            "actor_id": "system",
            "actor_role": "system",
            "target_user_id": user_id,
            "target_content_id": None,
            "target_content_type": None,
            "action_type": "restrict_features",
            "reason": f"Auto: rate limit exceeded for {action} (3 strikes)",
            "duration_days": None,
            "expires_at": expires.isoformat(),
            "applied_at": now.isoformat(),
            "reverted": False,
            "report_id": None,
            "auto": True,
        })
        await db.user_moderation_state.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "restrict_features_until": expires.isoformat(),
                    "updated_at": now.isoformat(),
                },
            },
            upsert=True,
        )
        # Notify user
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=user_id,
                title="Cuenta restringida temporalmente",
                body="Has superado los límites de actividad. Recupera el acceso en 1 hora.",
                notification_type="moderation_action_applied",
                channels=["in_app", "push"],
                data={"action_type": "restrict_features", "expires_at": expires.isoformat()},
                action_url="/account/restrictions",
            )
        except Exception:
            pass
    except Exception as exc:
        logger.error("[RATE_LIMIT] Could not apply auto restrict: %s", exc)
