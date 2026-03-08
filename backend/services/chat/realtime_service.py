"""
Servicio de Chat Real-Time
Fase 5: WebSockets bidireccionales con presencia y typing indicators
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any
from bson import ObjectId
import asyncio

from core.database import db
from core.cache import redis_client


class ChatRealtimeService:
    """
    Servicio de chat en tiempo real con:
    - Presencia de usuarios (online/offline)
    - Typing indicators
    - Read receipts
    - Mensajes reactivos via WebSocket
    """
    
    def __init__(self):
        self.active_connections: Dict[str, Any] = {}  # user_id -> websocket
        self.typing_users: Dict[str, Dict[str, datetime]] = {}  # conversation -> {user_id: timestamp}
    
    async def connect_user(self, user_id: str, websocket):
        """
        Registrar conexión de usuario
        """
        self.active_connections[user_id] = websocket
        
        # Actualizar status en Redis para multi-worker
        if redis_client:
            redis_client.setex(
                f"presence:{user_id}",
                300,  # 5 minutos TTL
                "online"
            )
        
        # Notificar a contactos relevantes
        await self._broadcast_presence(user_id, "online")
    
    async def disconnect_user(self, user_id: str):
        """
        Desconectar usuario y limpiar estado
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Actualizar Redis
        if redis_client:
            redis_client.setex(
                f"presence:{user_id}",
                60,  # Última actividad hace 1 minuto
                f"last_seen:{datetime.utcnow().isoformat()}"
            )
        
        # Limpiar typing status
        for conv_id, users in self.typing_users.items():
            if user_id in users:
                del self.typing_users[conv_id][user_id]
        
        await self._broadcast_presence(user_id, "offline")
    
    async def _broadcast_presence(self, user_id: str, status: str):
        """
        Broadcast de cambio de presencia a contactos relevantes
        """
        # Obtener conversaciones del usuario
        conversations = await db.chat_conversations.find({
            "$or": [
                {"importer_id": user_id},
                {"producer_id": user_id},
                {"participants.user_id": user_id}
            ]
        }).to_list(length=100)
        
        # Notificar a otros participantes
        for conv in conversations:
            participant_ids = []
            if conv.get("importer_id"):
                participant_ids.append(conv["importer_id"])
            if conv.get("producer_id"):
                participant_ids.append(conv["producer_id"])
            if conv.get("participants"):
                participant_ids.extend([p["user_id"] for p in conv["participants"]])
            
            for pid in participant_ids:
                if pid != user_id and pid in self.active_connections:
                    ws = self.active_connections[pid]
                    try:
                        await ws.send_json({
                            "type": "presence_update",
                            "user_id": user_id,
                            "status": status,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    except Exception:
                        pass
    
    async def handle_typing(self, conversation_id: str, user_id: str, is_typing: bool):
        """
        Manejar evento de typing
        """
        if conversation_id not in self.typing_users:
            self.typing_users[conversation_id] = {}
        
        if is_typing:
            self.typing_users[conversation_id][user_id] = datetime.utcnow()
        else:
            if user_id in self.typing_users[conversation_id]:
                del self.typing_users[conversation_id][user_id]
        
        # Broadcast a otros participantes
        conv = await db.chat_conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv:
            return
        
        participant_ids = []
        if conv.get("importer_id"):
            participant_ids.append(conv["importer_id"])
        if conv.get("producer_id"):
            participant_ids.append(conv["producer_id"])
        
        for pid in participant_ids:
            if pid != user_id and pid in self.active_connections:
                ws = self.active_connections[pid]
                try:
                    await ws.send_json({
                        "type": "typing",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "is_typing": is_typing,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except Exception:
                    pass
    
    async def broadcast_message(
        self, 
        conversation_id: str, 
        message: Dict, 
        exclude_user: Optional[str] = None
    ):
        """
        Broadcast de mensaje a todos los participantes de una conversación
        """
        conv = await db.chat_conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv:
            return
        
        participant_ids = []
        if conv.get("importer_id"):
            participant_ids.append(conv["importer_id"])
        if conv.get("producer_id"):
            participant_ids.append(conv["producer_id"])
        if conv.get("participants"):
            participant_ids.extend([p["user_id"] for p in conv["participants"]])
        
        message["timestamp"] = datetime.utcnow().isoformat()
        
        for pid in participant_ids:
            if pid == exclude_user:
                continue
            
            if pid in self.active_connections:
                # Usuario online - enviar inmediatamente
                ws = self.active_connections[pid]
                try:
                    await ws.send_json({
                        "type": "new_message",
                        "conversation_id": conversation_id,
                        "message": message
                    })
                    
                    # Marcar como entregado
                    await self._mark_message_delivered(message.get("_id"), pid)
                except Exception:
                    pass
            else:
                # Usuario offline - encolar notificación
                await self._queue_offline_notification(pid, conversation_id, message)
    
    async def broadcast_read_receipt(
        self,
        conversation_id: str,
        user_id: str,
        read_at: datetime
    ):
        """
        Broadcast de read receipt
        """
        conv = await db.chat_conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv:
            return
        
        participant_ids = []
        if conv.get("importer_id"):
            participant_ids.append(conv["importer_id"])
        if conv.get("producer_id"):
            participant_ids.append(conv["producer_id"])
        
        for pid in participant_ids:
            if pid != user_id and pid in self.active_connections:
                ws = self.active_connections[pid]
                try:
                    await ws.send_json({
                        "type": "read_receipt",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "read_at": read_at.isoformat()
                    })
                except Exception:
                    pass
    
    async def _mark_message_delivered(self, message_id: str, user_id: str):
        """
        Marcar mensaje como entregado
        """
        if not message_id:
            return
        
        await db.chat_messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$addToSet": {"delivered_to": user_id},
                "$set": {"status": "delivered"}
            }
        )
    
    async def _queue_offline_notification(self, user_id: str, conversation_id: str, message: Dict):
        """
        Encolar notificación para usuario offline
        """
        if redis_client:
            notification = {
                "type": "chat_message",
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message_preview": message.get("content", "")[:100],
                "sender_name": message.get("sender_name", "Unknown"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            redis_client.lpush(
                f"notifications:queue:{user_id}",
                str(notification)
            )
            redis_client.expire(f"notifications:queue:{user_id}", 86400)  # 24h
    
    async def get_user_presence(self, user_id: str) -> str:
        """
        Obtener estado de presencia de un usuario
        """
        if user_id in self.active_connections:
            return "online"
        
        if redis_client:
            status = redis_client.get(f"presence:{user_id}")
            if status:
                if status == "online":
                    return "online"
                elif status.startswith("last_seen:"):
                    return f"last_seen:{status.split(':')[1]}"
        
        return "offline"
    
    async def get_online_users_in_conversation(self, conversation_id: str) -> List[str]:
        """
        Obtener usuarios online en una conversación
        """
        conv = await db.chat_conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv:
            return []
        
        participant_ids = []
        if conv.get("importer_id"):
            participant_ids.append(conv["importer_id"])
        if conv.get("producer_id"):
            participant_ids.append(conv["producer_id"])
        
        online = []
        for pid in participant_ids:
            presence = await self.get_user_presence(pid)
            if presence == "online":
                online.append(pid)
        
        return online
    
    async def cleanup_stale_typing(self):
        """
        Limpiar indicadores de typing antiguos (más de 10 segundos)
        """
        cutoff = datetime.utcnow() - timedelta(seconds=10)
        
        for conv_id in list(self.typing_users.keys()):
            users = self.typing_users[conv_id]
            stale_users = [uid for uid, ts in users.items() if ts < cutoff]
            
            for uid in stale_users:
                del self.typing_users[conv_id][uid]
                # Notificar que dejó de escribir
                await self.handle_typing(conv_id, uid, False)


# Instancia global
chat_realtime_service = ChatRealtimeService()
