"""
Gamification service — XP, levels, streaks, leaderboard.
"""
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

LEVELS = [
    {"level": 1, "name": "Novato", "min_xp": 0},
    {"level": 2, "name": "Foodie", "min_xp": 200},
    {"level": 3, "name": "Gourmet", "min_xp": 500},
    {"level": 4, "name": "Master", "min_xp": 1200},
    {"level": 5, "name": "Legend", "min_xp": 3000},
]

XP_ACTIONS = {
    "purchase": 50, "post": 20, "comment": 5, "review": 30,
    "recipe": 40, "referral": 100, "like": 2, "follow": 5,
    "save": 3, "share": 10, "first_purchase": 100,
}


class GamificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def award_xp(self, user_id: str, action: str, extra: int = 0):
        amount = XP_ACTIONS.get(action, 0) + extra
        if amount <= 0:
            return None
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$inc": {"xp": amount}, "$set": {"last_xp_at": datetime.utcnow()}}
        )
        user = await self.db.users.find_one({"user_id": user_id}, {"xp": 1})
        new_xp = user.get("xp", 0) if user else 0
        old_level = self._get_level_for_xp(new_xp - amount)
        new_level = self._get_level_for_xp(new_xp)
        if new_level["level"] > old_level["level"]:
            await self.db.notifications.insert_one({
                "user_id": user_id, "type": "level_up",
                "data": {"level": new_level["level"], "name": new_level["name"]},
                "read": False, "created_at": datetime.utcnow()
            })
        return {"xp_gained": amount, "total_xp": new_xp, "level": new_level}

    def _get_level_for_xp(self, xp):
        current = LEVELS[0]
        for lvl in LEVELS:
            if xp >= lvl["min_xp"]:
                current = lvl
        return current

    async def get_profile(self, user_id):
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"xp": 1, "streak_days": 1, "last_active_date": 1}
        )
        xp = user.get("xp", 0) if user else 0
        level = self._get_level_for_xp(xp)
        next_level = next((l for l in LEVELS if l["min_xp"] > xp), None)
        streak = user.get("streak_days", 0) if user else 0
        badges = await self.db.user_badges.find({"user_id": user_id}).to_list(100)
        progress = (
            (xp - level["min_xp"]) / (next_level["min_xp"] - level["min_xp"])
            if next_level else 1.0
        )
        return {
            "xp": xp,
            "level": level,
            "next_level": next_level,
            "progress": progress,
            "streak_days": streak,
            "badges": [
                {"badge_id": b["badge_id"], "awarded_at": b.get("awarded_at")}
                for b in badges
            ],
        }

    async def check_streak(self, user_id):
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"last_active_date": 1, "streak_days": 1}
        )
        if not user:
            return
        today = datetime.utcnow().date()
        last = user.get("last_active_date")
        if last and hasattr(last, 'date'):
            last = last.date()
        streak = user.get("streak_days", 0)
        if last == today:
            return
        elif last and (today - last).days == 1:
            streak += 1
        else:
            streak = 1
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$set": {"last_active_date": datetime.utcnow(), "streak_days": streak}}
        )

    async def get_leaderboard(self, category="overall", period="month", limit=10):
        match = {}
        if period == "week":
            match["last_xp_at"] = {"$gte": datetime.utcnow() - timedelta(days=7)}
        elif period == "month":
            match["last_xp_at"] = {"$gte": datetime.utcnow() - timedelta(days=30)}
        if category == "producers":
            match["roles"] = "producer"
        elif category == "influencers":
            match["roles"] = "influencer"
        cursor = (
            self.db.users
            .find(match, {"user_id": 1, "username": 1, "name": 1, "avatar": 1, "xp": 1})
            .sort("xp", -1)
            .limit(limit)
        )
        return await cursor.to_list(limit)
