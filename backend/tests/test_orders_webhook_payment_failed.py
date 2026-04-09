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
            "headers": [(b"content-type", b"application/json")],
        },
        receive,
    )


def _matches(doc: dict, query: dict) -> bool:
    for key, expected in query.items():
        if doc.get(key) != expected:
            return False
    return True


class _Result:
    def __init__(self, matched_count: int = 1):
        self.matched_count = matched_count
        self.modified_count = matched_count


class _Collection:
    def __init__(self, docs: list[dict] | None = None):
        self.docs = docs or []
        self.delete_many_calls: list[dict] = []

    async def insert_one(self, doc: dict):
        self.docs.append(deepcopy(doc))
        return _Result(1)

    async def find_one(self, query: dict, projection: dict | None = None):
        for doc in self.docs:
            if _matches(doc, query):
                return deepcopy(doc)
        return None

    async def update_one(self, query: dict, update: dict):
        for idx, doc in enumerate(self.docs):
            if _matches(doc, query):
                if "$set" in update:
                    for key, value in update["$set"].items():
                        doc[key] = value
                if "$unset" in update:
                    for key in update["$unset"].keys():
                        doc.pop(key, None)
                self.docs[idx] = doc
                return _Result(1)
        return _Result(0)

    async def delete_many(self, query: dict):
        self.delete_many_calls.append(deepcopy(query))
        return _Result(1)


def _make_fake_db(order_doc: dict | None):
    processed = _Collection([])
    orders_docs = [order_doc] if order_doc else []
    orders_col = _Collection(orders_docs)
    stock_holds_col = _Collection([])

    class _DB:
        processed_webhook_events = processed
        orders = orders_col
        stock_holds = stock_holds_col

    return _DB(), orders_col, stock_holds_col, processed


@pytest.mark.asyncio
async def test_payment_failed_updates_order_and_releases_session_and_user_holds(monkeypatch):
    fake_db, orders_col, stock_holds_col, processed = _make_fake_db(
        {
            "order_id": "order_pf_1",
            "payment_session_id": "cs_pf_1",
            "status": "pending_payment",
        }
    )
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_pf_1",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_pf_1",
                "metadata": {"order_id": "order_pf_1", "user_id": "user_pf_1"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    assert orders_col.docs[0]["status"] == "payment_failed"
    assert {"session_id": "cs_pf_1"} in stock_holds_col.delete_many_calls
    assert {"user_id": "user_pf_1"} in stock_holds_col.delete_many_calls

    event_doc = processed.docs[0]
    assert event_doc["event_id"] == "evt_pf_1"
    assert event_doc["status"] == "completed"
    assert "completed_at" in event_doc


@pytest.mark.asyncio
async def test_payment_failed_without_order_still_releases_user_holds(monkeypatch):
    fake_db, orders_col, stock_holds_col, _processed = _make_fake_db(None)
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_pf_2",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_pf_2",
                "metadata": {"order_id": "order_missing", "user_id": "user_pf_2"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    assert orders_col.docs == []
    assert stock_holds_col.delete_many_calls == [{"user_id": "user_pf_2"}]


@pytest.mark.asyncio
async def test_payment_failed_without_user_id_updates_order_and_releases_session_holds_only(monkeypatch):
    fake_db, orders_col, stock_holds_col, _processed = _make_fake_db(
        {
            "order_id": "order_pf_3",
            "payment_session_id": "cs_pf_3",
            "status": "pending_payment",
        }
    )
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_pf_3",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_pf_3",
                "metadata": {"order_id": "order_pf_3"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    assert orders_col.docs[0]["status"] == "payment_failed"
    assert stock_holds_col.delete_many_calls == [{"session_id": "cs_pf_3"}]


@pytest.mark.asyncio
async def test_payment_failed_without_order_id_releases_user_holds_only(monkeypatch):
    fake_db, orders_col, stock_holds_col, _processed = _make_fake_db(
        {
            "order_id": "order_pf_4",
            "payment_session_id": "cs_pf_4",
            "status": "pending_payment",
        }
    )
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {
        "id": "evt_pf_4",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_pf_4",
                "metadata": {"user_id": "user_pf_4"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    assert orders_col.docs[0]["status"] == "pending_payment"
    assert stock_holds_col.delete_many_calls == [{"user_id": "user_pf_4"}]
