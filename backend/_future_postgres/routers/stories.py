from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Follow, Story, StoryView, User
from routers.auth import get_current_user

router = APIRouter()


def _safe_json(value: Optional[str]):
    return json.loads(value) if value else None


@router.post("/stories", status_code=201)
async def create_story(
    media: UploadFile = File(...),
    tagged_product_id: Optional[UUID] = Form(None),
    polls: Optional[str] = Form(None),
    questions: Optional[str] = Form(None),
    sliders: Optional[str] = Form(None),
    countdowns: Optional[str] = Form(None),
    links: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    active_count = await db.scalar(
        select(Story.id).where(and_(Story.user_id == current_user.id, Story.expires_at > datetime.now(timezone.utc)))
    )
    if active_count and len((await db.scalars(select(Story).where(and_(Story.user_id == current_user.id, Story.expires_at > datetime.now(timezone.utc))))).all()) >= 100:
        raise HTTPException(status_code=400, detail="Maximum active stories reached")

    upload_dir = "uploads/stories"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(media.filename or "")[1]
    filename = f"{uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await media.read())

    story = Story(
        user_id=current_user.id,
        media_url=f"/uploads/stories/{filename}",
        media_type="video" if (media.content_type or "").startswith("video") else "image",
        tagged_product_id=tagged_product_id,
        polls=_safe_json(polls),
        questions=_safe_json(questions),
        sliders=_safe_json(sliders),
        countdowns=_safe_json(countdowns),
        links=_safe_json(links),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(story)
    await db.flush()
    return {"id": story.id, "expires_at": story.expires_at}


@router.get("/stories/feed")
async def stories_feed(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    following = select(Follow.following_id).where(Follow.follower_id == current_user.id)
    stories = (
        await db.scalars(
            select(Story)
            .where(and_(Story.user_id.in_(following), Story.expires_at > now))
            .order_by(desc(Story.created_at))
        )
    ).all()
    by_user = {}
    for st in stories:
        by_user.setdefault(st.user_id, []).append(st)

    payload = []
    for user_id, user_stories in by_user.items():
        story_ids = [s.id for s in user_stories]
        total_active_stories = len(story_ids)
        viewed_count = await db.scalar(
            select(func.count())
            .select_from(StoryView)
            .where(and_(StoryView.viewer_id == current_user.id, StoryView.story_id.in_(story_ids)))
        )
        user = await db.get(User, user_id)
        payload.append(
            {
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "username": user.username,
                    "avatar_url": user.avatar_url,
                    "is_followed_by_me": True,
                    "is_verified": user.is_verified,
                },
                "has_unviewed_stories": (viewed_count or 0) < total_active_stories,
                "latest_story_thumbnail": user_stories[0].media_url,
            }
        )
    return payload


@router.get("/stories/{user_id}")
async def get_user_stories(user_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    del current_user
    stories = (
        await db.scalars(
            select(Story).where(and_(Story.user_id == user_id, Story.expires_at > datetime.now(timezone.utc))).order_by(Story.created_at)
        )
    ).all()
    return stories


@router.post("/stories/{story_id}/view")
async def view_story(story_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    story = await db.get(Story, story_id)
    if not story or story.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Story not found")
    exists = await db.scalar(select(StoryView).where(and_(StoryView.story_id == story_id, StoryView.viewer_id == current_user.id)))
    if not exists:
        db.add(StoryView(story_id=story_id, viewer_id=current_user.id))
        story.views_unique_count += 1
    story.views_count += 1
    await db.flush()
    return {"ok": True, "views_count": story.views_count}


@router.post("/stories/{story_id}/reply")
async def reply_story(story_id: UUID, message: str = Form(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    story = await db.get(Story, story_id)
    if not story or story.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Story not found")
    view = await db.scalar(select(StoryView).where(and_(StoryView.story_id == story_id, StoryView.viewer_id == current_user.id)))
    if not view:
        view = StoryView(story_id=story_id, viewer_id=current_user.id)
        db.add(view)
    view.replied = True
    await db.flush()
    return {"ok": True, "message": message, "status": "queued_for_private_chat"}
