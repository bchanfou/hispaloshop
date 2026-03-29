"""
Gamification service — XP, levels, streaks, leaderboard.
"""
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

LEVELS = [
    {"level": 1, "name": "Semilla",  "emoji": "🌱", "min_xp": 0},
    {"level": 2, "name": "Brote",    "emoji": "🌿", "min_xp": 100},
    {"level": 3, "name": "Planta",   "emoji": "🌳", "min_xp": 300},
    {"level": 4, "name": "Árbol",    "emoji": "🏔️", "min_xp": 700},
    {"level": 5, "name": "Bosque",   "emoji": "🌍", "min_xp": 1500},
]

XP_ACTIONS = {
    "purchase": 50, "post": 20, "comment": 5, "review": 30,
    "recipe": 40, "referral": 100, "like": 2, "follow": 5,
    "save": 3, "share": 10, "first_purchase": 100,
    "streak_bonus": 2,  # per day of streak
}

DEFAULT_WEEKLY_GOAL_CENTS = 2000  # €20


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
                "user_id": user_id,
                "type": "level_up",
                "title": f"¡Has subido al nivel {new_level['level']}!",
                "body": f"Enhorabuena, ahora eres {new_level['name']}.",
                "data": {"level": new_level["level"], "name": new_level["name"]},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": datetime.now(timezone.utc),
                "sent_at": datetime.now(timezone.utc),
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
            {"xp": 1, "streak_days": 1, "last_active_date": 1, "longest_streak": 1}
        )
        xp = user.get("xp", 0) if user else 0
        level = self._get_level_for_xp(xp)
        next_level = next((l for l in LEVELS if l["min_xp"] > xp), None)
        streak = user.get("streak_days", 0) if user else 0
        longest_streak = user.get("longest_streak", streak) if user else 0
        badges = await self.db.user_badges.find({"user_id": user_id}).to_list(100)
        progress = (
            (xp - level["min_xp"]) / (next_level["min_xp"] - level["min_xp"])
            if next_level else 1.0
        )

        # Weekly goal progress
        now = datetime.utcnow()
        # Monday of current week
        week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        weekly_spent = 0
        try:
            pipeline = [
                {"$match": {
                    "user_id": user_id,
                    "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]},
                    "created_at": {"$gte": week_start.isoformat()},
                }},
                {"$group": {"_id": None, "total": {"$sum": "$total_cents"}}},
            ]
            result = await self.db.orders.aggregate(pipeline).to_list(1)
            if result:
                weekly_spent = result[0].get("total", 0)
        except Exception:
            pass

        weekly_goal = DEFAULT_WEEKLY_GOAL_CENTS
        total_purchases = await self.db.orders.count_documents({
            "user_id": user_id,
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]},
        })

        return {
            "healthy_points": xp,
            "xp": xp,
            "level": level["level"],
            "level_name": level["name"],
            "level_emoji": level.get("emoji", "🌱"),
            "hp_to_next_level": (next_level["min_xp"] - xp) if next_level else 0,
            "progress_pct": round(progress * 100, 1),
            "next_level": next_level,
            "progress": progress,
            "current_streak": streak,
            "longest_streak": max(longest_streak, streak),
            "streak_days": streak,
            "badges": [
                {"badge_id": b["badge_id"], "awarded_at": b.get("awarded_at")}
                for b in badges
            ],
            "weekly_goal_cents": weekly_goal,
            "weekly_spent_cents": weekly_spent,
            "weekly_progress_pct": round(min(weekly_spent / weekly_goal, 1.0) * 100, 1) if weekly_goal > 0 else 0,
            "total_purchases": total_purchases,
        }

    async def check_streak(self, user_id):
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"last_active_date": 1, "streak_days": 1, "longest_streak": 1}
        )
        if not user:
            return
        today = datetime.utcnow().date()
        last = user.get("last_active_date")
        if last and hasattr(last, 'date'):
            last = last.date()
        streak = user.get("streak_days", 0)
        longest = user.get("longest_streak", 0)
        if last == today:
            return
        elif last and (today - last).days == 1:
            streak += 1
        else:
            streak = 1
        longest = max(longest, streak)
        update = {
            "$set": {
                "last_active_date": datetime.utcnow(),
                "streak_days": streak,
                "longest_streak": longest,
            }
        }
        # Award streak bonus XP
        if streak > 1:
            update["$inc"] = {"xp": XP_ACTIONS.get("streak_bonus", 2) * streak}
        await self.db.users.update_one({"user_id": user_id}, update)

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
