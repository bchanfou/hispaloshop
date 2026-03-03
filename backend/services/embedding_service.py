from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from models import Product, ProductEmbedding, UserEmbedding


class EmbeddingService:
    MODEL = "text-embedding-3-small"
    DIMENSIONS = 1536

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or None, organization=settings.OPENAI_ORG_ID or None)

    async def generate_embedding(self, text: str) -> List[float]:
        if not settings.OPENAI_API_KEY:
            return [0.0] * self.DIMENSIONS

        response = await self.client.embeddings.create(model=self.MODEL, input=text[:8000])
        return response.data[0].embedding

    async def generate_product_embedding(self, product: Product) -> tuple[List[float], str]:
        text_parts = [
            product.name,
            product.short_description or "",
            product.description or "",
            product.category.name if product.category else "",
            "vegano" if product.is_vegan else "",
            "gluten-free" if product.is_gluten_free else "",
            "orgánico" if product.is_organic else "",
            f"origen: {product.origin_country}" if product.origin_country else "",
        ]
        embedding_text = " | ".join([part for part in text_parts if part])
        embedding = await self.generate_embedding(embedding_text)
        return embedding, embedding_text

    async def find_similar_products(
        self,
        db: AsyncSession,
        query_embedding: List[float],
        exclude_ids: Optional[List[UUID]] = None,
        limit: int = 10,
    ) -> List[tuple[UUID, float]]:
        rows = list((await db.scalars(select(ProductEmbedding).limit(1000))).all())
        if not rows:
            return []

        def cosine_similarity(left: List[float], right: List[float]) -> float:
            top = sum(a * b for a, b in zip(left, right))
            left_norm = max(sum(a * a for a in left) ** 0.5, 1e-9)
            right_norm = max(sum(b * b for b in right) ** 0.5, 1e-9)
            return top / (left_norm * right_norm)

        scored = []
        excluded = {str(v) for v in (exclude_ids or [])}
        for row in rows:
            if str(row.product_id) in excluded:
                continue
            scored.append((row.product_id, cosine_similarity(query_embedding, row.embedding)))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:limit]

    async def find_products_for_user(self, db: AsyncSession, user_id: UUID, limit: int = 10) -> List[Product]:
        profile = await db.scalar(select(UserEmbedding).where(UserEmbedding.user_id == user_id))
        if not profile:
            return []

        similar_ids = await self.find_similar_products(db, profile.embedding, limit=limit)
        product_ids = [item[0] for item in similar_ids]
        if not product_ids:
            return []

        products = list(
            (
                await db.scalars(
                    select(Product)
                    .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                    .where(Product.id.in_(product_ids), Product.status == "active")
                )
            ).all()
        )
        product_map = {item.id: item for item in products}
        return [product_map[pid] for pid in product_ids if pid in product_map]


embedding_service = EmbeddingService()
