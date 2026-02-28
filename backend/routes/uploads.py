"""
Image upload endpoints (Cloudinary CDN) and static file serving.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional
import os
import logging
import uuid
from pathlib import Path

from core.database import db
from core.models import User
from core.auth import get_current_user, require_role
from services.cloudinary_storage import upload_image as cloudinary_upload

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload/product-image")
async def upload_product_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a product image to Cloudinary. Returns public CDN URL."""
    await require_role(user, ["producer", "admin"])
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB")
    
    result = await cloudinary_upload(content, folder="products", filename=f"{user.user_id}_{uuid.uuid4().hex[:8]}")
    logger.info(f"[CLOUDINARY] Product image uploaded by {user.user_id}: {result['url']}")
    return {"url": result["url"], "thumbnail": result.get("thumbnail", ""), "filename": result.get("public_id", "")}

@router.post("/upload/chat-image")
async def upload_chat_image_cloudinary(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a chat image to Cloudinary."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB")
    result = await cloudinary_upload(content, folder="chat", filename=f"chat_{uuid.uuid4().hex[:8]}")
    return {"image_url": result["url"]}

# Legacy local file serving (backward compatibility for old uploads)
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
