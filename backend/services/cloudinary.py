import cloudinary
import cloudinary.uploader

from config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def upload_image(file_content: bytes, folder: str = "hispaloshop/products") -> dict:
    try:
        result = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            resource_type="image",
            transformation=[{"width": 300, "crop": "scale", "quality": "auto", "fetch_format": "auto"}],
        )
    except Exception as exc:
        raise ValueError(f"Cloudinary upload error: {exc}") from exc

    return {
        "url": result["secure_url"],
        "thumbnail_url": cloudinary.CloudinaryImage(result["public_id"]).build_url(
            width=300, crop="scale", quality="auto", fetch_format="auto"
        ),
        "public_id": result["public_id"],
    }


async def delete_image(public_id: str) -> bool:
    result = cloudinary.uploader.destroy(public_id)
    return result.get("result") == "ok"
