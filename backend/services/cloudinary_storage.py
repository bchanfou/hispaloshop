"""
Cloudinary Storage Service — persistent image uploads with CDN.
Replaces local filesystem storage. All images get public HTTPS URLs.
"""
import cloudinary
import cloudinary.uploader
import os
import uuid
import logging

logger = logging.getLogger(__name__)

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

FOLDERS = {
    "products": "hispaloshop/products",
    "avatars": "hispaloshop/avatars",
    "stores": "hispaloshop/stores",
    "posts": "hispaloshop/posts",
    "certificates": "hispaloshop/certificates",
    "chat": "hispaloshop/chat",
}


async def upload_image(file_bytes: bytes, folder: str = "products", filename: str = None) -> dict:
    """
    Upload image to Cloudinary. Returns public URL.
    Auto-converts to WebP, resizes to max 1200px, compresses for mobile.
    """
    cloud_folder = FOLDERS.get(folder, f"hispaloshop/{folder}")
    public_id = f"{cloud_folder}/{filename or uuid.uuid4().hex[:12]}"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 1200, "crop": "limit"},  # Max 1200px wide
                {"quality": "auto:good"},
                {"fetch_format": "auto"},  # WebP when supported
            ],
            eager=[
                {"width": 400, "height": 400, "crop": "fill", "quality": "auto", "fetch_format": "auto"},  # Thumbnail
            ],
        )

        url = result.get("secure_url", "")
        thumb = ""
        if result.get("eager"):
            thumb = result["eager"][0].get("secure_url", "")

        logger.info(f"[CLOUDINARY] Uploaded: {public_id} -> {url}")

        return {
            "url": url,
            "thumbnail": thumb,
            "public_id": result.get("public_id", ""),
            "width": result.get("width", 0),
            "height": result.get("height", 0),
            "format": result.get("format", ""),
            "bytes": result.get("bytes", 0),
        }

    except Exception as e:
        logger.error(f"[CLOUDINARY] Upload failed: {e}")
        raise


def get_optimized_url(public_id: str, width: int = 800) -> str:
    """Get an optimized Cloudinary URL with auto format and quality."""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/w_{width},q_auto,f_auto/{public_id}"


async def delete_image(public_id: str):
    """Delete an image from Cloudinary."""
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        logger.info(f"[CLOUDINARY] Deleted: {public_id} -> {result}")
        return result
    except Exception as e:
        logger.error(f"[CLOUDINARY] Delete failed: {e}")
