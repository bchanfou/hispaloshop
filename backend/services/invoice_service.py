"""
Invoice service — generates invoice data (JSON) for orders and commission summaries.
No PDF dependency required.
"""
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class InvoiceService:
    def __init__(self, db):
        self.db = db

    async def generate_order_invoice(self, order_id: str, user_id: str):
        """Generate invoice data for a customer order."""
        order = await self.db.orders.find_one({"order_id": order_id})
        if not order:
            return None
        # Verify user owns this order
        if str(order.get("user_id")) != user_id and str(order.get("customer_id")) != user_id:
            return None

        items = []
        for item in order.get("items", []):
            qty = item.get("quantity", 1)
            price = item.get("price", 0)
            items.append({
                "name": item.get("name", "Producto"),
                "quantity": qty,
                "unit_price": price,
                "total": price * qty,
            })

        return {
            "invoice_number": f"HS-{order_id[-8:].upper()}",
            "date": order.get("created_at", datetime.utcnow()).isoformat(),
            "customer": {
                "name": order.get("customer_name", ""),
                "email": order.get("customer_email", ""),
                "address": order.get("shipping_address", {}),
            },
            "items": items,
            "subtotal": order.get("subtotal", sum(i["total"] for i in items)),
            "shipping": order.get("shipping_cost", 0),
            "tax": order.get("tax", 0),
            "total": order.get("total", 0),
            "status": order.get("status", ""),
            "payment_method": order.get("payment_method", "stripe"),
        }

    async def generate_commission_summary(self, user_id: str, month: int, year: int):
        """Generate monthly commission summary for influencer."""
        start = datetime(year, month, 1)
        end_month = month + 1 if month < 12 else 1
        end_year = year if month < 12 else year + 1
        end = datetime(end_year, end_month, 1)

        commissions = await self.db.influencer_commissions.find({
            "influencer_id": user_id,
            "created_at": {"$gte": start, "$lt": end}
        }).to_list(1000)

        total = sum(c.get("commission_amount", 0) for c in commissions)

        return {
            "invoice_number": f"COM-{user_id[-6:].upper()}-{year}{month:02d}",
            "period": f"{year}-{month:02d}",
            "influencer_id": user_id,
            "commissions": [{
                "order_id": c.get("order_id", ""),
                "amount": c.get("commission_amount", 0),
                "date": c.get("created_at", datetime.utcnow()).isoformat(),
            } for c in commissions],
            "total_commission": total,
            "count": len(commissions),
        }
