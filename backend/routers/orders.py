from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Order, OrderItem, Product, Transaction, User
from routers.auth import get_current_user
from schemas import FulfillRequest, OrderListResponse, OrderResponse, ProducerOrderItemResponse

router = APIRouter()


@router.get("/orders", response_model=list[OrderListResponse])
async def list_my_orders(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).options(selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.images)).where(Order.user_id == current_user.id)
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit)
    orders = (await db.scalars(query)).all()
    out = []
    for order in orders:
        first_image = None
        if order.items and order.items[0].product and order.items[0].product.images:
            first_image = order.items[0].product.images[0].thumbnail_url or order.items[0].product.images[0].url
        out.append(
            OrderListResponse(
                id=order.id,
                status=order.status,
                total_cents=order.total_cents,
                item_count=sum(i.quantity for i in order.items),
                created_at=order.created_at,
                thumbnail_url=first_image,
            )
        )
    return out


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = await db.scalar(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.id == order_id)
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return order


@router.get("/producer/orders", response_model=list[ProducerOrderItemResponse])
async def producer_orders(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Only producers allowed")

    query = select(OrderItem).options(selectinload(OrderItem.order)).where(OrderItem.producer_id == current_user.id)
    if status:
        query = query.where(OrderItem.fulfillment_status == status)
    query = query.order_by(OrderItem.id.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.scalars(query)).all()
    return [
        ProducerOrderItemResponse(
            order_item_id=item.id,
            order_id=item.order_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price_cents=item.unit_price_cents,
            total_cents=item.total_cents,
            producer_payout_cents=item.producer_payout_cents,
            fulfillment_status=item.fulfillment_status,
            shipping_address=item.order.shipping_address or {},
            created_at=item.order.created_at,
        )
        for item in items
    ]


@router.patch("/producer/orders/{order_item_id}/fulfill", response_model=ProducerOrderItemResponse)
async def fulfill_order_item(
    order_item_id: str,
    payload: FulfillRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Only producers allowed")

    item = await db.scalar(select(OrderItem).options(selectinload(OrderItem.order)).where(OrderItem.id == order_item_id))
    if not item or item.producer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order item not found")

    if payload.action == "process":
        item.fulfillment_status = "processing"
    elif payload.action == "ship":
        if not payload.tracking_number:
            raise HTTPException(status_code=400, detail="tracking_number required when shipping")
        item.fulfillment_status = "shipped"
        item.tracking_number = payload.tracking_number
        item.shipped_at = datetime.now(timezone.utc)
    elif payload.action == "deliver":
        item.fulfillment_status = "delivered"
        item.delivered_at = datetime.now(timezone.utc)

    await db.flush()
    return ProducerOrderItemResponse(
        order_item_id=item.id,
        order_id=item.order_id,
        product_name=item.product_name,
        quantity=item.quantity,
        unit_price_cents=item.unit_price_cents,
        total_cents=item.total_cents,
        producer_payout_cents=item.producer_payout_cents,
        fulfillment_status=item.fulfillment_status,
        shipping_address=item.order.shipping_address or {},
        created_at=item.order.created_at,
    )
