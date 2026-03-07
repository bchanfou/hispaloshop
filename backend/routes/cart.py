"""
Endpoints de carrito persistente y checkout completo.
Fase 4: Checkout + B2B Importer
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request

from core.database import get_db
from core.auth import get_current_user
from core.models import Cart

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("")
async def get_cart(current_user = Depends(get_current_user)):
    """Obtener carrito activo del usuario"""
    db = get_db()
    
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active",
        "expires_at": {"$gte": datetime.utcnow()}
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
    db = get_db()
    from bson.objectid import ObjectId
    
    # Validar producto
    try:
        product = await db.products.find_one({
            "_id": ObjectId(product_id),
            "status": {"$in": ["active", "approved"]}
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
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
        unit_price_cents = int(product["price"] * 100)
    
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
        "added_at": datetime.utcnow()
    }
    
    if cart:
        # Verificar si ya existe
        existing_idx = None
        for idx, item in enumerate(cart.get("items", [])):
            if item.get("product_id") == product_id and item.get("variant_id") == variant_id:
                existing_idx = idx
                break
        
        if existing_idx is not None:
            # Actualizar cantidad
            new_qty = cart["items"][existing_idx]["quantity"] + quantity
            if new_qty > stock:
                raise HTTPException(status_code=400, detail=f"Max stock available: {stock}")
            
            cart["items"][existing_idx]["quantity"] = new_qty
            cart["items"][existing_idx]["total_price_cents"] = unit_price_cents * new_qty
        else:
            # Añadir nuevo item
            cart["items"].append(cart_item)
        
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {
                "$set": {
                    "items": cart["items"],
                    "updated_at": datetime.utcnow()
                }
            }
        )
    else:
        # Crear nuevo carrito
        new_cart = {
            "user_id": current_user.user_id,
            "tenant_id": getattr(current_user, 'country', None) or "ES",
            "status": "active",
            "items": [cart_item],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=7)
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
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.utcnow()}}
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
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Item removed"}


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
            {"end_date": {"$gte": datetime.utcnow()}}
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
    
    # Aplicar a carrito
    await db.carts.update_one(
        {"_id": cart["_id"]},
        {
            "$set": {
                "coupon_code": code.upper(),
                "discount_cents": discount_cents,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "data": {
            "code": code.upper(),
            "discount_cents": discount_cents,
            "type": coupon["type"]
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
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True, "message": "Cart cleared"}
