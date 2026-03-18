"""
Trust & Safety — Moderation Routes (S24)
Community reporting, moderation queue, admin actions, reputation & trust scoring.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.models import User
from core.auth import get_current_user
from pydantic import BaseModel
from services.moderation_service import (
    score_text_content,
    check_food_safety,
    detect_review_fraud,
    calculate_user_reputation,
    calculate_seller_trust,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────

VALID_REPORT_REASONS = {"spam", "misleading", "offensive", "fraud", "copyright", "other"}
VALID_CONTENT_TYPES = {"post", "reel", "story", "product", "review", "recipe", "user_bio", "profile"}
VALID_ACTIONS = {"approve", "remove", "warn", "suspend", "ban"}

# ── Request models ────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    content_type: str
    content_id: str
    content_owner_id: Optional[str] = None
    reason: str
    description: Optional[str] = None


class ModerationActionRequest(BaseModel):
    action: str
    reason: Optional[str] = None


class ContentCheckRequest(BaseModel):
    content_type: str
    content: str


class FoodSafetyCheckRequest(BaseModel):
    product_data: dict


# ── Internal helpers ─────────────────────────────────────────────────

def _is_admin(user: User) -> bool:
    return user.role in ("admin", "super_admin")


def _serialize_dates(doc: dict) -> dict:
    for field in ("created_at", "updated_at", "resolved_at"):
        if doc.get(field) and hasattr(doc[field], "isoformat"):
            doc[field] = doc[field].isoformat()
    return doc


async def _upsert_queue_item(
    content_type: str,
    content_id: str,
    user_id: str,
    risk_score: int,
    flags: list,
    source: str,
) -> str:
    """Create or update a moderation queue entry. Returns item_id."""
    existing = await db.moderation_queue.find_one(
        {"content_type": content_type, "content_id": content_id}
    )
    if existing:
        await db.moderation_queue.update_one(
            {"content_id": content_id, "content_type": content_type},
            {
                "$max": {"risk_score": risk_score},
                "$addToSet": {"flags": {"$each": flags}},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        return existing.get("item_id", "")

    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.moderation_queue.insert_one({
        "item_id": item_id,
        "content_type": content_type,
        "content_id": content_id,
        "user_id": user_id,
        "risk_score": risk_score,
        "flags": list(set(flags)),
        "status": "pending",
        "source": source,
        "report_ids": [],
        "created_at": now,
        "updated_at": now,
        "reviewed_by": None,
    })
    return item_id


# ── Community reporting ───────────────────────────────────────────────

@router.post("/moderation/report")
async def submit_report(body: ReportRequest, user: User = Depends(get_current_user)):
    """User: submit a content report."""
    if body.content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de contenido no válido")
    if body.reason not in VALID_REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Razón no válida")

    # Prevent self-reporting
    if body.content_owner_id and body.content_owner_id == user.user_id:
        raise HTTPException(status_code=400, detail="No puedes reportar tu propio contenido")

    now = datetime.now(timezone.utc)
    report_id = str(uuid.uuid4())

    await db.reports.insert_one({
        "report_id": report_id,
        "reporter_id": user.user_id,
        "content_type": body.content_type,
        "content_id": body.content_id,
        "content_owner_id": body.content_owner_id,
        "reason": body.reason,
        "description": body.description or "",
        "status": "pending",
        "created_at": now,
    })

    # Auto-enqueue when a content piece accumulates ≥3 reports
    report_count = await db.reports.count_documents({
        "content_id": body.content_id,
        "content_type": body.content_type,
    })
    if report_count >= 3:
        risk_score = min(40 + report_count * 5, 85)
        item_id = await _upsert_queue_item(
            body.content_type,
            body.content_id,
            body.content_owner_id or user.user_id,
            risk_score,
            ["multiple_reports"],
            "report",
        )
        await db.moderation_queue.update_one(
            {"item_id": item_id},
            {"$addToSet": {"report_ids": report_id}},
        )

    logger.info("Report %s: %s/%s by %s", report_id, body.content_type, body.content_id, user.user_id)
    return {"report_id": report_id, "status": "pending"}


# ── Pre-publish content check ─────────────────────────────────────────

@router.post("/moderation/check")
async def check_content(body: ContentCheckRequest, user: User = Depends(get_current_user)):
    """
    Pre-publish content check. Returns risk_score, flags, and a safe boolean.
    If risk_score ≥ 60, item is queued automatically.
    """
    risk_score, flags = score_text_content(body.content)

    if risk_score >= 60:
        content_id = f"{body.content_type}:draft:{user.user_id}:{uuid.uuid4().hex[:8]}"
        await _upsert_queue_item(
            body.content_type, content_id, user.user_id, risk_score, flags, "auto"
        )

    return {"risk_score": risk_score, "flags": flags, "safe": risk_score < 40}


@router.post("/moderation/check/food-safety")
async def food_safety_check(body: FoodSafetyCheckRequest, user: User = Depends(get_current_user)):
    """Check a product dict for missing food safety fields."""
    missing = await check_food_safety(body.product_data)
    return {
        "missing_fields": missing,
        "passes": len(missing) == 0,
        "warnings": [
            f"Falta el campo requerido: {f}"
            for f in missing
        ],
    }


# ── Moderation queue (admin) ──────────────────────────────────────────

@router.get("/moderation/queue")
async def get_queue(
    status: Optional[str] = "pending",
    content_type: Optional[str] = None,
    min_risk: int = Query(0, ge=0, le=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Admin: paginated moderation queue sorted by risk score descending."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    query: dict = {"risk_score": {"$gte": min_risk}}
    if status:
        query["status"] = status
    if content_type:
        query["content_type"] = content_type

    skip = (page - 1) * limit
    total = await db.moderation_queue.count_documents(query)
    items = (
        await db.moderation_queue.find(query, {"_id": 0})
        .sort([("risk_score", -1), ("created_at", 1)])
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return {
        "items": [_serialize_dates(i) for i in items],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


@router.get("/moderation/queue/{item_id}")
async def get_queue_item(item_id: str, user: User = Depends(get_current_user)):
    """Admin: single queue item detail, enriched with associated reports."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    item = await db.moderation_queue.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")

    reports = await db.reports.find(
        {"content_id": item.get("content_id"), "content_type": item.get("content_type")},
        {"_id": 0},
    ).to_list(20)

    item["reports"] = [_serialize_dates(r) for r in reports]
    return _serialize_dates(item)


# ── Moderation actions (admin) ────────────────────────────────────────

@router.post("/moderation/queue/{item_id}/action")
async def apply_action(
    item_id: str,
    body: ModerationActionRequest,
    user: User = Depends(get_current_user),
):
    """Admin: apply approve / remove / warn / suspend / ban to a queued item."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if body.action not in VALID_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Acción no válida. Valores: {', '.join(VALID_ACTIONS)}",
        )

    item = await db.moderation_queue.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")

    now = datetime.now(timezone.utc)
    new_status = "approved" if body.action == "approve" else "removed"

    await db.moderation_queue.update_one(
        {"item_id": item_id},
        {"$set": {"status": new_status, "reviewed_by": user.user_id, "updated_at": now}},
    )

    action_id = str(uuid.uuid4())
    item_content_type = item.get("content_type", "")
    item_content_id = item.get("content_id", "")

    await db.moderation_actions.insert_one({
        "action_id": action_id,
        "moderator_id": user.user_id,
        "content_type": item_content_type,
        "content_id": item_content_id,
        "user_id": item.get("user_id"),
        "action": body.action,
        "reason": body.reason or "",
        "created_at": now,
    })

    # Propagate user-level consequences
    target_user_id = item.get("user_id")
    if target_user_id:
        if body.action == "warn":
            await db.users.update_one(
                {"user_id": target_user_id},
                {"$inc": {"warning_count": 1}},
            )
            await db.admin_notifications.insert_one({
                "notification_id": str(uuid.uuid4()),
                "type": "moderation_warning",
                "user_id": target_user_id,
                "message": "Tu contenido ha sido retirado porque infringe nuestras normas comunitarias.",
                "created_at": now,
                "read": False,
            })
        elif body.action == "suspend":
            await db.users.update_one(
                {"user_id": target_user_id},
                {"$set": {"suspended": True, "suspended_at": now}},
            )
        elif body.action == "ban":
            await db.users.update_one(
                {"user_id": target_user_id},
                {"$set": {"banned": True, "banned_at": now}},
            )

    # Mark related reports as reviewed
    await db.reports.update_many(
        {"content_id": item_content_id, "content_type": item_content_type},
        {"$set": {"status": "reviewed"}},
    )

    return {"action_id": action_id, "action": body.action, "new_queue_status": new_status}


# ── Reports list (admin) ──────────────────────────────────────────────

@router.get("/moderation/reports")
async def list_reports(
    status: Optional[str] = "pending",
    reason: Optional[str] = None,
    content_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Admin: list community reports with optional filters."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    query: dict = {}
    if status:
        query["status"] = status
    if reason:
        query["reason"] = reason
    if content_type:
        query["content_type"] = content_type

    skip = (page - 1) * limit
    total = await db.reports.count_documents(query)
    reports = (
        await db.reports.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return {
        "reports": [_serialize_dates(r) for r in reports],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


# ── Reputation & trust scores ─────────────────────────────────────────

@router.get("/moderation/reputation/{user_id}")
async def get_reputation(user_id: str, user: User = Depends(get_current_user)):
    """Get reputation score for a user (own score or admin access)."""
    if user.user_id != user_id and not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return await calculate_user_reputation(user_id)


@router.get("/moderation/trust-score/{seller_id}")
async def get_trust_score(seller_id: str, user: User = Depends(get_current_user)):
    """Get trust score for a seller (own score or admin access)."""
    if user.user_id != seller_id and not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return await calculate_seller_trust(seller_id)


# ── Review fraud check ────────────────────────────────────────────────

@router.post("/moderation/check/review")
async def check_review(review: dict, user: User = Depends(get_current_user)):
    """Admin or internal: analyse a review for fraud signals."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    risk_score, flags = await detect_review_fraud(review)
    return {"risk_score": risk_score, "flags": flags, "suspicious": risk_score >= 50}


# ── Dashboard statistics (admin) ──────────────────────────────────────

@router.get("/moderation/stats")
async def get_stats(user: User = Depends(get_current_user)):
    """Admin: Trust & Safety overview statistics."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    pending_queue = await db.moderation_queue.count_documents({"status": "pending"})
    high_risk = await db.moderation_queue.count_documents({
        "status": "pending",
        "risk_score": {"$gte": 70},
    })
    pending_reports = await db.reports.count_documents({"status": "pending"})
    actions_today = await db.moderation_actions.count_documents({
        "created_at": {"$gte": today_start},
    })
    auto_flagged = await db.moderation_queue.count_documents({
        "source": "auto",
        "status": "pending",
    })

    return {
        "pending_queue": pending_queue,
        "high_risk_items": high_risk,
        "pending_reports": pending_reports,
        "actions_today": actions_today,
        "auto_flagged": auto_flagged,
    }
