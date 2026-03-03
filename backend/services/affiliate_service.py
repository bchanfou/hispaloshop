from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import AffiliateEvent, AffiliateLink, Commission, InfluencerProfile, OrderItem, Payout, User


BOT_HINTS = ("bot", "spider", "crawler", "headless", "preview")


def is_bot_user_agent(user_agent: str | None) -> bool:
    if not user_agent:
        return False
    lowered = user_agent.lower()
    return any(hint in lowered for hint in BOT_HINTS)


async def get_affiliate_link_by_code(db: AsyncSession, code: str) -> Optional[AffiliateLink]:
    return await db.scalar(select(AffiliateLink).where(func.lower(AffiliateLink.code) == code.lower()))


async def track_click(db: AsyncSession, code: str, request_metadata: dict) -> Optional[AffiliateEvent]:
    link = await get_affiliate_link_by_code(db, code)
    if not link or link.status != "active":
        return None

    user_agent = request_metadata.get("user_agent")
    if is_bot_user_agent(user_agent):
        return None

    ip_address = request_metadata.get("ip_address")
    if ip_address:
        recent_duplicate = await db.scalar(
            select(AffiliateEvent)
            .where(
                AffiliateEvent.link_id == link.id,
                AffiliateEvent.event_type == "click",
                AffiliateEvent.ip_address == ip_address,
                AffiliateEvent.created_at >= datetime.now(timezone.utc) - timedelta(seconds=5),
            )
            .order_by(AffiliateEvent.created_at.desc())
        )
        if recent_duplicate:
            return None

    link.total_clicks += 1
    cookie_id = request_metadata.get("cookie_id") or str(uuid.uuid4())
    event = AffiliateEvent(
        link_id=link.id,
        event_type="click",
        ip_address=ip_address,
        user_agent=user_agent,
        referrer=request_metadata.get("referrer"),
        cookie_id=cookie_id,
    )
    db.add(event)

    profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == link.influencer_id))
    if profile:
        profile.total_clicks += 1

    await db.flush()
    return event


async def track_conversion(
    db: AsyncSession,
    order_id: UUID,
    order_item_id: UUID,
    cookie_code: str,
    sale_amount_cents: int,
) -> Optional[Commission]:
    link = await get_affiliate_link_by_code(db, cookie_code)
    if not link or link.status != "active":
        return None

    last_click = await db.scalar(
        select(AffiliateEvent)
        .where(AffiliateEvent.link_id == link.id, AffiliateEvent.event_type == "click")
        .order_by(AffiliateEvent.created_at.desc())
    )
    if not last_click:
        return None

    now = datetime.now(timezone.utc)
    click_dt = last_click.created_at if last_click.created_at.tzinfo else last_click.created_at.replace(tzinfo=timezone.utc)
    age_days = (now - click_dt).days
    if age_days > settings.AFFILIATE_ATTRIBUTION_DAYS:
        return None

    influencer_profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == link.influencer_id))
    commission_rate_bps = influencer_profile.get_commission_bps() if influencer_profile else 300
    commission_cents = int(sale_amount_cents * commission_rate_bps / 10000)

    commission = Commission(
        influencer_id=link.influencer_id,
        order_id=order_id,
        order_item_id=order_item_id,
        affiliate_link_id=link.id,
        sale_amount_cents=sale_amount_cents,
        commission_rate_bps=commission_rate_bps,
        commission_cents=commission_cents,
        status="pending",
        cookie_attribution_days=age_days,
    )
    db.add(commission)

    link.total_conversions += 1
    link.total_gmv_cents += sale_amount_cents
    link.total_commission_cents += commission_cents

    last_click.event_type = "conversion"
    last_click.attributed_order_id = order_id
    last_click.conversion_value_cents = sale_amount_cents
    last_click.commission_cents = commission_cents

    if influencer_profile:
        influencer_profile.total_earnings_cents += commission_cents
        influencer_profile.pending_earnings_cents += commission_cents
        influencer_profile.total_gmv_cents += sale_amount_cents
        influencer_profile.total_referrals += 1

    order_item = await db.get(OrderItem, order_item_id)
    if order_item:
        order_item.affiliate_commission_cents = commission_cents

    await db.flush()
    return commission


async def recalculate_influencer_tier(db: AsyncSession, influencer_id: UUID) -> str:
    profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == influencer_id))
    if not profile:
        return "perseo"

    new_tier = profile.recalculate_tier()
    if new_tier != profile.tier:
        profile.tier = new_tier
        profile.tier_updated_at = datetime.now(timezone.utc)
    await db.flush()
    return profile.tier


async def process_affiliate_payout(db: AsyncSession, payout_id: UUID) -> bool:
    payout = await db.get(Payout, payout_id)
    if not payout:
        return False

    payout.status = "paid"
    payout.processed_at = datetime.now(timezone.utc)
    payout.paid_at = datetime.now(timezone.utc)
    payout.stripe_transfer_id = payout.stripe_transfer_id or f"mock_transfer_{payout.id}"

    result = await db.execute(select(Commission).where(Commission.payout_id == payout.id))
    commissions = result.scalars().all()
    for commission in commissions:
        commission.status = "paid"
        commission.paid_at = datetime.now(timezone.utc)

    profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == payout.influencer_id))
    if profile:
        profile.pending_earnings_cents = max(0, profile.pending_earnings_cents - payout.amount_cents)
        profile.paid_earnings_cents += payout.amount_cents

    await db.flush()
    return True
