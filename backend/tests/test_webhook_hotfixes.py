from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from routers import webhooks
from services.commission_service import _allocate_refund_delta


class _FakeRequest:
    def __init__(self, payload: bytes = b"{}"):
        self._payload = payload

    async def body(self):
        return self._payload


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


@pytest.mark.asyncio
async def test_payment_intent_uses_eager_load_and_row_lock(monkeypatch):
    order = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        payment_status="pending",
        status="pending",
        paid_at=None,
        items=[],
    )
    captured = {}

    async def _execute(stmt):
        captured["stmt"] = stmt
        return _ScalarResult(order)

    db = SimpleNamespace(execute=AsyncMock(side_effect=_execute), scalar=AsyncMock())
    monkeypatch.setattr(
        webhooks.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_pay_1",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_123"}},
        },
    )
    monkeypatch.setattr(webhooks, "process_payment_fees", AsyncMock())
    monkeypatch.setattr(webhooks, "is_event_already_processed", AsyncMock(return_value=False))
    monkeypatch.setattr(webhooks, "mark_event_processed", AsyncMock())

    resp = await webhooks.stripe_webhook(_FakeRequest(), None, db)

    assert resp == {"received": True}
    stmt = captured["stmt"]
    assert stmt._with_options, "Expected selectinload(Order.items) in payment webhook query"
    assert stmt._for_update_arg is not None, "Expected with_for_update() in payment webhook query"


@pytest.mark.asyncio
async def test_refund_uses_delta_not_stripe_cumulative(monkeypatch):
    order = SimpleNamespace(id=uuid4(), user_id=uuid4(), items=[SimpleNamespace(id=uuid4(), total_cents=10000)])
    captured = {}

    async def _execute(stmt):
        captured["stmt"] = stmt
        return _ScalarResult(order)

    db = SimpleNamespace(execute=AsyncMock(side_effect=_execute), scalar=AsyncMock())
    process_refund_mock = AsyncMock()
    mark_processed_mock = AsyncMock()

    monkeypatch.setattr(
        webhooks.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_refund_1",
            "type": "charge.refunded",
            "data": {"object": {"payment_intent": "pi_123", "amount_refunded": 2000}},
        },
    )
    monkeypatch.setattr(webhooks, "get_total_refunded_cents", AsyncMock(return_value=1000))
    monkeypatch.setattr(webhooks, "is_event_already_processed", AsyncMock(return_value=False))
    monkeypatch.setattr(webhooks, "process_refund", process_refund_mock)
    monkeypatch.setattr(webhooks, "mark_event_processed", mark_processed_mock)

    resp = await webhooks.stripe_webhook(_FakeRequest(), None, db)

    assert resp == {"received": True}
    process_refund_mock.assert_awaited_once()
    _, kwargs = process_refund_mock.await_args
    assert kwargs["amount_to_refund_cents"] == 1000
    stmt = captured["stmt"]
    assert stmt._with_options, "Expected selectinload(Order.items) in refund webhook query"
    assert stmt._for_update_arg is not None, "Expected with_for_update() in refund webhook query"


@pytest.mark.asyncio
async def test_refund_event_idempotency_skips_duplicate(monkeypatch):
    order = SimpleNamespace(id=uuid4(), user_id=uuid4(), items=[])

    db = SimpleNamespace(execute=AsyncMock(return_value=_ScalarResult(order)), scalar=AsyncMock())
    process_refund_mock = AsyncMock()

    monkeypatch.setattr(
        webhooks.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_refund_dup",
            "type": "charge.refunded",
            "data": {"object": {"payment_intent": "pi_123", "amount_refunded": 1000}},
        },
    )
    monkeypatch.setattr(webhooks, "is_event_already_processed", AsyncMock(return_value=True))
    monkeypatch.setattr(webhooks, "process_refund", process_refund_mock)

    resp = await webhooks.stripe_webhook(_FakeRequest(), None, db)

    assert resp == {"received": True}
    process_refund_mock.assert_not_awaited()


def test_allocate_refund_delta_proportional_with_rounding_fix():
    item_a = SimpleNamespace(id=uuid4(), total_cents=1000)
    item_b = SimpleNamespace(id=uuid4(), total_cents=3000)

    allocation = _allocate_refund_delta([item_a, item_b], 1000, {})

    assert allocation[item_a.id] == 250
    assert allocation[item_b.id] == 750
    assert sum(allocation.values()) == 1000
