from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
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
        actual = doc.get(key)
        if isinstance(expected, dict):
            if "$in" in expected and actual not in expected["$in"]:
                return False
            continue
        if actual != expected:
            return False
    return True


class _Result:
    def __init__(self, matched_count: int = 1):
        self.matched_count = matched_count
        self.modified_count = matched_count


class _ProcessedEventsCollection:
    def __init__(self):
        self.docs: list[dict] = []

    async def insert_one(self, doc: dict):
        event_id = doc.get("event_id")
        if any(existing.get("event_id") == event_id for existing in self.docs):
            raise DuplicateKeyError("duplicate event")
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


@pytest.mark.asyncio
async def test_checkout_completed_retry_same_event_id_processes_once(monkeypatch):
    processed_col = _ProcessedEventsCollection()
    fake_db = type("DB", (), {"processed_webhook_events": processed_col})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    calls = {"count": 0}

    async def _process_payment_confirmed(_session_id: str, user_id: str | None = None):
        calls["count"] += 1

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    payload = {
        "id": "evt_checkout_retry_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_checkout_1",
                "payment_status": "paid",
                "metadata": {"order_id": "order_1", "user_id": "user_1"},
            }
        },
    }

    first = await orders.stripe_webhook(_make_request(payload))
    second = await orders.stripe_webhook(_make_request(payload))

    assert first == {"status": "success"}
    assert second == {"status": "already_processed"}
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_checkout_completed_unpaid_does_not_process_payment(monkeypatch):
    processed_col = _ProcessedEventsCollection()
    fake_db = type("DB", (), {"processed_webhook_events": processed_col})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    calls = {"count": 0}

    async def _process_payment_confirmed(_session_id: str, user_id: str | None = None):
        calls["count"] += 1

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    payload = {
        "id": "evt_checkout_unpaid_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_checkout_2",
                "payment_status": "unpaid",
                "metadata": {"order_id": "order_2", "user_id": "user_2"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    assert calls["count"] == 0


@pytest.mark.asyncio
async def test_checkout_completed_failure_marks_event_failed_and_returns_400(monkeypatch):
    processed_col = _ProcessedEventsCollection()
    fake_db = type("DB", (), {"processed_webhook_events": processed_col})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    async def _process_payment_confirmed(_session_id: str, user_id: str | None = None):
        raise RuntimeError("forced payment processing error")

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    payload = {
        "id": "evt_checkout_fail_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_checkout_fail_1",
                "payment_status": "paid",
                "metadata": {"order_id": "order_fail_1", "user_id": "user_fail_1"},
            }
        },
    }

    with pytest.raises(HTTPException) as exc:
        await orders.stripe_webhook(_make_request(payload))

    assert exc.value.status_code == 400
    assert "forced payment processing error" in str(exc.value.detail)
    assert len(processed_col.docs) == 1
    event_doc = processed_col.docs[0]
    assert event_doc["event_id"] == "evt_checkout_fail_1"
    assert event_doc["status"] == "failed"
    assert "failed_at" in event_doc
    assert "error" in event_doc


@pytest.mark.asyncio
async def test_checkout_completed_retry_after_stale_failed_is_reclaimed(monkeypatch):
    processed_col = _ProcessedEventsCollection()
    fake_db = type("DB", (), {"processed_webhook_events": processed_col})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    calls = {"count": 0}

    async def _process_payment_confirmed(_session_id: str, user_id: str | None = None):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("transient processing error")

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    payload = {
        "id": "evt_checkout_retry_stale_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_checkout_retry_stale_1",
                "payment_status": "paid",
                "metadata": {"order_id": "order_retry_1", "user_id": "user_retry_1"},
            }
        },
    }

    with pytest.raises(HTTPException):
        await orders.stripe_webhook(_make_request(payload))

    # Simulate stale failed event to enable reclaim path.
    processed_col.docs[0]["processed_at"] = datetime.now(timezone.utc) - timedelta(minutes=10)

    retry = await orders.stripe_webhook(_make_request(payload))

    assert retry == {"status": "success"}
    assert calls["count"] == 2
    event_doc = processed_col.docs[0]
    assert event_doc["status"] == "completed"
    assert event_doc.get("recovered") is True
    assert "completed_at" in event_doc
    assert "failed_at" not in event_doc
    assert "error" not in event_doc
