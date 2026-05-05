"""
Cron/scheduled tasks for subscriptions, payouts, tier management and predict notifications.
Endpoints that can be called by a scheduler or admin manually.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
import html as _html
import stripe
import os
import uuid
import logging

from bson import ObjectId
from core.database import db, get_db
from core.models import User
from core.auth import get_current_user, require_role
from services.subscriptions import (
    get_seller_commission_rate, get_influencer_commission_rate,
    recalculate_influencer_tier, GRACE_PERIOD_DAYS,
    INFLUENCER_PAYOUT_DELAY_DAYS, INFLUENCER_MIN_PAYOUT_EUR,
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
                logger.error(f"[GRACE] Stripe cancel failed for {seller.get('user_id')}: {e}")

        # Downgrade to FREE
        seller_uid = seller.get("user_id")
        if not seller_uid:
            continue
        await db.users.update_one(
            {"user_id": seller_uid},
            {"$set": {
                "subscription.plan": "FREE",
                "subscription.commission_rate": 0.20,
                "subscription.plan_status": "canceled",
                "subscription.grace_period_ends_at": None,
                "subscription.updated_at": now,
            }}
        )
        downgraded += 1
        logger.info(f"[GRACE] Downgraded {seller_uid} ({seller.get('name')}) to FREE")

    return {"downgraded": downgraded, "checked": len(expired)}


@router.post("/admin/cron/influencer-payouts")
async def cron_influencer_payouts(user: User = Depends(get_current_user)):
    """DEPRECATED: Use /admin/cron/influencer-auto-payouts instead (includes IRPF withholding)."""
    await require_role(user, ["admin", "super_admin"])
    # Delegate to the canonical implementation that includes fiscal withholding
    from routes.influencer import process_influencer_payouts
    await process_influencer_payouts()
    return {"status": "completed", "note": "Delegated to influencer-auto-payouts"}


@router.post("/admin/cron/update-exchange-rates")
async def cron_update_exchange_rates(user: User = Depends(get_current_user)):
    """Daily: fetch latest exchange rates from ECB and store in DB."""
    await require_role(user, ["admin", "super_admin"])
    from services.exchange_rates import update_exchange_rates
    doc = await update_exchange_rates()
    return {"status": "updated", "date": doc["date"], "currencies": len(doc["rates"])}


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
        inf_id = inf.get("influencer_id")
        if not inf_id:
            continue
        old_tier = normalize_influencer_tier(inf.get("current_tier", "hercules"))
        new_tier = await recalculate_influencer_tier(db, inf_id)
        if new_tier != old_tier:
            changes.append({"influencer_id": inf_id, "from": old_tier, "to": new_tier})
            logger.info(f"[TIER] {inf_id}: {old_tier} -> {new_tier}")

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

    # Also expire the customer_influencer_attribution records so new codes can be used
    attr_result = await db.customer_influencer_attribution.update_many(
        {
            "is_active": True,
            "$or": [
                {"expires_at": {"$lte": now}},
                {"attribution_expiry_date": {"$lte": now}},
            ],
        },
        {"$set": {"is_active": False, "expired_at": now}},
    )

    return {"expired_users": result.modified_count, "expired_attributions": attr_result.modified_count}


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


@router.post("/admin/cron/retry-failed-transfers")
async def cron_retry_failed_transfers(user: User = Depends(get_current_user)):
    """Daily: retry payouts stuck in transfer_failed status (one extra attempt each)."""
    await require_role(user, ["admin", "super_admin"])

    from database import AsyncSessionLocal
    from sqlalchemy import select as sa_select
    from models import Payout
    from services.affiliate_service import _attempt_stripe_transfer, _notify_admin_transfer_failed

    retried = 0
    still_failed: list[dict] = []

    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(
            sa_select(Payout).where(Payout.status == "transfer_failed")
        )
        failed_payouts = result.scalars().all()

        for payout in failed_payouts:
            payout.status = "pending_transfer"
            payout.failure_reason = None
            payout.failed_at = None
            await db_session.flush()

            try:
                transfer_id = await _attempt_stripe_transfer(payout)
                now = datetime.now(timezone.utc)
                payout.stripe_transfer_id = transfer_id
                payout.status = "paid"
                payout.processed_at = now
                payout.paid_at = now
                retried += 1
                logger.info("Cron retry succeeded for payout %s", payout.id)
            except Exception as e:
                now = datetime.now(timezone.utc)
                payout.status = "transfer_failed"
                payout.failed_at = now
                payout.failure_reason = str(e)[:500]
                still_failed.append({"payout_id": str(payout.id)})
                logger.error("Cron retry failed for payout %s: %s", payout.id, e)
                await _notify_admin_transfer_failed(db_session, payout, e)

        await db_session.commit()

    return {
        "retried_successfully": retried,
        "still_failed": len(still_failed),
        "failures": still_failed,
    }


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

    # Get all customers who have orders (limit to prevent unbounded)
    customer_ids_cursor = db.orders.aggregate([
        {"$match": {"status": {"$nin": ["cancelled", "refunded"]}}},
        {"$group": {"_id": "$user_id"}},
        {"$limit": 5000},
    ])
    customer_ids = [doc["_id"] async for doc in customer_ids_cursor if doc.get("_id")]

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
        recent = await db.notifications.find_one({
            "user_id": uid,
            "type": "predict_overdue",
            "created_at": {"$gte": now - timedelta(hours=24)},
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
            "user_id": uid,
            "type": "predict_overdue",
            "title": f"{len(overdue)} producto(s) necesitan recompra",
            "body": summary_text,
            "action_url": "/dashboard/predictions",
            "data": {},
            "channels": ["in_app"],
            "status_by_channel": {"in_app": "sent"},
            "read_at": None,
            "created_at": now,
            "sent_at": now,
        }
        await db.notifications.insert_one(notification)

        # Build and send email — HTML-escape all user-controlled values to prevent XSS
        product_list_html = ""
        for p in overdue[:8]:
            days_abs = abs(p["days_until_next"])
            img_tag = ""
            if p.get("image"):
                safe_url = _html.escape(str(p["image"]), quote=True)
                img_tag = f'<img src="{safe_url}" width="40" height="40" style="object-fit:cover;border-radius:8px;" />'
            product_list_html += PRODUCT_ROW_TEMPLATE.format(
                img_tag=img_tag,
                product_name=_html.escape(str(p["product_name"])),
                days=days_abs,
            )

        html_body = PREDICT_EMAIL_TEMPLATE.format(
            user_name=_html.escape(str(user_doc.get("name", "Cliente"))),
            overdue_count=len(overdue),
            product_list_html=product_list_html,
            frontend_url=_html.escape(FRONTEND_URL, quote=True),
        )

        user_email = user_doc.get("email")
        if user_email:
            try:
                send_email(
                    to=user_email,
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


@router.post("/admin/cron/b2b-scheduled-payments")
async def process_b2b_scheduled_payments(
    current_user: User = Depends(get_current_user),
):
    """Process B2B scheduled payments that are due today."""
    await require_role(current_user, ["admin", "super_admin"])

    db2 = get_db()
    now = datetime.now(timezone.utc)

    # Find pending payments scheduled for today or earlier
    pending = await db2.b2b_scheduled_payments.find({
        "status": "pending",
        "scheduled_for": {"$lte": now.isoformat()},
    }).to_list(length=100)

    processed = 0
    failed = 0

    for payment in pending:
        try:
            operation_id = payment.get("operation_id")
            seller_id = payment.get("seller_id")
            amount = payment.get("amount")
            currency = payment.get("currency", "EUR")

            if not operation_id or not seller_id or not amount:
                logger.warning("Incomplete B2B payment record: %s", str(payment.get("_id")))
                failed += 1
                continue

            # Get seller's Stripe account
            seller = await db2.users.find_one({"user_id": seller_id})
            stripe_account = (seller or {}).get("stripe_account_id")

            if not stripe_account:
                logger.warning("No Stripe account for seller %s, skipping B2B payment", seller_id)
                failed += 1
                continue

            # Calculate platform fee (3%) using Decimal for precision
            from decimal import Decimal, ROUND_HALF_UP
            _q = Decimal("0.01")
            amt = Decimal(str(amount))
            platform_fee = (amt * Decimal("0.03")).quantize(_q, rounding=ROUND_HALF_UP)
            seller_amount = (amt - platform_fee).quantize(_q, rounding=ROUND_HALF_UP)

            # Create Stripe transfer with idempotency key to prevent double-pay on retry
            from core.config import STRIPE_SECRET_KEY
            stripe.api_key = STRIPE_SECRET_KEY

            transfer = stripe.Transfer.create(
                amount=int(round(seller_amount * 100)),
                currency=currency.lower(),
                destination=stripe_account,
                metadata={
                    "type": "b2b_scheduled",
                    "operation_id": operation_id,
                    "payment_id": str(payment["_id"]),
                },
                idempotency_key=f"b2b_sched_{operation_id}_{str(payment['_id'])}",
            )

            # Update payment record
            await db2.b2b_scheduled_payments.update_one(
                {"_id": payment["_id"]},
                {"$set": {
                    "status": "paid",
                    "stripe_transfer_id": transfer.id,
                    "paid_at": now.isoformat(),
                }},
            )

            # Update operation status
            try:
                oid = ObjectId(operation_id)
                await db2.b2b_operations.update_one(
                    {"_id": oid},
                    {"$set": {
                        "status": "completed",
                        "updated_at": now.isoformat(),
                    }},
                )
            except Exception as e:
                logger.warning("ObjectId conversion failed: %s", e)

            processed += 1
            logger.info("B2B scheduled payment processed: %s → %s (%.2f)", operation_id, seller_id, seller_amount)

        except Exception as exc:
            logger.error("Failed to process B2B scheduled payment %s: %s", str(payment["_id"]), exc)
            failed += 1

    return {
        "processed": processed,
        "failed": failed,
        "total_found": len(pending),
    }


# ── Quarterly Tax Report (Modelo 190) ────────────────────────────

@router.post("/admin/cron/generate-quarterly-tax-report")
async def cron_generate_quarterly_tax_report(user: User = Depends(get_current_user)):
    """
    Generate quarterly tax withholding report.
    Schedule: Q1→1 April, Q2→1 July, Q3→1 October, Q4→20 January.
    """
    await require_role(user, ["admin", "super_admin"])

    now = datetime.now(timezone.utc)
    month = now.month

    # Determine which quarter just ended
    if month in (1, 2, 3):
        quarter, year = 4, now.year - 1
    elif month in (4, 5, 6):
        quarter, year = 1, now.year
    elif month in (7, 8, 9):
        quarter, year = 2, now.year
    else:
        quarter, year = 3, now.year

    from services.modelo190_service import generate_quarterly_report
    result = await generate_quarterly_report(year, quarter)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate quarterly tax report")

    # Send email to superadmin
    try:
        superadmin = await db.users.find_one({"role": "super_admin"}, {"_id": 0, "email": 1, "name": 1})
        sa_email = (superadmin or {}).get("email")
        if sa_email:
            send_email(
                to=sa_email,
                subject=f"Informe de retenciones Q{quarter} {year} listo",
                html=f"""
                <h2>Informe Modelo 190 — Q{quarter} {year}</h2>
                <p>El informe de retenciones trimestral ha sido generado.</p>
                <ul>
                    <li>Perceptores: {result.get('perceptors_count', 0)}</li>
                    <li>Total retenido: {result.get('total_withheld', 0):.2f}€</li>
                    <li>Total bruto: {result.get('total_gross', 0):.2f}€</li>
                </ul>
                <p><a href="{result.get('pdf_url', '')}">Descargar PDF</a></p>
                """,
            )
    except Exception as e:
        logger.error(f"Failed to send tax report email: {e}")

    return {
        "quarter": quarter,
        "year": year,
        "pdf_url": result.get("pdf_url", ""),
        "total_withheld": result.get("total_withheld", 0),
        "perceptors_count": result.get("perceptors_count", 0),
    }


# ── Certificate Expiry Alerts (daily 09:00) ──────────────────────

CERT_EXPIRY_EMAIL_30 = """
<h2>Tu certificado caduca pronto</h2>
<p>Hola {name},</p>
<p>Tu certificado <strong>{cert_type}</strong> caduca el <strong>{expiry_date}</strong> ({days_left} días).</p>
<p>Renuévalo para mantener tu badge verificado y no interrumpir tus ventas.</p>
<p><a href="{frontend_url}/producer/verification">Renovar certificado</a></p>
"""

CERT_EXPIRY_EMAIL_7 = """
<h2>⚠️ Certificado a punto de caducar</h2>
<p>Hola {name},</p>
<p>Tu certificado <strong>{cert_type}</strong> caduca en <strong>{days_left} días</strong> ({expiry_date}).</p>
<p>Sube la renovación ahora para no interrumpir tus ventas.</p>
<p><a href="{frontend_url}/producer/verification">Renovar ahora</a></p>
"""

CERT_EXPIRED_EMAIL = """
<h2>Certificado caducado</h2>
<p>Hola {name},</p>
<p>Tu certificado <strong>{cert_type}</strong> ha caducado. Tus ventas pueden estar pausadas hasta que subas un certificado renovado.</p>
<p><a href="{frontend_url}/producer/verification">Renovar certificado</a></p>
"""


@router.post("/admin/cron/certificate-expiry-alerts")
async def cron_certificate_expiry_alerts(user: User = Depends(get_current_user)):
    """Daily: check for expiring/expired producer certificates and send alerts."""
    await require_role(user, ["admin", "super_admin"])

    from services.producer_verification import run_full_verification
    from routes.notifications import create_notification

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    day_7 = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    day_30 = (now + timedelta(days=30)).strftime("%Y-%m-%d")
    frontend = FRONTEND_URL

    # Find all producers with verified certificates that have expiry dates
    producers = await db.users.find(
        {
            "role": {"$in": ["producer", "importer"]},
            "verification_status.documents.certificates": {
                "$elemMatch": {
                    "status": {"$in": ["verified"]},
                    "expiry_date": {"$exists": True, "$ne": None},
                },
            },
        },
        {"_id": 0, "user_id": 1, "name": 1, "company_name": 1, "email": 1,
         "verification_status": 1},
    ).to_list(2000)

    alerts_30 = 0
    alerts_7 = 0
    expired_count = 0

    for producer in producers:
        vs = producer.get("verification_status", {})
        certs = vs.get("documents", {}).get("certificates", [])
        name = producer.get("company_name") or producer.get("name", "Productor")
        uid = producer.get("user_id")
        if not uid:
            continue
        email = producer.get("email")

        for i, cert in enumerate(certs):
            if cert.get("status") != "verified" or not cert.get("expiry_date"):
                continue

            expiry = cert["expiry_date"]  # YYYY-MM-DD string

            if expiry < today:
                # Certificate expired today — mark as expired
                await db.users.update_one(
                    {"user_id": uid},
                    {"$set": {
                        f"verification_status.documents.certificates.{i}.status": "expired",
                    }},
                )
                expired_count += 1

                # Re-run verification to check if seller should be blocked
                await run_full_verification(uid)

                try:
                    await create_notification(
                        user_id=uid,
                        title="Certificado caducado",
                        body=f"Tu certificado {cert.get('name', '')} ha caducado.",
                        notification_type="certificate_expiring",
                        action_url="/producer/verification",
                    )
                    if email:
                        send_email(
                            to=email,
                            subject="Certificado caducado — Hispaloshop",
                            html=CERT_EXPIRED_EMAIL.format(
                                name=_html.escape(str(name)),
                                cert_type=_html.escape(str(cert.get("name", cert.get("type", "")))),
                                frontend_url=_html.escape(frontend, quote=True),
                            ),
                        )
                except Exception as e:
                    logger.error("Expiry notification failed for %s: %s", uid, e)

            elif expiry <= day_7:
                # Expires in 7 days — urgent alert (dedup: one alert per cert per 3 days)
                days_left = max(1, (datetime.strptime(expiry, "%Y-%m-%d").date() - now.date()).days)
                recent_alert = await db.notifications.find_one({
                    "user_id": uid, "type": "certificate_expiring",
                    "created_at": {"$gte": (now - timedelta(days=3)).isoformat()},
                })
                if recent_alert:
                    continue
                alerts_7 += 1
                try:
                    await create_notification(
                        user_id=uid,
                        title=f"Certificado caduca en {days_left} días",
                        body=f"Tu certificado {cert.get('name', '')} caduca el {expiry}.",
                        notification_type="certificate_expiring",
                        action_url="/producer/verification",
                    )
                    if email:
                        send_email(
                            to=email,
                            subject=f"Tu certificado caduca en {days_left} días",
                            html=CERT_EXPIRY_EMAIL_7.format(
                                name=_html.escape(str(name)),
                                cert_type=_html.escape(str(cert.get("name", cert.get("type", "")))),
                                expiry_date=_html.escape(str(expiry)),
                                days_left=days_left,
                                frontend_url=_html.escape(frontend, quote=True),
                            ),
                        )
                except Exception as e:
                    logger.error("Expiry alert failed for %s: %s", uid, e)

            elif expiry <= day_30:
                # Expires in 30 days — standard alert (dedup: one alert per cert per 7 days)
                days_left = (datetime.strptime(expiry, "%Y-%m-%d").date() - now.date()).days
                recent_alert = await db.notifications.find_one({
                    "user_id": uid, "type": "certificate_expiring",
                    "created_at": {"$gte": (now - timedelta(days=7)).isoformat()},
                })
                if recent_alert:
                    continue
                alerts_30 += 1
                try:
                    await create_notification(
                        user_id=uid,
                        title=f"Certificado caduca en {days_left} días",
                        body=f"Renueva tu certificado {cert.get('name', '')} antes del {expiry}.",
                        notification_type="certificate_expiring",
                        action_url="/producer/verification",
                    )
                    if email:
                        send_email(
                            to=email,
                            subject=f"Tu certificado caduca en {days_left} días",
                            html=CERT_EXPIRY_EMAIL_30.format(
                                name=_html.escape(str(name)),
                                cert_type=_html.escape(str(cert.get("name", cert.get("type", "")))),
                                expiry_date=_html.escape(str(expiry)),
                                days_left=days_left,
                                frontend_url=_html.escape(frontend, quote=True),
                            ),
                        )
                except Exception as e:
                    logger.error("Expiry warning failed for %s: %s", uid, e)

    return {
        "checked": len(producers),
        "alerts_30_days": alerts_30,
        "alerts_7_days": alerts_7,
        "expired_today": expired_count,
    }


@router.post("/admin/cron/review-request-notifications")
async def cron_review_request_notifications(user: User = Depends(get_current_user)):
    """Daily: send review request 24h after delivery if no review exists."""
    await require_role(user, ["admin", "super_admin"])

    from routes.notifications import notify_order_event

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=48)
    window_end = now - timedelta(hours=24)

    # Orders delivered 24-48h ago
    delivered_orders = await db.orders.find({
        "status": "delivered",
        "delivered_at": {"$gte": window_start.isoformat(), "$lte": window_end.isoformat()},
    }, {"_id": 0, "order_id": 1, "user_id": 1}).to_list(500)

    sent = 0
    for order in delivered_orders:
        oid = order.get("order_id")
        uid = order.get("user_id")
        if not oid or not uid:
            continue

        # Check if a review already exists for this order
        existing_review = await db.reviews.find_one({"order_id": oid, "user_id": uid})
        if existing_review:
            continue

        # Check if we already sent this notification
        existing_notif = await db.notifications.find_one({
            "user_id": uid,
            "type": "order_review_request",
            "data.order_id": oid,
        })
        if existing_notif:
            continue

        try:
            await notify_order_event(oid, "order_review_request")
            sent += 1
        except Exception as e:
            logger.error(f"[CRON] Review request failed for order {oid}: {e}")

    return {"checked": len(delivered_orders), "sent": sent}


@router.post("/admin/cron/cleanup-expired-stories")
async def cron_cleanup_expired_stories(user: User = Depends(get_current_user)):
    """Daily: delete expired stories older than 48h and their related likes/replies.
    Stories expire after 24h but we keep them 48h for highlight creation."""
    await require_role(user, ["admin", "super_admin"])

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    expired = await db.hispalostories.find(
        {"expires_at": {"$lte": cutoff}},
        {"_id": 0, "story_id": 1},
    ).to_list(1000)

    if not expired:
        return {"stories_deleted": 0, "likes_deleted": 0, "replies_deleted": 0}

    expired_ids = [s["story_id"] for s in expired]

    likes_result = await db.story_likes.delete_many({"story_id": {"$in": expired_ids}})
    replies_result = await db.story_replies.delete_many({"story_id": {"$in": expired_ids}})
    stories_result = await db.hispalostories.delete_many({"story_id": {"$in": expired_ids}})

    return {
        "stories_deleted": stories_result.deleted_count,
        "likes_deleted": likes_result.deleted_count,
        "replies_deleted": replies_result.deleted_count,
    }




@router.post("/admin/cron/retry-failed-transfers")
async def cron_retry_failed_transfers(user: User = Depends(get_current_user)):
    """Daily: retry affiliate payout transfers that failed 3x, log results."""
    await require_role(user, ["admin", "super_admin"])

    from services.affiliate_service import process_affiliate_payout
    from database import AsyncSessionLocal
    from models import Payout
    from sqlalchemy import select as sa_select

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    retried = 0
    success = 0
    still_failed = 0

    # Collect failed payout IDs in a read session
    async with AsyncSessionLocal() as read_session:
        result = await read_session.execute(
            sa_select(Payout.id).where(
                Payout.status == "transfer_failed",
                Payout.failed_at >= cutoff,
            )
        )
        failed_ids = [row[0] for row in result.fetchall()]

    # Process each payout in its own session to isolate transactions
    for payout_id in failed_ids:
        async with AsyncSessionLocal() as session:
            try:
                ok = await process_affiliate_payout(session, payout_id)
                await session.commit()
                retried += 1
                if ok:
                    success += 1
                else:
                    still_failed += 1
            except Exception as e:
                await session.rollback()
                logger.error("[CRON] Retry failed for payout %s: %s", payout_id, e)
                still_failed += 1

    if still_failed > 0:
        try:
            superadmin = await db.users.find_one({"role": "super_admin"}, {"_id": 0, "email": 1})
            sa_email = (superadmin or {}).get("email")
            if sa_email:
                send_email(
                    to=sa_email,
                    subject=f"Retry transfers: {success}/{retried} exitosas, {still_failed} aun fallidas",
                    html=f"""
                    <p>Reintento automatico de transferencias fallidas completado:</p>
                    <ul>
                        <li>Reintentadas: {retried}</li>
                        <li>Exitosas: {success}</li>
                        <li>Aun fallidas: {still_failed}</li>
                    </ul>
                    <p><a href="/admin/payouts?status=transfer_failed">Ver pendientes</a></p>
                    """,
                )
        except Exception as e:
            logger.error("Failed to send retry summary email: %s", e)

    return {"retried": retried, "success": success, "still_failed": still_failed}


@router.post("/admin/cron/retry-failed-push-notifications")
async def cron_retry_failed_push_notifications(user: User = Depends(get_current_user)):
    """Daily: retry push notifications that failed in the last 7 days.
    Attempts FCM HTTP v1 first, then legacy fallback. Logs which version succeeded."""
    await require_role(user, ["admin", "super_admin"])

    from services.fcm_service import fcm_service_v1
    from services.fcm_legacy import fcm_legacy_service

    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    failed = await db.notifications.find({
        "status_by_channel.push": "failed",
        "created_at": {"$gte": cutoff},
    }).to_list(500)

    retried = 0
    success_v1 = 0
    success_legacy = 0
    still_failed = 0

    for notif in failed:
        user_id = notif.get("user_id")
        title = notif.get("title", "")
        body = notif.get("body", "")
        data = notif.get("data", {})

        prefs = await db.user_notification_preferences.find_one({"user_id": user_id})
        tokens = (prefs or {}).get("push_tokens", [])

        for token_data in tokens:
            token = token_data.get("token")
            if not token:
                continue

            retried += 1

            # Try FCM HTTP v1
            result_v1 = await fcm_service_v1.send_notification(
                token=token,
                title=title,
                body=body,
                data=data,
            )

            if result_v1["success"]:
                success_v1 += 1
                await db.notifications.update_one(
                    {"_id": notif["_id"]},
                    {"$set": {
                        "status_by_channel.push": "sent",
                        "fcm_retry_version": "v1",
                        "fcm_retry_at": datetime.now(timezone.utc),
                    }},
                )
                continue

            # v1 failed — try legacy
            result_legacy = await fcm_legacy_service.send_notification(
                token=token,
                title=title,
                body=body,
                data=data,
            )

            if result_legacy["success"]:
                success_legacy += 1
                await db.notifications.update_one(
                    {"_id": notif["_id"]},
                    {"$set": {
                        "status_by_channel.push": "sent",
                        "fcm_retry_version": "legacy",
                        "fcm_retry_at": datetime.now(timezone.utc),
                    }},
                )
            else:
                still_failed += 1
                logger.error(
                    "[CRON] Push retry failed for notification %s: %s",
                    notif["_id"],
                    result_legacy.get("error"),
                )

    return {
        "retried": retried,
        "success_v1": success_v1,
        "success_legacy": success_legacy,
        "still_failed": still_failed,
    }
