from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
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
    def __init__(self, matched_count: int):
        self.matched_count = matched_count
        self.modified_count = matched_count


class _ProcessedEventsCollection:
    def __init__(self, docs: list[dict]):
        self.docs = docs

    async def insert_one(self, _doc: dict):
        # Simulate unique index violation on duplicate event_id path.
        raise DuplicateKeyError("duplicate event")

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
async def test_webhook_duplicate_completed_event_returns_already_processed(monkeypatch):
    event_doc = {
        "event_id": "evt_completed_1",
        "status": "completed",
        "processed_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc),
    }

    fake_db = type("DB", (), {"processed_webhook_events": _ProcessedEventsCollection([event_doc])})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {"id": "evt_completed_1", "type": "payment_intent.succeeded", "data": {"object": {}}}
    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "already_processed"}


@pytest.mark.asyncio
async def test_webhook_duplicate_processing_non_stale_returns_already_processing(monkeypatch):
    event_doc = {
        "event_id": "evt_processing_1",
        "status": "processing",
        "processed_at": datetime.now(timezone.utc),
    }

    fake_db = type("DB", (), {"processed_webhook_events": _ProcessedEventsCollection([event_doc])})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {"id": "evt_processing_1", "type": "payment_intent.succeeded", "data": {"object": {}}}
    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "already_processing"}


@pytest.mark.asyncio
async def test_webhook_duplicate_stale_processing_is_reclaimed_then_completed(monkeypatch):
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    event_doc = {
        "event_id": "evt_stale_1",
        "status": "processing",
        "processed_at": stale_time,
        "failed_at": datetime.now(timezone.utc),
        "error": "old error",
    }

    processed = _ProcessedEventsCollection([event_doc])
    fake_db = type("DB", (), {"processed_webhook_events": processed})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {"id": "evt_stale_1", "type": "payment_intent.succeeded", "data": {"object": {}}}
    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    updated = processed.docs[0]
    assert updated["status"] == "completed"
    assert updated.get("recovered") is True
    assert "completed_at" in updated
    assert "failed_at" not in updated
    assert "error" not in updated


@pytest.mark.asyncio
async def test_webhook_duplicate_stale_failed_is_reclaimed_then_completed(monkeypatch):
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    event_doc = {
        "event_id": "evt_stale_failed_1",
        "status": "failed",
        "processed_at": stale_time,
        "failed_at": datetime.now(timezone.utc),
        "error": "transient failure",
    }

    processed = _ProcessedEventsCollection([event_doc])
    fake_db = type("DB", (), {"processed_webhook_events": processed})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    payload = {"id": "evt_stale_failed_1", "type": "payment_intent.succeeded", "data": {"object": {}}}
    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "success"}
    updated = processed.docs[0]
    assert updated["status"] == "completed"
    assert updated.get("recovered") is True
    assert "completed_at" in updated
    assert "failed_at" not in updated
    assert "error" not in updated


@pytest.mark.asyncio
async def test_webhook_duplicate_failed_non_stale_returns_already_processing(monkeypatch):
    event_doc = {
        "event_id": "evt_failed_recent_1",
        "status": "failed",
        "processed_at": datetime.now(timezone.utc),
        "failed_at": datetime.now(timezone.utc),
        "error": "temporary",
    }

    processed = _ProcessedEventsCollection([event_doc])
    fake_db = type("DB", (), {"processed_webhook_events": processed})()
    monkeypatch.setattr(orders, "db", fake_db)
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    calls = {"count": 0}

    async def _process_payment_confirmed(_session_id: str, user_id: str | None = None):
        calls["count"] += 1

    monkeypatch.setattr(orders, "process_payment_confirmed", _process_payment_confirmed)

    payload = {
        "id": "evt_failed_recent_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_failed_recent_1",
                "payment_status": "paid",
                "metadata": {"user_id": "user_1"},
            }
        },
    }

    resp = await orders.stripe_webhook(_make_request(payload))

    assert resp == {"status": "already_processing"}
    assert calls["count"] == 0
