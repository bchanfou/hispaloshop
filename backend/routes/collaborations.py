"""
Collab Influencer–Productor endpoints.
Fase 28: Propuestas, aceptación, links de afiliado, muestras.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import get_db
from core.auth import get_current_user
from routes.notifications import create_notification
from config import INFLUENCER_TIER_CONFIG, normalize_influencer_tier

router = APIRouter(prefix="/collaborations", tags=["collaborations"])


# ── Pydantic models ─────────────────────────────────────────

class CreateCollabBody(BaseModel):
    conversation_id: str
    influencer_id: str
    product_id: str
    commission_pct: float
    duration_days: int = 30
    send_sample: bool = False
    sample_quantity: int = 1
    notes: str = ""


class DeclineBody(BaseModel):
    reason: str = ""


class SendSampleBody(BaseModel):
    tracking_number: str
    carrier: str = "Correos"


# ── Helpers ──────────────────────────────────────────────────

def _tier_commission(tier: str) -> float:
    """Return standard commission rate for a tier (0.03, 0.05, 0.07)."""
    t = normalize_influencer_tier(tier or "hercules")
    cfg = INFLUENCER_TIER_CONFIG.get(t, INFLUENCER_TIER_CONFIG["hercules"])
    return cfg["commission_rate"]


def _gen_collab_code(username: str, slug: str) -> str:
    short = uuid.uuid4().hex[:4].upper()
    uname = (username or "user")[:12].upper().replace(" ", "")
    pslug = (slug or "prod")[:12].upper().replace(" ", "-")
    return f"COLLAB-{uname}-{pslug}-{short}"


# ── POST /collaborations ────────────────────────────────────

@router.post("")
async def create_collaboration(body: CreateCollabBody, current_user=Depends(get_current_user)):
    """Producer creates a collab proposal for an influencer."""
    if current_user.role not in ("producer", "importer"):
        raise HTTPException(status_code=403, detail="Solo productores pueden crear colaboraciones")

    db = get_db()
    from bson.objectid import ObjectId

    # Validate product belongs to producer
    try:
        product = await db.products.find_one({"_id": ObjectId(body.product_id)})
    except Exception:
        product = await db.products.find_one({"product_id": body.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if product.get("producer_id") != current_user.user_id and product.get("seller_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="No es tu producto")

    # Get influencer tier → validate commission >= tier standard
    inf_doc = await db.influencers.find_one({"influencer_id": body.influencer_id})
    inf_tier = (inf_doc or {}).get("current_tier", "hercules")
    std_rate = _tier_commission(inf_tier)

    if body.commission_pct / 100 < std_rate:
        raise HTTPException(
            status_code=400,
            detail=f"La comisión no puede ser inferior al tier ({int(std_rate * 100)}%)",
        )

    # Get influencer user info for name
    inf_user = await db.users.find_one({"user_id": body.influencer_id}, {"_id": 0, "name": 1, "username": 1})

    now = datetime.now(timezone.utc)
    collab_id = f"collab_{uuid.uuid4().hex[:12]}"

    collab = {
        "collab_id": collab_id,
        "conversation_id": body.conversation_id,
        "producer_id": current_user.user_id,
        "influencer_id": body.influencer_id,
        "status": "proposed",
        "proposal": {
            "product_id": body.product_id,
            "product_name": product.get("name", ""),
            "product_image_url": (product.get("images", [{}])[0].get("url") if product.get("images") else None),
            "commission_pct": body.commission_pct,
            "standard_commission_pct": round(std_rate * 100, 1),
            "duration_days": body.duration_days,
            "send_sample": body.send_sample,
            "sample_quantity": body.sample_quantity,
            "notes": body.notes,
            "proposed_at": now,
            "expires_at": now + timedelta(days=7),
        },
        "response": {},
        "affiliate_link": {},
        "sample_shipment": {},
        "created_at": now,
        "updated_at": now,
    }

    await db.collaborations.insert_one(collab)

    # Notify influencer
    await create_notification(
        user_id=body.influencer_id,
        title="Nueva propuesta de colaboración",
        body=f"Un productor quiere colaborar contigo con {product.get('name', '')}.",
        notification_type="b2b_offer_received",
        action_url=f"/messages",
        data={"collab_id": collab_id},
    )

    return {"collab_id": collab_id, "status": "proposed"}


# ── POST /collaborations/:id/accept ─────────────────────────

@router.post("/{collab_id}/accept")
async def accept_collaboration(collab_id: str, current_user=Depends(get_current_user)):
    """Influencer accepts a collab proposal."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if collab["influencer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Solo el influencer puede aceptar")
    if collab["status"] != "proposed":
        raise HTTPException(status_code=400, detail=f"Estado actual: {collab['status']}")

    # Generate unique affiliate code
    inf_user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "username": 1, "name": 1})
    product = await db.products.find_one({"product_id": collab["proposal"]["product_id"]}) or {}
    username = (inf_user or {}).get("username") or (inf_user or {}).get("name") or current_user.user_id
    slug = product.get("slug") or product.get("name", "product")

    code = _gen_collab_code(username, slug)
    url = f"https://hispaloshop.com/r/{code}"

    now = datetime.now(timezone.utc)

    # Create discount code for tracking
    await db.discount_codes.update_one(
        {"code": code},
        {"$setOnInsert": {
            "code": code,
            "type": "percentage",
            "value": 0,  # 0% discount — tracking only
            "active": True,
            "influencer_id": current_user.user_id,
            "collab_id": collab_id,
            "created_at": now,
        }},
        upsert=True,
    )

    await db.collaborations.update_one(
        {"collab_id": collab_id},
        {"$set": {
            "status": "active",
            "response.accepted_at": now,
            "affiliate_link": {
                "code": code,
                "url": url,
                "created_at": now,
                "clicks": 0,
                "sales": 0,
                "commission_earned": 0,
            },
            "updated_at": now,
        }},
    )

    # Notify producer
    await create_notification(
        user_id=collab["producer_id"],
        title="Colaboración aceptada",
        body=f"El influencer ha aceptado tu propuesta para {collab['proposal']['product_name']}.",
        notification_type="b2b_offer_accepted",
        action_url="/messages",
        data={"collab_id": collab_id},
    )

    return {"collab_id": collab_id, "status": "active", "affiliate_link": {"code": code, "url": url}}


# ── POST /collaborations/:id/decline ────────────────────────

@router.post("/{collab_id}/decline")
async def decline_collaboration(collab_id: str, body: DeclineBody, current_user=Depends(get_current_user)):
    """Influencer declines a collab proposal."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if collab["influencer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Solo el influencer puede declinar")
    if collab["status"] != "proposed":
        raise HTTPException(status_code=400, detail=f"Estado actual: {collab['status']}")

    now = datetime.now(timezone.utc)
    await db.collaborations.update_one(
        {"collab_id": collab_id},
        {"$set": {
            "status": "declined",
            "response.declined_at": now,
            "response.decline_reason": body.reason,
            "updated_at": now,
        }},
    )

    await create_notification(
        user_id=collab["producer_id"],
        title="Colaboración rechazada",
        body=f"El influencer ha rechazado la propuesta para {collab['proposal']['product_name']}.",
        notification_type="system",
        action_url="/messages",
        data={"collab_id": collab_id},
    )

    return {"collab_id": collab_id, "status": "declined"}


# ── POST /collaborations/:id/send-sample ────────────────────

@router.post("/{collab_id}/send-sample")
async def send_sample(collab_id: str, body: SendSampleBody, current_user=Depends(get_current_user)):
    """Producer sends product sample to influencer."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if collab["producer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Solo el productor puede enviar muestras")
    if collab["status"] not in ("active", "accepted"):
        raise HTTPException(status_code=400, detail="La colaboración debe estar activa")

    now = datetime.now(timezone.utc)
    await db.collaborations.update_one(
        {"collab_id": collab_id},
        {"$set": {
            "status": "sample_sent",
            "sample_shipment": {
                "tracking_number": body.tracking_number,
                "carrier": body.carrier,
                "sent_at": now,
                "received_at": None,
                "status": "in_transit",
            },
            "updated_at": now,
        }},
    )

    await create_notification(
        user_id=collab["influencer_id"],
        title="Muestra enviada",
        body=f"El productor ha enviado la muestra. Tracking: {body.tracking_number}",
        notification_type="order_shipped",
        action_url="/messages",
        data={"collab_id": collab_id, "tracking_number": body.tracking_number},
    )

    return {"collab_id": collab_id, "status": "sample_sent"}


# ── POST /collaborations/:id/confirm-receipt ────────────────

@router.post("/{collab_id}/confirm-receipt")
async def confirm_receipt(collab_id: str, current_user=Depends(get_current_user)):
    """Influencer confirms sample receipt."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if collab["influencer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Solo el influencer puede confirmar recepción")

    now = datetime.now(timezone.utc)
    await db.collaborations.update_one(
        {"collab_id": collab_id},
        {"$set": {
            "status": "sample_received",
            "sample_shipment.received_at": now,
            "sample_shipment.status": "delivered",
            "updated_at": now,
        }},
    )

    await create_notification(
        user_id=collab["producer_id"],
        title="Muestra recibida",
        body=f"El influencer ha confirmado la recepción de la muestra.",
        notification_type="order_delivered",
        data={"collab_id": collab_id},
    )

    return {"collab_id": collab_id, "status": "sample_received"}


# ── GET /collaborations ─────────────────────────────────────

@router.get("")
async def list_collaborations(
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """List collaborations for the current user (as producer or influencer)."""
    db = get_db()

    query = {"$or": [
        {"producer_id": current_user.user_id},
        {"influencer_id": current_user.user_id},
    ]}
    if status:
        query["status"] = status

    collabs = await db.collaborations.find(query).sort("created_at", -1).to_list(100)
    for c in collabs:
        c["_id"] = str(c.pop("_id", ""))

    return {"collaborations": collabs, "total": len(collabs)}


# ── GET /collaborations/:id ─────────────────────────────────

@router.get("/{collab_id}")
async def get_collaboration(collab_id: str, current_user=Depends(get_current_user)):
    """Get collaboration detail."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if current_user.user_id not in (collab["producer_id"], collab["influencer_id"]):
        raise HTTPException(status_code=403, detail="No autorizado")

    collab["_id"] = str(collab.pop("_id", ""))
    return collab


# ── GET /collaborations/:id/stats ────────────────────────────

@router.get("/{collab_id}/stats")
async def get_collab_stats(collab_id: str, current_user=Depends(get_current_user)):
    """Get affiliate link stats for a collaboration."""
    db = get_db()

    collab = await db.collaborations.find_one({"collab_id": collab_id})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaboración no encontrada")
    if current_user.user_id not in (collab["producer_id"], collab["influencer_id"]):
        raise HTTPException(status_code=403, detail="No autorizado")

    link = collab.get("affiliate_link", {})
    code = link.get("code")
    if not code:
        return {"clicks": 0, "sales": 0, "commission_earned": 0, "daily": []}

    # Count actual usage from orders
    sales = await db.orders.count_documents({"influencer_discount_code": code})
    # Sum commissions
    pipeline = [
        {"$match": {"influencer_discount_code": code, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$influencer_commission_cents"}}},
    ]
    agg = await db.orders.aggregate(pipeline).to_list(1)
    commission_cents = (agg[0]["total"] if agg else 0) or 0

    return {
        "clicks": link.get("clicks", 0),
        "sales": sales,
        "commission_earned": round(commission_cents / 100, 2),
        "code": code,
        "url": link.get("url", ""),
    }
