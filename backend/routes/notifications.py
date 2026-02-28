"""
User notifications: list, mark read, mark all read, create helper.
Extracted from server.py.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import uuid

from core.database import db
from core.models import User
from core.auth import get_current_user

router = APIRouter()


async def create_notification(user_id: str, notif_type: str, title: str, message: str, link: str = ""):
    """Create a notification for a user."""
    await db.user_notifications.insert_one({
        "notification_id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/user/notifications")
async def get_user_notifications(user: User = Depends(get_current_user), limit: int = 20):
    """Get user notifications"""
    notifications = await db.user_notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    unread_count = await db.user_notifications.count_documents({
        "user_id": user.user_id,
        "read": False
    })

    return {"notifications": notifications, "unread_count": unread_count}


@router.put("/user/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.user_notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}


@router.put("/user/notifications/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.user_notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}
