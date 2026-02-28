"""
Shared WebSocket connection manager for real-time chat.
Imported by server.py (WebSocket endpoint) and routes/internal_chat.py (REST endpoints).
"""
from fastapi import WebSocket
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"[WS] User {user_id} connected. Active: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"[WS] User {user_id} disconnected. Active: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"[WS] Error sending to {user_id}: {e}")
                self.disconnect(user_id)
        return False

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections


chat_manager = ConnectionManager()
