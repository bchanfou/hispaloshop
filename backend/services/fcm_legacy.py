"""
FCM Legacy Service — fallback while migrating to HTTP v1.

This module provides a thin wrapper around the old FCM Legacy API
(https://fcm.googleapis.com/fcm/send) using FCM_SERVER_KEY.

TEMPORAL: This fallback will be removed once the v1 migration stabilises
(target: 1–2 months after FCM_SERVICE_ACCOUNT_JSON is confirmed working
in production).
"""
import logging
import os
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)

FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"


class FCMLegacyService:
    """
    Firebase Cloud Messaging Legacy API (deprecated by Google).
    Used ONLY as a fallback when FCMServiceV1 fails.
    Auth: FCM_SERVER_KEY env var.
    """

    def _get_server_key(self) -> str:
        key = os.environ.get("FCM_SERVER_KEY")
        if not key:
            try:
                from core.config import settings

                key = getattr(settings, "FCM_SERVER_KEY", None)
            except Exception:
                pass
        if not key:
            raise RuntimeError(
                "FCM_SERVER_KEY not configured. "
                "Provide the legacy server key to enable the legacy FCM fallback."
            )
        return key

    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        icon_url: Optional[str] = None,
    ) -> dict:
        """
        Send a push notification via the legacy FCM API endpoint.
        Raises RuntimeError on HTTP errors.
        """
        server_key = self._get_server_key()

        notification: Dict = {"title": title, "body": body}
        if icon_url:
            notification["icon"] = icon_url

        payload: dict = {"to": token, "notification": notification}
        if data:
            payload["data"] = data

        headers = {
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                FCM_LEGACY_URL, headers=headers, json=payload
            )

        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"FCM legacy error {response.status_code}: {response.text}"
            )

        result = response.json()
        logger.info(
            "[FCM-legacy] Notification sent via legacy API",
            extra={"token_prefix": token[:8] if token else "", "title": title},
        )
        return result
