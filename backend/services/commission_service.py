from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from uuid import UUID as UUIDType

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Commission, InfluencerProfile, Order, OrderItem, Transaction
from services.affiliate_service import track_conversion


REFUND_EVENT_MARKER_PREFIX = "stripe_event:charge.refunded:"
PAYMENT_EVENT_MARKER_PREFIX = "stripe_event:payment_intent.succeeded:"
REFUND_ITEM_PREFIX = "refund_item:"
COMMISSION_REFUND_PREFIX = "commission_refund:"
COMMISSION_PAYOUT_PREFIX = "affiliate_commission:"


def build_payment_event_marker(event_id: str) -> str:
    return f"{PAYMENT_EVENT_MARKER_PREFIX}{event_id}"


def build_refund_event_marker(event_id: str) -> str:
    return f"{REFUND_EVENT_MARKER_PREFIX}{event_id}"


async def is_event_already_processed(db: AsyncSession, order_id: UUIDType, marker: str) -> bool:
    existing = await db.scalar(
        select(Transaction).where(
            Transaction.order_id == order_id,
            Transaction.type == "webhook_marker",
            Transaction.description == marker,
        )
    )
    return existing is not None


async def mark_event_processed(db: AsyncSession, order: Order, marker: str) -> None:
    db.add(
        Transaction(
            order_id=order.id,
            user_id=order.user_id,
            type="webhook_marker",
            amount_cents=0,
            status="completed",
            completed_at=datetime.now(timezone.utc),
            description=marker,
        )
    )
    await db.flush()


async def process_payment_fees(db: AsyncSession, order: Order) -> None:
    producer_amounts: dict[UUIDType, int] = {}
    for item in order.items:
        if item.product and item.product.track_inventory:
            item.product.inventory_quantity = max(0, item.product.inventory_quantity - item.quantity)
        producer_amounts[item.producer_id] = producer_amounts.get(item.producer_id, 0) + item.producer_payout_cents

    for producer_id, amount in producer_amounts.items():
        db.add(
            Transaction(
                order_id=order.id,
                user_id=producer_id,
                type="sale",
                amount_cents=amount,
                status="completed",
                completed_at=datetime.now(timezone.utc),
            )
        )

    db.add(
        Transaction(
            order_id=order.id,
            user_id=order.user_id,
            type="fee",
            amount_cents=order.platform_fee_cents,
            status="completed",
            completed_at=datetime.now(timezone.utc),
        )
    )

    if order.affiliate_code:
        existing_commission_items = {
            commission_item_id
            for commission_item_id in (
                (await db.execute(select(Commission.order_item_id).where(Commission.order_id == order.id))).scalars().all()
            )
        }
        for item in order.items:
            commission = await track_conversion(
                db=db,
                order_id=order.id,
                order_item_id=item.id,
                cookie_code=order.affiliate_code,
                sale_amount_cents=item.total_cents,
            )
            if not commission:
                continue

            payout_ref = f"{COMMISSION_PAYOUT_PREFIX}{item.id}"
            existing_commission_tx = await db.scalar(
                select(Transaction).where(
                    Transaction.order_id == order.id,
                    Transaction.type == "commission",
                    Transaction.description == payout_ref,
                )
            )
            if existing_commission_tx or item.id in existing_commission_items:
                continue

            db.add(
                Transaction(
                    order_id=order.id,
                    user_id=commission.influencer_id,
                    type="commission",
                    amount_cents=commission.commission_cents,
                    status="completed",
                    completed_at=datetime.now(timezone.utc),
                    description=payout_ref,
                )
            )

    approval_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    stale_pending = (
        await db.execute(select(Commission).where(Commission.status == "pending", Commission.created_at <= approval_cutoff))
    ).scalars().all()
    for pending_commission in stale_pending:
        pending_commission.status = "approved"
        pending_commission.approved_at = datetime.now(timezone.utc)


def _allocate_refund_delta(items: Iterable[OrderItem], delta_cents: int, previously_refunded_by_item: dict[UUIDType, int]) -> dict[UUIDType, int]:
    item_list = list(items)
    if delta_cents <= 0 or not item_list:
        return {}

    total_order_cents = sum(max(0, item.total_cents) for item in item_list)
    if total_order_cents <= 0:
        return {}

    allocations: dict[UUIDType, int] = {}
    allocated = 0

    for idx, item in enumerate(item_list):
        prev = previously_refunded_by_item.get(item.id, 0)
        remaining_item_refundable = max(0, item.total_cents - prev)
        if remaining_item_refundable == 0:
            allocations[item.id] = 0
            continue

        if idx == len(item_list) - 1:
            candidate = delta_cents - allocated
        else:
            ratio = item.total_cents / total_order_cents
            candidate = int(delta_cents * ratio)

        apply_cents = max(0, min(candidate, remaining_item_refundable))
        allocations[item.id] = apply_cents
        allocated += apply_cents

    if allocated < delta_cents:
        remainder = delta_cents - allocated
        # Deterministic top-up to absorb rounding residue.
        for item in sorted(item_list, key=lambda it: it.total_cents, reverse=True):
            if remainder <= 0:
                break
            prev = previously_refunded_by_item.get(item.id, 0)
            already = allocations.get(item.id, 0)
            remaining = max(0, item.total_cents - prev - already)
            if remaining <= 0:
                continue
            extra = min(remaining, remainder)
            allocations[item.id] = already + extra
            remainder -= extra

    return allocations


async def _get_item_refunded_cents(db: AsyncSession, order_id: UUIDType) -> dict[UUIDType, int]:
    txs = (
        await db.execute(
            select(Transaction).where(
                Transaction.order_id == order_id,
                Transaction.type == "refund_item",
                Transaction.description.startswith(REFUND_ITEM_PREFIX),
            )
        )
    ).scalars().all()

    refunded: dict[UUIDType, int] = {}
    for tx in txs:
        # refund_item:{order_item_id}:event:{stripe_event_id}
        parts = (tx.description or "").split(":")
        if len(parts) < 3:
            continue
        try:
            item_id = UUIDType(parts[1])
        except Exception:
            continue
        refunded[item_id] = refunded.get(item_id, 0) + abs(int(tx.amount_cents))
    return refunded


async def get_total_refunded_cents(db: AsyncSession, order_id: UUIDType) -> int:
    refunded_by_item = await _get_item_refunded_cents(db, order_id)
    return sum(refunded_by_item.values())


async def process_refund(db: AsyncSession, order: Order, amount_to_refund_cents: int, event_id: str) -> None:
    if amount_to_refund_cents <= 0:
        return

    refunded_by_item = await _get_item_refunded_cents(db, order.id)
    allocations = _allocate_refund_delta(order.items, amount_to_refund_cents, refunded_by_item)
    total_allocated = sum(allocations.values())
    if total_allocated <= 0:
        return

    db.add(
        Transaction(
            order_id=order.id,
            user_id=order.user_id,
            type="refund",
            amount_cents=-total_allocated,
            status="completed",
            completed_at=datetime.now(timezone.utc),
            description=build_refund_event_marker(event_id),
        )
    )

    item_ids = [item.id for item in order.items]
    commissions = (
        await db.execute(select(Commission).where(Commission.order_item_id.in_(item_ids)))
    ).scalars().all()
    commissions_by_item = {commission.order_item_id: commission for commission in commissions}

    for item in order.items:
        item_refund = allocations.get(item.id, 0)
        if item_refund <= 0:
            continue

        db.add(
            Transaction(
                order_id=order.id,
                user_id=order.user_id,
                type="refund_item",
                amount_cents=-item_refund,
                status="completed",
                completed_at=datetime.now(timezone.utc),
                description=f"{REFUND_ITEM_PREFIX}{item.id}:event:{event_id}",
            )
        )

        commission = commissions_by_item.get(item.id)
        if not commission or commission.commission_cents <= 0 or item.total_cents <= 0:
            continue

        commission_refund = min(
            commission.commission_cents,
            int(round((commission.commission_cents * item_refund) / item.total_cents)),
        )
        if commission_refund <= 0:
            continue

        commission.commission_cents = max(0, commission.commission_cents - commission_refund)
        commission.status = "reversed" if commission.commission_cents == 0 else "partially_refunded"

        influencer_profile = await db.scalar(
            select(InfluencerProfile).where(InfluencerProfile.user_id == commission.influencer_id)
        )
        if influencer_profile:
            influencer_profile.total_earnings_cents = max(0, influencer_profile.total_earnings_cents - commission_refund)
            influencer_profile.pending_earnings_cents = max(0, influencer_profile.pending_earnings_cents - commission_refund)

        db.add(
            Transaction(
                order_id=order.id,
                user_id=commission.influencer_id,
                type="commission_refund",
                amount_cents=-commission_refund,
                status="completed",
                completed_at=datetime.now(timezone.utc),
                description=f"{COMMISSION_REFUND_PREFIX}{commission.id}:event:{event_id}",
            )
        )

    if total_allocated >= order.total_cents:
        order.status = "refunded"
        order.payment_status = "refunded"
    else:
        order.status = "partially_refunded"
        order.payment_status = "partially_refunded"

    await db.flush()
