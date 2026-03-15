"""
Producer/Importer verification routes:
CIF/NIF upload, facility photo, certificate upload, verification status.
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User
from services.cloudinary_storage import upload_image as cloudinary_upload
from services.producer_verification import (
    verify_cif_nif,
    verify_facility_photo,
    verify_certificate,
    run_full_verification,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
ALLOWED_DOC_TYPES = ALLOWED_IMAGE_TYPES | {"application/pdf"}

VALID_CERT_TYPES = {
    "ecological_eu", "dop", "igp", "halal",
    "gluten_free", "vegan", "other",
}


def _ensure_verification_status(user: dict) -> dict:
    """Return existing verification_status or a fresh skeleton."""
    return user.get("verification_status", {
        "is_verified": False,
        "verified_at": None,
        "verified_by": None,
        "documents": {"cif_nif": {}, "facility_photo": {}, "certificates": []},
        "ai_confidence": None,
        "admin_review_required": False,
        "admin_review_reason": None,
        "blocked_from_selling": True,
        "block_reason": "Verificación pendiente",
    })


async def _try_full_verification(user_id: str):
    """Run full verification if all minimum docs are present."""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    vs = user.get("verification_status", {})
    docs = vs.get("documents", {})

    has_cif = docs.get("cif_nif", {}).get("status") in ("verified", "manual_review", "rejected")
    has_photo = docs.get("facility_photo", {}).get("status") in ("verified", "manual_review", "rejected")
    has_cert = len(docs.get("certificates", [])) >= 1

    if has_cif and has_photo and has_cert:
        await run_full_verification(user_id)


# ── POST /verification/cif-nif ───────────────────────────────────

@router.post("/verification/cif-nif")
async def upload_cif_nif(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload and verify a CIF/NIF document."""
    await require_role(user, ["producer", "importer", "admin"])

    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Formato no válido. Usa PDF, JPG o PNG.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5MB")

    # Upload to Cloudinary
    result = await cloudinary_upload(
        content,
        folder="verification_docs",
        filename=f"cif_{user.user_id}_{uuid.uuid4().hex[:8]}",
    )
    file_url = result["url"]
    now = datetime.now(timezone.utc)

    # Initialize verification_status if needed
    db_user = await db.users.find_one({"user_id": user.user_id})
    vs = _ensure_verification_status(db_user or {})

    # Mark as pending while AI processes
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "verification_status.documents.cif_nif": {
                "url": file_url,
                "number": None,
                "entity_name": None,
                "status": "pending",
                "rejection_reason": None,
                "uploaded_at": now,
                "verified_at": None,
            },
        }},
        upsert=False,
    )

    # Verify with AI
    verification = await verify_cif_nif(file_url)

    # Update document with AI results
    cif_update = {
        "verification_status.documents.cif_nif.status": verification["status"],
        "verification_status.documents.cif_nif.number": verification["tax_id"],
        "verification_status.documents.cif_nif.entity_name": verification["entity_name"],
        "verification_status.documents.cif_nif.rejection_reason": verification["rejection_reason"],
    }
    if verification["status"] == "verified":
        cif_update["verification_status.documents.cif_nif.verified_at"] = now

    await db.users.update_one({"user_id": user.user_id}, {"$set": cif_update})

    # Try full verification if all docs present
    await _try_full_verification(user.user_id)

    # Reload to get is_verified
    updated = await db.users.find_one({"user_id": user.user_id})
    is_verified = updated.get("verification_status", {}).get("is_verified", False)

    return {
        "status": verification["status"],
        "tax_id": verification["tax_id"],
        "entity_name": verification["entity_name"],
        "confidence": verification["confidence"],
        "rejection_reason": verification["rejection_reason"],
        "is_verified": is_verified,
    }


# ── POST /verification/facility-photo ────────────────────────────

@router.post("/verification/facility-photo")
async def upload_facility_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload and verify a facility photo."""
    await require_role(user, ["producer", "importer", "admin"])

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG, PNG o HEIC.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 10MB")

    result = await cloudinary_upload(
        content,
        folder="verification_docs",
        filename=f"facility_{user.user_id}_{uuid.uuid4().hex[:8]}",
    )
    file_url = result["url"]
    now = datetime.now(timezone.utc)

    # Mark as pending
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "verification_status.documents.facility_photo": {
                "url": file_url,
                "status": "pending",
                "ai_assessment": None,
                "rejection_reason": None,
                "uploaded_at": now,
            },
        }},
    )

    # Verify with AI
    verification = await verify_facility_photo(file_url)

    facility_update = {
        "verification_status.documents.facility_photo.status": verification["status"],
        "verification_status.documents.facility_photo.ai_assessment": verification["description"],
        "verification_status.documents.facility_photo.rejection_reason": verification["rejection_reason"],
    }

    await db.users.update_one({"user_id": user.user_id}, {"$set": facility_update})

    await _try_full_verification(user.user_id)

    updated = await db.users.find_one({"user_id": user.user_id})
    is_verified = updated.get("verification_status", {}).get("is_verified", False)

    return {
        "status": verification["status"],
        "description": verification["description"],
        "confidence": verification["confidence"],
        "rejection_reason": verification["rejection_reason"],
        "is_verified": is_verified,
    }


# ── POST /verification/certificate ───────────────────────────────

@router.post("/verification/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    cert_type: str = Form(...),
    user: User = Depends(get_current_user),
):
    """Upload and verify a product/quality certificate."""
    await require_role(user, ["producer", "importer", "admin"])

    if cert_type not in VALID_CERT_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de certificado inválido. Opciones: {', '.join(sorted(VALID_CERT_TYPES))}")

    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Formato no válido. Usa PDF, JPG o PNG.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5MB")

    result = await cloudinary_upload(
        content,
        folder="verification_docs",
        filename=f"cert_{user.user_id}_{cert_type}_{uuid.uuid4().hex[:8]}",
    )
    file_url = result["url"]
    now = datetime.now(timezone.utc)

    # Verify with AI
    verification = await verify_certificate(file_url, cert_type)

    cert_doc = {
        "cert_id": f"cert_{uuid.uuid4().hex[:8]}",
        "type": cert_type,
        "name": cert_type.replace("_", " ").title(),
        "url": file_url,
        "issuer": verification["issuer"],
        "issued_to": verification["issued_to"],
        "issue_date": verification["issue_date"],
        "expiry_date": verification["expiry_date"],
        "status": verification["status"],
        "rejection_reason": verification["rejection_reason"],
        "uploaded_at": now,
        "verified_at": now if verification["status"] == "verified" else None,
    }

    # Add to certificates array
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$push": {"verification_status.documents.certificates": cert_doc}},
    )

    await _try_full_verification(user.user_id)

    updated = await db.users.find_one({"user_id": user.user_id})
    is_verified = updated.get("verification_status", {}).get("is_verified", False)

    return {
        "status": verification["status"],
        "cert_id": cert_doc["cert_id"],
        "issued_to": verification["issued_to"],
        "issuer": verification["issuer"],
        "expiry_date": verification["expiry_date"],
        "expiry_warning": verification["expiry_warning"],
        "confidence": verification["confidence"],
        "rejection_reason": verification["rejection_reason"],
        "is_verified": is_verified,
    }


# ── GET /verification/status ─────────────────────────────────────

@router.get("/verification/status")
async def get_verification_status(user: User = Depends(get_current_user)):
    """Get full verification status for the authenticated producer/importer."""
    await require_role(user, ["producer", "importer", "admin"])

    db_user = await db.users.find_one({"user_id": user.user_id})
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    vs = db_user.get("verification_status", {})

    return {
        "is_verified": vs.get("is_verified", False),
        "verified_at": vs.get("verified_at"),
        "verified_by": vs.get("verified_by"),
        "documents": {
            "cif_nif": vs.get("documents", {}).get("cif_nif", {}),
            "facility_photo": vs.get("documents", {}).get("facility_photo", {}),
            "certificates": vs.get("documents", {}).get("certificates", []),
        },
        "ai_confidence": vs.get("ai_confidence"),
        "admin_review_required": vs.get("admin_review_required", False),
        "admin_review_reason": vs.get("admin_review_reason"),
        "blocked_from_selling": vs.get("blocked_from_selling", True),
        "block_reason": vs.get("block_reason"),
    }
