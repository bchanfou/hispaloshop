import base64
import json
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Product
from routers.auth import get_optional_user
from schemas import CursorPaginationResponse, ProductDetailResponse, ProductListResponse
from services.product_visibility import active_product_filters
from services.tracking_service import tracking_service

router = APIRouter()


def _map_product(product: Product) -> ProductListResponse:
    badges = [k for k, v in {"vegan": product.is_vegan, "gluten_free": product.is_gluten_free, "organic": product.is_organic}.items() if v]
    return ProductListResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        price_cents=product.price_cents,
        compare_at_price_cents=product.compare_at_price_cents,
        images=[img for img in product.images],
        producer=product.producer,
        badges=badges,
        inventory_quantity=product.inventory_quantity,
        category=product.category,
    )


def _encode_cursor(sort: str, product: Product) -> str:
    if sort in {"price_asc", "price_desc"}:
        payload = {"sort": sort, "price_cents": product.price_cents, "id": str(product.id)}
    else:
        payload = {"sort": sort, "created_at": product.created_at.isoformat(), "id": str(product.id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> dict:
    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        payload = json.loads(decoded)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid cursor")

    if not isinstance(payload, dict) or "id" not in payload or "sort" not in payload:
        raise HTTPException(status_code=400, detail="Invalid cursor")
    return payload


def _cursor_filter(sort: str, payload: dict):
    cursor_id = payload.get("id")
    try:
        cursor_uuid = UUID(cursor_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid cursor")

    if sort in {"price_asc", "price_desc"}:
        cursor_price = payload.get("price_cents")
        if not isinstance(cursor_price, int):
            raise HTTPException(status_code=400, detail="Invalid cursor")
        if sort == "price_asc":
            return or_(Product.price_cents > cursor_price, and_(Product.price_cents == cursor_price, Product.id > cursor_uuid))
        return or_(Product.price_cents < cursor_price, and_(Product.price_cents == cursor_price, Product.id > cursor_uuid))

    cursor_created_at_raw = payload.get("created_at")
    if not isinstance(cursor_created_at_raw, str):
        raise HTTPException(status_code=400, detail="Invalid cursor")
    try:
        cursor_created_at = datetime.fromisoformat(cursor_created_at_raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cursor")

    return or_(
        Product.created_at < cursor_created_at,
        and_(Product.created_at == cursor_created_at, Product.id > cursor_uuid),
    )


@router.get("/products", response_model=CursorPaginationResponse)
async def list_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    badges: Optional[str] = None,
    sort: str = "newest",
    cursor: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    filters = active_product_filters()
    if category:
        filters.append(Product.category_id == category)
    if q:
        filters.append(Product.name.ilike(f"%{q}%"))
    if min_price is not None:
        filters.append(Product.price_cents >= min_price)
    if max_price is not None:
        filters.append(Product.price_cents <= max_price)
    if badges:
        for b in badges.split(","):
            if b == "vegan":
                filters.append(Product.is_vegan.is_(True))
            if b == "organic":
                filters.append(Product.is_organic.is_(True))
            if b == "gluten_free":
                filters.append(Product.is_gluten_free.is_(True))

    sort_orders = {
        "newest": [Product.created_at.desc(), Product.id.asc()],
        "price_asc": [Product.price_cents.asc(), Product.id.asc()],
        "price_desc": [Product.price_cents.desc(), Product.id.asc()],
    }
    if sort not in sort_orders:
        raise HTTPException(status_code=400, detail="Invalid sort option")

    count_filters = list(filters)
    if cursor:
        cursor_payload = _decode_cursor(cursor)
        if cursor_payload["sort"] != sort:
            raise HTTPException(status_code=400, detail="Cursor does not match current sort")
        filters.append(_cursor_filter(sort, cursor_payload))

    stmt = (
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
        .where(and_(*filters))
        .order_by(*sort_orders[sort])
        .limit(limit + 1)
    )
    rows = list((await db.scalars(stmt)).all())
    total = await db.scalar(select(func.count(Product.id)).where(and_(*count_filters)))

    has_more = len(rows) > limit
    rows = rows[:limit]
    return CursorPaginationResponse(
        items=[_map_product(p) for p in rows],
        next_cursor=_encode_cursor(sort, rows[-1]) if has_more and rows else None,
        has_more=has_more,
        total_count=total,
    )


@router.get("/products/{slug}", response_model=ProductDetailResponse)
async def product_detail(slug: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_optional_user)):
    product = await db.scalar(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.producer),
            selectinload(Product.category),
            selectinload(Product.certificates),
        )
        .where(Product.slug == slug, Product.status != "deleted")
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    related = list(
        (
            await db.scalars(
                select(Product)
                .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                .where(Product.category_id == product.category_id, Product.id != product.id, *active_product_filters())
                .limit(4)
            )
        ).all()
    )

    data = _map_product(product).model_dump()
    data.update(
        {
            "description": product.description,
            "certificates": [c for c in product.certificates],
            "related_products": [_map_product(p) for p in related],
        }
    )
    await tracking_service.track_interaction(
        db,
        user_id=current_user.id if current_user else None,
        product_id=product.id,
        interaction_type="view",
        source="direct",
    )
    return ProductDetailResponse(**data)
