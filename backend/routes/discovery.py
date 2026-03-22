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
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.auth import get_current_user
from core.database import get_db
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
    type: str = Query("products", pattern="^(products|recipes|creators)$"),
    country: Optional[str] = Query(None),
    limit: int = Query(10, le=20),
    user: Optional[User] = Depends(get_current_user),
):
    """Trending entities: products | recipes | creators."""
    resolved_country = country or _country_of(user)

    if type == "products":
        items = await get_trending_products(country=resolved_country, limit=limit)
    elif type == "recipes":
        items = await get_trending_recipes(country=resolved_country, limit=limit)
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
    request=None,
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
    request=None,
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
    """Growth analytics for admin panel (admin/super_admin only)."""
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Run heavy queries in parallel
    top_content, total_interactions, content_driven_carts, content_driven_purchases = await asyncio.gather(
        get_top_converting_content(limit=10, days=days),
        db.growth_interactions.count_documents({"created_at": {"$gte": since}}),
        db.growth_interactions.count_documents({
            "interaction_type": "add_to_cart",
            "context_id": {"$ne": None},
            "created_at": {"$gte": since},
        }),
        db.growth_interactions.count_documents({
            "interaction_type": "purchase",
            "context_id": {"$ne": None},
            "created_at": {"$gte": since},
        }),
    )

    # Top clicked products driven by content
    product_clicks_pipeline = [
        {"$match": {
            "entity_type": "product",
            "interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]},
            "created_at": {"$gte": since},
            "context_id": {"$ne": None},
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

    # Enrich product stats with names
    enriched_products = []
    for item in product_clicks_raw:
        try:
            p = await db.products.find_one(
                {"_id": ObjectId(item["_id"])}, {"name": 1, "price": 1}
            )
            enriched_products.append({
                "product_id": item["_id"],
                "name": p.get("name", "—") if p else "—",
                "price": p.get("price", 0) if p else 0,
                "clicks": item["clicks"],
                "cart_adds": item["cart_adds"],
                "purchases": item["purchases"],
            })
        except Exception:
            pass

    # Enrich creator stats with names
    enriched_creators = []
    for item in creator_impact_raw:
        u = await db.users.find_one(
            {"user_id": item["_id"]},
            {"name": 1, "username": 1, "role": 1, "avatar": 1},
        )
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

    top_products = []
    for item in top_products_raw:
        try:
            p = await db.products.find_one(
                {"_id": ObjectId(item["_id"])},
                {"name": 1, "images": 1, "price": 1},
            )
            if p:
                top_products.append({
                    "product_id": item["_id"],
                    "name": p.get("name", "—"),
                    "image": extract_product_image(p),
                    "price": p.get("price", 0),
                    "clicks": item["clicks"],
                    "score": item["score"],
                })
        except Exception:
            pass

    return {
        "period_days": days,
        "overview": stats,
        "top_products_driven": top_products,
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
