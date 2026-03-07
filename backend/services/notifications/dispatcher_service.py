"""
Servicio de Notificaciones Omnicanal
Fase 5: Email, Push, In-App, SMS con routing inteligente
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId
import asyncio

from backend.core.database import db
from backend.core.cache import redis_client


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
            priority
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
            "created_at": datetime.utcnow(),
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
            {"$set": {"sent_at": datetime.utcnow()}}
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
        from backend.services.chat.realtime_service import chat_realtime_service
        
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
    
    async def _send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict],
        prefs: Dict
    ):
        """
        Enviar notificación push via FCM
        """
        tokens = prefs.get("push_tokens", [])
        if not tokens:
            raise Exception("No push tokens registered")
        
        from backend.core.config import settings
        
        # Usar FCM HTTP v1 API
        import httpx
        
        server_key = getattr(settings, 'FCM_SERVER_KEY', None)
        if not server_key:
            raise Exception("FCM not configured")
        
        headers = {
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json"
        }
        
        for token_data in tokens:
            token = token_data.get("token")
            if not token:
                continue
            
            payload = {
                "to": token,
                "notification": {
                    "title": title,
                    "body": body,
                    "image": data.get("image_url") if data else None
                },
                "data": data or {},
                "priority": "high" if data and data.get("priority") in ["urgent", "critical"] else "normal"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    raise Exception(f"FCM error: {response.text}")
    
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
        
        from backend.core.config import settings
        
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
        Enviar SMS via Twilio (solo para crítico)
        """
        phone = prefs.get("phone")
        if not phone:
            raise Exception("No phone number")
        
        # Implementación Twilio
        pass
    
    def _determine_channels(
        self,
        requested_channels: List[str],
        prefs: Dict,
        priority: str
    ) -> List[str]:
        """
        Determinar canales efectivos según preferencias
        """
        # Master switches
        if not prefs.get("master_push_enabled", True):
            requested_channels = [c for c in requested_channels if c != NotificationChannel.PUSH]
        if not prefs.get("master_email_enabled", True):
            requested_channels = [c for c in requested_channels if c != NotificationChannel.EMAIL]
        
        # Para urgente/crítico, forzar push + email
        if priority in [NotificationPriority.URGENT, NotificationPriority.CRITICAL]:
            if NotificationChannel.PUSH not in requested_channels:
                requested_channels.append(NotificationChannel.PUSH)
            if NotificationChannel.EMAIL not in requested_channels:
                requested_channels.append(NotificationChannel.EMAIL)
        
        return list(set(requested_channels))
    
    def _is_quiet_hours(self, prefs: Dict) -> bool:
        """
        Verificar si usuario está en quiet hours
        """
        try:
            import pytz
            
            quiet_start = prefs.get("quiet_hours_start", "22:00")
            quiet_end = prefs.get("quiet_hours_end", "08:00")
            timezone = prefs.get("quiet_hours_timezone", "Europe/Madrid")
            
            tz = pytz.timezone(timezone)
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
        except:
            return False
    
    async def _get_user_preferences(self, user_id: str) -> Dict:
        """Obtener preferencias de notificación del usuario"""
        prefs = await db.user_notification_preferences.find_one({"user_id": user_id})
        
        if not prefs:
            # Defaults
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            return {
                "user_id": user_id,
                "email": user.get("email") if user else None,
                "master_push_enabled": True,
                "master_email_enabled": True,
                "master_sms_enabled": False,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "08:00",
                "quiet_hours_timezone": "Europe/Madrid",
                "push_tokens": []
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
            {"$set": {"read_at": datetime.utcnow()}}
        )
    
    async def mark_as_clicked(self, notification_id: str, user_id: str):
        """Marcar notificación como clickeada"""
        await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            },
            {
                "$set": {"clicked_at": datetime.utcnow()},
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
            "registered_at": datetime.utcnow(),
            "last_used": datetime.utcnow(),
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
