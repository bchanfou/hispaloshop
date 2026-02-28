"""
Direct messaging: conversations, messages, user search for chat.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional
from datetime import datetime, timezone
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
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "name": 1, "role": 1})
        
        # Count unread messages
        unread_count = await db.chat_messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user.user_id},
            "read": False
        })
        
        result.append({
            "conversation_id": conv["conversation_id"],
            "other_user_id": other_user_id,
            "other_user_name": other_user.get("name", "Usuario") if other_user else "Usuario",
            "other_user_type": other_user.get("role", "customer") if other_user else "customer",
            "last_message": conv.get("last_message"),
            "last_message_at": conv.get("last_message_at"),
            "unread_count": unread_count
        })
    
    return result

@router.post("/chat/conversations")
async def create_conversation(input: NewConversationInput, user: User = Depends(get_current_user)):
    """Start a new conversation"""
    # Check if other user exists and is a valid type (producer or influencer)
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
async def get_messages(conversation_id: str, user: User = Depends(get_current_user)):
    """Get messages for a conversation"""
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
    
    messages = await db.chat_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    return messages

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
                            <strong>{sender_name}</strong> te ha enviado un mensaje:
                        </p>
                        <div style="background-color: white; border-radius: 8px; padding: 15px; border-left: 4px solid #1C1C1C;">
                            <p style="color: #1C1C1C; font-size: 14px; margin: 0; font-style: italic;">
                                "{input.content[:200]}{'...' if len(input.content) > 200 else ''}"
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

@router.get("/chat/search-users")
async def search_users_for_chat(query: str, user_type: str, user: User = Depends(get_current_user)):
    """Search for users to start a conversation with"""
    results = []
    
    if user_type == "producer":
        # Producer searching for influencers
        influencers = await db.influencers.find({
            "status": "active",
            "full_name": {"$regex": query, "$options": "i"}
        }, {"_id": 0, "user_id": 1, "full_name": 1}).to_list(20)
        
        for inf in influencers:
            results.append({
                "user_id": inf["user_id"],
                "name": inf["full_name"],
                "role": "influencer"
            })
    else:
        # Influencer searching for producers
        producers = await db.users.find({
            "role": "producer",
            "approved": True,
            "name": {"$regex": query, "$options": "i"}
        }, {"_id": 0, "user_id": 1, "name": 1, "role": 1}).to_list(20)
        
        for prod in producers:
            results.append({
                "user_id": prod["user_id"],
                "name": prod["name"],
                "role": "producer"
            })
    
    return results

