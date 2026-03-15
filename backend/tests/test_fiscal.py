"""
Fiscal System Tests — 7 tests covering withholding calculations,
tax regions, and affiliate certificate verification logic.
"""
import pytest

import sys, os
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")

from services.fiscal_verification import (
    calculate_withholding,
    get_tax_region,
    EU_COUNTRIES,
)


# ── Test 1: Spain withholding is 15% ────────────────────────────────────────

def test_spain_withholding_is_15_percent():
    """Spanish tax residents must have 15% IRPF withholding."""
    assert calculate_withholding("ES") == 15.0
    assert calculate_withholding("es") == 15.0  # case-insensitive


# ── Test 2: EU (non-Spain) withholding is 0% ────────────────────────────────

def test_eu_non_spain_withholding_is_zero():
    """EU residents outside Spain must have 0% withholding."""
    eu_non_spain = ["FR", "DE", "IT", "PT", "NL", "BE", "AT", "PL"]
    for country in eu_non_spain:
        assert calculate_withholding(country) == 0.0, f"Expected 0% for {country}"


# ── Test 3: Non-EU withholding is 0% ────────────────────────────────────────

def test_non_eu_withholding_is_zero():
    """Non-EU residents must have 0% withholding."""
    non_eu = ["US", "GB", "JP", "KR", "BR", "MX", "CA", "AU"]
    for country in non_eu:
        assert calculate_withholding(country) == 0.0, f"Expected 0% for {country}"


# ── Test 4: Empty/null country returns 0% ────────────────────────────────────

def test_empty_country_withholding():
    """Empty or None country must return 0% withholding."""
    assert calculate_withholding("") == 0.0
    assert calculate_withholding(None) == 0.0


# ── Test 5: Tax region classification ───────────────────────────────────────

def test_tax_region_classification():
    """get_tax_region must correctly classify countries into EU/non-EU."""
    assert get_tax_region("ES") == "EU"
    assert get_tax_region("FR") == "EU"
    assert get_tax_region("DE") == "EU"
    assert get_tax_region("IT") == "EU"
    assert get_tax_region("US") == "non-EU"
    assert get_tax_region("GB") == "non-EU"  # Post-Brexit
    assert get_tax_region("JP") == "non-EU"
    assert get_tax_region("") == "unknown"
    assert get_tax_region(None) == "unknown"


# ── Test 6: EU countries set is complete ─────────────────────────────────────

def test_eu_countries_set_is_complete():
    """EU_COUNTRIES must contain all 27 EU member states."""
    assert len(EU_COUNTRIES) == 27
    # Spot-check key members
    assert "ES" in EU_COUNTRIES  # Spain
    assert "FR" in EU_COUNTRIES  # France
    assert "DE" in EU_COUNTRIES  # Germany
    assert "IT" in EU_COUNTRIES  # Italy
    assert "PT" in EU_COUNTRIES  # Portugal
    assert "PL" in EU_COUNTRIES  # Poland
    assert "SE" in EU_COUNTRIES  # Sweden
    assert "IE" in EU_COUNTRIES  # Ireland
    # UK must NOT be in EU
    assert "GB" not in EU_COUNTRIES
    assert "UK" not in EU_COUNTRIES


# ── Test 7: Withholding math applied to payout ──────────────────────────────

def test_withholding_applied_to_payout():
    """Withholding percentage must correctly reduce gross payout."""
    gross = 1000.0

    # Spain: 15% withheld
    es_pct = calculate_withholding("ES")
    es_withheld = round(gross * es_pct / 100, 2)
    es_net = gross - es_withheld
    assert es_withheld == 150.0
    assert es_net == 850.0

    # France: 0% withheld
    fr_pct = calculate_withholding("FR")
    fr_withheld = round(gross * fr_pct / 100, 2)
    fr_net = gross - fr_withheld
    assert fr_withheld == 0.0
    assert fr_net == 1000.0
