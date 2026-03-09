"""
Media upload endpoints (Cloudinary CDN) — images and videos.
Supports: products, avatars, stories, reels, posts, chat, certificates.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
import os
import logging
import uuid
from pathlib import Path

from core.database import db
from core.models import User
from core.auth import get_current_user, require_role
from services.cloudinary_storage import upload_image as cloudinary_upload_image, upload_video as cloudinary_upload_video

logger = logging.getLogger(__name__)
router = APIRouter()

_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/mpeg"}
_MEDIA_TYPES = _IMAGE_TYPES | _VIDEO_TYPES


def _check_cloudinary_configured():
    if not os.environ.get("CLOUDINARY_CLOUD_NAME") or os.environ.get("CLOUDINARY_CLOUD_NAME") == "PENDIENTE_REEMPLAZAR":
        raise HTTPException(
            status_code=503,
            detail="Image storage not configured. Contact the administrator."
        )


async def _upload_media(file: UploadFile, folder: str, max_bytes: int, allowed_types: set, user_id: str) -> dict:
    """Shared upload logic for images and videos."""
    _check_cloudinary_configured()
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Received: {file.content_type}")
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum {max_bytes // (1024 * 1024)}MB")
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}"
    if file.content_type in _VIDEO_TYPES:
        return await cloudinary_upload_video(content, folder=folder, filename=filename)
    return await cloudinary_upload_image(content, folder=folder, filename=filename)


# ── Product image ──────────────────────────────────────────────

@router.post("/upload/product-image")
async def upload_product_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a product image. Returns public CDN URL."""
    await require_role(user, ["producer", "importer", "admin", "super_admin"])
    result = await _upload_media(file, folder="products", max_bytes=10 * 1024 * 1024, allowed_types=_IMAGE_TYPES, user_id=user.user_id)
    logger.info(f"[UPLOAD] Product image by {user.user_id}: {result['url']}")
    return {"url": result["url"], "thumbnail": result.get("thumbnail", ""), "public_id": result.get("public_id", "")}


# ── Avatar ─────────────────────────────────────────────────────

@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload user profile picture. Saves URL to user document."""
    result = await _upload_media(file, folder="avatars", max_bytes=5 * 1024 * 1024, allowed_types=_IMAGE_TYPES, user_id=user.user_id)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"profile_image": result["url"], "picture": result["url"]}}
    )
    logger.info(f"[UPLOAD] Avatar by {user.user_id}: {result['url']}")
    return {"url": result["url"], "public_id": result.get("public_id", "")}


# ── Story media (image or short video) ────────────────────────

@router.post("/upload/story")
async def upload_story_media(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a story image or video (max 60MB). Returns CDN URL + thumbnail."""
    result = await _upload_media(file, folder="stories", max_bytes=60 * 1024 * 1024, allowed_types=_MEDIA_TYPES, user_id=user.user_id)
    logger.info(f"[UPLOAD] Story media by {user.user_id}: {result['url']}")
    return {
        "url": result["url"],
        "thumbnail": result.get("thumbnail", ""),
        "media_type": result.get("resource_type", "image"),
        "public_id": result.get("public_id", ""),
    }


# ── Reel video ────────────────────────────────────────────────

@router.post("/upload/reel")
async def upload_reel_video(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a reel video (max 100MB). Returns CDN URL + auto-generated thumbnail."""
    result = await _upload_media(file, folder="reels", max_bytes=100 * 1024 * 1024, allowed_types=_VIDEO_TYPES | _IMAGE_TYPES, user_id=user.user_id)
    logger.info(f"[UPLOAD] Reel by {user.user_id}: {result['url']}")
    return {
        "url": result["url"],
        "thumbnail": result.get("thumbnail", ""),
        "duration": result.get("duration", 0),
        "media_type": result.get("resource_type", "video"),
        "public_id": result.get("public_id", ""),
    }


# ── Post image / video ────────────────────────────────────────

@router.post("/upload/post")
async def upload_post_media(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a post image or video (max 50MB)."""
    result = await _upload_media(file, folder="posts", max_bytes=50 * 1024 * 1024, allowed_types=_MEDIA_TYPES, user_id=user.user_id)
    logger.info(f"[UPLOAD] Post media by {user.user_id}: {result['url']}")
    return {
        "url": result["url"],
        "thumbnail": result.get("thumbnail", ""),
        "media_type": result.get("resource_type", "image"),
        "public_id": result.get("public_id", ""),
    }


# ── Generic (certificates, documents) ────────────────────────

@router.post("/upload")
async def upload_generic_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Generic upload for certificates and admin flows (PDF/image, max 10MB)."""
    await require_role(user, ["producer", "importer", "admin", "super_admin"])
    allowed = {"application/pdf"} | _IMAGE_TYPES
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPEG, PNG, WebP")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB")
    folder = "certificates" if file.content_type == "application/pdf" else "misc"
    result = await cloudinary_upload_image(content, folder=folder, filename=f"{user.user_id}_{uuid.uuid4().hex[:8]}")
    logger.info(f"[UPLOAD] Generic file by {user.user_id}: {result['url']}")
    return {"url": result["url"], "filename": result.get("public_id", "")}


# ── Chat image ────────────────────────────────────────────────

@router.post("/upload/chat-image")
async def upload_chat_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a chat image (max 5MB)."""
    result = await _upload_media(file, folder="chat", max_bytes=5 * 1024 * 1024, allowed_types=_IMAGE_TYPES, user_id=user.user_id)
    return {"image_url": result["url"]}


# ── Legacy local file serving (backward compatibility) ───────

@router.get("/uploads/products/{filename}")
async def get_product_image(filename: str):
    file_path = Path("/app/uploads/products") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/posts/{filename}")
async def get_post_image(filename: str):
    file_path = Path("/app/uploads/posts") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/avatars/{filename}")
async def get_avatar_image(filename: str):
    file_path = Path("/app/uploads/avatars") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/chat_images/{filename}")
async def get_chat_image(filename: str):
    file_path = Path("/app/uploads/chat_images") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
