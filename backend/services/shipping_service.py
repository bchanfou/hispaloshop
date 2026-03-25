from __future__ import annotations

from dataclasses import dataclass
from typing import Any


TAX_RATES_BP: dict[str, int] = {
    "ES": 2100,  # 21%
}
DEFAULT_TAX_RATE_BP = 2100


@dataclass(slots=True)
class ShippingPolicy:
    enabled: bool
    base_cost_cents: int
    per_item_cents: int
    free_threshold_cents: int | None = None


class ShippingService:
    @staticmethod
    def get_tax_rate_bp(country_code: str | None) -> int:
        if not country_code:
            return DEFAULT_TAX_RATE_BP
        return TAX_RATES_BP.get(country_code.upper(), DEFAULT_TAX_RATE_BP)

    @staticmethod
    def calculate_tax_cents(taxable_amount_cents: int, tax_rate_bp: int) -> int:
        if taxable_amount_cents <= 0 or tax_rate_bp <= 0:
            return 0
        return int(round((taxable_amount_cents * tax_rate_bp) / 10000))

    @staticmethod
    def calculate_shipping_cents(policy: ShippingPolicy, item_count: int, subtotal_cents: int) -> int:
        if not policy.enabled:
            return 0
        if policy.free_threshold_cents is not None and subtotal_cents >= policy.free_threshold_cents:
            return 0
        return max(0, int(policy.base_cost_cents) + max(0, int(item_count)) * int(policy.per_item_cents))

    @staticmethod
    def calculate_order_totals(
        *,
        subtotal_cents: int,
        shipping_cents: int,
        tax_rate_bp: int,
    ) -> dict[str, int]:
        # Spain B2C: prices INCLUDE IVA. Tax is informational only.
        # Total = subtotal + shipping (no tax added on top).
        # tax_cents = how much of the subtotal is IVA (extracted, not added).
        subtotal_safe = max(0, subtotal_cents)
        shipping_safe = max(0, shipping_cents)
        # Extract IVA from IVA-inclusive price: tax = price * rate / (10000 + rate)
        tax_cents = int(round((subtotal_safe * tax_rate_bp) / (10000 + tax_rate_bp))) if tax_rate_bp > 0 else 0
        total_cents = subtotal_safe + shipping_safe
        return {
            "subtotal_cents": subtotal_safe,
            "shipping_cents": shipping_safe,
            "taxable_amount_cents": subtotal_safe,
            "tax_cents": tax_cents,
            "total_cents": total_cents,
            "tax_rate_bp": tax_rate_bp,
        }

    @staticmethod
    def policy_from_user(user: Any) -> ShippingPolicy:
        return ShippingPolicy(
            enabled=bool(getattr(user, "shipping_policy_enabled", False)),
            base_cost_cents=int(getattr(user, "shipping_base_cost_cents", 0) or 0),
            per_item_cents=int(getattr(user, "shipping_per_item_cents", 0) or 0),
            free_threshold_cents=(
                int(getattr(user, "shipping_free_threshold_cents", 0))
                if getattr(user, "shipping_free_threshold_cents", None) is not None
                else None
            ),
        )

