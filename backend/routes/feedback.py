"""
Feedback Routes — User feedback and feature requests API.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Literal
from pydantic import BaseModel

from core.auth import get_current_user, require_role
from core.models import User
from services.feedback_service import feedback_service


def require_admin_role():
    """Dependency factory to require admin/super_admin role."""
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        await require_role(user, ["admin", "super_admin"])
        return user
    return role_checker

router = APIRouter(prefix="/feedback", tags=["feedback"])


class SubmitFeedbackBody(BaseModel):
    feedback_type: Literal["bug", "feature", "improvement", "other"]
    title: str
    description: str
    category: Optional[str] = None


class UpdateStatusBody(BaseModel):
    status: Literal["pending", "under_review", "planned", "in_progress", "done", "declined"]
    admin_notes: Optional[str] = None


@router.post("")
async def submit_feedback(
    body: SubmitFeedbackBody,
    user: User = Depends(get_current_user)
):
    """Submit new feedback or feature request."""
    try:
        result = await feedback_service.submit_feedback(
            user_id=user.user_id,
            user_role=user.role,
            feedback_type=body.feedback_type,
            title=body.title,
            description=body.description,
            category=body.category
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{feedback_id}/vote")
async def vote_feedback(
    feedback_id: str,
    user: User = Depends(get_current_user)
):
    """Vote (or unvote) on a feedback item."""
    try:
        result = await feedback_service.vote_feedback(
            feedback_id=feedback_id,
            user_id=user.user_id,
            user_role=user.role
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def list_feedback(
    feedback_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("popular", regex="^(popular|newest|trending)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user)
):
    """Get paginated feedback list."""
    try:
        result = await feedback_service.get_feedback_list(
            user_id=user.user_id,
            feedback_type=feedback_type,
            status=status,
            sort_by=sort_by,
            page=page,
            limit=limit
        )
        return {"success": True, "data": result}
    except Exception as e:
        # Log error but return empty list - don't break the UI
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching feedback: {e}")
        return {
            "success": True, 
            "data": {
                "items": [],
                "total": 0,
                "page": page,
                "has_more": False
            }
        }


@router.get("/{feedback_id}")
async def get_feedback_detail(
    feedback_id: str,
    user: User = Depends(get_current_user)
):
    """Get single feedback details."""
    feedback = await feedback_service.get_feedback_detail(feedback_id, user.user_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback no encontrado")
    return {"success": True, "data": feedback}


# Admin endpoints

@router.get("/admin/all")
async def admin_list_all(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_admin_role())
):
    """Admin: list all feedback including non-public."""
    from core.database import db
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    cursor = db.feedback.find(query).sort([("created_at", -1)]).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    total = await db.feedback.count_documents(query)
    
    for item in items:
        item["feedback_id"] = str(item.pop("_id"))
        item["voter_count"] = len(item.get("voters", []))
        del item["voters"]
    
    return {
        "success": True,
        "data": {"items": items, "total": total, "page": page}
    }


@router.patch("/admin/{feedback_id}/status")
async def admin_update_status(
    feedback_id: str,
    body: UpdateStatusBody,
    user: User = Depends(require_admin_role())
):
    """Admin: update feedback status."""
    success = await feedback_service.update_status(
        feedback_id=feedback_id,
        new_status=body.status,
        admin_notes=body.admin_notes
    )
    if not success:
        raise HTTPException(status_code=404, detail="Feedback no encontrado")
    return {"success": True, "message": "Estado actualizado"}


@router.get("/admin/stats")
async def admin_stats(
    user: User = Depends(require_admin_role())
):
    """Admin: get feedback statistics."""
    stats = await feedback_service.get_admin_stats()
    return {"success": True, "data": stats}
