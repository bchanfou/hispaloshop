"""
Seller Subscription + Influencer Tier + Commission Engine.
Stripe Billing for subscriptions, Connect for payouts.
"""
import os
import stripe
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')

# ── Plan definitions ──────────────────────────────────────────

SELLER_PLANS = {
    "FREE":  {"price_monthly_usd": 0,   "commission_rate": 0.20, "label": "Free",  "stripe_price_id": None},
    "PRO":   {"price_monthly_usd": 54,  "commission_rate": 0.18, "label": "Pro",   "stripe_price_id": None},
    "ELITE": {"price_monthly_usd": 108, "commission_rate": 0.16, "label": "Elite", "stripe_price_id": None},
}

INFLUENCER_TIERS = {
    "HERCULES": {"commission_rate": 0.03, "min_customers": 15, "min_gmv": 5000,  "min_repurchase": 0.0},
    "ATENEA":   {"commission_rate": 0.05, "min_customers": 40, "min_gmv": 12000, "min_repurchase": 0.25},
    "TITAN":    {"commission_rate": 0.07, "min_customers": 80, "min_gmv": 25000, "min_repurchase": 0.35},
}

ATTRIBUTION_LOCK_MONTHS = 18
INFLUENCER_PAYOUT_DELAY_DAYS = 15
INFLUENCER_MIN_PAYOUT_USD = 50
GRACE_PERIOD_DAYS = 3


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
    return INFLUENCER_TIERS.get(tier, INFLUENCER_TIERS["HERCULES"])["commission_rate"]


async def calculate_order_commissions(db, order: dict) -> dict:
    """
    Calculate commission split for an order based on seller plan + influencer tier.
    Returns commission breakdown with rate snapshots.
    """
    seller_id = None
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
        platform_rate = get_seller_commission_rate(seller_plan)

        # Calculate seller's portion of the order
        seller_gmv = sum(
            item.get("subtotal", item.get("price", 0) * item.get("quantity", 1))
            for item in order.get("line_items", [])
            if item.get("producer_id") == sid
        )

        # Influencer attribution
        influencer_rate = 0
        influencer_id = order.get("influencer_id")
        influencer_tier = None
        if influencer_id:
            inf_doc = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0, "current_tier": 1})
            influencer_tier = (inf_doc or {}).get("current_tier", "HERCULES")
            influencer_rate = get_influencer_commission_rate(influencer_tier)

        platform_gross = round(seller_gmv * platform_rate, 2)
        influencer_cut = round(seller_gmv * influencer_rate, 2) if influencer_id else 0
        platform_net = round(platform_gross - influencer_cut, 2)
        seller_payout = round(seller_gmv - platform_gross, 2)

        splits.append({
            "seller_id": sid,
            "seller_plan": seller_plan,
            "platform_rate_snapshot": platform_rate,
            "influencer_id": influencer_id,
            "influencer_tier_snapshot": influencer_tier,
            "influencer_rate_snapshot": influencer_rate,
            "seller_gmv": seller_gmv,
            "platform_gross": platform_gross,
            "influencer_cut": influencer_cut,
            "platform_net": platform_net,
            "seller_payout": seller_payout,
        })

    return {
        "order_id": order.get("order_id"),
        "total_net_gmv": total_net_gmv,
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
        if expiry and datetime.fromisoformat(expiry.replace("Z", "+00:00")) > datetime.now(timezone.utc):
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
    """Recalculate influencer tier based on last 90 days metrics."""
    now = datetime.now(timezone.utc)
    ninety_days_ago = (now - timedelta(days=90)).isoformat()

    # Get attributed customers with orders in last 90 days
    attributions = await db.customer_influencer_attribution.find(
        {"influencer_id": influencer_id, "is_active": True},
        {"_id": 0, "customer_id": 1}
    ).to_list(10000)
    customer_ids = [a["customer_id"] for a in attributions]

    if not customer_ids:
        return "HERCULES"

    # Count unique customers with orders in last 90 days
    pipeline = [
        {"$match": {
            "user_id": {"$in": customer_ids},
            "status": {"$in": ["paid", "confirmed", "preparing", "shipped", "delivered"]},
            "created_at": {"$gte": ninety_days_ago}
        }},
        {"$group": {
            "_id": "$user_id",
            "order_count": {"$sum": 1},
            "total_gmv": {"$sum": "$total_amount"}
        }}
    ]
    customer_metrics = await db.orders.aggregate(pipeline).to_list(10000)

    unique_customers = len(customer_metrics)
    net_gmv = sum(c["total_gmv"] for c in customer_metrics)
    repeat_buyers = sum(1 for c in customer_metrics if c["order_count"] >= 2)
    repurchase_rate = repeat_buyers / unique_customers if unique_customers > 0 else 0

    # Determine tier
    new_tier = "HERCULES"
    for tier_name in ["TITAN", "ATENEA", "HERCULES"]:
        t = INFLUENCER_TIERS[tier_name]
        if (unique_customers >= t["min_customers"] and
            net_gmv >= t["min_gmv"] and
            repurchase_rate >= t["min_repurchase"]):
            new_tier = tier_name
            break

    # Update influencer
    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {
            "current_tier": new_tier,
            "commission_rate": get_influencer_commission_rate(new_tier),
            "last_90_days_metrics": {
                "unique_customers": unique_customers,
                "net_gmv": round(net_gmv, 2),
                "repurchase_rate": round(repurchase_rate, 4),
            },
            "next_tier_review_date": (now + timedelta(days=90)).isoformat(),
            "updated_at": now.isoformat(),
        }}
    )

    return new_tier
