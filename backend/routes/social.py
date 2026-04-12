"""
Social routes: user profiles, posts, feed, comments, likes, bookmarks, discover, avatars.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Query, Body
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging
import json
import re
import asyncio
import importlib

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
from utils.images import extract_product_image
from core.sanitize import sanitize_text
from middleware.rate_limit import rate_limiter
from services.content_moderation import moderate_post_content
# NOTE: PostgreSQL fallback disabled - using MongoDB only for MVP
# from database import AsyncSessionLocal
# from models import Post as PgPost, User as PgUser

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Section 3.5b — synchronous AI pre-filter wiring
# Imports lazily to avoid circulars; degrades gracefully if unavailable.
# ─────────────────────────────────────────────────────────────────────────────

async def _premoderate(user, *, text=None, image_urls=None):
    """Run the section 3.5 AI pre-filter. Returns (decision, ai_summary).

    Raises HTTPException 403 if blocked. Caller publishes content normally
    on 'allow' and creates an auto-report on 'flag'.
    """
    try:
        from services.moderation_wiring import run_moderation_check
        return await run_moderation_check(user=user, text=text, image_urls=image_urls)
    except HTTPException:
        raise
    except Exception as exc:
        # Hard-fail safe: never break a publish because moderation is broken.
        logger.warning("[MOD_PRE] degraded fallback: %s", exc)
        return "allow", None


async def _post_publish_autoreport(content_type, content_id, content_author_id, country_code, ai_summary):
    if not ai_summary:
        return
    try:
        from services.moderation_wiring import insert_auto_report
        await insert_auto_report(
            content_type=content_type,
            content_id=str(content_id),
            content_author_id=content_author_id,
            content_country_code=country_code,
            ai_summary=ai_summary,
        )
    except Exception as exc:
        logger.warning("[MOD_PRE] auto-report insert failed: %s", exc)


async def _moderate_content_async(
    collection_name: str,
    doc_id_field: str,
    doc_id: str,
    caption: str,
    image_urls: list[str] | None = None,
):
    """Post-publish async moderation. If IA flags the content, mark it for review or hide it."""
    try:
        result = await moderate_post_content({
            "text": caption,
            "image_urls": image_urls or [],
            "tags": [],
        })
        action = result.get("action", "approve")
        if action in ("hide", "review"):
            collection = db[collection_name]
            update = {
                "moderation_status": action,
                "moderation_reason": result.get("reason"),
                "moderation_violation": result.get("violation_type"),
            }
            if action == "hide":
                update["status"] = "hidden"
            await collection.update_one({doc_id_field: doc_id}, {"$set": update})
            logger.info(f"[MODERATION] {collection_name} {doc_id} → {action}: {result.get('reason')}")
    except Exception as exc:
        logger.warning(f"[MODERATION] Failed for {collection_name} {doc_id}: {exc}")

# ── Hashtag extraction + upsert ──

def _extract_hashtags(text: str) -> list:
    if not text:
        return []
    tags = re.findall(r'#([a-zA-Z0-9_\u00C0-\u024F]+)', text)
    return list(dict.fromkeys(tag.lower() for tag in tags))[:30]


async def _upsert_hashtags(tags: list):
    if not tags:
        return
    now = datetime.now(timezone.utc)
    for tag in tags:
        await db.hashtags.update_one(
            {"name": tag},
            {"$inc": {"post_count": 1}, "$set": {"last_used_at": now, "slug": tag}, "$setOnInsert": {"created_at": now, "velocity_score": 0}},
            upsert=True,
        )


# Preference-aware notification types (maps notification type → preference key)
_NOTIF_PREF_KEY = {
    "new_like": "likes", "like": "likes", "post_liked": "likes", "story_like": "likes",
    "new_comment": "comments", "comment": "comments", "post_commented": "comments", "story_reply": "comments",
    "new_follower": "new_followers", "follow": "new_followers",
    "new_follow_request": "new_followers", "follow_request_accepted": "new_followers",
    "mentioned": "mentions", "mention": "mentions",
}

async def _insert_notification_if_allowed(notif: dict):
    """Insert notification only if user preferences allow it."""
    user_id = notif.get("user_id")
    notif_type = notif.get("type", "")
    pref_key = _NOTIF_PREF_KEY.get(notif_type)
    if pref_key and user_id:
        prefs = await db.user_notification_preferences.find_one({"user_id": user_id}, {"_id": 0, pref_key: 1})
        if prefs and prefs.get(pref_key) is False:
            return  # User opted out of this notification type
    await db.notifications.insert_one(notif)


def _public_product_filter() -> dict:
    return {
        "$or": [
            {"status": "active"},
            {"approved": True},
            {"status": "approved"},
        ]
    }


def _safe_string(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


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
        product_id = _safe_string(item.get("product_id") or item.get("productId") or item.get("id"))
        if not product_id:
            continue
        normalized.append(
            {
                "product_id": product_id,
                "x": _safe_float(item.get("x", item.get("position_x", 50)), 50),
                "y": _safe_float(item.get("y", item.get("position_y", 50)), 50),
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
    product_map = {item.get("product_id", ""): item for item in products}

    hydrated = []
    for ref in tag_refs:
        product = product_map.get(ref.get("product_id", ""))
        if not product:
            continue
        hydrated.append(
            {
                "product_id": product.get("product_id", ""),
                "id": product.get("product_id", ""),
                "name": product.get("name", ""),
                "price": product.get("price", 0),
                "currency": product.get("currency", "EUR"),
                "image": extract_product_image(product),
                "producer_id": product.get("producer_id"),
                "store_id": product.get("store_id"),
                "position": {
                    "x": max(4, min(96, _safe_float(ref.get("x", 50), 50))),
                    "y": max(4, min(96, _safe_float(ref.get("y", 50), 50))),
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
    raw_media = post.get("media")
    media: List[Dict[str, object]] = []

    if isinstance(raw_media, list):
        media = [item for item in raw_media if isinstance(item, dict) and item.get("url")]
    elif isinstance(raw_media, dict) and raw_media.get("url"):
        media = [raw_media]

    if not media and post.get("image_url"):
        media = [{"url": post.get("image_url"), "type": "image", "order": 0, "ratio": "1:1"}]

    post["media"] = media
    first_media = media[0] if media else {}
    post["image_url"] = first_media.get("url") or post.get("image_url")

    if len(media) > 1:
        post["type"] = "carousel"
        post["post_type"] = "carousel"
    else:
        post["type"] = post.get("type") or "post"
        post["post_type"] = post.get("post_type") or "post"

    # Section 3.5b — PII redaction at READ time. Original caption stays in
    # MongoDB; this only affects the response payload.
    try:
        from services.serialization_helpers import redact_public_text, language_for
        lang = language_for(post.get("user_country") or post.get("country"))
        if isinstance(post.get("caption"), str):
            post["caption"] = redact_public_text(post["caption"], lang)
    except Exception:
        pass
    return post


async def _check_content_privacy(post_or_reel: dict, current_user) -> None:
    """Raise 404 if content is private and viewer is not owner/follower."""
    if not post_or_reel or not post_or_reel.get("is_private"):
        return
    owner_id = post_or_reel.get("user_id")
    if current_user and current_user.user_id == owner_id:
        return
    if current_user and owner_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": current_user.user_id, "following_id": owner_id}
        )
        if is_follower:
            return
    raise HTTPException(status_code=404, detail="Post not found")


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


def _normalize_story_ids(raw_value: object, limit: int = 50) -> List[str]:
    if not isinstance(raw_value, list):
        return []

    normalized: List[str] = []
    seen: set[str] = set()
    for item in raw_value:
        story_id = _safe_string(item)
        if not story_id or story_id in seen:
            continue
        seen.add(story_id)
        normalized.append(story_id)
        if len(normalized) >= limit:
            break
    return normalized


def _parse_highlight_order(value: object) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Order must be a non-negative integer")


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
async def get_reels(limit: int = 40, skip: int = 0, tab: str = "foryou", hashtag: Optional[str] = None, request: Request = None):
    """
    Legacy reels endpoint used by the current frontend (/api/reels).
    Reads from Mongo social collections and never requires authentication.
    Supports tab='foryou' (default) or tab='following' (only followed users' reels).
    Optionally filters by hashtag in caption.
    """
    current_user = await get_optional_user(request) if request is not None else None

    query: dict = {}
    if tab == "following" and current_user:
        following_ids = [f["following_id"] async for f in db.user_follows.find({"follower_id": current_user.user_id}, {"following_id": 1})]
        query["user_id"] = {"$in": following_ids}
    if hashtag and hashtag.strip():
        query["caption"] = {"$regex": f"#{re.escape(hashtag.strip())}", "$options": "i"}

    # Fetch from BOTH collections and merge (reels can be in either)
    try:
        reels_primary = await db.reels.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit + 1).to_list(limit + 1)
    except Exception as e:
        logger.warning(f"Failed to fetch reels: {e}")
        reels_primary = []

    # Also search user_posts for reels (many reels are stored here)
    fallback_query = {
        "$or": [
            {"is_reel": True},
            {"type": "reel"},
        ]
    }
    if "user_id" in query:
        fallback_query["user_id"] = query["user_id"]
    if hashtag and hashtag.strip():
        fallback_query["caption"] = {"$regex": f"#{re.escape(hashtag.strip())}", "$options": "i"}
    try:
        reels_from_posts = await db.user_posts.find(
            fallback_query, {"_id": 0},
        ).sort("created_at", -1).skip(skip).limit(limit + 1).to_list(limit + 1)
    except Exception:
        reels_from_posts = []

    # Merge and deduplicate by id
    seen_ids = set()
    reels = []
    for r in reels_primary + reels_from_posts:
        rid = r.get("id") or r.get("reel_id") or r.get("post_id")
        if rid and rid not in seen_ids:
            seen_ids.add(rid)
            reels.append(r)
    # Sort merged results by created_at DESC
    reels.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    reels = reels[:limit + 1]

    # Batch fetch users and follow status to eliminate N+1
    reel_uids = list({r.get("user_id") for r in reels if r.get("user_id")})
    reel_user_cache = {}
    if reel_uids:
        reel_user_docs = await db.users.find(
            {"user_id": {"$in": reel_uids}},
            {"_id": 0, "user_id": 1, "username": 1, "name": 1, "profile_image": 1}
        ).to_list(100)
        reel_user_cache = {u["user_id"]: u for u in reel_user_docs}
    followed_set = set()
    if current_user and reel_uids:
        follow_docs = await db.user_follows.find(
            {"follower_id": current_user.user_id, "following_id": {"$in": reel_uids}},
            {"_id": 0, "following_id": 1}
        ).to_list(100)
        followed_set = {f["following_id"] for f in follow_docs}

    # Batch-check likes and saves for current user
    liked_ids = set()
    saved_ids = set()
    if current_user:
        reel_ids_list = []
        for r in reels:
            rid = r.get("id") or r.get("reel_id") or r.get("post_id")
            if rid:
                reel_ids_list.append(rid)
        if reel_ids_list:
            like_docs = await db.reel_likes.find(
                {"reel_id": {"$in": reel_ids_list}, "user_id": current_user.user_id}
            ).to_list(500)
            liked_ids = {l["reel_id"] for l in like_docs}
            save_docs = await db.reel_saves.find(
                {"reel_id": {"$in": reel_ids_list}, "user_id": current_user.user_id}
            ).to_list(500)
            saved_ids = {s["reel_id"] for s in save_docs}

    items = []
    for reel in reels:
        user_id = reel.get("user_id")
        user_doc = reel_user_cache.get(user_id)
        media_url = reel.get("video_url") or reel.get("media_url") or (reel.get("media") or [{}])[0].get("url")
        thumb_url = reel.get("thumbnail_url") or (reel.get("media") or [{}])[0].get("thumbnail_url") or media_url

        is_followed = user_id in followed_set if current_user and user_id else False
        rid = reel.get("id") or reel.get("reel_id") or reel.get("post_id")

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
                    "user_id": user_id,
                    "username": (user_doc or {}).get("username") or reel.get("username"),
                    "name": reel.get("user_name") or (user_doc or {}).get("name") or "Usuario",
                    "full_name": reel.get("user_name") or (user_doc or {}).get("name") or "Usuario",
                    "profile_image": (user_doc or {}).get("profile_image") or reel.get("user_profile_image"),
                    "avatar_url": (user_doc or {}).get("profile_image") or reel.get("user_profile_image"),
                    "role": (user_doc or {}).get("role", "customer"),
                    "is_followed_by_me": is_followed,
                },
                "media": [{"url": media_url, "thumbnail_url": thumb_url}] if media_url else [],
                "engagement": {
                    "likes_count": reel.get("likes_count", 0),
                    "comments_count": reel.get("comments_count", 0),
                },
                "tagged_product": reel.get("tagged_product"),
                "tagged_products": reel.get("tagged_products") or ([reel["tagged_product"]] if reel.get("tagged_product") else []),
                "is_liked": rid in liked_ids if current_user else False,
                "is_saved": rid in saved_ids if current_user else False,
            }
        )

    _has_more = len(items) > limit
    return {"items": items[:limit], "has_more": _has_more}


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
    filter: str = Form(""),
    text_overlays_json: str = Form(""),
    audience: str = Form("public"),
    cover_image: UploadFile = File(None),
    user: User = Depends(get_current_user)
):
    """Create a reel (short video). Uploads to Cloudinary."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de video")
    # Check Content-Length header before reading to prevent DoS
    MAX_VIDEO_SIZE = 100 * 1024 * 1024
    if hasattr(file, "size") and file.size and file.size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="El video no puede superar 100MB")
    # Streaming read with size limit — abort early if too large
    chunks = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)  # 1MB chunks
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=400, detail="El video no puede superar 100MB")
        chunks.append(chunk)
    contents = b"".join(chunks)

    result = await cloudinary_upload_video(contents, folder="reels", filename=f"reel_{uuid.uuid4().hex[:8]}")
    original_video_url = result["url"]
    video_public_id = result.get("public_id", "")
    duration_seconds = _safe_float(result.get("duration"), 0.0)
    if not duration_seconds or duration_seconds <= 0:
        # Corrupt or unreadable video — clean up and reject
        try:
            from services.cloudinary_storage import delete_media
            await delete_media(video_public_id, resource_type="video")
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="El vídeo no se pudo procesar (duración 0). Prueba con otro archivo.")

    safe_trim_start = max(0.0, _safe_float(trim_start_seconds, 0.0))
    requested_trim_end = max(0.0, _safe_float(trim_end_seconds, 0.0))
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
    cloudinary_module = None
    if video_public_id and (safe_trim_start > 0 or safe_trim_end > 0 or is_muted):
        try:
            cloudinary_module = importlib.import_module("cloudinary")
        except Exception:
            cloudinary_module = None

    if cloudinary_module and video_public_id and (safe_trim_start > 0 or safe_trim_end > 0 or is_muted):
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
            video_url = cloudinary_module.CloudinaryVideo(video_public_id).build_url(
                resource_type="video",
                secure=True,
                transformation=transformation,
            )
        except Exception as e:
            logger.warning(f"Failed to build video URL for {video_public_id}: {e}")
            video_url = original_video_url

    thumbnail_url = result.get("thumbnail") or original_video_url
    if video_public_id:
        try:
            thumbnail_url = await VideoService.generate_thumbnail_at_time(video_public_id, safe_cover_frame)
        except Exception as e:
            logger.warning(f"Failed to generate thumbnail for {video_public_id}: {e}")
            thumbnail_url = result.get("thumbnail") or original_video_url

    requested_tags = _normalize_tagged_products(tagged_products_json)
    if product_id and product_id.strip() and not requested_tags:
        requested_tags = [{"product_id": product_id.strip(), "x": 50, "y": 62}]
    tagged_products = await _hydrate_tagged_products(requested_tags)
    tagged_product = tagged_products[0] if tagged_products else None

    # Parse text overlays sent from frontend
    parsed_text_overlays = []
    if text_overlays_json and text_overlays_json.strip():
        try:
            parsed_text_overlays = json.loads(text_overlays_json)
            if not isinstance(parsed_text_overlays, list):
                parsed_text_overlays = []
        except (json.JSONDecodeError, TypeError):
            parsed_text_overlays = []

    # Validate audience
    safe_audience = audience.strip().lower() if audience else "public"
    if safe_audience not in ("public", "followers"):
        safe_audience = "public"

    # Upload custom cover image if provided
    custom_cover_url = None
    if cover_image and hasattr(cover_image, "content_type") and cover_image.content_type and cover_image.content_type.startswith("image/"):
        try:
            cover_contents = await cover_image.read()
            if len(cover_contents) <= 10 * 1024 * 1024:  # 10MB limit
                cover_result = await cloudinary_upload(cover_contents, folder="reel_covers", filename=f"cover_{uuid.uuid4().hex[:8]}")
                custom_cover_url = cover_result.get("url")
        except Exception as e:
            logger.warning(f"Failed to upload custom cover image: {e}")

    if custom_cover_url:
        thumbnail_url = custom_cover_url

    # Section 3.5b — sync AI pre-filter on caption + cover image
    _ai_decision_reel, _ai_summary_reel = await _premoderate(
        user, text=caption, image_urls=[u for u in [thumbnail_url, custom_cover_url] if u],
    )

    # Fetch profile image for denormalization
    reel_user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "profile_image": 1, "company_name": 1})
    reel_id = f"reel_{uuid.uuid4().hex[:12]}"
    reel = {
        "reel_id": reel_id,
        "id": reel_id,
        "type": "reel",
        "is_reel": True,
        "user_id": user.user_id,
        "user_name": (reel_user_doc or {}).get("company_name") or user.name,
        "user_profile_image": (reel_user_doc or {}).get("profile_image"),
        "video_url": video_url,
        "original_video_url": original_video_url,
        "thumbnail_url": thumbnail_url,
        "caption": sanitize_text(caption[:500]) if caption else "",
        "location": sanitize_text(location[:120]) if location else "",
        "duration_seconds": duration_seconds,
        "cover_frame_seconds": safe_cover_frame,
        "trim_start_seconds": safe_trim_start,
        "trim_end_seconds": safe_trim_end,
        "playback_rate": safe_playback_rate,
        "muted": is_muted,
        "slow_motion_enabled": has_slow_motion,
        "slow_motion_start": safe_slow_motion_start,
        "slow_motion_end": safe_slow_motion_end,
        "filter": filter.strip() if filter else "",
        "text_overlays": parsed_text_overlays,
        "audience": safe_audience,
        "is_private": safe_audience != "public",
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
    try:
        await db.reels.insert_one(reel)
        asyncio.create_task(_upsert_hashtags(_extract_hashtags(caption)))
    except Exception as db_err:
        # Compensating action: delete orphaned Cloudinary video if DB insert fails
        if video_public_id:
            try:
                from services.cloudinary_storage import delete_media
                await delete_media(video_public_id, resource_type="video")
                logger.warning(f"[REEL] Cleaned up orphaned Cloudinary video {video_public_id} after DB insert failure")
            except Exception as cleanup_err:
                logger.error(f"[REEL] Failed to cleanup orphaned video {video_public_id}: {cleanup_err}")
        raise db_err
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
    # Async post-publish moderation (non-blocking)
    asyncio.create_task(_moderate_content_async(
        "reels", "reel_id", reel_id, caption, [reel.get("video_url", "")]
    ))

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision_reel == "flag":
        await _post_publish_autoreport(
            "reel", reel_id, user.user_id,
            (getattr(user, "country", None) or "ES").upper(), _ai_summary_reel,
        )

    return {k: v for k, v in reel.items() if k != "_id"}


async def _find_reel_in_any_collection(reel_id: str):
    """Find a reel in db.reels first, fallback to db.user_posts (dual-collection)."""
    filter_q = {"$or": [{"reel_id": reel_id}, {"id": reel_id}]}
    reel = await db.reels.find_one(filter_q)
    if reel:
        return reel, "reels"
    # Fallback: reel may live in user_posts
    reel = await db.user_posts.find_one({
        "$and": [
            {"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]},
            {"$or": [{"type": "reel"}, {"is_reel": True}]},
        ]
    })
    if reel:
        return reel, "user_posts"
    return None, None


@router.post("/reels/{reel_id}/view")
async def view_reel(reel_id: str, request: Request):
    """Increment view count on a reel (deduplicated per viewer per 10 min)."""
    current_user = await get_optional_user(request)

    # Deduplicate: one view per viewer per reel per 10 minutes
    viewer_id = current_user.user_id if current_user else (request.client.host if request.client else "anon")
    dedup_key = f"reel_view:{reel_id}:{viewer_id}"
    try:
        from core.cache import redis_client
        if redis_client and redis_client.client:
            already = await redis_client.client.get(dedup_key)
            if already:
                return {"status": "ok", "deduplicated": True}
            await redis_client.client.setex(dedup_key, 600, "1")
    except Exception:
        pass  # Redis unavailable — allow view through

    # Update only the matching collection (not both)
    reel, reel_collection = await _find_reel_in_any_collection(reel_id)
    if reel:
        if reel_collection == "reels":
            await db.reels.update_one({"$or": [{"reel_id": reel_id}, {"id": reel_id}]}, {"$inc": {"views_count": 1}})
        else:
            await db.user_posts.update_one(
                {"$and": [{"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]}, {"$or": [{"type": "reel"}, {"is_reel": True}]}]},
                {"$inc": {"views_count": 1}},
            )
    await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "view"}, current_user.user_id if current_user else None)
    return {"status": "ok"}


@router.post("/reels/{reel_id}/like")
async def like_reel(reel_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a reel."""
    reel, reel_collection = await _find_reel_in_any_collection(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    filter_q = {"$or": [{"reel_id": reel_id}, {"id": reel_id}]}
    # Authorization: if private, only owner or followers can like
    if reel.get("is_private") and reel.get("user_id") != user.user_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": user.user_id, "following_id": reel["user_id"]}
        )
        if not is_follower:
            raise HTTPException(status_code=403, detail="Not authorized to interact with this reel")

    target_col = db.reels if reel_collection == "reels" else db.user_posts
    target_filter = filter_q if reel_collection == "reels" else {"$and": [{"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]}, {"$or": [{"type": "reel"}, {"is_reel": True}]}]}
    # Atomic upsert: if not yet liked, insert and increment; otherwise delete and decrement.
    # Prevents double-like race condition from rapid double-taps (matches post like behavior).
    result = await db.reel_likes.update_one(
        {"reel_id": reel_id, "user_id": user.user_id},
        {"$setOnInsert": {"reel_id": reel_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if result.upserted_id:
        # Freshly inserted → user liked it
        await target_col.update_one(target_filter, {"$inc": {"likes_count": 1}})
        await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "like"}, user.user_id)
        # Notify reel owner (fire-and-forget, skip self-like)
        owner_id = reel.get("user_id") or reel.get("author_id")
        if owner_id and owner_id != user.user_id:
            try:
                now = datetime.now(timezone.utc)
                await _insert_notification_if_allowed({
                    "user_id": owner_id,
                    "type": "new_like",
                    "title": "Nuevo me gusta",
                    "body": f"A {user.name} le ha gustado tu reel",
                    "action_url": f"/posts/{reel_id}",
                    "data": {"liker_id": user.user_id, "liker_name": user.name, "content_id": reel_id, "content_type": "reel"},
                    "channels": ["in_app"],
                    "status_by_channel": {"in_app": "sent"},
                    "read_at": None,
                    "created_at": now,
                    "sent_at": now,
                })
            except Exception:
                pass
        return {"liked": True}
    # Document already existed → user is un-liking
    await db.reel_likes.delete_one({"reel_id": reel_id, "user_id": user.user_id})
    await target_col.update_one(target_filter, {"$inc": {"likes_count": -1}})
    return {"liked": False}


@router.get("/reels/{reel_id}/comments")
async def get_reel_comments(reel_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Get reel comments (latest first)."""
    comments = await db.reel_comments.find(
        {"reel_id": reel_id},
        {"_id": 0},
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    try:
        current_user = await get_optional_user(request)
    except Exception as e:
        logger.warning(f"Failed to resolve optional user for reel comments: {e}")
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

    reel, reel_collection = await _find_reel_in_any_collection(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    # Authorization: if private, only owner or followers can comment
    if reel.get("is_private") and reel.get("user_id") != user.user_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": user.user_id, "following_id": reel["user_id"]}
        )
        if not is_follower:
            raise HTTPException(status_code=403, detail="Not authorized to interact with this reel")

    comment_id = f"rcom_{uuid.uuid4().hex[:10]}"
    reply_to = body.get("reply_to")
    comment = {
        "comment_id": comment_id,
        "reel_id": reel.get("reel_id") or reel.get("id") or reel_id,
        "user_id": user.user_id,
        "user_name": user.get("name") if hasattr(user, "get") else getattr(user, "name", "Usuario"),
        "user_profile_image": user.get("profile_image") if hasattr(user, "get") else getattr(user, "profile_image", None),
        "text": sanitize_text(text[:500]),
        "reply_to": reply_to,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes_count": 0,
        "replies": [],
    }
    await db.reel_comments.insert_one(comment)
    # Update comments_count in the correct collection
    if reel_collection == "reels":
        await db.reels.update_one({"$or": [{"reel_id": reel_id}, {"id": reel_id}]}, {"$inc": {"comments_count": 1}})
    else:
        await db.user_posts.update_one(
            {"$and": [{"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]}, {"$or": [{"type": "reel"}, {"is_reel": True}]}]},
            {"$inc": {"comments_count": 1}},
        )
    await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": reel_id, "action": "comment"}, user.user_id)
    # Notify reel owner (fire-and-forget, skip self-comment)
    owner_id = reel.get("user_id") or reel.get("author_id")
    if owner_id and owner_id != user.user_id:
        try:
            now = datetime.now(timezone.utc)
            snippet = comment["text"][:60] + ("…" if len(comment["text"]) > 60 else "")
            sender_name = getattr(user, "name", None) or getattr(user, "username", None) or "Alguien"
            await _insert_notification_if_allowed({
                "user_id": owner_id,
                "type": "new_comment",
                "title": "Nuevo comentario",
                "body": f"{sender_name} comentó: {snippet}",
                "action_url": f"/posts/{reel_id}",
                "data": {"commenter_id": user.user_id, "commenter_name": sender_name, "content_id": reel_id, "content_type": "reel", "comment_id": comment_id},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
        except Exception:
            pass
    return {k: v for k, v in comment.items() if k != "_id"}


@router.delete("/reels/{reel_id}/comments/{comment_id}")
async def delete_reel_comment(reel_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Delete own comment on a reel."""
    comment = await db.reel_comments.find_one({"comment_id": comment_id, "reel_id": reel_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your comment")
    await db.reel_comments.delete_one({"comment_id": comment_id, "reel_id": reel_id})
    # Decrement only in the correct collection
    reel, reel_collection = await _find_reel_in_any_collection(reel_id)
    if reel:
        if reel_collection == "reels":
            await db.reels.update_one(
                {"$or": [{"reel_id": reel_id}, {"id": reel_id}]},
                {"$inc": {"comments_count": -1}},
            )
        else:
            await db.user_posts.update_one(
                {"$and": [{"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]}, {"$or": [{"type": "reel"}, {"is_reel": True}]}]},
                {"$inc": {"comments_count": -1}},
            )
    return {"status": "deleted"}


@router.post("/reels/{reel_id}/save")
async def toggle_reel_save(reel_id: str, user: User = Depends(get_current_user)):
    """Toggle save/bookmark on a reel."""
    existing = await db.reel_saves.find_one({"reel_id": reel_id, "user_id": user.user_id})
    if existing:
        await db.reel_saves.delete_one({"reel_id": reel_id, "user_id": user.user_id})
        return {"saved": False}
    await db.reel_saves.insert_one({
        "reel_id": reel_id,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"saved": True}


@router.post("/reels/{reel_id}/comments/{comment_id}/like")
async def like_reel_comment(reel_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a reel comment."""
    comment = await db.reel_comments.find_one({"comment_id": comment_id, "reel_id": reel_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Authorization: check parent reel privacy
    reel, _ = await _find_reel_in_any_collection(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    if reel.get("is_private") and reel.get("user_id") != user.user_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": user.user_id, "following_id": reel["user_id"]}
        )
        if not is_follower:
            raise HTTPException(status_code=403, detail="Not authorized to interact with this reel's comments")

    # Atomic upsert: prevents double-like from rapid double-taps
    result = await db.reel_comment_likes.update_one(
        {"comment_id": comment_id, "user_id": user.user_id},
        {"$setOnInsert": {"comment_id": comment_id, "user_id": user.user_id, "reel_id": reel_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if result.upserted_id:
        await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": 1}})
        liked = True
    else:
        await db.reel_comment_likes.delete_one({"comment_id": comment_id, "user_id": user.user_id})
        await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": -1}})
        liked = False

    updated = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
    return {"liked": liked, "likes_count": (updated or {}).get("likes_count", 0)}


@router.post("/posts/{post_id}/comments/{comment_id}/like")
async def like_post_comment(post_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a post or reel comment.
    Post comments are in db.post_comments; reel comments are in db.reel_comments.
    Detect reels by post_id prefix (reel_xxx).
    """
    user_id = getattr(user, "user_id", None)
    is_reel = post_id.startswith("reel_")

    if is_reel:
        comment = await db.reel_comments.find_one({"comment_id": comment_id, "reel_id": post_id})
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Use db.reel_comment_likes (same collection as /reels/{id}/comments/{cid}/like)
        # so liked state is consistent regardless of which endpoint was called.
        result = await db.reel_comment_likes.delete_one({"comment_id": comment_id, "user_id": user_id})
        if result.deleted_count > 0:
            await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": -1}})
            updated = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
            return {"liked": False, "likes_count": (updated or {}).get("likes_count", 0)}

        upsert_result = await db.reel_comment_likes.update_one(
            {"comment_id": comment_id, "user_id": user_id},
            {"$setOnInsert": {"comment_id": comment_id, "user_id": user_id, "reel_id": post_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        if upsert_result.upserted_id:
            await db.reel_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": 1}})
        updated = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
        return {"liked": True, "likes_count": (updated or {}).get("likes_count", 0)}

    # Post comment
    comment = await db.post_comments.find_one({"comment_id": comment_id, "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Authorization: check parent post privacy (db.user_posts, not the legacy db.posts)
    post = await db.user_posts.find_one({"post_id": post_id})
    if post and post.get("is_private") and post.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to interact with this post's comments")

    # Toggle like
    result = await db.comment_likes.delete_one({"comment_id": comment_id, "user_id": user_id})
    if result.deleted_count > 0:
        await db.post_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": -1}})
        updated = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
        return {"liked": False, "likes_count": (updated or {}).get("likes_count", 0)}

    upsert_result = await db.comment_likes.update_one(
        {"comment_id": comment_id, "user_id": user_id},
        {"$setOnInsert": {"comment_id": comment_id, "user_id": user_id, "post_id": post_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if upsert_result.upserted_id:
        await db.post_comments.update_one({"comment_id": comment_id}, {"$inc": {"likes_count": 1}})
    updated = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0, "likes_count": 1})
    return {"liked": True, "likes_count": (updated or {}).get("likes_count", 0)}


@router.patch("/reels/{reel_id}")
async def edit_reel(reel_id: str, body: dict = Body(...), user: User = Depends(get_current_user)):
    """Edit reel caption. Only the owner can edit."""
    reel, reel_collection = await _find_reel_in_any_collection(reel_id)
    if not reel or reel.get("user_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Reel not found or not owned")
    update = {}
    if "caption" in body:
        update["caption"] = sanitize_text(str(body["caption"])[:500])
    if "audience" in body:
        safe_audience = str(body["audience"]).strip().lower() if body["audience"] else "public"
        if safe_audience not in ("public", "followers"):
            safe_audience = "public"
        update["audience"] = safe_audience
        update["is_private"] = safe_audience != "public"
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if reel_collection == "reels":
        await db.reels.update_one({"$or": [{"reel_id": reel_id}, {"id": reel_id}]}, {"$set": update})
    else:
        await db.user_posts.update_one(
            {"$and": [{"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]}, {"$or": [{"type": "reel"}, {"is_reel": True}]}]},
            {"$set": update},
        )
    return {"status": "updated", **update}


@router.delete("/reels/{reel_id}")
async def delete_reel(reel_id: str, user: User = Depends(get_current_user)):
    """Delete a reel. Only the owner can delete."""
    filter_q = {"$or": [{"reel_id": reel_id}, {"id": reel_id}], "user_id": user.user_id}
    reel = await db.reels.find_one(filter_q)
    reel_in_posts = False
    if not reel:
        # Fallback: reel may live in user_posts
        reel = await db.user_posts.find_one({
            "$and": [
                {"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]},
                {"$or": [{"type": "reel"}, {"is_reel": True}]},
                {"user_id": user.user_id},
            ]
        })
        reel_in_posts = True
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found or not owned")
    # Clean Cloudinary assets
    try:
        from services.cloudinary_storage import cleanup_urls
        urls = [reel.get("video_url"), reel.get("original_video_url"), reel.get("thumbnail_url")]
        await cleanup_urls([u for u in urls if u], "video")
    except Exception as e:
        logger.warning(f"[REEL_DELETE] Cloudinary cleanup failed for {reel_id}: {e}")

    if reel_in_posts:
        await db.user_posts.delete_one({
            "$and": [
                {"$or": [{"post_id": reel_id}, {"id": reel_id}, {"reel_id": reel_id}]},
                {"user_id": user.user_id},
            ]
        })
    else:
        await db.reels.delete_one(filter_q)
    await db.reel_likes.delete_many({"reel_id": reel_id})
    await db.reel_comments.delete_many({"reel_id": reel_id})
    await db.reel_saves.delete_many({"reel_id": reel_id})
    return {"status": "deleted"}


@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, request: Request):
    """Get public user profile — enhanced with seller stats for producers."""
    projection = {"_id": 0, "password_hash": 0, "verification_code": 0}
    user = await db.users.find_one({"user_id": user_id}, projection)
    if not user:
        user = await db.users.find_one({"username": user_id}, projection)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use the actual user_id from the document (path param may be a username)
    actual_user_id = user.get("user_id") or user_id

    followers_count = await db.user_follows.count_documents({"following_id": actual_user_id})
    following_count = await db.user_follows.count_documents({"follower_id": actual_user_id})
    # Count posts in user_posts collection (includes posts AND some reels)
    user_posts_count = await db.user_posts.count_documents({"user_id": actual_user_id})
    # Count reels in dedicated reels collection (may not be in user_posts)
    reels_only_count = await db.reels.count_documents({"user_id": actual_user_id})
    # Count reels that are also in user_posts (to avoid double counting)
    reels_in_user_posts = await db.user_posts.count_documents({"user_id": actual_user_id, "$or": [{"type": "reel"}, {"is_reel": True}]})
    # Total = user_posts + reels that are ONLY in db.reels (not in user_posts)
    reels_exclusive = max(0, reels_only_count - reels_in_user_posts)
    posts_count = user_posts_count + reels_exclusive
    reels_count = reels_in_user_posts + reels_exclusive

    is_following = False
    current_user = await get_optional_user(request)
    if current_user:
        follow_exists = await db.user_follows.find_one({"follower_id": current_user.user_id, "following_id": actual_user_id})
        is_following = follow_exists is not None

    # Check active stories (not expired)
    has_active_story = await db.hispalostories.count_documents({
        "user_id": actual_user_id,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()},
        "is_hidden": {"$ne": True},
    }) > 0

    # Mutual followers (people you follow who also follow them)
    mutual_followers = []
    mutual_followers_count = 0
    if current_user and current_user.user_id != actual_user_id:
        my_following = await db.user_follows.distinct("following_id", {"follower_id": current_user.user_id})
        their_followers = await db.user_follows.distinct("follower_id", {"following_id": actual_user_id})
        mutual_ids = list(set(my_following) & set(their_followers))
        mutual_followers_count = len(mutual_ids)
        if mutual_ids:
            mutual_users = await db.users.find(
                {"user_id": {"$in": mutual_ids[:3]}},
                {"_id": 0, "user_id": 1, "username": 1, "name": 1, "profile_image": 1}
            ).to_list(3)
            mutual_followers = mutual_users

    is_own = current_user and current_user.user_id == actual_user_id
    is_private = bool(user.get("is_private", False))
    # Check pending follow request for private accounts
    follow_request_pending = False
    if is_private and current_user and not is_following and not is_own:
        pending = await db.follow_requests.find_one({
            "requester_id": current_user.user_id,
            "target_id": actual_user_id,
            "status": "pending",
        })
        follow_request_pending = pending is not None

    # For private accounts, hide detailed info from non-followers
    can_see_details = is_own or is_following or not is_private

    profile = {
        "user_id": user.get("user_id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "profile_image": user.get("profile_image"),
        "bio": user.get("bio", "") if can_see_details else "",
        "website": user.get("website") if can_see_details else None,
        "location": user.get("location") if can_see_details else None,
        "country": user.get("country"),
        "created_at": user.get("created_at"),
        "role": user.get("role"),
        "company_name": user.get("company_name"),
        "is_verified": bool(user.get("is_verified") or user.get("approved")),
        "followers_count": followers_count,
        "following_count": following_count if can_see_details else 0,
        "posts_count": posts_count if can_see_details else 0,
        "reels_count": reels_count if can_see_details else 0,
        "is_following": is_following,
        "is_private": is_private,
        "follow_request_pending": follow_request_pending,
        "has_active_story": has_active_story if can_see_details else False,
        "mutual_followers": mutual_followers if can_see_details else [],
        "mutual_followers_count": mutual_followers_count if can_see_details else 0,
    }

    # Attach store_slug for producers
    if user.get("role") in ("producer", "importer"):
        store = await db.store_profiles.find_one(
            {"producer_id": actual_user_id}, {"_id": 0, "slug": 1}
        )
        profile["store_slug"] = store.get("slug") if store else user.get("username")

    # Influencer public info (social links, niche — NO earnings)
    if user.get("role") == "influencer":
        profile["instagram"] = user.get("instagram")
        profile["tiktok"] = user.get("tiktok")
        profile["youtube"] = user.get("youtube")
        profile["niche"] = user.get("niche")
        inf = await db.influencers.find_one(
            {"$or": [{"user_id": actual_user_id}, {"email": user.get("email", "").lower()}]},
            {"_id": 0, "current_tier": 1, "niche": 1}
        )
        if inf:
            profile["niche"] = inf.get("niche") or profile.get("niche")
            profile["tier"] = normalize_influencer_tier(inf.get("current_tier", "hercules"), inf.get("commission_rate"))

    if user.get("role") == "producer":
        orders = await db.orders.find(
            {"line_items.producer_id": actual_user_id, "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}},
            {"_id": 0, "line_items": 1}
        ).to_list(1000)
        total_sales = 0
        total_orders = len(orders)
        for order in orders:
            for item in order.get("line_items", []):
                if item.get("producer_id") == actual_user_id:
                    total_sales += item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))

        products = await db.products.find({"producer_id": actual_user_id}, {"_id": 0, "product_id": 1}).to_list(100)
        product_ids = [p["product_id"] for p in products if p.get("product_id")]
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
            {"producer_id": actual_user_id, **_public_product_filter()},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1}
        ).sort("created_at", -1).limit(4).to_list(4)

        store = await db.store_profiles.find_one({"producer_id": actual_user_id}, {"_id": 0, "slug": 1, "tagline": 1, "verified": 1, "badges": 1})

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

    # Privacy gate: if private and viewer is not a follower/self, strip detailed data
    if is_private and not is_following and not is_own:
        profile.pop("seller_stats", None)
        profile.pop("website", None)
        profile.pop("instagram", None)
        profile.pop("tiktok", None)
        profile.pop("youtube", None)
        profile["posts_count"] = 0  # hide real count

    return profile


# ── Follow Requests (for private accounts) ────────────────────────────────────

@router.get("/users/me/follow-requests")
async def get_follow_requests(user: User = Depends(get_current_user)):
    """List pending follow requests for the current user."""
    requests = await db.follow_requests.find(
        {"target_id": user.user_id, "status": "pending"}
    ).sort("created_at", -1).to_list(length=100)

    # Batch fetch all requesters in one query instead of N+1
    requester_ids = list({req["requester_id"] for req in requests})
    requesters_list = await db.users.find(
        {"user_id": {"$in": requester_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "role": 1},
    ).to_list(len(requester_ids))
    requesters_map = {u["user_id"]: u for u in requesters_list}

    result = []
    for req in requests:
        requester = requesters_map.get(req["requester_id"])
        if requester:
            result.append({
                "request_id": str(req.get("_id", "")),
                "requester": requester,
                "created_at": req.get("created_at"),
            })
    return {"requests": result}


@router.post("/users/me/follow-requests/{request_id}/{action}")
async def handle_follow_request(
    request_id: str,
    action: str,
    user: User = Depends(get_current_user),
):
    """Accept or reject a follow request. action = 'accept' | 'reject'"""
    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    from bson import ObjectId as _OID
    req = await db.follow_requests.find_one({
        "_id": _OID(request_id),
        "target_id": user.user_id,
        "status": "pending",
    })
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if action == "accept":
        # Create the actual follow relationship
        await db.user_follows.update_one(
            {"follower_id": req["requester_id"], "following_id": user.user_id},
            {"$setOnInsert": {"follower_id": req["requester_id"], "following_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        await db.users.update_one({"user_id": req["requester_id"]}, {"$inc": {"following_count": 1}})
        await db.users.update_one({"user_id": user.user_id}, {"$inc": {"followers_count": 1}})
        # Notify requester that their follow request was accepted (fire-and-forget)
        try:
            now = datetime.now(timezone.utc)
            await _insert_notification_if_allowed({
                "user_id": req["requester_id"],
                "type": "follow_request_accepted",
                "title": "Solicitud aceptada",
                "body": f"{user.name} aceptó tu solicitud de seguimiento",
                "action_url": f"/{user.username}" if user.username else f"/{user.user_id}",
                "data": {"acceptor_id": user.user_id, "acceptor_name": user.name},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
        except Exception:
            pass

    await db.follow_requests.update_one(
        {"_id": _OID(request_id)},
        {"$set": {"status": action + "ed", "resolved_at": datetime.now(timezone.utc)}},
    )
    return {"status": action + "ed"}


@router.get("/users/{user_id}/posts")
async def get_user_posts(user_id: str, request: Request, skip: int = 0, limit: int = 30):
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    # Privacy check: private accounts only show posts to owner/followers
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_private": 1})
    if target_user and target_user.get("is_private"):
        is_owner = current_user and current_user.user_id == user_id
        is_follower = False
        if current_user and not is_owner:
            is_follower = bool(await db.user_follows.find_one(
                {"follower_id": current_user.user_id, "following_id": user_id}
            ))
        if not is_owner and not is_follower:
            return []

    posts = await db.user_posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for post in posts:
        _normalize_post_media(post)
        tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
        post["tagged_products"] = tagged_products
        post["tagged_product"] = tagged_products[0] if tagged_products else None

    # Hydrate is_liked / is_saved for current user
    if current_user and posts:
        post_ids = [p.get("post_id") for p in posts if p.get("post_id")]
        if post_ids:
            like_docs = await db.post_likes.find(
                {"post_id": {"$in": post_ids}, "user_id": current_user.user_id},
                {"_id": 0, "post_id": 1}
            ).to_list(len(post_ids))
            liked_ids = {l["post_id"] for l in like_docs}
            bookmark_docs = await db.post_bookmarks.find(
                {"post_id": {"$in": post_ids}, "user_id": current_user.user_id},
                {"_id": 0, "post_id": 1}
            ).to_list(len(post_ids))
            saved_ids = {b["post_id"] for b in bookmark_docs}
            for p in posts:
                pid = p.get("post_id")
                p["is_liked"] = pid in liked_ids
                p["is_saved"] = pid in saved_ids

    return posts


@router.get("/users/{user_id}/reels")
async def get_user_reels(user_id: str, request: Request, skip: int = 0, limit: int = 30):
    """Get reels (video posts) for a user profile (respects privacy)."""
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    query = {"user_id": user_id}
    is_owner = current_user and current_user.user_id == user_id
    if not is_owner:
        is_follower = False
        if current_user:
            is_follower = bool(await db.user_follows.find_one(
                {"follower_id": current_user.user_id, "following_id": user_id}
            ))
        if not is_follower:
            query["is_private"] = {"$ne": True}

    # Search both collections
    reels_primary = await db.reels.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    post_query = {**query, "$or": [{"is_reel": True}, {"type": "reel"}]}
    reels_from_posts = await db.user_posts.find(post_query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    seen = set()
    merged = []
    for r in reels_primary + reels_from_posts:
        rid = r.get("reel_id") or r.get("id") or r.get("post_id")
        if rid and rid not in seen:
            seen.add(rid)
            r["thumbnail_url"] = r.get("thumbnail_url") or r.get("cover_url") or r.get("video_url")
            merged.append(r)
    merged.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    result = merged[:limit]

    # Hydrate is_liked / is_saved for current user
    if current_user and result:
        reel_ids_list = [r.get("reel_id") or r.get("id") or r.get("post_id") for r in result]
        reel_ids_list = [rid for rid in reel_ids_list if rid]
        if reel_ids_list:
            like_docs = await db.reel_likes.find(
                {"reel_id": {"$in": reel_ids_list}, "user_id": current_user.user_id},
                {"_id": 0, "reel_id": 1}
            ).to_list(len(reel_ids_list))
            liked_ids = {l["reel_id"] for l in like_docs}
            save_docs = await db.reel_saves.find(
                {"reel_id": {"$in": reel_ids_list}, "user_id": current_user.user_id},
                {"_id": 0, "reel_id": 1}
            ).to_list(len(reel_ids_list))
            saved_ids = {s["reel_id"] for s in save_docs}
            for r in result:
                rid = r.get("reel_id") or r.get("id") or r.get("post_id")
                r["is_liked"] = rid in liked_ids
                r["is_saved"] = rid in saved_ids

    return result


@router.get("/users/{user_id}/products")
async def get_user_products(user_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Get approved products for a producer's profile."""
    current_user = await get_optional_user(request)
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_private": 1})
    if target_user:
        await _check_content_privacy(target_user, current_user)
    products = await db.products.find(
        {"producer_id": user_id, "approved": True},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return products


@router.get("/users/{user_id}/recipes")
async def get_user_recipes(user_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Recetas públicas de un usuario, filtradas en base de datos (no en cliente)."""
    current_user = await get_optional_user(request)
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_private": 1})
    if target_user:
        await _check_content_privacy(target_user, current_user)
    recipes = await db.recipes.find(
        {"author_id": user_id, "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return recipes


@router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, user: User = Depends(get_current_user)):
    # Check if blocked in either direction
    is_blocked = await db.blocked_users.find_one({
        "$or": [
            {"blocker_id": user.user_id, "blocked_id": user_id},
            {"blocker_id": user_id, "blocked_id": user.user_id}
        ]
    })
    if is_blocked:
        raise HTTPException(status_code=403, detail="No puedes seguir a este usuario")

    if user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check if target account exists and is private
    target_user = await db.users.find_one({"user_id": user_id}, {"is_private": 1, "role": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    is_target_private = bool(target_user.get("is_private", False))

    if is_target_private:
        # Create a follow request instead of an immediate follow
        existing = await db.follow_requests.find_one({
            "requester_id": user.user_id,
            "target_id": user_id,
            "status": "pending",
        })
        if existing:
            return {"status": "pending", "message": "Solicitud ya enviada"}
        await db.follow_requests.insert_one({
            "requester_id": user.user_id,
            "target_id": user_id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        })
        # Notify target of the follow request (fire-and-forget)
        try:
            now = datetime.now(timezone.utc)
            await _insert_notification_if_allowed({
                "user_id": user_id,
                "type": "new_follow_request",
                "title": "Solicitud de seguimiento",
                "body": f"{user.name} quiere seguirte",
                "action_url": "/notifications/follow-requests",
                "data": {"requester_id": user.user_id, "requester_name": user.name},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
        except Exception:
            pass
        return {"status": "pending", "message": "Solicitud de seguimiento enviada"}

    # Public account — immediate follow
    result = await db.user_follows.update_one(
        {"follower_id": user.user_id, "following_id": user_id},
        {"$setOnInsert": {"follower_id": user.user_id, "following_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if not result.upserted_id:
        return {"status": "ok", "message": "Already following"}
    # Keep followers_count in sync
    await db.users.update_one({"user_id": user_id}, {"$inc": {"followers_count": 1}})
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"following_count": 1}})
    # Feed preference signal: boost affinity toward this seller/creator
    try:
        from services.feed_preferences import update_preferences
        await update_preferences(user_id=user.user_id, action="follow", seller_id=user_id)
    except Exception:
        pass
    # Notify followed user (fire-and-forget)
    try:
        now = datetime.now(timezone.utc)
        await _insert_notification_if_allowed({
            "user_id": user_id,
            "type": "new_follower",
            "title": "Nuevo seguidor",
            "body": f"{user.name} ha empezado a seguirte",
            "action_url": f"/{user.username}" if user.username else f"/{user.user_id}",
            "data": {"follower_id": user.user_id, "follower_name": user.name},
            "channels": ["in_app"],
            "status_by_channel": {"in_app": "sent"},
            "read_at": None,
            "created_at": now,
            "sent_at": now,
        })
    except Exception:
        pass
    return {"status": "ok"}


@router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, user: User = Depends(get_current_user)):
    result = await db.user_follows.delete_one({"follower_id": user.user_id, "following_id": user_id})
    if result.deleted_count == 0:
        # Also cancel any pending follow request
        await db.follow_requests.delete_many({"requester_id": user.user_id, "target_id": user_id, "status": "pending"})
        return {"status": "ok"}
    # Keep followers_count in sync
    await db.users.update_one({"user_id": user_id}, {"$inc": {"followers_count": -1}})
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"following_count": -1}})
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

    # Privacy check: private accounts hide follower list from non-followers
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_private": 1})
    if target_user and target_user.get("is_private"):
        is_owner = current_user and current_user.user_id == user_id
        is_follower = False
        if current_user and not is_owner:
            is_follower = bool(await db.user_follows.find_one(
                {"follower_id": current_user.user_id, "following_id": user_id}
            ))
        if not is_owner and not is_follower:
            return {"followers": [], "total": 0, "has_more": False}

    skip = (page - 1) * limit

    query = {"following_id": user_id}

    if search:
        matching = await db.users.find(
            {"$or": [
                {"username": {"$regex": re.escape(search), "$options": "i"}},
                {"name": {"$regex": re.escape(search), "$options": "i"}},
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

    # Privacy check: private accounts hide following list from non-followers
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_private": 1})
    if target_user and target_user.get("is_private"):
        is_owner = current_user and current_user.user_id == user_id
        is_follower = False
        if current_user and not is_owner:
            is_follower = bool(await db.user_follows.find_one(
                {"follower_id": current_user.user_id, "following_id": user_id}
            ))
        if not is_owner and not is_follower:
            return {"following": [], "total": 0, "has_more": False}

    skip = (page - 1) * limit

    query = {"follower_id": user_id}

    if search:
        matching = await db.users.find(
            {"$or": [
                {"username": {"$regex": re.escape(search), "$options": "i"}},
                {"name": {"$regex": re.escape(search), "$options": "i"}},
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


# ── Story Highlights ──────────────────────────────────────────

@router.get("/users/{user_id}/highlights")
async def get_user_highlights(user_id: str, request: Request):
    """Get story highlights for a user profile (public)."""
    # Resolve user_id or username
    user_doc = await db.users.find_one(
        {"$or": [{"user_id": user_id}, {"username": user_id}]},
        {"_id": 0, "user_id": 1}
    )
    if not user_doc:
        return []
    actual_user_id = user_doc["user_id"]

    # Block check
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    if current_user and current_user.user_id != actual_user_id:
        is_blocked = await db.blocked_users.find_one({
            "$or": [
                {"blocker_id": current_user.user_id, "blocked_id": actual_user_id},
                {"blocker_id": actual_user_id, "blocked_id": current_user.user_id},
            ]
        })
        if is_blocked:
            return []

    highlights = await db.story_highlights.find(
        {"user_id": actual_user_id},
        {"_id": 0}
    ).sort("order", 1).to_list(50)
    return highlights


@router.get("/users/{user_id}/highlights/{highlight_id}")
async def get_highlight_detail(user_id: str, highlight_id: str, request: Request):
    """Get a single highlight with its story items (for StoryViewer)."""
    # Resolve user_id or username
    user_doc = await db.users.find_one(
        {"$or": [{"user_id": user_id}, {"username": user_id}]},
        {"_id": 0, "user_id": 1}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    actual_user_id = user_doc["user_id"]

    # Block check
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    if current_user and current_user.user_id != actual_user_id:
        is_blocked = await db.blocked_users.find_one({
            "$or": [
                {"blocker_id": current_user.user_id, "blocked_id": actual_user_id},
                {"blocker_id": actual_user_id, "blocked_id": current_user.user_id},
            ]
        })
        if is_blocked:
            raise HTTPException(status_code=403, detail="Acción no permitida")

    highlight = await db.story_highlights.find_one(
        {"highlight_id": highlight_id, "user_id": actual_user_id},
        {"_id": 0}
    )
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    # Fetch story items from archive (include expired stories for highlights)
    story_ids = _normalize_story_ids(highlight.get("story_ids", []))
    stories = []
    if story_ids:
        raw_stories = await db.hispalostories.find(
            {"story_id": {"$in": story_ids}, "user_id": actual_user_id, "is_hidden": {"$ne": True}},
            {"_id": 0, "story_id": 1, "image_url": 1, "video_url": 1, "caption": 1, "created_at": 1, "likes_count": 1, "views": 1, "overlays": 1, "products": 1}
        ).to_list(len(story_ids))
        # Preserve the order defined in story_ids
        story_map = {s["story_id"]: s for s in raw_stories}
        for sid in story_ids:
            s = story_map.get(sid)
            if s:
                stories.append({
                    "id": s["story_id"],
                    "story_id": s["story_id"],
                    "image_url": s.get("image_url"),
                    "video_url": s.get("video_url"),
                    "caption": s.get("caption", ""),
                    "created_at": s.get("created_at"),
                    "likes_count": s.get("likes_count", 0),
                    "view_count": len(s.get("views") or []),
                    "overlays": s.get("overlays"),
                    "products": s.get("products"),
                })

    return {**highlight, "stories": stories, "items": stories}


@router.post("/users/me/highlights")
async def create_highlight(request: Request, user: User = Depends(get_current_user)):
    """Create a new story highlight group."""
    body = await request.json()
    # Accept both "title" and "name" from frontend
    title = str(body.get("title") or body.get("name") or "").strip()
    if not title or len(title) > 30:
        raise HTTPException(status_code=400, detail="Title required (max 30 chars)")

    cover_url = body.get("cover_url", "")
    story_ids = _normalize_story_ids(body.get("story_ids", []))

    existing = await db.story_highlights.count_documents({"user_id": user.user_id})
    if existing >= 20:
        raise HTTPException(status_code=400, detail="Max 20 highlights allowed")

    highlight_id = f"hl_{uuid.uuid4().hex[:12]}"
    highlight = {
        "highlight_id": highlight_id,
        "user_id": user.user_id,
        "title": title[:30],
        "cover_url": cover_url,
        "story_ids": story_ids,
        "order": existing,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.story_highlights.insert_one(highlight)
    highlight.pop("_id", None)
    return highlight


@router.put("/users/me/highlights/{highlight_id}")
async def update_highlight(highlight_id: str, request: Request, user: User = Depends(get_current_user)):
    """Update a story highlight (title, cover, stories)."""
    body = await request.json()
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "title" in body:
        title = str(body["title"]).strip()
        if not title or len(title) > 30:
            raise HTTPException(status_code=400, detail="Title required (max 30 chars)")
        update["title"] = title[:30]
    if "cover_url" in body:
        update["cover_url"] = body["cover_url"]
    if "story_ids" in body:
        update["story_ids"] = _normalize_story_ids(body["story_ids"])
    if "order" in body:
        update["order"] = _parse_highlight_order(body["order"])

    result = await db.story_highlights.update_one(
        {"highlight_id": highlight_id, "user_id": user.user_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return {"ok": True}


@router.delete("/users/me/highlights/{highlight_id}")
async def delete_highlight(highlight_id: str, user: User = Depends(get_current_user)):
    """Delete a story highlight."""
    result = await db.story_highlights.delete_one(
        {"highlight_id": highlight_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return {"ok": True}


# ── Posts ─────────────────────────────────────────────────────

@router.post("/posts")
async def create_post(
    request: Request,
    caption: str = Form(""),
    location: str = Form(""),
    product_id: str = Form(""),
    tagged_products_json: str = Form(""),
    post_type: str = Form("post"),
    audience: str = Form("public"),
    hide_likes: str = Form(""),
    disable_comments: str = Form(""),
    file: UploadFile = File(None),
    files: List[UploadFile] = File(None),
    user: User = Depends(get_current_user)
):
    """Create a new post. Producers and influencers MUST tag a product."""
    await rate_limiter.check(request, "create_post")
    requested_tags = _normalize_tagged_products(tagged_products_json)
    if product_id and product_id.strip() and not requested_tags:
        requested_tags = [{"product_id": product_id.strip(), "x": 50, "y": 62}]

    requires_product = user.role in ("producer", "importer", "influencer")
    if requires_product and not requested_tags:
        raise HTTPException(status_code=400, detail="Los vendedores e influencers deben vincular un producto a cada post")

    incoming_files = [upload for upload in (files or []) if upload and upload.filename]
    if not incoming_files and file and file.filename:
        incoming_files = [file]
    if len(incoming_files) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 imágenes por publicación")

    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    media = []
    for index, upload in enumerate(incoming_files):
        if not upload.content_type or not upload.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        # Streaming read with size limit to prevent DoS
        chunks = []
        total = 0
        while True:
            chunk = await upload.read(512 * 1024)  # 512KB chunks
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=400, detail="Image size cannot exceed 10MB")
            chunks.append(chunk)
        contents = b"".join(chunks)
        try:
            result = await cloudinary_upload(contents, folder="posts", filename=f"post_{uuid.uuid4().hex[:8]}")
        except Exception as upload_err:
            logger.error(f"[SOCIAL] Cloudinary upload failed for file {index}: {upload_err}")
            raise HTTPException(status_code=502, detail="Image upload failed. Please try again.")
        media.append(
            {
                "url": result["url"],
                "type": "image",
                "order": index,
                "ratio": "1:1",
            }
        )

    image_url = media[0].get("url") if media else None

    if not caption.strip() and not media:
        raise HTTPException(status_code=400, detail="Post must have text or an image")

    # Section 3.5b — sync AI pre-filter (raises 403 on critical block)
    _ai_decision, _ai_summary = await _premoderate(
        user, text=caption, image_urls=[m.get("url") for m in media if m.get("url")],
    )

    tagged_products = await _hydrate_tagged_products(requested_tags)
    tagged_product = tagged_products[0] if tagged_products else None

    # Fetch profile image for denormalization into post doc
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "profile_image": 1, "company_name": 1})
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post = {
        "post_id": post_id,
        "id": post_id,
        "user_id": user.user_id,
        "user_name": (user_doc or {}).get("company_name") or user.name,
        "user_profile_image": (user_doc or {}).get("profile_image"),
        "image_url": image_url,
        "media": media,
        "caption": sanitize_text(caption),
        "location": sanitize_text(location[:120]) if location else "",
        "type": "carousel" if len(media) > 1 or post_type == "carousel" else "post",
        "post_type": "carousel" if len(media) > 1 or post_type == "carousel" else "post",
        "tagged_product": tagged_product,
        "tagged_products": tagged_products,
        "likes_count": 0,
        "comments_count": 0,
        "audience": audience if audience in ("public", "followers") else "public",
        "hide_likes": hide_likes.lower() in ("true", "1"),
        "disable_comments": disable_comments.lower() in ("true", "1"),
        "status": "published",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_posts.insert_one(post)
    # Extract and upsert hashtags from caption
    asyncio.create_task(_upsert_hashtags(_extract_hashtags(caption)))
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
    # Async post-publish moderation (non-blocking)
    asyncio.create_task(_moderate_content_async(
        "user_posts", "post_id", post_id, caption, [m.get("url", "") for m in media if m.get("url")]
    ))

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision == "flag":
        await _post_publish_autoreport(
            "post", post_id, user.user_id,
            (getattr(user, "country", None) or "ES").upper(), _ai_summary,
        )

    return _normalize_post_media({k: v for k, v in post.items() if k != "_id"})


@router.get("/posts")
async def list_posts(skip: int = 0, limit: int = 30, hashtag: Optional[str] = None):
    """List public posts ordered by newest first. Optionally filter by hashtag."""
    query = {
        "$and": [
            {"$or": [{"is_private": {"$ne": True}}, {"is_private": {"$exists": False}}]},
            {"$or": [{"audience": {"$ne": "followers"}}, {"audience": {"$exists": False}}]},
        ]
    }
    if hashtag:
        query["caption"] = {"$regex": f"#{re.escape(hashtag)}", "$options": "i"}
    posts = await db.user_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit + 1).to_list(limit + 1)
    _has_more = len(posts) > limit
    posts = posts[:limit]
    for post in posts:
        _normalize_post_media(post)
        tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
        post["tagged_products"] = tagged_products
        post["tagged_product"] = tagged_products[0] if tagged_products else None
    return {"posts": posts, "total": len(posts), "has_more": _has_more}


@router.get("/posts/{post_id}")
async def get_post(post_id: str, request: Request):
    """Get a single post or reel by id.
    Feed items may be posts (db.user_posts, post_id=post_xxx) or reels (db.reels, reel_id=reel_xxx).
    Deep-linking to /posts/reel_xxx must work, so we fall back to db.reels.
    Sets is_liked and is_saved if caller is authenticated.
    """
    current_user = await get_optional_user(request)

    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0})
    is_reel = False
    if not post and post_id.startswith("reel_"):
        post = await db.reels.find_one({"reel_id": post_id}, {"_id": 0})
        if post:
            # Normalize reel to post shape so the frontend can render it uniformly
            post.setdefault("id", post.get("reel_id"))
            post.setdefault("type", "reel")
            is_reel = True
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Privacy check: private posts only visible to owner or followers
    if post.get("is_private"):
        owner_id = post.get("user_id")
        is_owner = current_user and current_user.user_id == owner_id
        if not is_owner:
            is_follower = False
            if current_user and owner_id:
                is_follower = bool(await db.user_follows.find_one(
                    {"follower_id": current_user.user_id, "following_id": owner_id}
                ))
            if not is_follower:
                raise HTTPException(status_code=404, detail="Post not found")

    _normalize_post_media(post)
    tagged_products = post.get("tagged_products") or ([post["tagged_product"]] if post.get("tagged_product") else [])
    post["tagged_products"] = tagged_products
    post["tagged_product"] = tagged_products[0] if tagged_products else None
    # Enrich with owner user details (name, username, avatar) if not already set
    owner_id = post.get("user_id")
    if owner_id and not post.get("user_name"):
        owner_doc = await db.users.find_one(
            {"user_id": owner_id},
            {"_id": 0, "name": 1, "username": 1, "profile_image": 1, "avatar_url": 1, "role": 1}
        )
        if owner_doc:
            post["user_name"] = owner_doc.get("name") or owner_doc.get("username") or "Usuario"
            post["username"] = owner_doc.get("username")
            post["user_profile_image"] = owner_doc.get("profile_image") or owner_doc.get("avatar_url")
            # Add user object for frontend compatibility
            post["user"] = {
                "id": owner_id,
                "user_id": owner_id,
                "name": post["user_name"],
                "username": owner_doc.get("username"),
                "profile_image": post["user_profile_image"],
                "role": owner_doc.get("role", "customer"),
            }
    # Enrich with auth-aware fields
    if current_user:
        if is_reel:
            liked_doc = await db.reel_likes.find_one({"reel_id": post_id, "user_id": current_user.user_id}, {"_id": 1})
            post["is_liked"] = bool(liked_doc)
            saved_doc = await db.reel_saves.find_one({"reel_id": post_id, "user_id": current_user.user_id}, {"_id": 1})
            post["is_saved"] = bool(saved_doc)
        else:
            liked_doc = await db.post_likes.find_one({"post_id": post_id, "user_id": current_user.user_id}, {"_id": 1})
            post["is_liked"] = bool(liked_doc)
            saved_doc = await db.post_bookmarks.find_one({"post_id": post_id, "user_id": current_user.user_id}, {"_id": 1})
            post["is_saved"] = bool(saved_doc)
    return post


@router.get("/posts/{post_id}/likes")
async def get_post_likes(post_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Get users who liked a post, enriched with name/avatar."""
    current_user = await get_optional_user(request)
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1, "is_private": 1})
    await _check_content_privacy(post, current_user)
    likes = await db.post_likes.find({"post_id": post_id}, {"_id": 0, "user_id": 1, "created_at": 1}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    user_ids = [l["user_id"] for l in likes if l.get("user_id")]
    user_cache = {}
    if user_ids:
        user_docs = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1},
        ).to_list(len(user_ids))
        user_cache = {u["user_id"]: u for u in user_docs}
    enriched = []
    for like in likes:
        u = user_cache.get(like.get("user_id"), {})
        enriched.append({
            "user_id": like.get("user_id"),
            "name": u.get("name", ""),
            "username": u.get("username", ""),
            "profile_image": u.get("profile_image"),
            "created_at": like.get("created_at"),
        })
    return {"likes": enriched}


@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a post or reel.
    Feed items can be posts (db.user_posts, post_id=post_xxx) or reels (db.reels, reel_id=reel_xxx).
    When a reel appears in the feed, the frontend calls this endpoint with the reel_id.
    We detect reels by checking db.reels as fallback.
    """
    post = await db.user_posts.find_one({"post_id": post_id})
    is_reel = False
    if not post:
        # Could be a reel appearing in the feed — check db.reels
        post = await db.reels.find_one({"reel_id": post_id})
        if post:
            is_reel = True
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Privacy check for private content
    if post.get("is_private") and post.get("user_id") != user.user_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": user.user_id, "following_id": post["user_id"]}
        )
        if not is_follower:
            raise HTTPException(status_code=403, detail="Not authorized to interact with this content")

    if is_reel:
        # Delegate to the reel-specific like logic (uses reel_likes collection)
        result = await db.reel_likes.update_one(
            {"reel_id": post_id, "user_id": user.user_id},
            {"$setOnInsert": {"reel_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        if result.upserted_id:
            await db.reels.update_one({"reel_id": post_id}, {"$inc": {"likes_count": 1}})
            await _record_intelligence_signal("content_engagement", {"content_type": "reel", "content_id": post_id, "action": "like"}, user.user_id)
            # Notify reel owner (fire-and-forget, skip self-like)
            owner_id = post.get("user_id") or post.get("author_id")
            if owner_id and owner_id != user.user_id:
                try:
                    now = datetime.now(timezone.utc)
                    await _insert_notification_if_allowed({
                        "user_id": owner_id,
                        "type": "new_like",
                        "title": "Nuevo me gusta",
                        "body": f"A {user.name} le ha gustado tu reel",
                        "action_url": f"/posts/{post_id}",
                        "data": {"liker_id": user.user_id, "liker_name": user.name, "content_id": post_id, "content_type": "reel"},
                        "channels": ["in_app"],
                        "status_by_channel": {"in_app": "sent"},
                        "read_at": None,
                        "created_at": now,
                        "sent_at": now,
                    })
                except Exception:
                    pass
            return {"liked": True}
        await db.reel_likes.delete_one({"reel_id": post_id, "user_id": user.user_id})
        await db.reels.update_one({"reel_id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}

    # Atomic toggle for posts: delete returns count=1 if existed, 0 if not
    result = await db.post_likes.delete_one({"post_id": post_id, "user_id": user.user_id})
    if result.deleted_count > 0:
        await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    # Use update+upsert to prevent duplicate likes from concurrent double-clicks.
    # Only increment if we actually inserted (upserted_id is set); matched means already liked.
    upsert_result = await db.post_likes.update_one(
        {"post_id": post_id, "user_id": user.user_id},
        {"$setOnInsert": {"post_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if not upsert_result.upserted_id:
        return {"liked": True}  # Already liked by a concurrent request — no double-increment
    await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": 1}})
    await _record_intelligence_signal("content_engagement", {"content_type": "post", "content_id": post_id, "action": "like"}, user.user_id)
    # Update feed preferences (fire-and-forget)
    try:
        from services.feed_preferences import update_preferences
        cats = [post.get("category"), post.get("category_id")]
        seller = post.get("author_id") or post.get("user_id")
        await update_preferences(user.user_id, "like", [c for c in cats if c], seller)
    except Exception:
        pass
    # Notify post owner (fire-and-forget, skip self-like)
    owner_id = post.get("user_id") or post.get("author_id")
    if owner_id and owner_id != user.user_id:
        try:
            now = datetime.now(timezone.utc)
            await _insert_notification_if_allowed({
                "user_id": owner_id,
                "type": "new_like",
                "title": "Nuevo me gusta",
                "body": f"A {user.name} le ha gustado tu publicación",
                "action_url": f"/posts/{post_id}",
                "data": {"liker_id": user.user_id, "liker_name": user.name, "content_id": post_id, "content_type": "post"},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
        except Exception:
            pass
    return {"liked": True}


VALID_EMOJIS = ["heart", "laugh", "wow", "clap", "fire"]

@router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, request: Request, user: User = Depends(get_current_user)):
    """Toggle an emoji reaction on a post."""
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1, "is_private": 1})
    await _check_content_privacy(post, user)
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
async def get_post_reactions(post_id: str, request: Request):
    """Get reaction counts and list for a post."""
    current_user = await get_optional_user(request)
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1, "is_private": 1})
    await _check_content_privacy(post, current_user)
    pipeline = [
        {"$match": {"post_id": post_id}},
        {"$group": {"_id": "$emoji", "count": {"$sum": 1}, "users": {"$push": "$user_name"}}},
    ]
    results = await db.post_reactions.aggregate(pipeline).to_list(10)
    counts = {r["_id"]: {"count": r["count"], "users": r["users"][:5]} for r in results}
    return counts


@router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, request: Request, skip: int = 0, limit: int = 50):
    limit = min(limit, 50)  # Cap to prevent unbounded queries
    # Privacy check
    current_user = await get_optional_user(request)
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1, "is_private": 1})
    if post:
        await _check_content_privacy(post, current_user)
    # Section 3.6.6 — F-01: keep soft-deleted comments in the list (preserve thread) but replace
    # the body with a placeholder client-side. Backend returns the `deleted` flag.
    comments = await db.post_comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    is_reel_fallback = False
    if not comments and post_id.startswith("reel_"):
        # Reel appearing in feed — comments are in reel_comments keyed by reel_id
        comments = await db.reel_comments.find({"reel_id": post_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        is_reel_fallback = True

    # Redact soft-deleted bodies (placeholder rendering happens client-side)
    for c in comments:
        if c.get("deleted"):
            c["text"] = ""

    # Hydrate is_liked for all comments (post and reel)
    if current_user and comments:
        comment_ids = [c.get("comment_id") for c in comments if c.get("comment_id")]
        if comment_ids:
            likes_collection = db.reel_comment_likes if is_reel_fallback else db.comment_likes
            liked_rows = await likes_collection.find(
                {"comment_id": {"$in": comment_ids}, "user_id": current_user.user_id},
                {"_id": 0, "comment_id": 1},
            ).to_list(len(comment_ids))
            liked_set = {r["comment_id"] for r in liked_rows}
            for c in comments:
                c["is_liked"] = c.get("comment_id") in liked_set

    # Section 3.5b — PII redaction at READ time on comment text
    try:
        from services.serialization_helpers import redact_public_text, language_for
        for c in comments:
            if isinstance(c.get("text"), str):
                lang = language_for(c.get("user_country") or c.get("country"))
                c["text"] = redact_public_text(c["text"], lang)
    except Exception:
        pass

    return comments


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, request: Request, user: User = Depends(get_current_user)):
    await rate_limiter.check(request, "create_comment")
    post = await db.user_posts.find_one({"post_id": post_id})
    is_reel = False
    if not post and post_id.startswith("reel_"):
        post = await db.reels.find_one({"reel_id": post_id})
        is_reel = bool(post)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.get("disable_comments") and post.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Los comentarios están desactivados en esta publicación")
    # Privacy check: only owner or followers can comment on private content
    if post.get("is_private") and post.get("user_id") != user.user_id:
        is_follower = await db.user_follows.find_one(
            {"follower_id": user.user_id, "following_id": post["user_id"]}
        )
        if not is_follower:
            raise HTTPException(status_code=403, detail="Not authorized to comment on this content")
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")

    # Section 3.5b — sync AI pre-filter (text-only for comments)
    _ai_decision_cm, _ai_summary_cm = await _premoderate(user, text=text)

    reply_to = body.get("reply_to")  # parent comment ID for threading
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "profile_image": 1, "username": 1})
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:10]}",
        "post_id": post_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "username": (user_doc or {}).get("username", ""),
        "user_profile_image": (user_doc or {}).get("profile_image"),
        "text": sanitize_text(text[:500]),
        "reply_to": reply_to if reply_to else None,
        "likes_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if is_reel:
        comment["reel_id"] = post_id
        await db.reel_comments.insert_one(comment)
        await db.reels.update_one({"reel_id": post_id}, {"$inc": {"comments_count": 1}})
    else:
        await db.post_comments.insert_one(comment)
        await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision_cm == "flag":
        await _post_publish_autoreport(
            "comment", comment["comment_id"], user.user_id,
            (getattr(user, "country", None) or "ES").upper(), _ai_summary_cm,
        )

    # Notify content owner (fire-and-forget, skip self-comment)
    owner_id = post.get("user_id") or post.get("author_id")
    if owner_id and owner_id != user.user_id:
        try:
            now = datetime.now(timezone.utc)
            content_type = "reel" if is_reel else "post"
            action_url = f"/posts/{post_id}"
            snippet = comment["text"][:60] + ("…" if len(comment["text"]) > 60 else "")
            await _insert_notification_if_allowed({
                "user_id": owner_id,
                "type": "new_comment",
                "title": "Nuevo comentario",
                "body": f"{user.name} comentó: {snippet}",
                "action_url": action_url,
                "data": {"commenter_id": user.user_id, "commenter_name": user.name, "content_id": post_id, "content_type": content_type, "comment_id": comment["comment_id"]},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
        except Exception:
            pass
    return {k: v for k, v in comment.items() if k != "_id"}


@router.put("/comments/{comment_id}")
async def edit_comment(comment_id: str, request: Request, user: User = Depends(get_current_user)):
    """Edit own comment. Searches post_comments first, then reel_comments.

    Section 3.6.6 — F-01. Returns 404 for non-authors (not 403) to avoid leaking existence.
    Sets edited=True + edited_at for UI badge.
    """
    comment = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0})
    is_reel_comment = False
    if not comment:
        comment = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0})
        is_reel_comment = True
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.get("deleted"):
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        # 404 (not 403) to avoid leaking existence.
        raise HTTPException(status_code=404, detail="Comment not found")
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text required")
    now = datetime.now(timezone.utc).isoformat()
    update_doc = {"$set": {
        "text": sanitize_text(text[:500]),
        "edited": True,
        "edited_at": now,
        "updated_at": now,
    }}
    if is_reel_comment:
        await db.reel_comments.update_one({"comment_id": comment_id}, update_doc)
    else:
        await db.post_comments.update_one({"comment_id": comment_id}, update_doc)
    return {"status": "updated", "edited": True, "edited_at": now}


@router.patch("/comments/{comment_id}")
async def patch_comment(comment_id: str, request: Request, user: User = Depends(get_current_user)):
    """Edit own comment (PATCH alias for PUT /comments/{id}). Section 3.6.6 — F-01."""
    return await edit_comment(comment_id, request, user)


async def _soft_delete_comment(comment_id: str, collection, user: User, post_id: Optional[str] = None):
    """Shared soft-delete logic. Section 3.6.6 — F-01. Returns 404 for non-author."""
    query = {"comment_id": comment_id}
    if post_id and collection is db.post_comments:
        query["post_id"] = post_id
    if post_id and collection is db.reel_comments:
        query["reel_id"] = post_id
    comment = await collection.find_one(query, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.get("deleted"):
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=404, detail="Comment not found")
    now = datetime.now(timezone.utc).isoformat()
    await collection.update_one(
        {"comment_id": comment_id},
        {"$set": {
            "deleted": True,
            "deleted_at": now,
            "updated_at": now,
        }},
    )
    return comment


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_comment_nested(post_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Soft-delete own comment (nested route). Section 3.6.6 — F-01. Preserves thread structure."""
    is_reel = post_id.startswith("reel_")

    if is_reel:
        await _soft_delete_comment(comment_id, db.reel_comments, user, post_id=post_id)
        await db.reels.update_one({"reel_id": post_id}, {"$inc": {"comments_count": -1}})
        return {"status": "deleted"}

    await _soft_delete_comment(comment_id, db.post_comments, user, post_id=post_id)
    await db.user_posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": -1}})
    return {"status": "deleted"}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: User = Depends(get_current_user)):
    """Soft-delete own comment (legacy flat route). Section 3.6.6 — F-01."""
    # Search post_comments first, then reel_comments
    raw = await db.post_comments.find_one({"comment_id": comment_id}, {"_id": 0, "user_id": 1, "post_id": 1, "deleted": 1})
    is_reel_comment = False
    if not raw:
        raw = await db.reel_comments.find_one({"comment_id": comment_id}, {"_id": 0, "user_id": 1, "reel_id": 1, "post_id": 1, "deleted": 1})
        is_reel_comment = True
    if not raw:
        raise HTTPException(status_code=404, detail="Comment not found")
    if raw.get("deleted"):
        raise HTTPException(status_code=404, detail="Comment not found")
    if raw["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=404, detail="Comment not found")
    if is_reel_comment:
        await _soft_delete_comment(comment_id, db.reel_comments, user)
        reel_id = raw.get("reel_id") or raw.get("post_id")
        if reel_id:
            await db.reels.update_one({"reel_id": reel_id}, {"$inc": {"comments_count": -1}})
    else:
        await _soft_delete_comment(comment_id, db.post_comments, user)
        if raw.get("post_id"):
            await db.user_posts.update_one({"post_id": raw["post_id"]}, {"$inc": {"comments_count": -1}})
    return {"status": "deleted"}

@router.get("/users/by-username/{username}")
async def get_user_by_username(username: str):
    """Get public user by username — only public-safe fields returned."""
    clean_username = username.strip().lower().replace(" ", "_")
    user = await db.users.find_one(
        {"username": clean_username},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "role": 1, "bio": 1,
         "profile_image": 1, "picture": 1, "country": 1, "company_name": 1,
         "followers_count": 1, "following_count": 1, "posts_count": 1,
         "interests": 1, "created_at": 1, "niche": 1, "social_links": 1,
         "verified": 1, "approved": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Compute posts_count live (includes reels) instead of stale stored value
    uid = user.get("user_id", "")
    user_posts_count = await db.user_posts.count_documents({"user_id": uid})
    reels_only_count = await db.reels.count_documents({"user_id": uid})
    reels_in_user_posts = await db.user_posts.count_documents({"user_id": uid, "$or": [{"type": "reel"}, {"is_reel": True}]})
    reels_exclusive = max(0, reels_only_count - reels_in_user_posts)
    live_posts_count = user_posts_count + reels_exclusive
    return {
        "user_id": uid,
        "name": user.get("name"),
        "username": user.get("username"),
        "role": user.get("role"),
        "bio": user.get("bio", ""),
        "profile_image": user.get("profile_image") or user.get("picture"),
        "picture": user.get("picture"),
        "country": user.get("country"),
        "company_name": user.get("company_name"),
        "followers_count": user.get("followers_count", 0),
        "following_count": user.get("following_count", 0),
        "posts_count": live_posts_count,
        "interests": user.get("interests", []),
        "created_at": user.get("created_at"),
        "niche": user.get("niche"),
        "social_links": user.get("social_links", {}),
        "is_verified": bool(user.get("verified") or user.get("approved")),
    }


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

# DELETE /users/me/account REMOVED — use DELETE /account/delete (customer.py) instead.
# The customer.py version requires email confirmation, preserves order history,
# and does role-aware cleanup (producer products, influencer commissions, etc.).



@router.post("/posts/{post_id}/bookmark")
async def toggle_bookmark(post_id: str, user: User = Depends(get_current_user)):
    post = await db.user_posts.find_one({"post_id": post_id})
    if not post and post_id.startswith("reel_"):
        reel = await db.reels.find_one({"reel_id": post_id}, {"_id": 0, "user_id": 1, "is_private": 1})
        await _check_content_privacy(reel, user)
        reel_result = await db.reel_saves.find_one({"reel_id": post_id, "user_id": user.user_id})
        if reel_result:
            await db.reel_saves.delete_one({"reel_id": post_id, "user_id": user.user_id})
            return {"bookmarked": False}
        await db.reel_saves.insert_one({"reel_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"bookmarked": True}
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await _check_content_privacy(post, user)
    existing = await db.post_bookmarks.find_one({"post_id": post_id, "user_id": user.user_id})
    if existing:
        await db.post_bookmarks.delete_one({"post_id": post_id, "user_id": user.user_id})
        return {"bookmarked": False}
    await db.post_bookmarks.insert_one({"post_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
    await _record_intelligence_signal("recipe_save", {"content_type": "post", "content_id": post_id}, user.user_id)
    # Update feed preferences
    try:
        from services.feed_preferences import update_preferences
        cats = [post.get("category"), post.get("category_id")]
        seller = post.get("author_id") or post.get("user_id")
        await update_preferences(user.user_id, "save", [c for c in cats if c], seller)
    except Exception:
        pass
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


@router.patch("/posts/{post_id}")
async def update_post(post_id: str, request: Request, user: User = Depends(get_current_user)):
    """Update a post's caption or location. Only the owner can edit."""
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    body = await request.json()
    update_fields = {}
    if "caption" in body:
        update_fields["caption"] = sanitize_text(str(body["caption"])[:2200])
        update_fields["edited"] = True
    if "location" in body:
        update_fields["location"] = sanitize_text(str(body["location"])[:120])

    if not update_fields:
        raise HTTPException(status_code=400, detail="Nothing to update")

    await db.user_posts.update_one({"post_id": post_id}, {"$set": update_fields})
    return {"status": "updated", **update_fields}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: User = Depends(get_current_user)):
    post = await db.user_posts.find_one({"post_id": post_id}, {"_id": 0, "user_id": 1, "media": 1, "image_url": 1, "video_url": 1, "images": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    # Clean Cloudinary assets before deleting document
    try:
        from services.cloudinary_storage import cleanup_urls
        media_urls = [m.get("url") if isinstance(m, dict) else m for m in (post.get("media") or post.get("images") or [])]
        if post.get("image_url"):
            media_urls.append(post["image_url"])
        rtype = "video" if post.get("video_url") else "image"
        if post.get("video_url"):
            media_urls.append(post["video_url"])
        await cleanup_urls(media_urls, rtype)
    except Exception as e:
        logger.warning(f"[POST_DELETE] Cloudinary cleanup failed for {post_id}: {e}")

    await db.user_posts.delete_one({"post_id": post_id})
    await db.post_likes.delete_many({"post_id": post_id})
    await db.post_comments.delete_many({"post_id": post_id})
    await db.comment_likes.delete_many({"post_id": post_id})
    await db.post_bookmarks.delete_many({"post_id": post_id})
    await db.post_reactions.delete_many({"post_id": post_id})
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
    except Exception as exc:
        logger.warning(f"[SOCIAL] Failed to resolve optional user for /feed: {exc}")
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
        # Limit to recent posts (7 days) to avoid loading entire collection
        feed_since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        feed_query = {**base_query, "created_at": {"$gte": feed_since}}
        posts_cursor = db.user_posts.find(feed_query, {"_id": 0}).sort("created_at", -1).limit(200)
        all_posts = await posts_cursor.to_list(200)
        # If too few recent posts, extend to 30 days
        if len(all_posts) < limit * 2:
            feed_since_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            feed_query_30d = {**base_query, "created_at": {"$gte": feed_since_30d}}
            all_posts = await db.user_posts.find(feed_query_30d, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
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
    product_ids = set(
        (p.get("tagged_product") if isinstance(p.get("tagged_product"), str) else (p.get("tagged_product") or {}).get("product_id"))
        for p in all_posts if p.get("tagged_product")
    )
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
                pid = product if isinstance(product, str) else product.get("product_id")
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
                pid = product if isinstance(product, str) else product.get("product_id")
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
            except (ValueError, TypeError, KeyError):
                pass
            scored_posts.append((score, post, is_available))

        scored_posts.sort(key=lambda x: x[0], reverse=True)
        page_posts = [(p, avail) for _, p, avail in scored_posts[skip:skip + limit]]
        total = len(scored_posts)

    # --- Batch fetch to eliminate N+1 queries ---
    all_uids = list({p.get("user_id", "") for p, _ in page_posts if p.get("user_id")})
    all_product_ids = list({
        (p.get("tagged_product") if isinstance(p.get("tagged_product"), str) else (p.get("tagged_product") or {}).get("product_id"))
        for p, _ in page_posts
        if p.get("tagged_product")
    } - {None})
    all_post_ids = [p["post_id"] for p, _ in page_posts if p.get("post_id")]

    # Batch fetch users
    user_cache = {}
    if all_uids:
        user_docs = await db.users.find(
            {"user_id": {"$in": all_uids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "role": 1, "country": 1}
        ).to_list(100)
        user_cache = {u["user_id"]: u for u in user_docs}

    # Batch fetch products
    product_cache = {}
    if all_product_ids:
        prod_docs = await db.products.find(
            {"product_id": {"$in": all_product_ids}},
            {"_id": 0, "product_id": 1, "price": 1, "stock": 1, "images": 1, "name": 1, "track_stock": 1}
        ).to_list(100)
        product_cache = {p.get("product_id", ""): p for p in prod_docs}

    # Batch fetch reviews aggregated by product
    review_cache = {}
    if all_product_ids:
        rev_agg = await db.reviews.aggregate([
            {"$match": {"product_id": {"$in": all_product_ids}, "visible": True}},
            {"$group": {"_id": "$product_id", "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
        ]).to_list(100)
        review_cache = {r["_id"]: r for r in rev_agg}

    # Batch fetch likes and bookmarks for current user
    liked_set = set()
    bookmarked_set = set()
    if current_user and all_post_ids:
        liked_docs = await db.post_likes.find(
            {"post_id": {"$in": all_post_ids}, "user_id": current_user.user_id},
            {"_id": 0, "post_id": 1}
        ).to_list(100)
        liked_set = {d["post_id"] for d in liked_docs}

        bookmarked_docs = await db.post_bookmarks.find(
            {"post_id": {"$in": all_post_ids}, "user_id": current_user.user_id},
            {"_id": 0, "post_id": 1}
        ).to_list(100)
        bookmarked_set = {d["post_id"] for d in bookmarked_docs}

    enriched = []
    for post, post_available in page_posts:
        uid = post.get("user_id", "")
        ui = user_cache.get(uid, {})
        tagged = post.get("tagged_product")
        if tagged and tagged.get("product_id"):
            pid = tagged["product_id"]
            live = product_cache.get(pid)
            if live:
                tagged["price"] = live.get("price", tagged.get("price", 0))
                tagged["stock"] = live.get("stock", 0)
                tagged["in_stock"] = live.get("stock", 0) > 0 if live.get("track_stock", True) else True
                tagged["image"] = (live.get("images") or [tagged.get("image")])[0]
                tagged["name"] = live.get("name", tagged.get("name", ""))
            rev = review_cache.get(pid)
            if rev:
                tagged["avg_rating"] = round(rev["avg_rating"], 1)
                tagged["review_count"] = rev["count"]
        post_id = post.get("post_id", "")
        user_obj = {
            "id": uid,
            "user_id": uid,
            "name": ui.get("name", post.get("user_name", "Usuario")),
            "username": ui.get("username") or post.get("username"),
            "profile_image": ui.get("profile_image") or post.get("user_profile_image"),
            "role": ui.get("role", post.get("user_role", "customer")),
            "country": ui.get("country", post.get("user_country")),
        }
        enriched.append({
            **post,
            "user": user_obj,
            "user_name": user_obj["name"],
            "username": user_obj["username"],
            "user_profile_image": user_obj["profile_image"],
            "user_role": user_obj["role"],
            "user_country": user_obj["country"],
            "is_liked": post_id in liked_set,
            "is_bookmarked": post_id in bookmarked_set,
            "product_available_in_country": post_available,
        })

    return {"posts": enriched, "total": total, "has_more": (skip + limit) < total}


@router.get("/feed/trending")
async def get_trending_posts(request: Request, limit: int = 5):
    try:
        current_user = await get_optional_user(request)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Failed to resolve optional user for /feed/trending: {exc}")
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

    post_ids = [post.get("post_id") for post in posts if post.get("post_id")]
    user_ids = list({post.get("user_id") for post in posts if post.get("user_id")})

    user_cache = {}
    if user_ids:
        user_docs = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "role": 1},
        ).to_list(len(user_ids))
        user_cache = {user.get("user_id", ""): user for user in user_docs}

    liked_post_ids = set()
    bookmarked_post_ids = set()
    if current_user and post_ids:
        liked_rows = await db.post_likes.find(
            {"post_id": {"$in": post_ids}, "user_id": current_user.user_id},
            {"_id": 0, "post_id": 1},
        ).to_list(len(post_ids))
        liked_post_ids = {row.get("post_id") for row in liked_rows if row.get("post_id")}

        bookmarked_rows = await db.post_bookmarks.find(
            {"post_id": {"$in": post_ids}, "user_id": current_user.user_id},
            {"_id": 0, "post_id": 1},
        ).to_list(len(post_ids))
        bookmarked_post_ids = {row.get("post_id") for row in bookmarked_rows if row.get("post_id")}

    enriched = []
    for post in posts:
        uid = post.get("user_id", "")
        ui = user_cache.get(uid, {})
        post_id = post.get("post_id")
        is_liked = post_id in liked_post_ids if current_user and post_id else False
        is_bookmarked = post_id in bookmarked_post_ids if current_user and post_id else False
        user_obj = {
            "id": uid,
            "user_id": uid,
            "name": ui.get("name", "Usuario"),
            "username": ui.get("username") or post.get("username"),
            "profile_image": ui.get("profile_image"),
            "role": ui.get("role", "customer"),
        }
        enriched.append({
            **post,
            "user": user_obj,
            "user_name": user_obj["name"],
            "username": user_obj["username"],
            "user_profile_image": user_obj["profile_image"],
            "user_role": user_obj["role"],
            "is_liked": is_liked,
            "is_bookmarked": is_bookmarked
        })
    return {"posts": enriched}


@router.get("/post-products/search")
async def search_products_for_tagging(q: str = "", limit: int = 5, user: User = Depends(get_current_user)):
    query = {"status": "approved"}
    if user.role in {"producer", "importer"}:
        query["producer_id"] = user.user_id
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    products = await db.products.find(query, {"_id": 0, "product_id": 1, "name": 1, "price": 1, "currency": 1, "images": 1}).limit(limit).to_list(limit)
    return [{"product_id": p.get("product_id", ""), "name": p.get("name", ""), "price": p.get("price", 0), "currency": p.get("currency", "EUR"), "image": (p.get("images") or [None])[0]} for p in products]


# ── Autocomplete: hashtags + users ────────────────────────────

@router.get("/hashtags/search")
async def search_hashtags(q: str = Query("", min_length=1), limit: int = Query(6, ge=1, le=10)):
    """Hashtags que empiezan por q, ordenados por post_count descendente."""
    results = await db.hashtags.find(
        {"name": {"$regex": f"^{re.escape(q.lower())}", "$options": "i"}},
    ).sort("post_count", -1).limit(limit).to_list(limit)
    return [{"name": r.get("name", ""), "post_count": r.get("post_count", 0)} for r in results]


@router.get("/hashtags/suggest")
async def suggest_hashtags(q: str = Query("", min_length=1), limit: int = Query(5, ge=1, le=10)):
    """Suggest hashtags for autocomplete in creator caption."""
    results = await db.hashtags.find(
        {"name": {"$regex": f"^{re.escape(q.lower())}", "$options": "i"}},
    ).sort("post_count", -1).limit(limit).to_list(limit)
    return {"suggestions": [{"tag": r.get("name", ""), "posts_count": r.get("post_count", 0)} for r in results]}


@router.get("/hashtags/trending")
async def get_trending_hashtags(country: Optional[str] = None, limit: int = Query(10, ge=1, le=30)):
    """Top hashtags by velocity score (trending) or post_count."""
    results = await db.hashtags.find(
        {"post_count": {"$gt": 0}},
    ).sort([("velocity_score", -1), ("post_count", -1)]).limit(limit).to_list(limit)
    return {"hashtags": [{"tag": r.get("name", ""), "slug": r.get("slug", r.get("name", "")), "posts_count": r.get("post_count", 0), "velocity_score": r.get("velocity_score", 0)} for r in results]}


@router.get("/hashtags/{slug}")
async def get_hashtag_detail(slug: str, request: Request):
    """Get hashtag info + follow status."""
    tag = await db.hashtags.find_one({"name": slug.lower()}, {"_id": 0})
    if not tag:
        return {"tag": slug.lower(), "slug": slug.lower(), "posts_count": 0, "is_trending": False, "is_followed": False}
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None
    is_followed = False
    if current_user:
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "followed_hashtags": 1})
        is_followed = slug.lower() in (user_doc.get("followed_hashtags") or [])
    return {"tag": tag.get("name"), "slug": tag.get("slug", tag.get("name")), "posts_count": tag.get("post_count", 0), "is_trending": tag.get("velocity_score", 0) > 1.5, "is_followed": is_followed}


@router.get("/hashtags/{slug}/products")
async def get_hashtag_products(slug: str, limit: int = Query(10, ge=1, le=20)):
    """Products that have this hashtag in their tags."""
    products = await db.products.find(
        {"tags": {"$regex": slug.lower(), "$options": "i"}, "status": {"$nin": ["suspended_by_admin", "deleted", "rejected"]}},
        {"_id": 0, "product_id": 1, "name": 1, "slug": 1, "images": 1, "price": 1}
    ).limit(limit).to_list(limit)
    return products


@router.get("/users/me/followed-hashtags")
async def get_followed_hashtags(user: User = Depends(get_current_user)):
    """Get list of hashtags the user follows."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "followed_hashtags": 1})
    tags = user_doc.get("followed_hashtags") or [] if user_doc else []
    return [{"tag": t} for t in tags]


@router.post("/users/me/followed-hashtags")
async def follow_hashtag(request: Request, user: User = Depends(get_current_user)):
    """Follow a hashtag."""
    body = await request.json()
    tag = (body.get("tag") or "").lower().strip()
    if not tag:
        from fastapi import HTTPException
        raise HTTPException(400, "tag required")
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$addToSet": {"followed_hashtags": tag}}
    )
    return {"status": "followed", "tag": tag}


@router.delete("/users/me/followed-hashtags/{tag}")
async def unfollow_hashtag(tag: str, user: User = Depends(get_current_user)):
    """Unfollow a hashtag."""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$pull": {"followed_hashtags": tag.lower()}}
    )
    return {"status": "unfollowed", "tag": tag}


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
    except Exception as exc:
        logger.warning(f"[SOCIAL] Failed to resolve optional user for /discover/profiles: {exc}")
        current_user = None
    query = {}
    if role and role != "all":
        query["role"] = role
    else:
        query["role"] = {"$in": ["customer", "producer", "importer", "influencer"]}
    if search:
        query["name"] = {"$regex": re.escape(search), "$options": "i"}
    try:
        users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.users.count_documents(query)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Mongo unavailable for /discover/profiles, fallback to PostgreSQL: {exc}")
        return await _fallback_discover_from_postgres(role=role, search=search, skip=skip, limit=limit)

    # Batch load all user_ids and emails
    user_ids = [u.get("user_id", "") for u in users]
    emails = [u.get("email", "").lower() for u in users if u.get("role") == "influencer"]

    # Batch followers count
    followers_counts = {r["_id"]: r["count"] for r in await db.user_follows.aggregate([
        {"$match": {"following_id": {"$in": user_ids}}},
        {"$group": {"_id": "$following_id", "count": {"$sum": 1}}}
    ]).to_list(len(user_ids))}

    # Batch posts count (user_posts collection)
    posts_counts = {r["_id"]: r["count"] for r in await db.user_posts.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(len(user_ids))}

    # Batch reels count (reels collection) — reels are stored separately
    reels_counts = {r["_id"]: r["count"] for r in await db.reels.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(len(user_ids))}

    # Batch reels already in user_posts (to avoid double counting)
    reels_in_posts_counts = {r["_id"]: r["count"] for r in await db.user_posts.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "$or": [{"type": "reel"}, {"is_reel": True}]}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(len(user_ids))}

    # Batch is_following (if logged in)
    is_following_map = {}
    if current_user:
        following = await db.user_follows.find({
            "follower_id": current_user.user_id,
            "following_id": {"$in": user_ids}
        }, {"following_id": 1, "_id": 0}).to_list(len(user_ids))
        is_following_map = {f["following_id"]: True for f in following}

    # Batch influencer info
    influencer_info = {}
    if emails:
        inf_docs = await db.influencers.find({"email": {"$in": emails}}, {"_id": 0, "email": 1, "niche": 1, "followers": 1}).to_list(len(emails))
        influencer_info = {d["email"]: {"niche": d.get("niche"), "social_followers": d.get("followers")} for d in inf_docs}

    # Batch store info for producers/importers
    store_info = {}
    store_user_ids = [u.get("user_id", "") for u in users if u.get("role") in {"producer", "importer"}]
    if store_user_ids:
        store_docs = await db.stores.find({"user_id": {"$in": store_user_ids}}, {"_id": 0, "user_id": 1, "store_name": 1, "location": 1, "store_slug": 1}).to_list(len(store_user_ids))
        store_info = {d["user_id"]: {"store_name": d.get("store_name"), "store_location": d.get("location"), "store_slug": d.get("store_slug")} for d in store_docs}

    profiles = []
    for u in users:
        uid = u.get("user_id", "")
        fc = followers_counts.get(uid, 0)
        # Total publications = user_posts + reels exclusive to db.reels (not already in user_posts)
        reels_exclusive = max(0, reels_counts.get(uid, 0) - reels_in_posts_counts.get(uid, 0))
        pc = posts_counts.get(uid, 0) + reels_exclusive
        is_following = is_following_map.get(uid, False)
        extra = {}
        if u.get("role") == "influencer":
            extra = influencer_info.get(u.get("email", "").lower(), {})
        elif u.get("role") in {"producer", "importer"}:
            extra = store_info.get(uid, {})
        profiles.append({
            "user_id": uid,
            "name": u.get("name", "Usuario"),
            "username": u.get("username"),
            "profile_image": u.get("profile_image"),
            "bio": u.get("bio", ""),
            "role": u.get("role"),
            "followers_count": fc,
            "posts_count": pc,
            "is_following": is_following,
            "created_at": u.get("created_at"),
            **extra
        })
    return {"profiles": profiles, "total": total}


# ── Profile Update ────────────────────────────────────────────

@router.patch("/users/me")
async def patch_user_me(request: Request, user: User = Depends(get_current_user)):
    """Update current user profile fields and/or mark onboarding as completed."""
    body = await request.json()
    update_fields = {}

    # Profile fields
    name = body.get("display_name") or body.get("name")
    if name and str(name).strip():
        update_fields["name"] = sanitize_text(str(name).strip()[:50])
    if "bio" in body:
        update_fields["bio"] = sanitize_text(str(body["bio"])[:300])
    if "location" in body:
        update_fields["location"] = sanitize_text(str(body["location"])[:100])
    if "food_preferences" in body and isinstance(body["food_preferences"], list):
        update_fields["food_preferences"] = [str(p)[:50] for p in body["food_preferences"][:20]]
    if "interests" in body and isinstance(body["interests"], list):
        update_fields["interests"] = [str(i)[:50] for i in body["interests"][:20]]

    # Section 3.6.2b — importers can opt in/out of B2C selling. Only honoured
    # for users with the importer role; ignored silently otherwise so the
    # endpoint stays role-agnostic.
    if "has_b2c_store" in body and getattr(user, "role", None) == "importer":
        update_fields["has_b2c_store"] = bool(body["has_b2c_store"])

    # Onboarding completion — require email verification for customers
    if body.get("onboarding_completed") is True:
        if getattr(user, "role", None) == "customer":
            user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email_verified": 1})
            if not (user_doc or {}).get("email_verified"):
                raise HTTPException(status_code=400, detail="Debes verificar tu email antes de completar el onboarding")
        update_fields["onboarding_completed"] = True
        update_fields["onboarding_completed_at"] = datetime.now(timezone.utc).isoformat()

    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_fields})

    return {"status": "ok"}


@router.post("/users/update-profile")
async def update_user_profile_data(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    update_fields = {}
    if "bio" in body:
        update_fields["bio"] = sanitize_text(body["bio"][:300])
    if "profile_image" in body:
        update_fields["profile_image"] = body["profile_image"]
    if "name" in body:
        update_fields["name"] = sanitize_text(body["name"][:50])
    if update_fields:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_fields})
    return {"status": "ok"}


@router.post("/users/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    MAX_AVATAR_SIZE = 5 * 1024 * 1024
    chunks = []
    total = 0
    while True:
        chunk = await file.read(512 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_AVATAR_SIZE:
            raise HTTPException(status_code=400, detail="Image size cannot exceed 5MB")
        chunks.append(chunk)
    contents = b"".join(chunks)
    result = await cloudinary_upload(contents, folder="avatars", filename=f"avatar_{user.user_id}")
    image_url = result["url"]
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"profile_image": image_url, "picture": image_url}})
    return {"image_url": image_url}



# ── Hispalostories (24h ephemeral stories) ────────────────────

@router.post("/stories")
async def create_story(
    request: Request,
    file: UploadFile = File(...),
    caption: str = Form(""),
    location: str = Form(""),
    overlays_json: str = Form(""),
    products_json: str = Form(""),
    filter_css: str = Form(""),
    user: User = Depends(get_current_user)
):
    """Upload a story that auto-expires after 24h."""
    await rate_limiter.check(request, "create_story")
    allowed_prefixes = ('image/', 'video/')
    if not file.content_type or not any(file.content_type.startswith(p) for p in allowed_prefixes):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes y vídeos")
    contents = await file.read()
    is_video = file.content_type.startswith("video/")
    max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024  # 50MB video, 10MB image
    if len(contents) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"El archivo no puede superar {limit_mb} MB")
    resource_type = "video" if is_video else "image"
    if resource_type == "video":
        result = await cloudinary_upload_video(contents, folder="stories", filename=f"story_{uuid.uuid4().hex[:8]}")
    else:
        result = await cloudinary_upload(contents, folder="stories", filename=f"story_{uuid.uuid4().hex[:8]}")
    image_url = result["url"]

    # Section 3.5b — sync AI pre-filter on caption + image (videos: caption only)
    _ai_decision_st, _ai_summary_st = await _premoderate(
        user, text=caption, image_urls=[image_url] if resource_type == "image" else None,
    )

    story_user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "profile_image": 1, "company_name": 1})
    story_id = f"story_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    story = {
        "story_id": story_id,
        "user_id": user.user_id,
        "user_name": (story_user_doc or {}).get("company_name") or user.name,
        "user_profile_image": (story_user_doc or {}).get("profile_image"),
        "image_url": image_url if resource_type == "image" else None,
        "video_url": image_url if resource_type == "video" else None,
        "caption": sanitize_text(caption[:200]) if caption else "",
        "location": sanitize_text(location[:120]) if location else "",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "views": [],
        "likes_count": 0,
        "replies_count": 0,
        "is_hidden": False,
    }
    # Store CSS filter if provided (for video stories — image stories bake the filter into the image)
    if filter_css and isinstance(filter_css, str) and filter_css.strip():
        story["filter_css"] = sanitize_text(filter_css.strip()[:200])
    # Parse and store overlay metadata (text, stickers, draws for video stories)
    if overlays_json:
        try:
            overlays_data = json.loads(overlays_json) if isinstance(overlays_json, str) else overlays_json
            # Sanitize text overlay content to prevent XSS
            if isinstance(overlays_data, dict):
                for t in overlays_data.get("texts", []):
                    if isinstance(t, dict) and "text" in t:
                        t["text"] = sanitize_text(t["text"][:500])
                for s in overlays_data.get("stickers", []):
                    if isinstance(s, dict) and "content" in s:
                        s["content"] = sanitize_text(str(s["content"])[:200])
            story["overlays"] = overlays_data
        except Exception:
            story["overlays"] = {}
    # Parse and store product sticker references
    if products_json:
        try:
            products = json.loads(products_json) if isinstance(products_json, str) else products_json
            story["products"] = products if isinstance(products, list) else []
        except Exception:
            story["products"] = []
    await db.hispalostories.insert_one(story)
    asyncio.create_task(_upsert_hashtags(_extract_hashtags(caption or "")))

    # Async post-publish moderation (non-blocking)
    asyncio.create_task(_moderate_content_async(
        "hispalostories", "story_id", story.get("story_id", ""), caption or "", [story.get("media_url", "")]
    ))

    # Section 3.5b — auto-report if AI flagged but did not block
    if _ai_decision_st == "flag":
        await _post_publish_autoreport(
            "story", story_id, user.user_id,
            (getattr(user, "country", None) or "ES").upper(), _ai_summary_st,
        )

    return {k: v for k, v in story.items() if k != "_id"}


@router.get("/stories")
async def get_stories_feed(request: Request):
    """Get active stories grouped by user (not expired)."""
    try:
        current_user = await get_optional_user(request)
    except Exception as exc:
        logger.warning(f"[SOCIAL] Failed to resolve optional user for /stories: {exc}")
        current_user = None
    now = datetime.now(timezone.utc).isoformat()

    # Get blocked user IDs
    blocked_ids: set = set()
    if current_user:
        blocked_docs = await db.blocked_users.find(
            {"$or": [{"blocker_id": current_user.user_id}, {"blocked_id": current_user.user_id}]},
            {"_id": 0, "blocker_id": 1, "blocked_id": 1},
        ).to_list(500)
        for bd in blocked_docs:
            blocked_ids.add(bd.get("blocker_id"))
            blocked_ids.add(bd.get("blocked_id"))
        blocked_ids.discard(current_user.user_id)

    # Get all non-expired stories (exclude blocked users)
    story_query = {"expires_at": {"$gt": now}, "is_hidden": {"$ne": True}}
    if blocked_ids:
        story_query["user_id"] = {"$nin": list(blocked_ids)}
    try:
        active_stories = await db.hispalostories.find(
            story_query,
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

    user_ids = list(user_stories.keys())
    user_cache = {}
    if user_ids:
        user_docs = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1, "role": 1},
        ).to_list(len(user_ids))
        user_cache = {user.get("user_id", ""): user for user in user_docs}

    # Enrich with user info
    result = []
    for uid, stories in user_stories.items():
        u = user_cache.get(uid)
        if not u:
            continue
        is_own = current_user and current_user.user_id == uid
        result.append({
            "user_id": uid,
            "username": u.get("username"),
            "user_name": u.get("name", ""),
            "profile_image": u.get("profile_image"),
            "role": u.get("role", "customer"),
            "is_own": is_own,
            "stories": stories,
        })

    # Put own stories first, then others newest-first
    # key=(is_own, created_at) with reverse=True: True > False so own comes first;
    # for same is_own group, later dates sort higher → newest-first.
    if current_user:
        result.sort(key=lambda x: (x["is_own"], x["stories"][0]["created_at"]), reverse=True)

    return result


@router.get("/stories/archive")
async def get_story_archive(user: User = Depends(get_current_user)):
    """Get current user's past stories (for highlight creation)."""
    stories = await db.hispalostories.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    for s in stories:
        s["view_count"] = len(s.get("views", []))
        s.pop("views", None)
    return stories


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


@router.get("/stories/{user_id}")
async def get_user_stories(user_id: str, request: Request):
    """Get active stories for a specific user (used by StoryViewer)."""
    now = datetime.now(timezone.utc).isoformat()
    # Resolve username → user_id if needed
    if not user_id.startswith("user_"):
        user_doc = await db.users.find_one(
            {"$or": [{"user_id": user_id}, {"username": user_id}]},
            {"_id": 0, "user_id": 1}
        )
        if user_doc:
            user_id = user_doc["user_id"]

    # Check blocking before returning stories
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    if current_user and current_user.user_id != user_id:
        is_blocked = await db.blocked_users.find_one({
            "$or": [
                {"blocker_id": current_user.user_id, "blocked_id": user_id},
                {"blocker_id": user_id, "blocked_id": current_user.user_id},
            ]
        })
        if is_blocked:
            return []

    stories = await db.hispalostories.find(
        {"user_id": user_id, "expires_at": {"$gt": now}, "is_hidden": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", 1).to_list(50)  # oldest-first so viewer plays in posting order

    # Batch-check which stories the current user has liked (single query)
    liked_story_ids: set = set()
    if current_user and stories:
        all_story_ids = [s.get("story_id") for s in stories if s.get("story_id")]
        liked_docs = await db.story_likes.find(
            {"story_id": {"$in": all_story_ids}, "user_id": current_user.user_id},
            {"_id": 0, "story_id": 1},
        ).to_list(len(all_story_ids))
        liked_story_ids = {d["story_id"] for d in liked_docs}

    result = []
    for s in stories:
        views = s.pop("views", []) or []
        s["view_count"] = len(views)
        s["is_seen"] = (current_user.user_id in views) if current_user else False
        s["is_liked"] = s.get("story_id") in liked_story_ids
        result.append(s)

    return result


@router.post("/stories/{story_id}/view")
async def view_story(story_id: str, request: Request):
    """Mark a story as viewed."""
    try:
        current_user = await get_optional_user(request)
    except Exception:
        return {"status": "ok"}
    if not current_user:
        return {"status": "ok"}
    await db.hispalostories.update_one(
        {"story_id": story_id},
        {"$addToSet": {"views": current_user.user_id}}
    )
    return {"status": "ok"}


@router.post("/stories/{story_id}/like")
async def like_story(story_id: str, user: User = Depends(get_current_user)):
    """Toggle like on a story. Uses atomic upsert to prevent race-condition double-likes."""
    # Block check — prevent likes from/to blocked users
    story_doc = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "user_id": 1})
    if story_doc:
        owner_id = story_doc.get("user_id")
        if owner_id and owner_id != user.user_id:
            is_blocked = await db.blocked_users.find_one({
                "$or": [
                    {"blocker_id": owner_id, "blocked_id": user.user_id},
                    {"blocker_id": user.user_id, "blocked_id": owner_id},
                ]
            })
            if is_blocked:
                raise HTTPException(status_code=403, detail="Acción no permitida")

    # Try to delete first — if it existed, this is an unlike
    result = await db.story_likes.delete_one({"story_id": story_id, "user_id": user.user_id})
    if result.deleted_count > 0:
        await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"likes_count": -1}})
        liked = False
    else:
        # Atomic upsert: only insert once even under concurrent requests
        upsert_result = await db.story_likes.update_one(
            {"story_id": story_id, "user_id": user.user_id},
            {"$setOnInsert": {"story_id": story_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        if upsert_result.upserted_id:
            await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"likes_count": 1}})
        liked = True

    # Re-fetch fresh likes_count after toggle
    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "likes_count": 1})
    if liked:
        owner_id = (story_doc or {}).get("user_id")
        if owner_id and owner_id != user.user_id:
            try:
                from services.notifications.dispatcher_service import notification_dispatcher
                sender_name = getattr(user, "name", None) or getattr(user, "username", None) or "Alguien"
                asyncio.create_task(notification_dispatcher.send_notification(
                    user_id=owner_id,
                    title="Nueva reacción",
                    body=f"{sender_name} ha reaccionado a tu historia",
                    notification_type="story_like",
                    channels=["in_app", "push"],
                    data={"story_id": story_id, "from_user_id": user.user_id},
                    action_url="/notifications",
                ))
            except Exception:
                pass
    return {"liked": liked, "likes_count": (story or {}).get("likes_count", 0)}


@router.post("/stories/{story_id}/reply")
async def reply_story(story_id: str, request: Request, user: User = Depends(get_current_user)):
    """Reply to a story (stored for the owner)."""
    body = await request.json()
    message = (body.get("message") or body.get("text") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje de respuesta es obligatorio")

    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "user_id": 1})
    if not story:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    # Block check — prevent replies from/to blocked users
    owner_id = story.get("user_id")
    if owner_id and owner_id != user.user_id:
        is_blocked = await db.blocked_users.find_one({
            "$or": [
                {"blocker_id": owner_id, "blocked_id": user.user_id},
                {"blocker_id": user.user_id, "blocked_id": owner_id},
            ]
        })
        if is_blocked:
            raise HTTPException(status_code=403, detail="Acción no permitida")

    reply = {
        "reply_id": f"srep_{uuid.uuid4().hex[:10]}",
        "story_id": story_id,
        "story_owner_id": story.get("user_id"),
        "user_id": user.user_id,
        "user_name": getattr(user, "name", None) or getattr(user, "username", None) or "Usuario",
        "user_profile_image": getattr(user, "profile_image", None),
        "message": sanitize_text(message[:500]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.story_replies.insert_one(reply)
    await db.hispalostories.update_one({"story_id": story_id}, {"$inc": {"replies_count": 1}})
    # Block was already checked above — safe to send notification
    if owner_id and owner_id != user.user_id:
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            sender_name = getattr(user, "name", None) or getattr(user, "username", None) or "Alguien"
            asyncio.create_task(notification_dispatcher.send_notification(
                user_id=owner_id,
                title="Nueva respuesta",
                body=f"{sender_name} ha respondido a tu historia",
                notification_type="story_reply",
                channels=["in_app", "push"],
                data={"story_id": story_id, "from_user_id": user.user_id},
                action_url="/notifications",
            ))
        except Exception:
            pass
    return {k: v for k, v in reply.items() if k != "_id"}


@router.get("/stories/{story_id}/viewers")
async def get_story_viewers(story_id: str, user: User = Depends(get_current_user)):
    """Get list of users who viewed this story (owner only)"""
    story = await db.hispalostories.find_one({"story_id": story_id})
    if not story:
        raise HTTPException(404, "Story no encontrada")
    if story.get("user_id") != user.user_id:
        raise HTTPException(403, "Solo puedes ver las vistas de tus propias stories")

    # Views are stored as user_id array in the story document (via $addToSet in view_story)
    viewer_ids = story.get("views", [])
    users = await db.users.find(
        {"user_id": {"$in": viewer_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1}
    ).to_list(len(viewer_ids)) if viewer_ids else []
    user_map = {u["user_id"]: u for u in users}

    result = []
    for vid in viewer_ids:
        u = user_map.get(vid, {})
        result.append({
            "user_id": vid,
            "name": u.get("name", ""),
            "username": u.get("username", ""),
            "profile_image": u.get("profile_image", ""),
        })

    return {"viewers": result, "total": len(result)}


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str, user: User = Depends(get_current_user)):
    """Delete own story."""
    story = await db.hispalostories.find_one({"story_id": story_id}, {"_id": 0, "user_id": 1})
    if not story:
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    if story["user_id"] != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta historia")
    await db.hispalostories.delete_one({"story_id": story_id})
    # Clean up related likes and replies
    await db.story_likes.delete_many({"story_id": story_id})
    await db.story_replies.delete_many({"story_id": story_id})
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
                "image": extract_product_image(product),
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
    product_map = {item.get("product_id", ""): item for item in products}
    return {
        "items": [
            {
                **product_map.get(row["_id"], {}),
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
    product_map = {item.get("product_id", ""): item for item in products}

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


# ── Saved posts & reels (social namespace) ────────────────────────────────────

@router.get("/social/saved-posts")
async def get_social_saved_posts(skip: int = 0, limit: int = 20, user: User = Depends(get_current_user)):
    """Get saved/bookmarked posts for the current user (social namespace alias)."""
    bookmarks = await db.post_bookmarks.find(
        {"user_id": user.user_id}, {"_id": 0, "post_id": 1}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    post_ids = [b["post_id"] for b in bookmarks]
    if not post_ids:
        return {"posts": [], "has_more": False}
    posts = await db.user_posts.find(
        {"post_id": {"$in": post_ids}}, {"_id": 0}
    ).to_list(len(post_ids))
    post_map = {p["post_id"]: p for p in posts}
    ordered = [_normalize_post_media(post_map[pid]) for pid in post_ids if pid in post_map]
    return {"posts": ordered, "has_more": len(bookmarks) == limit}


@router.get("/social/saved-reels")
async def get_saved_reels(skip: int = 0, limit: int = 20, user: User = Depends(get_current_user)):
    """Get saved/bookmarked reels for the current user."""
    saved = await db.reel_saves.find(
        {"user_id": user.user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    reel_ids = [s["reel_id"] for s in saved]
    if not reel_ids:
        return {"reels": [], "has_more": False}
    # Search both collections (reels can live in either)
    reels_primary = await db.reels.find(
        {"$or": [{"reel_id": {"$in": reel_ids}}, {"id": {"$in": reel_ids}}]}, {"_id": 0}
    ).to_list(len(reel_ids))
    reels_from_posts = await db.user_posts.find(
        {"$and": [
            {"$or": [{"post_id": {"$in": reel_ids}}, {"id": {"$in": reel_ids}}, {"reel_id": {"$in": reel_ids}}]},
            {"$or": [{"is_reel": True}, {"type": "reel"}]},
        ]}, {"_id": 0}
    ).to_list(len(reel_ids))
    reel_map = {}
    for r in reels_primary + reels_from_posts:
        rid = r.get("reel_id") or r.get("id") or r.get("post_id")
        if rid and rid not in reel_map:
            reel_map[rid] = r
    ordered = [reel_map[rid] for rid in reel_ids if rid in reel_map]

    # Hydrate is_liked (is_saved is True for all — this is the saved-reels endpoint)
    if ordered:
        ordered_ids = [r.get("reel_id") or r.get("id") or r.get("post_id") for r in ordered]
        ordered_ids = [rid for rid in ordered_ids if rid]
        if ordered_ids:
            like_docs = await db.reel_likes.find(
                {"reel_id": {"$in": ordered_ids}, "user_id": user.user_id},
                {"_id": 0, "reel_id": 1}
            ).to_list(len(ordered_ids))
            liked_ids = {l["reel_id"] for l in like_docs}
            for r in ordered:
                rid = r.get("reel_id") or r.get("id") or r.get("post_id")
                r["is_liked"] = rid in liked_ids
                r["is_saved"] = True

    return {"reels": ordered, "has_more": len(saved) == limit}


@router.post("/users/{user_id}/block")
async def block_user(user_id: str, user: User = Depends(get_current_user)):
    if user_id == user.user_id:
        raise HTTPException(400, "No puedes bloquearte a ti mismo")
    await db.blocked_users.update_one(
        {"blocker_id": user.user_id, "blocked_id": user_id},
        {"$set": {"blocker_id": user.user_id, "blocked_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    # Also unfollow in both directions
    await db.user_follows.delete_one({"follower_id": user.user_id, "following_id": user_id})
    await db.user_follows.delete_one({"follower_id": user_id, "following_id": user.user_id})
    # Cancel pending follow requests in both directions
    await db.follow_requests.delete_many({
        "$or": [
            {"requester_id": user.user_id, "target_id": user_id},
            {"requester_id": user_id, "target_id": user.user_id},
        ]
    })
    return {"status": "blocked"}


@router.delete("/users/{user_id}/block")
async def unblock_user(user_id: str, user: User = Depends(get_current_user)):
    """Remove block on a user."""
    result = await db.blocked_users.delete_one({"blocker_id": user.user_id, "blocked_id": user_id})
    if result.deleted_count == 0:
        return {"status": "not_blocked"}
    return {"status": "unblocked"}


# ── Section 3.6.7 — Bloque 5: user mute (silencioso, no notifica) ─────

@router.post("/users/{user_id}/mute")
async def mute_user(user_id: str, user: User = Depends(get_current_user)):
    """Mute a user — their posts/stories/reels disappear from the muter's feed.
    The muted user is NOT notified. Relationship stays intact."""
    if user_id == user.user_id:
        raise HTTPException(400, "No puedes silenciarte a ti mismo")
    await db.user_mutes.update_one(
        {"muter_id": user.user_id, "muted_id": user_id},
        {"$set": {"muter_id": user.user_id, "muted_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"status": "muted"}


@router.delete("/users/{user_id}/mute")
async def unmute_user(user_id: str, user: User = Depends(get_current_user)):
    """Remove mute on a user."""
    await db.user_mutes.delete_one({"muter_id": user.user_id, "muted_id": user_id})
    return {"status": "unmuted"}


@router.get("/users/me/muted")
async def get_muted_users(user: User = Depends(get_current_user)):
    """List users the current user has muted."""
    muted = await db.user_mutes.find(
        {"muter_id": user.user_id}, {"_id": 0, "muted_id": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(500)
    if not muted:
        return {"users": []}
    muted_ids = [m["muted_id"] for m in muted]
    users = await db.users.find(
        {"user_id": {"$in": muted_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "profile_image": 1},
    ).to_list(len(muted_ids))
    return {"users": users}


@router.post("/users/{user_id}/report")
async def report_user(user_id: str, request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    reason = body.get("reason", "inappropriate")
    await db.reports.insert_one({
        "report_id": str(uuid.uuid4()),
        "reporter_id": user.user_id,
        "reported_id": user_id,
        "type": "user",
        "reason": reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "reported"}


@router.post("/posts/{post_id}/report")
async def report_post(post_id: str, request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    reason = body.get("reason", "inappropriate")
    await db.reports.insert_one({
        "report_id": str(uuid.uuid4()),
        "reporter_id": user.user_id,
        "reported_id": post_id,
        "type": "post",
        "reason": reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "reported"}
