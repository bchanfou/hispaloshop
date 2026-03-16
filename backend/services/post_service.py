from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Post, Product, User
from services.cloudinary_storage import upload_image


class PostService:
    @staticmethod
    async def create_post(
        db: AsyncSession,
        user: User,
        content: Optional[str],
        visibility: str,
        tagged_products: Optional[str],
        location: Optional[str],
        media_files: Optional[List[UploadFile]],
    ) -> Post:
        parsed_tags: List[Dict[str, Any]] = []
        tagged_product_ids: List[UUID] = []

        if tagged_products:
            parsed_tags = json.loads(tagged_products)
            tagged_product_ids = [UUID(tag["product_id"]) for tag in parsed_tags if tag.get("product_id")]

        if tagged_product_ids:
            products = (
                await db.scalars(
                    select(Product.id).where(and_(Product.id.in_(tagged_product_ids), Product.tenant_id == user.tenant_id))
                )
            ).all()
            if len(products) != len(tagged_product_ids):
                raise HTTPException(status_code=400, detail="Some tagged products are invalid for tenant")

        media_urls: List[str] = []
        thumb = None
        if media_files:
            if len(media_files) > 10:
                raise HTTPException(status_code=400, detail="Maximum 10 files per post")
            for file in media_files:
                data = await file.read()
                uploaded = await upload_image(data, folder="posts")
                media_urls.append(uploaded["url"])
                thumb = thumb or uploaded.get("thumbnail")

        location_data = json.loads(location) if location else {}
        post = Post(
            user_id=user.id,
            tenant_id=user.tenant_id,
            content=content,
            media_urls=media_urls,
            media_type="image",
            thumbnail_url=thumb,
            tagged_products=tagged_product_ids,
            product_tags_positions=parsed_tags,
            location_name=location_data.get("name"),
            location_lat=location_data.get("lat"),
            location_lng=location_data.get("lng"),
            visibility=visibility,
            status="published",
            # DB columns are TIMESTAMP WITHOUT TIME ZONE, keep UTC naive values.
            published_at=datetime.now(timezone.utc),
        )
        db.add(post)
        user.posts_count = (user.posts_count or 0) + 1
        await db.flush()
        return post
