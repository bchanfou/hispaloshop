from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional


_CENTS_PRECISION = Decimal("0.01")

COMMISSION_RATES = {
    "FREE": Decimal("0.20"),
    "PRO": Decimal("0.18"),
    "ELITE": Decimal("0.17"),
}

INFLUENCER_TIER_RATES = {
    "hercules": Decimal("0.03"),
    "atenea": Decimal("0.05"),
    "zeus": Decimal("0.07"),
}

INFLUENCER_TIER_ALIASES = {
    "perseo": "hercules",
    "aquiles": "hercules",
    "artemisa": "atenea",
    "apolo": "zeus",
    "titan": "zeus",
    "atenea": "atenea",
    "hercules": "hercules",
    "zeus": "zeus",
}


def _quantize(amount: Decimal) -> Decimal:
    return amount.quantize(_CENTS_PRECISION, rounding=ROUND_HALF_UP)


def normalize_seller_plan(plan: Optional[str]) -> str:
    if not plan:
        return "FREE"
    normalized = str(plan).strip().upper()
    return normalized if normalized in COMMISSION_RATES else "FREE"


def normalize_influencer_tier(tier: Optional[str]) -> Optional[str]:
    if not tier:
        return None
    normalized = INFLUENCER_TIER_ALIASES.get(str(tier).strip().lower())
    return normalized if normalized in INFLUENCER_TIER_RATES else None


def cents_to_decimal(total_cents: int) -> Decimal:
    return _quantize(Decimal(total_cents) / Decimal("100"))


def decimal_to_cents(amount: Decimal) -> int:
    return int(_quantize(amount) * 100)


def cents_to_float(total_cents: int) -> float:
    return float(cents_to_decimal(total_cents))


def _get_commission_rate(plan: str) -> Decimal:
    """Read commission rate from subscriptions cache, fall back to hardcoded."""
    try:
        from services.subscriptions import _plans_cache
        db_plans = _plans_cache.get("data") or {}
        if plan in db_plans:
            return Decimal(str(db_plans[plan].get("commission_rate", 0.20)))
    except Exception:
        pass
    return COMMISSION_RATES.get(plan, COMMISSION_RATES["FREE"])


FIRST_PURCHASE_DISCOUNT_PCT = Decimal("0.10")  # 10% discount for first purchase via influencer


def calculate_order_split(
    total_cents: int,
    seller_plan: str,
    influencer_tier: Optional[str] = None,
    is_first_purchase_via_influencer: bool = False,
) -> dict:
    """
    Calculate the financial split for an order.

    Key rule: seller ALWAYS receives their share based on the ORIGINAL price,
    even when a first-purchase influencer discount is applied. The platform
    absorbs the discount cost.

    Args:
        total_cents: The original product price in cents (before any discount).
        seller_plan: FREE / PRO / ELITE.
        influencer_tier: hercules / atenea / zeus (or None).
        is_first_purchase_via_influencer: True if this consumer's first order
            was attributed to an influencer code.
    """
    original_total = cents_to_decimal(total_cents)
    normalized_plan = normalize_seller_plan(seller_plan)
    commission_rate = _get_commission_rate(normalized_plan)

    # Seller always gets their share of the ORIGINAL price
    platform_gross = _quantize(original_total * commission_rate)
    seller_payout = _quantize(original_total - platform_gross)

    # ═══════════════════════════════════════════════════════════════════════
    # INFLUENCER CUT — canonical interpretation (confirmed founder 2026-04-06)
    # -----------------------------------------------------------------------
    # Influencer tier % applies to the ORIGINAL price, then is SUBTRACTED from
    # the platform's gross share. It is NOT a percentage of platform gross.
    #
    #   ELITE 17% + Zeus 7%, €100:
    #     platform_gross = 100 × 0.17 = €17
    #     influencer_cut = 100 × 0.07 = €7    ← 7% of ORIGINAL, not of €17
    #     platform_net   = 17 − 7 = €10
    #
    # If you're tempted to change this formula, read memory/commission_interpretation.md
    # FIRST — the 8 canonical scenarios there are the single source of truth.
    # The safety cap below prevents influencer_cut > platform_gross when a
    # particularly generous tier × low-margin plan combination would go negative.
    # ═══════════════════════════════════════════════════════════════════════
    normalized_tier = normalize_influencer_tier(influencer_tier)
    influencer_rate = INFLUENCER_TIER_RATES.get(normalized_tier, Decimal("0"))
    influencer_cut = _quantize(original_total * influencer_rate) if normalized_tier else Decimal("0")
    if influencer_cut > platform_gross:
        influencer_cut = platform_gross

    # First-purchase discount: consumer pays less, platform absorbs the difference
    discount_amount = Decimal("0")
    consumer_pays = original_total
    if is_first_purchase_via_influencer and normalized_tier:
        discount_amount = _quantize(original_total * FIRST_PURCHASE_DISCOUNT_PCT)
        consumer_pays = _quantize(original_total - discount_amount)

    platform_net = _quantize(platform_gross - influencer_cut - discount_amount)

    return {
        "seller_payout_cents": decimal_to_cents(seller_payout),
        "platform_gross_cents": decimal_to_cents(platform_gross),
        "influencer_cut_cents": decimal_to_cents(influencer_cut),
        "platform_net_cents": decimal_to_cents(platform_net),
        "consumer_pays_cents": decimal_to_cents(consumer_pays),
        "discount_cents": decimal_to_cents(discount_amount),
        "snapshot": {
            "seller_plan": normalized_plan,
            "commission_rate": float(commission_rate),
            "influencer_tier": normalized_tier,
            "influencer_rate": float(influencer_rate),
            "is_first_purchase_via_influencer": is_first_purchase_via_influencer,
            "discount_pct": float(FIRST_PURCHASE_DISCOUNT_PCT) if discount_amount > 0 else 0,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
