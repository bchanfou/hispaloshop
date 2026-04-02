"""
B2B Operations — Formal offers with Incoterms, counteroffers, and acceptance flow.
"""
import asyncio
from decimal import Decimal
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from pydantic import BaseModel, Field

from core.auth import get_current_user, require_role
from core.models import User
from core.database import get_db
from services.b2b_contract_service import (
    generate_contract,
    notify_contract_ready,
    seal_contract,
    notify_contract_signed,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["B2B Operations"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PLATFORM_FEE_PCT = 3.0
STRIPE_FEE_PCT = 1.4

VALID_STATUSES = {
    "draft", "offer_sent", "offer_accepted", "offer_rejected",
    "contract_pending", "contract_signed", "contract_generated",
    "payment_pending", "payment_confirmed",
    "in_transit", "delivered", "completed",
    "cancelled", "refunded", "disputed",
}

VALID_UNITS = {"kg", "units", "liters", "boxes", "pallets", "unidades", "litros", "cajas"}
VALID_CURRENCIES = {"EUR", "USD"}
VALID_PAYMENT_TERMS = {"prepaid", "net_30", "net_60", "letter_of_credit"}
VALID_INCOTERMS = {"EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB"}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class OfferInput(BaseModel):
    product_name: str
    product_id: Optional[str] = None
    quantity: int = Field(gt=0)
    unit: str
    price_per_unit: float = Field(gt=0)
    currency: str = "EUR"
    payment_terms: str
    incoterm: str
    incoterm_city: str
    delivery_days: int = Field(gt=0)
    validity_days: int = Field(gt=0, le=365)
    notes: Optional[str] = None


class CreateOperationInput(BaseModel):
    conversation_id: str
    counterpart_id: str
    offer: OfferInput


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_offer_doc(
    data: OfferInput,
    version: int,
    created_by: str,
    modified_fields: Optional[List[str]] = None,
) -> dict:
    """Build a normalised offer sub-document."""
    now = datetime.now(timezone.utc)
    total_price = round(data.quantity * data.price_per_unit, 2)
    fee_pct = PLATFORM_FEE_PCT + STRIPE_FEE_PCT
    net_total = float((Decimal(str(total_price)) * (100 - fee_pct) / 100).quantize(Decimal("0.01")))
    expires_at = now + timedelta(days=data.validity_days)

    return {
        "version": version,
        "created_at": now.isoformat(),
        "created_by": created_by,
        "product_name": data.product_name,
        "product_id": data.product_id,
        "quantity": data.quantity,
        "unit": data.unit,
        "price_per_unit": data.price_per_unit,
        "currency": data.currency,
        "platform_fee_pct": PLATFORM_FEE_PCT,
        "stripe_fee_pct": STRIPE_FEE_PCT,
        "total_price": total_price,
        "net_total": net_total,
        "payment_terms": data.payment_terms,
        "incoterm": data.incoterm,
        "incoterm_city": data.incoterm_city,
        "delivery_days": data.delivery_days,
        "validity_days": data.validity_days,
        "expires_at": expires_at.isoformat(),
        "notes": data.notes,
        "modified_fields": modified_fields,
    }


def _validate_offer_enums(data: OfferInput):
    """Raise 422 if any enum field has an invalid value."""
    if data.unit not in VALID_UNITS:
        raise HTTPException(status_code=422, detail=f"Invalid unit. Must be one of: {', '.join(sorted(VALID_UNITS))}")
    if data.currency not in VALID_CURRENCIES:
        raise HTTPException(status_code=422, detail=f"Invalid currency. Must be one of: {', '.join(sorted(VALID_CURRENCIES))}")
    if data.payment_terms not in VALID_PAYMENT_TERMS:
        raise HTTPException(status_code=422, detail=f"Invalid payment_terms. Must be one of: {', '.join(sorted(VALID_PAYMENT_TERMS))}")
    if data.incoterm not in VALID_INCOTERMS:
        raise HTTPException(status_code=422, detail=f"Invalid incoterm. Must be one of: {', '.join(sorted(VALID_INCOTERMS))}")


def _serialize_operation(op: dict) -> dict:
    """Convert MongoDB document to JSON-safe dict."""
    op["id"] = str(op.pop("_id", ""))
    return op


def _detect_modified_fields(prev: dict, new: OfferInput) -> List[str]:
    """Compare the previous offer version with new input and return changed field names."""
    compare_keys = [
        "product_name", "product_id", "quantity", "unit",
        "price_per_unit", "currency", "payment_terms",
        "incoterm", "incoterm_city", "delivery_days",
        "validity_days", "notes",
    ]
    changed = []
    for key in compare_keys:
        old_val = prev.get(key)
        new_val = getattr(new, key, None)
        if old_val != new_val:
            changed.append(key)
    return changed


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", status_code=201)
async def create_operation(
    body: CreateOperationInput,
    current_user=Depends(get_current_user),
):
    """Create a new B2B operation with the first offer."""
    _validate_offer_enums(body.offer)

    db = get_db()
    now = datetime.now(timezone.utc)
    user_id = current_user.user_id
    role = current_user.role

    # Determine buyer / seller based on role
    if role == "importer":
        buyer_id = user_id
        seller_id = body.counterpart_id
    elif role == "producer":
        buyer_id = body.counterpart_id
        seller_id = user_id
    else:
        raise HTTPException(status_code=403, detail="Only importers and producers can create B2B operations")

    offer_doc = _build_offer_doc(body.offer, version=1, created_by=user_id)

    operation = {
        "conversation_id": body.conversation_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "status": "offer_sent",
        "offers": [offer_doc],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = await db.b2b_operations.insert_one(operation)
    operation["_id"] = result.inserted_id

    return _serialize_operation(operation)


@router.get("/")
async def list_operations(
    status: Optional[str] = Query(None),
    conversation_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """List B2B operations for the current user (as buyer or seller)."""
    db = get_db()
    user_id = current_user.user_id

    query = {
        "$or": [
            {"buyer_id": user_id},
            {"seller_id": user_id},
        ]
    }

    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail=f"Invalid status filter. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
        query["status"] = status

    if conversation_id:
        query["conversation_id"] = conversation_id

    cursor = db.b2b_operations.find(query).sort("updated_at", -1)
    operations = await cursor.to_list(length=200)

    return [_serialize_operation(op) for op in operations]


@router.get("/{operation_id}")
async def get_operation(
    operation_id: str,
    current_user=Depends(get_current_user),
):
    """Get full operation detail including all offer versions."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    return _serialize_operation(operation)


@router.post("/{operation_id}/offers", status_code=201)
async def add_counteroffer(
    operation_id: str,
    body: OfferInput,
    current_user=Depends(get_current_user),
):
    """Add a counteroffer (new version) to an existing operation."""
    _validate_offer_enums(body)

    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    # Detect modified fields vs previous version
    offers = operation.get("offers", [])
    if not offers:
        raise HTTPException(status_code=400, detail="No previous offers found")
    prev_offer = offers[-1]
    modified_fields = _detect_modified_fields(prev_offer, body)
    new_version = prev_offer.get("version", 0) + 1

    offer_doc = _build_offer_doc(
        body,
        version=new_version,
        created_by=user_id,
        modified_fields=modified_fields if modified_fields else None,
    )

    now = datetime.now(timezone.utc).isoformat()

    await db.b2b_operations.update_one(
        {"_id": oid},
        {
            "$push": {"offers": offer_doc},
            "$set": {"status": "offer_sent", "updated_at": now},
        },
    )

    updated = await db.b2b_operations.find_one({"_id": oid})
    return _serialize_operation(updated)


@router.put("/{operation_id}/offers/{version}/accept")
async def accept_offer(
    operation_id: str,
    version: int,
    current_user=Depends(get_current_user),
):
    """Accept a specific offer version. Only the receiver (not the creator) can accept."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    # Guard: cannot accept on already-completed/accepted operations
    op_status = operation.get("status", "")
    if op_status in ("offer_accepted", "contract_generated", "contract_signed", "payment_confirmed", "in_transit", "delivered", "completed"):
        raise HTTPException(status_code=400, detail=f"Cannot accept offer: operation is already '{op_status}'")

    # Find the offer version
    target_offer = None
    for offer in operation.get("offers", []):
        if offer.get("version") == version:
            target_offer = offer
            break

    if not target_offer:
        raise HTTPException(status_code=404, detail=f"Offer version {version} not found")

    # Verify current user is the receiver, not the creator
    if target_offer.get("created_by") == user_id:
        raise HTTPException(status_code=403, detail="Cannot accept your own offer")

    now = datetime.now(timezone.utc).isoformat()

    # Atomic status transition to prevent concurrent accepts
    result = await db.b2b_operations.update_one(
        {"_id": oid, "status": {"$in": ["offer_sent", "negotiating"]}},
        {"$set": {"status": "offer_accepted", "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=409, detail="Operation status changed concurrently. Please refresh.")

    updated = await db.b2b_operations.find_one({"_id": oid})

    # Trigger contract generation in the background
    async def _generate_in_bg(op_doc):
        try:
            result = await generate_contract(op_doc, db)
            await db.b2b_operations.update_one(
                {"_id": oid},
                {"$set": {
                    "status": "contract_generated",
                    "contract": {
                        "pdf_url": result["pdf_url"],
                        "contract_hash": result["contract_hash"],
                        "generated_at": result["generated_at"],
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            refreshed = await db.b2b_operations.find_one({"_id": oid})
            await notify_contract_ready(refreshed, db)
        except Exception as exc:
            logger.error("Background contract generation failed for %s: %s", operation_id, exc)

    from services.background import create_safe_task
    create_safe_task(_generate_in_bg(updated), name="b2b_contract_gen")

    return _serialize_operation(updated)


@router.put("/{operation_id}/offers/{version}/reject")
async def reject_offer(
    operation_id: str,
    version: int,
    current_user=Depends(get_current_user),
):
    """Reject a specific offer version. Only the receiver (not the creator) can reject."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    # Find the offer version
    target_offer = None
    for offer in operation.get("offers", []):
        if offer.get("version") == version:
            target_offer = offer
            break

    if not target_offer:
        raise HTTPException(status_code=404, detail=f"Offer version {version} not found")

    # Verify current user is the receiver, not the creator
    if target_offer.get("created_by") == user_id:
        raise HTTPException(status_code=403, detail="Cannot reject your own offer")

    now = datetime.now(timezone.utc).isoformat()

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {"status": "offer_rejected", "updated_at": now}},
    )

    updated = await db.b2b_operations.find_one({"_id": oid})
    return _serialize_operation(updated)


# ---------------------------------------------------------------------------
# Cancel operation
# ---------------------------------------------------------------------------

@router.patch("/{operation_id}/cancel")
async def cancel_operation(operation_id: str, user: User = Depends(get_current_user)):
    """Cancel a B2B operation. Only buyer or seller can cancel before payment."""
    await require_role(user, ["producer", "importer"])
    db = get_db()
    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation ID")
    op = await db.b2b_operations.find_one({"_id": oid})
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    # Only participants can cancel
    if user.user_id not in (op.get("buyer_id"), op.get("seller_id")):
        raise HTTPException(status_code=403, detail="Not a participant")

    # Cannot cancel after payment
    non_cancellable = {"payment_confirmed", "in_transit", "delivered", "completed", "disputed"}
    if op.get("status") in non_cancellable:
        raise HTTPException(status_code=400, detail=f"Cannot cancel operation in status '{op['status']}'")

    now = datetime.now(timezone.utc).isoformat()
    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {"status": "cancelled", "cancelled_by": user.user_id, "updated_at": now}},
    )
    updated = await db.b2b_operations.find_one({"_id": oid})
    return _serialize_operation(updated)


# ---------------------------------------------------------------------------
# Contract generation (manual trigger)
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/generate-contract")
async def generate_contract_endpoint(
    operation_id: str,
    current_user=Depends(get_current_user),
):
    """Generate the contract PDF. Only when status is 'offer_accepted'."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    op_status = operation.get("status", "")
    if op_status not in ("offer_accepted", "contract_generated"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate contract when status is '{op_status}'. Must be 'offer_accepted'.",
        )

    result = await generate_contract(operation, db)

    now = datetime.now(timezone.utc).isoformat()
    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {
            "status": "contract_generated",
            "contract": {
                "pdf_url": result["pdf_url"],
                "contract_hash": result["contract_hash"],
                "generated_at": result["generated_at"],
            },
            "updated_at": now,
        }},
    )

    refreshed = await db.b2b_operations.find_one({"_id": oid})
    await notify_contract_ready(refreshed, db)

    return {
        "pdf_url": result["pdf_url"],
        "contract_hash": result["contract_hash"],
        "status": "contract_generated",
    }


# ---------------------------------------------------------------------------
# Sign contract
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/sign")
async def sign_contract(
    operation_id: str,
    request: Request,
    current_user=Depends(get_current_user),
):
    """Sign the contract. When both parties sign, the PDF is sealed."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    sign_status = operation.get("status", "")
    if sign_status not in ("contract_generated", "contract_pending"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot sign when status is '{sign_status}'. Contract must be generated first.",
        )

    # Check user has a signature
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc or not user_doc.get("signature_url"):
        raise HTTPException(status_code=400, detail="No signature configured. Please upload your signature first.")

    # Determine role and check if already signed
    is_seller = user_id == operation.get("seller_id")
    is_buyer = user_id == operation.get("buyer_id")
    contract = operation.get("contract", {})

    if is_seller and contract.get("signed_by_seller"):
        raise HTTPException(status_code=400, detail="You have already signed this contract")
    if is_buyer and contract.get("signed_by_buyer"):
        raise HTTPException(status_code=400, detail="You have already signed this contract")

    # Record signature
    now = datetime.now(timezone.utc).isoformat()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    update_fields = {"updated_at": now}
    if is_seller:
        update_fields["contract.signed_by_seller"] = True
        update_fields["contract.seller_signature_at"] = now
        update_fields["contract.seller_ip"] = client_ip
        update_fields["contract.seller_user_agent"] = user_agent
    if is_buyer:
        update_fields["contract.signed_by_buyer"] = True
        update_fields["contract.buyer_signature_at"] = now
        update_fields["contract.buyer_ip"] = client_ip
        update_fields["contract.buyer_user_agent"] = user_agent

    # Check if both have now signed
    seller_signed = contract.get("signed_by_seller", False) or is_seller
    buyer_signed = contract.get("signed_by_buyer", False) or is_buyer
    both_signed = seller_signed and buyer_signed

    if not both_signed:
        update_fields["status"] = "contract_pending"

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": update_fields},
    )

    # If both signed, seal the contract (with rollback on failure)
    if both_signed:
        # Save pre-seal status so we can rollback if seal_contract fails
        pre_seal_status = update_fields.get("status", operation.get("status"))
        # Optimistically set status to contract_signed
        await db.b2b_operations.update_one(
            {"_id": oid},
            {"$set": {"status": "contract_signed", "updated_at": now}},
        )
        try:
            refreshed = await db.b2b_operations.find_one({"_id": oid})
            seal_result = await seal_contract(refreshed, db)
            await db.b2b_operations.update_one(
                {"_id": oid},
                {"$set": {
                    "contract.pdf_url": seal_result["pdf_url"],
                    "contract.contract_hash": seal_result["contract_hash"],
                    "contract.sealed_at": now,
                    "updated_at": now,
                }},
            )
            final = await db.b2b_operations.find_one({"_id": oid})
            await notify_contract_signed(final, db)
        except Exception as exc:
            logger.error("Contract sealing failed for %s: %s — rolling back status", operation_id, exc)
            await db.b2b_operations.update_one(
                {"_id": oid},
                {"$set": {"status": pre_seal_status or "contract_pending", "updated_at": now}},
            )

    final_op = await db.b2b_operations.find_one({"_id": oid})

    return {
        "signed": True,
        "both_signed": both_signed,
        "pdf_url": final_op.get("contract", {}).get("pdf_url"),
        "status": final_op.get("status"),
    }


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("/{operation_id}/documents")
async def get_required_documents(
    operation_id: str,
    current_user=Depends(get_current_user),
):
    """Get list of required documents for this operation, determined by AI."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    # Get the accepted offer
    _offers = operation.get("offers", [])
    offer = _offers[-1] if _offers else {}

    # Get product info for categories/certifications
    product_id = offer.get("product_id")
    product = None
    if product_id:
        product = await db.products.find_one({"product_id": product_id})

    # Get seller and buyer for country info
    seller = await db.users.find_one({"user_id": operation.get("seller_id")})
    buyer = await db.users.find_one({"user_id": operation.get("buyer_id")})

    country_origin = (seller or {}).get("country", "ES")
    country_destination = (buyer or {}).get("country", "ES")
    certifications = (product or {}).get("certifications", [])
    incoterm = offer.get("incoterm", "DAP")
    product_name = offer.get("product_name", "producto alimentario")

    # Call Claude Haiku for document requirements
    import anthropic
    import json

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"Lista los documentos necesarios para exportar {product_name} con certificaciones {json.dumps(certifications)} desde {country_origin} a {country_destination} bajo Incoterm {incoterm}.\nResponde SOLO con JSON array:\n[{{\"name\": \"nombre del documento\", \"required\": true, \"description\": \"descripción corta\", \"validity_days\": null, \"authority\": \"quién lo emite\"}}]\nMáximo 8 documentos. Solo los realmente necesarios para este tráfico específico."
            }]
        )

        ai_text = message.content[0].text.strip()
        # Extract JSON from response (handle markdown code blocks)
        if ai_text.startswith("```"):
            ai_text = ai_text.split("```")[1]
            if ai_text.startswith("json"):
                ai_text = ai_text[4:]
        ai_docs = json.loads(ai_text)
    except Exception as exc:
        logger.error("AI document generation failed: %s", exc)
        # Fallback default documents
        ai_docs = [
            {"name": "Factura comercial", "required": True, "description": "Factura del vendedor al comprador", "validity_days": None, "authority": "Vendedor"},
            {"name": "Packing list", "required": True, "description": "Lista de contenido del envío", "validity_days": None, "authority": "Vendedor"},
            {"name": "Guía de transporte / CMR", "required": True, "description": "Documento de transporte", "validity_days": None, "authority": "Transportista"},
            {"name": "Certificado sanitario", "required": True, "description": "Certificado de seguridad alimentaria", "validity_days": 90, "authority": "Autoridad sanitaria"},
        ]

    # Merge with already uploaded documents
    existing_docs = operation.get("shipment", {}).get("documents", [])
    existing_by_name = {d.get("document_type", "").lower(): d for d in existing_docs}

    result = []
    now = datetime.now(timezone.utc)
    for doc in ai_docs:
        doc_name_lower = doc["name"].lower()
        existing = existing_by_name.get(doc_name_lower)

        status = "pending"
        url = None
        uploaded_at = None
        expires_at = None

        if existing:
            url = existing.get("url")
            uploaded_at = existing.get("uploaded_at")

            if doc.get("validity_days") and uploaded_at:
                upload_dt = datetime.fromisoformat(uploaded_at) if isinstance(uploaded_at, str) else uploaded_at
                expires_at = (upload_dt + timedelta(days=doc["validity_days"])).isoformat()
                if datetime.fromisoformat(expires_at) < now:
                    status = "expired"
                else:
                    status = "uploaded"
            else:
                status = "uploaded"

        result.append({
            "name": doc["name"],
            "required": doc.get("required", True),
            "description": doc.get("description", ""),
            "validity_days": doc.get("validity_days"),
            "authority": doc.get("authority", ""),
            "status": status,
            "url": url,
            "uploaded_at": uploaded_at,
            "expires_at": expires_at,
        })

    return result


@router.post("/{operation_id}/documents")
async def upload_document(
    operation_id: str,
    current_user=Depends(get_current_user),
    file: UploadFile = File(...),
    document_type: str = Form(...),
):
    """Upload a document for a B2B operation."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    # Upload to Cloudinary
    from services.cloudinary_storage import upload_image

    filename = f"{operation_id}-{document_type.replace(' ', '_')}"
    upload_result = await upload_image(file_bytes, folder="b2b_documents", filename=filename)

    now = datetime.now(timezone.utc).isoformat()
    doc_record = {
        "document_type": document_type,
        "url": upload_result.get("url"),
        "public_id": upload_result.get("public_id"),
        "uploaded_by": user_id,
        "uploaded_at": now,
        "filename": file.filename,
    }

    await db.b2b_operations.update_one(
        {"_id": oid},
        {
            "$push": {"shipment.documents": doc_record},
            "$set": {"updated_at": now},
        },
    )

    return {"uploaded": True, "document": doc_record}


# ---------------------------------------------------------------------------
# Shipment
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/ship")
async def confirm_shipment(
    operation_id: str,
    body: dict,
    current_user=Depends(get_current_user),
):
    """Producer confirms shipment with tracking info."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    # Only the seller can confirm shipment
    if current_user.user_id != operation.get("seller_id"):
        raise HTTPException(status_code=403, detail="Only the seller can confirm shipment")

    ship_status = operation.get("status", "")
    if ship_status not in ("payment_confirmed", "contract_signed"):
        raise HTTPException(status_code=400, detail=f"Cannot ship when status is '{ship_status}'")

    tracking_number = body.get("tracking_number", "")
    carrier = body.get("carrier", "")

    if not tracking_number or not carrier:
        raise HTTPException(status_code=400, detail="tracking_number and carrier are required")

    now = datetime.now(timezone.utc).isoformat()
    _offers = operation.get("offers", [])
    offer = _offers[-1] if _offers else {}
    delivery_days = offer.get("delivery_days", 7)

    estimated_delivery = (datetime.now(timezone.utc) + timedelta(days=delivery_days)).isoformat()

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {
            "status": "in_transit",
            "shipment.tracking_number": tracking_number,
            "shipment.carrier": carrier,
            "shipment.shipped_at": now,
            "shipment.estimated_delivery": estimated_delivery,
            "updated_at": now,
        }},
    )

    # Send system message to chat
    from services.b2b_chat_events import send_b2b_system_message
    await send_b2b_system_message(
        operation.get("conversation_id"),
        "shipment_confirmed",
        {"carrier": carrier, "tracking": tracking_number}
    )

    return {"shipped": True, "tracking_number": tracking_number, "carrier": carrier}


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/dispute")
async def open_dispute(
    operation_id: str,
    body: dict,
    current_user=Depends(get_current_user),
):
    """Open a formal dispute for a B2B operation."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Operation not found")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    user_id = current_user.user_id
    if user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        raise HTTPException(status_code=404, detail="Operation not found")

    dispute_status = operation.get("status", "")
    if dispute_status not in ("in_transit", "delivered", "payment_confirmed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot open dispute when status is '{dispute_status}'. Must be in_transit, delivered, or payment_confirmed."
        )

    reason = body.get("reason", "")
    description = body.get("description", "")
    evidence_urls = body.get("evidence_urls", [])

    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required")
    if len(description) < 50:
        raise HTTPException(status_code=400, detail="Description must be at least 50 characters")

    now = datetime.now(timezone.utc).isoformat()

    dispute_doc = {
        "operation_id": operation_id,
        "opened_by": user_id,
        "reason": reason,
        "description": description,
        "evidence_urls": evidence_urls,
        "status": "investigating",
        "opened_at": now,
        "resolved_at": None,
        "resolution": None,
    }

    await db.b2b_disputes.insert_one(dispute_doc)

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {
            "status": "disputed",
            "dispute": {
                "reason": reason,
                "opened_by": user_id,
                "opened_at": now,
                "status": "investigating",
            },
            "updated_at": now,
        }},
    )

    # Send system message to chat
    from services.b2b_chat_events import send_b2b_system_message
    await send_b2b_system_message(
        operation.get("conversation_id"),
        "ai_alert",
        {"alert_text": f"Se ha abierto una disputa formal: {reason}"}
    )

    return {"disputed": True, "reason": reason}
