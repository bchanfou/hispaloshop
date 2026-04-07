"""
Store routes: listings, profiles, follow, upload, notifications.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from datetime import datetime, timezone
from pathlib import Path
import unicodedata
import uuid
import logging
import os
import resend

from core.database import db
from core.models import User, StoreProfileUpdate
from core.auth import get_current_user, require_role, get_optional_user
from services.cloudinary_storage import upload_image as cloudinary_upload

logger = logging.getLogger(__name__)

# S-06: Approximate coordinates for common Spanish/European cities (offline geocode fallback)
_CITY_COORDS = {
    "madrid": (40.4168, -3.7038), "sevilla": (37.3891, -5.9845), "barcelona": (41.3874, 2.1686),
    "valencia": (39.4699, -0.3763), "málaga": (36.7213, -4.4214), "malaga": (36.7213, -4.4214),
    "granada": (37.1773, -3.5986), "córdoba": (37.8882, -4.7794), "cordoba": (37.8882, -4.7794),
    "jaén": (37.7796, -3.7849), "jaen": (37.7796, -3.7849), "huelva": (37.2614, -6.9447),
    "cádiz": (36.5271, -6.2886), "cadiz": (36.5271, -6.2886), "almería": (36.8340, -2.4637),
    "bilbao": (43.2630, -2.9350), "zaragoza": (41.6488, -0.8891), "murcia": (37.9922, -1.1307),
    "palma": (39.5696, 2.6502), "las palmas": (28.1235, -15.4363), "alicante": (38.3452, -0.4810),
    "valladolid": (41.6523, -4.7245), "vigo": (42.2406, -8.7207), "gijón": (43.5453, -5.6615),
    "lisboa": (38.7223, -9.1393), "porto": (41.1579, -8.6291), "paris": (48.8566, 2.3522),
    "london": (51.5074, -0.1278), "berlin": (52.5200, 13.4050), "roma": (41.9028, 12.4964),
    "amsterdam": (52.3676, 4.9041), "bruselas": (50.8503, 4.3517), "méxico": (19.4326, -99.1332),
    "bogotá": (4.7110, -74.0721), "buenos aires": (-34.6037, -58.3816), "lima": (-12.0464, -77.0428),
    "santiago": (-33.4489, -70.6693), "são paulo": (-23.5505, -46.6333),
}

def _approx_coords(location_str: str):
    """Try to match a location string to known city coordinates."""
    if not location_str:
        return None
    normalized = unicodedata.normalize("NFKD", location_str.lower()).encode("ascii", "ignore").decode()
    for city, coords in _CITY_COORDS.items():
        city_norm = unicodedata.normalize("NFKD", city).encode("ascii", "ignore").decode()
        if city_norm in normalized:
            return {"lat": coords[0], "lng": coords[1]}
    return None
router = APIRouter()

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://www.hispaloshop.com')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')


def _public_product_filter() -> dict:
    return {
        "$or": [
            {"status": "active"},
            {"approved": True},
            {"status": "approved"},
        ]
    }

def send_email(to, subject, html):
    if not RESEND_API_KEY:
        return
    try:
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html})
    except Exception as e:
        logger.error(f"Email error: {e}")

# STORE PROFILE ENDPOINTS
# ============================================

def generate_store_slug(name: str) -> str:
    """Generate URL-friendly slug from store name"""
    # Normalize unicode characters (remove accents)
    slug = unicodedata.normalize('NFD', name.lower())
    slug = ''.join(c for c in slug if unicodedata.category(c) != 'Mn')
    # Replace spaces and special chars with hyphens
    slug = ''.join(c if c.isalnum() else '-' for c in slug)
    # Remove consecutive hyphens and trim
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-')

@router.get("/stores")
async def get_all_stores(
    country: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    seller_id: Optional[str] = None,
    producer_id: Optional[str] = None,
    plan: Optional[str] = None,
    limit: Optional[int] = None,
    skip: int = 0,
):
    """Get all public store profiles with optional filtering"""
    # Build query
    query = {}
    if country:
        query["country"] = country.upper()
    if region:
        query["region"] = region.upper()
    # Filter by subscription plan (e.g. elite)
    if plan:
        # Look up users with the given plan, then filter stores
        plan_users = await db.users.find(
            {"subscription_plan": plan.lower()},
            {"_id": 0, "user_id": 1}
        ).to_list(500)
        plan_user_ids = [u["user_id"] for u in plan_users if u.get("user_id")]
        if plan_user_ids:
            query["producer_id"] = {"$in": plan_user_ids}
        else:
            return []
    # Filter by seller/producer ID
    if seller_id:
        query["producer_id"] = seller_id
    elif producer_id:
        query["producer_id"] = producer_id
    
    max_results = min(limit, 1000) if limit else 1000
    stores = await db.store_profiles.find(query, {"_id": 0}).to_list(max_results)

    # Filter by search if provided
    if search:
        search_lower = search.lower()
        stores = [
            s for s in stores
            if search_lower in (s.get("name") or "").lower()
            or search_lower in (s.get("location") or "").lower()
            or search_lower in (s.get("tagline") or "").lower()
        ]

    # Apply skip for pagination (S-07)
    if skip > 0:
        stores = stores[skip:]

    # Batch-fetch producer info for verified + plan (S-04)
    producer_ids = list({s.get("producer_id") for s in stores if s.get("producer_id")})
    producer_map = {}
    if producer_ids:
        producers = await db.users.find(
            {"user_id": {"$in": producer_ids}},
            {"_id": 0, "user_id": 1, "approved": 1, "subscription_plan": 1}
        ).to_list(len(producer_ids))
        producer_map = {p["user_id"]: p for p in producers}

    # Enrich stores with product count, follower count, rating, verified, plan
    for store in stores:
        pid = store.get("producer_id")
        # Product count
        product_count = await db.products.count_documents({
            "producer_id": pid,
            **_public_product_filter(),
        })
        store["product_count"] = product_count

        # Follower count
        follower_count = await db.store_followers.count_documents({
            "store_id": store.get("store_id")
        })
        store["follower_count"] = follower_count

        # Verified + plan from producer user (S-04)
        producer = producer_map.get(pid, {})
        store["verified"] = producer.get("approved", False)
        store["producer_verified"] = store["verified"]
        store["plan"] = producer.get("subscription_plan", "free")

        # S-06: Approximate coordinates for stores without them
        if not store.get("coordinates") or not store["coordinates"].get("lat"):
            approx = _approx_coords(store.get("location") or store.get("full_address") or "")
            if approx:
                store["coordinates"] = approx

        # Rating from product reviews (S-04)
        if product_count > 0:
            product_ids = [p["product_id"] for p in await db.products.find(
                {"producer_id": pid, **_public_product_filter()},
                {"_id": 0, "product_id": 1}
            ).to_list(100)]
            if product_ids:
                pipeline = [
                    {"$match": {"product_id": {"$in": product_ids}, "approved": True}},
                    {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
                ]
                try:
                    agg = await db.reviews.aggregate(pipeline).to_list(1)
                    if agg:
                        store["rating"] = round(agg[0]["avg"], 1)
                        store["review_count"] = agg[0]["count"]
                    else:
                        store["rating"] = 0
                        store["review_count"] = 0
                except Exception:
                    store["rating"] = 0
                    store["review_count"] = 0
            else:
                store["rating"] = 0
                store["review_count"] = 0
        else:
            store["rating"] = 0
            store["review_count"] = 0

    return stores

@router.get("/store/{slug}")
async def get_store_by_slug(slug: str):
    """Get public store profile by slug"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0})
    if not store:
        # Try to find by producer_id as fallback
        store = await db.store_profiles.find_one({"producer_id": slug}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get producer info for additional details
    producer = await db.users.find_one({"user_id": store["producer_id"]}, {"_id": 0, "password_hash": 0})
    if producer:
        store["producer_name"] = producer.get("name", store["name"])
        store["producer_verified"] = producer.get("approved", False)
        store["verified"] = store["producer_verified"]
        store["owner_role"] = producer.get("role", "producer")
        store["plan"] = producer.get("subscription_plan", "free")
    
    # Ensure owner_type is set (backward compatibility)
    if "owner_type" not in store:
        store["owner_type"] = store.get("store_type", "producer")
    
    # Calculate rating from product reviews
    products = await db.products.find(
        {"producer_id": store["producer_id"], **_public_product_filter()},
        {"product_id": 1}
    ).to_list(1000)
    product_ids = [p["product_id"] for p in products if p.get("product_id")]

    store["rating"] = 0
    store["review_count"] = 0
    if product_ids:
        reviews = await db.reviews.find(
            {"product_id": {"$in": product_ids}, "approved": True}
        ).to_list(500)
        if reviews:
            store["rating"] = round(sum(r.get("rating", 0) for r in reviews) / len(reviews), 1)
            store["review_count"] = len(reviews)

    # Get follower count for Instagram-style display
    follower_count = await db.store_followers.count_documents({"store_id": store.get("store_id")})
    store["follower_count"] = follower_count
    
    # Get product count
    product_count = await db.products.count_documents({"producer_id": store["producer_id"], **_public_product_filter()})
    store["product_count"] = product_count

    # Community info (auto-created on verification)
    community = await db.communities.find_one(
        {"creator_id": store["producer_id"], "type": "producer", "is_active": {"$ne": False}},
        {"_id": 0, "slug": 1, "name": 1, "member_count": 1},
    )
    if community:
        store["community_slug"] = community.get("slug")
        store["community_name"] = community.get("name")
        store["community_member_count"] = community.get("member_count", 0)

    return store

@router.get("/store/{slug}/products")
async def get_store_products(
    slug: str,
    category: Optional[str] = None,
    sort: str = "featured",
    limit: int = 20,
    offset: int = 0
):
    """Get products from a specific store"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0, "producer_id": 1})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    query = {"producer_id": store["producer_id"], **_public_product_filter()}
    if category:
        query["category_id"] = category
    
    # Sorting
    sort_map = {
        "featured": [("featured", -1), ("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "newest": [("created_at", -1)],
        "rating": [("average_rating", -1)]
    }
    sort_order = sort_map.get(sort, [("created_at", -1)])
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_order).skip(offset).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total}

@router.get("/store/{slug}/reviews")
async def get_store_reviews(slug: str, limit: int = 20, offset: int = 0):
    """Get reviews for all products in a store"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0, "producer_id": 1})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get all product IDs from this store
    products = await db.products.find(
        {"producer_id": store["producer_id"]},
        {"product_id": 1, "name": 1}
    ).to_list(1000)
    product_ids = [p.get("product_id") for p in products if p.get("product_id")]
    product_names = {p.get("product_id"): p.get("name", "") for p in products if p.get("product_id")}
    
    if not product_ids:
        return {"reviews": [], "total": 0, "average_rating": 0}
    
    # Get reviews
    reviews = await db.reviews.find(
        {"product_id": {"$in": product_ids}, "approved": True},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Add product name to each review
    for review in reviews:
        review["product_name"] = product_names.get(review["product_id"], "Unknown")
    
    total = await db.reviews.count_documents({"product_id": {"$in": product_ids}, "approved": True})
    
    # Calculate average
    all_reviews = await db.reviews.find(
        {"product_id": {"$in": product_ids}, "approved": True},
        {"rating": 1}
    ).to_list(500)
    avg_rating = round(sum(r.get("rating", 0) for r in all_reviews) / len(all_reviews), 1) if all_reviews else 0
    
    return {"reviews": reviews, "total": total, "average_rating": avg_rating}

@router.get("/store/{slug}/certificates")
async def get_store_certificates(slug: str):
    """Get all certificates for products in a store"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0, "producer_id": 1})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get all product IDs from this store
    products = await db.products.find(
        {"producer_id": store["producer_id"]},
        {"product_id": 1}
    ).to_list(1000)
    product_ids = [p["product_id"] for p in products if p.get("product_id")]

    certificates = await db.certificates.find(
        {"product_id": {"$in": product_ids}, "approved": True},
        {"_id": 0}
    ).to_list(100)
    
    return certificates

@router.get("/producer/store-profile")
async def get_my_store_profile(user: User = Depends(get_current_user)):
    """Get current producer's store profile"""
    await require_role(user, ["producer", "importer"])
    
    # Determine owner type from user role
    owner_type = user.role if user.role in ["producer", "importer", "admin"] else "producer"
    store_type = owner_type  # store_type matches owner_type
    
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"_id": 0})
    if not store:
        # Create default profile
        slug = generate_store_slug(user.company_name or user.name)
        # Check uniqueness
        existing = await db.store_profiles.find_one({"slug": slug})
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"
        
        store = {
            "store_id": f"store_{uuid.uuid4().hex[:12]}",
            "producer_id": user.user_id,
            "slug": slug,
            "name": user.company_name or user.name,
            "tagline": None,
            "story": None,
            "founder_name": None,
            "founder_quote": None,
            "hero_image": None,
            "logo": None,
            "gallery": [],
            "country": user.country,
            "region": None,
            "location": user.country,
            "full_address": user.fiscal_address,
            "map_image": None,
            "coverage_area": None,
            "delivery_time": None,
            "store_type": store_type,
            "owner_type": owner_type,
            "verified": user.approved,
            "contact_email": user.email,
            "contact_phone": user.phone,
            "whatsapp": user.whatsapp,
            "website": None,
            "social_instagram": None,
            "social_facebook": None,
            "business_hours": None,
            "badges": [],
            "rating": 0.0,
            "review_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.store_profiles.insert_one(store)
        store.pop("_id", None)
    
    return store

@router.put("/producer/store-profile")
async def update_my_store_profile(input: StoreProfileUpdate, user: User = Depends(get_current_user)):
    """Update current producer's store profile"""
    await require_role(user, ["producer", "importer"])
    
    # Get existing profile or create one
    store = await db.store_profiles.find_one({"producer_id": user.user_id})
    if not store:
        # First get the profile (this will create it)
        await get_my_store_profile(user)
    
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.store_profiles.update_one(
        {"producer_id": user.user_id},
        {"$set": update_data}
    )
    
    return {"message": "Store profile updated"}

@router.post("/producer/store-profile/upload-image")
async def upload_store_image(
    file: UploadFile = File(...),
    image_type: str = "gallery",  # hero | logo | gallery
    user: User = Depends(get_current_user)
):
    """Upload image for store profile (hero, logo, or gallery)"""
    await require_role(user, ["producer", "importer"])

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Validate file size (5MB max, 2MB for logo)
    max_size = 2 * 1024 * 1024 if image_type == "logo" else 5 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {max_size // (1024*1024)}MB")
    
    # Upload to Cloudinary
    result = await cloudinary_upload(content, folder="stores", filename=f"store_{user.user_id}_{image_type}_{uuid.uuid4().hex[:6]}")
    image_url = result["url"]
    
    # Auto-update profile if hero or logo
    if image_type in ["hero", "logo"]:
        field_name = "hero_image" if image_type == "hero" else "logo"
        await db.store_profiles.update_one(
            {"producer_id": user.user_id},
            {"$set": {field_name: image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"url": image_url, "filename": result.get("public_id", "")}

@router.get("/uploads/stores/{filename}")
async def get_store_image(filename: str):
    """Legacy: serve local store images (backward compat)"""
    file_path = Path("/app/uploads/stores") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

# ============================================
# STORE FOLLOW SYSTEM
# ============================================

@router.post("/store/{slug}/follow")
async def follow_store(slug: str, user: User = Depends(get_current_user)):
    """Follow a store to receive notifications about new products"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Check if already following
    existing = await db.store_followers.find_one({
        "user_id": user.user_id,
        "store_id": store["store_id"]
    })
    if existing:
        return {"message": "Already following", "following": True}
    
    # Create follower record
    follower = {
        "follower_id": f"follow_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "store_id": store["store_id"],
        "store_slug": store["slug"],
        "store_name": store["name"],
        "notify_email": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.store_followers.insert_one(follower)
    
    # Update follower count
    await db.store_profiles.update_one(
        {"store_id": store["store_id"]},
        {"$inc": {"follower_count": 1}}
    )
    
    return {"message": "Now following store", "following": True}

@router.delete("/store/{slug}/follow")
async def unfollow_store(slug: str, user: User = Depends(get_current_user)):
    """Unfollow a store"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    result = await db.store_followers.delete_one({
        "user_id": user.user_id,
        "store_id": store["store_id"]
    })
    
    if result.deleted_count > 0:
        await db.store_profiles.update_one(
            {"store_id": store["store_id"]},
            {"$inc": {"follower_count": -1}}
        )
    
    return {"message": "Unfollowed store", "following": False}
@router.get("/store/{slug}/following")
async def check_following_store(slug: str, user: User = Depends(get_current_user)):
    """Check if user is following a store"""
    store = await db.store_profiles.find_one({"slug": slug}, {"_id": 0, "store_id": 1})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    following = await db.store_followers.find_one({
        "user_id": user.user_id,
        "store_id": store["store_id"]
    })
    
    return {"following": following is not None}

@router.get("/user/followed-stores")
async def get_followed_stores(user: User = Depends(get_current_user)):
    """Get list of stores the user follows"""
    follows = await db.store_followers.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    return follows

async def notify_store_followers(store_id: str, product_name: str, product_id: str):
    """Send notifications to store followers when a new product is added"""
    store = await db.store_profiles.find_one({"store_id": store_id}, {"_id": 0})
    if not store:
        return
    
    followers = await db.store_followers.find({"store_id": store_id}).to_list(500)
    
    for follower in followers:
        # Create in-app notification (same schema as dispatcher_service)
        notification = {
            "user_id": follower["user_id"],
            "type": "new_product",
            "title": f"Nuevo producto en {store['name']}",
            "body": f"{store['name']} ha añadido un nuevo producto: {product_name}",
            "action_url": f"/products/{product_id}",
            "data": {"store_id": store_id, "product_id": product_id},
            "channels": ["in_app"],
            "status_by_channel": {"in_app": "sent"},
            "read_at": None,
            "created_at": datetime.now(timezone.utc),
            "sent_at": datetime.now(timezone.utc),
        }
        await db.notifications.insert_one(notification)
        
        # Send email if enabled
        if follower.get("notify_email", True):
            user = await db.users.find_one({"user_id": follower["user_id"]}, {"_id": 0, "email": 1, "name": 1})
            if user and user.get("email"):
                try:
                    html = f'''
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0c0a09;">¡Nuevo producto en {store["name"]}!</h2>
                        <p>Hola {user.get("name", "")},</p>
                        <p>Una tienda que sigues ha añadido un nuevo producto:</p>
                        <div style="background: #f5f5f4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <h3 style="margin: 0 0 8px 0; color: #1c1917;">{product_name}</h3>
                            <p style="margin: 0; color: #78716c;">de {store["name"]}</p>
                        </div>
                        <a href="{FRONTEND_URL}/products/{product_id}" style="display: inline-block; background: #0c0a09; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Ver producto</a>
                        <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">
                            Recibes este email porque sigues a {store["name"]} en Hispaloshop.
                            <a href="{FRONTEND_URL}/store/{store['slug']}">Dejar de seguir</a>
                        </p>
                    </div>
                    '''
                    send_email(user["email"], f"Nuevo producto en {store['name']}", html)
                except Exception as e:
                    logger.error(f"Error sending follower notification email: {e}")
