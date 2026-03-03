import sys
import types

sys.modules.setdefault('stripe', types.SimpleNamespace(api_key='', Product=types.SimpleNamespace(create=lambda **_: types.SimpleNamespace(id='prod_test')), Price=types.SimpleNamespace(create=lambda **_: types.SimpleNamespace(id='price_test'))))

from services.subscriptions import (
    calculate_dynamic_commission,
    has_tier_access,
    list_subscription_plans,
)


def test_dynamic_commission_applies_all_modifiers():
    result = calculate_dynamic_commission(
        base_rate=0.18,
        order_total=100,
        monthly_gmv=60000,
        return_rate_30d=0.01,
        used_hi_ai_this_month=True,
    )
    assert result['base_rate'] == 0.18
    assert result['final_rate'] == 0.17
    assert len(result['modifiers']) == 3
    assert result['platform_fee'] == 17.0
    assert result['seller_amount'] == 83.0


def test_dynamic_commission_enforces_floor():
    result = calculate_dynamic_commission(
        base_rate=0.10,
        order_total=200,
        monthly_gmv=100000,
        return_rate_30d=0.0,
        used_hi_ai_this_month=True,
    )
    assert result['final_rate'] == 0.1
    assert result['platform_fee'] == 20.0


def test_tier_access():
    assert has_tier_access('elite', 'pro')
    assert has_tier_access('pro', 'pro')
    assert not has_tier_access('free', 'pro')


def test_plan_catalog_filtering():
    producer_plans = list_subscription_plans('producer')
    tiers = {p['tier'] for p in producer_plans}
    assert {'free', 'pro', 'elite'}.issubset(tiers)
    consumer_plans = list_subscription_plans('consumer')
    assert len(consumer_plans) == 2
