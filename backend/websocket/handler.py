"""
WebSocket Handler para Chat Real-Time
Fase 5: WebSockets con session cookies (integrado con sistema de auth existente)
"""
from fastapi import WebSocket, WebSocketDisconnect, Query
from typing import Dict, Optional
import json
import logging

from core.database import db
from core.auth import get_current_user

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestor de conexiones WebSocket
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"[WS] User {user_id} connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"[WS] User {user_id} disconnected. Total: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"[WS] Error sending to {user_id}: {e}")
    
    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user_id: str = None):
        """Enviar mensaje a todos los participantes de una conversación"""
        # Obtener participantes de la conversación
        conv = await db.internal_chats.find_one({"conversation_id": conversation_id})
        if not conv:
            return
        
        participants = [conv.get("user1_id"), conv.get("user2_id")]
        
        for user_id in participants:
            if user_id and user_id != exclude_user_id and user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_json(message)
                except Exception as e:
                    logger.error(f"[WS] Error broadcasting to {user_id}: {e}")


manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket, token: str = Query(None)):
    """
    Manejar conexión WebSocket autenticada.

    Auth priority:
    1. Query param ?token= (legacy, deprecated)
    2. Cookie session_token
    3. First message { "type": "auth", "token": "..." } (preferred)
    """
    user_id = None

    try:
        # Intentar obtener session token de query param o cookies
        session_token = token

        if not session_token:
            cookies = websocket.cookies
            session_token = cookies.get('session_token')

        # Accept connection first (needed for auth-message flow)
        await websocket.accept()

        # If no token from query/cookie, wait for auth message
        if not session_token:
            import asyncio
            try:
                auth_data = await asyncio.wait_for(
                    websocket.receive_json(), timeout=5.0
                )
                if auth_data.get("type") == "auth" and auth_data.get("token"):
                    session_token = auth_data["token"]
                else:
                    await websocket.send_json({"type": "auth_error", "message": "Expected auth message"})
                    await websocket.close(code=4001, reason="Authentication required")
                    return
            except asyncio.TimeoutError:
                logger.warning("[WS] Auth message timeout")
                await websocket.close(code=4001, reason="Authentication timeout")
                return

        if not session_token:
            logger.warning("[WS] No session token provided")
            await websocket.send_json({"type": "auth_error", "message": "No token"})
            await websocket.close(code=4001, reason="Authentication required")
            return

        # Validar session token contra la base de datos
        session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if not session_doc:
            logger.warning("[WS] Invalid session token")
            await websocket.send_json({"type": "auth_error", "message": "Invalid session"})
            await websocket.close(code=4001, reason="Invalid session")
            return

        user_id = session_doc.get("user_id")
        if not user_id:
            await websocket.close(code=4001, reason="User not found")
            return

        # Verificar que el usuario existe
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user_doc:
            await websocket.close(code=4001, reason="User not found")
            return

        # Register connection (already accepted above)
        self_ref = manager.active_connections
        self_ref[user_id] = websocket
        logger.info(f"[WS] User {user_id} connected. Total: {len(self_ref)}")

        # Notificar al usuario que está conectado
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "message": "WebSocket connected successfully"
        })
        
        # Loop de mensajes
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await process_websocket_message(message, user_id, websocket)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"[WS] Error processing message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Failed to process message"
                })
    
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"[WS] Unexpected error: {e}")
        if user_id:
            manager.disconnect(user_id)


async def process_websocket_message(message: dict, user_id: str, websocket: WebSocket):
    """
    Procesar mensaje entrante del WebSocket
    """
    msg_type = message.get("type")
    
    if msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": message.get("timestamp")})
    
    elif msg_type == "typing":
        conversation_id = message.get("conversation_id")
        is_typing = message.get("is_typing", False)
        
        if conversation_id:
            # Notificar al otro participante
            await manager.broadcast_to_conversation(
                conversation_id,
                {
                    "type": "typing",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "is_typing": is_typing
                },
                exclude_user_id=user_id
            )
    
    elif msg_type == "message":
        conversation_id = message.get("conversation_id")
        content = message.get("content", "").strip()
        
        if not conversation_id or not content:
            await websocket.send_json({
                "type": "error",
                "message": "Missing conversation_id or content"
            })
            return
        
        # Verificar que el usuario es parte de la conversación
        conv = await db.internal_chats.find_one({
            "conversation_id": conversation_id,
            "$or": [
                {"user1_id": user_id},
                {"user2_id": user_id}
            ]
        })
        
        if not conv:
            await websocket.send_json({
                "type": "error",
                "message": "Conversation not found or access denied"
            })
            return
        
        # Crear mensaje
        from datetime import datetime, timezone
        import uuid
        
        message_doc = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        }
        
        await db.chat_messages.insert_one(message_doc)
        
        # Actualizar conversación
        await db.internal_chats.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": content,
                    "last_message_at": message_doc["created_at"]
                }
            }
        )
        
        # Confirmar al remitente
        await websocket.send_json({
            "type": "message_sent",
            "message_id": message_doc["message_id"],
            "conversation_id": conversation_id,
            "timestamp": message_doc["created_at"]
        })
        
        # Enviar al otro participante si está conectado
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": message_doc
            },
            exclude_user_id=user_id
        )
    
    elif msg_type == "read_receipt":
        conversation_id = message.get("conversation_id")
        message_ids = message.get("message_ids", [])
        
        if conversation_id and message_ids:
            # Marcar mensajes como leídos
            await db.chat_messages.update_many(
                {
                    "message_id": {"$in": message_ids},
                    "sender_id": {"$ne": user_id}
                },
                {"$set": {"read": True}}
            )
            
            # Notificar al remitente original
            await manager.broadcast_to_conversation(
                conversation_id,
                {
                    "type": "read_receipt",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "message_ids": message_ids,
                    "read_at": datetime.now(timezone.utc).isoformat()
                },
                exclude_user_id=user_id
            )
    
    elif msg_type == "join_conversation":
        conversation_id = message.get("conversation_id")
        # Verificar acceso
        conv = await db.internal_chats.find_one({
            "conversation_id": conversation_id,
            "$or": [
                {"user1_id": user_id},
                {"user2_id": user_id}
            ]
        })
        
        if conv:
            await websocket.send_json({
                "type": "joined",
                "conversation_id": conversation_id,
                "success": True
            })
        else:
            await websocket.send_json({
                "type": "error",
                "message": "Cannot join conversation"
            })
    
    elif msg_type == "auth":
        # Auth already handled during connection setup — ignore duplicate auth messages
        pass

    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unknown message type: {msg_type}"
        })
