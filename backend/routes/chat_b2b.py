"""
Chat B2B async entre importadores y productores.
Fase 4: B2B Importer
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException

from core.database import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/b2b/chat", tags=["Chat B2B"])


@router.get("/conversations")
async def get_conversations(
    current_user = Depends(get_current_user)
):
    """Lista de conversaciones del usuario"""
    db = get_db()
    
    # Buscar conversaciones donde el usuario es importer o producer
    query = {
        "$or": [
            {"importer_id": current_user.user_id},
            {"producer_id": current_user.user_id}
        ],
        "status": "active"
    }
    
    conversations = await db.chat_conversations.find(query)\
        .sort("last_message_at", -1)\
        .to_list(length=50)
    
    # Enriquecer con datos del otro participante
    enriched = []
    for conv in conversations:
        conv["id"] = str(conv.pop("_id", ""))
        
        # Determinar el otro participante
        is_importer = conv["importer_id"] == current_user.user_id
        other_id = conv["producer_id"] if is_importer else conv["importer_id"]
        
        other = await db.users.find_one({"user_id": other_id})
        if other:
            conv["other_participant"] = {
                "id": other_id,
                "name": other.get("full_name"),
                "company": other.get("company_name"),
                "avatar": other.get("picture"),
                "role": other.get("role")
            }
        
        # Contar no leídos
        unread_field = "unread_count_importer" if is_importer else "unread_count_producer"
        conv["unread_count"] = conv.get(unread_field, 0)
        
        enriched.append(conv)
    
    return {"success": True, "data": enriched}


@router.post("/conversations")
async def create_conversation(
    producer_id: str,
    product_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Crear nueva conversación B2B"""
    db = get_db()
    
    # Validar que es importador
    if current_user.role != "importer":
        raise HTTPException(status_code=403, detail="Only importers can initiate conversations")
    
    # Verificar que el productor existe
    producer = await db.users.find_one({
        "user_id": producer_id,
        "role": {"$in": ["producer", "importer"]},
        "status": "active"
    })
    
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")
    
    # Verificar si ya existe conversación
    existing = await db.chat_conversations.find_one({
        "importer_id": current_user.user_id,
        "producer_id": producer_id
    })
    
    if existing:
        existing["id"] = str(existing.pop("_id", ""))
        return {"success": True, "data": existing, "message": "Conversation already exists"}
    
    # Crear conversación
    conversation = {
        "conversation_id": str(uuid.uuid4()),
        "importer_id": current_user.user_id,
        "producer_id": producer_id,
        "tenant_id": getattr(current_user, 'country', None) or "ES",
        "related_product_id": product_id,
        "related_lead_id": lead_id,
        "status": "active",
        "unread_count_importer": 0,
        "unread_count_producer": 0,
        "initiated_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.chat_conversations.insert_one(conversation)
    conversation["id"] = str(result.inserted_id)
    
    # Mensaje de sistema
    await db.chat_messages.insert_one({
        "conversation_id": conversation["conversation_id"],
        "message_id": str(uuid.uuid4()),
        "sender_id": "system",
        "sender_type": "system",
        "content": f"Conversation started by {current_user.full_name}",
        "is_system_message": True,
        "system_message_type": "conversation_started",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"success": True, "data": conversation}


@router.get("/conversations/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    page: int = 1,
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Obtener mensajes de una conversación"""
    db = get_db()
    
    # Verificar que el usuario pertenece a la conversación
    conversation = await db.chat_conversations.find_one({
        "conversation_id": conversation_id,
        "$or": [
            {"importer_id": current_user.user_id},
            {"producer_id": current_user.user_id}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Obtener mensajes
    messages = await db.chat_messages.find({
        "conversation_id": conversation_id
    }).sort("created_at", -1)\
      .skip((page - 1) * limit)\
      .limit(limit)\
      .to_list(length=limit)
    
    # Marcar como leídos
    is_importer = conversation["importer_id"] == current_user.user_id
    unread_field = "unread_count_importer" if is_importer else "unread_count_producer"
    
    if conversation.get(unread_field, 0) > 0:
        await db.chat_conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {unread_field: 0}}
        )
    
    # Marcar mensajes individuales como leídos
    for msg in messages:
        if msg["sender_id"] != current_user.user_id and current_user.user_id not in msg.get("read_by", []):
            await db.chat_messages.update_one(
                {"_id": msg["_id"]},
                {
                    "$push": {"read_by": current_user.user_id},
                    "$set": {"read_at": datetime.now(timezone.utc)}
                }
            )
    
    # Formatear
    for msg in messages:
        msg["id"] = str(msg.pop("_id", ""))
    
    messages.reverse()  # Orden cronológico
    
    return {
        "success": True,
        "data": {
            "messages": messages,
            "conversation": {
                "id": str(conversation.get("_id", "")),
                "conversation_id": conversation_id,
                "importer_id": conversation["importer_id"],
                "producer_id": conversation["producer_id"],
                "related_product_id": conversation.get("related_product_id"),
                "status": conversation["status"]
            }
        }
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    content: str,
    attachments: Optional[List[dict]] = None,
    current_user = Depends(get_current_user)
):
    """Enviar mensaje en conversación"""
    db = get_db()
    
    if len(content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Verificar conversación
    conversation = await db.chat_conversations.find_one({
        "conversation_id": conversation_id,
        "$or": [
            {"importer_id": current_user.user_id},
            {"producer_id": current_user.user_id}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation["status"] != "active":
        raise HTTPException(status_code=400, detail="Conversation is archived")
    
    # Crear mensaje
    is_importer = conversation["importer_id"] == current_user.user_id
    
    message = {
        "conversation_id": conversation_id,
        "message_id": str(uuid.uuid4()),
        "sender_id": current_user.user_id,
        "sender_type": "importer" if is_importer else "producer",
        "content": content[:2000],  # Limitar longitud
        "attachments": attachments or [],
        "read_by": [current_user.user_id],
        "is_system_message": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.chat_messages.insert_one(message)
    
    # Actualizar conversación
    unread_field = "unread_count_producer" if is_importer else "unread_count_importer"
    
    await db.chat_conversations.update_one(
        {"conversation_id": conversation_id},
        {
            "$set": {
                "last_message_at": datetime.now(timezone.utc),
                "last_message_preview": content[:100],
                "updated_at": datetime.now(timezone.utc)
            },
            "$inc": {unread_field: 1}
        }
    )
    
    # FUTURE: Enviar notificación (email/push) al destinatario
    
    message["id"] = str(message.pop("_id", ""))
    
    return {"success": True, "data": message}


@router.patch("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    current_user = Depends(get_current_user)
):
    """Marcar mensaje como leído"""
    db = get_db()
    from bson.objectid import ObjectId
    
    message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verificar que el usuario pertenece a la conversación
    conversation = await db.chat_conversations.find_one({
        "conversation_id": message["conversation_id"]
    })
    
    if not conversation or (conversation["importer_id"] != current_user.user_id and 
                           conversation["producer_id"] != current_user.user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if current_user.user_id not in message.get("read_by", []):
        await db.chat_messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$push": {"read_by": current_user.user_id},
                "$set": {"read_at": datetime.now(timezone.utc)}
            }
        )
    
    return {"success": True}


@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Archivar conversación"""
    db = get_db()
    
    result = await db.chat_conversations.update_one(
        {
            "conversation_id": conversation_id,
            "$or": [
                {"importer_id": current_user.user_id},
                {"producer_id": current_user.user_id}
            ]
        },
        {
            "$set": {
                "status": "archived",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"success": True, "message": "Conversation archived"}


@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user)
):
    """Obtener conteo total de mensajes no leídos"""
    db = get_db()
    
    # Contar conversaciones con mensajes no leídos
    importer_count = await db.chat_conversations.count_documents({
        "importer_id": current_user.user_id,
        "unread_count_importer": {"$gt": 0}
    })
    
    producer_count = await db.chat_conversations.count_documents({
        "producer_id": current_user.user_id,
        "unread_count_producer": {"$gt": 0}
    })
    
    return {
        "success": True,
        "data": {
            "total_unread_conversations": importer_count + producer_count,
            "as_importer": importer_count,
            "as_producer": producer_count
        }
    }
