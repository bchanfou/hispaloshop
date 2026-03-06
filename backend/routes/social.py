"""
Social routes: user profiles, posts, feed, comments, likes, bookmarks, discover, avatars.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging
from sqlalchemy import select, desc

from core.database import db
from core.models import User
from core.auth import get_current_user, get_optional_user
from config import normalize_influencer_tier
from services.cloudinary_storage import upload_image as cloudinary_upload
# NOTE: PostgreSQL fallback disabled - using MongoDB only for MVP
# from database import AsyncSessionLocal
# from models import Post as PgPost, User as PgUser

logger = logging.getLogger(__name__)
router = APIRouter()


async def _fallback_feed_from_postgres(skip: int, limit: int):
    # PostgreSQL fallback disabled for MVP - return empty
    return []


# ── User Profile ─────────────────────────────────────────────


async def _fallback_trending_from_postgres(limit: int):
    # PostgreSQL fallback disabled for MVP - return empty
    return {"posts": []}
    # async with AsyncSessionLocal() as session:
    #     rows = (
    #         await session.execute(
    #             select(PgPost, PgUser)
    #             .join(PgUser, PgUser.id == PgPost.user_id)
    #             .where(PgPost.status == "published")
    #             .order_by(desc(PgPost.likes_count), desc(PgPost.comments_count), desc(PgPost.created_at))
    #             .limit(limit)
    #         )
    #     ).all()
    # posts = []
    # for post, user in rows:
    #     posts.append(...)
    # return {"posts": posts}


async def _fallback_discover_from_postgres(role: Optional[str], search: Optional[str], skip: int, limit: int):
    # PostgreSQL fallback disabled for MVP - return empty
    return {"profiles": [], "total": 0}
    # async with AsyncSessionLocal() as session:
    #     users = (
    #         await session.scalars(select(PgUser).order_by(desc(PgUser.created_at)).offset(skip).limit(limit))
    #     ).all()
    # profiles = []
    # for u in users:
    #     ...
    # return {"profiles": profiles, "total": len(profiles)}


# ── User Profile ─────────────────────────────────────────────

@router.get("/reels")
async def get_reels(limit: int = 40, skip: int = 0, request: Request = None):
    """
    Legacy reels endpoint used by the current frontend (/api/reels).
    Reads from Mongo social collections and never requires authentication.
    """
    current_user = await get_optional_user(request) if request is not None else None
    try:
        reels = await db.reels.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    except Exception:
        reels = []

    if not reels:
        reels = await db.user_posts.find(
            {
                "$or": [
                    {"is_reel": True},
                    {"media_type": "video"},
                    {"video_url": {"$exists": True}},
                ]
            },
            {"_id": 0},
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    items = []
    for reel in reels:
        user_id = reel.get("user_id")
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0}) if user_id else None
        media_url = reel.get("video_url") or reel.get("media_url") or (reel.get("media") or [{}])[0].get("url")
        thumb_url = reel.get("thumbnail_url") or (reel.get("media") or [{}])[0].get("thumbnail_url") or media_url

        is_followed = False
        if current_user and user_id:
            is_followed = (
                await db.user_follows.find_one(
                    {"follower_id": current_user.user_id, "following_id": user_id},
                    {"_id": 0},
                )
                is not None
            )

        items.append(
            {
                "id": reel.get("id") or reel.get("post_id") or reel.get("reel_id"),
                "post_id": reel.get("post_id") or reel.get("id") or reel.get("reel_id"),
                "user_id": user_id,
                "user_name": reel.get("user_name") or (user_doc or {}).get("name") or "Usuario",
                "user_profile_image": reel.get("user_profile_image") or (user_doc or {}).get("profile_image"),
                "caption": reel.get("caption") or reel.get("content") or "",
                "video_url": media_url,
                "thumbnail_url": thumb_url,
                "likes_count": reel.get("likes_count", 0),
                "comments_count": reel.get("comments_count", 0),
                "views_count": reel.get("views_count", 0),
                "created_at": reel.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "user": {
                    "id": user_id,
                    "full_name": reel.get("user_name") or (user_doc or {}).get("name") or "Usuario",
                    "avatar_url": reel.get("user_profile_image") or (user_doc or {}).get("profile_image"),
                    "is_followed_by_me": is_followed,
                },
                "media": [{"url": media_url, "thumbnail_url": thumb_url}] if media_url else [],
                "engagement": {
                    "likes_count": reel.get("likes_count", 0),
                    "comments_count": reel.get("comments_count", 0),
                },
            }
        )

    return {"items": items, "has_more": len(items) == limit}


@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, request: Request):
    """Get public user profile — enhanced with seller stats for producers."""
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0, "verification_code": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    followers_count = await db.user_follows.count_documents({"following_id": user_id})
    following_count = await db.user_follows.count_documents({"follower_id": user_id})
    posts_count = await db.user_posts.count_documents({"user_id": user_id})

    is_following = False
    current_user = await get_optional_user(request)
    if current_user:
        follow_exists = await db.user_follows.find_one({"follower_id": current_user.user_id, "following_id": user_id})
        is_following = follow_exists is not None

    profile = {
        "user_id": user.get("user_id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "profile_image": user.get("profile_image"),
        "bio": user.get("bio", ""),
        "location": user.get("location"),
        "country": user.get("country"),
        "created_at": user.get("created_at"),
        "role": user.get("role"),
        "company_name": user.get("company_name"),
        "followers_count": followers_count,
        "following_count": following_count,
        "posts_count": posts_count,
        "is_following": is_following,
    }

    # Influencer public info (social links, niche — NO earnings)
    if user.get("role") == "influencer":
        profile["instagram"] = user.get("instagram")
        profile["tiktok"] = user.get("tiktok")
        profile["youtube"] = user.get("youtube")
        profile["niche"] = user.get("niche")
        inf = await db.influencers.find_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"_id": 0, "current_tier": 1, "niche": 1}
        )
        if inf:
            profile["niche"] = inf.get("niche") or profile.get("niche")
            profile["tier"] = normalize_influencer_tier(inf.get("current_tier", "perseo"))

    if user.get("role") == "producer":
        orders = await db.orders.find(
            {"line_items.producer_id": user_id, "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}},
            {"_id": 0, "line_items": 1}
        ).to_list(1000)
        total_sales = 0
        total_orders = len(orders)
        for order in orders:
            for item in order.get("line_items", []):
                if item.get("producer_id") == user_id:
                    total_sales += item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))

        products = await db.products.find({"producer_id": user_id}, {"_id": 0, "product_id": 1}).to_list(100)
        product_ids = [p["product_id"] for p in products]
        avg_rating = 0
        review_count = 0
        if product_ids:
            review_agg = await db.reviews.aggregate([
                {"$match": {"product_id": {"$in": product_ids}, "visible": True}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
            ]).to_list(1)
            if review_agg:
                avg_rating = round(review_agg[0]["avg"], 1)
                review_count = review_agg[0]["count"]

        featured_products = await db.products.find(
            {"producer_id": user_id, "approved": True},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1}
        ).sort("created_at", -1).limit(4).to_list(4)

        store = await db.store_profiles.find_one({"producer_id": user_id}, {"_id": 0, "slug": 1, "tagline": 1, "verified": 1, "badges": 1})

        profile["seller_stats"] = {
            "total_sales": round(total_sales, 2),
            "total_orders": total_orders,
            "total_products": len(products),
            "avg_rating": avg_rating,
            "review_count": review_count,
            "member_since": user.get("created_at", ""),
            "featured_products": featured_products,
            "store_slug": store.get("slug") if store else None,
            "store_tagline": store.get("tagline") if store else None,
            "verified": store.get("verified", False) if store else False,
            "badges": store.get("badges", []) if store else [],
        }

    return profile


@router.get("/users/{user_id}/posts")
async def get_user_posts(user_id: str, skip: int = 0, limit: int = 30):
    posts = await db.user_posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return posts


@router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, user: User = Depends(get_current_user)):
    if user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = await db.user_follows.find_one({"follower_id": user.user_id, "following_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already following this user")
    await db.user_follows.insert_one({"follower_id": user.user_id, "following_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"status": "ok"}


@router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, user: User = Depends(get_current_user)):
    result = await db.user_follows.delete_one({"follower_id": user.user_id, "following_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not following this user")
    return {"status": "ok"}


# ── Posts ─────────────────────────────────────────────────────

@router.post("/posts")
async def create_post(
    request: Request,
    caption: str = Form(""),
    product_id: str = Form(""),
    file: UploadFile = File(None),
    user: User = Depends(get_current_user)
):
    """Create a new post. Producers and influencers MUST tag a product."""
    requires_product = user.role in ("producer", "importer", "influencer")
    if requires_product and (not product_id or not product_id.strip()):
        raise HTTPException(status_code=400, detail="Los vendedores e influencers deben vincular un producto a cada post")

    image_url = None
    if file and file.filename:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size cannot exceed 10MB")
        result = await cloudinary_upload(contents, folder="posts", filename=f"post_{uuid.uuid4().hex[:8]}")
        image_url = result["url"]

    if not caption.strip() and not image_url:
        raise HTTPException(status_code=400, detail="Post must have text or an image")

    tagged_product = None
    if product_id and product_id.strip():
        prod = await db.products.find_one(
            {"product_id": product_id.strip()},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "currency": 1, "images": 1}
        )
        if prod:
            tagged_product = {
                "product_id": prod["product_id"],
                "name": prod.get("name", ""),
                "price": prod.get("price", 0),
                "currency": prod.get("currency", "EUR"),
                "image": prod.get("images", [None])[0]
            }

    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post = {
        "post_id": post_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "image_url": image_url,
        "caption": caption,
        "tagged_product": tagged_product,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_posts.insert_one(post)
    return {k: v for k, v in post.items() if k != "_id"}


@router.get("/posts")
async def list_posts(skip: int = 0, limit: int = 30):
    """List public posts ordered by newest first."""
    posts = await db.user_posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"posts": posts, "total": len(posts), "has_more": len(posts) == limit}


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    """Get a single post by id."""
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/posts/{post_id}/likes")
async def get_post_likes(post_id: str, skip: int = 0, limit: int = 50):
    """Get users who liked a post."""
    likes = await db.post_likes.find({"post_id": post_id}, {"_id": 0, "user_id": 1, "created_at": 1}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"likes": likes}


@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: User = Depends(get_current_user)):
    existing = await db.post_likes.find_one({"post_id": post_id, "user_id": user.user_id})
    if existing:
        await db.post_likes.delete_one({"post_id": post_id, "user_id": user.user_id})
        await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.post_likes.insert_one({"post_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": 1}})
    return {"liked": True}


VALID_EMOJIS = ["heart", "laugh", "wow", "clap", "fire"]

@router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, request: Request, user: User = Depends(get_current_user)):
    """Toggle an emoji reaction on a post."""
    body = await request.json()
    emoji = body.get("emoji", "").strip()
    if emoji not in VALID_EMOJIS:
        raise HTTPException(status_code=400, detail=f"Invalid emoji. Use one of: {VALID_EMOJIS}")

    existing = await db.post_reactions.find_one(
        {"post_id": post_id, "user_id": user.user_id, "emoji": emoji}
    )
    if existing:
        await db.post_reactions.delete_one({"_id": existing["_id"]})
        return {"reacted": False, "emoji": emoji}

    # Remove any other reaction by this user on this post (one reaction per user)
    await db.post_reactions.delete_many({"post_id": post_id, "user_id": user.user_id})
    await db.post_reactions.insert_one({
        "post_id": post_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "emoji": emoji,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"reacted": True, "emoji": emoji}


@router.get("/posts/{post_id}/reactions")
async def get_post_reactions(post_id: str):
    """Get reaction counts and list for a post."""
    pipeline = [
        {"$match": {"post_id": post_id}},
        {"$group": {"_id": "$emoji", "count": {"$sum": 1}, "users": {"$push": "$user_name"}}},
    ]
    results = await db.post_reactions.aggregate(pipeline).to_list(10)
    counts = {r["_id"]: {"count": r["count"], "users": r["users"][:5]} for r in results}
    return counts


@router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, skip: int = 0, limit: int = 20):
    comments = await db.post_comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return comments


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:10]}",
        "post_id": post_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "text": text[:500],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.post_comments.insert_one(comment)
    await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})
    return {k: v for k, v in comment.items() if k != "_id"}


@router.put("/comments/{comment_id}")
async def edit_comment(comment_id: str, request: Request, user: User = Depends(get_current_user)):
    """Edit own comment."""
    comment = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your comment")
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text required")
    await db.post_comments.update_one({"comment_id": comment_id}, {"$set": {"text": text[:500], "edited_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "updated"}

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: User = Depends(get_current_user)):
    """Delete own comment."""
    comment = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your comment")
    await db.post_comments.delete_one({"comment_id": comment_id})
    await db.user_posts.update_one({"post_id": comment["post_id"]}, {"$inc": {"comments_count": -1}})
    return {"status": "deleted"}

@router.put("/users/me/username")
async def update_username(request: Request, user: User = Depends(get_current_user)):
    """Update username/ID."""
    body = await request.json()
    username = body.get("username", "").strip().lower().replace(" ", "_")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    existing = await db.users.find_one({"username": username, "user_id": {"$ne": user.user_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"username": username}})
    return {"status": "ok", "username": username}

@router.delete("/users/me/account")
async def delete_own_account(request: Request, user: User = Depends(get_current_user)):
    """Delete own account completely — zero residue."""
    body = await request.json()
    password = body.get("password", "")
    
    # Verify password
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 1})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    from services.auth_helpers import verify_password
    if not verify_password(password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    uid = user.user_id
    # Delete ALL user data (zero residue)
    await db.users.delete_one({"user_id": uid})
    await db.user_sessions.delete_many({"user_id": uid})
    await db.user_follows.delete_many({"$or": [{"follower_id": uid}, {"following_id": uid}]})
    await db.user_posts.delete_many({"user_id": uid})
    await db.post_likes.delete_many({"user_id": uid})
    await db.post_comments.delete_many({"user_id": uid})
    await db.post_bookmarks.delete_many({"user_id": uid})
    await db.cart_items.delete_many({"user_id": uid})
    await db.cart_discounts.delete_many({"user_id": uid})
    await db.social_events.delete_many({"user_id": uid})
    await db.internal_messages.delete_many({"sender_id": uid})
    await db.internal_conversations.delete_many({"participants.user_id": uid})
    await db.ai_profiles.delete_many({"user_id": uid})
    await db.notifications.delete_many({"user_id": uid})
    await db.store_followers.delete_many({"user_id": uid})
    await db.customer_influencer_attribution.delete_many({"customer_id": uid})
    await db.scheduled_payouts.delete_many({"influencer_id": uid})
    
    # If seller, delete products and store
    await db.products.delete_many({"producer_id": uid})
    await db.store_profiles.delete_many({"producer_id": uid})
    await db.certificates.delete_many({"seller_id": uid})
    
    # Audit log
    await db.audit_log.insert_one({
        "action": "SELF_DELETE",
        "actor": {"user_id": uid, "role": user.role},
        "target": {"type": "user", "id": uid},
        "severity": "critical",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"status": "deleted", "message": "Account deleted permanently"}



@router.post("/posts/{post_id}/bookmark")
async def toggle_bookmark(post_id: str, user: User = Depends(get_current_user)):
    existing = await db.post_bookmarks.find_one({"post_id": post_id, "user_id": user.user_id})
    if existing:
        await db.post_bookmarks.delete_one({"post_id": post_id, "user_id": user.user_id})
        return {"bookmarked": False}
    await db.post_bookmarks.insert_one({"post_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"bookmarked": True}


@router.post("/posts/{post_id}/save")
async def toggle_save_alias(post_id: str, user: User = Depends(get_current_user)):
    """
    Backward-compatible alias used by some frontend clients.
    Behavior matches /posts/{post_id}/bookmark.
    """
    return await toggle_bookmark(post_id, user)


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: User = Depends(get_current_user)):
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.user_posts.delete_one({"post_id": post_id})
    await db.post_likes.delete_many({"post_id": post_id})
    await db.post_comments.delete_many({"post_id": post_id})
    await db.post_bookmarks.delete_many({"post_id": post_id})
    await db.social_events.delete_many({"post_id": post_id})
    
    # Audit log
    await db.audit_log.insert_one({
        "action": "POST_DELETE",
        "actor": {"user_id": user.user_id, "role": user.role},
        "target": {"type": "post", "id": post_id, "author": post["user_id"]},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "deleted"}


# ── Feed ──────────────────────────────────────────────────────

@router.get("/feed")
async def get_social_feed(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    country: Optional[str] = None,
    scope: str = "hybrid",
):
    """
    Hybrid feed: scored by conversion potential, filtered by country availability.
    Score = (product_sales * 3) + (comments * 2) + (likes * 1) + boosts
    """
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    base_query = {}
    feed_scope = (scope or "hybrid").lower()

    # Determine user's market country
    user_country = country
    if not user_country and current_user:
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "locale": 1, "country": 1})
        user_country = (user_doc or {}).get("locale", {}).get("country") or (user_doc or {}).get("country") or "ES"
    if not user_country:
        user_country = "ES"

    if current_user:
        follows = await db.user_follows.find({"follower_id": current_user.user_id}, {"_id": 0, "following_id": 1}).to_list(1000)
        following_ids = set(f["following_id"] for f in follows)
    else:
        following_ids = set()

    try:
        posts_cursor = db.user_posts.find(base_query, {"_id": 0}).sort("created_at", -1).limit(200)
        all_posts = await posts_cursor.to_list(200)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Mongo unavailable for /feed, fallback to PostgreSQL: {exc}")
        return await _fallback_feed_from_postgres(skip=skip, limit=limit)

    # "following" scope returns only content from followed profiles (plus own posts),
    # ordered by publish time. This keeps Home feed aligned with social expectations.
    if feed_scope == "following" and current_user:
        allowed_authors = set(following_ids)
        allowed_authors.add(current_user.user_id)
        all_posts = [p for p in all_posts if p.get("user_id") in allowed_authors]
        all_posts.sort(key=lambda p: p.get("created_at") or "", reverse=True)

    # Batch load product availability for tagged products
    product_ids = set(p.get("tagged_product", {}).get("product_id") for p in all_posts if p.get("tagged_product"))
    product_ids.discard(None)

    product_availability = {}
    if product_ids:
        prods = await db.products.find(
            {"product_id": {"$in": list(product_ids)}},
            {"_id": 0, "product_id": 1, "inventory_by_country": 1}
        ).to_list(500)
        for p in prods:
            inv = p.get("inventory_by_country", [])
            market = next((m for m in inv if m["country_code"] == user_country and m.get("active") and m.get("stock", 0) > 0), None)
            product_availability[p["product_id"]] = market is not None

    sales_counts = {}
    if product_ids:
        sales_pipeline = [
            {"$match": {"status": {"$in": ["paid", "confirmed", "shipped", "delivered"]}}},
            {"$unwind": "$line_items"},
            {"$match": {"line_items.product_id": {"$in": list(product_ids)}}},
            {"$group": {"_id": "$line_items.product_id", "sales": {"$sum": 1}}}
        ]
        sales_data = await db.orders.aggregate(sales_pipeline).to_list(500)
        sales_counts = {s["_id"]: s["sales"] for s in sales_data}

    if feed_scope == "following" and current_user:
        page_posts = []
        for post in all_posts[skip:skip + limit]:
            product = post.get("tagged_product")
            is_available = True
            if product:
                pid = product.get("product_id")
                is_available = product_availability.get(pid, True)
            page_posts.append((post, is_available))
        total = len(all_posts)
    else:
        scored_posts = []
        for post in all_posts:
            likes = post.get("likes_count", 0)
            comments = post.get("comments_count", 0)
            product_sales = 0
            product = post.get("tagged_product")
            is_available = True
            if product:
                pid = product.get("product_id")
                product_sales = sales_counts.get(pid, 0)
                is_available = product_availability.get(pid, True)
            score = (product_sales * 3) + (comments * 2) + (likes * 1)
            if product:
                score += 5 if is_available else -10  # Penalize unavailable products
            if feed_scope != "global" and current_user and post.get("user_id") in following_ids:
                score += 3
            try:
                age_hours = (datetime.now(timezone.utc) - datetime.fromisoformat(post.get("created_at", "").replace("Z", "+00:00"))).total_seconds() / 3600
                if age_hours < 24:
                    score += 4
                elif age_hours < 72:
                    score += 2
            except:
                pass
            scored_posts.append((score, post, is_available))

        scored_posts.sort(key=lambda x: x[0], reverse=True)
        page_posts = [(p, avail) for _, p, avail in scored_posts[skip:skip + limit]]
        total = len(scored_posts)

    enriched = []
    user_cache = {}
    for post, post_available in page_posts:
        uid = post.get("user_id", "")
        if uid not in user_cache:
            u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1, "profile_image": 1, "role": 1, "country": 1})
            user_cache[uid] = u or {}
        ui = user_cache[uid]
        tagged = post.get("tagged_product")
        if tagged and tagged.get("product_id"):
            live = await db.products.find_one({"product_id": tagged["product_id"]}, {"_id": 0, "price": 1, "stock": 1, "images": 1, "name": 1, "track_stock": 1})
            if live:
                tagged["price"] = live.get("price", tagged.get("price", 0))
                tagged["stock"] = live.get("stock", 0)
                tagged["in_stock"] = live.get("stock", 0) > 0 if live.get("track_stock", True) else True
                tagged["image"] = (live.get("images") or [tagged.get("image")])[0]
                tagged["name"] = live.get("name", tagged.get("name", ""))
            rev_agg = await db.reviews.aggregate([
                {"$match": {"product_id": tagged["product_id"], "visible": True}},
                {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
            ]).to_list(1)
            if rev_agg:
                tagged["avg_rating"] = round(rev_agg[0]["avg_rating"], 1)
                tagged["review_count"] = rev_agg[0]["count"]
        is_liked = is_bookmarked = False
        if current_user:
            is_liked = await db.post_likes.find_one({"post_id": post["post_id"], "user_id": current_user.user_id}) is not None
            is_bookmarked = await db.post_bookmarks.find_one({"post_id": post["post_id"], "user_id": current_user.user_id}) is not None
        enriched.append({
            **post,
            "user_name": ui.get("name", post.get("user_name", "Usuario")),
            "user_profile_image": ui.get("profile_image"),
            "user_role": ui.get("role", "customer"),
            "user_country": ui.get("country"),
            "is_liked": is_liked,
            "is_bookmarked": is_bookmarked,
            "product_available_in_country": post_available,
        })

    return {"posts": enriched, "total": total, "has_more": (skip + limit) < total}


@router.get("/feed/trending")
async def get_trending_posts(request: Request, limit: int = 5):
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": seven_days_ago}}},
        {"$addFields": {"engagement": {"$add": [{"$ifNull": ["$likes_count", 0]}, {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 2]}]}}},
        {"$sort": {"engagement": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]
    try:
        posts = await db.user_posts.aggregate(pipeline).to_list(limit)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Mongo unavailable for /feed/trending, fallback to PostgreSQL: {exc}")
        return await _fallback_trending_from_postgres(limit=limit)
    enriched = []
    user_cache = {}
    for post in posts:
        uid = post.get("user_id", "")
        if uid not in user_cache:
            u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1, "profile_image": 1, "role": 1})
            user_cache[uid] = u or {}
        ui = user_cache[uid]
        is_liked = is_bookmarked = False
        if current_user:
            is_liked = await db.post_likes.find_one({"post_id": post["post_id"], "user_id": current_user.user_id}) is not None
            is_bookmarked = await db.post_bookmarks.find_one({"post_id": post["post_id"], "user_id": current_user.user_id}) is not None
        enriched.append({**post, "user_name": ui.get("name", "Usuario"), "user_profile_image": ui.get("profile_image"), "user_role": ui.get("role", "customer"), "is_liked": is_liked, "is_bookmarked": is_bookmarked})
    return {"posts": enriched}


@router.get("/post-products/search")
async def search_products_for_tagging(q: str = "", limit: int = 5, user: User = Depends(get_current_user)):
    query = {"status": "approved"}
    if user.role in {"producer", "importer"}:
        query["producer_id"] = user.user_id
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    products = await db.products.find(query, {"_id": 0, "product_id": 1, "name": 1, "price": 1, "currency": 1, "images": 1}).limit(limit).to_list(limit)
    return [{"product_id": p["product_id"], "name": p.get("name", ""), "price": p.get("price", 0), "currency": p.get("currency", "EUR"), "image": p.get("images", [None])[0]} for p in products]


# ── Discover ──────────────────────────────────────────────────

@router.get("/discover/profiles")
async def discover_profiles(request: Request, role: str = None, search: str = None, skip: int = 0, limit: int = 30):
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    query = {}
    if role and role != "all":
        query["role"] = role
    else:
        query["role"] = {"$in": ["customer", "producer", "importer", "influencer"]}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    try:
        users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.users.count_documents(query)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Mongo unavailable for /discover/profiles, fallback to PostgreSQL: {exc}")
        return await _fallback_discover_from_postgres(role=role, search=search, skip=skip, limit=limit)
    profiles = []
    for u in users:
        uid = u.get("user_id", "")
        fc = await db.user_follows.count_documents({"following_id": uid})
        pc = await db.user_posts.count_documents({"user_id": uid})
        is_following = False
        if current_user:
            is_following = await db.user_follows.find_one({"follower_id": current_user.user_id, "following_id": uid}) is not None
        extra = {}
        if u.get("role") == "influencer":
            inf = await db.influencers.find_one({"email": u.get("email", "").lower()}, {"_id": 0, "niche": 1, "followers": 1})
            if inf:
                extra = {"niche": inf.get("niche"), "social_followers": inf.get("followers")}
        elif u.get("role") in {"producer", "importer"}:
            store = await db.stores.find_one({"user_id": uid}, {"_id": 0, "store_name": 1, "location": 1, "store_slug": 1})
            if store:
                extra = {"store_name": store.get("store_name"), "store_location": store.get("location"), "store_slug": store.get("store_slug")}
        profiles.append({"user_id": uid, "name": u.get("name", "Usuario"), "profile_image": u.get("profile_image"), "bio": u.get("bio", ""), "role": u.get("role"), "followers_count": fc, "posts_count": pc, "is_following": is_following, "created_at": u.get("created_at"), **extra})
    return {"profiles": profiles, "total": total}


# ── Profile Update ────────────────────────────────────────────

@router.post("/users/update-profile")
async def update_user_profile_data(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    update_fields = {}
    if "bio" in body:
        update_fields["bio"] = body["bio"][:300]
    if "profile_image" in body:
        update_fields["profile_image"] = body["profile_image"]
    if "name" in body:
        update_fields["name"] = body["name"][:50]
    if update_fields:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_fields})
    return {"status": "ok"}


@router.post("/users/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size cannot exceed 5MB")
    result = await cloudinary_upload(contents, folder="avatars", filename=f"avatar_{user.user_id}")
    image_url = result["url"]
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"profile_image": image_url}})
    return {"image_url": image_url}



# ── Hispalostories (24h ephemeral stories) ────────────────────

@router.post("/stories")
async def create_story(
    file: UploadFile = File(...),
    caption: str = Form(""),
    user: User = Depends(get_current_user)
):
    """Upload a story that auto-expires after 24h."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size cannot exceed 10MB")
    result = await cloudinary_upload(contents, folder="stories", filename=f"story_{uuid.uuid4().hex[:8]}")
    image_url = result["url"]

    story_id = f"story_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    story = {
        "story_id": story_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "image_url": image_url,
        "caption": caption[:200] if caption else "",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "views": [],
    }
    await db.hispalostories.insert_one(story)
    return {k: v for k, v in story.items() if k != "_id"}


@router.get("/stories")
async def get_stories_feed(request: Request):
    """Get active stories grouped by user (not expired)."""
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    now = datetime.now(timezone.utc).isoformat()

    # Get all non-expired stories
    try:
        active_stories = await db.hispalostories.find(
            {"expires_at": {"$gt": now}},
            {"_id": 0, "views": 0}
        ).sort("created_at", -1).to_list(200)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Mongo unavailable for /stories, returning empty list: {exc}")
        return []

    # Group by user
    user_stories = {}
    for s in active_stories:
        uid = s["user_id"]
        if uid not in user_stories:
            user_stories[uid] = []
        user_stories[uid].append(s)

    # Enrich with user info
    result = []
    for uid, stories in user_stories.items():
        u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1, "profile_image": 1, "role": 1})
        if not u:
            continue
        is_own = current_user and current_user.user_id == uid
        result.append({
            "user_id": uid,
            "user_name": u.get("name", ""),
            "profile_image": u.get("profile_image"),
            "role": u.get("role", "customer"),
            "is_own": is_own,
            "stories": stories,
        })

    # Put own stories first
    if current_user:
        result.sort(key=lambda x: (not x["is_own"], x["stories"][0]["created_at"]), reverse=False)

    return result


@router.get("/stories/mine")
async def get_my_stories(user: User = Depends(get_current_user)):
    """Get current user's active stories."""
    now = datetime.now(timezone.utc).isoformat()
    stories = await db.hispalostories.find(
        {"user_id": user.user_id, "expires_at": {"$gt": now}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    # Strip views detail, just count
    for s in stories:
        s["view_count"] = len(s.get("views", []))
        s.pop("views", None)
    return stories


@router.post("/stories/{story_id}/view")
async def view_story(story_id: str, request: Request):
    """Mark a story as viewed."""
    current_user = await get_optional_user(request)
    if not current_user:
        return {"status": "ok"}
    await db.hispalostories.update_one(
        {"story_id": story_id, "views": {"$ne": current_user.user_id}},
        {"$push": {"views": current_user.user_id}}
    )
    return {"status": "ok"}


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str, user: User = Depends(get_current_user)):
    """Delete own story."""
    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "user_id": 1})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.hispalostories.delete_one({"story_id": story_id})
    return {"status": "deleted"}
