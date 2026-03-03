"""Generate product/user embeddings.

Usage:
  python jobs/generate_embeddings.py --all
"""

from __future__ import annotations

import argparse
import asyncio
from collections import Counter
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import AsyncSessionLocal
from models import Product, ProductEmbedding, User, UserEmbedding, UserInteraction
from services.embedding_service import embedding_service


async def generate_all_product_embeddings() -> int:
    async with AsyncSessionLocal() as db:
        products = list(
            (
                await db.scalars(
                    select(Product)
                    .options(selectinload(Product.category))
                    .where(Product.status == "active")
                )
            ).all()
        )
        created = 0
        for product in products:
            embedding, text = await embedding_service.generate_product_embedding(product)
            row = await db.scalar(select(ProductEmbedding).where(ProductEmbedding.product_id == product.id))
            if row:
                row.embedding = embedding
                row.embedding_text = text
            else:
                db.add(ProductEmbedding(product_id=product.id, embedding=embedding, embedding_text=text))
                created += 1
        await db.commit()
        return created


async def update_product_embedding(product_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        product = await db.scalar(select(Product).options(selectinload(Product.category)).where(Product.id == product_id))
        if not product:
            return
        embedding, text = await embedding_service.generate_product_embedding(product)
        row = await db.scalar(select(ProductEmbedding).where(ProductEmbedding.product_id == product.id))
        if not row:
            db.add(ProductEmbedding(product_id=product.id, embedding=embedding, embedding_text=text))
        else:
            row.embedding = embedding
            row.embedding_text = text
        await db.commit()


async def generate_user_embedding(user_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        interactions = list(
            (
                await db.scalars(
                    select(UserInteraction).where(UserInteraction.user_id == user_id).order_by(UserInteraction.created_at.desc()).limit(300)
                )
            ).all()
        )
        interaction_types = Counter(item.interaction_type for item in interactions)
        text = f"Usuario con interacciones: {dict(interaction_types)}"
        embedding = await embedding_service.generate_embedding(text)
        row = await db.scalar(select(UserEmbedding).where(UserEmbedding.user_id == user_id))
        if row:
            row.embedding = embedding
            row.based_on = {"interactions": len(interactions), "types": dict(interaction_types)}
        else:
            db.add(
                UserEmbedding(
                    user_id=user_id,
                    embedding=embedding,
                    based_on={"interactions": len(interactions), "types": dict(interaction_types)},
                )
            )
        await db.commit()


async def generate_missing_user_embeddings() -> int:
    async with AsyncSessionLocal() as db:
        users = list((await db.scalars(select(User.id))).all())
    for user_id in users:
        await generate_user_embedding(user_id)
    return len(users)


async def main(all_items: bool) -> None:
    if all_items:
        products = await generate_all_product_embeddings()
        users = await generate_missing_user_embeddings()
        print(f"Embeddings generados/actualizados. productos={products} usuarios={users}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.all))
