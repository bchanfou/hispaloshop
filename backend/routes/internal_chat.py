"""
Internal Chat routes: Conversations, messages, file uploads between users.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User, InternalMessageCreate
from core.websocket import chat_manager
from services.cloudinary_storage import upload_image as cloudinary_upload
from routes.push_notifications import send_push_to_user
from services.chat_crypto import encrypt_message, decrypt_message, decrypt_message_dict

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/internal-chat/conversations")
async def get_user_conversations(user: User = Depends(get_current_user)):
    """Get all conversations for the current user"""
    conversations = await db.internal_conversations.find(
        {"participants.user_id": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        # Get last message
        last_msg = await db.internal_messages.find_one(
            {"conversation_id": conv["conversation_id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Count unread messages
        unread = await db.internal_messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user.user_id},
            "status": {"$ne": "read"}
        })
        
        # Get other participant info
        other_participant = None
        for p in conv.get("participants", []):
            if p["user_id"] != user.user_id:
                other_participant = p
                break
        
        result.append({
            "conversation_id": conv["conversation_id"],
            "participants": conv.get("participants", []),
            "other_user_id": other_participant["user_id"] if other_participant else None,
            "other_user_name": other_participant["name"] if other_participant else "Unknown",
            "other_user_role": other_participant["role"] if other_participant else None,
            "other_user_avatar": other_participant.get("avatar") if other_participant else None,
            "last_message": decrypt_message_dict(last_msg) if last_msg else None,
            "unread_count": unread,
            "created_at": conv.get("created_at"),
            "updated_at": conv.get("updated_at"),
            "conv_type": conv.get("conv_type"),
        })
    
    return result

@router.get("/internal-chat/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get messages for a specific conversation"""
    await update_last_seen(user.user_id)
    # Verify user is participant
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    query = {"conversation_id": conversation_id}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.internal_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark messages as delivered if not already
    undelivered_ids = [m["message_id"] for m in messages if m.get("sender_id") != user.user_id and m.get("status") == "sent"]
    if undelivered_ids:
        await db.internal_messages.update_many(
            {"message_id": {"$in": undelivered_ids}},
            {"$set": {"status": "delivered", "delivered_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Decrypt message content before returning
    messages = [decrypt_message_dict(m) for m in messages]
    return list(reversed(messages))

@router.get("/internal-chat/conversations/{conversation_id}/messages/search")
async def search_conversation_messages(
    conversation_id: str,
    q: str = "",
    limit: int = 20,
    user: User = Depends(get_current_user)
):
    """Search messages within a conversation by text content."""
    import re as _re
    query_text = q.strip()
    if not query_text:
        return {"messages": [], "total": 0, "has_more": False}

    # Verify user is participant
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    escaped = _re.escape(query_text)
    search_query = {
        "conversation_id": conversation_id,
        "content": {"$regex": escaped, "$options": "i"}
    }
    total = await db.internal_messages.count_documents(search_query)
    messages = await db.internal_messages.find(
        search_query, {"_id": 0, "message_id": 1, "content": 1, "sender_id": 1, "sender_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Decrypt message content
    messages = [decrypt_message_dict(m) for m in messages]

    return {"messages": messages, "total": total, "has_more": total > limit}


@router.post("/internal-chat/messages")
async def send_internal_message(
    input: InternalMessageCreate,
    user: User = Depends(get_current_user)
):
    """Send a message in internal chat"""
    await update_last_seen(user.user_id)
    now = datetime.now(timezone.utc).isoformat()
    if not (input.content or input.image_url or input.shared_item):
        raise HTTPException(status_code=400, detail="Message content, image_url or shared_item is required")
    
    # Get or create conversation
    conversation_id = input.conversation_id
    
    if not conversation_id and input.recipient_id:
        # Atomic find-or-create: prevents duplicate conversations from concurrent requests
        # Sort participant IDs to create a deterministic pair key
        pair_key = ":".join(sorted([user.user_id, input.recipient_id]))
        existing = await db.internal_conversations.find_one({"_pair_key": pair_key})

        if not existing:
            # Also check legacy conversations without _pair_key
            existing = await db.internal_conversations.find_one({
                "$and": [
                    {"participants.user_id": user.user_id},
                    {"participants.user_id": input.recipient_id}
                ]
            })

        if existing:
            conversation_id = existing["conversation_id"]
        else:
            # Create new conversation
            recipient = await db.users.find_one({"user_id": input.recipient_id})
            if not recipient:
                raise HTTPException(status_code=404, detail="Recipient not found")

            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

            # Get user avatar/logo
            sender_avatar = None
            recipient_avatar = None

            if user.role == "producer":
                store = await db.stores.find_one({"producer_id": user.user_id})
                sender_avatar = store.get("logo") if store else None

            if recipient.get("role") == "producer":
                store = await db.stores.find_one({"producer_id": recipient["user_id"]})
                recipient_avatar = store.get("logo") if store else None

            new_conv = {
                "conversation_id": conversation_id,
                "_pair_key": pair_key,
                "status": "pending",
                "participants": [
                    {
                        "user_id": user.user_id,
                        "name": user.name,
                        "role": user.role,
                        "avatar": sender_avatar
                    },
                    {
                        "user_id": recipient["user_id"],
                        "name": recipient.get("name", "User"),
                        "role": recipient.get("role", "customer"),
                        "avatar": recipient_avatar
                    }
                ],
                "created_at": now,
                "updated_at": now
            }
            try:
                await db.internal_conversations.insert_one(new_conv)
            except Exception:
                # Unique index violation → concurrent request created it first
                existing = await db.internal_conversations.find_one({"_pair_key": pair_key})
                if existing:
                    conversation_id = existing["conversation_id"]
    
    if not conversation_id:
        raise HTTPException(status_code=400, detail="Either conversation_id or recipient_id is required")
    
    # Verify user is participant
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    
    # ── CHECK: Message from unknown user → Request Inbox ──
    if not conv:
        # Check if conversation doesn't exist (first message)
        conv_check = await db.internal_conversations.find_one({
            "conversation_id": conversation_id
        })
        
        if not conv_check and input.recipient_id:
            # Check if should go to request inbox
            should_inbox = await chat_request_inbox.should_go_to_inbox(
                user.user_id, input.recipient_id
            )
            
            if should_inbox:
                # Create request instead of direct message
                preview = (input.content or "")[:80]
                if input.image_url:
                    preview = "📷 Imagen"
                
                try:
                    request = await chat_request_inbox.create_request(
                        sender_id=user.user_id,
                        recipient_id=input.recipient_id,
                        message_preview=preview
                    )
                    return {
                        "request_sent": True,
                        "request_id": request["request_id"],
                        "message": "Solicitud enviada. El usuario debe aceptar para comenzar la conversación."
                    }
                except Exception as e:
                    logger.error(f"[REQUEST_INBOX] Error creating request: {e}")
                    raise HTTPException(status_code=500, detail="No se pudo enviar la solicitud")
        
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # ── Anti-spam: if recipient hasn't responded, limit to 1 initial message ──
    conv_status = conv.get("status", "active")
    if conv_status == "pending":
        # Check if this sender already sent a message without reply
        sender_msgs = await db.internal_messages.count_documents({
            "conversation_id": conversation_id,
            "sender_id": user.user_id
        })
        recipient_msgs = await db.internal_messages.count_documents({
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user.user_id}
        })
        if sender_msgs >= 1 and recipient_msgs == 0:
            raise HTTPException(
                status_code=429,
                detail="Este usuario aun no ha respondido. No puedes enviar mas mensajes hasta recibir respuesta."
            )
    
    # Build reply preview snapshot if replying to a message
    reply_to_preview = None
    if input.reply_to_id:
        original = await db.internal_messages.find_one(
            {"message_id": input.reply_to_id, "conversation_id": conversation_id}
        )
        if original:
            plain_content = decrypt_message(original.get("content", "")) if original.get("content") else ""
            reply_to_preview = {
                "id": original["message_id"],
                "content": plain_content[:100] if plain_content else "",
                "sender_name": original.get("sender_name", ""),
                "sender_id": original.get("sender_id", ""),
                "media_url": original.get("image_url"),
            }

    # Create message — encrypt content at rest
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    encrypted_content = encrypt_message(input.content) if input.content else input.content
    
    # Determine message type
    message_type = input.message_type or "text"
    if input.image_url:
        message_type = "image"
    elif input.audio_url or input.audio_id:
        message_type = "audio"
    
    message = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "sender_name": user.name,
        "sender_role": user.role,
        "content": encrypted_content,
        "image_url": input.image_url,
        "audio_url": input.audio_url,
        "audio_duration": input.audio_duration,
        "audio_id": input.audio_id,
        "shared_item": input.shared_item,
        "reply_to_id": input.reply_to_id,
        "reply_to_preview": reply_to_preview,
        "message_type": message_type,
        "status": "sent",
        "created_at": now
    }

    try:
        await db.internal_messages.insert_one(message)
    except Exception as e:
        logger.error(f"[CHAT] Failed to save message: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar el mensaje")
    # Return plaintext to client — never expose encrypted bytes
    message["content"] = input.content
    
    # Update conversation last message, timestamp, and status
    preview = "Imagen" if message_type == "image" else "🎙 Audio" if message_type == "audio" else (input.content or "")[:100]
    update_conv = {"updated_at": now, "last_message": preview, "last_message_at": now}
    # Activate conversation when recipient replies for the first time
    if conv.get("status") == "pending":
        other_msgs = await db.internal_messages.count_documents({
            "conversation_id": conversation_id,
            "sender_id": {"$ne": conv.get("participants", [{}])[0].get("user_id")}
        })
        if other_msgs >= 1:
            update_conv["status"] = "active"
    await db.internal_conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": update_conv}
    )
    
    # Get recipient and send via WebSocket if online
    for participant in conv.get("participants", []):
        if participant["user_id"] != user.user_id:
            recipient_id = participant["user_id"]
            
            # Check if recipient is online
            if chat_manager.is_online(recipient_id):
                message["status"] = "delivered"
                message["delivered_at"] = now
                await db.internal_messages.update_one(
                    {"message_id": message_id},
                    {"$set": {"status": "delivered", "delivered_at": now}}
                )
            
            # Send message via WebSocket
            ws_message = {
                "type": "new_message",
                "message": {k: v for k, v in message.items() if k != "_id"},
                "conversation_id": conversation_id
            }
            await chat_manager.send_personal_message(ws_message, recipient_id)
            
            # Send Web Push notification if recipient is offline
            if not chat_manager.is_online(recipient_id):
                try:
                    # Build notification body based on message type
                    if message_type == "audio":
                        body = "🎙 Te envió un audio"
                    elif input.image_url:
                        body = "📷 Te envió una imagen"
                    elif input.shared_item:
                        body = "Te compartió contenido"
                    else:
                        body = input.content[:100] if input.content else "Nuevo mensaje"
                    
                    await send_push_to_user(
                        recipient_id,
                        title=f"{user.name}",
                        body=body,
                        data={"type": "chat", "conversation_id": conversation_id, "sender_id": user.user_id}
                    )
                except Exception as e:
                    logger.warning(f"[PUSH] Failed to send push: {e}")
    
    return {k: v for k, v in message.items() if k != "_id"}


@router.post("/internal-chat/upload-image")
async def upload_chat_image(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    user: User = Depends(get_current_user)
):
    """Upload an image for chat message"""
    import base64
    
    # Verify user is participant
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Read and validate file size (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size cannot exceed 5MB")
    
    # Upload to Cloudinary
    from services.cloudinary_storage import upload_image as cloudinary_upload
    result = await cloudinary_upload(contents, folder="chat", filename=f"chat_{uuid.uuid4().hex[:8]}")
    image_url = result["url"]
    
    return {"image_url": image_url, "filename": file.filename}


@router.put("/internal-chat/messages/{message_id}/read")
async def mark_message_read(message_id: str, user: User = Depends(get_current_user)):
    """Mark a specific message as read"""
    message = await db.internal_messages.find_one({"message_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user is the recipient
    conv = await db.internal_conversations.find_one({
        "conversation_id": message["conversation_id"],
        "participants.user_id": user.user_id
    })
    
    if not conv or message["sender_id"] == user.user_id:
        raise HTTPException(status_code=403, detail="Cannot mark own message as read")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.internal_messages.update_one(
        {"message_id": message_id},
        {"$set": {"status": "read", "read_at": now}}
    )
    
    # Notify sender via WebSocket
    await chat_manager.send_personal_message({
        "type": "message_read",
        "message_id": message_id,
        "conversation_id": message["conversation_id"],
        "read_by": user.user_id,
        "read_at": now
    }, message["sender_id"])
    
    return {"status": "ok"}

@router.get("/internal-chat/unread-count")
async def get_unread_count(user: User = Depends(get_current_user)):
    """Get total unread message count for current user"""
    # Get all user's conversations
    conversations = await db.internal_conversations.find(
        {"participants.user_id": user.user_id},
        {"conversation_id": 1}
    ).to_list(100)
    
    conv_ids = [c["conversation_id"] for c in conversations]
    
    count = await db.internal_messages.count_documents({
        "conversation_id": {"$in": conv_ids},
        "sender_id": {"$ne": user.user_id},
        "status": {"$ne": "read"}
    })
    
    return {"unread_count": count}

@router.post("/internal-chat/start-conversation")
async def start_conversation(
    request: Request,
    user: User = Depends(get_current_user)
):
    """Start a new conversation with a user (or return existing one)"""
    body = await request.json()
    recipient_id = body.get("other_user_id") or body.get("recipient_id")
    conv_type = body.get("conv_type") or body.get("type")
    if not recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id or other_user_id required")
    # Check if conversation already exists
    existing = await db.internal_conversations.find_one({
        "$and": [
            {"participants.user_id": user.user_id},
            {"participants.user_id": recipient_id}
        ]
    })
    
    if existing:
        return {"conversation_id": existing["conversation_id"], "is_new": False}
    
    # Get recipient info
    recipient = await db.users.find_one({"user_id": recipient_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new conversation
    now = datetime.now(timezone.utc).isoformat()
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    
    # Get avatars
    sender_avatar = None
    recipient_avatar = None
    
    if user.role == "producer":
        store = await db.stores.find_one({"producer_id": user.user_id})
        sender_avatar = store.get("logo") if store else None
    
    if recipient.get("role") == "producer":
        store = await db.stores.find_one({"producer_id": recipient["user_id"]})
        recipient_avatar = store.get("logo") if store else None
    
    new_conv = {
        "conversation_id": conversation_id,
        "participants": [
            {
                "user_id": user.user_id,
                "name": user.name,
                "role": user.role,
                "avatar": sender_avatar
            },
            {
                "user_id": recipient["user_id"],
                "name": recipient.get("name", "User"),
                "role": recipient.get("role", "customer"),
                "avatar": recipient_avatar
            }
        ],
        "created_at": now,
        "updated_at": now
    }
    if conv_type:
        new_conv["conv_type"] = conv_type

    await db.internal_conversations.insert_one(new_conv)

    return {"conversation_id": conversation_id, "is_new": True}


@router.delete("/internal-chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a conversation and all its messages"""
    # Verify user is a participant
    conversation = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    
    # Delete all messages in this conversation
    await db.internal_messages.delete_many({"conversation_id": conversation_id})
    
    # Delete the conversation
    await db.internal_conversations.delete_one({"conversation_id": conversation_id})
    
    return {"message": "Conversation deleted successfully"}


# ──────────────────────────────────────────────
# ESCALATION CHANNEL: Admin → SuperAdmin
# ──────────────────────────────────────────────

@router.post("/internal-chat/escalate")
async def escalate_to_superadmin(
    request: Request,
    user: User = Depends(get_current_user)
):
    """
    Open (or reopen) the private escalation channel between an admin and all super_admins.
    Only admins and super_admins can access this endpoint.
    Conversations are tagged with conv_type='escalation' and encrypted like all chat messages.
    """
    await require_role(user, ["admin", "super_admin"])

    body = await request.json()
    initial_message = body.get("message", "").strip()

    now = datetime.now(timezone.utc).isoformat()

    # Find the first available super_admin to assign this escalation to
    # (or return existing escalation conv for this admin)
    existing = await db.internal_conversations.find_one({
        "conv_type": "escalation",
        "participants.user_id": user.user_id
    })

    if existing:
        conv_id = existing["conversation_id"]
    else:
        # Pick any active super_admin
        super_admin = await db.users.find_one(
            {"role": "super_admin", "account_status": {"$ne": "banned"}},
            {"_id": 0, "user_id": 1, "name": 1, "profile_image": 1}
        )
        if not super_admin:
            raise HTTPException(status_code=503, detail="No hay superadmins disponibles en este momento")

        conv_id = f"esc_{uuid.uuid4().hex[:12]}"
        new_conv = {
            "conversation_id": conv_id,
            "conv_type": "escalation",
            "status": "active",
            "participants": [
                {"user_id": user.user_id, "name": user.name, "role": user.role, "avatar": None},
                {"user_id": super_admin["user_id"], "name": super_admin["name"], "role": "super_admin", "avatar": super_admin.get("profile_image")}
            ],
            "created_at": now,
            "updated_at": now
        }
        await db.internal_conversations.insert_one(new_conv)

    # Optionally send initial message
    if initial_message:
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        encrypted = encrypt_message(initial_message)
        msg_doc = {
            "message_id": message_id,
            "conversation_id": conv_id,
            "sender_id": user.user_id,
            "sender_name": user.name,
            "sender_role": user.role,
            "content": encrypted,
            "status": "sent",
            "created_at": now
        }
        await db.internal_messages.insert_one(msg_doc)
        await db.internal_conversations.update_one(
            {"conversation_id": conv_id},
            {"$set": {"updated_at": now}}
        )
        # Notify super_admin via WebSocket
        conv_doc = await db.internal_conversations.find_one({"conversation_id": conv_id})
        for p in (conv_doc or {}).get("participants", []):
            if p["user_id"] != user.user_id:
                ws_msg = {
                    "type": "new_message",
                    "message": {**msg_doc, "content": initial_message, "_id": None},
                    "conversation_id": conv_id,
                    "conv_type": "escalation"
                }
                ws_msg["message"].pop("_id", None)
                await chat_manager.send_personal_message(ws_msg, p["user_id"])

    return {"conversation_id": conv_id, "conv_type": "escalation"}


@router.get("/internal-chat/escalations")
async def list_escalations(user: User = Depends(get_current_user)):
    """
    SuperAdmin: list all open escalation conversations.
    Admin: list own escalation conversation.
    """
    await require_role(user, ["admin", "super_admin"])

    if user.role == "super_admin":
        convs = await db.internal_conversations.find(
            {"conv_type": "escalation"},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(200)
    else:
        convs = await db.internal_conversations.find(
            {"conv_type": "escalation", "participants.user_id": user.user_id},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(10)

    result = []
    for conv in convs:
        last_msg = await db.internal_messages.find_one(
            {"conversation_id": conv["conversation_id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        unread = await db.internal_messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user.user_id},
            "status": {"$ne": "read"}
        })
        result.append({
            **conv,
            "last_message": decrypt_message_dict(last_msg) if last_msg else None,
            "unread_count": unread
        })

    return result


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

async def update_last_seen(user_id: str):
    """Update user's last_seen timestamp"""
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_seen": now}}
    )


# ──────────────────────────────────────────────
# BULK READ / TYPING / CONVERSATION DETAIL
# ──────────────────────────────────────────────

@router.post("/internal-chat/conversations/{conversation_id}/read")
async def mark_conversation_read(conversation_id: str, user: User = Depends(get_current_user)):
    """Mark all unread messages in a conversation as read"""
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.internal_messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user.user_id},
            "status": {"$ne": "read"}
        },
        {"$set": {"status": "read", "read_at": now}}
    )

    # Notify other participant via WebSocket
    for p in conv.get("participants", []):
        if p["user_id"] != user.user_id:
            await chat_manager.send_personal_message({
                "type": "messages_read",
                "conversation_id": conversation_id,
                "read_by": user.user_id,
                "read_at": now
            }, p["user_id"])

    return {"status": "ok", "updated": result.modified_count}


@router.post("/internal-chat/conversations/{conversation_id}/typing")
async def send_typing_indicator(conversation_id: str, user: User = Depends(get_current_user)):
    """Send typing indicator to conversation participants"""
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for p in conv.get("participants", []):
        if p["user_id"] != user.user_id:
            await chat_manager.send_personal_message({
                "type": "typing",
                "conversation_id": conversation_id,
                "user_id": user.user_id,
                "is_typing": True
            }, p["user_id"])

    return {"status": "ok"}


@router.get("/internal-chat/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: str, user: User = Depends(get_current_user)):
    """Get single conversation detail with participant info"""
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    }, {"_id": 0})

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get other participant details including last_seen
    other_participant = None
    for p in conv.get("participants", []):
        if p["user_id"] != user.user_id:
            other_participant = dict(p)
            user_doc = await db.users.find_one({"user_id": p["user_id"]}, {"last_seen": 1})
            if user_doc:
                other_participant["last_seen"] = user_doc.get("last_seen")
            break

    # Count unread
    unread = await db.internal_messages.count_documents({
        "conversation_id": conversation_id,
        "sender_id": {"$ne": user.user_id},
        "status": {"$ne": "read"}
    })

    return {
        **conv,
        "other_participant": other_participant,
        "unread_count": unread,
    }


# ──────────────────────────────────────────────
# AUDIO MESSAGES
# ──────────────────────────────────────────────

from services.chat_audio_service import chat_audio_service


@router.post("/internal-chat/upload-audio")
async def upload_chat_audio(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    duration_seconds: float = Form(...),
    user: User = Depends(get_current_user)
):
    """Upload an audio message for chat"""
    # Verify user is participant
    conv = await db.internal_conversations.find_one({
        "conversation_id": conversation_id,
        "participants.user_id": user.user_id
    })
    
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith(('audio/', 'video/webm', 'application/octet-stream')):
        raise HTTPException(status_code=400, detail="Only audio files are allowed")
    
    # Read file
    contents = await file.read()
    
    try:
        result = await chat_audio_service.upload_audio(
            audio_data=contents,
            conversation_id=conversation_id,
            sender_id=user.user_id,
            duration_seconds=duration_seconds
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[AUDIO] Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload audio")


@router.get("/internal-chat/audio/{audio_id}")
async def get_audio_info(
    audio_id: str,
    user: User = Depends(get_current_user)
):
    """Get audio message info"""
    info = await chat_audio_service.get_audio_info(audio_id)
    if not info:
        raise HTTPException(status_code=404, detail="Audio not found or expired")
    return info


# ──────────────────────────────────────────────
# CHAT GROUPS
# ──────────────────────────────────────────────

from services.chat_groups_service import chat_groups_service


@router.post("/internal-chat/groups/private")
async def create_private_group(
    request: Request,
    user: User = Depends(get_current_user)
):
    """Create a private chat group (max 20 members)"""
    body = await request.json()
    name = body.get("name", "").strip()
    member_ids = body.get("member_ids", [])
    avatar_url = body.get("avatar_url")
    
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")
    
    if not member_ids or len(member_ids) < 1:
        raise HTTPException(status_code=400, detail="At least one member is required")
    
    try:
        result = await chat_groups_service.create_private_group(
            creator_id=user.user_id,
            name=name,
            member_ids=member_ids,
            avatar_url=avatar_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/internal-chat/groups/community/{community_id}")
async def create_community_group(
    community_id: str,
    request: Request,
    user: User = Depends(get_current_user)
):
    """Create a community chat group (requires admin role)"""
    body = await request.json()
    name = body.get("name", "").strip()
    
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")
    
    # Verify user is community admin
    community = await db.communities.find_one({
        "_id": community_id,
        "admins": {"$in": [user.user_id]}
    })
    
    if not community:
        raise HTTPException(status_code=403, detail="Only community admins can create groups")
    
    try:
        result = await chat_groups_service.create_community_group(
            community_id=community_id,
            name=name,
            admin_id=user.user_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/internal-chat/groups/{group_id}/join")
async def join_community_group(
    group_id: str,
    user: User = Depends(get_current_user)
):
    """Join a community chat group (opt-in)"""
    try:
        result = await chat_groups_service.join_community_group(group_id, user.user_id)
        return {"joined": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/internal-chat/groups/{group_id}/leave")
async def leave_group(
    group_id: str,
    user: User = Depends(get_current_user)
):
    """Leave a chat group"""
    try:
        result = await chat_groups_service.leave_group(group_id, user.user_id)
        return {"left": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/internal-chat/groups/{group_id}/members")
async def add_member_to_group(
    group_id: str,
    request: Request,
    user: User = Depends(get_current_user)
):
    """Add member to private group (admin only)"""
    body = await request.json()
    new_member_id = body.get("user_id")
    
    if not new_member_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    try:
        result = await chat_groups_service.add_member_to_private_group(
            group_id=group_id,
            admin_id=user.user_id,
            new_member_id=new_member_id
        )
        return {"added": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/internal-chat/groups/{group_id}")
async def get_group_info(
    group_id: str,
    user: User = Depends(get_current_user)
):
    """Get group information"""
    info = await chat_groups_service.get_group_info(group_id)
    if not info:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Verify user is member
    member_ids = [m["user_id"] for m in info.get("members", [])]
    if user.user_id not in member_ids:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    return info


@router.get("/internal-chat/groups")
async def get_my_groups(
    user: User = Depends(get_current_user)
):
    """Get all groups for current user"""
    return await chat_groups_service.get_user_groups(user.user_id)


# ──────────────────────────────────────────────
# REQUEST INBOX (Messages from unknown users)
# ──────────────────────────────────────────────

from services.chat_request_inbox import chat_request_inbox


@router.get("/internal-chat/requests")
async def get_chat_requests(
    status: str = "pending",
    user: User = Depends(get_current_user)
):
    """Get chat requests (messages from unknown users)"""
    requests = await chat_request_inbox.get_requests_for_user(user.user_id, status)
    return {"requests": requests, "count": len(requests)}


@router.get("/internal-chat/requests/count")
async def get_chat_request_count(
    user: User = Depends(get_current_user)
):
    """Get pending chat request count"""
    count = await chat_request_inbox.get_pending_count(user.user_id)
    return {"pending_count": count}


@router.post("/internal-chat/requests/{request_id}/accept")
async def accept_chat_request(
    request_id: str,
    user: User = Depends(get_current_user)
):
    """Accept a chat request and create conversation"""
    try:
        conversation_id = await chat_request_inbox.accept_request(request_id, user.user_id)
        return {"conversation_id": conversation_id, "status": "accepted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/internal-chat/requests/{request_id}/decline")
async def decline_chat_request(
    request_id: str,
    user: User = Depends(get_current_user)
):
    """Decline a chat request"""
    try:
        await chat_request_inbox.decline_request(request_id, user.user_id)
        return {"status": "declined"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

