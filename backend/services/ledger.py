"""
Financial Ledger — Append-only event log for accounting, tax, and audit.
Every financial event creates an immutable record. Never update, always append.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Tax rates by region ──────────────────────────────────────

EU_VAT_RATES = {
    "ES": 0.21, "FR": 0.20, "DE": 0.19, "IT": 0.22, "PT": 0.23,
    "NL": 0.21, "BE": 0.21, "AT": 0.20, "IE": 0.23, "GR": 0.24,
    "PL": 0.23, "SE": 0.25, "DK": 0.25, "FI": 0.24, "NO": 0.25,
}

US_STATE_TAX = {
    "CA": 0.0725, "NY": 0.08, "TX": 0.0625, "FL": 0.06, "WA": 0.065,
    "IL": 0.0625, "PA": 0.06, "OH": 0.0575, "GA": 0.04, "NC": 0.0475,
    "NJ": 0.06625, "VA": 0.053, "MA": 0.0625, "AZ": 0.056, "CO": 0.029,
    "OR": 0.0, "MT": 0.0, "NH": 0.0, "DE": 0.0,  # No sales tax
}

KR_VAT_RATE = 0.10

# ── Approximate exchange rates to USD ─
# TODO: Replace with live rates from a config collection or external API.
# These static rates are for fallback/estimation only and MUST NOT be used for billing.

EXCHANGE_RATES_TO_USD = {
    "USD": 1.0, "EUR": 1.08, "GBP": 1.27, "JPY": 0.0067,
    "KRW": 0.00075, "CNY": 0.14, "INR": 0.012, "AED": 0.27,
    "SAR": 0.27, "BRL": 0.17, "MXN": 0.056, "CAD": 0.74,
    "AUD": 0.65, "NZD": 0.61, "CHF": 1.13, "SEK": 0.096,
    "NOK": 0.094, "DKK": 0.145, "PLN": 0.25, "CZK": 0.043,
    "HUF": 0.0027, "RON": 0.22, "TRY": 0.031, "SGD": 0.75,
    "HKD": 0.13, "TWD": 0.031, "THB": 0.028, "MYR": 0.22,
    "PHP": 0.018, "IDR": 0.000063, "VND": 0.00004, "ILS": 0.28,
    "QAR": 0.27, "KWD": 3.26, "ZAR": 0.055, "NGN": 0.00065,
    "EGP": 0.021, "MAD": 0.1, "ARS": 0.001, "CLP": 0.0011,
    "COP": 0.00024, "PEN": 0.27, "BGN": 0.55, "ISK": 0.0072, "RUB": 0.011, "CRC": 0.002, "UYU": 0.024,
}


def _to_usd(amount: float, currency: str) -> float:
    rate = EXCHANGE_RATES_TO_USD.get(currency.upper(), 1.0)
    return round(amount * rate, 2)


def _get_tax_info(buyer_country: str, buyer_state: Optional[str], seller_country: Optional[str], amount: float):
    """Determine tax type, rate, and amount based on jurisdictions."""
    country = (buyer_country or "").upper()

    # Korea
    if country == "KR":
        rate = KR_VAT_RATE
        return {
            "tax_type": "KR_VAT",
            "vat_rate_applied": rate,
            "product_tax_amount": int(round(amount * rate * 100)) / 100,
            "reverse_charge_applied": False,
        }

    # EU
    if country in EU_VAT_RATES:
        rate = EU_VAT_RATES[country]
        # B2B reverse charge: if seller is in EU but different country and buyer has VAT ID
        # (simplified — full VAT ID validation is a future feature)
        reverse = False
        seller_c = (seller_country or "").upper()
        if seller_c in EU_VAT_RATES and seller_c != country:
            reverse = True  # structure ready for future VAT ID check
        return {
            "tax_type": "EU_VAT",
            "vat_rate_applied": rate,
            "product_tax_amount": int(round(amount * rate * 100)) / 100,
            "reverse_charge_applied": reverse,
        }

    # US
    if country == "US":
        state = (buyer_state or "").upper()
        rate = US_STATE_TAX.get(state, 0.0)
        return {
            "tax_type": "US_SALES_TAX",
            "vat_rate_applied": rate,
            "product_tax_amount": int(round(amount * rate * 100)) / 100,
            "reverse_charge_applied": False,
            "buyer_state": state,
            "sales_tax_rate": rate,
        }

    # Default: no tax calculated (buyer responsibility)
    return {
        "tax_type": "NONE",
        "vat_rate_applied": 0,
        "product_tax_amount": 0,
        "reverse_charge_applied": False,
    }


async def write_ledger_event(
    db,
    event_type: str,
    order_id: str,
    currency: str,
    product_subtotal: float = 0,
    platform_fee: float = 0,
    stripe_fee: float = 0,
    seller_net: float = 0,
    influencer_amount: float = 0,
    seller_id: str = "",
    influencer_id: str = "",
    buyer_id: str = "",
    buyer_country: str = "",
    buyer_state: str = "",
    seller_country: str = "",
    seller_tax_id: str = "",
    transfer_id: str = "",
    status: str = "completed",
    extra: dict = None,
):
    """Create an immutable ledger entry. NEVER update existing entries."""
    tax = _get_tax_info(buyer_country, buyer_state, seller_country, product_subtotal)
    usd_equiv = _to_usd(product_subtotal, currency)
    rate = EXCHANGE_RATES_TO_USD.get(currency.upper(), 1.0)

    platform_tax = _get_tax_info(buyer_country, buyer_state, seller_country, platform_fee)

    entry = {
        "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "order_id": order_id,

        "seller_id": seller_id,
        "influencer_id": influencer_id,
        "buyer_id": buyer_id,

        "currency": currency.upper(),
        "exchange_rate_to_usd": rate,
        "usd_equivalent": usd_equiv,

        "product_subtotal": round(product_subtotal, 2),
        "product_tax_amount": tax.get("product_tax_amount", 0),
        "product_tax_type": tax.get("tax_type", "NONE"),

        "platform_fee": round(platform_fee, 2),
        "platform_tax_amount": platform_tax.get("product_tax_amount", 0),
        "platform_tax_type": platform_tax.get("tax_type", "NONE"),

        "stripe_fee": round(stripe_fee, 2),

        "seller_net": round(seller_net, 2),
        "influencer_amount": round(influencer_amount, 2),
        "platform_net": round(platform_fee - influencer_amount, 2),

        "buyer_country": buyer_country,
        "buyer_state": buyer_state or "",
        "seller_country": seller_country,
        "seller_tax_id": seller_tax_id,

        "vat_rate_applied": tax.get("vat_rate_applied", 0),
        "reverse_charge_applied": tax.get("reverse_charge_applied", False),

        "transfer_id": transfer_id,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if extra:
        entry.update(extra)

    try:
        await db.financial_ledger.insert_one(entry)
    except Exception as e:
        logger.error(f"[LEDGER] CRITICAL — Failed to write ledger entry for order {order_id}: {e}")
        raise
    logger.info(f"[LEDGER] {event_type} for order {order_id}: {product_subtotal} {currency}")
    return entry
