import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import Optional
from uuid import UUID
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import normalize_influencer_tier, settings
from models import AffiliateEvent, AffiliateLink, Commission, InfluencerProfile, OrderItem, Payout, User


BOT_HINTS = ("bot", "spider", "crawler", "headless", "preview")
logger = logging.getLogger(__name__)


def is_bot_user_agent(user_agent: str | None) -> bool:
    if not user_agent:
        return False
    lowered = user_agent.lower()
    return any(hint in lowered for hint in BOT_HINTS)


async def get_affiliate_link_by_code(db: AsyncSession, code: str) -> Optional[AffiliateLink]:
    return await db.scalar(select(AffiliateLink).where(func.lower(AffiliateLink.code) == code.lower()))


def build_affiliate_tracking_url(code: str, base_url: str | None = None) -> str:
    configured_backend_url = getattr(settings, "BACKEND_URL", None)
    backend_base_url = (base_url or configured_backend_url)
    if not backend_base_url:
        raise ValueError("Backend URL not configured for affiliate tracking")
    backend_base_url = backend_base_url.rstrip("/")
    return f"{backend_base_url}/r/{code}"


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

    existing_commission = await db.scalar(
        select(Commission).where(
            Commission.order_id == order_id,
            Commission.order_item_id == order_item_id,
            Commission.affiliate_link_id == link.id,
        )
    )
    if existing_commission:
        return existing_commission

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

    conversion_event = AffiliateEvent(
        link_id=link.id,
        event_type="conversion",
        ip_address=last_click.ip_address,
        user_agent=last_click.user_agent,
        referrer=last_click.referrer,
        cookie_id=last_click.cookie_id,
        attributed_order_id=order_id,
        conversion_value_cents=sale_amount_cents,
        commission_cents=commission_cents,
    )
    db.add(conversion_event)

    if influencer_profile:
        influencer_profile.total_earnings_cents += commission_cents
        influencer_profile.pending_earnings_cents += commission_cents
        influencer_profile.total_gmv_cents += sale_amount_cents
        influencer_profile.total_referrals += 1

    order_item = await db.get(OrderItem, order_item_id)
    if order_item:
        order_item.affiliate_commission_cents = commission_cents

    # Keep tier progression in sync with freshly updated GMV/referral metrics.
    await recalculate_influencer_tier(db, link.influencer_id)

    await db.flush()
    return commission


async def recalculate_influencer_tier(db: AsyncSession, influencer_id: UUID) -> str:
    profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == influencer_id))
    if not profile:
        return "perseo"

    profile.tier = normalize_influencer_tier(profile.tier)
    new_tier = profile.recalculate_tier()
    if new_tier != profile.tier:
        old_tier = profile.tier
        profile.tier = new_tier
        profile.tier_updated_at = datetime.now(timezone.utc)
        logger.info("Influencer %s upgraded tier %s -> %s", influencer_id, old_tier, new_tier)
    await db.flush()
    return profile.tier


PAYOUT_MAX_RETRIES = 3
PAYOUT_BACKOFF_SECONDS = [1, 4, 16]  # attempt 0→sleep 1s, 1→sleep 4s, 2→no sleep


async def _attempt_stripe_transfer(payout) -> str:
    """Attempt a real Stripe transfer. Returns the transfer ID or raises."""
    import stripe as _stripe
    transfer = _stripe.Transfer.create(
        amount=payout.amount_cents,
        currency=payout.currency or "eur",
        destination=payout.stripe_account_id,
        transfer_group=f"payout_{payout.id}",
        metadata={"payout_id": str(payout.id), "influencer_id": str(payout.influencer_id)},
    )
    return transfer.id


async def _notify_admin_transfer_failed(db: AsyncSession, payout: Payout, error: Exception) -> None:
    """Send email to super_admin when a payout transfer fails after all retries."""
    try:
        from services.auth_helpers import send_email

        superadmin = await db.scalar(select(User).where(User.role == "super_admin"))
        if not superadmin or not superadmin.email:
            logger.warning("No super_admin email found for payout failure notification")
            return

        influencer = await db.get(User, payout.influencer_id)
        inf_name = (influencer.full_name or influencer.email) if influencer else "Unknown"

        email_subject = f"Transferencia Stripe fallida — {payout.id}"
        email_body = f"""
        <h2>Transferencia fallida despues de {PAYOUT_MAX_RETRIES} reintentos</h2>
        <p><strong>Payout ID:</strong> {payout.id}</p>
        <p><strong>Influencer:</strong> {inf_name}</p>
        <p><strong>Monto:</strong> {payout.amount_cents / 100:.2f} {payout.currency or 'EUR'}</p>
        <p><strong>Error:</strong> {str(error)[:200]}</p>
        <p><strong>Accion requerida:</strong> Revisar en dashboard admin y reintentar manualmente o contactar a Stripe support.</p>
        <p><a href="/admin/payouts?status=transfer_failed">Ver payouts fallidos</a></p>
        """

        send_email(
            to=superadmin.email,
            subject=email_subject,
            html=email_body,
        )
        logger.info("Admin notification sent for failed payout %s", payout.id)
    except Exception as notify_err:
        logger.error("Failed to send admin notification for payout %s: %s", payout.id, notify_err)


async def process_affiliate_payout(db: AsyncSession, payout_id: UUID) -> bool:
    payout = await db.get(Payout, payout_id)
    if not payout:
        return False

    # If already transferred, just mark paid (idempotent re-processing)
    if payout.stripe_transfer_id:
        payout.status = "paid"
        payout.processed_at = datetime.now(timezone.utc)
        payout.paid_at = datetime.now(timezone.utc)
    else:
        # Mark as pending_transfer and flush before retries — no silent data gaps on interruption
        payout.status = "pending_transfer"
        payout.processed_at = datetime.now(timezone.utc)
        await db.flush()  # Persist state before Stripe attempts

        # Attempt real Stripe transfer with exponential backoff
        last_error = None
        for attempt in range(PAYOUT_MAX_RETRIES):
            try:
                transfer_id = await _attempt_stripe_transfer(payout)
                payout.stripe_transfer_id = transfer_id
                payout.status = "paid"
                payout.paid_at = datetime.now(timezone.utc)
                last_error = None
                break
            except Exception as e:
                last_error = e
                logger.warning(
                    "Stripe transfer attempt %d/%d failed for payout %s: %s",
                    attempt + 1, PAYOUT_MAX_RETRIES, payout_id, e,
                )
                if attempt < PAYOUT_MAX_RETRIES - 1:
                    await asyncio.sleep(PAYOUT_BACKOFF_SECONDS[attempt])

        if last_error:
            payout.status = "transfer_failed"
            payout.failure_reason = str(last_error)[:500]
            payout.failed_at = datetime.now(timezone.utc)
            logger.error(
                "Payout %s FAILED after %d retries: %s", payout_id, PAYOUT_MAX_RETRIES, last_error,
            )
            await _notify_admin_transfer_failed(db, payout, last_error)
            await db.flush()
            return False

    # Mark commissions as paid
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
