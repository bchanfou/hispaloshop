"""
Badge / Achievement system for Hispaloshop.
Defines badge definitions, checks user progress, and awards badges.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_current_user, get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Badge Definitions ────────────────────────────────────────
# Each badge has: id, name_key (i18n), description_key, icon, category, condition
BADGE_DEFINITIONS = [
    # Shopping badges
    {
        "badge_id": "first_order",
        "name_key": "badges.firstOrder",
        "name_default": "Primer Pedido",
        "description_key": "badges.firstOrderDesc",
        "description_default": "Realizaste tu primer pedido",
        "icon": "shopping-bag",
        "category": "shopping",
        "threshold": 1,
        "counter": "orders_count",
    },
    {
        "badge_id": "foodie",
        "name_key": "badges.foodie",
        "name_default": "Foodie",
        "description_key": "badges.foodieDesc",
        "description_default": "5 pedidos realizados",
        "icon": "utensils-crossed",
        "category": "shopping",
        "threshold": 5,
        "counter": "orders_count",
    },
    {
        "badge_id": "super_foodie",
        "name_key": "badges.superFoodie",
        "name_default": "Super Foodie",
        "description_key": "badges.superFoodieDesc",
        "description_default": "20 pedidos realizados",
        "icon": "crown",
        "category": "shopping",
        "threshold": 20,
        "counter": "orders_count",
    },
    # Social badges
    {
        "badge_id": "first_post",
        "name_key": "badges.firstPost",
        "name_default": "Primer Post",
        "description_key": "badges.firstPostDesc",
        "description_default": "Publicaste tu primer post",
        "icon": "image",
        "category": "social",
        "threshold": 1,
        "counter": "posts_count",
    },
    {
        "badge_id": "influencer_social",
        "name_key": "badges.influencerSocial",
        "name_default": "Influencer Social",
        "description_key": "badges.influencerSocialDesc",
        "description_default": "10 publicaciones creadas",
        "icon": "megaphone",
        "category": "social",
        "threshold": 10,
        "counter": "posts_count",
    },
    {
        "badge_id": "commentator",
        "name_key": "badges.commentator",
        "name_default": "Comentarista",
        "description_key": "badges.commentatorDesc",
        "description_default": "10 comentarios realizados",
        "icon": "message-circle",
        "category": "social",
        "threshold": 10,
        "counter": "comments_count",
    },
    {
        "badge_id": "popular",
        "name_key": "badges.popular",
        "name_default": "Popular",
        "description_key": "badges.popularDesc",
        "description_default": "Tus posts recibieron 50 likes",
        "icon": "heart",
        "category": "social",
        "threshold": 50,
        "counter": "likes_received",
    },
    # Recipe badges
    {
        "badge_id": "first_recipe",
        "name_key": "badges.firstRecipe",
        "name_default": "Receta Estrella",
        "description_key": "badges.firstRecipeDesc",
        "description_default": "Creaste tu primera receta",
        "icon": "chef-hat",
        "category": "recipes",
        "threshold": 1,
        "counter": "recipes_count",
    },
    {
        "badge_id": "chef",
        "name_key": "badges.chef",
        "name_default": "Chef",
        "description_key": "badges.chefDesc",
        "description_default": "10 recetas creadas",
        "icon": "flame",
        "category": "recipes",
        "threshold": 10,
        "counter": "recipes_count",
    },
    # Review badges
    {
        "badge_id": "first_review",
        "name_key": "badges.firstReview",
        "name_default": "Primera Resena",
        "description_key": "badges.firstReviewDesc",
        "description_default": "Escribiste tu primera resena",
        "icon": "star",
        "category": "reviews",
        "threshold": 1,
        "counter": "reviews_count",
    },
    # Explorer badge
    {
        "badge_id": "explorer",
        "name_key": "badges.explorer",
        "name_default": "Explorador",
        "description_key": "badges.explorerDesc",
        "description_default": "Seguiste a 5 tiendas",
        "icon": "compass",
        "category": "explore",
        "threshold": 5,
        "counter": "stores_followed",
    },
]

BADGE_MAP = {b["badge_id"]: b for b in BADGE_DEFINITIONS}


async def _get_user_counters(user_id: str) -> dict:
    """Gather all activity counters for a user."""
    orders_count = await db.orders.count_documents({
        "user_id": user_id,
        "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}
    })
    posts_count = await db.user_posts.count_documents({"user_id": user_id})
    comments_count = await db.post_comments.count_documents({"user_id": user_id})
    recipes_count = await db.recipes.count_documents({"author_id": user_id})
    reviews_count = await db.reviews.count_documents({"user_id": user_id})
    stores_followed = await db.store_followers.count_documents({"user_id": user_id})

    # likes received = sum of likes on user's posts
    user_post_ids_cursor = db.user_posts.find({"user_id": user_id}, {"_id": 0, "post_id": 1})
    user_post_ids = [p["post_id"] async for p in user_post_ids_cursor]
    likes_received = 0
    if user_post_ids:
        likes_received = await db.post_likes.count_documents({"post_id": {"$in": user_post_ids}})

    return {
        "orders_count": orders_count,
        "posts_count": posts_count,
        "comments_count": comments_count,
        "recipes_count": recipes_count,
        "reviews_count": reviews_count,
        "stores_followed": stores_followed,
        "likes_received": likes_received,
    }


async def check_and_award_badges(user_id: str) -> list:
    """Check all badge conditions and award any newly earned badges. Returns list of newly awarded badge_ids."""
    counters = await _get_user_counters(user_id)

    # Get already-earned badges
    existing = await db.user_badges.find(
        {"user_id": user_id},
        {"_id": 0, "badge_id": 1}
    ).to_list(100)
    earned_ids = {b["badge_id"] for b in existing}

    newly_awarded = []
    for badge in BADGE_DEFINITIONS:
        if badge["badge_id"] in earned_ids:
            continue
        counter_value = counters.get(badge["counter"], 0)
        if counter_value >= badge["threshold"]:
            await db.user_badges.insert_one({
                "user_id": user_id,
                "badge_id": badge["badge_id"],
                "awarded_at": datetime.now(timezone.utc).isoformat(),
            })
            newly_awarded.append(badge["badge_id"])

    return newly_awarded


# ── API Endpoints ────────────────────────────────────────────

@router.get("/badges")
async def list_all_badges():
    """List all available badge definitions."""
    return [
        {
            "badge_id": b["badge_id"],
            "name_key": b["name_key"],
            "name_default": b["name_default"],
            "description_key": b["description_key"],
            "description_default": b["description_default"],
            "icon": b["icon"],
            "category": b["category"],
            "threshold": b["threshold"],
        }
        for b in BADGE_DEFINITIONS
    ]


@router.get("/users/{user_id}/badges")
async def get_user_badges(user_id: str):
    """Get badges earned by a user, plus progress on unearned badges."""
    counters = await _get_user_counters(user_id)

    earned_docs = await db.user_badges.find(
        {"user_id": user_id},
        {"_id": 0, "badge_id": 1, "awarded_at": 1}
    ).to_list(100)
    earned_map = {d["badge_id"]: d["awarded_at"] for d in earned_docs}

    result = []
    for b in BADGE_DEFINITIONS:
        counter_value = counters.get(b["counter"], 0)
        earned = b["badge_id"] in earned_map
        result.append({
            "badge_id": b["badge_id"],
            "name_key": b["name_key"],
            "name_default": b["name_default"],
            "description_key": b["description_key"],
            "description_default": b["description_default"],
            "icon": b["icon"],
            "category": b["category"],
            "threshold": b["threshold"],
            "current": min(counter_value, b["threshold"]),
            "earned": earned,
            "awarded_at": earned_map.get(b["badge_id"]),
        })

    return result


@router.post("/users/{user_id}/badges/check")
async def check_badges_endpoint(user_id: str, user=Depends(get_current_user)):
    """Manually trigger badge check for the authenticated user."""
    if user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Can only check your own badges")
    newly_awarded = await check_and_award_badges(user_id)
    return {"newly_awarded": newly_awarded}
