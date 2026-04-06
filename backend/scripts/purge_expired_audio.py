"""
Daily cron: purge expired audio messages from Cloudinary and mark as expired in DB.

Rules:
- Normal audio (<= 1 min): expire after 30 days
- Long audio (> 1 min): expire after 7 days (aggressive purge)
- audio_expires_at is set at upload time based on duration

Run: python -m scripts.purge_expired_audio
Schedule: daily via Railway cron or GitHub Actions
"""
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def purge_expired_audio():
    from core.database import db

    now = datetime.now(timezone.utc).isoformat()

    # Find messages with expired audio
    cursor = db.chat_messages.find({
        "audio_url": {"$ne": None, "$exists": True},
        "audio_expired": {"$ne": True},
        "audio_expires_at": {"$lte": now},
    })

    deleted_count = 0
    async for msg in cursor:
        audio_url = msg.get("audio_url", "")
        message_id = msg.get("message_id", "")

        # Try to delete from Cloudinary
        if audio_url:
            try:
                from services.cloudinary_storage import delete_media
                # Extract public_id from URL
                parts = audio_url.split("/")
                if "chat-audio" in parts:
                    idx = parts.index("chat-audio")
                    filename = parts[idx + 1].split(".")[0] if idx + 1 < len(parts) else None
                    if filename:
                        public_id = f"chat-audio/{filename}"
                        await delete_media(public_id, resource_type="video")
            except Exception as e:
                logger.warning(f"[AUDIO_PURGE] Failed to delete Cloudinary asset for {message_id}: {e}")

        # Mark message as expired (keep the message, just remove audio)
        await db.chat_messages.update_one(
            {"message_id": message_id},
            {"$set": {"audio_expired": True, "audio_url": None}, "$unset": {"audio_expires_at": ""}},
        )
        deleted_count += 1

    if deleted_count:
        logger.info(f"[AUDIO_PURGE] Purged {deleted_count} expired audio messages")
    else:
        logger.info("[AUDIO_PURGE] No expired audio to purge")

    return deleted_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(purge_expired_audio())
