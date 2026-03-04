from datetime import datetime, timezone
from typing import Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import B2BQuote, Conversation, ConversationParticipant, Importer, Order, User
from routers.auth import get_current_user
from schemas import B2BQuoteCreateRequest, B2BQuoteResponse, B2BQuoteUpdateRequest
from services.b2b_pricing import compute_b2b_total

router = APIRouter(prefix="/b2b/quotes", tags=["b2b_quotes"])


async def _create_b2b_conversation(db: AsyncSession, user_ids: list[UUID], quote_id: UUID) -> None:
    conversation = Conversation(type="b2b_negotiation", metadata_json={"quote_id": str(quote_id)})
    db.add(conversation)
    await db.flush()
    for uid in user_ids:
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=uid, role="member"))


@router.post("", response_model=B2BQuoteResponse)
async def create_quote(
    payload: B2BQuoteCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer role required")

    importer = await db.get(Importer, payload.importer_id)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    serialized_items = [item.model_dump() for item in payload.items]
    quote = B2BQuote(
        importer_id=payload.importer_id,
        requester_producer_id=user.id,
        status="draft",
        items=serialized_items,
        total_value=compute_b2b_total(serialized_items),
        valid_until=payload.valid_until,
        incoterm=payload.incoterm,
        shipping_estimate=payload.shipping_estimate,
        terms_conditions=payload.terms_conditions,
    )
    db.add(quote)
    await db.flush()
    await _create_b2b_conversation(db, [user.id, importer.user_id], quote.id)
    return quote


@router.get("/incoming", response_model=list[B2BQuoteResponse])
async def incoming_quotes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")

    return list((await db.scalars(select(B2BQuote).where(B2BQuote.importer_id == importer.id))).all())


@router.get("/sent", response_model=list[B2BQuoteResponse])
async def sent_quotes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer role required")
    return list((await db.scalars(select(B2BQuote).where(B2BQuote.requester_producer_id == user.id))).all())


@router.put("/{quote_id}", response_model=B2BQuoteResponse)
async def update_quote(
    quote_id: UUID,
    payload: B2BQuoteUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quote = await db.get(B2BQuote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    importer = await db.get(Importer, quote.importer_id)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    allowed = user.id in {quote.requester_producer_id, importer.user_id}
    if not allowed:
        raise HTTPException(status_code=403, detail="Not allowed to modify this quote")

    updates = payload.model_dump(exclude_unset=True)
    if "items" in updates:
        updates["items"] = [item.model_dump() for item in updates["items"]]
    for field, value in updates.items():
        setattr(quote, field, value)

    quote.total_value = compute_b2b_total(quote.items)
    await db.flush()
    return quote


@router.post("/{quote_id}/accept", response_model=B2BQuoteResponse)
async def accept_quote(quote_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    quote = await db.get(B2BQuote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if user.id != quote.requester_producer_id:
        raise HTTPException(status_code=403, detail="Only requester can accept quote")
    if quote.status == "accepted":
        return quote

    order = Order(
        user_id=user.id,
        tenant_id=user.tenant_id,
        status="pending",
        payment_status="pending",
        subtotal_cents=int(quote.total_value * 100),
        total_cents=int(quote.total_value * 100),
        order_type="b2b",
        b2b_quote_id=quote.id,
    )
    db.add(order)
    await db.flush()

    quote.status = "accepted"
    quote.accepted_at = datetime.now(timezone.utc)
    quote.converted_to_order_id = order.id
    return quote
