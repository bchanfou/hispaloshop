"""
Direct messaging: conversations, messages, user search for chat.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import html as html_module
import os
import re
import uuid
import logging
import asyncio

_FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com").rstrip("/")

from core.database import db
from core.models import User, NewConversationInput, MessageInput
from core.auth import get_current_user
from services.auth_helpers import send_email

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/chat/conversations")
async def get_conversations(user: User = Depends(get_current_user)):
    """Get all conversations for current user"""
    conversations = await db.internal_chats.find({
        "$or": [
            {"user1_id": user.user_id},
            {"user2_id": user.user_id},
            {"type": "group", "participants": user.user_id}
        ]
    }, {"_id": 0}).sort("last_message_at", -1).to_list(100)

    if not conversations:
        return []

    # Collect all other-user IDs and conversation IDs in one pass
    other_user_ids = []
    for conv in conversations:
        if conv.get("type") == "group":
            # For groups, use admin_id as the "other user" placeholder
            other_user_ids.append(conv.get("admin_id", ""))
        else:
            oid = conv["user2_id"] if conv["user1_id"] == user.user_id else conv["user1_id"]
            other_user_ids.append(oid)

    conv_ids = [c["conversation_id"] for c in conversations]

    # Batch-fetch user profiles + unread counts concurrently (2 queries total, not 2N)
    users_docs, unread_agg = await asyncio.gather(
        db.users.find(
            {"user_id": {"$in": other_user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "role": 1, "avatar_url": 1, "profile_image": 1, "last_seen": 1},
        ).to_list(len(other_user_ids)),
        db.chat_messages.aggregate([
            {"$match": {"conversation_id": {"$in": conv_ids}, "sender_id": {"$ne": user.user_id}, "read": False}},
            {"$group": {"_id": "$conversation_id", "count": {"$sum": 1}}},
        ]).to_list(len(conv_ids)),
    )

    users_map = {u["user_id"]: u for u in users_docs}
    unread_map = {r["_id"]: r["count"] for r in unread_agg}

    now_utc = datetime.now(timezone.utc)
    result = []
    for conv, other_user_id in zip(conversations, other_user_ids):
        if conv.get("type") == "group":
            result.append({
                "id": conv["conversation_id"],
                "conversation_id": conv["conversation_id"],
                "type": "group",
                "group_name": conv.get("group_name", "Grupo"),
                "group_avatar": conv.get("group_avatar"),
                "group_subtype": conv.get("group_subtype", "private"),
                "admin_id": conv.get("admin_id"),
                "participant_count": len(conv.get("participants", [])),
                "muted": user.user_id in conv.get("muted_by", []),
                "last_message": conv.get("last_message"),
                "last_message_at": conv.get("last_message_at"),
                "unread_count": unread_map.get(conv["conversation_id"], 0),
            })
            continue

        other_user = users_map.get(other_user_id)
        uname = other_user.get("name", "Usuario") if other_user else "Usuario"
        role = other_user.get("role", "customer") if other_user else "customer"
        conv_type = "b2c" if role in ("producer", "importer") else "c2c"
        avatar = (other_user.get("avatar_url") or other_user.get("profile_image")) if other_user else None
        last_seen_val = other_user.get("last_seen") if other_user else None
        is_online = False
        if last_seen_val:
            try:
                seen_dt = datetime.fromisoformat(str(last_seen_val).replace("Z", "+00:00"))
                is_online = (now_utc - seen_dt) < timedelta(minutes=2)
            except Exception:
                pass

        result.append({
            "id": conv["conversation_id"],
            "conversation_id": conv["conversation_id"],
            "other_user_id": other_user_id,
            "name": uname,
            "avatar_url": avatar,
            "type": conv_type,
            "role": role,
            "online": is_online,
            "last_seen": last_seen_val,
            "last_message": conv.get("last_message"),
            "last_message_at": conv.get("last_message_at"),
            "unread_count": unread_map.get(conv["conversation_id"], 0),
            "other_user_name": uname,
            "other_user_type": role,
        })

    return result

@router.post("/chat/conversations")
async def create_conversation(input: NewConversationInput, user: User = Depends(get_current_user)):
    """Start a new conversation"""
    if input.other_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="No puedes enviarte mensajes a ti mismo")

    # Check if other user exists
    other_user = await db.users.find_one({"user_id": input.other_user_id}, {"_id": 0})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate roles - only producers/importers and influencers can initiate or receive chats
    influencer = await db.influencers.find_one({"user_id": input.other_user_id})
    current_influencer = await db.influencers.find_one({"user_id": user.user_id})
    sender_can_chat = user.role in ("producer", "importer") or current_influencer is not None
    receiver_can_chat = other_user.get("role") in ("producer", "importer") or influencer is not None
    if not sender_can_chat or not receiver_can_chat:
        raise HTTPException(status_code=403, detail="El chat solo está disponible entre productores e influencers")

    # CH-10: Atomic upsert to prevent race condition (find_one + insert_one gap)
    conv_filter = {
        "$or": [
            {"user1_id": user.user_id, "user2_id": input.other_user_id},
            {"user1_id": input.other_user_id, "user2_id": user.user_id}
        ]
    }
    existing = await db.internal_chats.find_one(conv_filter, {"_id": 0})

    if existing:
        return existing

    # Check mutual follow status to determine if this is a request
    a_follows_b = await db.user_follows.find_one({"follower_id": user.user_id, "following_id": input.other_user_id})
    b_follows_a = await db.user_follows.find_one({"follower_id": input.other_user_id, "following_id": user.user_id})
    is_request = not (a_follows_b or b_follows_a)

    # Create new conversation with unique index safety
    conversation = {
        "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
        "type": "dm",
        "user1_id": user.user_id,
        "user2_id": input.other_user_id,
        "is_request": is_request,
        "request_status": "pending" if is_request else "accepted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message": None,
        "last_message_at": None
    }

    try:
        await db.internal_chats.insert_one(conversation)
    except Exception:
        # If concurrent insert happened, find the existing one
        existing = await db.internal_chats.find_one(conv_filter, {"_id": 0})
        if existing:
            return existing
        raise
    
    # Return with other user info
    return {
        "conversation_id": conversation["conversation_id"],
        "other_user_id": input.other_user_id,
        "other_user_name": other_user.get("name", "Usuario"),
        "other_user_type": other_user.get("role", "customer"),
        "last_message": None,
        "last_message_at": None,
        "unread_count": 0
    }

@router.get("/chat/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    limit: int = 30,
    before: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """Get messages for a conversation with cursor-based pagination"""
    conversation = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [
            {"user1_id": user.user_id},
            {"user2_id": user.user_id}
        ]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query = {"conversation_id": conversation_id}
    if before:
        query["created_at"] = {"$lt": before}

    messages = await db.chat_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()

    return {"messages": messages, "has_more": len(messages) == limit}

@router.post("/chat/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, input: MessageInput, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    """Send a message in a conversation"""
    # Verify user is part of conversation (DM check)
    conversation = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [
            {"user1_id": user.user_id},
            {"user2_id": user.user_id}
        ]
    })

    # Fallback: check group conversation membership
    if not conversation:
        conversation = await db.internal_chats.find_one({
            "conversation_id": conversation_id,
            "type": "group",
            "participants": user.user_id
        })

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "content": input.content,
        "message_type": input.message_type or "text",
        "image_url": input.image_url,
        "audio_url": input.audio_url,
        "audio_duration": input.audio_duration,
        "file_url": input.file_url,
        "file_name": input.file_name,
        "reply_to_id": input.reply_to_id,
        "reply_to_preview": input.reply_to_preview,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }

    await db.chat_messages.insert_one(message)

    # Update conversation with type-based preview text
    msg_type = message.get("message_type", "text")
    if msg_type == "image":
        preview = "Imagen"
    elif msg_type == "audio":
        preview = "Audio"
    elif msg_type == "document":
        preview = "Documento"
    else:
        preview = (message.get("content") or "")[:100]

    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "last_message": preview,
            "last_message_at": message["created_at"]
        }}
    )
    
    # Send email notification to receiver
    receiver_id = conversation["user2_id"] if conversation["user1_id"] == user.user_id else conversation["user1_id"]
    receiver = await db.users.find_one({"user_id": receiver_id}, {"_id": 0, "email": 1, "name": 1})
    sender_name = user.name or "Un usuario"
    
    if receiver and receiver.get("email"):
        def send_chat_notification():
            try:
                html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1C1C1C; font-size: 24px; margin: 0;">Hispaloshop</h1>
                    </div>
                    
                    <div style="background-color: #FAF7F2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                        <h2 style="color: #1C1C1C; margin: 0 0 15px 0;">💬 Nuevo mensaje</h2>
                        <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            <strong>{html_module.escape(sender_name)}</strong> te ha enviado un mensaje:
                        </p>
                        <div style="background-color: white; border-radius: 8px; padding: 15px; border-left: 4px solid #1C1C1C;">
                            <p style="color: #1C1C1C; font-size: 14px; margin: 0; font-style: italic;">
                                "{html_module.escape((input.content or '')[:200])}{'...' if len(input.content or '') > 200 else ''}"
                            </p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{_FRONTEND_URL}/messages/{conversation_id}"
                           style="display: inline-block; background-color: #1C1C1C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 500;">
                            Ver mensaje
                        </a>
                    </div>
                    
                    <p style="color: #7A7A7A; font-size: 12px; text-align: center; margin-top: 30px;">
                        Este email fue enviado desde Hispaloshop. Si no deseas recibir notificaciones, puedes configurarlo en tu perfil.
                    </p>
                </div>
                """
                send_email(receiver["email"], f"💬 Nuevo mensaje de {sender_name}", html)
                logger.info(f"[Chat] Email notification sent to {receiver['email']}")
            except Exception as e:
                logger.error(f"[Chat] Failed to send notification email: {e}")
        
        background_tasks.add_task(send_chat_notification)
    
    return {"message_id": message["message_id"], "success": True}

@router.post("/chat/conversations/{conversation_id}/read")
async def mark_as_read(conversation_id: str, user: User = Depends(get_current_user)):
    """Mark all messages in conversation as read"""
    # Verify user is part of conversation
    conversation = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [
            {"user1_id": user.user_id},
            {"user2_id": user.user_id}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark messages from other user as read
    await db.chat_messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user.user_id},
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    return {"success": True}

@router.get("/chat/unread-count")
async def get_unread_count(user: User = Depends(get_current_user)):
    """Get total unread message count across all conversations for current user"""
    # Get all conversations for this user
    conversations = await db.internal_chats.find({
        "$or": [
            {"user1_id": user.user_id},
            {"user2_id": user.user_id}
        ]
    }, {"conversation_id": 1}).to_list(200)

    conv_ids = [c["conversation_id"] for c in conversations]
    if not conv_ids:
        return {"total": 0}

    total = await db.chat_messages.count_documents({
        "conversation_id": {"$in": conv_ids},
        "sender_id": {"$ne": user.user_id},
        "read": False
    })

    return {"total": total}


@router.post("/chat/story-reply")
async def reply_to_story(request: Request, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    """Send a DM with story context (story reply)"""
    body = await request.json()
    story_id = body.get("story_id")
    recipient_id = body.get("recipient_id")
    message_text = body.get("message", "").strip()

    if not recipient_id or not message_text:
        raise HTTPException(status_code=400, detail="recipient_id and message required")

    # Find or create conversation
    existing = await db.internal_chats.find_one({
        "$or": [
            {"user1_id": user.user_id, "user2_id": recipient_id},
            {"user1_id": recipient_id, "user2_id": user.user_id}
        ]
    })

    now = datetime.now(timezone.utc).isoformat()

    if existing:
        conversation_id = existing["conversation_id"]
    else:
        # Verify recipient exists
        recipient = await db.users.find_one({"user_id": recipient_id})
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")

        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        await db.internal_chats.insert_one({
            "conversation_id": conversation_id,
            "user1_id": user.user_id,
            "user2_id": recipient_id,
            "created_at": now,
            "last_message": None,
            "last_message_at": None
        })

    # Fetch story thumbnail + caption for inline preview
    story_thumbnail_url = None
    story_caption = None
    story_expires_at = None
    if story_id:
        story_doc = await db.hispalostories.find_one(
            {"story_id": story_id},
            {"_id": 0, "media_url": 1, "caption": 1, "expires_at": 1}
        )
        if story_doc:
            story_thumbnail_url = story_doc.get("media_url")
            raw_caption = story_doc.get("caption", "") or ""
            story_caption = raw_caption[:40] + ("..." if len(raw_caption) > 40 else "")
            story_expires_at = story_doc.get("expires_at")

    # Insert message with story context
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    msg_doc = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "content": message_text,
        "story_id": story_id,
        "story_thumbnail_url": story_thumbnail_url,
        "story_caption": story_caption,
        "story_expires_at": story_expires_at,
        "message_type": "story_reply",
        "created_at": now,
        "read": False
    }
    await db.chat_messages.insert_one(msg_doc)

    # Increment replies_count on the story document
    if story_id:
        await db.hispalostories.update_one(
            {"story_id": story_id},
            {"$inc": {"replies_count": 1}},
        )

    # Update conversation last message
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "last_message": message_text[:100],
            "last_message_at": now
        }}
    )

    receiver = await db.users.find_one({"user_id": recipient_id}, {"_id": 0, "email": 1, "name": 1})
    sender_name = getattr(user, "name", None) or "Un usuario"

    # In-app + push notification (skip if blocked)
    is_blocked = await db.blocked_users.find_one({
        "$or": [
            {"blocker_id": recipient_id, "blocked_id": user.user_id},
            {"blocker_id": user.user_id, "blocked_id": recipient_id},
        ]
    })
    if not is_blocked:
        try:
            import asyncio
            from services.notifications.dispatcher_service import notification_dispatcher
            asyncio.create_task(notification_dispatcher.send_notification(
                user_id=recipient_id,
                title="Nueva respuesta a tu historia",
                body=f"{sender_name} ha respondido a tu historia",
                notification_type="story_reply",
                channels=["in_app", "push"],
                data={"story_id": story_id, "from_user_id": user.user_id, "conversation_id": conversation_id},
                action_url=f"/messages/{conversation_id}",
            ))
        except Exception:
            pass

    # Email notification to recipient (also skip if blocked)
    if not is_blocked and receiver and receiver.get("email"):
        def send_story_reply_notification():
            try:
                html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1C1C1C; text-align: center;">Hispaloshop</h1>
                    <div style="background-color: #FAF7F2; border-radius: 12px; padding: 30px;">
                        <h2 style="color: #1C1C1C; margin: 0 0 15px 0;">💬 Respuesta a tu historia</h2>
                        <p style="color: #4A4A4A; font-size: 16px;"><strong>{html_module.escape(sender_name)}</strong> ha respondido a tu historia:</p>
                        <div style="background-color: white; border-radius: 8px; padding: 15px; border-left: 4px solid #1C1C1C;">
                            <p style="color: #1C1C1C; font-size: 14px; margin: 0; font-style: italic;">
                                "{html_module.escape(message_text[:200])}{'...' if len(message_text) > 200 else ''}"
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="{_FRONTEND_URL}/messages/{conversation_id}"
                               style="display: inline-block; background-color: #1C1C1C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 500;">
                                Ver mensaje
                            </a>
                        </div>
                    </div>
                </div>
                """
                send_email(receiver["email"], f"💬 {sender_name} respondió a tu historia", html)
            except Exception as e:
                logger.error(f"[Chat] Failed to send story-reply email: {e}")
        background_tasks.add_task(send_story_reply_notification)

    return {"conversation_id": conversation_id, "message_id": message_id}


@router.post("/chat/conversations/{conversation_id}/accept")
async def accept_conversation_request(conversation_id: str, user: User = Depends(get_current_user)):
    """Accept a message request — moves conversation from Solicitudes to main inbox"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv.get("is_request"):
        return {"status": "already_accepted"}
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"is_request": False, "request_status": "accepted"}}
    )
    return {"status": "accepted"}


@router.post("/chat/conversations/{conversation_id}/reject")
async def reject_conversation_request(conversation_id: str, user: User = Depends(get_current_user)):
    """Reject a message request"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete the conversation and its messages
    await db.chat_messages.delete_many({"conversation_id": conversation_id})
    await db.internal_chats.delete_one({"conversation_id": conversation_id})

    # Track rejection count for auto-block suggestion
    other_id = conv.get("user2_id") if conv.get("user1_id") == user.user_id else conv.get("user1_id")
    rejection_key = f"chat_rejections:{user.user_id}:{other_id}"
    count = await db.counters.find_one({"_id": rejection_key})
    new_count = (count.get("value", 0) if count else 0) + 1
    await db.counters.update_one({"_id": rejection_key}, {"$set": {"value": new_count}}, upsert=True)

    return {"status": "rejected", "suggest_block": new_count >= 3}


@router.post("/chat/conversations/{conversation_id}/block")
async def block_conversation_user(conversation_id: str, user: User = Depends(get_current_user)):
    """Block a user from a conversation (deletes conversation + adds to block list)"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    other_id = conv.get("user2_id") if conv.get("user1_id") == user.user_id else conv.get("user1_id")

    # Add to block list
    await db.user_blocks.update_one(
        {"blocker_id": user.user_id, "blocked_id": other_id},
        {"$set": {"blocker_id": user.user_id, "blocked_id": other_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    # Delete conversation
    await db.chat_messages.delete_many({"conversation_id": conversation_id})
    await db.internal_chats.delete_one({"conversation_id": conversation_id})

    return {"status": "blocked"}


# ──────────── Group Chat ────────────

@router.post("/chat/groups")
async def create_group(request: Request, user: User = Depends(get_current_user)):
    """Create a private group conversation"""
    body = await request.json()
    name = (body.get("name") or "").strip()
    participant_ids = body.get("participant_ids", [])

    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")

    # Ensure creator is always included
    if user.user_id not in participant_ids:
        participant_ids.insert(0, user.user_id)

    if len(participant_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 members allowed in a private group")

    if len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="A group needs at least 2 members")

    # Verify all participant user_ids exist
    existing_users = await db.users.find(
        {"user_id": {"$in": participant_ids}},
        {"_id": 0, "user_id": 1}
    ).to_list(len(participant_ids))
    existing_ids = {u["user_id"] for u in existing_users}
    invalid = [uid for uid in participant_ids if uid not in existing_ids]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Users not found: {', '.join(invalid)}")

    now = datetime.now(timezone.utc).isoformat()
    conversation = {
        "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
        "type": "group",
        "group_name": name,
        "group_avatar": None,
        "group_description": "",
        "group_subtype": "private",
        "community_id": None,
        "admin_id": user.user_id,
        "participants": participant_ids,
        "max_members": 20,
        "muted_by": [],
        "created_at": now,
        "last_message": None,
        "last_message_at": None,
    }

    await db.internal_chats.insert_one(conversation)
    conversation.pop("_id", None)
    return conversation


@router.post("/chat/groups/community")
async def create_or_join_community_group(request: Request, user: User = Depends(get_current_user)):
    """Create a community group or join an existing one"""
    body = await request.json()
    community_id = body.get("community_id")

    if not community_id:
        raise HTTPException(status_code=400, detail="community_id is required")

    # Verify community exists
    community = await db.communities.find_one({"community_id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Check if a group already exists for this community
    existing = await db.internal_chats.find_one({
        "type": "group",
        "group_subtype": "community",
        "community_id": community_id,
    })

    if existing:
        # Join existing group if not already a member
        if user.user_id in existing.get("participants", []):
            existing.pop("_id", None)
            return existing
        if len(existing.get("participants", [])) >= existing.get("max_members", 500):
            raise HTTPException(status_code=400, detail="Community group is full")
        await db.internal_chats.update_one(
            {"conversation_id": existing["conversation_id"]},
            {"$addToSet": {"participants": user.user_id}}
        )
        existing["participants"].append(user.user_id)
        existing.pop("_id", None)
        return existing

    # Create new community group
    owner_id = community.get("owner_id") or community.get("created_by") or user.user_id
    participants = [owner_id]
    if user.user_id != owner_id:
        participants.append(user.user_id)

    now = datetime.now(timezone.utc).isoformat()
    conversation = {
        "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
        "type": "group",
        "group_name": community.get("name", "Community Group"),
        "group_avatar": community.get("avatar_url"),
        "group_description": community.get("description", ""),
        "group_subtype": "community",
        "community_id": community_id,
        "admin_id": owner_id,
        "participants": participants,
        "max_members": 500,
        "muted_by": [],
        "created_at": now,
        "last_message": None,
        "last_message_at": None,
    }

    await db.internal_chats.insert_one(conversation)
    conversation.pop("_id", None)
    return conversation


@router.get("/chat/groups/{conversation_id}/members")
async def get_group_members(conversation_id: str, user: User = Depends(get_current_user)):
    """List members of a group conversation"""
    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
        "participants": user.user_id,
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not a member")

    participant_ids = group.get("participants", [])
    users_docs = await db.users.find(
        {"user_id": {"$in": participant_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "avatar_url": 1, "profile_image": 1},
    ).to_list(len(participant_ids))

    members = []
    for u in users_docs:
        members.append({
            "user_id": u["user_id"],
            "name": u.get("name", "Usuario"),
            "avatar_url": u.get("avatar_url") or u.get("profile_image"),
            "is_admin": u["user_id"] == group.get("admin_id"),
        })

    return {"members": members, "admin_id": group.get("admin_id")}


@router.post("/chat/groups/{conversation_id}/members")
async def add_group_member(conversation_id: str, request: Request, user: User = Depends(get_current_user)):
    """Add a member to a group (admin only)"""
    body = await request.json()
    new_user_id = body.get("user_id")
    if not new_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("admin_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Only the group admin can add members")
    if new_user_id in group.get("participants", []):
        raise HTTPException(status_code=400, detail="User is already a member")
    if len(group.get("participants", [])) >= group.get("max_members", 20):
        raise HTTPException(status_code=400, detail="Group is full")

    # Verify user exists
    target_user = await db.users.find_one({"user_id": new_user_id}, {"_id": 0, "user_id": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$addToSet": {"participants": new_user_id}}
    )
    return {"success": True, "user_id": new_user_id}


@router.delete("/chat/groups/{conversation_id}/members/{target_user_id}")
async def remove_group_member(
    conversation_id: str,
    target_user_id: str,
    new_admin_id: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """Remove a member (admin only) or leave the group (self)"""
    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.user_id not in group.get("participants", []):
        raise HTTPException(status_code=403, detail="Not a member of this group")

    is_self = target_user_id == user.user_id
    is_admin = group.get("admin_id") == user.user_id

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Only the admin can remove other members")

    if target_user_id not in group.get("participants", []):
        raise HTTPException(status_code=400, detail="User is not a member")

    participants = [p for p in group["participants"] if p != target_user_id]

    # If last member, delete the group entirely
    if not participants:
        await db.chat_messages.delete_many({"conversation_id": conversation_id})
        await db.internal_chats.delete_one({"conversation_id": conversation_id})
        return {"success": True, "group_deleted": True}

    update: dict = {"$pull": {"participants": target_user_id}}

    # Admin leaving: transfer admin role
    if target_user_id == group.get("admin_id"):
        if not new_admin_id:
            raise HTTPException(status_code=400, detail="new_admin_id is required when admin leaves")
        if new_admin_id not in participants:
            raise HTTPException(status_code=400, detail="new_admin_id must be an existing member")
        update.setdefault("$set", {})["admin_id"] = new_admin_id

    # Also remove from muted_by if present
    update.setdefault("$pull", {})
    update["$pull"]["muted_by"] = target_user_id

    # MongoDB doesn't allow $pull on two fields in one op if using dict form;
    # run two updates to be safe
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$pull": {"participants": target_user_id}}
    )
    secondary_update: dict = {}
    if target_user_id == group.get("admin_id") and new_admin_id:
        secondary_update["$set"] = {"admin_id": new_admin_id}
    # Pull from muted_by separately
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$pull": {"muted_by": target_user_id}}
    )
    if secondary_update:
        await db.internal_chats.update_one(
            {"conversation_id": conversation_id},
            secondary_update
        )

    return {"success": True, "group_deleted": False}


@router.patch("/chat/groups/{conversation_id}")
async def update_group(conversation_id: str, request: Request, user: User = Depends(get_current_user)):
    """Update group settings (admin only)"""
    body = await request.json()

    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("admin_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Only the group admin can update settings")

    updates = {}
    if "name" in body:
        name = (body["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Group name cannot be empty")
        updates["group_name"] = name
    if "description" in body:
        updates["group_description"] = (body["description"] or "")[:500]
    if "avatar" in body:
        updates["group_avatar"] = body["avatar"]  # Cloudinary URL or null

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": updates}
    )
    return {"success": True, **updates}


@router.post("/chat/groups/{conversation_id}/mute")
async def toggle_group_mute(conversation_id: str, user: User = Depends(get_current_user)):
    """Toggle mute for a group conversation"""
    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
        "participants": user.user_id,
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not a member")

    muted_by = group.get("muted_by", [])
    if user.user_id in muted_by:
        await db.internal_chats.update_one(
            {"conversation_id": conversation_id},
            {"$pull": {"muted_by": user.user_id}}
        )
        return {"muted": False}
    else:
        await db.internal_chats.update_one(
            {"conversation_id": conversation_id},
            {"$addToSet": {"muted_by": user.user_id}}
        )
        return {"muted": True}


@router.post("/chat/groups/{conversation_id}/report")
async def report_group(conversation_id: str, request: Request, user: User = Depends(get_current_user)):
    """Report a group conversation"""
    body = await request.json()
    reason = (body.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required")

    group = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "type": "group",
    })
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    report = {
        "report_id": f"rep_{uuid.uuid4().hex[:12]}",
        "type": "group_chat",
        "target_id": conversation_id,
        "group_name": group.get("group_name"),
        "reporter_id": user.user_id,
        "reason": reason[:500],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reports.insert_one(report)
    return {"success": True, "report_id": report["report_id"]}


@router.get("/chat/search-users")
async def search_users_for_chat(query: str, user_type: str, user: User = Depends(get_current_user)):
    """Search for users to start a conversation with"""
    results = []
    
    if user_type == "producer":
        # Producer searching for influencers
        influencers = await db.influencers.find({
            "status": "active",
            "full_name": {"$regex": re.escape(query), "$options": "i"}
        }, {"_id": 0, "user_id": 1, "full_name": 1}).to_list(20)
        
        for inf in influencers:
            results.append({
                "user_id": inf["user_id"],
                "name": inf["full_name"],
                "role": "influencer"
            })
    else:
        # Influencer searching for sellers (producer/importer)
        producers = await db.users.find({
            "role": {"$in": ["producer", "importer"]},
            "approved": True,
            "name": {"$regex": re.escape(query), "$options": "i"}
        }, {"_id": 0, "user_id": 1, "name": 1, "role": 1}).to_list(20)
        
        for prod in producers:
            results.append({
                "user_id": prod["user_id"],
                "name": prod["name"],
                "role": "producer"
            })
    
    return results


# ──────────── Reactions ────────────

@router.post("/chat/messages/{message_id}/react")
async def react_to_message(message_id: str, request: Request, user: User = Depends(get_current_user)):
    """Toggle an emoji reaction on a message"""
    body = await request.json()
    emoji = body.get("emoji", "")
    if not emoji or len(emoji) > 8:
        raise HTTPException(status_code=400, detail="Valid emoji is required")

    message = await db.chat_messages.find_one({"message_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    conv = await db.internal_chats.find_one({
        "conversation_id": message["conversation_id"],
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant")

    reactions = message.get("reactions", [])
    existing = next((r for r in reactions if r["user_id"] == user.user_id and r["emoji"] == emoji), None)

    if existing:
        reactions = [r for r in reactions if not (r["user_id"] == user.user_id and r["emoji"] == emoji)]
    else:
        reactions = [r for r in reactions if r["user_id"] != user.user_id]
        reactions.append({"user_id": user.user_id, "emoji": emoji, "name": user.name})

    await db.chat_messages.update_one(
        {"message_id": message_id},
        {"$set": {"reactions": reactions}}
    )

    return {"message_id": message_id, "reactions": reactions}


# ──────────── Delete single message ────────────

@router.delete("/chat/messages/{message_id}")
async def delete_message(message_id: str, user: User = Depends(get_current_user)):
    """Delete a single message (only by sender, within 5 minutes)"""
    message = await db.chat_messages.find_one({"message_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.get("sender_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    created_at = message.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if created_at and (datetime.now(timezone.utc) - created_at).total_seconds() > 300:
        raise HTTPException(status_code=403, detail="Can only delete messages within 5 minutes")

    await db.chat_messages.delete_one({"message_id": message_id})
    return {"success": True, "message_id": message_id}


# ──────────── File uploads ────────────

@router.post("/chat/conversations/{conversation_id}/upload-image")
async def upload_conv_image(
    conversation_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image in a conversation"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 5 MB")

    from services.cloudinary_storage import upload_image as cloudinary_upload
    result = await cloudinary_upload(contents, folder="chat", filename=f"chat_{uuid.uuid4().hex[:8]}")
    return {"image_url": result["url"]}


@router.post("/chat/conversations/{conversation_id}/upload-audio")
async def upload_conv_audio(
    conversation_id: str,
    file: UploadFile = File(...),
    duration: float = Form(0),
    user: User = Depends(get_current_user),
):
    """Upload a voice note in a conversation"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant")

    allowed = ("audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/mp3")
    if not file.content_type or file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only audio files are allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 10 MB")

    if duration > 120:
        raise HTTPException(status_code=400, detail="Audio cannot exceed 2 minutes")

    from services.cloudinary_storage import upload_image as cloudinary_upload
    result = await cloudinary_upload(contents, folder="chat-audio", filename=f"voice_{uuid.uuid4().hex[:8]}")

    # Expiry: aggressive purge for >1 min (7 days), normal 30 days
    expiry_days = 7 if duration > 60 else 30
    expires_at = (datetime.now(timezone.utc) + timedelta(days=expiry_days)).isoformat()

    return {"audio_url": result["url"], "duration": duration, "audio_expires_at": expires_at}


@router.post("/chat/conversations/{conversation_id}/upload-document")
async def upload_document(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a document (PDF, JPG, PNG, WebP) in a conversation"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": current_user.user_id}, {"user2_id": current_user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=403, detail="Not a participant")

    allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa PDF, JPG, PNG o WebP")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo no puede superar 10 MB")

    import asyncio
    import cloudinary.uploader
    from functools import partial
    resource_type = "raw" if file.content_type == "application/pdf" else "image"
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        partial(
            cloudinary.uploader.upload,
            content,
            resource_type=resource_type,
            folder=f"hispaloshop/chat/docs/{conversation_id}",
        ),
    )
    return {
        "file_url": result["secure_url"],
        "file_name": file.filename,
        "file_type": file.content_type,
        "file_size": len(content),
    }


# ──────────── Delete conversation ────────────

@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: User = Depends(get_current_user)):
    """Delete a conversation and all its messages"""
    conv = await db.internal_chats.find_one({
        "conversation_id": conversation_id,
        "$or": [{"user1_id": user.user_id}, {"user2_id": user.user_id}]
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.chat_messages.delete_many({"conversation_id": conversation_id})
    await db.internal_chats.delete_one({"conversation_id": conversation_id})

    return {"success": True}
