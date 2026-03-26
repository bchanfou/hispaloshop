"""
Page visit tracking, feed stories, and best sellers.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
import logging

from core.database import db
from core.models import User, PageVisitRequest
from core.auth import get_optional_user
from utils.images import extract_product_image

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================
# PAGE VISIT TRACKING (for real analytics)
# ============================================


@router.post("/track/visit")
async def track_page_visit(visit: PageVisitRequest, request: Request):
    """Track a page visit for analytics. Called from frontend on page load."""
    try:
        # Get country from request headers or IP (simplified)
        country = visit.country
        if not country:
            # Try to get from X-Forwarded-For or use default
            forwarded = request.headers.get("x-forwarded-for", "")
            # In production, you'd use a GeoIP service here
            country = "ES"  # Default to Spain for now
        
        visit_doc = {
            "visit_id": str(uuid.uuid4()),
            "page": visit.page,
            "country": country,
            "referrer": visit.referrer,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_agent": request.headers.get("user-agent", ""),
        }
        
        await db.page_visits.insert_one(visit_doc)
        return {"status": "ok"}
    except Exception as e:
        logger.warning(f"[TRACK] Failed to track page visit: {e}")
        return {"status": "error", "detail": "tracking failed"}


@router.post("/track/social-event")
async def track_social_event(request: Request):
    """Track social/conversion events from the feed."""
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        
        valid_events = [
            "view_post", "click_product_from_post", "add_to_cart_from_post",
            "buy_from_post", "follow_seller", "save_post",
            "click_info", "click_become_seller", "click_become_influencer",
            "share_post", "click_post_comment"
        ]
        if event_type not in valid_events:
            return {"status": "ok"}
        
        current_user = await get_optional_user(request)
        
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "event_type": event_type,
            "user_id": current_user.user_id if current_user else None,
            "post_id": body.get("post_id"),
            "product_id": body.get("product_id"),
            "seller_id": body.get("seller_id"),
            "country": body.get("country", "ES"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": body.get("metadata", {})
        }
        await db.social_events.insert_one(event_doc)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"[SOCIAL-TRACK] Error: {e}")
        return {"status": "ok"}


@router.get("/feed/stories")
async def get_stories(request: Request):
    """Get active stories for the home bar — real 24h stories first, then seller profile stories."""
    current_user = await get_optional_user(request)

    now = datetime.now(timezone.utc).isoformat()
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    # ── Followed IDs ─────────────────────────────────────────────────────────
    followed_ids: set = set()
    if current_user:
        follows = await db.user_follows.find(
            {"follower_id": current_user.user_id}, {"_id": 0, "following_id": 1}
        ).to_list(1000)
        followed_ids = {f["following_id"] for f in follows}

    # ── 1. Collect users who have real active hispalostories ─────────────────
    # Exclude current user's stories (self-ring is shown separately by the frontend)
    # Accept stories with image_url OR video_url (video stories have no image_url)
    story_query = {"expires_at": {"$gt": now}, "$or": [{"image_url": {"$ne": None}}, {"video_url": {"$ne": None}}]}
    if current_user:
        story_query["user_id"] = {"$ne": current_user.user_id}
    try:
        active_ephemeral = await db.hispalostories.find(
            story_query,
            {"_id": 0, "user_id": 1, "image_url": 1, "video_url": 1, "caption": 1, "created_at": 1, "views": 1},
        ).sort("created_at", -1).to_list(300)
    except Exception as exc:
        logger.warning(f"[FEED/STORIES] hispalostories unavailable: {exc}")
        active_ephemeral = []

    # Keep only the most-recent story per user (preview image) + all stories for has_unseen
    story_by_user: dict = {}
    all_stories_by_user: dict = {}
    for s in active_ephemeral:
        uid = s["user_id"]
        if uid not in story_by_user:
            story_by_user[uid] = s
        all_stories_by_user.setdefault(uid, []).append(s)

    # Batch-fetch user profiles for story owners
    story_user_ids = list(story_by_user.keys())
    story_user_docs: dict = {}
    if story_user_ids:
        udocs = await db.users.find(
            {"user_id": {"$in": story_user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "profile_image": 1},
        ).to_list(len(story_user_ids))
        story_user_docs = {u["user_id"]: u for u in udocs}

    result = []
    seen_user_ids: set = set()

    current_user_id = current_user.user_id if current_user else None
    for uid, story in story_by_user.items():
        u = story_user_docs.get(uid)
        if not u:
            continue
        seen_user_ids.add(uid)
        # Check if any story for this user has NOT been viewed by current user
        user_all_stories = all_stories_by_user.get(uid, [])
        has_unseen = any(
            current_user_id not in (s.get("views", []) if isinstance(s.get("views"), list) else [])
            for s in user_all_stories
        ) if current_user_id else True
        # Strip views from preview story before sending to client
        story.pop("views", None)
        result.append({
            "user_id": uid,
            "name": u.get("company_name") or u.get("name", ""),
            "avatar": u.get("profile_image"),
            "preview": {
                "type": "story",
                "image": story.get("image_url"),
                "video": story.get("video_url"),
                "text": (story.get("caption") or "")[:60],
            },
            "is_recent": True,
            "is_followed": uid in followed_ids,
            "has_unseen": has_unseen,
        })

    # Sort: unseen first, then followed, then by user_id
    result.sort(key=lambda x: (not x["has_unseen"], not x["is_followed"], x["user_id"]))

    # ── 2. Fill remaining slots with seller profile stories ──────────────────
    slots_remaining = max(0, 15 - len(result))
    if slots_remaining > 0:
        excluded_user_ids = list(seen_user_ids)
        if current_user and current_user.user_id not in seen_user_ids:
            excluded_user_ids.append(current_user.user_id)
        seller_query = {
            "role": {"$in": ["producer", "importer"]},
            "status": {"$ne": "banned"},
            "user_id": {"$nin": excluded_user_ids},
        }
        # Prefer followed sellers, then any seller
        followed_seller_list = await db.users.find(
            {**seller_query, "user_id": {"$in": list(followed_ids) or ["__none__"]}},
            {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "profile_image": 1},
        ).limit(slots_remaining).to_list(slots_remaining)

        extra_needed = slots_remaining - len(followed_seller_list)
        followed_seller_ids = {s["user_id"] for s in followed_seller_list}
        extra_sellers = []
        if extra_needed > 0:
            extra_sellers = await db.users.find(
                {**seller_query, "user_id": {"$nin": list(seen_user_ids | followed_seller_ids)}},
                {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "profile_image": 1},
            ).limit(extra_needed).to_list(extra_needed)

        sellers = followed_seller_list + extra_sellers

        if sellers:
            seller_ids = [s["user_id"] for s in sellers]

            posts_pipeline = [
                {"$match": {"user_id": {"$in": seller_ids}, "image_url": {"$ne": None}, "created_at": {"$gte": twenty_four_hours_ago}}},
                {"$sort": {"created_at": -1}},
                {"$group": {"_id": "$user_id", "doc": {"$first": "$$ROOT"}}},
                {"$project": {"_id": 0, "user_id": "$_id", "image_url": "$doc.image_url", "caption": "$doc.caption"}},
            ]
            products_pipeline = [
                {"$match": {"producer_id": {"$in": seller_ids}, "status": "active"}},
                {"$sort": {"created_at": -1}},
                {"$group": {"_id": "$producer_id", "doc": {"$first": "$$ROOT"}}},
                {"$project": {"_id": 0, "producer_id": "$_id", "name": "$doc.name", "images": "$doc.images", "price": "$doc.price"}},
            ]
            latest_posts_list, latest_products_list = await asyncio.gather(
                db.user_posts.aggregate(posts_pipeline).to_list(len(seller_ids)),
                db.products.aggregate(products_pipeline).to_list(len(seller_ids)),
            )
            posts_by_user = {p["user_id"]: p for p in latest_posts_list}
            products_by_user = {p["producer_id"]: p for p in latest_products_list}

            for seller in sellers:
                sid = seller["user_id"]
                latest_post = posts_by_user.get(sid)
                latest_product = products_by_user.get(sid)
                preview = None
                if latest_post and latest_post.get("image_url"):
                    preview = {"type": "post", "image": latest_post["image_url"], "text": (latest_post.get("caption") or "")[:60]}
                elif latest_product:
                    img = extract_product_image(latest_product)
                    if img:
                        preview = {"type": "product", "image": img, "text": latest_product.get("name", ""), "price": latest_product.get("price")}
                if preview and preview.get("image"):
                    result.append({
                        "user_id": sid,
                        "name": seller.get("company_name") or seller.get("name", ""),
                        "avatar": seller.get("profile_image"),
                        "preview": preview,
                        "is_recent": False,
                        "is_followed": sid in followed_ids,
                        "has_unseen": True,
                    })

    return result



@router.get("/feed/best-sellers")
async def get_best_sellers(country: Optional[str] = None, limit: int = 8):
    """Get best selling + featured products. Featured products always appear first."""
    # 1. Get featured products first
    featured = await db.products.find(
        {"featured": True, "status": "active"},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_name": 1, "country_origin": 1}
    ).limit(limit).to_list(limit)
    for p in featured:
        p["total_sold"] = 0
        p["is_featured"] = True
    
    featured_ids = set(p["product_id"] for p in featured)
    remaining = limit - len(featured)
    
    # 2. Fill remaining with best sellers by order volume
    products = list(featured)
    if remaining > 0:
        pipeline = [
            {"$match": {"status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}}},
            {"$unwind": "$line_items"},
            {"$group": {"_id": "$line_items.product_id", "total_sold": {"$sum": "$line_items.quantity"}}},
            {"$sort": {"total_sold": -1}},
            {"$limit": remaining + len(featured_ids)}  # extra to skip featured
        ]
        results = await db.orders.aggregate(pipeline).to_list(remaining + len(featured_ids))

        # Batch-fetch products instead of N+1 individual queries
        candidate_ids = [r["_id"] for r in results if r["_id"] not in featured_ids]
        if candidate_ids:
            _projection = {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_name": 1, "country_origin": 1}
            prods_list = await db.products.find(
                {"product_id": {"$in": candidate_ids}, "status": "active"}, _projection
            ).to_list(len(candidate_ids))
            prods_map = {p["product_id"]: p for p in prods_list}
        else:
            prods_map = {}

        for r in results:
            if r["_id"] in featured_ids:
                continue
            if len(products) >= limit:
                break
            prod = prods_map.get(r["_id"])
            if prod:
                products.append({**prod, "total_sold": r["total_sold"]})
    
    # 3. If still not enough, fill with newest active products
    if len(products) < limit:
        existing_ids = set(p["product_id"] for p in products)
        newest = await db.products.find(
            {"status": "active", "product_id": {"$nin": list(existing_ids)}},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_name": 1, "country_origin": 1}
        ).sort("created_at", -1).limit(limit - len(products)).to_list(limit - len(products))
        for p in newest:
            p["total_sold"] = 0
        products.extend(newest)
    
    return products


# ============================================
# FEED HELPERS
# ============================================

async def _hydrate_feed_users(items, current_user=None, following_ids=None):
    """Batch-enrich feed items with user info (avatar, name, verified, has_story).

    Avoids N+1 queries by fetching all authors in a single DB call.
    """
    if not items:
        return items

    if following_ids is None:
        following_ids = set()

    # Collect unique author IDs
    author_ids = list({item.get("user_id") for item in items if item.get("user_id")})
    if not author_ids:
        return items

    # Single batch query for all authors
    users = await db.users.find(
        {"user_id": {"$in": author_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "company_name": 1,
         "profile_image": 1, "role": 1, "verified": 1}
    ).to_list(len(author_ids))
    user_map = {u["user_id"]: u for u in users}

    # Check which authors have recent stories (posts with image in last 24h)
    twenty_four_h_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    story_authors = set()
    if author_ids:
        story_pipeline = [
            {"$match": {"user_id": {"$in": author_ids}, "image_url": {"$ne": None}, "created_at": {"$gte": twenty_four_h_ago}}},
            {"$group": {"_id": "$user_id"}}
        ]
        try:
            story_results = await db.user_posts.aggregate(story_pipeline).to_list(len(author_ids))
            story_authors = {s["_id"] for s in story_results}
        except Exception as e:
            logger.warning(f"[FEED] Story aggregation failed: {e}")

    # Check like status for current user
    liked_ids = set()
    if current_user:
        item_ids = [item.get("id") or item.get("post_id") or item.get("reel_id") for item in items]
        item_ids = [i for i in item_ids if i]
        if item_ids:
            # Check post likes
            post_likes = await db.post_likes.find(
                {"user_id": current_user.user_id, "post_id": {"$in": item_ids}},
                {"_id": 0, "post_id": 1}
            ).to_list(len(item_ids))
            liked_ids.update(l["post_id"] for l in post_likes)
            # Check reel likes
            reel_likes = await db.reel_likes.find(
                {"user_id": current_user.user_id, "reel_id": {"$in": item_ids}},
                {"_id": 0, "reel_id": 1}
            ).to_list(len(item_ids))
            liked_ids.update(l["reel_id"] for l in reel_likes)

    # Enrich each item
    for item in items:
        uid = item.get("user_id")
        user = user_map.get(uid, {})
        item["user_name"] = item.get("user_name") or user.get("company_name") or user.get("name") or "Usuario"
        item["user_profile_image"] = item.get("user_profile_image") or user.get("profile_image")
        item["user_verified"] = user.get("verified", False)
        item["user_has_story"] = uid in story_authors
        item["user_role"] = user.get("role")
        item_id = item.get("id") or item.get("post_id") or item.get("reel_id")
        if current_user and item_id:
            item["is_liked"] = item_id in liked_ids
            item["liked"] = item_id in liked_ids

    return items


# ============================================
# FEED ENDPOINTS — proxy to social.py feed
# The frontend expects /feed/foryou and /feed at the /api prefix.
# The actual implementation is in social.py's /feed endpoint.
# ============================================

@router.get("/feed/foryou")
async def feed_foryou(request: Request, limit: int = 20, cursor: Optional[str] = None, skip: int = 0):
    """For-you feed — mixed posts+reels scored by engagement + recency."""
    import random
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    offset = int(cursor) if cursor else skip
    pool_size = limit * 3  # fetch a larger pool to score and sort

    # Fetch posts + reels concurrently
    posts_raw, reels_raw = await asyncio.gather(
        db.user_posts.find({"status": {"$ne": "draft"}, "is_active": {"$ne": False}}, {"_id": 0}).sort("created_at", -1).skip(offset).limit(pool_size).to_list(pool_size),
        db.reels.find({"is_active": {"$ne": False}}, {"_id": 0}).sort("created_at", -1).skip(offset).limit(pool_size).to_list(pool_size),
    )
    for p in posts_raw:
        p.setdefault("type", "post")
        p.setdefault("id", p.get("post_id") or p.get("id"))
    for r in reels_raw:
        r["type"] = "reel"
        r.setdefault("id", r.get("reel_id") or r.get("id"))
        r.setdefault("video_url", r.get("video_url") or r.get("url"))

    # Merge candidates
    candidates = posts_raw + reels_raw

    # Followed user IDs for personalization boost
    following_ids = set()
    if current_user:
        follows = await db.user_follows.find(
            {"follower_id": current_user.user_id}, {"_id": 0, "following_id": 1}
        ).to_list(500)
        following_ids = {f["following_id"] for f in follows}

    # Score each item (Q2: algorithmic feed)
    now = datetime.now(timezone.utc)
    scored = []
    for item in candidates:
        created = item.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(created).replace("Z", "+00:00")) if created else now
        except Exception:
            dt = now
        age_h = max((now - dt).total_seconds() / 3600, 0.01)

        recency = max(0, 100 - age_h * 1.5) if age_h < 48 else max(5, 30 - age_h * 0.05)
        engagement = min(100, (
            (item.get("likes_count", 0) or 0)
            + (item.get("comments_count", 0) or 0) * 2
            + (item.get("shares_count", 0) or 0) * 3
            + (item.get("saves_count", 0) or 0) * 2
        ) / 5)
        personalization = 60 if item.get("user_id") in following_ids else 30
        serendipity = random.uniform(0, 15)

        score = recency * 0.25 + engagement * 0.30 + personalization * 0.35 + serendipity * 0.10
        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Diversify: max 2 consecutive from same author
    result = []
    seen_ids = set()
    author_count = {}
    for _, item in scored:
        item_id = item.get("id") or item.get("post_id") or item.get("reel_id")
        # Deduplicate items
        if item_id and item_id in seen_ids:
            continue
        uid = item.get("user_id", "")
        author_count[uid] = author_count.get(uid, 0) + 1
        if author_count[uid] <= 2:
            result.append(item)
            if item_id:
                seen_ids.add(item_id)
        if len(result) >= limit:
            break

    # Hydrate user info (avatar, verified, etc.) — single batch query
    result = await _hydrate_feed_users(result, current_user, following_ids)

    return {"posts": result, "items": result, "total": len(result), "has_more": len(result) == limit}


@router.get("/feed/following")
async def feed_following(request: Request, limit: int = 20, cursor: Optional[str] = None, skip: int = 0):
    """Following feed — posts + reels from followed users only."""
    try:
        current_user = await get_optional_user(request)
    except Exception:
        current_user = None

    try:
        offset = int(cursor) if cursor else skip
        following_ids = []
        if current_user:
            follows = await db.user_follows.find(
                {"follower_id": current_user.user_id}, {"_id": 0, "following_id": 1}
            ).to_list(500)
            following_ids = [f["following_id"] for f in follows]

        # If not authenticated or not following anyone, return empty feed
        if not following_ids:
            return {"posts": [], "items": [], "total": 0, "has_more": False}

        query = {"user_id": {"$in": following_ids}, "status": {"$ne": "draft"}, "is_active": {"$ne": False}}
        posts = await db.user_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        for p in posts:
            p.setdefault("type", "post")
            p.setdefault("id", p.get("post_id") or p.get("id"))

        # Mix in reels from followed users
        reel_query = {"user_id": {"$in": following_ids}, "is_active": {"$ne": False}} if following_ids else {"is_active": {"$ne": False}}
        reels = await db.reels.find(reel_query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        for r in reels:
            r["type"] = "reel"
            r.setdefault("id", r.get("reel_id") or r.get("id"))
            r.setdefault("video_url", r.get("video_url") or r.get("url"))

        # Merge, deduplicate, and sort by created_at DESC
        combined = posts + reels
        combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        seen_ids = set()
        deduped = []
        for item in combined:
            item_id = item.get("id") or item.get("post_id") or item.get("reel_id")
            if item_id and item_id in seen_ids:
                continue
            if item_id:
                seen_ids.add(item_id)
            deduped.append(item)
            if len(deduped) >= limit:
                break
        result = deduped

        # Hydrate user info
        result = await _hydrate_feed_users(result, current_user, set(following_ids))

        return {"posts": result, "items": result, "total": len(result), "has_more": len(result) == limit}
    except Exception as e:
        logger.error(f"Following feed error: {e}")
        return {"posts": [], "items": [], "total": 0, "has_more": False}

