from core.monetization import calculate_order_split


def test_free_plan_without_influencer_keeps_80_20_split():
    split = calculate_order_split(total_cents=10_000, seller_plan="FREE")

    assert split["seller_payout_cents"] == 8_000
    assert split["platform_gross_cents"] == 2_000
    assert split["influencer_cut_cents"] == 0
    assert split["platform_net_cents"] == 2_000


def test_pro_plan_without_influencer_keeps_82_18_split():
    split = calculate_order_split(total_cents=10_000, seller_plan="PRO")

    assert split["seller_payout_cents"] == 8_200
    assert split["platform_gross_cents"] == 1_800
    assert split["influencer_cut_cents"] == 0
    assert split["platform_net_cents"] == 1_800


def test_pro_plan_with_zeus_influencer_comes_out_of_platform_fee():
    split = calculate_order_split(total_cents=10_000, seller_plan="PRO", influencer_tier="zeus")

    assert split["seller_payout_cents"] == 8_200
    assert split["platform_gross_cents"] == 1_800
    assert split["influencer_cut_cents"] == 126
    assert split["platform_net_cents"] == 1_674


def test_legacy_tier_aliases_map_to_canonical_rates():
    split = calculate_order_split(total_cents=10_000, seller_plan="FREE", influencer_tier="aquiles")

    assert split["snapshot"]["influencer_tier"] == "hercules"
    assert split["influencer_cut_cents"] == 60
