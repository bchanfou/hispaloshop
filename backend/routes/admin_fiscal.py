"""
Admin fiscal routes: Modelo 190 generation, tax reports, certificate manual review.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User
from services.modelo190_service import generate_quarterly_report
from services.audit_logger import log_admin_action

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /admin/tax/generate-190 ──────────────────────────────

@router.post("/admin/tax/generate-190")
async def generate_modelo_190(request: Request, user: User = Depends(get_current_user)):
    """Generate quarterly Modelo 190 report PDF."""
    await require_role(user, ["admin", "super_admin"])

    body = await request.json()
    year = body.get("year")
    quarter = body.get("quarter")

    if not year or not quarter or quarter not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="year and quarter (1-4) are required")

    result = await generate_quarterly_report(year, quarter)

    return result


# ── GET /admin/tax/reports ─────────────────────────────────────

@router.get("/admin/tax/reports")
async def list_tax_reports(user: User = Depends(get_current_user)):
    """List generated tax reports."""
    await require_role(user, ["admin", "super_admin"])

    reports = await db.tax_reports.find(
        {}, {"_id": 0}
    ).sort("generated_at", -1).to_list(100)

    return {"reports": reports}


# ── GET /admin/tax/fiscal-stats ────────────────────────────────

@router.get("/admin/tax/fiscal-stats")
async def get_fiscal_stats(user: User = Depends(get_current_user)):
    """Get fiscal KPIs for the admin dashboard."""
    await require_role(user, ["admin", "super_admin"])

    current_year = datetime.now(timezone.utc).year
    current_month = datetime.now(timezone.utc).month
    current_quarter = (current_month - 1) // 3 + 1

    # Spanish influencers
    es_influencers = await db.influencers.find(
        {"fiscal_status.tax_country": "ES", "status": "active"},
        {"_id": 0, "withholding_records": 1},
    ).to_list(2000)

    total_withheld_ytd = 0
    for inf in es_influencers:
        for r in inf.get("withholding_records", []):
            if r.get("year") == current_year:
                total_withheld_ytd += r.get("amount_withheld", 0)

    # Pending manual review
    pending_review = await db.influencers.count_documents({
        "fiscal_status.needs_manual_review": True,
        "fiscal_status.certificate_verified": {"$ne": True},
    })

    # Next Modelo 190 deadline
    deadline_map = {1: f"1 abril {current_year}", 2: f"1 julio {current_year}",
                    3: f"1 octubre {current_year}", 4: f"20 enero {current_year + 1}"}

    return {
        "total_withheld_ytd": round(total_withheld_ytd, 2),
        "es_active_count": len(es_influencers),
        "pending_review": pending_review,
        "next_190_quarter": f"Q{current_quarter}",
        "next_190_deadline": deadline_map.get(current_quarter, ""),
    }


# ── GET /admin/tax/pending-reviews ─────────────────────────────

@router.get("/admin/tax/pending-reviews")
async def get_pending_reviews(user: User = Depends(get_current_user)):
    """List influencers pending manual certificate review."""
    await require_role(user, ["admin", "super_admin"])

    influencers = await db.influencers.find(
        {
            "fiscal_status.needs_manual_review": True,
            "fiscal_status.certificate_verified": {"$ne": True},
        },
        {"_id": 0},
    ).to_list(200)

    results = []
    for inf in influencers:
        fiscal = inf.get("fiscal_status", {})
        results.append({
            "influencer_id": inf.get("influencer_id"),
            "full_name": inf.get("full_name"),
            "email": inf.get("email"),
            "tax_country": fiscal.get("tax_country"),
            "certificate_url": fiscal.get("certificate_url"),
            "certificate_uploaded_at": fiscal.get("certificate_uploaded_at"),
            "entity_name": fiscal.get("entity_name"),
            "confidence": fiscal.get("confidence", "low"),
        })

    return {"pending": results}


# ── POST /admin/tax/review-certificate ─────────────────────────

@router.post("/admin/tax/review-certificate")
async def review_certificate(request: Request, user: User = Depends(get_current_user)):
    """Admin manually approves or rejects a certificate."""
    await require_role(user, ["admin", "super_admin"])

    body = await request.json()
    influencer_id = body.get("influencer_id")
    action = body.get("action")  # "approve" | "reject"
    reason = body.get("reason", "")

    if not influencer_id or action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="influencer_id and action (approve/reject) required")

    influencer = await db.influencers.find_one(
        {"influencer_id": influencer_id}, {"_id": 0}
    )
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    now_iso = datetime.now(timezone.utc).isoformat()

    if action == "approve":
        from services.fiscal_verification import calculate_withholding
        tax_country = influencer.get("fiscal_status", {}).get("tax_country", "")
        await db.influencers.update_one(
            {"influencer_id": influencer_id},
            {"$set": {
                "fiscal_status.certificate_verified": True,
                "fiscal_status.affiliate_blocked": False,
                "fiscal_status.block_reason": None,
                "fiscal_status.needs_manual_review": False,
                "fiscal_status.verified_at": now_iso,
                "fiscal_status.verified_by": "admin",
                "fiscal_status.withholding_pct": calculate_withholding(tax_country),
                "updated_at": now_iso,
            }},
        )
        await log_admin_action(
            admin_id=user.user_id,
            admin_role=user.role,
            action="certificate_approved",
            target_type="influencer",
            target_id=influencer_id,
            details=f"Fiscal certificate approved for {influencer.get('full_name', '')}",
        )
        return {"status": "approved", "influencer_id": influencer_id}
    else:
        await db.influencers.update_one(
            {"influencer_id": influencer_id},
            {"$set": {
                "fiscal_status.certificate_verified": False,
                "fiscal_status.affiliate_blocked": True,
                "fiscal_status.block_reason": reason or "Certificado rechazado por el administrador",
                "fiscal_status.needs_manual_review": False,
                "updated_at": now_iso,
            }},
        )
        await log_admin_action(
            admin_id=user.user_id,
            admin_role=user.role,
            action="certificate_rejected",
            target_type="influencer",
            target_id=influencer_id,
            details=f"Fiscal certificate rejected for {influencer.get('full_name', '')}: {reason}",
            severity="warning",
        )
        return {"status": "rejected", "influencer_id": influencer_id, "reason": reason}


# ── GET /admin/tax/influencers ─────────────────────────────────

@router.get("/admin/tax/influencers")
async def list_fiscal_influencers(
    status: str = "all",
    search: str = "",
    user: User = Depends(get_current_user),
):
    """List influencers with fiscal data. Filters: all, verified, pending, rejected, manual."""
    await require_role(user, ["admin", "super_admin"])

    query = {}
    if status == "verified":
        query["fiscal_status.certificate_verified"] = True
    elif status == "pending":
        query["fiscal_status.certificate_url"] = {"$exists": False}
    elif status == "rejected":
        query["fiscal_status.certificate_verified"] = False
        query["fiscal_status.needs_manual_review"] = {"$ne": True}
        query["fiscal_status.certificate_url"] = {"$exists": True}
    elif status == "manual":
        query["fiscal_status.needs_manual_review"] = True

    influencers = await db.influencers.find(query, {"_id": 0}).to_list(500)

    if search:
        search_lower = search.lower()
        influencers = [
            inf for inf in influencers
            if search_lower in (inf.get("full_name") or "").lower()
            or search_lower in (inf.get("email") or "").lower()
            or search_lower in (inf.get("fiscal_status", {}).get("entity_name") or "").lower()
        ]

    results = []
    for inf in influencers:
        fiscal = inf.get("fiscal_status", {})
        results.append({
            "influencer_id": inf.get("influencer_id"),
            "full_name": inf.get("full_name"),
            "email": inf.get("email"),
            "tax_country": fiscal.get("tax_country"),
            "tax_region": fiscal.get("tax_region"),
            "withholding_pct": fiscal.get("withholding_pct", 0),
            "certificate_verified": fiscal.get("certificate_verified", False),
            "certificate_url": fiscal.get("certificate_url"),
            "needs_manual_review": fiscal.get("needs_manual_review", False),
            "affiliate_blocked": fiscal.get("affiliate_blocked", True),
            "block_reason": fiscal.get("block_reason"),
            "verified_at": fiscal.get("verified_at"),
            "payout_method": inf.get("payout_method"),
            "status": inf.get("status"),
        })

    return {"influencers": results, "total": len(results)}
