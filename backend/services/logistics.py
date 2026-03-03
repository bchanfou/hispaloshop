from datetime import datetime, timedelta, timezone


def calculate_shipping_quote(*, base_cost_per_kg: float, fuel_surcharge_percent: float, transit_time_days: int, cargo: dict) -> dict:
    volumetric_weight = cargo["volume_cbm"] * 167
    chargeable_weight = max(cargo["actual_weight_kg"], volumetric_weight)
    base_cost = chargeable_weight * base_cost_per_kg

    fuel_surcharge = base_cost * fuel_surcharge_percent
    documentation_fee = 150
    handling_origin = 200
    handling_destination = 250
    insurance = cargo["declared_value"] * 0.003
    estimated_duties = cargo["declared_value"] * cargo["hs_code_tariff_rate"]

    freight_cost = round(base_cost + fuel_surcharge, 2)
    origin_charges = round(documentation_fee + handling_origin, 2)
    destination_charges = round(handling_destination + estimated_duties, 2)
    insurance = round(insurance, 2)

    return {
        "freight_cost": freight_cost,
        "origin_charges": origin_charges,
        "destination_charges": destination_charges,
        "insurance": insurance,
        "total_estimated": round(freight_cost + origin_charges + destination_charges + insurance, 2),
        "transit_time_days": transit_time_days,
        "valid_until": datetime.now(timezone.utc) + timedelta(days=7),
    }


def make_shipment_number(sequence: int) -> str:
    return f"HI-{datetime.now(timezone.utc).year}-{sequence:06d}"
