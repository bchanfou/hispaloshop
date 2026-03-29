"""
Endpoints de Social Feed.
Fase 3: Social Feed
"""
from fastapi import APIRouter, Depends, HTTPException, Query
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



# Todas las rutas de interacción con posts (like, save, comments, follow, GET detail)
# las sirve social.py usando db.user_posts (UUID post_id). Las implementaciones que
# había aquí usaban db.posts + ObjectId y fallaban para todos los posts del feed.
# Este router solo mantiene GET /feed (feed_algorithm legacy) y POST /admin/mark-viral.

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
