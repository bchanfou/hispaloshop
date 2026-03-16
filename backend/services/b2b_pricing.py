from typing import Iterable


def _to_float(value, default: float | None = 0.0) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def compute_b2b_total(items: Iterable[dict]) -> float:
    """Compute B2B total using Decimal to avoid float drift on large orders."""
    from decimal import Decimal, ROUND_HALF_UP
    total = Decimal("0")
    for item in items:
        unit_price = Decimal(str(_to_float(item.get("unit_price_quoted"), 0.0)))
        qty = _to_int(item.get("qty_requested"), 0)
        total += unit_price * qty
    return float(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def select_volume_price(pricing: dict, quantity: int) -> float | None:
    tiers = [v for k, v in pricing.items() if k.startswith("tier_") and isinstance(v, dict)]
    tiers = sorted(tiers, key=lambda t: _to_int(t.get("min_qty"), 0))
    selected = None
    for tier in tiers:
        if quantity >= _to_int(tier.get("min_qty"), 0):
            selected = tier
    if not selected:
        return None
    return _to_float(selected.get("unit_price"), None)
