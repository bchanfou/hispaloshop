"""
Operational Support System — S23
Manages support cases created via HI chat, with full admin + user access control.
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

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Constants ────────────────────────────────────────────────────────

VALID_STATUSES = {
    "abierto",
    "en revisión",
    "pendiente de respuesta",
    "escalado a humano",
    "resuelto",
    "cerrado",
}
VALID_PRIORITIES = {"baja", "media", "alta", "urgente"}

# Structured admin actions → resulting status
ACTION_STATUS_MAP = {
    "refund_recommendation": "en revisión",
    "replacement_request": "en revisión",
    "manual_resolution": "resuelto",
    "close": "cerrado",
}

# ── Request models ────────────────────────────────────────────────────

class SupportCaseMessage(BaseModel):
    content: str


class SupportStatusUpdate(BaseModel):
    status: str
    priority: Optional[str] = None


class AdminActionRequest(BaseModel):
    action: str
    note: Optional[str] = None


# ── Internal helpers ─────────────────────────────────────────────────

def _is_admin(user: User) -> bool:
    return user.role in ("admin", "super_admin")


async def _get_case_or_404(case_id: str) -> dict:
    case = await db.support_cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return case


async def _assert_admin_country_access(case: dict, user: User) -> None:
    """super_admin sees all; admin is scoped to their assigned_country."""
    if user.role == "super_admin":
        return
    admin_doc = await db.users.find_one({"user_id": user.user_id}, {"assigned_country": 1}) or {}
    admin_country = admin_doc.get("assigned_country")
    if not admin_country:
        raise HTTPException(status_code=403, detail="Admin account has no assigned country")
    case_country = case.get("country")
    if case_country and admin_country != case_country:
        raise HTTPException(status_code=403, detail="No tienes acceso a casos de este país")


async def _country_query_for_admin(user: User) -> dict:
    """Return a MongoDB filter fragment that scopes the query by country for admins."""
    if user.role == "super_admin":
        return {}
    admin_doc = await db.users.find_one({"user_id": user.user_id}, {"assigned_country": 1}) or {}
    admin_country = admin_doc.get("assigned_country")
    if not admin_country:
        raise HTTPException(status_code=403, detail="Admin account has no assigned country")
    return {"country": admin_country}


# ── Admin: case list ─────────────────────────────────────────────────

@router.get("/support/cases")
async def list_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    country: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Admin: paginated list of support cases with optional filters."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    query = await _country_query_for_admin(user)

    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    # super_admin can filter by country explicitly
    if country and user.role == "super_admin":
        query["country"] = country

    skip = (page - 1) * limit
    total = await db.support_cases.count_documents(query)
    cases = (
        await db.support_cases.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    # Serialize datetimes
    for c in cases:
        for field in ("created_at", "updated_at", "resolved_at"):
            if c.get(field) and hasattr(c[field], "isoformat"):
                c[field] = c[field].isoformat()

    return {
        "cases": cases,
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


# ── Admin: case detail ───────────────────────────────────────────────

@router.get("/support/cases/{case_id}")
async def get_case(case_id: str, user: User = Depends(get_current_user)):
    """Admin: full case detail enriched with user and order info."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    case = await _get_case_or_404(case_id)
    await _assert_admin_country_access(case, user)

    user_doc = (
        await db.users.find_one(
            {"user_id": case.get("user_id")},
            {"_id": 0, "name": 1, "email": 1, "country": 1},
        )
        or {}
    )
    case["user_info"] = user_doc

    if case.get("order_id"):
        order_doc = (
            await db.orders.find_one(
                {"order_id": case.get("order_id")},
                {"_id": 0, "status": 1, "total": 1, "created_at": 1},
            )
            or {}
        )
        case["order_info"] = order_doc

    # Serialize datetimes
    for field in ("created_at", "updated_at", "resolved_at"):
        if case.get(field) and hasattr(case[field], "isoformat"):
            case[field] = case[field].isoformat()

    return case


# ── Admin: update status / priority ─────────────────────────────────

@router.patch("/support/cases/{case_id}/status")
async def update_case_status(
    case_id: str,
    body: SupportStatusUpdate,
    user: User = Depends(get_current_user),
):
    """Admin: update case status and optionally priority."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    case = await _get_case_or_404(case_id)
    await _assert_admin_country_access(case, user)

    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Estado no válido. Valores aceptados: {', '.join(VALID_STATUSES)}",
        )
    if body.priority and body.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Prioridad no válida. Valores aceptados: {', '.join(VALID_PRIORITIES)}",
        )

    now = datetime.now(timezone.utc)
    update: dict = {
        "status": body.status,
        "updated_at": now,
        "assigned_admin_id": user.user_id,
    }
    if body.priority:
        update["priority"] = body.priority
    if body.status in ("resuelto", "cerrado"):
        update["resolved_at"] = now

    history_entry = {
        "type": "status_change",
        "from": case.get("status"),
        "to": body.status,
        "by": user.user_id,
        "at": now,
    }

    await db.support_cases.update_one(
        {"case_id": case_id},
        {"$set": update, "$push": {"history": history_entry}},
    )

    if body.status == "escalado a humano":
        await db.notifications.insert_one({
            "user_id": case.get("user_id", ""),
            "type": "support_reply",
            "title": "Caso escalado a soporte",
            "body": "Tu caso ha sido escalado a un agente humano. Te responderemos pronto.",
            "action_url": "/settings/support",
            "data": {"case_id": case_id},
            "channels": ["in_app"],
            "status_by_channel": {"in_app": "sent"},
            "read_at": None,
            "created_at": now,
            "sent_at": now,
        })

    return {"case_id": case_id, "status": body.status}


# ── Admin: send message ──────────────────────────────────────────────

@router.post("/support/cases/{case_id}/messages")
async def admin_send_message(
    case_id: str,
    body: SupportCaseMessage,
    user: User = Depends(get_current_user),
):
    """Admin: append a message to the case thread."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    case = await _get_case_or_404(case_id)
    await _assert_admin_country_access(case, user)

    now = datetime.now(timezone.utc)
    msg = {
        "message_id": str(uuid.uuid4()),
        "sender": "admin",
        "sender_id": user.user_id,
        "content": body.content,
        "created_at": now.isoformat(),
    }
    await db.support_cases.update_one(
        {"case_id": case_id},
        {
            "$push": {"messages": msg},
            "$set": {"updated_at": now, "assigned_admin_id": user.user_id},
        },
    )
    await db.notifications.insert_one({
        "user_id": case.get("user_id", ""),
        "type": "support_reply",
        "title": "Respuesta de soporte",
        "body": "Has recibido una respuesta del equipo de soporte.",
        "action_url": "/settings/support",
        "data": {"case_id": case_id},
        "channels": ["in_app"],
        "status_by_channel": {"in_app": "sent"},
        "read_at": None,
        "created_at": now,
        "sent_at": now,
    })
    return msg


# ── Admin: structured action ─────────────────────────────────────────

@router.post("/support/cases/{case_id}/action")
async def admin_action(
    case_id: str,
    body: AdminActionRequest,
    user: User = Depends(get_current_user),
):
    """Admin: perform a structured action (refund recommendation, close, etc.)."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    case = await _get_case_or_404(case_id)
    await _assert_admin_country_access(case, user)

    if body.action not in ACTION_STATUS_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Acción no válida. Valores aceptados: {', '.join(ACTION_STATUS_MAP)}",
        )

    now = datetime.now(timezone.utc)
    new_status = ACTION_STATUS_MAP[body.action]
    update = {
        "status": new_status,
        "updated_at": now,
        "assigned_admin_id": user.user_id,
    }
    if new_status in ("resuelto", "cerrado"):
        update["resolved_at"] = now

    history_entry = {
        "type": "admin_action",
        "action": body.action,
        "note": body.note,
        "by": user.user_id,
        "at": now,
    }

    await db.support_cases.update_one(
        {"case_id": case_id},
        {"$set": update, "$push": {"history": history_entry}},
    )
    return {"case_id": case_id, "action": body.action, "new_status": new_status}


# ── Admin: notification count ────────────────────────────────────────

@router.get("/support/notifications/unread-count")
async def support_unread_count(user: User = Depends(get_current_user)):
    """Admin: count unread support notifications scoped to country."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    query = {
        "user_id": user.user_id,
        "read_at": None,
        "type": "support_reply",
    }
    count = await db.notifications.count_documents(query)
    return {"count": count}


# ── User: my cases ────────────────────────────────────────────────────

@router.get("/support/my-cases")
async def get_my_cases(user: User = Depends(get_current_user)):
    """User: list their own support cases."""
    cases = (
        await db.support_cases.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )
    for c in cases:
        for field in ("created_at", "updated_at", "resolved_at"):
            if c.get(field) and hasattr(c[field], "isoformat"):
                c[field] = c[field].isoformat()
    return cases


@router.get("/support/my-cases/{case_id}")
async def get_my_case(case_id: str, user: User = Depends(get_current_user)):
    """User: view a specific case of theirs."""
    case = await _get_case_or_404(case_id)
    if case.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    for field in ("created_at", "updated_at", "resolved_at"):
        if case.get(field) and hasattr(case[field], "isoformat"):
            case[field] = case[field].isoformat()
    return case


@router.post("/support/my-cases/{case_id}/messages")
async def user_send_message(
    case_id: str,
    body: SupportCaseMessage,
    user: User = Depends(get_current_user),
):
    """User: reply to an open support case."""
    case = await _get_case_or_404(case_id)
    if case.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if case.get("status") in ("cerrado", "resuelto"):
        raise HTTPException(status_code=400, detail="El caso ya está cerrado")

    now = datetime.now(timezone.utc)
    msg = {
        "message_id": str(uuid.uuid4()),
        "sender": "user",
        "sender_id": user.user_id,
        "content": body.content,
        "created_at": now.isoformat(),
    }
    await db.support_cases.update_one(
        {"case_id": case_id},
        {
            "$push": {"messages": msg},
            "$set": {"status": "pendiente de respuesta", "updated_at": now},
        },
    )
    await db.notifications.insert_one({
        "user_id": user.user_id,
        "type": "support_reply",
        "title": "Tu mensaje fue enviado",
        "body": "Tu respuesta ha sido registrada. Te notificaremos cuando soporte conteste.",
        "action_url": "/settings/support",
        "data": {"case_id": case_id},
        "channels": ["in_app"],
        "status_by_channel": {"in_app": "sent"},
        "read_at": None,
        "created_at": now,
        "sent_at": now,
    })
    return msg
