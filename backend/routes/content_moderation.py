"""
Admin content moderation routes: queue, confirm, restore, escalate, stats.
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User
from routes.notifications import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()


def _oid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return s


# ── GET /admin/moderation/queue ───────────────────────────────────

@router.get("/admin/moderation/queue")
async def get_moderation_queue(
    action: str = None,
    content_type: str = None,
    user: User = Depends(get_current_user),
):
    """List content in the moderation queue."""
    await require_role(user, ["admin", "super_admin"])

    query = {"admin_reviewed": False}
    if action:
        query["action"] = action
    if content_type:
        query["content_type"] = content_type

    items = await db.content_moderation_queue.find(
        query, {"_id": 1, "content_type": 1, "content_id": 1, "creator_id": 1,
                "action": 1, "violation_type": 1, "ai_reason": 1,
                "ai_confidence": 1, "created_at": 1},
    ).sort([("action", 1), ("created_at", 1)]).to_list(200)

    result = []
    for item in items:
        # Fetch creator info
        creator = await db.users.find_one(
            {"user_id": item.get("creator_id")},
            {"_id": 0, "name": 1, "username": 1, "picture": 1},
        )

        # Fetch content preview
        preview = await _get_content_preview(item["content_type"], item["content_id"])

        result.append({
            "id": str(item["_id"]),
            "content_type": item["content_type"],
            "content_id": item["content_id"],
            "creator_id": item.get("creator_id"),
            "creator_name": (creator or {}).get("name", "Unknown"),
            "creator_avatar": (creator or {}).get("picture"),
            "action": item["action"],
            "violation_type": item.get("violation_type"),
            "ai_reason": item.get("ai_reason"),
            "ai_confidence": item.get("ai_confidence"),
            "created_at": item.get("created_at"),
            "preview": preview,
        })

    return {"queue": result, "total": len(result)}


async def _get_content_preview(content_type: str, content_id: str) -> dict:
    """Get a preview of the content for display in the queue."""
    if content_type in ("post", "reel", "story"):
        post = await db.posts.find_one(
            {"_id": _oid(content_id)} if len(content_id) == 24 else {"post_id": content_id},
            {"_id": 0, "content": 1, "media": 1},
        )
        if post:
            img = None
            for m in (post.get("media") or []):
                if m.get("url"):
                    img = m["url"]
                    break
            return {"text": (post.get("content") or "")[:200], "image": img}

    elif content_type == "product":
        product = await db.products.find_one(
            {"product_id": content_id},
            {"_id": 0, "name": 1, "description": 1, "images": 1},
        )
        if product:
            img = None
            imgs = product.get("images") or []
            if imgs:
                img = imgs[0] if isinstance(imgs[0], str) else imgs[0].get("url")
            return {
                "text": f"{product.get('name', '')} — {(product.get('description') or '')[:150]}",
                "image": img,
            }

    elif content_type == "community_post":
        post = await db.community_posts.find_one(
            {"_id": _oid(content_id)},
            {"_id": 0, "text": 1, "image_url": 1},
        )
        if post:
            return {"text": (post.get("text") or "")[:200], "image": post.get("image_url")}

    return {"text": "", "image": None}


# ── POST /admin/moderation/:id/confirm ────────────────────────────

@router.post("/admin/moderation/{item_id}/confirm")
async def confirm_moderation(
    item_id: str,
    user: User = Depends(get_current_user),
):
    """Confirm the AI's moderation decision."""
    await require_role(user, ["admin", "super_admin"])

    item = await db.content_moderation_queue.find_one({"_id": _oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    now = datetime.now(timezone.utc)
    await db.content_moderation_queue.update_one(
        {"_id": _oid(item_id)},
        {"$set": {
            "admin_reviewed": True,
            "admin_action": "confirm",
            "admin_id": user.user_id,
            "reviewed_at": now.isoformat(),
        }},
    )

    # Notify creator
    _notify_creator(item, confirmed=True)

    return {"status": "confirmed", "id": item_id}


# ── POST /admin/moderation/:id/restore ────────────────────────────

@router.post("/admin/moderation/{item_id}/restore")
async def restore_moderation(
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Revert the AI's decision — restore content."""
    await require_role(user, ["admin", "super_admin"])

    body = {}
    try:
        body = await request.json()
    except Exception as e:
        logger.warning("Failed to parse moderation data: %s", e)
    note = body.get("note", "")

    item = await db.content_moderation_queue.find_one({"_id": _oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    now = datetime.now(timezone.utc)

    # Restore the content
    ct = item["content_type"]
    cid = item["content_id"]

    if ct in ("post", "reel", "story"):
        await db.posts.update_one(
            {"_id": _oid(cid)} if len(cid) == 24 else {"post_id": cid},
            {"$set": {"is_hidden": False, "status": "published"}},
        )
    elif ct == "product":
        await db.products.update_one(
            {"product_id": cid},
            {"$set": {"status": "active"}},
        )
    elif ct == "community_post":
        await db.community_posts.update_one(
            {"_id": _oid(cid)},
            {"$set": {"status": "active"}},
        )

    await db.content_moderation_queue.update_one(
        {"_id": _oid(item_id)},
        {"$set": {
            "admin_reviewed": True,
            "admin_action": "restore",
            "admin_id": user.user_id,
            "admin_note": note,
            "reviewed_at": now.isoformat(),
        }},
    )

    # Notify creator of restoration
    try:
        await create_notification(
            user_id=item.get("creator_id"),
            title="Contenido restaurado",
            body="Tu contenido ha sido revisado y restaurado por un administrador.",
            notification_type="moderation_restored",
            action_url="/profile",
        )
    except Exception as e:
        logger.warning("Failed to create moderation notification: %s", e)

    return {"status": "restored", "id": item_id}


# ── POST /admin/moderation/:id/escalate ───────────────────────────

@router.post("/admin/moderation/{item_id}/escalate")
async def escalate_moderation(
    item_id: str,
    user: User = Depends(get_current_user),
):
    """Escalate to superadmin for review."""
    await require_role(user, ["admin", "super_admin"])

    item = await db.content_moderation_queue.find_one({"_id": _oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    await db.content_moderation_queue.update_one(
        {"_id": _oid(item_id)},
        {"$set": {
            "escalated": True,
            "escalated_by": user.user_id,
            "escalated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {"status": "escalated", "id": item_id}


# ── GET /admin/moderation/stats ───────────────────────────────────

@router.get("/admin/moderation/stats")
async def get_moderation_stats(user: User = Depends(get_current_user)):
    """Get moderation statistics."""
    await require_role(user, ["admin", "super_admin"])

    total_hidden = await db.content_moderation_queue.count_documents(
        {"action": "hide", "admin_reviewed": False}
    )
    total_review = await db.content_moderation_queue.count_documents(
        {"action": "review", "admin_reviewed": False}
    )
    total_blocked = await db.content_moderation_queue.count_documents(
        {"action": "blocked", "admin_reviewed": False}
    )

    total_confirmed = await db.content_moderation_queue.count_documents(
        {"admin_action": "confirm"}
    )
    total_restored = await db.content_moderation_queue.count_documents(
        {"admin_action": "restore"}
    )

    # Top violation types
    pipeline = [
        {"$match": {"violation_type": {"$ne": None}}},
        {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_violations = await db.content_moderation_queue.aggregate(pipeline).to_list(5)

    return {
        "total_hidden": total_hidden,
        "total_review": total_review,
        "total_blocked_products": total_blocked,
        "total_confirmed": total_confirmed,
        "total_restored": total_restored,
        "false_positive_rate": round(
            total_restored / max(total_confirmed + total_restored, 1) * 100, 1
        ),
        "top_violation_types": [
            {"type": v["_id"], "count": v["count"]} for v in top_violations
        ],
    }


def _notify_creator(item: dict, confirmed: bool):
    """Send notification to content creator (fire-and-forget)."""
    import asyncio

    violation = item.get("violation_type", "")
    ct = item.get("content_type", "")

    reason_map = {
        "nudity": "Contenido no apropiado para la plataforma",
        "violence": "Contenido violento detectado",
        "spam": "Detectado como contenido promocional no autorizado",
        "health_misinformation": "Afirmaciones médicas no permitidas",
        "minor_safety": "Contenido que puede comprometer la seguridad de menores",
        "off_topic": "El contenido no está relacionado con la alimentación",
        "alcohol": "Las bebidas alcohólicas no pueden venderse en Hispaloshop",
        "non_food_product": "Solo pueden venderse productos alimentarios y accesorios de cocina",
        "medical_claims": "El producto contiene afirmaciones médicas no permitidas",
    }

    msg = reason_map.get(violation, item.get("ai_reason", "Contenido revisado por moderación"))

    async def _send():
        try:
            await create_notification(
                user_id=item.get("creator_id"),
                title="Contenido ocultado" if ct != "product" else "Producto bloqueado",
                body=msg,
                notification_type="moderation_hidden",
                action_url="/profile",
            )
        except Exception as e:
            logger.warning("Failed to notify creator: %s", e)

    try:
        from services.background import create_safe_task
        create_safe_task(_send(), name="moderation_notify")
    except RuntimeError:
        pass
