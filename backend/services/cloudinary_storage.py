"""
Cloudinary Storage Service — persistent image and video uploads with CDN.
Replaces local filesystem storage. All media gets public HTTPS URLs.
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
    "stories": "hispaloshop/stories",
    "reels": "hispaloshop/reels",
    "certificates": "hispaloshop/certificates",
    "chat": "hispaloshop/chat",
    "misc": "hispaloshop/misc",
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
                {"width": 1200, "crop": "limit"},
                {"quality": "auto:good"},
                {"fetch_format": "auto"},
            ],
            eager=[
                {"width": 400, "height": 400, "crop": "fill", "quality": "auto", "fetch_format": "auto"},
            ],
        )

        url = result.get("secure_url", "")
        thumb = ""
        if result.get("eager"):
            thumb = result["eager"][0].get("secure_url", "")

        logger.info(f"[CLOUDINARY] Image uploaded: {public_id} -> {url}")

        return {
            "url": url,
            "thumbnail": thumb,
            "public_id": result.get("public_id", ""),
            "width": result.get("width", 0),
            "height": result.get("height", 0),
            "format": result.get("format", ""),
            "bytes": result.get("bytes", 0),
            "resource_type": "image",
        }

    except Exception as e:
        logger.error(f"[CLOUDINARY] Image upload failed: {e}")
        raise


async def upload_video(file_bytes: bytes, folder: str = "reels", filename: str = None) -> dict:
    """
    Upload video to Cloudinary. Returns public URL + thumbnail.
    Auto-generates a poster thumbnail. Max recommended: 100MB.
    """
    cloud_folder = FOLDERS.get(folder, f"hispaloshop/{folder}")
    public_id = f"{cloud_folder}/{filename or uuid.uuid4().hex[:12]}"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="video",
            eager=[
                # Generate thumbnail at 1 second
                {"start_offset": "1", "width": 540, "crop": "limit", "format": "jpg", "quality": "auto"},
            ],
            eager_async=False,
        )

        url = result.get("secure_url", "")
        thumb = ""
        if result.get("eager"):
            thumb = result["eager"][0].get("secure_url", "")
        if not thumb:
            # Fallback: build thumbnail URL from the video public_id
            cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
            thumb = f"https://res.cloudinary.com/{cloud_name}/video/upload/so_1,w_540,q_auto,f_jpg/{result.get('public_id', '')}"

        logger.info(f"[CLOUDINARY] Video uploaded: {public_id} -> {url}")

        return {
            "url": url,
            "thumbnail": thumb,
            "public_id": result.get("public_id", ""),
            "duration": result.get("duration", 0),
            "width": result.get("width", 0),
            "height": result.get("height", 0),
            "format": result.get("format", ""),
            "bytes": result.get("bytes", 0),
            "resource_type": "video",
        }

    except Exception as e:
        logger.error(f"[CLOUDINARY] Video upload failed: {e}")
        raise


def get_optimized_url(public_id: str, width: int = 800) -> str:
    """Get an optimized Cloudinary URL with auto format and quality."""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/w_{width},q_auto,f_auto/{public_id}"


async def delete_media(public_id: str, resource_type: str = "image"):
    """Delete an image or video from Cloudinary."""
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
        logger.info(f"[CLOUDINARY] Deleted {resource_type}: {public_id} -> {result}")
        return result
    except Exception as e:
        logger.error(f"[CLOUDINARY] Delete failed: {e}")


# Keep legacy alias
async def delete_image(public_id: str):
    return await delete_media(public_id, resource_type="image")
