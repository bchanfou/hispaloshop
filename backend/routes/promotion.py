"""
Promotion system — ads as plan benefit (NOT purchased separately).
Slots: FREE 0, PRO 5 national, ELITE 10 national + international (producer only).
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, require_role
from core.models import User
from core.monetization import normalize_seller_plan

logger = logging.getLogger(__name__)
router = APIRouter()

PLAN_SLOTS = {"FREE": 0, "PRO": 5, "ELITE": 10}


def _get_plan_slots(plan: str) -> int:
    return PLAN_SLOTS.get(normalize_seller_plan(plan), 0)


def _get_plan_scope(plan: str, role: str) -> str:
    """ELITE producer = national+international. Everyone else = national only."""
    p = normalize_seller_plan(plan)
    if p == "ELITE" and role == "producer":
        return "national_international"
    return "national"


# ── GET /producer/promoted ──

@router.get("/producer/promoted")
async def get_promoted_products(user: User = Depends(get_current_user)):
    """List promoted products for the authenticated producer/importer."""
    await require_role(user, ["producer", "importer"])
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"subscription": 1, "country": 1, "role": 1})
    plan = normalize_seller_plan((user_doc or {}).get("subscription", {}).get("plan", "FREE"))
    max_slots = _get_plan_slots(plan)
    scope = _get_plan_scope(plan, user.role)

    promoted = await db.promoted_products.find(
        {"producer_id": user.user_id, "status": "active"},
        {"_id": 0},
    ).sort("priority", 1).to_list(max_slots + 5)

    # Auto-select preference
    auto_pref = await db.promotion_preferences.find_one({"user_id": user.user_id})
    is_auto = (auto_pref or {}).get("auto_select", True)

    return {
        "promoted": promoted,
        "slots_used": len([p for p in promoted if p.get("status") == "active"]),
        "slots_total": max_slots,
        "scope": scope,
        "is_auto": is_auto,
        "plan": plan,
        "country": (user_doc or {}).get("country", "ES"),
    }


# ── POST /producer/promoted/{product_id} ──

@router.post("/producer/promoted/{product_id}")
async def add_promoted_product(product_id: str, request: Request, user: User = Depends(get_current_user)):
    """Manually add a product to promotion slots."""
    await require_role(user, ["producer", "importer"])
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"subscription": 1, "country": 1, "role": 1})
    plan = normalize_seller_plan((user_doc or {}).get("subscription", {}).get("plan", "FREE"))
    max_slots = _get_plan_slots(plan)

    if max_slots == 0:
        raise HTTPException(status_code=403, detail="Tu plan FREE no incluye promocion. Actualiza a PRO.")

    # Check slots used
    active_count = await db.promoted_products.count_documents(
        {"producer_id": user.user_id, "status": "active"}
    )
    if active_count >= max_slots:
        raise HTTPException(status_code=400, detail=f"Has alcanzado el limite de {max_slots} productos promocionados.")

    # Verify product ownership
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not product.get("approved"):
        raise HTTPException(status_code=400, detail="El producto debe estar aprobado para promocionarlo.")

    # Check not already promoted
    existing = await db.promoted_products.find_one(
        {"producer_id": user.user_id, "product_id": product_id, "status": "active"}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Este producto ya esta promocionado.")

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    scope = _get_plan_scope(plan, user.role)
    country = (user_doc or {}).get("country", "ES")
    target_countries = [country]
    if scope == "national_international" and body.get("target_countries"):
        target_countries = body["target_countries"]

    promo = {
        "promo_id": f"promo_{uuid.uuid4().hex[:12]}",
        "producer_id": user.user_id,
        "product_id": product_id,
        "product_name": product.get("name", ""),
        "product_image": (product.get("images") or [""])[0],
        "plan": plan,
        "scope": "national" if scope == "national" else ("international" if len(target_countries) > 1 else "national"),
        "target_countries": target_countries,
        "is_auto_selected": False,
        "priority": active_count + 1,
        "status": "active",
        "impressions": 0,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
    }
    await db.promoted_products.insert_one(promo)
    promo.pop("_id", None)
    return promo


# ── DELETE /producer/promoted/{product_id} ──

@router.delete("/producer/promoted/{product_id}")
async def remove_promoted_product(product_id: str, user: User = Depends(get_current_user)):
    """Remove a product from promotion."""
    await require_role(user, ["producer", "importer"])
    result = await db.promoted_products.update_one(
        {"producer_id": user.user_id, "product_id": product_id, "status": "active"},
        {"$set": {"status": "removed", "removed_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Producto promocionado no encontrado")
    return {"ok": True}


# ── PUT /producer/promoted/auto ──

@router.put("/producer/promoted/auto")
async def toggle_auto_selection(request: Request, user: User = Depends(get_current_user)):
    """Toggle auto-selection of promoted products."""
    await require_role(user, ["producer", "importer"])
    body = await request.json()
    auto = bool(body.get("auto", True))
    await db.promotion_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": {"auto_select": auto, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"auto_select": auto}


# ── GET /producer/promoted/stats ──

@router.get("/producer/promoted/stats")
async def get_promotion_stats(user: User = Depends(get_current_user)):
    """Get impression/click stats for promoted products."""
    await require_role(user, ["producer", "importer"])
    promoted = await db.promoted_products.find(
        {"producer_id": user.user_id, "status": "active"},
        {"_id": 0, "product_id": 1, "product_name": 1, "product_image": 1, "impressions": 1, "clicks": 1},
    ).to_list(20)

    total_impressions = sum(p.get("impressions", 0) for p in promoted)
    total_clicks = sum(p.get("clicks", 0) for p in promoted)
    ctr = round(total_clicks / total_impressions * 100, 1) if total_impressions > 0 else 0

    return {
        "products": promoted,
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "ctr": ctr,
    }


# ── GET /feed/promoted — for feed injection (public, no auth required) ──

@router.get("/feed/promoted")
async def get_promoted_for_feed(country: str = "ES", limit: int = 3):
    """Get promoted products for feed injection, filtered by viewer country."""
    promoted = await db.promoted_products.find(
        {"status": "active", "target_countries": country},
        {"_id": 0},
    ).to_list(limit * 3)

    if not promoted:
        return []

    # Rotate: shuffle to avoid same order every time
    import random
    random.shuffle(promoted)

    # Deduplicate by producer (no 2 from same seller)
    seen_producers = set()
    result = []
    for p in promoted:
        if p["producer_id"] in seen_producers:
            continue
        seen_producers.add(p["producer_id"])
        result.append(p)
        if len(result) >= limit:
            break

    # Track impressions (batch update)
    for p in result:
        await db.promoted_products.update_one(
            {"promo_id": p["promo_id"]},
            {"$inc": {"impressions": 1}},
        )

    return result


# ── POST /feed/promoted/{promo_id}/click — track click ──

@router.post("/feed/promoted/{promo_id}/click")
async def track_promoted_click(promo_id: str):
    """Track a click on a promoted product."""
    await db.promoted_products.update_one(
        {"promo_id": promo_id},
        {"$inc": {"clicks": 1}},
    )
    return {"ok": True}
