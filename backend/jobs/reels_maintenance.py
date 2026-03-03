from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, delete, func, select

from database import AsyncSessionLocal
from models import Hashtag, Post, PostHashtag, ReelView, Story


async def cleanup_old_reel_views():
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(ReelView).where(ReelView.created_at < cutoff))
        await db.commit()


async def recalculate_viral_scores():
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    async with AsyncSessionLocal() as db:
        reels = (await db.scalars(select(Post).where(and_(Post.is_reel.is_(True), Post.status == "published")))).all()
        for reel in reels:
            views = await db.scalar(select(func.count(ReelView.id)).where(and_(ReelView.post_id == reel.id, ReelView.created_at >= cutoff)))
            shares = reel.shares_count or 0
            completion = reel.completion_rate or 0
            reel.viral_score = round(((views or 0) / 2) * completion * ((shares / max(reel.views_count or 1, 1)) + 1), 4)
        await db.commit()


async def expire_old_stories():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Story).where(Story.expires_at < now))
        await db.commit()


async def update_hashtag_trends():
    window = datetime.now(timezone.utc) - timedelta(days=7)
    async with AsyncSessionLocal() as db:
        hashtags = (await db.scalars(select(Hashtag))).all()
        for hashtag in hashtags:
            recent = await db.scalar(
                select(func.count(PostHashtag.id))
                .join(Post, Post.id == PostHashtag.post_id)
                .where(and_(PostHashtag.hashtag_id == hashtag.id, Post.created_at >= window))
            )
            hashtag.trending_score = float(recent or 0)
        await db.commit()
