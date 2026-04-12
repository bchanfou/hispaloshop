"""
Feedback Routes — Section 3.7: User Feedback System (público con votos).

Public idea board where users propose, vote, and comment on ideas.
Country admins manage status and close duplicates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, Literal
from pydantic import BaseModel, Field

from core.auth import get_current_user, get_optional_user, require_country_admin
from core.models import User
from services.feedback_service import feedback_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ─── Request bodies ───────────────────────────────────────────────────────────

class CreateIdeaBody(BaseModel):
    title: str = Field(..., min_length=5, max_length=120)
    description: str = Field(..., min_length=20, max_length=2000)
    category: Literal["ux", "feature", "content", "commerce", "b2b", "mobile", "i18n", "other"]

class UpdateIdeaBody(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=120)
    description: Optional[str] = Field(None, min_length=20, max_length=2000)
    category: Optional[Literal["ux", "feature", "content", "commerce", "b2b", "mobile", "i18n", "other"]] = None

class ChangeStatusBody(BaseModel):
    status: Literal["new", "under_review", "planned", "in_progress", "implemented", "declined"]
    status_note: Optional[str] = Field(None, max_length=500)

class CloseAsDuplicateBody(BaseModel):
    target_idea_id: str

class AddCommentBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)

class EditCommentBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)


# ─── Public / User endpoints ─────────────────────────────────────────────────

@router.post("/ideas")
async def create_idea(payload: CreateIdeaBody, user: User = Depends(get_current_user)):
    """Create a new idea (auth required)."""
    try:
        result = await feedback_service.create_idea(
            user_id=user.user_id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ideas")
async def list_ideas(
    request: Request,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort: str = Query("popular", regex="^(popular|recent|mine)$"),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: Optional[User] = Depends(get_optional_user),
):
    """List ideas — public (no auth required for reading)."""
    result = await feedback_service.list_ideas(
        status=status,
        category=category,
        sort=sort,
        search=search,
        user_id=user.user_id if user else None,
        page=page,
        limit=limit,
    )
    return {"success": True, "data": result}


@router.get("/ideas/{slug}")
async def get_idea_detail(
    slug: str,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
):
    """Get idea detail by slug — public."""
    idea = await feedback_service.get_idea_by_slug(slug, user_id=user.user_id if user else None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea no encontrada")
    return {"success": True, "data": idea}


@router.patch("/ideas/{idea_id}")
async def update_idea(idea_id: str, payload: UpdateIdeaBody, user: User = Depends(get_current_user)):
    """Edit own idea (auth, author only)."""
    try:
        result = await feedback_service.update_idea(
            idea_id=idea_id,
            user_id=user.user_id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, user: User = Depends(get_current_user)):
    """Delete own idea (blocked if >5 votes)."""
    try:
        await feedback_service.delete_idea(idea_id, user.user_id)
        return {"success": True, "message": "Idea eliminada"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ideas/{idea_id}/vote")
async def toggle_vote(idea_id: str, user: User = Depends(get_current_user)):
    """Toggle vote on idea (auth required)."""
    try:
        result = await feedback_service.toggle_vote(idea_id, user.user_id)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ideas/{idea_id}/comments")
async def add_comment(idea_id: str, payload: AddCommentBody, user: User = Depends(get_current_user)):
    """Add comment to idea (auth required)."""
    try:
        result = await feedback_service.add_comment(idea_id, user.user_id, payload.body)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ideas/{idea_id}/comments")
async def list_comments(
    idea_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
):
    """List comments for idea — public."""
    result = await feedback_service.list_comments(idea_id, page, limit)
    return {"success": True, "data": result}


@router.patch("/comments/{comment_id}")
async def edit_comment(comment_id: str, payload: EditCommentBody, user: User = Depends(get_current_user)):
    """Edit own comment."""
    try:
        result = await feedback_service.edit_comment(comment_id, user.user_id, payload.body)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: User = Depends(get_current_user)):
    """Soft-delete own comment."""
    try:
        await feedback_service.delete_comment(comment_id, user.user_id)
        return {"success": True, "message": "Comentario eliminado"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Country Admin endpoints ─────────────────────────────────────────────────

@router.get("/admin/ideas")
async def admin_list_ideas(
    request: Request,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort: str = Query("popular", regex="^(popular|recent)$"),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Country admin: list ideas scoped to country."""
    country_code = await require_country_admin(user, request)
    result = await feedback_service.list_ideas(
        status=status,
        category=category,
        sort=sort,
        search=search,
        country_code=country_code if country_code else None,
        user_id=user.user_id,
        page=page,
        limit=limit,
    )
    return {"success": True, "data": result}


@router.patch("/admin/ideas/{idea_id}/status")
async def admin_change_status(
    idea_id: str,
    payload: ChangeStatusBody,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Country admin: change idea status with optional note."""
    await require_country_admin(user, request)
    try:
        result = await feedback_service.admin_change_status(
            idea_id=idea_id,
            new_status=payload.status,
            admin_id=user.user_id,
            status_note=payload.status_note,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/ideas/{idea_id}/close-duplicate")
async def admin_close_as_duplicate(
    idea_id: str,
    payload: CloseAsDuplicateBody,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Country admin: close idea as duplicate of another."""
    await require_country_admin(user, request)
    try:
        result = await feedback_service.admin_close_as_duplicate(
            idea_id=idea_id,
            target_idea_id=payload.target_idea_id,
            admin_id=user.user_id,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/metrics")
async def admin_metrics(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Country admin: feedback KPIs."""
    country_code = await require_country_admin(user, request)
    result = await feedback_service.admin_metrics(country_code=country_code if country_code else None)
    return {"success": True, "data": result}


# ─── Legacy compatibility (old feedback.py endpoints) ─────────────────────────
# The old FeedbackPage.tsx used /feedback (POST) and /feedback (GET).
# Keep them working by delegating to the new service.

class LegacySubmitBody(BaseModel):
    feedback_type: Literal["bug", "feature", "improvement", "other"] = "feature"
    title: str
    description: str

@router.post("")
async def legacy_submit(payload: LegacySubmitBody, user: User = Depends(get_current_user)):
    """Legacy: create idea from old feedback form."""
    category_map = {"bug": "other", "feature": "feature", "improvement": "ux", "other": "other"}
    try:
        result = await feedback_service.create_idea(
            user_id=user.user_id,
            title=payload.title,
            description=payload.description,
            category=category_map.get(payload.feedback_type, "other"),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def legacy_list(
    request: Request,
    feedback_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("popular", regex="^(popular|newest|trending)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: Optional[User] = Depends(get_optional_user),
):
    """Legacy: list feedback as ideas."""
    sort_map = {"popular": "popular", "newest": "recent", "trending": "popular"}
    result = await feedback_service.list_ideas(
        category=feedback_type if feedback_type in ("ux", "feature", "content", "commerce", "b2b", "mobile", "i18n", "other") else None,
        status=status,
        sort=sort_map.get(sort_by, "popular"),
        user_id=user.user_id if user else None,
        page=page,
        limit=limit,
    )
    # Map to legacy format
    for item in result.get("items", []):
        item["feedback_id"] = item.get("idea_id")
        item["type"] = item.get("category", "other")
        item["votes"] = item.get("vote_count", 0)
        item["voter_count"] = item.get("vote_count", 0)
    return {"success": True, "data": result}


@router.post("/{feedback_id}/vote")
async def legacy_vote(feedback_id: str, user: User = Depends(get_current_user)):
    """Legacy: vote by feedback_id (which is now idea_id)."""
    try:
        result = await feedback_service.toggle_vote(feedback_id, user.user_id)
        return {"success": True, "data": {"voted": result["voted"], "votes": result["vote_count"]}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Legacy admin endpoints (keep working for old admin pages)
@router.get("/admin/all")
async def legacy_admin_list(
    request: Request,
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Legacy admin: list all ideas."""
    await require_country_admin(user, request)
    result = await feedback_service.list_ideas(status=status, page=page, limit=limit)
    for item in result.get("items", []):
        item["feedback_id"] = item.get("idea_id")
        item["votes"] = item.get("vote_count", 0)
        item["voter_count"] = item.get("vote_count", 0)
    return {"success": True, "data": result}


@router.get("/admin/stats")
async def legacy_admin_stats(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Legacy admin: feedback stats."""
    await require_country_admin(user, request)
    result = await feedback_service.admin_metrics()
    return {"success": True, "data": result}
