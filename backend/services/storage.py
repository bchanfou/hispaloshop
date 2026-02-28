"""
Storage service abstraction for Hispaloshop.
Provides a unified interface for file uploads.
Currently uses local disk; ready to swap to S3/R2.
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, HTTPException

logger = logging.getLogger("server")

# Configuration
STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local")  # "local" or "s3"
LOCAL_UPLOAD_DIR = Path("/app/uploads")
# S3 config (for future use)
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_REGION = os.environ.get("S3_REGION", "")
S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "")

# Ensure local dirs exist
for subdir in ["products", "stores", "avatars", "posts", "chat_images"]:
    (LOCAL_UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)


async def upload_file(
    file: UploadFile,
    directory: str,
    max_size_mb: int = 10,
    allowed_types: list = None
) -> str:
    """
    Upload a file and return its public URL path.
    
    Args:
        file: The uploaded file
        directory: Subdirectory (e.g., "products", "avatars", "posts")
        max_size_mb: Maximum file size in MB
        allowed_types: List of allowed MIME type prefixes (e.g., ["image/"])
    
    Returns:
        URL path string (e.g., "/uploads/avatars/avatar_abc123.jpg")
    """
    if allowed_types:
        if not any(file.content_type.startswith(t) for t in allowed_types):
            raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    contents = await file.read()
    if len(contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {max_size_mb}MB limit")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{directory}_{uuid.uuid4().hex[:12]}.{file_ext}"
    
    if STORAGE_BACKEND == "s3":
        return await _upload_s3(contents, directory, filename)
    else:
        return _upload_local(contents, directory, filename)


def _upload_local(contents: bytes, directory: str, filename: str) -> str:
    """Save file to local disk."""
    dir_path = LOCAL_UPLOAD_DIR / directory
    dir_path.mkdir(parents=True, exist_ok=True)
    
    file_path = dir_path / filename
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return f"/uploads/{directory}/{filename}"


async def _upload_s3(contents: bytes, directory: str, filename: str) -> str:
    """Upload to S3-compatible storage. Placeholder for future implementation."""
    # When ready, implement:
    # import boto3
    # s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, region_name=S3_REGION)
    # key = f"{directory}/{filename}"
    # s3.put_object(Bucket=S3_BUCKET, Key=key, Body=contents)
    # return f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
    raise NotImplementedError("S3 storage not configured. Set STORAGE_BACKEND=local or configure S3 credentials.")
