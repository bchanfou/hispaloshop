from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Category, Product
from schemas import CategoryListResponse, CategoryResponse, ProductListResponse

router = APIRouter()


def _product_to_list_item(product: Product) -> ProductListResponse:
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


@router.get("/categories", response_model=CategoryListResponse)
async def list_categories(parent_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    filters = [Category.is_active.is_(True)]
    filters.append(Category.parent_id.is_(None) if parent_id is None else Category.parent_id == parent_id)

    categories = list((await db.scalars(select(Category).where(*filters).order_by(Category.sort_order, Category.name))).all())
    if not categories:
        return CategoryListResponse(items=[])

    roots = [c.id for c in categories]
    children = list((await db.scalars(select(Category).where(Category.parent_id.in_(roots), Category.is_active.is_(True)))).all())
    all_ids = roots + [c.id for c in children]

    count_rows = await db.execute(
        select(Product.category_id, func.count(Product.id))
        .where(and_(Product.status == "active", Product.category_id.in_(all_ids)))
        .group_by(Product.category_id)
    )
    counts = dict(count_rows.all())

    children_map = defaultdict(list)
    for child in children:
        children_map[child.parent_id].append(
            CategoryResponse.model_validate(child, update={"product_count": counts.get(child.id, 0), "children": []})
        )

    items = [
        CategoryResponse.model_validate(cat, update={"product_count": counts.get(cat.id, 0), "children": children_map.get(cat.id, [])})
        for cat in categories
    ]
    return CategoryListResponse(items=items)


@router.get("/categories/{slug}")
async def category_detail(slug: str, db: AsyncSession = Depends(get_db)):
    category = await db.scalar(select(Category).where(Category.slug == slug, Category.is_active.is_(True)))
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    products = list(
        (
            await db.scalars(
                select(Product)
                .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                .where(Product.category_id == category.id, Product.status == "active")
                .order_by(Product.created_at.desc())
                .limit(4)
            )
        ).all()
    )
    return {"category": CategoryResponse.model_validate(category), "featured_products": [_product_to_list_item(p) for p in products]}
