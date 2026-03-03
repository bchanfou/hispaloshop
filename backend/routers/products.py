from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Product
from schemas import CursorPaginationResponse, ProductDetailResponse, ProductListResponse

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
    filters = [Product.status == "active"]
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
    if cursor:
        filters.append(Product.id > cursor)

    order = Product.created_at.desc()
    if sort == "price_asc":
        order = Product.price_cents.asc()
    elif sort == "price_desc":
        order = Product.price_cents.desc()

    stmt = (
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
        .where(and_(*filters))
        .order_by(order, Product.id.asc())
        .limit(limit + 1)
    )
    rows = list((await db.scalars(stmt)).all())
    total = await db.scalar(select(func.count(Product.id)).where(and_(*filters[: len(filters) - (1 if cursor else 0)])))

    has_more = len(rows) > limit
    rows = rows[:limit]
    return CursorPaginationResponse(
        items=[_map_product(p) for p in rows],
        next_cursor=str(rows[-1].id) if has_more and rows else None,
        has_more=has_more,
        total_count=total,
    )


@router.get("/products/{slug}", response_model=ProductDetailResponse)
async def product_detail(slug: str, db: AsyncSession = Depends(get_db)):
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
                .where(Product.category_id == product.category_id, Product.id != product.id, Product.status == "active")
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
    return ProductDetailResponse(**data)
