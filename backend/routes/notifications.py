"""
Notifications Endpoints
Fase 5: Centro de notificaciones y preferencias
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, List

from services.notifications.dispatcher_service import notification_dispatcher
from routes.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener notificaciones del usuario
    """
    return await notification_dispatcher.get_notifications(
        user_id=str(current_user["_id"]),
        unread_only=unread_only,
        page=page,
        limit=limit
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener conteo de notificaciones no leídas
    """
    result = await notification_dispatcher.get_notifications(
        user_id=str(current_user["_id"]),
        unread_only=True,
        page=1,
        limit=1
    )
    return {"unread_count": result["unread"]}


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Marcar notificación como leída
    """
    await notification_dispatcher.mark_as_read(
        notification_id=notification_id,
        user_id=str(current_user["_id"])
    )
    return {"status": "marked_as_read"}


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_user)
):
    """
    Marcar todas las notificaciones como leídas
    """
    from core.database import db
    from datetime import datetime
    from bson import ObjectId
    
    await db.notifications.update_many(
        {
            "user_id": str(current_user["_id"]),
            "read_at": None
        },
        {"$set": {"read_at": datetime.utcnow()}}
    )
    
    return {"status": "all_marked_as_read"}


@router.post("/push-token")
async def register_push_token(
    token: str,
    platform: str,  # ios, android, web
    device_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Registrar token de notificaciones push
    """
    await notification_dispatcher.register_push_token(
        user_id=str(current_user["_id"]),
        token=token,
        platform=platform,
        device_id=device_id
    )
    return {"status": "token_registered"}


@router.delete("/push-token")
async def unregister_push_token(
    token: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Desregistrar token de notificaciones push
    """
    await notification_dispatcher.unregister_push_token(
        user_id=str(current_user["_id"]),
        token=token
    )
    return {"status": "token_unregistered"}


@router.get("/preferences")
async def get_notification_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener preferencias de notificación
    """
    from core.database import db
    
    prefs = await db.user_notification_preferences.find_one({
        "user_id": str(current_user["_id"])
    })
    
    if not prefs:
        return {
            "master_push_enabled": True,
            "master_email_enabled": True,
            "master_sms_enabled": False,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "08:00",
            "quiet_hours_timezone": "Europe/Madrid",
            "push_tokens": []
        }
    
    prefs["_id"] = str(prefs["_id"])
    return prefs


@router.put("/preferences")
async def update_notification_preferences(
    preferences: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar preferencias de notificación
    """
    from core.database import db
    from datetime import datetime
    
    preferences["user_id"] = str(current_user["_id"])
    preferences["updated_at"] = datetime.utcnow()
    
    await db.user_notification_preferences.update_one(
        {"user_id": str(current_user["_id"])},
        {"$set": preferences},
        upsert=True
    )
    
    return {"status": "preferences_updated"}


# Admin endpoint para enviar notificaciones
@router.post("/admin/send")
async def admin_send_notification(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "system",
    channels: List[str] = ["in_app"],
    priority: str = "normal",
    current_user: dict = Depends(get_current_user)
):
    """
    Enviar notificación (solo admin/superadmin)
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")
    
    notification_id = await notification_dispatcher.send_notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        channels=channels,
        priority=priority
    )
    
    return {"notification_id": notification_id, "status": "sent"}

# Function to create notification (used by other modules)
async def create_notification(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "system",
    channels: List[str] = None,
    priority: str = "normal",
    data: dict = None
):
    """
    Create a notification for a user.
    Used internally by other route modules.
    """
    if channels is None:
        channels = ["in_app"]
    
    await notification_dispatcher.send_notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        channels=channels,
        priority=priority,
        data=data or {}
    )
