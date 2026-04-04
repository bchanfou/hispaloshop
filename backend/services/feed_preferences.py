"""
Feed preference tracking — persistent user taste signals.
Updates category_weights and seller preferences on every interaction.
Consumed by FeedAlgorithm and product recommendations.
"""
import logging
from datetime import datetime, timezone
from core.database import db

logger = logging.getLogger(__name__)

# Weight deltas per action type
ACTION_WEIGHTS = {
    "purchase": 3.0,
    "save":     2.0,
    "like":     1.0,
    "follow":   1.5,
    "review":   2.0,
    "skip":    -0.3,
}


async def update_preferences(
    user_id: str,
    action: str,
    categories: list = None,
    seller_id: str = None,
):
    """
    Update user feed preferences after an interaction.
    Call from like/save/purchase/follow endpoints.
    """
    delta = ACTION_WEIGHTS.get(action, 0)
    if delta == 0:
        return

    now = datetime.now(timezone.utc)
    update = {"$set": {"last_updated": now}}
    inc_ops = {}

    # Increment category weights
    for cat in (categories or []):
        if cat:
            inc_ops[f"category_weights.{cat}"] = delta

    if inc_ops:
        update["$inc"] = inc_ops

    # Track seller affinity — add to one list and remove from the other
    if seller_id and delta > 0:
        update.setdefault("$addToSet", {})["preferred_seller_ids"] = seller_id
        update.setdefault("$pull", {})["disliked_seller_ids"] = seller_id
    elif seller_id and delta < 0:
        update.setdefault("$addToSet", {})["disliked_seller_ids"] = seller_id
        update.setdefault("$pull", {})["preferred_seller_ids"] = seller_id

    try:
        # Write to users.consumer_data.preferences (where FeedAlgorithm reads)
        user_update = {"$set": {"consumer_data.preferences.last_updated": now}}
        user_inc = {}
        for cat in (categories or []):
            if cat:
                user_inc[f"consumer_data.preferences.categories.{cat}"] = delta
        if seller_id and delta > 0:
            user_update.setdefault("$addToSet", {})["consumer_data.preferences.preferred_sellers"] = seller_id
        if user_inc:
            user_update["$inc"] = user_inc

        await db.users.update_one({"user_id": user_id}, user_update)
    except Exception as e:
        logger.warning(f"[FeedPrefs] Failed to update for {user_id}: {e}")


async def get_preferences(user_id: str) -> dict:
    """Get user's preference document from users.consumer_data.preferences."""
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "consumer_data.preferences": 1},
    )
    return (user or {}).get("consumer_data", {}).get("preferences", {})


async def add_to_history(user_id: str, post_id: str):
    """Track that user saw this post (keep last 200)."""
    try:
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "consumer_data.preferences.interaction_history": {
                        "$each": [post_id],
                        "$slice": -200,
                    }
                },
                "$set": {"consumer_data.preferences.last_updated": datetime.now(timezone.utc)},
            },
        )
    except Exception:
        pass
