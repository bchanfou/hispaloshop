from types import SimpleNamespace

from services.shipping_service import ShippingPolicy, ShippingService


def test_tax_calculation_21_percent():
    # 105.00 EUR taxable * 21% = 22.05 EUR
    tax = ShippingService.calculate_tax_cents(105_00, 2100)
    assert tax == 22_05


def test_shipping_calculation_with_threshold_and_per_item():
    policy = ShippingPolicy(
        enabled=True,
        base_cost_cents=300,          # 3 EUR
        per_item_cents=100,           # 1 EUR/item
        free_threshold_cents=5000,    # 50 EUR
    )

    shipping = ShippingService.calculate_shipping_cents(policy=policy, item_count=2, subtotal_cents=3000)
    assert shipping == 500  # 3 + (2*1)

    free_shipping = ShippingService.calculate_shipping_cents(policy=policy, item_count=1, subtotal_cents=6000)
    assert free_shipping == 0


def test_shipping_policy_disabled_is_zero():
    policy = ShippingPolicy(enabled=False, base_cost_cents=500, per_item_cents=300, free_threshold_cents=None)
    shipping = ShippingService.calculate_shipping_cents(policy=policy, item_count=10, subtotal_cents=1000)
    assert shipping == 0


def test_order_totals_including_shipping_and_tax():
    """
    Spain B2C: prices INCLUDE IVA. Tax is informational (extracted from the
    IVA-inclusive subtotal), NOT added on top. Cycle 2 of the platform audit
    changed this behavior to match EU consumer law — displayed prices must be
    the final amount the consumer pays.

    For subtotal=€100 (IVA-inclusive) + shipping=€5 at 21% IVA:
      tax_extracted = 10000 * 2100 / (10000 + 2100) ≈ 1736 cents (€17.36 IVA inside)
      total         = 10000 + 500 = 10500 cents   (IVA not added on top)
    """
    totals = ShippingService.calculate_order_totals(subtotal_cents=100_00, shipping_cents=5_00, tax_rate_bp=2100)
    assert totals["subtotal_cents"] == 100_00
    assert totals["shipping_cents"] == 5_00
    assert totals["tax_cents"] == 1736         # IVA extracted from IVA-inclusive subtotal
    assert totals["total_cents"] == 10500      # subtotal + shipping (no IVA added on top)


def test_policy_from_user_adapter():
    user = SimpleNamespace(
        shipping_policy_enabled=True,
        shipping_base_cost_cents=250,
        shipping_per_item_cents=75,
        shipping_free_threshold_cents=4000,
    )
    policy = ShippingService.policy_from_user(user)
    assert policy.enabled is True
    assert policy.base_cost_cents == 250
    assert policy.per_item_cents == 75
    assert policy.free_threshold_cents == 4000

