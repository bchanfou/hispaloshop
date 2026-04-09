from __future__ import annotations

import sys
import types
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from routes import orders


class _Result:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count
        self.modified_count = matched_count


class _OrdersCollection:
    def __init__(self, order_doc: dict):
        self.order_doc = order_doc
        self.update_calls: list[dict] = []

    async def find_one(self, query: dict, projection: dict | None = None):
        if query.get("payment_session_id") == self.order_doc.get("payment_session_id"):
            return deepcopy(self.order_doc)
        if query.get("order_id") == self.order_doc.get("order_id"):
            return deepcopy(self.order_doc)
        return None

    async def update_one(self, query: dict, update: dict):
        self.update_calls.append({"query": deepcopy(query), "update": deepcopy(update)})

        if query.get("order_id") != self.order_doc.get("order_id"):
            return _Result(0)

        query_status = query.get("status")
        if isinstance(query_status, dict) and query_status.get("$in") == ["pending", "pending_payment"]:
            # Simulate that order is already in processing, so pending->processing claim misses.
            return _Result(0)

        if query_status == "processing":
            expected_ts = query.get("_processing_at")
            if self.order_doc.get("status") == "processing" and self.order_doc.get("_processing_at") == expected_ts:
                for k, v in update.get("$set", {}).items():
                    self.order_doc[k] = v
                return _Result(1)
            return _Result(0)

        for k, v in update.get("$set", {}).items():
            self.order_doc[k] = v
        return _Result(1)

    async def count_documents(self, _query: dict):
        return 1


class _NoopCollection:
    def __init__(self):
        self.update_calls = 0

    async def find_one(self, query: dict, projection: dict | None = None):
        return None

    async def update_one(self, query: dict, update: dict):
        self.update_calls += 1
        return _Result(1)

    async def insert_one(self, _doc: dict):
        return _Result(1)

    async def delete_one(self, _query: dict):
        return _Result(1)

    async def delete_many(self, _query: dict):
        return _Result(1)


class _PaymentTxCollection(_NoopCollection):
    pass


class _FakeDB:
    def __init__(self, order_doc: dict):
        self.orders = _OrdersCollection(order_doc)
        self.pending_orders = _NoopCollection()
        self.payment_transactions = _PaymentTxCollection()
        self.products = _NoopCollection()
        self.discount_codes = _NoopCollection()
        self.carts = _NoopCollection()
        self.cart_discounts = _NoopCollection()
        self.stock_holds = _NoopCollection()
        self.users = _NoopCollection()
        self.commission_transactions = _NoopCollection()


@pytest.mark.asyncio
async def test_process_payment_confirmed_skips_when_processing_lock_not_stale(monkeypatch):
    now_iso = datetime.now(timezone.utc).isoformat()
    order_doc = {
        "order_id": "order_lock_1",
        "payment_session_id": "cs_lock_1",
        "status": "processing",
        "_processing_at": now_iso,
        "line_items": [],
        "user_id": "",
        "currency": "EUR",
        "total_amount": 0,
    }
    fake_db = _FakeDB(order_doc)
    monkeypatch.setattr(orders, "db", fake_db)

    await orders.process_payment_confirmed("cs_lock_1", user_id="user_1")

    # Non-stale processing lock should skip duplicate processing before payment mutation.
    assert fake_db.payment_transactions.update_calls == 0
    # Only the initial pending->processing claim should be attempted.
    assert len(fake_db.orders.update_calls) == 1


@pytest.mark.asyncio
async def test_process_payment_confirmed_reclaims_stale_processing_lock(monkeypatch):
    stale_iso = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    order_doc = {
        "order_id": "order_lock_2",
        "payment_session_id": "cs_lock_2",
        "status": "processing",
        "_processing_at": stale_iso,
        "line_items": [],
        "user_id": "",
        "currency": "EUR",
        "total_amount": 0,
    }
    fake_db = _FakeDB(order_doc)
    monkeypatch.setattr(orders, "db", fake_db)

    monkeypatch.setattr(
        orders.stripe.checkout.Session,
        "retrieve",
        lambda _sid: SimpleNamespace(payment_intent="pi_lock_2"),
    )

    async def _noop_async(*_args, **_kwargs):
        return None

    async def _commission_data(_order):
        return {}

    async def _transfers(_order):
        return {"total_platform_fee": 0, "transfer_records": []}

    monkeypatch.setattr(orders, "write_ledger_event", _noop_async)
    monkeypatch.setattr(orders, "_get_order_commission_data", _commission_data)
    monkeypatch.setattr(orders, "execute_seller_transfers", _transfers)
    monkeypatch.setattr(orders, "_ensure_influencer_commission_record", _noop_async)
    monkeypatch.setattr(orders, "schedule_influencer_payout", _noop_async)
    monkeypatch.setattr(orders, "send_new_order_email_to_producer", _noop_async)
    monkeypatch.setattr(orders, "send_order_status_email", _noop_async)

    notifications_module = types.ModuleType("routes.notifications")

    async def _notify_order_event(_order_id: str, _event_type: str):
        return None

    notifications_module.notify_order_event = _notify_order_event
    monkeypatch.setitem(sys.modules, "routes.notifications", notifications_module)

    exchange_module = types.ModuleType("services.exchange_rates")

    async def _get_rate_to_usd(_currency: str):
        return 1.0

    exchange_module.get_rate_to_usd = _get_rate_to_usd
    monkeypatch.setitem(sys.modules, "services.exchange_rates", exchange_module)

    await orders.process_payment_confirmed("cs_lock_2", user_id="user_1")

    # After stale reclaim, the function proceeds with payment mutation.
    assert fake_db.payment_transactions.update_calls > 0

    reclaim_call = next(
        (c for c in fake_db.orders.update_calls if c["query"].get("status") == "processing"),
        None,
    )
    assert reclaim_call is not None
    assert reclaim_call["query"].get("_processing_at") == stale_iso
