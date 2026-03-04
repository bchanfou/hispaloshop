"""
Page visit tracking, feed stories, and best sellers.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from core.database import db
from core.models import User, PageVisitRequest
from core.auth import get_optional_user

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
        logger.error(f"Error tracking visit: {e}")
        return {"status": "ok"}  # Don't fail silently but don't break the app


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
    """Get seller stories — latest product/post from followed sellers + featured sellers."""
    current_user = await get_optional_user(request)
    stories = []
    
    # Get followed sellers
    followed_ids = []
    if current_user:
        follows = await db.user_follows.find({"follower_id": current_user.user_id}, {"_id": 0, "following_id": 1}).to_list(100)
        followed_ids = [f["following_id"] for f in follows]
    
    # Get active sellers (followed + featured)
    query = {"role": {"$in": ["producer", "importer"]}, "status": {"$ne": "banned"}}
    if followed_ids:
        query["user_id"] = {"$in": followed_ids}
    sellers = await db.users.find(query, {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "profile_image": 1}).limit(15).to_list(15)
    
    # If not enough from follows, add featured sellers
    if len(sellers) < 8:
        extra = await db.users.find(
            {"role": {"$in": ["producer", "importer"]}, "user_id": {"$nin": [s["user_id"] for s in sellers]}},
            {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "profile_image": 1}
        ).limit(8 - len(sellers)).to_list(8)
        sellers.extend(extra)
    
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    for seller in sellers:
        sid = seller["user_id"]
        # Get latest post or product (within 24h preferred)
        latest_post = await db.user_posts.find_one(
            {"user_id": sid, "image_url": {"$ne": None}},
            {"_id": 0, "post_id": 1, "image_url": 1, "caption": 1, "created_at": 1}
        )
        latest_product = await db.products.find_one(
            {"producer_id": sid, "status": "active"},
            {"_id": 0, "product_id": 1, "name": 1, "images": 1, "price": 1, "created_at": 1}
        )
        
        is_recent = False
        preview = None
        if latest_post and latest_post.get("created_at", "") >= twenty_four_hours_ago:
            preview = {"type": "post", "image": latest_post.get("image_url"), "text": latest_post.get("caption", "")[:60]}
            is_recent = True
        elif latest_product:
            preview = {"type": "product", "image": (latest_product.get("images") or [None])[0], "text": latest_product.get("name", ""), "price": latest_product.get("price")}
        
        if preview:
            stories.append({
                "user_id": sid,
                "name": seller.get("company_name") or seller.get("name", ""),
                "avatar": seller.get("profile_image"),
                "preview": preview,
                "is_recent": is_recent,
                "is_followed": sid in followed_ids,
            })
    
    return stories



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
        
        for r in results:
            if r["_id"] in featured_ids:
                continue
            if len(products) >= limit:
                break
            prod = await db.products.find_one(
                {"product_id": r["_id"], "status": "active"},
                {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "producer_name": 1, "country_origin": 1}
            )
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

