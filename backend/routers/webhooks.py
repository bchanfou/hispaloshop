from datetime import datetime, timedelta, timezone

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import Commission, Order, OrderItem, StripeEvent, Subscription, Transaction, User
from services.affiliate_service import track_conversion

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


async def _is_event_processed(db: AsyncSession, event_id: str) -> bool:
    existing = await db.scalar(select(StripeEvent.id).where(StripeEvent.event_id == event_id))
    return existing is not None


async def _mark_event_processed(db: AsyncSession, event_id: str, event_type: str) -> None:
    db.add(StripeEvent(event_id=event_id, event_type=event_type))
    await db.flush()


async def _handle_checkout_session_completed(db: AsyncSession, event: dict) -> None:
    session = event["data"]["object"]
    order_id = session.get("metadata", {}).get("order_id")
    if not order_id:
        return

    order = await db.get(Order, order_id, with_for_update=True)
    if not order:
        return

    order.stripe_checkout_session_id = session.get("id")
    order.stripe_payment_intent_id = session.get("payment_intent")


async def _handle_payment_intent_succeeded(db: AsyncSession, event: dict) -> None:
    payment_intent = event["data"]["object"]
    payment_intent_id = payment_intent.get("id")

    # async-safe eager loading for order.items and item.product usage.
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.stripe_payment_intent_id == payment_intent_id)
        .with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order or order.payment_status == "paid":
        return

    order.status = "paid"
    order.payment_status = "paid"
    order.paid_at = datetime.now(timezone.utc)

    producer_amounts: dict = {}
    for item in order.items:
        if item.product.track_inventory:
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
                ((await db.execute(select(Commission.order_item_id).where(Commission.order_id == order.id))).scalars().all())
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

            payout_ref = f"affiliate_commission:{item.id}"
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


async def _handle_payment_intent_failed(db: AsyncSession, event: dict) -> None:
    payment_intent = event["data"]["object"]
    payment_intent_id = payment_intent.get("id")
    if not payment_intent_id:
        return

    order = await db.scalar(
        select(Order).where(Order.stripe_payment_intent_id == payment_intent_id).with_for_update()
    )
    if order and order.payment_status == "pending":
        order.status = "pending"
        order.payment_status = "requires_payment"


async def _handle_charge_refunded(db: AsyncSession, event: dict) -> None:
    charge = event["data"]["object"]
    payment_intent_id = charge.get("payment_intent")
    if not payment_intent_id:
        return

    order_result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.stripe_payment_intent_id == payment_intent_id)
        .with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order:
        return

    # Stripe sends cumulative refunded amount on charge objects; process only delta.
    stripe_total_refunded = int(charge.get("amount_refunded") or 0)
    our_total_refunded = await db.scalar(
        select(func.coalesce(func.sum(func.abs(Transaction.amount_cents)), 0)).where(
            Transaction.order_id == order.id,
            Transaction.type == "refund",
        )
    )
    refund_delta = stripe_total_refunded - int(our_total_refunded or 0)
    if refund_delta <= 0:
        return

    db.add(
        Transaction(
            order_id=order.id,
            user_id=order.user_id,
            type="refund",
            amount_cents=-refund_delta,
            status="completed",
            completed_at=datetime.now(timezone.utc),
            description=f"stripe_charge:{charge.get('id')}",
        )
    )

    if (int(our_total_refunded or 0) + refund_delta) >= order.total_cents:
        order.status = "refunded"
        order.payment_status = "refunded"


async def _handle_subscription_event(db: AsyncSession, event: dict, deleted: bool = False) -> None:
    stripe_sub = event["data"]["object"]
    stripe_customer_id = stripe_sub.get("customer")
    if not stripe_customer_id:
        return

    user = await db.scalar(select(User).where(User.stripe_customer_id == stripe_customer_id))
    if not user:
        return

    subscription = await db.scalar(select(Subscription).where(Subscription.user_id == user.id).with_for_update())
    if not subscription:
        subscription = Subscription(
            user_id=user.id,
            plan="free",
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
        )
        db.add(subscription)

    if deleted:
        subscription.status = "cancelled"
        subscription.plan = "free"
        subscription.commission_bps = subscription.get_commission_bps()
        return

    stripe_price_id = None
    items = stripe_sub.get("items", {}).get("data", [])
    if items:
        stripe_price_id = items[0].get("price", {}).get("id")

    if stripe_price_id == settings.STRIPE_PRICE_PRO:
        subscription.plan = "pro"
    elif stripe_price_id == settings.STRIPE_PRICE_ELITE:
        subscription.plan = "elite"
    else:
        subscription.plan = "free"

    subscription.status = stripe_sub.get("status", "active")
    subscription.commission_bps = subscription.get_commission_bps()

    if stripe_sub.get("current_period_start"):
        subscription.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"], tz=timezone.utc)
    if stripe_sub.get("current_period_end"):
        subscription.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"], tz=timezone.utc)


EVENT_HANDLERS = {
    "checkout.session.completed": _handle_checkout_session_completed,
    "payment_intent.succeeded": _handle_payment_intent_succeeded,
    "payment_intent.payment_failed": _handle_payment_intent_failed,
    "charge.refunded": _handle_charge_refunded,
    "customer.subscription.created": lambda db, event: _handle_subscription_event(db, event, deleted=False),
    "customer.subscription.updated": lambda db, event: _handle_subscription_event(db, event, deleted=False),
    "customer.subscription.deleted": lambda db, event: _handle_subscription_event(db, event, deleted=True),
}


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {exc}")

    event_id = event.get("id")
    if event_id and await _is_event_processed(db, event_id):
        return {"received": True, "idempotent": True}

    handler = EVENT_HANDLERS.get(event.get("type"))
    if handler:
        await handler(db, event)

    if event_id:
        await _mark_event_processed(db, event_id, event.get("type", "unknown"))

    account = event.get("data", {}).get("object", {})
    if event.get("type") == "account.updated":
        user = await db.scalar(select(User).where(User.stripe_account_id == account.get("id")))
        if user:
            user.stripe_account_status = "active" if account.get("charges_enabled") else "pending"

    return {"received": True}
