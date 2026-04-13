"""
Chat B2B (legacy backward-compat shims).

Section 4.7c — Chat unification: this module previously held a parallel B2B chat
system (chat_conversations + chat_messages collections, polling-only, no
push/audio/reactions). It has been collapsed into the unified internal-chat
implementation (``routes/internal_chat.py``).

These endpoints remain for backward compatibility with older clients and any
in-flight B2B operation links. They proxy to the unified collections
(``internal_conversations`` / ``internal_messages``) and fall back to the legacy
collections when a record only exists there.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException

from core.database import get_db
from core.auth import get_current_user
from routes.push_notifications import send_push_to_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/b2b/chat", tags=["Chat B2B (legacy)"])


def _now():
    return datetime.now(timezone.utc)


async def _find_unified_conv(db, conversation_id: str, user_id: str):
    """Look up a unified conversation participant-scoped, by id or legacy id."""
    return await db.internal_conversations.find_one({
        "$or": [
            {"conversation_id": conversation_id},
            {"legacy_b2b_conversation_id": conversation_id},
        ],
        "participants.user_id": user_id,
    })


@router.get("/conversations")
async def get_conversations(current_user=Depends(get_current_user)):
    """Backward-compat: list B2B conversations from the unified collection."""
    db = get_db()

    convs = await db.internal_conversations.find({
        "conversation_type": "b2b",
        "participants.user_id": current_user.user_id,
    }, {"_id": 0}).sort("updated_at", -1).to_list(100)

    enriched = []
    for conv in convs:
        other = None
        for p in conv.get("participants", []):
            if p.get("user_id") != current_user.user_id:
                other = p
                break
        unread = await db.internal_messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": current_user.user_id},
            "status": {"$ne": "read"},
        })
        enriched.append({
            "id": conv["conversation_id"],
            "conversation_id": conv["conversation_id"],
            "importer_id": (conv.get("b2b_context") or {}).get("importer_id"),
            "producer_id": (conv.get("b2b_context") or {}).get("producer_id"),
            "operation_id": (conv.get("b2b_context") or {}).get("operation_id"),
            "status": conv.get("status", "active"),
            "last_message_preview": conv.get("last_message"),
            "last_message_at": conv.get("last_message_at") or conv.get("updated_at"),
            "unread_count": unread,
            "other_participant": {
                "id": other.get("user_id") if other else None,
                "name": other.get("name") if other else None,
                "company": (other.get("company") if other else None),
                "avatar": other.get("avatar") if other else None,
                "role": other.get("role") if other else None,
            } if other else None,
        })

    return {"success": True, "data": enriched}


@router.post("/conversations")
async def create_conversation(
    producer_id: str,
    product_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Backward-compat: create a B2B conversation in the unified collection."""
    db = get_db()

    if current_user.role != "importer":
        raise HTTPException(status_code=403, detail="Only importers can initiate conversations")

    producer = await db.users.find_one({
        "user_id": producer_id,
        "role": {"$in": ["producer", "importer"]},
    })
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")

    pair_key = ":".join(sorted([current_user.user_id, producer_id]))

    existing = await db.internal_conversations.find_one({
        "_pair_key": pair_key,
        "conversation_type": "b2b",
    })
    if existing:
        return {
            "success": True,
            "message": "Conversation already exists",
            "data": {
                "id": existing["conversation_id"],
                "conversation_id": existing["conversation_id"],
                **{k: v for k, v in existing.items() if k != "_id"},
            },
        }

    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    now_iso = _now().isoformat()
    new_conv = {
        "conversation_id": conversation_id,
        "_pair_key": pair_key,
        "conversation_type": "b2b",
        "b2b_context": {
            "importer_id": current_user.user_id,
            "producer_id": producer_id,
            "rfq_id": lead_id,
            "product_id": product_id,
        },
        "participants": [
            {
                "user_id": current_user.user_id,
                "name": getattr(current_user, "full_name", None) or getattr(current_user, "name", "Importador"),
                "role": "importer",
                "avatar": getattr(current_user, "profile_image", None),
            },
            {
                "user_id": producer_id,
                "name": producer.get("full_name") or producer.get("name") or "Productor",
                "role": producer.get("role") or "producer",
                "avatar": producer.get("picture") or producer.get("profile_image"),
            },
        ],
        "status": "active",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    await db.internal_conversations.insert_one(new_conv)

    # System opening message (no emojis — UI handles styling)
    sender_name = getattr(current_user, "full_name", None) or getattr(current_user, "name", "Usuario")
    await db.internal_messages.insert_one({
        "message_id": f"sys_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "sender_id": "system",
        "sender_name": "Sistema",
        "sender_role": "system",
        "content": f"Conversacion iniciada por {sender_name}",
        "message_type": "system",
        "event_type": "conversation_started",
        "status": "sent",
        "created_at": now_iso,
    })

    return {
        "success": True,
        "data": {
            "id": conversation_id,
            "conversation_id": conversation_id,
            **{k: v for k, v in new_conv.items() if k != "_id"},
        },
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    page: int = 1,
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    """Backward-compat: list messages for a B2B conversation."""
    db = get_db()
    conv = await _find_unified_conv(db, conversation_id, current_user.user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    real_id = conv["conversation_id"]
    messages = await db.internal_messages.find(
        {"conversation_id": real_id}, {"_id": 0}
    ).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    messages.reverse()

    # Mark as read
    await db.internal_messages.update_many(
        {
            "conversation_id": real_id,
            "sender_id": {"$ne": current_user.user_id},
            "status": {"$ne": "read"},
        },
        {"$set": {"status": "read", "read_at": _now().isoformat()}},
    )

    return {
        "success": True,
        "data": {
            "messages": [{**m, "id": m.get("message_id"), "is_system_message": m.get("message_type") == "system"} for m in messages],
            "conversation": {
                "id": real_id,
                "conversation_id": real_id,
                "importer_id": (conv.get("b2b_context") or {}).get("importer_id"),
                "producer_id": (conv.get("b2b_context") or {}).get("producer_id"),
                "status": conv.get("status", "active"),
            },
        },
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    content: str,
    attachments: Optional[List[dict]] = None,
    current_user=Depends(get_current_user),
):
    """Backward-compat: send a message into the unified collection + push the recipient."""
    db = get_db()
    if not content or len(content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv = await _find_unified_conv(db, conversation_id, current_user.user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("status") not in (None, "", "active", "pending"):
        raise HTTPException(status_code=400, detail="Conversation is archived")

    real_id = conv["conversation_id"]
    now_iso = _now().isoformat()

    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": real_id,
        "sender_id": current_user.user_id,
        "sender_name": getattr(current_user, "full_name", None) or getattr(current_user, "name", "Usuario"),
        "sender_role": current_user.role,
        "content": content[:2000],
        "message_type": "text",
        "attachments": attachments or [],
        "status": "sent",
        "created_at": now_iso,
    }
    await db.internal_messages.insert_one(message)

    await db.internal_conversations.update_one(
        {"conversation_id": real_id},
        {"$set": {
            "last_message": content[:100],
            "last_message_at": now_iso,
            "updated_at": now_iso,
        }},
    )

    # Section 4.7c quick win — push notifications now wired (parity with internal_chat)
    for participant in conv.get("participants", []):
        if participant.get("user_id") and participant["user_id"] != current_user.user_id:
            try:
                await send_push_to_user(
                    participant["user_id"],
                    title=message["sender_name"],
                    body=content[:100],
                    data={"type": "chat_b2b", "conversation_id": real_id, "sender_id": current_user.user_id},
                )
            except Exception as exc:
                logger.warning("[B2B PUSH] failed: %s", exc)

    return {"success": True, "data": {**message, "id": message["message_id"]}}


@router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user=Depends(get_current_user)):
    """Backward-compat read-receipt."""
    db = get_db()
    msg = await db.internal_messages.find_one({"message_id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    conv = await _find_unified_conv(db, msg["conversation_id"], current_user.user_id)
    if not conv:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.internal_messages.update_one(
        {"message_id": message_id},
        {"$set": {"status": "read", "read_at": _now().isoformat()}},
    )
    return {"success": True}


@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(conversation_id: str, current_user=Depends(get_current_user)):
    """Backward-compat archive."""
    db = get_db()
    conv = await _find_unified_conv(db, conversation_id, current_user.user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.internal_conversations.update_one(
        {"conversation_id": conv["conversation_id"]},
        {"$set": {"status": "archived", "updated_at": _now().isoformat()}},
    )
    return {"success": True, "message": "Conversation archived"}


@router.get("/unread-count")
async def get_unread_count(current_user=Depends(get_current_user)):
    """Backward-compat unread aggregate for B2B conversations only."""
    db = get_db()
    conv_ids = [
        c["conversation_id"]
        async for c in db.internal_conversations.find({
            "conversation_type": "b2b",
            "participants.user_id": current_user.user_id,
        }, {"conversation_id": 1})
    ]
    unread = await db.internal_messages.count_documents({
        "conversation_id": {"$in": conv_ids},
        "sender_id": {"$ne": current_user.user_id},
        "status": {"$ne": "read"},
    }) if conv_ids else 0
    return {
        "success": True,
        "data": {
            "total_unread_conversations": unread,
            "as_importer": unread if current_user.role == "importer" else 0,
            "as_producer": unread if current_user.role == "producer" else 0,
        },
    }
