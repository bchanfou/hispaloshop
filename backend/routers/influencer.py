from datetime import datetime, timedelta, timezone
import random
import string
from uuid import UUID
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import INFLUENCER_TIER_CONFIG, INFLUENCER_TIER_ORDER, normalize_influencer_tier, settings
from database import get_db
from models import AffiliateLink, AffiliateLinkRequest, Commission, InfluencerProfile, Payout, Product, User
from routers.auth import get_current_user
from schemas import AffiliateLinkCreateRequest, AffiliateLinkListResponse, CommissionListResponse, InfluencerDashboardResponse, PayoutRequestCreate, PayoutResponse
from services.affiliate_service import build_affiliate_tracking_url

router = APIRouter(prefix="/influencer")

TIER_META = {
    "perseo": {"name": "Perseo", "badge": "bronze", "rate": "3%"},
    "aquiles": {"name": "Aquiles", "badge": "silver", "rate": "4%"},
    "hercules": {"name": "Hercules", "badge": "gold", "rate": "5%"},
    "apolo": {"name": "Apolo", "badge": "diamond", "rate": "6%"},
    "zeus": {"name": "Zeus", "badge": "crown", "rate": "7%"},
}

def require_influencer(user: User):
    if user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencer role required")


def _random_code(size: int = 8):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=size))


@router.get("/dashboard", response_model=InfluencerDashboardResponse)
async def get_dashboard(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_influencer(current_user)
    profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer profile not found")

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_orders = await db.scalar(
        select(func.count(func.distinct(Commission.order_id))).where(
            Commission.influencer_id == current_user.id,
            Commission.created_at >= month_start,
        )
    )
    month_clicks = await db.scalar(
        select(func.coalesce(func.sum(AffiliateLink.total_clicks), 0)).where(AffiliateLink.influencer_id == current_user.id)
    )
    available_cents = await db.scalar(
        select(func.coalesce(func.sum(Commission.commission_cents), 0)).where(
            Commission.influencer_id == current_user.id,
            Commission.status == "approved",
            Commission.payout_id.is_(None),
        )
    )
    conversion_rate = round((month_orders / month_clicks) * 100, 2) if month_clicks else 0

    current_tier = normalize_influencer_tier(profile.tier)
    profile.tier = current_tier
    next_tier = None
    current_idx = INFLUENCER_TIER_ORDER.index(current_tier)
    if current_idx < len(INFLUENCER_TIER_ORDER) - 1:
        target = INFLUENCER_TIER_ORDER[current_idx + 1]
        target_cfg = INFLUENCER_TIER_CONFIG[target]
        next_tier = {
            "key": target,
            "name": target_cfg["name"],
            "commission_rate": f"{target_cfg['commission_bps'] // 100}%",
            "gmv_needed_cents": max(0, target_cfg["min_gmv_cents"] - profile.total_gmv_cents),
        }

    return InfluencerDashboardResponse(
        profile={
            "tier": current_tier,
            "tier_name": TIER_META.get(current_tier, TIER_META["perseo"])["name"],
            "tier_badge": TIER_META.get(current_tier, TIER_META["perseo"])["badge"],
            "commission_rate": TIER_META.get(current_tier, TIER_META["perseo"])["rate"],
            "followers_count": profile.followers_count,
            "niche": profile.niche or [],
            "is_verified": profile.is_verified,
        },
        earnings={
            "total_cents": profile.total_earnings_cents,
            "pending_cents": profile.pending_earnings_cents,
            "available_cents": available_cents,
            "paid_cents": profile.paid_earnings_cents,
        },
        this_month={
            "gmv_cents": profile.monthly_gmv_cents,
            "orders": month_orders,
            "clicks": month_clicks,
            "conversion_rate": conversion_rate,
        },
        trend={"direction": "flat", "percentage": 0},
        next_tier=next_tier,
    )


@router.get("/affiliate-links", response_model=AffiliateLinkListResponse)
async def get_affiliate_links(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_influencer(current_user)
    stmt = select(AffiliateLink).options(selectinload(AffiliateLink.product)).where(AffiliateLink.influencer_id == current_user.id)
    if status_filter:
        stmt = stmt.where(AffiliateLink.status == status_filter)
    stmt = stmt.order_by(AffiliateLink.created_at.desc()).offset((page - 1) * 20).limit(20)
    result = await db.execute(stmt)
    items = result.scalars().all()
    total = await db.scalar(select(func.count(AffiliateLink.id)).where(AffiliateLink.influencer_id == current_user.id))

    return AffiliateLinkListResponse(
        items=[
            {
                "id": item.id,
                "code": item.code,
                "tracking_url": item.tracking_url,
                "product": item.product,
                "status": item.status,
                "total_clicks": item.total_clicks,
                "total_conversions": item.total_conversions,
                "total_gmv_cents": item.total_gmv_cents,
                "total_commission_cents": item.total_commission_cents,
                "conversion_rate": round((item.total_conversions / item.total_clicks) * 100, 2) if item.total_clicks else 0,
                "created_at": item.created_at,
            }
            for item in items
        ],
        total=total or 0,
    )


@router.post("/affiliate-links", status_code=status.HTTP_201_CREATED)
async def create_affiliate_link(
    payload: AffiliateLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_influencer(current_user)
    product = None
    if payload.product_id:
        product = await db.get(Product, payload.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if not product.is_affiliate_enabled:
            raise HTTPException(status_code=400, detail="Affiliate disabled for this product")

    # Keep custom-code validation explicit and user-friendly.
    if payload.custom_code:
        normalized = payload.custom_code.upper()
        exists = await db.scalar(select(AffiliateLink).where(func.lower(AffiliateLink.code) == normalized.lower()))
        if exists:
            raise HTTPException(status_code=400, detail="Code already exists")
        code_candidates = [normalized]
    else:
        code_candidates = [secrets.token_urlsafe(8)[:12].upper() for _ in range(5)]

    last_error = None
    for code in code_candidates:
        link = AffiliateLink(
            influencer_id=current_user.id,
            product_id=payload.product_id,
            code=code,
            tracking_url=build_affiliate_tracking_url(code),
            status="active" if not product else "pending",
        )
        db.add(link)
        try:
            await db.flush()
        except IntegrityError as exc:
            await db.rollback()
            last_error = exc
            if payload.custom_code:
                raise HTTPException(status_code=400, detail="Code already exists") from exc
            continue

        if product:
            db.add(
                AffiliateLinkRequest(
                    product_id=product.id,
                    influencer_id=current_user.id,
                    producer_id=product.producer_id,
                    status="pending",
                )
            )
        return link

    raise HTTPException(status_code=500, detail="Could not generate unique affiliate code") from last_error


@router.post("/affiliate-links/{link_id}/deactivate")
async def deactivate_affiliate_link(link_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_influencer(current_user)
    link = await db.scalar(select(AffiliateLink).where(AffiliateLink.id == link_id, AffiliateLink.influencer_id == current_user.id))
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    link.status = "paused"
    await db.flush()
    return {"ok": True}


@router.get("/commissions", response_model=CommissionListResponse)
async def get_commissions(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_influencer(current_user)
    stmt = select(Commission).options(selectinload(Commission.order_item)).where(Commission.influencer_id == current_user.id)
    if status_filter:
        stmt = stmt.where(Commission.status == status_filter)
    stmt = stmt.order_by(Commission.created_at.desc()).limit(100)
    commissions = (await db.execute(stmt)).scalars().all()

    summary = {}
    for key in ("pending", "approved", "paid"):
        summary[key] = await db.scalar(
            select(func.coalesce(func.sum(Commission.commission_cents), 0)).where(
                Commission.influencer_id == current_user.id,
                Commission.status == key,
            )
        )

    return CommissionListResponse(
        items=[
            {
                "id": c.id,
                "order_id": c.order_id,
                "product_name": c.order_item.product_name,
                "sale_amount_cents": c.sale_amount_cents,
                "commission_rate_bps": c.commission_rate_bps,
                "commission_cents": c.commission_cents,
                "status": c.status,
                "created_at": c.created_at,
                "can_approve_at": c.created_at + timedelta(days=30),
            }
            for c in commissions
        ],
        summary={"pending_cents": summary["pending"], "approved_cents": summary["approved"], "paid_cents": summary["paid"]},
    )


@router.get("/payouts", response_model=list[PayoutResponse])
async def get_payouts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_influencer(current_user)
    payouts = (
        await db.execute(
            select(Payout)
            .options(selectinload(Payout.commissions))
            .where(Payout.influencer_id == current_user.id)
            .order_by(Payout.requested_at.desc())
        )
    ).scalars().all()
    return [
        PayoutResponse(
            id=p.id,
            amount_cents=p.amount_cents,
            status=p.status,
            method=p.method,
            requested_at=p.requested_at,
            processed_at=p.processed_at,
            paid_at=p.paid_at,
            commissions_count=len(p.commissions),
        )
        for p in payouts
    ]


@router.post("/payouts", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
async def request_payout(
    _: PayoutRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_influencer(current_user)
    if not current_user.stripe_account_id or current_user.stripe_account_status != "active":
        raise HTTPException(status_code=400, detail="Stripe Connect account is not active")

    pending = await db.scalar(
        select(func.count(Payout.id)).where(Payout.influencer_id == current_user.id, Payout.status.in_(["requested", "processing"]))
    )
    if pending:
        raise HTTPException(status_code=400, detail="You already have a payout in progress")

    result = await db.execute(
        select(Commission).where(
            Commission.influencer_id == current_user.id,
            Commission.status == "approved",
            Commission.payout_id.is_(None),
        )
    )
    commissions = result.scalars().all()
    amount = sum(c.commission_cents for c in commissions)
    if amount < settings.AFFILIATE_MIN_PAYOUT_CENTS:
        raise HTTPException(status_code=400, detail="Minimum payout not reached")

    payout = Payout(influencer_id=current_user.id, amount_cents=amount, status="requested")
    db.add(payout)
    await db.flush()
    for commission in commissions:
        commission.payout_id = payout.id
        commission.status = "processing"

    await db.flush()
    return PayoutResponse(
        id=payout.id,
        amount_cents=payout.amount_cents,
        status=payout.status,
        method=payout.method,
        requested_at=payout.requested_at,
        processed_at=payout.processed_at,
        paid_at=payout.paid_at,
        commissions_count=len(commissions),
    )

