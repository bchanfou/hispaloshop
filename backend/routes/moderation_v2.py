"""
Moderation system v2 — section 3.5.

Unified user reports + moderation actions + appeals + auto-actions.
Coexists with legacy routes/moderation.py and routes/content_moderation.py
which serve specific older flows. The v2 router is canonical for the
section 3.5 dashboard.

Strict rules:
- A user cannot report the same content twice (server-side via unique-ish
  query check).
- A user cannot report themselves (400).
- Reports are scoped to the country admin of the content's AUTHOR, not
  the reporter — this is enforced by computing content_country_code
  from the author's `country` field at insert time.
- Auto-actions are inserted with actor_id='system' and audited.
- Appeals always route to super admin, never back to the country admin
  who took the original decision.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.database import db
from core.auth import get_current_user, require_super_admin, require_country_admin
from core.models import User
from services.rate_limit_v2 import check_and_inc

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

CONTENT_TYPES = (
    "post", "reel", "story", "comment", "review", "product", "user",
    "community", "community_post", "message", "recipe", "hashtag", "store",
    "self_appeal",
)

REASONS = (
    "spam", "harassment", "hate_speech", "nsfw_adult", "nsfw_violence",
    "illegal_content", "misinformation", "intellectual_property",
    "impersonation", "personal_info", "food_safety", "scam", "other",
)

# Priority weights — higher reason → higher base priority.
REASON_PRIORITY = {
    "nsfw_adult": 5, "nsfw_violence": 5, "illegal_content": 5,
    "hate_speech": 4, "harassment": 4, "scam": 4, "food_safety": 4,
    "impersonation": 3, "personal_info": 3, "intellectual_property": 3,
    "misinformation": 2, "spam": 2,
    "other": 1,
}

ACTION_TYPES = (
    "dismiss", "warning", "hide", "remove", "restrict_features",
    "suspend", "ban", "shadow_ban", "escalate",
)

WARNING_THRESHOLD_RESTRICT = 3   # 3 warnings in 30d → auto restrict 7d
WARNING_THRESHOLD_SUSPEND = 5    # 5 warnings in 90d → auto suspend 14d


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


async def _resolve_content_author(content_type: str, content_id: str) -> Optional[dict]:
    """Find the author user_id + country for a piece of content. Returns None if missing."""
    collection_map = {
        "post": ("posts", "post_id", "user_id"),
        "reel": ("posts", "post_id", "user_id"),  # reels live in posts
        "story": ("stories", "story_id", "user_id"),
        "comment": ("comments", "comment_id", "user_id"),
        "review": ("reviews", "review_id", "user_id"),
        "product": ("products", "product_id", "producer_id"),
        "user": ("users", "user_id", "user_id"),
        "community": ("communities", "community_id", "owner_id"),
        "message": ("messages", "message_id", "sender_id"),
        "recipe": ("recipes", "recipe_id", "user_id"),
        "store": ("stores", "store_id", "user_id"),
        "hashtag": ("hashtags", "tag", "creator_id"),
    }
    if content_type not in collection_map:
        return None
    coll, id_field, author_field = collection_map[content_type]
    try:
        doc = await db[coll].find_one({id_field: content_id}, {"_id": 0, author_field: 1})
    except Exception:
        return None
    if not doc:
        return None
    author_id = doc.get(author_field)
    if not author_id:
        return None
    user_doc = await db.users.find_one({"user_id": author_id}, {"_id": 0, "user_id": 1, "country": 1})
    if not user_doc:
        return None
    return {"user_id": author_id, "country": (user_doc.get("country") or "ES").upper()}


async def _get_user_state(user_id: str) -> dict:
    state = await db.user_moderation_state.find_one({"user_id": user_id}, {"_id": 0})
    return state or {
        "user_id": user_id,
        "warnings_count": 0,
        "warnings_last_30d": 0,
        "restrict_features_until": None,
        "suspend_until": None,
        "is_banned": False,
        "is_shadow_banned": False,
        "is_trusted_reporter": False,
        "is_noisy_reporter": False,
        "report_dismissed_count_30d": 0,
    }


async def _evaluate_thresholds(user_id: str) -> None:
    """
    Inline auto-action evaluator. Called after a warning is added. Checks
    if the user crossed thresholds and applies restrict / suspend
    automatically.
    """
    now = _now()
    cutoff_30d = (now - timedelta(days=30)).isoformat()
    cutoff_90d = (now - timedelta(days=90)).isoformat()
    warnings_30d = await db.moderation_actions.count_documents({
        "target_user_id": user_id,
        "action_type": "warning",
        "applied_at": {"$gte": cutoff_30d},
        "reverted": False,
    })
    warnings_90d = await db.moderation_actions.count_documents({
        "target_user_id": user_id,
        "action_type": "warning",
        "applied_at": {"$gte": cutoff_90d},
        "reverted": False,
    })
    state_update: dict = {"updated_at": now.isoformat(), "warnings_last_30d": warnings_30d}

    if warnings_30d >= WARNING_THRESHOLD_RESTRICT:
        expires = (now + timedelta(days=7)).isoformat()
        state_update["restrict_features_until"] = expires
        await db.moderation_actions.insert_one({
            "action_id": f"mact_{uuid.uuid4().hex[:14]}",
            "actor_id": "system", "actor_role": "system",
            "target_user_id": user_id, "target_content_id": None, "target_content_type": None,
            "action_type": "restrict_features", "reason": "Auto: 3 warnings in 30d",
            "duration_days": 7, "expires_at": expires, "applied_at": now.isoformat(),
            "reverted": False, "report_id": None, "auto": True,
        })
    if warnings_90d >= WARNING_THRESHOLD_SUSPEND:
        expires = (now + timedelta(days=14)).isoformat()
        state_update["suspend_until"] = expires
        await db.moderation_actions.insert_one({
            "action_id": f"mact_{uuid.uuid4().hex[:14]}",
            "actor_id": "system", "actor_role": "system",
            "target_user_id": user_id, "target_content_id": None, "target_content_type": None,
            "action_type": "suspend", "reason": "Auto: 5 warnings in 90d",
            "duration_days": 14, "expires_at": expires, "applied_at": now.isoformat(),
            "reverted": False, "report_id": None, "auto": True,
        })

    await db.user_moderation_state.update_one(
        {"user_id": user_id},
        {"$set": state_update},
        upsert=True,
    )


async def _apply_action_effects(action: dict) -> None:
    """Apply the side-effects of a moderation action (hide content, suspend user, etc.)."""
    a_type = action["action_type"]
    target_user_id = action.get("target_user_id")
    content_id = action.get("target_content_id")
    content_type = action.get("target_content_type")
    now_iso = _now_iso()

    # Content visibility
    if a_type in ("hide", "remove") and content_id and content_type:
        coll_map = {
            "post": ("posts", "post_id"),
            "reel": ("posts", "post_id"),
            "story": ("stories", "story_id"),
            "comment": ("comments", "comment_id"),
            "review": ("reviews", "review_id"),
            "product": ("products", "product_id"),
            "recipe": ("recipes", "recipe_id"),
        }
        if content_type in coll_map:
            coll, id_field = coll_map[content_type]
            try:
                if a_type == "hide":
                    await db[coll].update_one(
                        {id_field: content_id},
                        {"$set": {"hidden": True, "moderation_hidden_at": now_iso}},
                    )
                else:  # remove
                    await db[coll].update_one(
                        {id_field: content_id},
                        {"$set": {"hidden": True, "deleted": True, "moderation_removed_at": now_iso}},
                    )
            except Exception as exc:
                logger.warning("[MOD] Could not hide/remove content: %s", exc)

    # User-level actions
    if not target_user_id:
        return
    state_update: dict = {"updated_at": now_iso}
    if a_type == "warning":
        state_update["$inc"] = {"warnings_count": 1}
    elif a_type == "restrict_features":
        state_update["restrict_features_until"] = action.get("expires_at")
    elif a_type == "suspend":
        state_update["suspend_until"] = action.get("expires_at")
    elif a_type == "ban":
        state_update["is_banned"] = True
    elif a_type == "shadow_ban":
        state_update["is_shadow_banned"] = True

    if state_update:
        ops: dict = {"$set": {k: v for k, v in state_update.items() if k != "$inc"}}
        if "$inc" in state_update:
            ops["$inc"] = state_update["$inc"]
        try:
            await db.user_moderation_state.update_one({"user_id": target_user_id}, ops, upsert=True)
        except Exception as exc:
            logger.error("[MOD] Could not update user_moderation_state: %s", exc)

    if a_type == "warning":
        try:
            await _evaluate_thresholds(target_user_id)
        except Exception:
            pass

    # Notify user
    try:
        from services.notifications.dispatcher_service import notification_dispatcher
        title_map = {
            "warning": "Has recibido una advertencia",
            "hide": "Tu contenido fue ocultado",
            "remove": "Tu contenido fue eliminado",
            "restrict_features": "Cuenta restringida",
            "suspend": "Cuenta suspendida",
            "ban": "Cuenta baneada",
            "shadow_ban": "Cuenta restringida",  # vague on purpose
        }
        if a_type in title_map and target_user_id:
            await notification_dispatcher.send_notification(
                user_id=target_user_id,
                title=title_map[a_type],
                body=action.get("reason", "")[:140],
                notification_type="moderation_action_applied",
                channels=["in_app", "push", "email"] if a_type in ("suspend", "ban", "remove") else ["in_app", "push"],
                data={"action_type": a_type, "action_id": action["action_id"]},
                action_url="/account/restrictions",
            )
    except Exception:
        pass


async def _audit_mod(action: str, target_id: str, country_code: Optional[str], actor_id: str, reason: str = "") -> None:
    """Mirror moderation actions into country_admin_audit so dashboards see them."""
    try:
        await db.country_admin_audit.insert_one({
            "log_id": f"caudit_{uuid.uuid4().hex[:16]}",
            "admin_user_id": actor_id,
            "country_code": (country_code or "GLOBAL").upper(),
            "action": action,
            "target_id": target_id,
            "target_type": "moderation",
            "reason": reason,
            "ip": "",
            "extra": {},
            "timestamp": _now_iso(),
        })
    except Exception as exc:
        logger.warning("[MOD] Audit failed: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    content_type: str
    content_id: str
    reason: str
    description: Optional[str] = Field(None, max_length=500)
    screenshot_url: Optional[str] = None


class AppealCreate(BaseModel):
    action_id: str
    reason: str = Field(..., min_length=20, max_length=2000)


class ActionResolve(BaseModel):
    action_type: str
    reason: str = Field(..., min_length=10)
    duration_days: Optional[int] = None
    notify_reporter: bool = True


class AppealResolve(BaseModel):
    decision: str  # confirm | revert | modify
    reason: str = Field(..., min_length=10)
    modified_action: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# USER endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/moderation/reports")
async def create_report(payload: ReportCreate, user: User = Depends(get_current_user)):
    if payload.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"content_type inválido. Acepta: {list(CONTENT_TYPES)}")
    if payload.reason not in REASONS:
        raise HTTPException(status_code=400, detail=f"reason inválido. Acepta: {list(REASONS)}")

    await check_and_inc(user.user_id, "create_report")

    # Resolve content author + country
    if payload.content_type == "self_appeal":
        # User is requesting human review of an AI block on their own content.
        # No content_id lookup — the report is about the user's own intent.
        author_info = {
            "user_id": user.user_id,
            "country": (getattr(user, "country", None) or "ES").upper(),
        }
    elif payload.content_type == "user":
        # Reporting a user directly — content_id is the user_id
        if payload.content_id == user.user_id:
            raise HTTPException(status_code=400, detail="No puedes reportarte a ti mismo")
        author = await db.users.find_one({"user_id": payload.content_id}, {"_id": 0, "user_id": 1, "country": 1})
        if not author:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        author_info = {"user_id": author["user_id"], "country": (author.get("country") or "ES").upper()}
    else:
        author_info = await _resolve_content_author(payload.content_type, payload.content_id)
        if not author_info:
            raise HTTPException(status_code=404, detail="Contenido no encontrado")
        if author_info["user_id"] == user.user_id:
            raise HTTPException(status_code=400, detail="No puedes reportar tu propio contenido")

    # No duplicate reports
    existing = await db.content_reports.find_one({
        "reporter_user_id": user.user_id,
        "content_type": payload.content_type,
        "content_id": payload.content_id,
        "status": {"$in": ["pending", "in_review"]},
    })
    if existing:
        raise HTTPException(status_code=409, detail="Ya reportaste este contenido")

    reporter_state = await _get_user_state(user.user_id)
    base_priority = REASON_PRIORITY.get(payload.reason, 1)
    if reporter_state.get("is_trusted_reporter"):
        base_priority = min(5, base_priority + 1)
    if reporter_state.get("is_noisy_reporter"):
        base_priority = max(1, base_priority - 1)

    report = {
        "report_id": f"rep_{uuid.uuid4().hex[:14]}",
        "reporter_user_id": user.user_id,
        "reporter_country": (getattr(user, "country", None) or "").upper() or None,
        "content_type": payload.content_type,
        "content_id": payload.content_id,
        "content_author_id": author_info["user_id"],
        "content_country_code": author_info["country"],
        "reason": payload.reason,
        "description": (payload.description or "")[:500],
        "screenshot_url": payload.screenshot_url,
        "status": "pending",
        "priority": base_priority,
        "assigned_admin_id": None,
        "resolution_action_id": None,
        "created_at": _now_iso(),
        "resolved_at": None,
        "ai_flagged": False,
        "ai_confidence": None,
        "ai_categories": [],
    }
    await db.content_reports.insert_one(report)

    # Notify country admin (best effort)
    try:
        cfg = await db.country_configs.find_one({"country_code": author_info["country"]}, {"_id": 0, "admin_user_id": 1})
        admin_id = (cfg or {}).get("admin_user_id")
        if admin_id:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=admin_id,
                title="Nuevo report de moderación",
                body=f"{payload.content_type} · {payload.reason}",
                notification_type="moderation_report_created",
                channels=["in_app", "push"],
                data={"report_id": report["report_id"], "country_code": author_info["country"]},
                action_url="/country-admin/moderation",
            )
    except Exception:
        pass

    return {"report_id": report["report_id"], "status": "pending"}


@router.get("/moderation/reports/my")
async def list_my_reports(limit: int = 20, user: User = Depends(get_current_user)):
    items = await db.content_reports.find(
        {"reporter_user_id": user.user_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(min(100, max(1, limit))).to_list(100)
    return {"items": items}


@router.post("/moderation/appeals")
async def create_appeal(payload: AppealCreate, user: User = Depends(get_current_user)):
    action = await db.moderation_actions.find_one({"action_id": payload.action_id}, {"_id": 0})
    if not action:
        raise HTTPException(status_code=404, detail="Acción no encontrada")
    if action.get("target_user_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Acción no encontrada")  # 404, not 403
    existing = await db.moderation_appeals.find_one({"action_id": payload.action_id})
    if existing:
        raise HTTPException(status_code=409, detail="Ya apelaste esta acción")

    appeal = {
        "appeal_id": f"appeal_{uuid.uuid4().hex[:14]}",
        "appellant_user_id": user.user_id,
        "action_id": payload.action_id,
        "action_type": action.get("action_type"),
        "original_reason": action.get("reason"),
        "appeal_reason": payload.reason,
        "status": "pending",
        "country_code": (getattr(user, "country", None) or "").upper() or None,
        "created_at": _now_iso(),
        "resolved_at": None,
        "decision": None,
        "decision_reason": None,
        "decided_by": None,
    }
    await db.moderation_appeals.insert_one(appeal)
    return {"appeal_id": appeal["appeal_id"], "status": "pending"}


@router.get("/moderation/appeals/my")
async def list_my_appeals(user: User = Depends(get_current_user)):
    items = await db.moderation_appeals.find(
        {"appellant_user_id": user.user_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(50)
    return {"items": items}


@router.get("/moderation/me/state")
async def my_moderation_state(user: User = Depends(get_current_user)):
    state = await _get_user_state(user.user_id)
    now_iso = _now_iso()
    restrictions_active = bool(state.get("restrict_features_until") and state["restrict_features_until"] > now_iso)
    suspended = bool(state.get("suspend_until") and state["suspend_until"] > now_iso)
    return {
        "warnings_active": int(state.get("warnings_last_30d", 0) or 0),
        "restrictions_active": restrictions_active,
        "restrictions_expires_at": state.get("restrict_features_until") if restrictions_active else None,
        "suspended": suspended,
        "suspended_until": state.get("suspend_until") if suspended else None,
        "is_banned": bool(state.get("is_banned", False)),
    }


@router.get("/moderation/me/actions")
async def list_my_actions(user: User = Depends(get_current_user)):
    """All non-internal moderation actions affecting the current user."""
    items = await db.moderation_actions.find(
        {"target_user_id": user.user_id},
        {"_id": 0},
    ).sort("applied_at", -1).limit(100).to_list(100)
    return {"items": items}


# ─────────────────────────────────────────────────────────────────────────────
# COUNTRY ADMIN endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/moderation/queue")
async def cadmin_queue(
    status: Optional[str] = "pending",
    priority: Optional[int] = None,
    content_type: Optional[str] = None,
    reason: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    query: dict = {}
    if country:
        query["content_country_code"] = country
    if status:
        query["status"] = status
    if priority is not None:
        query["priority"] = priority
    if content_type:
        query["content_type"] = content_type
    if reason:
        query["reason"] = reason
    if search:
        query["$or"] = [
            {"content_id": search},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    limit = min(200, max(1, limit))
    total = await db.content_reports.count_documents(query)
    items = await db.content_reports.find(query, {"_id": 0}).sort([("priority", -1), ("created_at", -1)]).skip(max(0, offset)).limit(limit).to_list(limit)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/country-admin/moderation/queue/auto-flagged")
async def cadmin_auto_flagged(user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    query: dict = {"ai_flagged": True, "status": "pending"}
    if country:
        query["content_country_code"] = country
    items = await db.content_reports.find(query, {"_id": 0}).sort([("priority", -1), ("ai_confidence", -1)]).limit(200).to_list(200)
    return {"items": items, "total": len(items)}


@router.get("/country-admin/moderation/reports/{report_id}")
async def cadmin_get_report(report_id: str, user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    target_query = {"report_id": report_id}
    if country:
        target_query["content_country_code"] = country
    report = await db.content_reports.find_one(target_query, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report no encontrado")
    # Author history
    author_actions = await db.moderation_actions.find(
        {"target_user_id": report.get("content_author_id"), "reverted": False},
        {"_id": 0},
    ).sort("applied_at", -1).limit(20).to_list(20)
    author_state = await _get_user_state(report.get("content_author_id"))
    return {"report": report, "author_actions": author_actions, "author_state": author_state}


@router.post("/country-admin/moderation/reports/{report_id}/resolve")
async def cadmin_resolve_report(
    report_id: str,
    payload: ActionResolve,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    if payload.action_type not in ACTION_TYPES:
        raise HTTPException(status_code=400, detail="action_type inválido")
    target_query = {"report_id": report_id}
    if country:
        target_query["content_country_code"] = country
    report = await db.content_reports.find_one(target_query, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report no encontrado")
    if report.get("status") in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="El report ya está cerrado")

    now = _now()
    expires = None
    if payload.duration_days:
        expires = (now + timedelta(days=payload.duration_days)).isoformat()

    action = {
        "action_id": f"mact_{uuid.uuid4().hex[:14]}",
        "actor_id": user.user_id,
        "actor_role": "country_admin",
        "target_user_id": report.get("content_author_id"),
        "target_content_id": report.get("content_id"),
        "target_content_type": report.get("content_type"),
        "action_type": payload.action_type,
        "reason": payload.reason,
        "duration_days": payload.duration_days,
        "expires_at": expires,
        "applied_at": now.isoformat(),
        "reverted": False,
        "report_id": report_id,
        "auto": False,
    }
    await db.moderation_actions.insert_one(action)
    await _apply_action_effects(action)

    await db.content_reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": now.isoformat(),
            "resolution_action_id": action["action_id"],
            "assigned_admin_id": user.user_id,
        }},
    )

    if payload.notify_reporter:
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=report["reporter_user_id"],
                title="Tu report fue revisado",
                body=f"Aplicamos la acción: {payload.action_type}",
                notification_type="moderation_report_resolved",
                channels=["in_app"],
                data={"report_id": report_id, "action_type": payload.action_type},
            )
        except Exception:
            pass

    await _audit_mod(
        action=f"moderation_resolve:{payload.action_type}",
        target_id=report_id,
        country_code=country,
        actor_id=user.user_id,
        reason=payload.reason[:200],
    )
    return {"status": "ok", "action_id": action["action_id"]}


@router.post("/country-admin/moderation/reports/{report_id}/dismiss")
async def cadmin_dismiss_report(
    report_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    target_query = {"report_id": report_id}
    if country:
        target_query["content_country_code"] = country
    report = await db.content_reports.find_one(target_query, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report no encontrado")
    reason = ((body or {}).get("reason") or "").strip()

    await db.content_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": "dismissed", "resolved_at": _now_iso(), "assigned_admin_id": user.user_id}},
    )
    # Update reporter noisy counter
    cutoff = (_now() - timedelta(days=30)).isoformat()
    dismissed_30d = await db.content_reports.count_documents({
        "reporter_user_id": report["reporter_user_id"],
        "status": "dismissed",
        "resolved_at": {"$gte": cutoff},
    })
    state_update: dict = {"report_dismissed_count_30d": dismissed_30d}
    if dismissed_30d > 5:
        state_update["is_noisy_reporter"] = True
    await db.user_moderation_state.update_one(
        {"user_id": report["reporter_user_id"]},
        {"$set": state_update},
        upsert=True,
    )

    await _audit_mod("moderation_dismiss", report_id, country, user.user_id, reason)
    return {"status": "dismissed", "reporter_dismissed_30d": dismissed_30d}


@router.post("/country-admin/moderation/reports/{report_id}/escalate")
async def cadmin_escalate_report(
    report_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    reason = ((body or {}).get("reason") or "").strip()
    if len(reason) < 30:
        raise HTTPException(status_code=400, detail="Razón mínimo 30 caracteres")
    target_query = {"report_id": report_id}
    if country:
        target_query["content_country_code"] = country
    report = await db.content_reports.find_one(target_query, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report no encontrado")

    await db.content_reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": "in_review",
            "escalated_to_super_admin": True,
            "escalated_at": _now_iso(),
            "escalation_reason": reason,
        }},
    )
    await _audit_mod("moderation_escalate", report_id, country, user.user_id, reason)
    return {"status": "escalated"}


@router.get("/country-admin/moderation/metrics")
async def cadmin_metrics(period: str = "30d", user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    cutoff = (_now() - timedelta(days=days)).isoformat()
    base_q: dict = {"created_at": {"$gte": cutoff}}
    if country:
        base_q["content_country_code"] = country

    pending = await db.content_reports.count_documents({**base_q, "status": "pending"})
    auto_flagged = await db.content_reports.count_documents({**base_q, "ai_flagged": True, "status": "pending"})
    resolved = await db.content_reports.count_documents({**base_q, "status": "resolved"})
    dismissed = await db.content_reports.count_documents({**base_q, "status": "dismissed"})

    by_reason_pipeline = [
        {"$match": base_q},
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    try:
        top_reasons = await db.content_reports.aggregate(by_reason_pipeline).to_list(5)
    except Exception:
        top_reasons = []

    return {
        "period": period,
        "pending": pending,
        "auto_flagged": auto_flagged,
        "resolved": resolved,
        "dismissed": dismissed,
        "top_reasons": top_reasons,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SUPER ADMIN endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/super-admin/moderation/queue/global")
async def sadmin_queue_global(
    country: Optional[str] = None,
    status: Optional[str] = None,
    reason: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    query: dict = {}
    if country:
        query["content_country_code"] = country.upper()
    if status:
        query["status"] = status
    if reason:
        query["reason"] = reason
    limit = min(500, max(1, limit))
    items = await db.content_reports.find(query, {"_id": 0}).sort([("priority", -1), ("created_at", -1)]).limit(limit).to_list(limit)
    return {"items": items, "total": len(items)}


@router.get("/super-admin/moderation/appeals/queue")
async def sadmin_appeals_queue(status: str = "pending", user: User = Depends(get_current_user)):
    await require_super_admin(user)
    items = await db.moderation_appeals.find({"status": status}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"items": items, "total": len(items)}


@router.get("/super-admin/moderation/appeals/{appeal_id}")
async def sadmin_get_appeal(appeal_id: str, user: User = Depends(get_current_user)):
    await require_super_admin(user)
    appeal = await db.moderation_appeals.find_one({"appeal_id": appeal_id}, {"_id": 0})
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal no encontrado")
    action = await db.moderation_actions.find_one({"action_id": appeal["action_id"]}, {"_id": 0})
    appellant_state = await _get_user_state(appeal["appellant_user_id"])
    return {"appeal": appeal, "action": action, "appellant_state": appellant_state}


@router.post("/super-admin/moderation/appeals/{appeal_id}/resolve")
async def sadmin_resolve_appeal(
    appeal_id: str,
    payload: AppealResolve,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    if payload.decision not in ("confirm", "revert", "modify"):
        raise HTTPException(status_code=400, detail="decision inválida")
    appeal = await db.moderation_appeals.find_one({"appeal_id": appeal_id}, {"_id": 0})
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal no encontrado")
    if appeal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Appeal ya resuelto")
    action = await db.moderation_actions.find_one({"action_id": appeal["action_id"]}, {"_id": 0})
    if not action:
        raise HTTPException(status_code=404, detail="Acción original no encontrada")

    now_iso = _now_iso()
    if payload.decision == "revert":
        await db.moderation_actions.update_one(
            {"action_id": action["action_id"]},
            {"$set": {"reverted": True, "reverted_by": user.user_id, "reverted_at": now_iso}},
        )
        # Restore content visibility
        if action.get("action_type") in ("hide", "remove") and action.get("target_content_id"):
            coll_map = {"post": "posts", "reel": "posts", "story": "stories", "comment": "comments",
                        "review": "reviews", "product": "products", "recipe": "recipes"}
            coll = coll_map.get(action.get("target_content_type"))
            id_field_map = {"post": "post_id", "reel": "post_id", "story": "story_id",
                            "comment": "comment_id", "review": "review_id", "product": "product_id", "recipe": "recipe_id"}
            id_field = id_field_map.get(action.get("target_content_type"))
            if coll and id_field:
                await db[coll].update_one(
                    {id_field: action["target_content_id"]},
                    {"$set": {"hidden": False, "deleted": False, "moderation_reverted_at": now_iso}},
                )
        # Restore user state
        if action.get("target_user_id"):
            unset: dict = {}
            updates: dict = {}
            a_type = action.get("action_type")
            if a_type == "restrict_features":
                unset["restrict_features_until"] = ""
            elif a_type == "suspend":
                unset["suspend_until"] = ""
            elif a_type == "ban":
                updates["is_banned"] = False
            elif a_type == "shadow_ban":
                updates["is_shadow_banned"] = False
            ops: dict = {"$set": {**updates, "updated_at": now_iso}}
            if unset:
                ops["$unset"] = unset
            await db.user_moderation_state.update_one({"user_id": action["target_user_id"]}, ops)

    elif payload.decision == "modify":
        # Revert original + insert new action with modified params
        await db.moderation_actions.update_one(
            {"action_id": action["action_id"]},
            {"$set": {"reverted": True, "reverted_by": user.user_id, "reverted_at": now_iso}},
        )
        new_action_data = payload.modified_action or {}
        new_action = {
            "action_id": f"mact_{uuid.uuid4().hex[:14]}",
            "actor_id": user.user_id,
            "actor_role": "super_admin",
            "target_user_id": action.get("target_user_id"),
            "target_content_id": action.get("target_content_id"),
            "target_content_type": action.get("target_content_type"),
            "action_type": new_action_data.get("action_type", action["action_type"]),
            "reason": new_action_data.get("reason", payload.reason),
            "duration_days": new_action_data.get("duration_days"),
            "expires_at": None,
            "applied_at": now_iso,
            "reverted": False,
            "report_id": action.get("report_id"),
            "auto": False,
            "from_appeal_modify": True,
        }
        if new_action_data.get("duration_days"):
            new_action["expires_at"] = (_now() + timedelta(days=int(new_action_data["duration_days"]))).isoformat()
        await db.moderation_actions.insert_one(new_action)
        await _apply_action_effects(new_action)

    await db.moderation_appeals.update_one(
        {"appeal_id": appeal_id},
        {"$set": {
            "status": "resolved",
            "decision": payload.decision,
            "decision_reason": payload.reason,
            "decided_by": user.user_id,
            "resolved_at": now_iso,
        }},
    )

    try:
        from services.notifications.dispatcher_service import notification_dispatcher
        await notification_dispatcher.send_notification(
            user_id=appeal["appellant_user_id"],
            title="Tu apelación fue resuelta",
            body=f"Decisión: {payload.decision}",
            notification_type="moderation_appeal_resolved",
            channels=["in_app", "push", "email"],
            data={"appeal_id": appeal_id, "decision": payload.decision},
            action_url="/account/restrictions",
        )
    except Exception:
        pass

    return {"status": "ok", "decision": payload.decision}


@router.get("/super-admin/moderation/metrics/global")
async def sadmin_metrics_global(period: str = "30d", user: User = Depends(get_current_user)):
    await require_super_admin(user)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    cutoff = (_now() - timedelta(days=days)).isoformat()
    base_q = {"created_at": {"$gte": cutoff}}

    total_reports = await db.content_reports.count_documents(base_q)
    total_actions = await db.moderation_actions.count_documents({"applied_at": {"$gte": cutoff}})
    auto_actions = await db.moderation_actions.count_documents({"applied_at": {"$gte": cutoff}, "auto": True})
    reverted = await db.moderation_actions.count_documents({"applied_at": {"$gte": cutoff}, "reverted": True})
    appeals_total = await db.moderation_appeals.count_documents({"created_at": {"$gte": cutoff}})
    appeals_pending = await db.moderation_appeals.count_documents({"status": "pending"})

    false_positive_rate = round((reverted / total_actions) * 100, 2) if total_actions else 0.0

    return {
        "period": period,
        "total_reports": total_reports,
        "total_actions": total_actions,
        "auto_actions": auto_actions,
        "reverted_actions": reverted,
        "false_positive_rate_pct": false_positive_rate,
        "appeals_total": appeals_total,
        "appeals_pending": appeals_pending,
    }
