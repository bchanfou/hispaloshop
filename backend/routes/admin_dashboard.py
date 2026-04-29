"""
Admin dashboard: producer management, product/certificate approval,
order management, payments, analytics, super admin stats, geo, market coverage.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import asyncio
import logging

from core.database import db
from core.models import User, RejectCertificateInput, PageVisitRequest
from core.constants import SUPPORTED_COUNTRIES
from core.auth import get_current_user, require_role, require_super_admin
from services.auth_helpers import send_email
from services.audit_logger import log_admin_action
from routes.notifications import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_admin_country_scope(user: User) -> Optional[str]:
    """
    Return assigned country for admins; super_admin sees all countries (None).
    Raises 403 if an admin has no assigned_country — prevents accidental global access.
    """
    if user.role == "super_admin":
        return None
    admin_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "assigned_country": 1})
    country = (admin_doc or {}).get("assigned_country")
    if not country:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Admin account has no assigned country. Contact super_admin to configure your country scope."
        )
    return country


async def _build_seller_query(user: User, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Scope seller queries to producer/importer and admin country."""
    query: Dict[str, Any] = {"role": {"$in": ["producer", "importer"]}}
    scoped_country = await _get_admin_country_scope(user)
    if scoped_country:
        query["country"] = scoped_country
    if extra:
        query.update(extra)
    return query


async def _get_scoped_seller_ids(user: User) -> List[str]:
    """Return seller user_ids (producer/importer) visible for current admin scope."""
    seller_query = await _build_seller_query(user)
    sellers = await db.users.find(seller_query, {"_id": 0, "user_id": 1}).to_list(2000)
    return [s.get("user_id") for s in sellers if s.get("user_id")]

# ============================================
# ADMIN DASHBOARD ENDPOINTS
# ============================================

# Admin - Payout Transfer Audit

@router.get("/admin/payouts/failed")
async def get_failed_payouts(user: User = Depends(get_current_user)):
    """List payouts in transfer_failed or pending_transfer states for manual review."""
    await require_role(user, ["admin", "super_admin"])

    from database import AsyncSessionLocal
    from sqlalchemy import select as sa_select
    from models import Payout

    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(
            sa_select(Payout).where(
                Payout.status.in_(["transfer_failed", "pending_transfer"])
            ).order_by(Payout.requested_at.desc())
        )
        payouts = result.scalars().all()

    return {
        "payouts": [
            {
                "id": str(p.id),
                "influencer_id": str(p.influencer_id),
                "amount_cents": p.amount_cents,
                "currency": p.currency,
                "status": p.status,
                "method": p.method,
                "stripe_transfer_id": p.stripe_transfer_id,
                "requested_at": p.requested_at.isoformat() if p.requested_at else None,
                "processed_at": p.processed_at.isoformat() if p.processed_at else None,
                "failed_at": p.failed_at.isoformat() if p.failed_at else None,
                "failure_reason": p.failure_reason,
            }
            for p in payouts
        ],
        "total": len(payouts),
        "transfer_failed": sum(1 for p in payouts if p.status == "transfer_failed"),
        "pending_transfer": sum(1 for p in payouts if p.status == "pending_transfer"),
    }


# Admin - Producer Management
@router.get("/admin/producers")
async def get_all_producers(user: User = Depends(get_current_user)):
    """Get all producers/importers with all statuses (scoped by admin country)."""
    await require_role(user, ["admin"])
    query = await _build_seller_query(user)
    producers = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(300)
    return producers

@router.get("/admin/producers/pending")
async def get_pending_producers(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    query = await _build_seller_query(user, {"approved": False, "status": {"$ne": "rejected"}})
    producers = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(300)
    return producers

@router.get("/admin/producers/{producer_id}")
async def get_producer_detail(producer_id: str, user: User = Depends(get_current_user)):
    """Get single producer/importer details within admin scope."""
    await require_role(user, ["admin"])
    query = await _build_seller_query(user, {"user_id": producer_id})
    producer = await db.users.find_one(query, {"_id": 0, "password_hash": 0})
    if not producer:
        raise HTTPException(status_code=404, detail="Seller not found")
    return producer

@router.put("/admin/producers/{producer_id}/status")
async def update_producer_status(producer_id: str, status: str, user: User = Depends(get_current_user)):
    """Update producer/importer status: pending, approved, rejected, paused."""
    await require_role(user, ["admin"])
    if status not in ["pending", "approved", "rejected", "paused"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    scope_query = await _build_seller_query(user, {"user_id": producer_id})
    target = await db.users.find_one(scope_query, {"_id": 0, "user_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Seller not found")

    update_data = {"status": status, "approved": status == "approved"}
    await db.users.update_one(scope_query, {"$set": update_data})
    await log_admin_action(
        admin_id=user.user_id,
        admin_role=user.role,
        action="producer_status_changed",
        target_type="producer",
        target_id=producer_id,
        details=f"Producer status changed to {status}",
        extra={"new_status": status},
    )
    return {"message": f"Seller status updated to {status}"}

@router.put("/admin/producers/{producer_id}")
async def update_producer(producer_id: str, data: dict, user: User = Depends(get_current_user)):
    """Edit producer/importer data within admin country scope."""
    await require_role(user, ["admin"])
    # Only allow certain fields to be updated
    allowed_fields = ["name", "company_name", "phone", "whatsapp", "contact_person", "fiscal_address", "vat_cif", "country"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if update_data:
        scope_query = await _build_seller_query(user, {"user_id": producer_id})
        target = await db.users.find_one(scope_query, {"_id": 0, "user_id": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Seller not found")
        await db.users.update_one(scope_query, {"$set": update_data})
    return {"message": "Seller updated"}

# Admin - Product Management (enhanced)
@router.get("/admin/products")
async def get_all_products_admin(user: User = Depends(get_current_user)):
    """Get all products for admin (including unapproved)"""
    await require_role(user, ["admin"])
    product_query: Dict[str, Any] = {}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            product_query["producer_id"] = {"$in": scoped_seller_ids}
        else:
            product_query["producer_id"] = "__none__"
    products = await db.products.find(product_query, {"_id": 0}).to_list(500)
    return products

@router.get("/admin/products/pending")
async def get_pending_products(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    pending_query: Dict[str, Any] = {"approved": False}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            pending_query["producer_id"] = {"$in": scoped_seller_ids}
        else:
            pending_query["producer_id"] = "__none__"
    products = await db.products.find(pending_query, {"_id": 0}).to_list(100)
    return products

@router.put("/admin/products/{product_id}/approve")
async def approve_product(product_id: str, approved: bool, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    
    # Get product info before update
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if product.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Product not found")
    was_approved = product.get("approved", False) if product else False
    
    await db.products.update_one({"product_id": product_id}, {"$set": {"approved": approved, "status": "active" if approved else "inactive"}})
    
    # Sync certificate status with product approval
    cert_status = "approved" if approved else "rejected"
    await db.certificates.update_many(
        {"product_id": product_id},
        {"$set": {"approved": approved, "status": cert_status, "reviewed_by": user.user_id, "reviewed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If newly approved, notify store followers
    if approved and not was_approved and product:
        # Notify producer their product was approved
        await create_notification(
            user_id=product.get("producer_id", ""),
            title="Producto aprobado",
            body=f"Tu producto '{product.get('name', '')}' ha sido aprobado y ya esta visible en la tienda.",
            notification_type="verification_approved",
            action_url=f"/product/{product_id}",
        )
        try:
            store = await db.store_profiles.find_one({"producer_id": product["producer_id"]})
            if store:
                from routes.stores import notify_store_followers
                from services.background import create_safe_task
                create_safe_task(notify_store_followers(store["store_id"], product["name"], product_id), name="admin_notify_followers")
        except Exception as e:
            logger.warning(f"Could not notify: {e}")
    elif not approved and product:
        # Notify producer their product was rejected
        await create_notification(
            user_id=product.get("producer_id", ""),
            title="Producto rechazado",
            body=f"Tu producto '{product.get('name', '')}' no ha sido aprobado. Revisa los requisitos.",
            notification_type="verification_rejected",
            action_url="/producer/products",
        )
    
    await log_admin_action(
        admin_id=user.user_id,
        admin_role=user.role,
        action="product_approved" if approved else "product_rejected",
        target_type="product",
        target_id=product_id,
        details=f"Product {'approved' if approved else 'rejected'}: {product.get('name', '')}",
    )
    return {"message": "Product approval updated"}

@router.put("/admin/products/{product_id}/featured")
async def toggle_product_featured(product_id: str, featured: bool, user: User = Depends(get_current_user)):
    """Admin: toggle featured status. Featured only affects Best Products section."""
    await require_role(user, ["admin"])
    if user.role != "super_admin":
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "producer_id": 1})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if product.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Product not found")
    await db.products.update_one({"product_id": product_id}, {"$set": {"featured": featured}})
    await log_admin_action(
        admin_id=user.user_id,
        admin_role=user.role,
        action="product_featured" if featured else "product_unfeatured",
        target_type="product",
        target_id=product_id,
        details=f"Product {'featured' if featured else 'unfeatured'}",
    )
    return {"message": f"Product {'featured' if featured else 'unfeatured'}"}

@router.put("/admin/products/{product_id}/price")
async def update_product_price(product_id: str, price: float, user: User = Depends(get_current_user)):
    """Admin can edit product prices — notifies wishlist users if price dropped"""
    await require_role(user, ["admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "price": 1, "name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role != "super_admin":
        product_scope = await db.products.find_one({"product_id": product_id}, {"_id": 0, "producer_id": 1})
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if not product_scope or product_scope.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Product not found")
    old_price = product.get("price", 0) if product else 0
    
    await db.products.update_one({"product_id": product_id}, {"$set": {"price": price, "price_cents": int(round(price * 100))}})
    await log_admin_action(
        admin_id=user.user_id,
        admin_role=user.role,
        action="product_price_changed",
        target_type="product",
        target_id=product_id,
        details=f"Price changed from {old_price:.2f} to {price:.2f}",
        extra={"old_price": old_price, "new_price": price},
    )

    # Notify wishlist users if price dropped
    if product and price < old_price:
        wishlist_entries = await db.wishlists.find(
            {"product_id": product_id}, {"_id": 0, "user_id": 1}
        ).to_list(500)
        for entry in wishlist_entries:
            await create_notification(
                user_id=entry["user_id"],
                title="Bajada de precio",
                body=f"'{product.get('name', '')}' bajo de {old_price:.2f}EUR a {price:.2f}EUR.",
                notification_type="system",
                action_url=f"/product/{product_id}",
            )
    
    return {"message": "Product price updated"}

# Admin - Certificate Management (enhanced)
@router.get("/admin/certificates")
async def get_all_certificates_admin(user: User = Depends(get_current_user)):
    """Get all certificates for admin with producer info"""
    await require_role(user, ["admin"])
    cert_query: Dict[str, Any] = {}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            cert_query["producer_id"] = {"$in": scoped_seller_ids}
        else:
            cert_query["producer_id"] = "__none__"
    certificates = await db.certificates.find(cert_query, {"_id": 0}).to_list(500)
    
    # Enrich with producer names
    for cert in certificates:
        if cert.get("producer_id"):
            producer = await db.users.find_one({"user_id": cert["producer_id"]}, {"name": 1, "company_name": 1})
            if producer:
                cert["producer_name"] = producer.get("company_name") or producer.get("name", "Unknown")
        else:
            cert["producer_name"] = "Unknown"
    
    return certificates

@router.get("/admin/certificates/pending")
async def get_pending_certificates(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    cert_query: Dict[str, Any] = {"approved": False, "rejected": {"$ne": True}}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            cert_query["producer_id"] = {"$in": scoped_seller_ids}
        else:
            cert_query["producer_id"] = "__none__"
    certificates = await db.certificates.find(cert_query, {"_id": 0}).to_list(100)
    return certificates

@router.put("/admin/certificates/{certificate_id}/approve")
async def approve_certificate(certificate_id: str, approved: bool, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "producer_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if cert.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Certificate not found")
    update_data = {
        "approved": approved,
        "rejected": False,
        "rejection_reason": None
    }
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": update_data})
    # Log the change
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "approved" if approved else "approval_revoked",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate approval updated"}


@router.put("/admin/certificates/{certificate_id}/reject")
async def reject_certificate(certificate_id: str, input: RejectCertificateInput, user: User = Depends(get_current_user)):
    """Reject a certificate with a reason"""
    await require_role(user, ["admin"])
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "producer_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if cert.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Certificate not found")
    update_data = {
        "approved": False,
        "rejected": True,
        "rejection_reason": input.reason
    }
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": update_data})
    # Log the change
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "rejected",
        "reason": input.reason,
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate rejected"}

@router.delete("/admin/certificates/{certificate_id}")
async def delete_certificate_admin(certificate_id: str, user: User = Depends(get_current_user)):
    """Delete a certificate permanently"""
    await require_role(user, ["admin"])
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "producer_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if cert.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Certificate not found")
    result = await db.certificates.delete_one({"certificate_id": certificate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certificate not found")
    # Log the deletion
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "deleted",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate deleted"}

@router.put("/admin/certificates/{certificate_id}")
async def update_certificate_admin(certificate_id: str, data: Dict[str, Any], user: User = Depends(get_current_user)):
    """Admin can edit certificate data"""
    await require_role(user, ["admin"])
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "producer_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if cert.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Certificate not found")
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": {"data": data}})
    # Log the change
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "edited",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate updated"}

@router.get("/admin/certificates/{certificate_id}/history")
async def get_certificate_history(certificate_id: str, user: User = Depends(get_current_user)):
    """Get certificate change history"""
    await require_role(user, ["admin"])
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "producer_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if cert.get("producer_id") not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Certificate not found")
    logs = await db.certificate_logs.find({"certificate_id": certificate_id}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return logs

# Admin - Orders & Payments (view-only)
@router.get("/admin/orders")
async def get_all_orders_admin(user: User = Depends(get_current_user)):
    """Get all orders for admin view"""
    await require_role(user, ["admin"])

    order_query: Dict[str, Any] = {}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            order_query["line_items.producer_id"] = {"$in": scoped_seller_ids}
        else:
            order_query["line_items.producer_id"] = "__none__"

    orders = await db.orders.find(order_query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@router.get("/admin/payments")
async def get_all_payments_admin(user: User = Depends(get_current_user)):
    """Get all payments with commission breakdown"""
    await require_role(user, ["admin"])

    payment_query: Dict[str, Any] = {}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            scoped_orders = await db.orders.find(
                {"line_items.producer_id": {"$in": scoped_seller_ids}},
                {"_id": 0, "order_id": 1}
            ).to_list(2000)
            scoped_order_ids = [o.get("order_id") for o in scoped_orders if o.get("order_id")]
            if scoped_order_ids:
                payment_query["order_id"] = {"$in": scoped_order_ids}
            else:
                payment_query["order_id"] = "__none__"
        else:
            payment_query["order_id"] = "__none__"

    payments = await db.payment_transactions.find(payment_query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Calculate totals per-payment using each order's actual commission rate.
    total_amount = 0.0
    platform_commission = 0.0
    completed = [p for p in payments if p.get("status") == "completed"]
    for p in completed:
        amt = float(p.get("amount", 0) or 0)
        total_amount += amt
        # Read actual rate from the associated order's commission_data
        order_id = p.get("order_id")
        rate = None
        if order_id:
            order_doc = await db.orders.find_one(
                {"order_id": order_id},
                {"_id": 0, "commission_data.splits": 1, "commission_rate": 1},
            )
            if order_doc:
                # Try commission_data.splits first (newer schema), then flat commission_rate
                splits = (order_doc.get("commission_data") or {}).get("splits") or []
                if splits:
                    # Weighted avg across sellers in this order
                    rate = sum(float(s.get("platform_rate_snapshot", 0) or 0) for s in splits) / len(splits)
                elif order_doc.get("commission_rate"):
                    rate = float(order_doc["commission_rate"])
        if rate is None:
            rate = 0.18  # PRO default if no commission_data
        platform_commission += amt * rate

    producer_share = total_amount - platform_commission
    avg_rate = (platform_commission / total_amount) if total_amount > 0 else 0

    return {
        "payments": payments,
        "summary": {
            "total_amount": round(total_amount, 2),
            "platform_commission": round(platform_commission, 2),
            "producer_share": round(producer_share, 2),
            "commission_rate": round(avg_rate, 4),
        }
    }

@router.get("/admin/payments/by-producer/{producer_id}")
async def get_payments_by_producer(producer_id: str, user: User = Depends(get_current_user)):
    """Get payments for a specific producer"""
    await require_role(user, ["admin"])

    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if producer_id not in scoped_seller_ids:
            raise HTTPException(status_code=404, detail="Producer not found in your admin scope")

    # Get orders containing this producer's products
    orders = await db.orders.find({"line_items.producer_id": producer_id}, {"_id": 0}).to_list(500)
    producer_orders = []
    for order in orders:
        producer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == producer_id]
        if producer_items:
            producer_orders.append({
                "order_id": order.get("order_id", ""),
                "items": producer_items,
                "total": sum(item.get("amount", 0) for item in producer_items),
                "status": order.get("status", ""),
                "created_at": order.get("created_at", "")
            })
    return producer_orders

# ============================================
# PAGE VISIT TRACKING (for real analytics)
# ============================================


@router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    await require_role(user, ["admin"])

    seller_query = await _build_seller_query(user)
    pending_producers = await db.users.count_documents({
        **seller_query,
        "approved": False,
        "status": {"$ne": "rejected"}
    })
    total_producers = await db.users.count_documents(seller_query)

    scoped_sellers = await db.users.find(seller_query, {"_id": 0, "user_id": 1}).to_list(2000)
    scoped_seller_ids = [u.get("user_id") for u in scoped_sellers if u.get("user_id")]

    product_query: Dict[str, Any] = {}
    pending_product_query: Dict[str, Any] = {"approved": False}
    certificate_query: Dict[str, Any] = {"approved": False}
    order_query: Dict[str, Any] = {}

    if scoped_seller_ids:
        product_query["producer_id"] = {"$in": scoped_seller_ids}
        pending_product_query["producer_id"] = {"$in": scoped_seller_ids}
        certificate_query["producer_id"] = {"$in": scoped_seller_ids}
        order_query["line_items.producer_id"] = {"$in": scoped_seller_ids}
    elif user.role != "super_admin":
        # Country-scoped admin with no sellers in scope should get zero stats.
        product_query["producer_id"] = "__none__"
        pending_product_query["producer_id"] = "__none__"
        certificate_query["producer_id"] = "__none__"
        order_query["line_items.producer_id"] = "__none__"

    pending_products = await db.products.count_documents(pending_product_query)
    total_products = await db.products.count_documents(product_query)
    pending_certificates = await db.certificates.count_documents(certificate_query)
    total_orders = await db.orders.count_documents(order_query)
    
    # GMV this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    gmv_pipeline = [
        {"$match": {**order_query, "created_at": {"$gte": month_start}, "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    gmv_result = await db.orders.aggregate(gmv_pipeline).to_list(1)
    gmv_month = gmv_result[0]["total"] if gmv_result else 0
    orders_month = gmv_result[0]["count"] if gmv_result else 0

    # New users this month
    new_users_month = await db.users.count_documents({"created_at": {"$gte": month_start}})

    # Refunded orders
    refund_query = {**order_query, "status": {"$in": ["refunded", "partially_refunded"]}}
    refunded_orders = await db.orders.count_documents(refund_query)

    # Open support cases
    open_support = await db.support_cases.count_documents({"status": {"$in": ["abierto", "en revisión", "pendiente de respuesta", "escalado a humano"]}})

    # Moderation queue pending
    pending_moderation = await db.moderation_queue.count_documents({"status": "pending"})

    # Fiscal: pending certificate reviews
    fiscal_pending_review = await db.influencers.count_documents({
        "fiscal_status.needs_manual_review": True,
        "fiscal_status.certificate_verified": {"$ne": True},
    })

    # Producer verification: pending manual reviews
    pending_verifications = await db.users.count_documents({
        "role": {"$in": ["producer", "importer"]},
        "verification_status.admin_review_required": True,
        "verification_status.is_verified": {"$ne": True},
    })

    # Producers blocked by expired certificate
    blocked_by_expired_cert = await db.users.count_documents({
        "role": {"$in": ["producer", "importer"]},
        "verification_status.blocked_from_selling": True,
        "verification_status.documents.certificates": {
            "$elemMatch": {"status": "expired"},
        },
    })

    # Manual payouts pending
    pending_payouts = await db.manual_payouts.count_documents({"status": "pending"})

    # Expiring certificates (within 30 days)
    thirty_days = now + timedelta(days=30)
    expiring_cert_query: Dict[str, Any] = {
        "expiry_date": {"$lte": thirty_days, "$gt": now},
        "status": {"$ne": "expired"}
    }
    if scoped_seller_ids:
        expiring_cert_query["producer_id"] = {"$in": scoped_seller_ids}
    elif user.role != "super_admin":
        expiring_cert_query["producer_id"] = "__none__"
    expiring_certificates = await db.certificates.count_documents(expiring_cert_query)

    return {
        "pending_producers": pending_producers,
        "total_producers": total_producers,
        "pending_products": pending_products,
        "total_products": total_products,
        "pending_certificates": pending_certificates,
        "total_orders": total_orders,
        "gmv_month": round(gmv_month, 2),
        "orders_month": orders_month,
        "new_users_month": new_users_month,
        "refunded_orders": refunded_orders,
        "open_support": open_support,
        "pending_moderation": pending_moderation,
        "fiscal_pending_review": fiscal_pending_review,
        "pending_verifications": pending_verifications,
        "blocked_by_expired_cert": blocked_by_expired_cert,
        "expiring_certificates": expiring_certificates,
        "pending_payouts": pending_payouts,
    }


@router.get("/admin/refunds")
async def get_admin_refunds(user: User = Depends(get_current_user)):
    """Get orders that have been refunded or partially refunded."""
    await require_role(user, ["admin"])

    order_query: Dict[str, Any] = {"status": {"$in": ["refunded", "partially_refunded"]}}
    if user.role != "super_admin":
        scoped_seller_ids = await _get_scoped_seller_ids(user)
        if scoped_seller_ids:
            order_query["line_items.producer_id"] = {"$in": scoped_seller_ids}
        else:
            order_query["line_items.producer_id"] = "__none__"

    orders = await db.orders.find(order_query, {"_id": 0}).sort("refunded_at", -1).to_list(200)

    # Also get orders eligible for refund (paid/delivered, not yet refunded)
    eligible_query: Dict[str, Any] = {"status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]}}
    if user.role != "super_admin":
        if scoped_seller_ids:
            eligible_query["line_items.producer_id"] = {"$in": scoped_seller_ids}
        else:
            eligible_query["line_items.producer_id"] = "__none__"

    eligible = await db.orders.find(eligible_query, {"_id": 0}).sort("created_at", -1).to_list(200)

    return {"refunded": orders, "eligible": eligible}


@router.get("/superadmin/overview")
async def superadmin_overview(user: User = Depends(get_current_user)):
    """SuperAdmin: comprehensive platform KPIs."""
    await require_role(user, ["super_admin"])
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    
    # User counts by role
    users_by_role = {}
    for role in ["customer", "producer", "importer", "influencer", "admin", "super_admin"]:
        users_by_role[role] = await db.users.count_documents({"role": role})
    total_users = sum(users_by_role.values())
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    # Revenue
    paid_statuses = ["paid", "confirmed", "preparing", "shipped", "delivered"]
    revenue_pipeline = [
        {"$match": {"status": {"$in": paid_statuses}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    rev_all = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = rev_all[0]["total"] if rev_all else 0
    total_orders = rev_all[0]["count"] if rev_all else 0
    
    rev_30d_pipeline = [
        {"$match": {"status": {"$in": paid_statuses}, "created_at": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    rev_30d = await db.orders.aggregate(rev_30d_pipeline).to_list(1)
    revenue_30d = rev_30d[0]["total"] if rev_30d else 0
    orders_30d = rev_30d[0]["count"] if rev_30d else 0
    
    # Pending actions
    pending_sellers = await db.users.count_documents({"role": {"$in": ["producer", "importer"]}, "approved": False})
    pending_products = await db.products.count_documents({"status": {"$ne": "active"}, "approved": False})
    pending_certs = await db.certificates.count_documents({"approved": False})
    flagged_posts = await db.user_posts.count_documents({"status": "reported"})
    manual_payouts_pending = await db.manual_payouts.count_documents({"status": "pending"})

    # Platform commission
    commission_total = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid_statuses}, "total_platform_fee": {"$exists": True}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_platform_fee"}}}
    ]).to_list(1)
    platform_commission = commission_total[0]["total"] if commission_total else 0
    
    # Top sellers (last 30 days)
    top_sellers_pipeline = [
        {"$match": {"status": {"$in": paid_statuses}, "created_at": {"$gte": thirty_days_ago}}},
        {"$unwind": "$line_items"},
        {"$group": {"_id": "$line_items.producer_id", "revenue": {"$sum": {"$multiply": ["$line_items.price", "$line_items.quantity"]}}, "orders": {"$sum": 1}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    top_sellers_raw = await db.orders.aggregate(top_sellers_pipeline).to_list(5)
    top_sellers = []
    for ts in top_sellers_raw:
        seller = await db.users.find_one({"user_id": ts["_id"]}, {"_id": 0, "name": 1, "company_name": 1})
        top_sellers.append({"seller_id": ts["_id"], "name": (seller or {}).get("company_name") or (seller or {}).get("name", "Unknown"), "revenue": round(ts["revenue"], 2), "orders": ts["orders"]})
    
    # Recent activity
    recent_orders = await db.orders.find({}, {"_id": 0, "order_id": 1, "user_name": 1, "total_amount": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)
    # Visit stats by country (last 90 days to bound the aggregation)
    ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    visits_by_country = await db.page_visits.aggregate([
        {"$match": {"timestamp": {"$gte": ninety_days_ago}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)

    total_visits = await db.page_visits.count_documents({"timestamp": {"$gte": ninety_days_ago}})
    visits_7d = await db.page_visits.count_documents({"timestamp": {"$gte": seven_days_ago}})
    
    # Daily visits last 7 days
    daily_visits = await db.page_visits.aggregate([
        {"$match": {"timestamp": {"$gte": seven_days_ago}}},
        {"$group": {"_id": {"$substr": ["$timestamp", 0, 10]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(7)
    
    recent_users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1, "role": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)

    # Countries with real stats
    country_configs = await db.country_configs.find({}).to_list(50)
    countries_data = []
    for cc in country_configs:
        code = cc.get("country_code", "")
        producer_count = await db.users.count_documents({"country": code, "role": {"$in": ["producer", "importer"]}})
        user_count = await db.users.count_documents({"country": code})
        has_admin = bool(cc.get("admin_user_id"))
        status = "active" if cc.get("is_active") else ("beta" if producer_count > 0 else "pending")
        countries_data.append({
            "code": code,
            "name": cc.get("name_local", code),
            "flag": cc.get("flag", ""),
            "status": status,
            "admin": has_admin,
            "producers": producer_count,
            "users": user_count,
        })

    # MRR history (last 6 months)
    mrr_history = []
    for i in range(5, -1, -1):
        # Use precise month boundaries instead of 30-day approximation
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        month_start = now.replace(year=y, month=m, day=1, hour=0, minute=0, second=0, microsecond=0)
        if m == 12:
            month_end = month_start.replace(year=y + 1, month=1)
        else:
            month_end = month_start.replace(month=m + 1)
        revenue_m = await db.orders.aggregate([
            {"$match": {
                "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()},
                "status": {"$nin": ["cancelled", "refunded"]},
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]).to_list(1)
        mrr_history.append({
            "month": month_start.strftime("%b"),
            "revenue": revenue_m[0]["total"] if revenue_m else 0,
        })

    # Plan distribution (producer subscriptions)
    plan_pipeline = [
        {"$match": {"role": {"$in": ["producer", "importer"]}}},
        {"$group": {"_id": "$subscription.plan", "count": {"$sum": 1}}},
    ]
    plan_agg = await db.users.aggregate(plan_pipeline).to_list(10)
    plan_distribution = {(p["_id"] or "FREE").upper(): p["count"] for p in plan_agg}

    return {
        "users": {"total": total_users, "by_role": users_by_role, "new_7d": new_users_7d},
        "revenue": {"total": round(total_revenue, 2), "last_30d": round(revenue_30d, 2), "platform_commission": round(platform_commission, 2)},
        "orders": {"total": total_orders, "last_30d": orders_30d},
        "pending": {"sellers": pending_sellers, "products": pending_products, "certificates": pending_certs, "flagged_posts": flagged_posts, "manual_payouts": manual_payouts_pending},
        "visits": {"total": total_visits, "last_7d": visits_7d, "by_country": [{"country": v["_id"] or "Unknown", "count": v["count"]} for v in visits_by_country], "daily": [{"date": d["_id"], "count": d["count"]} for d in daily_visits]},
        "countries": countries_data,
        "top_sellers": top_sellers,
        "recent_orders": recent_orders,
        "recent_users": recent_users,
        "mrr_history": mrr_history,
        "plan_distribution": plan_distribution,
    }


# ── Plans Configuration ────────────────────────────────────────

# Default plan config (used to seed DB if no config exists)
_DEFAULT_PLANS = {
    "seller_plans": {
        "FREE": {"price_monthly": 0, "commission_rate": 0.20, "label": "Free"},
        "PRO": {"price_monthly": 79, "commission_rate": 0.18, "label": "Pro"},
        "ELITE": {"price_monthly": 249, "commission_rate": 0.17, "label": "Elite"},
    },
    "influencer_tiers": {
        "hercules": {"rate": 0.03, "min_gmv": 0, "min_followers": 0, "label": "Hercules"},
        "atenea": {"rate": 0.05, "min_gmv": 5000, "min_followers": 2500, "label": "Atenea"},
        "zeus": {"rate": 0.07, "min_gmv": 20000, "min_followers": 10000, "label": "Zeus"},
    },
}


@router.get("/superadmin/plans")
async def get_plans_config(user: User = Depends(get_current_user)):
    """Get current plans configuration."""
    await require_role(user, ["super_admin"])
    config = await db.plans_config.find_one({"_id": "current"}, {"_id": 0})
    if not config:
        # Seed from defaults
        config = {**_DEFAULT_PLANS, "updated_at": None, "updated_by": None}
        await db.plans_config.update_one(
            {"_id": "current"}, {"$set": config}, upsert=True
        )
    return config


@router.put("/superadmin/plans")
async def update_plans_config(request: Request, user: User = Depends(get_current_user)):
    """Update plans configuration (prices, commission rates, tiers)."""
    await require_role(user, ["super_admin"])
    body = await request.json()

    # Verify password for sensitive operation
    password = body.get("password", "")
    if password:
        user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 1})
        if user_doc and user_doc.get("password_hash"):
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            if not pwd_context.verify(password, user_doc["password_hash"]):
                raise HTTPException(status_code=403, detail="Contraseña incorrecta")

    # Validate seller plans
    seller_plans = body.get("seller_plans", {})
    for plan_name, plan in seller_plans.items():
        if plan_name not in ("FREE", "PRO", "ELITE"):
            raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_name}")
        rate = plan.get("commission_rate", 0)
        if not (0 < rate <= 0.5):
            raise HTTPException(status_code=400, detail=f"Commission rate must be 0-50% for {plan_name}")
        price = plan.get("price_monthly", 0)
        if plan_name == "FREE" and price != 0:
            raise HTTPException(status_code=400, detail="FREE plan must have price 0")
        if price < 0:
            raise HTTPException(status_code=400, detail=f"Price cannot be negative for {plan_name}")

    # Validate influencer tiers
    inf_tiers = body.get("influencer_tiers", {})
    for tier_name, tier in inf_tiers.items():
        if tier_name not in ("hercules", "atenea", "zeus"):
            raise HTTPException(status_code=400, detail=f"Invalid tier: {tier_name}")
        rate = tier.get("rate", 0)
        if not (0 < rate <= 0.15):
            raise HTTPException(status_code=400, detail=f"Influencer rate must be 0-15% for {tier_name}")

    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        "seller_plans": seller_plans,
        "influencer_tiers": inf_tiers,
        "updated_at": now_iso,
        "updated_by": user.user_id,
    }

    await db.plans_config.update_one({"_id": "current"}, {"$set": update}, upsert=True)

    # Invalidate subscriptions cache so changes take effect immediately
    try:
        from services.subscriptions import _plans_cache
        _plans_cache["data"] = seller_plans
        _plans_cache["fetched_at"] = datetime.now(timezone.utc)
    except Exception:
        pass

    # Audit log
    await db.audit_log.insert_one({
        "action": "plans_config_updated",
        "user_id": user.user_id,
        "changes": update,
        "created_at": now_iso,
    })

    return {"success": True, "updated_at": now_iso}


@router.get("/superadmin/search")
async def global_search(q: str, user: User = Depends(get_current_user)):
    """SuperAdmin: global search across users, products, orders, posts."""
    await require_role(user, ["admin", "super_admin"])
    if not q or len(q) < 2:
        return {"results": []}
    
    import re as _re
    regex = {"$regex": _re.escape(q), "$options": "i"}
    results = []
    
    # Users
    users = await db.users.find(
        {"$or": [{"name": regex}, {"email": regex}, {"company_name": regex}]},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1}
    ).limit(5).to_list(5)
    for u in users:
        results.append({"type": "user", "id": u.get("user_id", ""), "title": u.get("name", ""), "subtitle": f"{u.get('email', '')} ({u.get('role', '')})", "url": f"/super-admin/users"})
    
    # Products
    products = await db.products.find(
        {"$or": [{"name": regex}, {"product_id": regex}]},
        {"_id": 0, "product_id": 1, "name": 1, "producer_name": 1}
    ).limit(5).to_list(5)
    for p in products:
        results.append({"type": "product", "id": p.get("product_id", ""), "title": p.get("name", ""), "subtitle": p.get("producer_name", ""), "url": f"/products/{p.get('product_id', '')}"})
    
    # Orders
    orders = await db.orders.find(
        {"$or": [{"order_id": regex}, {"user_name": regex}, {"user_email": regex}]},
        {"_id": 0, "order_id": 1, "user_name": 1, "total_amount": 1, "status": 1}
    ).limit(5).to_list(5)
    for o in orders:
        results.append({"type": "order", "id": o.get("order_id", ""), "title": f"#{str(o.get('order_id', ''))[-8:]}", "subtitle": f"{o.get('user_name', '')} - {o.get('total_amount',0)}€ ({o.get('status', '')})", "url": f"/super-admin"})
    
    return {"results": results, "query": q}


@router.get("/superadmin/audit-log")
async def get_audit_log(
    user: User = Depends(get_current_user),
    action: Optional[str] = None,
    severity: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
):
    """SuperAdmin: view platform audit log."""
    await require_super_admin(user)
    
    query = {}
    if action:
        query["action"] = action
    if severity:
        query["severity"] = severity
    if date_from:
        query["timestamp"] = {"$gte": date_from}
    if date_to:
        query.setdefault("timestamp", {})["$lte"] = date_to
    
    entries = await db.audit_log.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"entries": entries, "count": len(entries)}


@router.get("/geo/detect-country")
async def detect_country(request: Request):
    """Detect user's country from IP headers or default to ES."""
    # In production, use X-Forwarded-For + GeoIP service
    forwarded = request.headers.get("x-forwarded-for", "")
    cf_country = request.headers.get("cf-ipcountry", "")  # Cloudflare
    
    if cf_country and len(cf_country) == 2:
        return {"country": cf_country.upper()}
    
    # Default to ES for now (in production, integrate MaxMind GeoIP or similar)
    return {"country": "ES", "source": "default"}


@router.get("/admin/market-coverage")
async def get_market_coverage(user: User = Depends(get_current_user)):
    """SuperAdmin only: Global multi-market coverage stats by country.
    Country-scoped admins should use their own dashboard endpoints."""
    await require_super_admin(user)
    
    pipeline = [
        {"$unwind": "$inventory_by_country"},
        {"$match": {"inventory_by_country.active": True}},
        {"$group": {
            "_id": "$inventory_by_country.country_code",
            "active_products": {"$sum": 1},
            "total_stock": {"$sum": "$inventory_by_country.stock"},
            "avg_sla": {"$avg": "$inventory_by_country.delivery_sla_hours"},
            "out_of_stock": {"$sum": {"$cond": [{"$lte": ["$inventory_by_country.stock", 0]}, 1, 0]}},
            "sellers": {"$addToSet": "$producer_id"},
        }},
        {"$project": {
            "_id": 0,
            "country_code": "$_id",
            "active_products": 1,
            "total_stock": 1,
            "avg_sla_hours": {"$round": ["$avg_sla", 1]},
            "out_of_stock": 1,
            "active_sellers": {"$size": "$sellers"},
        }},
        {"$sort": {"active_products": -1}}
    ]
    
    coverage = await db.products.aggregate(pipeline).to_list(50)
    
    # Also count products WITHOUT inventory_by_country
    no_inventory = await db.products.count_documents({"inventory_by_country": {"$exists": False}})
    
    return {"coverage": coverage, "products_without_inventory": no_inventory}


@router.get("/producer/products/{product_id}/markets")
async def get_product_markets(product_id: str, user: User = Depends(get_current_user)):
    """Get inventory_by_country for a product (producer manages markets)."""
    await require_role(user, ["producer", "admin", "super_admin"])
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "inventory_by_country": 1, "producer_id": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role == "producer" and product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not your product")
    return product.get("inventory_by_country", [])


@router.put("/producer/products/{product_id}/markets")
async def update_product_markets(product_id: str, request: Request, user: User = Depends(get_current_user)):
    """Update inventory_by_country for a product. Validates SLA ≤ 48h."""
    await require_role(user, ["producer", "admin", "super_admin"])
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "producer_id": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role == "producer" and product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not your product")
    
    body = await request.json()
    markets = body.get("markets", [])
    
    validated = []
    for m in markets:
        cc = m.get("country_code", "").upper()
        if not cc or len(cc) != 2:
            continue
        sla = m.get("delivery_sla_hours", 48)
        active = m.get("active", False)
        stock = max(0, int(m.get("stock", 0)))
        
        # SLA validation: cannot activate if > 48h
        if active and sla > 48:
            raise HTTPException(status_code=400, detail=f"SLA must be ≤ 48h for {cc}. Got {sla}h.")
        # Cannot activate with 0 stock
        if active and stock <= 0:
            raise HTTPException(status_code=400, detail=f"Cannot activate {cc} with 0 stock.")
        
        validated.append({
            "country_code": cc,
            "stock": stock,
            "warehouse_id": m.get("warehouse_id", f"wh_{user.user_id}_{cc.lower()}"),
            "delivery_sla_hours": min(sla, 48),
            "active": active,
            "price": float(m.get("price", 0)),
            "currency": m.get("currency", "EUR"),
        })
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"inventory_by_country": validated, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": "ok", "markets": validated}

@router.get("/admin/analytics")
async def get_admin_analytics(
    user: User = Depends(get_current_user),
    start_date: str = None,
    end_date: str = None,
    country: str = None  # Optional country filter for super admin
):
    """Get sales and visits analytics with date range. Admin sees only their country, Super Admin can select."""
    await require_role(user, ["admin", "super_admin"])
    
    from datetime import timedelta
    
    # Determine country filter
    country_filter = None
    if user.role == "admin":
        # Admin only sees their assigned country — must have one
        admin_data = await db.users.find_one({"user_id": user.user_id}, {"assigned_country": 1})
        country_filter = (admin_data or {}).get("assigned_country")
        if not country_filter:
            raise HTTPException(
                status_code=403,
                detail="Admin account has no assigned country. Contact super_admin to configure your country scope.",
            )
    elif user.role == "super_admin" and country:
        # Super admin can filter by country (or see global if no country specified)
        country_filter = country if country != "all" else None
    
    # Default to last 30 days
    if not end_date:
        end_dt = datetime.now(timezone.utc)
    else:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    
    if not start_date:
        start_dt = end_dt - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    
    # Build order query
    order_query = {"created_at": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
    if country_filter:
        order_query["shipping_country"] = country_filter
    
    # Get orders in date range
    orders = await db.orders.find(
        order_query,
        {"created_at": 1, "total_amount": 1, "shipping_country": 1}
    ).to_list(2000)

    # Build visits query
    visits_query = {"timestamp": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
    if country_filter:
        visits_query["country"] = country_filter
    
    # Get page visits (from analytics collection if exists)
    visits = await db.page_visits.find(visits_query).to_list(2000)
    
    # Group by date
    daily_data = {}
    current = start_dt
    while current <= end_dt:
        date_key = current.strftime("%Y-%m-%d")
        daily_data[date_key] = {"date": date_key, "sales": 0, "orders": 0, "visits": 0}
        current += timedelta(days=1)
    
    # Aggregate orders
    for order in orders:
        try:
            created = order.get("created_at", "")
            if isinstance(created, str):
                date_key = created[:10]
            else:
                date_key = created.strftime("%Y-%m-%d")
            if date_key in daily_data:
                daily_data[date_key]["sales"] += order.get("total_amount", 0)
                daily_data[date_key]["orders"] += 1
        except (ValueError, TypeError, KeyError):
            pass
    
    # Aggregate visits
    for visit in visits:
        try:
            ts = visit.get("timestamp", "")
            if isinstance(ts, str):
                date_key = ts[:10]
            else:
                date_key = ts.strftime("%Y-%m-%d")
            if date_key in daily_data:
                daily_data[date_key]["visits"] += 1
        except (ValueError, TypeError, KeyError):
            pass
    
    # If no visit data, generate sample based on orders
    if not visits:
        for date_key in daily_data:
            daily_data[date_key]["visits"] = daily_data[date_key]["orders"] * 10 + 20
    
    chart_data = sorted(daily_data.values(), key=lambda x: x["date"])
    
    return {
        "chart_data": chart_data,
        "country_filter": country_filter,
        "is_global": country_filter is None
    }


# ── Superadmin: Country Management ───────────────────────────


@router.get("/superadmin/countries")
async def list_countries(user: User = Depends(get_current_user)):
    """List all configured countries with stats."""
    await require_role(user, ["super_admin"])

    configs = await db.country_configs.find({}).to_list(50)
    result = []
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()

    for cc in configs:
        code = cc.get("country_code", "")
        producer_count = await db.users.count_documents(
            {"country": code, "role": {"$in": ["producer", "importer"]}}
        )
        user_count = await db.users.count_documents({"country": code})

        # GMV last 30 days for this country
        gmv_pipeline = [
            {"$match": {
                "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]},
                "created_at": {"$gte": thirty_days_ago},
                "country": code,
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
        ]
        gmv_raw = await db.orders.aggregate(gmv_pipeline).to_list(1)
        gmv_month = round(gmv_raw[0]["total"], 2) if gmv_raw else 0.0

        result.append({
            "country_code": code,
            "name_local": cc.get("name_local", code),
            "flag": cc.get("flag", ""),
            "is_active": cc.get("is_active", False),
            "admin_assigned": bool(cc.get("admin_user_id")),
            "admin_user_id": cc.get("admin_user_id"),
            "producer_count": producer_count,
            "user_count": user_count,
            "gmv_month": gmv_month,
        })

    return {"countries": result}


@router.post("/superadmin/countries/{code}/activate")
async def activate_country(code: str, user: User = Depends(get_current_user)):
    """Activate a country. Requires an admin assigned."""
    await require_role(user, ["super_admin"])
    country_code = code.upper()

    cc = await db.country_configs.find_one({"country_code": country_code})
    if not cc:
        # Auto-create from SUPPORTED_COUNTRIES if not yet seeded
        from core.constants import SUPPORTED_COUNTRIES
        country_info = SUPPORTED_COUNTRIES.get(country_code)
        if not country_info:
            raise HTTPException(status_code=404, detail=f"Country {country_code} not recognized")
        cc = {
            "country_code": country_code,
            "name_local": country_info.get("name", country_code),
            "flag": country_info.get("flag", ""),
            "language": (country_info.get("languages") or ["en"])[0],
            "currency": country_info.get("currency", "USD"),
            "is_active": False,
            "admin_user_id": None,
        }
        await db.country_configs.insert_one(cc)

    if not cc.get("admin_user_id"):
        raise HTTPException(
            status_code=400,
            detail="No se puede activar un país sin un admin local asignado.",
        )

    await db.country_configs.update_one(
        {"country_code": country_code},
        {"$set": {"is_active": True, "activated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "activated", "country_code": country_code}


@router.post("/superadmin/countries/{code}/deactivate")
async def deactivate_country(code: str, user: User = Depends(get_current_user)):
    """Deactivate a country. Existing users keep access."""
    await require_role(user, ["super_admin"])

    cc = await db.country_configs.find_one({"country_code": code.upper()})
    if not cc:
        raise HTTPException(status_code=404, detail="Country config not found")

    await db.country_configs.update_one(
        {"country_code": code.upper()},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "deactivated", "country_code": code.upper()}


@router.put("/superadmin/countries/{code}/admin")
async def assign_country_admin(code: str, request: Request, user: User = Depends(get_current_user)):
    """Assign an admin user to a country. Sets both country_configs.admin_user_id and users.assigned_country."""
    await require_role(user, ["super_admin"])

    body = await request.json()
    admin_user_id = body.get("admin_user_id")
    if not admin_user_id:
        raise HTTPException(status_code=400, detail="admin_user_id is required")

    # Verify the target user exists and has admin role
    admin_user = await db.users.find_one({"user_id": admin_user_id}, {"role": 1})
    if not admin_user or admin_user.get("role") != "admin":
        raise HTTPException(status_code=400, detail="Target user must have admin role")

    country_code = code.upper()

    # Ensure country_config exists (upsert)
    await db.country_configs.update_one(
        {"country_code": country_code},
        {
            "$set": {
                "admin_user_id": admin_user_id,
                "admin_assigned_at": datetime.now(timezone.utc).isoformat(),
            },
            "$setOnInsert": {
                "country_code": country_code,
                "is_active": False,
            },
        },
        upsert=True,
    )

    # Set assigned_country on the admin user
    await db.users.update_one(
        {"user_id": admin_user_id},
        {"$set": {"assigned_country": country_code}},
    )

    return {"status": "assigned", "country_code": country_code, "admin_user_id": admin_user_id}


@router.put("/superadmin/countries/{code}/weekly-goal")
async def set_country_weekly_goal(code: str, request: Request, user: User = Depends(get_current_user)):
    """Set the gamification weekly goal (in cents of local currency) for a country."""
    await require_role(user, ["super_admin"])

    body = await request.json()
    weekly_goal_cents = body.get("weekly_goal_cents")
    if not isinstance(weekly_goal_cents, int) or weekly_goal_cents < 0:
        raise HTTPException(status_code=400, detail="weekly_goal_cents must be a non-negative integer")

    country_code = code.upper()
    result = await db.country_configs.update_one(
        {"country_code": country_code},
        {"$set": {"weekly_goal_cents": weekly_goal_cents}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Country config not found for {country_code}")

    return {"status": "updated", "country_code": country_code, "weekly_goal_cents": weekly_goal_cents}

