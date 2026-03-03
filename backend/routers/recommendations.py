from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Product, ProductEmbedding, UserInteraction
from routers.auth import get_current_user
from routers.products import _map_product
from schemas import PersonalizedRecommendationsResponse, RecommendationItem, TrendingProductsResponse
from services.embedding_service import embedding_service
from services.product_visibility import active_product_filters

router = APIRouter(prefix="/recommendations")


@router.get("/personalized", response_model=PersonalizedRecommendationsResponse)
async def personalized_recommendations(
    limit: int = Query(default=10, ge=1, le=50),
    category: Optional[UUID] = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product_filters = active_product_filters(category)
    products = await embedding_service.find_products_for_user(db, current_user.id, limit=limit)
    if category:
        products = [item for item in products if item.category_id == category]
    if not products:
        products = list(
            (
                await db.scalars(
                    select(Product)
                    .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                    .where(*product_filters)
                    .order_by(Product.is_featured.desc(), Product.created_at.desc())
                    .limit(limit)
                )
            ).all()
        )

    items = [
        RecommendationItem(
            product=_map_product(product),
            recommendation_reason="Basado en tu actividad reciente",
            similarity_score=max(0.5, 1 - idx * 0.05),
            position=idx + 1,
        )
        for idx, product in enumerate(products[:limit])
    ]

    interactions_count = await db.scalar(select(func.count(UserInteraction.id)).where(UserInteraction.user_id == current_user.id))
    profile = await db.scalar(select(func.count(ProductEmbedding.id)))
    return PersonalizedRecommendationsResponse(
        items=items,
        generated_at=datetime.now(timezone.utc),
        based_on={"interactions": interactions_count or 0, "products_embedded": profile or 0},
    )


@router.get("/similar/{product_id}")
async def similar_products(product_id: UUID, limit: int = 6, db: AsyncSession = Depends(get_db)):
    embedding = await db.scalar(select(ProductEmbedding).where(ProductEmbedding.product_id == product_id))
    if not embedding:
        return {"items": []}
    matches = await embedding_service.find_similar_products(db, embedding.embedding, exclude_ids=[product_id], limit=limit)
    products = list(
        (
            await db.scalars(
                select(Product)
                .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                .where(Product.id.in_([pid for pid, _ in matches]), *active_product_filters())
            )
        ).all()
    )
    product_map = {p.id: p for p in products}
    return {"items": [_map_product(product_map[pid]) for pid, _ in matches if pid in product_map]}


@router.get("/trending", response_model=TrendingProductsResponse)
async def trending_products(limit: int = 10, db: AsyncSession = Depends(get_db)):
    products = list(
        (
            await db.scalars(
                select(Product)
                .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                .where(*active_product_filters())
                .order_by(Product.is_featured.desc(), Product.created_at.desc())
                .limit(limit)
            )
        ).all()
    )
    return TrendingProductsResponse(items=[_map_product(p) for p in products], period="last_7_days", generated_at=datetime.now(timezone.utc))
