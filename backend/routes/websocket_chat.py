"""
WebSocket Endpoint para Chat Real-Time
Fase 5: Conexiones persistentes bidireccionales
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from backend.websocket.handler import handle_websocket

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token de autenticación")
):
    """
    Endpoint WebSocket para chat en tiempo real
    
    **Protocolo de mensajes:**
    
    Cliente -> Servidor:
    ```json
    {"type": "ping", "timestamp": 1234567890}
    {"type": "typing", "conversation_id": "...", "is_typing": true}
    {"type": "message", "conversation_id": "...", "content": "Hola"}
    {"type": "read_receipt", "conversation_id": "...", "message_ids": ["..."]}
    {"type": "join_conversation", "conversation_id": "..."}
    {"type": "presence_request", "user_id": "..."}
    ```
    
    Servidor -> Cliente:
    ```json
    {"type": "pong", "timestamp": 1234567890}
    {"type": "typing", "conversation_id": "...", "user_id": "...", "is_typing": true}
    {"type": "new_message", "conversation_id": "...", "message": {...}}
    {"type": "message_sent", "message_id": "...", "timestamp": "..."}
    {"type": "read_receipt", "conversation_id": "...", "user_id": "...", "read_at": "..."}
    {"type": "presence_update", "user_id": "...", "status": "online|offline"}
    {"type": "joined", "conversation_id": "...", "online_users": ["..."]}
    {"type": "error", "message": "..."}
    ```
    """
    await handle_websocket(websocket, token)
