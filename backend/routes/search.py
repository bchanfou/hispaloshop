"""
Unified Search — single round-trip that queries products, recipes, stores and users.
Endpoint: GET /api/search?q=...&limit=6
"""

import logging
import re

from fastapi import APIRouter, Query, Depends
from typing import Optional, List
import asyncio
from core.database import get_db
from core.auth import get_current_user_optional

logger = logging.getLogger(__name__)


def _sanitize_search(q: str) -> str:
    """Escape regex special characters and truncate to prevent ReDoS."""
    return re.escape(q.strip()[:100])

router = APIRouter()


async def _search_products(
    db, q: str, limit: int, country: Optional[str],
    sort: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    certifications: Optional[str] = None,
    in_stock: Optional[bool] = None,
    free_shipping: Optional[bool] = None,
    category: Optional[str] = None,
    country_origin: Optional[str] = None,
):
    # Text index is created at startup in core/database.py
    # Use $text search for relevance scoring when sort is default (relevance)
    use_text_search = sort is None or sort == "relevance"

    if use_text_search:
        match_stage = {
            "$text": {"$search": q},
            "status": {"$in": ["active", "approved"]},
        }
    else:
        # For explicit sort modes, fall back to $regex (text search doesn't allow custom sort)
        match_stage = {
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"category": {"$regex": q, "$options": "i"}},
            ],
            "status": {"$in": ["active", "approved"]},
        }

    if country:
        match_stage["target_markets"] = country
    if min_price is not None:
        match_stage.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        match_stage.setdefault("price", {})["$lte"] = max_price
    if certifications:
        cert_list = [c.strip() for c in certifications.split(",") if c.strip()]
        if cert_list:
            match_stage["certifications"] = {"$in": cert_list}
    if in_stock:
        match_stage["stock"] = {"$gt": 0}
    if free_shipping:
        match_stage["free_shipping"] = True
    if category:
        match_stage["category"] = {"$regex": _sanitize_search(category), "$options": "i"}
    if country_origin:
        match_stage["country_origin"] = country_origin.upper()

    # Sort: textScore for relevance, explicit field for other modes
    if use_text_search:
        sort_stage = {"$sort": {"score": {"$meta": "textScore"}, "_id": -1}}
    elif sort == "price_asc":
        sort_stage = {"$sort": {"price": 1}}
    elif sort == "price_desc":
        sort_stage = {"$sort": {"price": -1}}
    elif sort == "newest":
        sort_stage = {"$sort": {"created_at": -1}}
    elif sort == "rating":
        sort_stage = {"$sort": {"rating_avg": -1, "created_at": -1}}
    else:
        sort_stage = {"$sort": {"_id": -1}}

    project_stage = {
        "$project": {
            "product_id": {"$toString": "$_id"},
            "name": 1,
            "price": 1,
            "display_price": 1,
            "currency": 1,
            "display_currency": 1,
            "images": 1,
            "category": 1,
            "country_origin": 1,
            "certifications": 1,
            "rating_avg": 1,
            "stock": 1,
            "free_shipping": 1,
            "created_at": 1,
            "_id": 0,
        }
    }
    if use_text_search:
        project_stage["$project"]["relevance_score"] = {"$meta": "textScore"}

    pipeline = [
        {"$match": match_stage},
        sort_stage,
        {"$limit": limit},
        project_stage,
    ]

    try:
        results = await db.products.aggregate(pipeline).to_list(limit)
    except Exception:
        # Fallback to regex if text index is not available (e.g. old MongoDB)
        match_stage = {
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"category": {"$regex": q, "$options": "i"}},
            ],
            "status": {"$in": ["active", "approved"]},
        }
        pipeline = [{"$match": match_stage}, {"$sort": {"_id": -1}}, {"$limit": limit}, project_stage]
        results = await db.products.aggregate(pipeline).to_list(limit)

    return results


async def _search_recipes(db, q: str, limit: int):
    pipeline = [
        {
            "$match": {
                "status": "active",
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"tags": {"$in": [q.lower()]}},
                ]
            }
        },
        {"$sort": {"likes_count": -1}},
        {"$limit": limit},
        {
            "$project": {
                "recipe_id": {"$toString": "$_id"},
                "title": 1,
                "cover_image": "$image_url",
                "image_url": 1,
                "likes_count": 1,
                "prep_time_minutes": "$time_minutes",
                "time_minutes": 1,
                "_id": 0,
            }
        },
    ]
    return await db.recipes.aggregate(pipeline).to_list(limit)


async def _search_stores(db, q: str, limit: int):
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"location": {"$regex": q, "$options": "i"}},
                ]
            }
        },
        {"$limit": limit},
        {
            "$project": {
                "store_id": {"$toString": "$_id"},
                "name": 1,
                "slug": 1,
                "store_slug": 1,
                "cover_image": 1,
                "profile_image": 1,
                "location": 1,
                "followers_count": 1,
                "_id": 0,
            }
        },
    ]
    return await db.stores.aggregate(pipeline).to_list(limit)


async def _search_users(db, q: str, limit: int):
    pipeline = [
        {
            "$match": {
                "role": {"$in": ["producer", "influencer", "importer"]},
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"username": {"$regex": q, "$options": "i"}},
                    {"bio": {"$regex": q, "$options": "i"}},
                ],
            }
        },
        {"$sort": {"followers_count": -1}},
        {"$limit": limit},
        {
            "$project": {
                "user_id": {"$toString": "$_id"},
                "name": 1,
                "username": 1,
                "profile_image": 1,
                "avatar": 1,
                "role": 1,
                "bio": 1,
                "followers_count": 1,
                "_id": 0,
            }
        },
    ]
    return await db.users.aggregate(pipeline).to_list(limit)


@router.get("/search/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(default=5, ge=1, le=10),
    db=Depends(get_db),
):
    """
    Fast prefix-match suggestions for autocomplete. Returns product names,
    store names, and popular prior query terms. Target <100ms.
    """
    safe_q = _sanitize_search(q)
    regex = {"$regex": f"^{safe_q}", "$options": "i"}

    products_task = db.products.find(
        {"name": regex, "status": {"$in": ["active", "approved"]}},
        {"_id": 0, "name": 1},
    ).limit(limit).to_list(limit)

    stores_task = db.stores.find(
        {"name": regex},
        {"_id": 0, "name": 1},
    ).limit(3).to_list(3)

    product_names, store_names = await asyncio.gather(products_task, stores_task)

    suggestions = []
    for p in product_names:
        suggestions.append({"text": p["name"], "type": "product"})
    for s in store_names:
        suggestions.append({"text": s["name"], "type": "store"})

    return {"suggestions": suggestions[:limit]}


@router.get("/search/trending")
async def search_trending(
    country: Optional[str] = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
    db=Depends(get_db),
):
    """
    Trending search queries for the search empty state. V1: extracts names
    from trending products (via trending_service). Future: record actual
    search queries and aggregate popular ones.
    """
    try:
        from services.trending_service import get_trending_products
        products = await get_trending_products(country=country, limit=limit)
        queries = [p.get("name", "") for p in products if p.get("name")]
        if queries:
            return {"queries": queries[:limit]}
    except Exception:
        pass

    # Fallback
    return {"queries": [
        "aceite de oliva", "queso manchego", "miel ecológica",
        "jamón ibérico", "gazpacho", "almendra", "azafrán", "conservas",
    ][:limit]}


@router.get("/search")
async def unified_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=6, ge=1, le=20),
    sort: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None),
    max_price: Optional[float] = Query(default=None),
    certifications: Optional[str] = Query(default=None),
    in_stock: Optional[bool] = Query(default=None),
    free_shipping: Optional[bool] = Query(default=None),
    category: Optional[str] = Query(default=None),
    country_origin: Optional[str] = Query(default=None),
    db=Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Search products, recipes, stores, and creators in a single request.
    Returns up to `limit` results per category.
    Accessible to both authenticated and guest users.
    """
    country = None
    if current_user:
        country = getattr(current_user, "country", None) or (current_user.get("country") if isinstance(current_user, dict) else None)

    # Sanitize search input to prevent regex injection / ReDoS
    safe_q = _sanitize_search(q)

    # Fetch limit+1 per category so we can detect if there are more results
    fetch_limit = limit + 1
    products, recipes, stores, creators = await asyncio.gather(
        _search_products(db, safe_q, fetch_limit, country,
                         sort=sort, min_price=min_price, max_price=max_price,
                         certifications=certifications, in_stock=in_stock, free_shipping=free_shipping,
                         category=category, country_origin=country_origin),
        _search_recipes(db, safe_q, fetch_limit),
        _search_stores(db, safe_q, fetch_limit),
        _search_users(db, safe_q, fetch_limit),
        return_exceptions=True,
    )

    def _trim(results, lim):
        if isinstance(results, Exception):
            return [], False
        has_more = len(results) > lim
        return results[:lim], has_more

    p, p_more = _trim(products, limit)
    r, r_more = _trim(recipes, limit)
    s, s_more = _trim(stores, limit)
    c, c_more = _trim(creators, limit)

    return {
        "query": q,
        "products": p,
        "recipes": r,
        "stores": s,
        "creators": c,
        "has_more": {
            "products": p_more,
            "recipes": r_more,
            "stores": s_more,
            "creators": c_more,
        },
        "total": len(p) + len(r) + len(s) + len(c),
    }
