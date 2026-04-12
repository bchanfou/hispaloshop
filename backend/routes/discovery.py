"""
Discovery & Growth Engine routes — Hispaloshop S25.

Endpoints
─────────
GET  /discovery/feed              — ranked feed (para_ti | siguiendo)
GET  /discovery/explore           — all explore sections in one call
GET  /discovery/related-products/{product_id}
GET  /discovery/trending          — trending by type (products|recipes|creators)
POST /discovery/interaction       — fire-and-forget interaction tracking
GET  /discovery/growth-analytics  — admin growth analytics
GET  /discovery/influencer-insights
GET  /discovery/producer-insights
"""

import asyncio
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from core.auth import get_current_user
from core.database import db, get_db
from core.models import User
from services.feed_algorithm import feed_algorithm
from utils.images import extract_product_image
from services.trending_service import (
    get_content_conversion_stats,
    get_suggested_creators,
    get_top_converting_content,
    get_trending_products,
    get_trending_recipes,
    record_interaction,
)

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _s(doc: dict) -> dict:
    """Serialize ObjectId fields to strings."""
    if not doc:
        return {}
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif type(v).__name__ == "ObjectId":
            result[k] = str(v)
        else:
            result[k] = v
    return result


def _country_of(user: Optional[User]) -> Optional[str]:
    return getattr(user, "country", None) if user else None


# ── Feed (Para ti / Siguiendo) ─────────────────────────────────────────────────

@router.get("/discovery/feed")
async def get_ranked_feed(
    mode: str = Query("para_ti", pattern="^(para_ti|siguiendo)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    user: User = Depends(get_current_user),
):
    """
    Ranked social feed.
    • para_ti   — relevance + engagement + conversion signals
    • siguiendo — mostly chronological with light ranking (follow graph priority)
    """
    feed_type = "following" if mode == "siguiendo" else "for_you"
    results = await feed_algorithm.generate_feed(
        user_id=user.user_id,
        tenant_id=getattr(user, "tenant_id", "hispaloshop"),
        page=page,
        limit=limit,
        feed_type=feed_type,
    )
    return {
        "mode": mode,
        "page": page,
        "items": [
            {
                "post": _s(r.get("post", {})),
                "score": r.get("score", {}).get("total", 0) if isinstance(r.get("score"), dict) else r.get("score", 0),
                "reason": r.get("reason", "Para ti"),
            }
            for r in results
        ],
    }


# ── Quick search (alias for /search, used by DiscoverPage autocomplete) ────────

@router.get("/discovery/search")
async def discovery_search(
    q: str = Query("", min_length=0, max_length=100),
    limit: int = Query(5, ge=1, le=20),
    request: Request = None,
):
    """Autocomplete search for DiscoverPage — returns mixed results."""
    if not q.strip():
        return {"products": [], "recipes": [], "stores": [], "creators": [], "communities": [], "hashtags": [], "total": 0}
    safe_q = re.escape(q.strip()[:100])
    try:
        products, recipes, stores, creators, communities, hashtags = await asyncio.gather(
            db.products.find(
                {"name": {"$regex": safe_q, "$options": "i"}, "$or": [{"status": "active"}, {"approved": True}]},
                {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "currency": 1, "display_price": 1, "display_currency": 1, "producer_name": 1},
            ).limit(limit).to_list(limit),
            db.recipes.find(
                {"title": {"$regex": safe_q, "$options": "i"}, "status": "active"},
                {"_id": 0, "recipe_id": 1, "title": 1, "image_url": 1, "cover_image": 1, "prep_time_minutes": 1},
            ).limit(limit).to_list(limit),
            db.store_profiles.find(
                {"name": {"$regex": safe_q, "$options": "i"}},
                {"_id": 0, "store_id": 1, "name": 1, "slug": 1, "logo": 1, "location": 1, "store_slug": 1},
            ).limit(limit).to_list(limit),
            db.users.find(
                {
                    "$or": [
                        {"name": {"$regex": safe_q, "$options": "i"}},
                        {"username": {"$regex": safe_q, "$options": "i"}},
                    ],
                    "role": {"$nin": ["admin", "super_admin", "country_admin"]},
                    "status": {"$ne": "pending_deletion"},
                },
                {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "picture": 1, "role": 1, "is_verified": 1, "is_private": 1, "followers_count": 1, "bio": 1},
            ).limit(limit).to_list(limit),
            db.communities.find(
                {"name": {"$regex": safe_q, "$options": "i"}},
                {"_id": 0, "slug": 1, "name": 1, "description": 1, "member_count": 1, "cover_image": 1, "is_private": 1},
            ).limit(limit).to_list(limit),
            db.hashtags.find(
                {"tag": {"$regex": f"^{safe_q}", "$options": "i"}},
                {"_id": 0, "tag": 1, "posts_count": 1},
            ).sort("posts_count", -1).limit(limit).to_list(limit),
            return_exceptions=True,
        )
        safe = lambda x: x if not isinstance(x, Exception) else []
        all_results = [products, recipes, stores, creators, communities, hashtags]
        return {
            "products": safe(products),
            "recipes": safe(recipes),
            "stores": safe(stores),
            "creators": safe(creators),
            "communities": safe(communities),
            "hashtags": safe(hashtags),
            "total": sum(len(x) for x in all_results if not isinstance(x, Exception)),
        }
    except Exception:
        return {"products": [], "recipes": [], "stores": [], "creators": [], "communities": [], "hashtags": [], "total": 0}


# ── Explore sections ───────────────────────────────────────────────────────────

@router.get("/discovery/explore")
async def get_explore_sections(
    country: Optional[str] = Query(None),
    user: Optional[User] = Depends(get_current_user),
):
    """
    All explore sections in one round-trip:
    • trending_products   — hot products by interaction velocity (7 days)
    • growing_recipes     — recipes gaining saves/cooks (14 days)
    • suggested_creators  — producers + influencers ranked by commerce impact
    """
    user_id = user.user_id if user else None
    resolved_country = country or _country_of(user)

    trending_products, growing_recipes, suggested_creators = await asyncio.gather(
        get_trending_products(country=resolved_country, limit=8),
        get_trending_recipes(country=resolved_country, limit=6),
        get_suggested_creators(user_id=user_id, country=resolved_country, limit=6),
    )

    return {
        "trending_products": [_s(p) for p in trending_products],
        "growing_recipes": [_s(r) for r in growing_recipes],
        "suggested_creators": [_s(c) for c in suggested_creators],
        "country": resolved_country,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Discover bundle — all 8 sections in one call (section 1.2 of the launch roadmap)
# ───────────────────────────────────────────────────────────────────────────────
# Reduces the frontend from 8+ parallel requests to 1. Each sub-query runs in
# parallel via asyncio.gather, target <500ms p95. In-memory LRU cache with 5-min
# TTL per (country, user_id) prevents thundering herd on popular pages.
# ═══════════════════════════════════════════════════════════════════════════════

import logging as _logging
import time as _time
from collections import OrderedDict

_bundle_logger = _logging.getLogger("discovery.bundle")

# ── Simple in-memory LRU cache (no Redis needed for V1) ──
_bundle_cache: OrderedDict = OrderedDict()
_BUNDLE_CACHE_TTL = 300  # 5 minutes
_BUNDLE_CACHE_MAX = 200

# ── Seasonal map ──
SEASONAL_MAP = {
    "north": {
        1:  {"label": "Invierno",  "emoji": "❄️", "tags": ["naranja", "mandarina", "caqui"]},
        2:  {"label": "Invierno",  "emoji": "❄️", "tags": ["alcachofa", "puerro", "kale"]},
        3:  {"label": "Primavera", "emoji": "🌱", "tags": ["fresa", "espárrago", "guisante"]},
        4:  {"label": "Primavera", "emoji": "🌱", "tags": ["cereza", "alcachofa", "habas"]},
        5:  {"label": "Primavera", "emoji": "🌸", "tags": ["cereza", "nispero", "frambuesa"]},
        6:  {"label": "Verano",    "emoji": "☀️", "tags": ["tomate", "melocotón", "sandía"]},
        7:  {"label": "Verano",    "emoji": "☀️", "tags": ["gazpacho", "melón", "higo"]},
        8:  {"label": "Verano",    "emoji": "☀️", "tags": ["pimiento", "berenjena", "uva"]},
        9:  {"label": "Otoño",     "emoji": "🍂", "tags": ["calabaza", "seta", "castaña"]},
        10: {"label": "Otoño",     "emoji": "🍂", "tags": ["boniato", "granada", "membrillo"]},
        11: {"label": "Otoño",     "emoji": "🍂", "tags": ["seta", "caqui", "kiwi"]},
        12: {"label": "Invierno",  "emoji": "❄️", "tags": ["turrón", "naranja", "mandarina"]},
    },
    "south": {
        1:  {"label": "Verano",    "emoji": "☀️", "tags": ["tomate", "sandía", "melocotón"]},
        2:  {"label": "Verano",    "emoji": "☀️", "tags": ["melón", "uva", "pimiento"]},
        3:  {"label": "Otoño",     "emoji": "🍂", "tags": ["calabaza", "manzana", "seta"]},
        4:  {"label": "Otoño",     "emoji": "🍂", "tags": ["castaña", "boniato", "granada"]},
        5:  {"label": "Otoño",     "emoji": "🍂", "tags": ["kiwi", "caqui", "naranja"]},
        6:  {"label": "Invierno",  "emoji": "❄️", "tags": ["naranja", "mandarina", "puerro"]},
        7:  {"label": "Invierno",  "emoji": "❄️", "tags": ["alcachofa", "kale", "brócoli"]},
        8:  {"label": "Invierno",  "emoji": "❄️", "tags": ["espinaca", "coliflor", "remolacha"]},
        9:  {"label": "Primavera", "emoji": "🌱", "tags": ["fresa", "espárrago", "guisante"]},
        10: {"label": "Primavera", "emoji": "🌱", "tags": ["cereza", "habas", "nispero"]},
        11: {"label": "Primavera", "emoji": "🌸", "tags": ["cereza", "frambuesa", "melocotón"]},
        12: {"label": "Verano",    "emoji": "☀️", "tags": ["tomate", "sandía", "gazpacho"]},
    },
}

SOUTH_HEMISPHERE_COUNTRIES = {"AR", "CL", "AU", "NZ", "ZA", "UY", "PY", "BO", "BR"}


def _get_seasonal(country: str | None) -> dict:
    """Resolve current season by country hemisphere + current month."""
    hemisphere = "south" if (country or "").upper() in SOUTH_HEMISPHERE_COUNTRIES else "north"
    month = datetime.now(timezone.utc).month
    season = SEASONAL_MAP[hemisphere].get(month, SEASONAL_MAP["north"][1])
    return {**season, "hemisphere": hemisphere}


def _bundle_cache_key(country: str | None, user_id: str | None) -> str:
    return f"{country or 'XX'}:{user_id or 'anon'}"


def _get_cached_bundle(key: str) -> dict | None:
    if key not in _bundle_cache:
        return None
    ts, data = _bundle_cache[key]
    if _time.time() - ts > _BUNDLE_CACHE_TTL:
        del _bundle_cache[key]
        return None
    _bundle_cache.move_to_end(key)
    return data


def _set_cached_bundle(key: str, data: dict) -> None:
    _bundle_cache[key] = (_time.time(), data)
    _bundle_cache.move_to_end(key)
    while len(_bundle_cache) > _BUNDLE_CACHE_MAX:
        _bundle_cache.popitem(last=False)


async def _fetch_seasonal_products(seasonal: dict, country: str | None, limit: int) -> list:
    """Fetch products matching seasonal tags."""
    tags = seasonal.get("tags", [])
    if not tags:
        return []
    query = {
        "status": {"$in": ["active", "approved"]},
        "approved": True,
        "$or": [
            {"name": {"$regex": "|".join(re.escape(t) for t in tags), "$options": "i"}},
            {"tags": {"$in": tags}},
            {"category": {"$regex": "|".join(re.escape(t) for t in tags), "$options": "i"}},
        ],
    }
    if country:
        query["$or"].append({"country_origin": country})
    products = await db.products.find(
        query, {"_id": 1, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_id": 1, "category": 1, "tags": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [_s(p) for p in products]


async def _fetch_near_you_producers(country: str | None, limit: int) -> list:
    """Fetch approved producers in the user's country."""
    if not country:
        return []
    producers = await db.users.find(
        {"role": {"$in": ["producer", "importer"]}, "country": country, "approved": True},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "picture": 1, "company_name": 1, "country": 1, "followers_count": 1},
    ).sort("followers_count", -1).limit(limit).to_list(limit)
    return producers


async def _fetch_for_you_products(user_id: str | None, country: str | None, limit: int) -> list:
    """Personalized products: by interests (if available) or trending fallback."""
    # Try user interests for personalization
    interests = []
    if user_id:
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "interests": 1, "preferred_categories": 1})
        interests = (user_doc or {}).get("interests", []) or (user_doc or {}).get("preferred_categories", [])

    query = {"status": {"$in": ["active", "approved"]}, "approved": True}
    if interests:
        query["$or"] = [
            {"category": {"$regex": "|".join(re.escape(i) for i in interests[:5]), "$options": "i"}},
            {"tags": {"$in": interests[:5]}},
        ]
    if country:
        query.setdefault("$or", []).append({"country_origin": country})

    products = await db.products.find(
        query, {"_id": 1, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_id": 1, "category": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Fallback: trending if interests yield nothing
    if not products:
        products = await get_trending_products(country=country, limit=limit)

    return [_s(p) for p in products]


async def _fetch_trending_communities(country: str | None, limit: int) -> list:
    """Communities with most posts in the last 7 days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gt": cutoff}}},
        {"$group": {"_id": "$community_id", "post_count": {"$sum": 1}}},
        {"$sort": {"post_count": -1}},
        {"$limit": limit},
    ]
    active_ids = []
    try:
        results = await db.community_posts.aggregate(pipeline).to_list(limit)
        active_ids = [r["_id"] for r in results if r.get("_id")]
    except Exception:
        pass

    if not active_ids:
        # Fallback: biggest communities by member count
        communities = await db.communities.find(
            {}, {"_id": 0, "slug": 1, "name": 1, "description": 1, "cover_image": 1, "emoji": 1, "member_count": 1}
        ).sort("member_count", -1).limit(limit).to_list(limit)
        return communities

    communities = await db.communities.find(
        {"_id": {"$in": [ObjectId(i) if ObjectId.is_valid(str(i)) else i for i in active_ids]}},
        {"_id": 0, "slug": 1, "name": 1, "description": 1, "cover_image": 1, "emoji": 1, "member_count": 1},
    ).to_list(limit)
    return communities


async def _fetch_new_producers(country: str | None, limit: int) -> list:
    """Producers registered in the last 7 days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    query = {
        "role": {"$in": ["producer", "importer"]},
        "approved": True,
        "created_at": {"$gt": cutoff},
    }
    if country:
        query["country"] = country
    producers = await db.users.find(
        query, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "picture": 1, "company_name": 1, "country": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Fallback: if no new producers this week, show popular ones
    if not producers:
        fallback_query = {"role": {"$in": ["producer", "importer"]}, "approved": True}
        if country:
            fallback_query["country"] = country
        producers = await db.users.find(
            fallback_query, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "picture": 1, "company_name": 1, "country": 1}
        ).sort("followers_count", -1).limit(limit).to_list(limit)

    return producers


async def _fetch_popular_recipes(limit: int) -> list:
    """Most liked/saved recipes."""
    recipes = await db.recipes.find(
        {"status": {"$in": ["published", "approved", None]}},
        {"_id": 1, "recipe_id": 1, "title": 1, "image_url": 1, "time_minutes": 1, "difficulty": 1, "author_id": 1, "likes_count": 1, "saves_count": 1},
    ).sort([("likes_count", -1), ("saves_count", -1)]).limit(limit).to_list(limit)
    return [_s(r) for r in recipes]


async def _fetch_map_preview(country: str | None) -> dict:
    """Count of producers + sample markers for the map preview card."""
    query = {"role": {"$in": ["producer", "importer"]}, "approved": True}
    if country:
        query["country"] = country
    count = await db.users.count_documents(query)
    return {"producers_count": count, "country": country}


@router.get("/discover/bundle")
async def get_discover_bundle(
    country: Optional[str] = Query(None),
    limit: int = Query(10, le=20),
    user: Optional[User] = Depends(get_current_user),
):
    """
    All Discover page sections in one call. Reduces frontend waterfall from
    8+ requests to 1. Each sub-query runs in parallel via asyncio.gather.

    Cache: in-memory LRU with 5-min TTL per (country, user_id). No Redis needed V1.
    Performance target: <500ms p95.
    """
    t0 = _time.time()
    user_id = user.user_id if user else None
    resolved_country = country or _country_of(user)

    # Cache check
    cache_key = _bundle_cache_key(resolved_country, user_id)
    cached = _get_cached_bundle(cache_key)
    if cached:
        _bundle_logger.info("[BUNDLE] cache hit key=%s (%dms)", cache_key, int((_time.time() - t0) * 1000))
        return cached

    # Resolve seasonal
    seasonal = _get_seasonal(resolved_country)

    # 8 parallel sub-queries
    (
        seasonal_products,
        near_you_producers,
        for_you_products,
        communities,
        new_producers,
        recipes,
        trending_creators,
        map_preview,
    ) = await asyncio.gather(
        _fetch_seasonal_products(seasonal, resolved_country, limit),
        _fetch_near_you_producers(resolved_country, limit),
        _fetch_for_you_products(user_id, resolved_country, limit),
        _fetch_trending_communities(resolved_country, 5),
        _fetch_new_producers(resolved_country, 5),
        _fetch_popular_recipes(5),
        get_suggested_creators(user_id=user_id, country=resolved_country, limit=5),
        _fetch_map_preview(resolved_country),
    )

    result = {
        "seasonal": {
            "label": seasonal["label"],
            "emoji": seasonal["emoji"],
            "tags": seasonal["tags"],
            "hemisphere": seasonal["hemisphere"],
            "products": seasonal_products,
        },
        "near_you": {"producers": near_you_producers},
        "for_you": {"products": for_you_products},
        "communities_trending": {"communities": communities},
        "new_producers": {"producers": new_producers},
        "recipes_week": {"recipes": recipes},
        "trending_creators": {"creators": [_s(c) for c in trending_creators]},
        "map_preview": map_preview,
        "country": resolved_country,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    elapsed_ms = int((_time.time() - t0) * 1000)
    _bundle_logger.info("[BUNDLE] generated key=%s sections=8 (%dms)", cache_key, elapsed_ms)

    _set_cached_bundle(cache_key, result)
    return result


# ── Related products widget ────────────────────────────────────────────────────

@router.get("/discovery/related-products/{product_id}")
async def get_related_products(
    product_id: str,
    limit: int = Query(6, le=12),
    user: Optional[User] = Depends(get_current_user),
):
    """
    Related products for the product detail page.
    Strategy: same category first, fill from same producer if needed.
    """
    db = get_db()

    product = None
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        pass

    if not product:
        return {"products": []}

    category_id = product.get("category_id")
    producer_id = product.get("producer_id") or product.get("seller_id")
    country = _country_of(user)

    # Same category, exclude self
    q: dict = {"status": {"$in": ["active", "approved"]}}
    if category_id:
        q["category_id"] = category_id
    try:
        q["_id"] = {"$ne": ObjectId(product_id)}
    except Exception:
        pass
    if country:
        q["$or"] = [{"target_markets": country}, {"target_markets": {"$exists": False}}]

    related = await db.products.find(q).sort(
        [("stats.avg_rating", -1), ("stats.orders_count", -1)]
    ).limit(limit).to_list(length=limit)

    # Fill from same producer if sparse
    if len(related) < limit and producer_id:
        existing_ids = {str(p["_id"]) for p in related}
        existing_ids.add(product_id)
        exclude_oids = []
        for eid in existing_ids:
            try:
                exclude_oids.append(ObjectId(eid))
            except Exception:
                pass
        more = await db.products.find({
            "status": {"$in": ["active", "approved"]},
            "$or": [{"producer_id": producer_id}, {"seller_id": producer_id}],
            "_id": {"$nin": exclude_oids},
        }).limit(limit - len(related)).to_list(length=limit)
        related += more

    for p in related:
        p["id"] = str(p["_id"])

    return {"products": [_s(p) for p in related[:limit]]}


# ── Trending endpoint ──────────────────────────────────────────────────────────

@router.get("/discovery/trending")
async def get_trending(
    type: str = Query("products", pattern="^(products|recipes|creators|hashtags)$"),
    country: Optional[str] = Query(None),
    limit: int = Query(10, le=20),
    user: Optional[User] = Depends(get_current_user),
):
    """Trending entities: products | recipes | creators | hashtags."""
    resolved_country = country or _country_of(user)

    if type == "products":
        items = await get_trending_products(country=resolved_country, limit=limit)
    elif type == "recipes":
        items = await get_trending_recipes(country=resolved_country, limit=limit)
    elif type == "hashtags":
        # S-01: Trending hashtags by post_count
        items = await db.hashtags.find(
            {"post_count": {"$gt": 0}}
        ).sort("post_count", -1).limit(limit).to_list(limit)
        for item in items:
            item.pop("_id", None)
    else:
        uid = user.user_id if user else None
        items = await get_suggested_creators(user_id=uid, country=resolved_country, limit=limit)

    return {
        "type": type,
        "country": resolved_country,
        "items": [_s(item) for item in items],
    }



# ── Interaction tracking ───────────────────────────────────────────────────────

class InteractionPayload(BaseModel):
    entity_type: str        # product | recipe | post | creator | store
    entity_id: str
    interaction_type: str   # view|like|save|share|product_click|add_to_cart|purchase
    context_id: Optional[str] = None  # post/recipe driving the click


@router.post("/discovery/interaction", status_code=204)
async def track_interaction(
    payload: InteractionPayload,
    user: Optional[User] = Depends(get_current_user),
):
    """
    Fire-and-forget interaction tracking.
    Called client-side on content → product events.
    """
    await record_interaction(
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        interaction_type=payload.interaction_type,
        user_id=user.user_id if user else None,
        country=_country_of(user),
        context_id=payload.context_id,
    )


# ── Suggested Users (personalized) ────────────────────────────────────────────

@router.get("/discovery/suggested-users")
async def get_suggested_users(
    limit: int = Query(6, le=20),
    context: str = Query("feed"),
    seed_user_id: Optional[str] = Query(None),
    roles: Optional[str] = Query(None, description="Comma-separated role filter"),
    preferences: Optional[str] = Query(None, description="Comma-separated food preferences (for onboarding)"),
    request: Request = None,
):
    """Personalized user recommendations across all roles."""
    from services.user_recommendations import (
        get_personalized_suggestions,
        get_anonymous_suggestions,
        get_onboarding_suggestions,
    )

    current_user = None
    if request:
        try:
            auth_header = request.headers.get("authorization")
            from core.auth import get_current_user as _gc
            current_user = await _gc(request, authorization=auth_header)
        except Exception:
            pass

    if not current_user:
        country = request.headers.get("x-country", "ES") if request else "ES"
        users = await get_anonymous_suggestions(country=country, limit=limit)
        return {"users": users}

    if context == "onboarding" and preferences:
        pref_list = [p.strip() for p in preferences.split(",") if p.strip()]
        users = await get_onboarding_suggestions(
            preferences=pref_list,
            role=current_user.role,
            country=current_user.country,
            limit=limit,
        )
        return {"users": users}

    users = await get_personalized_suggestions(
        user_id=current_user.user_id,
        limit=limit,
        context=context,
    )
    return {"users": users}


@router.get("/discovery/suggested-users/post-follow/{followed_user_id}")
async def get_post_follow_suggestions(
    followed_user_id: str,
    limit: int = Query(5, le=10),
    user: User = Depends(get_current_user),
):
    """Users similar to the one just followed — shown in post-follow sheet."""
    from services.user_recommendations import get_contextual_suggestions

    users = await get_contextual_suggestions(
        user_id=user.user_id,
        just_followed_id=followed_user_id,
        limit=limit,
    )
    return {"users": users}


@router.get("/discovery/people")
async def browse_people(
    limit: int = Query(20, le=50),
    cursor: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    request: Request = None,
):
    """Paginated people browse with optional role/country filters."""
    db = get_db()

    query: Dict = {}
    if role and role != "all":
        query["role"] = role
    if country:
        query["country"] = country.upper()

    # Cursor = last user_id for keyset pagination
    if cursor:
        query["user_id"] = {"$gt": cursor}

    users = await db.users.find(query, {
        "user_id": 1, "name": 1, "username": 1, "role": 1,
        "bio": 1, "country": 1, "followers_count": 1,
        "profile_image": 1, "avatar": 1, "picture": 1,
        "is_verified": 1,
    }).sort("followers_count", -1).limit(limit + 1).to_list(length=limit + 1)

    has_more = len(users) > limit
    users = users[:limit]

    # Check follow status if authenticated
    current_user = None
    if request:
        try:
            auth_header = request.headers.get("authorization")
            from core.auth import get_current_user as _gc
            current_user = await _gc(request, authorization=auth_header)
        except Exception:
            pass

    following_ids = set()
    if current_user:
        follows = await db.user_follows.find(
            {"follower_id": current_user.user_id}, {"following_id": 1}
        ).to_list(length=2000)
        following_ids = {f["following_id"] for f in follows}

    result = []
    for u in users:
        uid = u.get("user_id")
        result.append({
            "user_id": uid,
            "name": u.get("name", ""),
            "username": u.get("username", ""),
            "role": u.get("role", "consumer"),
            "bio": (u.get("bio") or "")[:120],
            "profile_image": u.get("profile_image") or u.get("avatar") or u.get("picture"),
            "country": u.get("country"),
            "followers_count": u.get("followers_count", 0),
            "is_verified": u.get("is_verified", False),
            "is_following": uid in following_ids,
        })

    next_cursor = users[-1].get("user_id") if has_more and users else None
    return {"users": result, "next_cursor": next_cursor, "has_more": has_more}


# ── Growth Analytics (admin) ───────────────────────────────────────────────────

@router.get("/discovery/growth-analytics")
async def get_growth_analytics(
    days: int = Query(30, le=90),
    user: User = Depends(get_current_user),
):
    """Growth analytics for admin panel (country-scoped for admins, global for super_admin)."""
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Country scope: admins only see interactions from their country
    country_match: dict = {}
    if user.role == "admin":
        admin_doc = await db.users.find_one(
            {"user_id": user.user_id}, {"_id": 0, "assigned_country": 1}
        )
        admin_country = (admin_doc or {}).get("assigned_country")
        if not admin_country:
            raise HTTPException(
                status_code=403,
                detail="Admin account has no assigned country",
            )
        country_match = {"country": admin_country}

    # Run heavy queries in parallel
    top_content, total_interactions, content_driven_carts, content_driven_purchases = await asyncio.gather(
        get_top_converting_content(limit=10, days=days),
        db.growth_interactions.count_documents({"created_at": {"$gte": since}, **country_match}),
        db.growth_interactions.count_documents({
            "interaction_type": "add_to_cart",
            "context_id": {"$ne": None},
            "created_at": {"$gte": since},
            **country_match,
        }),
        db.growth_interactions.count_documents({
            "interaction_type": "purchase",
            "context_id": {"$ne": None},
            "created_at": {"$gte": since},
            **country_match,
        }),
    )

    # Top clicked products driven by content
    product_clicks_pipeline = [
        {"$match": {
            "entity_type": "product",
            "interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]},
            "created_at": {"$gte": since},
            "context_id": {"$ne": None},
            **country_match,
        }},
        {"$group": {
            "_id": "$entity_id",
            "clicks": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "product_click"]}, 1, 0]}},
            "cart_adds": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "add_to_cart"]}, 1, 0]}},
            "purchases": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "purchase"]}, 1, 0]}},
            "total_weight": {"$sum": "$weight"},
        }},
        {"$sort": {"total_weight": -1}},
        {"$limit": 10},
    ]

    # Creators with highest commerce impact
    creator_impact_pipeline = [
        {"$match": {
            "context_id": {"$ne": None},
            "interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]},
            "created_at": {"$gte": since},
            **country_match,
        }},
        {"$group": {
            "_id": "$context_id",
            "impact_score": {"$sum": "$weight"},
            "purchases": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "purchase"]}, 1, 0]}},
        }},
        {"$sort": {"impact_score": -1}},
        {"$limit": 10},
    ]

    product_clicks_raw, creator_impact_raw = await asyncio.gather(
        db.growth_interactions.aggregate(product_clicks_pipeline).to_list(length=10),
        db.growth_interactions.aggregate(creator_impact_pipeline).to_list(length=10),
    )

    # Batch-enrich product stats with names (avoid N+1)
    product_oids = []
    for item in product_clicks_raw:
        try:
            product_oids.append(ObjectId(item["_id"]))
        except Exception:
            pass
    product_map = {}
    if product_oids:
        products_docs = await db.products.find(
            {"_id": {"$in": product_oids}}, {"name": 1, "price": 1}
        ).to_list(len(product_oids))
        product_map = {str(p["_id"]): p for p in products_docs}

    enriched_products = []
    for item in product_clicks_raw:
        p = product_map.get(item["_id"])
        enriched_products.append({
            "product_id": item["_id"],
            "name": p.get("name", "—") if p else "—",
            "price": p.get("price", 0) if p else 0,
            "clicks": item["clicks"],
            "cart_adds": item["cart_adds"],
            "purchases": item["purchases"],
        })

    # Batch-enrich creator stats with names (avoid N+1)
    creator_ids = [item["_id"] for item in creator_impact_raw if item.get("_id")]
    creator_map = {}
    if creator_ids:
        creators_docs = await db.users.find(
            {"user_id": {"$in": creator_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "role": 1},
        ).to_list(len(creator_ids))
        creator_map = {c["user_id"]: c for c in creators_docs}

    enriched_creators = []
    for item in creator_impact_raw:
        u = creator_map.get(item["_id"])
        enriched_creators.append({
            "creator_id": item["_id"],
            "name": u.get("name", "—") if u else "—",
            "username": u.get("username", "") if u else "",
            "role": u.get("role", "creator") if u else "creator",
            "impact_score": item["impact_score"],
            "purchases": item["purchases"],
        })

    return {
        "period_days": days,
        "overview": {
            "total_interactions": total_interactions,
            "content_driven_carts": content_driven_carts,
            "content_driven_purchases": content_driven_purchases,
        },
        "top_converting_content": top_content,
        "top_clicked_products": enriched_products,
        "creators_commerce_impact": enriched_creators,
    }


# ── Influencer insights ────────────────────────────────────────────────────────

@router.get("/discovery/influencer-insights")
async def get_influencer_insights(
    days: int = Query(30, le=90),
    user: User = Depends(get_current_user),
):
    """Influencer's own commerce impact insights."""
    if user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencer access required")

    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Look up influencer record to get influencer_id for commission queries
    influencer_doc = await db.influencers.find_one(
        {"email": user.email.lower()}, {"_id": 0, "influencer_id": 1}
    )
    inf_id = influencer_doc["influencer_id"] if influencer_doc else None

    stats, top_products_raw = await asyncio.gather(
        get_content_conversion_stats(entity_id=user.user_id, days=days),
        db.growth_interactions.aggregate([
            {"$match": {
                "context_id": user.user_id,
                "entity_type": "product",
                "interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]},
                "created_at": {"$gte": since},
            }},
            {"$group": {
                "_id": "$entity_id",
                "clicks": {"$sum": 1},
                "score": {"$sum": "$weight"},
            }},
            {"$sort": {"score": -1}},
            {"$limit": 5},
        ]).to_list(length=5),
    )

    # Build daily earnings from influencer commissions
    daily_earnings = []
    if inf_id:
        since_iso = since.isoformat()
        comms = await db.influencer_commissions.find(
            {"influencer_id": inf_id, "created_at": {"$gte": since_iso}},
            {"_id": 0, "commission_amount": 1, "created_at": 1},
        ).to_list(2000)
        daily_map: Dict[str, float] = {}
        for c in comms:
            day = (c.get("created_at") or "")[:10]
            if day:
                daily_map[day] = round(daily_map.get(day, 0) + c.get("commission_amount", 0), 2)
        for day in sorted(daily_map.keys()):
            daily_earnings.append({"date": day, "amount": daily_map[day]})

    # Batch-enrich products (avoid N+1)
    top_product_oids = []
    for item in top_products_raw:
        try:
            top_product_oids.append(ObjectId(item["_id"]))
        except Exception:
            pass
    tp_map = {}
    if top_product_oids:
        tp_docs = await db.products.find(
            {"_id": {"$in": top_product_oids}}, {"name": 1, "images": 1, "price": 1}
        ).to_list(len(top_product_oids))
        tp_map = {str(p["_id"]): p for p in tp_docs}

    top_products = []
    for item in top_products_raw:
        p = tp_map.get(item["_id"])
        if p:
            top_products.append({
                "product_id": item["_id"],
                "name": p.get("name", "—"),
                "image": extract_product_image(p),
                "price": p.get("price", 0),
                "clicks": item["clicks"],
                "score": item["score"],
            })

    return {
        "period_days": days,
        "overview": stats,
        "top_products_driven": top_products,
        "daily_earnings": daily_earnings,
    }


# ── Producer / Importer insights ───────────────────────────────────────────────

@router.get("/discovery/producer-insights")
async def get_producer_insights(
    days: int = Query(30, le=90),
    user: User = Depends(get_current_user),
):
    """Producer/importer's product discovery and content-attribution insights."""
    if user.role not in ("producer", "importer"):
        raise HTTPException(status_code=403, detail="Producer/importer access required")

    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    seller_products = await db.products.find(
        {"$or": [{"producer_id": user.user_id}, {"seller_id": user.user_id}]},
        {"_id": 1, "name": 1, "images": 1, "price": 1},
    ).to_list(length=200)

    product_ids = [str(p["_id"]) for p in seller_products]

    if not product_ids:
        return {"period_days": days, "products": [], "recipes_featuring": [], "overview": {}}

    stats_pipeline = [
        {"$match": {
            "entity_id": {"$in": product_ids},
            "entity_type": "product",
            "created_at": {"$gte": since},
        }},
        {"$group": {
            "_id": "$entity_id",
            "views": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "view"]}, 1, 0]}},
            "clicks": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "product_click"]}, 1, 0]}},
            "cart_adds": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "add_to_cart"]}, 1, 0]}},
            "purchases": {"$sum": {"$cond": [{"$eq": ["$interaction_type", "purchase"]}, 1, 0]}},
            "content_driven": {"$sum": {"$cond": [{"$ne": ["$context_id", None]}, 1, 0]}},
        }},
    ]

    stats_raw, recipes_raw = await asyncio.gather(
        db.growth_interactions.aggregate(stats_pipeline).to_list(length=200),
        db.recipes.find(
            {"ingredients.product_id": {"$in": product_ids}},
            {"name": 1, "author": 1, "saves_count": 1, "image": 1},
        ).sort("saves_count", -1).limit(5).to_list(length=5),
    )

    stats_map = {s["_id"]: s for s in stats_raw}

    product_insights = []
    for p in seller_products:
        pid = str(p["_id"])
        s = stats_map.get(pid, {})
        product_insights.append({
            "product_id": pid,
            "name": p.get("name", "—"),
            "image": extract_product_image(p),
            "price": p.get("price", 0),
            "views": s.get("views", 0),
            "clicks": s.get("clicks", 0),
            "cart_adds": s.get("cart_adds", 0),
            "purchases": s.get("purchases", 0),
            "content_driven": s.get("content_driven", 0),
        })

    product_insights.sort(key=lambda x: x["clicks"] + x["cart_adds"] * 3, reverse=True)

    for r in recipes_raw:
        r["id"] = str(r.get("_id", ""))

    total_views = sum(p["views"] for p in product_insights)
    total_clicks = sum(p["clicks"] for p in product_insights)
    total_purchases = sum(p["purchases"] for p in product_insights)

    return {
        "period_days": days,
        "overview": {
            "total_views": total_views,
            "total_clicks": total_clicks,
            "total_purchases": total_purchases,
            "content_conversion_rate": round(total_clicks / max(total_views, 1) * 100, 1),
        },
        "products": product_insights[:10],
        "recipes_featuring": [_s(r) for r in recipes_raw],
    }


# ── Recommended products ──────────────────────────────────────────────────────

@router.get("/discovery/recommended")
async def get_recommended_products(
    limit: int = Query(6, le=20),
    user: Optional[User] = Depends(get_current_user),
):
    """Get personalized product recommendations (simple: trending approved products)."""
    db = get_db()

    query = {"status": {"$in": ["active", "approved"]}}
    country = _country_of(user)
    if country:
        query["$or"] = [{"target_markets": country}, {"target_markets": {"$exists": False}}]

    products = await db.products.find(query).sort(
        [("stats.orders_count", -1), ("stats.avg_rating", -1)]
    ).limit(limit).to_list(length=limit)

    return {"products": [_s(p) for p in products]}
