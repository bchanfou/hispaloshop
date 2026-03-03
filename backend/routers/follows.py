from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Follow, Post, User
from routers.auth import get_current_user
from routers.posts import _build_post_response
from schemas import FollowerResponse, PostListResponse, PublicProfileResponse

router = APIRouter()


@router.post("/follows/{user_id}")
async def toggle_follow(user_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    follow = await db.scalar(select(Follow).where(and_(Follow.follower_id == current_user.id, Follow.following_id == user_id)))
    if follow:
        await db.delete(follow)
        current_user.following_count = max((current_user.following_count or 1) - 1, 0)
        target.followers_count = max((target.followers_count or 1) - 1, 0)
        following = False
    else:
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        current_user.following_count = (current_user.following_count or 0) + 1
        target.followers_count = (target.followers_count or 0) + 1
        following = True
    await db.flush()
    return {"following": following}


async def _list_user_relations(db: AsyncSession, user_id: UUID, relation: str, me_id: UUID, limit: int) -> List[FollowerResponse]:
    if relation == "followers":
        rows = (await db.scalars(select(Follow).where(Follow.following_id == user_id).order_by(desc(Follow.created_at)).limit(limit))).all()
        users = [await db.get(User, row.follower_id) for row in rows]
    else:
        rows = (await db.scalars(select(Follow).where(Follow.follower_id == user_id).order_by(desc(Follow.created_at)).limit(limit))).all()
        users = [await db.get(User, row.following_id) for row in rows]

    output: List[FollowerResponse] = []
    for user in users:
        if not user:
            continue
        is_followed = await db.scalar(
            select(Follow.id).where(and_(Follow.follower_id == me_id, Follow.following_id == user.id)).limit(1)
        )
        output.append(
            FollowerResponse(
                id=user.id,
                full_name=user.full_name,
                username=user.username,
                avatar_url=user.avatar_url,
                is_verified=user.is_verified,
                is_followed_by_me=bool(is_followed),
                followers_count=user.followers_count,
            )
        )
    return output


@router.get("/users/{user_id}/followers", response_model=List[FollowerResponse])
async def get_followers(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _list_user_relations(db, user_id, "followers", current_user.id, limit)


@router.get("/users/{user_id}/following", response_model=List[FollowerResponse])
async def get_following(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _list_user_relations(db, user_id, "following", current_user.id, limit)


@router.get("/users/{user_id}/posts", response_model=PostListResponse)
async def get_user_posts(user_id: UUID, limit: int = Query(20, ge=1, le=50), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    posts = (
        await db.scalars(
            select(Post)
            .where(and_(Post.user_id == user_id, Post.status == "published", Post.visibility == "public"))
            .order_by(desc(Post.created_at))
            .limit(limit)
        )
    ).all()
    items = []
    for post in posts:
        await db.refresh(post, ["user"])
        items.append(_build_post_response(post, current_user))
    return PostListResponse(items=items, has_more=False, next_cursor=None)


@router.get("/profiles/{username}", response_model=PublicProfileResponse)
async def get_public_profile(username: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    is_followed = await db.scalar(
        select(Follow.id).where(and_(Follow.follower_id == current_user.id, Follow.following_id == user.id)).limit(1)
    )
    posts = (
        await db.scalars(
            select(Post)
            .where(and_(Post.user_id == user.id, Post.status == "published", Post.visibility == "public"))
            .order_by(desc(Post.created_at))
            .limit(9)
        )
    ).all()
    out_posts = []
    for post in posts:
        await db.refresh(post, ["user"])
        out_posts.append(_build_post_response(post, current_user))

    return PublicProfileResponse(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        avatar_url=user.avatar_url,
        bio=user.bio,
        website_url=user.website_url,
        social_links=user.social_links,
        is_verified=user.is_verified,
        is_followed_by_me=bool(is_followed),
        stats={
            "followers_count": user.followers_count,
            "following_count": user.following_count,
            "posts_count": user.posts_count,
            "engagement_rate": user.engagement_rate,
        },
        role_info={
            "role": user.role,
            "tier": getattr(user.influencer_profile, "tier", None),
            "niche": getattr(user.influencer_profile, "niche", []),
        },
        recent_posts=out_posts,
    )
