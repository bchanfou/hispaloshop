from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, Mock

import pytest

from routers.influencer import create_affiliate_link
from routers.producer import approve_affiliate_request
from schemas import AffiliateLinkCreateRequest
from services.affiliate_service import build_affiliate_tracking_url, track_conversion


@pytest.mark.asyncio
async def test_track_conversion_creates_conversion_event_per_item_without_mutating_click(monkeypatch):
    order_id = uuid4()
    item_one = uuid4()
    item_two = uuid4()

    link = SimpleNamespace(
        id=uuid4(),
        influencer_id=uuid4(),
        status="active",
        total_conversions=0,
        total_gmv_cents=0,
        total_commission_cents=0,
    )
    click = SimpleNamespace(
        id=uuid4(),
        link_id=link.id,
        event_type="click",
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0",
        referrer="https://example.com",
        cookie_id="cookie-1",
        created_at=datetime.now(timezone.utc),
    )
    profile = SimpleNamespace(
        get_commission_bps=lambda: 500,
        total_earnings_cents=0,
        pending_earnings_cents=0,
        total_gmv_cents=0,
        total_referrals=0,
    )

    order_item_one = SimpleNamespace(affiliate_commission_cents=0)
    order_item_two = SimpleNamespace(affiliate_commission_cents=0)

    db = AsyncMock()
    db.scalar = AsyncMock(
        side_effect=[
            link,
            None,
            click,
            profile,
            link,
            None,
            click,
            profile,
        ]
    )
    db.get = AsyncMock(side_effect=[order_item_one, order_item_two])
    db.add = Mock()
    db.flush = AsyncMock()
    recalc_mock = AsyncMock(return_value="perseo")
    monkeypatch.setattr("services.affiliate_service.recalculate_influencer_tier", recalc_mock)

    first = await track_conversion(db, order_id, item_one, "AFFCODE", 1000)
    second = await track_conversion(db, order_id, item_two, "AFFCODE", 2000)

    assert first is not None
    assert second is not None
    assert click.event_type == "click"
    assert link.total_conversions == 2
    assert link.total_gmv_cents == 3000

    added_entities = [call.args[0] for call in db.add.call_args_list]
    conversion_events = [e for e in added_entities if type(e).__name__ == "AffiliateEvent" and e.event_type == "conversion"]
    commissions = [e for e in added_entities if type(e).__name__ == "Commission"]

    assert len(conversion_events) == 2
    assert len(commissions) == 2
    assert recalc_mock.await_count == 2


@pytest.mark.asyncio
async def test_track_conversion_is_idempotent_for_same_order_item():
    existing = SimpleNamespace(id=uuid4())
    link = SimpleNamespace(id=uuid4(), influencer_id=uuid4(), status="active")

    db = AsyncMock()
    db.scalar = AsyncMock(side_effect=[link, existing])
    db.add = Mock()

    result = await track_conversion(db, uuid4(), uuid4(), "AFFCODE", 1500)

    assert result is existing
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_approve_affiliate_request_reuses_pending_link():
    producer_id = uuid4()
    influencer_id = uuid4()
    product_id = uuid4()
    request_row = SimpleNamespace(
        id=uuid4(),
        producer_id=producer_id,
        influencer_id=influencer_id,
        product_id=product_id,
        status="pending",
        approved_by=None,
        responded_at=None,
    )
    existing_link = SimpleNamespace(
        id=uuid4(),
        influencer_id=influencer_id,
        product_id=product_id,
        code="KEEP1234",
        tracking_url="https://backend.example/r/KEEP1234",
        status="pending",
    )

    db = AsyncMock()
    db.scalar = AsyncMock(side_effect=[request_row, existing_link])
    db.add = Mock()
    db.flush = AsyncMock()

    user = SimpleNamespace(id=producer_id, role="producer")
    approved = await approve_affiliate_request(request_row.id, db=db, user=user)

    assert approved is existing_link
    assert existing_link.status == "active"
    assert existing_link.code == "KEEP1234"
    assert existing_link.tracking_url == "https://backend.example/r/KEEP1234"
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_affiliate_link_uses_backend_redirect_host(monkeypatch):
    influencer_id = uuid4()
    user = SimpleNamespace(id=influencer_id, role="influencer")
    payload = AffiliateLinkCreateRequest(product_id=None, custom_code="mycode")
    monkeypatch.setattr("services.affiliate_service.settings.BACKEND_URL", "https://backend.example/")

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.add = Mock()
    db.flush = AsyncMock()

    link = await create_affiliate_link(payload=payload, current_user=user, db=db)

    assert link.code == "MYCODE"
    assert link.tracking_url == build_affiliate_tracking_url("MYCODE")


def test_build_affiliate_tracking_url_with_explicit_base_url():
    assert build_affiliate_tracking_url("CODE123", base_url="https://api.example.com/") == "https://api.example.com/r/CODE123"


def test_build_affiliate_tracking_url_with_settings_backend_url(monkeypatch):
    monkeypatch.setattr("services.affiliate_service.settings.BACKEND_URL", "https://backend.example/")

    assert build_affiliate_tracking_url("CODE123") == "https://backend.example/r/CODE123"


def test_build_affiliate_tracking_url_without_any_backend_url(monkeypatch):
    monkeypatch.setattr("services.affiliate_service.settings.BACKEND_URL", None)

    with pytest.raises(ValueError, match="Backend URL not configured for affiliate tracking"):
        build_affiliate_tracking_url("CODE123")
