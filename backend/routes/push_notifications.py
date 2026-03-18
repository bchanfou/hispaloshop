"""
Web Push notification routes: subscribe, unsubscribe, and send push notifications.
"""
import os
import json
import logging
from pywebpush import webpush, WebPushException
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user
from core.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_EMAIL = os.environ.get("VAPID_EMAIL", "mailto:admin@hispaloshop.com")


@router.get("/push/vapid-key")
async def get_vapid_key():
    """Return the public VAPID key for the frontend."""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe_push(request: Request, user: User = Depends(get_current_user)):
    """Save a push subscription for the current user."""
    body = await request.json()
    subscription = body.get("subscription")
    if not subscription or not subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Invalid subscription")

    await db.push_subscriptions.update_one(
        {"user_id": user.user_id, "endpoint": subscription["endpoint"]},
        {"$set": {
            "user_id": user.user_id,
            "subscription": subscription,
        }},
        upsert=True
    )
    return {"status": "subscribed"}


@router.post("/push/unsubscribe")
async def unsubscribe_push(request: Request, user: User = Depends(get_current_user)):
    """Remove a push subscription."""
    body = await request.json()
    endpoint = body.get("endpoint")
    if endpoint:
        await db.push_subscriptions.delete_one({"user_id": user.user_id, "endpoint": endpoint})
    else:
        await db.push_subscriptions.delete_many({"user_id": user.user_id})
    return {"status": "unsubscribed"}


async def send_push_to_user(recipient_id: str, title: str, body: str, data: dict = None):
    """Send a web push notification to all subscriptions of a user."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("[PUSH] VAPID keys not configured, skipping push")
        return

    subs = await db.push_subscriptions.find(
        {"user_id": recipient_id}, {"_id": 0}
    ).to_list(10)

    payload = json.dumps({
        "title": title,
        "body": body,
        "data": data or {},
        "icon": "/logo192.png",
        "badge": "/logo192.png",
    })

    vapid_claims = {"sub": VAPID_EMAIL}
    stale_endpoints = []

    for sub_doc in subs:
        subscription_info = sub_doc.get("subscription")
        if not subscription_info:
            continue
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=vapid_claims,
            )
        except WebPushException as e:
            resp = getattr(e, "response", None)
            if resp and getattr(resp, "status_code", None) in (404, 410):
                stale_endpoints.append(subscription_info.get("endpoint"))
            else:
                logger.error("[PUSH] Error sending to %s: %s", recipient_id, e)
        except Exception as e:
            logger.error("[PUSH] Unexpected error sending to %s: %s", recipient_id, e)

    if stale_endpoints:
        for ep in stale_endpoints:
            await db.push_subscriptions.delete_one({"user_id": recipient_id, "endpoint": ep})
