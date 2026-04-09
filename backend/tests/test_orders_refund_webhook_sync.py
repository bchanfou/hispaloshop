from __future__ import annotations

import json
from copy import deepcopy

import pytest
from starlette.requests import Request

from routes import orders


def _make_request(payload: dict) -> Request:
    raw = json.dumps(payload).encode("utf-8")

    async def receive() -> dict:
        return {"type": "http.request", "body": raw, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/webhook/stripe",
            "headers": [],
        },
        receive,
    )


class _Result:
    def __init__(self, matched_count: int = 1, modified_count: int | None = None):
        self.matched_count = matched_count
        self.modified_count = matched_count if modified_count is None else modified_count


class _Cursor:
    def __init__(self, items: list[dict]):
        self._items = items

    async def to_list(self, _limit: int):
        return deepcopy(self._items)


class _Collection:
    def __init__(self, docs: list[dict] | None = None):
        self.docs = docs or []
        self.last_update = None
        self.last_update_many = None
        self.last_insert = None

    async def find_one(self, query: dict, projection: dict | None = None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return deepcopy(doc)
        return None

    async def insert_one(self, doc: dict):
        self.docs.append(deepcopy(doc))
        self.last_insert = deepcopy(doc)
        return _Result(1)

    async def update_one(self, query: dict, update: dict):
        self.last_update = {"query": deepcopy(query), "update": deepcopy(update)}
        for idx, doc in enumerate(self.docs):
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = v
                if "$unset" in update:
                    for k in update["$unset"].keys():
                        doc.pop(k, None)
                self.docs[idx] = doc
                return _Result(1)
        return _Result(0)

    async def update_many(self, query: dict, update: dict):
        self.last_update_many = {"query": deepcopy(query), "update": deepcopy(update)}
        matched = 0
        for idx, doc in enumerate(self.docs):
            if all(doc.get(k) == v for k, v in query.items()):
                matched += 1
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = v
                self.docs[idx] = doc
        return _Result(matched, matched)

    def find(self, query: dict, projection: dict | None = None):
        items = []
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                items.append(deepcopy(doc))
        return _Cursor(items)


def _make_fake_db(refunded_fully: bool):
    order_doc = {
        "order_id": "order_sync_1",
        "stripe_payment_intent_id": "pi_sync_1",
        "status": "paid",
        "total_amount": 100.0,
        "currency": "EUR",
    }
    tx_doc = {
        "order_id": "order_sync_1",
        "status": "paid",
        "payment_status": "paid",
    }

    processed = _Collection([])
    orders_col = _Collection([order_doc])
    tx_col = _Collection([tx_doc])

    # Needed by full/partial branches in webhook refund processing
    scheduled_docs = [{"order_id": "order_sync_1", "status": "scheduled", "payout_id": "p_1", "amount": 15.0}]
    scheduled_col = _Collection(scheduled_docs)
    comm_col = _Collection([{"order_id": "order_sync_1", "commission_status": "pending"}])

    class _DB:
        processed_webhook_events = processed
        orders = orders_col
        payment_transactions = tx_col
        scheduled_payouts = scheduled_col
        influencer_commissions = comm_col

    return _DB(), orders_col, tx_col


@pytest.mark.asyncio
async def test_charge_refunded_partial_syncs_order_and_transaction(monkeypatch):
    fake_db, orders_col, tx_col = _make_fake_db(refunded_fully=False)
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_refund_partial_1",
        "type": "charge.refunded",
        "data": {
            "object": {
                "payment_intent": "pi_sync_1",
                "amount_refunded": 2500,
                "refunded": False,
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp.get("status") == "success"
    updated_order = orders_col.docs[0]
    updated_tx = tx_col.docs[0]
    assert updated_order["status"] == "partially_refunded"
    assert updated_order["refund_amount_cents"] == 2500
    assert updated_order["refund_amount"] == 25.0
    assert updated_tx["status"] == "partially_refunded"
    assert updated_tx["payment_status"] == "partially_refunded"
    assert updated_tx["refund_amount_cents"] == 2500
    assert updated_tx["refund_amount"] == 25.0


@pytest.mark.asyncio
async def test_charge_refunded_full_syncs_order_and_transaction(monkeypatch):
    fake_db, orders_col, tx_col = _make_fake_db(refunded_fully=True)
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_refund_full_1",
        "type": "charge.refunded",
        "data": {
            "object": {
                "payment_intent": "pi_sync_1",
                "amount_refunded": 10000,
                "refunded": True,
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp.get("status") == "success"
    updated_order = orders_col.docs[0]
    updated_tx = tx_col.docs[0]
    assert updated_order["status"] == "refunded"
    assert updated_order["refund_amount_cents"] == 10000
    assert updated_order["refund_amount"] == 100.0
    assert updated_tx["status"] == "refunded"
    assert updated_tx["payment_status"] == "refunded"
    assert updated_tx["refund_amount_cents"] == 10000
    assert updated_tx["refund_amount"] == 100.0


@pytest.mark.asyncio
async def test_charge_refunded_resolves_order_via_transaction_fallback(monkeypatch):
    fake_db, orders_col, tx_col = _make_fake_db(refunded_fully=True)
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    # Force primary order lookup by stripe_payment_intent_id to miss.
    orders_col.docs[0]["stripe_payment_intent_id"] = "pi_other"
    tx_col.docs[0]["stripe_payment_intent_id"] = "pi_fallback_1"

    # Ensure fallback path does not rely on PaymentIntent metadata resolution.
    def _raise_pi_error(_pi_id: str):
        raise Exception("pi lookup unavailable")

    monkeypatch.setattr(orders.stripe.PaymentIntent, "retrieve", _raise_pi_error)

    payload = {
        "id": "evt_refund_fallback_tx_1",
        "type": "charge.refunded",
        "data": {
            "object": {
                "payment_intent": "pi_fallback_1",
                "amount_refunded": 10000,
                "refunded": True,
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp.get("status") == "success"
    updated_order = orders_col.docs[0]
    updated_tx = tx_col.docs[0]
    assert updated_order["status"] == "refunded"
    assert updated_order["refund_amount_cents"] == 10000
    assert updated_tx["status"] == "refunded"
    assert updated_tx["payment_status"] == "refunded"
