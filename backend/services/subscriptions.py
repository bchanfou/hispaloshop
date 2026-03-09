"""
Seller Subscription + Influencer Tier + Commission Engine.
Stripe Billing for subscriptions, Connect for payouts.
"""
import os
import stripe
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from core.monetization import calculate_order_split, cents_to_float
from config import INFLUENCER_TIER_CONFIG, INFLUENCER_TIER_ORDER, normalize_influencer_tier

logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')

# ── Plan definitions ──────────────────────────────────────────

SELLER_PLANS = {
    "FREE":  {"price_monthly_usd": 0,   "commission_rate": 0.20, "label": "Free",  "stripe_price_id": None},
    "PRO":   {"price_monthly_usd": 54,  "commission_rate": 0.18, "label": "Pro",   "stripe_price_id": None},
    "ELITE": {"price_monthly_usd": 108, "commission_rate": 0.17, "label": "Elite", "stripe_price_id": None},
}

INFLUENCER_TIERS = {
    tier: {
        "commission_rate": cfg["commission_rate"],
        "commission_bps": cfg["commission_bps"],
        "name": cfg["name"],
        "min_gmv": cfg["min_gmv_cents"] / 100,
        "min_gmv_cents": cfg["min_gmv_cents"],
        "min_followers": cfg.get("min_followers", 0),
    }
    for tier, cfg in INFLUENCER_TIER_CONFIG.items()
}

ATTRIBUTION_LOCK_MONTHS = 18
INFLUENCER_PAYOUT_DELAY_DAYS = 15
INFLUENCER_MIN_PAYOUT_USD = 50
GRACE_PERIOD_DAYS = 3

SUBSCRIPTION_TIER_ORDER = {"free": 0, "pro": 1, "elite": 2}


SUBSCRIPTION_PLAN_CATALOG = [
    {
        "name": "consumer_free",
        "display_name": "Consumer Free",
        "tier": "free",
        "user_type": "consumer",
        "price_monthly": 0,
        "price_yearly": 0,
        "commission_rate": None,
        "features": ["basic_feed", "standard_checkout"],
        "limits": {"hi_ai_queries": 5},
    },
    {
        "name": "consumer_pro",
        "display_name": "Consumer PRO",
        "tier": "pro",
        "user_type": "consumer",
        "price_monthly": 9.99,
        "price_yearly": 95.90,
        "commission_rate": None,
        "features": ["hi_ai_unlimited", "priority_support", "free_shipping_25"],
        "limits": {"hi_ai_queries": -1},
    },
    {
        "name": "producer_free",
        "display_name": "Producer Free",
        "tier": "free",
        "user_type": "producer",
        "price_monthly": 0,
        "price_yearly": 0,
        "commission_rate": 0.20,
        "features": ["basic_listing", "email_support"],
        "limits": {"products": 10},
    },
    {
        "name": "producer_pro",
        "display_name": "Producer PRO",
        "tier": "pro",
        "user_type": "producer",
        "price_monthly": 9.99,
        "price_yearly": 95.90,
        "commission_rate": 0.18,
        "features": ["advanced_analytics", "hi_ai_price_optimization", "pro_badge"],
        "limits": {"products": -1},
    },
    {
        "name": "producer_elite",
        "display_name": "Producer ELITE",
        "tier": "elite",
        "user_type": "producer",
        "price_monthly": 29.99,
        "price_yearly": 287.90,
        "commission_rate": 0.17,
        "features": ["advanced_analytics", "hi_ai_price_optimization", "api_access", "dedicated_manager"],
        "limits": {"products": -1},
    },
    {
        "name": "importer_pro",
        "display_name": "Importer PRO",
        "tier": "pro",
        "user_type": "importer",
        "price_monthly": 9.99,
        "price_yearly": 95.90,
        "commission_rate": 0.18,
        "features": ["advanced_analytics", "priority_support", "hi_ai_price_optimization"],
        "limits": {"products": -1},
    },
    {
        "name": "importer_elite",
        "display_name": "Importer ELITE",
        "tier": "elite",
        "user_type": "importer",
        "price_monthly": 29.99,
        "price_yearly": 287.90,
        "commission_rate": 0.17,
        "features": ["advanced_analytics", "api_access", "dedicated_manager"],
        "limits": {"products": -1},
    },
]


def list_subscription_plans(user_type: Optional[str] = None) -> List[Dict[str, Any]]:
    plans = SUBSCRIPTION_PLAN_CATALOG
    if user_type:
        plans = [p for p in plans if p["user_type"] == user_type]
    return plans


def has_tier_access(current_tier: str, min_tier: str) -> bool:
    return SUBSCRIPTION_TIER_ORDER.get(current_tier, 0) >= SUBSCRIPTION_TIER_ORDER.get(min_tier, 10)


@dataclass
class CommissionModifier:
    type: str
    description: str
    delta: float


def calculate_dynamic_commission(
    base_rate: float,
    order_total: float,
    monthly_gmv: float,
    return_rate_30d: float,
    used_hi_ai_this_month: bool,
) -> Dict[str, Any]:
    modifiers: List[CommissionModifier] = []

    if monthly_gmv > 50000:
        modifiers.append(CommissionModifier(type="volume_bonus", description="Alto volumen mensual", delta=-0.005))
    if return_rate_30d < 0.02:
        modifiers.append(CommissionModifier(type="quality_bonus", description="Calidad premium", delta=-0.003))
    if used_hi_ai_this_month:
        modifiers.append(CommissionModifier(type="ai_adoption", description="Adopcion de HI AI", delta=-0.002))

    final_rate = max(base_rate + sum(m.delta for m in modifiers), 0.10)
    platform_fee = round(order_total * final_rate, 2)
    seller_amount = round(order_total - platform_fee, 2)
    return {
        "base_rate": base_rate,
        "final_rate": round(final_rate, 4),
        "modifiers": [m.__dict__ for m in modifiers],
        "platform_fee": platform_fee,
        "seller_amount": seller_amount,
        "applied_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_user_subscription_doc(db, user_id: str) -> Dict[str, Any]:
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "subscription": 1}) or {}
    return user_doc.get("subscription", {})


async def record_subscription_event(db, user_id: str, event_type: str, metadata: Optional[Dict[str, Any]] = None):
    await db.subscription_events.insert_one({
        "event_id": f"se_{datetime.now(timezone.utc).timestamp()}",
        "user_id": user_id,
        "event_type": event_type,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def ensure_stripe_products(db):
    """Create Stripe products/prices for seller subscriptions if they don't exist."""
    config = await db.stripe_config.find_one({"config_id": "subscription_products"})
    if config and config.get("initialized"):
        # Load saved price IDs
        for plan_key, price_id in config.get("price_ids", {}).items():
            if plan_key in SELLER_PLANS:
                SELLER_PLANS[plan_key]["stripe_price_id"] = price_id
        logger.info(f"[SUBSCRIPTIONS] Loaded existing Stripe price IDs")
        return

    try:
        product = stripe.Product.create(
            name="Hispaloshop Seller Plan",
            description="Monthly seller subscription for Hispaloshop marketplace",
        )
        logger.info(f"[SUBSCRIPTIONS] Created Stripe product: {product.id}")

        price_ids = {}
        for plan_key, plan in SELLER_PLANS.items():
            if plan["price_monthly_usd"] == 0:
                continue
            price = stripe.Price.create(
                product=product.id,
                unit_amount=int(plan["price_monthly_usd"] * 100),
                currency="usd",
                recurring={"interval": "month"},
                metadata={"plan": plan_key},
            )
            SELLER_PLANS[plan_key]["stripe_price_id"] = price.id
            price_ids[plan_key] = price.id
            logger.info(f"[SUBSCRIPTIONS] Created price for {plan_key}: {price.id}")

        await db.stripe_config.update_one(
            {"config_id": "subscription_products"},
            {"$set": {
                "config_id": "subscription_products",
                "product_id": product.id,
                "price_ids": price_ids,
                "initialized": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )
    except Exception as e:
        logger.error(f"[SUBSCRIPTIONS] Failed to create Stripe products: {e}")


def get_seller_commission_rate(plan: str) -> float:
    """Get commission rate for a seller plan."""
    return SELLER_PLANS.get(plan, SELLER_PLANS["FREE"])["commission_rate"]


def get_influencer_commission_rate(tier: str) -> float:
    """Get commission rate for an influencer tier."""
    normalized = normalize_influencer_tier(tier)
    return INFLUENCER_TIERS[normalized]["commission_rate"]


async def calculate_order_commissions(db, order: dict) -> dict:
    """
    Calculate commission split for an order based on seller plan + influencer tier.
    Returns commission breakdown with rate snapshots.
    """
    total_net_gmv = order.get("total_amount", 0)

    # Get seller(s) from line items
    seller_ids = set(item.get("producer_id") for item in order.get("line_items", []))

    splits = []
    for sid in seller_ids:
        if not sid:
            continue
        # Get seller's current plan
        seller_doc = await db.users.find_one({"user_id": sid}, {"_id": 0, "subscription": 1})
        seller_plan = (seller_doc or {}).get("subscription", {}).get("plan", "FREE")

        # Calculate seller's portion of the order
        seller_gmv = round(sum(
            item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))
            for item in order.get("line_items", [])
            if item.get("producer_id") == sid
        ), 2)
        seller_gmv_cents = int(round(seller_gmv * 100))

        # Influencer attribution
        influencer_id = order.get("influencer_id")
        influencer_tier = None
        if influencer_id:
            inf_doc = await db.influencers.find_one(
                {"influencer_id": influencer_id},
                {"_id": 0, "current_tier": 1, "commission_rate": 1},
            )
            influencer_tier = normalize_influencer_tier(
                (inf_doc or {}).get("current_tier", "hercules"),
                (inf_doc or {}).get("commission_rate"),
            )

        split_cents = calculate_order_split(
            total_cents=seller_gmv_cents,
            seller_plan=seller_plan,
            influencer_tier=influencer_tier,
        )
        split_snapshot = split_cents["snapshot"]
        platform_gross = cents_to_float(split_cents["platform_gross_cents"])
        influencer_cut = cents_to_float(split_cents["influencer_cut_cents"])
        platform_net = cents_to_float(split_cents["platform_net_cents"])
        seller_payout = cents_to_float(split_cents["seller_payout_cents"])

        splits.append({
            "seller_id": sid,
            "seller_plan": split_snapshot["seller_plan"],
            "platform_rate_snapshot": split_snapshot["commission_rate"],
            "influencer_id": influencer_id,
            "influencer_tier_snapshot": split_snapshot["influencer_tier"],
            "influencer_rate_snapshot": split_snapshot["influencer_rate"],
            "seller_gmv": seller_gmv,
            "platform_gross": platform_gross,
            "influencer_cut": influencer_cut,
            "platform_net": platform_net,
            "seller_payout": seller_payout,
            "seller_gmv_cents": seller_gmv_cents,
            "platform_gross_cents": split_cents["platform_gross_cents"],
            "influencer_cut_cents": split_cents["influencer_cut_cents"],
            "platform_net_cents": split_cents["platform_net_cents"],
            "seller_payout_cents": split_cents["seller_payout_cents"],
            "snapshot": split_snapshot,
        })

    return {
        "order_id": order.get("order_id"),
        "total_net_gmv": total_net_gmv,
        "total_platform_gross": round(sum(split["platform_gross"] for split in splits), 2),
        "total_platform_net": round(sum(split["platform_net"] for split in splits), 2),
        "total_influencer_cut": round(sum(split["influencer_cut"] for split in splits), 2),
        "splits": splits,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }


async def check_influencer_attribution(db, customer_id: str, influencer_code: str) -> dict:
    """
    Check if a customer can use an influencer code.
    Returns attribution info or error if locked to another influencer.
    """
    # Check existing attribution
    existing = await db.customer_influencer_attribution.find_one(
        {"customer_id": customer_id, "is_active": True},
        {"_id": 0}
    )

    if existing:
        # Customer already attributed to an influencer
        if existing.get("code_used") == influencer_code:
            return {"allowed": True, "influencer_id": existing["influencer_id"], "existing": True}

        # Check if attribution has expired
        expiry = existing.get("attribution_expiry_date", "")
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            except ValueError:
                expiry_dt = None
            if expiry_dt and expiry_dt > datetime.now(timezone.utc):
                return {
                    "allowed": False,
                    "error": "Ya tienes un codigo de referido activo. No puedes usar otro hasta que expire.",
                    "locked_until": expiry,
                }
        # Expired — allow new code

    # Look up the influencer code
    discount = await db.discount_codes.find_one(
        {"code": influencer_code.upper(), "influencer_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "influencer_id": 1, "code": 1}
    )
    if not discount:
        return {"allowed": False, "error": "Codigo de descuento no valido"}

    return {"allowed": True, "influencer_id": discount["influencer_id"], "code": discount["code"], "existing": False}


async def create_attribution(db, customer_id: str, influencer_id: str, code_used: str):
    """Create or update customer-influencer attribution (18 month lock)."""
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=ATTRIBUTION_LOCK_MONTHS * 30)

    await db.customer_influencer_attribution.update_one(
        {"customer_id": customer_id},
        {"$set": {
            "customer_id": customer_id,
            "influencer_id": influencer_id,
            "first_purchase_date": now.isoformat(),
            "attribution_expiry_date": expiry.isoformat(),
            "code_used": code_used,
            "is_active": True,
            "total_orders_count": 0,
            "total_gmv_generated": 0,
        }},
        upsert=True
    )
    logger.info(f"[ATTRIBUTION] Customer {customer_id} → Influencer {influencer_id} (18 months)")


async def recalculate_influencer_tier(db, influencer_id: str) -> str:
    """Recalculate influencer tier from the active order ledger over the last 30 days."""
    now = datetime.now(timezone.utc)
    monthly_window_start = (now - timedelta(days=30)).isoformat()
    influencer_doc = await db.influencers.find_one(
        {"influencer_id": influencer_id},
        {"_id": 0, "followers_count": 1, "current_tier": 1, "commission_rate": 1},
    )
    if not influencer_doc:
        return "hercules"

    followers_count = int(influencer_doc.get("followers_count", 0) or 0)

    pipeline = [
        {"$match": {
            "influencer_id": influencer_id,
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]},
            "created_at": {"$gte": monthly_window_start},
        }},
        {"$group": {
            "_id": "$user_id",
            "order_count": {"$sum": 1},
            "total_gmv": {"$sum": "$total_amount"}
        }}
    ]
    customer_metrics = await db.orders.aggregate(pipeline).to_list(10000)

    unique_customers = len(customer_metrics)
    net_gmv = round(sum(c["total_gmv"] for c in customer_metrics), 2)
    repeat_buyers = sum(1 for c in customer_metrics if c["order_count"] >= 2)
    repurchase_rate = repeat_buyers / unique_customers if unique_customers > 0 else 0

    net_gmv_cents = int(round(net_gmv * 100))
    new_tier = "hercules"
    for tier_name in reversed(INFLUENCER_TIER_ORDER):
        tier_cfg = INFLUENCER_TIERS[tier_name]
        if (
            net_gmv_cents >= tier_cfg["min_gmv_cents"] and
            followers_count >= tier_cfg.get("min_followers", 0)
        ):
            new_tier = tier_name
            break

    # Update influencer
    metrics = {
        "unique_customers": unique_customers,
        "net_gmv": net_gmv,
        "net_gmv_cents": net_gmv_cents,
        "repurchase_rate": round(repurchase_rate, 4),
        "followers_count": followers_count,
        "window_days": 30,
    }
    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {
            "current_tier": new_tier,
            "commission_rate": get_influencer_commission_rate(new_tier),
            "commission_value": int(round(get_influencer_commission_rate(new_tier) * 100)),
            "monthly_metrics": metrics,
            "last_90_days_metrics": metrics,
            "next_tier_review_date": (now + timedelta(days=30)).isoformat(),
            "updated_at": now.isoformat(),
        }}
    )

    return new_tier
