"""
Admin dashboard, discount codes, influencer management, super admin system,
user management, product/certificate management, stock management,
country availability, and variants/packs management.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging
import re

from core.database import db
from core.models import (
    User, DiscountCodeCreate, InfluencerCreate,
    AdminCreate, AdminStatusUpdate,
    StockUpdateInput, CountryPricingInput,
    VariantCreateInput, PackCreateInput, PackUpdateInput,
)
from core.constants import SUPPORTED_COUNTRIES
from core.auth import get_current_user, require_role, require_super_admin
from config import INFLUENCER_TIER_CONFIG, normalize_influencer_tier
from services.auth_helpers import hash_password

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_tier_metadata(tier: str | None, commission_value: float | None = None) -> dict:
    normalized_tier = normalize_influencer_tier(tier, (commission_value or 0) / 100 if commission_value is not None else None)
    config = INFLUENCER_TIER_CONFIG[normalized_tier]
    return {
        "tier": normalized_tier,
        "commission_rate": config["commission_rate"],
        "commission_value": int(round(config["commission_rate"] * 100)),
    }


def _serialize_influencer(doc: dict) -> dict:
    influencer = dict(doc)
    tier_meta = _get_tier_metadata(influencer.get("current_tier"), influencer.get("commission_value"))
    influencer["current_tier"] = tier_meta["tier"]
    influencer["commission_rate"] = influencer.get("commission_rate", tier_meta["commission_rate"])
    influencer["commission_type"] = "percentage"
    influencer["commission_value"] = influencer.get("commission_value", tier_meta["commission_value"])
    influencer["status"] = "suspended" if influencer.get("status") in {"terminated", "banned", "paused"} else influencer.get("status", "pending")
    return influencer


# ============================================
# DISCOUNT CODE MANAGEMENT (ADMIN)
# ============================================

@router.get("/admin/discount-codes")
async def get_all_discount_codes(user: User = Depends(get_current_user)):
    """Get all discount codes (admin only, country-scoped)."""
    await require_role(user, ["admin"])
    from routes.admin_dashboard import _get_admin_country_scope
    admin_country = await _get_admin_country_scope(user)
    query = {"country": admin_country} if admin_country else {}
    codes = await db.discount_codes.find(query, {"_id": 0}).to_list(500)
    return codes

@router.get("/admin/discount-codes/{code_id}")
async def get_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Get single discount code details"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return code

@router.post("/admin/discount-codes")
async def create_discount_code(input: DiscountCodeCreate, user: User = Depends(get_current_user)):
    """Create a new discount code (admin only)"""
    await require_role(user, ["admin"])
    
    existing = await db.discount_codes.find_one({"code": input.code.upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    
    if input.type not in ["percentage", "fixed", "free_shipping"]:
        raise HTTPException(status_code=400, detail="Invalid discount type. Must be 'percentage', 'fixed', or 'free_shipping'")
    
    if input.type == "percentage" and (input.value < 0 or input.value > 100):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    
    if input.type == "fixed" and input.value < 0:
        raise HTTPException(status_code=400, detail="Fixed discount value must be positive")
    
    code_id = f"disc_{uuid.uuid4().hex[:12]}"
    discount_code = {
        "code_id": code_id,
        "code": input.code.upper(),
        "type": input.type,
        "value": input.value,
        "active": input.active,
        "start_date": input.start_date,
        "end_date": input.end_date,
        "usage_limit": input.usage_limit,
        "usage_count": 0,
        "min_cart_amount": input.min_cart_amount,
        "applicable_products": input.applicable_products,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discount_codes.insert_one(discount_code)
    discount_code.pop("_id", None)
    return discount_code

@router.put("/admin/discount-codes/{code_id}")
async def update_discount_code(code_id: str, input: DiscountCodeCreate, user: User = Depends(get_current_user)):
    """Update a discount code (admin only)"""
    await require_role(user, ["admin"])
    
    existing = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    if input.code.upper() != existing["code"]:
        collision = await db.discount_codes.find_one({"code": input.code.upper(), "code_id": {"$ne": code_id}}, {"_id": 0})
        if collision:
            raise HTTPException(status_code=400, detail="Discount code already exists")
    
    update_data = {
        "code": input.code.upper(),
        "type": input.type,
        "value": input.value,
        "active": input.active,
        "start_date": input.start_date,
        "end_date": input.end_date,
        "usage_limit": input.usage_limit,
        "min_cart_amount": input.min_cart_amount,
        "applicable_products": input.applicable_products
    }
    await db.discount_codes.update_one({"code_id": code_id}, {"$set": update_data})
    return {"message": "Discount code updated"}

@router.delete("/admin/discount-codes/{code_id}")
async def delete_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Delete a discount code (admin only)"""
    await require_role(user, ["admin"])
    result = await db.discount_codes.delete_one({"code_id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return {"message": "Discount code deleted"}

@router.put("/admin/discount-codes/{code_id}/toggle")
async def toggle_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Toggle discount code active status"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    new_status = not code.get("active", True)
    await db.discount_codes.update_one({"code_id": code_id}, {"$set": {"active": new_status}})
    return {"message": f"Discount code {'activated' if new_status else 'deactivated'}", "active": new_status}


@router.get("/admin/influencer-codes/pending")
async def get_pending_influencer_codes(user: User = Depends(get_current_user)):
    """Get all influencer discount codes pending admin approval"""
    await require_role(user, ["admin"])
    codes = await db.discount_codes.find(
        {"is_influencer_code": True, "approval_status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return codes


@router.put("/admin/influencer-codes/{code_id}/approve")
async def approve_influencer_code(code_id: str, user: User = Depends(get_current_user)):
    """Approve an influencer discount code"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id, "is_influencer_code": True}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Código de influencer no encontrado")
    await db.discount_codes.update_one(
        {"code_id": code_id},
        {"$set": {"active": True, "approval_status": "approved", "approved_at": datetime.now(timezone.utc).isoformat(), "approved_by": user.email}}
    )
    return {"message": f"Código {code['code']} aprobado y activado", "code": code["code"]}


@router.put("/admin/influencer-codes/{code_id}/reject")
async def reject_influencer_code(code_id: str, reason: str = "", user: User = Depends(get_current_user)):
    """Reject an influencer discount code"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id, "is_influencer_code": True}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Código de influencer no encontrado")
    await db.discount_codes.update_one(
        {"code_id": code_id},
        {"$set": {"active": False, "approval_status": "rejected", "rejection_reason": reason, "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Also clear the influencer's discount_code_id so they can request a new one
    if code.get("influencer_id"):
        await db.influencers.update_one(
            {"influencer_id": code["influencer_id"]},
            {"$unset": {"discount_code_id": ""}}
        )
    return {"message": f"Código {code['code']} rechazado"}


# =====================================================
# PHASE 4: INFLUENCER MANAGEMENT ENDPOINTS (ADMIN)
# =====================================================

@router.get("/admin/influencers")
async def list_influencers(user: User = Depends(get_current_user)):
    """List all influencers (Admin only, country-scoped)."""
    await require_role(user, ["admin"])
    from routes.admin_dashboard import _get_admin_country_scope
    admin_country = await _get_admin_country_scope(user)
    query = {"country": admin_country} if admin_country else {}
    influencers = await db.influencers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_serialize_influencer(inf) for inf in influencers]

@router.get("/admin/influencers/{influencer_id}")
async def get_influencer(influencer_id: str, user: User = Depends(get_current_user)):
    """Get influencer details (Admin only)"""
    await require_role(user, ["admin"])
    influencer = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    if influencer.get("discount_code_id"):
        discount_code = await db.discount_codes.find_one(
            {"code_id": influencer["discount_code_id"]}, 
            {"_id": 0}
        )
        influencer["discount_code_info"] = discount_code
    
    commissions = await db.influencer_commissions.find(
        {"influencer_id": influencer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    influencer["recent_commissions"] = commissions

    return _serialize_influencer(influencer)

@router.post("/admin/influencers")
async def create_influencer(input: InfluencerCreate, user: User = Depends(get_current_user)):
    """Create a new influencer (Admin only)"""
    await require_role(user, ["admin"])
    
    existing = await db.influencers.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An influencer with this email already exists")
    
    influencer_id = f"inf_{uuid.uuid4().hex[:12]}"
    
    discount_code_str = input.discount_code or f"INF{uuid.uuid4().hex[:6].upper()}"
    discount_code_str = discount_code_str.strip().upper()
    
    existing_code = await db.discount_codes.find_one({"code": discount_code_str})
    if existing_code:
        raise HTTPException(status_code=400, detail="This discount code already exists")
    
    code_id = f"code_{uuid.uuid4().hex[:12]}"
    discount_code = {
        "code_id": code_id,
        "code": discount_code_str,
        "type": "percentage",
        "value": input.discount_percentage or 10,
        "active": True,
        "usage_limit": None,
        "usage_count": 0,
        "min_cart_amount": 0,
        "applicable_products": [],
        "influencer_id": influencer_id,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discount_codes.insert_one(discount_code)

    tier_meta = _get_tier_metadata(input.tier, input.commission_value)
    
    influencer = {
        "influencer_id": influencer_id,
        "user_id": None,
        "full_name": input.full_name,
        "email": input.email.lower(),
        "phone": input.phone,
        "social_platform": input.social_platform,
        "social_handle": input.social_handle,
        "followers_count": input.followers_count,
        "discount_code_id": code_id,
        "discount_code": discount_code_str,
        "current_tier": tier_meta["tier"],
        "commission_type": "percentage",
        "commission_value": tier_meta["commission_value"],
        "commission_rate": tier_meta["commission_rate"],
        "status": "active",
        "total_sales_generated": 0,
        "total_commission_earned": 0,
        "available_balance": 0,
        "fiscal_status": {
            "affiliate_blocked": True,
            "block_reason": "Certificado de residencia fiscal pendiente",
        },
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.influencers.insert_one(influencer)
    influencer.pop("_id", None)
    
    return _serialize_influencer(influencer)

@router.put("/admin/influencers/{influencer_id}")
async def update_influencer(influencer_id: str, full_name: Optional[str] = None, 
                           phone: Optional[str] = None, social_platform: Optional[str] = None,
                           social_handle: Optional[str] = None, followers_count: Optional[int] = None,
                           commission_rate: Optional[float] = None, tier: Optional[str] = None,
                           user: User = Depends(get_current_user)):
    """Update influencer details (Admin only)"""
    await require_role(user, ["admin"])
    
    update_data = {}
    if full_name: update_data["full_name"] = full_name
    if phone: update_data["phone"] = phone
    if social_platform: update_data["social_platform"] = social_platform
    if social_handle: update_data["social_handle"] = social_handle
    if followers_count is not None: update_data["followers_count"] = followers_count
    if commission_rate is not None or tier is not None:
        tier_meta = _get_tier_metadata(tier, commission_rate * 100 if commission_rate is not None else None)
        update_data["current_tier"] = tier_meta["tier"]
        update_data["commission_rate"] = tier_meta["commission_rate"]
        update_data["commission_type"] = "percentage"
        update_data["commission_value"] = tier_meta["commission_value"]
    
    if update_data:
        await db.influencers.update_one({"influencer_id": influencer_id}, {"$set": update_data})
    
    return {"message": "Influencer updated"}

@router.put("/admin/influencers/{influencer_id}/status")
async def update_influencer_status(influencer_id: str, status: str, user: User = Depends(get_current_user)):
    """Update influencer status (Admin only)"""
    await require_role(user, ["admin"])
    
    if status not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    influencer = await db.influencers.find_one({"influencer_id": influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {"status": status}}
    )
    
    if influencer.get("discount_code_id"):
        code_active = status == "active"
        await db.discount_codes.update_one(
            {"code_id": influencer["discount_code_id"]},
            {"$set": {"active": code_active}}
        )
    
    return {"message": f"Influencer status updated to {status}"}

@router.delete("/admin/influencers/{influencer_id}")
async def delete_influencer(influencer_id: str, user: User = Depends(get_current_user)):
    """Delete an influencer (Admin only)"""
    await require_role(user, ["admin"])
    
    influencer = await db.influencers.find_one({"influencer_id": influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    if influencer.get("discount_code_id"):
        await db.discount_codes.delete_one({"code_id": influencer["discount_code_id"]})
    
    await db.influencers.delete_one({"influencer_id": influencer_id})
    await db.influencer_commissions.delete_many({"influencer_id": influencer_id})
    
    return {"message": "Influencer deleted"}

@router.get("/admin/influencers/{influencer_id}/commissions")
async def get_influencer_commissions(influencer_id: str, user: User = Depends(get_current_user)):
    """Get commission history for an influencer (Admin only)"""
    await require_role(user, ["admin"])
    commissions = await db.influencer_commissions.find(
        {"influencer_id": influencer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return commissions

@router.get("/admin/influencer-stats")
async def get_influencer_stats(user: User = Depends(get_current_user)):
    """Get overall influencer program statistics (Admin only)"""
    await require_role(user, ["admin"])
    
    total_influencers = await db.influencers.count_documents({})
    active_influencers = await db.influencers.count_documents({"status": "active"})
    
    pipeline = [
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$total_sales_generated"},
            "total_commissions": {"$sum": "$total_commission_earned"},
            "total_pending": {"$sum": "$available_balance"}
        }}
    ]
    stats = await db.influencers.aggregate(pipeline).to_list(1)
    agg = stats[0] if stats else {"total_sales": 0, "total_commissions": 0, "total_pending": 0}
    
    return {
        "total_influencers": total_influencers,
        "active_influencers": active_influencers,
        "total_sales_generated": agg["total_sales"],
        "total_commissions_earned": agg["total_commissions"],
        "total_pending_payouts": agg["total_pending"]
    }


# =====================================================
# PHASE 5: SUPER ADMIN SYSTEM
# =====================================================

@router.get("/super-admin/admins")
async def list_admins(user: User = Depends(get_current_user)):
    """List all admin accounts (Super Admin only)"""
    await require_super_admin(user)
    
    admins = await db.users.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(100)
    
    for admin in admins:
        last_login = await db.sessions.find_one(
            {"user_id": admin["user_id"]},
            {"_id": 0, "created_at": 1}
        )
        admin["last_login"] = last_login.get("created_at") if last_login else None
    
    return admins

@router.post("/super-admin/admins")
async def create_admin(input: AdminCreate, user: User = Depends(get_current_user)):
    """Create a new admin account (Super Admin only)"""
    await require_super_admin(user)
    
    if input.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Use: admin, super_admin")
    
    existing = await db.users.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(input.password)
    
    admin_data = {
        "user_id": user_id,
        "email": input.email.lower(),
        "name": input.name,
        "role": input.role,
        "password_hash": password_hash,
        "permissions": input.permissions,
        "assigned_country": input.assigned_country,
        "email_verified": True,
        "approved": True,
        "status": "active",
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_data)
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "admin_created",
        "target_type": "admin",
        "target_id": user_id,
        "details": f"Created {input.role} account: {input.email}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    admin_data.pop("_id", None)
    admin_data.pop("password_hash", None)
    return admin_data

@router.put("/super-admin/admins/{user_id}/status")
async def update_admin_status(user_id: str, input: AdminStatusUpdate, user: User = Depends(get_current_user)):
    """Update admin account status (Super Admin only)"""
    await require_super_admin(user)
    
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    
    target_admin = await db.users.find_one({"user_id": user_id, "role": {"$in": ["admin", "super_admin"]}})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    update_data = {}
    if input.status: update_data["status"] = input.status
    if input.permissions is not None: update_data["permissions"] = input.permissions
    if input.assigned_country is not None: update_data["assigned_country"] = input.assigned_country
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "admin_status_updated",
        "target_type": "admin",
        "target_id": user_id,
        "details": f"Updated status to: {input.status}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Admin status updated"}

@router.delete("/super-admin/admins/{user_id}")
async def delete_admin(user_id: str, user: User = Depends(get_current_user)):
    """Delete an admin account (Super Admin only)"""
    await require_super_admin(user)
    
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    target_admin = await db.users.find_one({"user_id": user_id, "role": {"$in": ["admin", "super_admin"]}})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "admin_deleted",
        "target_type": "admin",
        "target_id": user_id,
        "details": f"Deleted admin: {target_admin.get('email')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Admin account deleted"}

@router.get("/super-admin/stats")
async def get_global_stats(user: User = Depends(get_current_user)):
    """Get global platform statistics (Super Admin only)"""
    await require_super_admin(user)
    
    total_users = await db.users.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_producers = await db.users.count_documents({"role": {"$in": ["producer", "importer"]}})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    
    pipeline = [
        {"$match": {"status": {"$in": ["completed", "delivered"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    monthly_pipeline = [
        {"$match": {"status": {"$in": ["completed", "delivered"]}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 7]},
            "revenue": {"$sum": "$total_amount"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    monthly_data = await db.orders.aggregate(monthly_pipeline).to_list(12)
    
    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_producers": total_producers,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders,
        "monthly_data": monthly_data
    }

@router.get("/super-admin/activity")
async def get_admin_activity(limit: int = 50, user: User = Depends(get_current_user)):
    """Get admin activity log (Super Admin only)"""
    await require_super_admin(user)
    limit = min(limit, 500)
    
    activities = await db.admin_activity.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    
    return activities

@router.put("/super-admin/commissions/{commission_id}/override")
async def override_commission(commission_id: str, new_amount: float, reason: str, user: User = Depends(get_current_user)):
    """Override a commission amount (Super Admin only)"""
    await require_super_admin(user)
    
    commission = await db.influencer_commissions.find_one({"commission_id": commission_id})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    old_amount = commission.get("commission_amount", 0)
    diff = new_amount - old_amount
    
    await db.influencer_commissions.update_one(
        {"commission_id": commission_id},
        {"$set": {
            "commission_amount": new_amount,
            "overridden": True,
            "override_reason": reason,
            "override_by": user.user_id,
            "override_at": datetime.now(timezone.utc).isoformat(),
            "original_amount": old_amount
        }}
    )
    
    if commission.get("influencer_id"):
        await db.influencers.update_one(
            {"influencer_id": commission["influencer_id"]},
            {"$inc": {
                "total_commission_earned": diff,
                "available_balance": diff
            }}
        )
    
    return {"message": "Commission overridden", "old_amount": old_amount, "new_amount": new_amount}


# =====================================================
# SUPER ADMIN: USER MANAGEMENT
# =====================================================

@router.get("/super-admin/users")
async def get_all_users_by_role(
    role: str = "customer",
    country: str = None,
    status: str = None,
    search: str = None,
    user: User = Depends(get_current_user)
):
    """Get all users of a specific role (Super Admin only)"""
    await require_super_admin(user)
    
    query = {"role": role}
    
    if country and country != "all":
        query["country"] = country
    
    and_clauses = []
    if status == "suspended":
        query["account_status"] = "suspended"
    elif status == "active":
        and_clauses.append({"$or": [
            {"account_status": {"$exists": False}},
            {"account_status": "active"}
        ]})

    if search:
        and_clauses.append({"$or": [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"email": {"$regex": re.escape(search), "$options": "i"}},
            {"company_name": {"$regex": re.escape(search), "$options": "i"}}
        ]})

    if and_clauses:
        query["$and"] = and_clauses
    
    users = await db.users.find(
        query,
        {
            "_id": 0,
            "user_id": 1, "email": 1, "name": 1, "role": 1,
            "country": 1, "account_status": 1, "created_at": 1,
            "company_name": 1, "phone": 1, "approved": 1, "email_verified": 1
        }
    ).sort("created_at", -1).to_list(1000)
    
    for u in users:
        if "account_status" not in u:
            u["account_status"] = "active"
    
    return users

@router.get("/super-admin/users/countries")
async def get_user_countries(user: User = Depends(get_current_user)):
    """Get list of countries with user counts (Super Admin only)"""
    await require_super_admin(user)
    
    pipeline = [
        {"$match": {"role": {"$in": ["customer", "producer", "importer", "influencer"]}}},
        {"$group": {
            "_id": "$country",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(100)
    
    countries = []
    for r in results:
        country_code = r["_id"]
        if country_code:
            countries.append({
                "code": country_code,
                "name": SUPPORTED_COUNTRIES.get(country_code, {}).get("name", country_code),
                "user_count": r["count"],
                "count": r["count"],
            })
    
    return countries

@router.get("/super-admin/users/stats")
async def get_user_stats(user: User = Depends(get_current_user)):
    """Get user registration statistics (Super Admin only)"""
    await require_super_admin(user)
    
    pipeline = [
        {"$group": {
            "_id": {
                "role": "$role",
                "month": {"$substr": ["$created_at", 0, 7]}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.month": -1}},
        {"$limit": 120}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(120)
    
    total_customers = await db.users.count_documents({"role": "customer"})
    total_producers = await db.users.count_documents({"role": {"$in": ["producer", "importer"]}})
    total_influencers = await db.users.count_documents({"role": "influencer"})

    customers_suspended = await db.users.count_documents({"role": "customer", "account_status": "suspended"})
    producers_suspended = await db.users.count_documents({"role": {"$in": ["producer", "importer"]}, "account_status": "suspended"})
    influencers_suspended = await db.users.count_documents({"role": "influencer", "account_status": "suspended"})

    return {
        "by_role_month": results,
        "total_customers": total_customers,
        "total_producers": total_producers,
        "total_influencers": total_influencers,
        "suspended": customers_suspended + producers_suspended + influencers_suspended,
        "customers": {
            "total": total_customers,
            "active": max(0, total_customers - customers_suspended),
            "suspended": customers_suspended,
        },
        "producers": {
            "total": total_producers,
            "active": max(0, total_producers - producers_suspended),
            "suspended": producers_suspended,
        },
        "influencers": {
            "total": total_influencers,
            "active": max(0, total_influencers - influencers_suspended),
            "suspended": influencers_suspended,
        },
    }

@router.put("/super-admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    action: Optional[str] = None,
    reason: Optional[str] = None,
    request: Request = None,
    user: User = Depends(get_current_user)
):
    """Update user account status (Super Admin only)"""
    await require_super_admin(user)
    
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not action and request is not None:
        body = await request.json()
        action = body.get("action")
        if not action:
            status = body.get("status")
            if status == "suspended":
                action = "suspend"
            elif status == "active":
                action = "reactivate"
        reason = reason or body.get("reason")

    if action == "suspend":
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "account_status": "suspended",
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "suspended_reason": reason or "Admin action"
            }}
        )
        await db.user_sessions.delete_many({"user_id": user_id})
        # Hide products of suspended sellers so they don't appear in feed/search
        target_role = target_user.get("role", "")
        if target_role in ("producer", "importer"):
            await db.products.update_many(
                {"producer_id": user_id, "status": "active"},
                {"$set": {"status": "suspended_by_admin", "_pre_suspend_status": "active"}}
            )
            # Cancel pending RFQs so importers aren't left waiting on a suspended producer
            await db.rfq_requests.update_many(
                {"producer_id": user_id, "status": "pending"},
                {"$set": {"status": "cancelled", "cancel_reason": "producer_suspended",
                          "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        if target_role == "influencer":
            # Deactivate influencer's discount codes so they can't generate new conversions
            await db.discount_codes.update_many(
                {"influencer_id": user_id, "active": True},
                {"$set": {"active": False, "_pre_suspend_active": True}}
            )
            # Cancel pending payouts
            await db.scheduled_payouts.update_many(
                {"influencer_id": user_id, "status": "scheduled"},
                {"$set": {"status": "suspended", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    elif action == "reactivate":
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"account_status": "active"},
             "$unset": {"suspended_at": "", "suspended_reason": ""}}
        )
        # Restore products that were hidden by suspension
        target_role = target_user.get("role", "")
        if target_role in ("producer", "importer"):
            await db.products.update_many(
                {"producer_id": user_id, "status": "suspended_by_admin"},
                {"$set": {"status": "active"}, "$unset": {"_pre_suspend_status": ""}}
            )
        if target_role == "influencer":
            # Restore discount codes that were deactivated by suspension
            await db.discount_codes.update_many(
                {"influencer_id": user_id, "_pre_suspend_active": True},
                {"$set": {"active": True}, "$unset": {"_pre_suspend_active": ""}}
            )
            # Restore suspended payouts
            await db.scheduled_payouts.update_many(
                {"influencer_id": user_id, "status": "suspended"},
                {"$set": {"status": "scheduled"}}
            )
    elif action == "approve":
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"approved": True}}
        )
    elif action == "reject":
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"approved": False, "rejection_reason": reason}}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": f"user_{action}",
        "target_type": "user",
        "target_id": user_id,
        "details": f"{action} user {target_user.get('email')}: {reason or 'N/A'}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"User {action} successful"}

@router.delete("/super-admin/users/{user_id}")
async def delete_user_account(
    user_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a user account permanently (Super Admin only)"""
    await require_super_admin(user)
    
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get("role") in ["admin", "super_admin"]:
        raise HTTPException(status_code=400, detail="Use the admin management endpoints to delete admin accounts")
    
    role = target_user.get("role")
    
    if role == "customer":
        await db.carts.delete_many({"user_id": user_id})
        await db.ai_profiles.delete_one({"user_id": user_id})
        await db.user_inferred_insights.delete_one({"user_id": user_id})
        await db.chat_messages.delete_many({"user_id": user_id})
        await db.orders.update_many(
            {"user_id": user_id},
            {"$set": {"user_email": "deleted@account.com", "user_name": "Deleted User"}}
        )
    elif role in ["producer", "importer"]:
        pending = await db.orders.count_documents({
            "items.producer_id": user_id,
            "status": {"$in": ["pending", "processing", "confirmed", "preparing"]}
        })
        if pending > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete {role} with {pending} pending orders"
            )
        await db.products.update_many(
            {"producer_id": user_id},
            {"$set": {"status": "deleted", "visible": False}}
        )
    elif role == "influencer":
        influencer = await db.influencers.find_one({"user_id": user_id})
        if influencer and influencer.get("available_balance", 0) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete influencer with pending balance"
            )
    
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "user_deleted",
        "target_type": "user",
        "target_id": user_id,
        "details": f"Deleted {role}: {target_user.get('email')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"User account deleted"}

@router.put("/super-admin/users/{user_id}/credentials")
async def update_user_credentials(
    user_id: str,
    data: dict,
    user: User = Depends(get_current_user)
):
    """Update user credentials (Super Admin only)"""
    await require_super_admin(user)
    
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    
    if "email" in data:
        existing = await db.users.find_one({"email": data["email"], "user_id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = data["email"]
    
    if "password" in data:
        update_data["password_hash"] = hash_password(data["password"])
    
    if "name" in data:
        update_data["name"] = data["name"]
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "credentials_updated",
        "target_type": "user",
        "target_id": user_id,
        "details": f"Updated credentials for {target_user.get('email')}: {list(data.keys())}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "User credentials updated"}


# =====================================================
# SUPER ADMIN: PRODUCTS MANAGEMENT
# =====================================================

@router.get("/super-admin/products")
async def get_all_products_admin(
    status: str = None,
    search: str = None,
    country: str = None,
    user: User = Depends(get_current_user)
):
    """Get all products for super admin management"""
    await require_super_admin(user)
    
    query = {}
    
    if status == "approved":
        query["approved"] = True
    elif status == "pending":
        query["approved"] = False
    
    if country and country != "all":
        query["country_origin"] = {"$regex": re.escape(country), "$options": "i"}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"description": {"$regex": re.escape(search), "$options": "i"}}
        ]
    
    products = await db.products.find(
        query,
        {
            "_id": 0,
            "product_id": 1, "name": 1, "price": 1, "country_origin": 1,
            "approved": 1, "producer_id": 1, "images": 1, "created_at": 1
        }
    ).sort("created_at", -1).to_list(500)
    
    for p in products:
        producer = await db.users.find_one({"user_id": p.get("producer_id")}, {"name": 1, "company_name": 1, "email": 1})
        if producer:
            p["producer_name"] = producer.get("company_name") or producer.get("name")
            p["producer_email"] = producer.get("email")
    
    return products

@router.delete("/super-admin/products/{product_id}")
async def delete_product_admin(
    product_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a product permanently (Super Admin only)"""
    await require_super_admin(user)
    
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.delete_one({"product_id": product_id})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "product_deleted",
        "target_type": "product",
        "target_id": product_id,
        "product_name": product.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Producto '{product.get('name')}' eliminado"}


# =====================================================
# SUPER ADMIN: CERTIFICATES MANAGEMENT
# =====================================================

@router.get("/super-admin/certificates")
async def get_all_certificates_admin(
    status: str = None,
    search: str = None,
    user: User = Depends(get_current_user)
):
    """Get all certificates for super admin management"""
    await require_super_admin(user)
    
    query = {}
    
    if status and status != "all":
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"issuer": {"$regex": re.escape(search), "$options": "i"}}
        ]
    
    certificates = await db.certificates.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    for c in certificates:
        producer = await db.users.find_one({"user_id": c.get("producer_id")}, {"name": 1, "company_name": 1, "email": 1})
        if producer:
            c["producer_name"] = producer.get("company_name") or producer.get("name")
            c["producer_email"] = producer.get("email")
    
    return certificates

@router.delete("/super-admin/certificates/{certificate_id}")
async def delete_certificate_admin(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a certificate permanently (Super Admin only)"""
    await require_super_admin(user)
    
    certificate = await db.certificates.find_one({"certificate_id": certificate_id})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    await db.certificates.delete_one({"certificate_id": certificate_id})
    
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "certificate_deleted",
        "target_type": "certificate",
        "target_id": certificate_id,
        "certificate_name": certificate.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Certificado '{certificate.get('name')}' eliminado"}

@router.get("/super-admin/products/stats")
async def get_products_stats_admin(user: User = Depends(get_current_user)):
    """Get product statistics for super admin"""
    await require_super_admin(user)
    return {
        "total": await db.products.count_documents({}),
        "approved": await db.products.count_documents({"approved": True}),
        "pending": await db.products.count_documents({"approved": False})
    }

@router.get("/super-admin/certificates/stats")
async def get_certificates_stats_admin(user: User = Depends(get_current_user)):
    """Get certificate statistics for super admin"""
    await require_super_admin(user)
    return {
        "total": await db.certificates.count_documents({}),
        "approved": await db.certificates.count_documents({"status": "approved"}),
        "pending": await db.certificates.count_documents({"status": "pending"}),
        "rejected": await db.certificates.count_documents({"status": "rejected"})
    }


# ============================================
# STOCK MANAGEMENT (PRODUCER & ADMIN)
# ============================================

@router.put("/producer/products/{product_id}/stock")
async def update_product_stock_producer(product_id: str, input: StockUpdateInput, user: User = Depends(get_current_user)):
    """Producer updates stock for their product"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product's stock")
    
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    update_data = {"stock": input.stock}
    if input.low_stock_threshold is not None:
        update_data["low_stock_threshold"] = input.low_stock_threshold
    if input.track_stock is not None:
        update_data["track_stock"] = input.track_stock
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return {"message": "Stock updated", "stock": input.stock}

@router.put("/admin/products/{product_id}/stock")
async def update_product_stock_admin(product_id: str, input: StockUpdateInput, user: User = Depends(get_current_user)):
    """Admin updates stock for any product"""
    await require_role(user, ["admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    update_data = {"stock": input.stock}
    if input.low_stock_threshold is not None:
        update_data["low_stock_threshold"] = input.low_stock_threshold
    if input.track_stock is not None:
        update_data["track_stock"] = input.track_stock
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return {"message": "Stock updated", "stock": input.stock}

@router.get("/admin/products/low-stock")
async def get_low_stock_products(user: User = Depends(get_current_user)):
    """Get products with low stock (admin)"""
    await require_role(user, ["admin"])
    products = await db.products.find(
        {
            "track_stock": True,
            "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
        },
        {"_id": 0}
    ).to_list(500)
    return products

@router.get("/producer/products/low-stock")
async def get_low_stock_products_producer(user: User = Depends(get_current_user)):
    """Get producer's products with low stock"""
    await require_role(user, ["producer", "importer"])
    products = await db.products.find(
        {
            "producer_id": user.user_id,
            "track_stock": True,
            "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
        },
        {"_id": 0}
    ).to_list(100)
    return products


# ============================================
# PRODUCER: COUNTRY AVAILABILITY & PRICING
# ============================================

@router.get("/producer/products/{product_id}/countries")
async def get_product_countries(product_id: str, user: User = Depends(get_current_user)):
    """Get country availability and pricing for a product"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one(
        {"product_id": product_id, "producer_id": user.user_id}, 
        {"_id": 0, "available_countries": 1, "country_prices": 1, "country_currency": 1}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    return {
        "product_id": product_id,
        "available_countries": product.get("available_countries", []),
        "country_prices": product.get("country_prices", {}),
        "country_currency": product.get("country_currency", {}),
        "supported_countries": SUPPORTED_COUNTRIES
    }

@router.put("/producer/products/{product_id}/countries")
async def update_product_countries(
    product_id: str, 
    countries_data: List[CountryPricingInput], 
    user: User = Depends(get_current_user)
):
    """Update country availability and pricing for a product"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    available_countries = []
    country_prices = {}
    country_currency = {}
    
    for country_data in countries_data:
        country_code = country_data.country_code.upper()
        
        if country_code not in SUPPORTED_COUNTRIES:
            raise HTTPException(status_code=400, detail=f"Unsupported country code: {country_code}")
        
        if country_data.available:
            available_countries.append(country_code)
            country_prices[country_code] = country_data.price
            country_currency[country_code] = SUPPORTED_COUNTRIES[country_code]["currency"]
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries if available_countries else None,
            "country_prices": country_prices if country_prices else None,
            "country_currency": country_currency if country_currency else None
        }}
    )
    
    return {
        "message": "Country availability and pricing updated",
        "available_countries": available_countries,
        "country_prices": country_prices
    }

@router.post("/producer/products/{product_id}/countries/{country_code}")
async def add_country_to_product(
    product_id: str,
    country_code: str,
    pricing_input: dict,
    user: User = Depends(get_current_user)
):
    """Add a single country to product availability"""
    await require_role(user, ["producer", "importer"])
    
    country_code = country_code.upper()
    if country_code not in SUPPORTED_COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Unsupported country code: {country_code}")
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    price = pricing_input.get("price")
    if price is None:
        raise HTTPException(status_code=400, detail="Price is required")
    
    available_countries = product.get("available_countries", [])
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    
    if country_code not in available_countries:
        available_countries.append(country_code)
    
    country_prices[country_code] = price
    country_currency[country_code] = SUPPORTED_COUNTRIES[country_code]["currency"]
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries,
            "country_prices": country_prices,
            "country_currency": country_currency
        }}
    )
    
    return {"message": f"Added {country_code} to product availability", "price": price}

@router.delete("/producer/products/{product_id}/countries/{country_code}")
async def remove_country_from_product(
    product_id: str,
    country_code: str,
    user: User = Depends(get_current_user)
):
    """Remove a country from product availability"""
    await require_role(user, ["producer", "importer"])
    
    country_code = country_code.upper()
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    available_countries = product.get("available_countries", [])
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    
    if country_code in available_countries:
        available_countries.remove(country_code)
    if country_code in country_prices:
        del country_prices[country_code]
    if country_code in country_currency:
        del country_currency[country_code]
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries if available_countries else None,
            "country_prices": country_prices if country_prices else None,
            "country_currency": country_currency if country_currency else None
        }}
    )
    
    return {"message": f"Removed {country_code} from product availability"}


# ============================================
# VARIANTS & PACKS MANAGEMENT
# ============================================

@router.post("/producer/products/{product_id}/variants")
async def create_variant(product_id: str, input: VariantCreateInput, user: User = Depends(get_current_user)):
    """Create a variant for a product (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variant_id = f"var_{uuid.uuid4().hex[:8]}"
    new_variant = {
        "variant_id": variant_id,
        "name": input.name,
        "sku": input.sku,
        "packs": []
    }
    
    variants = product.get("variants", [])
    variants.append(new_variant)
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return new_variant

@router.put("/producer/products/{product_id}/variants/{variant_id}")
async def update_variant(product_id: str, variant_id: str, input: VariantCreateInput, user: User = Depends(get_current_user)):
    """Update a variant (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    variant_idx = next((i for i, v in enumerate(variants) if v["variant_id"] == variant_id), None)
    
    if variant_idx is None:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    variants[variant_idx]["name"] = input.name
    if input.sku:
        variants[variant_idx]["sku"] = input.sku
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return variants[variant_idx]

@router.delete("/producer/products/{product_id}/variants/{variant_id}")
async def delete_variant(product_id: str, variant_id: str, user: User = Depends(get_current_user)):
    """Delete a variant (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    original_count = len(variants)
    variants = [v for v in variants if v["variant_id"] != variant_id]
    
    if len(variants) == original_count:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants if variants else None}}
    )
    
    return {"message": "Variant deleted"}

@router.post("/producer/products/{product_id}/packs")
async def create_pack(product_id: str, input: PackCreateInput, user: User = Depends(get_current_user)):
    """Create a pack for a variant (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    if input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    if input.units < 1:
        raise HTTPException(status_code=400, detail="Units must be at least 1")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    variant_idx = next((i for i, v in enumerate(variants) if v["variant_id"] == input.variant_id), None)
    
    if variant_idx is None:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    pack_id = f"pack_{uuid.uuid4().hex[:8]}"
    new_pack = {
        "pack_id": pack_id,
        "label": input.label,
        "units": input.units,
        "price": input.price,
        "stock": input.stock
    }
    
    packs = variants[variant_idx].get("packs", [])
    packs.append(new_pack)
    variants[variant_idx]["packs"] = packs
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return new_pack

@router.put("/producer/products/{product_id}/packs/{pack_id}")
async def update_pack(product_id: str, pack_id: str, input: PackUpdateInput, user: User = Depends(get_current_user)):
    """Update a pack (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    if input.price is not None and input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock is not None and input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    if input.units is not None and input.units < 1:
        raise HTTPException(status_code=400, detail="Units must be at least 1")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        for pack in packs:
            if pack["pack_id"] == pack_id:
                if input.label is not None: pack["label"] = input.label
                if input.units is not None: pack["units"] = input.units
                if input.price is not None: pack["price"] = input.price
                if input.stock is not None: pack["stock"] = input.stock
                pack_found = True
                break
        if pack_found:
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack updated"}

@router.delete("/producer/products/{product_id}/packs/{pack_id}")
async def delete_pack(product_id: str, pack_id: str, user: User = Depends(get_current_user)):
    """Delete a pack (producer only)"""
    await require_role(user, ["producer", "importer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        original_count = len(packs)
        packs = [p for p in packs if p["pack_id"] != pack_id]
        if len(packs) != original_count:
            variant["packs"] = packs
            pack_found = True
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack deleted"}

@router.put("/admin/products/{product_id}/packs/{pack_id}")
async def admin_update_pack(product_id: str, pack_id: str, input: PackUpdateInput, user: User = Depends(get_current_user)):
    """Admin update a pack (price/stock override)"""
    await require_role(user, ["admin"])
    
    if input.price is not None and input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock is not None and input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        for pack in packs:
            if pack["pack_id"] == pack_id:
                if input.label is not None: pack["label"] = input.label
                if input.units is not None: pack["units"] = input.units
                if input.price is not None: pack["price"] = input.price
                if input.stock is not None: pack["stock"] = input.stock
                pack_found = True
                break
        if pack_found:
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack updated by admin"}


# =====================================================
# ADMIN DASHBOARD ENDPOINTS
# =====================================================

@router.get("/admin/users")
async def admin_list_users(
    role: Optional[str] = None,
    approved: Optional[bool] = None,
    user: User = Depends(get_current_user)
):
    """List users for admin dashboard"""
    await require_role(user, ["admin", "super_admin"])
    
    query = {}
    if role:
        query["role"] = role
    if approved is not None:
        query["approved"] = approved
    
    total = await db.users.count_documents(query)
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(200).to_list(200)

    return {"users": users, "total": total, "has_more": total > 200}


@router.get("/admin/products")
async def admin_list_products(
    status: Optional[str] = None,
    seller_type: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """List products for admin dashboard"""
    await require_role(user, ["admin", "super_admin"])
    
    query = {}
    if status:
        query["status"] = status
    if seller_type:
        query["seller_type"] = seller_type
    
    total = await db.products.count_documents(query)
    products = await db.products.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(200).to_list(200)

    return {"products": products, "total": total, "has_more": total > 200}


@router.get("/admin/orders")
async def admin_list_orders(
    response: Response,
    status: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user)
):
    """List orders for admin dashboard"""
    await require_role(user, ["admin", "super_admin"])

    query = {}
    if status:
        query["status"] = status

    total = await db.orders.count_documents(query)
    orders = await db.orders.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    response.headers["X-Total-Count"] = str(total)
    return {"orders": orders, "total": total, "has_more": total > limit}


@router.put("/admin/products/{product_id}/approve")
async def admin_approve_product(product_id: str, user: User = Depends(get_current_user)):
    """Approve a product (admin only)"""
    await require_role(user, ["admin", "super_admin"])
    
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"approved": True, "status": "active"}}
    )
    
    # Log activity
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "product_approved",
        "target_type": "product",
        "target_id": product_id,
        "details": f"Approved product: {product.get('name')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Product approved"}


@router.put("/admin/products/{product_id}/reject")
async def admin_reject_product(
    product_id: str, 
    reason: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Reject a product (admin only)"""
    await require_role(user, ["admin", "super_admin"])
    
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"approved": False, "status": "rejected", "rejection_reason": reason}}
    )
    
    # Log activity
    await db.admin_activity.insert_one({
        "activity_id": str(uuid.uuid4()),
        "admin_id": user.user_id,
        "action": "product_rejected",
        "target_type": "product",
        "target_id": product_id,
        "details": f"Rejected product: {product.get('name')}. Reason: {reason}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Product rejected"}


@router.get("/admin/stats")
async def admin_dashboard_stats(user: User = Depends(get_current_user)):
    """Get stats for admin dashboard"""
    await require_role(user, ["admin", "super_admin"])
    
    # User counts
    total_users = await db.users.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_producers = await db.users.count_documents({"role": "producer"})
    total_importers = await db.users.count_documents({"role": "importer"})
    
    # Product counts
    total_products = await db.products.count_documents({})
    pending_products = await db.products.count_documents({
        "$or": [{"approved": False}, {"status": "pending"}]
    })
    
    # Order stats
    today = datetime.now(timezone.utc).isoformat()[:10]
    total_orders_today = await db.orders.count_documents({
        "created_at": {"$gte": today}
    })
    
    # Revenue today
    pipeline = [
        {"$match": {"created_at": {"$gte": today}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    revenue_today = revenue_result[0]["total"] if revenue_result else 0
    
    # Expiring certificates (within 30 days)
    thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
    expiring_certs = await db.certificates.count_documents({
        "expiry_date": {"$lte": thirty_days.isoformat(), "$gte": datetime.now(timezone.utc).isoformat()},
        "status": "approved"
    })

    # Top 5 products by sales this month
    first_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    top_products_pipeline = [
        {"$match": {"created_at": {"$gte": first_of_month.isoformat()}, "status": {"$in": ["paid", "delivered", "shipped"]}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "total_sold": {"$sum": "$items.quantity"}, "name": {"$first": "$items.product_name"}}},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(top_products_pipeline).to_list(5)

    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_producers": total_producers,
        "total_importers": total_importers,
        "total_products": total_products,
        "pending_products": pending_products,
        "total_orders_today": total_orders_today,
        "revenue_today": revenue_today,
        "pending_moderation": {
            "products": pending_products,
            "users": await db.users.count_documents({"approved": False})
        },
        "expiring_certificates": expiring_certs,
        "top_products": top_products,
    }


# ============================================
# MANUAL PAYOUTS MANAGEMENT
# ============================================

@router.get("/admin/payouts/pending")
async def get_pending_payouts(user: User = Depends(get_current_user)):
    """List all pending manual payout requests."""
    await require_role(user, ["admin", "super_admin"])
    payouts = await db.manual_payouts.find(
        {"status": "pending"}, {"_id": 0}
    ).sort("requested_at", -1).to_list(200)
    return {"payouts": payouts, "total": len(payouts)}


@router.get("/admin/payouts")
async def get_all_payouts(
    user: User = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
):
    """List all manual payout requests with optional status filter."""
    await require_role(user, ["admin", "super_admin"])
    query = {}
    if status:
        query["status"] = status
    payouts = await db.manual_payouts.find(
        query, {"_id": 0}
    ).sort("requested_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.manual_payouts.count_documents(query)
    return {"payouts": payouts, "total": total}


@router.put("/admin/payouts/{payout_id}/process")
async def process_payout(payout_id: str, request: Request, user: User = Depends(get_current_user)):
    """Mark a payout as processed (paid) or rejected."""
    await require_role(user, ["admin", "super_admin"])
    body = await request.json()
    new_status = body.get("status")

    if new_status not in ("completed", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'completed' or 'rejected'")

    payout = await db.manual_payouts.find_one({"payout_id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Payout already {payout['status']}")

    update = {
        "status": new_status,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "processed_by": user.user_id,
        "admin_notes": (body.get("notes") or "").strip()[:500],
        "transfer_reference": (body.get("transfer_reference") or "").strip()[:100],
    }

    await db.manual_payouts.update_one({"payout_id": payout_id}, {"$set": update})

    # If completed, mark order splits as paid_out + notify producer
    if new_status == "completed":
        producer_id = payout["producer_id"]
        amount = payout["amount"]

        # Mark unpaid splits as paid_out — cap by payout amount (oldest first)
        unpaid_orders = await db.orders.find(
            {"split_details": {"$elemMatch": {"producer_id": producer_id, "paid_out": {"$ne": True}}}},
            {"_id": 0, "order_id": 1, "split_details": 1, "created_at": 1},
        ).sort("created_at", 1).to_list(500)
        remaining = float(amount)
        for order in unpaid_orders:
            if remaining <= 0.01:
                break
            updates = {}
            for i, split in enumerate(order.get("split_details", [])):
                if split.get("producer_id") == producer_id and not split.get("paid_out"):
                    split_amount = float(split.get("seller_amount", split.get("net_earnings", 0)) or 0)
                    if split_amount <= 0 or remaining >= split_amount:
                        # Mark as paid (full coverage or zero-amount split)
                        updates[f"split_details.{i}.paid_out"] = True
                        remaining -= max(split_amount, 0)
                    elif remaining > 0:
                        # Partial coverage — still mark paid (admin already transferred the money)
                        updates[f"split_details.{i}.paid_out"] = True
                        remaining = 0
            if updates:
                updates["updated_at"] = datetime.now(timezone.utc).isoformat()
                await db.orders.update_one({"order_id": order["order_id"]}, {"$set": updates})

        # Write ledger event for audit trail
        await db.ledger_events.insert_one({
            "event_id": f"ledger_{uuid.uuid4().hex[:12]}",
            "event_type": "manual_bank_transfer",
            "order_id": None,
            "payout_id": payout_id,
            "seller_id": producer_id,
            "amount": amount,
            "currency": payout.get("currency", "EUR"),
            "processed_by": user.user_id,
            "transfer_reference": (body.get("transfer_reference") or ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        # Notify producer
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": producer_id,
            "type": "payout_completed",
            "title": "Pago procesado",
            "message": f"Se ha transferido {amount} {payout.get('currency', 'EUR')} a tu cuenta bancaria.",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"success": True, "payout_id": payout_id, "status": new_status}
