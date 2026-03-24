"""
Loyalty program — redeem Healthy Points for discount codes.
Codes are created in the existing discount_codes collection
so they work with the cart apply-coupon flow.
"""
import secrets
import string
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from core.database import db
from core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/loyalty", tags=["loyalty"])

# ── Catalog (seeded on first request if empty) ────────────────────────────

INITIAL_CATALOG = [
    {
        "id": "disc_5pct",
        "name": "5% de descuento",
        "description": "En tu próxima compra. Válido 7 días.",
        "cost_points": 100,
        "type": "percentage",
        "value": 5,
        "expires_days": 7,
        "is_active": True,
        "min_order_cents": 1000,
    },
    {
        "id": "disc_10pct",
        "name": "10% de descuento",
        "description": "En tu próxima compra. Válido 7 días.",
        "cost_points": 180,
        "type": "percentage",
        "value": 10,
        "expires_days": 7,
        "is_active": True,
        "min_order_cents": 2000,
    },
    {
        "id": "free_shipping",
        "name": "Envío gratis",
        "description": "En tu próxima compra. Válido 14 días.",
        "cost_points": 75,
        "type": "free_shipping",
        "value": 0,
        "expires_days": 14,
        "is_active": True,
        "min_order_cents": 0,
    },
    {
        "id": "disc_5eur",
        "name": "5€ de descuento",
        "description": "En pedidos de más de 30€. Válido 7 días.",
        "cost_points": 200,
        "type": "fixed",
        "value": 5,  # euros (matches discount_codes.value for type=fixed)
        "expires_days": 7,
        "is_active": True,
        "min_order_cents": 3000,
    },
]


async def _ensure_catalog():
    """Seed catalog if empty."""
    count = await db.loyalty_catalog.count_documents({})
    if count == 0:
        await db.loyalty_catalog.insert_many(INITIAL_CATALOG)


def _generate_code() -> str:
    """Generate HSP-XXXX unique code."""
    chars = string.ascii_uppercase + string.digits
    return "HSP-" + "".join(secrets.choice(chars) for _ in range(4))


# ── Endpoints ─────────────────────────────────────────────────────────────


@router.get("/catalog")
async def get_loyalty_catalog():
    """Available rewards to redeem."""
    await _ensure_catalog()
    items = await db.loyalty_catalog.find(
        {"is_active": True}, {"_id": 0}
    ).to_list(20)
    return items


class RedeemRequest(BaseModel):
    reward_id: str


@router.post("/redeem")
async def redeem_reward(body: RedeemRequest, user=Depends(get_current_user)):
    """Exchange Healthy Points for a discount code."""
    await _ensure_catalog()

    # 1. Verify reward exists
    reward = await db.loyalty_catalog.find_one(
        {"id": body.reward_id, "is_active": True}, {"_id": 0}
    )
    if not reward:
        raise HTTPException(404, "Recompensa no encontrada")

    # 2. Check points (stored as xp on users collection)
    user_doc = await db.users.find_one(
        {"user_id": user.user_id}, {"xp": 1}
    )
    current_points = (user_doc or {}).get("xp", 0)
    cost = reward["cost_points"]

    if current_points < cost:
        raise HTTPException(
            400,
            f"Puntos insuficientes. Tienes {current_points}, necesitas {cost}",
        )

    # 3. Generate unique code
    code = _generate_code()
    while await db.discount_codes.find_one({"code": code}):
        code = _generate_code()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=reward["expires_days"])

    # 4. Insert into discount_codes (works with existing cart apply-coupon)
    await db.discount_codes.insert_one({
        "code_id": f"loyalty_{code}",
        "code": code,
        "type": reward["type"],
        "value": reward["value"],
        "active": True,
        "start_date": now,
        "end_date": expires_at,
        "usage_limit": 1,
        "usage_count": 0,
        "min_cart_amount": reward.get("min_order_cents", 0),
        "applicable_products": [],
        "created_by": "loyalty_program",
        "loyalty_user_id": user.user_id,
        "loyalty_reward_id": reward["id"],
        "created_at": now,
    })

    # 5. Record redemption
    await db.loyalty_redemptions.insert_one({
        "user_id": user.user_id,
        "reward_id": reward["id"],
        "reward_name": reward["name"],
        "discount_code": code,
        "type": reward["type"],
        "value": reward["value"],
        "min_order_cents": reward.get("min_order_cents", 0),
        "redeemed_at": now,
        "expires_at": expires_at,
        "order_id": None,
        "used_at": None,
        "is_used": False,
    })

    # 6. Deduct points (atomic)
    result = await db.users.update_one(
        {"user_id": user.user_id, "xp": {"$gte": cost}},
        {"$inc": {"xp": -cost}},
    )
    if result.modified_count == 0:
        # Race condition: points spent between check and deduction
        await db.discount_codes.delete_one({"code": code})
        await db.loyalty_redemptions.delete_one({"discount_code": code})
        raise HTTPException(400, "Puntos insuficientes (intenta de nuevo)")

    logger.info(f"[LOYALTY] {user.user_id} redeemed {reward['id']} for code {code} (-{cost} HP)")

    return {
        "discount_code": code,
        "type": reward["type"],
        "value": reward["value"],
        "expires_at": expires_at.isoformat(),
        "message": f"Código {code} generado. Válido hasta {expires_at.strftime('%d/%m/%Y')}",
    }


@router.get("/me")
async def get_my_loyalty(user=Depends(get_current_user)):
    """User's available points and redemption history."""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id}, {"xp": 1}
    )
    points = (user_doc or {}).get("xp", 0)

    redemptions = await db.loyalty_redemptions.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("redeemed_at", -1).to_list(20)

    return {
        "available_points": points,
        "redemptions": redemptions,
    }
