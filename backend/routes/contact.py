"""
Contact form routes for public inquiries.
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.models import ContactMessageInput
from middleware.rate_limit import rate_limiter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/contact")
async def submit_contact_form(input: ContactMessageInput, request: Request):
    """
    Submit a contact form message.
    Rate limited to prevent spam.
    """
    # Apply rate limiting (3 messages per hour per IP)
    await rate_limiter.check(request, endpoint_type="contact")
    
    # Additional rate limit by email (2 messages per hour per email)
    email_key = f"contact_email:{input.email.lower()}"
    from core.redis_client import redis_manager
    if not await redis_manager.check_rate_limit(email_key, max_requests=2, window=3600):
        raise HTTPException(
            status_code=429,
            detail="Has enviado demasiados mensajes. Por favor, espera una hora antes de enviar otro."
        )
    
    try:
        # Create contact message
        message_data = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "name": input.name.strip(),
            "email": input.email.lower().strip(),
            "role": input.role,
            "message": input.message.strip(),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", ""),
        }
        
        # Store in database
        await db.contact_messages.insert_one(message_data)
        
        logger.info(f"[CONTACT] New message from {input.email} - Role: {input.role}")
        
        # TODO: Send notification email to admin
        # This can be implemented later with the existing email service
        
        return {
            "success": True,
            "message": "Mensaje enviado correctamente. Te responderemos pronto.",
            "message_id": message_data["message_id"]
        }
        
    except Exception as e:
        logger.error(f"[CONTACT] Error saving message: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al guardar el mensaje. Por favor, inténtalo de nuevo."
        )


@router.get("/admin/contact-messages")
async def get_contact_messages(
    status: str = None,
    limit: int = 50,
    skip: int = 0
):
    """
    Get contact messages for admin dashboard.
    Requires admin authentication (to be implemented in middleware).
    """
    query = {}
    if status:
        query["status"] = status
    
    try:
        messages = await db.contact_messages.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
        
        # Remove MongoDB _id and convert to dict
        for msg in messages:
            msg.pop("_id", None)
        
        total = await db.contact_messages.count_documents(query)
        
        return {
            "messages": messages,
            "total": total,
            "limit": limit,
            "skip": skip
        }
        
    except Exception as e:
        logger.error(f"[CONTACT] Error fetching messages: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los mensajes."
        )


@router.post("/admin/contact-messages/{message_id}/reply")
async def reply_to_contact_message(message_id: str, reply_data: dict):
    """
    Reply to a contact message and update its status.
    Requires admin authentication.
    """
    reply_message = reply_data.get("reply", "").strip()
    admin_id = reply_data.get("admin_id", "admin")  # Should come from auth context
    
    if not reply_message:
        raise HTTPException(status_code=400, detail="La respuesta no puede estar vacía")
    
    try:
        result = await db.contact_messages.update_one(
            {"message_id": message_id},
            {
                "$set": {
                    "status": "replied",
                    "reply_message": reply_message,
                    "replied_by": admin_id,
                    "replied_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Mensaje no encontrado")
        
        # TODO: Send reply email to user
        
        return {
            "success": True,
            "message": "Respuesta guardada correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONTACT] Error replying to message: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al guardar la respuesta."
        )


@router.patch("/admin/contact-messages/{message_id}/status")
async def update_message_status(message_id: str, status_update: dict):
    """
    Update message status (pending, read, replied, archived).
    Requires admin authentication.
    """
    new_status = status_update.get("status", "").strip().lower()
    valid_statuses = ["pending", "read", "replied", "archived"]
    
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Usa uno de: {', '.join(valid_statuses)}"
        )
    
    try:
        result = await db.contact_messages.update_one(
            {"message_id": message_id},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Mensaje no encontrado")
        
        return {
            "success": True,
            "message": f"Estado actualizado a '{new_status}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONTACT] Error updating message status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al actualizar el estado."
        )
