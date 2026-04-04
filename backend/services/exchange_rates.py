"""
Exchange Rate Service — Daily ECB rates stored in MongoDB.
Fetches from the European Central Bank (free, no API key required).
Ledger and analytics use these for USD equivalent calculations.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Optional
from xml.etree import ElementTree

from core.database import db

logger = logging.getLogger(__name__)

# ECB publishes daily rates for ~30 currencies against EUR
ECB_DAILY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
ECB_NS = {"gesmes": "http://www.gesmes.org/xml/2002-08-01", "eurofxref": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}

# Static fallback rates — ONLY used on first boot when DB has no rates yet.
# Once the first cron runs, these are never read again.
FALLBACK_RATES_TO_USD = {
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
    "COP": 0.00024, "PEN": 0.27, "BGN": 0.55, "ISK": 0.0072,
    "RUB": 0.011, "CRC": 0.002, "UYU": 0.024,
}


async def fetch_ecb_rates() -> Dict[str, float]:
    """
    Fetch daily exchange rates from ECB XML feed.
    Returns dict of {currency_code: rate_vs_EUR} (e.g. {"USD": 1.0834, "GBP": 0.8567}).
    """
    import httpx

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(ECB_DAILY_URL)
        response.raise_for_status()

    root = ElementTree.fromstring(response.text)
    cube = root.find(".//eurofxref:Cube/eurofxref:Cube", ECB_NS)
    if cube is None:
        raise ValueError("ECB XML: could not find Cube element")

    rates_vs_eur = {"EUR": 1.0}
    for child in cube:
        currency = child.attrib.get("currency")
        rate = child.attrib.get("rate")
        if currency and rate:
            rates_vs_eur[currency] = float(rate)

    return rates_vs_eur


def convert_ecb_to_usd(rates_vs_eur: Dict[str, float]) -> Dict[str, float]:
    """Convert ECB rates (vs EUR) to rates vs USD for ledger compatibility."""
    eur_to_usd = rates_vs_eur.get("USD", 1.08)
    rates_to_usd = {}
    for currency, rate_vs_eur in rates_vs_eur.items():
        if currency == "USD":
            rates_to_usd["USD"] = 1.0
        elif currency == "EUR":
            rates_to_usd["EUR"] = eur_to_usd
        else:
            # rate_vs_eur = how many units of currency per 1 EUR
            # We want: 1 unit of currency = X USD
            rates_to_usd[currency] = round(eur_to_usd / rate_vs_eur, 8)
    return rates_to_usd


async def update_exchange_rates() -> Dict:
    """
    Fetch from ECB, convert to USD base, store in DB.
    Returns the stored document for logging/confirmation.
    """
    rates_vs_eur = await fetch_ecb_rates()
    rates_to_usd = convert_ecb_to_usd(rates_vs_eur)
    now = datetime.now(timezone.utc)

    doc = {
        "date": now.strftime("%Y-%m-%d"),
        "source": "ECB",
        "base": "USD",
        "rates": rates_to_usd,
        "rates_vs_eur": rates_vs_eur,
        "fetched_at": now,
    }

    # Upsert by date — one record per day
    await db.exchange_rates.update_one(
        {"date": doc["date"]},
        {"$set": doc},
        upsert=True,
    )

    logger.info("[EXCHANGE] Updated %d rates from ECB for %s", len(rates_to_usd), doc["date"])
    return doc


async def get_rate_to_usd(currency: str) -> float:
    """
    Get the latest exchange rate for a currency to USD.
    Reads from DB (latest by date). Falls back to static rates on first boot.
    """
    currency = currency.upper()
    if currency == "USD":
        return 1.0

    # Try latest from DB
    latest = await db.exchange_rates.find_one(
        {"base": "USD"},
        sort=[("date", -1)],
        projection={"rates": 1},
    )

    if latest and latest.get("rates"):
        rate = latest["rates"].get(currency)
        if rate is not None:
            return rate

    # Fallback to static (log warning — this should only happen on first boot)
    logger.warning("[EXCHANGE] Using static fallback rate for %s — run update_exchange_rates cron", currency)
    return FALLBACK_RATES_TO_USD.get(currency, 1.0)


async def get_all_rates_to_usd() -> Dict[str, float]:
    """Get all latest rates to USD. For analytics dashboards."""
    latest = await db.exchange_rates.find_one(
        {"base": "USD"},
        sort=[("date", -1)],
        projection={"rates": 1},
    )
    if latest and latest.get("rates"):
        return latest["rates"]

    logger.warning("[EXCHANGE] No rates in DB — returning static fallback")
    return FALLBACK_RATES_TO_USD.copy()
