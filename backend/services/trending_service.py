"""
Trending & Growth signals service — Hispaloshop S25.
Lightweight velocity-based scoring, no heavy ML or external calls.
All operations are async; record_interaction is a single-insert hot-path.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from core.database import get_db

# Interaction weights define the commerce signal value of each action.
INTERACTION_WEIGHTS: Dict[str, int] = {
    "view": 1,
    "like": 3,
    "save": 5,
    "share": 7,
    "product_click": 8,
    "add_to_cart": 12,
    "purchase": 20,
    "recipe_save": 6,
    "recipe_cook": 10,
    "recipe_ingredient_click": 8,
}


# ── Interaction recording ──────────────────────────────────────────────────────

async def record_interaction(
    entity_type: str,
    entity_id: str,
    interaction_type: str,
    user_id: Optional[str] = None,
    country: Optional[str] = None,
    context_id: Optional[str] = None,
) -> None:
    """
    Record a single growth interaction.

    entity_type  — product | recipe | post | creator | store
    interaction_type — view|like|save|share|product_click|add_to_cart|purchase|recipe_save|recipe_cook
    context_id   — the post/recipe that drove a product_click / cart add (for attribution)
    """
    db = get_db()
    weight = INTERACTION_WEIGHTS.get(interaction_type, 1)
    await db.growth_interactions.insert_one({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "interaction_type": interaction_type,
        "weight": weight,
        "user_id": user_id,
        "country": country,
        "context_id": context_id,
        "created_at": datetime.utcnow(),
    })


# ── Trending products ──────────────────────────────────────────────────────────

async def get_trending_products(
    country: Optional[str] = None,
    limit: int = 10,
    days: int = 7,
) -> List[Dict]:
    """Top products by interaction velocity over the last `days` days."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    match: Dict = {"entity_type": "product", "created_at": {"$gte": since}}
    if country:
        match["$or"] = [{"country": country}, {"country": None}]

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$entity_id",
            "trend_score": {"$sum": "$weight"},
            "interaction_count": {"$sum": 1},
        }},
        {"$sort": {"trend_score": -1}},
        {"$limit": limit},
    ]

    items = await db.growth_interactions.aggregate(pipeline).to_list(length=limit)

    from bson.objectid import ObjectId
    results: List[Dict] = []
    for item in items:
        try:
            product = await db.products.find_one(
                {"_id": ObjectId(item["_id"]), "status": {"$in": ["active", "approved"]}},
                {"name": 1, "images": 1, "price": 1, "producer_name": 1, "slug": 1,
                 "category_id": 1},
            )
            if product:
                product["id"] = str(product["_id"])
                product["trend_score"] = item["trend_score"]
                results.append(product)
        except Exception:
            pass

    return results


# ── Trending recipes ───────────────────────────────────────────────────────────

async def get_trending_recipes(
    country: Optional[str] = None,
    limit: int = 8,
    days: int = 14,
) -> List[Dict]:
    """Top growing recipes by save + cook velocity."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    match: Dict = {
        "entity_type": "recipe",
        "created_at": {"$gte": since},
        "interaction_type": {"$in": ["save", "recipe_save", "recipe_cook", "like"]},
    }
    if country:
        match["$or"] = [{"country": country}, {"country": None}]

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$entity_id",
            "trend_score": {"$sum": "$weight"},
        }},
        {"$sort": {"trend_score": -1}},
        {"$limit": limit},
    ]

    items = await db.growth_interactions.aggregate(pipeline).to_list(length=limit)

    results: List[Dict] = []
    for item in items:
        entity_id = item["_id"]
        recipe = None
        try:
            from bson.objectid import ObjectId
            recipe = await db.recipes.find_one(
                {"_id": ObjectId(entity_id)},
                {"name": 1, "image": 1, "author": 1, "time": 1, "saves_count": 1},
            )
        except Exception:
            pass
        if not recipe:
            recipe = await db.recipes.find_one(
                {"id": entity_id},
                {"name": 1, "image": 1, "author": 1, "time": 1, "saves_count": 1},
            )
        if recipe:
            recipe["id"] = str(recipe.get("_id", entity_id))
            recipe["trend_score"] = item["trend_score"]
            results.append(recipe)

    return results


# ── Creator discovery ──────────────────────────────────────────────────────────

async def get_suggested_creators(
    user_id: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = 6,
) -> List[Dict]:
    """
    Surface creators (producers + influencers) by engagement quality.
    Rewards commerce impact, not vanity metrics alone.
    Excludes creators the user already follows.
    """
    db = get_db()

    following_ids: List[str] = []
    if user_id:
        following = await db.follows.find({"follower_id": user_id}).to_list(length=500)
        following_ids = [f.get("following_id") for f in following if f.get("following_id")]

    query: Dict = {
        "role": {"$in": ["producer", "influencer"]},
    }
    if following_ids:
        query["user_id"] = {"$nin": following_ids}

    creators = await db.users.find(
        query,
        {
            "user_id": 1, "name": 1, "username": 1, "avatar": 1, "role": 1,
            "country": 1, "bio": 1, "followers_count": 1, "products_count": 1,
        },
    ).sort("followers_count", -1).limit(limit * 4).to_list(length=limit * 4)

    since = datetime.utcnow() - timedelta(days=30)
    scored: List[Dict] = []
    for creator in creators:
        cid = creator.get("user_id")
        # Count recent commerce interactions attributed to this creator
        commerce_count = await db.growth_interactions.count_documents({
            "context_id": cid,
            "interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]},
            "created_at": {"$gte": since},
        })
        score = float(creator.get("followers_count") or 0) * 0.1 + commerce_count * 10
        if country and creator.get("country") == country:
            score += 20
        creator["discovery_score"] = score
        creator["id"] = str(creator.get("_id", ""))
        scored.append(creator)

    scored.sort(key=lambda x: x["discovery_score"], reverse=True)
    return scored[:limit]


# ── Content conversion stats ───────────────────────────────────────────────────

async def get_content_conversion_stats(
    entity_id: str,
    days: int = 30,
) -> Dict:
    """
    Commerce attribution stats for a seller/creator.
    entity_id = user_id of the influencer, producer, or importer.
    """
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"context_id": entity_id, "created_at": {"$gte": since}}},
        {"$group": {"_id": "$interaction_type", "count": {"$sum": 1}}},
    ]
    stats_raw = await db.growth_interactions.aggregate(pipeline).to_list(length=20)
    stats = {s["_id"]: s["count"] for s in stats_raw}

    return {
        "product_clicks": stats.get("product_click", 0),
        "add_to_cart": stats.get("add_to_cart", 0),
        "purchases": stats.get("purchase", 0),
        "saves": stats.get("save", 0),
        "views": stats.get("view", 0),
        "period_days": days,
    }


# ── Top converting content ─────────────────────────────────────────────────────

async def get_top_converting_content(limit: int = 10, days: int = 30) -> List[Dict]:
    """Posts and recipes ranked by commerce conversion weight."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {
            "entity_type": {"$in": ["post", "recipe"]},
            "interaction_type": {"$in": ["add_to_cart", "purchase", "product_click"]},
            "created_at": {"$gte": since},
        }},
        {"$group": {
            "_id": {"entity_id": "$entity_id", "entity_type": "$entity_type"},
            "conversion_score": {"$sum": "$weight"},
            "cart_adds": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "add_to_cart"]}, 1, 0]}},
            "purchases": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "purchase"]}, 1, 0]}},
        }},
        {"$sort": {"conversion_score": -1}},
        {"$limit": limit},
    ]

    items = await db.growth_interactions.aggregate(pipeline).to_list(length=limit)

    results: List[Dict] = []
    for item in items:
        entity_id = item["_id"]["entity_id"]
        entity_type = item["_id"]["entity_type"]
        doc = None
        try:
            from bson.objectid import ObjectId
            if entity_type == "post":
                doc = await db.posts.find_one(
                    {"_id": ObjectId(entity_id)},
                    {"title": 1, "author_id": 1, "likes_count": 1},
                )
            elif entity_type == "recipe":
                doc = await db.recipes.find_one(
                    {"_id": ObjectId(entity_id)},
                    {"name": 1, "author": 1},
                )
        except Exception:
            pass

        results.append({
            "entity_id": entity_id,
            "entity_type": entity_type,
            "title": (doc.get("title") or doc.get("name", "—")) if doc else "—",
            "conversion_score": item["conversion_score"],
            "cart_adds": item["cart_adds"],
            "purchases": item["purchases"],
        })

    return results
