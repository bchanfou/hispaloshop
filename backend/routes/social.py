"""
Social routes: user profiles, posts, feed, comments, likes, bookmarks, discover, avatars.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Query
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging
import json
import re
import cloudinary

try:
    from sqlalchemy import select, desc
except Exception:  # Optional while the Mongo stack remains the active runtime.
    select = desc = None

from core.database import db
from core.models import User
from core.auth import get_current_user, get_optional_user
from config import normalize_influencer_tier
from services.cloudinary_storage import upload_image as cloudinary_upload, upload_video as cloudinary_upload_video
from services.video_service import VideoService
# NOTE: PostgreSQL fallback disabled - using MongoDB only for MVP
# from database import AsyncSessionLocal
# from models import Post as PgPost, User as PgUser

logger = logging.getLogger(__name__)
router = APIRouter()


def _public_product_filter() -> dict:
    return {
        "$or": [
            {"status": "active"},
            {"approved": True},
            {"status": "approved"},
        ]
    }


def _normalize_tagged_products(raw_value) -> List[Dict[str, object]]:
    if not raw_value:
        return []

    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError:
            return []
    elif isinstance(raw_value, list):
        parsed = raw_value
    else:
        return []

    normalized = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        product_id = (item.get("product_id") or item.get("productId") or item.get("id") or "").strip()
        if not product_id:
            continue
        normalized.append(
            {
                "product_id": product_id,
                "x": float(item.get("x", item.get("position_x", 50)) or 50),
                "y": float(item.get("y", item.get("position_y", 50)) or 50),
            }
        )
    return normalized[:5]


async def _hydrate_tagged_products(tag_refs: List[Dict[str, object]]) -> List[Dict[str, object]]:
    product_ids = [item["product_id"] for item in tag_refs if item.get("product_id")]
    if not product_ids:
        return []

    products = await db.products.find(
        {"product_id": {"$in": product_ids}},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "currency": 1, "images": 1, "producer_id": 1, "store_id": 1},
    ).to_list(len(product_ids))
    product_map = {item["product_id"]: item for item in products}

    hydrated = []
    for ref in tag_refs:
        product = product_map.get(ref["product_id"])
        if not product:
            continue
        hydrated.append(
            {
                "product_id": product["product_id"],
                "id": product["product_id"],
                "name": product.get("name", ""),
                "price": product.get("price", 0),
                "currency": product.get("currency", "EUR"),
                "image": (product.get("images") or [None])[0],
                "producer_id": product.get("producer_id"),
                "store_id": product.get("store_id"),
                "position": {
                    "x": max(4, min(96, float(ref.get("x", 50) or 50))),
                    "y": max(4, min(96, float(ref.get("y", 50) or 50))),
                },
            }
        )
    return hydrated


async def _record_intelligence_signal(event_type: str, payload: Dict[str, object], user_id: Optional[str] = None):
    signal = {
        "signal_id": f"sig_{uuid.uuid4().hex[:14]}",
        "event_type": event_type,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    try:
        await db.intelligence_signals.insert_one(signal)
    except Exception as exc:
        logger.warning("[INTELLIGENCE] signal write failed: %s", exc)


def _normalize_post_media(post: Dict[str, object]) -> Dict[str, object]:
    media = post.get("media") or []
    if not media and post.get("image_url"):
        media = [{"url": post.get("image_url"), "type": "image", "order": 0, "ratio": "1:1"}]
    post["media"] = media
    post["image_url"] = (media[0] or {}).get("url") if media else post.get("image_url")
    if len(media) > 1:
        post["type"] = "carousel"
        post["post_type"] = "carousel"
    else:
        post["type"] = post.get("type") or "post"
        post["post_type"] = post.get("post_type") or "post"
    return post


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_bool(value: object, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    return default


def _extract_keywords(*values: object) -> List[str]:
    terms: List[str] = []
    for value in values:
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    terms.extend(re.findall(r"[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}", item.lower()))
        elif isinstance(value, str):
            terms.extend(re.findall(r"[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}", value.lower()))
    seen = set()
    deduped = []
    for term in terms:
        if term not in seen:
            seen.add(term)
            deduped.append(term)
    return deduped[:12]


async def _get_contextual_products(*, product_ids: Optional[List[str]] = None, keywords: Optional[List[str]] = None, limit: int = 5):
    direct_ids = [pid for pid in (product_ids or []) if pid]
    if direct_ids:
        direct_products = await db.products.find(
            {"product_id": {"$in": direct_ids}, "$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]},
            {"_id": 0},
        ).to_list(limit)
        if direct_products:
            return direct_products[:limit]

    query_parts = []
    for keyword in (keywords or []):
        query_parts.append({"name": {"$regex": re.escape(keyword), "$options": "i"}})
        query_parts.append({"description": {"$regex": re.escape(keyword), "$options": "i"}})
        query_parts.append({"ingredients": {"$regex": re.escape(keyword), "$options": "i"}})

    if not query_parts:
        return await db.products.find(
            {"$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]},
            {"_id": 0},
        ).sort("units_sold", -1).limit(limit).to_list(limit)

    return await db.products.find(
        {
            "$and": [
                {"$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]},
                {"$or": query_parts},
            ]
        },
        {"_id": 0},
    ).limit(limit).to_list(limit)


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
                "duration_seconds": reel.get("duration_seconds", 0),
                "cover_frame_seconds": reel.get("cover_frame_seconds", 0),
                "trim_start_seconds": reel.get("trim_start_seconds", 0),
                "trim_end_seconds": reel.get("trim_end_seconds", 0),
                "playback_rate": reel.get("playback_rate", 1),
                "muted": reel.get("muted", False),
                "slow_motion_enabled": reel.get("slow_motion_enabled", False),
                "slow_motion_start": reel.get("slow_motion_start", 0),
                "slow_motion_end": reel.get("slow_motion_end", 0),
                "reel_settings": reel.get("reel_settings") or {},
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
                "tagged_product": reel.get("tagged_product"),
                "tagged_products": reel.get("tagged_products") or ([reel["tagged_product"]] if reel.get("tagged_product") else []),
            }
        )

    return {"items": items, "has_more": len(items) == limit}


@router.post("/reels")
async def create_reel(
    file: UploadFile = File(...),
    caption: str = Form(""),
    location: str = Form(""),
    cover_frame_seconds: float = Form(0),
    trim_start_seconds: float = Form(0),
    trim_end_seconds: float = Form(0),
    playback_rate: float = Form(1),
    muted: str = Form("false"),
    slow_motion_enabled: str = Form("false"),
    slow_motion_start: float = Form(0),
    slow_motion_end: float = Form(0),
    product_id: str = Form(""),
    tagged_products_json: str = Form(""),
    user: User = Depends(get_current_user)
):
    """Create a reel (short video). Uploads to Cloudinary."""
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de video")
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El video no puede superar 100MB")

    result = await cloudinary_upload_video(contents, folder="reels", filename=f"reel_{uuid.uuid4().hex[:8]}")
    original_video_url = result["url"]
    video_public_id = result.get("public_id", "")
    duration_seconds = _safe_float(result.get("duration"), 0.0)

    safe_trim_start = max(0.0, _safe_float(trim_start_seconds, 0.0))
    requested_trim_end = _safe_float(trim_end_seconds, 0.0)
    if duration_seconds > 0:
        safe_trim_end = min(duration_seconds, requested_trim_end) if requested_trim_end > 0 else duration_seconds
    else:
        safe_trim_end = requested_trim_end
    if safe_trim_end > 0 and safe_trim_end <= safe_trim_start:
        safe_trim_end = safe_trim_start + 0.1

    safe_cover_frame = max(0.0, _safe_float(cover_frame_seconds, 0.0))
    if duration_seconds > 0:
        safe_cover_frame = min(safe_cover_frame, duration_seconds)

    safe_playback_rate = max(0.5, min(2.0, _safe_float(playback_rate, 1.0)))
    is_muted = _safe_bool(muted, False)
    has_slow_motion = _safe_bool(slow_motion_enabled, False)
    safe_slow_motion_start = max(safe_trim_start, _safe_float(slow_motion_start, safe_trim_start))
    safe_slow_motion_end = _safe_float(slow_motion_end, safe_trim_end or duration_seconds or safe_slow_motion_start)
    if safe_trim_end > 0:
        safe_slow_motion_end = min(safe_slow_motion_end, safe_trim_end)
    if safe_slow_motion_end <= safe_slow_motion_start:
        safe_slow_motion_end = safe_slow_motion_start

    video_url = original_video_url
    if video_public_id and (safe_trim_start > 0 or safe_trim_end > 0 or is_muted):
        transformation = []
        trim_step: Dict[str, object] = {}
        if safe_trim_start > 0:
            trim_step["start_offset"] = round(safe_trim_start, 2)
        if safe_trim_end > 0:
            trim_step["end_offset"] = round(safe_trim_end, 2)
        if trim_step:
            transformation.append(trim_step)
        if is_muted:
            transformation.append({"effect": "volume:-100"})
        try:
            video_url = cloudinary.CloudinaryVideo(video_public_id).build_url(
                resource_type="video",
                secure=True,
                transformation=transformation,
            )
        except Exception:
            video_url = original_video_url

    thumbnail_url = result.get("thumbnail") or original_video_url
    if video_public_id:
        try:
            thumbnail_url = await VideoService.generate_thumbnail_at_time(video_public_id, safe_cover_frame)
        except Exception:
            thumbnail_url = result.get("thumbnail") or original_video_url

    requested_tags = _normalize_tagged_products(tagged_products_json)
    if product_id and product_id.strip() and not requested_tags:
        requested_tags = [{"product_id": product_id.strip(), "x": 50, "y": 62}]
    tagged_products = await _hydrate_tagged_products(requested_tags)
    tagged_product = tagged_products[0] if tagged_products else None

    reel_id = f"reel_{uuid.uuid4().hex[:12]}"
    reel = {
        "reel_id": reel_id,
        "id": reel_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "video_url": video_url,
        "original_video_url": original_video_url,
        "thumbnail_url": thumbnail_url,
        "caption": caption[:500] if caption else "",
        "location": location[:120] if location else "",
        "duration_seconds": duration_seconds,
        "cover_frame_seconds": safe_cover_frame,
        "trim_start_seconds": safe_trim_start,
        "trim_end_seconds": safe_trim_end,
        "playback_rate": safe_playback_rate,
        "muted": is_muted,
        "slow_motion_enabled": has_slow_motion,
        "slow_motion_start": safe_slow_motion_start,
        "slow_motion_end": safe_slow_motion_end,
        "reel_settings": {
            "cover_frame_seconds": safe_cover_frame,
            "trim_start_seconds": safe_trim_start,
            "trim_end_seconds": safe_trim_end,
            "playback_rate": safe_playback_rate,
            "muted": is_muted,
            "slow_motion_enabled": has_slow_motion,
            "slow_motion_start": safe_slow_motion_start,
            "slow_motion_end": safe_slow_motion_end,
        },
        "media": [
            {
                "url": video_url,
                "original_url": original_video_url,
                "thumbnail_url": thumbnail_url,
                "type": "video",
                "duration_seconds": duration_seconds,
                "order": 0,
            }
        ],
        "tagged_product": tagged_product,
        "tagged_products": tagged_products,
        "likes_count": 0,
        "comments_count": 0,
        "views_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reels.insert_one(reel)
    for tag in tagged_products:
        await _record_intelligence_signal(
            "content_product_tagged",
            {
                "content_type": "reel",
                "content_id": reel_id,
                "product_id": tag.get("product_id"),
                "producer_id": tag.get("producer_id"),
                "keywords": _extract_keywords(caption, tag.get("name")),
            },
            user.user_id,
        )
    return {k: v for k, v in reel.items() if k != "_id"}


@router.post("/reels/{reel_id}/view")
async def view_reel(reel_id: str, request: Request):
    """Increment view count on a reel."""
    current_user = await get_optional_user(request)
    await db.reels.update_one({"$or": [{"reel_id": reel_id}, {"id": reel_id}]}, {"$inc": {"views_count": 1}})
    await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "view"}, current_user.user_id if current_user else None)
    return {"status": "ok"}


@router.post("/reels/{reel_id}/like")
async def like_reel(reel_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a reel."""
    filter_q = {"$or": [{"reel_id": reel_id}, {"id": reel_id}]}
    existing = await db.reel_likes.find_one({"reel_id": reel_id, "user_id": user.user_id})
    if existing:
        await db.reel_likes.delete_one({"reel_id": reel_id, "user_id": user.user_id})
        await db.reels.update_one(filter_q, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.reel_likes.insert_one({
        "reel_id": reel_id, "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.reels.update_one(filter_q, {"$inc": {"likes_count": 1}})
    await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "like"}, user.user_id)
    return {"liked": True}


@router.get("/reels/{reel_id}/comments")
async def get_reel_comments(reel_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Get reel comments (latest first)."""
    comments = await db.reel_comments.find(
        {"reel_id": reel_id},
        {"_id": 0},
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    if current_user and comments:
        comment_ids = [c.get("comment_id") for c in comments if c.get("comment_id")]
        if comment_ids:
            liked_rows = await db.reel_comment_likes.find(
                {"comment_id": {"$in": comment_ids}, "user_id": current_user.user_id},
                {"_id": 0, "comment_id": 1},
            ).to_list(len(comment_ids))
            liked_set = {row.get("comment_id") for row in liked_rows}
            for comment in comments:
                comment["is_liked"] = comment.get("comment_id") in liked_set
    return comments


@router.post("/reels/{reel_id}/comments")
async def add_reel_comment(reel_id: str, request: Request, user: User = Depends(get_current_user)):
    """Add a comment to a reel."""
    body = await request.json()
    text = (body.get("text") or body.get("message") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text required")

    filter_q = {"$or": [{"reel_id": reel_id}, {"id": reel_id}]}
    reel = await db.reels.find_one(filter_q, {"_id": 0, "reel_id": 1, "id": 1})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")

    comment_id = f"rcom_{uuid.uuid4().hex[:10]}"
    comment = {
        "comment_id": comment_id,
        "reel_id": reel.get("reel_id") or reel.get("id") or reel_id,
        "user_id": user.user_id,
        "user_name": user.get("name") if hasattr(user, "get") else getattr(user, "name", "Usuario"),
        "user_profile_image": user.get("profile_image") if hasattr(user, "get") else getattr(user, "profile_image", None),
        "text": text[:500],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes_count": 0,
        "replies": [],
    }
    await db.reel_comments.insert_one(comment)
    await db.reels.update_one(filter_q, {"$inc": {"comments_count": 1}})
    await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "comment"}, user.user_id)
    return {k: v for k, v in comment.items() if k != "_id"}


@router.post("/reels/{reel_id}/comments/{comment_id}/like")
async def like_reel_comment(reel_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a reel comment."""
    comment = await db.reel_comments.find_one({"comment_id": comment_id, "reel_id": reel_id}, {"_id": 0, "likes_count": 1})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing = await db.reel_comment_likes.find_one({"comment_id": comment_id, "user_id": user.user_id})
    if existing:
        await db.reel_comment_likes.delete_one({"comment_id": comment_id, "user_id": user.user_id})
        await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": -1}})
        liked = False
    else:
        await db.reel_comment_likes.insert_one({
            "comment_id": comment_id,
            "user_id": user.user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": 1}})
        liked = True

    updated = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
    return {"liked": liked, "likes_count": (updated or {}).get("likes_count", 0)}


@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, request: Request):
    """Get public user profile — enhanced with seller stats for producers."""
    projection = {"_id": 0, "password_hash": 0, "verification_code": 0}
    user = await db.users.find_one({"user_id": user_id}, projection)
    if not user:
        user = await db.users.find_one({"username": user_id}, projection)
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
            profile["tier"] = normalize_influencer_tier(inf.get("current_tier", "hercules"), inf.get("commission_rate"))

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
            {"producer_id": user_id, **_public_product_filter()},
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
    for post in posts:
        _normalize_post_media(post)
        tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
        post["tagged_products"] = tagged_products
        post["tagged_product"] = tagged_products[0] if tagged_products else None
    return posts


@router.get("/users/{user_id}/recipes")
async def get_user_recipes(user_id: str, skip: int = 0, limit: int = 50):
    """Recetas públicas de un usuario, filtradas en base de datos (no en cliente)."""
    recipes = await db.recipes.find(
        {"author_id": user_id, "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return recipes


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


@router.get("/users/{user_id}/followers")
async def get_user_followers(
    request: Request,
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = Query(None),
):
    """Lista paginada de seguidores de un usuario."""
    current_user = await get_optional_user(request)
    skip = (page - 1) * limit

    query = {"following_id": user_id}

    if search:
        matching = await db.users.find(
            {"$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
            ]},
            {"user_id": 1},
        ).to_list(200)
        matching_ids = [u["user_id"] for u in matching if "user_id" in u]
        if not matching_ids:
            return {"users": [], "total": 0, "page": page}
        query["follower_id"] = {"$in": matching_ids}

    total = await db.user_follows.count_documents(query)
    follows = (
        await db.user_follows.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    follower_ids = [f["follower_id"] for f in follows]

    if not follower_ids:
        return {"users": [], "total": total, "page": page}

    users_docs = await db.users.find(
        {"user_id": {"$in": follower_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "name": 1, "profile_image": 1, "verified": 1},
    ).to_list(limit)
    users_map = {u["user_id"]: u for u in users_docs}

    my_following_ids = set()
    if current_user:
        my_follows = await db.user_follows.find(
            {"follower_id": current_user.user_id, "following_id": {"$in": follower_ids}},
            {"following_id": 1},
        ).to_list(len(follower_ids))
        my_following_ids = {f["following_id"] for f in my_follows}

    result = []
    for fid in follower_ids:
        u = users_map.get(fid)
        if not u:
            continue
        result.append({
            "id": u["user_id"],
            "username": u.get("username", ""),
            "full_name": u.get("name", ""),
            "avatar_url": u.get("profile_image"),
            "is_verified": u.get("verified", False),
            "is_following": fid in my_following_ids,
        })

    return {"users": result, "total": total, "page": page}


@router.get("/users/{user_id}/following")
async def get_user_following(
    request: Request,
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = Query(None),
):
    """Lista paginada de usuarios que sigue un usuario."""
    current_user = await get_optional_user(request)
    skip = (page - 1) * limit

    query = {"follower_id": user_id}

    if search:
        matching = await db.users.find(
            {"$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
            ]},
            {"user_id": 1},
        ).to_list(200)
        matching_ids = [u["user_id"] for u in matching if "user_id" in u]
        if not matching_ids:
            return {"users": [], "total": 0, "page": page}
        query["following_id"] = {"$in": matching_ids}

    total = await db.user_follows.count_documents(query)
    follows = (
        await db.user_follows.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    following_ids = [f["following_id"] for f in follows]

    if not following_ids:
        return {"users": [], "total": total, "page": page}

    users_docs = await db.users.find(
        {"user_id": {"$in": following_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "name": 1, "profile_image": 1, "verified": 1},
    ).to_list(limit)
    users_map = {u["user_id"]: u for u in users_docs}

    my_following_ids = set()
    if current_user:
        my_follows = await db.user_follows.find(
            {"follower_id": current_user.user_id, "following_id": {"$in": following_ids}},
            {"following_id": 1},
        ).to_list(len(following_ids))
        my_following_ids = {f["following_id"] for f in my_follows}

    result = []
    for fid in following_ids:
        u = users_map.get(fid)
        if not u:
            continue
        result.append({
            "id": u["user_id"],
            "username": u.get("username", ""),
            "full_name": u.get("name", ""),
            "avatar_url": u.get("profile_image"),
            "is_verified": u.get("verified", False),
            "is_following": fid in my_following_ids,
        })

    return {"users": result, "total": total, "page": page}


# ── Posts ─────────────────────────────────────────────────────

@router.post("/posts")
async def create_post(
    request: Request,
    caption: str = Form(""),
    location: str = Form(""),
    product_id: str = Form(""),
    tagged_products_json: str = Form(""),
    post_type: str = Form("post"),
    file: UploadFile = File(None),
    files: List[UploadFile] = File(None),
    user: User = Depends(get_current_user)
):
    """Create a new post. Producers and influencers MUST tag a product."""
    requested_tags = _normalize_tagged_products(tagged_products_json)
    if product_id and product_id.strip() and not requested_tags:
        requested_tags = [{"product_id": product_id.strip(), "x": 50, "y": 62}]

    requires_product = user.role in ("producer", "importer", "influencer")
    if requires_product and not requested_tags:
        raise HTTPException(status_code=400, detail="Los vendedores e influencers deben vincular un producto a cada post")

    incoming_files = [upload for upload in (files or []) if upload and upload.filename]
    if not incoming_files and file and file.filename:
        incoming_files = [file]

    media = []
    for index, upload in enumerate(incoming_files):
        if not upload.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        contents = await upload.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size cannot exceed 10MB")
        result = await cloudinary_upload(contents, folder="posts", filename=f"post_{uuid.uuid4().hex[:8]}")
        media.append(
            {
                "url": result["url"],
                "type": "image",
                "order": index,
                "ratio": "1:1",
            }
        )

    image_url = (media[0] or {}).get("url")

    if not caption.strip() and not media:
        raise HTTPException(status_code=400, detail="Post must have text or an image")

    tagged_products = await _hydrate_tagged_products(requested_tags)
    tagged_product = tagged_products[0] if tagged_products else None

    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post = {
        "post_id": post_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "image_url": image_url,
        "media": media,
        "caption": caption,
        "location": location[:120] if location else "",
        "type": "carousel" if len(media) > 1 or post_type == "carousel" else "post",
        "post_type": "carousel" if len(media) > 1 or post_type == "carousel" else "post",
        "tagged_product": tagged_product,
        "tagged_products": tagged_products,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_posts.insert_one(post)
    for tag in tagged_products:
        await _record_intelligence_signal(
            "content_product_tagged",
            {
                "content_type": "post",
                "content_id": post_id,
                "product_id": tag.get("product_id"),
                "producer_id": tag.get("producer_id"),
                "keywords": _extract_keywords(caption, tag.get("name")),
            },
            user.user_id,
        )
    return _normalize_post_media({k: v for k, v in post.items() if k != "_id"})


@router.get("/posts")
async def list_posts(skip: int = 0, limit: int = 30):
    """List public posts ordered by newest first."""
    posts = await db.user_posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for post in posts:
        _normalize_post_media(post)
        tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
        post["tagged_products"] = tagged_products
        post["tagged_product"] = tagged_products[0] if tagged_products else None
    return {"posts": posts, "total": len(posts), "has_more": len(posts) == limit}


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    """Get a single post by id."""
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _normalize_post_media(post)
    tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
    post["tagged_products"] = tagged_products
    post["tagged_product"] = tagged_products[0] if tagged_products else None
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
    await _record_intelligence_signal("content_engagement", {"content_type": "post", "content_id": post_id, "action": "like"}, user.user_id)
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

@router.get("/users/by-username/{username}")
async def get_user_by_username(username: str):
    """Get public user by username — sanitized (no password_hash, no tokens)."""
    user = await db.users.find_one(
        {"username": username},
        {"_id": 0, "password_hash": 0, "verification_code": 0, "stripe_customer_id": 0, "stripe_connect_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/check-username/{username}")
async def check_username(username: str):
    """Check if a username is available."""
    clean = username.strip().lower().replace(" ", "_")
    if len(clean) < 3:
        return {"available": False, "reason": "too_short"}
    existing = await db.users.find_one({"username": clean}, {"_id": 0, "user_id": 1})
    return {"available": existing is None, "username": clean}


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
    await _record_intelligence_signal("recipe_save", {"content_type": "post", "content_id": post_id}, user.user_id)
    return {"bookmarked": True}


@router.post("/posts/{post_id}/save")
async def toggle_save_alias(post_id: str, user: User = Depends(get_current_user)):
    """
    Backward-compatible alias used by some frontend clients.
    Behavior matches /posts/{post_id}/bookmark.
    """
    return await toggle_bookmark(post_id, user)


@router.get("/users/me/saved-posts")
async def get_saved_posts(user: User = Depends(get_current_user), skip: int = 0, limit: int = 30):
    """Get saved/bookmarked posts for the current user."""
    bookmarks = await db.post_bookmarks.find(
        {"user_id": user.user_id}, {"_id": 0, "post_id": 1}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    post_ids = [b["post_id"] for b in bookmarks]
    if not post_ids:
        return []
    posts = await db.user_posts.find(
        {"post_id": {"$in": post_ids}}, {"_id": 0}
    ).to_list(limit)
    # Preserve bookmark order
    post_map = {p["post_id"]: p for p in posts}
    ordered = [post_map[pid] for pid in post_ids if pid in post_map]
    for post in ordered:
        _normalize_post_media(post)
    return ordered


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


# ── Autocomplete: hashtags + users ────────────────────────────

@router.get("/hashtags/search")
async def search_hashtags(q: str = Query("", min_length=1), limit: int = Query(6, ge=1, le=10)):
    """Hashtags que empiezan por q, ordenados por post_count descendente."""
    results = await db.hashtags.find(
        {"name": {"$regex": f"^{re.escape(q.lower())}", "$options": "i"}},
    ).sort("post_count", -1).limit(limit).to_list(limit)
    return [{"name": r.get("name", ""), "post_count": r.get("post_count", 0)} for r in results]


@router.get("/users/search")
async def search_users_autocomplete(q: str = Query("", min_length=1), limit: int = Query(6, ge=1, le=10)):
    """Usuarios cuyo username o nombre empieza por q."""
    results = await db.users.find(
        {"$or": [
            {"username": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
            {"name": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
        ]},
        {"_id": 0, "user_id": 1, "username": 1, "name": 1, "profile_image": 1, "verified": 1},
    ).limit(limit).to_list(limit)
    return [{
        "id": r.get("user_id", ""),
        "username": r.get("username", ""),
        "full_name": r.get("name", ""),
        "avatar_url": r.get("profile_image"),
        "is_verified": r.get("verified", False),
    } for r in results]


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
    location: str = Form(""),
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
        "location": location[:120] if location else "",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "views": [],
        "likes_count": 0,
        "replies_count": 0,
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


@router.post("/stories/{story_id}/like")
async def like_story(story_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a story."""
    existing = await db.story_likes.find_one({"story_id": story_id, "user_id": user.user_id})
    if existing:
        await db.story_likes.delete_one({"story_id": story_id, "user_id": user.user_id})
        await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"likes_count": -1}})
        liked = False
    else:
        await db.story_likes.insert_one({
            "story_id": story_id,
            "user_id": user.user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"likes_count": 1}})
        liked = True

    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "likes_count": 1})
    return {"liked": liked, "likes_count": (story or {}).get("likes_count", 0)}


@router.post("/stories/{story_id}/reply")
async def reply_story(story_id: str, request: Request, user: User = Depends(get_current_user)):
    """Reply to a story (stored for the owner)."""
    body = await request.json()
    message = (body.get("message") or body.get("text") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Reply message required")

    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "user_id": 1})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    reply = {
        "reply_id": f"srep_{uuid.uuid4().hex[:10]}",
        "story_id": story_id,
        "story_owner_id": story.get("user_id"),
        "user_id": user.user_id,
        "user_name": user.get("name") if hasattr(user, "get") else getattr(user, "name", "Usuario"),
        "user_profile_image": user.get("profile_image") if hasattr(user, "get") else getattr(user, "profile_image", None),
        "message": message[:500],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.story_replies.insert_one(reply)
    await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"replies_count": 1}})
    return {k: v for k, v in reply.items() if k != "_id"}


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


@router.get("/products/intelligence-search")
async def search_products_for_content(q: str = Query(default="", min_length=0), limit: int = Query(default=6, ge=1, le=12)):
    query = {"$or": [{"status": "active"}, {"approved": True}, {"status": "approved"}]}
    if q.strip():
        escaped = re.escape(q.strip())
        query = {
            "$and": [
                query,
                {
                    "$or": [
                        {"name": {"$regex": escaped, "$options": "i"}},
                        {"description": {"$regex": escaped, "$options": "i"}},
                        {"ingredients": {"$regex": escaped, "$options": "i"}},
                    ]
                },
            ]
        }

    products = await db.products.find(query, {"_id": 0}).sort("units_sold", -1).limit(limit).to_list(limit)
    return {
        "items": [
            {
                "id": product.get("product_id"),
                "product_id": product.get("product_id"),
                "name": product.get("name", ""),
                "price": product.get("price", 0),
                "currency": product.get("currency", "EUR"),
                "image": (product.get("images") or [None])[0],
                "producer_id": product.get("producer_id"),
            }
            for product in products
        ]
    }


@router.post("/intelligence/track")
async def track_intelligence_event(request: Request):
    current_user = await get_optional_user(request)
    body = await request.json()
    event_type = (body.get("event_type") or "").strip()
    if not event_type:
        raise HTTPException(status_code=400, detail="event_type is required")

    payload = {
        "content_type": body.get("content_type"),
        "content_id": body.get("content_id"),
        "product_id": body.get("product_id"),
        "producer_id": body.get("producer_id"),
        "meta": body.get("meta", {}),
    }
    await _record_intelligence_signal(event_type, payload, current_user.user_id if current_user else None)
    return {"status": "ok"}


@router.get("/intelligence/contextual-products")
async def get_contextual_product_suggestions(
    content_type: str = Query(...),
    content_id: str = Query(...),
    limit: int = Query(default=5, ge=1, le=8),
):
    doc = None
    product_ids: List[str] = []
    keywords: List[str] = []
    if content_type == "recipe":
        doc = await db.recipes.find_one({"recipe_id": content_id}, {"_id": 0})
        if doc:
            product_ids = [item.get("product_id") for item in doc.get("ingredients", []) if item.get("product_id")]
            ingredient_names = [item.get("name", "") for item in doc.get("ingredients", [])]
            keywords = _extract_keywords(doc.get("title"), doc.get("description"), ingredient_names)
    elif content_type == "reel":
        doc = await db.reels.find_one({"$or": [{"reel_id": content_id}, {"id": content_id}]}, {"_id": 0})
        if doc:
            product_ids = [item.get("product_id") for item in (doc.get("tagged_products") or []) if item.get("product_id")]
            keywords = _extract_keywords(doc.get("caption"))
    else:
        doc = await db.user_posts.find_one({"post_id": content_id}, {"_id": 0})
        if doc:
            product_ids = [item.get("product_id") for item in (doc.get("tagged_products") or []) if item.get("product_id")]
            keywords = _extract_keywords(doc.get("caption"))

    products = await _get_contextual_products(product_ids=product_ids, keywords=keywords, limit=limit)
    return {"items": products}


@router.get("/intelligence/discovered-products")
async def get_discovered_products(limit: int = Query(default=6, ge=1, le=12)):
    pipeline = [
        {"$match": {"event_type": "content_product_tagged", "product_id": {"$ne": None}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$product_id", "count": {"$sum": 1}, "last_seen": {"$first": "$created_at"}}},
        {"$sort": {"last_seen": -1, "count": -1}},
        {"$limit": limit},
    ]
    rows = await db.intelligence_signals.aggregate(pipeline).to_list(limit)
    product_ids = [row["_id"] for row in rows if row.get("_id")]
    products = await db.products.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(limit)
    product_map = {item["product_id"]: item for item in products}
    return {
        "items": [
            {
                **product_map[row["_id"]],
                "content_mentions": row.get("count", 0),
                "last_seen": row.get("last_seen"),
            }
            for row in rows
            if row.get("_id") in product_map
        ]
    }


@router.get("/intelligence/producer-demand")
async def get_producer_demand_signals(user: User = Depends(get_current_user)):
    if user.role not in ("producer", "importer"):
        raise HTTPException(status_code=403, detail="Not authorized")

    product_ids = await db.products.distinct("product_id", {"producer_id": user.user_id})
    if not product_ids:
        return {"trending_ingredients": [], "most_tagged_products": [], "content_driving_sales": []}

    tag_rows = await db.intelligence_signals.aggregate(
        [
            {"$match": {"product_id": {"$in": product_ids}, "event_type": "content_product_tagged"}},
            {"$group": {"_id": "$product_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
    ).to_list(5)

    click_rows = await db.intelligence_signals.aggregate(
        [
            {"$match": {"product_id": {"$in": product_ids}, "event_type": {"$in": ["product_click", "add_to_cart"]}}},
            {"$group": {"_id": {"content_id": "$content_id", "content_type": "$content_type"}, "score": {"$sum": 1}}},
            {"$sort": {"score": -1}},
            {"$limit": 5},
        ]
    ).to_list(5)

    ingredient_rows = await db.intelligence_signals.aggregate(
        [
            {"$match": {"producer_id": user.user_id, "event_type": "recipe_ingredient_match", "ingredient_name": {"$ne": None}}},
            {"$group": {"_id": "$ingredient_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
    ).to_list(5)

    products = await db.products.find({"product_id": {"$in": [row["_id"] for row in tag_rows]}}, {"_id": 0, "product_id": 1, "name": 1, "images": 1}).to_list(5)
    product_map = {item["product_id"]: item for item in products}

    return {
        "trending_ingredients": [{"name": row["_id"], "count": row["count"]} for row in ingredient_rows],
        "most_tagged_products": [
            {
                "product_id": row["_id"],
                "name": product_map.get(row["_id"], {}).get("name", "Producto"),
                "image": (product_map.get(row["_id"], {}).get("images") or [None])[0],
                "count": row["count"],
            }
            for row in tag_rows
        ],
        "content_driving_sales": [
            {
                "content_id": row["_id"].get("content_id"),
                "content_type": row["_id"].get("content_type"),
                "score": row.get("score", 0),
            }
            for row in click_rows
        ],
    }


@router.get("/intelligence/influencer-performance")
async def get_influencer_product_performance(user: User = Depends(get_current_user)):
    if user.role != "influencer":
        raise HTTPException(status_code=403, detail="Not authorized")

    content_ids = []
    posts = await db.user_posts.find({"user_id": user.user_id}, {"_id": 0, "post_id": 1, "tagged_products": 1}).limit(100).to_list(100)
    reels = await db.reels.find({"user_id": user.user_id}, {"_id": 0, "reel_id": 1, "id": 1, "tagged_products": 1}).limit(100).to_list(100)
    for post in posts:
        content_ids.append(("post", post.get("post_id")))
    for reel in reels:
        content_ids.append(("reel", reel.get("reel_id") or reel.get("id")))

    performance = []
    for content_type, content_id in content_ids:
        if not content_id:
            continue
        tag_count = await db.intelligence_signals.count_documents({"event_type": "content_product_tagged", "content_type": content_type, "content_id": content_id})
        clicks = await db.intelligence_signals.count_documents({"event_type": "product_click", "content_type": content_type, "content_id": content_id})
        sales = await db.intelligence_signals.count_documents({"event_type": "add_to_cart", "content_type": content_type, "content_id": content_id})
        views = 0
        if content_type == "reel":
            reel_doc = await db.reels.find_one({"$or": [{"reel_id": content_id}, {"id": content_id}]}, {"_id": 0, "views_count": 1, "caption": 1})
            views = reel_doc.get("views_count", 0) if reel_doc else 0
            title = (reel_doc or {}).get("caption") or "Reel"
        else:
            post_doc = await db.user_posts.find_one({"post_id": content_id}, {"_id": 0, "caption": 1, "likes_count": 1, "comments_count": 1})
            views = ((post_doc or {}).get("likes_count", 0) * 4) + ((post_doc or {}).get("comments_count", 0) * 6)
            title = (post_doc or {}).get("caption") or "Post"

        if not (tag_count or clicks or sales or views):
            continue
        performance.append({"content_id": content_id, "content_type": content_type, "title": title[:72], "views": views, "clicks": clicks, "sales": sales})

    performance.sort(key=lambda item: (item["sales"], item["clicks"], item["views"]), reverse=True)
    return {"items": performance[:5]}
