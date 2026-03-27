"""
Shared WebSocket connection manager for real-time chat.
Imported by websocket/handler.py (WebSocket endpoint) and routes/internal_chat.py (REST endpoints).
Supports multiple tabs/connections per user.
"""
from fastapi import WebSocket
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Multi-tab WebSocket connection manager — one user can have multiple active connections."""

    def __init__(self):
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)
        logger.info(f"[WS] User {user_id} connected. Total: {sum(len(v) for v in self.active_connections.values())}")

    def disconnect(self, user_id: str, websocket: WebSocket = None):
        conns = self.active_connections.get(user_id, [])
        if websocket and websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(user_id, None)
        logger.info(f"[WS] User {user_id} disconnected. Total: {sum(len(v) for v in self.active_connections.values())}")

    async def send_personal_message(self, message: dict, user_id: str):
        conns = self.active_connections.get(user_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"[WS] Error sending to {user_id}: {e}")
                dead.append(ws)
        for ws in dead:
            if ws in conns:
                conns.remove(ws)
        if not conns:
            self.active_connections.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return bool(self.active_connections.get(user_id))


chat_manager = ConnectionManager()
