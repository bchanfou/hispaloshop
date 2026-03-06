"""
Importer dashboard: products, orders, stats, profile.
Similar to producer routes but tailored for importers.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.models import User
from core.auth import get_current_user, require_role

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================
# IMPORTER DASHBOARD ENDPOINTS
# ============================================

@router.get("/importer/stats")
async def get_importer_stats(user: User = Depends(get_current_user)):
    """Get importer dashboard statistics"""
    await require_role(user, ["importer"])
    
    total_products = await db.products.count_documents({"producer_id": user.user_id})
    approved_products = await db.products.count_documents({"producer_id": user.user_id, "approved": True})
    pending_products = await db.products.count_documents({"producer_id": user.user_id, "approved": False})
    
    # Count orders with importer's products
    orders = await db.orders.find({}, {"line_items": 1}).to_list(500)
    order_count = sum(1 for o in orders if any(item.get("producer_id") == user.user_id for item in o.get("line_items", [])))
    
    # Get store followers count
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"store_id": 1})
    follower_count = 0
    if store:
        follower_count = await db.store_followers.count_documents({"store_id": store["store_id"]})
    
    # Low stock products
    low_stock = await db.products.find(
        {"producer_id": user.user_id, "status": "active", "stock": {"$lte": 5, "$gt": 0}},
        {"_id": 0, "product_id": 1, "name": 1, "stock": 1}
    ).limit(5).to_list(5)
    
    # Get unique countries of origin for this importer
    pipeline = [
        {"$match": {"producer_id": user.user_id}},
        {"$group": {"_id": "$origin_country", "count": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None}}}
    ]
    countries_result = await db.products.aggregate(pipeline).to_list(50)
    countries = [r["_id"] for r in countries_result if r["_id"]]
    
    # Recent reviews
    product_ids = [p["product_id"] for p in await db.products.find({"producer_id": user.user_id}, {"_id": 0, "product_id": 1}).to_list(100)]
    recent_reviews = []
    if product_ids:
        recent_reviews = await db.reviews.find(
            {"product_id": {"$in": product_ids}, "visible": True},
            {"_id": 0, "rating": 1, "comment": 1, "user_name": 1, "created_at": 1}
        ).sort("created_at", -1).limit(3).to_list(3)
    
    return {
        "total_products": total_products,
        "approved_products": approved_products,
        "pending_products": pending_products,
        "total_orders": order_count,
        "follower_count": follower_count,
        "account_status": "approved" if user.approved else "pending",
        "low_stock_products": low_stock,
        "recent_reviews": recent_reviews,
        "countries_of_origin": countries,
    }


@router.get("/importer/products")
async def get_importer_products(user: User = Depends(get_current_user)):
    """Get products for logged-in importer"""
    await require_role(user, ["importer"])
    products = await db.products.find({"producer_id": user.user_id}, {"_id": 0}).to_list(100)
    return products


@router.get("/importer/orders")
async def get_importer_orders(user: User = Depends(get_current_user)):
    """Get orders containing importer's products"""
    await require_role(user, ["importer"])
    orders = await db.orders.find({}, {"_id": 0}).to_list(500)
    importer_orders = []
    for order in orders:
        importer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == user.user_id]
        if importer_items:
            importer_orders.append({
                "order_id": order["order_id"],
                "customer_name": order.get("user_name", "Unknown"),
                "shipping_address": order.get("shipping_address", {}),
                "items": importer_items,
                "total": sum(item.get("amount", 0) for item in importer_items),
                "status": order["status"],
                "tracking_number": order.get("tracking_number"),
                "tracking_url": order.get("tracking_url"),
                "status_history": order.get("status_history", []),
                "created_at": order["created_at"],
                "updated_at": order.get("updated_at")
            })
    return importer_orders


@router.get("/importer/profile")
async def get_importer_profile(user: User = Depends(get_current_user)):
    """Get importer profile"""
    await require_role(user, ["importer"])
    importer = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "password_hash": 0}
    )
    return importer


@router.get("/importer/payments")
async def get_importer_payments(user: User = Depends(get_current_user)):
    """Get payment/earnings summary for importer"""
    await require_role(user, ["importer"])
    
    # Reuse producer payments logic
    from routes.producer import get_producer_payments
    return await get_producer_payments(user)


@router.get("/importer/health-score")
async def get_importer_health_score(user: User = Depends(get_current_user)):
    """Calculate importer health score"""
    await require_role(user, ["importer"])
    
    # Reuse producer health score logic
    from routes.producer import get_producer_health_score
    return await get_producer_health_score(user)


@router.get("/importer/store-profile")
async def get_importer_store_profile(user: User = Depends(get_current_user)):
    """Get importer's store profile"""
    await require_role(user, ["importer"])
    
    # Reuse producer store profile endpoint
    from routes.stores import get_my_store_profile
    return await get_my_store_profile(user)


@router.put("/importer/store-profile")
async def update_importer_store_profile(input: dict, user: User = Depends(get_current_user)):
    """Update importer's store profile"""
    await require_role(user, ["importer"])
    
    from routes.stores import update_my_store_profile
    from core.models import StoreProfileUpdate
    
    # Convert dict to StoreProfileUpdate
    update_data = StoreProfileUpdate(**input)
    return await update_my_store_profile(update_data, user)


# ============================================
# IMPORTER-SPECIFIC FILTERS
# ============================================

@router.get("/importer/products/by-country")
async def get_importer_products_by_country(
    country: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get importer products filtered by origin country"""
    await require_role(user, ["importer"])
    
    query = {"producer_id": user.user_id}
    if country:
        query["origin_country"] = country
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products


@router.get("/importer/products/by-batch")
async def get_importer_products_by_batch(
    batch: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get importer products filtered by import batch"""
    await require_role(user, ["importer"])
    
    query = {"producer_id": user.user_id}
    if batch:
        query["import_batch"] = batch
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products
