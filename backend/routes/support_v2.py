"""
Support & ticketing system — section 3.4.

This module is the canonical /api/support/* and /api/help/* surface for the
user-facing ticket flow + the public knowledge base. Country admin and super
admin endpoints live alongside in country_admin.py / super_admin.py and reuse
the helpers exported here.

Collections (created with indexes in core/database.py):
  - support_tickets        : the ticket itself
  - support_messages       : message thread inside a ticket
  - support_articles       : knowledge base
  - support_csat           : satisfaction survey responses

Strict rules:
  - A user can only read their own tickets (404 on cross-user reads).
  - is_internal_note=True is filtered out server-side from any endpoint
    that returns messages to a non-admin user.
  - SLA (first_response, resolution) is computed at ticket creation time
    based on category->priority->due_date and stored in the ticket doc.
  - Attachments are validated server-side (type + size + count).
  - AI triage is best-effort: if the LLM fails, the form still submits.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, Field

from core.database import db
from core.auth import get_current_user, _normalize_role
from core.models import User
from services.notifications.dispatcher_service import notification_dispatcher

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

CATEGORIES = (
    "order_issue",
    "payment_issue",
    "account_issue",
    "fiscal_issue",
    "product_complaint",
    "seller_dispute",
    "b2b_operation",
    "feature_request",
    "bug_report",
    "other",
)

PRIORITY_MAP = {
    "payment_issue": "critical",
    "bug_report": "critical",
    "order_issue": "high",
    "fiscal_issue": "high",
    "b2b_operation": "high",
    "account_issue": "normal",
    "product_complaint": "normal",
    "seller_dispute": "normal",
    "feature_request": "low",
    "other": "low",
}

# (first_response_minutes, resolution_hours)
SLA_BY_PRIORITY = {
    "critical": (60, 8),
    "high": (4 * 60, 24),
    "normal": (12 * 60, 72),
    "low": (24 * 60, 7 * 24),
}

VALID_STATUSES = (
    "open", "awaiting_admin", "awaiting_user", "in_progress",
    "escalated", "resolved", "closed", "reopened",
)

ALLOWED_ATTACHMENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
MAX_ATTACHMENTS_PER_MESSAGE = 5

REOPEN_WINDOW_DAYS = 30
AUTO_CLOSE_AWAITING_USER_DAYS = 7


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _calc_priority(category: str) -> str:
    return PRIORITY_MAP.get(category, "low")


def _calc_sla(priority: str) -> Dict[str, str]:
    fr_min, res_h = SLA_BY_PRIORITY[priority]
    now = _now()
    return {
        "sla_first_response_due": (now + timedelta(minutes=fr_min)).isoformat(),
        "sla_resolution_due": (now + timedelta(hours=res_h)).isoformat(),
    }


async def _next_ticket_number() -> str:
    """Generate HSP-2026-000123 sequential human-readable number.

    Uses an atomic findOneAndUpdate on a counters doc.
    """
    year = _now().year
    counter_id = f"support_ticket_{year}"
    result = await db.counters.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = (result or {}).get("seq", 1)
    return f"HSP-{year}-{seq:06d}"


async def _resolve_admin_for_country(country_code: Optional[str]) -> Optional[str]:
    """Return the assigned country admin's user_id, or None to fall into the global pool."""
    if not country_code:
        return None
    cfg = await db.country_configs.find_one(
        {"country_code": country_code.upper()},
        {"_id": 0, "admin_user_id": 1},
    )
    return (cfg or {}).get("admin_user_id")


async def _audit_ticket(action: str, ticket: dict, actor_id: str, country_code: Optional[str], reason: str = "") -> None:
    """Mirror ticket actions into country_admin_audit so the section 3.2 dashboard sees them."""
    try:
        await db.country_admin_audit.insert_one({
            "log_id": f"caudit_{uuid.uuid4().hex[:16]}",
            "admin_user_id": actor_id,
            "country_code": (country_code or "GLOBAL").upper(),
            "action": action,
            "target_id": ticket.get("ticket_id", ""),
            "target_type": "support_ticket",
            "reason": reason,
            "ip": "",
            "extra": {"ticket_number": ticket.get("ticket_number")},
            "timestamp": _now_iso(),
        })
    except Exception as exc:
        logger.warning("[SUPPORT] Audit insert failed: %s", exc)


def _strip_internal_notes(messages: List[dict]) -> List[dict]:
    """Remove messages flagged as internal notes — used for user-facing endpoints."""
    return [m for m in messages if not m.get("is_internal_note", False)]


def _validate_attachments(items: Optional[List[dict]]) -> List[dict]:
    """Validate a list of {url, filename, size, content_type}. Raises HTTPException."""
    if not items:
        return []
    if len(items) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_ATTACHMENTS_PER_MESSAGE} adjuntos por mensaje")
    cleaned: List[dict] = []
    for it in items:
        ct = (it.get("content_type") or "").lower()
        size = int(it.get("size") or 0)
        if ct not in ALLOWED_ATTACHMENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {ct}. Acepta JPG, PNG, PDF.")
        if size <= 0 or size > MAX_ATTACHMENT_SIZE:
            raise HTTPException(status_code=400, detail=f"Adjunto excede 5MB: {it.get('filename', '')}")
        cleaned.append({
            "url": str(it.get("url", "")),
            "filename": str(it.get("filename", "")),
            "size": size,
            "content_type": ct,
        })
    return cleaned


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    category: str
    body: str = Field(..., min_length=5, max_length=5000)
    attachments: Optional[List[Dict[str, Any]]] = None
    related_order_id: Optional[str] = None
    related_product_id: Optional[str] = None
    related_b2b_operation_id: Optional[str] = None
    ai_triage: Optional[Dict[str, Any]] = None


class TicketMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    attachments: Optional[List[Dict[str, Any]]] = None


class CSATSubmit(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class TriageRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    category: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Ticket creation + listing (USER endpoints)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/support/tickets")
async def create_ticket(payload: TicketCreate, user: User = Depends(get_current_user)):
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida. Acepta: {list(CATEGORIES)}")

    attachments = _validate_attachments(payload.attachments)
    priority = _calc_priority(payload.category)
    sla = _calc_sla(priority)
    country_code = (getattr(user, "country", None) or "").upper() or "ES"
    assigned_admin = await _resolve_admin_for_country(country_code)
    now_iso = _now_iso()

    ticket_id = f"tk_{uuid.uuid4().hex[:14]}"
    ticket_number = await _next_ticket_number()

    # bug_report tickets auto-escalate to super admin (section 3.5 follow-up)
    auto_escalate = payload.category == "bug_report"
    initial_status = "escalated" if auto_escalate else ("awaiting_admin" if assigned_admin else "open")

    ticket = {
        "ticket_id": ticket_id,
        "ticket_number": ticket_number,
        "user_id": user.user_id,
        "user_role": _normalize_role(user.role),
        "user_country": country_code,
        "subject": payload.subject.strip(),
        "category": payload.category,
        "priority": priority,
        "status": initial_status,
        "escalated_to_super_admin": auto_escalate,
        "escalation_reason": "Auto: bug_report category" if auto_escalate else None,
        "escalated_at": now_iso if auto_escalate else None,
        "country_code": country_code,
        "assigned_admin_id": assigned_admin if not auto_escalate else None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "first_response_at": None,
        "resolved_at": None,
        "closed_at": None,
        "sla_first_response_due": sla["sla_first_response_due"],
        "sla_resolution_due": sla["sla_resolution_due"],
        "sla_first_response_met": None,
        "sla_resolution_met": None,
        "related_order_id": payload.related_order_id,
        "related_product_id": payload.related_product_id,
        "related_b2b_operation_id": payload.related_b2b_operation_id,
        "ai_triage": payload.ai_triage,
        "tags": [],
        "reopened_count": 0,
    }
    await db.support_tickets.insert_one(ticket)

    first_message = {
        "message_id": f"msg_{uuid.uuid4().hex[:14]}",
        "ticket_id": ticket_id,
        "sender_id": user.user_id,
        "sender_role": "user",
        "body": payload.body.strip(),
        "attachments": attachments,
        "created_at": now_iso,
        "read_by_user": True,
        "read_by_admin": False,
        "is_internal_note": False,
    }
    await db.support_messages.insert_one(first_message)

    # Notify the assigned admin (or noop if pool)
    if assigned_admin:
        try:
            await notification_dispatcher.send_notification(
                user_id=assigned_admin,
                title="Nuevo ticket de soporte",
                body=f"#{ticket_number} · {payload.subject[:80]}",
                notification_type="support_ticket_created",
                channels=["in_app", "push"],
                data={"ticket_id": ticket_id, "country_code": country_code},
                action_url=f"/country-admin/support",
            )
        except Exception as exc:
            logger.warning("[SUPPORT] Could not notify admin: %s", exc)

    return {"ticket_id": ticket_id, "ticket_number": ticket_number, "status": ticket["status"]}


@router.get("/support/tickets")
async def list_my_tickets(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    limit = min(100, max(1, limit))
    query: dict = {"user_id": user.user_id}
    if status:
        query["status"] = status
    total = await db.support_tickets.count_documents(query)
    items = await db.support_tickets.find(query, {"_id": 0}).sort("updated_at", -1).skip(max(0, offset)).limit(limit).to_list(limit)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/support/tickets/{ticket_id}")
async def get_my_ticket(ticket_id: str, user: User = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one(
        {"ticket_id": ticket_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not ticket:
        # 404, never 403 — do not leak existence
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    messages = await db.support_messages.find(
        {"ticket_id": ticket_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    messages = _strip_internal_notes(messages)

    # Mark admin replies as read by user
    await db.support_messages.update_many(
        {"ticket_id": ticket_id, "sender_role": "admin", "read_by_user": False, "is_internal_note": {"$ne": True}},
        {"$set": {"read_by_user": True}},
    )
    return {"ticket": ticket, "messages": messages}


@router.post("/support/tickets/{ticket_id}/messages")
async def user_add_message(ticket_id: str, payload: TicketMessageCreate, user: User = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id, "user_id": user.user_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if ticket.get("status") in ("closed",):
        raise HTTPException(status_code=400, detail="Este ticket está cerrado. Usa reabrir.")

    attachments = _validate_attachments(payload.attachments)
    now_iso = _now_iso()
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:14]}",
        "ticket_id": ticket_id,
        "sender_id": user.user_id,
        "sender_role": "user",
        "body": payload.body.strip(),
        "attachments": attachments,
        "created_at": now_iso,
        "read_by_user": True,
        "read_by_admin": False,
        "is_internal_note": False,
    }
    await db.support_messages.insert_one(msg)

    # Move status to in_progress / awaiting_admin
    new_status = "in_progress" if ticket.get("first_response_at") else "awaiting_admin"
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": new_status, "updated_at": now_iso}},
    )

    if ticket.get("assigned_admin_id"):
        try:
            await notification_dispatcher.send_notification(
                user_id=ticket["assigned_admin_id"],
                title="Respuesta del usuario",
                body=f"#{ticket['ticket_number']} tiene una nueva respuesta",
                notification_type="support_ticket_replied_user",
                channels=["in_app", "push"],
                data={"ticket_id": ticket_id},
                action_url="/country-admin/support",
            )
        except Exception:
            pass
    return {"status": "ok", "message_id": msg["message_id"]}


@router.post("/support/tickets/{ticket_id}/reopen")
async def reopen_ticket(ticket_id: str, user: User = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id, "user_id": user.user_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if ticket.get("status") not in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="El ticket no está cerrado")

    closed_at = ticket.get("closed_at") or ticket.get("resolved_at")
    if closed_at:
        try:
            closed_dt = datetime.fromisoformat(closed_at.replace("Z", "+00:00"))
            if (_now() - closed_dt).days > REOPEN_WINDOW_DAYS:
                raise HTTPException(status_code=400, detail=f"Solo se puede reabrir dentro de {REOPEN_WINDOW_DAYS} días")
        except (ValueError, TypeError):
            pass

    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$set": {"status": "reopened", "updated_at": _now_iso(), "closed_at": None},
            "$inc": {"reopened_count": 1},
        },
    )
    if ticket.get("assigned_admin_id"):
        try:
            await notification_dispatcher.send_notification(
                user_id=ticket["assigned_admin_id"],
                title="Ticket reabierto",
                body=f"#{ticket['ticket_number']} ha sido reabierto",
                notification_type="support_ticket_reopened",
                channels=["in_app", "push"],
                data={"ticket_id": ticket_id},
                action_url="/country-admin/support",
            )
        except Exception:
            pass
    return {"status": "reopened"}


@router.post("/support/tickets/{ticket_id}/csat")
async def submit_csat(ticket_id: str, payload: CSATSubmit, user: User = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id, "user_id": user.user_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    existing = await db.support_csat.find_one({"ticket_id": ticket_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya enviaste una valoración para este ticket")

    await db.support_csat.insert_one({
        "csat_id": f"csat_{uuid.uuid4().hex[:14]}",
        "ticket_id": ticket_id,
        "user_id": user.user_id,
        "rating": payload.rating,
        "comment": payload.comment or "",
        "country_code": ticket.get("country_code"),
        "assigned_admin_id": ticket.get("assigned_admin_id"),
        "created_at": _now_iso(),
    })
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
# Knowledge base (PUBLIC)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/help/articles")
async def list_articles(
    category: Optional[str] = None,
    role: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
):
    limit = min(50, max(1, limit))
    query: dict = {"published": True}
    if category:
        query["category"] = category
    if role:
        query["role_target"] = {"$in": [role, "all"]}
    if country:
        query["country_target"] = {"$in": [country.upper(), "all"]}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"body": {"$regex": search, "$options": "i"}},
        ]
    items = await db.support_articles.find(query, {"_id": 0, "body": 0}).sort("updated_at", -1).limit(limit).to_list(limit)
    return {"items": items, "total": len(items)}


@router.get("/help/articles/{slug}")
async def get_article(slug: str):
    article = await db.support_articles.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    # Track views (best-effort)
    try:
        await db.support_articles.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    except Exception:
        pass
    return article


# ─────────────────────────────────────────────────────────────────────────────
# AI triage (best effort)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/support/tickets/ai-triage")
async def ai_triage(payload: TriageRequest, user: User = Depends(get_current_user)):
    """
    Returns suggested category + KB articles + can_self_resolve flag.

    Best-effort: if AI is unreachable or returns garbage, falls back to a
    rule-based heuristic so the form keeps working.
    """
    # Cache by hash(subject+body+role)
    key = hashlib.sha256(f"{payload.subject}|{payload.body}|{user.role}".encode()).hexdigest()
    cached = await db.support_triage_cache.find_one({"_id": key}, {"_id": 0, "result": 1, "expires_at": 1})
    if cached and cached.get("expires_at", "") > _now_iso():
        return cached["result"]

    # Pull KB context for this role (slugs + titles only)
    role = _normalize_role(user.role)
    kb_query = {"published": True, "role_target": {"$in": [role, "all"]}}
    kb_items = await db.support_articles.find(kb_query, {"_id": 0, "slug": 1, "title": 1, "category": 1}).limit(40).to_list(40)

    # Heuristic fallback (used if AI fails)
    def heuristic() -> dict:
        text = (payload.subject + " " + payload.body).lower()
        cat = "other"
        if any(w in text for w in ["pago", "payment", "tarjeta", "stripe", "factura", "refund"]):
            cat = "payment_issue"
        elif any(w in text for w in ["pedido", "order", "envío", "shipping", "tracking"]):
            cat = "order_issue"
        elif any(w in text for w in ["cuenta", "login", "verificación", "verification"]):
            cat = "account_issue"
        elif any(w in text for w in ["irpf", "modelo 190", "fiscal", "iva", "vat"]):
            cat = "fiscal_issue"
        elif any(w in text for w in ["bug", "error", "crash", "se rompe"]):
            cat = "bug_report"

        # naive matching
        suggested = []
        for art in kb_items[:3]:
            suggested.append(art["slug"])
        return {
            "suggested_category": cat,
            "suggested_articles": suggested,
            "confidence": 0.3,
            "can_self_resolve": False,
            "suggested_response": None,
            "source": "heuristic",
        }

    result: Dict[str, Any]
    try:
        # Try the existing /ai/chat surface — if it doesn't exist or errors, fall through.
        from services import ai_helpers as _ai  # noqa: F401
        # We don't actually call an LLM here in production unless the helper exists.
        # Without ai_helpers.triage(), use the heuristic.
        if hasattr(_ai, "support_triage"):
            result = await _ai.support_triage(payload.subject, payload.body, role, kb_items)
        else:
            result = heuristic()
    except Exception as exc:
        logger.info("[SUPPORT] AI triage fell back to heuristic: %s", exc)
        result = heuristic()

    # 24h cache
    try:
        expires = (_now() + timedelta(hours=24)).isoformat()
        await db.support_triage_cache.update_one(
            {"_id": key},
            {"$set": {"result": result, "expires_at": expires}},
            upsert=True,
        )
    except Exception:
        pass
    return result
