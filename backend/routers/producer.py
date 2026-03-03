import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Product, ProductImage, User
from routers.auth import get_current_user
from schemas import ProductCreateRequest, ProductImageUploadResponse, ProductUpdateRequest
from services.cloudinary import upload_image
from services.stripe_connect import create_connect_account, create_onboarding_link

router = APIRouter(prefix="/producer")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "producto"


def require_producer(user):
    if user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer role required")


@router.post("/products")
async def create_product(
    payload: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    require_producer(user)
    slug_base = slugify(payload.name)
    dup = await db.scalar(select(func.count(Product.id)).where(Product.slug.like(f"{slug_base}%")))
    slug = slug_base if dup == 0 else f"{slug_base}-{dup + 1}"

    product = Product(
        tenant_id=user.tenant_id,
        producer_id=user.id,
        category_id=payload.category_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        short_description=payload.short_description,
        price_cents=payload.price_cents,
        compare_at_price_cents=payload.compare_at_price_cents,
        inventory_quantity=payload.inventory_quantity,
        is_vegan=payload.is_vegan,
        is_gluten_free=payload.is_gluten_free,
        is_organic=payload.is_organic,
        origin_country=payload.origin_country,
    )
    db.add(product)
    await db.flush()
    return product


@router.post("/products/{product_id}/images", response_model=ProductImageUploadResponse)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    require_producer(user)
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Only jpg/png/webp allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max size is 5MB")

    product = await db.scalar(select(Product).options(selectinload(Product.images)).where(Product.id == product_id, Product.producer_id == user.id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    uploaded = await upload_image(content)
    image = ProductImage(
        product_id=product.id,
        url=uploaded["url"],
        thumbnail_url=uploaded["thumbnail_url"],
        sort_order=len(product.images),
        is_primary=len(product.images) == 0,
    )
    db.add(image)
    await db.flush()
    return image


@router.patch("/products/{product_id}")
async def update_product(
    product_id: str,
    payload: ProductUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    require_producer(user)
    product = await db.scalar(select(Product).where(Product.id == product_id, Product.producer_id == user.id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    await db.flush()
    return product


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    require_producer(user)
    product = await db.scalar(select(Product).where(Product.id == product_id, Product.producer_id == user.id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = "deleted"
    await db.flush()
    return {"ok": True}


@router.post("/stripe/connect")
async def connect_stripe_account(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    if not user.stripe_account_id:
        user.stripe_account_id = create_connect_account(user.email)
        user.stripe_account_status = "pending"
        await db.flush()
    onboarding_url = create_onboarding_link(user.stripe_account_id)
    return {"onboarding_url": onboarding_url, "stripe_account_id": user.stripe_account_id}
