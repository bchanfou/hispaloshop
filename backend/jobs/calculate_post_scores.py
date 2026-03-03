from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select

from database import AsyncSessionLocal
from models import Post, User


def calculate_engagement_velocity(post: Post) -> float:
    created_at = post.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    minutes_alive = max((datetime.now(timezone.utc) - created_at).total_seconds() / 60, 1)
    interactions = post.likes_count + (post.comments_count * 2) + (post.shares_count * 3)
    return interactions / minutes_alive


async def calculate_all_post_scores() -> int:
    async with AsyncSessionLocal() as db:
        since = datetime.now(timezone.utc) - timedelta(hours=48)
        posts = (await db.scalars(select(Post).where(Post.created_at >= since))).all()
        for post in posts:
            post.trending_score = round(calculate_engagement_velocity(post) * 10, 2)
        await db.commit()
        return len(posts)


async def update_user_engagement_rates() -> int:
    async with AsyncSessionLocal() as db:
        users = (await db.scalars(select(User).where(User.role == "influencer"))).all()
        since = datetime.now(timezone.utc) - timedelta(days=30)
        updated = 0
        for user in users:
            posts = (
                await db.scalars(select(Post).where(and_(Post.user_id == user.id, Post.created_at >= since, Post.status == "published")))
            ).all()
            total_engagement = sum(p.likes_count + p.comments_count for p in posts)
            followers = max(user.followers_count or 0, 1)
            user.engagement_rate = round((total_engagement / followers) * 100, 2)
            updated += 1
        await db.commit()
        return updated


async def main() -> None:
    scored = await calculate_all_post_scores()
    users = await update_user_engagement_rates()
    print({"posts_scored": scored, "users_updated": users})


if __name__ == "__main__":
    asyncio.run(main())
