"""
Tests for FCMServiceV1 and FCMLegacyService.

Covers:
- send_notification via v1 returns success dict
- Invalid token format → returns {"success": False} without HTTP call
- v1 timeout → returns {"success": False, "is_timeout": True}
- v1 failure → fallback to legacy + structured log
- Both v1 and legacy fail → Exception raised by dispatcher
- data payload forwarded correctly (all values stringified)
- icon_url/image included in notification payload
- Dispatcher _send_push routes v1→legacy via dict results
"""
import json
import os
import sys
import types
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Shared test data ──────────────────────────────────────────────────────────

VALID_TOKEN = "ABCDEFGHabcdefgh12345678_-valid-token"
INVALID_TOKEN = "invalid token with spaces!"

_SA_JSON = json.dumps({
    "type": "service_account",
    "project_id": "test-project-123",
    "private_key_id": "key-id",
    "private_key": "fake-key",
    "client_email": "test@test-project-123.iam.gserviceaccount.com",
    "client_id": "123456",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
})

# Stub core.config before any service import
_fake_settings = SimpleNamespace(
    FCM_SERVICE_ACCOUNT_JSON=_SA_JSON,
    FCM_SERVER_KEY="AAAATEST_LEGACY_SERVER_KEY",
)
if "core.config" not in sys.modules:
    _mod = types.ModuleType("core.config")
    _mod.settings = _fake_settings  # type: ignore[attr-defined]
    sys.modules["core.config"] = _mod
else:
    sys.modules["core.config"].settings = _fake_settings  # type: ignore[attr-defined]

from services.fcm_service import FCMServiceV1  # noqa: E402
from services.fcm_legacy import FCMLegacyService  # noqa: E402


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_httpx_response(status_code: int = 200, body: dict | None = None):
    """Return a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = body or {"name": "projects/test/messages/123"}
    resp.text = json.dumps(body or {"name": "projects/test/messages/123"})
    return resp


# ── FCMServiceV1 tests ────────────────────────────────────────────────────────


class TestFCMServiceV1TokenValidation:
    @pytest.mark.asyncio
    async def test_valid_token_returns_success(self):
        """Valid token leads to HTTP call; mock 200 → returns success dict."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        ok_resp = _make_httpx_response(200, {"name": "projects/test/messages/123"})
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_invalid_token_returns_failure_without_http_call(self):
        """Invalid token → returns {success: False} immediately, no HTTP call."""
        svc = FCMServiceV1()
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            result = await svc.send_notification(token=INVALID_TOKEN, title="T", body="B")

        assert result["success"] is False
        assert "Invalid token" in result.get("error", "")
        MockClient.assert_not_called()

    @pytest.mark.asyncio
    async def test_empty_token_returns_failure(self):
        """Empty string token → returns {success: False}."""
        svc = FCMServiceV1()
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            result = await svc.send_notification(token="", title="T", body="B")

        assert result["success"] is False
        MockClient.assert_not_called()

    @pytest.mark.asyncio
    async def test_token_with_colon_is_valid(self):
        """Real FCM registration tokens contain colons — must be accepted."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        valid_colon_token = "APA91bHPRgkFLJu2PhHETU4zc_ioTXp:APJoHg8m-valid-fcm-token"
        ok_resp = _make_httpx_response(200, {"name": "projects/test/messages/colon-123"})
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            result = await svc.send_notification(token=valid_colon_token, title="T", body="B")

        assert result["success"] is True
        MockClient.assert_called_once()


class TestFCMServiceV1SendSuccess:
    @pytest.mark.asyncio
    async def test_send_notification_returns_success_dict(self):
        """Successful v1 send returns {"success": True, "message_id": ...}."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        ok_resp = _make_httpx_response(200, {"name": "projects/test/messages/msg-id-1"})
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            result = await svc.send_notification(
                token=VALID_TOKEN, title="Hello", body="World"
            )

        assert result["success"] is True
        assert result["message_id"] == "projects/test/messages/msg-id-1"
        # Verify payload structure
        call_kwargs = inst.post.call_args
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
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            await svc.send_notification(
                token=VALID_TOKEN, title="T", body="B",
                data={"count": 42, "active": True, "label": "sale"},
            )

        payload = inst.post.call_args.kwargs.get("json") or inst.post.call_args.args[1]
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
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            await svc.send_notification(
                token=VALID_TOKEN, title="T", body="B",
                icon_url="https://example.com/img.png",
            )

        payload = inst.post.call_args.kwargs.get("json") or inst.post.call_args.args[1]
        assert payload["message"]["notification"]["image"] == "https://example.com/img.png"


class TestFCMServiceV1ErrorHandling:
    @pytest.mark.asyncio
    async def test_timeout_returns_failure_dict(self):
        """TimeoutException → returns {"success": False, "is_timeout": True}."""
        import httpx as _httpx

        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(side_effect=_httpx.TimeoutException("timeout"))
            MockClient.return_value = inst

            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")

        assert result["success"] is False
        assert result.get("is_timeout") is True

    @pytest.mark.asyncio
    async def test_fcm_error_status_returns_failure_dict(self):
        """Non-2xx status from FCM returns {"success": False, "error": "..."}."""
        svc = FCMServiceV1()
        svc._access_token = "fake-access-token"
        from datetime import datetime, timezone, timedelta
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        err_resp = _make_httpx_response(400, {"error": {"message": "INVALID_ARGUMENT"}})
        with patch("services.fcm_service.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=err_resp)
            MockClient.return_value = inst

            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")

        assert result["success"] is False
        assert "400" in result.get("error", "")

    @pytest.mark.asyncio
    async def test_missing_service_account_returns_failure(self):
        """Missing FCM_SERVICE_ACCOUNT_JSON → returns {"success": False}."""
        orig = sys.modules["core.config"].settings.FCM_SERVICE_ACCOUNT_JSON  # type: ignore[attr-defined]
        try:
            sys.modules["core.config"].settings.FCM_SERVICE_ACCOUNT_JSON = None  # type: ignore[attr-defined]
            svc = FCMServiceV1()
            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")
            assert result["success"] is False
        finally:
            sys.modules["core.config"].settings.FCM_SERVICE_ACCOUNT_JSON = orig  # type: ignore[attr-defined]


# ── FCMLegacyService tests ────────────────────────────────────────────────────


class TestFCMLegacyService:
    @pytest.mark.asyncio
    async def test_send_notification_success(self):
        """Successful legacy send returns {"success": True, "message_id": ...}."""
        svc = FCMLegacyService()

        ok_resp = _make_httpx_response(200, {
            "multicast_id": 1, "success": 1, "failure": 0,
            "results": [{"message_id": "0:1234567890"}],
        })
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            result = await svc.send_notification(
                token=VALID_TOKEN, title="Hello", body="World"
            )

        assert result["success"] is True
        payload = inst.post.call_args.kwargs.get("json") or inst.post.call_args.args[1]
        assert payload["to"] == VALID_TOKEN
        assert payload["notification"]["title"] == "Hello"

    @pytest.mark.asyncio
    async def test_icon_url_in_legacy_payload(self):
        """icon_url must be stored as 'image' inside notification for legacy."""
        svc = FCMLegacyService()
        ok_resp = _make_httpx_response(200, {"success": 1, "results": [{"message_id": "x"}]})
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(return_value=ok_resp)
            MockClient.return_value = inst

            await svc.send_notification(
                token=VALID_TOKEN, title="T", body="B",
                icon_url="https://example.com/icon.png",
            )

        payload = inst.post.call_args.kwargs.get("json") or inst.post.call_args.args[1]
        assert payload["notification"]["image"] == "https://example.com/icon.png"

    @pytest.mark.asyncio
    async def test_legacy_timeout_returns_failure_dict(self):
        """TimeoutException → returns {"success": False, "is_timeout": True}."""
        import httpx as _httpx

        svc = FCMLegacyService()
        with patch("services.fcm_legacy.httpx.AsyncClient") as MockClient:
            inst = MagicMock()
            inst.__aenter__ = AsyncMock(return_value=inst)
            inst.__aexit__ = AsyncMock(return_value=False)
            inst.post = AsyncMock(side_effect=_httpx.TimeoutException("timeout"))
            MockClient.return_value = inst

            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")

        assert result["success"] is False
        assert result.get("is_timeout") is True

    @pytest.mark.asyncio
    async def test_missing_server_key_returns_failure(self):
        """Missing FCM_SERVER_KEY → returns {"success": False}."""
        orig = sys.modules["core.config"].settings.FCM_SERVER_KEY  # type: ignore[attr-defined]
        try:
            sys.modules["core.config"].settings.FCM_SERVER_KEY = None  # type: ignore[attr-defined]
            svc = FCMLegacyService()
            result = await svc.send_notification(token=VALID_TOKEN, title="T", body="B")
            assert result["success"] is False
        finally:
            sys.modules["core.config"].settings.FCM_SERVER_KEY = orig  # type: ignore[attr-defined]


# ── Dispatcher fallback integration ──────────────────────────────────────────


def _build_dispatcher():
    """Import NotificationDispatcher with all external deps mocked."""
    # Stub heavy external deps
    for mod_name in ["bson", "core.database", "core.cache", "pytz"]:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)

    bson_mod = sys.modules["bson"]
    if not hasattr(bson_mod, "ObjectId"):
        bson_mod.ObjectId = lambda x: x  # type: ignore[attr-defined]

    db_mod = sys.modules["core.database"]
    if not hasattr(db_mod, "db"):
        db_mod.db = MagicMock()  # type: ignore[attr-defined]

    cache_mod = sys.modules["core.cache"]
    if not hasattr(cache_mod, "redis_client"):
        cache_mod.redis_client = MagicMock()  # type: ignore[attr-defined]

    # Evict cached dispatcher module so fresh import picks up mocked deps
    for key in list(sys.modules.keys()):
        if "dispatcher_service" in key or "notifications.dispatcher" in key:
            del sys.modules[key]

    from services.notifications.dispatcher_service import NotificationDispatcher
    return NotificationDispatcher


class TestDispatcherFCMFallback:
    """Test that _send_push routes v1→legacy via the module-level singletons."""

    @pytest.mark.asyncio
    async def test_v1_failure_triggers_legacy_fallback(self, caplog):
        """When v1 returns success=False, the dispatcher falls back to legacy."""
        import logging

        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        # Patch the module-level singletons used inside dispatcher_service
        mock_v1_result = {"success": False, "error": "FCM timeout", "is_timeout": True}
        mock_legacy_result = {"success": True, "message_id": "msg-123"}

        with patch("services.notifications.dispatcher_service.fcm_service_v1") as mv1, \
             patch("services.notifications.dispatcher_service.fcm_legacy_service") as mlg:
            mv1.send_notification = AsyncMock(return_value=mock_v1_result)
            mlg.send_notification = AsyncMock(return_value=mock_legacy_result)

            prefs = {
                "push_tokens": [{"token": VALID_TOKEN}],
                "quiet_hours_start": "23:00",
                "quiet_hours_end": "07:00",
                "quiet_hours_timezone": "UTC",
            }

            with caplog.at_level(logging.WARNING):
                await dispatcher._send_push(
                    user_id="user-1", title="Test", body="Body", data={}, prefs=prefs
                )

        mv1.send_notification.assert_called_once()
        mlg.send_notification.assert_called_once()
        assert any("legacy" in r.message.lower() for r in caplog.records)

    @pytest.mark.asyncio
    async def test_both_v1_and_legacy_fail_raises(self):
        """When both v1 and legacy return success=False, _send_push raises."""
        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        with patch("services.notifications.dispatcher_service.fcm_service_v1") as mv1, \
             patch("services.notifications.dispatcher_service.fcm_legacy_service") as mlg:
            mv1.send_notification = AsyncMock(
                return_value={"success": False, "error": "v1 error"}
            )
            mlg.send_notification = AsyncMock(
                return_value={"success": False, "error": "legacy error"}
            )

            prefs = {
                "push_tokens": [{"token": VALID_TOKEN}],
                "quiet_hours_start": "23:00",
                "quiet_hours_end": "07:00",
                "quiet_hours_timezone": "UTC",
            }

            with pytest.raises(Exception, match="FCM push failed"):
                await dispatcher._send_push(
                    user_id="user-1", title="Test", body="Body", data={}, prefs=prefs
                )

    @pytest.mark.asyncio
    async def test_v1_success_skips_legacy(self):
        """When v1 succeeds, legacy is never called."""
        NotificationDispatcher = _build_dispatcher()
        dispatcher = NotificationDispatcher()

        with patch("services.notifications.dispatcher_service.fcm_service_v1") as mv1, \
             patch("services.notifications.dispatcher_service.fcm_legacy_service") as mlg:
            mv1.send_notification = AsyncMock(
                return_value={"success": True, "message_id": "msg-ok"}
            )
            mlg.send_notification = AsyncMock()

            prefs = {
                "push_tokens": [{"token": VALID_TOKEN}],
                "quiet_hours_start": "23:00",
                "quiet_hours_end": "07:00",
                "quiet_hours_timezone": "UTC",
            }

            await dispatcher._send_push(
                user_id="user-1", title="Test", body="Body", data={}, prefs=prefs
            )

        mlg.send_notification.assert_not_called()


# ── OAuth2 token generation tests ─────────────────────────────────────────────


class TestFCMServiceV1OAuth2:
    """Tests for _get_access_token: caching, refresh, and google-auth path."""

    @pytest.mark.asyncio
    async def test_get_access_token_caches_valid_token(self):
        """_get_access_token returns cached token without calling google-auth."""
        from datetime import datetime, timezone, timedelta

        svc = FCMServiceV1()
        svc._access_token = "cached-token"
        svc._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        sa_info = json.loads(_SA_JSON)
        with patch.dict(sys.modules, {}):
            token = await svc._get_access_token(sa_info)

        assert token == "cached-token"

    @pytest.mark.asyncio
    async def test_get_access_token_refreshes_expired_token(self):
        """_get_access_token refreshes when the cached token has expired."""
        from datetime import datetime, timezone, timedelta

        svc = FCMServiceV1()
        svc._access_token = "old-token"
        svc._token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)

        mock_creds = MagicMock()
        mock_creds.token = "new-token"
        mock_creds.expiry = datetime.now(timezone.utc) + timedelta(minutes=55)

        mock_sa_module = MagicMock()
        mock_sa_module.Credentials.from_service_account_info.return_value = mock_creds
        mock_transport_module = MagicMock()
        mock_transport_module.Request = MagicMock(return_value=MagicMock())

        sa_info = json.loads(_SA_JSON)
        with patch.dict(sys.modules, {
            "google": types.ModuleType("google"),
            "google.auth": types.ModuleType("google.auth"),
            "google.oauth2": types.ModuleType("google.oauth2"),
            "google.auth.transport": types.ModuleType("google.auth.transport"),
            "google.auth.transport.requests": mock_transport_module,
            "google.oauth2.service_account": mock_sa_module,
        }):
            token = await svc._get_access_token(sa_info)

        assert token == "new-token"
        assert svc._access_token == "new-token"

    @pytest.mark.asyncio
    async def test_get_access_token_uses_google_auth_library(self):
        """_get_access_token acquires a fresh token via google.oauth2.service_account."""
        from datetime import datetime, timezone, timedelta

        svc = FCMServiceV1()  # no cached token

        mock_creds = MagicMock()
        mock_creds.token = "fresh-token"
        mock_creds.expiry = datetime.now(timezone.utc) + timedelta(minutes=55)

        mock_sa_module = MagicMock()
        mock_sa_module.Credentials.from_service_account_info.return_value = mock_creds
        mock_transport_module = MagicMock()
        mock_transport_module.Request = MagicMock(return_value=MagicMock())

        sa_info = json.loads(_SA_JSON)
        with patch.dict(sys.modules, {
            "google": types.ModuleType("google"),
            "google.auth": types.ModuleType("google.auth"),
            "google.oauth2": types.ModuleType("google.oauth2"),
            "google.auth.transport": types.ModuleType("google.auth.transport"),
            "google.auth.transport.requests": mock_transport_module,
            "google.oauth2.service_account": mock_sa_module,
        }):
            token = await svc._get_access_token(sa_info)

        assert token == "fresh-token"
        mock_sa_module.Credentials.from_service_account_info.assert_called_once_with(
            sa_info,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"],
        )
