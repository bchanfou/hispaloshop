"""
Cart routes: add, update, remove, validate.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from ..core.config import db, SUPPORTED_COUNTRIES, logger
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter(prefix="/cart", tags=["Cart"])

STOCK_HOLD_MINUTES = 15


async def reserve_stock(product_id: str, quantity: int, user_id: str,
                        variant_id: str = None, pack_id: str = None):
    """Create or update a soft-hold stock reservation (15 min)."""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=STOCK_HOLD_MINUTES)
    hold_query = {"product_id": product_id, "user_id": user_id}
    if variant_id:
        hold_query["variant_id"] = variant_id
    if pack_id:
        hold_query["pack_id"] = pack_id
    await db.stock_holds.update_one(
        hold_query,
        {"$set": {"quantity": quantity, "expires_at": expires_at.isoformat()}},
        upsert=True
    )


async def release_stock_hold(product_id: str, user_id: str,
                              variant_id: str = None, pack_id: str = None):
    """Release a stock hold when item is removed from cart."""
    hold_query = {"product_id": product_id, "user_id": user_id}
    if variant_id:
        hold_query["variant_id"] = variant_id
    if pack_id:
        hold_query["pack_id"] = pack_id
    await db.stock_holds.delete_one(hold_query)


async def get_available_stock(product_id: str, exclude_user_id: str = None,
                               variant_id: str = None, pack_id: str = None) -> int:
    """Get available stock minus active (non-expired) holds from other users."""
    # Get base stock
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "stock": 1, "variants": 1})
    if not product:
        return 0

    base_stock = product.get("stock", 0)

    # If variant/pack, get stock from pack
    if variant_id and pack_id and product.get("variants"):
        for v in product["variants"]:
            if v.get("variant_id") == variant_id:
                for p in v.get("packs", []):
                    if p.get("pack_id") == pack_id:
                        base_stock = p.get("stock", 0)
                        break

    now = datetime.now(timezone.utc).isoformat()
    hold_match = {
        "product_id": product_id,
        "expires_at": {"$gt": now},
    }
    if variant_id:
        hold_match["variant_id"] = variant_id
    if pack_id:
        hold_match["pack_id"] = pack_id
    if exclude_user_id:
        hold_match["user_id"] = {"$ne": exclude_user_id}

    holds = await db.stock_holds.aggregate([
        {"$match": hold_match},
        {"$group": {"_id": None, "total": {"$sum": "$quantity"}}}
    ]).to_list(1)
    held = holds[0]["total"] if holds else 0
    return max(0, base_stock - held)


class CartAddInput(BaseModel):
    product_id: str
    quantity: int = 1
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None


class CartUpdateInput(BaseModel):
    quantity: int


@router.get("")
async def get_cart(user: User = Depends(get_current_user)):
    """Get user's cart with stock info."""
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    enriched_items = []
    for item in cart_items:
        product = await db.products.find_one(
            {"product_id": item.get("product_id", "")},
            {"_id": 0, "stock": 1, "track_stock": 1}
        )
        item["stock"] = product.get("stock", 0) if product else 0
        item["track_stock"] = product.get("track_stock", True) if product else True
        item["stock_available"] = not product.get("track_stock", True) or item["stock"] >= item.get("quantity", 0)
        enriched_items.append(item)
    
    applied_discount = await db.cart_discounts.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {"items": enriched_items, "discount": applied_discount}


@router.post("/add")
async def add_to_cart(input: CartAddInput, user: User = Depends(get_current_user)):
    """Add product to cart."""
    # Get user's country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Country availability check
    available_countries = product.get("available_countries", [])
    if available_countries and user_country not in available_countries:
        raise HTTPException(status_code=400, detail=f"Product not available in {user_country}")
    
    price = product["price"]
    currency = "EUR"
    stock = product.get("stock", 0)
    track_stock = product.get("track_stock", True)
    variant_name = None
    pack_label = None
    
    # Country pricing
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    if user_country in country_prices:
        price = country_prices[user_country]
        currency = country_currency.get(user_country, "EUR")
    
    # Handle variants/packs
    variants = product.get("variants", [])
    if variants and input.variant_id:
        variant = next((v for v in variants if v["variant_id"] == input.variant_id), None)
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        variant_name = variant["name"]
        
        packs = variant.get("packs", [])
        if packs and input.pack_id:
            pack = next((p for p in packs if p["pack_id"] == input.pack_id), None)
            if not pack:
                raise HTTPException(status_code=404, detail="Pack not found")
            price = pack["price"]
            stock = pack.get("stock", 0)
            pack_label = pack["label"]
    elif variants:
        raise HTTPException(status_code=400, detail="Variant selection required")
    
    # Stock validation with soft-hold awareness
    if track_stock:
        available = await get_available_stock(
            input.product_id, exclude_user_id=user.user_id,
            variant_id=input.variant_id, pack_id=input.pack_id
        )
        if available <= 0:
            raise HTTPException(status_code=400, detail="Product is out of stock")
        if input.quantity > available:
            raise HTTPException(status_code=400, detail=f"Only {available} units available")
    
    # Build cart query
    cart_query = {"user_id": user.user_id, "product_id": input.product_id}
    if input.variant_id:
        cart_query["variant_id"] = input.variant_id
    if input.pack_id:
        cart_query["pack_id"] = input.pack_id
    
    existing = await db.cart_items.find_one(cart_query, {"_id": 0})
    
    if existing:
        new_qty = existing["quantity"] + input.quantity
        if track_stock:
            available = await get_available_stock(
                input.product_id, exclude_user_id=user.user_id,
                variant_id=input.variant_id, pack_id=input.pack_id
            )
            if new_qty > available:
                raise HTTPException(status_code=400, detail=f"Only {available} units available")

        await db.cart_items.update_one(cart_query, {"$set": {"quantity": new_qty}})
        # Update soft-hold with new total quantity
        if track_stock:
            await reserve_stock(input.product_id, new_qty, user.user_id,
                                input.variant_id, input.pack_id)
        return {"message": "Cart updated", "quantity": new_qty}
    else:
        cart_item = {
            "user_id": user.user_id,
            "product_id": input.product_id,
            "product_name": product.get("name", ""),
            "producer_id": product.get("producer_id", ""),
            "price": price,
            "currency": currency,
            "quantity": input.quantity,
            "image": product["images"][0] if product.get("images") else None,
            "variant_id": input.variant_id,
            "variant_name": variant_name,
            "pack_id": input.pack_id,
            "pack_label": pack_label,
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cart_items.insert_one(cart_item)
        cart_item.pop("_id", None)
        # Create soft-hold reservation
        if track_stock:
            await reserve_stock(input.product_id, input.quantity, user.user_id,
                                input.variant_id, input.pack_id)
        return {"message": "Added to cart", "item": cart_item}


@router.put("/{product_id}")
async def update_cart_item(
    product_id: str,
    input: CartUpdateInput,
    variant_id: Optional[str] = None,
    pack_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Update cart item quantity."""
    cart_query = {"user_id": user.user_id, "product_id": product_id}
    if variant_id:
        cart_query["variant_id"] = variant_id
    if pack_id:
        cart_query["pack_id"] = pack_id
    
    if input.quantity <= 0:
        await db.cart_items.delete_one(cart_query)
        return {"message": "Item removed"}
    
    await db.cart_items.update_one(cart_query, {"$set": {"quantity": input.quantity}})
    return {"message": "Cart updated"}


@router.delete("/{product_id}")
async def remove_from_cart(
    product_id: str,
    variant_id: Optional[str] = None,
    pack_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Remove item from cart."""
    cart_query = {"user_id": user.user_id, "product_id": product_id}
    if variant_id:
        cart_query["variant_id"] = variant_id
    if pack_id:
        cart_query["pack_id"] = pack_id

    await db.cart_items.delete_one(cart_query)
    # Release the stock hold
    await release_stock_hold(product_id, user.user_id, variant_id, pack_id)
    return {"message": "Removed from cart"}


@router.post("/validate-country")
async def validate_cart_country(country: str, user: User = Depends(get_current_user)):
    """Validate cart items are available in specified country."""
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    issues = []
    for item in cart_items:
        product = await db.products.find_one(
            {"product_id": item.get("product_id", "")},
            {"_id": 0, "available_countries": 1, "name": 1}
        )
        if product:
            available = product.get("available_countries", [])
            if available and country not in available:
                issues.append({
                    "product_id": item.get("product_id", ""),
                    "product_name": product.get("name", ""),
                    "issue": f"Not available in {country}"
                })
    
    return {"valid": len(issues) == 0, "issues": issues}


@router.delete("/remove-discount")
async def remove_cart_discount(user: User = Depends(get_current_user)):
    """Remove applied discount from cart."""
    await db.cart_discounts.delete_one({"user_id": user.user_id})
    return {"message": "Discount removed"}


@router.post("/apply-discount")
async def apply_discount(code: str, user: User = Depends(get_current_user)):
    """Apply discount code to cart."""
    discount = await db.discount_codes.find_one(
        {"code": code.upper(), "active": True},
        {"_id": 0}
    )
    
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate dates
    if discount.get("start_date") and now < discount["start_date"]:
        raise HTTPException(status_code=400, detail="Discount not yet active")
    if discount.get("end_date") and now > discount["end_date"]:
        raise HTTPException(status_code=400, detail="Discount expired")
    
    # Check usage limit
    if discount.get("usage_limit") is not None:
        if discount.get("usage_count", 0) >= discount["usage_limit"]:
            raise HTTPException(status_code=400, detail="Discount usage limit reached")
    
    # Calculate cart total
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    cart_total = sum(item["price"] * item["quantity"] for item in cart_items)
    
    # Check minimum amount
    if discount.get("min_cart_amount") and cart_total < discount["min_cart_amount"]:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum cart amount of {discount['min_cart_amount']} required"
        )
    
    # Apply discount
    await db.cart_discounts.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "user_id": user.user_id,
            "code_id": discount["code_id"],
            "code": discount["code"],
            "type": discount["type"],
            "value": discount["value"],
            "applied_at": now
        }},
        upsert=True
    )
    
    return {"message": "Discount applied", "discount": discount}


@router.post("/cleanup-holds")
async def cleanup_expired_holds():
    """Clean up expired stock holds. Called by cron every 5 minutes."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.stock_holds.delete_many({"expires_at": {"$lt": now}})
    return {"message": f"Cleaned up {result.deleted_count} expired holds"}
