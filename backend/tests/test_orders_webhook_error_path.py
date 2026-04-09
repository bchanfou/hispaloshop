from __future__ import annotations

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from routes import orders


def _make_bad_json_request() -> Request:
    payload = b"{not-json"

    async def receive() -> dict:
        return {"type": "http.request", "body": payload, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/webhook/stripe",
            "headers": [(b"content-type", b"application/json")],
        },
        receive,
    )


@pytest.mark.asyncio
async def test_stripe_webhook_malformed_payload_returns_400(monkeypatch):
    monkeypatch.setattr(orders, "STRIPE_WEBHOOK_SECRET", None)

    with pytest.raises(HTTPException) as exc:
        await orders.stripe_webhook(_make_bad_json_request())

    assert exc.value.status_code == 400
    assert isinstance(exc.value.detail, str)
    assert exc.value.detail
