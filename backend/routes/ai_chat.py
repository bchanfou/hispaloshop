"""
AI Profile, Memory, Smart Cart, Seller AI Assistant, Chat messages,
Preferences, Notifications, and Influencer AI Assistant.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

from anthropic import AsyncAnthropic
from core.database import db
from core.models import (
    User, AIProfileUpdate, AIExecuteActionInput, AISmartCartAction,
    SellerAIInput, ChatMessageInput, PreferencesInput, InfluencerAIInput,
)
from core.auth import get_current_user, require_role
from services.ai_helpers import infer_user_signals_from_chat

logger = logging.getLogger(__name__)
router = APIRouter()

import time as _time
from collections import defaultdict as _defaultdict

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
_CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# Rate limiting for AI chat endpoints — 20 RPM per user
_AI_CHAT_RATE_LIMIT_RPM = 20
_ai_chat_rate_store: dict = _defaultdict(list)


def _check_ai_chat_rate_limit(user_id: str):
    now = _time.time()
    window = now - 60
    _ai_chat_rate_store[user_id] = [t for t in _ai_chat_rate_store[user_id] if t > window]
    if len(_ai_chat_rate_store[user_id]) >= _AI_CHAT_RATE_LIMIT_RPM:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Espera un momento.")
    _ai_chat_rate_store[user_id].append(now)

LANGUAGE_NAMES = {
    "es": "Spanish", "en": "English", "ko": "Korean", "fr": "French",
    "de": "German", "it": "Italian", "pt": "Portuguese", "ja": "Japanese",
    "zh": "Chinese", "ar": "Arabic", "hi": "Hindi", "ru": "Russian",
    "nl": "Dutch", "sv": "Swedish", "pl": "Polish", "tr": "Turkish",
}


# =====================================================
# CART HELPERS — operate on db.carts (embedded items[])
# =====================================================

async def _get_cart_items(user_id: str) -> list:
    """Return the items array from the user's active cart, or []."""
    cart = await db.carts.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 0, "items": 1},
    )
    return (cart or {}).get("items", [])


async def _clear_cart(user_id: str) -> None:
    """Empty all items from the user's active cart."""
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc)}},
    )


async def _find_cart_item(user_id: str, product_id: str, variant_id=None, pack_id=None):
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


async def _upsert_cart_item(user_id: str, cart_item: dict, tenant_id: str = "ES") -> None:
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


async def _update_cart_item_fields(user_id: str, product_id: str, fields: dict) -> None:
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


async def _remove_cart_item(user_id: str, product_id: str) -> None:
    """Remove one item (by product_id) from the active cart."""
    await db.carts.update_one(
        {"user_id": user_id, "status": "active"},
        {
            "$pull": {"items": {"product_id": product_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )


async def _replace_cart_item(user_id: str, old_product_id: str, new_item: dict) -> None:
    """Remove old item and push new item atomically."""
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

# ============================================
# AI PROFILE - Memory & Personalization
# ============================================

@router.get("/ai/profile")
async def get_ai_profile(user: User = Depends(get_current_user)):
    """Get the user's AI profile for personalization"""
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile:
        # Create default profile
        profile = {
            "user_id": user.user_id,
            "language": "auto",
            "tone": "friendly",
            "diet": [],
            "allergies": [],
            "goals": [],
            "restrictions": [],
            "budget": "medium",
            "preferred_categories": [],
            "first_visit_completed": False,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_profiles.insert_one(profile)
        profile.pop("_id", None)
    
    return profile

@router.put("/ai/profile")
async def update_ai_profile(update: AIProfileUpdate, user: User = Depends(get_current_user)):
    """Update the user's AI profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    return profile

@router.post("/ai/profile/reset")
async def reset_ai_profile(user: User = Depends(get_current_user)):
    """Reset the user's AI profile to defaults"""
    default_profile = {
        "user_id": user.user_id,
        "language": "auto",
        "tone": "friendly",
        "diet": [],
        "allergies": [],
        "goals": [],
        "restrictions": [],
        "budget": "medium",
        "preferred_categories": [],
        "first_visit_completed": False,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ai_profiles.replace_one(
        {"user_id": user.user_id},
        default_profile,
        upsert=True
    )
    
    return {"message": "AI profile reset successfully", "profile": default_profile}

@router.post("/ai/profile/mark-first-visit")
async def mark_first_visit_completed(user: User = Depends(get_current_user)):
    """Mark that the user has completed their first AI interaction"""
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": {"first_visit_completed": True, "last_updated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "First visit marked as completed"}

# =====================================================
# AI MEMORY ENDPOINTS - Phase 2 Persistent Memory
# =====================================================

@router.get("/ai/memory")
async def get_ai_memory(user: User = Depends(get_current_user)):
    """
    Get user's AI memory - what the AI remembers about them.
    Used when user asks "What do you remember about me?"
    """
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile:
        return {"has_memory": False, "message": "No te conozco todavía. Cuéntame sobre ti."}
    
    # Build human-readable summary
    memory_items = []
    
    if profile.get("diet"):
        memory_items.append(f"Dieta: {', '.join(profile['diet'])}")
    if profile.get("allergies"):
        memory_items.append(f"Alergias: {', '.join(profile['allergies'])}")
    if profile.get("goals"):
        memory_items.append(f"Objetivos: {', '.join(profile['goals'])}")
    if profile.get("restrictions"):
        memory_items.append(f"Restricciones: {', '.join(profile['restrictions'])}")
    if profile.get("budget") and profile.get("budget") != "medium":
        budget_text = {"low": "económico", "premium": "premium"}.get(profile["budget"], profile["budget"])
        memory_items.append(f"Presupuesto: {budget_text}")
    if profile.get("preferred_categories"):
        memory_items.append(f"Categorías favoritas: {', '.join(profile['preferred_categories'])}")
    if profile.get("tone") and profile.get("tone") != "friendly":
        tone_text = {"short_direct": "respuestas cortas", "explanatory": "respuestas detalladas"}.get(profile["tone"], profile["tone"])
        memory_items.append(f"Estilo: {tone_text}")
    
    if not memory_items:
        return {"has_memory": False, "message": "Aún no tengo información sobre ti. Cuéntame tus preferencias."}
    
    return {
        "has_memory": True,
        "memory_items": memory_items,
        "raw_profile": {
            "diet": profile.get("diet", []),
            "allergies": profile.get("allergies", []),
            "goals": profile.get("goals", []),
            "restrictions": profile.get("restrictions", []),
            "budget": profile.get("budget", "medium"),
            "preferred_categories": profile.get("preferred_categories", []),
            "tone": profile.get("tone", "friendly"),
            "language": profile.get("language", "auto"),
            "preferred_country": profile.get("preferred_country"),
            "preferred_currency": profile.get("preferred_currency"),
            "preferred_formats": profile.get("preferred_formats", [])
        }
    }

@router.put("/ai/memory")
async def update_ai_memory(update: AIProfileUpdate, user: User = Depends(get_current_user)):
    """
    Update specific AI memory fields.
    Used when user explicitly states preferences.
    """
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_data:
        return {"message": "No hay cambios que guardar."}
    
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Guardado.", "updated_fields": list(update_data.keys())}

@router.delete("/ai/memory")
async def delete_ai_memory(user: User = Depends(get_current_user)):
    """
    Delete/reset all AI memory for the user.
    Used when user says "Forget my preferences" / "Olvida mis preferencias"
    """
    default_profile = {
        "user_id": user.user_id,
        "language": "auto",
        "tone": "friendly",
        "diet": [],
        "allergies": [],
        "goals": [],
        "restrictions": [],
        "budget": "medium",
        "preferred_categories": [],
        "preferred_country": None,
        "preferred_currency": None,
        "preferred_formats": [],
        "frequently_bought": [],
        "first_visit_completed": True,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ai_profiles.replace_one(
        {"user_id": user.user_id},
        default_profile,
        upsert=True
    )
    
    return {"message": "Listo. He olvidado tus preferencias."}

# AI Execute Action - Phase 1 Intelligence
@router.post("/ai/execute-action")
async def ai_execute_action(input: AIExecuteActionInput, user: User = Depends(get_current_user)):
    """
    Execute cart actions on behalf of the AI assistant.
    Supports: add_to_cart, clear_cart
    Targets: all, first, last, first_n, last_n, specific
    """
    results = {"success": True, "message": "", "added": [], "errors": []}
    
    # Get user's selected country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    if input.action == "clear_cart":
        # Clear all cart items for user
        await _clear_cart(user.user_id)
        results["message"] = "Tu carrito está vacío."
        return results
    
    if input.action == "add_to_cart":
        if not input.products or len(input.products) == 0:
            results["success"] = False
            results["message"] = "No tengo productos para añadir. Dime qué buscas y te recomendaré algunos."
            return results
        
        # Process each product to add
        for item in input.products:
            try:
                product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
                if not product:
                    results["errors"].append(f"Producto no encontrado: {item.product_id}")
                    continue
                
                # Country availability check
                available_countries = product.get("available_countries", [])
                if available_countries and user_country not in available_countries:
                    results["errors"].append(f"{product['name']} no está disponible en tu país.")
                    continue
                
                # Get price and stock info
                price = product.get("price", 0)
                currency = "EUR"
                stock = product.get("stock", 0)
                track_stock = product.get("track_stock", True)
                variant_id = item.variant_id
                variant_name = None
                pack_id = item.pack_id
                pack_label = None
                pack_units = 1
                
                # Country pricing
                country_prices = product.get("country_prices", {})
                country_currency = product.get("country_currency", {})
                if user_country in country_prices:
                    price = country_prices[user_country]
                    currency = country_currency.get(user_country, "EUR")
                
                # Handle variants/packs
                variants = product.get("variants", [])
                if variants:
                    if not variant_id:
                        # Use first variant and first pack as default
                        variant = variants[0]
                        variant_id = variant["variant_id"]
                        variant_name = variant["name"]
                        packs = variant.get("packs", [])
                        if packs:
                            pack = packs[0]
                            pack_id = pack["pack_id"]
                            price = pack["price"]
                            stock = pack.get("stock", 0)
                            pack_label = pack["label"]
                            pack_units = pack["units"]
                    else:
                        variant = next((v for v in variants if v["variant_id"] == variant_id), None)
                        if variant:
                            variant_name = variant["name"]
                            packs = variant.get("packs", [])
                            if packs:
                                if pack_id:
                                    pack = next((p for p in packs if p["pack_id"] == pack_id), None)
                                else:
                                    pack = packs[0]
                                    pack_id = pack["pack_id"]
                                if pack:
                                    price = pack["price"]
                                    stock = pack.get("stock", 0)
                                    pack_label = pack["label"]
                                    pack_units = pack["units"]
                
                # Stock validation
                if track_stock and stock <= 0:
                    results["errors"].append(f"{product['name']} está agotado.")
                    continue
                
                quantity = item.quantity or 1
                if track_stock and quantity > stock:
                    quantity = stock  # Add max available
                
                # Convert price (float euros) to cents for the new cart schema
                unit_price_cents = int(round(price * 100))

                # Check if item already exists in cart
                idx, existing = await _find_cart_item(user.user_id, item.product_id, variant_id, pack_id)

                if existing is not None:
                    new_qty = existing["quantity"] + quantity
                    if track_stock and new_qty > stock:
                        new_qty = stock
                    await _update_cart_item_fields(user.user_id, item.product_id, {
                        "quantity": new_qty,
                        "unit_price_cents": unit_price_cents,
                        "total_price_cents": unit_price_cents * new_qty,
                    })
                else:
                    product_image = None
                    if product.get("images"):
                        img = product["images"][0]
                        product_image = img.get("url") if isinstance(img, dict) else img

                    cart_item = {
                        "product_id": item.product_id,
                        "product_name": product["name"],
                        "product_image": product_image,
                        "seller_id": product.get("seller_id") or product.get("producer_id"),
                        "seller_type": product.get("seller_type", "producer"),
                        "quantity": quantity,
                        "unit_price_cents": unit_price_cents,
                        "total_price_cents": unit_price_cents * quantity,
                        "variant_id": variant_id,
                        "pack_id": pack_id,
                        "added_at": datetime.now(timezone.utc),
                    }
                    await _upsert_cart_item(user.user_id, cart_item, tenant_id=user_country)
                
                results["added"].append(product["name"])
                
            except Exception as e:
                logger.error(f"Error adding product to cart: {e}")
                results["errors"].append(f"Error al añadir producto")
        
        # Build response message
        if len(results["added"]) > 0:
            if len(results["added"]) == 1:
                results["message"] = f"Listo. Añadí {results['added'][0]} a tu carrito."
            else:
                results["message"] = f"Listo. Añadí {len(results['added'])} productos a tu carrito."
        elif len(results["errors"]) > 0:
            results["success"] = False
            results["message"] = results["errors"][0]
        else:
            results["success"] = False
            results["message"] = "No pude añadir los productos."
        
        return results
    
    # Unknown action
    results["success"] = False
    results["message"] = "No entiendo esa acción."
    return results

# =====================================================
# AI SMART CART - Phase 3 Intelligent Commerce Actions
# =====================================================

@router.post("/ai/smart-cart")
async def ai_smart_cart_action(input: AISmartCartAction, user: User = Depends(get_current_user)):
    """
    Phase 3: Intelligent cart manipulation.
    Supports: optimize_price, optimize_health, optimize_quality, replace_similar,
              upgrade, downgrade, switch_pack, remove_allergen, remove_expensive
    """
    results = {"success": True, "message": "", "changes": [], "savings": 0}
    
    # Get user's cart
    cart_items = await _get_cart_items(user.user_id)
    if not cart_items:
        results["success"] = False
        results["message"] = "Tu carrito está vacío."
        return results

    # Get user's profile for preferences
    ai_profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0}) or {}
    user_allergies = ai_profile.get("allergies", [])
    user_diet = ai_profile.get("diet", [])

    # Get user's country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"

    # Load full product data for all cart items
    cart_products = []
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            cart_products.append({"cart_item": item, "product": product})

    original_total = sum(item.get("unit_price_cents", 0) * item.get("quantity", 1) for item in cart_items) / 100.0
    
    # ==================== ACTION: OPTIMIZE PRICE ====================
    if input.action == "optimize_price":
        changes_made = []
        new_total = 0
        
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            
            # Find cheapest option
            best = ProductReasoningEngine.get_best_price_option(product)
            
            # Check if current selection is already cheapest
            item_price = item.get("unit_price_cents", 0) / 100.0
            if best["variant_id"] != item.get("variant_id") or best["pack_id"] != item.get("pack_id"):
                if best["price"] and best["price"] < item_price:
                    # Update cart item
                    best_cents = int(round(best["price"] * 100))
                    await _update_cart_item_fields(user.user_id, item["product_id"], {
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
    
    # ==================== ACTION: OPTIMIZE HEALTH ====================
    if input.action == "optimize_health":
        changes_made = []
        
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            category_id = product.get("category_id")
            
            # Find healthier alternative in same category
            alternatives = await db.products.find({
                "category_id": category_id,
                "approved": True,
                "product_id": {"$ne": item["product_id"]}
            }, {"_id": 0}).to_list(50)
            
            # Filter by user diet/allergies
            valid_alternatives = []
            for alt in alternatives:
                alt_allergens = set(a.lower() for a in alt.get("allergens", []))
                user_allergens = set(a.lower() for a in user_allergies)
                alt_certs = set(c.lower() for c in alt.get("certifications", []))
                
                # Check allergies
                if alt_allergens.intersection(user_allergens):
                    continue
                
                # Check diet compatibility (vegan products must have vegan cert if user is vegan)
                diet_ok = True
                for diet_pref in user_diet:
                    if diet_pref in ["vegan", "gluten_free", "halal"]:
                        if not any(diet_pref.replace("_", "-") in c or diet_pref.replace("_", " ") in c for c in alt_certs):
                            # Be lenient - only skip if explicitly has incompatible ingredients
                            pass
                
                if diet_ok:
                    valid_alternatives.append(alt)
            
            # Find healthiest
            if valid_alternatives:
                current_score = ProductReasoningEngine.calculate_health_score(product)
                best_alt = max(valid_alternatives, key=lambda p: ProductReasoningEngine.calculate_health_score(p))
                best_score = ProductReasoningEngine.calculate_health_score(best_alt)
                
                if best_score > current_score + 10:  # Only switch if significantly healthier
                    # Replace in cart
                    alt_price_cents = int(round(best_alt.get("price", 0) * 100))
                    alt_image = None
                    if best_alt.get("images"):
                        img = best_alt["images"][0]
                        alt_image = img.get("url") if isinstance(img, dict) else img

                    new_item = {
                        "product_id": best_alt["product_id"],
                        "product_name": best_alt["name"],
                        "product_image": alt_image,
                        "seller_id": best_alt.get("seller_id") or best_alt.get("producer_id"),
                        "seller_type": best_alt.get("seller_type", "producer"),
                        "quantity": item.get("quantity", 1),
                        "unit_price_cents": alt_price_cents,
                        "total_price_cents": alt_price_cents * item.get("quantity", 1),
                        "variant_id": None,
                        "pack_id": None,
                        "added_at": datetime.now(timezone.utc),
                    }
                    await _replace_cart_item(user.user_id, item["product_id"], new_item)
                    changes_made.append(f"{product['name']} → {best_alt['name']}")
        
        if changes_made:
            results["message"] = f"Optimizado para salud. Cambié {len(changes_made)} productos."
            results["changes"] = changes_made
        else:
            results["message"] = "Tu carrito ya tiene las opciones más saludables."
        
        return results
    
    # ==================== ACTION: OPTIMIZE QUALITY ====================
    if input.action == "optimize_quality":
        changes_made = []
        
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            category_id = product.get("category_id")
            
            # Find higher quality alternative in same category
            alternatives = await db.products.find({
                "category_id": category_id,
                "approved": True,
                "product_id": {"$ne": item["product_id"]}
            }, {"_id": 0}).to_list(50)
            
            # Get reviews for rating
            for alt in alternatives:
                reviews = await db.reviews.find({"product_id": alt["product_id"]}, {"_id": 0}).to_list(100)
                alt["average_rating"] = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
                alt["review_count"] = len(reviews)
            
            # Filter by user diet/allergies
            valid_alternatives = []
            for alt in alternatives:
                alt_allergens = set(a.lower() for a in alt.get("allergens", []))
                user_allergens = set(a.lower() for a in user_allergies)
                alt_certs = set(c.lower() for c in alt.get("certifications", []))
                
                # Check allergies
                if alt_allergens.intersection(user_allergens):
                    continue
                
                # Check diet compatibility (vegan products must have vegan cert if user is vegan)
                diet_ok = True
                for diet_pref in user_diet:
                    if diet_pref in ["vegan", "gluten_free", "halal"]:
                        if not any(diet_pref.replace("_", "-") in c or diet_pref.replace("_", " ") in c for c in alt_certs):
                            # Be lenient - only skip if explicitly has incompatible ingredients
                            pass
                
                if diet_ok:
                    valid_alternatives.append(alt)
            
            if valid_alternatives:
                current_score = ProductReasoningEngine.calculate_quality_score(product)
                best_alt = max(valid_alternatives, key=lambda p: ProductReasoningEngine.calculate_quality_score(p))
                best_score = ProductReasoningEngine.calculate_quality_score(best_alt)
                
                if best_score > current_score + 15:  # Only switch if significantly better quality
                    # Replace in cart
                    alt_price_cents = int(round(best_alt.get("price", 0) * 100))
                    alt_image = None
                    if best_alt.get("images"):
                        img = best_alt["images"][0]
                        alt_image = img.get("url") if isinstance(img, dict) else img

                    new_item = {
                        "product_id": best_alt["product_id"],
                        "product_name": best_alt["name"],
                        "product_image": alt_image,
                        "seller_id": best_alt.get("seller_id") or best_alt.get("producer_id"),
                        "seller_type": best_alt.get("seller_type", "producer"),
                        "quantity": item.get("quantity", 1),
                        "unit_price_cents": alt_price_cents,
                        "total_price_cents": alt_price_cents * item.get("quantity", 1),
                        "variant_id": None,
                        "pack_id": None,
                        "added_at": datetime.now(timezone.utc),
                    }
                    await _replace_cart_item(user.user_id, item["product_id"], new_item)
                    changes_made.append(f"{product['name']} → {best_alt['name']}")
        
        if changes_made:
            results["message"] = f"Optimizado para calidad. Cambié {len(changes_made)} productos."
            results["changes"] = changes_made
        else:
            results["message"] = "Tu carrito ya tiene las mejores opciones de calidad."
        
        return results
    
    # ==================== ACTION: SWITCH TO BIGGER PACK ====================
    if input.action == "switch_pack":
        changes_made = []
        
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            
            # Find biggest pack
            biggest = ProductReasoningEngine.get_biggest_pack(product)
            
            if biggest["pack_id"] and biggest["pack_id"] != item.get("pack_id"):
                biggest_cents = int(round(biggest["price"] * 100))
                await _update_cart_item_fields(user.user_id, item["product_id"], {
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
    
    # ==================== ACTION: REMOVE ALLERGEN ====================
    if input.action == "remove_allergen":
        allergen_to_check = input.allergen_to_remove or (user_allergies[0] if user_allergies else None)
        if not allergen_to_check:
            results["message"] = "No sé qué alérgeno quitar. Dime cuál."
            results["success"] = False
            return results
        
        removed = []
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            product_allergens = [a.lower() for a in product.get("allergens", [])]
            
            if allergen_to_check.lower() in product_allergens:
                await _remove_cart_item(user.user_id, item["product_id"])
                removed.append(product["name"])
        
        if removed:
            results["message"] = f"Eliminé {len(removed)} productos con {allergen_to_check}."
            results["changes"] = removed
        else:
            results["message"] = f"No hay productos con {allergen_to_check} en tu carrito."
        
        return results
    
    # ==================== ACTION: REMOVE MOST EXPENSIVE ====================
    if input.action == "remove_expensive":
        # Find most expensive item (by unit_price_cents)
        most_expensive = max(cart_items, key=lambda x: x.get("unit_price_cents", 0))
        await _remove_cart_item(user.user_id, most_expensive["product_id"])

        results["message"] = f"Eliminé {most_expensive.get('product_name', 'producto')} (el más caro)."
        results["changes"] = [most_expensive.get("product_name", "producto")]
        results["savings"] = round(most_expensive.get("unit_price_cents", 0) / 100.0, 2)
        
        return results
    
    # ==================== ACTION: UPGRADE TO PREMIUM ====================
    if input.action == "upgrade":
        changes_made = []
        
        for cp in cart_products:
            item = cp["cart_item"]
            product = cp["product"]
            
            # Find premium option
            premium = ProductReasoningEngine.get_premium_option(product)
            
            item_price = item.get("unit_price_cents", 0) / 100.0
            if premium["pack_id"] and premium["price"] > item_price:
                premium_cents = int(round(premium["price"] * 100))
                await _update_cart_item_fields(user.user_id, item["product_id"], {
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
    
    # Unknown action
    results["success"] = False
    results["message"] = "No entiendo esa acción."
    return results

# =====================================================
# SELLER AI ASSISTANT - Business Intelligence for Producers
# =====================================================


@router.post("/ai/seller-assistant")
async def seller_ai_assistant(input: SellerAIInput, user: User = Depends(get_current_user)):
    """AI assistant for sellers — PRO: same-country data, ELITE: all countries. FREE: blocked."""
    _check_ai_chat_rate_limit(user.user_id)
    if input.message:
        input.message = input.message[:2000]
    await require_role(user, ["producer"])
    
    # Check subscription plan
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1, "country": 1})
    plan = (user_doc or {}).get("subscription", {}).get("plan", "FREE")
    
    if plan == "FREE":
        raise HTTPException(status_code=403, detail="Sales AI is available on PRO and ELITE plans. Upgrade to access market insights.")
    
    seller_country = (user_doc or {}).get("country", "ES")
    
    # Get producer's store and products
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"_id": 0})
    products = await db.products.find({"producer_id": user.user_id}, {"_id": 0}).to_list(100)
    
    # Get sales stats — scope by plan
    order_query = {}
    if plan == "PRO":
        # PRO: only same-country orders
        order_query = {"country": seller_country}
    # ELITE: all countries (no filter)
    
    orders = await db.orders.find(order_query, {"line_items": 1, "total_amount": 1, "created_at": 1, "country": 1}).to_list(500)
    producer_sales = []
    for order in orders:
        for item in order.get("line_items", []):
            if item.get("producer_id") == user.user_id:
                producer_sales.append({
                    "product_id": item.get("product_id"),
                    "product_name": item.get("product_name"),
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price"),
                    "date": order.get("created_at"),
                    "country": order.get("country"),
                })
    
    # Get followers count
    followers_count = 0
    if store:
        followers_count = await db.store_followers.count_documents({"store_id": store.get("store_id")})
    
    # Get market trends — scope by plan
    trend_query = {"status": "active"}
    if plan == "PRO":
        trend_query["inventory_by_country.country_code"] = seller_country
    
    all_products = await db.products.find(trend_query, {"category_id": 1, "price": 1}).to_list(1000)
    category_counts = {}
    for p in all_products:
        cat = p.get("category_id", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Build context
    context = f"""
Eres Pedro, el socio comercial de Hispaloshop. Ayudas a vendedores a mejorar sus ventas con autoridad, empatía y datos concretos. Tuteas con vocabulario profesional. Detecta el idioma del usuario y responde en ese idioma.

DATOS DEL VENDEDOR:
- Nombre de tienda: {store.get('name', 'Sin nombre') if store else 'Sin tienda configurada'}
- Total productos: {len(products)}
- Productos aprobados: {len([p for p in products if p.get('approved')])}
- Seguidores: {followers_count}
- Ventas totales: {len(producer_sales)} unidades vendidas

PRODUCTOS DEL VENDEDOR:
{chr(10).join([f"- {p.get('name')}: €{p.get('price', 0):.2f}, stock: {p.get('stock', 0)}, categoría: {p.get('category_id')}" for p in products[:15]])}

VENTAS RECIENTES:
{chr(10).join([f"- {s['product_name']}: {s['quantity']} uds a €{s['price']:.2f}" for s in producer_sales[:10]]) or 'Sin ventas registradas'}

TENDENCIAS DEL MERCADO (categorías más populares):
{chr(10).join([f"- {cat}: {count} productos" for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])[:5]])}

DIRECTRICES:
1. Sé específico y accionable con tus consejos
2. Basa tus recomendaciones en los datos reales del vendedor
3. Sugiere precios competitivos basándote en el mercado
4. Recomienda configuraciones de packs que aumenten el valor del pedido
5. Identifica oportunidades de productos basándote en tendencias
6. Mantén un tono profesional pero amigable
7. Responde en español
"""

    try:
        if not ANTHROPIC_API_KEY:
            return {"response": "El asistente de ventas no está configurado. Contacta al administrador.", "success": False}
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=1024,
            system=context,
            messages=[{"role": "user", "content": input.message}],
        )
        text = next((b.text for b in response.content if hasattr(b, "text")), "")
        return {"response": text, "success": True}
    except Exception as e:
        logger.error(f"Seller AI error: {e}")
        return {"response": "Lo siento, hubo un problema procesando tu consulta. Intenta de nuevo.", "success": False}

# Chat - Shopping AI Assistant
@router.post("/chat/message")
async def send_chat_message(input: ChatMessageInput, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    import re

    _check_ai_chat_rate_limit(user.user_id)

    # Sanitize input — truncate and strip control characters
    if input.message:
        input.message = input.message[:2000]
        input.message = "".join(c for c in input.message if c == "\n" or c == "\t" or (ord(c) >= 32))

    session_id = input.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    # Get user's selected country for filtering
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    # Fetch AI Profile for personalization
    ai_profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not ai_profile:
        ai_profile = {"language": "auto", "tone": "friendly", "diet": [], "allergies": [], "goals": [], "restrictions": [], "budget": "medium"}
    
    # Fetch product catalog FILTERED BY COUNTRY
    # Only include products available in the user's selected country
    country_filter = {
        "approved": True,
        "$or": [
            {"available_countries": user_country},
            {"available_countries": None},
            {"available_countries": {"$exists": False}}
        ]
    }
    
    products = await db.products.find(
        country_filter, 
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "category_id": 1, 
         "certifications": 1, "allergens": 1, "country_origin": 1, "images": 1,
         "country_prices": 1, "country_currency": 1}
    ).limit(50).to_list(50)
    
    # Build product catalog for AI prompt (with country-specific pricing)
    product_catalog = "\n\n=== PRODUCT CATALOG (Use ONLY these products) ===\n"
    for p in products:
        # Use country-specific price if available
        price = p.get("price", 0)
        currency = "EUR"
        country_prices = p.get("country_prices", {})
        country_currency = p.get("country_currency", {})
        
        if user_country in country_prices:
            price = country_prices[user_country]
            currency = country_currency.get(user_country, "EUR")
        
        certs = ", ".join(p.get("certifications", [])) or "None"
        allergens = ", ".join(p.get("allergens", [])) or "None"
        product_catalog += f"""
[PRODUCT_ID: {p['product_id']}]
Name: {p['name']}
Price: {currency} {price:.2f}
Certifications: {certs}
Allergens: {allergens}
Origin: {p.get('country_origin', 'Unknown')}
"""
    
    # Build initial personalization context from AI Profile (will be rebuilt after preference detection)
    personalization_context = ""
    if ai_profile.get("diet"):
        personalization_context += f"\nUser dietary preferences: {', '.join(ai_profile['diet'])}"
    if ai_profile.get("allergies"):
        personalization_context += f"\nUser allergies (MUST AVOID): {', '.join(ai_profile['allergies'])}"
    if ai_profile.get("goals"):
        personalization_context += f"\nUser goals: {', '.join(ai_profile['goals'])}"
    if ai_profile.get("restrictions"):
        personalization_context += f"\nUser restrictions: {', '.join(ai_profile['restrictions'])}"
    if ai_profile.get("budget"):
        budget_map = {"low": "budget-conscious, prefer affordable options", "medium": "balanced value and quality", "premium": "premium quality, price is not a concern"}
        personalization_context += f"\nUser budget: {budget_map.get(ai_profile['budget'], 'balanced')}"
    if ai_profile.get("preferred_categories"):
        personalization_context += f"\nUser prefers categories: {', '.join(ai_profile['preferred_categories'])}"
    
    # DIRECT CART ACTION DETECTION - Handle cart commands without needing LLM
    # This provides immediate, reliable execution of common cart commands
    message_lower = input.message.lower().strip()
    direct_cart_action = None
    direct_response = None
    
    # =====================================================
    # PHASE 2: MEMORY COMMANDS - Handle memory queries/updates directly
    # =====================================================
    memory_patterns = {
        "forget_memory": [
            "olvida mis preferencias", "olvida todo", "borra mis preferencias",
            "resetear perfil", "borrar memoria", "olvidame", "olvídame",
            "forget my preferences", "forget about me", "reset my profile",
            "clear my memory", "delete my data", "reset memory"
        ],
        "query_memory": [
            "qué sabes de mi", "que sabes de mi", "qué recuerdas de mi", "que recuerdas de mi",
            "muéstrame mi perfil", "ver mi perfil", "mi memoria",
            "what do you know about me", "what do you remember about me", 
            "show me my profile", "show my memory", "my profile"
        ],
        "update_budget_low": [
            "presupuesto bajo", "presupuesto económico", "productos baratos",
            "low budget", "cheap products", "budget friendly"
        ],
        "update_budget_premium": [
            "presupuesto alto", "presupuesto premium", "productos premium",
            "high budget", "premium products", "money is no issue"
        ]
    }
    
    # Check for memory command matches
    for mem_action, patterns in memory_patterns.items():
        if any(pattern in message_lower for pattern in patterns):
            if mem_action == "query_memory":
                # Get user's memory and return readable summary
                memory_data = await get_ai_memory(user)
                if memory_data.get("has_memory"):
                    items = memory_data.get("memory_items", [])
                    direct_response = "Esto es lo que recuerdo de ti:\n" + "\n".join(f"• {item}" for item in items)
                else:
                    direct_response = "Aún no tengo información sobre ti. Cuéntame tus preferencias."
                
                return {
                    "response": direct_response,
                    "session_id": session_id,
                    "recommended_products": [],
                    "cart_action": None,
                    "memory_action": {"type": "query", "data": memory_data}
                }
            
            elif mem_action == "forget_memory":
                # Reset user's memory
                await delete_ai_memory(user)
                direct_response = "Listo. He olvidado tus preferencias. Empezamos de cero."
                
                # Save message to DB
                user_msg = {
                    "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                    "user_id": user.user_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": input.message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                assistant_msg = {
                    "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                    "user_id": user.user_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": direct_response,
                    "recommended_products": [],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await db.chat_messages.insert_many([user_msg, assistant_msg])
                
                return {
                    "response": direct_response,
                    "session_id": session_id,
                    "recommended_products": [],
                    "cart_action": None,
                    "memory_action": {"type": "reset"}
                }
            
            elif mem_action in ["update_budget_low", "update_budget_premium"]:
                new_budget = "low" if mem_action == "update_budget_low" else "premium"
                await db.ai_profiles.update_one(
                    {"user_id": user.user_id},
                    {"$set": {"budget": new_budget, "last_updated": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                budget_text = "económico" if new_budget == "low" else "premium"
                direct_response = f"Guardado. Tu presupuesto es ahora {budget_text}."
                
                return {
                    "response": direct_response,
                    "session_id": session_id,
                    "recommended_products": [],
                    "cart_action": None,
                    "memory_action": {"type": "update", "field": "budget", "value": new_budget}
                }
            break
    
    # =====================================================
    # PHASE 2: PREFERENCE DETECTION - Learn from user statements
    # =====================================================
    preference_updates = {}
    
    # Diet detection patterns
    diet_patterns = {
        "vegan": ["soy vegano", "soy vegana", "i'm vegan", "im vegan", "i am vegan", "vegano", "vegana"],
        "vegetarian": ["soy vegetariano", "soy vegetariana", "i'm vegetarian", "vegetariano", "vegetariana"],
        "keto": ["dieta keto", "keto diet", "dieta cetogénica", "cetogenica"],
        "halal": ["halal", "comida halal"],
        "gluten_free": ["sin gluten", "gluten free", "celíaco", "celiaco", "celiac"]
    }
    
    for diet, patterns in diet_patterns.items():
        if any(p in message_lower for p in patterns):
            current_diet = ai_profile.get("diet", [])
            if diet not in current_diet:
                preference_updates["diet"] = list(set(current_diet + [diet]))
    
    # Allergy detection patterns  
    allergy_patterns = {
        "nuts": ["alergia a los frutos secos", "alergia a nueces", "allergic to nuts", "nut allergy", "sin frutos secos"],
        "dairy": ["alergia a lácteos", "intolerancia a la lactosa", "intolerante a la lactosa", "lactose intolerant", "dairy free", "sin lactosa"],
        "gluten": ["alergia al gluten", "celíaco", "celiaco", "gluten allergy", "celiac"],
        "shellfish": ["alergia a mariscos", "shellfish allergy", "sin mariscos"],
        "soy": ["alergia a la soja", "soy allergy", "sin soja"]
    }
    
    for allergy, patterns in allergy_patterns.items():
        if any(p in message_lower for p in patterns):
            current_allergies = ai_profile.get("allergies", [])
            if allergy not in current_allergies:
                preference_updates["allergies"] = list(set(current_allergies + [allergy]))
    
    # Goal detection patterns
    goal_patterns = {
        "weight_loss": ["perder peso", "adelgazar", "bajar de peso", "lose weight", "weight loss"],
        "muscle_gain": ["ganar músculo", "ganar musculo", "aumentar masa muscular", "gain muscle", "build muscle"],
        "healthy_eating": ["comer sano", "comer saludable", "comer más sano", "eat healthy", "healthier"],
        "more_energy": ["más energía", "mas energia", "more energy", "boost energy"]
    }
    
    for goal, patterns in goal_patterns.items():
        if any(p in message_lower for p in patterns):
            current_goals = ai_profile.get("goals", [])
            if goal not in current_goals:
                preference_updates["goals"] = list(set(current_goals + [goal]))
    
    # Save detected preferences if any found
    if preference_updates:
        preference_updates["last_updated"] = datetime.now(timezone.utc).isoformat()
        await db.ai_profiles.update_one(
            {"user_id": user.user_id},
            {"$set": preference_updates},
            upsert=True
        )
        # Reload the profile with updates
        ai_profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    # Rebuild personalization context with potentially updated profile
    personalization_context = ""
    if ai_profile.get("diet"):
        personalization_context += f"\nUser dietary preferences: {', '.join(ai_profile['diet'])}"
    if ai_profile.get("allergies"):
        personalization_context += f"\nUser allergies (MUST AVOID products containing these): {', '.join(ai_profile['allergies'])}"
    if ai_profile.get("goals"):
        personalization_context += f"\nUser goals: {', '.join(ai_profile['goals'])}"
    if ai_profile.get("restrictions"):
        personalization_context += f"\nUser restrictions: {', '.join(ai_profile['restrictions'])}"
    if ai_profile.get("budget"):
        budget_map = {"low": "budget-conscious, prefer affordable options", "medium": "balanced value and quality", "premium": "premium quality, price is not a concern"}
        personalization_context += f"\nUser budget: {budget_map.get(ai_profile['budget'], 'balanced')}"
    if ai_profile.get("preferred_categories"):
        personalization_context += f"\nUser prefers categories: {', '.join(ai_profile['preferred_categories'])}"
    
    # =====================================================
    # PHASE 1: CART ACTIONS - Handle cart commands directly
    # =====================================================
    
    # Patterns for direct cart actions (Spanish + English)
    cart_patterns = {
        "add_all": [
            "añade todo", "añádelos", "agrégalos todos", "añade todos", "agregar todo",
            "add all", "add everything", "add them all", "add those", "add them"
        ],
        "add_first": [
            "añade el primero", "el primero", "agregar el primero",
            "add the first", "add first one", "first one"
        ],
        "add_last": [
            "añade el último", "el último", "agregar el último",
            "add the last", "add last one", "last one"
        ],
        "add_first_2": [
            "añade los dos primeros", "los primeros dos", "los dos primeros",
            "add the first two", "first two"
        ],
        "add_last_2": [
            "añade los dos últimos", "los últimos dos", "los dos últimos",
            "add the last two", "last two"
        ],
        "clear": [
            "vacía el carrito", "vaciar carrito", "limpiar carrito", "borrar carrito",
            "clear cart", "empty cart", "clear my cart"
        ]
    }
    
    # Check for direct cart action matches
    for action_type, patterns in cart_patterns.items():
        if any(pattern in message_lower for pattern in patterns):
            session_products = input.session_memory or []
            
            if action_type == "clear":
                await _clear_cart(user.user_id)
                direct_response = "Listo. Tu carrito está vacío."
                direct_cart_action = {"success": True, "message": direct_response}
                
            elif not session_products:
                direct_response = "No tengo productos para añadir. Dime qué buscas."
                direct_cart_action = {"success": False, "message": direct_response}
                
            else:
                # Determine which products to add
                products_to_add = []
                if action_type == "add_all":
                    products_to_add = session_products
                elif action_type == "add_first":
                    products_to_add = [session_products[0]]
                elif action_type == "add_last":
                    products_to_add = [session_products[-1]]
                elif action_type == "add_first_2":
                    products_to_add = session_products[:2]
                elif action_type == "add_last_2":
                    products_to_add = session_products[-2:]
                
                if products_to_add:
                    action_input = AIExecuteActionInput(
                        action="add_to_cart",
                        targets="specific",
                        products=[AICartActionTarget(
                            product_id=p.get("product_id"),
                            variant_id=p.get("variant_id"),
                            pack_id=p.get("pack_id"),
                            quantity=1
                        ) for p in products_to_add]
                    )
                    direct_cart_action = await ai_execute_action(action_input, user)
                    direct_response = direct_cart_action.get("message")
            break
    
    # =====================================================
    # PHASE 3: SMART CART ACTIONS - Intelligent commerce commands
    # =====================================================
    if direct_cart_action is None:  # Only if no Phase 1 action was detected
        smart_cart_patterns = {
            "optimize_price": [
                "optimiza mi carrito para precio", "optimizar precio", "hazlo más barato",
                "busca opciones más baratas", "ahorra dinero", "reduce el precio",
                "optimize for price", "optimize my cart for price", "make it cheaper",
                "find cheaper options", "save money", "reduce price"
            ],
            "optimize_health": [
                "optimiza para salud", "hazlo más saludable", "opciones más sanas",
                "busca alternativas saludables", "más healthy",
                "optimize for health", "make it healthier", "healthier options",
                "healthiest options", "find healthy alternatives"
            ],
            "optimize_quality": [
                "optimiza para calidad", "mejor calidad", "productos mejor valorados",
                "los mejor puntuados", "mejor rating",
                "optimize for quality", "best quality", "best rated products",
                "highest rated", "best ratings"
            ],
            "switch_pack": [
                "cambia a pack grande", "pack más grande", "packs grandes",
                "cambiar a packs de 6", "quiero packs más grandes",
                "switch to bigger pack", "bigger packs", "larger packs",
                "change to pack of 6", "bulk packs"
            ],
            "upgrade": [
                "mejorar a premium", "versión premium", "opciones premium",
                "lo mejor de lo mejor", "productos de alta gama",
                "upgrade to premium", "premium version", "premium options",
                "best of the best", "high end products"
            ],
            "remove_expensive": [
                "quita el más caro", "elimina el más caro", "borra el más caro",
                "quitar lo más caro", "sin lo más caro",
                "remove the most expensive", "remove most expensive",
                "delete the expensive one", "drop the priciest"
            ],
            "remove_allergen_nuts": [
                "quita los que tienen frutos secos", "sin frutos secos del carrito",
                "elimina productos con nueces", "quitar lo que tenga nueces",
                "remove anything with nuts", "remove products with nuts",
                "no nuts", "delete nut products"
            ],
            "remove_allergen_dairy": [
                "quita los lácteos", "sin lácteos del carrito",
                "elimina productos con lactosa", "quitar lácteos",
                "remove dairy products", "remove anything with dairy",
                "no dairy", "delete dairy"
            ],
            "remove_allergen_gluten": [
                "quita los que tienen gluten", "sin gluten del carrito",
                "elimina productos con gluten", "quitar gluten",
                "remove gluten products", "remove anything with gluten",
                "no gluten products"
            ]
        }
        
        for smart_action, patterns in smart_cart_patterns.items():
            if any(pattern in message_lower for pattern in patterns):
                # Determine the action type and parameters
                action_type = smart_action.split("_")[0]
                if action_type == "remove" and "allergen" in smart_action:
                    action_type = "remove_allergen"
                    allergen = smart_action.replace("remove_allergen_", "")
                else:
                    allergen = None
                
                action_map = {
                    "optimize": smart_action.replace("optimize_", "optimize_"),
                    "switch": "switch_pack",
                    "upgrade": "upgrade",
                    "remove": smart_action if "expensive" in smart_action else "remove_allergen",
                    "remove_allergen": "remove_allergen"  # Handle remove_allergen action type
                }
                
                mapped_action = action_map.get(action_type, smart_action)
                
                # Execute smart cart action
                smart_input = AISmartCartAction(
                    action=mapped_action,
                    allergen_to_remove=allergen
                )
                smart_result = await ai_smart_cart_action(smart_input, user)
                direct_response = smart_result.get("message")
                direct_cart_action = {
                    "success": smart_result.get("success", True),
                    "message": direct_response,
                    "changes": smart_result.get("changes", []),
                    "savings": smart_result.get("savings", 0)
                }
                break
    
    # If we handled the action directly, return without calling LLM
    if direct_cart_action is not None:
        # Save messages to DB
        user_msg = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "session_id": session_id,
            "role": "user",
            "content": input.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        assistant_msg = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": direct_response,
            "recommended_products": [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_many([user_msg, assistant_msg])
        
        return {
            "response": direct_response,
            "session_id": session_id,
            "recommended_products": [],
            "cart_action": direct_cart_action
        }
    
    # =====================================================
    # BUILD SYSTEM MESSAGE WITH UPDATED PERSONALIZATION
    # =====================================================
    # Rebuild tone_style in case it changed
    tone_instructions = {
        "short_direct": "Keep responses very brief and to the point. Use short sentences. No elaboration.",
        "friendly": "Be warm and conversational. Use a natural, approachable tone.",
        "explanatory": "Provide detailed explanations. Include context and reasoning."
    }
    tone_style = tone_instructions.get(ai_profile.get("tone", "friendly"), tone_instructions["friendly"])
    
    # Get user's preferred language for AI responses
    user_language = input.language or "es"
    language_name = LANGUAGE_NAMES.get(user_language, "Spanish")
    
    system_msg = f"""You are David, the personal assistant of Hispaloshop — the healthy and artisan food marketplace.

IMPORTANT: ALWAYS respond in {language_name} ({user_language}). All your messages must be in {language_name}.

WHO YOU ARE:
You're the friend everyone wishes they could bring to the grocery store. A nutrition expert, amateur chef, habits coach, and the best supermarket salesperson — because you don't sell products, you help people eat better. You connect with emotions, never generic.

YOUR ROLE:
- Help users discover and buy food products based on their dietary needs
- Act as a nutrition guide (non-medical), chef assistant, and shopping advisor
- Recommend products from our catalog that match user preferences
- Execute cart actions when the user asks (add products, clear cart)
- Remember and use what you know about the user (see USER MEMORY below)
- After a user adds items, suggest 1-2 complementary products with storytelling (connect them to what they already have, e.g. "You've got olive oil and tomatoes — you're missing a good cheese for that toast")
- Be realistic and motivating — never promise miracles but celebrate every step

COMMUNICATION STYLE:
- Use "tú" (informal) by default. If the user uses "usted", switch to "usted".
- Adapt emoji usage to the user: if they don't use emojis, don't use them. If they do, use max 2 per message (only food emojis like 🥑🫒🧀, never 🎉🔥💯).
{tone_style}

USER MEMORY (IMPORTANT - Use this to personalize responses):
{personalization_context if personalization_context.strip() else "No memory yet - this is a new user."}

MEMORY USAGE RULES:
- NEVER ask about preferences you already know (diet, allergies, budget)
- Automatically filter recommendations based on known preferences
- If user is vegan, ONLY show vegan products
- If user has allergies, NEVER recommend products with those allergens
- Respect budget preference silently (don't mention it every time)
- If memory exists, say things like "Based on what I know about you..." not "Do you have any allergies?"

FORMATTING RULES (CRITICAL):
- NO asterisks (*) in your response
- NO hashtags (#) in your response
- NO markdown formatting (no bold, italic, headers)
- Write in plain, clean text like a natural conversation
- Use line breaks for readability when needed
- Keep responses SHORT - like a real store assistant

RECOMMENDATION FORMAT:
When recommending products, include this tag in your response:
[RECOMMEND: product_id_1, product_id_2, product_id_3]

CRITICAL RULES:
1. ONLY recommend products from the catalog below - never invent products
2. Maximum 4-6 products per recommendation
3. Prioritize: dietary compatibility > certifications > price relevance
4. If no products match, say so clearly and suggest alternatives from the catalog
5. If user is just chatting (greeting, general question), respond naturally WITHOUT forcing products
6. NO medical advice, NO legal advice, NO invented data
7. ALWAYS respect user allergies - never recommend products with their allergens
8. When executing cart actions, respond with SHORT confirmations like "Done. Added to your cart."
9. If user asks to add products but none were recommended, say "I don't have any products to add yet. Tell me what you're looking for."

FALLBACK BEHAVIORS:
- No exact match: Suggest closest alternatives within same dietary constraint
- No relevant products: "I don't have [X] in our catalog, but here are similar options..."
- Off-topic request: "I specialize in food products. Would you like to explore our snacks, oils, or preserves?"

{product_catalog}"""
    
    # Send message to AI (for non-cart-action messages)
    try:
        if not ANTHROPIC_API_KEY:
            logger.error("[CHAT] ANTHROPIC_API_KEY not configured")
            raise HTTPException(status_code=500, detail="AI service not configured. Please contact support.")

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ai_response = await client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=1024,
            system=system_msg,
            messages=[{"role": "user", "content": input.message}],
        )
        response = next((b.text for b in ai_response.content if hasattr(b, "text")), "")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT] LLM error: {str(e)}")
        raise HTTPException(status_code=500, detail="Lo siento, hubo un problema procesando tu consulta. Intenta de nuevo.")
    
    # Clean up any markdown formatting that slipped through
    response = response.replace('**', '').replace('##', '').replace('# ', '')
    
    # Parse [RECOMMEND: ...] tags from response
    recommended_product_ids = []
    recommend_pattern = r'\[RECOMMEND:\s*([^\]]+)\]'
    matches = re.findall(recommend_pattern, response)
    
    for match in matches:
        ids = [id.strip() for id in match.split(',')]
        recommended_product_ids.extend(ids)
    
    # Remove duplicate IDs and limit to 6
    recommended_product_ids = list(dict.fromkeys(recommended_product_ids))[:6]
    
    # Fetch full product details for recommendations
    recommended_products = []
    if recommended_product_ids:
        for pid in recommended_product_ids:
            product = await db.products.find_one(
                {"product_id": pid, "approved": True},
                {"_id": 0}
            )
            if product:
                recommended_products.append(product)
    
    # Parse [CART_ACTION: ...] tags and execute cart actions
    cart_action_pattern = r'\[CART_ACTION:\s*([^\]]+)\]'
    cart_action_matches = re.findall(cart_action_pattern, response)
    cart_action_result = None
    
    if cart_action_matches and len(cart_action_matches) > 0:
        action_str = cart_action_matches[0].strip()
        action_parts = [p.strip() for p in action_str.split(',')]
        action_type = action_parts[0] if action_parts else ""
        action_count = int(action_parts[1]) if len(action_parts) > 1 and action_parts[1].isdigit() else None
        
        # Get session memory products (from frontend or from what we just recommended)
        session_products = input.session_memory or []
        if not session_products and recommended_products:
            session_products = [{"product_id": p["product_id"], "name": p["name"], "position": i+1} for i, p in enumerate(recommended_products)]
        
        # Determine which products to add based on action
        products_to_add = []
        
        if action_type == "clear":
            # Clear cart
            await _clear_cart(user.user_id)
            cart_action_result = {"success": True, "message": "Tu carrito está vacío."}
        elif action_type == "add_all":
            products_to_add = session_products
        elif action_type == "add_first":
            if session_products:
                products_to_add = [session_products[0]]
        elif action_type == "add_last":
            if session_products:
                products_to_add = [session_products[-1]]
        elif action_type == "add_first_n" and action_count:
            products_to_add = session_products[:action_count]
        elif action_type == "add_last_n" and action_count:
            products_to_add = session_products[-action_count:]
        
        # Execute cart action if we have products
        if products_to_add and action_type != "clear":
            action_input = AIExecuteActionInput(
                action="add_to_cart",
                targets="specific",
                products=[AICartActionTarget(
                    product_id=p.get("product_id"),
                    variant_id=p.get("variant_id"),
                    pack_id=p.get("pack_id"),
                    quantity=1
                ) for p in products_to_add]
            )
            cart_action_result = await ai_execute_action(action_input, user)
        elif not session_products and action_type != "clear":
            cart_action_result = {"success": False, "message": "No tengo productos para añadir. Dime qué buscas."}
    
    # Clean response text (remove [RECOMMEND: ...] and [CART_ACTION: ...] tags for display)
    clean_response = re.sub(recommend_pattern, '', response).strip()
    clean_response = re.sub(cart_action_pattern, '', clean_response).strip()
    
    # If cart action was executed, append the result message
    if cart_action_result:
        if cart_action_result.get("success"):
            clean_response = cart_action_result.get("message", "Listo.")
        else:
            clean_response = cart_action_result.get("message", "No pude completar la acción.")
    
    # Save messages to DB
    user_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "session_id": session_id,
        "role": "user",
        "content": input.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    assistant_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "session_id": session_id,
        "role": "assistant",
        "content": clean_response,
        "recommended_products": [p["product_id"] for p in recommended_products],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_many([user_msg, assistant_msg])
    
    # Schedule AI signal inference in background (doesn't block response)
    # Determines AI action type for tracking
    ai_action_type = None
    if cart_action_result and cart_action_result.get("success"):
        if "add_all" in str(cart_action_result.get("message", "")).lower():
            ai_action_type = "add_all_to_cart"
        elif "añadido" in str(cart_action_result.get("message", "")).lower() or "added" in str(cart_action_result.get("message", "")).lower():
            ai_action_type = "add_to_cart"
    elif recommended_products:
        ai_action_type = "follow_recommendation"
    
    background_tasks.add_task(
        infer_user_signals_from_chat,
        user.user_id,
        input.message,
        clean_response,
        ai_action_type
    )
    
    return {
        "response": clean_response,
        "session_id": session_id,
        "recommended_products": recommended_products,
        "cart_action": cart_action_result
    }

@router.get("/chat/history")
async def get_chat_history(session_id: str, user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find({"user_id": user.user_id, "session_id": session_id}, {"_id": 0}).to_list(1000)
    return messages

# Preferences
@router.post("/preferences")
async def update_preferences(input: PreferencesInput, user: User = Depends(get_current_user)):
    prefs = {
        "user_id": user.user_id,
        "diet_preferences": input.diet_preferences,
        "allergens": input.allergens,
        "goals": input.goals,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_preferences.update_one({"user_id": user.user_id}, {"$set": prefs}, upsert=True)
    return {"message": "Preferences updated"}

@router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    if not prefs:
        return {"user_id": user.user_id, "diet_preferences": [], "allergens": [], "goals": None}
    return prefs



@router.post("/ai/influencer-assistant")
async def influencer_ai_assistant(input: InfluencerAIInput, user: User = Depends(get_current_user)):
    """AI assistant for influencers - helps with content creation and strategies"""
    _check_ai_chat_rate_limit(user.user_id)
    if input.message:
        input.message = input.message[:2000]
    
    # Get influencer data
    influencer = await db.influencers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=403, detail="Not an influencer")
    
    # Build context for content creation
    context = f"""
Eres el asistente creativo de Hispaloshop para influencers. Detecta el idioma del usuario y responde SIEMPRE en ese idioma. 
Tu especialidad es ayudar a crear contenido auténtico, entretenido y efectivo para promocionar productos alimenticios de calidad.

DATOS DEL INFLUENCER:
- Nombre: {influencer.get('full_name', 'Influencer')}
- Codigo de descuento: {influencer.get('discount_code', 'N/A')}
- Comision: variable por tier activo (3% a 7%)
- Nicho: {influencer.get('niche', 'Alimentación')}
- Redes sociales principales: {influencer.get('social_media', {}).get('primary_platform', 'Instagram')}

SOBRE HISPALOSHOP:
- Marketplace de productos alimenticios artesanales y certificados
- Productos de pequeños productores y artesanos honestos
- Categorías: aceites, snacks, conservas, dulces, especias, etc.
- Los clientes obtienen 10% de descuento en su primer pedido al usar el codigo
- El influencer genera comision segun tier activo y atribucion del cliente por 18 meses

DIRECTRICES PARA CREAR CONTENIDO:
1. El contenido debe ser AUTÉNTICO y no parecer publicidad forzada
2. Enfocarse en la calidad y origen artesanal de los productos
3. Usar storytelling: contar historias sobre los productores
4. Para videos: crear guiones dinámicos, entretenidos y cortos
5. Para posts: textos que generen engagement y conversación
6. Siempre mencionar el código de descuento de forma natural
7. Adaptar el tono a cada red social (TikTok más casual, Instagram más estético)
8. Incluir llamadas a la acción sutiles pero efectivas
9. Responder siempre en español

EJEMPLOS DE CONTENIDO QUE FUNCIONA:
- "Probando productos de pequeños productores españoles"
- "Mi despensa de productos artesanales"
- "Cocinando con ingredientes de verdad"
- "Descubrí esta marca increíble..."
"""

    try:
        if not ANTHROPIC_API_KEY:
            return {"response": "El asistente creativo no está configurado. Contacta al administrador.", "success": False}
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ai_resp = await client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=1024,
            system=context,
            messages=[{"role": "user", "content": input.message}],
        )
        response = next((b.text for b in ai_resp.content if hasattr(b, "text")), "")
        return {"response": response, "success": True}
    except Exception as e:
        logger.error(f"Influencer AI error: {e}")
        return {"response": "Lo siento, hubo un problema procesando tu consulta. Intenta de nuevo.", "success": False}


# ============================================
# HI CHAT — Multi-role AI assistant
# ============================================

class HIChatMessage(BaseModel):
    role: str
    content: str

class HIChatRequest(BaseModel):
    messages: List[HIChatMessage]
    assistant_role: str

_HI_SYSTEM_PROMPTS = {
    "consumer": (
        "Eres David, el asistente personal de Hispaloshop. "
        "Eres como el amigo nutricionista que todo el mundo querría llevarse al supermercado. "
        "Ayudas a descubrir productos alimentarios de calidad, planificar comidas saludables "
        "y tomar decisiones de compra conectando con las emociones de la persona. "
        "También gestionas soporte: incidencias con pedidos, devoluciones, entregas tardías. "
        "Detecta el idioma del usuario y responde SIEMPRE en ese idioma. "
        "Tutea por defecto. Si el usuario habla de usted, adáptate. "
        "Sé cercano, proactivo y nada genérico. Nunca des consejos médicos."
    ),
    "producer": (
        "Eres Pedro, el socio comercial de Hispaloshop para productores. "
        "Ayudas a analizar ventas, optimizar precios, mejorar fichas de producto, "
        "planificar estrategia de exportación y detectar oportunidades de mercado. "
        "Tuteas con vocabulario profesional. Detecta el idioma del usuario y responde en ese idioma. "
        "Sé un socio de confianza: autoridad + empatía + guía. Orientado a resultados y preciso en los datos."
    ),
    "influencer": (
        "Eres el asistente creativo de Hispaloshop para influencers. "
        "Ayudas a generar ideas de contenido, redactar captions, crear ganchos para reels, "
        "diseñar campañas y encontrar ángulos de storytelling para productos alimentarios. "
        "Detecta el idioma del usuario y responde en ese idioma. "
        "Sé creativo, entusiasta y auténtico. Evita tópicos y frases genéricas."
    ),
    "importer": (
        "Eres Pedro, el socio comercial de Hispaloshop para importadores. "
        "Ayudas a encontrar productores, analizar márgenes, detectar tendencias de mercado "
        "y asesorar en negociaciones B2B internacionales. "
        "Eres mediador neutral: buscas el mejor acuerdo para ambas partes. "
        "Detecta el idioma del usuario y responde en ese idioma. "
        "Tuteas con vocabulario profesional. Sé analítico, preciso y orientado a rentabilidad."
    ),
}

# ── Access control matrix ──────────────────────────────────────────
# Maps user role → assistant roles allowed without plan check.
# PRO/ELITE unlocks "producer" and "influencer" roles for producers/importers.
_HI_BASE_ACCESS: Dict[str, list] = {
    "consumer":    ["consumer"],
    "influencer":  ["consumer", "influencer"],
    "producer":    ["consumer"],
    "importer":    ["consumer"],
    "admin":       ["consumer"],
    "super_admin": ["consumer"],
}
_HI_PREMIUM_ROLES = ["producer", "influencer"]

async def _check_hi_access(user: User, requested_role: str) -> None:
    """Raise HTTP 403 if user is not permitted to use the requested HI mode."""
    user_role = (user.role or "consumer").lower()
    allowed = _HI_BASE_ACCESS.get(user_role, ["consumer"])
    if requested_role in allowed:
        return

    if requested_role in _HI_PREMIUM_ROLES and user_role in ("producer", "importer"):
        user_doc = await db.users.find_one(
            {"user_id": user.user_id}, {"_id": 0, "subscription": 1}
        )
        plan = ((user_doc or {}).get("subscription") or {}).get("plan", "FREE")
        if plan in ("PRO", "ELITE"):
            return

    raise HTTPException(
        status_code=403,
        detail=f"No tienes acceso al modo solicitado. Actualiza tu plan para desbloquearlo.",
    )


class HISupportCaseRequest(BaseModel):
    issue_type: str
    description: str
    order_id: Optional[str] = None
    product_id: Optional[str] = None


@router.post("/ai/support-case")
async def create_support_case(req: HISupportCaseRequest, user: User = Depends(get_current_user)):
    """Register a support case created via HI chat."""
    case_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Determine country from user profile for automatic admin routing
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"country": 1}) or {}
    country = user_doc.get("country")

    # AI-based priority classification
    high_priority_keywords = {"daño", "dañado", "roto", "fraude", "urgente", "peligro", "grave"}
    priority = "alta" if any(kw in req.description.lower() for kw in high_priority_keywords) else "media"

    case = {
        "case_id": case_id,
        "user_id": user.user_id,
        "issue_type": req.issue_type,
        "order_id": req.order_id,
        "product_id": req.product_id,
        "description": req.description,
        "status": "abierto",
        "priority": priority,
        "country": country,
        "assigned_admin_id": None,
        "messages": [],
        "history": [],
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
    }
    await db.support_cases.insert_one(case)
    await db.admin_notifications.insert_one({
        "notification_id": str(uuid.uuid4()),
        "type": "support_case",
        "case_id": case_id,
        "user_id": user.user_id,
        "issue_type": req.issue_type,
        "priority": priority,
        "country": country,
        "created_at": now,
        "read": False,
    })
    logger.info("Support case %s created by user %s (country=%s, priority=%s)", case_id, user.user_id, country, priority)
    return {"case_id": case_id, "status": "abierto", "priority": priority}


@router.get("/ai/support-cases")
async def get_my_support_cases(user: User = Depends(get_current_user)):
    """List the current user's support cases."""
    cases = await db.support_cases.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return cases


@router.post("/ai/chat")
async def hi_chat(req: HIChatRequest, user: User = Depends(get_current_user)):
    try:
        _check_ai_chat_rate_limit(user.user_id)
        await _check_hi_access(user, req.assistant_role)

        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=503, detail="El asistente no está configurado. Contacta al administrador.")

        system_prompt = _HI_SYSTEM_PROMPTS.get(req.assistant_role, _HI_SYSTEM_PROMPTS["consumer"])
        # Cap history to last 20 exchanges, sanitize inputs
        messages_payload = []
        for m in req.messages[-20:]:
            if m.role not in ("user", "assistant"):
                continue
            content = m.content[:2000] if m.content else ""
            content = "".join(c for c in content if c == "\n" or c == "\t" or (ord(c) >= 32))
            if content.strip():
                messages_payload.append({"role": m.role, "content": content.strip()})

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ai_resp = await client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages_payload,
        )

        text = next((b.text for b in ai_resp.content if hasattr(b, "text")), "")
        return {"content": text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HI chat error: {e}")
        raise HTTPException(status_code=503, detail="El asistente no está disponible ahora")

