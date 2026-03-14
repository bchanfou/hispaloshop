"""
Cron/scheduled tasks for subscriptions, payouts, tier management and predict notifications.
Endpoints that can be called by a scheduler or admin manually.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import stripe
import os
import uuid
import logging

from core.database import db
from core.models import User
from core.auth import get_current_user, require_role
from services.subscriptions import (
    get_seller_commission_rate, get_influencer_commission_rate,
    recalculate_influencer_tier, GRACE_PERIOD_DAYS,
    INFLUENCER_PAYOUT_DELAY_DAYS, INFLUENCER_MIN_PAYOUT_USD,
)
from services.auth_helpers import send_email
from routes.predictions import calculate_predictions
from config import normalize_influencer_tier

logger = logging.getLogger(__name__)
router = APIRouter()
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')


@router.post("/admin/cron/grace-period-check")
async def cron_grace_period_check(user: User = Depends(get_current_user)):
    """Daily: downgrade sellers whose grace period has expired."""
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc).isoformat()
    expired = await db.users.find(
        {"subscription.plan_status": "past_due", "subscription.grace_period_ends_at": {"$lte": now}},
        {"_id": 0, "user_id": 1, "name": 1, "subscription": 1}
    ).to_list(500)

    downgraded = 0
    for seller in expired:
        sub = seller.get("subscription", {})
        stripe_sub_id = sub.get("stripe_subscription_id")

        # Cancel Stripe subscription
        if stripe_sub_id:
            try:
                stripe.Subscription.cancel(stripe_sub_id)
            except Exception as e:
                logger.error(f"[GRACE] Stripe cancel failed for {seller['user_id']}: {e}")

        # Downgrade to FREE
        await db.users.update_one(
            {"user_id": seller["user_id"]},
            {"$set": {
                "subscription.plan": "FREE",
                "subscription.commission_rate": 0.20,
                "subscription.plan_status": "canceled",
                "subscription.grace_period_ends_at": None,
                "subscription.updated_at": now,
            }}
        )
        downgraded += 1
        logger.info(f"[GRACE] Downgraded {seller['user_id']} ({seller['name']}) to FREE")

    return {"downgraded": downgraded, "checked": len(expired)}


@router.post("/admin/cron/influencer-payouts")
async def cron_influencer_payouts(user: User = Depends(get_current_user)):
    """Daily: process influencer payouts for eligible orders (D+15, ≥$50)."""
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=INFLUENCER_PAYOUT_DELAY_DAYS)).isoformat()

    # Find scheduled payouts that are due
    due_payouts = await db.scheduled_payouts.find(
        {"status": "scheduled", "due_date": {"$lte": now.isoformat()}}
    ).to_list(1000)

    # Group by influencer
    by_influencer = {}
    for p in due_payouts:
        iid = p["influencer_id"]
        if iid not in by_influencer:
            by_influencer[iid] = {"payouts": [], "total": 0}
        by_influencer[iid]["payouts"].append(p)
        by_influencer[iid]["total"] += p["amount"]

    paid_count = 0
    skipped_count = 0

    for iid, data in by_influencer.items():
        if data["total"] < INFLUENCER_MIN_PAYOUT_USD:
            skipped_count += 1
            logger.info(f"[PAYOUT] Skipped {iid}: ${data['total']:.2f} < ${INFLUENCER_MIN_PAYOUT_USD} minimum")
            continue

        # Get influencer's Stripe Connect account
        inf = await db.influencers.find_one({"influencer_id": iid}, {"_id": 0, "stripe_account_id": 1, "stripe_onboarding_complete": 1})
        if not inf or not inf.get("stripe_account_id"):
            logger.warning(f"[PAYOUT] No Stripe account for {iid}")
            continue

        # Verify orders are still valid (not refunded)
        valid_payouts = []
        for p in data["payouts"]:
            order = await db.orders.find_one({"order_id": p["order_id"]}, {"_id": 0, "status": 1})
            if order and order.get("status") not in ("cancelled", "refunded"):
                valid_payouts.append(p)
            else:
                await db.scheduled_payouts.update_one(
                    {"payout_id": p["payout_id"]},
                    {"$set": {"status": "cancelled", "cancel_reason": "order_refunded", "updated_at": now.isoformat()}}
                )

        if not valid_payouts:
            continue

        total_valid = sum(p["amount"] for p in valid_payouts)
        if total_valid < INFLUENCER_MIN_PAYOUT_USD:
            continue

        # Execute Stripe transfer
        try:
            transfer = stripe.Transfer.create(
                amount=int(total_valid * 100),
                currency="usd",
                destination=inf["stripe_account_id"],
                metadata={"influencer_id": iid, "payout_count": len(valid_payouts)},
                idempotency_key=f"inf_batch_{iid}_{now.strftime('%Y%m%d')}",
            )

            for p in valid_payouts:
                await db.scheduled_payouts.update_one(
                    {"payout_id": p["payout_id"]},
                    {"$set": {"status": "paid", "transfer_id": transfer.id, "paid_at": now.isoformat()}}
                )

            paid_count += 1
            logger.info(f"[PAYOUT] Paid {iid}: ${total_valid:.2f} ({len(valid_payouts)} orders) → {transfer.id}")

        except stripe.error.StripeError as e:
            logger.error(f"[PAYOUT] Stripe error for {iid}: {e}")
            for p in valid_payouts:
                await db.scheduled_payouts.update_one(
                    {"payout_id": p["payout_id"]},
                    {"$set": {"status": "failed", "error": str(e), "updated_at": now.isoformat()}}
                )

    return {"paid": paid_count, "skipped_below_minimum": skipped_count, "total_checked": len(by_influencer)}


@router.post("/admin/cron/tier-recalculation")
async def cron_tier_recalculation(user: User = Depends(get_current_user)):
    """Daily: recalculate tiers for influencers due for review."""
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc).isoformat()
    due_influencers = await db.influencers.find(
        {"next_tier_review_date": {"$lte": now}},
        {"_id": 0, "influencer_id": 1, "current_tier": 1}
    ).to_list(500)

    changes = []
    for inf in due_influencers:
        old_tier = normalize_influencer_tier(inf.get("current_tier", "hercules"))
        new_tier = await recalculate_influencer_tier(db, inf["influencer_id"])
        if new_tier != old_tier:
            changes.append({"influencer_id": inf["influencer_id"], "from": old_tier, "to": new_tier})
            logger.info(f"[TIER] {inf['influencer_id']}: {old_tier} → {new_tier}")

    return {"reviewed": len(due_influencers), "changes": changes}


@router.post("/admin/cron/attribution-expiry")
async def cron_attribution_expiry(user: User = Depends(get_current_user)):
    """Weekly: expire old referral attributions (18 months)."""
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_many(
        {
            "referred_by": {"$exists": True, "$ne": None},
            "referral_expires_at": {"$lte": now},
        },
        {
            "$unset": {
                "referred_by": "",
                "referral_code": "",
                "referral_expires_at": "",
            },
            "$set": {"referral_expired_at": now},
        },
    )

    return {"expired": result.modified_count}


@router.post("/admin/cron/influencer-tier-sweep")
async def cron_influencer_tier_sweep(user: User = Depends(get_current_user)):
    """Weekly (Monday 07:00 UTC): sweep all influencer tiers based on 30-day GMV."""
    await require_role(user, ["admin", "super_admin"])
    from routes.influencer import update_influencer_tiers
    await update_influencer_tiers()
    return {"status": "completed"}


@router.post("/admin/cron/influencer-auto-payouts")
async def cron_influencer_auto_payouts(user: User = Depends(get_current_user)):
    """Daily (08:00 UTC): auto-payout influencers with D+15 passed and balance >= 20€."""
    await require_role(user, ["admin", "super_admin"])
    from routes.influencer import process_influencer_payouts
    await process_influencer_payouts()
    return {"status": "completed"}


# ── Hispalo Predict Notifications ──

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://www.hispaloshop.com')

PREDICT_EMAIL_TEMPLATE = """
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #fafaf9; padding: 24px;">
  <div style="background: #1c1917; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px;">
    <h1 style="color: #fff; font-size: 18px; margin: 0;">Hispalo Predict</h1>
    <p style="color: #a8a29e; font-size: 13px; margin: 4px 0 0;">Recordatorio de recompra</p>
  </div>
  <div style="background: #fff; border-radius: 12px; border: 1px solid #e7e5e4; padding: 20px 24px;">
    <p style="color: #44403c; font-size: 14px; margin: 0 0 12px;">Hola <strong>{user_name}</strong>,</p>
    <p style="color: #57534e; font-size: 14px; margin: 0 0 16px;">Tienes <strong style="color: #dc2626;">{overdue_count} producto(s) vencido(s)</strong> que necesitas recomprar:</p>
    <div style="margin-bottom: 16px;">{product_list_html}</div>
    <a href="{frontend_url}/dashboard/predictions" style="display: inline-block; background: #1c1917; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">Ver mis predicciones</a>
  </div>
  <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 16px;">Hispaloshop - Tu supermercado digital</p>
</div>
"""

PRODUCT_ROW_TEMPLATE = """
<div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f5f5f4;">
  <div style="width: 40px; height: 40px; border-radius: 8px; background: #f5f5f4; overflow: hidden; flex-shrink: 0;">
    {img_tag}
  </div>
  <div style="flex: 1;">
    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1c1917;">{product_name}</p>
    <p style="margin: 2px 0 0; font-size: 11px; color: #dc2626;">Vencido hace {days} dias</p>
  </div>
</div>
"""


@router.post("/admin/cron/predict-notifications")
async def cron_predict_notifications(user: User = Depends(get_current_user)):
    """Daily: check for overdue predictions and send email + in-app notifications."""
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Get all customers who have orders
    customer_ids_cursor = db.orders.aggregate([
        {"$match": {"status": {"$nin": ["cancelled", "refunded"]}}},
        {"$group": {"_id": "$user_id"}},
    ])
    customer_ids = [doc["_id"] async for doc in customer_ids_cursor]

    notified_users = 0
    notified_products = 0
    skipped_already_notified = 0

    for uid in customer_ids:
        # Get user info
        user_doc = await db.users.find_one(
            {"user_id": uid},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1}
        )
        if not user_doc or user_doc.get("role") != "customer":
            continue

        # Fetch orders
        orders = await db.orders.find(
            {"user_id": uid},
            {"_id": 0, "line_items": 1, "created_at": 1, "status": 1}
        ).sort("created_at", -1).to_list(200)

        if not orders:
            continue

        # Collect product IDs
        product_ids = set()
        for order in orders:
            for item in order.get("line_items", []):
                if item.get("product_id"):
                    product_ids.add(item["product_id"])

        products = await db.products.find(
            {"product_id": {"$in": list(product_ids)}},
            {"_id": 0, "product_id": 1, "images": 1, "category": 1, "price": 1, "name": 1}
        ).to_list(200)
        products_map = {p["product_id"]: p for p in products}

        predictions = calculate_predictions(orders, products_map)
        overdue = [p for p in predictions if p["status"] == "overdue"]

        if not overdue:
            continue

        # Check: was a predict notification sent to this user in the last 24h?
        recent = await db.user_notifications.find_one({
            "user_id": uid,
            "type": "predict_overdue",
            "created_at": {"$gte": (now - timedelta(hours=24)).isoformat()},
        })
        if recent:
            skipped_already_notified += 1
            continue

        # Build in-app notification
        product_names = [p["product_name"] for p in overdue[:5]]
        summary_text = ", ".join(product_names)
        if len(overdue) > 5:
            summary_text += f" y {len(overdue) - 5} mas"

        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": uid,
            "type": "predict_overdue",
            "title": f"{len(overdue)} producto(s) necesitan recompra",
            "message": summary_text,
            "link": "/dashboard/predictions",
            "read": False,
            "created_at": now_iso,
        }
        await db.user_notifications.insert_one(notification)

        # Build and send email
        product_list_html = ""
        for p in overdue[:8]:
            days_abs = abs(p["days_until_next"])
            img_tag = ""
            if p.get("image"):
                img_tag = f'<img src="{p["image"]}" width="40" height="40" style="object-fit:cover;border-radius:8px;" />'
            product_list_html += PRODUCT_ROW_TEMPLATE.format(
                img_tag=img_tag,
                product_name=p["product_name"],
                days=days_abs,
            )

        html_body = PREDICT_EMAIL_TEMPLATE.format(
            user_name=user_doc.get("name", "Cliente"),
            overdue_count=len(overdue),
            product_list_html=product_list_html,
            frontend_url=FRONTEND_URL,
        )

        try:
            send_email(
                to=user_doc["email"],
                subject=f"Hispalo Predict: {len(overdue)} producto(s) vencido(s)",
                html=html_body,
            )
        except Exception as e:
            logger.error(f"[PREDICT-CRON] Email failed for {uid}: {e}")

        notified_users += 1
        notified_products += len(overdue)
        logger.info(f"[PREDICT-CRON] Notified {uid}: {len(overdue)} overdue products")

    return {
        "notified_users": notified_users,
        "notified_products": notified_products,
        "skipped_already_notified": skipped_already_notified,
        "total_customers_checked": len(customer_ids),
    }
