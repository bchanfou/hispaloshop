"""
Initialize MongoDB indexes for chat collections
Run this after deploying the chat feature
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import db


async def init_chat_indexes():
    """Create indexes for chat collections"""
    print("[Init] Creating chat indexes...")
    
    # Index for internal_chats (general chat between users)
    await db.internal_chats.create_index("conversation_id", unique=True)
    await db.internal_chats.create_index("user1_id")
    await db.internal_chats.create_index("user2_id")
    await db.internal_chats.create_index([("user1_id", 1), ("user2_id", 1)])
    await db.internal_chats.create_index("last_message_at")
    print("[Init] internal_chats indexes created")
    
    # Index for chat_conversations (B2B chat)
    await db.chat_conversations.create_index("conversation_id", unique=True)
    await db.chat_conversations.create_index("importer_id")
    await db.chat_conversations.create_index("producer_id")
    await db.chat_conversations.create_index([("importer_id", 1), ("producer_id", 1)])
    await db.chat_conversations.create_index("last_message_at")
    print("[Init] chat_conversations indexes created")
    
    # Index for chat_messages
    await db.chat_messages.create_index("message_id", unique=True)
    await db.chat_messages.create_index("conversation_id")
    await db.chat_messages.create_index("sender_id")
    await db.chat_messages.create_index("created_at")
    await db.chat_messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.chat_messages.create_index([("conversation_id", 1), ("sender_id", 1), ("read", 1)])
    print("[Init] chat_messages indexes created")
    
    print("[Init] All chat indexes created successfully!")


if __name__ == "__main__":
    asyncio.run(init_chat_indexes())
