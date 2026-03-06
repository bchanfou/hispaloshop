from datetime import datetime, timezone
from typing import Iterable

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
from services.shipping_service import ShippingService

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


def _commission_by_producer(subscriptions: Iterable[Subscription]) -> dict[str, int]:
    return {str(subscription.user_id): subscription.get_commission_bps() for subscription in subscriptions}


def _calculate_platform_fee(line_total: int, producer_commission_bps: int) -> int:
    return int(line_total * producer_commission_bps / 10000)

@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await db.scalar(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.producer))
        .where(Cart.user_id == current_user.id, Cart.status == "active")
    )
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Deterministic lock order to reduce deadlock risk for multi-item carts.
    sorted_items = sorted(cart.items, key=lambda i: str(i.product_id))
    locked_products: dict[str, Product] = {}
    for item in sorted_items:
        product = await db.scalar(select(Product).where(Product.id == item.product_id).with_for_update())
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found for cart item {item.product_id}")
        locked_products[str(item.product_id)] = product

    subtotal = 0
    for item in sorted_items:
        product = locked_products[str(item.product_id)]
        if product.track_inventory and product.inventory_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for {product.name}: "
                    f"available {product.inventory_quantity}, requested {item.quantity}"
                ),
            )
        subtotal += item.quantity * item.unit_price_cents

    producer_ids = {product.producer_id for product in locked_products.values()}
    producers = (
        await db.scalars(
            select(User).where(User.id.in_(producer_ids))
        )
    ).all()
    producers_by_id = {str(p.id): p for p in producers}

    shipping_cents = 0
    producer_item_count: dict[str, int] = {}
    producer_subtotals: dict[str, int] = {}
    for item in sorted_items:
        product = locked_products[str(item.product_id)]
        producer_key = str(product.producer_id)
        producer_item_count[producer_key] = producer_item_count.get(producer_key, 0) + item.quantity
        producer_subtotals[producer_key] = producer_subtotals.get(producer_key, 0) + item.quantity * item.unit_price_cents

    for producer_key, producer_subtotal in producer_subtotals.items():
        producer = producers_by_id.get(producer_key)
        if not producer:
            continue
        shipping_cents += ShippingService.calculate_shipping_cents(
            policy=ShippingService.policy_from_user(producer),
            item_count=producer_item_count.get(producer_key, 0),
            subtotal_cents=producer_subtotal,
        )

    shipping_country = (payload.shipping_address.country or "ES").upper()
    tax_rate_bp = ShippingService.get_tax_rate_bp(shipping_country)
    totals = ShippingService.calculate_order_totals(
        subtotal_cents=subtotal,
        shipping_cents=shipping_cents,
        tax_rate_bp=tax_rate_bp,
    )
    tax_cents = totals["tax_cents"]
    total_cents = totals["total_cents"]

    producer_subscriptions = (
        await db.scalars(select(Subscription).where(Subscription.user_id.in_(producer_ids), Subscription.status == "active"))
    ).all()
    commission_map = _commission_by_producer(producer_subscriptions)

    affiliate_bps = None
    affiliate_cents = None

    affiliate_code = request.cookies.get(settings.AFFILIATE_COOKIE_NAME) if request else None
    if not affiliate_code and cart.affiliate_code:
        affiliate_code = cart.affiliate_code

    if affiliate_code:
        link = await db.scalar(
            select(AffiliateLink)
            .options(selectinload(AffiliateLink.influencer).selectinload(User.influencer_profile))
            .where(AffiliateLink.code.ilike(affiliate_code), AffiliateLink.status == "active")
        )
        if link and link.influencer and link.influencer.influencer_profile:
            affiliate_code = link.code
            affiliate_bps = link.influencer.influencer_profile.get_commission_bps()
            affiliate_cents = int(subtotal * affiliate_bps / 10000)

    platform_fee_cents = 0
    order = Order(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        status="pending",
        payment_status="pending",
        subtotal_cents=subtotal,
        shipping_cents=shipping_cents,
        tax_cents=tax_cents,
        total_cents=total_cents,
        platform_fee_bps=0,
        platform_fee_cents=platform_fee_cents,
        affiliate_code=affiliate_code,
        affiliate_commission_bps=affiliate_bps,
        affiliate_commission_cents=affiliate_cents,
        shipping_address=payload.shipping_address.model_dump(),
    )
    db.add(order)
    await db.flush()

    line_items = []
    for item in sorted_items:
        line_total = item.quantity * item.unit_price_cents
        producer_commission_bps = commission_map.get(str(item.product.producer_id), 2000)
        line_platform_fee = _calculate_platform_fee(line_total, producer_commission_bps)
        line_affiliate = int(line_total * (affiliate_bps or 0) / 10000)
        platform_fee_cents += line_platform_fee

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

    if shipping_cents:
        line_items.append(
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": "Shipping"},
                    "unit_amount": shipping_cents,
                },
                "quantity": 1,
            }
        )
    if tax_cents:
        line_items.append(
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": "Tax"},
                    "unit_amount": tax_cents,
                },
                "quantity": 1,
            }
        )

    order.platform_fee_cents = platform_fee_cents
    order.platform_fee_bps = round((platform_fee_cents * 10000) / subtotal) if subtotal else 0

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
