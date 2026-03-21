"""
Gamification routes — profile, leaderboard, achievements.
"""
from fastapi import APIRouter, Depends, Query
import logging

from core.database import db
from core.auth import get_current_user
from services.gamification import GamificationService
from routes.badges import BADGE_DEFINITIONS, _get_user_counters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gamification", tags=["gamification"])

_svc = GamificationService(db)


@router.get("/profile")
async def gamification_profile(user=Depends(get_current_user)):
    """User's level, XP, badges, streak."""
    await _svc.check_streak(user.user_id)
    profile = await _svc.get_profile(user.user_id)
    return profile


@router.get("/leaderboard")
async def gamification_leaderboard(
    category: str = Query("overall", regex="^(overall|producers|influencers)$"),
    period: str = Query("month", regex="^(week|month|all)$"),
):
    """Top users by XP."""
    leaders = await _svc.get_leaderboard(category=category, period=period, limit=10)
    return [
        {
            "user_id": u.get("user_id"),
            "username": u.get("username"),
            "name": u.get("name"),
            "avatar": u.get("avatar"),
            "xp": u.get("xp", 0),
        }
        for u in leaders
    ]


@router.get("/achievements")
async def gamification_achievements(user=Depends(get_current_user)):
    """All available badges with progress for the current user."""
    counters = await _get_user_counters(user.user_id)

    earned_docs = await db.user_badges.find(
        {"user_id": user.user_id},
        {"_id": 0, "badge_id": 1, "awarded_at": 1}
    ).to_list(100)
    earned_map = {d["badge_id"]: d["awarded_at"] for d in earned_docs}

    result = []
    for b in BADGE_DEFINITIONS:
        counter_value = counters.get(b["counter"], 0) if b.get("counter") else 0
        earned = b["badge_id"] in earned_map
        result.append({
            "badge_id": b["badge_id"],
            "name_default": b["name_default"],
            "description_default": b["description_default"],
            "icon": b["icon"],
            "category": b["category"],
            "threshold": b["threshold"],
            "current": min(counter_value, b["threshold"]),
            "progress": min(counter_value / b["threshold"], 1.0) if b["threshold"] > 0 else 1.0,
            "earned": earned,
            "awarded_at": earned_map.get(b["badge_id"]),
        })

    return result
