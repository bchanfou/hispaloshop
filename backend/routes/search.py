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
):
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
    # S-05/S-07: Price range filters
    if min_price is not None:
        match_stage.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        match_stage.setdefault("price", {})["$lte"] = max_price
    # Certification filter
    if certifications:
        cert_list = [c.strip() for c in certifications.split(",") if c.strip()]
        if cert_list:
            match_stage["certifications"] = {"$in": cert_list}
    if in_stock:
        match_stage["stock"] = {"$gt": 0}
    if free_shipping:
        match_stage["free_shipping"] = True

    # S-07: Sort by backend
    sort_stage = {"$sort": {"_id": -1}}  # default: relevance (insertion order)
    if sort == "price_asc":
        sort_stage = {"$sort": {"price": 1}}
    elif sort == "price_desc":
        sort_stage = {"$sort": {"price": -1}}
    elif sort == "newest":
        sort_stage = {"$sort": {"created_at": -1}}

    pipeline = [
        {"$match": match_stage},
        sort_stage,
        {"$limit": limit},
        {
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
                "created_at": 1,
                "_id": 0,
            }
        },
    ]
    results = await db.products.aggregate(pipeline).to_list(limit)
    return results


async def _search_recipes(db, q: str, limit: int):
    pipeline = [
        {
            "$match": {
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
                "cover_image": 1,
                "likes_count": 1,
                "prep_time_minutes": 1,
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
                         certifications=certifications, in_stock=in_stock, free_shipping=free_shipping),
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
