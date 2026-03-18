"""
Hispalo Predict: AI-powered purchase prediction engine.
Analyzes customer order history to predict when they should repurchase products.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import logging

from core.database import db
from core.models import User
from core.auth import get_current_user
from utils.images import extract_product_image

logger = logging.getLogger(__name__)
router = APIRouter()

# Default reorder intervals by category (days)
CATEGORY_DEFAULTS = {
    "oils": 45,
    "dairy": 14,
    "meat": 10,
    "snacks": 21,
    "coffee": 30,
    "preserves": 60,
    "cheese": 21,
    "baby": 14,
    "frozen": 30,
    "beverages": 14,
    "default": 30,
}


def calculate_predictions(orders: list, products_map: dict) -> list:
    """Analyze order history and generate purchase predictions."""
    now = datetime.now(timezone.utc)

    # Group purchases by product
    product_purchases = {}
    for order in orders:
        if order.get("status") in ("cancelled", "refunded"):
            continue
        order_date = order.get("created_at", "")
        if not order_date:
            continue
        try:
            if isinstance(order_date, str):
                dt = datetime.fromisoformat(order_date.replace("Z", "+00:00"))
            else:
                dt = order_date
        except Exception:
            continue

        for item in order.get("line_items", []):
            pid = item.get("product_id")
            if not pid:
                continue
            if pid not in product_purchases:
                product_purchases[pid] = {
                    "product_id": pid,
                    "product_name": item.get("product_name", item.get("name", "Producto")),
                    "dates": [],
                    "quantities": [],
                }
            product_purchases[pid]["dates"].append(dt)
            product_purchases[pid]["quantities"].append(item.get("quantity", 1))

    predictions = []
    for pid, data in product_purchases.items():
        dates = sorted(data["dates"])
        purchase_count = len(dates)
        last_purchased = dates[-1]
        product_info = products_map.get(pid, {})
        # Skip products that have been deleted or suspended (no longer purchasable)
        if not product_info or product_info.get("status") in ("deleted", "suspended_by_admin"):
            continue
        image = extract_product_image(product_info)
        category = (product_info.get("category") or "default").lower()
        price = product_info.get("price", 0)

        # Calculate interval
        if purchase_count >= 2:
            intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
            avg_interval = sum(intervals) / len(intervals)
            # Confidence based on consistency
            if len(intervals) >= 3:
                std_dev = (sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)) ** 0.5
                cv = std_dev / avg_interval if avg_interval > 0 else 1
                confidence = "high" if cv < 0.3 else "medium" if cv < 0.6 else "low"
            else:
                confidence = "medium"
        else:
            avg_interval = CATEGORY_DEFAULTS.get(category, CATEGORY_DEFAULTS["default"])
            confidence = "low"

        avg_interval = max(avg_interval, 3)  # minimum 3 days
        predicted_next = last_purchased + timedelta(days=avg_interval)
        days_until = (predicted_next - now).days

        if days_until < -7:
            status = "overdue"
        elif days_until < 0:
            status = "due"
        elif days_until <= 7:
            status = "soon"
        else:
            status = "upcoming"

        predictions.append({
            "product_id": pid,
            "product_name": data["product_name"],
            "image": image,
            "price": price,
            "category": category,
            "purchase_count": purchase_count,
            "last_purchased": last_purchased.isoformat(),
            "avg_interval_days": round(avg_interval),
            "predicted_next": predicted_next.isoformat(),
            "days_until_next": days_until,
            "confidence": confidence,
            "status": status,
        })

    # Sort: overdue first, then due, soon, upcoming
    status_order = {"overdue": 0, "due": 1, "soon": 2, "upcoming": 3}
    predictions.sort(key=lambda x: (status_order.get(x["status"], 4), x["days_until_next"]))
    return predictions


@router.get("/customer/predictions")
async def get_purchase_predictions(user: User = Depends(get_current_user)):
    """Get AI-powered purchase predictions for the customer."""
    orders = await db.orders.find(
        {"user_id": user.user_id},
        {"_id": 0, "line_items": 1, "created_at": 1, "status": 1}
    ).sort("created_at", -1).to_list(200)

    if not orders:
        return {"predictions": [], "summary": {"total": 0, "overdue": 0, "due": 0, "soon": 0}}

    # Get all product IDs from orders
    product_ids = set()
    for order in orders:
        for item in order.get("line_items", []):
            if item.get("product_id"):
                product_ids.add(item["product_id"])

    # Fetch product details
    products = await db.products.find(
        {"product_id": {"$in": list(product_ids)}},
        {"_id": 0, "product_id": 1, "images": 1, "category": 1, "price": 1, "name": 1}
    ).to_list(200)
    products_map = {p["product_id"]: p for p in products}

    predictions = calculate_predictions(orders, products_map)

    summary = {
        "total": len(predictions),
        "overdue": sum(1 for p in predictions if p["status"] == "overdue"),
        "due": sum(1 for p in predictions if p["status"] == "due"),
        "soon": sum(1 for p in predictions if p["status"] == "soon"),
    }

    return {"predictions": predictions, "summary": summary}
