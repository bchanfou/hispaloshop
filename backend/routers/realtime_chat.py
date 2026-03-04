from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import AsyncSessionLocal, get_db
from models import Conversation, ConversationParticipant, Message, MessageAttachment, User
from routers.auth import get_current_user
from schemas import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationListItemResponse,
    ConversationResponse,
    MarkConversationReadRequest,
    MessageCreateRequest,
    MessageResponse,
)
from security import decode_access_token

router = APIRouter(prefix="/chat", tags=["realtime-chat"])


class ChatConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, list[WebSocket]] = defaultdict(list)
        self.rooms: dict[str, set[str]] = defaultdict(set)
        self.user_rooms: dict[str, set[str]] = defaultdict(set)
        self.last_seen: dict[str, datetime] = {}
        self.rate_windows: dict[str, deque[datetime]] = defaultdict(deque)

    def _is_rate_limited(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        window = self.rate_windows[user_id]
        while window and now - window[0] > timedelta(minutes=1):
            window.popleft()
        if len(window) >= 30:
            return True
        window.append(now)
        return False

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        self.connections[user_id].append(websocket)
        self.last_seen[user_id] = datetime.now(timezone.utc)

    async def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        if user_id not in self.connections:
            return
        self.connections[user_id] = [ws for ws in self.connections[user_id] if ws != websocket]
        if not self.connections[user_id]:
            self.connections.pop(user_id, None)
            self.last_seen[user_id] = datetime.now(timezone.utc)
            for room in self.user_rooms.get(user_id, set()):
                self.rooms[room].discard(user_id)

    async def join_room(self, user_id: str, conversation_id: str) -> None:
        self.rooms[conversation_id].add(user_id)
        self.user_rooms[user_id].add(conversation_id)

    async def send_user(self, user_id: str, payload: dict[str, Any]) -> None:
        for ws in self.connections.get(user_id, []):
            await ws.send_json(payload)

    async def send_room(self, conversation_id: str, payload: dict[str, Any], exclude_user_id: str | None = None) -> None:
        for uid in self.rooms.get(conversation_id, set()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            await self.send_user(uid, payload)


chat_ws_manager = ChatConnectionManager()


async def _ensure_participant(db: AsyncSession, conversation_id: UUID, user_id: UUID) -> Conversation:
    conversation = await db.scalar(
        select(Conversation)
        .options(selectinload(Conversation.participants))
        .where(Conversation.id == conversation_id, Conversation.is_active.is_(True))
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user_id not in {p.user_id for p in conversation.participants}:
        raise HTTPException(status_code=403, detail="Not a participant")
    return conversation


@router.get("/conversations", response_model=list[ConversationListItemResponse])
async def list_conversations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conversations = list(
        (
            await db.scalars(
                select(Conversation)
                .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
                .where(ConversationParticipant.user_id == current_user.id, Conversation.is_active.is_(True))
                .options(selectinload(Conversation.participants))
                .order_by(Conversation.updated_at.desc())
            )
        ).all()
    )

    items: list[ConversationListItemResponse] = []
    for conv in conversations:
        last_message = await db.scalar(
            select(Message).where(Message.conversation_id == conv.id, Message.deleted_at.is_(None)).order_by(Message.created_at.desc()).limit(1)
        )
        unread = await db.scalar(
            select(func.count(Message.id)).where(
                Message.conversation_id == conv.id,
                Message.sender_id != current_user.id,
                Message.read_at.is_(None),
                Message.deleted_at.is_(None),
            )
        )
        items.append(
            ConversationListItemResponse(
                id=conv.id,
                type=conv.type,
                updated_at=conv.updated_at,
                created_at=conv.created_at,
                unread_count=unread or 0,
                last_message=MessageResponse.model_validate(last_message) if last_message else None,
            )
        )
    return items


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(payload: ConversationCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    participant_ids = set(payload.participant_ids)
    participant_ids.add(current_user.id)
    if len(participant_ids) > 50:
        raise HTTPException(status_code=400, detail="Max 50 participants")

    users = list((await db.scalars(select(User).where(User.id.in_(participant_ids)))).all())
    if len(users) != len(participant_ids):
        raise HTTPException(status_code=400, detail="Invalid participants")

    conversation = Conversation(
        type=payload.type,
        related_order_id=payload.related_order_id,
        related_product_id=payload.related_product_id,
        metadata_json=payload.metadata or {},
    )
    db.add(conversation)
    await db.flush()
    for uid in participant_ids:
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=uid, role="admin" if uid == current_user.id else "member"))
    await db.flush()
    return ConversationResponse.model_validate(conversation)


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationDetailResponse)
async def get_messages(
    conversation_id: UUID,
    cursor: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=50, ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _ensure_participant(db, conversation_id, current_user.id)
    query = select(Message).where(Message.conversation_id == conversation_id, Message.deleted_at.is_(None))
    if cursor:
        query = query.where(Message.created_at < cursor)
    messages = list((await db.scalars(query.order_by(Message.created_at.desc()).limit(limit + 1))).all())
    has_more = len(messages) > limit
    messages = messages[:limit]
    next_cursor = messages[-1].created_at if has_more and messages else None
    messages.reverse()
    return ConversationDetailResponse(
        conversation=ConversationResponse.model_validate(conversation),
        messages=[MessageResponse.model_validate(m) for m in messages],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def post_message(conversation_id: UUID, payload: MessageCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _ensure_participant(db, conversation_id, current_user.id)
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_type="user",
        content=payload.content,
        message_type=payload.message_type,
        reply_to_id=payload.reply_to_id,
        metadata_json=payload.metadata or {},
    )
    db.add(message)
    await db.flush()

    if payload.attachments:
        for attachment in payload.attachments:
            db.add(
                MessageAttachment(
                    message_id=message.id,
                    type=attachment.type,
                    url=str(attachment.url),
                    cloudinary_public_id=attachment.cloudinary_public_id,
                    size=attachment.size,
                )
            )
    await db.flush()

    conversation = await db.get(Conversation, conversation_id)
    if conversation:
        conversation.updated_at = datetime.now(timezone.utc)

    await chat_ws_manager.send_room(
        str(conversation_id),
        {"type": "message_received", "message": MessageResponse.model_validate(message).model_dump(mode="json")},
    )
    return MessageResponse.model_validate(message)


@router.post("/conversations/{conversation_id}/read")
async def mark_read(conversation_id: UUID, payload: MarkConversationReadRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _ensure_participant(db, conversation_id, current_user.id)
    now = payload.read_at or datetime.now(timezone.utc)
    await db.execute(
        Message.__table__.update()
        .where(
            and_(
                Message.conversation_id == conversation_id,
                Message.sender_id != current_user.id,
                or_(Message.read_at.is_(None), Message.read_at < now),
            )
        )
        .values(read_at=now)
    )
    participant = await db.scalar(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
    )
    if participant:
        participant.last_read_at = now
    return {"ok": True, "read_at": now}


@router.delete("/messages/{message_id}")
async def soft_delete_message(message_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only message owner can delete")
    if datetime.now(timezone.utc) - message.created_at > timedelta(hours=24):
        raise HTTPException(status_code=400, detail="Delete window expired")
    message.deleted_at = datetime.now(timezone.utc)
    return {"ok": True}


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
    except ValueError:
        await websocket.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if not user:
            await websocket.close(code=4403)
            return

    await chat_ws_manager.connect(websocket, str(user_id))
    await chat_ws_manager.send_user(str(user_id), {"type": "presence_update", "user_id": str(user_id), "status": "online"})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "heartbeat":
                chat_ws_manager.last_seen[str(user_id)] = datetime.now(timezone.utc)
                await websocket.send_json({"type": "heartbeat_ack"})
                continue

            if msg_type == "join_conversation":
                conversation_id = data.get("conversation_id")
                if not conversation_id:
                    await websocket.send_json({"type": "error", "detail": "conversation_id required"})
                    continue
                async with AsyncSessionLocal() as db:
                    participant = await db.scalar(
                        select(ConversationParticipant).where(
                            ConversationParticipant.conversation_id == UUID(conversation_id),
                            ConversationParticipant.user_id == UUID(str(user_id)),
                        )
                    )
                    if not participant:
                        await websocket.send_json({"type": "error", "detail": "forbidden"})
                        continue
                await chat_ws_manager.join_room(str(user_id), conversation_id)
                await websocket.send_json({"type": "joined", "conversation_id": conversation_id})
                continue

            if msg_type == "typing":
                conversation_id = data.get("conversation_id")
                await chat_ws_manager.send_room(
                    conversation_id,
                    {
                        "type": "user_typing",
                        "conversation_id": conversation_id,
                        "user_id": str(user_id),
                        "is_typing": bool(data.get("is_typing", True)),
                    },
                    exclude_user_id=str(user_id),
                )
                continue

            if msg_type == "message":
                if chat_ws_manager._is_rate_limited(str(user_id)):
                    await websocket.send_json({"type": "error", "detail": "rate_limited"})
                    continue
                conversation_id = UUID(data["conversation_id"])
                async with AsyncSessionLocal() as db:
                    participant = await db.scalar(
                        select(ConversationParticipant).where(
                            ConversationParticipant.conversation_id == conversation_id,
                            ConversationParticipant.user_id == UUID(str(user_id)),
                        )
                    )
                    if not participant:
                        await websocket.send_json({"type": "error", "detail": "forbidden"})
                        continue
                    message = Message(
                        conversation_id=conversation_id,
                        sender_id=UUID(str(user_id)),
                        sender_type="user",
                        content=data.get("content", ""),
                        message_type=data.get("message_type", "text"),
                        reply_to_id=UUID(data["reply_to"]) if data.get("reply_to") else None,
                        metadata_json=data.get("metadata") or {},
                    )
                    db.add(message)
                    await db.commit()
                    await db.refresh(message)
                await chat_ws_manager.send_room(
                    str(conversation_id),
                    {"type": "message_received", "message": MessageResponse.model_validate(message).model_dump(mode="json")},
                )
    except WebSocketDisconnect:
        await chat_ws_manager.disconnect(websocket, str(user_id))
        await chat_ws_manager.send_user(str(user_id), {"type": "presence_update", "user_id": str(user_id), "status": "offline"})
