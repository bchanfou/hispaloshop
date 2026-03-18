"""
Influencer fiscal routes: certificate upload, fiscal status, payout method, withholding summary.
"""
import uuid
import os
import logging
import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form

from core.database import db
from core.auth import get_current_user
from core.config import STRIPE_SECRET_KEY
from core.models import User
from services.cloudinary_storage import upload_image as cloudinary_upload
from services.fiscal_verification import (
    verify_certificate, get_tax_region, calculate_withholding,
)

logger = logging.getLogger(__name__)

stripe.api_key = STRIPE_SECRET_KEY
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com")

router = APIRouter()


def _stripe_ready() -> bool:
    key = STRIPE_SECRET_KEY or ""
    return key.startswith(("sk_test_", "sk_live_"))


# ── POST /influencer/fiscal/certificate ────────────────────────

@router.post("/influencer/fiscal/certificate")
async def upload_fiscal_certificate(
    file: UploadFile = File(...),
    tax_country: str = Form(...),
    user: User = Depends(get_current_user),
):
    """Upload and verify a tax residency certificate."""
    # Validate influencer
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")

    # Validate file type
    allowed = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Formato no válido. Usa PDF, JPG o PNG.")

    # Validate size (5MB max)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5MB")

    # Upload to Cloudinary (private folder)
    result = await cloudinary_upload(
        content,
        folder="fiscal_certificates",
        filename=f"fiscal_{user.user_id}_{uuid.uuid4().hex[:8]}",
    )
    certificate_url = result["url"]

    tax_country_upper = tax_country.strip().upper()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Initial update: mark as uploading
    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {
            "fiscal_status.certificate_url": certificate_url,
            "fiscal_status.certificate_uploaded_at": now_iso,
            "fiscal_status.tax_country": tax_country_upper,
            "fiscal_status.tax_region": get_tax_region(tax_country_upper),
            "updated_at": now_iso,
        }},
    )

    # Verify with AI
    verification = await verify_certificate(certificate_url, tax_country_upper)

    # Apply verification results
    fiscal_update = {
        "fiscal_status.certificate_verified": verification.get("verified", False),
        "fiscal_status.affiliate_blocked": verification.get("affiliate_blocked", True),
        "fiscal_status.block_reason": verification.get("block_reason"),
        "fiscal_status.withholding_pct": verification.get("withholding_pct", 0.0),
        "fiscal_status.verified_at": now_iso if verification.get("verified") else None,
        "fiscal_status.verified_by": verification.get("verified_by"),
        "fiscal_status.entity_name": verification.get("entity_name"),
        "fiscal_status.needs_manual_review": verification.get("needs_manual_review", False),
        "updated_at": now_iso,
    }

    if verification.get("expiry_date"):
        fiscal_update["fiscal_status.certificate_expires_at"] = verification["expiry_date"]

    if verification["verified"]:
        # Also update withholding on the influencer doc root for easy access
        fiscal_update["fiscal_status.withholding_pct"] = calculate_withholding(tax_country_upper)

    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": fiscal_update},
    )

    return {
        "status": "verified" if verification["verified"] else (
            "manual_review" if verification.get("needs_manual_review") else "rejected"
        ),
        "withholding_pct": verification["withholding_pct"],
        "blocked": verification["affiliate_blocked"],
        "reason": verification["block_reason"],
        "entity_name": verification["entity_name"],
        "tax_country": tax_country_upper,
        "tax_region": get_tax_region(tax_country_upper),
    }


# ── GET /influencer/fiscal/status ──────────────────────────────

@router.get("/influencer/fiscal/status")
async def get_fiscal_status(user: User = Depends(get_current_user)):
    """Get current fiscal status for the influencer."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")

    fiscal = influencer.get("fiscal_status", {})

    return {
        "tax_country": fiscal.get("tax_country"),
        "tax_region": fiscal.get("tax_region"),
        "withholding_pct": fiscal.get("withholding_pct", 0.0),
        "certificate_verified": fiscal.get("certificate_verified", False),
        "certificate_url": fiscal.get("certificate_url"),
        "certificate_uploaded_at": fiscal.get("certificate_uploaded_at"),
        "certificate_expires_at": fiscal.get("certificate_expires_at"),
        "verified_at": fiscal.get("verified_at"),
        "verified_by": fiscal.get("verified_by"),
        "entity_name": fiscal.get("entity_name"),
        "needs_manual_review": fiscal.get("needs_manual_review", False),
        "affiliate_blocked": fiscal.get("affiliate_blocked", True),
        "block_reason": fiscal.get("block_reason"),
        "payout_method": influencer.get("payout_method"),
        "stripe_account_id": influencer.get("stripe_account_id"),
        "stripe_onboarding_complete": influencer.get("stripe_onboarding_complete", False),
        "sepa_iban_last4": (influencer.get("sepa_iban") or "")[-4:] or None,
        "sepa_account_name": influencer.get("sepa_account_name"),
    }


# ── POST /influencer/fiscal/payout-method ──────────────────────

@router.post("/influencer/fiscal/payout-method")
async def configure_payout_method(request: Request, user: User = Depends(get_current_user)):
    """Configure payout method (stripe or sepa)."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")

    body = await request.json()
    method = body.get("method", "").strip().lower()
    if method not in ("stripe", "sepa"):
        raise HTTPException(status_code=400, detail="Método de cobro inválido. Usa 'stripe' o 'sepa'.")

    now_iso = datetime.now(timezone.utc).isoformat()
    update = {"payout_method": method, "updated_at": now_iso}

    if method == "stripe":
        # If no Stripe account yet, initiate Connect onboarding
        if not influencer.get("stripe_account_id"):
            if not _stripe_ready():
                raise HTTPException(status_code=503, detail="Stripe no está configurado")

            origin = body.get("origin", FRONTEND_URL).rstrip("/")
            account = stripe.Account.create(
                type="express",
                country="ES",
                email=user.email,
                capabilities={"transfers": {"requested": True}},
                metadata={
                    "influencer_id": influencer["influencer_id"],
                    "user_id": user.user_id,
                },
            )
            update["stripe_account_id"] = account.id

            link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{origin}/influencer/fiscal-setup?stripe=refresh",
                return_url=f"{origin}/influencer/fiscal-setup?stripe=complete",
                type="account_onboarding",
            )

            await db.influencers.update_one(
                {"influencer_id": influencer["influencer_id"]},
                {"$set": update},
            )

            return {"method": "stripe", "onboarding_url": link.url, "account_id": account.id}

        # Already has account
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": update},
        )
        return {"method": "stripe", "account_id": influencer["stripe_account_id"], "connected": True}

    else:
        # SEPA
        iban = body.get("iban", "").strip()
        account_name = body.get("account_name", "").strip()
        if not iban or not account_name:
            raise HTTPException(status_code=400, detail="IBAN y nombre del titular son obligatorios")

        update["sepa_iban"] = iban
        update["sepa_account_name"] = account_name

        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": update},
        )

        masked_iban = iban[:4] + " ···· ···· ···· " + iban[-4:] if len(iban) >= 8 else iban
        return {"method": "sepa", "iban_masked": masked_iban, "account_name": account_name}


# ── GET /influencer/fiscal/withholding-summary ─────────────────

@router.get("/influencer/fiscal/withholding-summary")
async def get_withholding_summary(user: User = Depends(get_current_user)):
    """Get withholding summary for the current year."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")

    current_year = datetime.now(timezone.utc).year
    records = influencer.get("withholding_records", [])

    # Filter current year
    year_records = [r for r in records if r.get("year") == current_year]

    gross_ytd = sum(r.get("amount_gross", 0) for r in year_records)
    withheld_ytd = sum(r.get("amount_withheld", 0) for r in year_records)
    net_ytd = sum(r.get("amount_paid", 0) for r in year_records)

    by_quarter = {}
    for r in year_records:
        q = r.get("quarter", 0)
        by_quarter[f"Q{q}"] = {
            "gross": round(r.get("amount_gross", 0), 2),
            "withheld": round(r.get("amount_withheld", 0), 2),
            "net": round(r.get("amount_paid", 0), 2),
            "filed": r.get("model_190_filed", False),
        }

    return {
        "year": current_year,
        "gross_ytd": round(gross_ytd, 2),
        "withheld_ytd": round(withheld_ytd, 2),
        "net_ytd": round(net_ytd, 2),
        "by_quarter": by_quarter,
        "withholding_pct": influencer.get("fiscal_status", {}).get("withholding_pct", 0.0),
    }
