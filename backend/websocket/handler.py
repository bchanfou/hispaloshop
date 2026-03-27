"""
WebSocket Handler para Chat Real-Time
Fase 5: WebSockets con session cookies (integrado con sistema de auth existente)
"""
from fastapi import WebSocket, WebSocketDisconnect, Query
from typing import Dict, Optional
from datetime import datetime, timezone
import json
import logging
import hashlib

from core.database import db
from core.auth import get_current_user


def _hash_session_token(token: str) -> str:
    """Hash session token for storage. SHA-256 is safe here because tokens are high-entropy UUIDs."""
    return hashlib.sha256(token.encode()).hexdigest()

logger = logging.getLogger(__name__)


# Use the shared ConnectionManager from core (single instance for both REST + WS)
from core.websocket import chat_manager as manager


async def broadcast_to_conversation(conversation_id: str, message: dict, exclude_user_id: str = None):
    """Enviar mensaje a todos los participantes de una conversación."""
    conv = await db.internal_conversations.find_one({"conversation_id": conversation_id})
    if not conv:
        logger.warning(f"[WS] broadcast_to_conversation: conversation {conversation_id} not found")
        return
    participants = [p["user_id"] for p in conv.get("participants", [])]
    for user_id in participants:
        if user_id and user_id != exclude_user_id:
            await manager.send_personal_message(message, user_id)


async def handle_websocket(websocket: WebSocket, token: str = Query(None)):
    """
    Manejar conexión WebSocket autenticada.

    Auth priority:
    1. Cookie session_token (preferred — automatic via browser upgrade request)
    2. Query param ?token= (legacy fallback)
    3. First message { "type": "auth", "token": "..." } (testing fallback)
    """
    user_id = None

    try:
        # Prefer cookie-based auth (sent automatically with WS upgrade request)
        cookies = websocket.cookies
        session_token = cookies.get('session_token')

        # Fall back to query param if no cookie
        if not session_token:
            session_token = token

        # If no token from query/cookie, accept early (needed for auth-message flow)
        # When we have a token, ConnectionManager.connect() will accept later.
        already_accepted = False
        if not session_token:
            await websocket.accept()
            already_accepted = True

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
        session_doc = await db.user_sessions.find_one({"session_token": _hash_session_token(session_token)}, {"_id": 0})
        if not session_doc:
            # Legacy fallback: sessions created before token hashing migration
            session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
            if session_doc:
                await db.user_sessions.update_one(
                    {"session_token": session_token},
                    {"$set": {"session_token": _hash_session_token(session_token)}}
                )
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

        # Register connection via ConnectionManager
        if already_accepted:
            # Already accepted above for auth-message flow — register directly (no second accept)
            manager.active_connections.setdefault(user_id, []).append(websocket)
            logger.info(f"[WS] User {user_id} connected. Total connections: {sum(len(v) for v in manager.active_connections.values())}")
        else:
            # Token was available from cookie/query — not yet accepted
            await manager.connect(websocket, user_id)

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
            manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"[WS] Unexpected error: {e}")
        if user_id:
            manager.disconnect(user_id, websocket)


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
            await broadcast_to_conversation(
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
        message_type = message.get("message_type", "text")
        
        # Enforce message length limit
        if content and len(content) > 5000:
            await websocket.send_json({
                "type": "error",
                "message": "Message too long (max 5000 characters)"
            })
            return

        if not conversation_id or (not content and message_type == "text"):
            await websocket.send_json({
                "type": "error",
                "message": "Missing conversation_id or content"
            })
            return
        
        # Verificar que el usuario es parte de la conversación
        conv = await db.internal_conversations.find_one({
            "conversation_id": conversation_id,
            "participants.user_id": user_id
        })
        
        if not conv:
            await websocket.send_json({
                "type": "error",
                "message": "Conversation not found or access denied"
            })
            return
        
        # Crear mensaje
        import uuid
        
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        temp_id = message.get("temp_id")
        # Fetch sender info for recipient display
        sender_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "role": 1, "profile_image": 1})
        message_doc = {
            "message_id": msg_id,
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "sender_name": (sender_doc or {}).get("name", ""),
            "sender_role": (sender_doc or {}).get("role", ""),
            "sender_avatar": (sender_doc or {}).get("profile_image", ""),
            "content": content,
            "message_type": message_type,
            "image_url": message.get("image_url"),
            "audio_url": message.get("audio_url"),
            "audio_duration": message.get("audio_duration"),
            "file_url": message.get("file_url"),
            "file_name": message.get("file_name"),
            "reply_to_id": message.get("reply_to_id"),
            "reply_to_preview": message.get("reply_to_preview"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }

        await db.internal_messages.insert_one(message_doc)
        message_doc.pop("_id", None)
        
        # Actualizar conversación with type-based preview text
        if message_type == "image":
            preview = "Imagen"
        elif message_type == "audio":
            preview = "Audio"
        elif message_type == "document":
            preview = "Documento"
        else:
            preview = (content or "")[:100]

        await db.internal_conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": preview,
                    "last_message_at": message_doc["created_at"]
                }
            }
        )
        
        # Confirmar al remitente
        await websocket.send_json({
            "type": "message_sent",
            "message_id": msg_id,
            "temp_id": temp_id,
            "conversation_id": conversation_id,
            "timestamp": message_doc["created_at"]
        })
        
        # Enviar al otro participante si está conectado + mark delivered
        conv = await db.internal_conversations.find_one({"conversation_id": conversation_id})
        recipients = [p["user_id"] for p in (conv or {}).get("participants", []) if p["user_id"] != user_id]
        any_delivered = False
        for rid in recipients:
            if manager.is_online(rid):
                any_delivered = True
        if any_delivered:
            await db.internal_messages.update_one(
                {"message_id": msg_id},
                {"$set": {"status": "delivered"}}
            )
            message_doc["status"] = "delivered"
        await broadcast_to_conversation(
            conversation_id,
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": message_doc
            },
            exclude_user_id=user_id
        )
    
    elif msg_type == "reaction":
        message_id = message.get("message_id")
        emoji = message.get("emoji", "")
        conversation_id = message.get("conversation_id")

        if message_id and emoji and conversation_id:
            msg_doc = await db.internal_messages.find_one({"message_id": message_id})
            if msg_doc:
                reactions = msg_doc.get("reactions", [])
                existing = next((r for r in reactions if r["user_id"] == user_id and r["emoji"] == emoji), None)
                if existing:
                    reactions = [r for r in reactions if not (r["user_id"] == user_id and r["emoji"] == emoji)]
                else:
                    reactions = [r for r in reactions if r["user_id"] != user_id]
                    user_doc = await db.users.find_one({"user_id": user_id}, {"name": 1})
                    reactions.append({"user_id": user_id, "emoji": emoji, "name": (user_doc or {}).get("name", "")})
                await db.internal_messages.update_one({"message_id": message_id}, {"$set": {"reactions": reactions}})
                await broadcast_to_conversation(
                    conversation_id,
                    {"type": "reaction", "message_id": message_id, "conversation_id": conversation_id, "reactions": reactions},
                    exclude_user_id=user_id
                )
                await websocket.send_json({"type": "reaction", "message_id": message_id, "reactions": reactions})
    
    elif msg_type == "read_receipt":
        conversation_id = message.get("conversation_id")
        message_ids = message.get("message_ids", [])
        
        if conversation_id and message_ids:
            # Marcar mensajes como leídos
            await db.internal_messages.update_many(
                {
                    "message_id": {"$in": message_ids},
                    "sender_id": {"$ne": user_id}
                },
                {"$set": {"status": "read", "read_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Notificar al remitente original
            await broadcast_to_conversation(
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
        conv = await db.internal_conversations.find_one({
            "conversation_id": conversation_id,
            "participants.user_id": user_id
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
