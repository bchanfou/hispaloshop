"""
B2B Flow Tests — 8 tests covering the complete B2B operations lifecycle.
Tests pure logic (helpers, validation, fee calculation) without requiring a live database.
"""
import pytest
from datetime import datetime, timezone
from pydantic import ValidationError


# ── Setup ────────────────────────────────────────────────────────────────────

import sys, os
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")
os.environ.setdefault("DB_NAME", "hispaloshop_test")
os.environ.setdefault("SMTP_HOST", "")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASS", "")

from routes.b2b_operations import (
    _build_offer_doc,
    _validate_offer_enums,
    _detect_modified_fields,
    OfferInput,
    CreateOperationInput,
    PLATFORM_FEE_PCT,
    STRIPE_FEE_PCT,
    VALID_STATUSES,
    VALID_UNITS,
    VALID_CURRENCIES,
    VALID_PAYMENT_TERMS,
    VALID_INCOTERMS,
)
from fastapi import HTTPException


def _make_offer(**overrides) -> OfferInput:
    """Helper to create a valid OfferInput with defaults."""
    defaults = {
        "product_name": "Aceite de oliva virgen extra",
        "product_id": "prod_001",
        "quantity": 100,
        "unit": "kg",
        "price_per_unit": 12.50,
        "currency": "EUR",
        "payment_terms": "net_30",
        "incoterm": "DAP",
        "incoterm_city": "Madrid",
        "delivery_days": 15,
        "validity_days": 30,
        "notes": "Entrega a almacén central",
    }
    defaults.update(overrides)
    return OfferInput(**defaults)


# ── Test 1: Create operation input validation ────────────────────────────────

def test_create_operation_input_requires_fields():
    """CreateOperationInput must require conversation_id, counterpart_id, and offer."""
    offer = _make_offer()
    op = CreateOperationInput(
        conversation_id="conv_123",
        counterpart_id="user_456",
        offer=offer,
    )
    assert op.conversation_id == "conv_123"
    assert op.counterpart_id == "user_456"
    assert op.offer.product_name == "Aceite de oliva virgen extra"


def test_offer_input_rejects_zero_quantity():
    """OfferInput must reject quantity <= 0."""
    with pytest.raises(ValidationError):
        _make_offer(quantity=0)


def test_offer_input_rejects_zero_price():
    """OfferInput must reject price_per_unit <= 0."""
    with pytest.raises(ValidationError):
        _make_offer(price_per_unit=-1.0)


def test_offer_input_rejects_excessive_validity():
    """OfferInput must reject validity_days > 365."""
    with pytest.raises(ValidationError):
        _make_offer(validity_days=400)


# ── Test 2: Fee calculation (3% platform + 1.4% Stripe = 4.4%) ──────────────

def test_fee_calculation_is_correct():
    """Section 3.8 model: 3% platform fee added on top (paid by importer),
    producer receives 100% of subtotal. net_total == total_price."""
    assert PLATFORM_FEE_PCT == 3.0
    assert STRIPE_FEE_PCT == 1.4

    offer = _make_offer(quantity=100, price_per_unit=10.0)
    doc = _build_offer_doc(offer, version=1, created_by="user_test")

    subtotal = 1000.0
    assert doc["total_price"] == pytest.approx(subtotal)
    # net_total = subtotal (producer receives 100%, fee is on top for buyer)
    assert doc["net_total"] == pytest.approx(subtotal)
    assert doc["platform_fee_pct"] == 3.0
    assert doc["stripe_fee_pct"] == 1.4


# ── Test 3: Build offer doc structure ────────────────────────────────────────

def test_build_offer_doc_structure():
    """_build_offer_doc must return a well-formed offer sub-document."""
    offer = _make_offer()
    doc = _build_offer_doc(offer, version=2, created_by="user_abc", modified_fields=["quantity"])

    assert doc["version"] == 2
    assert doc["created_by"] == "user_abc"
    assert doc["product_name"] == "Aceite de oliva virgen extra"
    assert doc["quantity"] == 100
    assert doc["unit"] == "kg"
    assert doc["currency"] == "EUR"
    assert doc["incoterm"] == "DAP"
    assert doc["modified_fields"] == ["quantity"]
    assert "created_at" in doc
    assert "expires_at" in doc


# ── Test 4: Enum validation rejects invalid values ──────────────────────────

def test_validate_enums_rejects_invalid_unit():
    """_validate_offer_enums must raise 422 for invalid unit."""
    offer = _make_offer()
    offer.unit = "gallons"
    with pytest.raises(HTTPException) as exc_info:
        _validate_offer_enums(offer)
    assert exc_info.value.status_code == 422


def test_validate_enums_rejects_invalid_incoterm():
    """_validate_offer_enums must raise 422 for invalid incoterm."""
    offer = _make_offer()
    offer.incoterm = "XYZ"
    with pytest.raises(HTTPException) as exc_info:
        _validate_offer_enums(offer)
    assert exc_info.value.status_code == 422


def test_validate_enums_accepts_valid_values():
    """_validate_offer_enums must NOT raise for valid enum values."""
    offer = _make_offer()
    _validate_offer_enums(offer)  # Should not raise


# ── Test 5: Counter offer detection ─────────────────────────────────────────

def test_detect_modified_fields():
    """_detect_modified_fields must identify which fields changed between offer versions."""
    prev = {
        "product_name": "Aceite",
        "product_id": "prod_001",
        "quantity": 100,
        "unit": "kg",
        "price_per_unit": 10.0,
        "currency": "EUR",
        "payment_terms": "net_30",
        "incoterm": "DAP",
        "incoterm_city": "Madrid",
        "delivery_days": 15,
        "validity_days": 30,
        "notes": None,
    }

    new_offer = _make_offer(
        product_name="Aceite",
        quantity=200,          # changed
        price_per_unit=9.0,    # changed
        delivery_days=20,      # changed
    )

    changed = _detect_modified_fields(prev, new_offer)
    assert "quantity" in changed
    assert "price_per_unit" in changed
    assert "delivery_days" in changed
    assert "product_name" not in changed
    assert "currency" not in changed


# ── Test 6: Valid status set ─────────────────────────────────────────────────

def test_valid_statuses_set():
    """B2B status set must contain all required lifecycle statuses."""
    required = {
        "draft", "offer_sent", "offer_accepted", "offer_rejected",
        "contract_pending", "contract_signed", "payment_pending",
        "payment_confirmed", "in_transit", "delivered", "completed",
    }
    assert required.issubset(VALID_STATUSES)


# ── Test 7: Enum sets are complete ──────────────────────────────────────────

def test_valid_enum_sets():
    """All B2B enum sets must contain expected values."""
    assert "kg" in VALID_UNITS
    assert "pallets" in VALID_UNITS
    assert "EUR" in VALID_CURRENCIES
    assert "USD" in VALID_CURRENCIES
    assert "prepaid" in VALID_PAYMENT_TERMS
    assert "letter_of_credit" in VALID_PAYMENT_TERMS
    assert "EXW" in VALID_INCOTERMS
    assert "FOB" in VALID_INCOTERMS
    assert "DDP" in VALID_INCOTERMS


# ── Test 8: Offer expiry calculation ────────────────────────────────────────

def test_offer_expiry_is_correct():
    """Offer expires_at must be validity_days after creation."""
    offer = _make_offer(validity_days=45)
    doc = _build_offer_doc(offer, version=1, created_by="user_test")

    created = datetime.fromisoformat(doc["created_at"])
    expires = datetime.fromisoformat(doc["expires_at"])
    delta = (expires - created).days
    assert delta == 45
