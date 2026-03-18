"""
Importer dashboard: products, orders, stats, profile.
Similar to producer routes but tailored for importers.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
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
    
    # Count orders with importer's products (DB-level filter)
    order_count = await db.orders.count_documents({"line_items.producer_id": user.user_id})
    
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
    
    # B2B specific stats
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0).isoformat()

    # B2B orders (from rfq_requests)
    b2b_active = await db.rfq_requests.count_documents(
        {"importer_id": user.user_id, "status": {"$in": ["pending", "confirmed_by_producer", "paid", "shipped"]}}
    )

    # Volume this month from B2C orders — aggregation pipeline instead of Python loop
    month_agg = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": month_start}}},
        {"$unwind": "$line_items"},
        {"$match": {"line_items.producer_id": user.user_id}},
        {"$group": {
            "_id": None,
            "volume_month": {"$sum": {
                "$ifNull": ["$line_items.subtotal",
                    {"$multiply": [
                        {"$ifNull": ["$line_items.price", 0]},
                        {"$ifNull": ["$line_items.quantity", 1]}
                    ]}
                ]
            }},
            "store_orders": {"$addToSet": "$order_id"},
        }},
    ]).to_list(1)
    agg_result = month_agg[0] if month_agg else {}
    volume_month = round(agg_result.get("volume_month", 0), 2)
    store_orders = len(agg_result.get("store_orders", []))

    # Subscription plan
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1})
    plan = (user_doc or {}).get("subscription", {}).get("plan", "FREE")

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
        "b2b_active_orders": b2b_active,
        "volume_month": round(volume_month, 2),
        "active_suppliers": len(countries),
        "store_orders": store_orders,
        "plan": plan,
    }


@router.get("/importer/alerts")
async def get_importer_alerts(user: User = Depends(get_current_user)):
    """Actionable alerts for importer overview."""
    await require_role(user, ["importer"])
    alerts = []

    # Low stock products
    low_stock = await db.products.count_documents(
        {"producer_id": user.user_id, "status": "active", "stock": {"$lte": 5, "$gt": 0}}
    )
    if low_stock:
        alerts.append({
            "type": "warning",
            "title": f"{low_stock} producto(s) con stock bajo",
            "action_href": "/producer/products",
            "action_label": "Ver",
        })

    # Out of stock
    out_of_stock = await db.products.count_documents(
        {"producer_id": user.user_id, "status": "active", "stock": 0}
    )
    if out_of_stock:
        alerts.append({
            "type": "danger",
            "title": f"{out_of_stock} producto(s) sin stock",
            "action_href": "/producer/products",
            "action_label": "Reponer",
        })

    # Pending RFQs older than 48h
    cutoff_48h = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    stale_rfqs = await db.rfq_requests.count_documents(
        {"importer_id": user.user_id, "status": "pending", "created_at": {"$lte": cutoff_48h}}
    )
    if stale_rfqs:
        alerts.append({
            "type": "warning",
            "title": f"{stale_rfqs} solicitud(es) B2B sin respuesta > 48h",
            "action_href": "/importer/orders",
            "action_label": "Ver",
        })

    # Unapproved products
    unapproved = await db.products.count_documents({"producer_id": user.user_id, "approved": False})
    if unapproved:
        alerts.append({
            "type": "info",
            "title": f"{unapproved} producto(s) pendientes de aprobación",
            "action_href": "/producer/products",
            "action_label": "Ver",
        })

    return alerts


@router.get("/importer/b2b-orders")
async def get_importer_b2b_orders(
    status: Optional[str] = None,
    limit: int = 30,
    user: User = Depends(get_current_user),
):
    """List B2B orders (RFQs) for importer."""
    await require_role(user, ["importer"])
    query = {"importer_id": user.user_id}
    if status:
        query["status"] = status

    rfqs = await db.rfq_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)

    orders = []
    for rfq in rfqs:
        # Enrich with producer info
        producer = await db.users.find_one(
            {"user_id": rfq.get("producer_id")},
            {"_id": 0, "full_name": 1, "company_name": 1}
        )
        product_ids = rfq.get("product_ids", [])
        product = None
        if product_ids:
            product = await db.products.find_one(
                {"product_id": product_ids[0]},
                {"_id": 0, "name": 1, "images": 1, "price": 1}
            )

        orders.append({
            "id": rfq.get("rfq_id"),
            "producer_name": (producer or {}).get("company_name") or (producer or {}).get("full_name", "Productor"),
            "product_name": (product or {}).get("name", "Producto"),
            "product_image": ((product or {}).get("images") or [None])[0],
            "items_count": len(product_ids),
            "quantity": rfq.get("quantity", 0),
            "unit": rfq.get("unit", "uds"),
            "unit_price": rfq.get("unit_price"),
            "total": rfq.get("total", 0),
            "status": rfq.get("status", "pending_producer"),
            "tracking_number": rfq.get("tracking_number"),
            "tracking_url": rfq.get("tracking_url"),
            "confirmed_unit_price": rfq.get("confirmed_unit_price"),
            "producer_notes": rfq.get("producer_notes"),
            "created_at": rfq.get("created_at"),
        })

    return {"orders": orders}


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
    # DB-level filter: only orders containing this importer's items
    orders = await db.orders.find(
        {"line_items.producer_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(200).to_list(200)
    importer_orders = []
    for order in orders:
        importer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == user.user_id]
        if importer_items:
            importer_orders.append({
                "order_id": order["order_id"],
                "customer_name": order.get("user_name", "Unknown"),
                "shipping_address": order.get("shipping_address", {}),
                "items": importer_items,
                "total": sum(item.get("subtotal", item.get("price", 0) * item.get("quantity", 1)) for item in importer_items),
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


@router.get("/importer/supplier-certificates")
async def get_supplier_certificates(
    q: Optional[str] = None,
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List certificates from suppliers the importer works with."""
    await require_role(user, ["importer"])

    now = datetime.now(timezone.utc)

    # Find producers this importer has ordered from (via RFQs)
    supplier_ids = await db.rfq_requests.distinct("producer_id", {"importer_id": user.user_id})
    if not supplier_ids:
        return {"certificates": []}

    # Get certificates for those suppliers
    cert_query = {"producer_id": {"$in": supplier_ids}}
    certs_raw = await db.certificates.find(cert_query, {"_id": 0}).to_list(500)

    certs = []
    for cert in certs_raw:
        producer = await db.users.find_one(
            {"user_id": cert.get("producer_id")},
            {"_id": 0, "full_name": 1, "company_name": 1}
        )
        days_until_expiry = None
        if cert.get("expiry_date"):
            try:
                exp = datetime.fromisoformat(cert["expiry_date"].replace("Z", "+00:00"))
                days_until_expiry = (exp - now).days
            except (ValueError, TypeError):
                pass

        certs.append({
            "certificate_id": cert.get("certificate_id"),
            "certification_name": cert.get("certification_name", cert.get("name", "")),
            "producer_name": (producer or {}).get("company_name") or (producer or {}).get("full_name", ""),
            "producer_id": cert.get("producer_id"),
            "expiry_date": cert.get("expiry_date"),
            "days_until_expiry": days_until_expiry,
            "pdf_url": cert.get("pdf_url"),
        })

    if q:
        q_lower = q.lower()
        certs = [c for c in certs if q_lower in (c["certification_name"] or "").lower() or q_lower in (c["producer_name"] or "").lower()]

    return {"certificates": certs}
