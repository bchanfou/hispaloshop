"""
Producer dashboard: products, certificates, orders, profile,
payments, stats, health score, follower stats, Stripe Connect.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

import stripe

from core.database import db
from core.models import User, ProducerAddressInput, ShippingPolicyInput
from core.config import PLATFORM_COMMISSION, STRIPE_SECRET_KEY
from core.monetization import COMMISSION_RATES, normalize_seller_plan
from core.auth import get_current_user, require_role
from services.auth_helpers import send_email

logger = logging.getLogger(__name__)
router = APIRouter()

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

stripe.api_key = STRIPE_SECRET_KEY


def _round_money(amount: float) -> float:
    return round(float(amount or 0), 2)


def _stripe_ready() -> bool:
    key = STRIPE_SECRET_KEY or ""
    return key.startswith(("sk_test_", "sk_live_"))


def _ensure_stripe_ready() -> None:
    if not _stripe_ready():
        raise HTTPException(status_code=503, detail="Stripe no esta configurado")


def _get_producer_financial_snapshot(order: dict, producer_id: str) -> dict:
    producer_subtotal = 0
    producer_items = []
    for item in order.get("line_items", []):
        if item.get("producer_id") != producer_id:
            continue
        item_total = item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))
        producer_subtotal += item_total
        producer_items.append({
            "product_name": item.get("product_name", ""),
            "quantity": item.get("quantity", 1),
            "price": item.get("price", 0),
            "subtotal": item_total,
        })

    if producer_subtotal <= 0:
        return {}

    split_details = order.get("split_details", [])
    producer_split = next((split for split in split_details if split.get("producer_id") == producer_id), None)
    if producer_split:
        gross_amount = _round_money(producer_split.get("gross_amount", producer_subtotal))
        platform_fee = _round_money(producer_split.get("platform_fee", 0))
        net_earnings = _round_money(producer_split.get("seller_amount", gross_amount - platform_fee))
        commission_rate = float(producer_split.get("commission_rate", 0) or 0)
        paid_out = bool(producer_split.get("paid_out", False))
    else:
        commission_data = order.get("commission_data", {})
        producer_commission = next(
            (split for split in commission_data.get("splits", []) if split.get("seller_id") == producer_id),
            None,
        )
        if producer_commission:
            gross_amount = _round_money(producer_commission.get("seller_gmv", producer_subtotal))
            platform_fee = _round_money(producer_commission.get("platform_gross", 0))
            net_earnings = _round_money(producer_commission.get("seller_payout", gross_amount - platform_fee))
            commission_rate = float(producer_commission.get("platform_rate_snapshot", 0) or 0)
        else:
            gross_amount = _round_money(producer_subtotal)
            platform_fee = _round_money(producer_subtotal * PLATFORM_COMMISSION)
            net_earnings = _round_money(gross_amount - platform_fee)
            commission_rate = PLATFORM_COMMISSION
        paid_out = False

    return {
        "gross_amount": gross_amount,
        "platform_fee": platform_fee,
        "net_earnings": net_earnings,
        "commission_rate": commission_rate,
        "paid_out": paid_out,
        "items": producer_items,
    }

# ============================================
# PRODUCER DASHBOARD ENDPOINTS
# ============================================

@router.get("/producer/products")
async def get_producer_products(user: User = Depends(get_current_user)):
    """Get products for logged-in producer"""
    await require_role(user, ["producer", "importer"])
    products = await db.products.find({"producer_id": user.user_id}, {"_id": 0}).to_list(100)
    return products

@router.get("/producer/certificates")
async def get_producer_certificates(user: User = Depends(get_current_user)):
    """Get certificates for producer's products"""
    await require_role(user, ["producer", "importer"])
    products = await db.products.find({"producer_id": user.user_id}, {"product_id": 1}).to_list(100)
    product_ids = [p["product_id"] for p in products]
    certificates = await db.certificates.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(100)
    return certificates

@router.get("/producer/orders")
async def get_producer_orders(
    page: int = 1,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    """Get orders containing producer's products"""
    await require_role(user, ["producer", "importer"])
    # Query at DB level: only orders that contain this producer's items
    query = {"line_items.producer_id": user.user_id}
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    producer_orders = []
    for order in orders:
        producer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == user.user_id]
        if producer_items:
            producer_orders.append({
                "order_id": order.get("order_id", ""),
                "customer_name": order.get("user_name", "Unknown"),
                "shipping_address": order.get("shipping_address", {}),
                "items": producer_items,
                "total": sum(item.get("subtotal", item.get("price", 0) * item.get("quantity", 1)) for item in producer_items),
                "status": order.get("status", ""),
                "tracking_number": order.get("tracking_number"),
                "tracking_url": order.get("tracking_url"),
                "status_history": order.get("status_history", []),
                "created_at": order["created_at"],
                "updated_at": order.get("updated_at")
            })
    return {"orders": producer_orders, "total": total, "page": page, "has_more": page * limit < total}


@router.get("/producer/profile")
async def get_producer_profile(user: User = Depends(get_current_user)):
    """Get producer profile including addresses"""
    await require_role(user, ["producer", "importer"])
    producer = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "password_hash": 0}
    )
    return producer


@router.put("/producer/addresses")
async def update_producer_addresses(input: ProducerAddressInput, user: User = Depends(get_current_user)):
    """Update producer office and warehouse addresses"""
    await require_role(user, ["producer", "importer"])
    
    update_data = {}
    if input.office_address is not None:
        update_data["office_address"] = input.office_address
    if input.warehouse_address is not None:
        update_data["warehouse_address"] = input.warehouse_address
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    
    return {"message": "Addresses updated"}


@router.get("/producer/shipping/policy")
async def get_shipping_policy(user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "importer"])
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {
            "_id": 0,
            "shipping_policy_enabled": 1,
            "shipping_base_cost_cents": 1,
            "shipping_free_threshold_cents": 1,
            "shipping_per_item_cents": 1,
            "shipping_local_pickup_enabled": 1,
        },
    )
    user_doc = user_doc or {}
    return {
        "enabled": bool(user_doc.get("shipping_policy_enabled", False)),
        "base_cost_cents": int(user_doc.get("shipping_base_cost_cents", 0) or 0),
        "free_threshold_cents": user_doc.get("shipping_free_threshold_cents"),
        "per_item_cents": int(user_doc.get("shipping_per_item_cents", 0) or 0),
        "local_pickup_enabled": bool(user_doc.get("shipping_local_pickup_enabled", False)),
    }


@router.put("/producer/shipping/policy")
async def update_shipping_policy(input: ShippingPolicyInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "importer"])
    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "shipping_policy_enabled": input.enabled,
                "shipping_base_cost_cents": input.base_cost_cents,
                "shipping_free_threshold_cents": input.free_threshold_cents,
                "shipping_per_item_cents": input.per_item_cents,
                "shipping_local_pickup_enabled": getattr(input, "local_pickup_enabled", False),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {
        "enabled": input.enabled,
        "base_cost_cents": input.base_cost_cents,
        "free_threshold_cents": input.free_threshold_cents,
        "per_item_cents": input.per_item_cents,
        "local_pickup_enabled": getattr(input, "local_pickup_enabled", False),
    }

@router.get("/producer/payments")
async def get_producer_payments(user: User = Depends(get_current_user)):
    """Get comprehensive payment/earnings summary for producer"""
    await require_role(user, ["producer", "importer"])
    
    # Get ALL orders that contain this producer's items (any paid status)
    all_orders = await db.orders.find(
        {"line_items.producer_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    seller_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "subscription.plan": 1, "stripe_account_id": 1},
    )
    current_plan = normalize_seller_plan((seller_doc or {}).get("subscription", {}).get("plan"))
    current_commission_rate = float(COMMISSION_RATES[current_plan])

    total_gross = 0
    total_net = 0
    total_platform_fee = 0
    pending_payout = 0
    paid_orders_count = 0
    pending_orders_count = 0
    recent_orders = []
    monthly_data = {}
    
    for order in all_orders:
        producer_financials = _get_producer_financial_snapshot(order, user.user_id)
        if not producer_financials:
            continue

        gross_amount = producer_financials["gross_amount"]
        platform_fee = producer_financials["platform_fee"]
        net_earnings = producer_financials["net_earnings"]
        is_paid = order.get("status") in ("paid", "confirmed", "preparing", "shipped", "delivered")
        
        if is_paid:
            total_gross += gross_amount
            total_net += net_earnings
            total_platform_fee += platform_fee
            paid_orders_count += 1
            
            if not producer_financials["paid_out"]:
                pending_payout += net_earnings
        else:
            pending_orders_count += 1
        
        # Monthly aggregation
        created = order.get("created_at", "")
        month_key = created[:7] if created else "unknown"  # "2026-02"
        if month_key not in monthly_data:
            monthly_data[month_key] = {"gross": 0, "net": 0, "orders": 0}
        if is_paid:
            monthly_data[month_key]["gross"] += gross_amount
            monthly_data[month_key]["net"] += net_earnings
            monthly_data[month_key]["orders"] += 1
        
        # Recent orders (last 20)
        if len(recent_orders) < 20:
            recent_orders.append({
                "order_id": order.get("order_id", ""),
                "date": order.get("created_at", ""),
                "status": order.get("status", "unknown"),
                "customer_name": order.get("user_name", "Unknown"),
                "gross_amount": gross_amount,
                "platform_fee": platform_fee,
                "net_earnings": net_earnings,
                "commission_rate": producer_financials["commission_rate"],
                "items": producer_financials["items"],
                "currency": order.get("currency", "EUR")
            })
    
    # Sort monthly data
    monthly_summary = [
        {"month": k, "gross": round(v["gross"], 2), "net": round(v["net"], 2), "orders": v["orders"]}
        for k, v in sorted(monthly_data.items(), reverse=True)
    ]
    
    # Check Stripe Connect status
    stripe_connected = False
    if seller_doc and seller_doc.get("stripe_account_id"):
        stripe_connected = True
    store = await db.stores.find_one({"user_id": user.user_id}, {"_id": 0, "stripe_account_id": 1, "stripe_charges_enabled": 1})
    if store and store.get("stripe_charges_enabled"):
        stripe_connected = True
    
    return {
        "total_gross": round(total_gross, 2),
        "total_net": round(total_net, 2),
        "total_platform_fee": round(total_platform_fee, 2),
        "pending_payout": round(pending_payout, 2),
        "commission_rate": current_commission_rate,
        "commission_plan": current_plan,
        "paid_orders": paid_orders_count,
        "pending_orders": pending_orders_count,
        "stripe_connected": stripe_connected,
        "recent_orders": recent_orders,
        "monthly_summary": monthly_summary
    }

@router.get("/producer/stats")
async def get_producer_stats(user: User = Depends(get_current_user)):
    """Get producer dashboard statistics"""
    await require_role(user, ["producer", "importer"])
    
    total_products = await db.products.count_documents({"producer_id": user.user_id})
    approved_products = await db.products.count_documents({"producer_id": user.user_id, "approved": True})
    pending_products = await db.products.count_documents({"producer_id": user.user_id, "approved": False})
    
    # Count orders with producer's products (DB-level filter, not client-side)
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
    
    # Recent reviews
    product_ids = [p["product_id"] for p in await db.products.find({"producer_id": user.user_id}, {"_id": 0, "product_id": 1}).to_list(100)]
    recent_reviews = []
    if product_ids:
        recent_reviews = await db.reviews.find(
            {"product_id": {"$in": product_ids}, "visible": True},
            {"_id": 0, "rating": 1, "comment": 1, "user_name": 1, "created_at": 1}
        ).sort("created_at", -1).limit(3).to_list(3)

    # Expiring certificates (within 30 days)
    thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
    now_utc = datetime.now(timezone.utc)
    expiring_certs = await db.certificates.count_documents({
        "producer_id": user.user_id,
        "expiry_date": {"$lte": thirty_days, "$gt": now_utc},
        "status": {"$ne": "expired"}
    })

    # Top products by sales
    top_products_raw = await db.products.find(
        {"producer_id": user.user_id, "approved": True},
        {"_id": 0, "product_id": 1, "name": 1, "images": 1, "sales_count": 1}
    ).sort("sales_count", -1).limit(3).to_list(3)
    top_products = [
        {
            "product_id": p.get("product_id", ""),
            "name": p.get("name", ""),
            "image": (p.get("images") or [None])[0],
            "sales_count": p.get("sales_count", 0),
        }
        for p in top_products_raw
    ]

    return {
        "total_products": total_products,
        "approved_products": approved_products,
        "pending_products": pending_products,
        "total_orders": order_count,
        "follower_count": follower_count,
        "account_status": "approved" if user.approved else "pending",
        "low_stock_products": low_stock,
        "recent_reviews": recent_reviews,
        "expiring_certs": expiring_certs,
        "top_products": top_products,
    }

@router.get("/producer/health-score")
async def get_producer_health_score(user: User = Depends(get_current_user)):
    """Calculate seller health score based on sales, followers, and reviews"""
    await require_role(user, ["producer", "importer"])
    
    # Initialize scores
    sales_score = 0
    followers_score = 0
    reviews_score = 0
    products_score = 0
    profile_score = 0
    
    # Get store info
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"_id": 0})
    
    # 1. SALES SCORE (max 25 points)
    # Get orders from last 30 days
    from datetime import timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # DB-level filter: only orders containing this producer's items
    producer_order_query = {
        "line_items.producer_id": user.user_id,
        "created_at": {"$gte": thirty_days_ago},
    }
    producer_orders = await db.orders.find(
        producer_order_query, {"line_items": 1, "total_amount": 1}
    ).to_list(500)

    total_revenue = 0
    for order in producer_orders:
        for item in order.get("line_items", []):
            if item.get("producer_id") == user.user_id:
                total_revenue += item.get("price", 0) * item.get("quantity", 1)

    order_count = len(producer_orders)
    if order_count >= 20:
        sales_score = 25
    elif order_count >= 10:
        sales_score = 20
    elif order_count >= 5:
        sales_score = 15
    elif order_count >= 1:
        sales_score = 10
    else:
        sales_score = 0
    
    # 2. FOLLOWERS SCORE (max 20 points)
    follower_count = 0
    if store:
        follower_count = await db.store_followers.count_documents({"store_id": store.get("store_id")})
    
    if follower_count >= 100:
        followers_score = 20
    elif follower_count >= 50:
        followers_score = 15
    elif follower_count >= 20:
        followers_score = 10
    elif follower_count >= 5:
        followers_score = 5
    else:
        followers_score = 0
    
    # 3. REVIEWS SCORE (max 25 points)
    products = await db.products.find({"producer_id": user.user_id}, {"product_id": 1}).to_list(100)
    product_ids = [p["product_id"] for p in products]
    
    reviews = await db.reviews.find({
        "product_id": {"$in": product_ids},
        "status": "approved"
    }, {"rating": 1}).to_list(500)
    
    review_count = len(reviews)
    avg_rating = 0
    if review_count > 0:
        avg_rating = sum(r.get("rating", 0) for r in reviews) / review_count
    
    # Review count component (max 15 points)
    if review_count >= 20:
        reviews_score += 15
    elif review_count >= 10:
        reviews_score += 10
    elif review_count >= 5:
        reviews_score += 5
    elif review_count >= 1:
        reviews_score += 2
    
    # Average rating component (max 10 points)
    if avg_rating >= 4.5:
        reviews_score += 10
    elif avg_rating >= 4.0:
        reviews_score += 8
    elif avg_rating >= 3.5:
        reviews_score += 5
    elif avg_rating >= 3.0:
        reviews_score += 3
    
    # 4. PRODUCTS SCORE (max 15 points)
    approved_products = await db.products.count_documents({"producer_id": user.user_id, "approved": True})
    
    if approved_products >= 10:
        products_score = 15
    elif approved_products >= 5:
        products_score = 10
    elif approved_products >= 3:
        products_score = 7
    elif approved_products >= 1:
        products_score = 3
    
    # 5. PROFILE COMPLETENESS (max 15 points)
    if store:
        if store.get("name"):
            profile_score += 3
        if store.get("tagline"):
            profile_score += 2
        if store.get("story"):
            profile_score += 3
        if store.get("logo_url"):
            profile_score += 3
        if store.get("hero_image_url"):
            profile_score += 2
        if store.get("location"):
            profile_score += 2
    
    # Calculate total score
    total_score = sales_score + followers_score + reviews_score + products_score + profile_score
    
    # Determine health status
    if total_score >= 80:
        status = "excellent"
        status_label = "Excelente"
        status_color = "green"
    elif total_score >= 60:
        status = "good"
        status_label = "Bueno"
        status_color = "blue"
    elif total_score >= 40:
        status = "average"
        status_label = "Regular"
        status_color = "yellow"
    elif total_score >= 20:
        status = "needs_improvement"
        status_label = "Necesita mejorar"
        status_color = "orange"
    else:
        status = "critical"
        status_label = "Crítico"
        status_color = "red"
    
    # Generate recommendations
    recommendations = []
    if sales_score < 15:
        recommendations.append({
            "type": "sales",
            "message": "Aumenta tus ventas promocionando tus productos en redes sociales",
            "priority": "high"
        })
    if followers_score < 10:
        recommendations.append({
            "type": "followers",
            "message": "Consigue más seguidores completando tu perfil de tienda",
            "priority": "medium"
        })
    if reviews_score < 15:
        recommendations.append({
            "type": "reviews",
            "message": "Solicita reseñas a tus clientes satisfechos",
            "priority": "medium"
        })
    if products_score < 10:
        recommendations.append({
            "type": "products",
            "message": "Añade más productos para aumentar tu visibilidad",
            "priority": "low"
        })
    if profile_score < 10:
        recommendations.append({
            "type": "profile",
            "message": "Completa tu perfil de tienda con logo e historia",
            "priority": "high"
        })
    
    return {
        "total_score": total_score,
        "max_score": 100,
        "status": status,
        "status_label": status_label,
        "status_color": status_color,
        "breakdown": {
            "sales": {"score": sales_score, "max": 25, "label": "Ventas (30 días)"},
            "followers": {"score": followers_score, "max": 20, "label": "Seguidores"},
            "reviews": {"score": reviews_score, "max": 25, "label": "Reseñas"},
            "products": {"score": products_score, "max": 15, "label": "Productos"},
            "profile": {"score": profile_score, "max": 15, "label": "Perfil"}
        },
        "metrics": {
            "orders_30d": order_count,
            "revenue_30d": total_revenue,
            "follower_count": follower_count,
            "review_count": review_count,
            "avg_rating": round(avg_rating, 1),
            "approved_products": approved_products
        },
        "recommendations": recommendations[:3]  # Top 3 recommendations
    }

@router.get("/producer/follower-stats")
async def get_producer_follower_stats(user: User = Depends(get_current_user), days: int = 30):
    """Get follower statistics for producer's store over time"""
    await require_role(user, ["producer", "importer"])
    
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"store_id": 1})
    if not store:
        return {"followers": [], "total": 0}
    
    # Get followers grouped by day
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    followers = await db.store_followers.find(
        {"store_id": store["store_id"]},
        {"created_at": 1}
    ).to_list(500)

    # Group by date
    daily_counts = {}
    for f in followers:
        try:
            created = datetime.fromisoformat(f["created_at"].replace("Z", "+00:00"))
            date_key = created.strftime("%Y-%m-%d")
            daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
        except (ValueError, TypeError, KeyError):
            pass
    
    # Build cumulative chart data
    chart_data = []
    cumulative = 0
    current = start_date
    while current <= now:
        date_key = current.strftime("%Y-%m-%d")
        cumulative += daily_counts.get(date_key, 0)
        chart_data.append({
            "date": date_key,
            "followers": cumulative,
            "new": daily_counts.get(date_key, 0)
        })
        current += timedelta(days=1)
    
    return {"chart_data": chart_data, "total": len(followers)}

# ============================================
# STRIPE CONNECT FOR PRODUCERS
# ============================================
# stripe.api_key already set at module level

@router.post("/producer/stripe/create-account")
async def create_stripe_connect_account(request: Request, user: User = Depends(get_current_user)):
    """Create a Stripe Connect Express account for the producer"""
    await require_role(user, ["producer", "importer"])
    _ensure_stripe_ready()
    
    # Country name to ISO 3166-1 alpha-2 code mapping
    COUNTRY_TO_ISO = {
        "spain": "ES", "españa": "ES",
        "united states": "US", "usa": "US", "us": "US",
        "united kingdom": "GB", "uk": "GB", "great britain": "GB",
        "france": "FR", "francia": "FR",
        "germany": "DE", "alemania": "DE", "deutschland": "DE",
        "italy": "IT", "italia": "IT",
        "portugal": "PT",
        "netherlands": "NL", "holland": "NL",
        "belgium": "BE", "bélgica": "BE",
        "austria": "AT",
        "switzerland": "CH", "suiza": "CH",
        "ireland": "IE", "irlanda": "IE",
        "greece": "GR", "grecia": "GR",
        "poland": "PL", "polonia": "PL",
        "sweden": "SE", "suecia": "SE",
        "denmark": "DK", "dinamarca": "DK",
        "finland": "FI", "finlandia": "FI",
        "norway": "NO", "noruega": "NO",
        "canada": "CA", "canadá": "CA",
        "australia": "AU",
        "new zealand": "NZ", "nueva zelanda": "NZ",
        "mexico": "MX", "méxico": "MX",
        "brazil": "BR", "brasil": "BR",
        "argentina": "AR",
        "japan": "JP", "japón": "JP",
        "china": "CN",
        "india": "IN",
        "singapore": "SG", "singapur": "SG",
    }
    
    def get_country_code(country_input):
        """Convert country name or code to ISO 3166-1 alpha-2"""
        if not country_input:
            return "US"  # Default
        
        country_input = country_input.strip()
        
        # If already a 2-letter code, return uppercase
        if len(country_input) == 2 and country_input.isalpha():
            return country_input.upper()
        
        # Look up in mapping
        country_lower = country_input.lower()
        if country_lower in COUNTRY_TO_ISO:
            return COUNTRY_TO_ISO[country_lower]
        
        # Default to US if unknown
        logger.warning(f"Unknown country '{country_input}', defaulting to US")
        return "US"
    
    # Check if producer already has a Stripe account
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    if user_doc.get("stripe_account_id"):
        # Account already exists, create a new onboarding link
        try:
            origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
            account_link = stripe.AccountLink.create(
                account=user_doc["stripe_account_id"],
                refresh_url=f"{origin}/producer?stripe_refresh=true",
                return_url=f"{origin}/producer?stripe_return=true",
                type="account_onboarding",
            )
            return {"url": account_link.url, "account_id": user_doc["stripe_account_id"]}
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account link: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    try:
        # Create a new Stripe Connect Express account
        country_code = get_country_code(user.country)
        logger.info(f"Creating Stripe account for {user.email} with country code: {country_code}")
        
        account = stripe.Account.create(
            type="express",
            country=country_code,
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={
                "producer_id": user.user_id,
                "platform": "hispaloshop"
            }
        )
        
        # Store the account ID in the database
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "stripe_account_id": account.id,
                "stripe_connect_status": "pending",
                "stripe_connect_created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create an account link for onboarding
        origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{origin}/producer?stripe_refresh=true",
            return_url=f"{origin}/producer?stripe_return=true",
            type="account_onboarding",
        )
        
        logger.info(f"Created Stripe Connect account {account.id} for producer {user.user_id}")
        return {"url": account_link.url, "account_id": account.id}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@router.get("/producer/stripe/status")
async def get_stripe_connect_status(user: User = Depends(get_current_user)):
    """Get the Stripe Connect status for the producer"""
    await require_role(user, ["producer", "importer"])
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    stripe_account_id = user_doc.get("stripe_account_id")
    
    if not stripe_account_id:
        return {
            "connected": False,
            "status": "not_connected",
            "stripe_account_id": None,
            "payouts_enabled": False,
            "charges_enabled": False
        }

    if not _stripe_ready():
        return {
            "connected": user_doc.get("stripe_connect_status") == "connected",
            "status": "not_configured",
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": bool(user_doc.get("stripe_payouts_enabled", False)),
            "charges_enabled": bool(user_doc.get("stripe_charges_enabled", False)),
        }
    
    try:
        # Fetch the account status from Stripe
        account = stripe.Account.retrieve(stripe_account_id)
        
        # Determine connection status
        is_connected = account.charges_enabled and account.payouts_enabled
        status = "connected" if is_connected else "pending"
        
        # Update the status in our database
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "stripe_connect_status": status,
                "stripe_payouts_enabled": account.payouts_enabled,
                "stripe_charges_enabled": account.charges_enabled
            }}
        )
        
        return {
            "connected": is_connected,
            "status": status,
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": account.payouts_enabled,
            "charges_enabled": account.charges_enabled,
            "details_submitted": account.details_submitted
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error fetching account: {str(e)}")
        return {
            "connected": False,
            "status": "error",
            "stripe_account_id": stripe_account_id,
            "error": str(e)
        }

@router.post("/producer/stripe/create-login-link")
async def create_stripe_login_link(user: User = Depends(get_current_user)):
    """Create a login link to the Stripe Express dashboard"""
    await require_role(user, ["producer", "importer"])
    _ensure_stripe_ready()
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    stripe_account_id = user_doc.get("stripe_account_id")
    
    if not stripe_account_id:
        raise HTTPException(status_code=400, detail="No Stripe account connected")
    
    try:
        login_link = stripe.Account.create_login_link(stripe_account_id)
        return {"url": login_link.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating login link: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

# ============================================
# PAYOUT METHOD (Stripe Connect or Bank Transfer)
# ============================================

@router.get("/producer/payout-method")
async def get_payout_method(user: User = Depends(get_current_user)):
    """Get producer's payout method and bank details."""
    await require_role(user, ["producer", "importer"])
    doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "payout_method": 1, "bank_details": 1,
         "stripe_account_id": 1, "stripe_connect_status": 1,
         "stripe_payouts_enabled": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "payout_method": doc.get("payout_method", "stripe"),
        "bank_details": doc.get("bank_details"),
        "stripe_connected": doc.get("stripe_connect_status") == "connected",
        "stripe_payouts_enabled": doc.get("stripe_payouts_enabled", False),
    }


@router.put("/producer/payout-method")
async def update_payout_method(request: Request, user: User = Depends(get_current_user)):
    """Update payout method: 'stripe' or 'bank_transfer'."""
    await require_role(user, ["producer", "importer"])
    body = await request.json()
    method = body.get("payout_method")

    if method not in ("stripe", "bank_transfer"):
        raise HTTPException(status_code=400, detail="payout_method must be 'stripe' or 'bank_transfer'")

    update = {"payout_method": method}

    # If switching to bank_transfer, save bank details
    if method == "bank_transfer":
        bank = body.get("bank_details", {})
        required = ["account_holder", "bank_name", "country"]
        for field in required:
            if not bank.get(field):
                raise HTTPException(status_code=400, detail=f"bank_details.{field} is required")

        # Must have IBAN or account_number
        if not bank.get("iban") and not bank.get("account_number"):
            raise HTTPException(status_code=400, detail="IBAN or account_number is required")

        update["bank_details"] = {
            "account_holder": bank["account_holder"].strip(),
            "bank_name": bank["bank_name"].strip(),
            "country": bank["country"].strip().upper(),
            "iban": (bank.get("iban") or "").strip(),
            "account_number": (bank.get("account_number") or "").strip(),
            "swift_bic": (bank.get("swift_bic") or "").strip(),
            "routing_number": (bank.get("routing_number") or "").strip(),
            "currency": (bank.get("currency") or "EUR").strip().upper(),
            "notes": (bank.get("notes") or "").strip()[:200],
        }

    await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    return {"success": True, "payout_method": method}


@router.post("/producer/request-payout")
async def request_manual_payout(request: Request, user: User = Depends(get_current_user)):
    """Request a manual bank transfer payout."""
    await require_role(user, ["producer", "importer"])
    body = await request.json()
    amount = body.get("amount")

    if not amount or float(amount) <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "payout_method": 1, "bank_details": 1, "name": 1, "email": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    if not doc.get("bank_details"):
        raise HTTPException(status_code=400, detail="Bank details not configured. Please set up your payout method first.")

    import uuid
    payout_id = f"payout_{uuid.uuid4().hex[:12]}"
    payout = {
        "payout_id": payout_id,
        "producer_id": user.user_id,
        "producer_name": doc.get("name", ""),
        "producer_email": doc.get("email", ""),
        "amount": round(float(amount), 2),
        "currency": doc["bank_details"].get("currency", "EUR"),
        "bank_details": doc["bank_details"],
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
        "admin_notes": "",
    }
    await db.manual_payouts.insert_one(payout)

    return {"success": True, "payout_id": payout_id, "status": "pending"}


# ============================================
# ANALYTICS, SALES CHART & ALERTS
# ============================================

@router.get("/producer/sales-chart")
async def get_producer_sales_chart(user: User = Depends(get_current_user)):
    """30-day daily sales data for overview chart."""
    await require_role(user, ["producer", "importer"])
    now = datetime.now(timezone.utc)
    start_30d = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0).isoformat()

    # Single query for all 30 days (was 30 separate queries)
    all_orders = await db.orders.find(
        {"created_at": {"$gte": start_30d}, "line_items.producer_id": user.user_id},
        {"line_items": 1, "created_at": 1},
    ).to_list(2000)

    # Group by day
    daily = {}
    for o in all_orders:
        created = o.get("created_at", "")
        day_str = created[:10] if isinstance(created, str) else created.strftime("%Y-%m-%d") if created else ""
        if not day_str:
            continue
        items = [it for it in o.get("line_items", []) if it.get("producer_id") == user.user_id]
        if items:
            entry = daily.setdefault(day_str, {"revenue": 0, "orders": 0})
            entry["orders"] += 1
            entry["revenue"] += sum(it.get("subtotal", it.get("price", 0) * it.get("quantity", 1)) for it in items)

    days = []
    for i in range(29, -1, -1):
        day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        entry = daily.get(day_str, {"revenue": 0, "orders": 0})
        days.append({"date": day_str, "revenue": round(entry["revenue"], 2), "orders": entry["orders"]})
    return {"days": days}


@router.get("/producer/alerts")
async def get_producer_alerts(user: User = Depends(get_current_user)):
    """Produce actionable alerts for the overview page."""
    await require_role(user, ["producer", "importer"])
    alerts = []

    # Low stock
    low_stock = await db.products.count_documents(
        {"producer_id": user.user_id, "status": "active", "stock": {"$lte": 5, "$gt": 0}}
    )
    if low_stock:
        alerts.append({
            "type": "warning",
            "title": f"{low_stock} producto(s) con stock bajo",
            "action": "/producer/products",
        })

    # Out of stock
    out_of_stock = await db.products.count_documents(
        {"producer_id": user.user_id, "status": "active", "stock": 0}
    )
    if out_of_stock:
        alerts.append({
            "type": "danger",
            "title": f"{out_of_stock} producto(s) sin stock",
            "action": "/producer/products",
        })

    # Pending orders (filter by producer to avoid loading all platform orders)
    orders = await db.orders.find(
        {"status": {"$in": ["paid", "confirmed"]}, "line_items.producer_id": user.user_id},
        {"line_items": 1},
    ).to_list(200)
    pending = sum(
        1 for o in orders
        if any(it.get("producer_id") == user.user_id for it in o.get("line_items", []))
    )
    if pending:
        alerts.append({
            "type": "warning",
            "title": f"{pending} pedido(s) pendientes de preparar",
            "action": "/producer/orders",
        })

    # Unapproved products
    unapproved = await db.products.count_documents({"producer_id": user.user_id, "approved": False})
    if unapproved:
        alerts.append({
            "type": "info",
            "title": f"{unapproved} producto(s) pendientes de aprobación",
            "action": "/producer/products",
        })

    return alerts


@router.get("/producer/analytics")
async def get_producer_analytics(user: User = Depends(get_current_user), period: str = "30d"):
    """Analytics data: top products, sales sources, followers, conversion."""
    await require_role(user, ["producer", "importer"])

    # Parse period
    period_map = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}
    days_back = period_map.get(period, 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()

    # Get orders in period that contain this producer's items (DB-level filter)
    all_orders = await db.orders.find(
        {"created_at": {"$gte": cutoff}, "line_items.producer_id": user.user_id},
        {"line_items": 1, "source": 1, "total_amount": 1},
    ).to_list(2000)

    # Top products
    product_sales = {}
    for order in all_orders:
        for item in order.get("line_items", []):
            if item.get("producer_id") != user.user_id:
                continue
            pid = item.get("product_id")
            if not pid:
                continue
            if pid not in product_sales:
                product_sales[pid] = {"product_id": pid, "name": item.get("product_name", item.get("name", "")), "image": item.get("image"), "units_sold": 0, "revenue": 0}
            product_sales[pid]["units_sold"] += item.get("quantity", 1)
            product_sales[pid]["revenue"] += item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))

    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:5]
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)

    # Sales sources
    source_counts = {"feed": 0, "store": 0, "hispal_ai": 0, "influencer": 0, "direct": 0}
    for order in all_orders:
        has_items = any(it.get("producer_id") == user.user_id for it in order.get("line_items", []))
        if not has_items:
            continue
        src = order.get("source", "direct")
        if src in source_counts:
            source_counts[src] += 1
        else:
            source_counts["direct"] += 1

    # Followers
    store = await db.store_profiles.find_one({"producer_id": user.user_id}, {"store_id": 1})
    current_followers = 0
    delta_followers = 0
    if store:
        current_followers = await db.store_followers.count_documents({"store_id": store["store_id"]})
        delta_followers = await db.store_followers.count_documents(
            {"store_id": store["store_id"], "created_at": {"$gte": cutoff}}
        )

    # Conversion (simplified — based on available data)
    producer_orders = [
        o for o in all_orders
        if any(it.get("producer_id") == user.user_id for it in o.get("line_items", []))
    ]
    purchases = len(producer_orders)
    # Estimate visits and cart adds (we don't track these yet, so use multiples)
    store_visits = purchases * 8 if purchases else 0
    cart_adds = purchases * 3 if purchases else 0
    rate = purchases / store_visits if store_visits else 0

    return {
        "top_products": top_products,
        "sales_sources": source_counts,
        "followers": {"current": current_followers, "delta": delta_followers},
        "conversion": {
            "store_visits": store_visits,
            "cart_adds": cart_adds,
            "purchases": purchases,
            "rate": round(rate, 4),
        },
    }


# ============================================
# IMAGE UPLOAD — CLOUDINARY (persistent CDN storage)
# ============================================
