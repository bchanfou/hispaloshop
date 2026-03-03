from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import AffiliateLink, Cart, CartItem, Order, OrderItem, Product, Subscription, User
from routers.auth import get_current_user
from schemas import CheckoutCreateRequest, CheckoutResponse

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await db.scalar(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .where(Cart.user_id == current_user.id, Cart.status == "active")
    )
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = 0
    for item in cart.items:
        if item.product.track_inventory and item.product.inventory_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.product.name}")
        subtotal += item.quantity * item.unit_price_cents

    shipping_cents = 0 if subtotal >= 5000 else 490
    tax_cents = int((subtotal + shipping_cents) * 0.21)
    total_cents = subtotal + shipping_cents + tax_cents

    subscription = await db.scalar(select(Subscription).where(Subscription.user_id == current_user.id, Subscription.status == "active"))
    platform_fee_bps = subscription.get_commission_bps() if subscription else 2000
    platform_fee_cents = int(subtotal * platform_fee_bps / 10000)

    affiliate_bps = None
    affiliate_cents = None

    affiliate_code = request.cookies.get(settings.AFFILIATE_COOKIE_NAME) if request else None
    if not affiliate_code and cart.affiliate_code:
        affiliate_code = cart.affiliate_code

    if affiliate_code:
        link = await db.scalar(select(AffiliateLink).options(selectinload(AffiliateLink.influencer).selectinload(User.influencer_profile)).where(AffiliateLink.code.ilike(affiliate_code), AffiliateLink.status == "active"))
        if link and link.influencer and link.influencer.influencer_profile:
            affiliate_code = link.code
            affiliate_bps = link.influencer.influencer_profile.get_commission_bps()
            affiliate_cents = int(subtotal * affiliate_bps / 10000)

    order = Order(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        status="pending",
        payment_status="pending",
        subtotal_cents=subtotal,
        shipping_cents=shipping_cents,
        tax_cents=tax_cents,
        total_cents=total_cents,
        platform_fee_bps=platform_fee_bps,
        platform_fee_cents=platform_fee_cents,
        affiliate_code=affiliate_code,
        affiliate_commission_bps=affiliate_bps,
        affiliate_commission_cents=affiliate_cents,
        shipping_address=payload.shipping_address.model_dump(),
    )
    db.add(order)
    await db.flush()

    line_items = []
    for item in cart.items:
        line_total = item.quantity * item.unit_price_cents
        line_platform_fee = int(line_total * platform_fee_bps / 10000)
        line_affiliate = int(line_total * (affiliate_bps or 0) / 10000)
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                product_name=item.product.name,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity,
                total_cents=line_total,
                producer_id=item.product.producer_id,
                producer_payout_cents=line_total - line_platform_fee - line_affiliate,
                platform_fee_cents=line_platform_fee,
            )
        )
        line_items.append(
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": item.product.name},
                    "unit_amount": item.unit_price_cents,
                },
                "quantity": item.quantity,
            }
        )

    checkout = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        metadata={"order_id": str(order.id), "affiliate_code": affiliate_code or ""},
        success_url=f"{settings.FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/cart",
    )

    order.stripe_checkout_session_id = checkout.id
    order.stripe_payment_intent_id = checkout.payment_intent

    return CheckoutResponse(checkout_url=checkout.url, order_id=order.id, expires_at=datetime.fromtimestamp(checkout.expires_at, tz=timezone.utc))


@router.get("/checkout/success")
async def checkout_success(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = await db.scalar(select(Order).where(Order.stripe_checkout_session_id == session_id, Order.user_id == current_user.id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order_id": order.id, "status": order.status, "payment_status": order.payment_status}
