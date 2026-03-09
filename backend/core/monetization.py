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


def calculate_order_split(total_cents: int, seller_plan: str, influencer_tier: Optional[str] = None) -> dict:
    total = cents_to_decimal(total_cents)
    normalized_plan = normalize_seller_plan(seller_plan)
    commission_rate = COMMISSION_RATES[normalized_plan]

    platform_gross = _quantize(total * commission_rate)
    seller_payout = _quantize(total - platform_gross)

    normalized_tier = normalize_influencer_tier(influencer_tier)
    influencer_rate = INFLUENCER_TIER_RATES.get(normalized_tier, Decimal("0"))
    influencer_cut = _quantize(platform_gross * influencer_rate) if normalized_tier else Decimal("0")
    if influencer_cut > platform_gross:
        influencer_cut = platform_gross

    platform_net = _quantize(platform_gross - influencer_cut)

    return {
        "seller_payout_cents": decimal_to_cents(seller_payout),
        "platform_gross_cents": decimal_to_cents(platform_gross),
        "influencer_cut_cents": decimal_to_cents(influencer_cut),
        "platform_net_cents": decimal_to_cents(platform_net),
        "snapshot": {
            "seller_plan": normalized_plan,
            "commission_rate": float(commission_rate),
            "influencer_tier": normalized_tier,
            "influencer_rate": float(influencer_rate),
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
