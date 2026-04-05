"""
Commission split smoke tests — THE critical revenue-path test.

═══════════════════════════════════════════════════════════════════════════
FOUNDER-CANONICAL SCENARIOS (immutable spec, 2026-04-06)
───────────────────────────────────────────────────────────────────────────
These tests encode the founder's literal example from section 0.3 of the
launch roadmap prompt. They are the UNTOUCHABLE ground truth — if they
ever fail, STOP. The bug is in the code or in the newer tests, NEVER in
these assertions. Full 8-scenario table lives at
    memory/commission_interpretation.md
═══════════════════════════════════════════════════════════════════════════

Tests the pure function `core.monetization.calculate_order_split` against the
4 canonical scenarios from the V1 scope (memory/v1_scope_final.md):

  1. ELITE seller + Zeus influencer + first purchase  → seller 83, influencer 7, discount 10, platform_net 0
  2. ELITE seller + Zeus influencer + recurring       → seller 83, influencer 7, platform_net 10
  3. PRO seller + Hercules influencer + first purchase → seller 82, influencer 3, discount 10, platform_net 5
  4. FREE seller + no influencer                      → seller 80, platform 20

All scenarios use a €100 product (10000 cents) so math is verifiable by hand.

If any of these fail, the bug is in the calculator — NOT in the test.
Do not "fix" the test to make it pass. Escalate immediately.
"""
import pytest

from core.monetization import calculate_order_split


pytestmark = [pytest.mark.smoke, pytest.mark.commission]


# ═══════════════════════════════════════════════════════════════════════════
# Scenario 1 — ELITE + Zeus + first purchase
# ═══════════════════════════════════════════════════════════════════════════
class TestEliteZeusFirstPurchase:
    """ELITE seller (17%) + Zeus influencer (7%) + first purchase (10% discount)."""

    @pytest.fixture
    def split(self):
        return calculate_order_split(
            total_cents=10000,  # €100
            seller_plan="ELITE",
            influencer_tier="zeus",
            is_first_purchase_via_influencer=True,
        )

    def test_seller_receives_83_euros_on_original_price(self, split):
        assert split["seller_payout_cents"] == 8300, (
            f"ELITE seller should receive €83 on first-purchase orders "
            f"(platform absorbs discount). Got {split['seller_payout_cents']} cents."
        )

    def test_platform_gross_is_17_euros(self, split):
        assert split["platform_gross_cents"] == 1700

    def test_zeus_influencer_receives_7_euros(self, split):
        assert split["influencer_cut_cents"] == 700, (
            f"Zeus influencer should receive €7 (7% of €100). "
            f"Got {split['influencer_cut_cents']} cents."
        )

    def test_consumer_pays_90_euros_after_discount(self, split):
        assert split["consumer_pays_cents"] == 9000, (
            f"Consumer should pay €90 (€100 - 10% first-purchase discount). "
            f"Got {split['consumer_pays_cents']} cents."
        )

    def test_discount_is_10_euros(self, split):
        assert split["discount_cents"] == 1000

    def test_platform_net_is_zero_platform_absorbs_discount(self, split):
        """17% gross - 7% influencer - 10% discount = 0% platform net."""
        assert split["platform_net_cents"] == 0, (
            f"Platform net should be €0 in first-purchase Zeus scenario "
            f"(17 - 7 - 10 = 0). Got {split['platform_net_cents']} cents."
        )

    def test_snapshot_captures_first_purchase_flag(self, split):
        assert split["snapshot"]["is_first_purchase_via_influencer"] is True
        assert split["snapshot"]["seller_plan"] == "ELITE"
        assert split["snapshot"]["influencer_tier"] == "zeus"


# ═══════════════════════════════════════════════════════════════════════════
# Scenario 2 — ELITE + Zeus + recurring (not first purchase)
# ═══════════════════════════════════════════════════════════════════════════
class TestEliteZeusRecurring:
    """ELITE seller (17%) + Zeus influencer (7%) + recurring order (no discount)."""

    @pytest.fixture
    def split(self):
        return calculate_order_split(
            total_cents=10000,
            seller_plan="ELITE",
            influencer_tier="zeus",
            is_first_purchase_via_influencer=False,
        )

    def test_seller_receives_83_euros(self, split):
        assert split["seller_payout_cents"] == 8300

    def test_influencer_receives_7_euros(self, split):
        assert split["influencer_cut_cents"] == 700

    def test_consumer_pays_full_100_euros(self, split):
        assert split["consumer_pays_cents"] == 10000

    def test_no_discount_applied(self, split):
        assert split["discount_cents"] == 0

    def test_platform_net_is_10_euros(self, split):
        """17% gross - 7% influencer = 10% platform net."""
        assert split["platform_net_cents"] == 1000, (
            f"Platform net should be €10 in recurring Zeus scenario "
            f"(17 - 7 = 10). Got {split['platform_net_cents']} cents."
        )


# ═══════════════════════════════════════════════════════════════════════════
# Scenario 3 — PRO + Hercules + first purchase
# ═══════════════════════════════════════════════════════════════════════════
class TestProHerculesFirstPurchase:
    """PRO seller (18%) + Hercules influencer (3%) + first purchase (10% discount)."""

    @pytest.fixture
    def split(self):
        return calculate_order_split(
            total_cents=10000,
            seller_plan="PRO",
            influencer_tier="hercules",
            is_first_purchase_via_influencer=True,
        )

    def test_seller_receives_82_euros(self, split):
        assert split["seller_payout_cents"] == 8200

    def test_platform_gross_is_18_euros(self, split):
        assert split["platform_gross_cents"] == 1800

    def test_hercules_influencer_receives_3_euros(self, split):
        assert split["influencer_cut_cents"] == 300

    def test_consumer_pays_90_euros(self, split):
        assert split["consumer_pays_cents"] == 9000

    def test_platform_net_is_5_euros(self, split):
        """18% gross - 3% influencer - 10% discount = 5% platform net."""
        assert split["platform_net_cents"] == 500, (
            f"Platform net should be €5 in PRO+Hercules+first-purchase "
            f"(18 - 3 - 10 = 5). Got {split['platform_net_cents']} cents."
        )


# ═══════════════════════════════════════════════════════════════════════════
# Scenario 4 — FREE seller, no influencer
# ═══════════════════════════════════════════════════════════════════════════
class TestFreeNoInfluencer:
    """FREE seller (20%), no influencer, no discount — the simplest case."""

    @pytest.fixture
    def split(self):
        return calculate_order_split(
            total_cents=10000,
            seller_plan="FREE",
            influencer_tier=None,
            is_first_purchase_via_influencer=False,
        )

    def test_seller_receives_80_euros(self, split):
        assert split["seller_payout_cents"] == 8000

    def test_platform_gross_is_20_euros(self, split):
        assert split["platform_gross_cents"] == 2000

    def test_no_influencer_cut(self, split):
        assert split["influencer_cut_cents"] == 0

    def test_consumer_pays_full_100_euros(self, split):
        assert split["consumer_pays_cents"] == 10000

    def test_platform_net_is_20_euros(self, split):
        """FREE seller: platform keeps all 20%, no influencer, no discount."""
        assert split["platform_net_cents"] == 2000


# ═══════════════════════════════════════════════════════════════════════════
# Edge cases — important but not in the 4 canonical scenarios
# ═══════════════════════════════════════════════════════════════════════════
class TestCommissionEdgeCases:

    def test_pro_seller_atenea_influencer_recurring(self):
        """PRO (18%) + Atenea (5%) recurring → seller 82, influencer 5, platform_net 13."""
        split = calculate_order_split(
            total_cents=10000,
            seller_plan="PRO",
            influencer_tier="atenea",
            is_first_purchase_via_influencer=False,
        )
        assert split["seller_payout_cents"] == 8200
        assert split["influencer_cut_cents"] == 500
        assert split["platform_net_cents"] == 1300

    def test_unknown_seller_plan_defaults_to_free(self):
        """Unknown plan should normalize to FREE (20% commission) as safety fallback."""
        split = calculate_order_split(
            total_cents=10000,
            seller_plan="UNKNOWN_PLAN",
            influencer_tier=None,
        )
        assert split["seller_payout_cents"] == 8000
        assert split["snapshot"]["seller_plan"] == "FREE"

    def test_zero_amount_order(self):
        """Zero-amount order should return zero everything (no division errors)."""
        split = calculate_order_split(
            total_cents=0,
            seller_plan="ELITE",
            influencer_tier="zeus",
            is_first_purchase_via_influencer=True,
        )
        assert split["seller_payout_cents"] == 0
        assert split["platform_gross_cents"] == 0
        assert split["influencer_cut_cents"] == 0
        assert split["platform_net_cents"] == 0

    def test_influencer_cut_capped_at_platform_gross(self):
        """
        Influencer rate should never exceed platform gross — safety invariant.
        If someone sets a 50% influencer rate but platform only keeps 20%,
        the influencer cut must cap at 20%, not 50%.
        """
        split = calculate_order_split(
            total_cents=10000,
            seller_plan="FREE",  # 20% platform gross
            influencer_tier="zeus",  # 7% — safely under 20%
        )
        # Zeus 7% < FREE 20%, so no capping needed here
        assert split["influencer_cut_cents"] == 700
        assert split["influencer_cut_cents"] <= split["platform_gross_cents"]

    def test_big_order_preserves_cents_precision(self):
        """€1234.56 order — check no rounding drift."""
        split = calculate_order_split(
            total_cents=123456,
            seller_plan="ELITE",
            influencer_tier=None,
        )
        # 17% of 123456 = 20987.52 → rounded to 20988 cents
        assert split["platform_gross_cents"] == 20988
        assert split["seller_payout_cents"] == 123456 - 20988
        # No residue
        assert (
            split["seller_payout_cents"] + split["platform_gross_cents"] == 123456
        )


# ═══════════════════════════════════════════════════════════════════════════
# FOUNDER CANONICAL TEST — literal copy of the prompt example (sacred)
# ---------------------------------------------------------------------------
# This test is the single untouchable source of truth. Every other commission
# test must be consistent with this one. If this fails, the bug is in code,
# never in the assertion. Do NOT modify expected values to make it pass.
# ═══════════════════════════════════════════════════════════════════════════
class TestFounderCanonicalExample:
    """
    Copy of section 0.3 roadmap prompt:

        ELITE seller + Zeus influencer + primera compra, producto €100:
        - Consumer paga: €90 (descuento 10% absorbido por plataforma)
        - Seller recibe: €83 (sobre precio original)
        - Influencer recibe: €7 (3% del tier Zeus sobre precio original)
        - Plataforma neta: €0 (17 - 7 - 10 absorbed = 0)

        ELITE seller + Zeus influencer + compra recurrente, producto €100:
        - Consumer paga: €100
        - Seller recibe: €83
        - Influencer recibe: €7
        - Plataforma neta: €10

        PRO seller + Hercules influencer + primera compra, producto €100:
        - Consumer paga: €90
        - Seller recibe: €82
        - Influencer recibe: €3 (Hercules 3%)
        - Plataforma neta: €5 (18 - 3 - 10 = 5)

        FREE seller + sin influencer, producto €100:
        - Consumer paga: €100
        - Seller recibe: €80
        - Plataforma neta: €20
    """

    # Scenario 1: ELITE + Zeus + first purchase
    def test_canonical_scenario_1_elite_zeus_first_purchase(self):
        s = calculate_order_split(
            total_cents=10000,
            seller_plan="ELITE",
            influencer_tier="zeus",
            is_first_purchase_via_influencer=True,
        )
        assert s["consumer_pays_cents"]   == 9000, "consumer pays €90"
        assert s["seller_payout_cents"]   == 8300, "seller receives €83"
        assert s["influencer_cut_cents"]  == 700,  "Zeus influencer receives €7"
        assert s["platform_net_cents"]    == 0,    "platform net €0 (absorbs discount)"

    # Scenario 2: ELITE + Zeus + recurring
    def test_canonical_scenario_2_elite_zeus_recurring(self):
        s = calculate_order_split(
            total_cents=10000,
            seller_plan="ELITE",
            influencer_tier="zeus",
            is_first_purchase_via_influencer=False,
        )
        assert s["consumer_pays_cents"]   == 10000
        assert s["seller_payout_cents"]   == 8300
        assert s["influencer_cut_cents"]  == 700
        assert s["platform_net_cents"]    == 1000

    # Scenario 3: PRO + Hercules + first purchase
    def test_canonical_scenario_3_pro_hercules_first_purchase(self):
        s = calculate_order_split(
            total_cents=10000,
            seller_plan="PRO",
            influencer_tier="hercules",
            is_first_purchase_via_influencer=True,
        )
        assert s["consumer_pays_cents"]   == 9000
        assert s["seller_payout_cents"]   == 8200
        assert s["influencer_cut_cents"]  == 300
        assert s["platform_net_cents"]    == 500

    # Scenario 4: FREE + no influencer
    def test_canonical_scenario_4_free_no_influencer(self):
        s = calculate_order_split(
            total_cents=10000,
            seller_plan="FREE",
            influencer_tier=None,
            is_first_purchase_via_influencer=False,
        )
        assert s["consumer_pays_cents"]   == 10000
        assert s["seller_payout_cents"]   == 8000
        assert s["influencer_cut_cents"]  == 0
        assert s["platform_net_cents"]    == 2000
