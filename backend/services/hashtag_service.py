from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Hashtag, Post, PostHashtag


class HashtagService:
    @staticmethod
    async def extract_hashtags(text: str | None) -> List[str]:
        if not text:
            return []
        hashtags = re.findall(r"#(\w+)", text.lower())
        return list(dict.fromkeys(hashtags))

    @staticmethod
    async def get_or_create_hashtags(names: List[str], db: AsyncSession) -> List[Hashtag]:
        hashtags: List[Hashtag] = []
        for name in names:
            hashtag = await db.scalar(select(Hashtag).where(Hashtag.name == name))
            if not hashtag:
                hashtag = Hashtag(name=name)
                db.add(hashtag)
                await db.flush()
            hashtags.append(hashtag)
        return hashtags

    @staticmethod
    async def get_trending_hashtags(db: AsyncSession, days: int = 7, limit: int = 20) -> List[Dict]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = (
            select(Hashtag, func.count(PostHashtag.id).label("recent_posts"))
            .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
            .join(Post, Post.id == PostHashtag.post_id)
            .where(and_(Post.created_at >= since, Post.status == "published"))
            .group_by(Hashtag.id)
            .order_by(func.count(PostHashtag.id).desc(), Hashtag.trending_score.desc())
            .limit(limit)
        )
        rows = (await db.execute(stmt)).all()
        return [
            {
                "id": row[0].id,
                "name": row[0].name,
                "posts_count": row[0].posts_count,
                "followers_count": row[0].followers_count,
                "trending_score": float(row[1]) + row[0].trending_score,
            }
            for row in rows
        ]

    @staticmethod
    async def search_hashtags(db: AsyncSession, query: str, limit: int = 10) -> List[Hashtag]:
        stmt = select(Hashtag).where(Hashtag.name.ilike(f"%{query.lower()}%")).order_by(Hashtag.posts_count.desc()).limit(limit)
        return (await db.scalars(stmt)).all()
