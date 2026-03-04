"""
Cart routes: add, remove, update, validate country, apply discounts.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.auth import get_current_user
from core.models import User, CartUpdateInput
from services.shipping_service import ShippingPolicy, ShippingService

logger = logging.getLogger(__name__)

router = APIRouter()

# Cart
@router.get("/cart")
async def get_cart(user: User = Depends(get_current_user)):
    logger.info(f"[GET /cart] Fetching cart for user: {user.user_id}")
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = (user_doc or {}).get("locale", {}).get("country", "ES")
    
    # Enrich cart items with current stock info
    enriched_items = []
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0, "stock": 1, "track_stock": 1})
        item["stock"] = product.get("stock", 0) if product else 0
        item["track_stock"] = product.get("track_stock", True) if product else True
        item["stock_available"] = not product.get("track_stock", True) or item["stock"] >= item["quantity"]
        enriched_items.append(item)
    
    # Get applied discount if any
    applied_discount = await db.cart_discounts.find_one({"user_id": user.user_id}, {"_id": 0})
    subtotal_cents = int(round(sum((item.get("price", 0) * item.get("quantity", 0)) for item in enriched_items) * 100))

    discount_cents = int(round(float((applied_discount or {}).get("discount_amount", 0)) * 100))
    discounted_subtotal_cents = max(0, subtotal_cents - discount_cents)

    # Group shipping by producer policy
    producer_groups: dict[str, dict] = {}
    for item in enriched_items:
        producer_id = item.get("producer_id")
        if not producer_id:
            continue
        producer_groups.setdefault(producer_id, {"subtotal_cents": 0, "item_count": 0})
        producer_groups[producer_id]["subtotal_cents"] += int(round(item.get("price", 0) * item.get("quantity", 0) * 100))
        producer_groups[producer_id]["item_count"] += int(item.get("quantity", 0) or 0)

    shipping_cents = 0
    for producer_id, group in producer_groups.items():
        producer_doc = await db.users.find_one(
            {"user_id": producer_id},
            {
                "_id": 0,
                "shipping_policy_enabled": 1,
                "shipping_base_cost_cents": 1,
                "shipping_free_threshold_cents": 1,
                "shipping_per_item_cents": 1,
            },
        )
        if not producer_doc:
            continue
        policy = ShippingPolicy(
            enabled=bool(producer_doc.get("shipping_policy_enabled", False)),
            base_cost_cents=int(producer_doc.get("shipping_base_cost_cents", 0) or 0),
            per_item_cents=int(producer_doc.get("shipping_per_item_cents", 0) or 0),
            free_threshold_cents=producer_doc.get("shipping_free_threshold_cents"),
        )
        shipping_cents += ShippingService.calculate_shipping_cents(
            policy=policy,
            item_count=group["item_count"],
            subtotal_cents=group["subtotal_cents"],
        )

    # Discount type free_shipping overrides producer shipping.
    if (applied_discount or {}).get("type") == "free_shipping":
        shipping_cents = 0

    tax_rate_bp = ShippingService.get_tax_rate_bp(user_country)
    totals = ShippingService.calculate_order_totals(
        subtotal_cents=discounted_subtotal_cents,
        shipping_cents=shipping_cents,
        tax_rate_bp=tax_rate_bp,
    )
    
    return {
        "items": enriched_items,
        "discount": applied_discount,
        "subtotal_cents": totals["subtotal_cents"],
        "shipping_cents": totals["shipping_cents"],
        "tax_cents": totals["tax_cents"],
        "tax_rate_bp": totals["tax_rate_bp"],
        "total_cents": totals["total_cents"],
        "currency": "EUR",
    }

@router.post("/cart/add")
async def add_to_cart(input: CartUpdateInput, user: User = Depends(get_current_user)):
    logger.info(f"[POST /cart/add] Adding to cart for user: {user.user_id}, product: {input.product_id}")
    
    # Get user's selected country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # === MULTI-MARKET VALIDATION: inventory_by_country ===
    inventory = product.get("inventory_by_country", [])
    market = next((m for m in inventory if m.get("country_code") == user_country and m.get("active")), None)
    
    if not market and inventory:
        # Product uses multi-market but user's country is not active — check old system as fallback
        available_countries = product.get("available_countries", [])
        if not available_countries or user_country in available_countries:
            market = None  # Allow — old system permits it
        else:
            raise HTTPException(status_code=400, detail=f"Product not available in this region ({user_country})")
    
    if market and market.get("stock", 0) <= 0:
        raise HTTPException(status_code=400, detail=f"Product out of stock in {user_country}")
    
    # Initialize cart item data — use market-specific price if available
    price = product["price"]
    currency = "EUR"
    stock = product.get("stock", 0)
    track_stock = product.get("track_stock", True)
    
    if market:
        price = market.get("price", price)
        currency = market.get("currency", "EUR")
        stock = market.get("stock", stock)
    else:
        # Fallback to old country_prices
        country_prices = product.get("country_prices", {})
        country_currency = product.get("country_currency", {})
        if user_country in country_prices:
            price = country_prices[user_country]
            currency = country_currency.get(user_country, "EUR")
    
    variant_id = input.variant_id
    variant_name = None
    pack_id = input.pack_id
    pack_label = None
    pack_units = 1
    
    # Handle variants and packs
    variants = product.get("variants", [])
    
    if variants and (input.variant_id or input.pack_id):
        # Product has variants - must specify variant_id and pack_id
        if not input.variant_id:
            raise HTTPException(status_code=400, detail="Variant ID required for this product")
        
        # Find the variant
        variant = next((v for v in variants if v["variant_id"] == input.variant_id), None)
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        
        variant_name = variant["name"]
        
        # If packs exist, must specify pack_id
        packs = variant.get("packs", [])
        if packs:
            if not input.pack_id:
                raise HTTPException(status_code=400, detail="Pack ID required for this variant")
            
            pack = next((p for p in packs if p["pack_id"] == input.pack_id), None)
            if not pack:
                raise HTTPException(status_code=404, detail="Pack not found")
            
            price = pack["price"]
            stock = pack.get("stock", 0)
            pack_label = pack["label"]
            pack_units = pack["units"]
    elif variants:
        # Product has variants but none specified - error
        raise HTTPException(status_code=400, detail="This product has variants. Please select a variant.")
    
    # Stock validation
    if track_stock and stock <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock")
    
    if track_stock and input.quantity > stock:
        raise HTTPException(status_code=400, detail=f"Only {stock} units available")
    
    # Build unique cart item key (product + variant + pack)
    cart_query = {"user_id": user.user_id, "product_id": input.product_id}
    if variant_id:
        cart_query["variant_id"] = variant_id
    if pack_id:
        cart_query["pack_id"] = pack_id
    
    existing = await db.cart_items.find_one(cart_query, {"_id": 0})
    
    new_quantity = input.quantity
    if existing:
        # If updating, check total quantity doesn't exceed stock
        if track_stock and new_quantity > stock:
            raise HTTPException(status_code=400, detail=f"Only {stock} units available")
        
        await db.cart_items.update_one(cart_query, {"$set": {"quantity": new_quantity, "price": price, "currency": currency}})
    else:
        cart_item = {
            "user_id": user.user_id,
            "product_id": input.product_id,
            "product_name": product["name"],
            "price": price,
            "currency": currency,
            "quantity": input.quantity,
            "producer_id": product["producer_id"],
            "image": product["images"][0] if product.get("images") else None,
            "variant_id": variant_id,
            "variant_name": variant_name,
            "pack_id": pack_id,
            "pack_label": pack_label,
            "pack_units": pack_units,
            "country": user_country
        }
        await db.cart_items.insert_one(cart_item)
    return {"message": "Added to cart", "stock": stock}

@router.put("/cart/{product_id}")
async def update_cart_quantity(product_id: str, quantity: int, user: User = Depends(get_current_user)):
    """Update cart item quantity with stock validation"""
    if quantity <= 0:
        # Remove item if quantity is 0 or less
        await db.cart_items.delete_one({"user_id": user.user_id, "product_id": product_id})
        return {"message": "Item removed from cart"}
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "stock": 1, "track_stock": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    track_stock = product.get("track_stock", True)
    current_stock = product.get("stock", 0)
    
    if track_stock and quantity > current_stock:
        raise HTTPException(status_code=400, detail=f"Only {current_stock} units available")
    
    await db.cart_items.update_one(
        {"user_id": user.user_id, "product_id": product_id},
        {"$set": {"quantity": quantity}}
    )
    return {"message": "Cart updated", "quantity": quantity}

# IMPORTANT: This route must come BEFORE /cart/{product_id} to avoid being caught by the parameterized route
@router.post("/cart/validate-country")
async def validate_cart_country(input: dict, user: User = Depends(get_current_user)):
    """
    Validate cart items against a new country selection.
    Returns list of unavailable items and updates prices for available items.
    """
    new_country = input.get("country")
    if not new_country:
        raise HTTPException(status_code=400, detail="Country code required")
    
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    unavailable_items = []
    updated_items = []
    
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        available_countries = product.get("available_countries", [])
        
        # Check if product is available in new country
        if available_countries and new_country not in available_countries:
            unavailable_items.append({
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "variant_name": item.get("variant_name"),
                "pack_label": item.get("pack_label")
            })
        else:
            # Update price for new country
            new_price = item["price"]
            new_currency = item.get("currency", "EUR")
            
            country_prices = product.get("country_prices", {})
            country_currency = product.get("country_currency", {})
            
            if new_country in country_prices:
                new_price = country_prices[new_country]
                new_currency = country_currency.get(new_country, "EUR")
            
            updated_items.append({
                "product_id": item["product_id"],
                "old_price": item["price"],
                "new_price": new_price,
                "new_currency": new_currency
            })
    
    return {
        "unavailable_items": unavailable_items,
        "updated_items": updated_items,
        "unavailable_count": len(unavailable_items)
    }

@router.post("/cart/apply-country-change")
async def apply_country_change(input: dict, user: User = Depends(get_current_user)):
    """
    Apply country change: remove unavailable items and update prices for available items.
    """
    new_country = input.get("country")
    if not new_country:
        raise HTTPException(status_code=400, detail="Country code required")
    
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    removed_count = 0
    updated_count = 0
    
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        available_countries = product.get("available_countries", [])
        
        # Remove if not available in new country
        if available_countries and new_country not in available_countries:
            cart_query = {"user_id": user.user_id, "product_id": item["product_id"]}
            if item.get("variant_id"):
                cart_query["variant_id"] = item["variant_id"]
            if item.get("pack_id"):
                cart_query["pack_id"] = item["pack_id"]
            
            await db.cart_items.delete_one(cart_query)
            removed_count += 1
        else:
            # Update price and currency for new country
            new_price = product["price"]
            new_currency = "EUR"
            
            country_prices = product.get("country_prices", {})
            country_currency = product.get("country_currency", {})
            
            if new_country in country_prices:
                new_price = country_prices[new_country]
                new_currency = country_currency.get(new_country, "EUR")
            
            cart_query = {"user_id": user.user_id, "product_id": item["product_id"]}
            if item.get("variant_id"):
                cart_query["variant_id"] = item["variant_id"]
            if item.get("pack_id"):
                cart_query["pack_id"] = item["pack_id"]
            
            await db.cart_items.update_one(
                cart_query,
                {"$set": {"price": new_price, "currency": new_currency, "country": new_country}}
            )
            updated_count += 1
    
    return {
        "message": "Cart updated for new country",
        "removed_count": removed_count,
        "updated_count": updated_count
    }

@router.delete("/cart/remove-discount")
async def remove_discount_code(user: User = Depends(get_current_user)):
    """Remove applied discount code from cart"""
    logger.info(f"[remove_discount] Removing discount for user: {user.user_id}")
    result = await db.cart_discounts.delete_one({"user_id": user.user_id})
    logger.info(f"[remove_discount] Delete result: deleted_count={result.deleted_count}")
    return {"message": "Discount code removed"}


@router.post("/cart/apply-discount")
async def apply_discount_code(code: str, user: User = Depends(get_current_user)):
    """Apply a discount code to current cart."""
    normalized = (code or "").strip().upper()
    if not normalized:
        raise HTTPException(status_code=400, detail="Discount code is required")

    discount = await db.discount_codes.find_one({"code": normalized, "active": True}, {"_id": 0})
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid discount code")

    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(200)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = sum((item.get("price", 0) * item.get("quantity", 0)) for item in cart_items)
    if discount.get("min_cart_amount") and subtotal < float(discount["min_cart_amount"]):
        raise HTTPException(status_code=400, detail="Minimum cart amount not reached for this code")

    now_iso = datetime.now(timezone.utc).isoformat()
    if discount.get("start_date") and now_iso < str(discount["start_date"]):
        raise HTTPException(status_code=400, detail="Discount code not active yet")
    if discount.get("end_date") and now_iso > str(discount["end_date"]):
        raise HTTPException(status_code=400, detail="Discount code expired")
    if discount.get("usage_limit") is not None and int(discount.get("usage_count", 0)) >= int(discount["usage_limit"]):
        raise HTTPException(status_code=400, detail="Discount usage limit reached")

    # Influencer discount rule: 10% only on first completed order of customer.
    if discount.get("influencer_id"):
        prior_orders = await db.orders.count_documents({
            "user_id": user.user_id,
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}
        })
        if prior_orders > 0:
            raise HTTPException(status_code=400, detail="Influencer discount is only valid for your first order")

    discount_amount = 0.0
    dtype = discount.get("type")
    dvalue = float(discount.get("value", 0))
    if dtype == "percentage":
        discount_amount = round(subtotal * (dvalue / 100.0), 2)
    elif dtype == "fixed":
        discount_amount = round(min(dvalue, subtotal), 2)
    elif dtype == "free_shipping":
        discount_amount = 0.0
    else:
        raise HTTPException(status_code=400, detail="Unsupported discount type")

    payload = {
        "user_id": user.user_id,
        "code_id": discount.get("code_id"),
        "code": discount.get("code"),
        "type": dtype,
        "value": dvalue,
        "discount_amount": discount_amount,
        "applied_at": now_iso,
        "influencer_id": discount.get("influencer_id"),
    }
    await db.cart_discounts.update_one({"user_id": user.user_id}, {"$set": payload}, upsert=True)
    return {"message": "Discount code applied", "discount": payload}

@router.delete("/cart/{product_id}")
async def remove_from_cart(
    product_id: str, 
    variant_id: Optional[str] = None, 
    pack_id: Optional[str] = None, 
    user: User = Depends(get_current_user)
):
    """Remove item from cart. For products with variants, variant_id and pack_id are required."""
    query = {"user_id": user.user_id, "product_id": product_id}
    if variant_id:
        query["variant_id"] = variant_id
    if pack_id:
        query["pack_id"] = pack_id
    await db.cart_items.delete_one(query)
    return {"message": "Removed from cart"}

# ============================================================================
# PAYMENT SYSTEM — Separate Charges & Transfers Architecture
