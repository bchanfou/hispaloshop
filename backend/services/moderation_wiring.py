"""
Helper used by content create endpoints to run AI pre-filter against
text + images and react accordingly.

Three possible outcomes per piece of content:

  - allow         → AI is unavailable or confidence too low. Caller
                    publishes the content normally and does NOT create
                    a report.
  - flag          → confidence 0.5–0.94 in any category. Caller
                    publishes the content normally AND inserts a
                    content_reports document with reporter='system'
                    and ai_flagged=True so the country admin sees it
                    in the auto-flagged tab.
  - block         → confidence ≥ 0.95 in a critical category. Caller
                    raises HTTPException 403 with the structured shape
                    documented in section 3.5b so the frontend can
                    show ModerationBlockedModal.

The helper is intentionally framework-agnostic so it can be called
from any FastAPI handler — it does not depend on the request object.

Strict rule (graceful degradation): if the AI service raises any
exception, this helper returns ('allow', None) and logs a warning.
Content publication NEVER fails because of an AI infrastructure
problem.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional, Tuple, List

from fastapi import HTTPException

from core.database import db

logger = logging.getLogger(__name__)


# Map ISO country code → language code consumed by analyze_text.
COUNTRY_LANGUAGE_MAP = {
    "ES": "es", "MX": "es", "AR": "es", "CO": "es", "CL": "es",
    "PE": "es", "PA": "es", "EC": "es", "SV": "es", "PR": "es",
    "US": "en", "GB": "en", "IE": "en", "AU": "en", "CA": "en",
    "FR": "fr", "BE": "fr",
    "DE": "de", "AT": "de", "CH": "de",
    "IT": "it",
    "PT": "pt", "BR": "pt",
    "KR": "ko",
}

CRITICAL_CATEGORIES = ("hate_speech", "nsfw_adult", "nsfw_violence")
BLOCK_THRESHOLD = 0.95
FLAG_THRESHOLD = 0.5


def _user_language(user) -> str:
    """Resolve the language for AI analysis from the user object."""
    pref = getattr(user, "preferred_language", None) or getattr(user, "language", None)
    if pref:
        return str(pref).lower()[:2]
    country = (getattr(user, "country", None) or "").upper()
    return COUNTRY_LANGUAGE_MAP.get(country, "es")


async def run_moderation_check(
    *,
    user,
    text: Optional[str] = None,
    image_urls: Optional[List[str]] = None,
) -> Tuple[str, Optional[dict]]:
    """
    Analyze text + images for the given user. Returns (decision, ai_summary).

    decision ∈ {"allow", "flag", "block"}
    ai_summary is the dict that will be persisted on the auto-generated
    report (or None when decision == "allow").

    Raises HTTPException(403) directly when decision is "block" so handlers
    can simply call this and not worry about the structured response shape.
    """
    try:
        from services.moderation_ai import analyze_text, analyze_image
    except Exception as exc:  # pragma: no cover — import-time safety
        logger.warning("[MOD_WIRE] moderation_ai unavailable: %s", exc)
        return "allow", None

    language = _user_language(user)
    results: list[dict] = []

    if text and isinstance(text, str) and text.strip():
        try:
            r = await analyze_text(text, language)
            results.append(r)
        except Exception as exc:
            logger.warning("[MOD_WIRE] analyze_text failed: %s", exc)

    for url in (image_urls or [])[:5]:  # cap at 5 images per check
        if not url:
            continue
        try:
            r = await analyze_image(url)
            results.append(r)
        except Exception as exc:
            logger.warning("[MOD_WIRE] analyze_image failed: %s", exc)

    if not results:
        return "allow", None

    # Pick the worst result by max_confidence.
    worst = max(results, key=lambda r: r.get("max_confidence", 0) or 0)
    max_conf = float(worst.get("max_confidence") or 0)
    max_cat = worst.get("max_category")
    source = worst.get("source", "unavailable")

    # Unavailable analysis: do NOT block, do NOT flag — fail open.
    if source == "unavailable" and max_conf == 0:
        return "allow", None

    if max_cat in CRITICAL_CATEGORIES and max_conf >= BLOCK_THRESHOLD:
        # Hard block — surface a structured 403 the frontend can intercept.
        raise HTTPException(
            status_code=403,
            detail={
                "error": "content_blocked_by_moderation",
                "category": max_cat,
                "confidence": max_conf,
                "appeal_available": True,
            },
        )

    if max_conf >= FLAG_THRESHOLD:
        return "flag", {
            "max_category": max_cat,
            "max_confidence": max_conf,
            "categories": [c for c in (
                "nsfw_adult", "nsfw_violence", "hate_speech", "spam",
                "scam", "illegal_content", "harassment", "personal_info",
            ) if (worst.get(c) or 0) >= FLAG_THRESHOLD],
            "source": source,
        }

    return "allow", None


async def insert_auto_report(
    *,
    content_type: str,
    content_id: str,
    content_author_id: str,
    content_country_code: str,
    ai_summary: dict,
) -> None:
    """
    Insert a content_reports document with reporter='system' so the
    country admin sees the AI-flagged content in their auto-flagged tab.

    Best-effort: if the insert fails for any reason we log + swallow.
    The content has already been published successfully — failing here
    must NEVER prevent the user-visible operation.
    """
    try:
        category = ai_summary.get("max_category") or (ai_summary.get("categories") or ["other"])[0]
        confidence = float(ai_summary.get("max_confidence") or 0)
        from routes.moderation_v2 import REASON_PRIORITY  # local import avoids cycle at import time
        priority = REASON_PRIORITY.get(category, 1)
        # Bump priority by 1 for high-confidence AI hits.
        if confidence >= 0.85:
            priority = min(5, priority + 1)

        await db.content_reports.insert_one({
            "report_id": f"rep_{uuid.uuid4().hex[:14]}",
            "reporter_user_id": "system",
            "reporter_country": (content_country_code or "GLOBAL").upper(),
            "content_type": content_type,
            "content_id": str(content_id),
            "content_author_id": content_author_id,
            "content_country_code": (content_country_code or "ES").upper(),
            "reason": category if category in (
                "spam", "harassment", "hate_speech", "nsfw_adult", "nsfw_violence",
                "illegal_content", "misinformation", "intellectual_property",
                "impersonation", "personal_info", "food_safety", "scam", "other",
            ) else "other",
            "description": f"AI auto-flag: {category} confidence {confidence:.2f}",
            "screenshot_url": None,
            "status": "pending",
            "priority": priority,
            "assigned_admin_id": None,
            "resolution_action_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resolved_at": None,
            "ai_flagged": True,
            "ai_confidence": confidence,
            "ai_categories": ai_summary.get("categories") or [category],
        })
    except Exception as exc:
        logger.warning("[MOD_WIRE] auto-report insert failed: %s", exc)
