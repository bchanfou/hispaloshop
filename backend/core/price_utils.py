"""
Centralized price ↔ cents conversion helpers.

Usage:
    from core.price_utils import price_to_cents, cents_to_price
"""


def price_to_cents(price: float) -> int:
    """Convert a decimal price (e.g. 12.99) to integer cents (1299)."""
    return int(round(price * 100))


def cents_to_price(cents: int) -> float:
    """Convert integer cents (1299) to a decimal price (12.99)."""
    return round(cents / 100, 2)
