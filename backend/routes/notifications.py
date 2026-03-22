"""
Notifications Endpoints
Fase 5 + 27: Centro de notificaciones unificado
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from services.notifications.dispatcher_service import notification_dispatcher
from routes.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """
    Obtener notificaciones del usuario
    """
    return await notification_dispatcher.get_notifications(
        user_id=current_user.user_id,
        unread_only=unread_only,
        page=page,
        limit=limit
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user)
):
    """
    Lightweight unread count — single count_documents query.
    Called every 30s from the frontend badge.
    """
    from core.database import db

    count = await db.notifications.count_documents({
        "user_id": current_user.user_id,
        "read_at": None,
    })
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """
    Marcar notificación como leída
    """
    await notification_dispatcher.mark_as_read(
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    return {"status": "marked_as_read"}


@router.post("/mark-all-read")
async def mark_all_read(
    current_user = Depends(get_current_user)
):
    """
    Marcar todas las notificaciones como leídas
    """
    from core.database import db
    from datetime import datetime, timezone
    from bson import ObjectId

    await db.notifications.update_many(
        {
            "user_id": current_user.user_id,
            "read_at": None
        },
        {"$set": {"read_at": datetime.now(timezone.utc)}}
    )
    
    return {"status": "all_marked_as_read"}


@router.delete("/all")
async def delete_all_notifications(
    current_user = Depends(get_current_user)
):
    """Delete all notifications for the current user."""
    from core.database import db

    result = await db.notifications.delete_many({"user_id": current_user.user_id})
    return {"deleted": result.deleted_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a single notification (own only)."""
    from core.database import db
    from bson import ObjectId

    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    result = await db.notifications.delete_one({
        "_id": ObjectId(notification_id),
        "user_id": current_user.user_id,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.post("/push-token")
async def register_push_token(
    token: str,
    platform: str,  # ios, android, web
    device_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Registrar token de notificaciones push
    """
    await notification_dispatcher.register_push_token(
        user_id=current_user.user_id,
        token=token,
        platform=platform,
        device_id=device_id
    )
    return {"status": "token_registered"}


@router.delete("/push-token")
async def unregister_push_token(
    token: str,
    current_user = Depends(get_current_user)
):
    """
    Desregistrar token de notificaciones push
    """
    await notification_dispatcher.unregister_push_token(
        user_id=current_user.user_id,
        token=token
    )
    return {"status": "token_unregistered"}


@router.get("/preferences")
async def get_notification_preferences(
    current_user = Depends(get_current_user)
):
    """
    Obtener preferencias de notificación
    """
    from core.database import db
    
    prefs = await db.user_notification_preferences.find_one({
        "user_id": current_user.user_id
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
    current_user = Depends(get_current_user)
):
    """
    Actualizar preferencias de notificación
    """
    from core.database import db
    from datetime import datetime, timezone

    preferences["user_id"] = current_user.user_id
    preferences["updated_at"] = datetime.now(timezone.utc)
    
    await db.user_notification_preferences.update_one(
        {"user_id": current_user.user_id},
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
    current_user = Depends(get_current_user)
):
    """
    Enviar notificación (solo admin/superadmin)
    """
    if getattr(current_user, "role", None) not in ["admin", "super_admin"]:
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

# ── Internal helpers (used by other modules) ───────────────────

async def create_notification(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "system",
    channels: List[str] = None,
    priority: str = "normal",
    data: dict = None,
    action_url: str = None,
):
    """Create a notification for a user."""
    if channels is None:
        channels = ["in_app"]

    await notification_dispatcher.send_notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        channels=channels,
        priority=priority,
        data=data or {},
        action_url=action_url,
    )


async def notify_order_event(order_id: str, event_type: str, **kwargs):
    """
    Create order-related notifications for consumer and/or producer.

    Supported event_type:
      order_confirmed, order_preparing, order_shipped,
      order_delivered, order_review_request, new_order
    """
    from core.database import db

    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        return

    consumer_id = order.get("user_id")
    producer_id = order.get("producer_id")
    short_id = str(order_id)[-8:].upper()
    store_name = kwargs.get("store_name") or order.get("store_name", "")

    EVENT_MAP = {
        "order_confirmed": {
            "consumer": (
                "Pedido confirmado",
                f"Pedido #{short_id} confirmado. Los productores ya están preparando tu pedido.",
            ),
            "producer": (
                "Nuevo pedido recibido",
                f"Nuevo pedido #{short_id} recibido. Prepáralo cuando puedas.",
            ),
        },
        "order_preparing": {
            "consumer": (
                "Tu pedido se está preparando",
                f"Tu pedido de {store_name} se está preparando.",
            ),
        },
        "order_shipped": {
            "consumer": (
                "Tu pedido está en camino",
                f"Tu pedido #{short_id} está en camino.",
            ),
        },
        "order_delivered": {
            "consumer": (
                "Pedido entregado",
                f"Tu pedido #{short_id} ha llegado. ¿Cómo fue tu experiencia?",
            ),
        },
        "order_review_request": {
            "consumer": (
                "¿Ya probaste tu pedido?",
                f"Deja tu reseña sobre el pedido #{short_id}.",
            ),
        },
    }

    event = EVENT_MAP.get(event_type, {})
    base_data = {"order_id": order_id}

    if "consumer" in event and consumer_id:
        title, body = event["consumer"]
        await create_notification(
            user_id=consumer_id,
            title=title,
            body=body,
            notification_type=event_type,
            data=base_data,
            action_url=f"/orders/{order_id}",
        )

    if "producer" in event and producer_id:
        title, body = event["producer"]
        await create_notification(
            user_id=producer_id,
            title=title,
            body=body,
            notification_type="new_order" if event_type == "order_confirmed" else event_type,
            data=base_data,
            action_url=f"/producer/orders/{order_id}",
        )


async def notify_social_event(
    recipient_id: str,
    actor_id: str,
    event_type: str,
    post_id: str = None,
    **kwargs,
):
    """Create social notifications (new_follower, post_liked, post_commented, mentioned)."""
    from core.database import db

    actor = await db.users.find_one({"user_id": actor_id}, {"_id": 0, "name": 1})
    actor_name = (actor or {}).get("name", "Alguien")

    EVENT_MAP = {
        "new_follower": ("Nuevo seguidor", f"{actor_name} ha empezado a seguirte", f"/profile/{actor_id}"),
        "post_liked": ("Le gustó tu publicación", f"A {actor_name} le gustó tu publicación", f"/post/{post_id}"),
        "post_commented": ("Nuevo comentario", f"{actor_name} comentó tu publicación", f"/post/{post_id}"),
        "mentioned": ("Te mencionaron", f"{actor_name} te mencionó", f"/post/{post_id}"),
    }

    info = EVENT_MAP.get(event_type)
    if not info:
        return
    title, body, url = info

    await create_notification(
        user_id=recipient_id,
        title=title,
        body=body,
        notification_type=event_type,
        data={"actor_id": actor_id, "post_id": post_id},
        action_url=url,
    )


async def notify_b2b_event(operation_id: str, event_type: str, recipient_id: str, **kwargs):
    """Create B2B operation notifications."""
    EVENT_MAP = {
        "b2b_offer_received": ("Nueva oferta B2B recibida", kwargs.get("body", "Revisa los detalles de la oferta.")),
        "b2b_offer_accepted": ("Oferta B2B aceptada", "La oferta fue aceptada."),
        "b2b_contract_ready": ("Contrato listo para firmar", "Revisa y firma el contrato."),
        "b2b_contract_signed": ("Contrato firmado", "El contrato ha sido firmado por ambas partes."),
        "b2b_payment_received": ("Pago B2B recibido", kwargs.get("body", "Pago recibido.")),
    }

    info = EVENT_MAP.get(event_type)
    if not info:
        return
    title, body = info

    await create_notification(
        user_id=recipient_id,
        title=title,
        body=body,
        notification_type=event_type,
        data={"operation_id": operation_id},
        action_url=f"/b2b/tracking/{operation_id}",
    )
