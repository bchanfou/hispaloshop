"""
Servicio de Notificaciones Omnicanal
Fase 5: Email, Push, In-App, SMS con routing inteligente
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from bson import ObjectId
import asyncio

from core.database import db
from core.cache import redis_client


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
    
    # ── FCM push helpers ──
    # Lazy singletons — created once per dispatcher instance
    _fcm_v1: Optional[Any] = None
    _fcm_legacy: Optional[Any] = None

    def _get_fcm_v1(self):
        if self._fcm_v1 is None:
            from services.fcm_service import FCMServiceV1
            self._fcm_v1 = FCMServiceV1()
        return self._fcm_v1

    def _get_fcm_legacy(self):
        if self._fcm_legacy is None:
            from services.fcm_legacy import FCMLegacyService
            self._fcm_legacy = FCMLegacyService()
        return self._fcm_legacy

    async def _send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Enviar notificación push via FCM HTTP v1 API con fallback a legacy.
        """
        import logging as _logging
        _logger = _logging.getLogger(__name__)

        if self._is_quiet_hours(prefs):
            raise Exception("Quiet hours active — push notification deferred")

        tokens = prefs.get("push_tokens", [])
        if not tokens:
            raise Exception("No push tokens registered")

        image_url = (data or {}).get("image_url")
        last_exc: Optional[Exception] = None

        for token_entry in tokens:
            token = token_entry.get("token") if isinstance(token_entry, dict) else token_entry
            if not token:
                continue

            # Try FCM HTTP v1 first
            try:
                await self._get_fcm_v1().send_notification(
                    token=token,
                    title=title,
                    body=body,
                    data=data,
                    icon_url=image_url,
                )
                _logger.info(
                    "[FCM] Sent via v1 API for user_id=%s token_prefix=%s",
                    user_id,
                    token[:8],
                )
                continue
            except ValueError:
                # Invalid token format — skip without fallback, no point trying legacy
                _logger.warning(
                    "[FCM] Skipping invalid token for user_id=%s token_prefix=%s",
                    user_id,
                    token[:8],
                )
                continue
            except Exception as exc_v1:
                _logger.warning(
                    "[FCM] v1 failed for user_id=%s, falling back to legacy: %s",
                    user_id,
                    exc_v1,
                )

            # Fallback to legacy API
            try:
                await self._get_fcm_legacy().send_notification(
                    token=token,
                    title=title,
                    body=body,
                    data=data,
                    icon_url=image_url,
                )
                _logger.info(
                    "[FCM] Sent via legacy API (fallback) for user_id=%s token_prefix=%s",
                    user_id,
                    token[:8],
                )
            except Exception as exc_legacy:
                _logger.error(
                    "[FCM] Both v1 and legacy failed for user_id=%s token_prefix=%s: %s",
                    user_id,
                    token[:8],
                    exc_legacy,
                )
                last_exc = exc_legacy

        if last_exc:
            raise last_exc
    
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
