"""
David AI — Tool implementations for product search, cart, and user profile.
These functions are called by the AI router when Claude uses tools.
"""
from bson import ObjectId


async def search_products_db(db, query, certifications=None, max_price=None, limit=4):
    """Search products in MongoDB catalog."""
    filter_q = {"is_active": True}

    if query:
        filter_q["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"category": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}},
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
            "rating": p.get("rating", 0),
            "slug": p.get("slug", ""),
            "in_stock": p.get("stock", 0) > 0,
            "unit": p.get("unit", "ud"),
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
        "weight": p.get("weight"),
        "storage_instructions": p.get("storage_instructions"),
        "producer_name": p.get("producer_name", ""),
        "in_stock": p.get("stock", 0) > 0,
    }


async def add_to_cart_db(db, user_id, product_id, quantity):
    """Add product to user's cart in MongoDB with stock checking."""
    if not user_id:
        return {"error": "Usuario no autenticado"}

    # Check stock
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        return {"error": "ID de producto no válido"}

    if not product:
        return {"error": "Producto no encontrado"}

    stock = product.get("stock", 0)
    if stock < quantity:
        return {"error": f"Stock insuficiente (disponible: {stock})"}

    product_name = product.get("name", "Producto")

    # Upsert: increment quantity if product already in cart, otherwise push
    cart = await db.carts.find_one({"user_id": user_id})
    if cart:
        existing_idx = next(
            (i for i, item in enumerate(cart.get("items", [])) if item.get("product_id") == product_id),
            None,
        )
        if existing_idx is not None:
            await db.carts.update_one(
                {"user_id": user_id},
                {"$inc": {f"items.{existing_idx}.quantity": quantity}},
            )
        else:
            await db.carts.update_one(
                {"user_id": user_id},
                {"$push": {"items": {"product_id": product_id, "quantity": quantity}}},
            )
    else:
        await db.carts.insert_one(
            {"user_id": user_id, "items": [{"product_id": product_id, "quantity": quantity}]}
        )

    # Calculate cart total
    updated_cart = await db.carts.find_one({"user_id": user_id})
    total = 0
    for item in updated_cart.get("items", []):
        try:
            p = await db.products.find_one({"_id": ObjectId(item.get("product_id", ""))})
            if p:
                total += p.get("price", 0) * item.get("quantity", 1)
        except Exception:
            pass

    return {
        "success": True,
        "message": f"{product_name} añadido al carrito ({quantity} ud.)",
        "cart_total": round(total, 2),
    }


async def get_user_profile_db(db, user_id):
    """Return user dietary profile with recent order categories."""
    if not user_id:
        return {}

    u = await db.users.find_one(
        {"user_id": user_id},
        {
            "username": 1,
            "dietary_preferences": 1,
            "allergies": 1,
            "health_goals": 1,
            "purchase_history": 1,
        },
    )
    if not u:
        return {}

    # Fetch recent order categories
    recent_categories = []
    orders = await db.orders.find({"user_id": user_id}).sort("created_at", -1).limit(5).to_list(length=5)
    for order in orders:
        for item in order.get("items", []):
            cat = item.get("category")
            if cat and cat not in recent_categories:
                recent_categories.append(cat)

    return {
        "username": u.get("username", ""),
        "allergies": u.get("allergies", []),
        "dietary_preferences": u.get("dietary_preferences", []),
        "health_goals": u.get("health_goals", []),
        "recent_purchases": u.get("purchase_history", [])[-5:],
        "recent_categories": recent_categories,
    }


async def get_cart_summary_db(db, user_id):
    """Return cart summary with item details and total price."""
    if not user_id:
        return {"items": [], "total": 0}

    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        return {"items": [], "total": 0}

    items = []
    total = 0
    for item in cart.get("items", []):
        try:
            p = await db.products.find_one({"_id": ObjectId(item.get("product_id", ""))})
            if p:
                qty = item.get("quantity", 1)
                price = p.get("price", 0)
                items.append({
                    "product_id": item.get("product_id", ""),
                    "name": p.get("name", ""),
                    "price": price,
                    "quantity": qty,
                    "image_url": p.get("image_url") or p.get("images", [None])[0],
                })
                total += price * qty
        except Exception:
            pass

    return {
        "items": items,
        "item_count": len(items),
        "total": round(total, 2),
    }
