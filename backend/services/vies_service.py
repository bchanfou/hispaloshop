"""
VIES (VAT Information Exchange System) — EU VAT ID validation.
Uses the European Commission's free API to verify VAT numbers.
Required for legally applying reverse charge on B2B cross-border EU transactions.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from core.database import db

logger = logging.getLogger(__name__)

# VIES REST endpoint (replaces old SOAP endpoint)
VIES_API_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number"

# EU country codes for VAT validation
EU_COUNTRIES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
}

# Basic format validation per country (prefix + digits pattern)
VAT_FORMAT = {
    "AT": r"^ATU\d{8}$",
    "BE": r"^BE[01]\d{9}$",
    "BG": r"^BG\d{9,10}$",
    "HR": r"^HR\d{11}$",
    "CY": r"^CY\d{8}[A-Z]$",
    "CZ": r"^CZ\d{8,10}$",
    "DK": r"^DK\d{8}$",
    "EE": r"^EE\d{9}$",
    "FI": r"^FI\d{8}$",
    "FR": r"^FR[A-Z0-9]{2}\d{9}$",
    "DE": r"^DE\d{9}$",
    "GR": r"^EL\d{9}$",
    "HU": r"^HU\d{8}$",
    "IE": r"^IE\d{7}[A-Z]{1,2}$",
    "IT": r"^IT\d{11}$",
    "LV": r"^LV\d{11}$",
    "LT": r"^LT(\d{9}|\d{12})$",
    "LU": r"^LU\d{8}$",
    "MT": r"^MT\d{8}$",
    "NL": r"^NL\d{9}B\d{2}$",
    "PL": r"^PL\d{10}$",
    "PT": r"^PT\d{9}$",
    "RO": r"^RO\d{2,10}$",
    "SK": r"^SK\d{10}$",
    "SI": r"^SI\d{8}$",
    "ES": r"^ES[A-Z0-9]\d{7}[A-Z0-9]$",
    "SE": r"^SE\d{12}$",
}


def validate_vat_format(vat_number: str) -> tuple[bool, str, str]:
    """
    Validate VAT number format locally (no API call).
    Returns (is_valid, country_code, cleaned_number).
    """
    cleaned = re.sub(r"[\s\.\-]", "", vat_number.upper())
    if len(cleaned) < 4:
        return False, "", cleaned

    # Extract country prefix (2 chars)
    prefix = cleaned[:2]

    # Greece uses EL prefix
    country = "GR" if prefix == "EL" else prefix

    if country not in EU_COUNTRIES:
        return False, country, cleaned

    pattern = VAT_FORMAT.get(country)
    if pattern and not re.match(pattern, cleaned):
        return False, country, cleaned

    return True, country, cleaned


async def verify_vat_vies(vat_number: str) -> dict:
    """
    Verify a VAT number against VIES (European Commission API).
    Returns verification result with caching (24h).
    """
    is_valid_format, country_code, cleaned = validate_vat_format(vat_number)
    if not is_valid_format:
        return {
            "valid": False,
            "vat_number": cleaned,
            "country_code": country_code,
            "error": "Invalid VAT number format",
            "source": "format_check",
        }

    # Check cache (24h TTL)
    cached = await db.vat_verifications.find_one(
        {"vat_number": cleaned, "verified_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}},
        {"_id": 0},
    )
    if cached:
        return cached

    # Call VIES API
    import httpx

    # VIES expects country code and number separately
    vies_country = "EL" if country_code == "GR" else country_code
    vat_body = cleaned[2:]  # Strip country prefix

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                VIES_API_URL,
                json={"countryCode": vies_country, "vatNumber": vat_body},
            )

        if response.status_code == 200:
            data = response.json()
            result = {
                "valid": data.get("valid", False),
                "vat_number": cleaned,
                "country_code": country_code,
                "company_name": data.get("name", ""),
                "company_address": data.get("address", ""),
                "request_date": data.get("requestDate", ""),
                "source": "VIES",
                "verified_at": datetime.now(timezone.utc),
            }
        else:
            # VIES returns non-200 for various reasons (maintenance, invalid format, etc.)
            result = {
                "valid": False,
                "vat_number": cleaned,
                "country_code": country_code,
                "error": f"VIES returned {response.status_code}",
                "source": "VIES",
                "verified_at": datetime.now(timezone.utc),
            }

    except Exception as e:
        logger.warning("[VIES] API call failed for %s: %s", cleaned, e)
        result = {
            "valid": False,
            "vat_number": cleaned,
            "country_code": country_code,
            "error": f"VIES unavailable: {str(e)[:200]}",
            "source": "VIES_error",
            "verified_at": datetime.now(timezone.utc),
        }

    # Cache result
    try:
        await db.vat_verifications.update_one(
            {"vat_number": cleaned},
            {"$set": result},
            upsert=True,
        )
    except Exception:
        pass

    return result


def should_apply_reverse_charge(
    seller_country: str,
    buyer_country: str,
    buyer_vat_verified: bool,
) -> bool:
    """
    Determine if EU VAT reverse charge applies.
    Requires: both parties in EU, different countries, buyer has verified VAT ID.
    """
    seller_c = (seller_country or "").upper()
    buyer_c = (buyer_country or "").upper()

    if seller_c not in EU_COUNTRIES or buyer_c not in EU_COUNTRIES:
        return False
    if seller_c == buyer_c:
        return False
    if not buyer_vat_verified:
        return False

    return True
