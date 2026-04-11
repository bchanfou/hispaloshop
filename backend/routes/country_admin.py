"""
Country admin routes.

A "country admin" is an admin user with `assigned_country` set. They manage a
single country's marketplace: approve verifications, moderate products, suspend
abusive users, configure local defaults, and watch local KPIs.

Strict scoping rule: every query in this module MUST filter by the admin's
assigned country. Cross-country access returns 404 (not 403) to avoid leaking
the existence of resources in other countries. super_admin bypasses scoping.

All write actions are logged to the country_admin_audit collection.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import logging
import uuid

from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, require_country_admin, _normalize_role
from core.models import User
from core.constants import SUPPORTED_COUNTRIES
from services.notifications.dispatcher_service import notification_dispatcher
from services.audit_logger import log_admin_action

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _audit(
    *,
    admin_user_id: str,
    country_code: Optional[str],
    action: str,
    target_id: str,
    target_type: str,
    reason: str = "",
    request: Optional[Request] = None,
    extra: Optional[dict] = None,
) -> None:
    """Append an entry to the country_admin_audit collection."""
    ip = ""
    if request is not None:
        ip = (request.headers.get("x-forwarded-for") or request.client.host or "").split(",")[0].strip()
    doc = {
        "log_id": f"caudit_{uuid.uuid4().hex[:16]}",
        "admin_user_id": admin_user_id,
        "country_code": country_code or "GLOBAL",
        "action": action,
        "target_id": str(target_id),
        "target_type": target_type,
        "reason": reason,
        "ip": ip,
        "extra": extra or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.country_admin_audit.insert_one(doc)
    except Exception as exc:
        logger.error("[CADMIN] Failed to write audit entry: %s — %s", action, exc)
    # Mirror critical actions to the unified admin audit log too.
    try:
        await log_admin_action(
            admin_id=admin_user_id,
            admin_role="country_admin",
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            details=reason,
            severity="info",
            extra={"country_code": country_code or "GLOBAL"},
        )
    except Exception:
        pass


def _scope_filter(country: Optional[str], extra: Optional[dict] = None) -> dict:
    """Return a Mongo filter that scopes to the country (no-op for super_admin)."""
    q: dict = dict(extra or {})
    if country:
        q.setdefault("country", country)
    return q


def _is_super_admin(user: User) -> bool:
    return _normalize_role(getattr(user, "role", None)) == "super_admin"


# ─────────────────────────────────────────────────────────────────────────────
# Overview
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/overview")
async def country_admin_overview(user: User = Depends(get_current_user)):
    """KPI summary for the admin's country."""
    country = await require_country_admin(user)
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    # Active sellers (producers + importers approved in this country)
    seller_query = {"role": {"$in": ["producer", "importer"]}, "approved": True}
    if country:
        seller_query["country"] = country
    active_sellers = await db.users.count_documents(seller_query)

    # Pending verifications
    pending_query = {
        "role": {"$in": ["producer", "importer"]},
        "verification_status.admin_review_required": True,
        "verification_status.is_verified": {"$ne": True},
    }
    if country:
        pending_query["country"] = country
    pending_verifications = await db.users.count_documents(pending_query)

    # Active products
    products_query = {"approved": True}
    if country:
        products_query["country"] = country
    active_products = await db.products.count_documents(products_query)

    # GMV month + orders month (orders in this country)
    orders_query: dict = {"created_at": {"$gte": month_start}, "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered", "completed"]}}
    if country:
        orders_query["country"] = country
    monthly_orders = await db.orders.find(
        orders_query,
        {"_id": 0, "total_amount": 1, "currency": 1, "status": 1},
    ).to_list(5000)
    gmv_month_local = round(sum(float(o.get("total_amount", 0) or 0) for o in monthly_orders), 2)
    orders_month = len(monthly_orders)

    # USD equivalent
    currency_code = SUPPORTED_COUNTRIES.get(country or "ES", {}).get("currency", "EUR") if country else "USD"
    try:
        from services.exchange_rates import get_rate_to_usd
        usd_rate = await get_rate_to_usd(currency_code)
    except Exception:
        usd_rate = 1.0
    gmv_month_usd = round(gmv_month_local * usd_rate, 2)

    # Refund rate (refunded orders / total orders this month)
    refund_query: dict = {
        "created_at": {"$gte": month_start},
        "status": {"$in": ["refunded", "partially_refunded"]},
    }
    if country:
        refund_query["country"] = country
    refunds_month = await db.orders.count_documents(refund_query)
    refund_rate = round((refunds_month / orders_month) * 100, 2) if orders_month > 0 else 0.0

    # Avg SLA hours: time between order created_at and first verification action
    # (Approximation — uses last 30 days of approve/reject from country_admin_audit)
    sla_window_start = (now - timedelta(days=30)).isoformat()
    sla_audit_query: dict = {
        "action": {"$in": ["verification_approved", "verification_rejected"]},
        "timestamp": {"$gte": sla_window_start},
    }
    if country:
        sla_audit_query["country_code"] = country
    sla_logs = await db.country_admin_audit.find(sla_audit_query, {"_id": 0, "timestamp": 1, "extra": 1}).to_list(500)
    sla_hours_list = []
    for log in sla_logs:
        requested_at = (log.get("extra") or {}).get("requested_at")
        if not requested_at:
            continue
        try:
            req_dt = datetime.fromisoformat(str(requested_at).replace("Z", "+00:00"))
            done_dt = datetime.fromisoformat(str(log["timestamp"]).replace("Z", "+00:00"))
            if req_dt.tzinfo is None:
                req_dt = req_dt.replace(tzinfo=timezone.utc)
            if done_dt.tzinfo is None:
                done_dt = done_dt.replace(tzinfo=timezone.utc)
            delta_h = (done_dt - req_dt).total_seconds() / 3600
            if delta_h >= 0:
                sla_hours_list.append(delta_h)
        except (ValueError, TypeError):
            continue
    avg_sla_hours = round(sum(sla_hours_list) / len(sla_hours_list), 1) if sla_hours_list else None

    # Weekly goal progress
    config_query = {"country_code": country} if country else {}
    country_doc = await db.country_configs.find_one(config_query, {"_id": 0, "weekly_goal_cents": 1, "default_shipping": 1})
    weekly_goal_cents = int((country_doc or {}).get("weekly_goal_cents", 0) or 0)

    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    weekly_orders_query: dict = {"created_at": {"$gte": week_start}, "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered", "completed"]}}
    if country:
        weekly_orders_query["country"] = country
    weekly_orders = await db.orders.find(weekly_orders_query, {"_id": 0, "total_amount": 1}).to_list(5000)
    weekly_gmv_cents = int(round(sum(float(o.get("total_amount", 0) or 0) for o in weekly_orders) * 100))
    weekly_progress_pct = round((weekly_gmv_cents / weekly_goal_cents) * 100, 1) if weekly_goal_cents > 0 else None

    # Action items: pending verifs > 24h old, reported products, open tickets
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    overdue_pending_query = dict(pending_query)
    overdue_pending_query["created_at"] = {"$lt": cutoff_24h}
    overdue_verifications = await db.users.count_documents(overdue_pending_query)

    reported_products_query: dict = {"reports.0": {"$exists": True}}
    if country:
        reported_products_query["country"] = country
    reported_products = await db.products.count_documents(reported_products_query)

    open_tickets_query: dict = {"status": {"$in": ["open", "in_progress"]}}
    if country:
        open_tickets_query["country_code"] = country
    try:
        open_tickets = await db.support_tickets.count_documents(open_tickets_query)
    except Exception:
        open_tickets = 0

    return {
        "country_code": country or "GLOBAL",
        "currency": currency_code,
        "kpis": {
            "active_sellers": active_sellers,
            "pending_verifications": pending_verifications,
            "active_products": active_products,
            "gmv_month_local": gmv_month_local,
            "gmv_month_usd": gmv_month_usd,
            "orders_month": orders_month,
            "refund_rate_pct": refund_rate,
            "avg_sla_hours": avg_sla_hours,
        },
        "weekly_goal": {
            "goal_cents": weekly_goal_cents,
            "current_cents": weekly_gmv_cents,
            "progress_pct": weekly_progress_pct,
        },
        "action_items": {
            "overdue_verifications": overdue_verifications,
            "reported_products": reported_products,
            "open_tickets": open_tickets,
        },
        "generated_at": now.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Verifications
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/verifications")
async def list_verifications(
    type: Optional[str] = None,
    status: str = "pending",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)

    role_filter = ["producer", "importer"]
    if type in ("producer", "importer"):
        role_filter = [type]

    if status == "pending":
        query = {
            "role": {"$in": role_filter},
            "verification_status.admin_review_required": True,
            "verification_status.is_verified": {"$ne": True},
        }
    elif status == "in_review":
        query = {
            "role": {"$in": role_filter},
            "verification_status.admin_review_required": True,
        }
    else:
        query = {"role": {"$in": role_filter}}

    if country:
        query["country"] = country

    cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", 1).skip(max(0, offset)).limit(min(200, max(1, limit)))
    items = []
    async for u in cursor:
        vs = u.get("verification_status") or {}
        items.append({
            "user_id": u.get("user_id"),
            "name": u.get("name"),
            "company_name": u.get("company_name"),
            "email": u.get("email"),
            "country": u.get("country"),
            "role": u.get("role"),
            "requested_at": u.get("created_at"),
            "verification_status": {
                "is_verified": vs.get("is_verified", False),
                "admin_review_required": vs.get("admin_review_required", False),
                "blocked_from_selling": vs.get("blocked_from_selling", False),
                "block_reason": vs.get("block_reason"),
            },
        })

    total = await db.users.count_documents(query)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/country-admin/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    notes = (body or {}).get("notes", "")

    target_query: dict = {"user_id": verification_id}
    if country:
        target_query["country"] = country
    target = await db.users.find_one(target_query, {"_id": 0})
    if not target:
        # 404 not 403 — do not leak existence in other countries.
        raise HTTPException(status_code=404, detail="Verification not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": verification_id},
        {"$set": {
            "approved": True,
            "verification_status.is_verified": True,
            "verification_status.admin_review_required": False,
            "verification_status.approved_at": now,
            "verification_status.approved_by": user.user_id,
            "verification_status.approval_notes": notes,
            "updated_at": now,
        }},
    )

    try:
        await notification_dispatcher.send_notification(
            user_id=verification_id,
            title="Verificación aprobada",
            body="Tu cuenta ha sido verificada. Ya puedes vender en Hispaloshop.",
            notification_type="verification_approved",
            channels=["in_app", "push", "email"],
            data={"verification_id": verification_id},
            action_url="/producer",
        )
    except Exception as exc:
        logger.warning("[CADMIN] Failed to dispatch verification_approved notification: %s", exc)

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="verification_approved",
        target_id=verification_id,
        target_type="verification",
        reason=notes,
        request=request,
        extra={"requested_at": str(target.get("created_at", ""))},
    )
    return {"status": "approved", "user_id": verification_id}


@router.post("/country-admin/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    reason = ((body or {}).get("reason") or "").strip()
    notes = (body or {}).get("notes", "")
    if len(reason) < 20:
        raise HTTPException(status_code=400, detail="Rejection reason must be at least 20 characters")

    target_query: dict = {"user_id": verification_id}
    if country:
        target_query["country"] = country
    target = await db.users.find_one(target_query, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Verification not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": verification_id},
        {"$set": {
            "approved": False,
            "verification_status.is_verified": False,
            "verification_status.admin_review_required": False,
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": reason,
            "verification_status.rejected_at": now,
            "verification_status.rejected_by": user.user_id,
            "verification_status.rejection_notes": notes,
            "updated_at": now,
        }},
    )

    try:
        await notification_dispatcher.send_notification(
            user_id=verification_id,
            title="Verificación rechazada",
            body=f"Tu solicitud de verificación ha sido rechazada. Motivo: {reason[:120]}",
            notification_type="verification_rejected",
            channels=["in_app", "push", "email"],
            data={"verification_id": verification_id, "reason": reason},
            action_url="/producer/verification",
        )
    except Exception as exc:
        logger.warning("[CADMIN] Failed to dispatch verification_rejected notification: %s", exc)

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="verification_rejected",
        target_id=verification_id,
        target_type="verification",
        reason=reason,
        request=request,
        extra={"notes": notes, "requested_at": str(target.get("created_at", ""))},
    )
    return {"status": "rejected", "user_id": verification_id, "reason": reason}


# ─────────────────────────────────────────────────────────────────────────────
# Products
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/products")
async def list_products(
    status: str = "pending",
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)

    query: dict = {}
    if status == "pending":
        query["approved"] = False
        query["hidden"] = {"$ne": True}
    elif status == "reported":
        query["reports.0"] = {"$exists": True}
    elif status == "active":
        query["approved"] = True
        query["hidden"] = {"$ne": True}
    elif status == "hidden":
        query["hidden"] = True

    if country:
        query["country"] = country
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"product_id": search},
        ]

    cursor = db.products.find(
        query,
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "currency": 1, "country": 1,
         "producer_id": 1, "approved": 1, "hidden": 1, "reports": 1, "image_url": 1,
         "category": 1, "created_at": 1},
    ).sort("created_at", -1).skip(max(0, offset)).limit(min(200, max(1, limit)))

    items = await cursor.to_list(min(200, max(1, limit)))
    total = await db.products.count_documents(query)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/country-admin/products/{product_id}/moderate")
async def moderate_product(
    product_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    action = ((body or {}).get("action") or "").lower()
    reason = ((body or {}).get("reason") or "").strip()
    if action not in ("approve", "reject", "hide"):
        raise HTTPException(status_code=400, detail="action must be approve, reject or hide")
    if action in ("reject", "hide") and len(reason) < 20:
        raise HTTPException(status_code=400, detail="Reason must be at least 20 characters for reject/hide actions")

    target_query: dict = {"product_id": product_id}
    if country:
        target_query["country"] = country
    target = await db.products.find_one(target_query, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc).isoformat()
    if action == "approve":
        update = {"approved": True, "hidden": False, "moderation_status": "approved", "updated_at": now}
    elif action == "reject":
        update = {"approved": False, "hidden": True, "moderation_status": "rejected",
                  "moderation_reason": reason, "updated_at": now}
    else:  # hide
        update = {"hidden": True, "moderation_status": "hidden",
                  "moderation_reason": reason, "updated_at": now}

    await db.products.update_one({"product_id": product_id}, {"$set": update})

    try:
        producer_id = target.get("producer_id")
        if producer_id and action in ("reject", "hide"):
            await notification_dispatcher.send_notification(
                user_id=producer_id,
                title="Producto moderado",
                body=f"Tu producto '{target.get('name', '')}' ha sido {action}. Motivo: {reason[:120]}",
                notification_type="product_moderated",
                channels=["in_app", "push"],
                data={"product_id": product_id, "action": action},
                action_url="/producer/products",
            )
        elif producer_id and action == "approve":
            await notification_dispatcher.send_notification(
                user_id=producer_id,
                title="Producto aprobado",
                body=f"Tu producto '{target.get('name', '')}' ha sido aprobado y ya es visible.",
                notification_type="product_approved",
                channels=["in_app", "push"],
                data={"product_id": product_id},
                action_url="/producer/products",
            )
    except Exception as exc:
        logger.warning("[CADMIN] Failed to dispatch product moderation notification: %s", exc)

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action=f"product_{action}",
        target_id=product_id,
        target_type="product",
        reason=reason,
        request=request,
    )
    return {"status": "ok", "product_id": product_id, "action": action}


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/users")
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)

    query: dict = {}
    if country:
        query["country"] = country
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.users.find(
        query,
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "username": 1, "role": 1,
         "country": 1, "approved": 1, "suspended": 1, "suspension_reason": 1,
         "suspension_until": 1, "created_at": 1, "picture": 1},
    ).sort("created_at", -1).skip(max(0, offset)).limit(min(200, max(1, limit)))

    items = await cursor.to_list(min(200, max(1, limit)))
    total = await db.users.count_documents(query)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/country-admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    reason = ((body or {}).get("reason") or "").strip()
    duration_days = (body or {}).get("duration_days")
    if len(reason) < 20:
        raise HTTPException(status_code=400, detail="Reason must be at least 20 characters")

    target_query: dict = {"user_id": user_id}
    if country:
        target_query["country"] = country
    target = await db.users.find_one(target_query, {"_id": 0, "user_id": 1, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if _normalize_role(target.get("role")) in ("admin", "country_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Cannot suspend admin accounts from this dashboard")

    now = datetime.now(timezone.utc)
    until = None
    if duration_days:
        try:
            until = (now + timedelta(days=int(duration_days))).isoformat()
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="duration_days must be an integer")

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "suspended": True,
            "suspension_reason": reason,
            "suspension_until": until,
            "suspended_at": now.isoformat(),
            "suspended_by": user.user_id,
            "updated_at": now.isoformat(),
        }},
    )

    # Invalidate active sessions of the suspended user
    try:
        await db.user_sessions.delete_many({"user_id": user_id})
    except Exception:
        pass

    try:
        await notification_dispatcher.send_notification(
            user_id=user_id,
            title="Cuenta suspendida",
            body=f"Tu cuenta ha sido suspendida. Motivo: {reason[:120]}",
            notification_type="account_suspended",
            channels=["in_app", "email"],
            data={"reason": reason, "until": until},
            action_url="/support",
        )
    except Exception as exc:
        logger.warning("[CADMIN] Failed to dispatch account_suspended: %s", exc)

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="user_suspended",
        target_id=user_id,
        target_type="user",
        reason=reason,
        request=request,
        extra={"duration_days": duration_days, "until": until},
    )
    return {"status": "suspended", "user_id": user_id, "until": until}


@router.post("/country-admin/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)

    target_query: dict = {"user_id": user_id}
    if country:
        target_query["country"] = country
    target = await db.users.find_one(target_query, {"_id": 0, "user_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "suspended": False,
            "suspension_reason": None,
            "suspension_until": None,
            "unsuspended_at": now,
            "unsuspended_by": user.user_id,
            "updated_at": now,
        }},
    )

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="user_unsuspended",
        target_id=user_id,
        target_type="user",
        reason="",
        request=request,
    )
    return {"status": "unsuspended", "user_id": user_id}


# ─────────────────────────────────────────────────────────────────────────────
# Support tickets (placeholder — wired in 3.4)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/support/tickets")
async def list_support_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    query: dict = {}
    if country:
        query["country_code"] = country
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"subject": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}},
        ]
    limit = min(200, max(1, limit))
    try:
        total = await db.support_tickets.count_documents(query)
        items = await db.support_tickets.find(query, {"_id": 0}).sort("updated_at", -1).skip(max(0, offset)).limit(limit).to_list(limit)
    except Exception:
        items, total = [], 0
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/country-admin/support/tickets/{ticket_id}")
async def get_support_ticket(ticket_id: str, user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    target_query: dict = {"ticket_id": ticket_id}
    if country:
        target_query["country_code"] = country
    ticket = await db.support_tickets.find_one(target_query, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    messages = await db.support_messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # Mark user messages as read by admin
    await db.support_messages.update_many(
        {"ticket_id": ticket_id, "sender_role": "user", "read_by_admin": False},
        {"$set": {"read_by_admin": True}},
    )
    # User snapshot for the sidebar
    user_doc = await db.users.find_one(
        {"user_id": ticket.get("user_id")},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1, "country": 1, "picture": 1, "created_at": 1},
    )
    history_count = await db.support_tickets.count_documents({"user_id": ticket.get("user_id")})
    return {"ticket": ticket, "messages": messages, "user_snapshot": user_doc, "user_ticket_count": history_count}


@router.post("/country-admin/support/tickets/{ticket_id}/messages")
async def admin_add_message(
    ticket_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    target_query: dict = {"ticket_id": ticket_id}
    if country:
        target_query["country_code"] = country
    ticket = await db.support_tickets.find_one(target_query, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    text = ((body or {}).get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Mensaje vacío")
    is_internal = bool((body or {}).get("is_internal_note", False))
    mark_status = (body or {}).get("mark_status")

    # Validate attachments inline
    raw_atts = (body or {}).get("attachments") or []
    cleaned_atts: list = []
    for a in raw_atts[:5]:
        ct = (a.get("content_type") or "").lower()
        size = int(a.get("size") or 0)
        if ct not in {"image/jpeg", "image/png", "application/pdf"}:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
        if size <= 0 or size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Adjunto excede 5MB")
        cleaned_atts.append({"url": a.get("url", ""), "filename": a.get("filename", ""),
                             "size": size, "content_type": ct})

    now_iso = datetime.now(timezone.utc).isoformat()
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:14]}",
        "ticket_id": ticket_id,
        "sender_id": user.user_id,
        "sender_role": "admin",
        "body": text,
        "attachments": cleaned_atts,
        "created_at": now_iso,
        "read_by_user": False,
        "read_by_admin": True,
        "is_internal_note": is_internal,
    }
    await db.support_messages.insert_one(msg)

    update: dict = {"updated_at": now_iso}
    if not ticket.get("first_response_at") and not is_internal:
        update["first_response_at"] = now_iso
        # SLA met evaluation
        try:
            due_dt = datetime.fromisoformat(str(ticket.get("sla_first_response_due", "")).replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            update["sla_first_response_met"] = bool(now_dt <= due_dt)
        except Exception:
            update["sla_first_response_met"] = True
    if mark_status in ("in_progress", "awaiting_user", "resolved"):
        update["status"] = mark_status
        if mark_status == "resolved":
            update["resolved_at"] = now_iso
            try:
                due_dt = datetime.fromisoformat(str(ticket.get("sla_resolution_due", "")).replace("Z", "+00:00"))
                update["sla_resolution_met"] = bool(datetime.now(timezone.utc) <= due_dt)
            except Exception:
                update["sla_resolution_met"] = True
    elif not is_internal:
        update["status"] = "awaiting_user"
    await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": update})

    # Notify user (only for non-internal messages)
    if not is_internal:
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=ticket.get("user_id", ""),
                title="Nueva respuesta de soporte",
                body=f"#{ticket['ticket_number']} · {text[:80]}",
                notification_type="support_ticket_replied_admin" if mark_status != "resolved" else "support_ticket_resolved",
                channels=["in_app", "push", "email"],
                data={"ticket_id": ticket_id},
                action_url=f"/support/tickets/{ticket_id}",
            )
        except Exception:
            pass

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action=f"support_message_{'internal' if is_internal else 'admin'}",
        target_id=ticket_id,
        target_type="support_ticket",
        reason=mark_status or "",
        request=request,
    )
    return {"status": "ok", "message_id": msg["message_id"]}


@router.post("/country-admin/support/tickets/{ticket_id}/escalate")
async def escalate_ticket(
    ticket_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    reason = ((body or {}).get("reason") or "").strip()
    if len(reason) < 30:
        raise HTTPException(status_code=400, detail="Razón mínimo 30 caracteres")
    target_query: dict = {"ticket_id": ticket_id}
    if country:
        target_query["country_code"] = country
    ticket = await db.support_tickets.find_one(target_query, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "status": "escalated",
            "escalated_to_super_admin": True,
            "escalation_reason": reason,
            "escalated_at": now_iso,
            "escalated_by": user.user_id,
            "updated_at": now_iso,
        }},
    )
    # Audit
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="support_ticket_escalated",
        target_id=ticket_id,
        target_type="support_ticket",
        reason=reason,
        request=request,
    )
    return {"status": "escalated"}


@router.post("/country-admin/support/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    target_query: dict = {"ticket_id": ticket_id}
    if country:
        target_query["country_code"] = country
    ticket = await db.support_tickets.find_one(target_query, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": "closed", "closed_at": now_iso, "updated_at": now_iso}},
    )
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="support_ticket_closed",
        target_id=ticket_id,
        target_type="support_ticket",
        reason="manual_close",
        request=request,
    )
    return {"status": "closed"}


@router.post("/country-admin/support/tickets/{ticket_id}/tag")
async def tag_ticket(
    ticket_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    tags = (body or {}).get("tags", [])
    if not isinstance(tags, list):
        raise HTTPException(status_code=400, detail="tags must be a list")
    tags = [str(t)[:30] for t in tags][:10]
    target_query: dict = {"ticket_id": ticket_id}
    if country:
        target_query["country_code"] = country
    result = await db.support_tickets.update_one(target_query, {"$set": {"tags": tags, "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    # Section 3.6.5: close audit gap — all mutating endpoints must log to _audit.
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="support_ticket_tagged",
        target_id=ticket_id,
        target_type="support_ticket",
        reason="",
        request=request,
        extra={"tags": tags},
    )
    return {"status": "ok", "tags": tags}


@router.get("/country-admin/support/metrics")
async def support_metrics(period: str = "30d", user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    base_query: dict = {"created_at": {"$gte": cutoff}}
    if country:
        base_query["country_code"] = country

    open_query = dict(base_query)
    open_query["status"] = {"$in": ["open", "awaiting_admin", "in_progress", "awaiting_user", "reopened"]}
    open_count = await db.support_tickets.count_documents(open_query)

    sla_at_risk_query = dict(base_query)
    sla_at_risk_query["first_response_at"] = None
    sla_at_risk_query["sla_first_response_due"] = {"$lt": datetime.now(timezone.utc).isoformat()}
    sla_at_risk = await db.support_tickets.count_documents(sla_at_risk_query)

    resolved_query = dict(base_query)
    resolved_query["status"] = {"$in": ["resolved", "closed"]}
    resolved_count = await db.support_tickets.count_documents(resolved_query)

    # Average first response time (in minutes), for tickets that have first_response_at
    fr_query = dict(base_query)
    fr_query["first_response_at"] = {"$ne": None}
    fr_tickets = await db.support_tickets.find(fr_query, {"_id": 0, "created_at": 1, "first_response_at": 1}).limit(2000).to_list(2000)
    diffs = []
    for t in fr_tickets:
        try:
            c = datetime.fromisoformat(str(t["created_at"]).replace("Z", "+00:00"))
            f = datetime.fromisoformat(str(t["first_response_at"]).replace("Z", "+00:00"))
            diffs.append((f - c).total_seconds() / 60)
        except Exception:
            continue
    avg_first_response_minutes = round(sum(diffs) / len(diffs), 1) if diffs else None

    # CSAT
    csat_query: dict = {"created_at": {"$gte": cutoff}}
    if country:
        csat_query["country_code"] = country
    csat_docs = await db.support_csat.find(csat_query, {"_id": 0, "rating": 1}).to_list(2000)
    csat_avg = round(sum(c["rating"] for c in csat_docs) / len(csat_docs), 2) if csat_docs else None

    # By category breakdown
    by_category_pipeline = [
        {"$match": base_query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    try:
        by_category = await db.support_tickets.aggregate(by_category_pipeline).to_list(20)
    except Exception:
        by_category = []

    return {
        "period": period,
        "open_count": open_count,
        "sla_at_risk": sla_at_risk,
        "resolved_count": resolved_count,
        "avg_first_response_minutes": avg_first_response_minutes,
        "csat_avg": csat_avg,
        "by_category": by_category,
    }


# ── Knowledge base management (country admin + super admin) ──────────────

@router.get("/country-admin/support/articles")
async def list_articles_admin(
    category: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)  # super_admin returns None
    query: dict = {}
    if category:
        query["category"] = category
    if role:
        query["role_target"] = role
    if status == "published":
        query["published"] = True
    elif status == "draft":
        query["published"] = False
    # Country scoping: country admins only see their country + global ('all').
    # Super admins see everything.
    if country:
        query["country_target"] = {"$in": [country.lower(), "all"]}
    if search:
        safe = search.strip()
        if safe:
            # Case-insensitive regex on multi-language titles + slug.
            import re as _re
            pattern = _re.escape(safe)
            query["$or"] = [
                {"slug": {"$regex": pattern, "$options": "i"}},
                {"title": {"$regex": pattern, "$options": "i"}},
                {"title_en": {"$regex": pattern, "$options": "i"}},
                {"title_ko": {"$regex": pattern, "$options": "i"}},
            ]
    items = await db.support_articles.find(query, {"_id": 0}).sort("updated_at", -1).limit(min(200, max(1, limit))).to_list(200)
    return {"items": items}


@router.post("/country-admin/support/articles")
async def create_article(body: dict, request: Request, user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    slug = ((body or {}).get("slug") or "").strip().lower()
    if not slug or not slug.replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="slug inválido (lowercase, dashes)")
    exists = await db.support_articles.find_one({"slug": slug})
    if exists:
        raise HTTPException(status_code=409, detail="slug ya existe")
    # Country scoping: a country admin can only create 'all' or their own
    # country. Super admins (country=None) can target any country.
    requested_country = (body.get("country_target") or "all").lower()
    if country and requested_country not in ("all", country.lower()):
        raise HTTPException(status_code=403, detail="country_target fuera de tu país")
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "slug": slug,
        "title": body.get("title", ""),
        "title_en": body.get("title_en", ""),
        "title_ko": body.get("title_ko", ""),
        "body": body.get("body", ""),
        "body_en": body.get("body_en", ""),
        "body_ko": body.get("body_ko", ""),
        "category": body.get("category", "other"),
        "role_target": body.get("role_target", "all"),
        "country_target": requested_country,
        "published": bool(body.get("published", True)),
        "view_count": 0,
        "created_at": now_iso,
        "updated_at": now_iso,
        "created_by": user.user_id,
    }
    await db.support_articles.insert_one(doc)
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="kb_article_created",
        target_id=slug,
        target_type="support_article",
        reason="",
        request=request,
        extra={"category": doc["category"], "role_target": doc["role_target"], "published": doc["published"]},
    )
    return {"status": "ok", "slug": slug}


@router.put("/country-admin/support/articles/{slug}")
async def update_article(slug: str, body: dict, request: Request, user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    existing = await db.support_articles.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    # Country scoping on the existing doc.
    if country:
        existing_country = (existing.get("country_target") or "all").lower()
        if existing_country not in ("all", country.lower()):
            raise HTTPException(status_code=403, detail="Artículo fuera de tu país")
    fields = {}
    for k in ("title", "title_en", "title_ko", "body", "body_en", "body_ko",
              "category", "role_target", "country_target", "published"):
        if k in body:
            fields[k] = body[k]
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # Country scoping on the new country_target (if changing).
    if country and "country_target" in fields:
        new_country = (fields["country_target"] or "all").lower()
        if new_country not in ("all", country.lower()):
            raise HTTPException(status_code=403, detail="country_target fuera de tu país")
        fields["country_target"] = new_country
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    fields["updated_by"] = user.user_id
    result = await db.support_articles.update_one({"slug": slug}, {"$set": fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    # Determine whether this is a publish / unpublish transition for audit.
    audit_action = "kb_article_updated"
    if "published" in fields:
        was_published = bool(existing.get("published", False))
        now_published = bool(fields["published"])
        if now_published and not was_published:
            audit_action = "kb_article_published"
        elif was_published and not now_published:
            audit_action = "kb_article_unpublished"
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action=audit_action,
        target_id=slug,
        target_type="support_article",
        reason="",
        request=request,
        extra={"changed": list(fields.keys())},
    )
    return {"status": "ok"}


@router.delete("/country-admin/support/articles/{slug}")
async def soft_delete_article(slug: str, request: Request, user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    existing = await db.support_articles.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    if country:
        existing_country = (existing.get("country_target") or "all").lower()
        if existing_country not in ("all", country.lower()):
            raise HTTPException(status_code=403, detail="Artículo fuera de tu país")
    result = await db.support_articles.update_one(
        {"slug": slug},
        {"$set": {"published": False, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.user_id}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="kb_article_deleted",
        target_id=slug,
        target_type="support_article",
        reason="",
        request=request,
    )
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
# Settings
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/country-admin/settings/weekly-goal")
async def update_weekly_goal(
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    if not country:
        raise HTTPException(status_code=400, detail="super_admin must use the super-admin endpoint to set per-country goals")
    try:
        weekly_goal_cents = int((body or {}).get("weekly_goal_cents", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="weekly_goal_cents must be an integer")
    if weekly_goal_cents < 0:
        raise HTTPException(status_code=400, detail="weekly_goal_cents must be >= 0")

    await db.country_configs.update_one(
        {"country_code": country},
        {"$set": {
            "weekly_goal_cents": weekly_goal_cents,
            "weekly_goal_updated_at": datetime.now(timezone.utc).isoformat(),
            "weekly_goal_updated_by": user.user_id,
        }},
        upsert=True,
    )

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="weekly_goal_updated",
        target_id=country,
        target_type="country_config",
        reason="",
        request=request,
        extra={"weekly_goal_cents": weekly_goal_cents},
    )
    return {"status": "ok", "country_code": country, "weekly_goal_cents": weekly_goal_cents}


@router.put("/country-admin/settings/default-shipping")
async def update_default_shipping(
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    if not country:
        raise HTTPException(status_code=400, detail="super_admin must use the super-admin endpoint")
    try:
        free_threshold = int((body or {}).get("free_shipping_threshold_cents", 0))
        default_fee = int((body or {}).get("default_shipping_fee_cents", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Values must be integers (cents)")
    if free_threshold < 0 or default_fee < 0:
        raise HTTPException(status_code=400, detail="Values must be >= 0")

    await db.country_configs.update_one(
        {"country_code": country},
        {"$set": {
            "default_shipping": {
                "free_shipping_threshold_cents": free_threshold,
                "default_shipping_fee_cents": default_fee,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.user_id,
            },
        }},
        upsert=True,
    )

    await _audit(
        admin_user_id=user.user_id,
        country_code=country,
        action="default_shipping_updated",
        target_id=country,
        target_type="country_config",
        reason="",
        request=request,
        extra={"free_shipping_threshold_cents": free_threshold, "default_shipping_fee_cents": default_fee},
    )
    return {
        "status": "ok",
        "country_code": country,
        "free_shipping_threshold_cents": free_threshold,
        "default_shipping_fee_cents": default_fee,
    }


@router.get("/country-admin/settings")
async def get_settings(user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    if not country:
        return {"country_code": None, "weekly_goal_cents": 0, "default_shipping": {}}
    config = await db.country_configs.find_one(
        {"country_code": country},
        {"_id": 0, "weekly_goal_cents": 1, "default_shipping": 1, "currency": 1, "language": 1},
    ) or {}
    currency = SUPPORTED_COUNTRIES.get(country, {}).get("currency", "EUR")
    return {
        "country_code": country,
        "weekly_goal_cents": int(config.get("weekly_goal_cents", 0) or 0),
        "default_shipping": config.get("default_shipping") or {},
        "currency": config.get("currency") or currency,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Audit log
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/audit-log")
async def get_audit_log(
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    country = await require_country_admin(user)
    query: dict = {}
    if country:
        query["country_code"] = country
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    items = await db.country_admin_audit.find(query, {"_id": 0}).sort("timestamp", -1).limit(min(200, max(1, limit))).to_list(200)
    return {"items": items, "total": len(items)}


# ─────────────────────────────────────────────────────────────────────────────
# Onboarding
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/onboarding")
async def get_onboarding_status(user: User = Depends(get_current_user)):
    country = await require_country_admin(user)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "country_admin_onboarded": 1})
    return {
        "country_code": country,
        "onboarded": bool((user_doc or {}).get("country_admin_onboarded", False)),
    }


@router.patch("/country-admin/onboarding")
async def mark_onboarded(user: User = Depends(get_current_user)):
    await require_country_admin(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "country_admin_onboarded": True,
            "country_admin_onboarded_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
# AI assistant context (Iris)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/country-admin/ai/context")
async def get_ai_context(user: User = Depends(get_current_user)):
    """
    Return contextual data for the country admin's AI assistant (Iris).
    The frontend assistant uses this to enrich its system prompt.
    """
    country = await require_country_admin(user)
    if not country:
        # super_admin has no scope — return a global flag and let UI handle it.
        return {"country_code": None, "global": True}

    overview_kpis = await country_admin_overview(user)
    country_meta = SUPPORTED_COUNTRIES.get(country, {})

    # Top 5 sellers by GMV in the country (last 90 days)
    cutoff_90d = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    pipeline = [
        {"$match": {
            "country": country,
            "created_at": {"$gte": cutoff_90d},
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered", "completed"]},
        }},
        {"$unwind": "$line_items"},
        {"$group": {
            "_id": "$line_items.producer_id",
            "gmv": {"$sum": "$line_items.subtotal"},
            "orders": {"$sum": 1},
        }},
        {"$sort": {"gmv": -1}},
        {"$limit": 5},
    ]
    try:
        top_sellers = await db.orders.aggregate(pipeline).to_list(5)
    except Exception:
        top_sellers = []

    # Top 5 products
    pipeline_products = [
        {"$match": {"country": country, "created_at": {"$gte": cutoff_90d}}},
        {"$unwind": "$line_items"},
        {"$group": {
            "_id": "$line_items.product_id",
            "name": {"$first": "$line_items.product_name"},
            "qty": {"$sum": "$line_items.quantity"},
            "gmv": {"$sum": "$line_items.subtotal"},
        }},
        {"$sort": {"gmv": -1}},
        {"$limit": 5},
    ]
    try:
        top_products = await db.orders.aggregate(pipeline_products).to_list(5)
    except Exception:
        top_products = []

    return {
        "country_code": country,
        "country_name": country_meta.get("name", country),
        "currency": country_meta.get("currency", "EUR"),
        "languages": country_meta.get("languages", []),
        "kpis": overview_kpis.get("kpis", {}),
        "weekly_goal": overview_kpis.get("weekly_goal", {}),
        "action_items": overview_kpis.get("action_items", {}),
        "top_sellers": top_sellers,
        "top_products": top_products,
    }
