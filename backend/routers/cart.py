from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Cart, CartItem, InfluencerProfile, Product, User
from routers.auth import get_current_user
from schemas import CartItemCreateRequest, CartItemResponse, CartItemUpdateRequest, CartResponse
from services.tracking_service import tracking_service

router = APIRouter()


def _serialize_cart_item(item: CartItem) -> CartItemResponse:
    return CartItemResponse(
        id=item.id,
        product=item.product,
        quantity=item.quantity,
        unit_price_cents=item.unit_price_cents,
        total_cents=item.unit_price_cents * item.quantity,
        max_available=item.product.inventory_quantity,
    )


async def _get_or_create_cart(db: AsyncSession, user: User) -> Cart:
    cart = await db.scalar(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images), selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.producer))
        .where(Cart.user_id == user.id, Cart.status == "active")
    )
    if cart:
        return cart

    cart = Cart(user_id=user.id, tenant_id=user.tenant_id, status="active")
    db.add(cart)
    await db.flush()
    await db.refresh(cart)
    cart.items = []
    return cart


@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart = await _get_or_create_cart(db, current_user)
    items = [_serialize_cart_item(item) for item in cart.items]
    return CartResponse(
        id=cart.id,
        items=items,
        subtotal_cents=sum(item.total_cents for item in items),
        item_count=sum(item.quantity for item in items),
        affiliate_code=cart.affiliate_code,
    )


@router.post("/cart/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_cart_item(payload: CartItemCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    product = await db.scalar(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.producer))
        .where(Product.id == payload.product_id, Product.status == "active")
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.track_inventory and product.inventory_quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cart = await _get_or_create_cart(db, current_user)

    if payload.affiliate_code and payload.affiliate_code != cart.affiliate_code:
        if cart.affiliate_code:
            raise HTTPException(status_code=400, detail="Affiliate code is already locked for this cart")
        influencer = await db.scalar(
            select(User)
            .join(InfluencerProfile, InfluencerProfile.user_id == User.id)
            .where(User.is_active.is_(True), User.role == "influencer", User.full_name == payload.affiliate_code)
        )
        if not influencer:
            raise HTTPException(status_code=400, detail="Invalid affiliate code")
        cart.affiliate_code = payload.affiliate_code

    existing = next((item for item in cart.items if item.product_id == payload.product_id), None)
    if existing:
        new_quantity = existing.quantity + payload.quantity
        if product.track_inventory and product.inventory_quantity < new_quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        existing.quantity = new_quantity
        existing.unit_price_cents = product.get_price_cents()
        await db.flush()
        return _serialize_cart_item(existing)

    item = CartItem(
        cart_id=cart.id,
        product_id=product.id,
        quantity=payload.quantity,
        unit_price_cents=product.get_price_cents(),
    )
    db.add(item)
    await db.flush()
    await tracking_service.track_interaction(
        db,
        user_id=current_user.id,
        product_id=product.id,
        interaction_type="cart",
        source="recommendation" if payload.affiliate_code else "direct",
        affiliate_code=payload.affiliate_code,
    )
    await db.refresh(item, ["product"])
    await db.refresh(item.product, ["images", "producer"])
    return _serialize_cart_item(item)


@router.patch("/cart/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(item_id: str, payload: CartItemUpdateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart = await _get_or_create_cart(db, current_user)
    item = next((it for it in cart.items if str(it.id) == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity == 0:
        deleted_snapshot = _serialize_cart_item(item)
        await db.delete(item)
        return deleted_snapshot

    if item.product.track_inventory and item.product.inventory_quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    item.quantity = payload.quantity
    await db.flush()
    return _serialize_cart_item(item)


@router.delete("/cart/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cart_item(item_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart = await _get_or_create_cart(db, current_user)
    item = next((it for it in cart.items if str(it.id) == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.delete(item)


@router.post("/cart/merge", response_model=CartResponse)
async def merge_cart(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart = await _get_or_create_cart(db, current_user)
    return await get_cart(current_user, db)
