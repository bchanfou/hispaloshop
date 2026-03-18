from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_current_user, require_role
from core.database import db
from core.models import RFQCreateInput, User
from services.auth_helpers import send_email
from services.markets import normalize_market_code


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/rfq/contact")
async def create_rfq(data: RFQCreateInput, user: User = Depends(get_current_user)):
    """Create a new RFQ (request for quote) to a producer."""
    await require_role(user, ["importer"])

    producer = await db.users.find_one(
        {"user_id": data.producer_id, "role": "producer"},
        {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "company_name": 1},
    )
    if not producer:
        raise HTTPException(status_code=404, detail="Productor no encontrado")

    product_ids = sorted({pid for pid in data.product_ids if pid})
    if not product_ids:
        raise HTTPException(status_code=400, detail="Debes indicar al menos un producto")

    valid_products = await db.products.count_documents(
        {
            "product_id": {"$in": product_ids},
            "producer_id": data.producer_id,
            "status": {"$in": ["active", "approved"]},
        }
    )
    if valid_products != len(product_ids):
        raise HTTPException(status_code=400, detail="Uno o varios productos no pertenecen al productor indicado")

    target_country = normalize_market_code(data.target_country)
    if not target_country:
        raise HTTPException(status_code=400, detail="target_country invalido")

    rfq_id = f"rfq_{datetime.now(timezone.utc).timestamp():.0f}"
    rfq = {
        "rfq_id": rfq_id,
        "importer_id": user.user_id,
        "producer_id": data.producer_id,
        "product_ids": product_ids,
        "message": data.message.strip(),
        "target_country": target_country,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.rfq_requests.insert_one(rfq)

    email_sent = False
    if producer.get("email"):
        subject = f"Nueva solicitud mayorista de {getattr(user, 'email', user.user_id)}"
        html = f"""
        <h2>Nueva solicitud RFQ</h2>
        <p><strong>Importador:</strong> {getattr(user, 'email', user.user_id)}</p>
        <p><strong>Pais destino:</strong> {target_country}</p>
        <p><strong>Productos:</strong> {', '.join(product_ids)}</p>
        <p><strong>Mensaje:</strong></p>
        <p>{data.message.strip()}</p>
        """
        try:
            send_email(producer.get("email", ""), subject, html)
            email_sent = True
        except Exception as exc:
            logger.warning("RFQ email failed for producer %s: %s", data.producer_id, exc)

    await db.rfq_requests.update_one(
        {"rfq_id": rfq_id},
        {"$set": {"email_sent": email_sent, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    return {"status": "sent", "rfq_id": rfq_id, "email_sent": email_sent}


@router.get("/rfq/mine")
async def list_my_rfqs(user: User = Depends(get_current_user)):
    """List RFQs sent by the current importer."""
    await require_role(user, ["importer"])

    rfqs = await db.rfq_requests.find(
        {"importer_id": user.user_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"items": rfqs}


@router.get("/rfq/received")
async def list_received_rfqs(user: User = Depends(get_current_user)):
    """List RFQs received by the current producer."""
    await require_role(user, ["producer"])

    rfqs = await db.rfq_requests.find(
        {"producer_id": user.user_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"items": rfqs}
