"""
Business document format validation by country.
Validates format/checksum of official business registration numbers.
Used in producer verification flow before AI review.
"""
import re
import logging

logger = logging.getLogger(__name__)


def validate_business_id(country: str, document_number: str) -> dict:
    """
    Validate a business identification number format for a given country.
    Returns { valid: bool, formatted: str, error: str|None, country: str }
    """
    country = (country or "").upper()
    cleaned = re.sub(r"[\s\.\-/]", "", document_number.strip().upper())

    validator = COUNTRY_VALIDATORS.get(country)
    if not validator:
        # Country not yet supported — pass through (AI will review)
        return {
            "valid": True,
            "formatted": cleaned,
            "error": None,
            "country": country,
            "validation_level": "none",
            "note": f"No format validator for country {country} — AI review required",
        }

    return validator(cleaned, country)


# ── Spain: NIF/CIF ──────────────────────────────────────────

def _validate_spain(doc: str, country: str) -> dict:
    """
    NIF (personas): 8 digits + letter (DNI checksum)
    CIF (empresas): letter + 7 digits + check (letter or digit)
    NIE (extranjeros): X/Y/Z + 7 digits + letter
    """
    result = {"formatted": doc, "country": country, "validation_level": "checksum"}

    # NIF: 8 digits + letter
    if re.match(r"^\d{8}[A-Z]$", doc):
        expected = "TRWAGMYFPDXBNJZSQVHLCKE"[int(doc[:8]) % 23]
        if doc[8] == expected:
            return {**result, "valid": True, "error": None, "type": "NIF"}
        return {**result, "valid": False, "error": f"NIF checksum invalid: expected {expected}, got {doc[8]}"}

    # NIE: X/Y/Z + 7 digits + letter
    if re.match(r"^[XYZ]\d{7}[A-Z]$", doc):
        prefix_map = {"X": "0", "Y": "1", "Z": "2"}
        num = int(prefix_map[doc[0]] + doc[1:8])
        expected = "TRWAGMYFPDXBNJZSQVHLCKE"[num % 23]
        if doc[8] == expected:
            return {**result, "valid": True, "error": None, "type": "NIE"}
        return {**result, "valid": False, "error": f"NIE checksum invalid"}

    # CIF: letter + 7 digits + control (letter or digit)
    if re.match(r"^[ABCDEFGHJKLMNPQRSUVW]\d{7}[A-Z0-9]$", doc):
        digits = [int(d) for d in doc[1:8]]
        even_sum = sum(digits[1::2])
        odd_sum = 0
        for d in digits[0::2]:
            doubled = d * 2
            odd_sum += doubled // 10 + doubled % 10
        total = even_sum + odd_sum
        control_digit = (10 - total % 10) % 10
        control_letter = "JABCDEFGHI"[control_digit]
        if doc[8] == str(control_digit) or doc[8] == control_letter:
            return {**result, "valid": True, "error": None, "type": "CIF"}
        return {**result, "valid": False, "error": "CIF control digit invalid"}

    return {**result, "valid": False, "error": "Unrecognized Spanish ID format (expected NIF/CIF/NIE)"}


# ── USA: EIN ──────────────────────────────────────────────

def _validate_usa(doc: str, country: str) -> dict:
    """EIN format: XX-XXXXXXX (9 digits, first 2 are campus code)."""
    result = {"formatted": doc, "country": country, "validation_level": "format"}
    cleaned = re.sub(r"-", "", doc)
    if not re.match(r"^\d{9}$", cleaned):
        return {**result, "valid": False, "error": "EIN must be 9 digits"}
    # IRS campus prefixes (valid first 2 digits)
    valid_prefixes = {
        "01", "02", "03", "04", "05", "06", "10", "11", "12", "13", "14", "15",
        "16", "20", "21", "22", "23", "24", "25", "26", "27", "30", "32", "33",
        "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45",
        "46", "47", "48", "50", "51", "52", "53", "54", "55", "56", "57", "58",
        "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "71", "72",
        "73", "74", "75", "76", "77", "80", "81", "82", "83", "84", "85", "86",
        "87", "88", "90", "91", "92", "93", "94", "95", "98", "99",
    }
    prefix = cleaned[:2]
    if prefix not in valid_prefixes:
        return {**result, "valid": False, "error": f"EIN prefix {prefix} is not a valid IRS campus code"}
    return {**result, "valid": True, "error": None, "type": "EIN", "formatted": f"{cleaned[:2]}-{cleaned[2:]}"}


# ── France: SIRET ─────────────────────────────────────────

def _validate_france(doc: str, country: str) -> dict:
    """SIRET: 14 digits. SIREN (first 9) validated with Luhn algorithm."""
    result = {"formatted": doc, "country": country, "validation_level": "checksum"}
    if not re.match(r"^\d{14}$", doc):
        if re.match(r"^\d{9}$", doc):
            # SIREN only (no establishment suffix)
            return {**result, "valid": True, "error": None, "type": "SIREN",
                    "note": "SIREN provided (9 digits) — SIRET (14 digits) preferred"}
        return {**result, "valid": False, "error": "SIRET must be 14 digits (or SIREN 9 digits)"}

    # Luhn check on full SIRET
    digits = [int(d) for d in doc]
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    if total % 10 != 0:
        return {**result, "valid": False, "error": "SIRET Luhn checksum invalid"}
    return {**result, "valid": True, "error": None, "type": "SIRET"}


# ── South Korea: 사업자등록번호 ───────────────────────────

def _validate_korea(doc: str, country: str) -> dict:
    """Korean Business Registration Number: 10 digits with mod-10 checksum."""
    result = {"formatted": doc, "country": country, "validation_level": "checksum"}
    if not re.match(r"^\d{10}$", doc):
        return {**result, "valid": False, "error": "Must be 10 digits"}

    digits = [int(d) for d in doc]
    weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    total = sum(d * w for d, w in zip(digits[:9], weights))
    total += (digits[8] * 5) // 10
    check = (10 - total % 10) % 10
    if check != digits[9]:
        return {**result, "valid": False, "error": "Checksum invalid"}
    return {**result, "valid": True, "error": None, "type": "BRN"}


# ── Italy: Partita IVA ───────────────────────────────────

def _validate_italy(doc: str, country: str) -> dict:
    """Italian VAT (Partita IVA): 11 digits with Luhn-like checksum."""
    result = {"formatted": doc, "country": country, "validation_level": "checksum"}
    if not re.match(r"^\d{11}$", doc):
        return {**result, "valid": False, "error": "Partita IVA must be 11 digits"}

    digits = [int(d) for d in doc]
    even_sum = sum(digits[0::2])
    odd_sum = 0
    for d in digits[1::2]:
        doubled = d * 2
        odd_sum += doubled // 10 + doubled % 10
    check = (10 - (even_sum + odd_sum) % 10) % 10
    if check != digits[10]:
        return {**result, "valid": False, "error": "Partita IVA checksum invalid"}
    return {**result, "valid": True, "error": None, "type": "P.IVA"}


# ── Portugal: NIF ─────────────────────────────────────────

def _validate_portugal(doc: str, country: str) -> dict:
    """Portuguese NIF: 9 digits with mod-11 checksum."""
    result = {"formatted": doc, "country": country, "validation_level": "checksum"}
    if not re.match(r"^\d{9}$", doc):
        return {**result, "valid": False, "error": "NIF must be 9 digits"}

    digits = [int(d) for d in doc]
    weights = [9, 8, 7, 6, 5, 4, 3, 2]
    total = sum(d * w for d, w in zip(digits[:8], weights))
    check = 11 - total % 11
    if check >= 10:
        check = 0
    if check != digits[8]:
        return {**result, "valid": False, "error": "NIF checksum invalid"}
    return {**result, "valid": True, "error": None, "type": "NIF"}


# ── Germany: Steuernummer / USt-IdNr ─────────────────────

def _validate_germany(doc: str, country: str) -> dict:
    """German tax IDs: USt-IdNr (DE + 9 digits) or Steuernummer (10-13 digits)."""
    result = {"formatted": doc, "country": country, "validation_level": "format"}
    # USt-IdNr
    if re.match(r"^DE\d{9}$", doc):
        return {**result, "valid": True, "error": None, "type": "USt-IdNr"}
    # Steuernummer (varies by Bundesland, 10-13 digits)
    if re.match(r"^\d{10,13}$", doc):
        return {**result, "valid": True, "error": None, "type": "Steuernummer"}
    return {**result, "valid": False, "error": "Expected DE+9 digits (USt-IdNr) or 10-13 digit Steuernummer"}


# ── Registry ──────────────────────────────────────────────

COUNTRY_VALIDATORS = {
    "ES": _validate_spain,
    "US": _validate_usa,
    "FR": _validate_france,
    "KR": _validate_korea,
    "IT": _validate_italy,
    "PT": _validate_portugal,
    "DE": _validate_germany,
}
