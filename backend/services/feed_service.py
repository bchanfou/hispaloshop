from __future__ import annotations

from datetime import datetime, timedelta, timezone
from time import perf_counter
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import FeedCache, Follow, Post


class FeedService:
    """Generación y cacheo del feed social."""

    WEIGHTS = {
        "recency": 0.25,
        "engagement": 0.25,
        "relevance": 0.20,
        "social": 0.20,
        "conversion": 0.10,
    }

    @staticmethod
    async def generate_feed_for_user(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        following_posts = await FeedService._get_following_posts(db, user_id, limit=100)
        trending_posts = await FeedService._get_trending_in_categories(db, user_id, limit=30)
        discovery_posts = await FeedService._get_discovery_posts(db, user_id, limit=15)

        candidates = following_posts + trending_posts + discovery_posts
        scored_posts: List[Dict[str, Any]] = []
        for post in candidates:
            score = await FeedService._calculate_score(db, post, user_id)
            scored_posts.append({**post, "calculated_score": score})

        scored_posts.sort(key=lambda p: p["calculated_score"], reverse=True)
        unique_posts: List[Dict[str, Any]] = []
        seen_ids = set()
        for post in scored_posts:
            if post["id"] in seen_ids:
                continue
            seen_ids.add(post["id"])
            unique_posts.append(post)

        return unique_posts[offset : offset + limit]

    @staticmethod
    async def _get_following_posts(db: AsyncSession, user_id: UUID, limit: int) -> List[Dict[str, Any]]:
        stmt = (
            select(Post)
            .join(Follow, Follow.following_id == Post.user_id)
            .where(and_(Follow.follower_id == user_id, Post.status == "published"))
            .order_by(desc(Post.created_at))
            .limit(limit)
        )
        items = (await db.scalars(stmt)).all()
        return [FeedService._post_to_dict(p) for p in items]

    @staticmethod
    async def _get_trending_in_categories(db: AsyncSession, user_id: UUID, limit: int) -> List[Dict[str, Any]]:
        del user_id
        stmt = (
            select(Post)
            .where(and_(Post.status == "published", Post.visibility == "public"))
            .order_by(desc(Post.trending_score), desc(Post.created_at))
            .limit(limit)
        )
        items = (await db.scalars(stmt)).all()
        return [FeedService._post_to_dict(p) for p in items]

    @staticmethod
    async def _get_discovery_posts(db: AsyncSession, user_id: UUID, limit: int) -> List[Dict[str, Any]]:
        subq = select(Follow.following_id).where(Follow.follower_id == user_id)
        stmt = (
            select(Post)
            .where(and_(Post.status == "published", ~Post.user_id.in_(subq)))
            .order_by(desc(Post.likes_count), desc(Post.comments_count), desc(Post.created_at))
            .limit(limit)
        )
        items = (await db.scalars(stmt)).all()
        return [FeedService._post_to_dict(p) for p in items]

    @staticmethod
    async def _calculate_score(db: AsyncSession, post: Dict[str, Any], user_id: UUID) -> float:
        now = datetime.now(timezone.utc)
        created_at = post["created_at"]
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        hours_old = (now - created_at).total_seconds() / 3600
        recency = max(0.0, 100 * (0.95**hours_old))

        engagement_raw = (
            post["likes_count"]
            + post["comments_count"] * 2
            + post["shares_count"] * 3
            + post["saves_count"] * 2
        )
        engagement = min(100.0, engagement_raw / 10)

        is_following = await FeedService._is_following(db, user_id, post["user_id"])
        social = 100.0 if is_following else 0.0

        scores = {
            "recency": recency,
            "engagement": engagement,
            "relevance": 50.0,
            "social": social,
            "conversion": min(100.0, float(post.get("conversions_count", 0))),
        }
        total = sum(scores[key] * FeedService.WEIGHTS[key] for key in FeedService.WEIGHTS)
        return round(total, 2)

    @staticmethod
    async def _is_following(db: AsyncSession, follower_id: UUID, following_id: UUID) -> bool:
        if follower_id == following_id:
            return True
        stmt = select(Follow.id).where(and_(Follow.follower_id == follower_id, Follow.following_id == following_id)).limit(1)
        return (await db.scalar(stmt)) is not None

    @staticmethod
    async def recalculate_feed_cache(db: AsyncSession, user_id: UUID) -> FeedCache:
        start = perf_counter()
        feed = await FeedService.generate_feed_for_user(db, user_id, limit=200)
        generation_ms = int((perf_counter() - start) * 1000)

        entry = await db.scalar(select(FeedCache).where(FeedCache.user_id == user_id))
        if not entry:
            entry = FeedCache(user_id=user_id)
            db.add(entry)

        entry.feed_posts = [{"post_id": str(p["id"]), "score": p["calculated_score"]} for p in feed]
        entry.generated_at = datetime.now(timezone.utc)
        entry.expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        entry.posts_considered = len(feed)
        entry.generation_time_ms = generation_ms
        await db.flush()
        return entry

    @staticmethod
    def _post_to_dict(post: Post) -> Dict[str, Any]:
        return {
            "id": post.id,
            "user_id": post.user_id,
            "created_at": post.created_at,
            "likes_count": post.likes_count,
            "comments_count": post.comments_count,
            "shares_count": post.shares_count,
            "saves_count": post.saves_count,
            "conversions_count": post.conversions_count,
        }
