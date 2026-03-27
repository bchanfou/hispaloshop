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
    
    if not conv:
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
    message = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "sender_name": user.name,
        "sender_role": user.role,
        "content": encrypted_content,
        "image_url": input.image_url,
        "shared_item": input.shared_item,
        "reply_to_id": input.reply_to_id,
        "reply_to_preview": reply_to_preview,
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
    preview = "Imagen" if input.message_type == "image" else "Audio" if input.message_type == "audio" else (input.content or "")[:100]
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
                    await send_push_to_user(
                        recipient_id,
                        title=f"{user.name}",
                        body=input.content[:100] if input.content else ("Te compartio contenido" if input.shared_item else "Te envio una imagen"),
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

