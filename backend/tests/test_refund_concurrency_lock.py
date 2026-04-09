from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from routes import orders


def _make_request(body: dict) -> Request:
    payload = json.dumps(body).encode("utf-8")

    async def receive() -> dict:
        return {"type": "http.request", "body": payload, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/payments/refund/order_test_123",
            "headers": [(b"content-type", b"application/json")],
        },
        receive,
    )


class _FakeOrdersCollection:
    def __init__(self, order_doc: dict):
        self._order_doc = order_doc

    class _Result:
        def __init__(self, matched_count: int):
            self.matched_count = matched_count
            self.modified_count = matched_count

    async def find_one(self, query: dict, projection: dict | None = None):
        if query.get("order_id") == self._order_doc.get("order_id"):
            return dict(self._order_doc)
        return None

    async def update_one(self, query: dict, update: dict):
        if query.get("order_id") != self._order_doc.get("order_id"):
            return self._Result(0)

        # Minimal matcher needed by refund lock tests.
        if "refund_processing" in query and self._order_doc.get("refund_processing") != query.get("refund_processing"):
            return self._Result(0)
        if "refund_processing_at" in query and self._order_doc.get("refund_processing_at") != query.get("refund_processing_at"):
            return self._Result(0)
        if "refund_lock_token" in query and self._order_doc.get("refund_lock_token") != query.get("refund_lock_token"):
            return self._Result(0)

        for key, value in update.get("$set", {}).items():
            self._order_doc[key] = value
        for key in update.get("$unset", {}).keys():
            self._order_doc.pop(key, None)

        return self._Result(1)


@pytest.mark.asyncio
async def test_refund_order_returns_409_when_lock_is_active(monkeypatch):
    order_doc = {
        "order_id": "order_test_123",
        "status": "paid",
        "total_amount": 100.0,
        "refunded_amount": 0.0,
        "payment_session_id": "cs_test_123",
        "refund_processing": True,
        "refund_processing_at": datetime.now(timezone.utc).isoformat(),
    }

    fake_db = SimpleNamespace(orders=_FakeOrdersCollection(order_doc))
    monkeypatch.setattr(orders, "db", fake_db)

    async def _allow_role(_user, _roles):
        return None

    monkeypatch.setattr(orders, "require_role", _allow_role)

    req = _make_request({"type": "full"})
    user = SimpleNamespace(user_id="admin_1", role="super_admin")

    with pytest.raises(HTTPException) as exc:
        await orders.refund_order("order_test_123", req, user)

    assert exc.value.status_code == 409
    assert "reembolso en curso" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_refund_order_reclaims_stale_lock_and_releases_on_stripe_error(monkeypatch):
    stale_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    order_doc = {
        "order_id": "order_test_123",
        "status": "paid",
        "total_amount": 100.0,
        "refunded_amount": 0.0,
        "payment_session_id": "cs_test_123",
        "refund_processing": True,
        "refund_processing_at": stale_time,
    }

    fake_orders = _FakeOrdersCollection(order_doc)
    fake_db = SimpleNamespace(orders=fake_orders)
    monkeypatch.setattr(orders, "db", fake_db)

    async def _allow_role(_user, _roles):
        return None

    monkeypatch.setattr(orders, "require_role", _allow_role)

    def _raise_stripe_error(_session_id):
        raise orders.stripe.error.StripeError("stripe-down")

    monkeypatch.setattr(orders.stripe.checkout.Session, "retrieve", _raise_stripe_error)

    req = _make_request({"type": "full"})
    user = SimpleNamespace(user_id="admin_1", role="super_admin")

    with pytest.raises(HTTPException) as exc:
        await orders.refund_order("order_test_123", req, user)

    # Stale lock is reclaimed (so no 409) and Stripe failure is surfaced.
    assert exc.value.status_code == 502
    assert "stripe" in str(exc.value.detail).lower()

    # Lock must be released even after Stripe failure.
    assert order_doc.get("refund_processing") is False
    assert "refund_lock_token" not in order_doc
    assert "refund_processing_at" not in order_doc
