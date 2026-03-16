"""
Payment routes: Stripe checkout, buy-now, status.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid
import os

from ..core.config import db, STRIPE_API_KEY, PLATFORM_COMMISSION, FRONTEND_URL, logger
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter(tags=["Payments"])

import stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


class OrderCreateInput(BaseModel):
    shipping_address: Dict[str, str]


class BuyNowInput(BaseModel):
    product_id: str
    quantity: int
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    shipping_address: Dict[str, str]


@router.post("/payments/create-checkout")
async def create_checkout(
    request: Request,
    input: OrderCreateInput,
    user: User = Depends(get_current_user)
):
    """Create Stripe checkout session for cart."""
    cart_items = await db.cart_items.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build line items
    line_items = []
    for item in cart_items:
        line_items.append({
            "product_id": item["product_id"],
            "producer_id": item.get("producer_id"),
            "name": item["product_name"],
            "price": item["price"],
            "currency": item.get("currency", "EUR"),
            "quantity": item["quantity"],
            "image": item.get("image"),
            "variant_id": item.get("variant_id"),
            "variant_name": item.get("variant_name"),
            "pack_id": item.get("pack_id"),
            "pack_label": item.get("pack_label"),
            "amount": item["price"] * item["quantity"]
        })
    
    total = sum(item["amount"] for item in line_items)
    
    # Check for discount
    discount = await db.cart_discounts.find_one({"user_id": user.user_id}, {"_id": 0})
    discount_amount = 0
    
    if discount:
        if discount["type"] == "percentage":
            discount_amount = total * (discount["value"] / 100)
        else:
            discount_amount = discount["value"]
        total = max(0, total - discount_amount)
    
    # Create order
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order = {
        "order_id": order_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_name": user.name,
        "line_items": line_items,
        "subtotal": sum(item["amount"] for item in line_items),
        "discount_amount": discount_amount,
        "discount_code": discount.get("code") if discount else None,
        "total_amount": total,
        "currency": "EUR",
        "status": "pending",
        "shipping_address": input.shipping_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Create Stripe session
    try:
        session = stripe.checkout.Session.create(
            success_url=f"{FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/checkout/cancel",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": item["name"]},
                    "unit_amount": int(item["price"] * 100)
                },
                "quantity": item["quantity"]
            } for item in line_items],
            mode="payment",
            metadata={"order_id": order_id}
        )
        session_id = session.id
        checkout_url = session.url
        
        # Update order with session ID
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"stripe_session_id": session_id}}
        )
        
        # Clear cart
        await db.cart_items.delete_many({"user_id": user.user_id})
        await db.cart_discounts.delete_one({"user_id": user.user_id})
        
        return {
            "session_id": session_id,
            "checkout_url": checkout_url,
            "order_id": order_id
        }
        
    except Exception as e:
        logger.error(f"[CHECKOUT] Error: {e}")
        # Delete pending order on error
        await db.orders.delete_one({"order_id": order_id})
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkout/buy-now")
async def buy_now_checkout(
    input: BuyNowInput,
    request: Request,
    user: User = Depends(get_current_user)
):
    """Create checkout for single product purchase."""
    product = await db.products.find_one(
        {"product_id": input.product_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    price = product["price"]
    variant_name = None
    pack_label = None
    
    # Handle variants/packs
    if input.variant_id:
        variants = product.get("variants", [])
        variant = next((v for v in variants if v["variant_id"] == input.variant_id), None)
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        variant_name = variant["name"]
        
        if input.pack_id:
            packs = variant.get("packs", [])
            pack = next((p for p in packs if p["pack_id"] == input.pack_id), None)
            if not pack:
                raise HTTPException(status_code=404, detail="Pack not found")
            price = pack["price"]
            pack_label = pack["label"]
    
    total = price * input.quantity
    
    # Create order
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order = {
        "order_id": order_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_name": user.name,
        "line_items": [{
            "product_id": input.product_id,
            "producer_id": product.get("producer_id"),
            "name": product["name"],
            "price": price,
            "quantity": input.quantity,
            "variant_id": input.variant_id,
            "variant_name": variant_name,
            "pack_id": input.pack_id,
            "pack_label": pack_label,
            "amount": total,
            "image": product["images"][0] if product.get("images") else None
        }],
        "total_amount": total,
        "currency": "EUR",
        "status": "pending",
        "shipping_address": input.shipping_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Create Stripe session
    try:
        session = stripe.checkout.Session.create(
            success_url=f"{FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/checkout/cancel",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": product["name"]},
                    "unit_amount": int(price * 100)
                },
                "quantity": input.quantity
            }],
            mode="payment",
            metadata={"order_id": order_id}
        )
        session_id = session.id
        checkout_url = session.url
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"stripe_session_id": session_id}}
        )
        
        return {
            "session_id": session_id,
            "checkout_url": checkout_url,
            "order_id": order_id
        }
        
    except Exception as e:
        logger.error(f"[BUY NOW] Error: {e}")
        await db.orders.delete_one({"order_id": order_id})
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payments/checkout-status/{session_id}")
async def checkout_status(
    session_id: str,
    user: User = Depends(get_current_user)
):
    """Get checkout session status."""
    order = await db.orders.find_one(
        {"stripe_session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        
        # Update order if paid
        if payment_status == "paid" and order["status"] == "pending":
            await db.orders.update_one(
                {"order_id": order["order_id"]},
                {"$set": {
                    "status": "confirmed",
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Record payment transaction
            await db.payment_transactions.insert_one({
                "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
                "order_id": order["order_id"],
                "amount": order["total_amount"],
                "currency": order.get("currency", "EUR"),
                "status": "completed",
                "stripe_session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Update stock
            for item in order.get("line_items", []):
                await db.products.update_one(
                    {"product_id": item["product_id"], "track_stock": True},
                    {"$inc": {"stock": -item["quantity"]}}
                )
        
        return {
            "status": payment_status,
            "order_status": order["status"],
            "order_id": order["order_id"]
        }
        
    except Exception as e:
        logger.error(f"[CHECKOUT STATUS] Error: {e}")
        return {
            "status": "unknown",
            "order_status": order["status"],
            "order_id": order["order_id"],
            "error": str(e)
        }
