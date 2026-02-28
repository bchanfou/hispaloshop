"""
AI routes: profile, memory, execute actions, smart cart.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from ..core.config import db, logger
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter(prefix="/ai", tags=["AI"])


class AIProfileUpdate(BaseModel):
    language: Optional[str] = None
    tone: Optional[str] = None
    diet: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    restrictions: Optional[List[str]] = None
    budget: Optional[str] = None
    preferred_categories: Optional[List[str]] = None
    preferred_country: Optional[str] = None
    preferred_currency: Optional[str] = None


class AICartActionTarget(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = 1


class AIExecuteActionInput(BaseModel):
    action: str
    targets: Optional[str] = "all"
    products: Optional[List[AICartActionTarget]] = None


class AISmartCartAction(BaseModel):
    action: str
    criteria: Optional[str] = None


# Profile endpoints
@router.get("/profile")
async def get_ai_profile(user: User = Depends(get_current_user)):
    """Get the user's AI profile for personalization."""
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile:
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


@router.put("/profile")
async def update_ai_profile(update: AIProfileUpdate, user: User = Depends(get_current_user)):
    """Update the user's AI profile."""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    return profile


@router.post("/profile/reset")
async def reset_ai_profile(user: User = Depends(get_current_user)):
    """Reset the user's AI profile to defaults."""
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


@router.post("/profile/mark-first-visit")
async def mark_first_visit_completed(user: User = Depends(get_current_user)):
    """Mark that the user has completed their first AI interaction."""
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": {"first_visit_completed": True, "last_updated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "First visit marked as completed"}


# Memory endpoints
@router.get("/memory")
async def get_ai_memory(user: User = Depends(get_current_user)):
    """Get user's AI memory - what the AI remembers about them."""
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile:
        return {"has_memory": False, "message": "No te conozco todavía. Cuéntame sobre ti."}
    
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
            "language": profile.get("language", "auto")
        }
    }


@router.put("/memory")
async def update_ai_memory(update: AIProfileUpdate, user: User = Depends(get_current_user)):
    """Update specific AI memory fields."""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        return {"message": "No hay cambios que guardar."}
    
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Guardado.", "updated_fields": list(update_data.keys())}


@router.delete("/memory")
async def delete_ai_memory(user: User = Depends(get_current_user)):
    """Delete/reset all AI memory for the user."""
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
        "first_visit_completed": True,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ai_profiles.replace_one(
        {"user_id": user.user_id},
        default_profile,
        upsert=True
    )
    
    return {"message": "Listo. He olvidado tus preferencias."}


# Execute Action endpoint
@router.post("/execute-action")
async def ai_execute_action(input: AIExecuteActionInput, user: User = Depends(get_current_user)):
    """Execute cart actions on behalf of the AI assistant."""
    results = {"success": True, "message": "", "added": [], "errors": []}
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    if input.action == "clear_cart":
        await db.cart_items.delete_many({"user_id": user.user_id})
        results["message"] = "Tu carrito está vacío."
        return results
    
    if input.action == "add_to_cart":
        if not input.products:
            results["success"] = False
            results["message"] = "No products specified"
            return results
        
        for prod in input.products:
            try:
                product = await db.products.find_one(
                    {"product_id": prod.product_id},
                    {"_id": 0}
                )
                
                if not product:
                    results["errors"].append(f"Product {prod.product_id} not found")
                    continue
                
                # Country availability check
                available_countries = product.get("available_countries", [])
                if available_countries and user_country not in available_countries:
                    results["errors"].append(f"{product['name']} not available in {user_country}")
                    continue
                
                price = product["price"]
                currency = "EUR"
                
                # Country-specific pricing
                if user_country in product.get("country_prices", {}):
                    price = product["country_prices"][user_country]
                    currency = product.get("country_currency", {}).get(user_country, "EUR")
                
                # Handle variants/packs
                variant_name = None
                pack_label = None
                
                if prod.variant_id:
                    variants = product.get("variants", [])
                    variant = next((v for v in variants if v["variant_id"] == prod.variant_id), None)
                    if variant:
                        variant_name = variant["name"]
                        if prod.pack_id:
                            packs = variant.get("packs", [])
                            pack = next((p for p in packs if p["pack_id"] == prod.pack_id), None)
                            if pack:
                                price = pack["price"]
                                pack_label = pack["label"]
                
                # Add to cart
                cart_query = {"user_id": user.user_id, "product_id": prod.product_id}
                if prod.variant_id:
                    cart_query["variant_id"] = prod.variant_id
                if prod.pack_id:
                    cart_query["pack_id"] = prod.pack_id
                
                existing = await db.cart_items.find_one(cart_query, {"_id": 0})
                
                if existing:
                    await db.cart_items.update_one(
                        cart_query,
                        {"$inc": {"quantity": prod.quantity}}
                    )
                else:
                    cart_item = {
                        "user_id": user.user_id,
                        "product_id": prod.product_id,
                        "product_name": product["name"],
                        "producer_id": product.get("producer_id"),
                        "price": price,
                        "currency": currency,
                        "quantity": prod.quantity,
                        "image": product["images"][0] if product.get("images") else None,
                        "variant_id": prod.variant_id,
                        "variant_name": variant_name,
                        "pack_id": prod.pack_id,
                        "pack_label": pack_label,
                        "added_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.cart_items.insert_one(cart_item)
                
                results["added"].append({
                    "product_id": prod.product_id,
                    "name": product["name"],
                    "quantity": prod.quantity
                })
                
            except Exception as e:
                logger.error(f"[AI ACTION] Error adding {prod.product_id}: {e}")
                results["errors"].append(str(e))
        
        if results["added"]:
            count = len(results["added"])
            results["message"] = f"Añadido {'s' if count > 1 else ''} {count} producto{'s' if count > 1 else ''} al carrito."
        else:
            results["success"] = False
            results["message"] = "No se pudo añadir ningún producto."
    
    return results


# Smart Cart Action
@router.post("/smart-cart")
async def ai_smart_cart_action(input: AISmartCartAction, user: User = Depends(get_current_user)):
    """Execute smart cart actions based on criteria."""
    results = {"success": True, "message": "", "affected": []}
    
    if input.action == "remove_expensive":
        cart_items = await db.cart_items.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        if not cart_items:
            return {"success": False, "message": "Tu carrito está vacío."}
        
        # Find most expensive
        most_expensive = max(cart_items, key=lambda x: x["price"])
        
        await db.cart_items.delete_one({
            "user_id": user.user_id,
            "product_id": most_expensive["product_id"]
        })
        
        results["message"] = f"He eliminado {most_expensive['product_name']} (el más caro)."
        results["affected"].append(most_expensive["product_id"])
        
    elif input.action == "remove_last":
        cart_items = await db.cart_items.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("added_at", -1).limit(1).to_list(1)
        
        if not cart_items:
            return {"success": False, "message": "Tu carrito está vacío."}
        
        last_item = cart_items[0]
        await db.cart_items.delete_one({
            "user_id": user.user_id,
            "product_id": last_item["product_id"]
        })
        
        results["message"] = f"He eliminado {last_item['product_name']} (el último añadido)."
        results["affected"].append(last_item["product_id"])
        
    elif input.action == "double_all":
        await db.cart_items.update_many(
            {"user_id": user.user_id},
            {"$mul": {"quantity": 2}}
        )
        results["message"] = "He duplicado las cantidades de todos los productos."
        
    else:
        results["success"] = False
        results["message"] = f"Acción no reconocida: {input.action}"
    
    return results
