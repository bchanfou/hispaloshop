"""
Chat Request Inbox — Gestión de solicitudes de mensajes de desconocidos.

Features:
- Mensajes de usuarios sin seguir mutuamente van a "Solicitudes"
- Preview limitado del mensaje
- Aceptar/Rechazar con un clic
- Auto-delete de solicitudes viejas (>30 días)
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from bson import ObjectId

from core.database import db

logger = logging.getLogger(__name__)


class ChatRequestInbox:
    """Servicio para gestionar solicitudes de chat."""
    
    MAX_PREVIEW_LENGTH = 80  # Caracteres de preview
    MAX_REQUESTS = 100  # Máximo solicitudes pendientes
    
    async def should_go_to_inbox(
        self,
        sender_id: str,
        recipient_id: str
    ) -> bool:
        """
        Determina si un mensaje debe ir a la bandeja de solicitudes.
        
        Reglas:
        - Si ya tienen conversación existente → no va a inbox
        - Si se siguen mutuamente → no va a inbox
        - Si el remitente es seguido por el destinatario → no va a inbox
        - Todo lo demás → va a inbox
        """
        # Verificar si existe conversación
        existing_conv = await db.conversations.find_one({
            "type": "direct",
            "participants": {"$all": [sender_id, recipient_id]}
        })
        
        if existing_conv:
            return False
        
        # Verificar si se siguen mutuamente
        sender_follows = await db.follows.find_one({
            "follower_id": sender_id,
            "following_id": recipient_id
        })
        
        recipient_follows = await db.follows.find_one({
            "follower_id": recipient_id,
            "following_id": sender_id
        })
        
        # Se siguen mutuamente
        if sender_follows and recipient_follows:
            return False
        
        # El destinatario sigue al remitente (puede recibir mensajes)
        if recipient_follows:
            return False
        
        # Todo lo demás va a inbox
        return True
    
    async def create_request(
        self,
        sender_id: str,
        recipient_id: str,
        message_preview: str
    ) -> Dict:
        """
        Crea una solicitud de chat.
        
        Args:
            sender_id: ID del remitente
            recipient_id: ID del destinatario
            message_preview: Preview del mensaje (limitado)
        
        Returns:
            Dict con request info
        """
        # Verificar límite de solicitudes
        pending_count = await db.chat_requests.count_documents({
            "recipient_id": recipient_id,
            "status": "pending"
        })
        
        if pending_count >= self.MAX_REQUESTS:
            # Eliminar la más antigua
            oldest = await db.chat_requests.find_one(
                {"recipient_id": recipient_id, "status": "pending"},
                sort=[("created_at", 1)]
            )
            if oldest:
                await db.chat_requests.delete_one({"_id": oldest["_id"]})
        
        # Truncar preview
        preview = message_preview[:self.MAX_PREVIEW_LENGTH]
        if len(message_preview) > self.MAX_PREVIEW_LENGTH:
            preview += "..."
        
        request_doc = {
            "_id": str(ObjectId()),
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "message_preview": preview,
            "status": "pending",  # pending, accepted, declined
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        }
        
        await db.chat_requests.insert_one(request_doc)
        
        logger.info(f"[ChatRequest] Solicitud creada: {request_doc['_id']} de {sender_id} a {recipient_id}")
        
        return {
            "request_id": request_doc["_id"],
            "sender_id": sender_id,
            "preview": preview,
            "created_at": request_doc["created_at"].isoformat()
        }
    
    async def get_requests_for_user(
        self,
        user_id: str,
        status: Optional[str] = "pending"
    ) -> List[Dict]:
        """
        Obtiene solicitudes de chat para un usuario.
        
        Args:
            user_id: ID del usuario
            status: "pending", "accepted", "declined", o None para todos
        
        Returns:
            Lista de solicitudes con info del remitente
        """
        query = {"recipient_id": user_id}
        if status:
            query["status"] = status
        
        requests = await db.chat_requests.find(query).sort("created_at", -1).to_list(length=100)
        
        if not requests:
            return []
        
        # Enriquecer con info de remitentes
        sender_ids = list({r["sender_id"] for r in requests})
        users = await db.users.find(
            {"_id": {"$in": sender_ids}},
            {"_id": 1, "name": 1, "username": 1, "profile_image": 1, "avatar_url": 1}
        ).to_list(length=len(sender_ids))
        
        user_map = {u["_id"]: u for u in users}
        
        result = []
        for req in requests:
            user = user_map.get(req["sender_id"], {})
            result.append({
                "request_id": req["_id"],
                "sender_id": req["sender_id"],
                "sender_name": user.get("name") or user.get("username"),
                "sender_avatar": user.get("profile_image") or user.get("avatar_url"),
                "preview": req["message_preview"],
                "status": req["status"],
                "created_at": req["created_at"].isoformat()
            })
        
        return result
    
    async def accept_request(
        self,
        request_id: str,
        user_id: str
    ) -> Optional[str]:
        """
        Acepta una solicitud de chat.
        
        Returns:
            conversation_id si se creó, None si ya existía
        """
        request = await db.chat_requests.find_one({
            "_id": request_id,
            "recipient_id": user_id,
            "status": "pending"
        })
        
        if not request:
            raise ValueError("Solicitud no encontrada")
        
        # Crear conversación
        existing_conv = await db.conversations.find_one({
            "type": "direct",
            "participants": {
                "$all": [request["sender_id"], user_id]
            }
        })
        
        if existing_conv:
            conversation_id = existing_conv["_id"]
        else:
            conversation_id = str(ObjectId())
            await db.conversations.insert_one({
                "_id": conversation_id,
                "type": "direct",
                "participants": [request["sender_id"], user_id],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        # Marcar como aceptada
        await db.chat_requests.update_one(
            {"_id": request_id},
            {
                "$set": {
                    "status": "accepted",
                    "accepted_at": datetime.now(timezone.utc),
                    "conversation_id": conversation_id
                }
            }
        )
        
        logger.info(f"[ChatRequest] Solicitud aceptada: {request_id}, conv={conversation_id}")
        
        return conversation_id
    
    async def decline_request(
        self,
        request_id: str,
        user_id: str
    ) -> bool:
        """Declina una solicitud de chat."""
        result = await db.chat_requests.update_one(
            {
                "_id": request_id,
                "recipient_id": user_id,
                "status": "pending"
            },
            {
                "$set": {
                    "status": "declined",
                    "declined_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count == 0:
            raise ValueError("Solicitud no encontrada")
        
        logger.info(f"[ChatRequest] Solicitud declinada: {request_id}")
        
        return True
    
    async def get_pending_count(self, user_id: str) -> int:
        """Obtiene el número de solicitudes pendientes."""
        return await db.chat_requests.count_documents({
            "recipient_id": user_id,
            "status": "pending"
        })
    
    async def cleanup_expired_requests(self) -> int:
        """
        Elimina solicitudes expiradas (>30 días).
        
        Returns:
            Número de solicitudes eliminadas
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        
        result = await db.chat_requests.delete_many({
            "created_at": {"$lt": cutoff},
            "status": "pending"
        })
        
        if result.deleted_count > 0:
            logger.info(f"[ChatRequest] Eliminadas {result.deleted_count} solicitudes expiradas")
        
        return result.deleted_count


# Singleton
chat_request_inbox = ChatRequestInbox()
