"""
Directory routes: Public listings for influencers, producers.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect

from core.database import db
from core.auth import get_current_user, get_optional_user
from core.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/directory/influencers")
async def get_public_influencers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
):
    """Get list of public influencer profiles for the directory"""
    _filter = {
        "status": "active",
        "user_id": {"$ne": None, "$exists": True},
    }
    total = await db.influencers.count_documents(_filter)
    influencers = await db.influencers.find(
        _filter,
        {"_id": 0, "stripe_account_id": 0, "stripe_onboarding_complete": 0,
         "total_commission_earned": 0, "available_balance": 0}
    ).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    # Enrich with user data for profile photos
    enriched = []
    for inf in influencers:
        user = await db.users.find_one(
            {"user_id": inf.get("user_id")},
            {"_id": 0, "name": 1, "profile_image": 1}
        )
        if user:  # Only include if user exists
            enriched.append({
                "influencer_id": inf.get("influencer_id"),
                "user_id": inf.get("user_id"),
                "full_name": inf.get("full_name") or user.get("name"),
                "email": inf.get("email"),
                "niche": inf.get("niche"),
                "followers": inf.get("followers"),
                "social_media": inf.get("social_media", {}),
                "profile_image": user.get("profile_image"),
                "total_sales_generated": inf.get("total_sales_generated", 0),
                "created_at": inf.get("created_at")
            })

    return {"items": enriched, "total": total, "page": page, "pages": max(1, -(-total // limit)), "has_more": page * limit < total}

# Admin endpoint to sync influencer records with user accounts
@router.post("/admin/sync-influencer-users")
async def sync_influencer_users(user: User = Depends(get_current_user)):
    """Sync influencer collection with user accounts that have role=influencer"""
    if user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find all users with role=influencer
    influencer_users = await db.users.find(
        {"role": "influencer"},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    ).to_list(100)
    
    synced = 0
    for u in influencer_users:
        # Check if influencer record exists by user_id
        existing = await db.influencers.find_one({"user_id": u["user_id"]})
        
        if existing:
            # Already linked
            continue
        
        # Check if there's a record by email
        by_email = await db.influencers.find_one({"email": u["email"]})
        
        if by_email:
            # Update existing record with user_id
            await db.influencers.update_one(
                {"influencer_id": by_email["influencer_id"]},
                {"$set": {"user_id": u["user_id"], "status": "active"}}
            )
            synced += 1
        else:
            # Create new influencer record
            influencer_id = f"inf_{uuid.uuid4().hex[:12]}"
            referral_code = f"REF{uuid.uuid4().hex[:6].upper()}"
            new_record = {
                "influencer_id": influencer_id,
                "user_id": u["user_id"],
                "email": u["email"],
                "full_name": u.get("name", "Influencer"),
                "status": "active",
                "niche": "general",
                "followers": 0,
                "social_media": {},
                "total_sales_generated": 0,
                "referral_code": referral_code,
                "discount_code": referral_code,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.influencers.insert_one(new_record)
            synced += 1
            logger.info(f"Created influencer record for user {u['user_id']}")
    
    return {"synced": synced, "total_users": len(influencer_users)}

# Admin endpoint to cleanup orphan email registrations
@router.post("/admin/cleanup-orphan-emails")
async def cleanup_orphan_emails(
    email: str,
    user: User = Depends(get_current_user)
):
    """Remove orphan email registrations that don't have a corresponding user"""
    if user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        return {"status": "user_exists", "message": "User with this email already exists"}
    
    # Delete from email_verifications
    result1 = await db.email_verifications.delete_many({"email": email})
    
    # Delete from password_resets
    result2 = await db.password_resets.delete_many({"email": email})
    
    # Delete from any other collections that might have orphan data
    result3 = await db.influencers.delete_many({"email": email, "user_id": None})
    
    return {
        "status": "cleaned",
        "email_verifications_deleted": result1.deleted_count,
        "password_resets_deleted": result2.deleted_count,
        "orphan_influencers_deleted": result3.deleted_count
    }

@router.get("/directory/influencers/{influencer_id}")
async def get_public_influencer_profile(influencer_id: str):
    """Get detailed public profile of an influencer"""
    influencer = await db.influencers.find_one(
        {"influencer_id": influencer_id, "status": "active"},
        {"_id": 0, "stripe_account_id": 0, "stripe_onboarding_complete": 0,
         "total_commission_earned": 0, "available_balance": 0}
    )
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    # Get user profile image
    user = await db.users.find_one(
        {"user_id": influencer.get("user_id")},
        {"_id": 0, "name": 1, "profile_image": 1}
    )
    
    # Get their discount code for sharing
    discount_code = await db.discount_codes.find_one(
        {"influencer_id": influencer_id, "active": True},
        {"_id": 0, "code": 1, "discount_value": 1}
    )
    
    return {
        "influencer_id": influencer.get("influencer_id"),
        "user_id": influencer.get("user_id"),
        "full_name": influencer.get("full_name"),
        "email": influencer.get("email"),
        "niche": influencer.get("niche"),
        "followers": influencer.get("followers"),
        "social_media": influencer.get("social_media", {}),
        "profile_image": user.get("profile_image") if user else None,
        "discount_code": discount_code.get("code") if discount_code else None,
        "discount_value": discount_code.get("discount_value") if discount_code else None,
        "created_at": influencer.get("created_at")
    }

@router.get("/directory/producers")
async def get_public_producers():
    """Get list of public producer/store profiles for the directory"""
    stores = await db.store_profiles.find(
        {},
        {"_id": 0}
    ).to_list(100)
    
    enriched = []
    for store in stores:
        # Get producer user info
        producer = await db.users.find_one(
            {"user_id": store.get("producer_id")},
            {"_id": 0, "name": 1, "email": 1, "approved": 1}
        )
        
        if not producer or not producer.get("approved"):
            continue
        
        # Get follower count
        follower_count = await db.store_followers.count_documents({"store_id": store.get("store_id")})
        
        # Get product count
        product_count = await db.products.count_documents({"producer_id": store.get("producer_id"), "approved": True})
        
        enriched.append({
            "store_id": store.get("store_id"),
            "producer_id": store.get("producer_id"),
            "name": store.get("name"),
            "slug": store.get("slug"),
            "tagline": store.get("tagline"),
            "logo": store.get("logo"),
            "location": store.get("location"),
            "social_instagram": store.get("social_instagram"),
            "social_facebook": store.get("social_facebook"),
            "website": store.get("website"),
            "contact_email": store.get("contact_email"),
            "follower_count": follower_count,
            "product_count": product_count
        })
    
    return enriched

@router.get("/directory/producers/{store_id}")
async def get_public_producer_profile(store_id: str):
    """Get detailed public profile of a producer/store"""
    store = await db.store_profiles.find_one(
        {"$or": [{"store_id": store_id}, {"slug": store_id}]},
        {"_id": 0}
    )
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get producer user info
    producer = await db.users.find_one(
        {"user_id": store.get("producer_id")},
        {"_id": 0, "name": 1, "email": 1, "approved": 1}
    )
    
    # Get follower count
    follower_count = await db.store_followers.count_documents({"store_id": store.get("store_id")})
    
    # Get product count
    product_count = await db.products.count_documents({"producer_id": store.get("producer_id"), "approved": True})
    
    # Get average rating
    products = await db.products.find(
        {"producer_id": store.get("producer_id"), "approved": True},
        {"product_id": 1}
    ).to_list(1000)
    product_ids = [p["product_id"] for p in products]
    
    avg_rating = 0
    review_count = 0
    if product_ids:
        reviews = await db.reviews.find(
            {"product_id": {"$in": product_ids}, "approved": True}
        ).to_list(10000)
        if reviews:
            avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
            review_count = len(reviews)
    
    return {
        "store_id": store.get("store_id"),
        "producer_id": store.get("producer_id"),
        "name": store.get("name"),
        "slug": store.get("slug"),
        "tagline": store.get("tagline"),
        "story": store.get("story"),
        "logo": store.get("logo"),
        "hero_image": store.get("hero_image"),
        "location": store.get("location"),
        "full_address": store.get("full_address"),
        "social_instagram": store.get("social_instagram"),
        "social_facebook": store.get("social_facebook"),
        "website": store.get("website"),
        "contact_email": store.get("contact_email"),
        "contact_phone": store.get("contact_phone"),
        "follower_count": follower_count,
        "product_count": product_count,
        "avg_rating": avg_rating,
        "review_count": review_count
    }

# ============================================================================
# END PUBLIC DIRECTORY API
# ============================================================================

# =======================================================================================
# =======================================================================================
