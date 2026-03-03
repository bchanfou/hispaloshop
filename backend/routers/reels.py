from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import Float, and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import FeedCache, Follow, Hashtag, Post, PostHashtag, ReelView, User
from routers.auth import get_current_user
from schemas import ReelResponse, ReelViewTrackRequest
from services.hashtag_service import HashtagService
from services.video_service import VideoService

router = APIRouter()


@router.post("/reels", response_model=ReelResponse, status_code=201)
async def create_reel(
    video: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    hashtags: Optional[str] = Form(None),
    tagged_products: Optional[str] = Form(None),
    sound_id: Optional[str] = Form(None),
    cover_frame_seconds: float = Form(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await video.read()
    upload = await VideoService.upload_reel(content, video.filename or "reel.mp4", current_user.id, cover_frame_seconds)

    tags_payload = json.loads(tagged_products) if tagged_products else []
    for tag in tags_payload:
        if float(tag.get("timestamp_seconds", 0)) > upload["duration"]:
            raise HTTPException(status_code=400, detail="Tagged product timestamp exceeds video duration")

    post = Post(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        content=caption,
        media_urls=[upload["video_url"]],
        media_type="video",
        thumbnail_url=upload["thumbnail_url"],
        aspect_ratio="9:16",
        product_tags_positions=tags_payload,
        is_reel=True,
        video_duration_seconds=upload["duration"],
        audio_track_id=sound_id,
        published_at=datetime.now(timezone.utc),
    )
    db.add(post)
    current_user.reels_count = (current_user.reels_count or 0) + 1

    raw_hashtags = await HashtagService.extract_hashtags(caption)
    if hashtags:
        raw_hashtags.extend(await HashtagService.extract_hashtags(hashtags))
    hashtag_models = await HashtagService.get_or_create_hashtags(list(dict.fromkeys(raw_hashtags)), db)

    await db.flush()
    for h in hashtag_models:
        db.add(PostHashtag(post_id=post.id, hashtag_id=h.id))
        h.posts_count = (h.posts_count or 0) + 1

    cache_entries = (await db.scalars(select(FeedCache))).all()
    for entry in cache_entries:
        entry.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    await db.flush()
    await db.refresh(post, ["user"])
    return await _to_reel_response(post, current_user.id, db)


@router.get("/reels")
async def get_reels(
    cursor: Optional[UUID] = None,
    limit: int = Query(10, ge=1, le=30),
    source: str = Query("for_you", pattern="^(for_you|following|trending)$"),
    hashtag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Post).where(and_(Post.status == "published", Post.is_reel.is_(True)))

    if source == "following":
        following = select(Follow.following_id).where(Follow.follower_id == current_user.id)
        stmt = stmt.where(Post.user_id.in_(following)).order_by(desc(Post.created_at))
    elif source == "trending":
        stmt = stmt.order_by(desc(Post.viral_score), desc(Post.completion_rate), desc(Post.created_at))
    else:
        stmt = stmt.order_by(desc(Post.viral_score), desc(Post.created_at))

    if hashtag:
        stmt = stmt.join(PostHashtag, PostHashtag.post_id == Post.id).join(Hashtag, Hashtag.id == PostHashtag.hashtag_id).where(Hashtag.name == hashtag.lower())

    seen_subq = select(ReelView.post_id).where(ReelView.viewer_id == current_user.id)
    stmt = stmt.where(~Post.id.in_(seen_subq))

    if cursor:
        cursor_post = await db.get(Post, cursor)
        if cursor_post:
            stmt = stmt.where(Post.created_at < cursor_post.created_at)

    posts = (await db.scalars(stmt.limit(limit))).all()
    items = [await _to_reel_response(post, current_user.id, db) for post in posts]
    next_cursor = str(posts[-1].id) if len(posts) == limit else None
    return {"items": items, "next_cursor": next_cursor, "has_more": next_cursor is not None}


@router.post("/reels/{reel_id}/view")
async def track_reel_view(
    reel_id: UUID,
    payload: ReelViewTrackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.scalar(select(Post).where(and_(Post.id == reel_id, Post.is_reel.is_(True))))
    if not post:
        raise HTTPException(status_code=404, detail="Reel not found")

    recent_window = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = await db.scalar(
        select(ReelView).where(
            and_(ReelView.post_id == reel_id, ReelView.viewer_id == current_user.id, ReelView.created_at >= recent_window)
        )
    )

    if existing:
        existing.watch_time_seconds = max(existing.watch_time_seconds, payload.watch_time_seconds)
        existing.watched_full = existing.watched_full or payload.watched_full
    else:
        db.add(
            ReelView(
                post_id=reel_id,
                viewer_id=current_user.id,
                watch_time_seconds=payload.watch_time_seconds,
                watched_full=payload.watched_full,
                device_type=payload.device_type,
                source=payload.source,
            )
        )
        post.views_count_unique += 1

    post.views_count += 1
    stats_stmt = select(
        func.avg(ReelView.watch_time_seconds),
        func.avg(func.cast(ReelView.watched_full, Float)),
        func.count(ReelView.id),
    ).where(ReelView.post_id == reel_id)
    avg_watch, completion, count = (await db.execute(stats_stmt)).one()
    post.avg_watch_time_seconds = float(avg_watch or 0)
    post.completion_rate = float(completion or 0)
    post.viral_score = round((post.views_count_unique / max(1, count or 1)) * (1 + post.completion_rate), 4)

    await db.flush()
    return {"ok": True, "views_count": post.views_count, "views_unique": post.views_count_unique}


@router.get("/reels/{reel_id}", response_model=ReelResponse)
async def get_reel(reel_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.scalar(select(Post).where(and_(Post.id == reel_id, Post.is_reel.is_(True), Post.status == "published")))
    if not post:
        raise HTTPException(status_code=404, detail="Reel not found")
    return await _to_reel_response(post, current_user.id, db)


async def _to_reel_response(post: Post, viewer_id: UUID, db: AsyncSession) -> ReelResponse:
    await db.refresh(post, ["user"])
    is_followed = (
        await db.scalar(select(Follow.id).where(and_(Follow.follower_id == viewer_id, Follow.following_id == post.user_id)).limit(1))
    ) is not None
    hashtags = (
        await db.scalars(select(Hashtag.name).join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id).where(PostHashtag.post_id == post.id))
    ).all()

    return ReelResponse(
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
        media=[{"url": post.media_urls[0], "type": "video", "thumbnail_url": post.thumbnail_url, "width": 720, "height": 1280}],
        tagged_products=post.product_tags_positions or [],
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
        is_reel=True,
        video={
            "url_480p": post.media_urls[0],
            "url_720p": post.media_urls[0],
            "thumbnail_url": post.thumbnail_url or "",
            "duration_seconds": post.video_duration_seconds or 0,
            "aspect_ratio": post.aspect_ratio or "9:16",
        },
        views_unique=post.views_count_unique,
        completion_rate=post.completion_rate,
        viral_score=post.viral_score,
        hashtags=hashtags,
    )
