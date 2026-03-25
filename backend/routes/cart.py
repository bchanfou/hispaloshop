"""
Endpoints de carrito persistente y checkout completo.
Fase 4: Checkout + B2B Importer
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.database import get_db
from core.auth import get_current_user
from core.models import Cart
from services.markets import is_product_available_in_country
from services.shipping_calculator import calculate_cart_shipping
from core.price_utils import price_to_cents

router = APIRouter(prefix="/cart", tags=["Cart"])


def _extract_product_image(product: dict) -> str | None:
    """Safely extract image URL from product, handling both dict and string formats."""
    images = product.get("images")
    if images and isinstance(images, list) and len(images) > 0:
        first = images[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first
    return product.get("image_url") or product.get("image")


@router.get("")
async def get_cart(current_user = Depends(get_current_user)):
    """Obtener carrito activo del usuario"""
    db = get_db()

    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
        "expires_at": {"$gte": datetime.now(timezone.utc)}
    })

    if not cart:
        return {
            "success": True,
            "data": {
                "items": [],
                "subtotal_cents": 0,
                "tax_cents": 0,
                "tax_rate_display": "21%",
                "shipping_cents": 0,
                "shipping_breakdown": [],
                "discount_cents": 0,
                "total_cents": 0,
                "item_count": 0,
                "is_empty": True
            }
        }

    # Calcular totales
    items = cart.get("items", [])
    subtotal_cents = sum(item.get("total_price_cents", 0) for item in items)

    # Aplicar descuento si hay coupon
    discount_cents = cart.get("discount_cents", 0)

    # IVA calculation (Spain 21%) — informational only, prices already include IVA
    TAX_RATE_BP = 2100  # 21% in basis points
    # IVA is included in subtotal: tax = subtotal * 21 / 121
    tax_cents = (subtotal_cents * TAX_RATE_BP) // (10000 + TAX_RATE_BP)

    # Lookup seller names for all items in one batch query
    seller_ids = list(set(
        item.get("seller_id") for item in items if item.get("seller_id")
    ))
    seller_map = {}
    if seller_ids:
        sellers = await db.users.find(
            {"user_id": {"$in": seller_ids}},
            {"user_id": 1, "name": 1, "company_name": 1,
             "shipping_base_cost_cents": 1,
             "shipping_free_threshold_cents": 1,
             "shipping_policy_enabled": 1}
        ).to_list(len(seller_ids))
        seller_map = {s["user_id"]: s for s in sellers}

    # Enrich each item with seller_name
    for item in items:
        sid = item.get("seller_id")
        seller = seller_map.get(sid)
        item["seller_name"] = (
            (seller.get("company_name") or seller.get("name", "Tienda"))
            if seller else "Tienda"
        )

    # Shipping calculation per seller
    seller_groups = defaultdict(list)
    for item in items:
        seller_groups[item.get("seller_id", "unknown")].append(item)

    shipping_breakdown = []
    total_shipping_cents = 0

    for seller_id, group_items in seller_groups.items():
        seller = seller_map.get(seller_id)
        seller_name = (
            (seller.get("company_name") or seller.get("name", "Tienda"))
            if seller else "Tienda"
        )
        seller_subtotal = sum(i.get("total_price_cents", 0) for i in group_items)

        # Seller shipping config with defaults
        base_cost = (seller.get("shipping_base_cost_cents", 490)
                     if seller else 490)  # 4.90 EUR default
        free_threshold = (seller.get("shipping_free_threshold_cents", 3000)
                          if seller else 3000)  # 30 EUR default

        is_free = (seller_subtotal >= free_threshold
                   if free_threshold > 0 else False)
        shipping_cost = 0 if is_free else base_cost
        remaining_for_free = (max(0, free_threshold - seller_subtotal)
                              if free_threshold > 0 else 0)
        progress_pct = (min(100, (seller_subtotal * 100) // free_threshold)
                        if free_threshold > 0 else 100)

        total_shipping_cents += shipping_cost

        shipping_breakdown.append({
            "seller_id": seller_id,
            "seller_name": seller_name,
            "subtotal_cents": seller_subtotal,
            "shipping_cents": shipping_cost,
            "free_threshold_cents": free_threshold,
            "remaining_for_free_cents": remaining_for_free,
            "progress_pct": progress_pct,
            "is_free_shipping": is_free,
            "item_count": len(group_items),
        })

    cart["id"] = str(cart.pop("_id", ""))

    return {
        "success": True,
        "data": {
            **cart,
            "subtotal_cents": subtotal_cents,
            "tax_cents": tax_cents,
            "tax_rate_display": "21%",
            "shipping_cents": total_shipping_cents,
            "shipping_breakdown": shipping_breakdown,
            "discount_cents": discount_cents,
            "total_cents": max(0, subtotal_cents + total_shipping_cents - discount_cents),
            "item_count": sum(item.get("quantity", 0) for item in items),
            "is_empty": len(items) == 0
        }
    }


class AddToCartBody(BaseModel):
    product_id: str
    quantity: int = 1
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None


@router.post("/items")
async def add_to_cart(
    body: AddToCartBody,
    current_user = Depends(get_current_user)
):
    """Añadir item al carrito"""
    product_id = body.product_id
    quantity = body.quantity
    variant_id = body.variant_id
    pack_id = body.pack_id
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    db = get_db()
    
    # Validar producto — lookup by product_id string field (matches products collection schema)
    product = await db.products.find_one({
        "product_id": product_id,
        "status": {"$in": ["active", "approved"]}
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    user_doc = await db.users.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "country": 1, "locale.country": 1},
    ) or {}
    user_country = user_doc.get("locale", {}).get("country") or user_doc.get("country") or getattr(current_user, "country", None) or "ES"
    if not is_product_available_in_country(product, user_country):
        raise HTTPException(status_code=400, detail=f"Product not available in {user_country}")
    
    # Verificar stock
    stock = product.get("stock_quantity", product.get("stock", 0))
    if stock < quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Only {stock} units available"
        )
    
    # Obtener precio
    unit_price_cents = product.get("price_cents", 0)
    if unit_price_cents == 0 and product.get("price"):
        unit_price_cents = price_to_cents(product["price"])
    
    # Obtener o crear carrito
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    cart_item = {
        "product_id": product_id,
        "product_name": product.get("name"),
        "product_image": _extract_product_image(product),
        "seller_id": product.get("seller_id") or product.get("producer_id"),
        "seller_type": product.get("seller_type", "producer"),
        "quantity": quantity,
        "unit_price_cents": unit_price_cents,
        "total_price_cents": unit_price_cents * quantity,
        "variant_id": variant_id,
        "pack_id": pack_id,
        "added_at": datetime.now(timezone.utc)
    }
    
    if cart:
        # Verificar si ya existe
        existing_idx = None
        for idx, item in enumerate(cart.get("items", [])):
            if (item.get("product_id") == product_id
                    and item.get("variant_id") == variant_id
                    and item.get("pack_id") == pack_id):
                existing_idx = idx
                break

        if existing_idx is not None:
            # Atomic update: increment quantity directly in DB to prevent race condition
            new_qty = cart["items"][existing_idx]["quantity"] + quantity
            if new_qty > stock:
                raise HTTPException(status_code=400, detail=f"Max stock available: {stock}")
            await db.carts.update_one(
                {"_id": cart["_id"], "user_id": current_user.user_id},
                {"$set": {
                    f"items.{existing_idx}.quantity": new_qty,
                    f"items.{existing_idx}.total_price_cents": unit_price_cents * new_qty,
                    "updated_at": datetime.now(timezone.utc),
                }}
            )
        else:
            # Atomic push: add new item without overwriting concurrent changes
            await db.carts.update_one(
                {"_id": cart["_id"], "user_id": current_user.user_id},
                {
                    "$push": {"items": cart_item},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                }
            )
    else:
        # Crear nuevo carrito
        new_cart = {
            "user_id": current_user.user_id,
            "tenant_id": getattr(current_user, 'country', None) or "ES",
            "status": "active",
            "items": [cart_item],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
        }
        await db.carts.insert_one(new_cart)
    
    return {
        "success": True,
        "message": "Added to cart",
        "data": cart_item
    }


class UpdateCartItemBody(BaseModel):
    quantity: int
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None


@router.patch("/items/{product_id}")
async def update_cart_item(
    product_id: str,
    body: UpdateCartItemBody,
    current_user = Depends(get_current_user)
):
    """Actualizar cantidad de item"""
    quantity = body.quantity
    variant_id = body.variant_id
    pack_id = body.pack_id
    db = get_db()

    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    # Encontrar item (triple match: product + variant + pack)
    items = cart.get("items", [])
    item_idx = None
    for idx, item in enumerate(items):
        if (item.get("product_id") == product_id
                and item.get("variant_id") == variant_id
                and item.get("pack_id") == pack_id):
            item_idx = idx
            break
    
    if item_idx is None:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if quantity <= 0:
        # Eliminar item
        items.pop(item_idx)
    else:
        # Verificar stock
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        stock = product.get("stock_quantity", product.get("stock", 0)) if product else 0
        
        if quantity > stock:
            raise HTTPException(status_code=400, detail=f"Max stock available: {stock}")
        
        # Actualizar
        unit_price = items[item_idx]["unit_price_cents"]
        items[item_idx]["quantity"] = quantity
        items[item_idx]["total_price_cents"] = unit_price * quantity
    
    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"success": True, "message": "Cart updated"}


@router.delete("/items/{product_id}")
async def remove_from_cart(
    product_id: str,
    variant_id: Optional[str] = None,
    pack_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Eliminar item del carrito (triple match: product + variant + pack)"""
    db = get_db()

    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = cart.get("items", [])
    items = [i for i in items if not (
        i.get("product_id") == product_id
        and i.get("variant_id") == variant_id
        and i.get("pack_id") == pack_id
    )]
    
    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"success": True, "message": "Item removed"}


@router.post("/validate-country")
async def validate_cart_country(request: Request, current_user = Depends(get_current_user)):
    db = get_db()
    payload = await request.json()
    country = str(payload.get("country", "")).upper()
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")

    cart = await db.carts.find_one({"user_id": current_user.user_id, "status": "active"})
    if not cart:
        return {"unavailable_count": 0, "unavailable_items": []}

    # Batch fetch all products in 1 query (avoids N+1)
    cart_items = cart.get("items", [])
    product_ids = [item["product_id"] for item in cart_items if item.get("product_id")]
    products_list = await db.products.find(
        {"product_id": {"$in": product_ids}}, {"_id": 0}
    ).to_list(len(product_ids)) if product_ids else []
    products_map = {p["product_id"]: p for p in products_list}

    unavailable_items = []
    for item in cart_items:
        pid = item.get("product_id")
        if not pid:
            continue
        product = products_map.get(pid)

        if not product or not is_product_available_in_country(product, country):
            unavailable_items.append({
                "product_id": pid,
                "product_name": item.get("product_name"),
                "variant_name": item.get("variant_name"),
                "pack_label": item.get("pack_label"),
            })

    return {
        "unavailable_count": len(unavailable_items),
        "unavailable_items": unavailable_items,
    }


@router.post("/apply-country-change")
async def apply_country_change(request: Request, current_user = Depends(get_current_user)):
    db = get_db()
    payload = await request.json()
    country = str(payload.get("country", "")).upper()
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")

    cart = await db.carts.find_one({"user_id": current_user.user_id, "status": "active"})
    if not cart:
        return {"removed_count": 0, "updated_count": 0, "items": []}

    # Batch fetch all products in 1 query (avoids N+1)
    all_items = cart.get("items", [])
    all_pids = [item["product_id"] for item in all_items if item.get("product_id")]
    all_products = await db.products.find(
        {"product_id": {"$in": all_pids}}, {"_id": 0}
    ).to_list(len(all_pids)) if all_pids else []
    pmap = {p["product_id"]: p for p in all_products}

    next_items = []
    removed_count = 0
    updated_count = 0

    for item in all_items:
        pid = item.get("product_id")
        if not pid:
            removed_count += 1
            continue
        product = pmap.get(pid)

        if not product or not is_product_available_in_country(product, country):
            removed_count += 1
            continue

        updated_item = dict(item)
        country_prices = product.get("country_prices", {})
        if country in country_prices:
            unit_price_cents = price_to_cents(float(country_prices[country]))
            if updated_item.get("unit_price_cents") != unit_price_cents:
                updated_item["unit_price_cents"] = unit_price_cents
                updated_item["total_price_cents"] = unit_price_cents * int(updated_item.get("quantity", 1))
                updated_count += 1

        next_items.append(updated_item)

    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {"$set": {"items": next_items, "updated_at": datetime.now(timezone.utc)}},
    )

    return {"removed_count": removed_count, "updated_count": updated_count, "items": next_items}


@router.post("/apply-coupon")
async def apply_coupon(
    code: str,
    current_user = Depends(get_current_user)
):
    """Aplicar código de descuento"""
    db = get_db()
    
    # Validar código
    coupon = await db.discount_codes.find_one({
        "code": code.upper(),
        "active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": datetime.now(timezone.utc)}}
        ]
    })
    
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")
    
    # Verificar uso
    if coupon.get("usage_limit") and coupon.get("usage_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Obtener carrito
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calcular descuento
    subtotal = sum(item.get("total_price_cents", 0) for item in cart["items"])

    discount_cents = 0
    coupon_type = coupon.get("type", "")
    if coupon_type == "percentage":
        discount_cents = subtotal * coupon.get("value", 0) // 100
    elif coupon_type == "fixed":
        discount_cents = price_to_cents(coupon.get("value", 0))
    elif coupon_type == "free_shipping":
        # Se maneja en checkout
        pass

    # Influencer attribution
    influencer_id = coupon.get("influencer_id")
    update_fields = {
        "coupon_code": code.upper(),
        "discount_cents": discount_cents,
        "updated_at": datetime.now(timezone.utc),
    }
    if influencer_id:
        update_fields["influencer_id"] = influencer_id
        update_fields["influencer_discount_code"] = code.upper()
        # Attribution lock — upsert consumer→influencer link (18-month)
        await db.customer_influencer_attribution.update_one(
            {"consumer_id": current_user.user_id},
            {
                "$setOnInsert": {
                    "consumer_id": current_user.user_id,
                    "influencer_id": influencer_id,
                    "code_used": code.upper(),
                    "attributed_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=548),
                }
            },
            upsert=True,
        )

    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {"$set": update_fields},
    )

    return {
        "success": True,
        "data": {
            "code": code.upper(),
            "discount_cents": discount_cents,
            "type": coupon["type"],
            "influencer_id": influencer_id,
        }
    }


@router.delete("")
async def clear_cart(current_user = Depends(get_current_user)):
    """Vaciar carrito"""
    db = get_db()
    
    await db.carts.update_one(
        {
            "user_id": current_user.user_id,
            "status": "active"
        },
        {
            "$set": {
                "items": [],
                "coupon_code": None,
                "discount_cents": 0,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"success": True, "message": "Cart cleared"}


@router.post("/sync")
async def sync_cart(request: Request, current_user = Depends(get_current_user)):
    """Sync cart items from client payload for legacy frontend compatibility."""
    db = get_db()
    payload = await request.json()
    incoming_items = payload.get("items", []) if isinstance(payload, dict) else []

    if not isinstance(incoming_items, list):
        raise HTTPException(status_code=400, detail="items must be a list")

    normalized_items = []
    for item in incoming_items:
        if not isinstance(item, dict):
            continue
        product_id = item.get("product_id") or item.get("id")
        quantity = int(item.get("quantity", 1) or 1)
        if not product_id or quantity <= 0:
            continue

        # Server-side price validation — never trust client prices
        product = await db.products.find_one(
            {"product_id": str(product_id)},
            {"_id": 0, "price_cents": 1, "price": 1, "name": 1, "images": 1,
             "seller_id": 1, "producer_id": 1, "seller_type": 1}
        )

        if not product:
            continue  # Skip unknown products

        server_price_cents = product.get("price_cents") or price_to_cents(product.get("price", 0))

        normalized_items.append({
            "product_id": str(product_id),
            "product_name": product.get("name") or item.get("product_name") or item.get("name"),
            "product_image": _extract_product_image(product) or item.get("product_image"),
            "seller_id": product.get("seller_id") or product.get("producer_id") or item.get("seller_id"),
            "seller_type": product.get("seller_type", "producer"),
            "quantity": quantity,
            "unit_price_cents": server_price_cents,
            "total_price_cents": server_price_cents * quantity,
            "variant_id": item.get("variant_id"),
            "pack_id": item.get("pack_id"),
            "added_at": datetime.now(timezone.utc),
        })

    existing_cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
    })

    if existing_cart:
        await db.carts.update_one(
            {"_id": existing_cart["_id"], "user_id": current_user.user_id},
            {
                "$set": {
                    "items": normalized_items,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    else:
        await db.carts.insert_one({
            "user_id": current_user.user_id,
            "tenant_id": getattr(current_user, 'country', None) or "ES",
            "status": "active",
            "items": normalized_items,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        })

    return {"success": True, "items_count": len(normalized_items)}


@router.post("/shipping-preview")
async def shipping_preview(current_user=Depends(get_current_user)):
    """Per-store shipping breakdown for the current cart."""
    db = get_db()

    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
    })

    if not cart or not cart.get("items"):
        return {
            "success": True,
            "data": {
                "stores": [],
                "total_shipping_cents": 0,
                "total_savings_cents": 0,
                "store_count": 0,
            },
        }

    result = await calculate_cart_shipping(cart["items"])
    # Note: this is a plan-based estimate. Final shipping is calculated at checkout
    # using the producer's custom shipping policy (ShippingService), which may differ.
    result["is_estimate"] = True
    return {"success": True, "data": result}


@router.delete("/coupon")
async def remove_coupon(current_user=Depends(get_current_user)):
    """Remove applied coupon from cart."""
    db = get_db()

    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {
            "$set": {
                "coupon_code": None,
                "discount_cents": 0,
                "influencer_id": None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"success": True, "message": "Coupon removed"}
