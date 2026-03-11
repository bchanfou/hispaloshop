"""
Recipe & Review routes: CRUD for recipes and product reviews.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user
from core.models import User, ReviewCreateInput

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/recipes")
async def create_recipe(request: Request, user: User = Depends(get_current_user)):
    """Create a recipe with ingredients mapped to products."""
    body = await request.json()
    recipe_id = f"recipe_{uuid.uuid4().hex[:12]}"
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
        "ingredients": body.get("ingredients", []),
        "steps": body.get("steps", []),
        "image_url": body.get("image_url"),
        "tags": body.get("tags", []),
        "likes_count": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recipes.insert_one(recipe)
    recipe.pop("_id", None)
    return recipe

@router.get("/recipes")
async def get_recipes(q: Optional[str] = None, tag: Optional[str] = None, difficulty: Optional[str] = None, limit: int = 20):
    """Get recipes with filters."""
    query = {"status": "active"}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    if tag:
        query["tags"] = tag
    if difficulty:
        query["difficulty"] = difficulty
    try:
        recipes = await db.recipes.find(query, {"_id": 0}).sort("likes_count", -1).limit(limit).to_list(limit)
        return recipes
    except Exception as exc:
        logger.warning(f"[RECIPES] Falling back to empty list due to data source error: {exc}")
        return []

@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    """Get a single recipe with ingredient-product mapping."""
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
        mapped = {"name": ing.get("name", ""), "quantity": ing.get("quantity", ""), "unit": ing.get("unit", "")}
        if ing.get("product_id"):
            prod = await db.products.find_one({"product_id": ing["product_id"], "status": "active"}, {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "stock": 1})
            if prod:
                mapped["product"] = prod
        enriched_ingredients.append(mapped)
    
    recipe["ingredients"] = enriched_ingredients
    return recipe

@router.post("/recipes/{recipe_id}/shopping-list")
async def create_shopping_list(recipe_id: str, user: User = Depends(get_current_user)):
    """Generate a shopping list from a recipe and add to cart."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    added = 0
    items = []
    for ing in recipe.get("ingredients", []):
        pid = ing.get("product_id")
        if not pid:
            continue
        prod = await db.products.find_one({"product_id": pid, "status": "active"}, {"_id": 0})
        if not prod:
            continue
        
        existing = await db.cart_items.find_one({"user_id": user.user_id, "product_id": pid})
        if existing:
            await db.cart_items.update_one({"user_id": user.user_id, "product_id": pid}, {"$inc": {"quantity": 1}})
        else:
            await db.cart_items.insert_one({
                "user_id": user.user_id,
                "product_id": pid,
                "product_name": prod.get("name", ""),
                "price": prod.get("price", 0),
                "quantity": 1,
                "producer_id": prod.get("producer_id", ""),
                "image": (prod.get("images") or [None])[0],
            })
        added += 1
        items.append({"product_id": pid, "name": prod.get("name", ""), "price": prod.get("price", 0)})
    
    total = sum(i["price"] for i in items)
    return {"added": added, "items": items, "total": round(total, 2), "message": f"{added} ingredients added to cart"}



@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
    """Get visible reviews and average rating for a product (public)"""
    # Get visible reviews for the product
    reviews = await db.reviews.find(
        {"product_id": product_id, "visible": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate average rating
    total_reviews = len(reviews)
    average_rating = 0
    if total_reviews > 0:
        average_rating = round(sum(r["rating"] for r in reviews) / total_reviews, 1)
    
    return {
        "reviews": reviews,
        "average_rating": average_rating,
        "total_reviews": total_reviews
    }

@router.post("/reviews/create")
async def create_review(input: ReviewCreateInput, user: User = Depends(get_current_user)):
    """Create a review for a product (verified buyers only)"""
    # Validate order exists and belongs to user
    order = await db.orders.find_one(
        {"order_id": input.order_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order status is COMPLETED
    if order.get("status", "").lower() != "completed":
        raise HTTPException(
            status_code=400, 
            detail="You can only review products from completed orders"
        )
    
    # Validate product exists in order
    product_in_order = any(
        item["product_id"] == input.product_id 
        for item in order.get("line_items", [])
    )
    if not product_in_order:
        raise HTTPException(
            status_code=400, 
            detail="This product was not in your order"
        )
    
    # Check product exists
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing_review = await db.reviews.find_one(
        {"product_id": input.product_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if existing_review:
        raise HTTPException(
            status_code=400, 
            detail="You have already reviewed this product"
        )
    
    # Create the review
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    review = {
        "review_id": review_id,
        "product_id": input.product_id,
        "user_id": user.user_id,
        "order_id": input.order_id,
        "rating": input.rating,
        "comment": input.comment[:500],  # Enforce max length
        "verified": True,
        "visible": True,
        "user_name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review)
    review.pop("_id", None)
    return review

@router.get("/reviews/can-review/{product_id}")
async def can_review_product(product_id: str, user: User = Depends(get_current_user)):
    """Check if user can review a product"""
    # Check if user already reviewed
    existing_review = await db.reviews.find_one(
        {"product_id": product_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if existing_review:
        return {"can_review": False, "reason": "already_reviewed"}
    
    # Check if user has a completed order with this product
    completed_order = await db.orders.find_one(
        {
            "user_id": user.user_id,
            "status": "completed",
            "line_items.product_id": product_id
        },
        {"_id": 0, "order_id": 1}
    )
    
    if not completed_order:
        return {"can_review": False, "reason": "no_completed_order"}
    
    return {
        "can_review": True, 
        "order_id": completed_order["order_id"]
    }

@router.get("/customer/reviews")
async def get_customer_reviews(user: User = Depends(get_current_user)):
    """Get all reviews by the current customer"""
    reviews = await db.reviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return reviews

# Admin Review Moderation
@router.get("/admin/reviews")
async def get_all_reviews(user: User = Depends(get_current_user)):
    """Get all reviews for admin moderation"""
    await require_role(user, ["admin"])
    
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with product names
    for review in reviews:
        product = await db.products.find_one(
            {"product_id": review["product_id"]},
            {"_id": 0, "name": 1}
        )
        review["product_name"] = product["name"] if product else "Unknown Product"
    
    return reviews

@router.put("/admin/reviews/{review_id}/hide")
async def hide_review(review_id: str, user: User = Depends(get_current_user)):
    """Hide a review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review hidden"}

@router.put("/admin/reviews/{review_id}/show")
async def show_review(review_id: str, user: User = Depends(get_current_user)):
    """Show a hidden review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review visible"}

@router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, user: User = Depends(get_current_user)):
    """Delete a review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.delete_one({"review_id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted"}

# Seed Data
@router.post("/seed-data")
async def seed_data():
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
    
    admin_id = "user_admin_root"
    admin_user = {
        "user_id": admin_id,
        "email": "admin@hispaloshop.com",
        "name": "Admin",
        "role": "admin",
        "email_verified": True,
        "approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    
    return {"message": "Data seeded successfully", "admin_email": "admin@hispaloshop.com"}


# ============================================================================
# CUSTOMER INSIGHTS API - SUPER ADMIN ONLY
# GDPR-Compliant Aggregated Analytics
# ============================================================================

