"""
Cloudinary Storage Service — persistent image and video uploads with CDN.
Replaces local filesystem storage. All media gets public HTTPS URLs.
"""
import asyncio
import cloudinary
import cloudinary.uploader
import os
import re
import uuid
import logging
from functools import partial

logger = logging.getLogger(__name__)

# Initialize Cloudinary — use settings (pydantic) with os.environ fallback
def _get_cloud_var(name):
    """Read from os.environ first, then from pydantic settings."""
    val = os.environ.get(name)
    if val:
        return val
    try:
        from core.config import settings
        return getattr(settings, name, None)
    except Exception:
        return None

_cloud_name = _get_cloud_var("CLOUDINARY_CLOUD_NAME")
_api_key = _get_cloud_var("CLOUDINARY_API_KEY")
_api_secret = _get_cloud_var("CLOUDINARY_API_SECRET")

# Clear any CLOUDINARY_URL from environment — it overrides explicit config
# and may contain placeholder values from Railway addons
if "CLOUDINARY_URL" in os.environ:
    logger.warning("[CLOUDINARY] Removing CLOUDINARY_URL from env to prevent override")
    del os.environ["CLOUDINARY_URL"]

cloudinary.config(
    cloud_name=_cloud_name,
    api_key=_api_key,
    api_secret=_api_secret,
    secure=True,
    upload_preset=None,
)

if _cloud_name and _api_key and _api_secret:
    logger.info(f"[CLOUDINARY] Configured with cloud_name={_cloud_name}, signed uploads enabled")
else:
    logger.warning("[CLOUDINARY] NOT CONFIGURED — uploads will fail")

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
        # Run sync Cloudinary SDK call in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(
                cloudinary.uploader.upload,
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
            ),
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
        # Run sync Cloudinary SDK call in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(
                cloudinary.uploader.upload,
                file_bytes,
                public_id=public_id,
                overwrite=True,
                resource_type="video",
                eager=[
                    {"start_offset": "1", "width": 540, "crop": "limit", "format": "jpg", "quality": "auto"},
                ],
                eager_async=False,
            ),
        )

        url = result.get("secure_url", "")
        thumb = ""
        if result.get("eager"):
            thumb = result["eager"][0].get("secure_url", "")
        if not thumb:
            cloud_name = _cloud_name or ""
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
    cloud_name = _cloud_name or ""
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/w_{width},q_auto,f_auto/{public_id}"


async def delete_media(public_id: str, resource_type: str = "image"):
    """Delete an image or video from Cloudinary."""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(cloudinary.uploader.destroy, public_id, resource_type=resource_type, invalidate=True),
        )
        logger.info(f"[CLOUDINARY] Deleted {resource_type}: {public_id} -> {result}")
        return result
    except Exception as e:
        logger.error(f"[CLOUDINARY] Delete failed: {e}")


# Keep legacy alias
async def delete_image(public_id: str):
    return await delete_media(public_id, resource_type="image")


def extract_public_id(url: str) -> str | None:
    """Extract Cloudinary public_id from a full URL."""
    if not url or "cloudinary.com" not in str(url):
        return None
    match = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.\w{3,4})?$", url)
    return match.group(1) if match else None


async def cleanup_urls(urls: list, resource_type: str = "image") -> None:
    """Delete multiple Cloudinary assets by URL. Silent on errors."""
    for url in (urls or []):
        pid = extract_public_id(url if isinstance(url, str) else (url or {}).get("url", ""))
        if pid:
            await delete_media(pid, resource_type)
