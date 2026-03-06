from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from pydantic import ValidationError

from routers.auth import _normalize_user_role
from schemas import RegisterRequest


def test_register_request_accepts_customer_role():
    payload = RegisterRequest(
        email="test@example.com",
        password="Password1",
        full_name="Test User",
        role="customer",
    )
    assert payload.role == "customer"


def test_register_request_rejects_unknown_role():
    try:
        RegisterRequest(
            email="test@example.com",
            password="Password1",
            full_name="Test User",
            role="invalid_role",
        )
    except ValidationError:
        return
    raise AssertionError("Expected invalid role to raise ValidationError")


def test_normalize_user_role_maps_buyer_and_customer():
    assert _normalize_user_role("buyer") == "customer"
    assert _normalize_user_role("customer") == "customer"
    assert _normalize_user_role("producer") == "producer"
