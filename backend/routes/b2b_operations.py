"""
B2B Operations — Formal offers with Incoterms, counteroffers, and acceptance flow.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from core.auth import get_current_user
from core.database import get_db

router = APIRouter(tags=["B2B Operations"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PLATFORM_FEE_PCT = 3.0
STRIPE_FEE_PCT = 1.4

VALID_STATUSES = {
    "draft", "offer_sent", "offer_accepted", "offer_rejected",
    "contract_pending", "contract_signed", "payment_pending",
    "payment_confirmed", "in_transit", "delivered", "completed",
}

VALID_UNITS = {"kg", "units", "liters", "boxes", "pallets"}
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
    net_total = round(total_price * (1 - fee_pct / 100), 2)
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
    op["id"] = str(op.pop("_id"))
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
    if user_id not in (operation["buyer_id"], operation["seller_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this operation")

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
    if user_id not in (operation["buyer_id"], operation["seller_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to modify this operation")

    # Detect modified fields vs previous version
    prev_offer = operation["offers"][-1]
    modified_fields = _detect_modified_fields(prev_offer, body)
    new_version = prev_offer["version"] + 1

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
    if user_id not in (operation["buyer_id"], operation["seller_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Find the offer version
    target_offer = None
    for offer in operation["offers"]:
        if offer["version"] == version:
            target_offer = offer
            break

    if not target_offer:
        raise HTTPException(status_code=404, detail=f"Offer version {version} not found")

    # Verify current user is the receiver, not the creator
    if target_offer["created_by"] == user_id:
        raise HTTPException(status_code=403, detail="Cannot accept your own offer")

    now = datetime.now(timezone.utc).isoformat()

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {"status": "offer_accepted", "updated_at": now}},
    )

    updated = await db.b2b_operations.find_one({"_id": oid})
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
    if user_id not in (operation["buyer_id"], operation["seller_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Find the offer version
    target_offer = None
    for offer in operation["offers"]:
        if offer["version"] == version:
            target_offer = offer
            break

    if not target_offer:
        raise HTTPException(status_code=404, detail=f"Offer version {version} not found")

    # Verify current user is the receiver, not the creator
    if target_offer["created_by"] == user_id:
        raise HTTPException(status_code=403, detail="Cannot reject your own offer")

    now = datetime.now(timezone.utc).isoformat()

    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$set": {"status": "offer_rejected", "updated_at": now}},
    )

    updated = await db.b2b_operations.find_one({"_id": oid})
    return _serialize_operation(updated)
