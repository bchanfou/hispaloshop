"""
FCM HTTP v1 Service
Reemplaza FCM Legacy API usando OAuth2 con service account.
"""
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)

# FCM device tokens: alphanumeric, underscore, hyphen (base64url alphabet)
_TOKEN_RE = re.compile(r"^[a-zA-Z0-9_-]+$")

FCM_V1_BASE_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"


class FCMServiceV1:
    """
    Firebase Cloud Messaging HTTP v1 API service.
    Auth: OAuth2 service account (FCM_SERVICE_ACCOUNT_JSON env var).
    """

    def __init__(self) -> None:
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    # ── Token validation ──────────────────────────────────────────────────

    def _is_valid_token(self, token: str) -> bool:
        """Return True if token matches the expected FCM token format."""
        return bool(token and _TOKEN_RE.match(token))

    # ── OAuth2 access token (service account) ────────────────────────────

    def _load_service_account(self) -> dict:
        import os

        raw = os.environ.get("FCM_SERVICE_ACCOUNT_JSON")
        if not raw:
            # Attempt import via pydantic settings (optional)
            try:
                from core.config import settings

                raw = getattr(settings, "FCM_SERVICE_ACCOUNT_JSON", None)
            except Exception:
                pass
        if not raw:
            raise RuntimeError(
                "FCM_SERVICE_ACCOUNT_JSON not configured. "
                "Set the env var with the contents of your Firebase service account JSON."
            )
        return json.loads(raw) if isinstance(raw, str) else raw

    async def _get_access_token(self) -> str:
        """Return a valid OAuth2 Bearer token, refreshing if needed."""
        now = datetime.now(timezone.utc)
        if (
            self._access_token
            and self._token_expires_at
            and now < self._token_expires_at
        ):
            return self._access_token

        sa = self._load_service_account()

        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            creds = service_account.Credentials.from_service_account_info(
                sa,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
            creds.refresh(Request())
            self._access_token = creds.token
            self._token_expires_at = (
                creds.expiry.replace(tzinfo=timezone.utc)
                if creds.expiry
                else now + timedelta(minutes=55)
            )
        except ImportError:
            # Fallback: manual JWT + token exchange when google-auth is absent
            import time

            import jwt as pyjwt

            iat = int(time.time())
            exp = iat + 3600
            jwt_payload = {
                "iss": sa["client_email"],
                "sub": sa["client_email"],
                "aud": "https://oauth2.googleapis.com/token",
                "iat": iat,
                "exp": exp,
                "scope": "https://www.googleapis.com/auth/firebase.messaging",
            }
            signed_jwt = pyjwt.encode(
                jwt_payload, sa["private_key"], algorithm="RS256"
            )

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
            self._token_expires_at = now + timedelta(
                seconds=token_data.get("expires_in", 3500)
            )

        logger.info("[FCM-v1] OAuth2 access token refreshed")
        return self._access_token

    # ── Send notification ─────────────────────────────────────────────────

    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        icon_url: Optional[str] = None,
    ) -> dict:
        """
        Send a push notification via FCM HTTP v1.

        Raises ValueError for invalid tokens (no network call made).
        Retries once on network errors before raising.
        Returns the parsed FCM response dict on success.
        """
        if not self._is_valid_token(token):
            logger.warning("[FCM-v1] Rejected invalid token format")
            raise ValueError(f"Invalid FCM token format: {token!r}")

        sa = self._load_service_account()
        project_id = sa.get("project_id")
        if not project_id:
            raise RuntimeError("FCM service account is missing 'project_id'")

        url = FCM_V1_BASE_URL.format(project_id=project_id)

        # FCM v1 requires all data values to be strings
        str_data: Dict[str, str] = (
            {k: str(v) for k, v in data.items()} if data else {}
        )

        notification_payload: Dict = {"title": title, "body": body}
        if icon_url:
            notification_payload["image"] = icon_url

        message: dict = {
            "message": {
                "token": token,
                "notification": notification_payload,
                "data": str_data,
            }
        }

        last_exc: Optional[Exception] = None
        for attempt in range(2):  # 1 initial attempt + 1 retry
            try:
                access_token = await self._get_access_token()
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                }

                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=message)

                if response.status_code == 401 and attempt == 0:
                    # Token may have just expired — force refresh and retry
                    self._access_token = None
                    logger.info("[FCM-v1] 401 received, refreshing access token")
                    continue

                if response.status_code not in (200, 201):
                    raise RuntimeError(
                        f"FCM v1 error {response.status_code}: {response.text}"
                    )

                logger.info(
                    "[FCM-v1] Notification sent successfully via HTTP v1 API",
                    extra={"token_prefix": token[:8], "title": title},
                )
                return response.json()

            except (httpx.NetworkError, httpx.TimeoutException) as exc:
                last_exc = exc
                if attempt == 0:
                    logger.warning(
                        "[FCM-v1] Network error on attempt %d, retrying: %s",
                        attempt + 1,
                        exc,
                    )
                    continue
                # Second attempt also failed
                raise

        # Should not reach here, but guard anyway
        raise RuntimeError(
            f"FCM v1 send failed after retries: {last_exc}"
        ) from last_exc
