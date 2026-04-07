"""
Feedback Service — User feedback and feature requests with voting.

Features:
- Submit feedback (bug, feature, improvement, other)
- Vote on feedback (1 vote per user per item)
- Status workflow: pending → under_review → planned → in_progress → done → declined
- Auto-prioritization by votes + recency
- Admin moderation
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Literal
from bson import ObjectId

from core.database import db

logger = logging.getLogger(__name__)

FeedbackType = Literal["bug", "feature", "improvement", "other"]
FeedbackStatus = Literal["pending", "under_review", "planned", "in_progress", "done", "declined"]


class FeedbackService:
    """Service for managing user feedback and feature requests."""
    
    VOTE_WEIGHT = {
        "consumer": 1,
        "producer": 2,
        "influencer": 1,
        "importer": 2,
        "admin": 0,  # Admins don't vote, they decide
        "super_admin": 0
    }
    
    async def submit_feedback(
        self,
        user_id: str,
        user_role: str,
        feedback_type: FeedbackType,
        title: str,
        description: str,
        category: Optional[str] = None
    ) -> Dict:
        """
        Submit new feedback.
        
        Args:
            user_id: ID of the user submitting
            user_role: Role of the user
            feedback_type: bug, feature, improvement, other
            title: Short title (max 100 chars)
            description: Detailed description (max 2000 chars)
            category: Optional category (ui, checkout, chat, etc.)
        
        Returns:
            Dict with feedback info
        """
        # Validation
        title = title.strip()[:100]
        description = description.strip()[:2000]
        
        if len(title) < 5:
            raise ValueError("El título debe tener al menos 5 caracteres")
        if len(description) < 20:
            raise ValueError("La descripción debe tener al menos 20 caracteres")
        
        # Rate limit: max 5 feedback per day per user
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count_today = await db.feedback.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": today}
        })
        if count_today >= 5:
            raise ValueError("Límite diario alcanzado (5 feedbacks por día)")
        
        feedback_doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "user_role": user_role,
            "type": feedback_type,
            "title": title,
            "description": description,
            "category": category,
            "status": "pending",
            "votes": 0,
            "vote_weight": 0,
            "voters": [],  # List of {user_id, weight, voted_at}
            "admin_notes": "",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_public": True  # Can be hidden by admin
        }
        
        await db.feedback.insert_one(feedback_doc)
        
        logger.info(f"[Feedback] New {feedback_type} submitted by {user_id}: {title[:50]}")
        
        return {
            "feedback_id": feedback_doc["_id"],
            "title": title,
            "status": "pending",
            "message": "Feedback enviado correctamente"
        }
    
    async def vote_feedback(self, feedback_id: str, user_id: str, user_role: str) -> Dict:
        """
        Vote on a feedback item (toggle vote).
        
        Returns:
            Dict with new vote count and whether user voted
        """
        weight = self.VOTE_WEIGHT.get(user_role, 1)
        
        feedback = await db.feedback.find_one({"_id": feedback_id})
        if not feedback:
            raise ValueError("Feedback no encontrado")
        
        if not feedback.get("is_public", True):
            raise ValueError("Este feedback no acepta votos")
        
        # Check if user already voted
        existing_vote = next((v for v in feedback.get("voters", []) if v["user_id"] == user_id), None)
        
        if existing_vote:
            # Remove vote (toggle off)
            await db.feedback.update_one(
                {"_id": feedback_id},
                {
                    "$pull": {"voters": {"user_id": user_id}},
                    "$inc": {"votes": -1, "vote_weight": -weight},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
            new_count = feedback["votes"] - 1
            voted = False
        else:
            # Add vote
            vote_doc = {
                "user_id": user_id,
                "weight": weight,
                "voted_at": datetime.now(timezone.utc)
            }
            await db.feedback.update_one(
                {"_id": feedback_id},
                {
                    "$push": {"voters": vote_doc},
                    "$inc": {"votes": 1, "vote_weight": weight},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
            new_count = feedback["votes"] + 1
            voted = True
        
        return {
            "feedback_id": feedback_id,
            "votes": new_count,
            "voted": voted
        }
    
    async def get_feedback_list(
        self,
        user_id: Optional[str] = None,
        feedback_type: Optional[FeedbackType] = None,
        status: Optional[FeedbackStatus] = None,
        sort_by: str = "popular",  # popular, newest, trending
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """
        Get paginated feedback list.
        
        Returns:
            Dict with items, total, has_more
        """
        # Build query
        query = {"is_public": True}
        if feedback_type:
            query["type"] = feedback_type
        if status:
            query["status"] = status
        
        # Sort
        if sort_by == "newest":
            sort_field = [("created_at", -1)]
        elif sort_by == "trending":
            # Trending = votes in last 7 days
            sort_field = [("vote_weight", -1), ("created_at", -1)]
        else:  # popular
            sort_field = [("votes", -1), ("created_at", -1)]
        
        # Fetch
        skip = (page - 1) * limit
        cursor = db.feedback.find(query).sort(sort_field).skip(skip).limit(limit + 1)
        items = await cursor.to_list(length=limit + 1)
        
        has_more = len(items) > limit
        items = items[:limit]
        
        # Enrich with user vote status
        for item in items:
            item["feedback_id"] = item.pop("_id")
            if user_id:
                item["user_voted"] = any(v["user_id"] == user_id for v in item.get("voters", []))
            else:
                item["user_voted"] = False
            # Don't send full voters list to client
            item["voter_count"] = len(item.get("voters", []))
            del item["voters"]
        
        total = await db.feedback.count_documents(query)
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "has_more": has_more
        }
    
    async def get_feedback_detail(self, feedback_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
        """Get single feedback details."""
        feedback = await db.feedback.find_one({"_id": feedback_id})
        if not feedback:
            return None
        
        feedback["feedback_id"] = feedback.pop("_id")
        
        # Add user vote status
        if user_id:
            feedback["user_voted"] = any(v["user_id"] == user_id for v in feedback.get("voters", []))
        else:
            feedback["user_voted"] = False
        
        # Limit voters info
        feedback["voter_count"] = len(feedback.get("voters", []))
        # Only show recent 10 voters publicly
        recent_voters = sorted(
            feedback.get("voters", []),
            key=lambda x: x.get("voted_at", datetime.min),
            reverse=True
        )[:10]
        feedback["recent_voters"] = [{"user_id": v["user_id"], "voted_at": v["voted_at"]} for v in recent_voters]
        del feedback["voters"]
        
        return feedback
    
    async def update_status(
        self,
        feedback_id: str,
        new_status: FeedbackStatus,
        admin_notes: Optional[str] = None
    ) -> bool:
        """Admin: update feedback status."""
        update = {
            "$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc)
            }
        }
        if admin_notes is not None:
            update["$set"]["admin_notes"] = admin_notes[:500]
        
        result = await db.feedback.update_one(
            {"_id": feedback_id},
            update
        )
        
        if result.modified_count:
            logger.info(f"[Feedback] Status changed to {new_status} for {feedback_id}")
        
        return result.modified_count > 0
    
    async def get_admin_stats(self) -> Dict:
        """Get feedback statistics for admin dashboard."""
        pipeline = [
            {"$match": {"is_public": True}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        status_counts = {}
        async for doc in db.feedback.aggregate(pipeline):
            status_counts[doc["_id"]] = doc["count"]
        
        # Top voted items
        top_items = await db.feedback.find(
            {"is_public": True}
        ).sort([("votes", -1)]).limit(5).to_list(length=5)
        
        # Recent submissions
        recent = await db.feedback.find(
            {"is_public": True}
        ).sort([("created_at", -1)]).limit(5).to_list(length=5)
        
        return {
            "by_status": status_counts,
            "total": sum(status_counts.values()),
            "top_voted": [{"id": str(i["_id"]), "title": i["title"], "votes": i["votes"]} for i in top_items],
            "recent": [{"id": str(i["_id"]), "title": i["title"], "type": i["type"]} for i in recent]
        }


# Singleton
feedback_service = FeedbackService()
