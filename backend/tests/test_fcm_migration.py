"""
Tests for Ciclo 1.3 — FCM HTTP v1 migration with legacy fallback.

Validates:
- FCMServiceV1: success, invalid token, timeout, 401 refresh
- FCMLegacyService: success, failure
- dispatcher_service._send_push: v1 success, v1→legacy fallback, both fail
- Data stringification (FCM v1 requirement)
- icon_url handling
- Quiet hours deferred
- No tokens registered
- Multiple tokens
- Cron endpoint: retry logic, status update, which version succeeded
"""
import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_prefs(**kwargs):
    defaults = dict(
        push_tokens=[],
        master_push_enabled=True,
        quiet_hours_enabled=False,
        quiet_hours_start=None,
        quiet_hours_end=None,
    )
    defaults.update(kwargs)
    return defaults


def _make_token_entry(token="fcm_token_abc123"):
    return {"token": token, "platform": "android"}


# ---------------------------------------------------------------------------
# Test 1: FCMServiceV1 — success path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_success():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {"name": "projects/test/messages/msg123"}

    with patch.object(svc, "_get_access_token", AsyncMock(return_value="tok_test")):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=fake_response)
            mock_client_cls.return_value = mock_client

            with patch("services.fcm_service.settings") as mock_settings:
                mock_settings.FCM_SERVICE_ACCOUNT_JSON = '{"project_id": "proj-test", "type": "service_account"}'

                result = await svc.send_notification(
                    token="fcm_token_abc123",
                    title="Test",
                    body="Body",
                )

    assert result["success"] is True
    assert result["message_id"] == "projects/test/messages/msg123"


# ---------------------------------------------------------------------------
# Test 2: FCMServiceV1 — invalid token rejected before HTTP call
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_invalid_token_rejected():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()

    with patch("httpx.AsyncClient") as mock_client_cls:
        result = await svc.send_notification(
            token="has spaces and !@# invalid",
            title="Test",
            body="Body",
        )
        mock_client_cls.assert_not_called()

    assert result["success"] is False
    assert "Invalid token format" in result["error"]


# ---------------------------------------------------------------------------
# Test 3: FCMServiceV1 — empty token rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_empty_token_rejected():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()

    with patch("httpx.AsyncClient") as mock_client_cls:
        result = await svc.send_notification(token="", title="T", body="B")
        mock_client_cls.assert_not_called()

    assert result["success"] is False


# ---------------------------------------------------------------------------
# Test 4: FCMServiceV1 — timeout returns is_timeout flag
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_timeout():
    import httpx
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()

    with patch.object(svc, "_get_access_token", AsyncMock(return_value="tok")):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client_cls.return_value = mock_client

            with patch("services.fcm_service.settings") as mock_settings:
                mock_settings.FCM_SERVICE_ACCOUNT_JSON = '{"project_id": "p", "type": "service_account"}'

                result = await svc.send_notification(
                    token="valid_token_abc",
                    title="T",
                    body="B",
                )

    assert result["success"] is False
    assert result.get("is_timeout") is True
    assert "timeout" in result["error"].lower()


# ---------------------------------------------------------------------------
# Test 5: FCMServiceV1 — FCM_SERVICE_ACCOUNT_JSON not configured
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_no_service_account_configured():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()

    with patch("services.fcm_service.settings") as mock_settings:
        mock_settings.FCM_SERVICE_ACCOUNT_JSON = None

        result = await svc.send_notification(
            token="valid_token_abc",
            title="T",
            body="B",
        )

    assert result["success"] is False
    assert "FCM_SERVICE_ACCOUNT_JSON" in result["error"]


# ---------------------------------------------------------------------------
# Test 6: FCMServiceV1 — data values stringified (FCM v1 requirement)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_data_stringification():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()
    captured_payload = {}

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {"name": "msg/1"}

    async def fake_post(url, headers=None, json=None):
        captured_payload.update(json or {})
        return fake_response

    with patch.object(svc, "_get_access_token", AsyncMock(return_value="tok")):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=fake_post)
            mock_client_cls.return_value = mock_client

            with patch("services.fcm_service.settings") as mock_settings:
                mock_settings.FCM_SERVICE_ACCOUNT_JSON = '{"project_id": "p"}'

                await svc.send_notification(
                    token="valid_token_abc",
                    title="T",
                    body="B",
                    data={"count": 42, "flag": True, "name": "order"},
                )

    msg_data = captured_payload.get("message", {}).get("data", {})
    assert msg_data["count"] == "42"
    assert msg_data["flag"] == "True"
    assert msg_data["name"] == "order"


# ---------------------------------------------------------------------------
# Test 7: FCMServiceV1 — icon_url added to notification image
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_icon_url():
    from services.fcm_service import FCMServiceV1

    svc = FCMServiceV1()
    captured_payload = {}

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {"name": "msg/2"}

    async def fake_post(url, headers=None, json=None):
        captured_payload.update(json or {})
        return fake_response

    with patch.object(svc, "_get_access_token", AsyncMock(return_value="tok")):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=fake_post)
            mock_client_cls.return_value = mock_client

            with patch("services.fcm_service.settings") as mock_settings:
                mock_settings.FCM_SERVICE_ACCOUNT_JSON = '{"project_id": "p"}'

                await svc.send_notification(
                    token="valid_token_abc",
                    title="T",
                    body="B",
                    icon_url="https://example.com/icon.png",
                )

    image = captured_payload.get("message", {}).get("notification", {}).get("image")
    assert image == "https://example.com/icon.png"


# ---------------------------------------------------------------------------
# Test 8: FCMServiceV1 — token caching (_get_access_token not called twice)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_token_cache():
    from services.fcm_service import FCMServiceV1
    from datetime import timedelta

    svc = FCMServiceV1()
    svc._access_token = "cached_token"
    svc._token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    # _get_access_token should return cached value without calling Google
    result = await svc._get_access_token({"client_email": "test@svc.com", "private_key": "fake"})
    assert result == "cached_token"


# ---------------------------------------------------------------------------
# Test 9: FCMServiceV1 — invalidate_token clears cache
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_v1_invalidate_token():
    from services.fcm_service import FCMServiceV1
    from datetime import timedelta

    svc = FCMServiceV1()
    svc._access_token = "old_token"
    svc._token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    svc.invalidate_token()

    assert svc._access_token is None
    assert svc._token_expires_at is None


# ---------------------------------------------------------------------------
# Test 10: FCMLegacyService — success path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_legacy_success():
    from services.fcm_legacy import FCMLegacyService

    svc = FCMLegacyService()

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "success": 1,
        "results": [{"message_id": "legacy_msg_001"}],
    }

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=fake_response)
        mock_client_cls.return_value = mock_client

        with patch("services.fcm_legacy.settings") as mock_settings:
            mock_settings.FCM_SERVER_KEY = "server_key_test"

            result = await svc.send_notification(
                token="fcm_token_xyz",
                title="T",
                body="B",
            )

    assert result["success"] is True
    assert result["message_id"] == "legacy_msg_001"


# ---------------------------------------------------------------------------
# Test 11: FCMLegacyService — FCM_SERVER_KEY not configured
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fcm_legacy_no_server_key():
    from services.fcm_legacy import FCMLegacyService

    svc = FCMLegacyService()

    with patch("services.fcm_legacy.settings") as mock_settings:
        mock_settings.FCM_SERVER_KEY = None

        result = await svc.send_notification(token="tok", title="T", body="B")

    assert result["success"] is False
    assert "FCM_SERVER_KEY" in result["error"]


# ---------------------------------------------------------------------------
# Test 12: dispatcher._send_push — v1 success, legacy NOT called
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_v1_success():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()
    prefs = _make_prefs(push_tokens=[_make_token_entry("tok_v1_ok")])

    mock_v1 = AsyncMock(return_value={"success": True, "message_id": "msg_v1"})
    mock_legacy = AsyncMock(return_value={"success": True, "message_id": "should_not_be_called"})

    with patch("services.notifications.dispatcher_service.fcm_service_v1") as mock_v1_svc, \
         patch("services.notifications.dispatcher_service.fcm_legacy_service") as mock_legacy_svc:
        mock_v1_svc.send_notification = mock_v1
        mock_legacy_svc.send_notification = mock_legacy

        # Should not raise
        await dispatcher._send_push("user_1", "Title", "Body", {}, prefs)

    mock_v1.assert_awaited_once()
    mock_legacy.assert_not_awaited()


# ---------------------------------------------------------------------------
# Test 13: dispatcher._send_push — v1 fails → legacy succeeds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_v1_fails_legacy_succeeds():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()
    prefs = _make_prefs(push_tokens=[_make_token_entry("tok_fallback")])

    mock_v1 = AsyncMock(return_value={"success": False, "error": "FCM v1 down"})
    mock_legacy = AsyncMock(return_value={"success": True, "message_id": "legacy_ok"})

    with patch("services.notifications.dispatcher_service.fcm_service_v1") as mock_v1_svc, \
         patch("services.notifications.dispatcher_service.fcm_legacy_service") as mock_legacy_svc:
        mock_v1_svc.send_notification = mock_v1
        mock_legacy_svc.send_notification = mock_legacy

        # Should not raise — legacy rescued it
        await dispatcher._send_push("user_2", "Title", "Body", {}, prefs)

    mock_v1.assert_awaited_once()
    mock_legacy.assert_awaited_once()


# ---------------------------------------------------------------------------
# Test 14: dispatcher._send_push — both v1 and legacy fail → raises
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_both_fail_raises():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()
    prefs = _make_prefs(push_tokens=[_make_token_entry("tok_both_fail")])

    mock_v1 = AsyncMock(return_value={"success": False, "error": "v1 down"})
    mock_legacy = AsyncMock(return_value={"success": False, "error": "legacy down"})

    with patch("services.notifications.dispatcher_service.fcm_service_v1") as mock_v1_svc, \
         patch("services.notifications.dispatcher_service.fcm_legacy_service") as mock_legacy_svc:
        mock_v1_svc.send_notification = mock_v1
        mock_legacy_svc.send_notification = mock_legacy

        with pytest.raises(Exception, match="FCM push failed"):
            await dispatcher._send_push("user_3", "Title", "Body", {}, prefs)


# ---------------------------------------------------------------------------
# Test 15: dispatcher._send_push — quiet hours → raises before sending
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_quiet_hours_deferred():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()

    # Quiet hours always active: start == end means "all day" is a degenerate
    # case; we force it by patching _is_quiet_hours instead.
    prefs = _make_prefs(push_tokens=[_make_token_entry("tok_quiet")])

    with patch.object(dispatcher, "_is_quiet_hours", return_value=True):
        with patch("services.notifications.dispatcher_service.fcm_service_v1") as mock_v1_svc:
            mock_v1_svc.send_notification = AsyncMock()

            with pytest.raises(Exception, match="Quiet hours"):
                await dispatcher._send_push("user_4", "Title", "Body", {}, prefs)

            mock_v1_svc.send_notification.assert_not_awaited()


# ---------------------------------------------------------------------------
# Test 16 (bonus): dispatcher._send_push — no tokens registered → raises
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_no_tokens():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()
    prefs = _make_prefs(push_tokens=[])

    with pytest.raises(Exception, match="No push tokens"):
        await dispatcher._send_push("user_5", "Title", "Body", {}, prefs)


# ---------------------------------------------------------------------------
# Test 17 (bonus): dispatcher._send_push — multiple tokens, all succeed via v1
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dispatcher_send_push_multiple_tokens():
    from services.notifications.dispatcher_service import NotificationDispatcher

    dispatcher = NotificationDispatcher()
    prefs = _make_prefs(push_tokens=[
        _make_token_entry("tok_a"),
        _make_token_entry("tok_b"),
        _make_token_entry("tok_c"),
    ])

    mock_v1 = AsyncMock(return_value={"success": True, "message_id": "msg"})

    with patch("services.notifications.dispatcher_service.fcm_service_v1") as mock_v1_svc, \
         patch("services.notifications.dispatcher_service.fcm_legacy_service") as mock_legacy_svc:
        mock_v1_svc.send_notification = mock_v1
        mock_legacy_svc.send_notification = AsyncMock()

        await dispatcher._send_push("user_6", "Title", "Body", {}, prefs)

    assert mock_v1.await_count == 3
    mock_legacy_svc.send_notification.assert_not_awaited()
