"""
Servicio de Notificaciones Omnicanal
Fase 5: Email, Push, In-App, SMS con routing inteligente
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from bson import ObjectId
import asyncio

from core.database import db
from core.cache import redis_client
from services.fcm_service import fcm_service_v1
from services.fcm_legacy import fcm_legacy_service

logger = logging.getLogger(__name__)


class NotificationChannel:
    IN_APP = "in_app"
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"


class NotificationPriority:
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class NotificationDispatcher:
    """
    Dispatcher de notificaciones omnicanal con:
    - Routing inteligente según preferencias
    - Quiet hours respeto
    - Batch/digest para no spammear
    - Retry con backoff exponencial
    """
    
    def __init__(self):
        self.channel_handlers = {
            NotificationChannel.IN_APP: self._send_in_app,
            NotificationChannel.PUSH: self._send_push,
            NotificationChannel.EMAIL: self._send_email,
            NotificationChannel.SMS: self._send_sms,
        }
    
    async def send_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        notification_type: str,
        channels: Optional[List[str]] = None,
        priority: str = NotificationPriority.NORMAL,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None
    ) -> str:
        """
        Enviar notificación por canales disponibles
        """
        # Obtener preferencias del usuario
        prefs = await self._get_user_preferences(user_id)
        
        # Determinar canales efectivos
        effective_channels = self._determine_channels(
            channels or [NotificationChannel.IN_APP],
            prefs,
            priority,
            notification_type,
        )
        
        # Crear registro de notificación
        notification = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "type": notification_type,
            "priority": priority,
            "data": data or {},
            "image_url": image_url,
            "action_url": action_url,
            "channels": effective_channels,
            "status_by_channel": {ch: "pending" for ch in effective_channels},
            "created_at": datetime.now(timezone.utc),
            "sent_at": None,
            "read_at": None,
            "clicked_at": None
        }
        
        result = await db.notifications.insert_one(notification)
        notification_id = str(result.inserted_id)
        
        # Enviar por cada canal en paralelo
        tasks = []
        for channel in effective_channels:
            handler = self.channel_handlers.get(channel)
            if handler:
                task = asyncio.create_task(
                    self._send_with_retry(
                        handler,
                        notification_id,
                        user_id,
                        title,
                        body,
                        data,
                        prefs
                    )
                )
                tasks.append((channel, task))
        
        # Esperar resultados
        for channel, task in tasks:
            try:
                await task
                await self._update_channel_status(notification_id, channel, "sent")
            except Exception as e:
                await self._update_channel_status(notification_id, channel, "failed", str(e))
        
        # Actualizar timestamp de envío
        await db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"sent_at": datetime.now(timezone.utc)}}
        )
        
        return notification_id
    
    async def _send_with_retry(
        self,
        handler,
        notification_id: str,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict,
        max_retries: int = 3
    ):
        """Enviar con reintentos"""
        for attempt in range(max_retries):
            try:
                await handler(user_id, title, body, data, prefs)
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + 1
                    await asyncio.sleep(wait_time)
                else:
                    raise e
    
    async def _send_in_app(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Enviar notificación in-app (WebSocket si online, DB si offline)
        """
        from services.chat.realtime_service import chat_realtime_service
        
        # Verificar si usuario está online
        presence = await chat_realtime_service.get_user_presence(user_id)
        
        if presence == "online":
            # Enviar via WebSocket
            websocket = chat_realtime_service.active_connections.get(user_id)
            if websocket:
                await websocket.send_json({
                    "type": "notification",
                    "title": title,
                    "body": body,
                    "data": data
                })
        # Si offline, queda en DB para fetch posterior
    
    # ── FCM HTTP v1 auth ──
    _fcm_access_token: Optional[str] = None
    _fcm_token_expires_at: Optional[datetime] = None

    async def _get_fcm_access_token(self) -> str:
        """Get OAuth2 access token for FCM HTTP v1 API using service account."""
        now = datetime.now(timezone.utc)
        if self._fcm_access_token and self._fcm_token_expires_at and now < self._fcm_token_expires_at:
            return self._fcm_access_token

        import json
        from core.config import settings

        sa_json = getattr(settings, "FCM_SERVICE_ACCOUNT_JSON", None)
        if not sa_json:
            raise Exception("FCM_SERVICE_ACCOUNT_JSON not configured")

        sa_info = json.loads(sa_json) if isinstance(sa_json, str) else sa_json

        try:
            from google.oauth2 import service_account
            from google.auth.transport.requests import Request

            credentials = service_account.Credentials.from_service_account_info(
                sa_info,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
            credentials.refresh(Request())
            self._fcm_access_token = credentials.token
            self._fcm_token_expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else now + timedelta(minutes=55)
        except ImportError:
            # Fallback: manual JWT generation if google-auth not installed
            import jwt as pyjwt
            import time

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

            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": signed_jwt},
                )
                resp.raise_for_status()
                token_data = resp.json()

            self._fcm_access_token = token_data["access_token"]
            self._fcm_token_expires_at = now + timedelta(seconds=token_data.get("expires_in", 3500))

        return self._fcm_access_token

    async def _send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Send push notification via FCM HTTP v1, with automatic fallback to legacy API.
        """
        if self._is_quiet_hours(prefs):
            raise Exception("Quiet hours active — push notification deferred")

        tokens = prefs.get("push_tokens", [])
        if not tokens:
            raise Exception("No push tokens registered")

        is_high_priority = data and data.get("priority") in ["urgent", "critical"]
        priority = "HIGH" if is_high_priority else "NORMAL"
        icon_url = (data or {}).get("image_url")

        last_error: Optional[str] = None

        for token_data in tokens:
            token = token_data.get("token")
            if not token:
                continue

            # Attempt FCM HTTP v1 first
            result_v1 = await fcm_service_v1.send_notification(
                token=token,
                title=title,
                body=body,
                data=data,
                icon_url=icon_url,
                priority=priority,
            )

            if result_v1["success"]:
                continue

            # v1 failed — attempt legacy fallback
            logger.warning(
                "[FCM] v1 failed (%s), attempting legacy for %s...",
                result_v1.get("error"),
                token[:20],
            )
            result_legacy = await fcm_legacy_service.send_notification(
                token=token,
                title=title,
                body=body,
                data=data,
                icon_url=icon_url,
            )

            if result_legacy["success"]:
                logger.info("[FCM] Fallback to legacy succeeded for %s...", token[:20])
                continue

            # Both v1 and legacy failed
            last_error = result_legacy.get("error")
            logger.error(
                "[FCM] Both v1 and legacy failed for %s...: %s",
                token[:20],
                last_error,
            )
            raise Exception(f"FCM push failed (v1+legacy): {last_error}")
    
    async def _send_email(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Enviar email via SendGrid/Resend
        """
        # Verificar quiet hours
        if self._is_quiet_hours(prefs):
            raise Exception("User in quiet hours")
        
        from core.config import settings
        
        email = prefs.get("email")
        if not email:
            raise Exception("No email address")
        
        # Usar Resend por defecto
        api_key = getattr(settings, 'RESEND_API_KEY', None) or getattr(settings, 'SENDGRID_API_KEY', None)
        if not api_key:
            raise Exception("Email service not configured")
        
        import httpx
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "from": "Hispaloshop <noreply@hispaloshop.com>",
            "to": email,
            "subject": title,
            "html": f"<html><body><h1>{title}</h1><p>{body}</p></body></html>"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers=headers,
                json=payload
            )
            
            if response.status_code not in [200, 202]:
                raise Exception(f"Email error: {response.text}")
    
    async def _send_sms(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Enviar SMS via Twilio (canal no implementado).
        Raises explicitly so the dispatcher marks this channel as not_available.
        """
        import logging
        logging.getLogger(__name__).warning("[SMS] SMS channel not implemented — skipping for user %s", user_id)
        raise Exception("SMS channel not implemented")
    
    # Maps notification_type → preference key stored in user_notification_preferences
    TYPE_PREF_KEY: Dict[str, str] = {
        "like": "likes",
        "post_liked": "likes",
        "story_like": "likes",
        "comment": "comments",
        "post_commented": "comments",
        "story_reply": "comments",
        "follow": "new_followers",
        "new_follower": "new_followers",
        "mention": "mentions",
        "mentioned": "mentions",
        "order_confirmed": "order_confirmation",
        "order_confirmation": "order_confirmation",
        "order_preparing": "shipping_updates",
        "order_shipped": "shipping_updates",
        "order_delivered": "order_delivered",
        "order_review_request": "review_requests",
        "b2b_offer_received": "b2b_offers",
        "b2b_offer_accepted": "b2b_offers",
        "b2b_contract_ready": "b2b_contracts",
        "b2b_contract_signed": "b2b_contracts",
        "b2b_payment_received": "b2b_payments",
        "platform_news": "platform_news",
        "commission_earned": "b2b_payments",
        "tier_upgraded": "platform_news",
        "payout_sent": "b2b_payments",
    }

    def _determine_channels(
        self,
        requested_channels: List[str],
        prefs: Dict,
        priority: str,
        notification_type: str = "",
    ) -> List[str]:
        """
        Determinar canales efectivos según preferencias
        """
        # Work on a copy to avoid mutating the caller's list
        channels = list(requested_channels)

        # Per-type preference check (unless urgent/critical — those always go through)
        if priority not in [NotificationPriority.URGENT, NotificationPriority.CRITICAL]:
            pref_key = self.TYPE_PREF_KEY.get(notification_type)
            if pref_key and not prefs.get(pref_key, True):
                return []  # User opted out of this notification type entirely

        # Master switches
        if not prefs.get("master_push_enabled", True):
            channels = [c for c in channels if c != NotificationChannel.PUSH]
        if not prefs.get("master_email_enabled", True):
            channels = [c for c in channels if c != NotificationChannel.EMAIL]

        # Para urgente/crítico, forzar push + email
        if priority in [NotificationPriority.URGENT, NotificationPriority.CRITICAL]:
            if NotificationChannel.PUSH not in channels:
                channels.append(NotificationChannel.PUSH)
            if NotificationChannel.EMAIL not in channels:
                channels.append(NotificationChannel.EMAIL)

        return list(set(channels))
    
    def _is_quiet_hours(self, prefs: Dict) -> bool:
        """
        Verificar si usuario está en quiet hours
        """
        try:
            import pytz
            
            quiet_start = prefs.get("quiet_hours_start", "22:00")
            quiet_end = prefs.get("quiet_hours_end", "08:00")
            user_tz_name = prefs.get("quiet_hours_timezone", "Europe/Madrid")

            tz = pytz.timezone(user_tz_name)
            now = datetime.now(tz)
            
            start_hour, start_min = map(int, quiet_start.split(":"))
            end_hour, end_min = map(int, quiet_end.split(":"))
            
            quiet_start_time = now.replace(hour=start_hour, minute=start_min, second=0)
            quiet_end_time = now.replace(hour=end_hour, minute=end_min, second=0)
            
            # Manejar caso que cruza medianoche
            if quiet_start_time > quiet_end_time:
                return now >= quiet_start_time or now < quiet_end_time
            else:
                return quiet_start_time <= now < quiet_end_time
        except Exception:
            return False
    
    async def _get_user_preferences(self, user_id: str) -> Dict:
        """Obtener preferencias de notificación del usuario"""
        prefs = await db.user_notification_preferences.find_one({"user_id": user_id})
        
        if not prefs:
            # Defaults
            user = await db.users.find_one({"user_id": user_id})
            return {
                "user_id": user_id,
                "email": user.get("email") if user else None,
                "master_push_enabled": True,
                "master_email_enabled": True,
                "master_sms_enabled": False,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "08:00",
                "quiet_hours_timezone": "Europe/Madrid",
                "push_tokens": [],
                # Per-type defaults
                "new_followers": True,
                "likes": True,
                "comments": True,
                "mentions": True,
                "order_confirmation": True,
                "shipping_updates": True,
                "order_delivered": True,
                "review_requests": True,
                "b2b_offers": True,
                "b2b_contracts": True,
                "b2b_payments": True,
                "platform_news": True,
                "marketing_emails": False,
            }
        
        return prefs
    
    async def _update_channel_status(
        self,
        notification_id: str,
        channel: str,
        status: str,
        error: Optional[str] = None
    ):
        """Actualizar estado de envío por canal"""
        update = {f"status_by_channel.{channel}": status}
        if error:
            update[f"error_{channel}"] = error
        
        await db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": update}
        )
    
    async def mark_as_read(self, notification_id: str, user_id: str):
        """Marcar notificación como leída"""
        await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            },
            {"$set": {"read_at": datetime.now(timezone.utc)}}
        )
    
    async def mark_as_clicked(self, notification_id: str, user_id: str):
        """Marcar notificación como clickeada"""
        await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            },
            {
                "$set": {"clicked_at": datetime.now(timezone.utc)},
                "$inc": {"click_count": 1}
            }
        )
    
    async def get_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Obtener notificaciones del usuario"""
        query = {"user_id": user_id}
        if unread_only:
            query["read_at"] = None
        
        total = await db.notifications.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        notifications = await cursor.to_list(length=limit)
        for n in notifications:
            n["notification_id"] = str(n["_id"])
            n["_id"] = str(n["_id"])
        
        return {
            "notifications": notifications,
            "total": total,
            "unread": await db.notifications.count_documents({"user_id": user_id, "read_at": None}),
            "page": page,
            "has_more": total > (page * limit)
        }
    
    async def register_push_token(
        self,
        user_id: str,
        token: str,
        platform: str,  # ios, android, web
        device_id: Optional[str] = None
    ):
        """Registrar token de push notification"""
        token_data = {
            "token": token,
            "platform": platform,
            "device_id": device_id,
            "registered_at": datetime.now(timezone.utc),
            "last_used": datetime.now(timezone.utc),
            "active": True
        }
        
        await db.user_notification_preferences.update_one(
            {"user_id": user_id},
            {
                "$pull": {"push_tokens": {"token": token}},
                "$setOnInsert": {
                    "user_id": user_id,
                    "master_push_enabled": True,
                    "master_email_enabled": True
                }
            },
            upsert=True
        )
        
        await db.user_notification_preferences.update_one(
            {"user_id": user_id},
            {"$push": {"push_tokens": token_data}}
        )
    
    async def unregister_push_token(self, user_id: str, token: str):
        """Desregistrar token de push"""
        await db.user_notification_preferences.update_one(
            {"user_id": user_id},
            {"$pull": {"push_tokens": {"token": token}}}
        )


# Instancia global
notification_dispatcher = NotificationDispatcher()
