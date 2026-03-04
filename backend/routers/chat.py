from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import ChatMessage, ChatSession, Product, User
from routers.auth import get_current_user
from routers.products import _map_product
from schemas import ChatCloseRequest, ChatHistoryResponse, ChatMessageCreateRequest, ChatMessageResponse, ChatSessionCreateRequest, ChatSessionResponse

router = APIRouter(prefix="/chat")
client: AsyncOpenAI | None = None
if settings.OPENAI_API_KEY:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, organization=settings.OPENAI_ORG_ID or None)


def _require_pro(user: User) -> None:
    if not user.subscription or user.subscription.plan not in {"pro", "elite"}:
        raise HTTPException(status_code=403, detail="PRO o ELITE requerido")


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(payload: ChatSessionCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.refresh(current_user, ["subscription"])
    _require_pro(current_user)
    session = ChatSession(user_id=current_user.id, context=payload.context or {})
    db.add(session)
    await db.flush()
    return ChatSessionResponse(id=session.id, status=session.status, created_at=session.created_at, welcome_message="¡Hola! Soy HI AI, ¿qué te apetece hoy?")


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: UUID,
    payload: ChatMessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.content))
    response_text = ""
    if settings.OPENAI_API_KEY and client is not None:
        history = [{"role": msg.role, "content": msg.content} for msg in session.messages[-6:] if msg.role in {"user", "assistant"}]
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Eres HI AI de Hispaloshop."}, *history, {"role": "user", "content": payload.content}],
            temperature=0.7,
            max_tokens=300,
        )
        response_text = completion.choices[0].message.content or ""
        usage = completion.usage
    else:
        response_text = "Te recomiendo explorar nuestros productos orgánicos y vinos para maridaje."
        usage = None

    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_text,
        recommended_products=[],
        prompt_tokens=usage.prompt_tokens if usage else None,
        completion_tokens=usage.completion_tokens if usage else None,
        total_tokens=usage.total_tokens if usage else None,
    )
    session.message_count += 2
    session.updated_at = datetime.now(timezone.utc)
    db.add(assistant_message)
    await db.flush()

    return {
        "message": ChatMessageResponse(
            id=assistant_message.id,
            role="assistant",
            content=assistant_message.content,
            recommended_products=[],
            tokens_used=assistant_message.total_tokens,
            created_at=assistant_message.created_at,
        ),
        "suggested_products": [],
    }


@router.get("/sessions/{session_id}/messages", response_model=ChatHistoryResponse)
async def history(session_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.scalar(select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    product_ids = []
    for msg in session.messages:
        if msg.recommended_products:
            product_ids.extend(msg.recommended_products)
    suggested = []
    if product_ids:
        products = list((await db.scalars(select(Product).where(Product.id.in_(product_ids)))).all())
        suggested = [_map_product(p) for p in products]

    return ChatHistoryResponse(
        session=ChatSessionResponse(id=session.id, status=session.status, created_at=session.created_at, welcome_message=""),
        messages=[
            ChatMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                recommended_products=[UUID(value) for value in (m.recommended_products or [])],
                tokens_used=m.total_tokens,
                created_at=m.created_at,
            )
            for m in session.messages
        ],
        suggested_products=suggested,
    )


@router.post("/sessions/{session_id}/close")
async def close_session(session_id: UUID, payload: ChatCloseRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.scalar(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "closed"
    session.user_satisfaction = payload.satisfaction_rating
    session.closed_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return {"ok": True}
