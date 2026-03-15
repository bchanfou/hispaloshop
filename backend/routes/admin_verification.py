"""
Admin verification routes: manual review queue for producer/importer verification.
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User
from services.auth_helpers import send_email
from routes.notifications import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()


# ── GET /admin/verification/queue ────────────────────────────────

@router.get("/admin/verification/queue")
async def get_verification_queue(
    status: str = "pending",
    user: User = Depends(get_current_user),
):
    """List producers pending manual verification review."""
    await require_role(user, ["admin", "super_admin"])

    if status == "pending":
        query = {
            "role": {"$in": ["producer", "importer"]},
            "verification_status.admin_review_required": True,
            "verification_status.is_verified": {"$ne": True},
        }
    elif status == "approved":
        query = {
            "role": {"$in": ["producer", "importer"]},
            "verification_status.is_verified": True,
        }
    elif status == "rejected":
        query = {
            "role": {"$in": ["producer", "importer"]},
            "verification_status.is_verified": False,
            "verification_status.admin_review_required": False,
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": {"$exists": True, "$ne": None},
        }
    else:
        query = {
            "role": {"$in": ["producer", "importer"]},
            "verification_status": {"$exists": True},
        }

    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(200)

    result = []
    for u in users:
        vs = u.get("verification_status", {})
        docs = vs.get("documents", {})
        result.append({
            "user_id": u.get("user_id"),
            "business_name": u.get("company_name") or u.get("name"),
            "email": u.get("email"),
            "country": u.get("country"),
            "role": u.get("role"),
            "requested_at": u.get("created_at"),
            "documents": {
                "cif_nif": {
                    "url": docs.get("cif_nif", {}).get("url"),
                    "number": docs.get("cif_nif", {}).get("number"),
                    "entity_name": docs.get("cif_nif", {}).get("entity_name"),
                    "status": docs.get("cif_nif", {}).get("status"),
                },
                "facility_photo": {
                    "url": docs.get("facility_photo", {}).get("url"),
                    "ai_assessment": docs.get("facility_photo", {}).get("ai_assessment"),
                    "status": docs.get("facility_photo", {}).get("status"),
                },
                "certificates": [
                    {
                        "type": c.get("type"),
                        "name": c.get("name"),
                        "url": c.get("url"),
                        "status": c.get("status"),
                        "issued_to": c.get("issued_to"),
                        "issuer": c.get("issuer"),
                        "expiry_date": c.get("expiry_date"),
                    }
                    for c in docs.get("certificates", [])
                ],
            },
            "admin_review_reason": vs.get("admin_review_reason"),
            "ai_confidence": vs.get("ai_confidence"),
            "is_verified": vs.get("is_verified", False),
            "blocked_from_selling": vs.get("blocked_from_selling", True),
        })

    return {"queue": result, "total": len(result)}


# ── POST /admin/verification/:user_id/approve ────────────────────

@router.post("/admin/verification/{user_id}/approve")
async def approve_verification(
    user_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Manually approve a producer's verification."""
    await require_role(user, ["admin", "super_admin"])

    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    notes = body.get("notes", "")
    now = datetime.now(timezone.utc)

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "verification_status.is_verified": True,
            "verification_status.verified_at": now,
            "verification_status.verified_by": "admin",
            "verification_status.admin_review_required": False,
            "verification_status.admin_review_reason": None,
            "verification_status.blocked_from_selling": False,
            "verification_status.block_reason": None,
            "verification_status.admin_notes": notes,
        }},
    )

    # Notify producer
    try:
        await create_notification(
            user_id=user_id,
            title="Cuenta verificada",
            body="Tu cuenta ha sido verificada. Ya puedes publicar y vender productos.",
            notification_type="verification_approved",
            action_url="/producer/verification",
        )
        send_email(
            to=target.get("email"),
            subject="Tu cuenta en Hispaloshop ha sido verificada",
            html=f"""
            <h2>Cuenta verificada</h2>
            <p>Hola {target.get('company_name') or target.get('name')},</p>
            <p>Tu cuenta ha sido revisada y aprobada por nuestro equipo.
            Ya puedes publicar productos y empezar a vender.</p>
            <p><a href="{_frontend_url()}/producer">Ir a mi panel</a></p>
            """,
        )
    except Exception as e:
        logger.error("Failed to notify producer %s: %s", user_id, e)

    return {"status": "approved", "user_id": user_id}


# ── POST /admin/verification/:user_id/reject ─────────────────────

@router.post("/admin/verification/{user_id}/reject")
async def reject_verification(
    user_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Reject a producer's verification with reason."""
    await require_role(user, ["admin", "super_admin"])

    body = await request.json()
    reason = body.get("reason", "").strip()
    problem_docs = body.get("documents", [])

    if not reason:
        raise HTTPException(status_code=400, detail="Debes indicar el motivo del rechazo")

    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    now = datetime.now(timezone.utc)

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "verification_status.is_verified": False,
            "verification_status.admin_review_required": False,
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": reason,
            "verification_status.rejected_at": now,
            "verification_status.rejected_by": user.user_id,
            "verification_status.rejection_documents": problem_docs,
        }},
    )

    # Notify producer
    try:
        await create_notification(
            user_id=user_id,
            title="Verificación rechazada",
            body=f"Tu verificación ha sido rechazada: {reason}",
            notification_type="verification_rejected",
            action_url="/producer/verification",
        )
        send_email(
            to=target.get("email"),
            subject="Verificación rechazada — Hispaloshop",
            html=f"""
            <h2>Verificación rechazada</h2>
            <p>Hola {target.get('company_name') or target.get('name')},</p>
            <p>Hemos revisado tu documentación y no hemos podido verificar tu cuenta.</p>
            <p><strong>Motivo:</strong> {reason}</p>
            <p>Puedes corregir los documentos y volver a subirlos desde tu panel.</p>
            <p><a href="{_frontend_url()}/producer/verification">Completar verificación</a></p>
            """,
        )
    except Exception as e:
        logger.error("Failed to notify producer %s: %s", user_id, e)

    return {"status": "rejected", "user_id": user_id, "reason": reason}


# ── POST /admin/verification/:user_id/request-more-docs ──────────

@router.post("/admin/verification/{user_id}/request-more-docs")
async def request_more_docs(
    user_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Request additional documentation from the producer."""
    await require_role(user, ["admin", "super_admin"])

    body = await request.json()
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Debes incluir un mensaje")

    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Notify producer
    try:
        await create_notification(
            user_id=user_id,
            title="Documentación adicional solicitada",
            body=message[:200],
            notification_type="system",
            action_url="/producer/verification",
        )
        send_email(
            to=target.get("email"),
            subject="Documentación adicional requerida — Hispaloshop",
            html=f"""
            <h2>Documentación adicional</h2>
            <p>Hola {target.get('company_name') or target.get('name')},</p>
            <p>{message}</p>
            <p><a href="{_frontend_url()}/producer/verification">Subir documentación</a></p>
            """,
        )
    except Exception as e:
        logger.error("Failed to notify producer %s: %s", user_id, e)

    return {"status": "docs_requested", "user_id": user_id}


# ── GET /admin/verification/:user_id/documents ───────────────────

@router.get("/admin/verification/{user_id}/documents")
async def get_verification_documents(
    user_id: str,
    user: User = Depends(get_current_user),
):
    """Get all verification documents for a producer."""
    await require_role(user, ["admin", "super_admin"])

    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    vs = target.get("verification_status", {})
    docs = vs.get("documents", {})

    return {
        "user_id": user_id,
        "business_name": target.get("company_name") or target.get("name"),
        "cif_nif": docs.get("cif_nif", {}),
        "facility_photo": docs.get("facility_photo", {}),
        "certificates": docs.get("certificates", []),
    }


def _frontend_url() -> str:
    import os
    return os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com").rstrip("/")
