from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from models import AffiliateLink
from routers.checkout import create_checkout_session
from routers.influencer import create_affiliate_link
from schemas import AffiliateLinkCreateRequest, CheckoutCreateRequest, ShippingAddress


@pytest.mark.asyncio
async def test_checkout_locks_product_row_and_returns_specific_stock_error():
    user_id = uuid4()
    tenant_id = uuid4()
    low_id = uuid4()
    high_id = uuid4()
    if str(low_id) > str(high_id):
        low_id, high_id = high_id, low_id

    cart_item_high = SimpleNamespace(
        product_id=high_id,
        quantity=1,
        unit_price_cents=1000,
        product=SimpleNamespace(name="Prod High", producer_id=uuid4()),
    )
    cart_item_low = SimpleNamespace(
        product_id=low_id,
        quantity=3,
        unit_price_cents=2000,
        product=SimpleNamespace(name="Prod Low", producer_id=uuid4()),
    )
    cart = SimpleNamespace(items=[cart_item_high, cart_item_low], affiliate_code=None)
    locked_low_product = SimpleNamespace(
        id=low_id,
        name="Prod Low",
        track_inventory=True,
        inventory_quantity=1,
    )
    locked_high_product = SimpleNamespace(
        id=high_id,
        name="Prod High",
        track_inventory=True,
        inventory_quantity=5,
    )

    db = AsyncMock()
    db.scalar = AsyncMock(side_effect=[cart, locked_low_product, locked_high_product])
    db.scalars = AsyncMock()
    db.add = Mock()
    db.flush = AsyncMock()

    payload = CheckoutCreateRequest(
        shipping_address=ShippingAddress(
            name="Test User",
            line1="Street 1",
            city="Madrid",
            postal_code="28001",
            country="ES",
        )
    )
    request = SimpleNamespace(cookies={})
    current_user = SimpleNamespace(id=user_id, tenant_id=tenant_id)

    with pytest.raises(HTTPException) as exc:
        await create_checkout_session(payload=payload, request=request, current_user=current_user, db=db)

    assert exc.value.status_code == 400
    assert "Insufficient stock for Prod Low" in exc.value.detail
    assert "available 1, requested 3" in exc.value.detail

    lock_stmt = db.scalar.call_args_list[1].args[0]
    assert lock_stmt._for_update_arg is not None
    params = lock_stmt.compile().params
    assert low_id in params.values()


@pytest.mark.asyncio
async def test_create_affiliate_link_retries_on_integrity_error(monkeypatch):
    user = SimpleNamespace(id=uuid4(), role="influencer")
    payload = AffiliateLinkCreateRequest(product_id=None, custom_code=None)

    token_values = iter(
        [
            "DUPLICATE-CODE-AAAA",
            "UNIQUE-CODE-BBBB",
            "FALLBACK-3-CCCC",
            "FALLBACK-4-DDDD",
            "FALLBACK-5-EEEE",
        ]
    )
    monkeypatch.setattr("routers.influencer.secrets.token_urlsafe", lambda _: next(token_values))
    monkeypatch.setattr("routers.influencer.build_affiliate_tracking_url", lambda code: f"https://api.example/r/{code}")

    db = AsyncMock()
    db.add = Mock()
    db.get = AsyncMock(return_value=None)
    db.flush = AsyncMock(
        side_effect=[
            IntegrityError("insert", {"code": "DUPLICATECOD"}, Exception("duplicate key value violates unique constraint")),
            None,
        ]
    )
    db.rollback = AsyncMock()

    link = await create_affiliate_link(payload=payload, current_user=user, db=db)

    assert link.code == "UNIQUE-CODE-"
    assert db.flush.await_count == 2
    db.rollback.assert_awaited_once()


def test_affiliate_code_column_is_unique_in_model():
    assert AffiliateLink.__table__.c.code.unique is True
