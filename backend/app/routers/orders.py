"""
Order routes: list, get, update status.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from ..core.config import db, FRONTEND_URL, logger
from ..core.security import get_current_user
from ..core.email import send_email
from ..models.user import User

router = APIRouter(prefix="/orders", tags=["Orders"])


class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None


async def require_role(user: User, roles: List[str]):
    if user.role not in roles:
        raise HTTPException(status_code=403, detail=f"Access denied. Required: {roles}")


@router.get("")
async def get_orders(user: User = Depends(get_current_user)):
    """Get orders based on user role."""
    if user.role == "producer":
        orders = await db.orders.find(
            {"line_items.producer_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
    elif user.role in ["admin", "super_admin"]:
        orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    else:
        orders = await db.orders.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
    
    return orders


@router.get("/{order_id}")
async def get_order(order_id: str, user: User = Depends(get_current_user)):
    """Get a specific order."""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization
    if user.role == "customer" and order.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return order


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    update: OrderStatusUpdate,
    user: User = Depends(get_current_user)
):
    """Update order status with tracking info."""
    await require_role(user, ["admin", "super_admin", "producer"])
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Producer can only update orders with their products
    if user.role == "producer":
        producer_products = await db.products.find(
            {"producer_id": user.user_id},
            {"product_id": 1}
        ).to_list(1000)
        producer_product_ids = {p["product_id"] for p in producer_products}
        order_product_ids = {item.get("product_id") for item in order.get("line_items", [])}
        
        if not order_product_ids.intersection(producer_product_ids):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build status history entry
    status_entry = {
        "status": update.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.user_id,
        "notes": update.notes
    }
    
    # Update order
    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.tracking_number:
        update_data["tracking_number"] = update.tracking_number
    if update.tracking_url:
        update_data["tracking_url"] = update.tracking_url
    
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": update_data,
            "$push": {"status_history": status_entry}
        }
    )
    
    # Send email notification
    try:
        await _send_order_status_email(order, update.status, update.tracking_number, update.tracking_url)
    except Exception as e:
        logger.error(f"[ORDER_STATUS] Failed to send email: {e}")
    
    return {"message": "Order status updated", "status": update.status}


async def _send_order_status_email(
    order: dict,
    new_status: str,
    tracking_number: str = None,
    tracking_url: str = None
):
    """Send email notification when order status changes."""
    status_messages = {
        "confirmed": {
            "title": "Pedido Confirmado / Order Confirmed",
            "message": "Tu pedido ha sido confirmado y está siendo procesado."
        },
        "preparing": {
            "title": "Pedido en Preparación / Order Being Prepared",
            "message": "Tu pedido está siendo preparado para el envío."
        },
        "shipped": {
            "title": "Pedido Enviado / Order Shipped",
            "message": "Tu pedido ha sido enviado."
        },
        "delivered": {
            "title": "Pedido Entregado / Order Delivered",
            "message": "Tu pedido ha sido entregado. ¡Gracias por comprar en Hispaloshop!"
        },
        "cancelled": {
            "title": "Pedido Cancelado / Order Cancelled",
            "message": "Tu pedido ha sido cancelado."
        }
    }
    
    status_info = status_messages.get(new_status, {
        "title": "Actualización de Pedido",
        "message": f"El estado de tu pedido ha cambiado a: {new_status}"
    })
    
    tracking_html = ""
    if tracking_number:
        tracking_html = f"""
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Número de seguimiento:</p>
            <p style="margin: 5px 0; font-size: 18px; font-family: monospace;">{tracking_number}</p>
            {"<a href='" + tracking_url + "'>Seguir envío</a>" if tracking_url else ""}
        </div>
        """
    
    items_html = "".join([
        f"<li>{item.get('product_name', 'Product')} x {item.get('quantity', 1)}</li>"
        for item in order.get("line_items", [])[:5]
    ])
    
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1C1C1C; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hispaloshop</h1>
        </div>
        <div style="padding: 30px;">
            <h2>{status_info['title']}</h2>
            <p>{status_info['message']}</p>
            <div style="background: #FAF7F2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Pedido:</strong> #{order.get('order_id', '')[:8]}</p>
                <p><strong>Total:</strong> €{order.get('total_amount', 0):.2f}</p>
            </div>
            {tracking_html}
            <p><strong>Productos:</strong></p>
            <ul>{items_html}</ul>
            <div style="text-align: center; margin-top: 30px;">
                <a href="{FRONTEND_URL}/dashboard/orders" 
                   style="padding: 12px 30px; background: #1C1C1C; color: white; text-decoration: none; border-radius: 25px;">
                    Ver Pedido
                </a>
            </div>
        </div>
    </div>
    """
    
    customer_email = order.get("user_email")
    if customer_email:
        send_email(
            to=customer_email,
            subject=f"Hispaloshop - {status_info['title']}",
            html=email_html
        )
