"""
Admin routes: producers, products, certificates, orders, payments, stats.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid

from ..core.config import db, PLATFORM_COMMISSION, logger
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


async def require_admin(user: User):
    """Verify user is admin."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


# Producer Management
@router.get("/producers")
async def get_all_producers(user: User = Depends(get_current_user)):
    """Get all producers."""
    await require_admin(user)
    producers = await db.users.find(
        {"role": "producer"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return producers


@router.get("/producers/pending")
async def get_pending_producers(user: User = Depends(get_current_user)):
    """Get pending producer applications."""
    await require_admin(user)
    producers = await db.users.find(
        {"role": "producer", "approved": False, "status": {"$ne": "rejected"}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return producers


@router.get("/producers/{producer_id}")
async def get_producer_detail(producer_id: str, user: User = Depends(get_current_user)):
    """Get single producer details."""
    await require_admin(user)
    producer = await db.users.find_one(
        {"user_id": producer_id, "role": "producer"},
        {"_id": 0, "password_hash": 0}
    )
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")
    return producer


@router.put("/producers/{producer_id}/status")
async def update_producer_status(
    producer_id: str,
    status: str,
    user: User = Depends(get_current_user)
):
    """Update producer status: pending, approved, rejected, paused."""
    await require_admin(user)
    if status not in ["pending", "approved", "rejected", "paused"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status, "approved": status == "approved"}
    await db.users.update_one(
        {"user_id": producer_id, "role": "producer"},
        {"$set": update_data}
    )
    return {"message": f"Producer status updated to {status}"}


@router.put("/producers/{producer_id}")
async def update_producer(
    producer_id: str,
    data: dict,
    user: User = Depends(get_current_user)
):
    """Edit producer data."""
    await require_admin(user)
    allowed_fields = ["name", "company_name", "phone", "whatsapp", "contact_person", "fiscal_address", "vat_cif", "country"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if update_data:
        await db.users.update_one(
            {"user_id": producer_id, "role": "producer"},
            {"$set": update_data}
        )
    return {"message": "Producer updated"}


# Product Management
@router.get("/products")
async def get_all_products_admin(user: User = Depends(get_current_user)):
    """Get all products (including unapproved)."""
    await require_admin(user)
    products = await db.products.find({}, {"_id": 0}).to_list(500)
    return products


@router.get("/products/pending")
async def get_pending_products(user: User = Depends(get_current_user)):
    """Get products pending approval."""
    await require_admin(user)
    products = await db.products.find({"approved": False}, {"_id": 0}).to_list(100)
    return products


@router.put("/products/{product_id}/approve")
async def approve_product(
    product_id: str,
    approved: bool,
    user: User = Depends(get_current_user)
):
    """Approve or reject a product."""
    await require_admin(user)
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"approved": approved}}
    )
    return {"message": "Product approval updated"}


@router.put("/products/{product_id}/price")
async def update_product_price(
    product_id: str,
    price: float,
    user: User = Depends(get_current_user)
):
    """Admin can edit product prices."""
    await require_admin(user)
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"price": price}}
    )
    return {"message": "Product price updated"}


@router.put("/products/{product_id}/stock")
async def update_product_stock_admin(
    product_id: str,
    stock: int,
    user: User = Depends(get_current_user)
):
    """Admin can edit product stock."""
    await require_admin(user)
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"stock": stock}}
    )
    return {"message": "Stock updated"}


@router.get("/products/low-stock")
async def get_low_stock_products(user: User = Depends(get_current_user)):
    """Get products with low stock."""
    await require_admin(user)
    products = await db.products.find(
        {"$expr": {"$lt": ["$stock", "$low_stock_threshold"]}},
        {"_id": 0}
    ).to_list(100)
    return products


# Certificate Management
@router.get("/certificates")
async def get_all_certificates_admin(user: User = Depends(get_current_user)):
    """Get all certificates."""
    await require_admin(user)
    certificates = await db.certificates.find({}, {"_id": 0}).to_list(500)
    return certificates


@router.get("/certificates/pending")
async def get_pending_certificates(user: User = Depends(get_current_user)):
    """Get certificates pending approval."""
    await require_admin(user)
    certificates = await db.certificates.find({"approved": False}, {"_id": 0}).to_list(100)
    return certificates


@router.put("/certificates/{certificate_id}/approve")
async def approve_certificate(
    certificate_id: str,
    approved: bool,
    user: User = Depends(get_current_user)
):
    """Approve or reject a certificate."""
    await require_admin(user)
    await db.certificates.update_one(
        {"certificate_id": certificate_id},
        {"$set": {"approved": approved}}
    )
    
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "approved" if approved else "rejected",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate approval updated"}


@router.put("/certificates/{certificate_id}")
async def update_certificate_admin(
    certificate_id: str,
    data: Dict[str, Any],
    user: User = Depends(get_current_user)
):
    """Admin can edit certificate data."""
    await require_admin(user)
    await db.certificates.update_one(
        {"certificate_id": certificate_id},
        {"$set": {"data": data}}
    )
    
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "edited",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate updated"}


@router.get("/certificates/{certificate_id}/history")
async def get_certificate_history(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Get certificate change history."""
    await require_admin(user)
    logs = await db.certificate_logs.find(
        {"certificate_id": certificate_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    return logs


# Orders & Payments
@router.get("/orders")
async def get_all_orders_admin(user: User = Depends(get_current_user)):
    """Get all orders."""
    await require_admin(user)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@router.get("/payments")
async def get_all_payments_admin(user: User = Depends(get_current_user)):
    """Get all payments with commission breakdown."""
    await require_admin(user)
    payments = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    total_amount = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    platform_commission = total_amount * PLATFORM_COMMISSION
    producer_share = total_amount * (1 - PLATFORM_COMMISSION)
    
    return {
        "payments": payments,
        "summary": {
            "total_amount": total_amount,
            "platform_commission": platform_commission,
            "producer_share": producer_share,
            "commission_rate": PLATFORM_COMMISSION
        }
    }


@router.get("/payments/by-producer/{producer_id}")
async def get_payments_by_producer(
    producer_id: str,
    user: User = Depends(get_current_user)
):
    """Get payments for a specific producer."""
    await require_admin(user)
    orders = await db.orders.find({}, {"_id": 0}).to_list(500)
    
    producer_orders = []
    for order in orders:
        producer_items = [
            item for item in order.get("line_items", [])
            if item.get("producer_id") == producer_id
        ]
        if producer_items:
            producer_orders.append({
                "order_id": order.get("order_id", ""),
                "items": producer_items,
                "total": sum(item.get("amount", 0) for item in producer_items),
                "status": order.get("status", ""),
                "created_at": order.get("created_at", "")
            })
    return producer_orders


# Dashboard Stats
@router.get("/stats")
async def get_admin_stats(user: User = Depends(get_current_user)):
    """Get admin dashboard statistics."""
    await require_admin(user)
    
    stats = {
        "pending_producers": await db.users.count_documents({
            "role": "producer",
            "approved": False,
            "status": {"$ne": "rejected"}
        }),
        "total_producers": await db.users.count_documents({"role": "producer"}),
        "pending_products": await db.products.count_documents({"approved": False}),
        "total_products": await db.products.count_documents({}),
        "pending_certificates": await db.certificates.count_documents({"approved": False}),
        "total_orders": await db.orders.count_documents({}),
        "total_customers": await db.users.count_documents({"role": "customer"})
    }
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    stats["recent_orders"] = recent_orders
    
    return stats
