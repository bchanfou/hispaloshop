from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import InfluencerProfile, Order, OrderItem, Transaction, User

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


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

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = session.get("metadata", {}).get("order_id")
        if order_id:
            order = await db.get(Order, order_id)
            if order:
                order.stripe_checkout_session_id = session.get("id")
                order.stripe_payment_intent_id = session.get("payment_intent")

    elif event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent.get("id")
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .where(Order.stripe_payment_intent_id == payment_intent_id)
        )
        order = result.scalar_one_or_none()
        if order and order.payment_status != "paid":
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

            if order.affiliate_code and order.affiliate_commission_cents:
                influencer = await db.scalar(
                    select(User).join(InfluencerProfile, InfluencerProfile.user_id == User.id).where(User.full_name == order.affiliate_code)
                )
                if influencer:
                    db.add(
                        Transaction(
                            order_id=order.id,
                            user_id=influencer.id,
                            type="commission",
                            amount_cents=order.affiliate_commission_cents,
                            status="completed",
                            completed_at=datetime.now(timezone.utc),
                        )
                    )

    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        order = await db.scalar(select(Order).where(Order.stripe_payment_intent_id == charge.get("payment_intent")))
        if order:
            order.status = "refunded"
            order.payment_status = "refunded"
            db.add(
                Transaction(
                    order_id=order.id,
                    user_id=order.user_id,
                    type="refund",
                    amount_cents=-order.total_cents,
                    status="completed",
                    completed_at=datetime.now(timezone.utc),
                )
            )

    elif event["type"] == "account.updated":
        account = event["data"]["object"]
        user = await db.scalar(select(User).where(User.stripe_account_id == account.get("id")))
        if user:
            user.stripe_account_status = "active" if account.get("charges_enabled") else "pending"

    return {"received": True}
