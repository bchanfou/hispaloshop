"""
Feedback Service — Public idea board with voting, comments, and admin management.

Section 3.7 — User Feedback System (público con votos)

Collections:
  feedback_ideas   — user-submitted ideas with denormalized vote/comment counts
  feedback_votes   — one row per user per idea (unique constraint)
  feedback_comments — threaded comments on ideas (soft-delete)

Status workflow: new → under_review → planned → in_progress → implemented → declined
Categories: ux, feature, content, commerce, b2b, mobile, i18n, other
"""
import logging
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Literal
from uuid import uuid4

from core.database import db
from services.notifications.dispatcher_service import notification_dispatcher

logger = logging.getLogger(__name__)

IdeaCategory = Literal["ux", "feature", "content", "commerce", "b2b", "mobile", "i18n", "other"]
IdeaStatus = Literal["new", "under_review", "planned", "in_progress", "implemented", "declined"]

VALID_CATEGORIES = {"ux", "feature", "content", "commerce", "b2b", "mobile", "i18n", "other"}
VALID_STATUSES = {"new", "under_review", "planned", "in_progress", "implemented", "declined"}


def _slugify(text: str) -> str:
    """Generate URL-friendly slug from title."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:80] or "idea"


class FeedbackService:
    """Public feedback / idea board service."""

    # ─── Ideas ────────────────────────────────────────────────────────────

    async def create_idea(
        self,
        user_id: str,
        title: str,
        description: str,
        category: str,
    ) -> Dict:
        """Create a new idea. Returns the created doc."""
        title = title.strip()[:120]
        description = description.strip()[:2000]
        if len(title) < 5:
            raise ValueError("El título debe tener al menos 5 caracteres")
        if len(description) < 20:
            raise ValueError("La descripción debe tener al menos 20 caracteres")
        if category not in VALID_CATEGORIES:
            raise ValueError(f"Categoría inválida: {category}")

        # Rate limit: max 5 ideas/day
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count_today = await db.feedback_ideas.count_documents({
            "author_id": user_id,
            "created_at": {"$gte": today_start},
        })
        if count_today >= 5:
            raise ValueError("Límite diario alcanzado (5 ideas por día)")

        # Fetch author info
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "picture": 1, "country": 1})
        if not user_doc:
            raise ValueError("Usuario no encontrado")

        # Generate unique slug
        base_slug = _slugify(title)
        slug = base_slug
        suffix = 1
        while await db.feedback_ideas.find_one({"slug": slug}):
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        idea_id = str(uuid4())
        now = datetime.now(timezone.utc)

        doc = {
            "idea_id": idea_id,
            "slug": slug,
            "author_id": user_id,
            "author_name": user_doc.get("name", "Usuario"),
            "author_avatar": user_doc.get("picture"),
            "title": title,
            "description": description,
            "category": category,
            "status": "new",
            "status_note": None,
            "status_changed_at": None,
            "status_changed_by": None,
            "vote_count": 0,
            "comment_count": 0,
            "country_code": (user_doc.get("country") or "ES").upper(),
            "created_at": now,
            "updated_at": now,
            "merged_into": None,
        }
        await db.feedback_ideas.insert_one({**doc, "_id": idea_id})

        logger.info(f"[Feedback] New idea '{title[:50]}' by {user_id}")
        return doc

    async def get_idea_by_slug(self, slug: str, user_id: Optional[str] = None) -> Optional[Dict]:
        """Get idea detail by slug. Includes user_voted flag if user_id provided."""
        idea = await db.feedback_ideas.find_one({"slug": slug}, {"_id": 0})
        if not idea:
            return None

        # Check if merged
        if idea.get("merged_into"):
            target = await db.feedback_ideas.find_one({"idea_id": idea["merged_into"]}, {"_id": 0, "slug": 1, "title": 1})
            idea["merged_into_slug"] = target.get("slug") if target else None
            idea["merged_into_title"] = target.get("title") if target else None

        # User vote state
        if user_id:
            vote = await db.feedback_votes.find_one({"idea_id": idea["idea_id"], "user_id": user_id})
            idea["user_vote"] = vote.get("vote_type", "up") if vote else None
            idea["user_voted"] = vote is not None
        else:
            idea["user_vote"] = None
            idea["user_voted"] = False

        # Ensure upvote/downvote counts exist (backward compat)
        if "upvote_count" not in idea:
            idea["upvote_count"] = idea.get("vote_count", 0)
            idea["downvote_count"] = 0

        # Status history — recent changes from the idea doc itself (lightweight)
        return idea

    async def list_ideas(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        sort: str = "popular",
        search: Optional[str] = None,
        author_id: Optional[str] = None,
        country_code: Optional[str] = None,
        user_id: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict:
        """List ideas with filtering, sorting, pagination."""
        limit = min(100, max(1, limit))
        query: dict = {"merged_into": None}  # exclude merged ideas

        if status and status in VALID_STATUSES:
            query["status"] = status
        if category and category in VALID_CATEGORIES:
            query["category"] = category
        if author_id:
            query["author_id"] = author_id
        if country_code:
            query["country_code"] = country_code.upper()
        if search:
            query["$or"] = [
                {"title": {"$regex": re.escape(search), "$options": "i"}},
                {"description": {"$regex": re.escape(search), "$options": "i"}},
            ]

        # Sort
        if sort == "recent":
            sort_spec = [("created_at", -1)]
        elif sort == "mine" and user_id:
            query["author_id"] = user_id
            sort_spec = [("created_at", -1)]
        else:  # popular (default)
            sort_spec = [("vote_count", -1), ("created_at", -1)]

        skip = (page - 1) * limit
        total = await db.feedback_ideas.count_documents(query)
        items = await db.feedback_ideas.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(limit)

        # Enrich with user_vote
        if user_id and items:
            idea_ids = [i["idea_id"] for i in items]
            user_votes = await db.feedback_votes.find(
                {"idea_id": {"$in": idea_ids}, "user_id": user_id}
            ).to_list(len(idea_ids))
            vote_map = {v["idea_id"]: v.get("vote_type", "up") for v in user_votes}
            for item in items:
                item["user_vote"] = vote_map.get(item["idea_id"])
                item["user_voted"] = item["idea_id"] in vote_map
                if "upvote_count" not in item:
                    item["upvote_count"] = item.get("vote_count", 0)
                    item["downvote_count"] = 0
        else:
            for item in items:
                item["user_vote"] = None
                item["user_voted"] = False
                if "upvote_count" not in item:
                    item["upvote_count"] = item.get("vote_count", 0)
                    item["downvote_count"] = 0

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": (skip + limit) < total,
        }

    async def update_idea(self, idea_id: str, user_id: str, title: Optional[str], description: Optional[str], category: Optional[str]) -> Dict:
        """Author edits own idea."""
        idea = await db.feedback_ideas.find_one({"idea_id": idea_id}, {"_id": 0})
        if not idea:
            raise ValueError("Idea no encontrada")
        if idea["author_id"] != user_id:
            raise ValueError("Solo el autor puede editar esta idea")

        updates: dict = {"updated_at": datetime.now(timezone.utc)}
        if title is not None:
            title = title.strip()[:120]
            if len(title) < 5:
                raise ValueError("El título debe tener al menos 5 caracteres")
            updates["title"] = title
        if description is not None:
            description = description.strip()[:2000]
            if len(description) < 20:
                raise ValueError("La descripción debe tener al menos 20 caracteres")
            updates["description"] = description
        if category is not None:
            if category not in VALID_CATEGORIES:
                raise ValueError(f"Categoría inválida: {category}")
            updates["category"] = category

        await db.feedback_ideas.update_one({"idea_id": idea_id}, {"$set": updates})
        return {**idea, **updates}

    async def delete_idea(self, idea_id: str, user_id: str) -> bool:
        """Soft-delete own idea. Blocked if >5 votes."""
        idea = await db.feedback_ideas.find_one({"idea_id": idea_id}, {"_id": 0})
        if not idea:
            raise ValueError("Idea no encontrada")
        if idea["author_id"] != user_id:
            raise ValueError("Solo el autor puede eliminar esta idea")
        if idea.get("vote_count", 0) > 5:
            raise ValueError("No puedes eliminar una idea con más de 5 votos. Contacta a un administrador.")
        # Hard delete since it's the author's own idea with few votes
        await db.feedback_ideas.delete_one({"idea_id": idea_id})
        await db.feedback_votes.delete_many({"idea_id": idea_id})
        await db.feedback_comments.delete_many({"idea_id": idea_id})
        return True

    # ─── Votes ────────────────────────────────────────────────────────────

    async def toggle_vote(self, idea_id: str, user_id: str, vote_type: str = "up") -> Dict:
        """Vote up/down on an idea. Same vote_type again removes the vote. Switching type updates it."""
        idea = await db.feedback_ideas.find_one(
            {"idea_id": idea_id},
            {"_id": 0, "vote_count": 1, "upvote_count": 1, "downvote_count": 1, "merged_into": 1}
        )
        if not idea:
            raise ValueError("Idea no encontrada")
        if idea.get("merged_into"):
            raise ValueError("Esta idea fue fusionada. Vota en la idea principal.")

        upvote_count = idea.get("upvote_count", idea.get("vote_count", 0))
        downvote_count = idea.get("downvote_count", 0)
        now = datetime.now(timezone.utc)

        existing = await db.feedback_votes.find_one({"idea_id": idea_id, "user_id": user_id})
        if existing:
            old_type = existing.get("vote_type", "up")
            if old_type == vote_type:
                # Same type — remove vote
                await db.feedback_votes.delete_one({"idea_id": idea_id, "user_id": user_id})
                if vote_type == "up":
                    upvote_count = max(0, upvote_count - 1)
                else:
                    downvote_count = max(0, downvote_count - 1)
                await db.feedback_ideas.update_one(
                    {"idea_id": idea_id},
                    {"$set": {"upvote_count": upvote_count, "downvote_count": downvote_count,
                              "vote_count": upvote_count - downvote_count, "updated_at": now}}
                )
                return {"idea_id": idea_id, "user_vote": None, "vote_count": upvote_count - downvote_count,
                        "upvote_count": upvote_count, "downvote_count": downvote_count}
            else:
                # Switch vote type
                await db.feedback_votes.update_one(
                    {"idea_id": idea_id, "user_id": user_id},
                    {"$set": {"vote_type": vote_type, "created_at": now}}
                )
                if vote_type == "up":
                    upvote_count += 1
                    downvote_count = max(0, downvote_count - 1)
                else:
                    downvote_count += 1
                    upvote_count = max(0, upvote_count - 1)
                await db.feedback_ideas.update_one(
                    {"idea_id": idea_id},
                    {"$set": {"upvote_count": upvote_count, "downvote_count": downvote_count,
                              "vote_count": upvote_count - downvote_count, "updated_at": now}}
                )
                return {"idea_id": idea_id, "user_vote": vote_type, "vote_count": upvote_count - downvote_count,
                        "upvote_count": upvote_count, "downvote_count": downvote_count}
        else:
            # New vote — rate limit: max 50 votes/day
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            votes_today = await db.feedback_votes.count_documents({
                "user_id": user_id, "created_at": {"$gte": today_start}
            })
            if votes_today >= 50:
                raise ValueError("Limite diario de votos alcanzado (50 por dia)")

            await db.feedback_votes.insert_one({
                "vote_id": str(uuid4()),
                "idea_id": idea_id,
                "user_id": user_id,
                "vote_type": vote_type,
                "created_at": now,
            })
            if vote_type == "up":
                upvote_count += 1
            else:
                downvote_count += 1
            await db.feedback_ideas.update_one(
                {"idea_id": idea_id},
                {"$set": {"upvote_count": upvote_count, "downvote_count": downvote_count,
                          "vote_count": upvote_count - downvote_count, "updated_at": now}}
            )
            return {"idea_id": idea_id, "user_vote": vote_type, "vote_count": upvote_count - downvote_count,
                    "upvote_count": upvote_count, "downvote_count": downvote_count}

    # ─── Comments ─────────────────────────────────────────────────────────

    async def add_comment(self, idea_id: str, user_id: str, body: str, parent_comment_id: Optional[str] = None) -> Dict:
        """Add comment to idea."""
        body = body.strip()[:500]
        if not body:
            raise ValueError("El comentario no puede estar vacío")

        idea = await db.feedback_ideas.find_one({"idea_id": idea_id}, {"_id": 0, "idea_id": 1, "author_id": 1, "title": 1})
        if not idea:
            raise ValueError("Idea no encontrada")

        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "picture": 1})
        if not user_doc:
            raise ValueError("Usuario no encontrado")

        # Validate parent comment exists and belongs to the same idea
        if parent_comment_id:
            parent = await db.feedback_comments.find_one({"comment_id": parent_comment_id, "idea_id": idea_id}, {"_id": 0, "parent_comment_id": 1})
            if not parent:
                raise ValueError("Comentario padre no encontrado")
            # Only allow 1 level of nesting
            if parent.get("parent_comment_id"):
                raise ValueError("No se permiten respuestas anidadas de más de 1 nivel")

        comment_id = str(uuid4())
        now = datetime.now(timezone.utc)
        comment = {
            "comment_id": comment_id,
            "idea_id": idea_id,
            "author_id": user_id,
            "author_name": user_doc.get("name", "Usuario"),
            "author_avatar": user_doc.get("picture"),
            "body": body,
            "parent_comment_id": parent_comment_id,
            "created_at": now,
            "edited": False,
            "edited_at": None,
            "deleted": False,
        }
        await db.feedback_comments.insert_one({**comment, "_id": comment_id})
        await db.feedback_ideas.update_one(
            {"idea_id": idea_id},
            {"$inc": {"comment_count": 1}, "$set": {"updated_at": now}}
        )

        # Notify idea author (if commenter is not the author)
        if idea["author_id"] != user_id:
            try:
                await notification_dispatcher.send_notification(
                    user_id=idea["author_id"],
                    title="Nuevo comentario en tu idea",
                    body=f"{user_doc.get('name', 'Alguien')} comentó en \"{idea['title'][:60]}\"",
                    notification_type="feedback_idea_commented",
                    channels=["in_app", "push"],
                    data={"idea_id": idea_id},
                    action_url=f"/feedback/{idea_id}",
                )
            except Exception as e:
                logger.warning(f"[Feedback] Failed to send comment notification: {e}")

        return comment

    async def list_comments(self, idea_id: str, page: int = 1, limit: int = 50) -> Dict:
        """List comments for an idea."""
        limit = min(100, max(1, limit))
        skip = (page - 1) * limit
        query = {"idea_id": idea_id}
        total = await db.feedback_comments.count_documents(query)
        items = await db.feedback_comments.find(query, {"_id": 0}).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
        return {"items": items, "total": total, "page": page, "has_more": (skip + limit) < total}

    async def edit_comment(self, comment_id: str, user_id: str, body: str) -> Dict:
        """Edit own comment."""
        body = body.strip()[:500]
        if not body:
            raise ValueError("El comentario no puede estar vacío")

        comment = await db.feedback_comments.find_one({"comment_id": comment_id}, {"_id": 0})
        if not comment:
            raise ValueError("Comentario no encontrado")
        if comment["author_id"] != user_id:
            raise ValueError("Solo el autor puede editar este comentario")
        if comment.get("deleted"):
            raise ValueError("No se puede editar un comentario eliminado")

        now = datetime.now(timezone.utc)
        await db.feedback_comments.update_one(
            {"comment_id": comment_id},
            {"$set": {"body": body, "edited": True, "edited_at": now}}
        )
        return {**comment, "body": body, "edited": True, "edited_at": now}

    async def delete_comment(self, comment_id: str, user_id: str) -> bool:
        """Soft-delete own comment."""
        comment = await db.feedback_comments.find_one({"comment_id": comment_id}, {"_id": 0})
        if not comment:
            raise ValueError("Comentario no encontrado")
        if comment["author_id"] != user_id:
            raise ValueError("Solo el autor puede eliminar este comentario")
        if comment.get("deleted"):
            return True

        await db.feedback_comments.update_one(
            {"comment_id": comment_id},
            {"$set": {"deleted": True, "body": ""}}
        )
        await db.feedback_ideas.update_one(
            {"idea_id": comment["idea_id"]},
            {"$inc": {"comment_count": -1}}
        )
        return True

    # ─── Country Admin ────────────────────────────────────────────────────

    async def admin_change_status(
        self,
        idea_id: str,
        new_status: str,
        admin_id: str,
        status_note: Optional[str] = None,
    ) -> Dict:
        """Country admin changes idea status. Sends notifications."""
        if new_status not in VALID_STATUSES:
            raise ValueError(f"Estado inválido: {new_status}")

        idea = await db.feedback_ideas.find_one({"idea_id": idea_id}, {"_id": 0})
        if not idea:
            raise ValueError("Idea no encontrada")

        now = datetime.now(timezone.utc)
        updates = {
            "status": new_status,
            "status_note": (status_note or "").strip()[:500] or None,
            "status_changed_at": now,
            "status_changed_by": admin_id,
            "updated_at": now,
        }
        await db.feedback_ideas.update_one({"idea_id": idea_id}, {"$set": updates})

        # Notify author about status change
        try:
            status_labels = {
                "new": "Nueva",
                "under_review": "En revisión",
                "planned": "Planificada",
                "in_progress": "En progreso",
                "implemented": "Implementada",
                "declined": "Descartada",
            }
            await notification_dispatcher.send_notification(
                user_id=idea["author_id"],
                title="Tu idea cambió de estado",
                body=f"\"{idea['title'][:60]}\" → {status_labels.get(new_status, new_status)}",
                notification_type="feedback_idea_status_changed",
                channels=["in_app", "push"],
                data={"idea_id": idea_id, "new_status": new_status},
                action_url=f"/feedback/{idea.get('slug', idea_id)}",
            )
        except Exception as e:
            logger.warning(f"[Feedback] Failed to send status notification: {e}")

        # If implemented → notify ALL voters
        if new_status == "implemented":
            try:
                voter_docs = await db.feedback_votes.find(
                    {"idea_id": idea_id}, {"user_id": 1}
                ).to_list(10000)
                for vd in voter_docs:
                    if vd["user_id"] != idea["author_id"]:  # author already notified above
                        await notification_dispatcher.send_notification(
                            user_id=vd["user_id"],
                            title="Una idea que votaste fue implementada",
                            body=f"\"{idea['title'][:60]}\" ya está disponible",
                            notification_type="feedback_idea_implemented",
                            channels=["in_app", "push"],
                            data={"idea_id": idea_id},
                            action_url=f"/feedback/{idea.get('slug', idea_id)}",
                        )
            except Exception as e:
                logger.warning(f"[Feedback] Failed to send implemented notifications: {e}")

        return {**idea, **updates}

    async def admin_close_as_duplicate(
        self,
        idea_id: str,
        target_idea_id: str,
        admin_id: str,
    ) -> Dict:
        """Close idea as duplicate pointing to target idea. No vote transfer (V1 simplified)."""
        idea = await db.feedback_ideas.find_one({"idea_id": idea_id}, {"_id": 0})
        if not idea:
            raise ValueError("Idea no encontrada")
        target = await db.feedback_ideas.find_one({"idea_id": target_idea_id}, {"_id": 0})
        if not target:
            raise ValueError("Idea principal no encontrada")
        if idea_id == target_idea_id:
            raise ValueError("No puedes fusionar una idea consigo misma")

        now = datetime.now(timezone.utc)
        await db.feedback_ideas.update_one(
            {"idea_id": idea_id},
            {"$set": {
                "merged_into": target_idea_id,
                "status": "declined",
                "status_note": f"Duplicada de \"{target['title'][:80]}\"",
                "status_changed_at": now,
                "status_changed_by": admin_id,
                "updated_at": now,
            }}
        )

        # Notify the author
        try:
            await notification_dispatcher.send_notification(
                user_id=idea["author_id"],
                title="Tu idea fue fusionada",
                body=f"\"{idea['title'][:60]}\" fue marcada como duplicada de \"{target['title'][:40]}\"",
                notification_type="feedback_idea_merged",
                channels=["in_app", "push"],
                data={"idea_id": idea_id, "target_idea_id": target_idea_id},
                action_url=f"/feedback/{target.get('slug', target_idea_id)}",
            )
        except Exception as e:
            logger.warning(f"[Feedback] Failed to send merge notification: {e}")

        return {"merged_into": target_idea_id, "target_slug": target.get("slug")}

    async def admin_metrics(self, country_code: Optional[str] = None) -> Dict:
        """KPIs for admin dashboard."""
        match: dict = {"merged_into": None}
        if country_code:
            match["country_code"] = country_code.upper()

        # By status
        pipeline = [
            {"$match": match},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        by_status: dict = {}
        async for doc in db.feedback_ideas.aggregate(pipeline):
            by_status[doc["_id"]] = doc["count"]

        # By category
        pipeline_cat = [
            {"$match": match},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        ]
        by_category: dict = {}
        async for doc in db.feedback_ideas.aggregate(pipeline_cat):
            by_category[doc["_id"]] = doc["count"]

        total = sum(by_status.values())

        # Top 10 by votes
        top_voted = await db.feedback_ideas.find(match, {"_id": 0}).sort([("vote_count", -1)]).limit(10).to_list(10)

        # New this week
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        new_this_week = await db.feedback_ideas.count_documents({**match, "created_at": {"$gte": week_ago}})

        # Unreviewed (status = new)
        unreviewed = by_status.get("new", 0)

        return {
            "total": total,
            "by_status": by_status,
            "by_category": by_category,
            "top_voted": [
                {"idea_id": i["idea_id"], "slug": i["slug"], "title": i["title"], "vote_count": i["vote_count"], "status": i["status"]}
                for i in top_voted
            ],
            "new_this_week": new_this_week,
            "unreviewed": unreviewed,
        }


# Singleton
feedback_service = FeedbackService()
