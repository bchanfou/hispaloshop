"""
Direct messaging: conversations, messages, user search for chat.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import html as html_module
import re
import uuid
import logging

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
            {"user2_id": user.user_id}
        ]
    }, {"_id": 0}).sort("last_message_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        # Determine the other user
        other_user_id = conv["user2_id"] if conv["user1_id"] == user.user_id else conv["user1_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "name": 1, "role": 1, "avatar_url": 1, "profile_image": 1, "last_seen": 1})
        
        # Count unread messages
        unread_count = await db.chat_messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user.user_id},
            "read": False
        })
        
        uname = other_user.get("name", "Usuario") if other_user else "Usuario"
        role = other_user.get("role", "customer") if other_user else "customer"
        conv_type = "b2c" if role in ("producer", "importer") else "c2c"
        avatar = (other_user.get("avatar_url") or other_user.get("profile_image")) if other_user else None
        last_seen_val = other_user.get("last_seen") if other_user else None
        is_online = False
        if last_seen_val:
            try:
                seen_dt = datetime.fromisoformat(str(last_seen_val).replace("Z", "+00:00"))
                is_online = (datetime.now(timezone.utc) - seen_dt) < timedelta(minutes=2)
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
            "unread_count": unread_count,
            "other_user_name": uname,
            "other_user_type": role,
        })
    
    return result

@router.post("/chat/conversations")
async def create_conversation(input: NewConversationInput, user: User = Depends(get_current_user)):
    """Start a new conversation"""
    # Check if other user exists
    other_user = await db.users.find_one({"user_id": input.other_user_id}, {"_id": 0})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate roles - only producers and influencers can chat
    valid_roles = ["producer"]
    # Check if other user is an influencer
    influencer = await db.influencers.find_one({"user_id": input.other_user_id})
    if influencer:
        valid_roles.append("influencer")
    
    # Check if conversation already exists
    existing = await db.internal_chats.find_one({
        "$or": [
            {"user1_id": user.user_id, "user2_id": input.other_user_id},
            {"user1_id": input.other_user_id, "user2_id": user.user_id}
        ]
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Create new conversation
    conversation = {
        "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
        "user1_id": user.user_id,
        "user2_id": input.other_user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message": None,
        "last_message_at": None
    }
    
    await db.internal_chats.insert_one(conversation)
    
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
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "content": input.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    await db.chat_messages.insert_one(message)
    
    # Update conversation
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "last_message": input.content[:100],
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
                                "{html_module.escape(input.content[:200])}{'...' if len(input.content) > 200 else ''}"
                            </p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://www.hispaloshop.com" 
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
async def reply_to_story(request: Request, user: User = Depends(get_current_user)):
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

    # Insert message with story context
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    msg_doc = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "content": message_text,
        "story_id": story_id,
        "type": "story_reply",
        "created_at": now,
        "read": False
    }
    await db.chat_messages.insert_one(msg_doc)

    # Update conversation last message
    await db.internal_chats.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "last_message": message_text[:100],
            "last_message_at": now
        }}
    )

    return {"conversation_id": conversation_id, "message_id": message_id}


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

    from services.cloudinary_storage import upload_image as cloudinary_upload
    result = await cloudinary_upload(contents, folder="chat-audio", filename=f"voice_{uuid.uuid4().hex[:8]}")
    return {"audio_url": result["url"], "duration": duration}


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
