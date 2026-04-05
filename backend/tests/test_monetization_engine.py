"""
Monetization engine tests — commission split accuracy.

═══════════════════════════════════════════════════════════════════════════
COMMISSION INTERPRETATION — ground truth (confirmed by founder 2026-04-06)
───────────────────────────────────────────────────────────────────────────
Influencer cut is computed as `influencer_rate × ORIGINAL_PRICE`, then
subtracted from the platform's gross share. It is NOT a percentage of the
platform's gross.

  ELITE seller (17%) + Zeus influencer (7%), €100 product:
    platform_gross  = 100 × 0.17 = €17
    influencer_cut  = 100 × 0.07 = €7   (NOT 0.07 × 17 = €1.19)
    platform_net    = 17 − 7 = €10
    seller_payout   = 100 − 17 = €83

  With first-purchase discount (10% absorbed by platform):
    consumer_pays   = 100 − 10 = €90
    platform_net    = 17 − 7 − 10 = €0

Full 8-scenario breakdown lives in
    memory/commission_interpretation.md

History: tests 22-35 of this file used to encode the wrong interpretation
(influencer % applied to platform gross). They were updated on 2026-04-06
to match the canonical interpretation above. If you find yourself needing
to "fix" one of these assertions, re-read commission_interpretation.md
FIRST — the bug is probably in your mental model, not in the code.
═══════════════════════════════════════════════════════════════════════════
"""
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
    """
    PRO seller (18%) + Zeus influencer (7%) on a €100 order.

    Canonical interpretation:
      - Seller always gets €82 (18% comes off the top)
      - Influencer gets 7% of ORIGINAL (€7), subtracted from platform gross
      - Platform net = 18 − 7 = €11
    """
    split = calculate_order_split(total_cents=10_000, seller_plan="PRO", influencer_tier="zeus")

    assert split["seller_payout_cents"] == 8_200
    assert split["platform_gross_cents"] == 1_800
    assert split["influencer_cut_cents"] == 700    # 7% of €100, NOT 7% of €18
    assert split["platform_net_cents"] == 1_100    # 1800 − 700


def test_legacy_tier_aliases_map_to_canonical_rates():
    """
    Legacy tier names (like 'aquiles') must normalize to a canonical tier.
    FREE seller (20%) + Hercules (3%) on €100:
      - platform_gross = €20
      - influencer_cut = 3% of €100 = €3   (NOT 3% of €20 = €0.60)
      - platform_net   = 20 − 3 = €17
    """
    split = calculate_order_split(total_cents=10_000, seller_plan="FREE", influencer_tier="aquiles")

    assert split["snapshot"]["influencer_tier"] == "hercules"
    assert split["influencer_cut_cents"] == 300    # 3% of €100
    assert split["platform_net_cents"] == 1_700    # 2000 − 300
