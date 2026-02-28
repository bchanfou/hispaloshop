"""
Subscription & billing routes for sellers.
Stripe Billing integration for plan management.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import stripe
import os
import logging

from core.database import db
from core.models import User
from core.auth import get_current_user, require_role

from services.subscriptions import (
    SELLER_PLANS, INFLUENCER_TIERS, STRIPE_PUBLISHABLE_KEY,
    get_seller_commission_rate, ensure_stripe_products,
    calculate_order_commissions, check_influencer_attribution,
    recalculate_influencer_tier, GRACE_PERIOD_DAYS,
)

logger = logging.getLogger(__name__)
router = APIRouter()

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')


# ── Seller plan endpoints ─────────────────────────────────────

@router.get("/sellers/plans")
async def get_seller_plans():
    """Public: get available seller plans with features."""
    return {
        "plans": [
            {
                "key": "FREE",
                "label": "Free",
                "price": 0,
                "currency": "USD",
                "commission": "20%",
                "features": [
                    "Publicar productos",
                    "Dashboard basico",
                    "Soporte email (24-48h)",
                ],
            },
            {
                "key": "PRO",
                "label": "Pro",
                "price": 54,
                "currency": "USD",
                "commission": "18%",
                "recommended": True,
                "features": [
                    "Todo de Free +",
                    "Comision reducida 18%",
                    "Analytics avanzadas por pais y ciudad",
                    "IA: precios dinamicos y tendencias",
                    "Matching con influencers",
                    "SEO interno boost",
                    "Metricas de recompra",
                    "Soporte prioritario (4-8h)",
                ],
            },
            {
                "key": "ELITE",
                "label": "Elite",
                "price": 108,
                "currency": "USD",
                "commission": "16%",
                "features": [
                    "Todo de Pro +",
                    "Comision 16%",
                    "Prioridad en homepage",
                    "Matching con influencers TITAN",
                    "IA avanzada: forecast + bundles",
                    "Campanas patrocinadas internas",
                    "Account Manager dedicado",
                    "Badge Elite Seller",
                ],
            },
        ],
        "stripe_publishable_key": STRIPE_PUBLISHABLE_KEY,
    }


@router.get("/sellers/me/plan")
async def get_my_plan(user: User = Depends(get_current_user)):
    """Get current seller's subscription details."""
    await require_role(user, ["producer"])
    sub = (await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1})) or {}
    subscription = sub.get("subscription", {})

    return {
        "plan": subscription.get("plan", "FREE"),
        "commission_rate": subscription.get("commission_rate", 0.20),
        "plan_status": subscription.get("plan_status", "active"),
        "trial_ends_at": subscription.get("trial_ends_at"),
        "current_period_end": subscription.get("current_period_end"),
        "grace_period_ends_at": subscription.get("grace_period_ends_at"),
        "stripe_subscription_id": subscription.get("stripe_subscription_id"),
    }


@router.post("/sellers/me/plan/subscribe")
async def create_subscription(request: Request, user: User = Depends(get_current_user)):
    """Create a Stripe Checkout session for plan subscription."""
    await require_role(user, ["producer"])
    body = await request.json()
    plan_key = body.get("plan", "PRO").upper()

    if plan_key not in SELLER_PLANS or plan_key == "FREE":
        raise HTTPException(status_code=400, detail="Plan invalido. Usa PRO o ELITE.")

    plan = SELLER_PLANS[plan_key]
    if not plan.get("stripe_price_id"):
        await ensure_stripe_products(db)
        plan = SELLER_PLANS[plan_key]
    if not plan.get("stripe_price_id"):
        raise HTTPException(status_code=500, detail="Stripe not configured for this plan")

    # Get or create Stripe customer
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1, "email": 1})
    customer_id = (user_doc or {}).get("subscription", {}).get("stripe_customer_id")

    if not customer_id:
        customer = stripe.Customer.create(email=user.email, metadata={"user_id": user.user_id})
        customer_id = customer.id
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"subscription.stripe_customer_id": customer_id}}
        )

    origin = request.headers.get("origin", "https://www.hispaloshop.com")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
        subscription_data={"trial_period_days": 30, "metadata": {"user_id": user.user_id, "plan": plan_key}},
        success_url=f"{origin}/producer?subscription=success",
        cancel_url=f"{origin}/producer?subscription=cancel",
        metadata={"user_id": user.user_id, "plan": plan_key},
    )

    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/sellers/me/plan/change")
async def change_plan(request: Request, user: User = Depends(get_current_user)):
    """Change seller plan (upgrade/downgrade)."""
    await require_role(user, ["producer"])
    body = await request.json()
    new_plan = body.get("plan", "").upper()

    if new_plan not in SELLER_PLANS:
        raise HTTPException(status_code=400, detail="Plan invalido")

    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1})
    current_sub = (user_doc or {}).get("subscription", {})
    current_plan = current_sub.get("plan", "FREE")
    stripe_sub_id = current_sub.get("stripe_subscription_id")

    if new_plan == current_plan:
        raise HTTPException(status_code=400, detail="Ya estas en este plan")

    # Downgrade to FREE
    if new_plan == "FREE":
        if stripe_sub_id:
            try:
                stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)
            except Exception as e:
                logger.error(f"Stripe cancel error: {e}")
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "subscription.plan": "FREE",
                "subscription.commission_rate": 0.20,
                "subscription.plan_status": "canceled",
            }}
        )
        return {"message": "Plan cambiado a FREE al final del periodo actual"}

    # Upgrade/change paid plan
    if stripe_sub_id:
        try:
            sub = stripe.Subscription.retrieve(stripe_sub_id)
            plan = SELLER_PLANS[new_plan]
            if not plan.get("stripe_price_id"):
                await ensure_stripe_products(db)
                plan = SELLER_PLANS[new_plan]
            stripe.Subscription.modify(
                stripe_sub_id,
                items=[{"id": sub["items"]["data"][0].id, "price": plan["stripe_price_id"]}],
                proration_behavior="create_prorations",
                metadata={"plan": new_plan},
            )
        except Exception as e:
            logger.error(f"Stripe plan change error: {e}")
            raise HTTPException(status_code=500, detail="Error al cambiar plan en Stripe")

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "subscription.plan": new_plan,
            "subscription.commission_rate": get_seller_commission_rate(new_plan),
            "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": f"Plan actualizado a {new_plan}", "commission_rate": get_seller_commission_rate(new_plan)}


# ── Stripe webhook for subscriptions ──────────────────────────

@router.post("/webhooks/stripe-billing")
async def stripe_billing_webhook(request: Request):
    """Handle Stripe subscription webhooks."""
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")

    webhook_secret = os.environ.get("STRIPE_BILLING_WEBHOOK_SECRET")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, sig, webhook_secret)
        else:
            import json
            event = json.loads(body)
    except Exception as e:
        logger.error(f"[BILLING WEBHOOK] Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})
    logger.info(f"[BILLING WEBHOOK] {event_type}")

    if event_type == "invoice.paid":
        sub_id = data.get("subscription")
        if sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            user_id = sub.get("metadata", {}).get("user_id")
            plan = sub.get("metadata", {}).get("plan", "PRO")
            if user_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "subscription.plan": plan,
                        "subscription.commission_rate": get_seller_commission_rate(plan),
                        "subscription.plan_status": "active",
                        "subscription.stripe_subscription_id": sub_id,
                        "subscription.current_period_end": datetime.fromtimestamp(sub.get("current_period_end", 0), tz=timezone.utc).isoformat(),
                        "subscription.grace_period_ends_at": None,
                        "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logger.info(f"[BILLING] Seller {user_id} activated plan {plan}")

    elif event_type == "invoice.payment_failed":
        sub_id = data.get("subscription")
        if sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            user_id = sub.get("metadata", {}).get("user_id")
            if user_id:
                grace_end = (datetime.now(timezone.utc) + timedelta(days=GRACE_PERIOD_DAYS)).isoformat()
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "subscription.plan_status": "past_due",
                        "subscription.grace_period_ends_at": grace_end,
                        "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logger.warning(f"[BILLING] Payment failed for {user_id}, grace until {grace_end}")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        sub_id = data.get("id")
        user_id = data.get("metadata", {}).get("user_id")
        status = data.get("status")
        if user_id and status == "canceled":
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "subscription.plan": "FREE",
                    "subscription.commission_rate": 0.20,
                    "subscription.plan_status": "canceled",
                    "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.info(f"[BILLING] Seller {user_id} downgraded to FREE")

    return {"status": "ok"}


# ── Influencer tier endpoints ─────────────────────────────────

@router.get("/influencers/tiers")
async def get_influencer_tiers():
    """Public: get influencer tier info."""
    return {
        "tiers": [
            {"key": "HERCULES", "label": "Hercules", "commission": "3%", "desc": "Para influencers en crecimiento"},
            {"key": "ATENEA", "label": "Atenea", "commission": "5%", "desc": "Para influencers establecidos"},
            {"key": "TITAN", "label": "Titan", "commission": "7%", "desc": "Para top performers"},
        ],
        "attribution_months": 18,
        "payout_delay_days": 15,
        "min_payout_usd": 50,
    }


@router.get("/influencers/me/tier")
async def get_my_tier(user: User = Depends(get_current_user)):
    """Get influencer's tier, metrics, and progress toward next tier."""
    inf = await db.influencers.find_one(
        {"$or": [{"user_id": user.user_id}, {"email": user.email.lower()}]},
        {"_id": 0}
    )
    if not inf:
        raise HTTPException(status_code=404, detail="No eres influencer registrado")

    current_tier = inf.get("current_tier", "HERCULES")
    metrics = inf.get("last_90_days_metrics", {})

    # Calculate progress to next tier
    next_tier = None
    progress = {}
    tier_order = ["HERCULES", "ATENEA", "TITAN"]
    current_idx = tier_order.index(current_tier) if current_tier in tier_order else 0
    if current_idx < len(tier_order) - 1:
        next_tier_key = tier_order[current_idx + 1]
        next_reqs = INFLUENCER_TIERS[next_tier_key]
        progress = {
            "next_tier": next_tier_key,
            "customers": {"current": metrics.get("unique_customers", 0), "needed": next_reqs["min_customers"]},
            "gmv": {"current": metrics.get("net_gmv", 0), "needed": next_reqs["min_gmv"]},
            "repurchase": {"current": round(metrics.get("repurchase_rate", 0) * 100, 1), "needed": round(next_reqs["min_repurchase"] * 100, 1)},
        }

    return {
        "current_tier": current_tier,
        "commission_rate": inf.get("commission_rate", 0.03),
        "metrics": metrics,
        "progress": progress,
        "next_review_date": inf.get("next_tier_review_date"),
        "total_earnings": inf.get("total_earnings_lifetime", 0),
        "pending_payout": inf.get("pending_payout_usd", 0),
    }
