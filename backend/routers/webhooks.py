from __future__ import annotations

from datetime import datetime, timezone
import logging

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import Order, OrderItem, User
from services.commission_service import (
    build_payment_event_marker,
    build_refund_event_marker,
    get_total_refunded_cents,
    is_event_already_processed,
    mark_event_processed,
    process_payment_fees,
    process_refund,
)
from services.stripe_connect_service import StripeConnectService


router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)


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

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent.get("id")
        event_id = event.get("id", "")

        result = await db.execute(
            select(Order)
            .options(
                # Async safety: eager-load order.items before leaving query context.
                selectinload(Order.items).selectinload(OrderItem.product),
                selectinload(Order.items).selectinload(OrderItem.producer),
            )
            .where(Order.stripe_payment_intent_id == payment_intent_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()

        if order and order.payment_status != "paid":
            marker = build_payment_event_marker(event_id) if event_id else ""
            if marker and await is_event_already_processed(db, order.id, marker):
                logger.info("Skipping duplicate payment_intent.succeeded event %s for order %s", event_id, order.id)
                return {"received": True}

            order.status = "paid"
            order.payment_status = "paid"
            order.paid_at = datetime.now(timezone.utc)
            await process_payment_fees(db=db, order=order)

            # Transfer producer net funds to connected accounts (idempotent by order_item).
            for item in order.items:
                await StripeConnectService.transfer_order_item_to_producer(db=db, item=item)

            if marker:
                await mark_event_processed(db=db, order=order, marker=marker)

    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        payment_intent_id = charge.get("payment_intent")
        total_refunded_stripe = int(charge.get("amount_refunded") or 0)
        event_id = event.get("id", "")

        result = await db.execute(
            select(Order)
            .options(
                # Async safety: eager-load order.items to avoid lazy-load failures.
                selectinload(Order.items)
            )
            .where(Order.stripe_payment_intent_id == payment_intent_id)
            .with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            logger.error("Order not found for refund payment_intent=%s", payment_intent_id)
            return {"received": True}

        marker = build_refund_event_marker(event_id) if event_id else ""
        if marker and await is_event_already_processed(db, order.id, marker):
            logger.info("Skipping duplicate charge.refunded event %s for order %s", event_id, order.id)
            return {"received": True}

        prev_refunded = await get_total_refunded_cents(db, order.id)
        delta = total_refunded_stripe - prev_refunded
        if delta <= 0:
            logger.info(
                "Refund already applied for order %s (stripe_total=%s, prev_refunded=%s)",
                order.id,
                total_refunded_stripe,
                prev_refunded,
            )
            if marker:
                await mark_event_processed(db=db, order=order, marker=marker)
            return {"received": True}

        await process_refund(db=db, order=order, amount_to_refund_cents=delta, event_id=event_id)
        if marker:
            await mark_event_processed(db=db, order=order, marker=marker)

    elif event["type"] == "account.updated":
        account = event["data"]["object"]
        user = await db.scalar(select(User).where(User.stripe_account_id == account.get("id")))
        if user:
            user.stripe_account_charges_enabled = bool(account.get("charges_enabled"))
            user.stripe_account_payouts_enabled = bool(account.get("payouts_enabled"))
            user.connect_requirements_due = list((account.get("requirements") or {}).get("currently_due") or [])
            user.connect_onboarding_completed = bool(
                user.stripe_account_charges_enabled and user.stripe_account_payouts_enabled
            )
            user.stripe_account_status = "active" if user.connect_onboarding_completed else "pending"

    return {"received": True}
