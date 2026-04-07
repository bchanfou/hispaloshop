"""
AI assistant preferences — per-user settings for David, Rebeca, Pedro.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException

from core.database import db
from core.auth import get_current_user
from core.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_PREFS = {
    "david": {"floating_active": True, "proactive": True, "language": "auto"},
    "rebeca": {"floating_active": True, "briefings": True, "alerts_stock": True, "alerts_reviews": True, "language": "auto"},
    "pedro": {"button_visible": True, "target_markets": []},
    "privacy": {"use_data_for_personalization": True},
}


@router.get("/ai/preferences")
async def get_ai_preferences(user: User = Depends(get_current_user)):
    """Return AI preferences for the authenticated user."""
    doc = await db.ai_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    if not doc:
        return {**DEFAULT_PREFS, "user_id": user.user_id}
    # Merge defaults for any missing keys
    result = {"user_id": user.user_id}
    for key in DEFAULT_PREFS:
        result[key] = {**DEFAULT_PREFS[key], **(doc.get(key) or {})}
    return result


@router.put("/ai/preferences")
async def update_ai_preferences(request: Request, user: User = Depends(get_current_user)):
    """Update AI preferences (partial merge)."""
    body = await request.json()
    update = {}
    for key in ("david", "rebeca", "pedro", "privacy"):
        if key in body and isinstance(body[key], dict):
            for k, v in body[key].items():
                update[f"{key}.{k}"] = v
    if not update:
        return {"ok": True}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.ai_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": update},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/ai/{assistant}/history")
async def delete_ai_history(assistant: str, user: User = Depends(get_current_user)):
    """Delete conversation history for one AI assistant."""
    allowed = {"david", "rebeca", "pedro"}
    if assistant not in allowed:
        raise HTTPException(status_code=400, detail=f"Assistant must be one of: {', '.join(sorted(allowed))}")
    # Delete from the relevant collections
    collection_map = {
        "david": "hispal_ai_conversations",
        "rebeca": "rebeca_conversations",
        "pedro": "pedro_conversations",
    }
    coll = collection_map.get(assistant)
    if coll:
        await db[coll].delete_many({"user_id": user.user_id})
    # Also clear profile memory if exists
    profile_map = {"rebeca": "rebeca_profiles", "pedro": "pedro_profiles"}
    if assistant in profile_map:
        await db[profile_map[assistant]].update_one(
            {"user_id": user.user_id},
            {"$set": {"conversation_summary": None, "interaction_count": 0}},
        )
    return {"ok": True, "assistant": assistant}
