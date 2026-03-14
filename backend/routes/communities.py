"""
Communities — create, explore, join, post, like.
Mounted at /api/communities and /api/community-posts.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId

from core.database import get_db
from core.auth import get_current_user, get_optional_user

router = APIRouter(tags=["communities"])

# ── Helpers ──────────────────────────────────────────────

def _oid(val):
    """Convert string to ObjectId if valid, else return as-is."""
    try:
        return ObjectId(val)
    except Exception:
        return val


def _str_id(doc):
    """Stringify _id if present."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc


CATEGORY_MAP = {
    "food": "Alimentación",
    "recipes": "Recetas",
    "producers": "Productores",
    "diet": "Dieta",
    "local": "Local",
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


class CreatePostBody(BaseModel):
    text: str = ""
    image_url: Optional[str] = None


# ── EXPLORE / LIST ───────────────────────────────────────

@router.get("/communities")
async def list_communities(
    q: str = "",
    filter: str = "all",
    limit: int = 24,
    request: Request = None,
):
    db = get_db()
    user = await get_optional_user(request) if request else None
    user_id = getattr(user, "user_id", None)

    query = {"is_active": {"$ne": False}}

    # Text search
    if q:
        query["name"] = {"$regex": q, "$options": "i"}

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
        if user_id:
            mem = await db.community_members.find_one(
                {"community_id": str(c["_id"]), "user_id": user_id}
            )
            c["is_member"] = mem is not None
        communities.append(c)

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


# ── SINGLE COMMUNITY ────────────────────────────────────

@router.get("/communities/{slug}")
async def get_community(slug: str, request: Request):
    db = get_db()
    user = await get_optional_user(request)
    user_id = getattr(user, "user_id", None)

    doc = await db.communities.find_one({"slug": slug})
    if not doc:
        # Try by ID
        doc = await db.communities.find_one({"_id": _oid(slug)})
    if not doc:
        raise HTTPException(404, "Community not found")

    c = _str_id(doc)
    c["is_member"] = False
    c["is_admin"] = False

    if user_id:
        mem = await db.community_members.find_one(
            {"community_id": str(c["_id"]), "user_id": user_id}
        )
        if mem:
            c["is_member"] = True
            c["is_admin"] = mem.get("is_admin", False)

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

    # Check slug uniqueness
    existing = await db.communities.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(400, detail="slug_taken")

    now = datetime.utcnow()
    community = {
        "name": body.name,
        "slug": body.slug,
        "description": body.description,
        "emoji": body.emoji,
        "category": body.category,
        "tags": body.tags[:5],
        "cover_image": body.cover_image,
        "creator_id": user.user_id,
        "creator_username": user.username or user.name,
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
        "username": user.username or user.name,
        "avatar_url": getattr(user, "picture", None),
        "is_admin": True,
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
        "username": user.username or user.name,
        "avatar_url": getattr(user, "picture", None),
        "is_admin": False,
        "is_seller": user.role in ("producer", "importer"),
        "joined_at": datetime.utcnow().isoformat(),
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

    posts = []
    raw = await cursor.to_list(limit + 1)
    has_more = len(raw) > limit
    for doc in raw[:limit]:
        p = _str_id(doc)
        p["is_liked"] = False
        if user_id:
            like = await db.community_post_likes.find_one(
                {"post_id": str(p["_id"]), "user_id": user_id}
            )
            p["is_liked"] = like is not None
        posts.append(p)

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

    now = datetime.utcnow()
    post = {
        "community_id": cid,
        "author_id": user.user_id,
        "author_username": user.username or user.name,
        "author_avatar": getattr(user, "picture", None),
        "author_is_seller": user.role in ("producer", "importer"),
        "text": body.text.strip()[:1000],
        "image_url": body.image_url,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": now.isoformat(),
        "status": "active",
    }

    result = await db.community_posts.insert_one(post)
    await db.communities.update_one(
        {"_id": community["_id"]}, {"$inc": {"post_count": 1}}
    )

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
        "created_at": datetime.utcnow().isoformat(),
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

    # Author or community admin can delete
    is_author = post.get("author_id") == user.user_id
    is_admin = False
    if not is_author:
        mem = await db.community_members.find_one(
            {"community_id": post["community_id"], "user_id": user.user_id}
        )
        is_admin = mem.get("is_admin", False) if mem else False

    if not is_author and not is_admin:
        raise HTTPException(403, "No tienes permisos para eliminar este post")

    await db.community_posts.update_one(
        {"_id": post["_id"]}, {"$set": {"status": "removed"}}
    )
    await db.communities.update_one(
        {"_id": _oid(post["community_id"])}, {"$inc": {"post_count": -1}}
    )

    return {"ok": True}


# ── MEMBERS ──────────────────────────────────────────────

@router.get("/communities/{community_id}/members")
async def get_members(community_id: str, limit: int = 30):
    db = get_db()

    community = await db.communities.find_one({"_id": _oid(community_id)})
    if not community:
        raise HTTPException(404, "Community not found")

    cid = str(community["_id"])
    cursor = (
        db.community_members.find({"community_id": cid})
        .sort("is_admin", -1)
        .limit(limit)
    )
    members = []
    async for doc in cursor:
        m = _str_id(doc)
        members.append(m)

    return {"members": members}
