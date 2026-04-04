"""
David AI — Tool implementations, cart helpers, smart cart, and ProductReasoningEngine.
Merged from hispal_ai_tools.py (active) + ai_chat.py (legacy).
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# CART HELPERS — operate on db.carts (embedded items[])
# ═══════════════════════════════════════════════════════

async def _get_cart_items(db, user_id: str) -> list:
    """Return the items array from the user's active cart, or []."""
    cart = await db.carts.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 0, "items": 1},
    )
    return (cart or {}).get("items", [])


async def _clear_cart(db, user_id: str) -> None:
    """Empty all items from the user's active cart."""
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc)}},
    )


async def _find_cart_item(db, user_id: str, product_id: str, variant_id=None, pack_id=None):
    """Find an existing item inside the active cart. Returns (index, item) or (None, None)."""
    cart = await db.carts.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 0, "items": 1},
    )
    if not cart:
        return None, None
    for idx, item in enumerate(cart.get("items", [])):
        if (item.get("product_id") == product_id
                and item.get("variant_id") == variant_id
                and item.get("pack_id") == pack_id):
            return idx, item
    return None, None


async def _upsert_cart_item(db, user_id: str, cart_item: dict, tenant_id: str = "ES") -> None:
    """Add or update an item in the user's active cart (create cart if needed)."""
    product_id = cart_item["product_id"]
    variant_id = cart_item.get("variant_id")
    pack_id = cart_item.get("pack_id")
    now = datetime.now(timezone.utc)

    cart = await db.carts.find_one({"user_id": user_id, "status": "active"})

    if cart:
        idx, existing = None, None
        for i, it in enumerate(cart.get("items", [])):
            if (it.get("product_id") == product_id
                    and it.get("variant_id") == variant_id
                    and it.get("pack_id") == pack_id):
                idx, existing = i, it
                break

        if existing is not None:
            new_qty = existing["quantity"] + cart_item["quantity"]
            await db.carts.update_one(
                {"_id": cart["_id"]},
                {"$set": {
                    f"items.{idx}.quantity": new_qty,
                    f"items.{idx}.unit_price_cents": cart_item["unit_price_cents"],
                    f"items.{idx}.total_price_cents": cart_item["unit_price_cents"] * new_qty,
                    "updated_at": now,
                }},
            )
        else:
            await db.carts.update_one(
                {"_id": cart["_id"]},
                {"$push": {"items": cart_item}, "$set": {"updated_at": now}},
            )
    else:
        new_cart = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "active",
            "items": [cart_item],
            "created_at": now,
            "updated_at": now,
            "expires_at": now + timedelta(days=7),
        }
        await db.carts.insert_one(new_cart)


async def _update_cart_item_fields(db, user_id: str, product_id: str, fields: dict) -> None:
    """Update arbitrary fields on a specific cart item matched by product_id."""
    cart = await db.carts.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 1, "items": 1},
    )
    if not cart:
        return
    for idx, item in enumerate(cart.get("items", [])):
        if item.get("product_id") == product_id:
            sets = {f"items.{idx}.{k}": v for k, v in fields.items()}
            sets["updated_at"] = datetime.now(timezone.utc)
            await db.carts.update_one({"_id": cart["_id"]}, {"$set": sets})
            return


async def _remove_cart_item(db, user_id: str, product_id: str) -> None:
    """Remove one item (by product_id) from the active cart."""
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {
            "$pull": {"items": {"product_id": product_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )


async def _replace_cart_item(db, user_id: str, old_product_id: str, new_item: dict) -> None:
    """Remove old item and push new item."""
    now = datetime.now(timezone.utc)
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {
            "$pull": {"items": {"product_id": old_product_id}},
            "$set": {"updated_at": now},
        },
    )
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {
            "$push": {"items": new_item},
            "$set": {"updated_at": now},
        },
    )


# ═══════════════════════════════════════════════════════
# PRODUCT REASONING ENGINE
# ═══════════════════════════════════════════════════════

class ProductReasoningEngine:
    """Static methods for intelligent product analysis across variants/packs."""

    @staticmethod
    def get_best_price_option(product: dict) -> dict:
        """Find cheapest variant/pack combination."""
        base_price = product.get("price") or float("inf")
        best = {"variant_id": None, "pack_id": None, "price": base_price, "label": "base"}
        for variant in product.get("variants", []):
            for pack in variant.get("packs", []):
                pack_price = pack.get("price")
                if pack_price is not None and pack_price > 0 and pack_price < best["price"]:
                    best = {
                        "variant_id": variant["variant_id"],
                        "pack_id": pack["pack_id"],
                        "price": pack_price,
                        "label": f"{variant.get('name', '')} — {pack.get('label', '')}",
                    }
        # Restore 0 if no better option found and base was 0
        if best["price"] == float("inf"):
            best["price"] = 0
        return best

    @staticmethod
    def calculate_health_score(product: dict) -> float:
        """Score 0-100 based on certifications, organic, ingredients quality."""
        score = 50.0
        certs = [c.lower() for c in product.get("certifications", [])]
        if any("eco" in c or "organic" in c or "bio" in c for c in certs):
            score += 15
        if any("vegan" in c or "vegano" in c for c in certs):
            score += 10
        if any("gluten" in c for c in certs):
            score += 5
        if any("halal" in c for c in certs):
            score += 5
        allergens = product.get("allergens", [])
        score -= len(allergens) * 3
        nutritional = product.get("nutritional_info", {})
        if isinstance(nutritional, dict):
            if nutritional.get("fiber", 0) > 5:
                score += 5
            if nutritional.get("sugar", 999) < 5:
                score += 5
            if nutritional.get("protein", 0) > 10:
                score += 5
        return max(0, min(100, score))

    @staticmethod
    def calculate_quality_score(product: dict) -> float:
        """Score 0-100 based on ratings, reviews, certifications."""
        score = 50.0
        rating = product.get("average_rating", product.get("rating", 0))
        review_count = product.get("review_count", 0)
        score += (rating - 3) * 10
        if review_count >= 10:
            score += 10
        elif review_count >= 5:
            score += 5
        certs = product.get("certifications", [])
        score += len(certs) * 3
        if product.get("is_premium") or product.get("featured"):
            score += 5
        return max(0, min(100, score))

    @staticmethod
    def get_biggest_pack(product: dict) -> dict:
        """Find largest pack option by units."""
        best = {"variant_id": None, "pack_id": None, "price": 0, "units": 0, "label": "base"}
        for variant in product.get("variants", []):
            for pack in variant.get("packs", []):
                if pack.get("units", 1) > best["units"]:
                    best = {
                        "variant_id": variant["variant_id"],
                        "pack_id": pack["pack_id"],
                        "price": pack.get("price", 0),
                        "units": pack.get("units", 1),
                        "label": pack.get("label", ""),
                    }
        return best

    @staticmethod
    def get_premium_option(product: dict) -> dict:
        """Find most expensive (premium) variant/pack."""
        best = {"variant_id": None, "pack_id": None, "price": 0, "label": "base"}
        for variant in product.get("variants", []):
            for pack in variant.get("packs", []):
                if pack.get("price", 0) > best["price"]:
                    best = {
                        "variant_id": variant["variant_id"],
                        "pack_id": pack["pack_id"],
                        "price": pack["price"],
                        "label": f"{variant.get('name', '')} — {pack.get('label', '')}",
                    }
        return best


# ═══════════════════════════════════════════════════════
# TOOL IMPLEMENTATIONS — called by Claude tool-use loop
# ═══════════════════════════════════════════════════════

async def search_products_db(db, query, certifications=None, max_price=None, limit=4,
                             user_country=None):
    """Search products with optional country filtering and country-specific pricing."""
    conditions = [{"approved": True}]

    # Country availability
    if user_country:
        conditions.append({"$or": [
            {"available_countries": user_country},
            {"available_countries": None},
            {"available_countries": {"$exists": False}},
            {"available_countries": []},
        ]})

    if query:
        conditions.append({"$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"category": {"$regex": query, "$options": "i"}},
            {"category_id": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}},
        ]})

    if certifications:
        conditions.append({"certifications": {"$all": certifications}})

    filter_q = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    cursor = db.products.find(filter_q).limit(limit)
    products = await cursor.to_list(length=limit)

    results = []
    for p in products:
        price = p.get("price", 0)
        currency = "EUR"
        if user_country:
            country_prices = p.get("country_prices", {})
            country_currency = p.get("country_currency", {})
            if user_country in country_prices:
                price = country_prices[user_country]
                currency = country_currency.get(user_country, "EUR")

        if max_price is not None and price > max_price:
            continue

        image = None
        images = p.get("images", [])
        if images:
            img = images[0]
            image = img.get("url") if isinstance(img, dict) else img

        results.append({
            "id": p.get("product_id", str(p.get("_id", ""))),
            "name": p.get("name", ""),
            "price": price,
            "currency": currency,
            "image_url": image or p.get("image_url"),
            "certifications": p.get("certifications", []),
            "allergens": p.get("allergens", []),
            "producer": p.get("producer_name", ""),
            "rating": p.get("rating", 0),
            "slug": p.get("slug", ""),
            "in_stock": p.get("stock", 0) > 0,
            "unit": p.get("unit", "ud"),
            "category": p.get("category_id", ""),
        })

    return results


async def get_product_detail_db(db, product_id):
    """Return full product details by product_id field."""
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not p:
        # Fallback to ObjectId
        try:
            from bson import ObjectId
            p = await db.products.find_one({"_id": ObjectId(product_id)}, {"_id": 0})
        except Exception:
            pass
    if not p:
        return {"error": "Producto no encontrado"}

    return {
        "id": p.get("product_id", product_id),
        "name": p.get("name"),
        "description": p.get("description"),
        "ingredients": p.get("ingredients"),
        "nutritional_info": p.get("nutritional_info"),
        "certifications": p.get("certifications", []),
        "allergens": p.get("allergens", []),
        "price": p.get("price"),
        "unit": p.get("unit"),
        "origin": p.get("origin") or p.get("country_origin"),
        "weight": p.get("weight"),
        "storage_instructions": p.get("storage_instructions"),
        "producer_name": p.get("producer_name", ""),
        "in_stock": p.get("stock", 0) > 0,
        "variants": [
            {
                "variant_id": v.get("variant_id"),
                "name": v.get("name"),
                "packs": [
                    {"pack_id": pk.get("pack_id"), "label": pk.get("label"),
                     "price": pk.get("price"), "units": pk.get("units", 1)}
                    for pk in v.get("packs", [])
                ],
            }
            for v in p.get("variants", [])
        ],
    }


async def add_to_cart_db(db, user_id, product_id, quantity=1, user_country="ES"):
    """Add product to cart with full variant/pack/stock/country-price handling."""
    if not user_id:
        return {"error": "Usuario no autenticado"}

    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        # Fallback to ObjectId
        try:
            from bson import ObjectId
            product = await db.products.find_one({"_id": ObjectId(product_id)}, {"_id": 0})
        except Exception:
            pass
    if not product:
        return {"error": "Producto no encontrado"}

    # Country availability check
    available = product.get("available_countries", [])
    if available and user_country not in available:
        return {"error": f"{product['name']} no está disponible en tu país."}

    # Price with country override
    price = product.get("price", 0)
    country_prices = product.get("country_prices", {})
    if user_country in country_prices:
        price = country_prices[user_country]

    stock = product.get("stock", 0)
    track_stock = product.get("track_stock", True)
    variant_id = None
    pack_id = None

    # Use first variant/pack if available
    variants = product.get("variants", [])
    if variants:
        variant = variants[0]
        variant_id = variant["variant_id"]
        packs = variant.get("packs", [])
        if packs:
            pack = packs[0]
            pack_id = pack["pack_id"]
            price = pack.get("price", price)
            stock = pack.get("stock", stock)

    if track_stock and stock <= 0:
        return {"error": f"{product['name']} está agotado."}
    if track_stock and quantity > stock:
        quantity = stock

    unit_price_cents = int(round(price * 100))
    product_name = product.get("name", "Producto")

    image = None
    images = product.get("images", [])
    if images:
        img = images[0]
        image = img.get("url") if isinstance(img, dict) else img

    # Check if already in cart
    idx, existing = await _find_cart_item(db, user_id, product.get("product_id", product_id), variant_id, pack_id)
    if existing is not None:
        new_qty = existing["quantity"] + quantity
        if track_stock and new_qty > stock:
            new_qty = stock
        await _update_cart_item_fields(db, user_id, product.get("product_id", product_id), {
            "quantity": new_qty,
            "unit_price_cents": unit_price_cents,
            "total_price_cents": unit_price_cents * new_qty,
        })
    else:
        cart_item = {
            "product_id": product.get("product_id", product_id),
            "product_name": product_name,
            "product_image": image,
            "seller_id": product.get("seller_id") or product.get("producer_id"),
            "seller_type": product.get("seller_type", "producer"),
            "quantity": quantity,
            "unit_price_cents": unit_price_cents,
            "total_price_cents": unit_price_cents * quantity,
            "variant_id": variant_id,
            "pack_id": pack_id,
            "added_at": datetime.now(timezone.utc),
        }
        await _upsert_cart_item(db, user_id, cart_item, tenant_id=user_country)

    return {
        "success": True,
        "message": f"{product_name} añadido al carrito ({quantity} ud.)",
    }


async def get_user_profile_db(db, user_id):
    """Return user dietary profile + AI memory combined."""
    if not user_id:
        return {}

    u = await db.users.find_one(
        {"user_id": user_id},
        {"username": 1, "dietary_preferences": 1, "allergies": 1,
         "health_goals": 1, "locale": 1},
    )
    if not u:
        return {}

    # Also fetch AI profile for richer context
    ai_profile = await db.ai_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}

    # Recent order categories
    recent_categories = []
    orders = await db.orders.find({"user_id": user_id}).sort("created_at", -1).limit(5).to_list(5)
    for order in orders:
        for item in order.get("items", order.get("line_items", [])):
            cat = item.get("category") or item.get("category_id")
            if cat and cat not in recent_categories:
                recent_categories.append(cat)

    return {
        "username": u.get("username", ""),
        "allergies": ai_profile.get("allergies") or u.get("allergies", []),
        "dietary_preferences": ai_profile.get("diet") or u.get("dietary_preferences", []),
        "health_goals": ai_profile.get("goals") or u.get("health_goals", []),
        "budget": ai_profile.get("budget", "medium"),
        "restrictions": ai_profile.get("restrictions", []),
        "tone": ai_profile.get("tone", "friendly"),
        "recent_categories": recent_categories,
    }


async def get_cart_summary_db(db, user_id):
    """Return cart summary with item details and total price."""
    if not user_id:
        return {"items": [], "total": 0}

    cart_items = await _get_cart_items(db, user_id)
    if not cart_items:
        return {"items": [], "item_count": 0, "total": 0}

    items = []
    total = 0
    for item in cart_items:
        name = item.get("product_name", "")
        price_cents = item.get("unit_price_cents", 0)
        qty = item.get("quantity", 1)
        price = price_cents / 100.0
        items.append({
            "product_id": item.get("product_id", ""),
            "name": name,
            "price": price,
            "quantity": qty,
            "image_url": item.get("product_image"),
        })
        total += price * qty

    return {
        "items": items,
        "item_count": len(items),
        "total": round(total, 2),
    }


# ═══════════════════════════════════════════════════════
# SMART CART — Intelligent cart manipulation
# ═══════════════════════════════════════════════════════

async def execute_smart_cart(db, user_id: str, action: str,
                             allergen_to_remove: Optional[str] = None) -> dict:
    """
    Execute a smart cart action. Returns {success, message, changes, savings}.
    Actions: optimize_price, optimize_health, optimize_quality,
             switch_pack, upgrade, remove_expensive, remove_allergen
    """
    results = {"success": True, "message": "", "changes": [], "savings": 0}

    cart_items = await _get_cart_items(db, user_id)
    if not cart_items:
        return {"success": False, "message": "Tu carrito está vacío.", "changes": [], "savings": 0}

    ai_profile = await db.ai_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    user_allergies = ai_profile.get("allergies", [])
    user_diet = ai_profile.get("diet", [])

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"

    cart_products = []
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            cart_products.append({"cart_item": item, "product": product})

    original_total = sum(
        item.get("unit_price_cents", 0) * item.get("quantity", 1) for item in cart_items
    ) / 100.0

    # ── OPTIMIZE PRICE ──
    if action == "optimize_price":
        changes_made = []
        new_total = 0
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            best = ProductReasoningEngine.get_best_price_option(product)
            item_price = item.get("unit_price_cents", 0) / 100.0
            if (best["variant_id"] != item.get("variant_id") or best["pack_id"] != item.get("pack_id")):
                if best["price"] and best["price"] < item_price:
                    best_cents = int(round(best["price"] * 100))
                    await _update_cart_item_fields(db, user_id, item["product_id"], {
                        "variant_id": best["variant_id"],
                        "pack_id": best["pack_id"],
                        "unit_price_cents": best_cents,
                        "total_price_cents": best_cents * item.get("quantity", 1),
                    })
                    changes_made.append(f"{product['name']} → {best.get('label', 'mejor precio')}")
                    new_total += best["price"] * item.get("quantity", 1)
                else:
                    new_total += item_price * item.get("quantity", 1)
            else:
                new_total += item_price * item.get("quantity", 1)

        savings = original_total - new_total
        if changes_made:
            results["message"] = f"Optimizado. Cambié {len(changes_made)} productos a opciones más económicas."
            if savings > 0:
                results["message"] += f" Ahorras {savings:.2f}€."
            results["changes"] = changes_made
            results["savings"] = round(savings, 2)
        else:
            results["message"] = "Tu carrito ya tiene los mejores precios."
        return results

    # ── OPTIMIZE HEALTH ──
    if action == "optimize_health":
        changes_made = []
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            category_id = product.get("category_id")
            alternatives = await db.products.find({
                "category_id": category_id, "approved": True,
                "product_id": {"$ne": item["product_id"]},
            }, {"_id": 0}).to_list(50)

            valid = _filter_by_diet_allergies(alternatives, user_allergies, user_diet)
            if valid:
                current_score = ProductReasoningEngine.calculate_health_score(product)
                best_alt = max(valid, key=lambda p: ProductReasoningEngine.calculate_health_score(p))
                if ProductReasoningEngine.calculate_health_score(best_alt) > current_score + 10:
                    await _swap_cart_product(db, user_id, item, best_alt)
                    changes_made.append(f"{product['name']} → {best_alt['name']}")

        if changes_made:
            results["message"] = f"Optimizado para salud. Cambié {len(changes_made)} productos."
            results["changes"] = changes_made
        else:
            results["message"] = "Tu carrito ya tiene las opciones más saludables."
        return results

    # ── OPTIMIZE QUALITY ──
    if action == "optimize_quality":
        changes_made = []
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            category_id = product.get("category_id")
            alternatives = await db.products.find({
                "category_id": category_id, "approved": True,
                "product_id": {"$ne": item["product_id"]},
            }, {"_id": 0}).to_list(50)

            for alt in alternatives:
                reviews = await db.reviews.find({"product_id": alt["product_id"]}, {"_id": 0}).to_list(100)
                alt["average_rating"] = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
                alt["review_count"] = len(reviews)

            valid = _filter_by_diet_allergies(alternatives, user_allergies, user_diet)
            if valid:
                current_score = ProductReasoningEngine.calculate_quality_score(product)
                best_alt = max(valid, key=lambda p: ProductReasoningEngine.calculate_quality_score(p))
                if ProductReasoningEngine.calculate_quality_score(best_alt) > current_score + 15:
                    await _swap_cart_product(db, user_id, item, best_alt)
                    changes_made.append(f"{product['name']} → {best_alt['name']}")

        if changes_made:
            results["message"] = f"Optimizado para calidad. Cambié {len(changes_made)} productos."
            results["changes"] = changes_made
        else:
            results["message"] = "Tu carrito ya tiene las mejores opciones de calidad."
        return results

    # ── SWITCH PACK ──
    if action == "switch_pack":
        changes_made = []
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            biggest = ProductReasoningEngine.get_biggest_pack(product)
            if biggest["pack_id"] and biggest["pack_id"] != item.get("pack_id"):
                biggest_cents = int(round(biggest["price"] * 100))
                await _update_cart_item_fields(db, user_id, item["product_id"], {
                    "variant_id": biggest["variant_id"],
                    "pack_id": biggest["pack_id"],
                    "unit_price_cents": biggest_cents,
                    "total_price_cents": biggest_cents * item.get("quantity", 1),
                })
                changes_made.append(f"{product['name']} → {biggest.get('label', 'pack grande')}")

        if changes_made:
            results["message"] = f"Cambiado a packs más grandes. {len(changes_made)} productos actualizados."
            results["changes"] = changes_made
        else:
            results["message"] = "Todos los productos ya están en el pack más grande."
        return results

    # ── UPGRADE ──
    if action == "upgrade":
        changes_made = []
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            premium = ProductReasoningEngine.get_premium_option(product)
            item_price = item.get("unit_price_cents", 0) / 100.0
            if premium["pack_id"] and premium["price"] > item_price:
                premium_cents = int(round(premium["price"] * 100))
                await _update_cart_item_fields(db, user_id, item["product_id"], {
                    "variant_id": premium["variant_id"],
                    "pack_id": premium["pack_id"],
                    "unit_price_cents": premium_cents,
                    "total_price_cents": premium_cents * item.get("quantity", 1),
                })
                changes_made.append(f"{product['name']} → {premium.get('label', 'premium')}")

        if changes_made:
            results["message"] = f"Actualizado a versiones premium. {len(changes_made)} productos."
            results["changes"] = changes_made
        else:
            results["message"] = "Todos los productos ya están en su versión premium."
        return results

    # ── REMOVE ALLERGEN ──
    if action == "remove_allergen":
        allergen = allergen_to_remove or (user_allergies[0] if user_allergies else None)
        if not allergen:
            return {"success": False, "message": "No sé qué alérgeno quitar. Dime cuál.", "changes": [], "savings": 0}
        removed = []
        for cp in cart_products:
            item, product = cp["cart_item"], cp["product"]
            product_allergens = [a.lower() for a in product.get("allergens", [])]
            if allergen.lower() in product_allergens:
                await _remove_cart_item(db, user_id, item["product_id"])
                removed.append(product["name"])
        if removed:
            results["message"] = f"Eliminé {len(removed)} productos con {allergen}."
            results["changes"] = removed
        else:
            results["message"] = f"No hay productos con {allergen} en tu carrito."
        return results

    # ── REMOVE EXPENSIVE ──
    if action == "remove_expensive":
        most_expensive = max(cart_items, key=lambda x: x.get("unit_price_cents", 0))
        await _remove_cart_item(db, user_id, most_expensive["product_id"])
        results["message"] = f"Eliminé {most_expensive.get('product_name', 'producto')} (el más caro)."
        results["changes"] = [most_expensive.get("product_name", "producto")]
        results["savings"] = round(most_expensive.get("unit_price_cents", 0) / 100.0, 2)
        return results

    return {"success": False, "message": "Acción no reconocida.", "changes": [], "savings": 0}


# ── Smart cart helpers ──

def _filter_by_diet_allergies(products: list, user_allergies: list, user_diet: list) -> list:
    """Filter product list by user allergies and diet preferences."""
    valid = []
    for alt in products:
        alt_allergens = {a.lower() for a in alt.get("allergens", [])}
        if alt_allergens.intersection({a.lower() for a in user_allergies}):
            continue
        valid.append(alt)
    return valid


async def _swap_cart_product(db, user_id: str, old_item: dict, new_product: dict):
    """Replace a cart item with a different product."""
    price = new_product.get("price", 0)
    price_cents = int(round(price * 100))
    image = None
    if new_product.get("images"):
        img = new_product["images"][0]
        image = img.get("url") if isinstance(img, dict) else img

    new_item = {
        "product_id": new_product["product_id"],
        "product_name": new_product["name"],
        "product_image": image,
        "seller_id": new_product.get("seller_id") or new_product.get("producer_id"),
        "seller_type": new_product.get("seller_type", "producer"),
        "quantity": old_item.get("quantity", 1),
        "unit_price_cents": price_cents,
        "total_price_cents": price_cents * old_item.get("quantity", 1),
        "variant_id": None,
        "pack_id": None,
        "added_at": datetime.now(timezone.utc),
    }
    await _replace_cart_item(db, user_id, old_item["product_id"], new_item)


# ═══════════════════════════════════════════════════════
# PREFERENCE DETECTION — Pattern-based learning from chat
# ═══════════════════════════════════════════════════════

DIET_PATTERNS = {
    "vegan": ["soy vegano", "soy vegana", "i'm vegan", "im vegan", "i am vegan", "vegano", "vegana"],
    "vegetarian": ["soy vegetariano", "soy vegetariana", "i'm vegetarian", "vegetariano", "vegetariana"],
    "keto": ["dieta keto", "keto diet", "dieta cetogénica", "cetogenica"],
    "halal": ["halal", "comida halal"],
    "gluten_free": ["sin gluten", "gluten free", "celíaco", "celiaco", "celiac"],
}

ALLERGY_PATTERNS = {
    "nuts": ["alergia a los frutos secos", "alergia a nueces", "allergic to nuts", "nut allergy", "sin frutos secos"],
    "dairy": ["alergia a lácteos", "intolerancia a la lactosa", "intolerante a la lactosa",
              "lactose intolerant", "dairy free", "sin lactosa"],
    "gluten": ["alergia al gluten", "celíaco", "celiaco", "gluten allergy", "celiac"],
    "shellfish": ["alergia a mariscos", "shellfish allergy", "sin mariscos"],
    "soy": ["alergia a la soja", "soy allergy", "sin soja"],
}

GOAL_PATTERNS = {
    "weight_loss": ["perder peso", "adelgazar", "bajar de peso", "lose weight", "weight loss"],
    "muscle_gain": ["ganar músculo", "ganar musculo", "aumentar masa muscular", "gain muscle", "build muscle"],
    "healthy_eating": ["comer sano", "comer saludable", "comer más sano", "eat healthy", "healthier"],
    "more_energy": ["más energía", "mas energia", "more energy", "boost energy"],
}


def detect_preferences(message: str, current_profile: dict) -> dict:
    """Detect diet/allergy/goal preferences from a chat message. Returns fields to update."""
    msg = message.lower().strip()
    updates = {}

    for diet, patterns in DIET_PATTERNS.items():
        if any(p in msg for p in patterns):
            current = current_profile.get("diet", [])
            if diet not in current:
                updates["diet"] = list(set(current + [diet]))

    for allergy, patterns in ALLERGY_PATTERNS.items():
        if any(p in msg for p in patterns):
            current = current_profile.get("allergies", [])
            if allergy not in current:
                updates["allergies"] = list(set(current + [allergy]))

    for goal, patterns in GOAL_PATTERNS.items():
        if any(p in msg for p in patterns):
            current = current_profile.get("goals", [])
            if goal not in current:
                updates["goals"] = list(set(current + [goal]))

    return updates


# ═══════════════════════════════════════════════════════
# PATTERN MATCHERS — Direct action detection (no LLM)
# ═══════════════════════════════════════════════════════

MEMORY_PATTERNS = {
    "forget_memory": [
        "olvida mis preferencias", "olvida todo", "borra mis preferencias",
        "resetear perfil", "borrar memoria", "olvidame", "olvídame",
        "forget my preferences", "forget about me", "reset my profile",
        "clear my memory", "delete my data", "reset memory",
    ],
    "query_memory": [
        "qué sabes de mi", "que sabes de mi", "qué recuerdas de mi", "que recuerdas de mi",
        "muéstrame mi perfil", "ver mi perfil", "mi memoria",
        "what do you know about me", "what do you remember about me",
        "show me my profile", "show my memory", "my profile",
    ],
    "update_budget_low": [
        "presupuesto bajo", "presupuesto económico", "productos baratos",
        "low budget", "cheap products", "budget friendly",
    ],
    "update_budget_premium": [
        "presupuesto alto", "presupuesto premium", "productos premium",
        "high budget", "premium products", "money is no issue",
    ],
}

CART_PATTERNS = {
    "add_all": [
        "añade todo", "añádelos", "agrégalos todos", "añade todos", "agregar todo",
        "add all", "add everything", "add them all", "add those", "add them",
    ],
    "add_first": [
        "añade el primero", "el primero", "agregar el primero",
        "add the first", "add first one", "first one",
    ],
    "add_last": [
        "añade el último", "el último", "agregar el último",
        "add the last", "add last one", "last one",
    ],
    "add_first_2": [
        "añade los dos primeros", "los primeros dos", "los dos primeros",
        "add the first two", "first two",
    ],
    "add_last_2": [
        "añade los dos últimos", "los últimos dos", "los dos últimos",
        "add the last two", "last two",
    ],
    "clear": [
        "vacía el carrito", "vaciar carrito", "limpiar carrito", "borrar carrito",
        "clear cart", "empty cart", "clear my cart",
    ],
}

SMART_CART_PATTERNS = {
    "optimize_price": [
        "optimiza mi carrito para precio", "optimizar precio", "hazlo más barato",
        "busca opciones más baratas", "ahorra dinero", "reduce el precio",
        "optimize for price", "make it cheaper", "find cheaper options", "save money",
    ],
    "optimize_health": [
        "optimiza para salud", "hazlo más saludable", "opciones más sanas",
        "busca alternativas saludables", "más healthy",
        "optimize for health", "make it healthier", "healthier options",
    ],
    "optimize_quality": [
        "optimiza para calidad", "mejor calidad", "productos mejor valorados",
        "los mejor puntuados",
        "optimize for quality", "best quality", "best rated products",
    ],
    "switch_pack": [
        "cambia a pack grande", "pack más grande", "packs grandes",
        "switch to bigger pack", "bigger packs", "larger packs",
    ],
    "upgrade": [
        "mejorar a premium", "versión premium", "opciones premium",
        "lo mejor de lo mejor",
        "upgrade to premium", "premium version", "premium options",
    ],
    "remove_expensive": [
        "quita el más caro", "elimina el más caro", "borra el más caro",
        "remove the most expensive", "remove most expensive",
    ],
    "remove_allergen_nuts": [
        "quita los que tienen frutos secos", "sin frutos secos del carrito",
        "elimina productos con nueces",
        "remove anything with nuts", "remove products with nuts", "no nuts",
    ],
    "remove_allergen_dairy": [
        "quita los lácteos", "sin lácteos del carrito", "elimina productos con lactosa",
        "remove dairy products", "remove anything with dairy", "no dairy",
    ],
    "remove_allergen_gluten": [
        "quita los que tienen gluten", "sin gluten del carrito",
        "elimina productos con gluten",
        "remove gluten products", "remove anything with gluten",
    ],
}


def match_memory_command(message: str) -> str | None:
    """Return memory action key or None."""
    msg = message.lower().strip()
    for action, patterns in MEMORY_PATTERNS.items():
        if any(p in msg for p in patterns):
            return action
    return None


def match_cart_action(message: str) -> str | None:
    """Return cart action key or None."""
    msg = message.lower().strip()
    for action, patterns in CART_PATTERNS.items():
        if any(p in msg for p in patterns):
            return action
    return None


def match_smart_cart_action(message: str) -> tuple[str | None, str | None]:
    """Return (action, allergen) or (None, None)."""
    msg = message.lower().strip()
    for action_key, patterns in SMART_CART_PATTERNS.items():
        if any(p in msg for p in patterns):
            if "allergen" in action_key:
                allergen = action_key.replace("remove_allergen_", "")
                return "remove_allergen", allergen
            return action_key, None
    return None, None


# ═══════════════════════════════════════════════════════
# BUNDLE BUILDER — Personalized product packs
# ═══════════════════════════════════════════════════════

BUNDLE_CATEGORIES = {
    "weekly_meals": ["aceites", "conservas", "especias", "legumbres", "pasta", "arroz", "salsas"],
    "breakfast": ["cereales", "mermeladas", "miel", "cafe", "te", "galletas", "pan"],
    "snacks": ["snacks", "frutos_secos", "chocolate", "galletas", "barritas"],
    "healthy_pantry": ["aceites", "legumbres", "cereales", "especias", "superfoods"],
    "gift": ["aceites", "vinos", "dulces", "chocolate", "conservas", "quesos"],
}


async def build_bundle_db(db, user_id: str, bundle_type: str,
                          max_budget: float | None = None,
                          num_items: int = 5,
                          user_country: str = "ES") -> dict:
    """Build a personalized product bundle respecting user preferences."""
    num_items = max(3, min(8, num_items))

    # Load user profile for filtering
    ai_profile = await db.ai_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    user_allergies = {a.lower() for a in ai_profile.get("allergies", [])}
    user_diet = set(ai_profile.get("diet", []))

    # Get target categories
    target_cats = BUNDLE_CATEGORIES.get(bundle_type, BUNDLE_CATEGORIES["weekly_meals"])

    # Search products across target categories
    conditions = [
        {"approved": True},
        {"$or": [
            {"available_countries": user_country},
            {"available_countries": None},
            {"available_countries": {"$exists": False}},
        ]},
        {"$or": [{"category_id": {"$regex": cat, "$options": "i"}} for cat in target_cats]},
    ]
    products = await db.products.find({"$and": conditions}, {"_id": 0}).to_list(100)

    # Filter by allergies and diet
    valid = []
    for p in products:
        p_allergens = {a.lower() for a in p.get("allergens", [])}
        if p_allergens & user_allergies:
            continue
        valid.append(p)

    if not valid:
        return {"success": False, "message": "No encontré productos suficientes para este pack.", "items": []}

    # Sort by rating and pick diverse categories
    valid.sort(key=lambda p: p.get("rating", 0), reverse=True)
    selected = []
    seen_cats = set()
    for p in valid:
        cat = p.get("category_id", "")
        if len(selected) >= num_items:
            break
        # Prefer category diversity
        if cat in seen_cats and len(selected) < num_items - 1:
            continue
        price = p.get("price", 0)
        country_prices = p.get("country_prices", {})
        if user_country in country_prices:
            price = country_prices[user_country]
        selected.append({**p, "_bundle_price": price})
        seen_cats.add(cat)

    # Fill remaining if needed
    if len(selected) < num_items:
        for p in valid:
            if len(selected) >= num_items:
                break
            if p.get("product_id") not in {s.get("product_id") for s in selected}:
                price = p.get("price", 0)
                country_prices = p.get("country_prices", {})
                if user_country in country_prices:
                    price = country_prices[user_country]
                selected.append({**p, "_bundle_price": price})

    # Apply budget filter
    if max_budget:
        selected.sort(key=lambda p: p["_bundle_price"])
        budget_items = []
        running = 0
        for p in selected:
            if running + p["_bundle_price"] <= max_budget:
                budget_items.append(p)
                running += p["_bundle_price"]
        selected = budget_items

    total = sum(p["_bundle_price"] for p in selected)
    items = []
    for p in selected:
        image = None
        if p.get("images"):
            img = p["images"][0]
            image = img.get("url") if isinstance(img, dict) else img
        items.append({
            "product_id": p.get("product_id", ""),
            "name": p.get("name", ""),
            "price": round(p["_bundle_price"], 2),
            "image_url": image,
            "category": p.get("category_id", ""),
        })

    return {
        "success": True,
        "bundle_type": bundle_type,
        "items": items,
        "total_price": round(total, 2),
        "item_count": len(items),
        "message": f"Pack de {len(items)} productos por {total:.2f}€",
    }


# ═══════════════════════════════════════════════════════
# EMOTIONAL SIGNAL DETECTION — Fear/motivation tracking
# ═══════════════════════════════════════════════════════

FEAR_PATTERNS = {
    "price": [
        "caro", "muy caro", "precio alto", "no me lo puedo permitir", "expensive",
        "too expensive", "can't afford", "demasiado", "presupuesto", "no llego",
    ],
    "quality": [
        "no me fío", "será bueno", "calidad", "es de verdad", "real", "fiable",
        "is it good", "quality", "trustworthy", "worth it", "merece la pena",
    ],
    "trust": [
        "estafa", "seguro", "de confianza", "quién lo hace", "de dónde viene",
        "scam", "safe", "reliable", "who makes", "where from",
    ],
    "choice_paralysis": [
        "no sé cuál elegir", "hay mucho", "no me aclaro", "cuál me recomiendas",
        "too many options", "can't decide", "which one", "confused",
    ],
    "health_anxiety": [
        "es sano", "tiene químicos", "aditivos", "procesado", "natural",
        "is it healthy", "chemicals", "additives", "processed", "artificial",
    ],
}

MOTIVATION_PATTERNS = {
    "family_health": [
        "mi familia", "mis hijos", "para los niños", "my family", "my kids",
        "para casa", "en casa comemos",
    ],
    "fitness": [
        "entreno", "gimnasio", "deporte", "workout", "gym", "proteína", "protein",
        "masa muscular", "muscle",
    ],
    "sustainability": [
        "ecológico", "sostenible", "planeta", "organic", "sustainable", "eco",
        "medio ambiente", "environment",
    ],
    "gourmet": [
        "gourmet", "especial", "premium", "regalo", "gift", "delicatessen",
        "para sorprender", "impresionar",
    ],
}

ABANDONMENT_SIGNALS = [
    "mejor lo pienso", "luego vuelvo", "no estoy seguro", "déjame pensarlo",
    "let me think", "i'll come back", "not sure", "maybe later", "quizá después",
]


def detect_emotional_signals(message: str, current_profile: dict) -> dict:
    """Detect fears, motivations, and abandonment from chat message.
    Returns dict of fields to update in ai_profiles."""
    msg = message.lower().strip()
    updates = {}

    # Detect fears
    current_fears = set(current_profile.get("fear_profile", []))
    for fear, patterns in FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_fears.add(fear)
    if current_fears != set(current_profile.get("fear_profile", [])):
        updates["fear_profile"] = list(current_fears)

    # Detect motivations & fear signals
    current_signals = set(current_profile.get("emotional_signals", []))
    for motivation, patterns in MOTIVATION_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"motivation:{motivation}")
    for fear, patterns in FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"fear:{fear}")
    if current_signals != set(current_profile.get("emotional_signals", [])):
        updates["emotional_signals"] = list(current_signals)

    # Detect abandonment
    if any(p in msg for p in ABANDONMENT_SIGNALS):
        if "fear:abandonment_intent" not in current_signals:
            current_signals.add("fear:abandonment_intent")
            updates["emotional_signals"] = list(current_signals)

    return updates


def compute_tone_level(interaction_count: int, humor_receptive: bool) -> int:
    """Compute tone level based on interaction count."""
    if interaction_count < 3:
        return 1
    if interaction_count < 10:
        return 2
    if interaction_count < 25:
        return 3
    if humor_receptive:
        return 4
    return 3


# ═══════════════════════════════════════════════════════
# PROACTIVE MESSAGE GENERATION
# ═══════════════════════════════════════════════════════

async def generate_proactive_message(db, user_id: str) -> str | None:
    """Generate a contextual proactive message for the user, or None."""
    profile = await db.ai_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        return None

    preferred_cats = profile.get("preferred_categories", [])

    # Check for new products in preferred categories
    if preferred_cats:
        from datetime import timedelta
        since = datetime.now(timezone.utc) - timedelta(days=7)
        new_products = await db.products.find({
            "approved": True,
            "created_at": {"$gte": since},
            "category_id": {"$in": preferred_cats},
        }, {"_id": 0, "name": 1}).to_list(3)
        if new_products:
            names = ", ".join(p["name"] for p in new_products[:2])
            return f"Han llegado novedades que te van a encantar: {names}"

    # Check days since last order
    last_order = await db.orders.find_one(
        {"user_id": user_id},
        {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)],
    )
    if last_order and last_order.get("created_at"):
        days = (datetime.now(timezone.utc) - last_order["created_at"]).days
        if days > 14:
            return "Hace tiempo que no pasas por aquí. ¿Necesitas reponer algo?"

    return None
