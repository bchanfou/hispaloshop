"""
Tests for Stripe transfer retry system (CICLO 1.1).

Validates:
- process_affiliate_payout succeeds on first attempt
- process_affiliate_payout retries and succeeds on 2nd attempt
- process_affiliate_payout marks transfer_failed + notifies admin after 3 failures
- Backoff sequence is [1, 4, 16] seconds
- pending_transfer state is set before the retry loop
- stripe_transfer_id is always required for status: paid
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch, call
from uuid import uuid4

import pytest

from services.affiliate_service import (
    PAYOUT_BACKOFF_SECONDS,
    PAYOUT_MAX_RETRIES,
    _notify_admin_transfer_failed,
    process_affiliate_payout,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_payout(stripe_transfer_id=None):
    """Return a minimal Payout-like namespace for testing."""
    return SimpleNamespace(
        id=uuid4(),
        influencer_id=uuid4(),
        amount_cents=5000,
        currency="eur",
        stripe_account_id="acct_test_123",
        stripe_transfer_id=stripe_transfer_id,
        status="requested",
        processed_at=None,
        paid_at=None,
        failed_at=None,
        failure_reason=None,
    )


def _make_db(payout):
    """Create a minimal AsyncSession mock that passes commission + profile queries."""
    scalars_result = MagicMock()
    scalars_result.scalars.return_value.all.return_value = []

    db = AsyncMock()
    db.get = AsyncMock(return_value=payout)
    db.flush = AsyncMock()
    db.execute = AsyncMock(return_value=scalars_result)
    db.scalar = AsyncMock(return_value=None)
    return db


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

def test_backoff_sequence():
    """Backoff times must be exactly [1, 4, 16] seconds per spec."""
    assert PAYOUT_BACKOFF_SECONDS == [1, 4, 16]


def test_max_retries():
    """Max retries must be 3."""
    assert PAYOUT_MAX_RETRIES == 3


# ---------------------------------------------------------------------------
# process_affiliate_payout - success path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_payout_succeeds_on_first_attempt():
    payout = _make_payout()
    db = _make_db(payout)

    with patch("services.affiliate_service._attempt_stripe_transfer", new=AsyncMock(return_value="tr_success_001")):
        with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
            result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    assert payout.stripe_transfer_id == "tr_success_001"
    assert payout.paid_at is not None
    mock_sleep.assert_not_called()


@pytest.mark.asyncio
async def test_payout_succeeds_on_second_attempt():
    payout = _make_payout()
    db = _make_db(payout)

    call_count = 0

    async def _transfer_fails_once(p):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Stripe timeout")
        return "tr_success_002"

    with patch("services.affiliate_service._attempt_stripe_transfer", new=_transfer_fails_once):
        with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
            result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    assert payout.stripe_transfer_id == "tr_success_002"
    # Exactly one sleep call with backoff_seconds[0] = 1
    mock_sleep.assert_called_once_with(PAYOUT_BACKOFF_SECONDS[0])


# ---------------------------------------------------------------------------
# process_affiliate_payout - failure path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_payout_transfer_failed_after_all_retries():
    payout = _make_payout()
    db = _make_db(payout)

    async def _always_fails(p):
        raise Exception("Stripe unavailable")

    notified = []

    async def _fake_notify(payout_id, error):
        notified.append((payout_id, str(error)))

    with patch("services.affiliate_service._attempt_stripe_transfer", new=_always_fails):
        with patch("asyncio.sleep", new=AsyncMock()) as mock_sleep:
            with patch("services.affiliate_service._notify_admin_transfer_failed", new=_fake_notify):
                result = await process_affiliate_payout(db, payout.id)

    assert result is False
    assert payout.status == "transfer_failed"
    assert payout.stripe_transfer_id is None, "Must NOT have a transfer_id when failed"
    assert payout.failure_reason is not None
    assert "Stripe unavailable" in payout.failure_reason
    assert payout.failed_at is not None
    # Two sleeps: after attempt 0 (1s) and after attempt 1 (4s). No sleep after last attempt.
    assert mock_sleep.call_count == 2
    assert mock_sleep.call_args_list == [call(1), call(4)]
    # Admin was notified exactly once
    assert len(notified) == 1
    assert notified[0][0] == payout.id


@pytest.mark.asyncio
async def test_paid_requires_real_stripe_transfer_id():
    """status: paid must only be set when stripe_transfer_id is a real value."""
    payout = _make_payout()
    db = _make_db(payout)

    async def _always_fails(p):
        raise Exception("network error")

    with patch("services.affiliate_service._attempt_stripe_transfer", new=_always_fails):
        with patch("asyncio.sleep", new=AsyncMock()):
            with patch("services.affiliate_service._notify_admin_transfer_failed", new=AsyncMock()):
                await process_affiliate_payout(db, payout.id)

    assert payout.status != "paid"
    assert payout.stripe_transfer_id is None


# ---------------------------------------------------------------------------
# process_affiliate_payout - idempotency
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_payout_already_transferred_marks_paid_without_retry():
    """If payout already has a real stripe_transfer_id, mark paid without calling Stripe again."""
    payout = _make_payout(stripe_transfer_id="tr_existing_abc")
    db = _make_db(payout)

    with patch("services.affiliate_service._attempt_stripe_transfer", new=AsyncMock()) as mock_attempt:
        result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    assert payout.stripe_transfer_id == "tr_existing_abc"
    mock_attempt.assert_not_called()


# ---------------------------------------------------------------------------
# process_affiliate_payout - pending_transfer intermediate state
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pending_transfer_state_set_before_retry_loop():
    """pending_transfer must be set (and flushed) before attempting Stripe calls."""
    payout = _make_payout()
    status_at_flush = []

    async def _capture_flush():
        status_at_flush.append(payout.status)

    db = _make_db(payout)
    db.flush = AsyncMock(side_effect=_capture_flush)

    async def _always_fails(p):
        raise Exception("err")

    with patch("services.affiliate_service._attempt_stripe_transfer", new=_always_fails):
        with patch("asyncio.sleep", new=AsyncMock()):
            with patch("services.affiliate_service._notify_admin_transfer_failed", new=AsyncMock()):
                await process_affiliate_payout(db, payout.id)

    # First flush must happen with pending_transfer
    assert status_at_flush[0] == "pending_transfer"


# ---------------------------------------------------------------------------
# _notify_admin_transfer_failed - error resilience
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_notify_admin_silently_handles_missing_superadmin():
    """_notify_admin should not raise if no super_admin exists in db."""
    payout_id = uuid4()
    error = Exception("stripe down")

    fake_db = MagicMock()
    fake_db.users.find_one = AsyncMock(return_value=None)

    fake_database_module = MagicMock()
    fake_database_module.db = fake_db

    with patch.dict("sys.modules", {"core.database": fake_database_module}):
        try:
            await _notify_admin_transfer_failed(payout_id, error)
        except Exception as exc:
            pytest.fail(f"_notify_admin_transfer_failed raised unexpectedly: {exc}")


@pytest.mark.asyncio
async def test_notify_admin_silently_handles_db_error():
    """_notify_admin should not raise if the DB/email call throws."""
    payout_id = uuid4()
    error = Exception("stripe down")

    fake_db = MagicMock()
    fake_db.users.find_one = AsyncMock(side_effect=Exception("DB connection error"))

    fake_database_module = MagicMock()
    fake_database_module.db = fake_db

    with patch.dict("sys.modules", {"core.database": fake_database_module}):
        try:
            await _notify_admin_transfer_failed(payout_id, error)
        except Exception as exc:
            pytest.fail(f"_notify_admin_transfer_failed raised unexpectedly: {exc}")
