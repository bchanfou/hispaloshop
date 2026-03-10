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
    get_seller_commission_rate, get_influencer_commission_rate, ensure_stripe_products,
    calculate_order_commissions,
    recalculate_influencer_tier, GRACE_PERIOD_DAYS,
    list_subscription_plans, has_tier_access,
    calculate_dynamic_commission, get_user_subscription_doc,
    record_subscription_event, get_seller_plan_price, get_seller_plan_currency,
)
from config import INFLUENCER_TIER_ORDER, normalize_influencer_tier

logger = logging.getLogger(__name__)
router = APIRouter()

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')


def require_subscription(min_tier: str):
    async def checker(user: User = Depends(get_current_user)):
        subscription = await get_user_subscription_doc(db, user.user_id)
        current_tier = str(subscription.get("plan", "FREE")).lower()
        if not has_tier_access(current_tier, min_tier.lower()):
            raise HTTPException(status_code=403, detail=f"Requiere plan {min_tier} o superior")
        return user
    return checker


def _ensure_stripe_ready():
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe no esta configurado")


def _get_seller_success_route(user: User) -> str:
    return "/importer/dashboard" if str(user.role).lower() == "importer" else "/producer"


def _to_iso_from_unix(timestamp: int | None) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def _extract_payment_intent(subscription: dict):
    latest_invoice = subscription.get("latest_invoice")
    if hasattr(latest_invoice, "get"):
        return latest_invoice.get("payment_intent")
    return None


async def _persist_subscription_state(user: User, plan_key: str, subscription: dict, customer_id: str | None = None, plan_status: str | None = None):
    payload = {
        "subscription.plan": plan_key,
        "subscription.billing_cycle": "monthly",
        "subscription.commission_rate": get_seller_commission_rate(plan_key),
        "subscription.plan_status": plan_status or subscription.get("status", "active"),
        "subscription.stripe_subscription_id": subscription.get("id"),
        "subscription.current_period_start": _to_iso_from_unix(subscription.get("current_period_start")),
        "subscription.current_period_end": _to_iso_from_unix(subscription.get("current_period_end")),
        "subscription.cancel_at_period_end": bool(subscription.get("cancel_at_period_end", False)),
        "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if customer_id:
        payload["subscription.stripe_customer_id"] = customer_id

    await db.users.update_one({"user_id": user.user_id}, {"$set": payload})


@router.get("/subscriptions/plans")
async def get_subscription_plans(user_type: str | None = None):
    return {"plans": list_subscription_plans(user_type)}


@router.get("/subscriptions/me")
async def get_my_subscription(user: User = Depends(get_current_user)):
    subscription = await get_user_subscription_doc(db, user.user_id)
    return {
        "user_id": user.user_id,
        "status": subscription.get("plan_status", "inactive"),
        "plan": subscription.get("plan", "FREE"),
        "billing_cycle": subscription.get("billing_cycle", "monthly"),
        "current_period_start": subscription.get("current_period_start"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "trial_ends_at": subscription.get("trial_ends_at"),
    }


@router.post("/subscriptions/cancel")
async def cancel_subscription(user: User = Depends(get_current_user)):
    sub = await get_user_subscription_doc(db, user.user_id)
    if not sub:
        raise HTTPException(status_code=404, detail="No tienes una suscripcion activa")

    stripe_sub_id = sub.get("stripe_subscription_id")
    if stripe_sub_id:
        stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"subscription.cancel_at_period_end": True, "subscription.plan_status": "canceled"}}
    )
    await record_subscription_event(db, user.user_id, "canceled", {"plan": sub.get("plan", "FREE")})
    return {"message": "Suscripcion marcada para cancelar al final del periodo"}


@router.post("/subscriptions/reactivate")
async def reactivate_subscription(user: User = Depends(get_current_user)):
    sub = await get_user_subscription_doc(db, user.user_id)
    stripe_sub_id = sub.get("stripe_subscription_id")
    if not stripe_sub_id:
        raise HTTPException(status_code=400, detail="No hay suscripcion Stripe para reactivar")

    stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=False)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"subscription.cancel_at_period_end": False, "subscription.plan_status": "active"}}
    )
    await record_subscription_event(db, user.user_id, "reactivated", {"stripe_subscription_id": stripe_sub_id})
    return {"message": "Suscripcion reactivada"}


@router.get("/hi-ai/advanced-analytics")
async def hi_ai_advanced_analytics(user: User = Depends(require_subscription("pro"))):
    return {
        "enabled": True,
        "message": "Acceso concedido a analytics avanzados",
        "user_id": user.user_id,
    }


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
                "currency": "EUR",
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
                "price": 79,
                "price_with_vat": 95.59,
                "currency": "EUR",
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
                "price": 149,
                "price_with_vat": 180.29,
                "currency": "EUR",
                "commission": "17%",
                "features": [
                    "Todo de Pro +",
                    "Comision 17%",
                    "Prioridad en homepage",
                    "Matching con influencers Zeus",
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
    await require_role(user, ["producer", "importer"])
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
    await require_role(user, ["producer", "importer"])
    _ensure_stripe_ready()
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
    success_route = _get_seller_success_route(user)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
        subscription_data={"trial_period_days": 30, "metadata": {"user_id": user.user_id, "plan": plan_key}},
        success_url=f"{origin}{success_route}?subscription=success",
        cancel_url=f"{origin}{success_route}?subscription=cancel",
        metadata={"user_id": user.user_id, "plan": plan_key},
    )

    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/sellers/me/plan/subscribe-inline")
async def create_inline_subscription(request: Request, user: User = Depends(get_current_user)):
    """Create a seller subscription without redirecting to Stripe Checkout."""
    await require_role(user, ["producer", "importer"])
    _ensure_stripe_ready()
    body = await request.json()
    plan_key = str(body.get("plan", "")).upper()
    payment_method_id = body.get("payment_method_id")
    billing_name = body.get("billing_name") or user.name
    billing_email = body.get("billing_email") or user.email
    billing_phone = body.get("billing_phone")

    if plan_key not in SELLER_PLANS or plan_key == "FREE":
        raise HTTPException(status_code=400, detail="Plan invalido. Usa PRO o ELITE.")
    if not payment_method_id:
        raise HTTPException(status_code=400, detail="Falta el metodo de pago")

    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "subscription": 1, "email": 1, "name": 1}
    ) or {}
    subscription_doc = user_doc.get("subscription", {})
    customer_id = subscription_doc.get("stripe_customer_id")

    if not customer_id:
        customer = stripe.Customer.create(
            email=billing_email,
            name=billing_name,
            phone=billing_phone,
            metadata={"user_id": user.user_id, "role": user.role},
        )
        customer_id = customer.id

    try:
        stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
    except stripe.error.InvalidRequestError as exc:
        message = str(exc).lower()
        if "already been attached" not in message and "already attached" not in message:
            raise HTTPException(status_code=400, detail=exc.user_message or "No se pudo adjuntar la tarjeta.") from exc

    stripe.Customer.modify(
        customer_id,
        name=billing_name,
        email=billing_email,
        phone=billing_phone,
        invoice_settings={"default_payment_method": payment_method_id},
        metadata={"user_id": user.user_id, "role": user.role},
    )

    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{
                "price_data": {
                    "currency": get_seller_plan_currency(plan_key),
                    "unit_amount": int(round(get_seller_plan_price(plan_key) * 100)),
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": f"Hispaloshop {str(user.role).capitalize()} {plan_key}",
                        "metadata": {"user_id": user.user_id, "plan": plan_key},
                    },
                }
            }],
            default_payment_method=payment_method_id,
            payment_behavior="default_incomplete",
            payment_settings={
                "payment_method_types": ["card"],
                "save_default_payment_method": "on_subscription",
            },
            metadata={"user_id": user.user_id, "plan": plan_key, "role": user.role},
            expand=["latest_invoice.payment_intent"],
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=400, detail=exc.user_message or "No se pudo crear la suscripcion en Stripe.") from exc

    payment_intent = _extract_payment_intent(subscription)
    payment_status = payment_intent.get("status") if payment_intent else None

    if payment_status in {"requires_payment_method", "canceled"}:
        last_error = None
        if hasattr(payment_intent, "get"):
            last_error = (payment_intent.get("last_payment_error") or {}).get("message")
        raise HTTPException(status_code=400, detail=last_error or "Stripe rechazo el pago. Revisa la tarjeta e intentalo otra vez.")

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "subscription.plan": plan_key,
            "subscription.billing_cycle": "monthly",
            "subscription.commission_rate": get_seller_commission_rate(plan_key),
            "subscription.plan_status": "pending_payment" if payment_status in {"requires_action", "requires_confirmation"} else subscription.get("status", "active"),
            "subscription.stripe_customer_id": customer_id,
            "subscription.stripe_subscription_id": subscription.get("id"),
            "subscription.updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    if payment_status in {"requires_action", "requires_confirmation"}:
        return {
            "requires_action": True,
            "subscription_id": subscription.get("id"),
            "client_secret": payment_intent.get("client_secret"),
        }

    await _persist_subscription_state(user, plan_key, subscription, customer_id=customer_id)
    await record_subscription_event(db, user.user_id, "inline_subscription_created", {"plan": plan_key, "subscription_id": subscription.get("id")})
    return {
        "success": True,
        "subscription_id": subscription.get("id"),
        "plan": plan_key,
        "status": subscription.get("status", "active"),
    }


@router.post("/sellers/me/plan/subscribe-inline/confirm")
async def confirm_inline_subscription(request: Request, user: User = Depends(get_current_user)):
    """Finalize seller subscription after Stripe SCA confirmation."""
    await require_role(user, ["producer", "importer"])
    _ensure_stripe_ready()
    body = await request.json()
    subscription_id = body.get("subscription_id")
    plan_key = str(body.get("plan", "")).upper()

    if not subscription_id or plan_key not in SELLER_PLANS or plan_key == "FREE":
        raise HTTPException(status_code=400, detail="Datos de confirmacion invalidos")

    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "subscription": 1}) or {}
    customer_id = user_doc.get("subscription", {}).get("stripe_customer_id")

    try:
        subscription = stripe.Subscription.retrieve(subscription_id, expand=["latest_invoice.payment_intent"])
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=400, detail=exc.user_message or "No se pudo recuperar la suscripcion.") from exc

    if customer_id and str(subscription.get("customer")) != str(customer_id):
        raise HTTPException(status_code=403, detail="La suscripcion no pertenece al usuario actual")

    payment_intent = _extract_payment_intent(subscription)
    payment_status = payment_intent.get("status") if payment_intent else None
    subscription_status = subscription.get("status")

    if payment_status not in {"succeeded", "processing"} and subscription_status not in {"active", "trialing"}:
        raise HTTPException(status_code=400, detail="El pago todavia no esta confirmado")

    await _persist_subscription_state(user, plan_key, subscription, customer_id=customer_id)
    await record_subscription_event(db, user.user_id, "inline_subscription_confirmed", {"plan": plan_key, "subscription_id": subscription_id})
    return {
        "success": True,
        "plan": plan_key,
        "status": subscription_status or payment_status or "active",
    }


@router.post("/sellers/me/plan/change")
async def change_plan(request: Request, user: User = Depends(get_current_user)):
    """Change seller plan (upgrade/downgrade)."""
    await require_role(user, ["producer", "importer"])
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
            _ensure_stripe_ready()
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

    if not stripe_sub_id:
        raise HTTPException(status_code=400, detail="No hay una suscripcion Stripe activa para cambiar de plan")

    # Upgrade/change paid plan
    if stripe_sub_id:
        _ensure_stripe_ready()
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

    if event_type in ("invoice.paid", "invoice.payment_succeeded"):
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
                await record_subscription_event(db, user_id, "payment_succeeded", {"plan": plan, "subscription_id": sub_id})

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
                await record_subscription_event(db, user_id, "payment_failed", {"subscription_id": sub_id, "grace_period_ends_at": grace_end})

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        sub_id = data.get("id")
        user_id = data.get("metadata", {}).get("user_id")
        status = data.get("status")
        if user_id and status in ("canceled", "unpaid"):
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
            await record_subscription_event(db, user_id, "downgraded", {"to": "FREE", "subscription_id": sub_id})

    return {"status": "ok"}


# ── Influencer tier endpoints ─────────────────────────────────

@router.get("/influencers/tiers")
async def get_influencer_tiers():
    """Public: get influencer tier info."""
    return {
        "tiers": [
            {
                "key": tier,
                "label": INFLUENCER_TIERS[tier]["name"],
                "commission": f"{int(INFLUENCER_TIERS[tier]['commission_rate'] * 100)}%",
                "min_gmv_cents": INFLUENCER_TIERS[tier]["min_gmv_cents"],
                "min_followers": INFLUENCER_TIERS[tier].get("min_followers", 0),
            }
            for tier in INFLUENCER_TIER_ORDER
        ],
        "attribution_months": 18,
        "payout_delay_days": 15,
        "min_payout_eur": 50,
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

    current_tier = normalize_influencer_tier(inf.get("current_tier", "hercules"), inf.get("commission_rate"))
    metrics = inf.get("monthly_metrics") or inf.get("last_90_days_metrics", {})

    # Calculate progress to next tier
    progress = {}
    current_idx = INFLUENCER_TIER_ORDER.index(current_tier)
    if current_idx < len(INFLUENCER_TIER_ORDER) - 1:
        next_tier_key = INFLUENCER_TIER_ORDER[current_idx + 1]
        next_reqs = INFLUENCER_TIERS[next_tier_key]
        progress = {
            "next_tier": next_tier_key,
            "gmv": {"current": metrics.get("net_gmv_cents", int(round(metrics.get("net_gmv", 0) * 100))), "needed": next_reqs["min_gmv_cents"]},
            "followers": {"current": metrics.get("followers_count", inf.get("followers_count", 0)), "needed": next_reqs.get("min_followers", 0)},
        }

    return {
        "current_tier": current_tier,
        "commission_rate": get_influencer_commission_rate(current_tier),
        "metrics": metrics,
        "progress": progress,
        "next_review_date": inf.get("next_tier_review_date"),
        "total_earnings": inf.get("total_earnings_lifetime", 0),
        "pending_payout": inf.get("pending_payout_usd", 0),
    }


@router.post('/subscriptions/upgrade')
async def upgrade_subscription(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    new_plan = str(body.get('plan', 'PRO')).upper()
    billing_cycle = str(body.get('billing_cycle', 'monthly')).lower()
    if new_plan not in SELLER_PLANS or new_plan == 'FREE':
        raise HTTPException(status_code=400, detail='Plan invalido. Usa PRO o ELITE.')

    user_doc = await db.users.find_one({'user_id': user.user_id}, {'_id': 0, 'subscription': 1}) or {}
    sub = user_doc.get('subscription', {})
    current_plan = sub.get('plan', 'FREE')

    await db.users.update_one(
        {'user_id': user.user_id},
        {'$set': {
            'subscription.plan': new_plan,
            'subscription.plan_status': 'active',
            'subscription.billing_cycle': billing_cycle,
            'subscription.commission_rate': get_seller_commission_rate(new_plan),
            'subscription.current_period_start': datetime.now(timezone.utc).isoformat(),
            'subscription.current_period_end': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            'subscription.cancel_at_period_end': False,
        }}
    )
    await record_subscription_event(db, user.user_id, 'upgraded', {'from': current_plan, 'to': new_plan, 'billing_cycle': billing_cycle})
    return {'message': f'Plan actualizado a {new_plan}', 'old_plan': current_plan, 'new_plan': new_plan}



@router.get('/admin/finance/commissions')
async def admin_commission_audit(user: User = Depends(get_current_user)):
    await require_role(user, ['admin'])
    logs = await db.commission_overrides.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return {'items': logs}


@router.get('/admin/finance/payouts')
async def admin_pending_payouts(user: User = Depends(get_current_user)):
    await require_role(user, ['admin'])
    pending = await db.payouts.find({'status': 'pending'}, {'_id': 0}).to_list(500)
    total = round(sum(p.get('amount', 0) for p in pending), 2)
    return {'total_pending': total, 'count': len(pending), 'items': pending}


@router.post('/admin/finance/payouts/batch')
async def admin_process_payout_batch(request: Request, user: User = Depends(get_current_user)):
    await require_role(user, ['admin'])
    payload = await request.json()
    payout_ids = payload.get('payout_ids', [])
    if not isinstance(payout_ids, list) or not payout_ids:
        raise HTTPException(status_code=400, detail='payout_ids requerido')

    result = await db.payouts.update_many(
        {'payout_id': {'$in': payout_ids}, 'status': 'pending'},
        {'$set': {'status': 'processing', 'processed_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'message': 'Batch procesado', 'updated': result.modified_count}


@router.get('/admin/finance/dashboard')
async def admin_finance_dashboard(user: User = Depends(get_current_user)):
    await require_role(user, ['admin'])
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    monthly_orders = await db.orders.find({'created_at': {'$gte': month_start}}, {'_id': 0, 'total_amount': 1, 'commission_snapshot': 1}).to_list(10000)
    gmv_month = round(sum(o.get('total_amount', 0) for o in monthly_orders), 2)
    commission_net = round(sum((o.get('commission_snapshot') or {}).get('platform_fee', 0) for o in monthly_orders), 2)

    active_subscriptions = await db.users.count_documents({'subscription.plan_status': 'active'})
    pro_subscriptions = await db.users.count_documents({'subscription.plan': 'PRO', 'subscription.plan_status': 'active'})
    elite_subscriptions = await db.users.count_documents({'subscription.plan': 'ELITE', 'subscription.plan_status': 'active'})
    free_subscriptions = await db.users.count_documents({'$or': [{'subscription.plan': 'FREE'}, {'subscription': {'$exists': False}}]})

    return {
        'generated_at': now.isoformat(),
        'kpis': {
            'gmv_month': gmv_month,
            'commission_net_month': commission_net,
            'subscriptions_active': active_subscriptions,
            'subscriptions_free': free_subscriptions,
            'subscriptions_pro': pro_subscriptions,
            'subscriptions_elite': elite_subscriptions,
        }
    }


@router.post('/commissions/calculate')
async def calculate_commission_preview(request: Request, user: User = Depends(get_current_user)):
    await require_role(user, ['admin', 'producer', 'importer'])
    payload = await request.json()
    order_total = float(payload.get('order_total', 0))
    base_rate = float(payload.get('base_rate', 0.2))
    monthly_gmv = float(payload.get('monthly_gmv', 0))
    return_rate_30d = float(payload.get('return_rate_30d', 0.05))
    used_hi_ai = bool(payload.get('used_hi_ai_this_month', False))

    if order_total <= 0:
        raise HTTPException(status_code=400, detail='order_total invalido')

    breakdown = calculate_dynamic_commission(base_rate, order_total, monthly_gmv, return_rate_30d, used_hi_ai)
    return {'commission_snapshot': breakdown}
