"""
Hispal AI — Tool implementations for product search, cart, and user profile.
These functions are called by the AI router when Claude uses tools.
"""
from bson import ObjectId


async def search_products_db(db, query, certifications=None, max_price=None, limit=4):
    """Search products in MongoDB catalog."""
    filter_q = {"is_active": True}

    # Use $text search if a text index exists, otherwise regex fallback
    if query:
        filter_q["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"category": {"$regex": query, "$options": "i"}},
        ]

    if certifications:
        filter_q["certifications"] = {"$all": certifications}
    if max_price is not None:
        filter_q["price"] = {"$lte": max_price}

    cursor = db.products.find(filter_q).limit(limit)
    products = await cursor.to_list(length=limit)

    return [
        {
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "price": p.get("price", 0),
            "image_url": p.get("image_url") or p.get("images", [None])[0],
            "certifications": p.get("certifications", []),
            "producer": p.get("producer_name", ""),
        }
        for p in products
    ]


async def get_product_detail_db(db, product_id):
    """Return full product details."""
    try:
        p = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        return {"error": "ID de producto no válido"}

    if not p:
        return {"error": "Producto no encontrado"}

    return {
        "id": str(p["_id"]),
        "name": p.get("name"),
        "description": p.get("description"),
        "ingredients": p.get("ingredients"),
        "nutritional_info": p.get("nutritional_info"),
        "certifications": p.get("certifications", []),
        "allergens": p.get("allergens", []),
        "price": p.get("price"),
        "unit": p.get("unit"),
        "origin": p.get("origin"),
    }


async def add_to_cart_db(db, user_id, product_id, quantity):
    """Add product to user's cart in MongoDB."""
    if not user_id:
        return {"error": "Usuario no autenticado"}

    await db.carts.update_one(
        {"user_id": user_id},
        {"$push": {"items": {"product_id": product_id, "quantity": quantity}}},
        upsert=True,
    )
    return {"success": True, "message": f"Añadido al carrito ({quantity} ud.)"}


async def get_user_profile_db(db, user_id):
    """Return user dietary profile."""
    if not user_id:
        return {}

    u = await db.users.find_one(
        {"user_id": user_id},
        {"dietary_preferences": 1, "allergies": 1, "purchase_history": 1},
    )
    if not u:
        return {}

    return {
        "allergies": u.get("allergies", []),
        "dietary_preferences": u.get("dietary_preferences", []),
        "recent_purchases": u.get("purchase_history", [])[-5:],
    }


async def get_cart_summary_db(db, user_id):
    """Return cart summary."""
    if not user_id:
        return {"items": [], "total": 0}

    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        return {"items": [], "total": 0}

    return {
        "items": cart.get("items", []),
        "item_count": len(cart.get("items", [])),
    }
