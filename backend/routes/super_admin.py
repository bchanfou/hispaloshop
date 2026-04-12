"""
Super Admin global view — section 3.3.

This module is the canonical /super-admin/* namespace. It provides:

  - Global KPIs (multi-country)
  - Country comparison
  - Global ledger
  - Unified audit log (super + country admin)
  - Commission rates (read by anyone, write by founder only)
  - Kill switches (founder only)
  - Manual cron triggers
  - Exchange rate reconciliation (proxy of section 3.1 cron)
  - "Act as country admin" temporary override
  - Founder console actions (force logout, recalc, etc)

Strict rules enforced here:

  - Every endpoint requires `super_admin` (legacy `admin` no longer accepted).
  - Founder-only endpoints additionally require `is_founder=True` on the user
    document, validated via core.auth.require_founder.
  - Every write action is logged to db.super_admin_audit with severity.
  - Commission rate writes additionally validate against an env-var bcrypt
    hash (FOUNDER_OVERRIDE_HASH) before mutating.

Aliases for legacy endpoints:

  Legacy `/superadmin/...` routes from admin_dashboard.py and the existing
  `/super-admin/...` routes in admin.py KEEP working (we don't touch them).
  This module adds the NEW endpoints under the `/super-admin/...` prefix and
  duplicates a few key existing ones as aliases for the new dashboard pages.
"""
from __future__ import annotations

import csv
import io
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse

from core.database import db
from core.auth import (
    get_current_user,
    require_super_admin,
    require_founder,
    _normalize_role,
)
from core.models import User
from core.constants import SUPPORTED_COUNTRIES
from core.monetization import (
    COMMISSION_RATES,
    INFLUENCER_TIER_RATES,
    FIRST_PURCHASE_DISCOUNT_PCT,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Audit helper
# ─────────────────────────────────────────────────────────────────────────────

VALID_SEVERITY = ("info", "warning", "critical")


async def _super_audit(
    *,
    admin_user_id: str,
    action: str,
    target_id: str = "",
    target_type: str = "",
    reason: str = "",
    severity: str = "info",
    payload_diff: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Append a super admin action to db.super_admin_audit + Sentry on critical."""
    if severity not in VALID_SEVERITY:
        severity = "info"
    ip = ""
    if request is not None:
        ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "") or "").split(",")[0].strip()
    doc = {
        "log_id": f"saudit_{uuid.uuid4().hex[:16]}",
        "admin_user_id": admin_user_id,
        "country_code": "GLOBAL",
        "action": action,
        "target_id": str(target_id),
        "target_type": target_type,
        "reason": reason,
        "severity": severity,
        "payload_diff": payload_diff or {},
        "ip": ip,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.super_admin_audit.insert_one(doc)
    except Exception as exc:
        logger.error("[SADMIN] Failed to write audit entry %s: %s", action, exc)

    if severity == "critical":
        try:
            import sentry_sdk
            sentry_sdk.capture_message(
                f"[SUPER_ADMIN_CRITICAL] {action} by {admin_user_id}: {reason}",
                level="warning",
            )
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Overview
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/super-admin/overview")
async def overview(user: User = Depends(get_current_user)):
    """Global KPI snapshot for the super admin landing page."""
    await require_super_admin(user)
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    # Active sellers globally
    total_active_sellers = await db.users.count_documents(
        {"role": {"$in": ["producer", "importer"]}, "approved": True}
    )

    # Active countries
    total_active_countries = await db.country_configs.count_documents({"is_active": True})

    # Pending verifications globally
    total_pending_verifications_global = await db.users.count_documents({
        "role": {"$in": ["producer", "importer"]},
        "verification_status.admin_review_required": True,
        "verification_status.is_verified": {"$ne": True},
    })

    # GMV month and orders month, USD-converted
    monthly_orders = await db.orders.find(
        {
            "created_at": {"$gte": month_start},
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered", "completed"]},
        },
        {"_id": 0, "total_amount": 1, "currency": 1, "country": 1, "status": 1},
    ).to_list(20000)

    try:
        from services.exchange_rates import get_all_rates_to_usd
        rates = await get_all_rates_to_usd() or {}
    except Exception:
        rates = {}

    total_orders_month = len(monthly_orders)
    total_gmv_usd_month = 0.0
    by_country: dict[str, dict] = {}
    for o in monthly_orders:
        cur = (o.get("currency") or "USD").upper()
        amt = float(o.get("total_amount", 0) or 0)
        rate = rates.get(cur, 1.0 if cur == "USD" else None)
        usd = round(amt * rate, 2) if rate else 0.0
        total_gmv_usd_month += usd
        cc = o.get("country") or "??"
        by = by_country.setdefault(cc, {"country_code": cc, "gmv_usd": 0.0, "orders": 0})
        by["gmv_usd"] += usd
        by["orders"] += 1

    sorted_by_gmv = sorted(by_country.values(), key=lambda r: r["gmv_usd"], reverse=True)
    top_5 = [
        {**row, "gmv_usd": round(row["gmv_usd"], 2)}
        for row in sorted_by_gmv[:5]
    ]
    bottom_5 = [
        {**row, "gmv_usd": round(row["gmv_usd"], 2)}
        for row in sorted_by_gmv[-5:][::-1]
    ]

    # Refund rate global
    refunds_month = await db.orders.count_documents({
        "created_at": {"$gte": month_start},
        "status": {"$in": ["refunded", "partially_refunded"]},
    })
    refund_rate_global = round((refunds_month / total_orders_month) * 100, 2) if total_orders_month > 0 else 0.0

    # System health summary — quick checks
    health = {
        "mongo": "ok",  # if we got here, Mongo is up
        "exchange_rates_have_data": bool(rates),
        "kill_switches_active": [],
    }
    try:
        from middleware.kill_switch import get_kill_switches
        switches = await get_kill_switches()
        health["kill_switches_active"] = [k for k, v in switches.items() if v]
    except Exception:
        pass

    return {
        "kpis": {
            "total_gmv_usd_month": round(total_gmv_usd_month, 2),
            "total_orders_month": total_orders_month,
            "total_active_sellers": total_active_sellers,
            "total_active_countries": total_active_countries,
            "total_pending_verifications_global": total_pending_verifications_global,
            "refund_rate_global": refund_rate_global,
        },
        "top_5_countries_by_gmv": top_5,
        "bottom_5_countries_by_gmv": bottom_5,
        "system_health_summary": health,
        "generated_at": now.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Countries comparison
# ─────────────────────────────────────────────────────────────────────────────

_COMPARISON_METRICS = ("gmv", "orders", "sellers", "refund_rate")
_PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}


@router.get("/super-admin/countries/comparison")
async def countries_comparison(
    metric: str = "gmv",
    period: str = "30d",
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    if metric not in _COMPARISON_METRICS:
        raise HTTPException(status_code=400, detail=f"metric must be one of {_COMPARISON_METRICS}")
    if period not in _PERIOD_DAYS:
        raise HTTPException(status_code=400, detail=f"period must be one of {list(_PERIOD_DAYS)}")

    days = _PERIOD_DAYS[period]
    start = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        from services.exchange_rates import get_all_rates_to_usd
        rates = await get_all_rates_to_usd() or {}
    except Exception:
        rates = {}

    countries = await db.country_configs.find({}, {"_id": 0}).to_list(200)
    rows: list[dict] = []
    for cc in countries:
        code = (cc.get("country_code") or "").upper()
        if not code:
            continue
        currency = SUPPORTED_COUNTRIES.get(code, {}).get("currency") or cc.get("currency") or "EUR"

        orders = await db.orders.find(
            {"country": code, "created_at": {"$gte": start},
             "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered", "completed"]}},
            {"_id": 0, "total_amount": 1, "currency": 1},
        ).to_list(20000)
        local_gmv = round(sum(float(o.get("total_amount", 0) or 0) for o in orders), 2)
        usd_gmv = round(local_gmv * rates.get(currency, 1.0 if currency == "USD" else 0), 2) if rates else 0.0
        order_count = len(orders)
        seller_count = await db.users.count_documents(
            {"country": code, "role": {"$in": ["producer", "importer"]}, "approved": True}
        )
        refund_count = await db.orders.count_documents(
            {"country": code, "created_at": {"$gte": start},
             "status": {"$in": ["refunded", "partially_refunded"]}}
        )
        refund_rate = round((refund_count / order_count) * 100, 2) if order_count > 0 else 0.0

        weekly_goal_cents = int(cc.get("weekly_goal_cents", 0) or 0)
        rows.append({
            "country_code": code,
            "name": cc.get("name_local") or SUPPORTED_COUNTRIES.get(code, {}).get("name", code),
            "flag": cc.get("flag", ""),
            "currency": currency,
            "is_active": bool(cc.get("is_active", False)),
            "gmv_local": local_gmv,
            "gmv_usd": usd_gmv,
            "orders": order_count,
            "sellers": seller_count,
            "refund_rate_pct": refund_rate,
            "weekly_goal_cents": weekly_goal_cents,
        })

    sort_key = {
        "gmv": lambda r: r["gmv_usd"],
        "orders": lambda r: r["orders"],
        "sellers": lambda r: r["sellers"],
        "refund_rate": lambda r: r["refund_rate_pct"],
    }[metric]
    rows.sort(key=sort_key, reverse=(metric != "refund_rate"))
    return {"period": period, "metric": metric, "items": rows}


# ─────────────────────────────────────────────────────────────────────────────
# Audit log (unified)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/super-admin/audit-log/global")
async def audit_log_global(
    country_code: Optional[str] = None,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    limit = min(500, max(1, limit))
    super_query: dict = {}
    country_query: dict = {}
    if country_code:
        country_query["country_code"] = country_code.upper()
        super_query["country_code"] = country_code.upper()
    if admin_id:
        country_query["admin_user_id"] = admin_id
        super_query["admin_user_id"] = admin_id
    if action:
        country_query["action"] = action
        super_query["action"] = action
    if severity:
        super_query["severity"] = severity

    super_logs = await db.super_admin_audit.find(super_query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    country_logs = await db.country_admin_audit.find(country_query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)

    # Tag source for the UI
    for s in super_logs:
        s["source"] = "super_admin"
    for c in country_logs:
        c["source"] = "country_admin"
        c.setdefault("severity", "info")

    merged = sorted(super_logs + country_logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
    return {"items": merged, "total": len(merged)}


# ─────────────────────────────────────────────────────────────────────────────
# Commission rates (read everyone, write founder-only)
# ─────────────────────────────────────────────────────────────────────────────

def _serialise_commission_rates() -> dict:
    return {
        "seller_plans": {k: float(v) for k, v in COMMISSION_RATES.items()},
        "influencer_tiers": {k: float(v) for k, v in INFLUENCER_TIER_RATES.items()},
        "first_purchase_discount": float(FIRST_PURCHASE_DISCOUNT_PCT),
    }


@router.get("/super-admin/commission-rates")
async def get_commission_rates(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    # Try DB override first, fall back to in-code constants.
    doc = await db.platform_config.find_one({"_id": "current"}, {"_id": 0, "commission_rates": 1})
    db_rates = (doc or {}).get("commission_rates")
    return {
        "rates": db_rates or _serialise_commission_rates(),
        "source": "db_override" if db_rates else "code_constants",
        "code_constants": _serialise_commission_rates(),
    }


@router.put("/super-admin/commission-rates")
async def update_commission_rates(
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    """
    Founder-only. Requires:

      - body.acknowledge_breaks_history: True (explicit ack)
      - body.founder_password_confirm: plain text password verified against
        env var FOUNDER_OVERRIDE_HASH (bcrypt)
      - body.rates: { seller_plans: {...}, influencer_tiers: {...} }

    Writes to db.platform_config.commission_rates and audits as critical.
    NOTE: this does NOT modify backend/core/monetization.py — the constants
    in code remain the canonical fallback. The runtime override is read by
    services/subscriptions.py via the existing _plans_cache mechanism.
    """
    await require_founder(user)

    if not body or not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body required")
    if not body.get("acknowledge_breaks_history"):
        raise HTTPException(
            status_code=400,
            detail="Debes confirmar acknowledge_breaks_history=true. Cambiar comisiones afecta a todos los splits futuros.",
        )

    founder_password = body.get("founder_password_confirm") or ""
    expected_hash = os.environ.get("FOUNDER_OVERRIDE_HASH", "")
    if not expected_hash:
        raise HTTPException(
            status_code=503,
            detail="FOUNDER_OVERRIDE_HASH no configurado en el servidor. No se puede cambiar comisiones.",
        )
    try:
        import bcrypt
        if not bcrypt.checkpw(founder_password.encode("utf-8"), expected_hash.encode("utf-8")):
            raise HTTPException(status_code=403, detail="Founder password incorrecta")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error verificando credenciales founder")

    new_rates = body.get("rates") or {}
    if not isinstance(new_rates, dict):
        raise HTTPException(status_code=400, detail="rates must be an object")
    seller_plans = new_rates.get("seller_plans") or {}
    influencer_tiers = new_rates.get("influencer_tiers") or {}

    # Validate ranges (sanity, not business policy):
    for plan, rate in seller_plans.items():
        try:
            r = float(rate)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"Invalid seller plan rate for {plan}")
        if not (0 <= r <= 0.5):
            raise HTTPException(status_code=400, detail=f"Seller plan rate {plan}={r} out of range [0, 0.5]")
    for tier, rate in influencer_tiers.items():
        try:
            r = float(rate)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"Invalid influencer tier rate for {tier}")
        if not (0 <= r <= 0.2):
            raise HTTPException(status_code=400, detail=f"Influencer tier rate {tier}={r} out of range [0, 0.2]")

    previous = await db.platform_config.find_one({"_id": "current"}, {"_id": 0, "commission_rates": 1}) or {}
    await db.platform_config.update_one(
        {"_id": "current"},
        {"$set": {
            "commission_rates": {
                "seller_plans": {k: float(v) for k, v in seller_plans.items()},
                "influencer_tiers": {k: float(v) for k, v in influencer_tiers.items()},
            },
            "commission_rates_updated_at": datetime.now(timezone.utc).isoformat(),
            "commission_rates_updated_by": user.user_id,
        }},
        upsert=True,
    )

    await _super_audit(
        admin_user_id=user.user_id,
        action="commission_rates_updated",
        target_id="commission_rates",
        target_type="platform_config",
        reason=body.get("reason", ""),
        severity="critical",
        payload_diff={"previous": previous.get("commission_rates"), "new": {"seller_plans": seller_plans, "influencer_tiers": influencer_tiers}},
        request=request,
    )

    # Best-effort notification email to stakeholders
    try:
        notify = os.environ.get("FOUNDER_NOTIFY_EMAILS", "")
        if notify:
            from services.auth_helpers import send_email
            for addr in [a.strip() for a in notify.split(",") if a.strip()]:
                await send_email(
                    to_email=addr,
                    subject="[HispaloShop] Comisiones actualizadas por founder",
                    html_body=f"<p>El founder {user.email} ha actualizado las comisiones de plataforma.</p><pre>{seller_plans} / {influencer_tiers}</pre>",
                )
    except Exception as exc:
        logger.warning("[SADMIN] Could not send founder notification email: %s", exc)

    return {"status": "ok", "rates": new_rates}


# ─────────────────────────────────────────────────────────────────────────────
# Kill switches (founder only)
# ─────────────────────────────────────────────────────────────────────────────

VALID_KILL_FLAGS = ("registrations", "checkout", "readonly", "all")


@router.get("/super-admin/system/kill-switch")
async def get_kill_switch(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    doc = await db.platform_config.find_one(
        {"_id": "current"},
        {"_id": 0, "kill_switches": 1, "kill_switches_history": 1},
    ) or {}
    return {
        "switches": doc.get("kill_switches") or {},
        "history": (doc.get("kill_switches_history") or [])[-20:],
    }


@router.post("/super-admin/system/kill-switch")
async def set_kill_switch(
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_founder(user)
    flag = (body or {}).get("flag")
    enabled = bool((body or {}).get("enabled", False))
    reason = ((body or {}).get("reason") or "").strip()
    if flag not in VALID_KILL_FLAGS:
        raise HTTPException(status_code=400, detail=f"flag must be one of {VALID_KILL_FLAGS}")
    if len(reason) < 30:
        raise HTTPException(status_code=400, detail="Reason must be at least 30 characters")

    now_iso = datetime.now(timezone.utc).isoformat()
    history_entry = {
        "flag": flag,
        "enabled": enabled,
        "reason": reason,
        "by": user.user_id,
        "at": now_iso,
    }
    await db.platform_config.update_one(
        {"_id": "current"},
        {
            "$set": {
                f"kill_switches.{flag}": enabled,
                "kill_switches_updated_at": now_iso,
                "kill_switches_updated_by": user.user_id,
            },
            "$push": {"kill_switches_history": history_entry},
        },
        upsert=True,
    )

    # Invalidate the in-process cache so the change takes effect immediately.
    try:
        from middleware.kill_switch import invalidate_kill_switch_cache
        invalidate_kill_switch_cache()
    except Exception:
        pass

    await _super_audit(
        admin_user_id=user.user_id,
        action="kill_switch_set",
        target_id=flag,
        target_type="kill_switch",
        reason=reason,
        severity="critical",
        payload_diff={"enabled": enabled},
        request=request,
    )
    return {"status": "ok", "flag": flag, "enabled": enabled}


# ─────────────────────────────────────────────────────────────────────────────
# Manual cron triggers
# ─────────────────────────────────────────────────────────────────────────────

# Whitelist of crons the super admin may trigger from the dashboard.
# The actual handlers live in routes/cron.py and other route modules.
ALLOWED_CRONS = {
    "exchange-rates": ("services.exchange_rates", "update_exchange_rates"),
    "tier-recalculation": ("services.subscriptions", "recalculate_influencer_tier_for_all"),
    "fiscal-quarterly": ("services.modelo190_service", "generate_quarterly_report_async"),
    "story-cleanup": ("services.post_service", "cleanup_expired_stories"),
    # M-5 (section 3.6.4): moderation auto-action sweep. YAML wiring deferred to 5.4.
    "moderation-auto-actions": ("routes.moderation_v2", "run_moderation_auto_actions_sweep"),
    # GDPR 4.1: hard-delete users whose 30-day soft-delete grace period expired.
    "pending-deletions": ("routes.customer", "process_pending_deletions"),
}


@router.get("/super-admin/system/crons")
async def list_crons(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    items = []
    for name in ALLOWED_CRONS:
        last = await db.cron_runs.find_one({"name": name}, sort=[("ran_at", -1)], projection={"_id": 0})
        items.append({
            "name": name,
            "last_run_at": (last or {}).get("ran_at"),
            "last_status": (last or {}).get("status", "never"),
            "last_error": (last or {}).get("error"),
        })
    return {"items": items}


@router.post("/super-admin/system/cron/{cron_name}/run")
async def run_cron(
    cron_name: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    if cron_name not in ALLOWED_CRONS:
        raise HTTPException(status_code=404, detail=f"Unknown cron {cron_name}. Allowed: {list(ALLOWED_CRONS)}")

    module_name, func_name = ALLOWED_CRONS[cron_name]
    started_at = datetime.now(timezone.utc).isoformat()
    error: Optional[str] = None
    result_summary: Any = None
    try:
        import importlib
        module = importlib.import_module(module_name)
        func = getattr(module, func_name, None)
        if func is None:
            raise RuntimeError(f"{module_name}.{func_name} not found")
        if hasattr(func, "__call__"):
            res = func()
            if hasattr(res, "__await__"):
                res = await res
            result_summary = str(res)[:300] if res is not None else "ok"
    except Exception as exc:
        error = str(exc)
        logger.error("[SADMIN] Cron %s failed: %s", cron_name, exc)

    finished_at = datetime.now(timezone.utc).isoformat()
    await db.cron_runs.insert_one({
        "name": cron_name,
        "ran_at": started_at,
        "finished_at": finished_at,
        "status": "failed" if error else "success",
        "error": error,
        "result_summary": result_summary,
        "triggered_by": user.user_id,
    })
    await _super_audit(
        admin_user_id=user.user_id,
        action=f"cron_run:{cron_name}",
        target_id=cron_name,
        target_type="cron",
        reason="manual_trigger",
        severity="warning" if error else "info",
        payload_diff={"error": error, "result": result_summary},
        request=request,
    )

    if error:
        raise HTTPException(status_code=500, detail=f"Cron failed: {error}")
    return {"status": "ok", "cron_name": cron_name, "result": result_summary}


@router.post("/super-admin/system/exchange-rates/reconcile")
async def reconcile_exchange_rates(request: Request, user: User = Depends(get_current_user)):
    await require_super_admin(user)
    try:
        from services.exchange_rates import get_all_rates_to_usd, update_exchange_rates
        before = await get_all_rates_to_usd() or {}
        await update_exchange_rates()
        after = await get_all_rates_to_usd() or {}
    except Exception as exc:
        logger.error("[SADMIN] Exchange rates reconcile failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"ECB reconcile failed: {exc}")

    diff: dict[str, dict] = {}
    for cur in set(before.keys()) | set(after.keys()):
        b = before.get(cur)
        a = after.get(cur)
        if b != a:
            diff[cur] = {"before": b, "after": a}

    await _super_audit(
        admin_user_id=user.user_id,
        action="exchange_rates_reconciled",
        target_type="exchange_rates",
        reason="manual_reconcile",
        severity="info",
        payload_diff={"diff_count": len(diff)},
        request=request,
    )
    return {"status": "ok", "diff": diff, "total_currencies": len(after)}


# ─────────────────────────────────────────────────────────────────────────────
# Global ledger
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/super-admin/ledger/global")
async def ledger_global(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    country_code: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    limit = min(1000, max(1, limit))
    query: dict = {}
    if country_code:
        query["buyer_country"] = country_code.upper()
    if event_type:
        query["event_type"] = event_type
    if from_date or to_date:
        query["created_at"] = {}
        if from_date:
            query["created_at"]["$gte"] = from_date
        if to_date:
            query["created_at"]["$lte"] = to_date

    total = await db.financial_ledger.count_documents(query)
    items = await db.financial_ledger.find(query, {"_id": 0}).sort("created_at", -1).skip(max(0, offset)).limit(limit).to_list(limit)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/super-admin/ledger/global/export")
async def ledger_global_export(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    country_code: Optional[str] = None,
    event_type: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    query: dict = {}
    if country_code:
        query["buyer_country"] = country_code.upper()
    if event_type:
        query["event_type"] = event_type
    if from_date or to_date:
        query["created_at"] = {}
        if from_date:
            query["created_at"]["$gte"] = from_date
        if to_date:
            query["created_at"]["$lte"] = to_date

    items = await db.financial_ledger.find(query, {"_id": 0}).sort("created_at", -1).limit(10000).to_list(10000)

    output = io.StringIO()
    fieldnames = [
        "ledger_id", "event_type", "order_id", "buyer_country", "currency",
        "exchange_rate_to_usd", "usd_equivalent", "product_subtotal",
        "product_tax_amount", "platform_fee", "platform_net", "seller_net",
        "influencer_amount", "status", "created_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for it in items:
        writer.writerow({k: it.get(k, "") for k in fieldnames})

    await _super_audit(
        admin_user_id=user.user_id,
        action="ledger_export",
        target_type="financial_ledger",
        reason=f"{len(items)} rows",
        severity="info",
    )
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ledger_global.csv"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# "Act as country admin" — temporary scope for super_admin
# ─────────────────────────────────────────────────────────────────────────────

ACT_AS_COOKIE = "super_admin_acting_as_country"
ACT_AS_TTL_SECONDS = 60 * 60  # 1 hour


@router.post("/super-admin/act-as-country-admin/{country_code}")
async def act_as_country_admin(
    country_code: str,
    response: Response,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    code = country_code.upper()
    if code not in SUPPORTED_COUNTRIES:
        raise HTTPException(status_code=404, detail=f"Country {code} not supported")

    response.set_cookie(
        key=ACT_AS_COOKIE,
        value=code,
        max_age=ACT_AS_TTL_SECONDS,
        httponly=False,  # frontend reads it to render the banner
        samesite="lax",
        secure=os.environ.get("ENV") == "production",
    )
    await _super_audit(
        admin_user_id=user.user_id,
        action="act_as_country_admin",
        target_id=code,
        target_type="country",
        reason="impersonation_started",
        severity="warning",
        request=request,
    )
    return {"status": "ok", "acting_as": code, "ttl_seconds": ACT_AS_TTL_SECONDS}


@router.delete("/super-admin/act-as-country-admin")
async def stop_act_as_country_admin(
    response: Response,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    response.delete_cookie(ACT_AS_COOKIE)
    await _super_audit(
        admin_user_id=user.user_id,
        action="act_as_country_admin_stop",
        target_type="country",
        reason="impersonation_stopped",
        severity="info",
        request=request,
    )
    return {"status": "ok"}


@router.get("/super-admin/act-as-country-admin")
async def get_act_as(request: Request, user: User = Depends(get_current_user)):
    await require_super_admin(user)
    return {"acting_as": request.cookies.get(ACT_AS_COOKIE)}


# ─────────────────────────────────────────────────────────────────────────────
# Founder console — destructive global actions
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/super-admin/founder/force-logout-all")
async def force_logout_all(
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_founder(user)
    reason = ((body or {}).get("reason") or "").strip()
    if len(reason) < 30:
        raise HTTPException(status_code=400, detail="Reason must be at least 30 characters")

    result = await db.user_sessions.delete_many({})
    await _super_audit(
        admin_user_id=user.user_id,
        action="force_logout_all",
        target_type="sessions",
        reason=reason,
        severity="critical",
        payload_diff={"deleted_sessions": result.deleted_count},
        request=request,
    )
    return {"status": "ok", "deleted_sessions": result.deleted_count}


@router.post("/super-admin/founder/clear-cache")
async def clear_global_cache(
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_founder(user)
    cleared: list[str] = []
    try:
        from services.subscriptions import _plans_cache
        _plans_cache["data"] = None
        _plans_cache["fetched_at"] = None
        cleared.append("plans_cache")
    except Exception:
        pass
    try:
        from middleware.kill_switch import invalidate_kill_switch_cache
        invalidate_kill_switch_cache()
        cleared.append("kill_switch_cache")
    except Exception:
        pass
    try:
        from services.ledger import _rates_cache
        _rates_cache.clear()
        cleared.append("rates_cache")
    except Exception:
        pass

    await _super_audit(
        admin_user_id=user.user_id,
        action="clear_global_cache",
        target_type="cache",
        reason="manual",
        severity="warning",
        payload_diff={"cleared": cleared},
        request=request,
    )
    return {"status": "ok", "cleared": cleared}


# ─────────────────────────────────────────────────────────────────────────────
# Aliases for legacy endpoints (forward to existing handlers)
# ─────────────────────────────────────────────────────────────────────────────
#
# These endpoints exist as conveniences for the new dashboard. Each one calls
# the legacy handler from another route module — we never duplicate business
# logic. Old paths keep working.

@router.get("/super-admin/finance/dashboard")
async def alias_finance_dashboard(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    from routes.subscriptions import admin_finance_dashboard
    return await admin_finance_dashboard(user)


@router.get("/super-admin/finance/fiscal-stats")
async def alias_fiscal_stats(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    from routes.admin_fiscal import get_fiscal_stats
    return await get_fiscal_stats(user)


@router.get("/super-admin/market-coverage")
async def alias_market_coverage(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    from routes.admin_dashboard import get_market_coverage
    return await get_market_coverage(user)


# ─────────────────────────────────────────────────────────────────────────────
# Support — global super admin endpoints (section 3.4)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/super-admin/support/tickets/global")
async def support_tickets_global(
    country_code: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_admin_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    query: dict = {}
    if country_code:
        query["country_code"] = country_code.upper()
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if assigned_admin_id:
        query["assigned_admin_id"] = assigned_admin_id
    if search:
        query["$or"] = [
            {"subject": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}},
        ]
    limit = min(500, max(1, limit))
    total = await db.support_tickets.count_documents(query)
    items = await db.support_tickets.find(query, {"_id": 0}).sort("updated_at", -1).skip(max(0, offset)).limit(limit).to_list(limit)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/super-admin/support/tickets/escalated")
async def support_tickets_escalated(user: User = Depends(get_current_user)):
    await require_super_admin(user)
    items = await db.support_tickets.find(
        {"escalated_to_super_admin": True, "status": {"$nin": ["resolved", "closed"]}},
        {"_id": 0},
    ).sort("escalated_at", -1).limit(200).to_list(200)
    return {"items": items, "total": len(items)}


@router.post("/super-admin/support/tickets/{ticket_id}/super-respond")
async def super_respond_ticket(
    ticket_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    text = ((body or {}).get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Mensaje vacío")
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    now_iso = datetime.now(timezone.utc).isoformat()
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:14]}",
        "ticket_id": ticket_id,
        "sender_id": user.user_id,
        "sender_role": "admin",
        "body": text,
        "attachments": [],
        "created_at": now_iso,
        "read_by_user": False,
        "read_by_admin": True,
        "is_internal_note": False,
        "from_super_admin": True,
    }
    await db.support_messages.insert_one(msg)
    update: dict = {"updated_at": now_iso, "status": "awaiting_user"}
    if not ticket.get("first_response_at"):
        update["first_response_at"] = now_iso
    await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": update})

    try:
        from services.notifications.dispatcher_service import notification_dispatcher
        await notification_dispatcher.send_notification(
            user_id=ticket.get("user_id", ""),
            title="Respuesta del equipo de Hispaloshop",
            body=f"#{ticket['ticket_number']} · {text[:80]}",
            notification_type="support_ticket_replied_admin",
            channels=["in_app", "push", "email"],
            data={"ticket_id": ticket_id},
            action_url=f"/support/tickets/{ticket_id}",
        )
    except Exception:
        pass

    await _super_audit(
        admin_user_id=user.user_id,
        action="support_super_respond",
        target_id=ticket_id,
        target_type="support_ticket",
        reason=text[:200],
        severity="info",
        request=request,
    )
    return {"status": "ok", "message_id": msg["message_id"]}


@router.post("/super-admin/support/tickets/{ticket_id}/reassign")
async def reassign_ticket(
    ticket_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    new_admin_id = ((body or {}).get("new_admin_id") or "").strip()
    reason = ((body or {}).get("reason") or "").strip()
    if not new_admin_id or len(reason) < 20:
        raise HTTPException(status_code=400, detail="new_admin_id y reason (≥20) requeridos")
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "assigned_admin_id": new_admin_id,
            "escalated_to_super_admin": False,
            "status": "awaiting_admin",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await _super_audit(
        admin_user_id=user.user_id,
        action="support_ticket_reassigned",
        target_id=ticket_id,
        target_type="support_ticket",
        reason=reason,
        severity="warning",
        payload_diff={"new_admin_id": new_admin_id, "previous": ticket.get("assigned_admin_id")},
        request=request,
    )
    return {"status": "reassigned"}


@router.get("/super-admin/support/metrics/global")
async def support_metrics_global(
    period: str = "30d",
    group_by: str = "country",
    user: User = Depends(get_current_user),
):
    await require_super_admin(user)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    open_count = await db.support_tickets.count_documents({
        "created_at": {"$gte": cutoff},
        "status": {"$in": ["open", "awaiting_admin", "in_progress", "awaiting_user", "reopened", "escalated"]},
    })
    breaches = await db.support_tickets.count_documents({
        "created_at": {"$gte": cutoff},
        "first_response_at": None,
        "sla_first_response_due": {"$lt": datetime.now(timezone.utc).isoformat()},
    })
    csat_docs = await db.support_csat.find({"created_at": {"$gte": cutoff}}, {"_id": 0, "rating": 1, "country_code": 1, "assigned_admin_id": 1}).to_list(5000)
    csat_avg = round(sum(c["rating"] for c in csat_docs) / len(csat_docs), 2) if csat_docs else None

    group_field = "country_code" if group_by == "country" else "assigned_admin_id"
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": f"${group_field}",
            "tickets": {"$sum": 1},
            "resolved": {"$sum": {"$cond": [{"$in": ["$status", ["resolved", "closed"]]}, 1, 0]}},
        }},
        {"$sort": {"tickets": -1}},
    ]
    try:
        ranking = await db.support_tickets.aggregate(pipeline).to_list(50)
    except Exception:
        ranking = []

    return {
        "period": period,
        "open_count": open_count,
        "sla_breaches": breaches,
        "csat_avg": csat_avg,
        "csat_count": len(csat_docs),
        "ranking": ranking,
        "group_by": group_by,
    }


@router.get("/super-admin/support/sla-breaches")
async def support_sla_breaches(period: str = "30d", user: User = Depends(get_current_user)):
    await require_super_admin(user)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    items = await db.support_tickets.find(
        {
            "created_at": {"$gte": cutoff},
            "$or": [
                {"sla_first_response_met": False},
                {"sla_resolution_met": False},
            ],
        },
        {"_id": 0},
    ).sort("created_at", -1).limit(500).to_list(500)
    return {"items": items, "total": len(items)}


@router.post("/super-admin/support/sla-monitor/run")
async def run_sla_monitor(request: Request, user: User = Depends(get_current_user)):
    """
    Manual trigger for the SLA monitor. The cron job in section 3.4 calls
    this same logic — it scans tickets whose first-response SLA expired
    without a first response, marks them as breached, and dispatches
    notifications to the assigned admin.

    Also auto-closes tickets in `awaiting_user` whose last update is older
    than AUTO_CLOSE_AWAITING_USER_DAYS (7 days).
    """
    await require_super_admin(user)
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    breached_first = await db.support_tickets.find(
        {
            "first_response_at": None,
            "sla_first_response_due": {"$lt": now_iso},
            "sla_first_response_met": None,
            "status": {"$nin": ["closed", "resolved"]},
        },
        {"_id": 0, "ticket_id": 1, "ticket_number": 1, "assigned_admin_id": 1},
    ).limit(500).to_list(500)
    for t in breached_first:
        await db.support_tickets.update_one(
            {"ticket_id": t["ticket_id"]},
            {"$set": {"sla_first_response_met": False}},
        )
        if t.get("assigned_admin_id"):
            try:
                from services.notifications.dispatcher_service import notification_dispatcher
                await notification_dispatcher.send_notification(
                    user_id=t["assigned_admin_id"],
                    title="SLA breach",
                    body=f"Ticket #{t.get('ticket_number')} ha excedido el SLA de primera respuesta",
                    notification_type="support_ticket_sla_breach",
                    channels=["in_app", "push"],
                    data={"ticket_id": t["ticket_id"]},
                    action_url="/country-admin/support",
                )
            except Exception:
                pass

    # Auto-close awaiting_user tickets older than 7 days
    cutoff = (now - timedelta(days=7)).isoformat()
    closed = await db.support_tickets.update_many(
        {
            "status": "awaiting_user",
            "updated_at": {"$lt": cutoff},
        },
        {"$set": {"status": "closed", "closed_at": now_iso, "updated_at": now_iso}},
    )

    await _super_audit(
        admin_user_id=user.user_id,
        action="support_sla_monitor_run",
        target_type="support",
        reason="manual",
        severity="info",
        payload_diff={"breached": len(breached_first), "auto_closed": closed.modified_count},
        request=request,
    )
    return {
        "breached_first_response": len(breached_first),
        "auto_closed": closed.modified_count,
    }
