from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Post, PostSave, SavedCollection, User
from routers.auth import get_current_user
from schemas import SavedCollectionCreateRequest, SavedCollectionResponse

router = APIRouter()


@router.post("/collections", response_model=SavedCollectionResponse, status_code=201)
async def create_collection(payload: SavedCollectionCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    collection = SavedCollection(user_id=current_user.id, name=payload.name, description=payload.description, is_private=payload.is_private)
    db.add(collection)
    await db.flush()
    return collection


@router.get("/collections", response_model=list[SavedCollectionResponse])
async def get_my_collections(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(SavedCollection).where(SavedCollection.user_id == current_user.id).order_by(desc(SavedCollection.created_at)))).all()


@router.post("/collections/{collection_id}/posts/{post_id}")
async def add_post_to_collection(collection_id: UUID, post_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    collection = await db.get(SavedCollection, collection_id)
    post = await db.get(Post, post_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Collection not found")
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    save = await db.scalar(select(PostSave).where(and_(PostSave.user_id == current_user.id, PostSave.post_id == post_id)))
    if not save:
        save = PostSave(user_id=current_user.id, post_id=post_id)
        db.add(save)
        post.saves_count += 1
    save.collection_id = collection_id
    save.collection_name = collection.name
    collection.items_count = (collection.items_count or 0) + 1
    await db.flush()
    return {"ok": True}


@router.get("/collections/{collection_id}/posts")
async def get_collection_posts(collection_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    collection = await db.get(SavedCollection, collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Collection not found")

    saves = (
        await db.scalars(
            select(PostSave)
            .where(and_(PostSave.collection_id == collection_id, PostSave.user_id == current_user.id))
            .order_by(desc(PostSave.created_at))
        )
    ).all()
    return {"collection_id": str(collection_id), "posts": [str(save.post_id) for save in saves]}
