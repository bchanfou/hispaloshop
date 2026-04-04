"""
Communities — create, explore, join, post, like.
Mounted at /api/communities and /api/community-posts.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import re
import logging
from bson import ObjectId

from core.database import get_db
from core.auth import get_current_user, get_optional_user
from core.sanitize import sanitize_text

logger = logging.getLogger(__name__)
router = APIRouter(tags=["communities"])

# ── Helpers ──────────────────────────────────────────────

def _oid(val):
    """Convert string to ObjectId if valid, else return as-is."""
    try:
        return ObjectId(val)
    except Exception:
        return val


def _str_id(doc):
    """Stringify _id if present, remove raw ObjectId to prevent serialization errors."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


CATEGORY_MAP = {
    "food": "Alimentación",
    "recipes": "Recetas",
    "producers": "Productores",
    "diet": "Dieta",
    "eco": "Ecológico",
    "vegan": "Vegano",
    "gluten_free": "Sin gluten",
    "local": "Local",
    "international": "Internacional",
}


# ── Models ───────────────────────────────────────────────

class CreateCommunityBody(BaseModel):
    name: str
    slug: str
    description: str = ""
    emoji: str = "🌿"
    category: str = ""
    tags: List[str] = []
    cover_image: Optional[str] = None
    logo_url: Optional[str] = None
    rules: List[str] = []


class CreatePostBody(BaseModel):
    text: str = ""
    image_url: Optional[str] = None
    product_ids: List[str] = []


class UpdateCommunityBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_image: Optional[str] = None
    logo_url: Optional[str] = None
    rules: Optional[List[str]] = None


VALID_MEMBER_ROLES = {"creator", "moderator", "member"}


class SetMemberRoleBody(BaseModel):
    role: str  # "moderator" | "member"


class CommunityDiscountBody(BaseModel):
    discount_type: str = "percentage"  # percentage | fixed
    discount_value: float = 0  # e.g., 10 for 10% or 5 for 5€
    is_active: bool = True


class FlashOfferBody(BaseModel):
    product_id: str
    discount_type: str = "percentage"
    discount_value: float = 0
    expires_hours: int = 24  # max 72 hours


class ResolveReportBody(BaseModel):
    action: str  # "reviewed" | "dismissed"


class CreateCommentBody(BaseModel):
    text: str


# ── EXPLORE / LIST ───────────────────────────────────────

@router.get("/communities")
async def list_communities(
    q: str = "",
    filter: str = "all",
    featured: bool = False,
    limit: int = 24,
    request: Request = None,
):
    db = get_db()
    user = await get_optional_user(request) if request else None
    user_id = getattr(user, "user_id", None) if user else None

    query = {"is_active": {"$ne": False}}

    # C-04: Featured filter — communities with is_featured flag or top by member_count
    if featured:
        query["$or"] = [
            {"is_featured": True},
            {"member_count": {"$gte": 5}},
        ]

    # Text search
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}

    # Category filter
    if filter in CATEGORY_MAP:
        query["category"] = CATEGORY_MAP[filter]

    # Joined filter
    if filter == "joined" and user_id:
        memberships = await db.community_members.find(
            {"user_id": user_id}
        ).to_list(500)
        joined_ids = [m["community_id"] for m in memberships]
        query["_id"] = {"$in": [_oid(cid) for cid in joined_ids]}

    cursor = db.communities.find(query).sort("member_count", -1).limit(limit)
    communities = []
    async for doc in cursor:
        c = _str_id(doc)
        c["is_member"] = False
        communities.append(c)

    # Batch membership check instead of N+1 queries
    if user_id and communities:
        community_ids = [c["id"] for c in communities]
        memberships = await db.community_members.find(
            {"community_id": {"$in": community_ids}, "user_id": user_id}
        ).to_list(len(community_ids))
        member_set = {m["community_id"] for m in memberships}
        for c in communities:
            c["is_member"] = c["id"] in member_set

    return {"communities": communities}


@router.get("/communities/me")
async def my_communities(request: Request):
    user = await get_current_user(request)
    db = get_db()
    memberships = await db.community_members.find(
        {"user_id": user.user_id}
    ).to_list(500)
    community_ids = [_oid(m["community_id"]) for m in memberships]

    communities = []
    async for doc in db.communities.find({"_id": {"$in": community_ids}}):
        c = _str_id(doc)
        c["is_member"] = True
        communities.append(c)

    return {"communities": communities}


# ── STATIC ROUTES (must be before /{slug} to avoid route conflicts) ──

@router.get("/communities/unread-counts")
async def get_unread_counts(request: Request):
    """Get unread post counts for all user's communities."""
    user = await get_current_user(request)
    db = get_db()

    memberships = await db.community_members.find(
        {"user_id": user.user_id}
    ).to_list(500)

    if not memberships:
        return {"counts": {}}

    # Build per-community match conditions (single aggregation instead of N queries)
    or_conditions = []
    for mem in memberships:
        cid = mem["community_id"]
        last_visit = mem.get("last_visit")
        cond = {"community_id": cid, "status": {"$ne": "removed"}}
        if last_visit:
            cond["created_at"] = {"$gt": last_visit}
        or_conditions.append(cond)

    pipeline = [
        {"$match": {"$or": or_conditions}},
        {"$group": {"_id": "$community_id", "count": {"$sum": 1}}},
    ]
    results = await db.community_posts.aggregate(pipeline).to_list(500)
    counts = {r["_id"]: r["count"] for r in results if r["count"] > 0}

    return {"counts": counts}


@router.post("/communities/reports")
async def create_report(body: CreateReportBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    if body.content_type not in REPORT_TYPES:
        raise HTTPException(400, f"Tipo de reporte no válido. Usa: {', '.join(REPORT_TYPES)}")
    if body.reason not in REPORT_REASONS:
        raise HTTPException(400, f"Motivo no válido. Usa: {', '.join(REPORT_REASONS)}")

    existing = await db.community_reports.find_one({
        "reporter_id": user.user_id,
        "content_type": body.content_type,
        "content_id": body.content_id,
    })
    if existing:
        return {"ok": True, "message": "Ya has reportado este contenido"}

    now = datetime.now(timezone.utc)
    report = {
        "reporter_id": user.user_id,
        "reporter_username": getattr(user, "username", None) or user.name,
        "content_type": body.content_type,
        "content_id": body.content_id,
        "reason": body.reason,
        "details": sanitize_text(body.details[:500]) if body.details else "",
        "status": "pending",
        "created_at": now.isoformat(),
    }

    if body.content_type == "post":
        post = await db.community_posts.find_one({"_id": _oid(body.content_id)})
        if post:
            report["community_id"] = post.get("community_id")
    elif body.content_type == "comment":
        comment = await db.community_post_comments.find_one({"_id": _oid(body.content_id)})
        if comment:
            p = await db.community_posts.find_one({"_id": _oid(comment.get("post_id"))})
            if p:
                report["community_id"] = p.get("community_id")
    elif body.content_type == "community":
        report["community_id"] = body.content_id

    await db.community_reports.insert_one(report)
    return {"ok": True}


@router.patch("/communities/reports/{report_id}")
async def resolve_report(report_id: str, body: ResolveReportBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    report = await db.community_reports.find_one({"_id": _oid(report_id)})
    if not report:
        raise HTTPException(404, "Reporte no encontrado")

    community_id = report.get("community_id")
    if community_id:
        mem = await db.community_members.find_one(
            {"community_id": community_id, "user_id": user.user_id}
        )
        caller_role = mem.get("role", "member") if mem else "member"
        if caller_role not in ("creator", "moderator"):
            raise HTTPException(403, "Solo admins y moderadores pueden resolver reportes")

    if body.action not in ("reviewed", "dismissed"):
        raise HTTPException(400, "Acción no válida. Usa 'reviewed' o 'dismissed'")

    await db.community_reports.update_one(
        {"_id": _oid(report_id)},
        {"$set": {
            "status": body.action,
            "resolved_by": user.user_id,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    if body.action == "reviewed" and report.get("content_type") == "post":
        await db.community_posts.update_one(
            {"_id": _oid(report["content_id"])},
            {"$set": {"status": "hidden"}}
        )

    return {"ok": True}


@router.get("/communities/by-creator/{creator_id}")
async def get_community_by_creator(creator_id: str, request: Request = None):
    """Get communities created by a specific user. Used on product pages."""
    db = get_db()
    user = await get_optional_user(request) if request else None
    user_id = getattr(user, "user_id", None)

    cursor = db.communities.find(
        {"creator_id": creator_id, "is_active": {"$ne": False}}
    ).sort("member_count", -1).limit(3)

    communities = []
    async for doc in cursor:
        c = _str_id(doc)
        c["is_member"] = False
        communities.append(c)

    if user_id and communities:
        cids = [c["id"] for c in communities]
        memberships = await db.community_members.find(
            {"community_id": {"$in": cids}, "user_id": user_id}
        ).to_list(len(cids))
        member_set = {m["community_id"] for m in memberships}
        for c in communities:
            c["is_member"] = c["id"] in member_set

    return {"communities": communities}


@router.get("/communities/member-discounts/{user_id}")
async def get_member_discounts_for_user(user_id: str, request: Request = None):
    """Get all active community discounts for a user's memberships."""
    db = get_db()

    memberships = await db.community_members.find(
        {"user_id": user_id}
    ).to_list(500)
    community_ids = [m["community_id"] for m in memberships]

    if not community_ids:
        return {"discounts": []}

    communities = await db.communities.find({
        "_id": {"$in": [_oid(cid) for cid in community_ids]},
        "member_discount.is_active": True,
    }).to_list(len(community_ids))

    discounts = []
    for c in communities:
        discount = c.get("member_discount")
        if discount and discount.get("is_active"):
            discounts.append({
                "community_id": str(c["_id"]),
                "community_name": c.get("name"),
                "creator_id": c.get("creator_id"),
                "discount_type": discount.get("type"),
                "discount_value": discount.get("value"),
            })

    return {"discounts": discounts}


# ── SINGLE COMMUNITY ────────────────────────────────────

@router.get("/communities/{slug}")
async def get_community(slug: str, request: Request):
    db = get_db()
    user = await get_optional_user(request)
    user_id = getattr(user, "user_id", None) if user else None

    doc = await db.communities.find_one({"slug": slug})
    if not doc:
        # Try by ID
        doc = await db.communities.find_one({"_id": _oid(slug)})
    if not doc:
        raise HTTPException(404, "Community not found")

    c = _str_id(doc)
    c["is_member"] = False
    c["is_admin"] = False
    c["role"] = None

    if user_id:
        mem = await db.community_members.find_one(
            {"community_id": c["id"], "user_id": user_id}
        )
        if mem:
            c["is_member"] = True
            c["is_admin"] = mem.get("is_admin", False)
            c["role"] = mem.get("role", "member")

    return c


# ── CREATE COMMUNITY ────────────────────────────────────

@router.post("/communities")
async def create_community(body: CreateCommunityBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    # Check eligibility: >100 followers or verified seller
    user_doc = await db.users.find_one({"user_id": user.user_id})
    followers_count = user_doc.get("followers_count", 0) if user_doc else 0
    is_verified_seller = user.role in ("producer", "importer") and getattr(user, "approved", False)

    if followers_count < 100 and not is_verified_seller:
        raise HTTPException(403, "Necesitas al menos 100 seguidores o ser vendedor verificado")

    # Rate limit: max 3 communities per user
    user_community_count = await db.communities.count_documents(
        {"creator_id": user.user_id, "is_active": {"$ne": False}}
    )
    if user_community_count >= 3:
        raise HTTPException(429, "No puedes crear más de 3 comunidades")

    # Check slug uniqueness
    existing = await db.communities.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(400, detail="slug_taken")

    now = datetime.now(timezone.utc)
    community = {
        "name": sanitize_text(body.name),
        "slug": body.slug,
        "description": sanitize_text(body.description),
        "emoji": body.emoji,
        "category": body.category,
        "tags": body.tags[:5],
        "cover_image": body.cover_image,
        "logo_url": body.logo_url,
        "rules": [sanitize_text(r)[:200] for r in body.rules[:10]],
        "creator_id": user.user_id,
        "creator_username": getattr(user, "username", None) or user.name,
        "member_count": 1,
        "post_count": 0,
        "created_at": now.isoformat(),
        "is_active": True,
    }

    result = await db.communities.insert_one(community)
    community_id = str(result.inserted_id)

    # Add creator as member + admin
    await db.community_members.insert_one({
        "community_id": community_id,
        "user_id": user.user_id,
        "username": getattr(user, "username", None) or user.name,
        "avatar_url": getattr(user, "profile_image", None) or getattr(user, "picture", None),
        "is_admin": True,
        "role": "creator",
        "is_seller": user.role in ("producer", "importer"),
        "joined_at": now.isoformat(),
    })

    return {"id": community_id, "slug": body.slug}


# ── JOIN / LEAVE ─────────────────────────────────────────

@router.post("/communities/{community_id}/join")
async def join_community(community_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    # Verify community exists
    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    existing = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    if existing:
        return {"ok": True, "message": "Already a member"}

    await db.community_members.insert_one({
        "community_id": cid,
        "user_id": user.user_id,
        "username": getattr(user, "username", None) or user.name,
        "avatar_url": getattr(user, "profile_image", None) or getattr(user, "picture", None),
        "is_admin": False,
        "role": "member",
        "is_seller": user.role in ("producer", "importer"),
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })

    await db.communities.update_one(
        {"_id": community["_id"]}, {"$inc": {"member_count": 1}}
    )

    return {"ok": True}


@router.delete("/communities/{community_id}/join")
async def leave_community(community_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    # Prevent creator from leaving their own community
    creator_id = community.get("creator_id")
    if creator_id and creator_id == getattr(user, "user_id", None):
        raise HTTPException(400, "El creador no puede abandonar su comunidad")

    cid = str(community["_id"])
    result = await db.community_members.delete_one(
        {"community_id": cid, "user_id": user.user_id}
    )

    if result.deleted_count > 0:
        await db.communities.update_one(
            {"_id": community["_id"]}, {"$inc": {"member_count": -1}}
        )

    return {"ok": True}


# ── POSTS ────────────────────────────────────────────────

@router.get("/communities/{community_id}/posts")
async def get_community_posts(
    community_id: str,
    page: int = 1,
    limit: int = 10,
    request: Request = None,
):
    db = get_db()
    user = await get_optional_user(request) if request else None
    user_id = getattr(user, "user_id", None)

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    skip = (page - 1) * limit

    cursor = (
        db.community_posts.find({"community_id": cid, "status": {"$ne": "removed"}})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit + 1)
    )

    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    page_docs = raw[:limit]

    posts = [_str_id(doc) for doc in page_docs]
    for p in posts:
        p["is_liked"] = False

    # Batch-check liked status in a single query instead of N find_one calls
    if user_id and posts:
        post_ids = [str(p["id"]) for p in posts]
        liked_docs = await db.community_post_likes.find(
            {"post_id": {"$in": post_ids}, "user_id": user_id},
            {"post_id": 1, "_id": 0},
        ).to_list(len(post_ids))
        liked_set = {d["post_id"] for d in liked_docs}
        for p in posts:
            p["is_liked"] = str(p["id"]) in liked_set

    # Enrich posts with product data (batch fetch)
    all_product_ids = set()
    for p in posts:
        for pid in (p.get("product_ids") or []):
            all_product_ids.add(pid)
    if all_product_ids:
        product_docs = await db.products.find(
            {"_id": {"$in": [_oid(pid) for pid in all_product_ids]}},
            {"name": 1, "price": 1, "images": 1, "slug": 1},
        ).to_list(len(all_product_ids))
        product_map = {}
        for pdoc in product_docs:
            pid = str(pdoc["_id"])
            product_map[pid] = {
                "id": pid,
                "name": pdoc.get("name", ""),
                "price": pdoc.get("price"),
                "image": (pdoc.get("images") or [None])[0],
                "slug": pdoc.get("slug", ""),
            }
        for p in posts:
            p["products"] = [product_map[pid] for pid in (p.get("product_ids") or []) if pid in product_map]

    return {"posts": posts, "page": page, "has_more": has_more}


@router.post("/communities/{community_id}/posts")
async def create_community_post(
    community_id: str, body: CreatePostBody, request: Request,
):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])

    # Must be member
    mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    if not mem:
        raise HTTPException(403, "Debes unirte a la comunidad para publicar")

    if not body.text.strip() and not body.image_url:
        raise HTTPException(400, "Post must have text or image")

    # Rate limit: max 5 posts per day per user across all communities
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_posts = await db.community_posts.count_documents({
        "author_id": user.user_id,
        "created_at": {"$gte": day_start.isoformat()},
        "status": {"$ne": "removed"},
    })
    if today_posts >= 5:
        raise HTTPException(429, "Máximo 5 publicaciones por día")

    now = datetime.now(timezone.utc)
    post = {
        "community_id": cid,
        "author_id": user.user_id,
        "author_username": getattr(user, "username", None) or user.name,
        "author_avatar": getattr(user, "profile_image", None) or getattr(user, "picture", None),
        "author_is_seller": user.role in ("producer", "importer"),
        "text": sanitize_text(body.text.strip()[:1000]),
        "image_url": body.image_url,
        "product_ids": body.product_ids[:5],  # max 5 products per post
        "likes_count": 0,
        "comments_count": 0,
        "created_at": now.isoformat(),
        "status": "active",
    }

    result = await db.community_posts.insert_one(post)
    await db.communities.update_one(
        {"_id": community["_id"]}, {"$inc": {"post_count": 1}}
    )

    # Background moderation
    from services.content_moderation import moderate_post_content

    async def _moderate_community_post(post_id, author_id, text, image_url):
        try:
            imgs = [image_url] if image_url else []
            mod = await moderate_post_content({"text": text, "image_urls": imgs, "tags": []})
            if mod["action"] == "hide":
                await db.community_posts.update_one({"_id": post_id}, {"$set": {"status": "hidden"}})
                await db.content_moderation_queue.insert_one({
                    "content_type": "community_post", "content_id": str(post_id),
                    "creator_id": author_id, "action": "hide",
                    "violation_type": mod.get("violation_type"),
                    "ai_reason": mod.get("reason"), "ai_confidence": mod.get("confidence"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "admin_reviewed": False, "admin_action": None,
                })
            elif mod["action"] == "review":
                await db.content_moderation_queue.insert_one({
                    "content_type": "community_post", "content_id": str(post_id),
                    "creator_id": author_id, "action": "review",
                    "violation_type": mod.get("violation_type"),
                    "ai_reason": mod.get("reason"), "ai_confidence": mod.get("confidence"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "admin_reviewed": False, "admin_action": None,
                })
        except Exception as e:
            logger.error("Background moderation failed: %s", e)

    from services.background import create_safe_task
    create_safe_task(_moderate_community_post(
        result.inserted_id, user.user_id, body.text, body.image_url,
    ), name="community_post_moderation")

    # Notify members if post is from admin/creator (decision 7-C)
    is_admin_post = mem.get("role") in ("creator", "moderator") or mem.get("is_admin", False)
    if is_admin_post:
        async def _notify_community_post(community_id, community_name, author_username, post_preview):
            try:
                members = await db.community_members.find(
                    {"community_id": community_id, "user_id": {"$ne": user.user_id}},
                    {"user_id": 1},
                ).to_list(500)
                now_str = datetime.now(timezone.utc).isoformat()
                notifications = [{
                    "user_id": m["user_id"],
                    "type": "community_admin_post",
                    "title": f"Nuevo post en {community_name}",
                    "body": f"@{author_username}: {post_preview[:80]}",
                    "action_url": f"/communities/{community.get('slug', community_id)}",
                    "read": False,
                    "created_at": now_str,
                } for m in members]
                if notifications:
                    await db.notifications.insert_many(notifications)
            except Exception as e:
                logger.error("Community notification failed: %s", e)

        create_safe_task(_notify_community_post(
            cid, community.get("name", ""), getattr(user, "username", ""), body.text.strip()[:80],
        ), name="community_post_notification")

    return {"id": str(result.inserted_id), "ok": True}


# ── POST INTERACTIONS ────────────────────────────────────

@router.post("/community-posts/{post_id}/like")
async def like_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    pid = str(post["_id"])
    existing = await db.community_post_likes.find_one(
        {"post_id": pid, "user_id": user.user_id}
    )
    if existing:
        return {"ok": True}

    await db.community_post_likes.insert_one({
        "post_id": pid,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.community_posts.update_one(
        {"_id": post["_id"]}, {"$inc": {"likes_count": 1}}
    )

    return {"ok": True}


@router.delete("/community-posts/{post_id}/like")
async def unlike_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    pid = str(post["_id"])
    result = await db.community_post_likes.delete_one(
        {"post_id": pid, "user_id": user.user_id}
    )
    if result.deleted_count > 0:
        await db.community_posts.update_one(
            {"_id": post["_id"]}, {"$inc": {"likes_count": -1}}
        )

    return {"ok": True}


@router.delete("/community-posts/{post_id}")
async def delete_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    # Author or community admin/moderator can delete
    is_author = post.get("author_id") == user.user_id
    is_admin = False
    if not is_author:
        mem = await db.community_members.find_one(
            {"community_id": post["community_id"], "user_id": user.user_id}
        )
        if mem:
            is_admin = mem.get("is_admin", False) or mem.get("role") in ("creator", "moderator")

    if not is_author and not is_admin:
        raise HTTPException(403, "No tienes permisos para eliminar este post")

    # Only decrement if post wasn't already removed (prevent double-delete)
    if post.get("status") != "removed":
        await db.community_posts.update_one(
            {"_id": post["_id"]}, {"$set": {"status": "removed"}}
        )
        # Use $max to prevent post_count going negative
        community_doc = await db.communities.find_one({"_id": _oid(post["community_id"])})
        if community_doc:
            current_count = community_doc.get("post_count", 0)
            await db.communities.update_one(
                {"_id": _oid(post["community_id"])},
                {"$set": {"post_count": max(0, current_count - 1)}}
            )

    return {"ok": True}


# ── MEMBERS ──────────────────────────────────────────────

@router.get("/communities/{community_id}/members")
async def get_members(community_id: str, page: int = 1, limit: int = 30):
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    skip = (max(1, page) - 1) * limit
    cursor = (
        db.community_members.find({"community_id": cid})
        .sort("is_admin", -1)
        .skip(skip)
        .limit(limit + 1)
    )
    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    members = []
    for doc in raw[:limit]:
        m = _str_id(doc)
        members.append(m)

    return {"members": members, "page": page, "has_more": has_more}


# ── SET MEMBER ROLE (admin only) ─────────────────────

@router.patch("/communities/{community_id}/members/{user_id}/role")
async def set_member_role(community_id: str, user_id: str, body: SetMemberRoleBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])

    # Only admin/creator can change roles
    caller_mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    if not caller_mem or not caller_mem.get("is_admin", False):
        raise HTTPException(403, "Solo los admins pueden cambiar roles")

    if body.role not in ("moderator", "member"):
        raise HTTPException(400, "Rol no válido. Usa 'moderator' o 'member'")

    # Cannot change creator's role
    target_mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user_id}
    )
    if not target_mem:
        raise HTTPException(404, "Miembro no encontrado")
    if target_mem.get("role") == "creator":
        raise HTTPException(400, "No se puede cambiar el rol del creador")

    await db.community_members.update_one(
        {"community_id": cid, "user_id": user_id},
        {"$set": {"role": body.role, "is_admin": body.role == "moderator"}}
    )

    return {"ok": True, "role": body.role}


# ── UPDATE COMMUNITY (admin only) ──────────────────────

@router.put("/communities/{community_id}")
async def update_community(community_id: str, body: UpdateCommunityBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    # Only creator can edit community settings (moderators cannot)
    caller_role = mem.get("role", "member") if mem else "member"
    if caller_role != "creator":
        raise HTTPException(403, "Solo el creador puede editar la comunidad")

    updates = {}
    if body.name is not None:
        updates["name"] = sanitize_text(body.name)
    if body.description is not None:
        updates["description"] = sanitize_text(body.description)
    if body.emoji is not None:
        updates["emoji"] = body.emoji
    if body.category is not None:
        updates["category"] = body.category
    if body.tags is not None:
        updates["tags"] = body.tags[:5]
    if body.cover_image is not None:
        updates["cover_image"] = body.cover_image
    if body.logo_url is not None:
        updates["logo_url"] = body.logo_url
    if body.rules is not None:
        updates["rules"] = [sanitize_text(r)[:200] for r in body.rules[:10]]

    if updates:
        await db.communities.update_one({"_id": community["_id"]}, {"$set": updates})

    return {"ok": True}


# ── DELETE COMMUNITY (creator only) ────────────────────

@router.delete("/communities/{community_id}")
async def delete_community(community_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    if community.get("creator_id") != user.user_id:
        raise HTTPException(403, "Solo el creador puede eliminar la comunidad")

    cid = str(community["_id"])

    # Remove all related data
    await db.community_members.delete_many({"community_id": cid})
    await db.community_posts.update_many(
        {"community_id": cid}, {"$set": {"status": "removed"}}
    )
    await db.communities.delete_one({"_id": community["_id"]})

    return {"ok": True}


# ── PIN / UNPIN POST (admin only) ──────────────────────

@router.patch("/community-posts/{post_id}/pin")
async def toggle_pin_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    mem = await db.community_members.find_one(
        {"community_id": post["community_id"], "user_id": user.user_id}
    )
    if not mem or (not mem.get("is_admin", False) and mem.get("role") not in ("creator", "moderator")):
        raise HTTPException(403, "Solo los admins pueden fijar posts")

    current = post.get("is_pinned", False)
    await db.community_posts.update_one(
        {"_id": post["_id"]}, {"$set": {"is_pinned": not current}}
    )

    return {"ok": True, "is_pinned": not current}


# ── COMMENTS ───────────────────────────────────────────

@router.get("/community-posts/{post_id}/comments")
async def get_comments(post_id: str, page: int = 1, limit: int = 20):
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    pid = str(post["_id"])
    skip = (max(1, page) - 1) * limit
    cursor = (
        db.community_post_comments.find({"post_id": pid})
        .sort("created_at", 1)
        .skip(skip)
        .limit(limit + 1)
    )
    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    comments = [_str_id(doc) for doc in raw[:limit]]

    return {"comments": comments, "page": page, "has_more": has_more}


@router.post("/community-posts/{post_id}/comments")
async def create_comment(post_id: str, body: CreateCommentBody, request: Request):
    user = await get_current_user(request)
    db = get_db()

    post = await db.community_posts.find_one({"_id": _oid(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")

    if not body.text.strip():
        raise HTTPException(400, "El comentario no puede estar vacío")

    # Rate limit: max 20 comments per day per user
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_comments = await db.community_post_comments.count_documents({
        "author_id": user.user_id,
        "created_at": {"$gte": day_start.isoformat()},
    })
    if today_comments >= 20:
        raise HTTPException(429, "Máximo 20 comentarios por día")

    pid = str(post["_id"])
    now = datetime.now(timezone.utc)
    comment = {
        "post_id": pid,
        "author_id": user.user_id,
        "author_username": getattr(user, "username", None) or user.name,
        "author_avatar": getattr(user, "profile_image", None) or getattr(user, "picture", None),
        "text": sanitize_text(body.text.strip()[:500]),
        "created_at": now.isoformat(),
    }

    result = await db.community_post_comments.insert_one(comment)
    await db.community_posts.update_one(
        {"_id": post["_id"]}, {"$inc": {"comments_count": 1}}
    )

    # Notify post author about the reply (decision 7-C)
    post_author_id = post.get("author_id")
    if post_author_id and post_author_id != user.user_id:
        try:
            await db.notifications.insert_one({
                "user_id": post_author_id,
                "type": "community_comment_reply",
                "title": "Nuevo comentario en tu post",
                "body": f"@{getattr(user, 'username', 'Alguien')}: {body.text.strip()[:80]}",
                "action_url": f"/communities/{post.get('community_id')}",
                "read": False,
                "created_at": now.isoformat(),
            })
        except Exception as e:
            logger.error("Comment notification failed: %s", e)

    return {"id": str(result.inserted_id), "ok": True}


# ── REPORTS (models — endpoints moved to static routes section above) ──

REPORT_REASONS = {"spam", "offensive", "irrelevant", "harassment", "misinformation", "other"}
REPORT_TYPES = {"post", "comment", "member", "community"}


class CreateReportBody(BaseModel):
    content_type: str  # post | comment | member | community
    content_id: str
    reason: str
    details: str = ""


# ── MODERATION QUEUE (admin/moderator) ───────────────

@router.get("/communities/{community_id}/reports")
async def get_community_reports(
    community_id: str, status: str = "pending", page: int = 1,
    limit: int = 20, request: Request = None,
):
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])

    # Must be admin or moderator
    mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    caller_role = mem.get("role", "member") if mem else "member"
    if caller_role not in ("creator", "moderator"):
        raise HTTPException(403, "Solo admins y moderadores pueden ver reportes")

    query = {"community_id": cid}
    if status in ("pending", "reviewed", "dismissed"):
        query["status"] = status

    skip = (max(1, page) - 1) * limit
    cursor = db.community_reports.find(query).sort("created_at", -1).skip(skip).limit(limit + 1)
    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    reports = [_str_id(doc) for doc in raw[:limit]]

    return {"reports": reports, "page": page, "has_more": has_more}


# ── SEARCH POSTS ─────────────────────────────────────

@router.get("/communities/{community_id}/posts/search")
async def search_community_posts(
    community_id: str, q: str = "", page: int = 1, limit: int = 10,
    request: Request = None,
):
    db = get_db()
    user = await get_optional_user(request) if request else None
    user_id = getattr(user, "user_id", None)

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    query = {"community_id": cid, "status": {"$ne": "removed"}}
    if q:
        query["text"] = {"$regex": re.escape(q), "$options": "i"}

    skip = (page - 1) * limit
    cursor = db.community_posts.find(query).sort("created_at", -1).skip(skip).limit(limit + 1)
    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    posts = [_str_id(doc) for doc in raw[:limit]]

    for p in posts:
        p["is_liked"] = False

    if user_id and posts:
        post_ids = [str(p["id"]) for p in posts]
        liked_docs = await db.community_post_likes.find(
            {"post_id": {"$in": post_ids}, "user_id": user_id},
            {"post_id": 1, "_id": 0},
        ).to_list(len(post_ids))
        liked_set = {d["post_id"] for d in liked_docs}
        for p in posts:
            p["is_liked"] = str(p["id"]) in liked_set

    # Enrich search results with product data (same as main feed)
    all_product_ids = set()
    for p in posts:
        for pid in (p.get("product_ids") or []):
            all_product_ids.add(pid)
    if all_product_ids:
        product_docs = await db.products.find(
            {"_id": {"$in": [_oid(pid) for pid in all_product_ids]}},
            {"name": 1, "price": 1, "images": 1, "slug": 1},
        ).to_list(len(all_product_ids))
        product_map = {}
        for pdoc in product_docs:
            pid = str(pdoc["_id"])
            product_map[pid] = {
                "id": pid, "name": pdoc.get("name", ""),
                "price": pdoc.get("price"),
                "image": (pdoc.get("images") or [None])[0],
                "slug": pdoc.get("slug", ""),
            }
        for p in posts:
            p["products"] = [product_map[pid] for pid in (p.get("product_ids") or []) if pid in product_map]

    return {"posts": posts, "page": page, "has_more": has_more}


# ── ANALYTICS ────────────────────────────────────────

@router.get("/communities/{community_id}/analytics")
async def get_community_analytics(community_id: str, request: Request):
    """Community analytics for admins. Basic for all, advanced for PRO/ELITE."""
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])

    # Must be admin or moderator
    mem = await db.community_members.find_one(
        {"community_id": cid, "user_id": user.user_id}
    )
    caller_role = mem.get("role", "member") if mem else "member"
    if caller_role not in ("creator", "moderator"):
        raise HTTPException(403, "Solo admins pueden ver las analíticas")

    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # Basic analytics (all plans)
    total_members = community.get("member_count", 0)
    total_posts = community.get("post_count", 0)

    # Members joined this week/month
    new_members_week = await db.community_members.count_documents({
        "community_id": cid, "joined_at": {"$gte": week_ago}
    })
    new_members_month = await db.community_members.count_documents({
        "community_id": cid, "joined_at": {"$gte": month_ago}
    })

    # Posts this week/month
    posts_week = await db.community_posts.count_documents({
        "community_id": cid, "created_at": {"$gte": week_ago},
        "status": {"$ne": "removed"},
    })
    posts_month = await db.community_posts.count_documents({
        "community_id": cid, "created_at": {"$gte": month_ago},
        "status": {"$ne": "removed"},
    })

    # Total likes and comments this month
    month_posts = await db.community_posts.find(
        {"community_id": cid, "created_at": {"$gte": month_ago}, "status": {"$ne": "removed"}},
        {"likes_count": 1, "comments_count": 1},
    ).to_list(1000)
    total_likes_month = sum(p.get("likes_count", 0) for p in month_posts)
    total_comments_month = sum(p.get("comments_count", 0) for p in month_posts)

    # Engagement rate = (likes + comments) / (posts * members) if possible
    engagement_rate = 0
    if total_members > 0 and posts_month > 0:
        engagement_rate = round((total_likes_month + total_comments_month) / (posts_month * total_members) * 100, 1)

    # Top posts (most liked this month)
    top_posts_cursor = db.community_posts.find(
        {"community_id": cid, "created_at": {"$gte": month_ago}, "status": {"$ne": "removed"}},
        {"text": 1, "likes_count": 1, "comments_count": 1, "author_username": 1, "created_at": 1},
    ).sort("likes_count", -1).limit(5)
    top_posts = [_str_id(doc) async for doc in top_posts_cursor]

    analytics = {
        "total_members": total_members,
        "total_posts": total_posts,
        "new_members_week": new_members_week,
        "new_members_month": new_members_month,
        "posts_week": posts_week,
        "posts_month": posts_month,
        "total_likes_month": total_likes_month,
        "total_comments_month": total_comments_month,
        "engagement_rate": engagement_rate,
        "top_posts": top_posts,
    }

    # Advanced analytics for PRO/ELITE — product clicks and revenue attribution
    producer = await db.users.find_one({"user_id": user.user_id})
    plan = (producer.get("plan") or "FREE").upper() if producer else "FREE"
    if plan in ("PRO", "ELITE"):
        # Count how many products were linked in community posts
        product_posts = await db.community_posts.find(
            {"community_id": cid, "product_ids": {"$exists": True, "$ne": []}},
            {"product_ids": 1},
        ).to_list(1000)
        all_linked = []
        for pp in product_posts:
            all_linked.extend(pp.get("product_ids", []))

        # Count orders from community members (attributed revenue)
        member_ids = [m["user_id"] async for m in db.community_members.find(
            {"community_id": cid}, {"user_id": 1}
        )]
        orders_from_members = await db.orders.count_documents({
            "user_id": {"$in": member_ids},
            "created_at": {"$gte": month_ago},
        }) if member_ids else 0

        analytics["linked_products_count"] = len(set(all_linked))
        analytics["total_product_links"] = len(all_linked)
        analytics["orders_from_members_month"] = orders_from_members
        analytics["plan"] = plan

    return analytics


# ── VISIT (parameterized — safe after /{slug}) ──────

@router.post("/communities/{community_id}/visit")
async def record_visit(community_id: str, request: Request):
    """Record user's last visit to update unread count."""
    user = await get_current_user(request)
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    await db.community_members.update_one(
        {"community_id": community_id, "user_id": user.user_id},
        {"$set": {"last_visit": now}}
    )

    return {"ok": True}


# ── MEMBER DISCOUNTS ─────────────────────────────────

@router.put("/communities/{community_id}/discount")
async def set_community_discount(community_id: str, body: CommunityDiscountBody, request: Request):
    """Set automatic member discount (PRO+ plan required)."""
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    if community.get("creator_id") != user.user_id:
        raise HTTPException(403, "Solo el creador puede configurar descuentos")

    producer = await db.users.find_one({"user_id": user.user_id})
    plan = (producer.get("plan") or "FREE").upper() if producer else "FREE"
    if plan not in ("PRO", "ELITE"):
        raise HTTPException(403, "Necesitas plan PRO o ELITE para descuentos automáticos")

    if body.discount_value < 0 or body.discount_value > 50:
        raise HTTPException(400, "El descuento debe estar entre 0% y 50%")

    await db.communities.update_one(
        {"_id": _oid(community_id)},
        {"$set": {
            "member_discount": {
                "type": body.discount_type,
                "value": body.discount_value,
                "is_active": body.is_active,
            }
        }}
    )

    return {"ok": True}


@router.get("/communities/{community_id}/discount")
async def get_community_discount(community_id: str, request: Request = None):
    db = get_db()
    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    return {
        "discount": community.get("member_discount"),
        "community_id": str(community["_id"]),
        "community_name": community.get("name"),
    }


@router.post("/communities/{community_id}/flash-offers")
async def create_flash_offer(community_id: str, body: FlashOfferBody, request: Request):
    """Create time-limited flash offer (ELITE plan required)."""
    user = await get_current_user(request)
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    if community.get("creator_id") != user.user_id:
        raise HTTPException(403, "Solo el creador puede crear ofertas flash")

    producer = await db.users.find_one({"user_id": user.user_id})
    plan = (producer.get("plan") or "FREE").upper() if producer else "FREE"
    if plan != "ELITE":
        raise HTTPException(403, "Necesitas plan ELITE para ofertas flash")

    if body.expires_hours < 1 or body.expires_hours > 72:
        raise HTTPException(400, "La oferta debe durar entre 1 y 72 horas")

    now = datetime.now(timezone.utc)
    offer = {
        "community_id": str(community["_id"]),
        "product_id": body.product_id,
        "discount_type": body.discount_type,
        "discount_value": body.discount_value,
        "created_by": user.user_id,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=body.expires_hours)).isoformat(),
        "is_active": True,
    }

    result = await db.community_flash_offers.insert_one(offer)
    return {"id": str(result.inserted_id), "ok": True}


@router.get("/communities/{community_id}/flash-offers")
async def get_flash_offers(community_id: str):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.community_flash_offers.find({
        "community_id": community_id,
        "is_active": True,
        "expires_at": {"$gt": now},
    }).sort("created_at", -1).limit(10)
    offers = [_str_id(doc) async for doc in cursor]

    # Enrich with product data
    product_ids = list({o.get("product_id") for o in offers if o.get("product_id")})
    if product_ids:
        pdocs = await db.products.find(
            {"_id": {"$in": [_oid(pid) for pid in product_ids]}},
            {"name": 1, "price": 1, "images": 1, "slug": 1},
        ).to_list(len(product_ids))
        pmap = {str(p["_id"]): {
            "id": str(p["_id"]), "name": p.get("name", ""),
            "price": p.get("price"), "image": (p.get("images") or [None])[0],
            "slug": p.get("slug", ""),
        } for p in pdocs}
        for o in offers:
            o["product"] = pmap.get(o.get("product_id"))

    return {"offers": offers}
