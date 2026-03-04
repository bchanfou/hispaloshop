from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from routers import connect as connect_router
from routers import webhooks
from services.stripe_connect_service import StripeConnectService


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeRequest:
    async def body(self):
        return b"{}"


@pytest.mark.asyncio
async def test_create_connect_account_returns_onboarding_link(monkeypatch):
    user = SimpleNamespace(
        id=uuid4(),
        email="producer@test.com",
        stripe_account_id=None,
        stripe_account_type=None,
        stripe_account_status="inactive",
        stripe_account_created_at=None,
        stripe_account_charges_enabled=False,
        stripe_account_payouts_enabled=False,
        connect_requirements_due=None,
        connect_onboarding_completed=False,
    )
    db = SimpleNamespace(flush=AsyncMock())

    monkeypatch.setattr(
        "services.stripe_connect_service.stripe.Account.create",
        lambda **kwargs: SimpleNamespace(
            id="acct_123",
            charges_enabled=False,
            payouts_enabled=False,
            requirements=SimpleNamespace(currently_due=["external_account"]),
        ),
    )
    monkeypatch.setattr(
        "services.stripe_connect_service.stripe.AccountLink.create",
        lambda **kwargs: SimpleNamespace(url="https://connect.stripe.test/onboarding"),
    )

    result = await StripeConnectService.create_connect_account(db=db, user=user)

    assert result["account_id"] == "acct_123"
    assert result["status"] is False
    assert result["onboarding_url"].startswith("https://")
    assert user.stripe_account_id == "acct_123"
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_connect_account_reuses_existing_account(monkeypatch):
    user = SimpleNamespace(
        id=uuid4(),
        email="producer@test.com",
        stripe_account_id="acct_existing",
        stripe_account_type="express",
        stripe_account_status="pending",
        stripe_account_created_at=None,
        stripe_account_charges_enabled=False,
        stripe_account_payouts_enabled=False,
        connect_requirements_due=[],
        connect_onboarding_completed=False,
    )
    db = SimpleNamespace(flush=AsyncMock())

    monkeypatch.setattr(
        StripeConnectService,
        "sync_account_status",
        AsyncMock(
            return_value={
                "charges_enabled": False,
                "payouts_enabled": False,
                "requirements_due": ["verification.document"],
                "status": "pending",
            }
        ),
    )
    monkeypatch.setattr(
        StripeConnectService,
        "create_onboarding_link",
        AsyncMock(return_value="https://connect.stripe.test/retry"),
    )

    result = await StripeConnectService.create_connect_account(db=db, user=user)

    assert result["account_id"] == "acct_existing"
    assert result["status"] is False
    assert result["onboarding_url"] == "https://connect.stripe.test/retry"


@pytest.mark.asyncio
async def test_payment_webhook_triggers_producer_transfers(monkeypatch):
    items = [SimpleNamespace(id=uuid4()), SimpleNamespace(id=uuid4())]
    order = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        payment_status="pending",
        status="pending",
        paid_at=None,
        items=items,
    )
    db = SimpleNamespace(execute=AsyncMock(return_value=_ScalarResult(order)), scalar=AsyncMock())

    monkeypatch.setattr(
        webhooks.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_pay_connect_1",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_connect_1"}},
        },
    )
    monkeypatch.setattr(webhooks, "process_payment_fees", AsyncMock())
    monkeypatch.setattr(webhooks, "is_event_already_processed", AsyncMock(return_value=False))
    monkeypatch.setattr(webhooks, "mark_event_processed", AsyncMock())
    transfer_mock = AsyncMock()
    monkeypatch.setattr(webhooks.StripeConnectService, "transfer_order_item_to_producer", transfer_mock)

    response = await webhooks.stripe_webhook(_FakeRequest(), None, db)

    assert response == {"received": True}
    assert transfer_mock.await_count == len(items)


@pytest.mark.asyncio
async def test_create_dashboard_login_link(monkeypatch):
    monkeypatch.setattr(
        "services.stripe_connect_service.stripe.Account.create_login_link",
        lambda account_id: SimpleNamespace(url=f"https://connect.stripe.test/{account_id}/login"),
    )

    url = await StripeConnectService.create_dashboard_login_link("acct_dashboard_1")
    assert url == "https://connect.stripe.test/acct_dashboard_1/login"


@pytest.mark.asyncio
async def test_connect_webhook_account_updated_syncs_user(monkeypatch):
    user = SimpleNamespace(stripe_account_id="acct_connect_42")
    db = SimpleNamespace(scalar=AsyncMock(return_value=user))

    monkeypatch.setattr(
        connect_router.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_connect_1",
            "type": "account.updated",
            "data": {"object": {"id": "acct_connect_42"}},
        },
    )
    sync_mock = AsyncMock()
    monkeypatch.setattr(connect_router.StripeConnectService, "sync_account_status", sync_mock)

    response = await connect_router.connect_webhook(_FakeRequest(), "sig_test", db)

    assert response == {"status": "success"}
    sync_mock.assert_awaited_once_with(db, user)
