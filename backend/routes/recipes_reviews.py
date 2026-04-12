"""
Recipe & Review routes: CRUD for recipes and product reviews.
"""
import uuid
import logging
from typing import Optional, List, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, Query
import re

from core.database import db
from core.auth import get_current_user, get_optional_user, require_role
from core.models import User, ReviewCreateInput
from utils.images import extract_product_image
from services.translation import TranslationService

logger = logging.getLogger(__name__)


def _extract_product_image(product: dict) -> str | None:
    images = product.get("images")
    if images and isinstance(images, list) and len(images) > 0:
        first = images[0]
        return first.get("url") if isinstance(first, dict) else first if isinstance(first, str) else None
    return product.get("image_url") or product.get("image")

router = APIRouter()


def _ingredient_tokens(name: str) -> List[str]:
    return re.findall(r"[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}", (name or "").lower())


async def _match_ingredient_product(name: str):
    tokens = _ingredient_tokens(name)
    if not tokens:
        return None

    regex = "|".join(re.escape(token) for token in tokens[:4])
    product = await db.products.find_one(
        {
            "$and": [
                {"$or": [{"status": "active"}, {"approved": True}]},
                {
                    "$or": [
                        {"name": {"$regex": regex, "$options": "i"}},
                        {"description": {"$regex": regex, "$options": "i"}},
                        {"ingredients": {"$regex": regex, "$options": "i"}},
                    ]
                },
            ]
        },
        {"_id": 0},
        sort=[("units_sold", -1), ("created_at", -1)],
    )
    return product


async def _record_recipe_signal(event_type: str, payload: Dict[str, object], user_id: Optional[str] = None):
    try:
        await db.intelligence_signals.insert_one(
            {
                "signal_id": f"sig_{uuid.uuid4().hex[:14]}",
                "event_type": event_type,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **payload,
            }
        )
    except Exception as exc:
        logger.warning("[RECIPES] signal write failed: %s", exc)


async def _build_shopping_list(recipe: Dict[str, object], servings_multiplier: float = 1.0):
    items = []
    for ing in recipe.get("ingredients", []):
        product = None
        pid = ing.get("product_id")
        if pid:
            product = await db.products.find_one({"product_id": pid, "$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]}, {"_id": 0})
        if not product and ing.get("name"):
            product = await _match_ingredient_product(ing.get("name", ""))
        if not product:
            continue

        raw_qty = ing.get("quantity_value") or ing.get("quantity") or 1
        try:
            quantity = max(1, int(round(float(raw_qty) * servings_multiplier)))
        except (ValueError, TypeError):
            quantity = 1
        items.append(
            {
                "product_id": product.get("product_id"),
                "name": product.get("name", ing.get("name", "")),
                "price": product.get("price", 0),
                "image": extract_product_image(product),
                "quantity": quantity,
                "producer_id": product.get("producer_id"),
                "ingredient_name": ing.get("name", ""),
            }
        )
    return items

@router.post("/recipes")
async def create_recipe(request: Request, user: User = Depends(get_current_user)):
    """Create a recipe with ingredients mapped to products."""
    body = await request.json()
    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not body.get("ingredients"):
        raise HTTPException(status_code=400, detail="At least one ingredient is required")
    if not body.get("steps"):
        raise HTTPException(status_code=400, detail="At least one step is required")
    ingredients = []
    for ingredient in body.get("ingredients", []):
        item = dict(ingredient)
        if not item.get("product_id") and item.get("name"):
            matched_product = await _match_ingredient_product(item.get("name", ""))
            if matched_product:
                item["product_id"] = matched_product.get("product_id")
                item["suggested_product"] = {
                    "product_id": matched_product.get("product_id"),
                    "name": matched_product.get("name", ""),
                    "price": matched_product.get("price", 0),
                    "image": extract_product_image(matched_product),
                }
                await _record_recipe_signal(
                    "recipe_ingredient_match",
                    {
                        "recipe_title": body.get("title", ""),
                        "ingredient_name": item.get("name", ""),
                        "product_id": matched_product.get("product_id"),
                        "producer_id": matched_product.get("producer_id"),
                    },
                    user.user_id,
                )
        ingredients.append(item)

    # Section 3.5b — sync AI pre-filter on title + description + cover (raises 403)
    _recipe_text = " ".join([
        body.get("title", "") or "",
        body.get("description", "") or "",
    ]).strip()
    from services.moderation_wiring import run_moderation_check
    try:
        _ai_decision_rc, _ai_summary_rc = await run_moderation_check(
            user=user, text=_recipe_text,
            image_urls=[body.get("image_url")] if body.get("image_url") else None,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("[MOD_PRE] recipe degraded fallback: %s", exc)
        _ai_decision_rc, _ai_summary_rc = "allow", None

    recipe_id = f"recipe_{uuid.uuid4().hex[:12]}"
    # Validate meal_type if provided
    meal_type = body.get("meal_type")
    if meal_type and meal_type not in ("breakfast", "lunch", "snack", "dinner"):
        meal_type = None

    recipe = {
        "recipe_id": recipe_id,
        "title": body.get("title", ""),
        "title_i18n": body.get("title_i18n", {}),
        "description": body.get("description", ""),
        "author_id": user.user_id,
        "author_name": user.name,
        "difficulty": body.get("difficulty", "easy"),
        "time_minutes": body.get("time_minutes", 30),
        "servings": body.get("servings", 4),
        "meal_type": meal_type,
        "ingredients": ingredients,
        "steps": body.get("steps", []),
        "image_url": body.get("image_url"),
        "tags": body.get("tags", []),
        "likes_count": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recipes.insert_one(recipe)
    recipe.pop("_id", None)

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision_rc == "flag":
        try:
            from services.moderation_wiring import insert_auto_report
            await insert_auto_report(
                content_type="recipe",
                content_id=recipe_id,
                content_author_id=user.user_id,
                content_country_code=(getattr(user, "country", None) or "ES").upper(),
                ai_summary=_ai_summary_rc,
            )
        except Exception as exc:
            logger.warning("[MOD_PRE] recipe auto-report failed: %s", exc)

    return recipe

@router.get("/recipes")
async def get_recipes(
    request: Request,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    hashtag: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    exclude: Optional[str] = None,
    saved: Optional[bool] = None,
):
    """Get recipes with filters. `exclude` omits a single recipe by recipe_id or ObjectId."""
    from bson import ObjectId

    query = {"status": "active"}

    # Filter to user's saved recipes only
    if saved:
        current_user = await get_optional_user(request)
        if not current_user:
            return []
        saved_docs = await db.saved_recipes.find(
            {"user_id": current_user.user_id},
            {"_id": 0, "recipe_id": 1},
        ).to_list(200)
        saved_ids = [d["recipe_id"] for d in saved_docs]
        if not saved_ids:
            return []
        query["recipe_id"] = {"$in": saved_ids}

    if q:
        query["title"] = {"$regex": re.escape(q), "$options": "i"}
    effective_tag = tag or hashtag
    if effective_tag:
        query["tags"] = {"$regex": re.escape(effective_tag), "$options": "i"}
    if difficulty:
        query["difficulty"] = difficulty
    if exclude:
        exclude_filter: dict = {}
        try:
            exclude_filter = {"_id": {"$ne": ObjectId(exclude)}}
        except Exception:
            exclude_filter = {"recipe_id": {"$ne": exclude}}
        query.update(exclude_filter)
    try:
        recipes = await db.recipes.find(query, {"_id": 0}).sort("likes_count", -1).skip(skip).limit(limit).to_list(limit)
    except Exception as exc:
        logger.warning(f"[RECIPES] Falling back to empty list due to data source error: {exc}")
        return []

    # Hydrate is_saved for authenticated user (R-01)
    current_user = await get_optional_user(request)
    recipe_ids = [r.get("recipe_id") for r in recipes if r.get("recipe_id")]

    if current_user and recipe_ids:
        saved_rows = await db.saved_recipes.find(
            {"user_id": current_user.user_id, "recipe_id": {"$in": recipe_ids}},
            {"_id": 0, "recipe_id": 1},
        ).to_list(len(recipe_ids))
        saved_set = {r["recipe_id"] for r in saved_rows}
        for r in recipes:
            r["is_saved"] = r.get("recipe_id") in saved_set
    else:
        for r in recipes:
            r["is_saved"] = False

    # Hydrate avg_rating per recipe from reviews collection
    if recipe_ids:
        pipeline = [
            {"$match": {"recipe_id": {"$in": recipe_ids}, "visible": True}},
            {"$group": {"_id": "$recipe_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
        ]
        try:
            agg = await db.recipe_reviews.aggregate(pipeline).to_list(len(recipe_ids))
            rating_map = {row["_id"]: {"avg": round(row["avg"], 1), "count": row["count"]} for row in agg}
        except Exception:
            rating_map = {}
        for r in recipes:
            info = rating_map.get(r.get("recipe_id"), {})
            r["avg_rating"] = info.get("avg", 0)
            r["review_count"] = info.get("count", 0)

    return recipes

@router.get("/recipes/ingredient-suggestions")
async def get_ingredient_suggestions(q: str = Query(..., min_length=1), limit: int = Query(default=4, ge=1, le=8)):
    product = await _match_ingredient_product(q)
    if not product:
        return {"items": []}
    return {
        "items": [
            {
                "product_id": product.get("product_id"),
                "name": product.get("name", ""),
                "price": product.get("price", 0),
                "image": extract_product_image(product),
            }
        ][:limit]
    }

MEAL_TIME_RANGES = {
    "breakfast": (6, 10),
    "lunch":    (11, 15),
    "snack":    (16, 18),
    "dinner":   (19, 23),
}

# Allergen keyword map: user allergen key → ingredient name substrings (Spanish)
ALLERGEN_KEYWORDS = {
    "nuts": ["almendra", "nuez", "nueces", "avellana", "pistacho", "anacardo", "cacahuete", "frutos secos"],
    "lactose": ["leche", "nata", "queso", "yogur", "mantequilla", "crema", "lácteo"],
    "shellfish": ["gamba", "langostino", "cangrejo", "marisco", "mejillón", "calamar", "pulpo"],
    "eggs": ["huevo", "yema", "clara de huevo"],
    "soy": ["soja", "tofu", "edamame"],
    "wheat": ["trigo", "harina", "pan ", "pasta", "sémola"],
    "fish": ["pescado", "salmón", "atún", "merluza", "bacalao", "sardina", "anchoa"],
    "sesame": ["sésamo", "tahini"],
    "gluten": ["trigo", "harina", "cebada", "centeno", "avena", "espelta"],
}


def _recipe_has_allergen(recipe: dict, allergen_key: str) -> bool:
    """Check if any recipe ingredient name contains allergen keywords."""
    keywords = ALLERGEN_KEYWORDS.get(allergen_key, [])
    if not keywords:
        return False
    for ing in recipe.get("ingredients", []):
        name = (ing.get("name") or "").lower()
        for kw in keywords:
            if kw in name:
                return True
    return False


@router.get("/recipes/featured")
async def get_featured_recipe(
    request: Request,
    tz_offset: int = 0,
):
    """Return a single contextual recipe based on time of day + user dietary preferences."""
    # Determine local hour from UTC + client offset (offset in minutes, e.g. -120 for UTC+2)
    utc_now = datetime.now(timezone.utc)
    local_hour = (utc_now.hour + (-tz_offset // 60)) % 24

    # Find meal type for current hour
    meal_type = None
    for mt, (start, end) in MEAL_TIME_RANGES.items():
        if start <= local_hour <= end:
            meal_type = mt
            break

    # 0:00–5:59 → no recipe
    if meal_type is None:
        return None

    # Get user preferences if authenticated
    user = await get_optional_user(request)
    user_allergens = []
    user_diet = []
    if user:
        user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "allergens": 1, "diet_preferences": 1})
        if user_doc:
            user_allergens = user_doc.get("allergens") or []
            user_diet = user_doc.get("diet_preferences") or []

    # Query: active recipes with matching meal_type, sorted by popularity
    query = {"status": "active", "meal_type": meal_type}
    candidates = await db.recipes.find(query, {"_id": 0}).sort("likes_count", -1).limit(20).to_list(20)

    # No fallback — if no recipes match this meal_type, don't show the ring
    if not candidates:
        return None

    # Filter out recipes containing user allergens
    if user_allergens:
        safe = [r for r in candidates if not any(_recipe_has_allergen(r, a) for a in user_allergens)]
        if safe:
            candidates = safe

    # Score: boost recipes whose tags match user diet preferences
    if user_diet:
        diet_set = set(d.lower() for d in user_diet)
        def score(r):
            tags = set(t.lower() for t in (r.get("tags") or []))
            return len(tags & diet_set)
        candidates.sort(key=lambda r: (-score(r), -(r.get("likes_count") or 0)))

    result = candidates[0] if candidates else None
    if result:
        result["_meal_type_label"] = {"breakfast": "Desayuno", "lunch": "Almuerzo", "snack": "Merienda", "dinner": "Cena"}.get(meal_type, "")

    return result


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str, request: Request, lang: Optional[str] = None):
    """Get a single recipe with ingredient-product mapping and optional translation."""
    try:
        recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0})
    except Exception as exc:
        logger.warning(f"[RECIPES] Data source error for recipe {recipe_id}: {exc}")
        recipe = None
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Map ingredients to actual products
    enriched_ingredients = []
    for ing in recipe.get("ingredients", []):
        mapped = {"name": ing.get("name", ""), "quantity": ing.get("quantity", ""), "unit": ing.get("unit", ""), "product_id": ing.get("product_id")}
        prod = None
        if ing.get("product_id"):
            prod = await db.products.find_one({"product_id": ing["product_id"], "$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]}, {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "stock": 1, "producer_id": 1})
        if not prod and ing.get("name"):
            prod = await _match_ingredient_product(ing.get("name", ""))
        if prod:
            mapped["product_id"] = prod.get("product_id") or mapped.get("product_id")
            mapped["product"] = prod
            mapped["matched_product"] = {
                "product_id": prod.get("product_id"),
                "name": prod.get("name", ""),
                "price": prod.get("price", 0),
                "image": extract_product_image(prod),
            }
        enriched_ingredients.append(mapped)

    recipe["ingredients"] = enriched_ingredients

    # Section 3.5b — PII redaction at READ time on recipe description
    # (NOT applied to ingredient names — risk of redacting legitimate brand names)
    try:
        from services.serialization_helpers import redact_public_text, language_for
        language = language_for(lang or recipe.get("source_language") or "es")
        if isinstance(recipe.get("description"), str):
            recipe["description"] = redact_public_text(recipe["description"], language)
    except Exception:
        pass

    # Translate recipe fields if lang differs from source
    if lang:
        source_lang = recipe.get("source_language", "es")
        if lang != source_lang:
            # Translate title, description, steps
            fields = ["title", "description"]
            translated = await TranslationService.translate_document_fields(
                collection_name="recipes",
                doc_id_field="recipe_id",
                doc_id=recipe_id,
                fields_to_translate=fields,
                target_lang=lang,
                document=recipe,
            )
            if translated:
                recipe["original_title"] = recipe.get("title")
                recipe["original_description"] = recipe.get("description")
                recipe["title"] = translated.get("title", recipe.get("title"))
                recipe["description"] = translated.get("description", recipe.get("description"))
                recipe["translated_from"] = source_lang

            # Translate steps separately (list of strings)
            if recipe.get("steps"):
                steps = recipe["steps"]
                if isinstance(steps, list) and all(isinstance(s, str) for s in steps):
                    recipe["original_steps"] = steps
                    recipe["steps"] = await TranslationService.translate_list(steps, source_lang, lang)

            # Translate ingredient names
            for ing in recipe.get("ingredients", []):
                if ing.get("name"):
                    ing["original_name"] = ing["name"]
                    ing["name"] = await TranslationService.translate_text(ing["name"], source_lang, lang)

    # Hydrate is_saved (R-01)
    current_user = await get_optional_user(request)
    if current_user:
        saved = await db.saved_recipes.find_one({"user_id": current_user.user_id, "recipe_id": recipe_id})
        recipe["is_saved"] = bool(saved)
    else:
        recipe["is_saved"] = False

    return recipe

@router.post("/recipes/{recipe_id}/save")
async def save_recipe(recipe_id: str, user: User = Depends(get_current_user)):
    """Save a recipe to the user's saved list."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0, "recipe_id": 1})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    existing = await db.saved_recipes.find_one({"user_id": user.user_id, "recipe_id": recipe_id})
    if existing:
        return {"saved": True}
    await db.saved_recipes.insert_one({
        "user_id": user.user_id,
        "recipe_id": recipe_id,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"saved": True}

@router.delete("/recipes/{recipe_id}/save")
async def unsave_recipe(recipe_id: str, user: User = Depends(get_current_user)):
    """Remove a recipe from the user's saved list."""
    await db.saved_recipes.delete_one({"user_id": user.user_id, "recipe_id": recipe_id})
    return {"saved": False}


@router.patch("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, request: Request, user: User = Depends(get_current_user)):
    """Update own recipe fields (R-02)."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0, "author_id": 1})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.get("author_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your recipe")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    allowed = {"title", "description", "difficulty", "time_minutes", "servings", "ingredients", "steps", "image_url", "tags", "meal_type"}
    update = {}
    for key in allowed:
        if key in body:
            value = body[key]
            if key == "title":
                value = (value or "").strip()
                if not value:
                    raise HTTPException(status_code=400, detail="Title cannot be empty")
            if key == "difficulty" and value not in ("easy", "medium", "hard"):
                value = "easy"
            if key == "meal_type" and value not in (None, "breakfast", "lunch", "snack", "dinner"):
                value = None
            if key == "time_minutes":
                value = max(0, int(value or 0))
            if key == "servings":
                value = max(1, int(value or 1))
            update[key] = value
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Auto-match ingredients to products (same as POST /recipes)
    if "ingredients" in update and isinstance(update["ingredients"], list):
        matched = []
        for ing in update["ingredients"]:
            item = dict(ing) if isinstance(ing, dict) else {"name": str(ing)}
            if not item.get("product_id") and item.get("name"):
                prod = await _match_ingredient_product(item["name"])
                if prod:
                    item["product_id"] = prod.get("product_id")
                    item["suggested_product"] = {
                        "product_id": prod.get("product_id"),
                        "name": prod.get("name", ""),
                        "price": prod.get("price", 0),
                        "image": extract_product_image(prod),
                    }
            matched.append(item)
        update["ingredients"] = matched

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.recipes.update_one({"recipe_id": recipe_id}, {"$set": update})
    updated = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0})
    return updated


@router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user: User = Depends(get_current_user)):
    """Delete own recipe (R-03). Soft-delete by setting status to 'deleted'."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0, "author_id": 1})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.get("author_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your recipe")

    await db.recipes.update_one({"recipe_id": recipe_id}, {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}})
    # Clean up saved references
    await db.saved_recipes.delete_many({"recipe_id": recipe_id})
    return {"status": "deleted"}


@router.delete("/recipes/{recipe_id}/reviews/{review_id}")
async def delete_recipe_review(recipe_id: str, review_id: str, user: User = Depends(get_current_user)):
    """Delete own recipe review (R-04)."""
    review = await db.recipe_reviews.find_one({"review_id": review_id, "recipe_id": recipe_id}, {"_id": 0, "user_id": 1})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.get("user_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your review")

    await db.recipe_reviews.delete_one({"review_id": review_id})
    return {"status": "deleted"}


@router.get("/recipes/{recipe_id}/shopping-list-preview")
async def get_shopping_list_preview(recipe_id: str, servings: Optional[int] = Query(default=None)):
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    base_servings = max(1, int(recipe.get("servings", 1) or 1))
    desired_servings = max(1, int(servings or base_servings))
    multiplier = desired_servings / base_servings
    items = await _build_shopping_list(recipe, multiplier)
    total = sum((item.get("price", 0) or 0) * (item.get("quantity", 1) or 1) for item in items)
    return {"items": items, "servings": desired_servings, "total": round(total, 2)}


@router.post("/recipes/{recipe_id}/shopping-list")
async def create_shopping_list(recipe_id: str, request: Request, user: User = Depends(get_current_user)):
    """Generate a shopping list from a recipe and add to cart."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    selected_items = body.get("items")
    if isinstance(selected_items, list) and selected_items:
        items = selected_items
    else:
        base_servings = max(1, int(recipe.get("servings", 1) or 1))
        desired_servings = max(1, int(body.get("servings", base_servings) or base_servings))
        items = await _build_shopping_list(recipe, desired_servings / base_servings)

    added = 0
    added_items = []
    for item in items:
        pid = item.get("product_id")
        if not pid:
            continue
        prod = await db.products.find_one({"product_id": pid, "$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]}, {"_id": 0})
        if not prod:
            continue

        quantity = max(1, int(item.get("quantity", 1) or 1))
        unit_price_cents = prod.get("price_cents") or int(round((prod.get("price", 0)) * 100))
        cart = await db.carts.find_one({"user_id": user.user_id, "status": "active"})
        cart_items_list = list(cart.get("items", [])) if cart else []

        existing_idx = next((i for i, ci in enumerate(cart_items_list) if ci.get("product_id") == pid), None)
        if existing_idx is not None:
            cart_items_list[existing_idx]["quantity"] += quantity
            cart_items_list[existing_idx]["total_price_cents"] = unit_price_cents * cart_items_list[existing_idx]["quantity"]
        else:
            cart_items_list.append({
                "product_id": pid,
                "product_name": prod.get("name", ""),
                "product_image": _extract_product_image(prod),
                "seller_id": prod.get("seller_id") or prod.get("producer_id", ""),
                "seller_type": "producer",
                "quantity": quantity,
                "unit_price_cents": unit_price_cents,
                "total_price_cents": unit_price_cents * quantity,
                "variant_id": None,
                "pack_id": None,
                "added_at": datetime.now(timezone.utc),
            })

        if cart:
            await db.carts.update_one(
                {"_id": cart["_id"]},
                {"$set": {"items": cart_items_list, "updated_at": datetime.now(timezone.utc)}}
            )
        else:
            from datetime import timedelta
            await db.carts.insert_one({
                "user_id": user.user_id,
                "tenant_id": "ES",
                "status": "active",
                "items": cart_items_list,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            })
        added += quantity
        added_items.append({"product_id": pid, "name": prod.get("name", ""), "price": prod.get("price", 0), "quantity": quantity})
        await _record_recipe_signal(
            "add_to_cart",
            {
                "content_type": "recipe",
                "content_id": recipe_id,
                "product_id": pid,
                "producer_id": prod.get("producer_id"),
                "ingredient_name": item.get("ingredient_name"),
            },
            user.user_id,
        )

    total = sum((i["price"] or 0) * (i.get("quantity", 1) or 1) for i in added_items)
    return {"added": added, "items": added_items, "total": round(total, 2), "message": f"{added} ingredients added to cart"}


# ============================================================================
# RECIPE REVIEWS
# ============================================================================

@router.get("/recipes/{recipe_id}/reviews")
async def get_recipe_reviews(recipe_id: str, lang: Optional[str] = None):
    """Get visible reviews and average rating for a recipe (public)."""
    reviews = await db.recipe_reviews.find(
        {"recipe_id": recipe_id, "visible": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    total_reviews = len(reviews)
    average_rating = 0
    if total_reviews > 0:
        average_rating = round(sum(r["rating"] for r in reviews) / total_reviews, 1)

    # Translate review texts if requested
    if lang:
        for review in reviews:
            if review.get("text"):
                source_lang = review.get("source_language", "es")
                if lang != source_lang:
                    translated = await TranslationService.translate_document_fields(
                        collection_name="recipe_reviews",
                        doc_id_field="review_id",
                        doc_id=review.get("review_id", ""),
                        fields_to_translate=["text"],
                        target_lang=lang,
                        document=review,
                    )
                    if translated:
                        review["original_text"] = review["text"]
                        review["text"] = translated.get("text", review["text"])
                        review["translated_from"] = source_lang

    return {
        "reviews": reviews,
        "average_rating": average_rating,
        "total_reviews": total_reviews,
    }


@router.post("/recipes/{recipe_id}/reviews")
async def create_recipe_review(recipe_id: str, request: Request, user: User = Depends(get_current_user)):
    """Create a review for a recipe. One review per user per recipe."""
    body = await request.json()
    rating = body.get("rating")
    text = (body.get("text") or "").strip()

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating (1-5) is required")

    # Verify recipe exists
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0, "recipe_id": 1})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Check duplicate (only visible reviews block re-submission — hidden reviews allow retry)
    existing = await db.recipe_reviews.find_one(
        {"recipe_id": recipe_id, "user_id": user.user_id, "visible": True},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ya has valorado esta receta")

    review_id = f"rrev_{uuid.uuid4().hex[:12]}"
    review = {
        "review_id": review_id,
        "recipe_id": recipe_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "rating": rating,
        "text": text[:500] if text else "",
        "visible": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recipe_reviews.insert_one(review)
    review.pop("_id", None)

    # Calculate updated average to include in response
    agg = await db.recipe_reviews.aggregate([
        {"$match": {"recipe_id": recipe_id, "visible": True}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    if agg:
        review["avg_rating"] = round(agg[0]["avg"], 1)
        review["total_reviews"] = agg[0]["count"]

    return review


# ── Helpers ───────────────────────────────────────────────────────

REVIEWABLE_STATUSES = {"delivered", "completed"}


async def _recalculate_product_rating(product_id: str):
    """Recalculate rating_avg and reviews_count from approved reviews."""
    pipeline = [
        {"$match": {"product_id": product_id, "moderation_status": "approved", "deleted": {"$ne": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        await db.products.update_one(
            {"product_id": product_id},
            {"$set": {"rating_avg": round(result[0]["avg"], 1), "reviews_count": result[0]["count"]}},
        )
    else:
        await db.products.update_one(
            {"product_id": product_id},
            {"$set": {"rating_avg": 0, "reviews_count": 0}},
        )


async def _enrich_reviews_with_authors(reviews: list):
    """Add author username + avatar to each review."""
    user_ids = list({r.get("user_id") for r in reviews if r.get("user_id")})
    if not user_ids:
        return
    users = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "avatar_url": 1},
    ).to_list(len(user_ids))
    user_map = {u["user_id"]: u for u in users}
    for r in reviews:
        u = user_map.get(r.get("user_id"), {})
        r["user_name"] = r.get("user_name") or u.get("name", "")
        r["user_username"] = u.get("username", "")
        r["user_avatar"] = u.get("profile_image") or u.get("avatar_url", "")


# ── GET reviews ──────────────────────────────────────────────────

@router.get("/products/{product_id}/reviews")
async def get_product_reviews(
    product_id: str,
    sort: str = Query("recent", regex="^(recent|helpful|highest|lowest)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    lang: Optional[str] = None,
):
    """Get approved reviews for a product (public). Includes rating distribution."""
    query = {"product_id": product_id, "moderation_status": "approved", "deleted": {"$ne": True}}

    # Sort
    sort_field = {
        "recent": [("created_at", -1)],
        "helpful": [("helpful_count", -1), ("created_at", -1)],
        "highest": [("rating", -1), ("created_at", -1)],
        "lowest": [("rating", 1), ("created_at", -1)],
    }.get(sort, [("created_at", -1)])

    total = await db.reviews.count_documents(query)
    skip = (page - 1) * limit
    reviews = await db.reviews.find(query, {"_id": 0}).sort(sort_field).skip(skip).limit(limit).to_list(limit)

    # Also include legacy reviews that use visible=True but no moderation_status
    if total == 0:
        legacy_query = {"product_id": product_id, "visible": True, "deleted": {"$ne": True}}
        total = await db.reviews.count_documents(legacy_query)
        reviews = await db.reviews.find(legacy_query, {"_id": 0}).sort(sort_field).skip(skip).limit(limit).to_list(limit)

    await _enrich_reviews_with_authors(reviews)

    # Section 3.5b — PII redaction at READ time on review comment + title
    try:
        from services.serialization_helpers import redact_public_text, language_for
        for r in reviews:
            language = language_for(lang or r.get("user_country") or r.get("country"))
            if isinstance(r.get("comment"), str):
                r["comment"] = redact_public_text(r["comment"], language)
            if isinstance(r.get("title"), str):
                r["title"] = redact_public_text(r["title"], language)
    except Exception:
        pass

    # Calculate average rating + distribution from ALL approved reviews
    all_approved = await db.reviews.find(
        {"product_id": product_id, "$or": [{"moderation_status": "approved"}, {"visible": True}], "deleted": {"$ne": True}},
        {"_id": 0, "rating": 1},
    ).to_list(10000)

    average_rating = 0
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    if all_approved:
        for r in all_approved:
            rating = int(r.get("rating", 0))
            if 1 <= rating <= 5:
                distribution[rating] += 1
        total_rated = sum(distribution.values())
        average_rating = round(sum(k * v for k, v in distribution.items()) / total_rated, 1) if total_rated > 0 else 0

    # Translate review texts if requested
    if lang:
        for review in reviews:
            text = review.get("comment") or review.get("text", "")
            if text:
                source_lang = review.get("source_language", "es")
                if lang != source_lang:
                    translated = await TranslationService.translate_document_fields(
                        collection_name="reviews",
                        doc_id_field="review_id",
                        doc_id=review.get("review_id", ""),
                        fields_to_translate=["comment"],
                        target_lang=lang,
                        document=review,
                    )
                    if translated:
                        review["original_comment"] = review.get("comment", "")
                        review["comment"] = translated.get("comment", review.get("comment", ""))
                        review["translated_from"] = source_lang

    return {
        "reviews": reviews,
        "average_rating": average_rating,
        "total_reviews": total,
        "distribution": distribution,
        "has_more": skip + limit < total,
        "page": page,
    }


# ── POST create review ───────────────────────────────────────────

@router.post("/products/{product_id}/reviews")
async def create_product_review(product_id: str, input: ReviewCreateInput, user: User = Depends(get_current_user)):
    """Create a review for a product. Requires verified purchase (delivered/completed order)."""
    # Check if user already reviewed this product
    existing = await db.reviews.find_one(
        {"product_id": product_id, "user_id": user.user_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ya has dejado una reseña para este producto")

    # Find a delivered/completed order containing this product
    order = None
    if input.order_id:
        order = await db.orders.find_one(
            {"order_id": input.order_id, "user_id": user.user_id},
            {"_id": 0, "order_id": 1, "status": 1, "line_items": 1, "items": 1},
        )
    if not order:
        order = await db.orders.find_one(
            {
                "user_id": user.user_id,
                "status": {"$in": list(REVIEWABLE_STATUSES)},
                "$or": [
                    {"line_items.product_id": product_id},
                    {"items.product_id": product_id},
                ],
            },
            {"_id": 0, "order_id": 1, "status": 1, "line_items": 1, "items": 1},
        )
    if not order:
        raise HTTPException(
            status_code=403,
            detail="Debes haber comprado y recibido este producto para dejar una reseña",
        )

    order_status = (order.get("status") or "").lower()
    if order_status not in REVIEWABLE_STATUSES:
        raise HTTPException(
            status_code=403,
            detail="Debes haber comprado y recibido este producto para dejar una reseña",
        )

    # Verify product is in the order
    items = order.get("line_items") or order.get("items") or []
    product_in_order = any(item.get("product_id") == product_id for item in items)
    if not product_in_order:
        raise HTTPException(status_code=400, detail="Este producto no estaba en tu pedido")

    # Verify product exists
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "product_id": 1, "producer_id": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Validate comment length
    comment = (input.comment or "").strip()
    if len(comment) < 10:
        raise HTTPException(status_code=400, detail="La reseña debe tener al menos 10 caracteres")

    # Validate images
    images = (input.images or [])[:3]

    # Section 3.5b — sync AI pre-filter (raises 403 on critical block)
    from services.moderation_wiring import run_moderation_check
    try:
        _ai_decision_rv, _ai_summary_rv = await run_moderation_check(
            user=user, text=comment, image_urls=images,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("[MOD_PRE] review degraded fallback: %s", exc)
        _ai_decision_rv, _ai_summary_rv = "allow", None

    # IA moderation
    moderation_status = "approved"
    moderation_reason = None
    try:
        from services.content_moderation import moderate_review
        mod_result = await moderate_review(comment, input.rating)
        moderation_status = mod_result.get("status", "approved")
        moderation_reason = mod_result.get("reason")
    except Exception as e:
        logger.warning("[REVIEWS] Moderation error, defaulting to pending: %s", e)
        moderation_status = "pending"
        moderation_reason = "Moderation service unavailable"

    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    review = {
        "review_id": review_id,
        "product_id": product_id,
        "user_id": user.user_id,
        "order_id": order.get("order_id", ""),
        "rating": input.rating,
        "title": (input.title or "").strip()[:100] or None,
        "comment": comment[:2000],
        "images": images,
        "is_verified_purchase": True,
        "moderation_status": moderation_status,
        "moderation_reason": moderation_reason,
        "visible": moderation_status == "approved",
        "producer_response": None,
        "producer_response_at": None,
        "helpful_count": 0,
        "helpful_users": [],
        "deleted": False,
        "user_name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(review)
    review.pop("_id", None)

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision_rv == "flag":
        try:
            from services.moderation_wiring import insert_auto_report
            await insert_auto_report(
                content_type="review",
                content_id=review_id,
                content_author_id=user.user_id,
                content_country_code=(getattr(user, "country", None) or "ES").upper(),
                ai_summary=_ai_summary_rv,
            )
        except Exception as exc:
            logger.warning("[MOD_PRE] review auto-report failed: %s", exc)

    # Recalculate product rating if approved
    if moderation_status == "approved":
        await _recalculate_product_rating(product_id)

    # Badge check
    try:
        from routes.badges import check_and_award_badges
        await check_and_award_badges(user.user_id)
    except Exception:
        pass

    return {
        **review,
        "moderation_message": (
            "Tu reseña necesita revisión. Te notificaremos." if moderation_status != "approved" else None
        ),
    }


# Legacy endpoint — keep for backward compat
@router.post("/reviews/create")
async def create_review_legacy(input: ReviewCreateInput, user: User = Depends(get_current_user)):
    """Legacy create review endpoint. Redirects to new product-scoped endpoint."""
    return await create_product_review(input.product_id, input, user)


# ── GET can-review ───────────────────────────────────────────────

@router.get("/reviews/can-review/{product_id}")
async def can_review_product(product_id: str, user: User = Depends(get_current_user)):
    """Check if user can review a product."""
    existing = await db.reviews.find_one(
        {"product_id": product_id, "user_id": user.user_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1},
    )
    if existing:
        return {"can_review": False, "reason": "already_reviewed"}

    order = await db.orders.find_one(
        {
            "user_id": user.user_id,
            "status": {"$in": list(REVIEWABLE_STATUSES)},
            "$or": [
                {"line_items.product_id": product_id},
                {"items.product_id": product_id},
            ],
        },
        {"_id": 0, "order_id": 1},
    )
    if not order:
        return {"can_review": False, "reason": "no_delivered_order"}

    return {"can_review": True, "order_id": order["order_id"]}


# ── POST producer response ───────────────────────────────────────

@router.post("/products/{product_id}/reviews/{review_id}/respond")
async def respond_to_review(
    product_id: str, review_id: str, request: Request, user: User = Depends(get_current_user),
):
    """Producer responds to a review on their product. One response per review, moderated."""
    body = await request.json()
    response_text = (body.get("response") or body.get("text") or "").strip()
    if not response_text or len(response_text) > 1000:
        raise HTTPException(status_code=400, detail="La respuesta debe tener entre 1 y 1000 caracteres")

    review = await db.reviews.find_one(
        {"review_id": review_id, "product_id": product_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1, "producer_response": 1, "product_id": 1},
    )
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    if review.get("producer_response"):
        raise HTTPException(status_code=400, detail="Ya has respondido a esta reseña")

    # Verify user is the producer of the product
    product = await db.products.find_one(
        {"product_id": product_id},
        {"_id": 0, "producer_id": 1, "seller_id": 1},
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producer_id = product.get("producer_id") or product.get("seller_id")
    if producer_id != user.user_id:
        raise HTTPException(status_code=403, detail="Solo el productor puede responder a reseñas de sus productos")

    # IA moderation on response
    moderation_status = "approved"
    try:
        from services.content_moderation import moderate_review
        mod_result = await moderate_review(response_text)
        moderation_status = mod_result.get("status", "approved")
        if moderation_status == "rejected":
            raise HTTPException(status_code=400, detail="Tu respuesta no cumple las normas de la comunidad")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("[REVIEWS] Response moderation error: %s", e)

    now = datetime.now(timezone.utc).isoformat()
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {
            "producer_response": response_text[:1000],
            "producer_response_at": now,
            "producer_response_moderation": moderation_status,
            "updated_at": now,
        }},
    )

    return {"success": True, "producer_response": response_text[:1000]}


# ── POST helpful vote toggle ─────────────────────────────────────

@router.post("/products/{product_id}/reviews/{review_id}/helpful")
async def toggle_helpful(
    product_id: str, review_id: str, user: User = Depends(get_current_user),
):
    """Toggle 'helpful' vote on a review. Cannot vote on own review."""
    review = await db.reviews.find_one(
        {"review_id": review_id, "product_id": product_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1, "user_id": 1, "helpful_users": 1, "helpful_count": 1},
    )
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    if review.get("user_id") == user.user_id:
        raise HTTPException(status_code=400, detail="No puedes votar tu propia reseña")

    helpful_users = review.get("helpful_users") or []
    if user.user_id in helpful_users:
        # Remove vote
        await db.reviews.update_one(
            {"review_id": review_id},
            {"$pull": {"helpful_users": user.user_id}, "$inc": {"helpful_count": -1}},
        )
        return {"helpful": False, "helpful_count": max((review.get("helpful_count") or 0) - 1, 0)}
    else:
        # Add vote
        await db.reviews.update_one(
            {"review_id": review_id},
            {"$addToSet": {"helpful_users": user.user_id}, "$inc": {"helpful_count": 1}},
        )
        return {"helpful": True, "helpful_count": (review.get("helpful_count") or 0) + 1}


# ── PATCH review (edit own text/rating) ─────────────────────────

@router.patch("/products/{product_id}/reviews/{review_id}")
async def edit_product_review(
    product_id: str, review_id: str, request: Request, user: User = Depends(get_current_user),
):
    """Edit own review (comment, title, rating). Only the author can edit.

    Section 3.6.6 — F-01. Returns 404 (not 403) for non-authors so existence isn't leaked.
    """
    review = await db.reviews.find_one(
        {"review_id": review_id, "product_id": product_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1, "user_id": 1, "rating": 1, "comment": 1, "title": 1},
    )
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    # 404 (not 403) for non-author to avoid leaking existence.
    if review.get("user_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    body = await request.json()
    new_comment = (body.get("comment") or "").strip()
    new_title = (body.get("title") or "").strip() or None
    new_rating = body.get("rating")

    if not new_comment or len(new_comment) < 10:
        raise HTTPException(status_code=400, detail="La reseña debe tener al menos 10 caracteres")
    if new_rating is not None:
        try:
            new_rating = int(new_rating)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Rating inválido")
        if new_rating < 1 or new_rating > 5:
            raise HTTPException(status_code=400, detail="Rating debe estar entre 1 y 5")

    # Run same moderation pipeline on edit as on create
    moderation_status = "approved"
    try:
        from services.content_moderation import moderate_review
        mod_result = await moderate_review(new_comment, new_rating or review.get("rating", 5))
        moderation_status = mod_result.get("status", "approved")
    except Exception as e:
        logger.warning("[REVIEWS] Edit moderation error, defaulting to pending: %s", e)
        moderation_status = "pending"

    now = datetime.now(timezone.utc).isoformat()
    update_doc = {
        "comment": new_comment[:2000],
        "title": (new_title or "")[:100] or None,
        "edited": True,
        "edited_at": now,
        "updated_at": now,
        "moderation_status": moderation_status,
        "visible": moderation_status == "approved",
    }
    if new_rating is not None:
        update_doc["rating"] = new_rating

    await db.reviews.update_one({"review_id": review_id}, {"$set": update_doc})

    # Recalculate if rating changed
    if new_rating is not None and new_rating != review.get("rating"):
        await _recalculate_product_rating(product_id)

    updated = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    return updated


# ── DELETE review (soft) ─────────────────────────────────────────

@router.delete("/products/{product_id}/reviews/{review_id}")
async def delete_product_review(
    product_id: str, review_id: str, user: User = Depends(get_current_user),
):
    """Soft-delete a review. Only the author can delete (admins use moderation endpoints).

    Section 3.6.6 — F-01. Returns 404 (not 403) for non-authors. Marks deleted=True;
    GET filters preserve these out of public lists.
    """
    review = await db.reviews.find_one(
        {"review_id": review_id, "product_id": product_id, "deleted": {"$ne": True}},
        {"_id": 0, "review_id": 1, "user_id": 1},
    )
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    is_author = review.get("user_id") == user.user_id
    is_admin = getattr(user, "role", None) in ("admin", "super_admin")
    if not is_author and not is_admin:
        # 404 (not 403) to avoid leaking existence.
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    now = datetime.now(timezone.utc).isoformat()
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"deleted": True, "deleted_at": now, "visible": False, "updated_at": now}},
    )

    # Recalculate product rating
    await _recalculate_product_rating(product_id)

    return {"success": True}


# ── Customer reviews list ─────────────────────────────────────────

@router.get("/customer/reviews")
async def get_customer_reviews(user: User = Depends(get_current_user)):
    """Get all reviews by the current customer."""
    reviews = await db.reviews.find(
        {"user_id": user.user_id, "deleted": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    return reviews


# ── Admin Review Moderation ───────────────────────────────────────

@router.get("/admin/reviews")
async def get_all_reviews(
    user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
):
    """Get reviews for admin moderation. Filter by moderation_status."""
    await require_role(user, ["admin", "super_admin"])

    query: dict = {"deleted": {"$ne": True}}
    if status:
        query["moderation_status"] = status

    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    for review in reviews:
        product = await db.products.find_one(
            {"product_id": review.get("product_id")},
            {"_id": 0, "name": 1},
        )
        review["product_name"] = product["name"] if product else "Unknown Product"

    return reviews


@router.put("/admin/reviews/{review_id}/moderate")
async def moderate_review_admin(review_id: str, request: Request, user: User = Depends(get_current_user)):
    """Admin approves or rejects a review."""
    await require_role(user, ["admin", "super_admin"])
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0, "product_id": 1})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {
            "moderation_status": new_status,
            "visible": new_status == "approved",
            "moderation_reason": body.get("reason"),
            "moderated_by": user.user_id,
            "moderated_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    await _recalculate_product_rating(review["product_id"])
    return {"success": True, "status": new_status}


@router.put("/admin/reviews/{review_id}/hide")
async def hide_review(review_id: str, user: User = Depends(get_current_user)):
    """Hide a review (admin only)."""
    await require_role(user, ["admin", "super_admin"])
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": False, "moderation_status": "rejected"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review hidden"}


@router.put("/admin/reviews/{review_id}/show")
async def show_review(review_id: str, user: User = Depends(get_current_user)):
    """Show a hidden review (admin only)."""
    await require_role(user, ["admin", "super_admin"])
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": True, "moderation_status": "approved"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review visible"}


@router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, user: User = Depends(get_current_user)):
    """Hard-delete a review (admin only)."""
    await require_role(user, ["admin", "super_admin"])
    result = await db.reviews.delete_one({"review_id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# Seed Data
@router.post("/seed-data")
async def seed_data(user: User = Depends(get_current_user)):
    """Seed initial categories and admin. Super-admin only, non-production."""
    await require_role(user, ["super_admin"])

    import os
    if os.environ.get("ENV", "development").lower() == "production":
        raise HTTPException(status_code=503, detail="Seed endpoint disabled in production")

    existing_cats = await db.categories.count_documents({"is_active": True})
    if existing_cats > 0:
        return {"message": "Data already seeded"}

    categories = [
        {"category_id": "cat_snacks", "name": "Snacks", "slug": "snacks", "description": "Healthy snacks and treats", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_frozen", "name": "Frozen", "slug": "frozen", "description": "Frozen foods", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_beverages", "name": "Beverages", "slug": "beverages", "description": "Drinks and beverages", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_preserves", "name": "Preserves", "slug": "preserves", "description": "Jams and preserves", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_oils", "name": "Oils", "slug": "oils", "description": "Cooking oils", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_dried", "name": "Dried", "slug": "dried", "description": "Dried fruits and goods", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_precooked", "name": "Pre cooked", "slug": "pre-cooked", "description": "Ready to eat meals", "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.categories.insert_many(categories)

    return {"message": "Data seeded successfully"}


# ============================================================================
# CUSTOMER INSIGHTS API - SUPER ADMIN ONLY
# GDPR-Compliant Aggregated Analytics
# ============================================================================

