"""
WebSocket Handler para Chat Real-Time
Fase 5: Socket.io-style WebSockets con FastAPI
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional
import json

from backend.services.chat.realtime_service import chat_realtime_service
from backend.core.security import verify_token
from backend.core.database import db


class ConnectionManager:
    """
    Gestor de conexiones WebSocket
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        await chat_realtime_service.connect_user(user_id, websocket)
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket, token: str):
    """
    Manejar conexión WebSocket autenticada
    """
    # Verificar token
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception as e:
        await websocket.close(code=4001, reason=f"Authentication failed: {str(e)}")
        return
    
    # Aceptar conexión
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Recibir mensaje
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await process_websocket_message(message, user_id, websocket)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await chat_realtime_service.disconnect_user(user_id)
    except Exception as e:
        manager.disconnect(user_id)
        await chat_realtime_service.disconnect_user(user_id)


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
            await chat_realtime_service.handle_typing(conversation_id, user_id, is_typing)
    
    elif msg_type == "message":
        conversation_id = message.get("conversation_id")
        content = message.get("content")
        
        if conversation_id and content:
            # Guardar mensaje en DB
            from datetime import datetime
            from bson import ObjectId
            
            message_doc = {
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "content": content,
                "type": "text",
                "status": "sent",
                "created_at": datetime.utcnow(),
                "delivered_to": [],
                "read_by": []
            }
            
            result = await db.chat_messages.insert_one(message_doc)
            message_doc["_id"] = str(result.inserted_id)
            
            # Actualizar conversación
            await db.chat_conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"last_message_at": datetime.utcnow()}}
            )
            
            # Broadcast a participantes
            await chat_realtime_service.broadcast_message(
                conversation_id,
                message_doc,
                exclude_user=user_id
            )
            
            # Confirmar envío al remitente
            await websocket.send_json({
                "type": "message_sent",
                "message_id": str(result.inserted_id),
                "conversation_id": conversation_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    elif msg_type == "read_receipt":
        conversation_id = message.get("conversation_id")
        message_ids = message.get("message_ids", [])
        
        if conversation_id:
            from datetime import datetime
            from bson import ObjectId
            
            read_at = datetime.utcnow()
            
            # Marcar mensajes como leídos
            for msg_id in message_ids:
                await db.chat_messages.update_one(
                    {"_id": ObjectId(msg_id)},
                    {"$addToSet": {"read_by": user_id}}
                )
            
            # Broadcast read receipt
            await chat_realtime_service.broadcast_read_receipt(
                conversation_id,
                user_id,
                read_at
            )
    
    elif msg_type == "join_conversation":
        conversation_id = message.get("conversation_id")
        
        # Verificar que el usuario pertenece a la conversación
        conv = await db.chat_conversations.find_one({
            "_id": ObjectId(conversation_id),
            "$or": [
                {"importer_id": user_id},
                {"producer_id": user_id},
                {"participants.user_id": user_id}
            ]
        })
        
        if conv:
            await websocket.send_json({
                "type": "joined",
                "conversation_id": conversation_id,
                "online_users": await chat_realtime_service.get_online_users_in_conversation(conversation_id)
            })
    
    elif msg_type == "presence_request":
        target_user_id = message.get("user_id")
        if target_user_id:
            presence = await chat_realtime_service.get_user_presence(target_user_id)
            await websocket.send_json({
                "type": "presence_response",
                "user_id": target_user_id,
                "status": presence
            })
    
    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unknown message type: {msg_type}"
        })
