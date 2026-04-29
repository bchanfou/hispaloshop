"""
Tests for FCMServiceV1 and FCMLegacyService.

Covers:
- send_notification via v1 returns success
- Invalid token format → ValueError raised, no HTTP call made
- v1 network timeout → fallback to legacy + structured log
- Both v1 and legacy fail → final error raised
- data payload is forwarded correctly (all values stringified)
- icon_url/image is included in the notification payload
- Dispatcher _send_push routes v1→legacy correctly
"""
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure test env vars are present before importing services
os.environ.setdefault("FCM_SERVICE_ACCOUNT_JSON", json.dumps({
    "type": "service_account",
    "project_id": "test-project-123",
    "private_key_id": "key-id",
    "private_key": "fake-key",
    "client_email": "test@test-project-123.iam.gserviceaccount.com",
    "client_id": "123456",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
}))
os.environ.setdefault("FCM_SERVER_KEY", "AAAATEST_LEGACY_SERVER_KEY")

from services.fcm_service import FCMServiceV1
from services.fcm_legacy import FCMLegacyService

# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_TOKEN = "ABCDEFGHabcdefgh12345678_-valid-token"
INVALID_TOKEN = "invalid token with spaces!"


def _make_httpx_response(status_code: int = 200, body: dict | None = None):
    """Return a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = body or {"name": "projects/test/messages/123"}
    resp.text = json.dumps(body or {"name": "projects/test/messages/123"})
    return resp


# ── FCMServiceV1 tests ────────────────────────────────────────────────────────


class TestFCMServiceV1TokenValidation:
    def test_valid_token_passes(self):
        svc = FCMServiceV1()
        assert svc._is_valid_token(VALID_TOKEN) is True

    def test_invalid_token_with_spaces_fails(self):
        svc = FCMServiceV1()
        assert svc._is_valid_token(INVALID_TOKEN) is False

    def test_empty_token_fails(self):
        svc = FCMServiceV1()
        assert svc._is_valid_token("") is False

    def test_token_with_special_chars_fails(self):
        svc = FCMServiceV1()
        assert svc._is_valid_token("token!@#$") is False

    @pytest.mark.asyncio
    async def test_invalid_token_raises_value_error_without_http_call(self):
        """send_notification must raise ValueError for bad tokens — no HTTP calls."""
        svc = FCMServiceV1()
        with patch.object(svc, "_get_access_token") as mock_token:
            with pytest.raises(ValueError):
                await svc.send_notification(
                    token=INVALID_TOKEN,
                    title="Test",
                    body="Body",
                )
            mock_token.assert_not_called()


class TestFCMServiceV1SendSuccess:
    @pytest.mark.asyncio
    async def test_send_notification_returns_success(self):
        """Successful v1 send returns parsed FCM response."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        ok_resp = _make_httpx_response(200, {"name": "projects/test/messages/msg-id-1"})

        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = instance

            result = await svc.send_notification(
                token=VALID_TOKEN,
                title="Hello",
                body="World",
            )

        assert result == {"name": "projects/test/messages/msg-id-1"}
        instance.post.assert_called_once()
        call_kwargs = instance.post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs.args[1]
        assert payload["message"]["token"] == VALID_TOKEN
        assert payload["message"]["notification"]["title"] == "Hello"
        assert payload["message"]["notification"]["body"] == "World"

    @pytest.mark.asyncio
    async def test_data_payload_stringified(self):
        """All data values must be strings in the FCM v1 payload."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        ok_resp = _make_httpx_response(200)
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = instance

            await svc.send_notification(
                token=VALID_TOKEN,
                title="T",
                body="B",
                data={"count": 42, "active": True, "label": "sale"},
            )

        payload = instance.post.call_args.kwargs.get("json") or instance.post.call_args.args[1]
        sent_data = payload["message"]["data"]
        assert sent_data["count"] == "42"
        assert sent_data["active"] == "True"
        assert sent_data["label"] == "sale"

    @pytest.mark.asyncio
    async def test_icon_url_included_in_notification(self):
        """icon_url must appear as 'image' inside notification payload."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        ok_resp = _make_httpx_response(200)
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = instance

            await svc.send_notification(
                token=VALID_TOKEN,
                title="T",
                body="B",
                icon_url="https://example.com/img.png",
            )

        payload = instance.post.call_args.kwargs.get("json") or instance.post.call_args.args[1]
        assert payload["message"]["notification"]["image"] == "https://example.com/img.png"


class TestFCMServiceV1Retry:
    @pytest.mark.asyncio
    async def test_network_error_retries_once_then_raises(self):
        """On NetworkError the service retries once and raises after the second failure."""
        import httpx as _httpx

        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(
                side_effect=_httpx.NetworkError("connection refused")
            )
            MockClient.return_value = instance

            with pytest.raises(_httpx.NetworkError):
                await svc.send_notification(
                    token=VALID_TOKEN,
                    title="T",
                    body="B",
                )

        # Should have tried exactly 2 times
        assert instance.post.call_count == 2

    @pytest.mark.asyncio
    async def test_fcm_error_status_raises_runtime_error(self):
        """Non-2xx status from FCM raises RuntimeError."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        err_resp = _make_httpx_response(400, {"error": {"message": "INVALID_ARGUMENT"}})
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=err_resp)
            MockClient.return_value = instance

            with pytest.raises(RuntimeError, match="FCM v1 error 400"):
                await svc.send_notification(
                    token=VALID_TOKEN,
                    title="T",
                    body="B",
                )


# ── FCMLegacyService tests ────────────────────────────────────────────────────


class TestFCMLegacyService:
    @pytest.mark.asyncio
    async def test_send_notification_success(self):
        svc = FCMLegacyService()

        ok_resp = _make_httpx_response(200, {"multicast_id": 1, "success": 1, "failure": 0})
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = instance

            result = await svc.send_notification(
                token=VALID_TOKEN,
                title="Hello",
                body="World",
            )

        assert result["success"] == 1
        payload = instance.post.call_args.kwargs.get("json") or instance.post.call_args.args[1]
        assert payload["to"] == VALID_TOKEN
        assert payload["notification"]["title"] == "Hello"

    @pytest.mark.asyncio
    async def test_icon_url_in_legacy_payload(self):
        svc = FCMLegacyService()
        ok_resp = _make_httpx_response(200)
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = instance

            await svc.send_notification(
                token=VALID_TOKEN,
                title="T",
                body="B",
                icon_url="https://example.com/icon.png",
            )

        payload = instance.post.call_args.kwargs.get("json") or instance.post.call_args.args[1]
        assert payload["notification"]["icon"] == "https://example.com/icon.png"

    @pytest.mark.asyncio
    async def test_legacy_error_status_raises(self):
        svc = FCMLegacyService()
        err_resp = _make_httpx_response(401, {"error": "Unauthorized"})
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            instance = MagicMock()
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            instance.post = AsyncMock(return_value=err_resp)
            MockClient.return_value = instance

            with pytest.raises(RuntimeError, match="FCM legacy error 401"):
                await svc.send_notification(token=VALID_TOKEN, title="T", body="B")

    def test_missing_server_key_raises(self, monkeypatch):
        monkeypatch.delenv("FCM_SERVER_KEY", raising=False)
        svc = FCMLegacyService()
        with pytest.raises(RuntimeError, match="FCM_SERVER_KEY not configured"):
            svc._get_server_key()


# ── Dispatcher fallback integration ──────────────────────────────────────────


def _build_dispatcher():
    """Import NotificationDispatcher with all external deps mocked."""
    import sys
    import types

    # Stub out heavy external deps so the module can be imported without them
    for mod_name in [
        "bson",
        "core.database",
        "core.cache",
        "core.config",
        "pytz",
    ]:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)

    # bson needs ObjectId
    bson_mod = sys.modules["bson"]
    if not hasattr(bson_mod, "ObjectId"):
        bson_mod.ObjectId = lambda x: x  # type: ignore[attr-defined]

    # core.database needs 'db'
    db_mod = sys.modules["core.database"]
    if not hasattr(db_mod, "db"):
        db_mod.db = MagicMock()  # type: ignore[attr-defined]

    # core.cache needs 'redis_client'
    cache_mod = sys.modules["core.cache"]
    if not hasattr(cache_mod, "redis_client"):
        cache_mod.redis_client = MagicMock()  # type: ignore[attr-defined]

    # Force re-import if previously cached with errors
    for key in list(sys.modules.keys()):
        if "dispatcher_service" in key or "notifications.dispatcher" in key:
            del sys.modules[key]

    from services.notifications.dispatcher_service import NotificationDispatcher
    return NotificationDispatcher


class TestDispatcherFCMFallback:
    """Test that _send_push in the dispatcher routes v1→legacy correctly."""

    @pytest.mark.asyncio
    async def test_v1_timeout_triggers_legacy_fallback(self, caplog):
        """When v1 raises a network error, the dispatcher falls back to legacy."""
        import httpx as _httpx
        import logging

        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        mock_v1 = AsyncMock(
            side_effect=_httpx.TimeoutException("timeout")
        )
        mock_legacy = AsyncMock(
            return_value={"success": 1}
        )

        dispatcher._fcm_v1 = MagicMock()
        dispatcher._fcm_v1.send_notification = mock_v1
        dispatcher._fcm_legacy = MagicMock()
        dispatcher._fcm_legacy.send_notification = mock_legacy

        prefs = {
            "push_tokens": [{"token": VALID_TOKEN}],
            "master_push_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00",
            "quiet_hours_timezone": "UTC",
        }

        with caplog.at_level(logging.WARNING):
            await dispatcher._send_push(
                user_id="user-1",
                title="Test",
                body="Body",
                data={},
                prefs=prefs,
            )

        mock_v1.assert_called_once()
        mock_legacy.assert_called_once()
        assert any("falling back to legacy" in record.message for record in caplog.records)

    @pytest.mark.asyncio
    async def test_both_v1_and_legacy_fail_raises(self):
        """When both v1 and legacy fail, _send_push raises the legacy exception."""
        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        dispatcher._fcm_v1 = MagicMock()
        dispatcher._fcm_v1.send_notification = AsyncMock(
            side_effect=RuntimeError("v1 error")
        )
        dispatcher._fcm_legacy = MagicMock()
        dispatcher._fcm_legacy.send_notification = AsyncMock(
            side_effect=RuntimeError("legacy error")
        )

        prefs = {
            "push_tokens": [{"token": VALID_TOKEN}],
            "master_push_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00",
            "quiet_hours_timezone": "UTC",
        }

        with pytest.raises(RuntimeError, match="legacy error"):
            await dispatcher._send_push(
                user_id="user-1",
                title="Test",
                body="Body",
                data={},
                prefs=prefs,
            )

    @pytest.mark.asyncio
    async def test_invalid_token_skipped_no_legacy_call(self):
        """Invalid tokens are skipped without calling legacy."""
        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        mock_v1 = AsyncMock(side_effect=ValueError("bad token"))
        mock_legacy = AsyncMock()

        dispatcher._fcm_v1 = MagicMock()
        dispatcher._fcm_v1.send_notification = mock_v1
        dispatcher._fcm_legacy = MagicMock()
        dispatcher._fcm_legacy.send_notification = mock_legacy

        prefs = {
            "push_tokens": [{"token": INVALID_TOKEN}],
            "master_push_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00",
            "quiet_hours_timezone": "UTC",
        }

        # Should not raise — invalid token is silently skipped
        await dispatcher._send_push(
            user_id="user-1",
            title="Test",
            body="Body",
            data={},
            prefs=prefs,
        )

        mock_legacy.assert_not_called()
