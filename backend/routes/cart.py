"""
Endpoints de carrito persistente y checkout completo.
Fase 4: Checkout + B2B Importer
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request

from core.database import get_db
from core.auth import get_current_user
from core.models import Cart
from services.markets import is_product_available_in_country
from services.shipping_calculator import calculate_cart_shipping

router = APIRouter(prefix="/cart", tags=["Cart"])


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
                "item_count": 0,
                "is_empty": True
            }
        }
    
    # Calcular totales
    items = cart.get("items", [])
    subtotal_cents = sum(item.get("total_price_cents", 0) for item in items)
    
    # Aplicar descuento si hay coupon
    discount_cents = cart.get("discount_cents", 0)
    
    cart["id"] = str(cart.pop("_id", ""))
    
    return {
        "success": True,
        "data": {
            **cart,
            "subtotal_cents": subtotal_cents,
            "discount_cents": discount_cents,
            "total_cents": max(0, subtotal_cents - discount_cents),
            "item_count": sum(item.get("quantity", 0) for item in items),
            "is_empty": len(items) == 0
        }
    }


@router.post("/items")
async def add_to_cart(
    product_id: str,
    quantity: int = 1,
    variant_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Añadir item al carrito"""
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    db = get_db()
    from bson.objectid import ObjectId
    
    # Validar producto
    try:
        product = await db.products.find_one({
            "_id": ObjectId(product_id),
            "status": {"$in": ["active", "approved"]}
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
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
        unit_price_cents = int(round(product["price"] * 100))
    
    # Obtener o crear carrito
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    cart_item = {
        "product_id": product_id,
        "product_name": product.get("name"),
        "product_image": product.get("images", [{}])[0].get("url") if product.get("images") else None,
        "seller_id": product.get("seller_id") or product.get("producer_id"),
        "seller_type": product.get("seller_type", "producer"),
        "quantity": quantity,
        "unit_price_cents": unit_price_cents,
        "total_price_cents": unit_price_cents * quantity,
        "variant_id": variant_id,
        "added_at": datetime.now(timezone.utc)
    }
    
    if cart:
        # Verificar si ya existe
        existing_idx = None
        for idx, item in enumerate(cart.get("items", [])):
            if item.get("product_id") == product_id and item.get("variant_id") == variant_id:
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


@router.patch("/items/{product_id}")
async def update_cart_item(
    product_id: str,
    quantity: int,
    variant_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Actualizar cantidad de item"""
    db = get_db()
    
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Encontrar item
    items = cart.get("items", [])
    item_idx = None
    for idx, item in enumerate(items):
        if item.get("product_id") == product_id and item.get("variant_id") == variant_id:
            item_idx = idx
            break
    
    if item_idx is None:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if quantity <= 0:
        # Eliminar item
        items.pop(item_idx)
    else:
        # Verificar stock
        from bson.objectid import ObjectId
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        stock = product.get("stock_quantity", product.get("stock", 0))
        
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
    current_user = Depends(get_current_user)
):
    """Eliminar item del carrito"""
    db = get_db()
    
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = cart.get("items", [])
    items = [i for i in items if not (i.get("product_id") == product_id and i.get("variant_id") == variant_id)]
    
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

    from bson.objectid import ObjectId

    unavailable_items = []
    for item in cart.get("items", []):
        try:
            product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        except Exception:
            product = None

        if not product or not is_product_available_in_country(product, country):
            unavailable_items.append({
                "product_id": item.get("product_id"),
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

    from bson.objectid import ObjectId

    next_items = []
    removed_count = 0
    updated_count = 0

    for item in cart.get("items", []):
        try:
            product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        except Exception:
            product = None

        if not product or not is_product_available_in_country(product, country):
            removed_count += 1
            continue

        updated_item = dict(item)
        country_prices = product.get("country_prices", {})
        if country in country_prices:
            unit_price_cents = int(round(float(country_prices[country]) * 100))
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
    if coupon["type"] == "percentage":
        discount_cents = int(subtotal * (coupon["value"] / 100))
    elif coupon["type"] == "fixed":
        discount_cents = int(coupon["value"] * 100)
    elif coupon["type"] == "free_shipping":
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

        normalized_items.append({
            "product_id": str(product_id),
            "product_name": item.get("product_name") or item.get("name"),
            "product_image": item.get("product_image") or item.get("image"),
            "seller_id": item.get("seller_id") or item.get("producer_id"),
            "seller_type": item.get("seller_type", "producer"),
            "quantity": quantity,
            "unit_price_cents": int(item.get("unit_price_cents", 0) or 0),
            "total_price_cents": int(item.get("total_price_cents", 0) or 0),
            "variant_id": item.get("variant_id"),
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
