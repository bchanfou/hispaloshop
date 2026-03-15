"""
Shipping calculator per seller plan — multicesta con progreso de envío.
Fase 26: Multicesta con progreso de envío.

Plans:
  FREE  → 5.90 €, no free shipping threshold
  PRO   → 3.90 €, free from 30 €
  ELITE → 2.90 €, free from 20 €
"""
from __future__ import annotations

from typing import Any

from core.database import get_db


# ── Plan shipping config ─────────────────────────────────────
SHIPPING_PLANS: dict[str, dict[str, Any]] = {
    "FREE": {
        "base_cents": 590,
        "free_threshold_cents": None,
        "label": "Free",
    },
    "PRO": {
        "base_cents": 390,
        "free_threshold_cents": 3000,
        "label": "Pro",
    },
    "ELITE": {
        "base_cents": 290,
        "free_threshold_cents": 2000,
        "label": "Elite",
    },
}


def _get_plan_config(plan: str) -> dict[str, Any]:
    return SHIPPING_PLANS.get(str(plan or "FREE").upper(), SHIPPING_PLANS["FREE"])


def calculate_store_shipping(
    plan: str,
    store_subtotal_cents: int,
) -> dict[str, Any]:
    """Calculate shipping for a single store given its plan and subtotal."""
    cfg = _get_plan_config(plan)
    threshold = cfg["free_threshold_cents"]
    base = cfg["base_cents"]

    is_free = threshold is not None and store_subtotal_cents >= threshold
    shipping_cents = 0 if is_free else base

    # Progress toward free shipping
    progress_pct = 0
    remaining_cents = 0
    if threshold is not None:
        if is_free:
            progress_pct = 100
        else:
            progress_pct = min(99, int((store_subtotal_cents / threshold) * 100))
            remaining_cents = threshold - store_subtotal_cents

    return {
        "shipping_cents": shipping_cents,
        "is_free": is_free,
        "threshold_cents": threshold,
        "progress_pct": progress_pct,
        "remaining_cents": remaining_cents,
        "plan": str(plan or "FREE").upper(),
        "plan_label": cfg["label"],
    }


async def calculate_cart_shipping(items: list[dict]) -> dict[str, Any]:
    """
    Group cart items by seller, look up each seller's subscription plan,
    and return per-store shipping breakdown + totals.
    """
    db = get_db()

    # Group items by seller_id
    stores: dict[str, list[dict]] = {}
    for item in items:
        sid = item.get("seller_id") or "unknown"
        stores.setdefault(sid, []).append(item)

    # Fetch seller docs in one query
    seller_ids = [s for s in stores if s != "unknown"]
    seller_docs: dict[str, dict] = {}
    if seller_ids:
        cursor = db.users.find(
            {"user_id": {"$in": seller_ids}},
            {"_id": 0, "user_id": 1, "subscription": 1, "business_name": 1, "name": 1, "avatar": 1},
        )
        async for doc in cursor:
            seller_docs[doc["user_id"]] = doc

    # Per-store breakdown
    breakdown: list[dict] = []
    total_shipping_cents = 0
    total_savings_cents = 0

    for sid, sitems in stores.items():
        doc = seller_docs.get(sid, {})
        plan = (doc.get("subscription") or {}).get("plan", "FREE")
        store_subtotal = sum(i.get("total_price_cents", 0) for i in sitems)
        store_item_count = sum(i.get("quantity", 0) for i in sitems)

        result = calculate_store_shipping(plan, store_subtotal)

        # Savings tip: how much they save vs full price
        cfg = _get_plan_config(plan)
        if result["is_free"]:
            total_savings_cents += cfg["base_cents"]

        total_shipping_cents += result["shipping_cents"]

        breakdown.append({
            "seller_id": sid,
            "seller_name": doc.get("business_name") or doc.get("name") or sid,
            "seller_avatar": doc.get("avatar"),
            "item_count": store_item_count,
            "subtotal_cents": store_subtotal,
            **result,
        })

    # Sort: stores with progress bars first (threshold exists), then by progress desc
    breakdown.sort(key=lambda s: (
        s["threshold_cents"] is None,
        -(s["progress_pct"]),
    ))

    return {
        "stores": breakdown,
        "total_shipping_cents": total_shipping_cents,
        "total_savings_cents": total_savings_cents,
        "store_count": len(breakdown),
    }
