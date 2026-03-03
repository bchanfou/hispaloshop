from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from routers.checkout import _calculate_platform_fee, _commission_by_producer
from routers.producer import _slug_with_suffix
from routers.products import _cursor_filter, _decode_cursor, _encode_cursor
from security import create_access_token, create_refresh_token, decode_access_token, decode_refresh_token


class DummySubscription:
    def __init__(self, user_id, bps):
        self.user_id = user_id
        self._bps = bps

    def get_commission_bps(self):
        return self._bps


class DummyProduct:
    def __init__(self, price_cents=100, created_at=None):
        self.id = uuid4()
        self.price_cents = price_cents
        self.created_at = created_at or datetime.now(timezone.utc)


def test_commission_map_and_fee_aggregation():
    producer_a = uuid4()
    producer_b = uuid4()
    commission = _commission_by_producer([DummySubscription(producer_a, 1600), DummySubscription(producer_b, 2000)])

    line_a = _calculate_platform_fee(3000, commission[str(producer_a)])
    line_b = _calculate_platform_fee(2000, commission[str(producer_b)])

    assert commission[str(producer_a)] == 1600
    assert commission[str(producer_b)] == 2000
    assert line_a + line_b == 880


def test_slug_suffix_generation():
    assert _slug_with_suffix("aceite", 0) == "aceite"
    assert _slug_with_suffix("aceite", 2) == "aceite-3"


def test_cursor_encode_decode_newest_roundtrip():
    product = DummyProduct()
    cursor = _encode_cursor("newest", product)
    payload = _decode_cursor(cursor)

    assert payload["sort"] == "newest"
    assert payload["id"] == str(product.id)


def test_cursor_filter_rejects_invalid_payload():
    with pytest.raises(HTTPException):
        _cursor_filter("price_asc", {"sort": "price_asc", "id": "not-a-uuid", "price_cents": 10})


def test_access_refresh_token_separation():
    payload = {"sub": str(uuid4()), "role": "buyer", "tenant_id": str(uuid4())}
    access = create_access_token(payload)
    refresh = create_refresh_token(payload)

    assert decode_access_token(access)["token_type"] == "access"
    assert decode_refresh_token(refresh)["token_type"] == "refresh"

    with pytest.raises(ValueError):
        decode_access_token(refresh)

    with pytest.raises(ValueError):
        decode_refresh_token(access)
