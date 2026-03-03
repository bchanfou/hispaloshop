import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.b2b_pricing import compute_b2b_total, select_volume_price


def test_compute_b2b_total_rounds_correctly():
    items = [
        {"qty_requested": 100, "unit_price_quoted": 5.0},
        {"qty_requested": 500, "unit_price_quoted": 4.5},
    ]
    assert compute_b2b_total(items) == 2750.0


def test_select_volume_price_uses_highest_eligible_tier():
    pricing = {
        "tier_1": {"min_qty": 100, "unit_price": 50.0},
        "tier_2": {"min_qty": 500, "unit_price": 45.0},
        "tier_3": {"min_qty": 1000, "unit_price": 40.0},
        "currency": "USD",
    }
    assert select_volume_price(pricing, 99) is None
    assert select_volume_price(pricing, 100) == 50.0
    assert select_volume_price(pricing, 700) == 45.0
    assert select_volume_price(pricing, 2000) == 40.0
