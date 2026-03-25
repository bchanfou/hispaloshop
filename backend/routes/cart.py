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

    # Stock validation — enrich each item with stock_available flag
    product_ids = [item.get("product_id") for item in items if item.get("product_id")]
    products = await db.products.find(
        {"product_id": {"$in": product_ids}},
        {"product_id": 1, "stock_quantity": 1, "stock": 1, "is_active": 1}
    ).to_list(len(product_ids)) if product_ids else []
    stock_map = {p["product_id"]: p for p in products}

    for item in items:
        product = stock_map.get(item.get("product_id"))
        if not product:
            item["stock_available"] = False
            item["stock_message"] = "Producto no disponible"
        elif not product.get("is_active", True):
            item["stock_available"] = False
            item["stock_message"] = "Producto descatalogado"
        else:
            stock = product.get("stock_quantity", product.get("stock"))
            if stock is not None and stock < item.get("quantity", 1):
                item["stock_available"] = False
                item["stock_message"] = f"Solo quedan {stock} unidades"
            else:
                item["stock_available"] = True

    # Only count available items in subtotal (exclude deleted/out-of-stock products)
    subtotal_cents = sum(
        item.get("total_price_cents", 0)
        for item in items
        if item.get("stock_available", True) is not False
    )

    # Recalculate discount dynamically for percentage coupons
    discount_cents = cart.get("discount_cents", 0)
    coupon_code = cart.get("coupon_code")
    if coupon_code and subtotal_cents > 0:
        try:
            coupon_doc = await db.discount_codes.find_one({"code": coupon_code}, {"_id": 0})
            if coupon_doc and coupon_doc.get("active", True):
                c_type = coupon_doc.get("type", "")
                c_value = coupon_doc.get("value", 0)
                if c_type == "percentage" and c_value > 0:
                    discount_cents = (subtotal_cents * int(c_value)) // 100
                elif c_type == "fixed" and c_value > 0:
                    # Fixed discounts: stored value is in euros (float), convert to cents
                    fixed_cents = int(round(float(c_value) * 100)) if c_value < 1000 else int(c_value)
                    discount_cents = min(fixed_cents, subtotal_cents)
                # Update stored discount_cents to reflect current subtotal
                if discount_cents != cart.get("discount_cents", 0):
                    await db.carts.update_one(
                        {"_id": cart["_id"]},
                        {"$set": {"discount_cents": discount_cents}}
                    )
        except Exception:
            pass  # Keep the stored discount_cents on error

    # IVA calculation (Spain 21%) — informational only, prices already include IVA
    TAX_RATE_BP = 2100  # 21% in basis points
    # IVA is included in subtotal: tax = subtotal * 21 / 121 (matches ShippingService)
    tax_cents = int(round((subtotal_cents * TAX_RATE_BP) / (10000 + TAX_RATE_BP)))

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

    from services.shipping_service import ShippingPolicy, ShippingService

    for seller_id, group_items in seller_groups.items():
        seller = seller_map.get(seller_id)
        seller_name = (
            (seller.get("company_name") or seller.get("name", "Tienda"))
            if seller else "Tienda"
        )
        seller_subtotal = sum(i.get("total_price_cents", 0) for i in group_items)
        item_count = len(group_items)

        # Use ShippingService — same calculation as checkout
        _bc = seller.get("shipping_base_cost_cents") if seller else None
        _pi = seller.get("shipping_per_item_cents") if seller else None
        _ft = seller.get("shipping_free_threshold_cents") if seller else None
        policy = ShippingPolicy(
            enabled=bool(seller.get("shipping_policy_enabled", False)) if seller else False,
            base_cost_cents=int(_bc) if _bc is not None else 490,
            per_item_cents=int(_pi) if _pi is not None else 0,
            free_threshold_cents=int(_ft) if _ft is not None else 3000,
        )
        # If policy not enabled, use default base cost (490 = 4.90 EUR)
        if not policy.enabled:
            policy = ShippingPolicy(enabled=True, base_cost_cents=490, per_item_cents=0, free_threshold_cents=3000)

        shipping_cost = ShippingService.calculate_shipping_cents(
            policy=policy, item_count=item_count, subtotal_cents=seller_subtotal,
        )
        free_threshold = policy.free_threshold_cents or 0
        is_free = shipping_cost == 0 and seller_subtotal > 0
        remaining_for_free = max(0, free_threshold - seller_subtotal) if free_threshold > 0 else 0
        progress_pct = min(100, (seller_subtotal * 100) // free_threshold) if free_threshold > 0 else 100

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
            "item_count": item_count,
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
    MAX_ITEM_QTY = 99
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser al menos 1")
    if quantity > MAX_ITEM_QTY:
        raise HTTPException(status_code=400, detail=f"Cantidad máxima por artículo: {MAX_ITEM_QTY}")
    db = get_db()

    # Validar producto — lookup by product_id string field (matches products collection schema)
    product = await db.products.find_one({
        "product_id": product_id,
        "status": {"$in": ["active", "approved"]}
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    user_doc = await db.users.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "country": 1, "locale.country": 1},
    ) or {}
    user_country = user_doc.get("locale", {}).get("country") or user_doc.get("country") or getattr(current_user, "country", None) or "ES"
    if not is_product_available_in_country(product, user_country):
        raise HTTPException(status_code=400, detail=f"Product not available in {user_country}")
    
    # Verificar stock — None means stock tracking is disabled (unlimited)
    stock = product.get("stock_quantity", product.get("stock"))
    if stock is not None and stock < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Solo {stock} unidades disponibles"
        )
    
    # Obtener precio
    unit_price_cents = product.get("price_cents", 0)
    if unit_price_cents == 0 and product.get("price"):
        unit_price_cents = price_to_cents(product["price"])
    
    # Obtener o crear carrito — use same expiry filter as GET /cart
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
        "expires_at": {"$gte": datetime.now(timezone.utc)}
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
            # Atomic increment using $elemMatch — safe against concurrent index shifts
            elem_filter = {
                "_id": cart["_id"],
                "items": {"$elemMatch": {
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "pack_id": pack_id,
                }},
            }
            result = await db.carts.update_one(
                elem_filter,
                {
                    "$inc": {"items.$.quantity": quantity},
                    "$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    }
                }
            )

            # Re-read actual quantity and fix total_price_cents atomically
            updated = await db.carts.find_one({"_id": cart["_id"]}, {"items": 1})
            actual_qty = quantity  # fallback
            for item in (updated or {}).get("items", []):
                if (item.get("product_id") == product_id and
                        item.get("variant_id") == variant_id and
                        item.get("pack_id") == pack_id):
                    actual_qty = item["quantity"]
                    await db.carts.update_one(
                        elem_filter,
                        {"$set": {"items.$.total_price_cents": actual_qty * unit_price_cents}}
                    )
                    break

            # Verify stock AFTER the increment — use $elemMatch, not stale index
            if stock is not None and actual_qty > stock:
                # Revert to stock limit
                await db.carts.update_one(
                    elem_filter,
                    {"$set": {
                        "items.$.quantity": stock,
                        "items.$.total_price_cents": stock * unit_price_cents,
                    }}
                )
                raise HTTPException(400, f"Stock ajustado a {stock} unidades disponibles")
        else:
            # Atomic push: add new item without overwriting concurrent changes
            await db.carts.update_one(
                {"_id": cart["_id"], "user_id": current_user.user_id},
                {
                    "$push": {"items": cart_item},
                    "$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    },
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
        "message": "Añadido al carrito",
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
        "status": "active",
        "expires_at": {"$gte": datetime.now(timezone.utc)}
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Carrito no encontrado")

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
        raise HTTPException(status_code=404, detail="Artículo no encontrado en el carrito")
    
    if quantity > 99:
        raise HTTPException(status_code=400, detail="Cantidad máxima por artículo: 99")
    if quantity <= 0:
        # Eliminar item atomically with $pull — robust null matching
        pull_filter = {"product_id": product_id}
        if variant_id:
            pull_filter["variant_id"] = variant_id
        else:
            pull_filter["variant_id"] = {"$in": [None, ""]}
        if pack_id:
            pull_filter["pack_id"] = pack_id
        else:
            pull_filter["pack_id"] = {"$in": [None, ""]}

        await db.carts.update_one(
            {"_id": cart["_id"], "user_id": current_user.user_id},
            {
                "$pull": {"items": pull_filter},
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                },
            }
        )
    else:
        # Verificar stock
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        stock = product.get("stock_quantity", product.get("stock")) if product else None

        if stock is not None and quantity > stock:
            raise HTTPException(status_code=400, detail=f"Stock máximo disponible: {stock}")

        # Use arrayFilters to match by product+variant+pack — avoids index-based race condition
        unit_price = items[item_idx]["unit_price_cents"]
        array_filter = {"elem.product_id": product_id}
        if variant_id:
            array_filter["elem.variant_id"] = variant_id
        else:
            array_filter["elem.variant_id"] = {"$in": [None, ""]}
        if pack_id:
            array_filter["elem.pack_id"] = pack_id
        else:
            array_filter["elem.pack_id"] = {"$in": [None, ""]}

        await db.carts.update_one(
            {"user_id": current_user.user_id, "expires_at": {"$gte": datetime.now(timezone.utc)}},
            {"$set": {
                "items.$[elem].quantity": quantity,
                "items.$[elem].total_price_cents": unit_price * quantity,
                "updated_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            }},
            array_filters=[array_filter]
        )

    return {"success": True, "message": "Carrito actualizado"}


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
        "status": "active",
        "expires_at": {"$gte": datetime.now(timezone.utc)}
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Carrito no encontrado")

    # Build robust $pull filter — null variant_id/pack_id must match None or missing
    pull_filter = {"product_id": product_id}
    if variant_id:
        pull_filter["variant_id"] = variant_id
    else:
        pull_filter["variant_id"] = {"$in": [None, ""]}
    if pack_id:
        pull_filter["pack_id"] = pack_id
    else:
        pull_filter["pack_id"] = {"$in": [None, ""]}

    await db.carts.update_one(
        {"_id": cart["_id"], "user_id": current_user.user_id},
        {
            "$pull": {"items": pull_filter},
            "$set": {
                "updated_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            },
        }
    )

    return {"success": True, "message": "Artículo eliminado"}


@router.post("/validate-country")
async def validate_cart_country(request: Request, current_user = Depends(get_current_user)):
    db = get_db()
    payload = await request.json()
    country = str(payload.get("country", "")).upper()
    if not country:
        raise HTTPException(status_code=400, detail="El país es obligatorio")

    cart = await db.carts.find_one({"user_id": current_user.user_id, "status": "active", "expires_at": {"$gte": datetime.now(timezone.utc)}})
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
        raise HTTPException(status_code=400, detail="El país es obligatorio")

    cart = await db.carts.find_one({"user_id": current_user.user_id, "status": "active", "expires_at": {"$gte": datetime.now(timezone.utc)}})
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
        "code": code.strip().upper(),
        "active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$exists": False}},
            {"end_date": {"$gte": datetime.now(timezone.utc)}}
        ],
        "$and": [
            {"$or": [
                {"start_date": None},
                {"start_date": {"$exists": False}},
                {"start_date": {"$lte": datetime.now(timezone.utc)}},
            ]}
        ]
    })
    
    if not coupon:
        raise HTTPException(status_code=400, detail="Código de descuento inválido o expirado")
    
    # Verificar uso
    if coupon.get("usage_limit") and coupon.get("usage_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Límite de uso del cupón alcanzado")
    
    # Obtener carrito
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
        "expires_at": {"$gte": datetime.now(timezone.utc)}
    })
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    
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
            "status": "active",
            "$or": [
                {"expires_at": {"$gte": datetime.now(timezone.utc)}},
                {"expires_at": None},
                {"expires_at": {"$exists": False}},
            ],
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
    
    return {"success": True, "message": "Carrito vaciado"}


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
        "expires_at": {"$gte": datetime.now(timezone.utc)},
    })

    if existing_cart:
        await db.carts.update_one(
            {"_id": existing_cart["_id"], "user_id": current_user.user_id},
            {
                "$set": {
                    "items": normalized_items,
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
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
        "$or": [
            {"expires_at": {"$gte": datetime.now(timezone.utc)}},
            {"expires_at": None},
            {"expires_at": {"$exists": False}},
        ],
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
        "$or": [
            {"expires_at": {"$gte": datetime.now(timezone.utc)}},
            {"expires_at": None},
            {"expires_at": {"$exists": False}},
        ],
    })

    if not cart:
        raise HTTPException(status_code=404, detail="Carrito no encontrado")

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

    return {"success": True, "message": "Cupón eliminado"}
