"""
Documents & Digital Signature endpoints.
Fase 29: Signature management, signed contracts list, integrity verification.
"""
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from core.database import get_db
from core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["documents"])


# ── POST /users/me/signature ────────────────────────────────
@router.post("/users/me/signature")
async def upload_signature(
    signature: UploadFile = File(...),
    stamp: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
):
    """Upload digital signature (and optional company stamp)."""
    import os

    # Validate file types
    if signature.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(status_code=400, detail="La firma debe ser PNG, JPEG o WebP")

    sig_bytes = await signature.read()
    if len(sig_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La firma no puede superar 5MB")

    db = get_db()
    now = datetime.now(timezone.utc)
    update_fields = {"signature_configured_at": now, "updated_at": now}

    # Upload to Cloudinary if configured, else save locally
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    if cloud_name and cloud_name != "PENDIENTE_REEMPLAZAR":
        from services.cloudinary_storage import upload_image as cloudinary_upload
        sig_result = await cloudinary_upload(
            sig_bytes,
            folder="signatures",
            filename=f"sig_{current_user.user_id}",
        )
        update_fields["signature_url"] = sig_result["url"]
    else:
        # Local fallback
        from pathlib import Path
        sig_dir = Path("uploads/signatures")
        sig_dir.mkdir(parents=True, exist_ok=True)
        ext = "png" if "png" in (signature.content_type or "") else "jpg"
        sig_path = sig_dir / f"{current_user.user_id}_sig.{ext}"
        sig_path.write_bytes(sig_bytes)
        update_fields["signature_url"] = f"/uploads/signatures/{sig_path.name}"

    # Handle optional stamp
    if stamp and stamp.filename:
        if stamp.content_type not in ("image/png", "image/jpeg", "image/webp"):
            raise HTTPException(status_code=400, detail="El sello debe ser PNG, JPEG o WebP")
        stamp_bytes = await stamp.read()
        if len(stamp_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El sello no puede superar 5MB")

        if cloud_name and cloud_name != "PENDIENTE_REEMPLAZAR":
            from services.cloudinary_storage import upload_image as cloudinary_upload
            stamp_result = await cloudinary_upload(
                stamp_bytes,
                folder="signatures",
                filename=f"stamp_{current_user.user_id}",
            )
            update_fields["stamp_url"] = stamp_result["url"]
        else:
            from pathlib import Path
            sig_dir = Path("uploads/signatures")
            sig_dir.mkdir(parents=True, exist_ok=True)
            ext = "png" if "png" in (stamp.content_type or "") else "jpg"
            stamp_path = sig_dir / f"{current_user.user_id}_stamp.{ext}"
            stamp_path.write_bytes(stamp_bytes)
            update_fields["stamp_url"] = f"/uploads/signatures/{stamp_path.name}"

    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": update_fields},
    )

    return {
        "signature_url": update_fields.get("signature_url"),
        "stamp_url": update_fields.get("stamp_url"),
        "configured_at": now.isoformat(),
    }


# ── GET /users/me/signature ─────────────────────────────────
@router.get("/users/me/signature")
async def get_signature(current_user=Depends(get_current_user)):
    """Get current user's signature info."""
    db = get_db()
    user = await db.users.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "signature_url": 1, "stamp_url": 1, "signature_configured_at": 1},
    )
    return {
        "signature_url": (user or {}).get("signature_url"),
        "stamp_url": (user or {}).get("stamp_url"),
        "configured_at": (user or {}).get("signature_configured_at"),
    }


# ── GET /documents/contracts ────────────────────────────────
@router.get("/documents/contracts")
async def list_signed_contracts(current_user=Depends(get_current_user)):
    """List all signed B2B contracts for the current user."""
    db = get_db()
    uid = current_user.user_id

    query = {
        "$or": [{"seller_id": uid}, {"buyer_id": uid}],
        "contract.signed_by_seller": True,
        "contract.signed_by_buyer": True,
    }

    ops = await db.b2b_operations.find(query).sort("contract.sealed_at", -1).to_list(200)

    contracts = []
    for op in ops:
        op_id = op.get("_id")
        if not op_id:
            continue
        contract = op.get("contract", {})
        is_seller = op.get("seller_id") == uid
        counterpart_name = op.get("buyer_name", "") if is_seller else op.get("seller_name", "")

        contracts.append({
            "operation_id": str(op_id),
            "operation_id_short": str(op_id)[-8:].upper(),
            "counterpart_name": counterpart_name,
            "product_name": op.get("product_name", op.get("offer", {}).get("product_name", "")),
            "quantity": op.get("offer", {}).get("quantity", 0),
            "total_amount": op.get("offer", {}).get("total_amount", 0),
            "signed_at": contract.get("sealed_at") or contract.get("seller_signature_at"),
            "pdf_url": contract.get("pdf_url"),
            "contract_hash": contract.get("contract_hash", ""),
            "status": op.get("status", ""),
        })

    return {"contracts": contracts, "total": len(contracts)}


# ── GET /documents/verify/:operation_id ─────────────────────
@router.get("/documents/verify/{operation_id}")
async def verify_document_integrity(operation_id: str, current_user=Depends(get_current_user)):
    """Verify SHA-256 integrity of a signed contract PDF."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation ID")

    op = await db.b2b_operations.find_one({"_id": oid})
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    uid = current_user.user_id
    if uid not in (op.get("seller_id"), op.get("buyer_id")):
        raise HTTPException(status_code=403, detail="Not authorized")

    contract = op.get("contract", {})
    stored_hash = contract.get("contract_hash", "")
    pdf_url = contract.get("pdf_url", "")

    if not pdf_url:
        raise HTTPException(status_code=400, detail="No signed PDF available")

    # Download current PDF and calculate hash (limit to 50MB to prevent abuse)
    calculated_hash = ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(pdf_url)
            resp.raise_for_status()
            if len(resp.content) > 50 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="PDF too large for verification")
            calculated_hash = hashlib.sha256(resp.content).hexdigest()
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("Timeout downloading PDF for verification: %s", pdf_url)
        raise HTTPException(status_code=504, detail="PDF download timed out")
    except Exception as exc:
        logger.error("Failed to download PDF for verification: %s", exc)
        raise HTTPException(status_code=502, detail="Could not download PDF for verification")

    now = datetime.now(timezone.utc)

    return {
        "operation_id": operation_id,
        "stored_hash": stored_hash,
        "calculated_hash": calculated_hash,
        "verified": stored_hash == calculated_hash and bool(stored_hash),
        "verified_at": now.isoformat(),
        "pdf_url": pdf_url,
    }
