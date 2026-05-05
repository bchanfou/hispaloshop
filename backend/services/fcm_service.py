"""FCM HTTP v1 Service — OAuth2 + Google API"""
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Valid FCM token format: alphanumeric plus underscore, hyphen, colon
_TOKEN_REGEX = re.compile(r"^[a-zA-Z0-9_:-]+$")


class FCMServiceV1:
    """Firebase Cloud Messaging HTTP v1 API client"""

    def __init__(self) -> None:
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        icon_url: Optional[str] = None,
        priority: str = "NORMAL",
    ) -> Dict[str, Any]:
        """
        Send notification via FCM HTTP v1 API.
        Returns: {"success": bool, "message_id": str} or {"success": False, "error": str}
        """
        # Validate token format early — no HTTP call if clearly invalid
        if not token or not _TOKEN_REGEX.match(token):
            logger.warning("[FCM v1] Invalid token format: %s...", token[:20] if token else "")
            return {"success": False, "error": "Invalid token format"}

        sa_json = getattr(settings, "FCM_SERVICE_ACCOUNT_JSON", None)
        if not sa_json:
            return {"success": False, "error": "FCM_SERVICE_ACCOUNT_JSON not configured"}

        sa_info = json.loads(sa_json) if isinstance(sa_json, str) else sa_json
        project_id = sa_info.get("project_id")

        if not project_id:
            return {"success": False, "error": "project_id missing in service account"}

        # Get fresh access token
        try:
            access_token = await self._get_access_token(sa_info)
        except Exception as exc:
            logger.error("[FCM v1] Token generation failed: %s", exc)
            return {"success": False, "error": f"Token generation failed: {exc}"}

        # Build message payload
        message: Dict[str, Any] = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body,
                },
                "data": {k: str(v) for k, v in (data or {}).items()},
                "android": {"priority": priority},
                "webpush": {
                    "headers": {"Urgency": "high" if priority == "HIGH" else "normal"}
                },
            }
        }

        if icon_url:
            message["message"]["notification"]["image"] = icon_url

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        fcm_url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(fcm_url, headers=headers, json=message)

            if response.status_code in (200, 201):
                message_id = response.json().get("name", "unknown")
                logger.info("[FCM v1] Sent to %s... -> %s", token[:20], message_id)
                return {"success": True, "message_id": message_id}

            error_text = response.text[:200]
            logger.warning("[FCM v1] Failed (%s): %s", response.status_code, error_text)
            return {"success": False, "error": f"FCM error {response.status_code}: {error_text}"}

        except httpx.TimeoutException:
            logger.warning("[FCM v1] Timeout for token %s...", token[:20])
            return {"success": False, "error": "FCM timeout", "is_timeout": True}
        except Exception as exc:
            logger.error("[FCM v1] Unexpected error: %s", exc)
            return {"success": False, "error": f"Unexpected error: {exc}"}

    async def _get_access_token(self, sa_info: Dict) -> str:
        """Get (or return cached) OAuth2 access token using service account credentials."""
        now = datetime.now(timezone.utc)
        if self._access_token and self._token_expires_at and now < self._token_expires_at:
            return self._access_token

        try:
            from google.oauth2 import service_account
            from google.auth.transport.requests import Request

            credentials = service_account.Credentials.from_service_account_info(
                sa_info,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
            credentials.refresh(Request())
            self._access_token = credentials.token
            self._token_expires_at = (
                credentials.expiry.replace(tzinfo=timezone.utc)
                if credentials.expiry
                else now + timedelta(minutes=55)
            )
        except ImportError:
            # Fallback: manual JWT if google-auth not installed
            import time
            import jwt as pyjwt  # PyJWT

            iat = int(time.time())
            exp = iat + 3600
            payload = {
                "iss": sa_info["client_email"],
                "sub": sa_info["client_email"],
                "aud": "https://oauth2.googleapis.com/token",
                "iat": iat,
                "exp": exp,
                "scope": "https://www.googleapis.com/auth/firebase.messaging",
            }
            signed_jwt = pyjwt.encode(payload, sa_info["private_key"], algorithm="RS256")

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": signed_jwt,
                    },
                )
                resp.raise_for_status()
                token_data = resp.json()

            self._access_token = token_data["access_token"]
            self._token_expires_at = now + timedelta(seconds=token_data.get("expires_in", 3500))

        return self._access_token  # type: ignore[return-value]

    def invalidate_token(self) -> None:
        """Force next call to re-acquire an access token (e.g. after a 401)."""
        self._access_token = None
        self._token_expires_at = None


# Singleton instance
fcm_service_v1 = FCMServiceV1()
