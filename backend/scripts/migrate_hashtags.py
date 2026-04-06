"""
Migration: scan all existing posts/reels and populate the hashtags collection.
Run once: python -m scripts.migrate_hashtags
"""
import asyncio
import re
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def extract_hashtags(text):
    if not text:
        return []
    tags = re.findall(r'#([a-zA-Z0-9_\u00C0-\u024F]+)', text)
    return list(dict.fromkeys(tag.lower() for tag in tags))[:30]


async def migrate():
    from core.database import db

    now = datetime.now(timezone.utc)
    tag_counts = {}

    # Scan posts
    async for post in db.user_posts.find({"caption": {"$exists": True}}, {"caption": 1, "created_at": 1}):
        for tag in extract_hashtags(post.get("caption", "")):
            if tag not in tag_counts:
                tag_counts[tag] = {"count": 0, "last_used": post.get("created_at", now.isoformat())}
            tag_counts[tag]["count"] += 1
            if post.get("created_at", "") > tag_counts[tag]["last_used"]:
                tag_counts[tag]["last_used"] = post["created_at"]

    # Scan reels
    async for reel in db.reels.find({"caption": {"$exists": True}}, {"caption": 1, "created_at": 1}):
        for tag in extract_hashtags(reel.get("caption", "")):
            if tag not in tag_counts:
                tag_counts[tag] = {"count": 0, "last_used": reel.get("created_at", now.isoformat())}
            tag_counts[tag]["count"] += 1

    # Upsert all
    for tag, data in tag_counts.items():
        await db.hashtags.update_one(
            {"name": tag},
            {
                "$set": {"post_count": data["count"], "last_used_at": data["last_used"], "slug": tag},
                "$setOnInsert": {"created_at": now, "velocity_score": 0},
            },
            upsert=True,
        )

    logger.info(f"[HASHTAG_MIGRATION] Populated {len(tag_counts)} hashtags from existing posts/reels")
    return len(tag_counts)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(migrate())
