"""
Tests for Ciclo 1.1 — Mock Stripe transfers to pending_transfer with retry system.

Validates:
- Backoff schedule [1, 4, 16]
- pending_transfer state persisted before retry loop
- transfer_failed state + admin notification on exhaustion
- Success path cleans up commissions and profile earnings
"""
import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, Mock, patch, call

import pytest

from services.affiliate_service import (
    process_affiliate_payout,
    PAYOUT_BACKOFF_SECONDS,
    PAYOUT_MAX_RETRIES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_payout(**kwargs):
    defaults = dict(
        id=uuid4(),
        influencer_id=uuid4(),
        amount_cents=5000,
        currency="EUR",
        status="requested",
        stripe_transfer_id=None,
        stripe_account_id="acct_test_123",
        processed_at=None,
        paid_at=None,
        failed_at=None,
        failure_reason=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _make_db(payout, commissions=None, profile=None):
    """Return an AsyncMock db session pre-configured with the given objects."""
    db = AsyncMock()
    db.get = AsyncMock(return_value=payout)
    db.flush = AsyncMock()

    commissions = commissions or []
    profile_result = profile or SimpleNamespace(
        pending_earnings_cents=10000,
        paid_earnings_cents=0,
    )

    async def _execute_side_effect(stmt):
        result = Mock()
        result.scalars.return_value.all.return_value = commissions
        return result

    db.execute = AsyncMock(side_effect=_execute_side_effect)
    db.scalar = AsyncMock(return_value=profile_result)
    return db


# ---------------------------------------------------------------------------
# Test 1: PAYOUT_BACKOFF_SECONDS has the correct values
# ---------------------------------------------------------------------------

def test_backoff_schedule_is_correct():
    """Backoff schedule must be [1, 4, 16] per MEGA_PLAN §1.1."""
    assert PAYOUT_BACKOFF_SECONDS == [1, 4, 16]
    assert PAYOUT_MAX_RETRIES == 3


# ---------------------------------------------------------------------------
# Test 2: Success on first attempt
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_success_on_first_attempt(monkeypatch):
    payout = _make_payout()
    db = _make_db(payout)

    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(return_value="tr_real_001"),
    )

    result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    assert payout.stripe_transfer_id == "tr_real_001"
    assert payout.paid_at is not None


# ---------------------------------------------------------------------------
# Test 3: Success on second attempt (1 failure then success)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_success_on_second_attempt(monkeypatch):
    payout = _make_payout()
    db = _make_db(payout)

    attempt_mock = AsyncMock(side_effect=[RuntimeError("network timeout"), "tr_real_002"])
    monkeypatch.setattr("services.affiliate_service._attempt_stripe_transfer", attempt_mock)

    sleep_calls = []

    async def _fake_sleep(seconds):
        sleep_calls.append(seconds)

    with patch("asyncio.sleep", side_effect=_fake_sleep):
        result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    assert payout.stripe_transfer_id == "tr_real_002"
    assert sleep_calls == [PAYOUT_BACKOFF_SECONDS[0]]  # slept 1s after attempt 0


# ---------------------------------------------------------------------------
# Test 4: Three attempts exhausted → transfer_failed + admin notified
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_exhaustion_marks_transfer_failed_and_notifies(monkeypatch):
    payout = _make_payout()
    db = _make_db(payout)

    stripe_err = RuntimeError("Stripe unavailable")
    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(side_effect=stripe_err),
    )

    notify_mock = AsyncMock()
    monkeypatch.setattr("services.affiliate_service._notify_admin_transfer_failed", notify_mock)

    with patch("asyncio.sleep", new_callable=lambda: lambda s: asyncio.coroutine(lambda: None)()):
        with patch("asyncio.sleep", AsyncMock()):
            result = await process_affiliate_payout(db, payout.id)

    assert result is False
    assert payout.status == "transfer_failed"
    assert payout.failure_reason == str(stripe_err)[:500]
    assert payout.failed_at is not None
    notify_mock.assert_awaited_once_with(db, payout, stripe_err)


# ---------------------------------------------------------------------------
# Test 5: Verify sleep sequence [1s, 4s] for attempts 0 and 1
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sleep_sequence_on_three_failures(monkeypatch):
    payout = _make_payout()
    db = _make_db(payout)

    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(side_effect=RuntimeError("fail")),
    )
    monkeypatch.setattr("services.affiliate_service._notify_admin_transfer_failed", AsyncMock())

    sleep_mock = AsyncMock()
    with patch("asyncio.sleep", sleep_mock):
        await process_affiliate_payout(db, payout.id)

    # Should sleep after attempt 0 (1s) and after attempt 1 (4s); no sleep after attempt 2
    assert sleep_mock.call_count == 2
    sleep_mock.assert_any_call(PAYOUT_BACKOFF_SECONDS[0])  # 1
    sleep_mock.assert_any_call(PAYOUT_BACKOFF_SECONDS[1])  # 4


# ---------------------------------------------------------------------------
# Test 6: Idempotency — existing real stripe_transfer_id marks paid directly
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_idempotency_with_existing_real_stripe_transfer_id(monkeypatch):
    payout = _make_payout(stripe_transfer_id="tr_real_existing_999")
    db = _make_db(payout)

    attempt_mock = AsyncMock()
    monkeypatch.setattr("services.affiliate_service._attempt_stripe_transfer", attempt_mock)

    result = await process_affiliate_payout(db, payout.id)

    assert result is True
    assert payout.status == "paid"
    attempt_mock.assert_not_awaited()  # No new Stripe call needed


# ---------------------------------------------------------------------------
# Test 7: pending_transfer state is flushed before retry loop
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pending_transfer_state_flushed_before_retries(monkeypatch):
    payout = _make_payout()
    flush_calls = []
    status_at_first_flush = []

    db = AsyncMock()
    db.get = AsyncMock(return_value=payout)

    async def _flush():
        flush_calls.append(payout.status)

    db.flush = AsyncMock(side_effect=_flush)

    async def _execute_side_effect(stmt):
        result = Mock()
        result.scalars.return_value.all.return_value = []
        return result

    db.execute = AsyncMock(side_effect=_execute_side_effect)
    db.scalar = AsyncMock(return_value=None)

    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(return_value="tr_real_007"),
    )

    await process_affiliate_payout(db, payout.id)

    # First flush should happen when status is pending_transfer
    assert flush_calls[0] == "pending_transfer"


# ---------------------------------------------------------------------------
# Test 8: Commissions marked paid after transfer success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_commissions_marked_paid_after_success(monkeypatch):
    payout = _make_payout()
    commission_a = SimpleNamespace(status="approved", paid_at=None, payout_id=payout.id)
    commission_b = SimpleNamespace(status="approved", paid_at=None, payout_id=payout.id)

    db = AsyncMock()
    db.get = AsyncMock(return_value=payout)
    db.flush = AsyncMock()

    async def _execute_side_effect(stmt):
        result = Mock()
        result.scalars.return_value.all.return_value = [commission_a, commission_b]
        return result

    db.execute = AsyncMock(side_effect=_execute_side_effect)
    db.scalar = AsyncMock(return_value=None)

    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(return_value="tr_real_008"),
    )

    await process_affiliate_payout(db, payout.id)

    assert commission_a.status == "paid"
    assert commission_b.status == "paid"
    assert commission_a.paid_at is not None
    assert commission_b.paid_at is not None


# ---------------------------------------------------------------------------
# Test 9: Influencer profile earnings updated on success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_influencer_profile_updated_on_success(monkeypatch):
    payout = _make_payout(amount_cents=3000)
    profile = SimpleNamespace(pending_earnings_cents=10000, paid_earnings_cents=0)

    db = AsyncMock()
    db.get = AsyncMock(return_value=payout)
    db.flush = AsyncMock()

    async def _execute_side_effect(stmt):
        result = Mock()
        result.scalars.return_value.all.return_value = []
        return result

    db.execute = AsyncMock(side_effect=_execute_side_effect)
    db.scalar = AsyncMock(return_value=profile)

    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(return_value="tr_real_009"),
    )

    await process_affiliate_payout(db, payout.id)

    assert profile.pending_earnings_cents == 7000  # 10000 - 3000
    assert profile.paid_earnings_cents == 3000


# ---------------------------------------------------------------------------
# Test 10: Notification resilience when super_admin is missing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_notification_resilience_no_superadmin(monkeypatch):
    """_notify_admin_transfer_failed must not raise even if no super_admin exists."""
    from services.affiliate_service import _notify_admin_transfer_failed

    payout = _make_payout()

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)   # No super_admin found
    db.get = AsyncMock(return_value=None)

    # Should not raise
    await _notify_admin_transfer_failed(db, payout, RuntimeError("Stripe down"))


# ---------------------------------------------------------------------------
# Test 11: failure_reason captured and truncated at 500 chars
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_failure_reason_captured_truncated(monkeypatch):
    payout = _make_payout()
    db = _make_db(payout)

    long_error = "E" * 600
    monkeypatch.setattr(
        "services.affiliate_service._attempt_stripe_transfer",
        AsyncMock(side_effect=ValueError(long_error)),
    )
    monkeypatch.setattr("services.affiliate_service._notify_admin_transfer_failed", AsyncMock())

    with patch("asyncio.sleep", AsyncMock()):
        await process_affiliate_payout(db, payout.id)

    assert payout.failure_reason is not None
    assert len(payout.failure_reason) <= 500
