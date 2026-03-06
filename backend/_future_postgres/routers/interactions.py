from __future__ import annotations

from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import CommentLike, Post, PostComment, PostLike, PostSave, User
from routers.auth import get_current_user
from schemas import CommentCreateRequest, CommentResponse, FollowerResponse

router = APIRouter()


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    like = await db.scalar(select(PostLike).where(and_(PostLike.post_id == post_id, PostLike.user_id == current_user.id)))
    if like:
        await db.delete(like)
        post.likes_count = max(post.likes_count - 1, 0)
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        post.likes_count += 1
        liked = True
    await db.flush()
    return {"liked": liked, "likes_count": post.likes_count}


@router.get("/posts/{post_id}/likes", response_model=List[FollowerResponse])
async def get_likes(post_id: UUID, limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    likes = (await db.scalars(select(PostLike).where(PostLike.post_id == post_id).order_by(desc(PostLike.created_at)).limit(limit))).all()
    users = []
    for like in likes:
        user = await db.get(User, like.user_id)
        if user:
            users.append(
                FollowerResponse(
                    id=user.id,
                    full_name=user.full_name,
                    username=user.username,
                    avatar_url=user.avatar_url,
                    is_verified=user.is_verified,
                    followers_count=user.followers_count,
                )
            )
    return users


def _comment_to_schema(comment: PostComment, is_liked: bool = False) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        user={
            "id": comment.user.id,
            "full_name": comment.user.full_name,
            "avatar_url": comment.user.avatar_url,
            "is_verified": comment.user.is_verified,
        },
        content=comment.content,
        likes_count=comment.likes_count,
        is_liked_by_me=is_liked,
        is_edited=comment.is_edited,
        created_at=comment.created_at,
        replies=[_comment_to_schema(reply, False) for reply in comment.replies],
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    post_id: UUID,
    payload: CommentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if payload.parent_id:
        parent = await db.get(PostComment, payload.parent_id)
        if not parent or parent.post_id != post_id or parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Invalid parent comment")

    comment = PostComment(post_id=post_id, user_id=current_user.id, content=payload.content, parent_id=payload.parent_id)
    db.add(comment)
    post.comments_count += 1
    await db.flush()
    await db.refresh(comment, ["user", "replies"])
    return _comment_to_schema(comment)


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    comments = (
        await db.scalars(
            select(PostComment)
            .where(and_(PostComment.post_id == post_id, PostComment.parent_id.is_(None)))
            .order_by(desc(PostComment.created_at))
        )
    ).all()
    output = []
    for comment in comments:
        await db.refresh(comment, ["user", "replies"])
        for reply in comment.replies:
            await db.refresh(reply, ["user"])
        is_liked = await db.scalar(
            select(CommentLike.id).where(and_(CommentLike.comment_id == comment.id, CommentLike.user_id == current_user.id)).limit(1)
        )
        output.append(_comment_to_schema(comment, bool(is_liked)))
    return output


@router.post("/comments/{comment_id}/like")
async def toggle_comment_like(comment_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    comment = await db.get(PostComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    like = await db.scalar(
        select(CommentLike).where(and_(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id))
    )
    if like:
        await db.delete(like)
        comment.likes_count = max(comment.likes_count - 1, 0)
        liked = False
    else:
        db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
        comment.likes_count += 1
        liked = True
    await db.flush()
    return {"liked": liked, "likes_count": comment.likes_count}


@router.post("/posts/{post_id}/save")
async def toggle_save(post_id: UUID, collection_name: Optional[str] = None, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    saved = await db.scalar(select(PostSave).where(and_(PostSave.post_id == post_id, PostSave.user_id == current_user.id)))
    if saved:
        await db.delete(saved)
        post.saves_count = max(post.saves_count - 1, 0)
        status = False
    else:
        db.add(PostSave(post_id=post_id, user_id=current_user.id, collection_name=collection_name))
        post.saves_count += 1
        status = True
    await db.flush()
    return {"saved": status}


@router.get("/users/me/saved-posts")
async def get_saved_posts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    saves = (await db.scalars(select(PostSave).where(PostSave.user_id == current_user.id).order_by(desc(PostSave.created_at)))).all()
    grouped: Dict[str, List[str]] = {}
    for save in saves:
        key = save.collection_name or "default"
        grouped.setdefault(key, []).append(str(save.post_id))
    return grouped
