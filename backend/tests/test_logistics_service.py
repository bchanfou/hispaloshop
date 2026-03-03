import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.logistics import calculate_shipping_quote, make_shipment_number


def test_calculate_shipping_quote_uses_chargeable_weight():
    result = calculate_shipping_quote(
        base_cost_per_kg=2.0,
        fuel_surcharge_percent=0.1,
        transit_time_days=30,
        cargo={
            "actual_weight_kg": 100,
            "volume_cbm": 1.5,
            "declared_value": 10000,
            "hs_code_tariff_rate": 0.05,
        },
    )

    assert result["freight_cost"] == 551.1
    assert result["insurance"] == 30.0
    assert result["transit_time_days"] == 30


def test_make_shipment_number_format():
    assert make_shipment_number(123).startswith("HI-")
    assert make_shipment_number(123).endswith("000123")
