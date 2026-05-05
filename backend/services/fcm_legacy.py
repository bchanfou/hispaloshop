"""FCM Legacy API Service — Temporary fallback during HTTP v1 migration"""
import logging
from typing import Any, Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class FCMLegacyService:
    """Firebase Cloud Messaging Legacy API client (deprecated, fallback only)."""

    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        icon_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send notification via FCM Legacy API.
        Returns: {"success": bool, "message_id": str} or {"success": False, "error": str}
        """
        server_key = getattr(settings, "FCM_SERVER_KEY", None)
        if not server_key:
            return {"success": False, "error": "FCM_SERVER_KEY not configured"}

        headers = {
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "to": token,
            "notification": {
                "title": title,
                "body": body,
            },
            "data": data or {},
        }

        if icon_url:
            payload["notification"]["image"] = icon_url

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers=headers,
                    json=payload,
                )

            if response.status_code == 200:
                result = response.json()
                success_count = result.get("success", 0)
                results_list = result.get("results", [{}])
                first_result = results_list[0] if results_list else {}

                if success_count > 0:
                    message_id = first_result.get("message_id", "unknown")
                    logger.info("[FCM Legacy] Sent to %s... -> %s", token[:20], message_id)
                    return {"success": True, "message_id": message_id}

                error = first_result.get("error", "Unknown error")
                logger.warning("[FCM Legacy] Failed: %s", error)
                return {"success": False, "error": error}

            error_text = response.text[:200]
            logger.warning("[FCM Legacy] HTTP %s: %s", response.status_code, error_text)
            return {"success": False, "error": f"HTTP {response.status_code}"}

        except httpx.TimeoutException:
            logger.warning("[FCM Legacy] Timeout for token %s...", token[:20])
            return {"success": False, "error": "Legacy FCM timeout", "is_timeout": True}
        except Exception as exc:
            logger.error("[FCM Legacy] Unexpected error: %s", exc)
            return {"success": False, "error": f"Unexpected error: {exc}"}


# Singleton instance
fcm_legacy_service = FCMLegacyService()
