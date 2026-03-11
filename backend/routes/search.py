"""
Unified Search — single round-trip that queries products, recipes, stores and users.
Endpoint: GET /api/search?q=...&limit=6
"""

from fastapi import APIRouter, Query, Depends
from typing import Optional, List
import asyncio
from core.database import get_db
from core.auth import get_current_user_optional

router = APIRouter()


async def _search_products(db, q: str, limit: int, country: Optional[str]):
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"category": {"$regex": q, "$options": "i"}},
                ],
                "status": "active",
                **({"target_markets": country} if country else {}),
            }
        },
        {"$limit": limit},
        {
            "$project": {
                "product_id": {"$toString": "$_id"},
                "name": 1,
                "price": 1,
                "currency": 1,
                "images": 1,
                "category": 1,
                "country_origin": 1,
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
                "cover_image": 1,
                "profile_image": 1,
                "location": 1,
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
                "role": 1,
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
        country = current_user.get("country")

    # All 4 queries run in parallel
    products, recipes, stores, creators = await asyncio.gather(
        _search_products(db, q, limit, country),
        _search_recipes(db, q, limit),
        _search_stores(db, q, limit),
        _search_users(db, q, limit),
        return_exceptions=True,
    )

    return {
        "query": q,
        "products":  products  if not isinstance(products,  Exception) else [],
        "recipes":   recipes   if not isinstance(recipes,   Exception) else [],
        "stores":    stores    if not isinstance(stores,    Exception) else [],
        "creators":  creators  if not isinstance(creators,  Exception) else [],
        "total": sum(
            len(r) for r in [products, recipes, stores, creators]
            if not isinstance(r, Exception)
        ),
    }
