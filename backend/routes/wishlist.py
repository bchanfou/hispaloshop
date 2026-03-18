"""
Wishlist routes: add/remove products, list wishlist.
Notifies users when wishlist product prices drop.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from core.database import db
from core.models import User
from utils.images import extract_product_image
from core.auth import get_current_user

router = APIRouter()


@router.get("/wishlist")
async def get_wishlist(user: User = Depends(get_current_user)):
    """Get the current user's wishlist with product details."""
    entries = await db.wishlists.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("added_at", -1).to_list(200)

    product_ids = [e["product_id"] for e in entries]
    if not product_ids:
        return []

    # Only show products that are still active/approved (exclude suspended/deleted)
    products = await db.products.find(
        {"product_id": {"$in": product_ids},
         "status": {"$nin": ["suspended_by_admin", "deleted", "rejected"]},
         "$or": [{"approved": True}, {"status": "active"}]},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "image_urls": 1, "approved": 1, "stock": 1, "track_stock": 1}
    ).to_list(200)
    product_map = {p["product_id"]: p for p in products}

    result = []
    for e in entries:
        prod = product_map.get(e["product_id"])
        if prod:
            result.append({
                "product_id": e["product_id"],
                "added_at": e.get("added_at"),
                "name": prod.get("name"),
                "price": prod.get("price"),
                "image": extract_product_image(prod),
            })
    return result


@router.post("/wishlist/{product_id}")
async def add_to_wishlist(product_id: str, user: User = Depends(get_current_user)):
    """Add a product to the user's wishlist."""
    existing = await db.wishlists.find_one(
        {"user_id": user.user_id, "product_id": product_id}
    )
    if existing:
        return {"message": "Already in wishlist", "in_wishlist": True}

    product = await db.products.find_one(
        {"product_id": product_id, "status": {"$nin": ["suspended_by_admin", "deleted", "rejected"]}},
        {"_id": 0, "name": 1},
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable")

    await db.wishlists.insert_one({
        "wishlist_id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "product_id": product_id,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": "Added to wishlist", "in_wishlist": True}


@router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, user: User = Depends(get_current_user)):
    """Remove a product from the user's wishlist."""
    await db.wishlists.delete_one(
        {"user_id": user.user_id, "product_id": product_id}
    )
    return {"message": "Removed from wishlist", "in_wishlist": False}


@router.get("/wishlist/check/{product_id}")
async def check_wishlist(product_id: str, user: User = Depends(get_current_user)):
    """Check if a product is in the user's wishlist."""
    existing = await db.wishlists.find_one(
        {"user_id": user.user_id, "product_id": product_id}
    )
    return {"in_wishlist": bool(existing)}
