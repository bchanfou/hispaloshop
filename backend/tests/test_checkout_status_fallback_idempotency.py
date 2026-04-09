from __future__ import annotations

from copy import deepcopy
from types import SimpleNamespace

import pytest

from routes import orders


class _Collection:
    def __init__(self, docs: list[dict] | None = None):
        self.docs = docs or []

    async def find_one(self, query: dict, projection: dict | None = None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return deepcopy(doc)
        return None

    async def update_one(self, query: dict, update: dict):
        for idx, doc in enumerate(self.docs):
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    for key, value in update["$set"].items():
                        doc[key] = value
                if "$unset" in update:
                    for key in update["$unset"].keys():
                        doc.pop(key, None)
                self.docs[idx] = doc
                return


def _make_fake_db(tx_status: str = "initiated"):
    tx_doc = {
        "session_id": "cs_test_123",
        "user_id": "user_1",
        "order_id": "order_1",
        "status": tx_status,
        "payment_status": tx_status,
    }
    order_doc = {"order_id": "order_1", "status": "pending_payment"}

    tx_col = _Collection([tx_doc])
    orders_col = _Collection([order_doc])

    class _DB:
        payment_transactions = tx_col
        orders = orders_col

    return _DB(), tx_col, orders_col


def _mock_paid_session():
    return SimpleNamespace(
        payment_status="paid",
        status="complete",
        amount_total=1099,
        currency="eur",
    )


@pytest.mark.asyncio
async def test_checkout_status_skips_processing_when_transaction_already_paid(monkeypatch):
    fake_db, tx_col, _orders_col = _make_fake_db(tx_status="paid")
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders.stripe.checkout.Session, "retrieve", lambda _sid: _mock_paid_session())

    calls = {"count": 0}

    async def _process_payment_confirmed(_sid: str, user_id: str | None = None):
        calls["count"] += 1

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    user = SimpleNamespace(user_id="user_1")
    result = await orders.checkout_status("cs_test_123", user)

    assert result["status"] == "paid"
    assert "already processed" in result["message"].lower()
    assert calls["count"] == 0
    assert tx_col.docs[0]["status"] == "paid"


@pytest.mark.asyncio
async def test_checkout_status_processes_once_then_next_poll_is_idempotent(monkeypatch):
    fake_db, tx_col, orders_col = _make_fake_db(tx_status="initiated")
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders.stripe.checkout.Session, "retrieve", lambda _sid: _mock_paid_session())

    calls = {"count": 0}

    async def _process_payment_confirmed(_sid: str, user_id: str | None = None):
        calls["count"] += 1
        await tx_col.update_one(
            {"session_id": "cs_test_123", "user_id": "user_1"},
            {"$set": {"status": "paid", "payment_status": "paid"}},
        )
        await orders_col.update_one(
            {"order_id": "order_1"},
            {"$set": {"status": "paid"}},
        )

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    user = SimpleNamespace(user_id="user_1")

    first = await orders.checkout_status("cs_test_123", user)
    second = await orders.checkout_status("cs_test_123", user)

    assert first["status"] == "paid"
    assert second["status"] == "paid"
    assert second.get("message") == "Payment already processed"
    assert calls["count"] == 1
    assert tx_col.docs[0]["status"] == "paid"
    assert tx_col.docs[0]["payment_status"] == "paid"
