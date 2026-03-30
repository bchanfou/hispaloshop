"""
Customer dashboard, profile, account management, and shipping addresses.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Request, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from core.database import db
from core.models import User, ShippingAddress
from core.auth import get_current_user, require_role
from services.auth_helpers import hash_password, verify_password

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_product_image(product: dict) -> str | None:
    images = product.get("images")
    if images and isinstance(images, list) and len(images) > 0:
        first = images[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first
    return product.get("image_url") or product.get("image")


# ============================================
# CUSTOMER DASHBOARD ENDPOINTS
# ============================================

@router.get("/customer/orders")
async def get_customer_orders(
    user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
):
    """Get orders for logged-in customer with pagination and optional status filter"""
    query = {"user_id": user.user_id}
    if status and status != "all":
        query["status"] = {"$in": status.split(",")}
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"orders": orders, "total": total, "has_more": skip + limit < total}

@router.get("/customer/orders/{order_id}")
async def get_customer_order_detail(order_id: str, user: User = Depends(get_current_user)):
    """Get single order details"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/customer/orders/{order_id}/reorder")
async def reorder(order_id: str, user: User = Depends(get_current_user)):
    """Re-add all items from a previous order to the cart."""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Use the unified carts collection (same as cart.py)
    cart = await db.carts.find_one({"user_id": user.user_id, "status": "active"})
    cart_items = list(cart.get("items", [])) if cart else []

    added = 0
    for item in order.get("line_items", []):
        product = await db.products.find_one(
            {"product_id": item.get("product_id")},
            {"_id": 0, "stock": 1, "status": 1, "price_cents": 1, "price": 1,
             "name": 1, "images": 1, "seller_id": 1, "producer_id": 1}
        )
        if not product or product.get("status") != "active":
            continue

        # Check stock availability
        stock = product.get("stock_quantity", product.get("stock"))
        if stock is not None and stock <= 0:
            continue  # Skip out-of-stock products

        product_id = item.get("product_id", "")
        variant_id = item.get("variant_id")
        pack_id = item.get("pack_id")
        quantity = item.get("quantity", 1)
        # Cap at available stock
        if stock is not None:
            quantity = min(quantity, stock)
        unit_price_cents = item.get("price_cents") or int(round((item.get("price", 0)) * 100))
        # Prefer current product price over stale order price
        if product.get("price_cents"):
            unit_price_cents = product["price_cents"]
        elif product.get("price"):
            unit_price_cents = int(round(product["price"] * 100))

        # Check if already in cart — match by product+variant+pack (not just product_id)
        existing_idx = None
        for idx, ci in enumerate(cart_items):
            if (ci.get("product_id") == product_id
                    and ci.get("variant_id") == variant_id
                    and ci.get("pack_id") == pack_id):
                existing_idx = idx
                break

        if existing_idx is not None:
            cart_items[existing_idx]["quantity"] += quantity
            cart_items[existing_idx]["total_price_cents"] = unit_price_cents * cart_items[existing_idx]["quantity"]
        else:
            cart_items.append({
                "product_id": product_id,
                "product_name": product.get("name") or item.get("product_name", ""),
                "product_image": _extract_product_image(product) or item.get("image"),
                "seller_id": product.get("seller_id") or product.get("producer_id") or item.get("producer_id", ""),
                "seller_type": "producer",
                "quantity": quantity,
                "unit_price_cents": unit_price_cents,
                "total_price_cents": unit_price_cents * quantity,
                "variant_id": item.get("variant_id"),
                "pack_id": item.get("pack_id"),
                "added_at": datetime.now(timezone.utc),
            })
        added += 1

    if cart:
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {"$set": {"items": cart_items, "updated_at": datetime.now(timezone.utc)}}
        )
    else:
        await db.carts.insert_one({
            "user_id": user.user_id,
            "tenant_id": "ES",
            "status": "active",
            "items": cart_items,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        })

    return {"added": added, "message": f"{added} productos agregados al carrito"}

@router.post("/customer/orders/{order_id}/review")
async def submit_order_review(
    order_id: str,
    body: dict = Body(...),
    user: User = Depends(get_current_user)
):
    """Submit a review for a delivered order."""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id})
    if not order:
        raise HTTPException(404, "Pedido no encontrado")
    if order.get("status") != "delivered":
        raise HTTPException(400, "Solo puedes dejar reseña de pedidos entregados")

    # Check for existing review
    existing = await db.reviews.find_one({"order_id": order_id, "user_id": user.user_id})
    if existing:
        raise HTTPException(400, "Ya has dejado una reseña para este pedido")

    rating = body.get("rating")
    comment = body.get("comment", "").strip()
    if not rating or not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
        raise HTTPException(400, "La valoración debe ser entre 1 y 5")

    review_doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "user_id": user.user_id,
        "user_name": user.name or user.username,
        "rating": int(rating),
        "comment": comment[:500] if comment else "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Create reviews for each product in the order + update product avg_rating
    for item in order.get("line_items", []):
        pid = item.get("product_id")
        product_review = {
            **review_doc,
            "product_id": pid,
            "product_name": item.get("product_name"),
            "producer_id": item.get("producer_id"),
        }
        await db.reviews.insert_one(product_review)
        # Recalculate product avg_rating
        if pid:
            pipeline = [
                {"$match": {"product_id": pid}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
            ]
            agg = await db.reviews.aggregate(pipeline).to_list(1)
            if agg:
                await db.products.update_one(
                    {"product_id": pid},
                    {"$set": {"avg_rating": round(agg[0]["avg"], 1), "reviews_count": agg[0]["count"]}}
                )

    # Mark order as reviewed
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"has_review": True, "review_rating": int(rating)}}
    )

    return {"success": True, "message": "Reseña publicada"}


@router.put("/customer/orders/{order_id}/cancel")
async def cancel_customer_order(order_id: str, user: User = Depends(get_current_user)):
    """Cancel an order (if status allows — pending, paid, confirmed before preparation)"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    cancellable = ["pending", "processing", "paid", "confirmed"]
    if order["status"] not in cancellable:
        raise HTTPException(status_code=400, detail="Este pedido no se puede cancelar porque ya está en preparación o enviado")
    await db.orders.update_one({"order_id": order_id}, {"$set": {
        "status": "cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})

    # Restore stock for each item in the order
    for item in order.get("line_items", []):
        pid = item.get("product_id")
        qty = item.get("quantity", 0)
        if pid and qty > 0:
            await db.products.update_one(
                {"product_id": pid},
                {"$inc": {"stock": qty, "stock_quantity": qty}}
            )

    # Reverse influencer commission if applicable
    if order.get("influencer_id") and order.get("influencer_commission_status") == "pending":
        commission_amount = order.get("influencer_commission_amount", 0)
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"influencer_commission_status": "reversed"}}
        )
        await db.influencer_commissions.update_one(
            {"order_id": order_id},
            {"$set": {"commission_status": "reversed"}}
        )
        await db.influencers.update_one(
            {"influencer_id": order["influencer_id"]},
            {"$inc": {
                "total_sales_generated": -order.get("total_amount", 0),
                "total_commission_earned": -commission_amount,
                "available_balance": -commission_amount
            }}
        )

    # Notify producer(s) about cancellation
    producer_ids = set(item.get("producer_id") for item in order.get("line_items", []) if item.get("producer_id"))
    for pid in producer_ids:
        try:
            await db.notifications.insert_one({
                "user_id": pid,
                "type": "order_update",
                "title": "Pedido cancelado",
                "body": f"El pedido #{order_id[-8:]} ha sido cancelado por el cliente.",
                "action_url": "/producer/orders",
                "data": {"order_id": order_id},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": datetime.now(timezone.utc),
                "sent_at": datetime.now(timezone.utc),
            })
        except Exception:
            pass  # non-critical

    return {"message": "Pedido cancelado correctamente"}

@router.get("/customer/profile")
async def get_customer_profile(user: User = Depends(get_current_user)):
    """Get customer profile with preferences"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "country": 1, "username": 1, "consent": 1, "profile_image": 1, "avatar_url": 1, "picture": 1})
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    profile_image = (user_doc.get("profile_image") or user_doc.get("avatar_url") or user_doc.get("picture", "")) if user_doc else ""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user_doc.get("name", user.name) if user_doc else user.name,
        "country": user_doc.get("country", user.country) if user_doc else user.country,
        "username": user_doc.get("username", "") if user_doc else "",
        "consent": user_doc.get("consent") if user_doc else None,
        "profile_image": profile_image,
        "preferences": prefs
    }

@router.put("/customer/profile")
async def update_customer_profile(data: dict, user: User = Depends(get_current_user)):
    """Update customer profile"""
    allowed_fields = ["name", "country", "username", "bio", "website", "location", "avatar_url", "profile_image", "company_name", "store_description", "is_private", "phone"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    # Handle social_links separately (dict not in allowed_fields scalar check)
    if "social_links" in data and isinstance(data["social_links"], dict):
        update_data["social_links"] = {
            k: str(v)[:100] for k, v in data["social_links"].items()
            if k in ("instagram", "tiktok", "youtube", "website") and isinstance(v, str)
        }

    # Validate username if being updated
    if "username" in update_data:
        username = update_data["username"].strip().lower().replace(" ", "")
        # Remove @ prefix if user typed it
        if username.startswith("@"):
            username = username[1:]
        # Only allow alphanumeric, underscores, dots
        import re
        if not re.match(r'^[a-z0-9_.]+$', username):
            raise HTTPException(status_code=400, detail="Username solo puede contener letras, numeros, puntos y guiones bajos")
        if len(username) < 3:
            raise HTTPException(status_code=400, detail="Username debe tener al menos 3 caracteres")
        if len(username) > 30:
            raise HTTPException(status_code=400, detail="Username no puede tener mas de 30 caracteres")
        # Check uniqueness (excluding current user)
        existing = await db.users.find_one(
            {"username": username, "user_id": {"$ne": user.user_id}},
            {"_id": 0, "user_id": 1}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Este username ya esta en uso")
        update_data["username"] = username

    if update_data:
        # Map avatar_url to profile_image for storage consistency
        if "avatar_url" in update_data:
            avatar_val = update_data.pop("avatar_url")
            update_data["profile_image"] = avatar_val
            update_data["picture"] = avatar_val
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
        # Sync name changes to store_profiles for producers/importers
        if "name" in update_data and user.role in ("producer", "importer"):
            await db.store_profiles.update_one(
                {"producer_id": user.user_id},
                {"$set": {"name": update_data["name"]}},
            )
    return {"message": "Perfil actualizado"}

@router.put("/customer/password")
async def change_customer_password(data: dict = Body(...), user: User = Depends(get_current_user)):
    """Change customer password"""
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="La contraseña actual y la nueva son obligatorias")

    user_doc = await db.users.find_one({"user_id": user.user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not verify_password(current_password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    await db.users.update_one({"user_id": user.user_id}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"message": "Contraseña actualizada"}

@router.get("/customer/stats")
async def get_customer_stats(user: User = Depends(get_current_user)):
    """Get customer dashboard statistics"""
    total_orders = await db.orders.count_documents({"user_id": user.user_id})
    pending_orders = await db.orders.count_documents({"user_id": user.user_id, "status": {"$in": ["pending", "processing"]}})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders
    }

@router.get("/customer/followed-stores")
async def get_followed_stores(user: User = Depends(get_current_user)):
    """Get all stores followed by the customer"""
    follows = await db.store_followers.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    stores = []
    for follow in follows:
        store = await db.store_profiles.find_one({"store_id": follow["store_id"]}, {"_id": 0})
        if store:
            product_count = await db.products.count_documents({
                "producer_id": store.get("producer_id"),
                "status": "approved"
            })
            follower_count = await db.store_followers.count_documents({"store_id": store["store_id"]})
            
            stores.append({
                **store,
                "product_count": product_count,
                "follower_count": follower_count,
                "followed_at": follow.get("followed_at") or follow.get("created_at")
            })

    stores.sort(key=lambda x: x.get("followed_at") or "", reverse=True)
    return stores


# ============================================
# ACCOUNT MANAGEMENT (Delete/Modify)
# ============================================

@router.delete("/account/delete")
async def delete_account(request: Request, user: User = Depends(get_current_user)):
    """
    Permanently delete user account and all associated data.
    Requires email confirmation.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}
    email_confirmation = body.get("email_confirmation", "")

    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email": 1})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if email_confirmation.lower().strip() != (user_doc.get("email", "")).lower().strip():
        raise HTTPException(status_code=400, detail="El email no coincide con tu cuenta")

    user_id = user.user_id
    
    # ── Common cleanup for ALL roles ──
    # Sessions, follows, social, notifications, wishlists, communities
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_follows.delete_many({"$or": [{"follower_id": user_id}, {"following_id": user_id}]})
    await db.post_likes.delete_many({"user_id": user_id})
    await db.post_comments.update_many({"user_id": user_id}, {"$set": {"user_name": "Deleted User", "user_id": "deleted"}})
    await db.wishlists.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.community_members.delete_many({"user_id": user_id})
    await db.carts.delete_many({"user_id": user_id})
    await db.cart_discounts.delete_many({"user_id": user_id})
    await db.stock_holds.delete_many({"user_id": user_id})
    await db.customer_influencer_attribution.delete_many({"consumer_id": user_id})

    if user.role == "customer":
        await db.cart.delete_many({"user_id": user_id})
        await db.ai_profiles.delete_one({"user_id": user_id})
        await db.user_inferred_insights.delete_one({"user_id": user_id})
        await db.chat_messages.delete_many({"user_id": user_id})
        await db.orders.update_many(
            {"user_id": user_id},
            {"$set": {"user_email": "deleted@account.com", "user_name": "Deleted User"}}
        )
        await db.reviews.update_many(
            {"user_id": user_id},
            {"$set": {"user_name": "Deleted User"}}
        )

    elif user.role == "producer":
        pending_orders = await db.orders.count_documents({
            "line_items.producer_id": user_id,
            "status": {"$in": ["pending", "processing", "confirmed", "preparing"]}
        })
        if pending_orders > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete account with {pending_orders} pending orders. Please complete or cancel them first."
            )
        await db.products.update_many(
            {"producer_id": user_id},
            {"$set": {"status": "deleted", "visible": False}}
        )
        await db.stores.update_many(
            {"producer_id": user_id},
            {"$set": {"status": "deleted"}}
        )

    elif user.role == "influencer":
        # Deactivate discount codes owned by this influencer
        await db.discount_codes.update_many(
            {"influencer_id": user_id},
            {"$set": {"active": False}}
        )
        await db.affiliate_links.update_many(
            {"influencer_id": user_id},
            {"$set": {"status": "owner_deleted"}}
        )
        await db.scheduled_payouts.update_many(
            {"influencer_id": user_id, "status": "scheduled"},
            {"$set": {"status": "cancelled", "cancel_reason": "account_deleted"}}
        )

    await db.users.delete_one({"user_id": user_id})
    return {"message": "Cuenta eliminada correctamente"}


@router.put("/account/update-email")
async def update_email(data: dict, user: User = Depends(get_current_user)):
    """Update user email address - requires password confirmation"""
    new_email = data.get("new_email")
    password = data.get("password")
    
    if not new_email or not password:
        raise HTTPException(status_code=400, detail="Email y contraseña son obligatorios")
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 1})
    if not verify_password(password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    
    existing = await db.users.find_one({"email": new_email}, {"_id": 0, "user_id": 1})
    if existing and existing.get("user_id") != user.user_id:
        raise HTTPException(status_code=400, detail="Este email ya está en uso")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"email": new_email, "email_verified": False}}
    )
    
    return {"message": "Email updated. Please verify your new email address."}


@router.put("/account/withdraw-consent")
async def withdraw_analytics_consent(user: User = Depends(get_current_user)):
    """Withdraw analytics consent and delete inferred insights data"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "consent.analytics_consent": False,
            "consent.withdrawal_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.user_inferred_insights.delete_one({"user_id": user.user_id})
    return {"message": "Analytics consent withdrawn. Your inferred data has been deleted."}


@router.put("/account/reactivate-consent")
async def reactivate_analytics_consent(user: User = Depends(get_current_user)):
    """Reactivate analytics consent for the user"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "consent.analytics_consent": True,
            "consent.reactivation_date": datetime.now(timezone.utc).isoformat(),
            "consent.consent_version": "1.0"
        }}
    )
    return {"message": "Analytics consent reactivated. AI personalization is now enabled."}


# ============================================
# CUSTOMER SHIPPING ADDRESSES
# ============================================

@router.get("/customer/addresses")
async def get_customer_addresses(user: User = Depends(get_current_user)):
    """Get all saved shipping addresses for the customer"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "shipping_addresses": 1, "default_address_id": 1})
    return {
        "addresses": user_doc.get("shipping_addresses", []),
        "default_address_id": user_doc.get("default_address_id")
    }


@router.post("/customer/addresses")
async def add_customer_address(address: ShippingAddress, user: User = Depends(get_current_user)):
    """Add a new shipping address"""
    address_id = f"addr_{uuid.uuid4().hex[:12]}"
    address_data = address.model_dump()
    address_data["address_id"] = address_id
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"shipping_addresses": 1})
    existing_addresses = user_doc.get("shipping_addresses", [])
    
    update_ops = {"$push": {"shipping_addresses": address_data}}
    
    if not existing_addresses or address.is_default:
        update_ops["$set"] = {"default_address_id": address_id}
        if existing_addresses:
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {"shipping_addresses.$[].is_default": False}}
            )
    
    await db.users.update_one({"user_id": user.user_id}, update_ops)
    return {"message": "Address added", "address_id": address_id}


@router.put("/customer/addresses/{address_id}")
async def update_customer_address(address_id: str, address: ShippingAddress, user: User = Depends(get_current_user)):
    """Update an existing shipping address"""
    address_data = address.model_dump()
    address_data["address_id"] = address_id
    
    result = await db.users.update_one(
        {"user_id": user.user_id, "shipping_addresses.address_id": address_id},
        {"$set": {"shipping_addresses.$": address_data}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    if address.is_default:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"default_address_id": address_id}}
        )
    
    return {"message": "Address updated"}


@router.delete("/customer/addresses/{address_id}")
async def delete_customer_address(address_id: str, user: User = Depends(get_current_user)):
    """Delete a shipping address"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"default_address_id": 1})
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$pull": {"shipping_addresses": {"address_id": address_id}}}
    )
    
    if user_doc.get("default_address_id") == address_id:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$unset": {"default_address_id": ""}}
        )
    
    return {"message": "Address deleted"}


@router.put("/customer/addresses/{address_id}/default")
async def set_default_address(address_id: str, user: User = Depends(get_current_user)):
    """Set an address as the default shipping address"""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id, "shipping_addresses.address_id": address_id}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="Address not found")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"shipping_addresses.$[].is_default": False}}
    )
    await db.users.update_one(
        {"user_id": user.user_id, "shipping_addresses.address_id": address_id},
        {"$set": {"shipping_addresses.$.is_default": True, "default_address_id": address_id}}
    )
    
    return {"message": "Default address updated"}
