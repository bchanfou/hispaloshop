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
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    if not cloud_name:
        try:
            from core.config import settings
            cloud_name = settings.CLOUDINARY_CLOUD_NAME
        except Exception:
            pass
    if not cloud_name or cloud_name in ("", "PENDIENTE_REEMPLAZAR", "PENDIENTE"):
        raise HTTPException(
            status_code=503,
            detail="Image storage not configured. Contact the administrator."
        )


# Magic bytes for common image/video formats (server-side validation)
_MAGIC_BYTES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG': 'image/png',
    b'GIF8': 'image/gif',
    b'RIFF': 'image/webp',  # RIFF....WEBP
    b'\x00\x00\x00': 'video/mp4',  # ftyp box (MP4/MOV)
    b'\x1a\x45\xdf\xa3': 'video/webm',
}


def _validate_magic_bytes(content: bytes, claimed_type: str) -> bool:
    """Verify file content matches claimed MIME type via magic bytes."""
    if len(content) < 4:
        return False
    for magic, mime_prefix in _MAGIC_BYTES.items():
        if content[:len(magic)] == magic:
            # Accept if the magic byte type family matches the claimed type family
            return mime_prefix.split('/')[0] == claimed_type.split('/')[0]
    # If no magic byte matches, reject for safety
    return False


async def _upload_media(file: UploadFile, folder: str, max_bytes: int, allowed_types: set, user_id: str) -> dict:
    """Shared upload logic for images and videos."""
    _check_cloudinary_configured()
    if not file.content_type or file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Received: {file.content_type}")
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum {max_bytes // (1024 * 1024)}MB")
    # Server-side magic byte validation — prevents disguised executables
    if not _validate_magic_bytes(content, file.content_type):
        raise HTTPException(status_code=400, detail="File content does not match declared type. Upload rejected.")
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
    if not file.content_type or file.content_type not in allowed:
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
    if '..' in filename or '/' in filename or '\\' in filename or len(filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid filename")
    base_dir = Path("/app/uploads/products").resolve()
    file_path = (base_dir / filename).resolve()
    if not str(file_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/posts/{filename}")
async def get_post_image(filename: str):
    if '..' in filename or '/' in filename or '\\' in filename or len(filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid filename")
    base_dir = Path("/app/uploads/posts").resolve()
    file_path = (base_dir / filename).resolve()
    if not str(file_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/avatars/{filename}")
async def get_avatar_image(filename: str):
    if '..' in filename or '/' in filename or '\\' in filename or len(filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid filename")
    base_dir = Path("/app/uploads/avatars").resolve()
    file_path = (base_dir / filename).resolve()
    if not str(file_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/uploads/chat_images/{filename}")
async def get_chat_image(filename: str):
    if '..' in filename or '/' in filename or '\\' in filename or len(filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid filename")
    base_dir = Path("/app/uploads/chat_images").resolve()
    file_path = (base_dir / filename).resolve()
    if not str(file_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
