"""
Endpoints de Social Feed.
Fase 3: Social Feed
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import logging

from services.feed_algorithm import feed_algorithm

logger = logging.getLogger(__name__)
from core.database import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("/feed")
async def get_feed(
    type: str = Query("for_you"),
    page: int = 1,
    limit: int = Query(20, le=50),
    current_user = Depends(get_current_user)
):
    """Feed social personalizado"""
    feed_items = await feed_algorithm.generate_feed(
        user_id=current_user.user_id,
        tenant_id=getattr(current_user, 'country', None) or "ES",
        page=page,
        limit=limit,
        feed_type=type
    )
    
    posts = []
    for item in feed_items:
        post = item["post"]
        post["score_reason"] = item.get("reason", "Personalizado")
        post["id"] = str(post.pop("_id", ""))
        posts.append(post)
    
    # Loguear views
    for post in posts:
        await feed_algorithm.log_interaction(
            user_id=current_user.user_id,
            tenant_id=getattr(current_user, 'country', None) or "ES",
            action_type="view_post",
            post_id=post.get("id")
        )
    
    return {
        "success": True,
        "data": {
            "posts": posts,
            "meta": {"page": page, "limit": limit, "type": type, "has_more": len(posts) == limit}
        }
    }



# POST /posts creation is handled by social.py (accepts FormData + file uploads).
# This router only handles feed queries and post interactions below.


@router.get("/{post_id}")
async def get_post_detail(
    post_id: str,
    current_user = Depends(get_current_user)
):
    """Detalle de post con comentarios"""
    db = get_db()
    from bson.objectid import ObjectId
    
    try:
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Comentarios
    comments = await db.comments.find({
        "post_id": post_id,
        "status": "active",
        "parent_id": None
    }).sort("created_at", -1).limit(50).to_list(length=50)
    
    # Replies
    for comment in comments:
        replies = await db.comments.find({
            "parent_id": str(comment.get("_id")),
            "status": "active"
        }).sort("created_at", 1).limit(10).to_list(length=10)
        for r in replies:
            r["id"] = str(r.pop("_id", ""))
        comment["replies"] = replies
        comment["id"] = str(comment.pop("_id", ""))
    
    # Check si user ha dado like/save
    user_id = current_user.user_id
    post["user_has_liked"] = user_id in post.get("liked_by", [])
    post["user_has_saved"] = user_id in post.get("saved_by", [])
    post["id"] = str(post.pop("_id", ""))
    
    # Incrementar views
    await db.posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"views_count": 1}})
    
    return {"success": True, "data": {"post": post, "comments": comments}}


@router.post("/{post_id}/like")
async def like_post(
    post_id: str,
    current_user = Depends(get_current_user)
):
    """Like/unlike post"""
    db = get_db()
    from bson.objectid import ObjectId
    
    try:
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_id = current_user.user_id
    liked_by = post.get("liked_by", [])
    
    if user_id in liked_by:
        # Unlike
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"liked_by": user_id}, "$inc": {"likes_count": -1}}
        )
        action = "unliked"
    else:
        # Like
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"liked_by": user_id}, "$inc": {"likes_count": 1}, "$set": {"last_engagement_at": datetime.now(timezone.utc)}}
        )
        action = "liked"
        
        await feed_algorithm.log_interaction(
            user_id=user_id,
            tenant_id=getattr(current_user, 'country', None) or "ES",
            action_type="like_post",
            post_id=post_id
        )
    
    return {"success": True, "action": action}


@router.post("/{post_id}/save")
async def save_post(
    post_id: str,
    current_user = Depends(get_current_user)
):
    """Guardar post"""
    db = get_db()
    from bson.objectid import ObjectId
    
    try:
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_id = current_user.user_id
    saved_by = post.get("saved_by", [])
    
    if user_id in saved_by:
        # Unsave
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"saved_by": user_id}, "$inc": {"saves_count": -1}}
        )
        await db.collections.update_one(
            {"user_id": user_id},
            {"$pull": {"items": {"type": "post", "id": post_id}}}
        )
        action = "unsaved"
    else:
        # Save
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"saved_by": user_id}, "$inc": {"saves_count": 1}}
        )
        await db.collections.update_one(
            {"user_id": user_id, "name": "Guardados"},
            {
                "$push": {"items": {"type": "post", "id": post_id, "saved_at": datetime.now(timezone.utc)}},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc), "tenant_id": getattr(current_user, 'country', None) or "ES"}
            },
            upsert=True
        )
        action = "saved"
        
        await feed_algorithm.log_interaction(
            user_id=user_id,
            tenant_id=getattr(current_user, 'country', None) or "ES",
            action_type="save_post",
            post_id=post_id
        )
    
    return {"success": True, "action": action}


@router.post("/{post_id}/comments")
async def add_comment(
    post_id: str,
    content: str,
    parent_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Añadir comentario"""
    db = get_db()
    from bson.objectid import ObjectId
    
    try:
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Detectar pregunta sobre producto
    tagged_product_question = None
    for tp in post.get("tagged_products", []):
        if tp.get("product_name", "").lower() in content.lower():
            tagged_product_question = tp.get("product_id")
            break
    
    comment_doc = {
        "post_id": post_id,
        "tenant_id": getattr(current_user, 'country', None) or "ES",
        "author_id": current_user.user_id,
        "author_name": getattr(current_user, 'name', 'Unknown'),
        "author_avatar": getattr(current_user, 'picture', None),
        "author_type": current_user.role,
        "content": content,
        "parent_id": parent_id,
        "tagged_product_question": tagged_product_question,
        "likes_count": 0,
        "liked_by": [],
        "is_pinned": False,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.comments.insert_one(comment_doc)
    
    # Incrementar contador
    await db.posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"comments_count": 1}})
    
    await feed_algorithm.log_interaction(
        user_id=current_user.user_id,
        tenant_id=getattr(current_user, 'country', None) or "ES",
        action_type="comment_post",
        post_id=post_id
    )
    
    comment_doc["id"] = str(result.inserted_id)
    return {"success": True, "data": comment_doc}


# NOTA: follow y user-posts eliminados aquí — la autoridad canónica es social.py
# que usa db.user_follows y db.user_posts (colecciones activas).
# Las rutas /api/users/{id}/follow y /api/users/{id}/posts las sirve social.py.

@router.post("/admin/mark-viral")
async def admin_mark_viral(
    current_user = Depends(get_current_user)
):
    """Admin: Marca posts virales"""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await feed_algorithm.mark_viral_posts(
        tenant_id=getattr(current_user, 'country', None) or "ES"
    )
    
    return {"success": True, "data": result}
