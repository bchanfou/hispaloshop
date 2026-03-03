from typing import Iterable


def compute_b2b_total(items: Iterable[dict]) -> float:
    total = 0.0
    for item in items:
        unit_price = float(item.get("unit_price_quoted") or 0)
        qty = int(item.get("qty_requested") or 0)
        total += unit_price * qty
    return round(total, 2)


def select_volume_price(pricing: dict, quantity: int) -> float | None:
    tiers = [v for k, v in pricing.items() if k.startswith("tier_") and isinstance(v, dict)]
    tiers = sorted(tiers, key=lambda t: int(t.get("min_qty", 0)))
    selected = None
    for tier in tiers:
        if quantity >= int(tier.get("min_qty", 0)):
            selected = tier
    if not selected:
        return None
    return float(selected["unit_price"])
