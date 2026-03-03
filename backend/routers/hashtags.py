from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Hashtag, HashtagFollow, Post, PostHashtag, User
from routers.auth import get_current_user
from services.hashtag_service import HashtagService

router = APIRouter()


@router.get("/hashtags/trending")
async def get_trending_hashtags(limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    return await HashtagService.get_trending_hashtags(db=db, limit=limit)


@router.get("/hashtags/search")
async def search_hashtags(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    hashtags = await HashtagService.search_hashtags(db=db, query=q)
    return [{"id": item.id, "name": item.name, "posts_count": item.posts_count} for item in hashtags]


@router.get("/hashtags/{hashtag_name}")
async def get_hashtag_detail(
    hashtag_name: str,
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hashtag = await db.scalar(select(Hashtag).where(Hashtag.name == hashtag_name.lower()))
    if not hashtag:
        raise HTTPException(status_code=404, detail="Hashtag not found")

    posts = (
        await db.scalars(
            select(Post)
            .join(PostHashtag, PostHashtag.post_id == Post.id)
            .where(and_(PostHashtag.hashtag_id == hashtag.id, Post.status == "published"))
            .order_by(desc(Post.created_at))
            .limit(limit)
        )
    ).all()
    is_followed = (
        await db.scalar(
            select(HashtagFollow.id).where(and_(HashtagFollow.hashtag_id == hashtag.id, HashtagFollow.user_id == current_user.id)).limit(1)
        )
    ) is not None

    return {
        "id": hashtag.id,
        "name": hashtag.name,
        "posts_count": hashtag.posts_count,
        "is_followed_by_me": is_followed,
        "trending_score": hashtag.trending_score,
        "recent_posts": [str(post.id) for post in posts],
    }


@router.post("/hashtags/{hashtag_name}/follow")
async def follow_hashtag(hashtag_name: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    hashtag = await db.scalar(select(Hashtag).where(Hashtag.name == hashtag_name.lower()))
    if not hashtag:
        hashtag = Hashtag(name=hashtag_name.lower())
        db.add(hashtag)
        await db.flush()

    existing = await db.scalar(
        select(HashtagFollow).where(and_(HashtagFollow.hashtag_id == hashtag.id, HashtagFollow.user_id == current_user.id))
    )
    if existing:
        await db.delete(existing)
        hashtag.followers_count = max((hashtag.followers_count or 1) - 1, 0)
        following = False
    else:
        db.add(HashtagFollow(hashtag_id=hashtag.id, user_id=current_user.id))
        hashtag.followers_count = (hashtag.followers_count or 0) + 1
        following = True

    await db.flush()
    return {"following": following, "followers_count": hashtag.followers_count}
