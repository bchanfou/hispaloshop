from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import FeedCache, Follow, Post, User
from routers.auth import get_current_user
from schemas import PostListResponse, PostResponse
from services.feed_service import FeedService
from services.post_service import PostService

router = APIRouter()


def _build_post_response(post: Post, me: User, is_followed: bool = False) -> PostResponse:
    del me
    tagged = []
    for tag in post.product_tags_positions or []:
        tagged.append({"position": {"x": tag.get("x"), "y": tag.get("y")}, "product_id": tag.get("product_id")})

    media = [{"url": url, "type": post.media_type, "thumbnail_url": post.thumbnail_url, "width": 0, "height": 0} for url in post.media_urls]
    return PostResponse(
        id=post.id,
        user={
            "id": post.user.id,
            "full_name": post.user.full_name,
            "username": post.user.username,
            "avatar_url": post.user.avatar_url,
            "is_followed_by_me": is_followed,
            "is_verified": post.user.is_verified,
        },
        content=post.content,
        media=media,
        tagged_products=tagged,
        engagement={
            "likes_count": post.likes_count,
            "comments_count": post.comments_count,
            "shares_count": post.shares_count,
            "saves_count": post.saves_count,
            "is_liked_by_me": False,
            "is_saved_by_me": False,
        },
        created_at=post.created_at,
        score=post.score,
    )


@router.post("/posts", response_model=PostResponse, status_code=201)
async def create_post(
    content: Optional[str] = Form(None),
    visibility: str = Form("public"),
    tagged_products: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    media_files: Optional[List[UploadFile]] = File(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.create_post(
        db=db,
        user=current_user,
        content=content,
        visibility=visibility,
        tagged_products=tagged_products,
        location=location,
        media_files=media_files,
    )
    await db.refresh(post, ["user"])
    return _build_post_response(post, current_user)


@router.get("/posts", response_model=PostListResponse)
async def get_posts(
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[UUID] = None,
    source: str = Query("following", pattern="^(following|trending|discover)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if source == "following":
        cache = await db.scalar(select(FeedCache).where(FeedCache.user_id == current_user.id))
        now = datetime.now(timezone.utc)
        if not cache or cache.expires_at < now:
            cache = await FeedService.recalculate_feed_cache(db, current_user.id)

        post_ids = [UUID(item["post_id"]) for item in cache.feed_posts]
        if cursor and cursor in post_ids:
            post_ids = post_ids[post_ids.index(cursor) + 1 :]
        page_ids = post_ids[:limit]
        posts = (await db.scalars(select(Post).where(Post.id.in_(page_ids)).order_by(desc(Post.created_at)))).unique().all() if page_ids else []
    elif source == "trending":
        stmt = select(Post).where(Post.status == "published").order_by(desc(Post.trending_score), desc(Post.created_at)).limit(limit)
        posts = (await db.scalars(stmt)).all()
    else:
        following_subq = select(Follow.following_id).where(Follow.follower_id == current_user.id)
        stmt = (
            select(Post)
            .where(and_(Post.status == "published", ~Post.user_id.in_(following_subq)))
            .order_by(desc(Post.likes_count), desc(Post.comments_count), desc(Post.created_at))
            .limit(limit)
        )
        posts = (await db.scalars(stmt)).all()

    if cursor and source != "following":
        posts = [p for p in posts if p.id != cursor]

    items = []
    for post in posts:
        await db.refresh(post, ["user"])
        is_followed = await db.scalar(
            select(Follow.id).where(and_(Follow.follower_id == current_user.id, Follow.following_id == post.user_id)).limit(1)
        )
        items.append(_build_post_response(post, current_user, bool(is_followed)))

    next_cursor = str(items[-1].id) if len(items) == limit else None
    return PostListResponse(items=items, has_more=next_cursor is not None, next_cursor=next_cursor)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.scalar(select(Post).where(and_(Post.id == post_id, Post.status == "published")))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.refresh(post, ["user"])
    return _build_post_response(post, current_user)


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def edit_post(
    post_id: UUID,
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    created = post.published_at or post.created_at
    if datetime.now(timezone.utc) - created.replace(tzinfo=timezone.utc) > timedelta(hours=24):
        raise HTTPException(status_code=400, detail="Post edit window exceeded")
    if payload.get("content") is not None:
        post.content = payload["content"]
    if payload.get("visibility") is not None:
        post.visibility = payload["visibility"]
    await db.flush()
    await db.refresh(post, ["user"])
    return _build_post_response(post, current_user)


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(post_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "archived"
    current_user.posts_count = max((current_user.posts_count or 1) - 1, 0)
    await db.flush()
