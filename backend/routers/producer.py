import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import AffiliateLink, AffiliateLinkRequest, Product, ProductImage, User
from routers.auth import get_current_user
from schemas import ProductCreateRequest, ProductImageUploadResponse, ProductUpdateRequest
from services.cloudinary import upload_image
from services.stripe_connect import create_connect_account, create_onboarding_link

router = APIRouter(prefix="/producer")


class RejectRequest(BaseModel):
    reason: str | None = None


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


@router.get("/affiliate/requests")
async def get_affiliate_requests(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    pending = (
        await db.execute(
            select(AffiliateLinkRequest)
            .options(
                selectinload(AffiliateLinkRequest.influencer).selectinload(User.influencer_profile),
                selectinload(AffiliateLinkRequest.product),
            )
            .where(AffiliateLinkRequest.producer_id == user.id, AffiliateLinkRequest.status == "pending")
        )
    ).scalars().all()

    active_links = await db.scalar(
        select(func.count(AffiliateLink.id)).join(Product, Product.id == AffiliateLink.product_id).where(Product.producer_id == user.id, AffiliateLink.status == "active")
    )
    monthly_gmv = await db.scalar(
        select(func.coalesce(func.sum(AffiliateLink.total_gmv_cents), 0)).join(Product, Product.id == AffiliateLink.product_id).where(Product.producer_id == user.id)
    )

    return {
        "pending": [
            {
                "id": req.id,
                "influencer": {
                    "id": req.influencer.id,
                    "full_name": req.influencer.full_name,
                    "avatar_url": req.influencer.avatar_url,
                    "tier": req.influencer.influencer_profile.tier if req.influencer.influencer_profile else "perseo",
                    "followers_count": req.influencer.influencer_profile.followers_count if req.influencer.influencer_profile else 0,
                    "niche": req.influencer.influencer_profile.niche if req.influencer.influencer_profile else [],
                    "total_gmv_cents": req.influencer.influencer_profile.total_gmv_cents if req.influencer.influencer_profile else 0,
                },
                "product": {"id": req.product.id, "name": req.product.name, "image_url": req.product.images[0].url if req.product.images else None},
                "message": req.message,
                "requested_at": req.created_at,
            }
            for req in pending
        ],
        "stats": {
            "total_affiliates": len({str(req.influencer_id) for req in pending}),
            "active_links": active_links or 0,
            "monthly_gmv_from_affiliates": monthly_gmv or 0,
        },
    }


@router.post("/affiliate/requests/{request_id}/approve")
async def approve_affiliate_request(request_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    request_row = await db.scalar(
        select(AffiliateLinkRequest).options(selectinload(AffiliateLinkRequest.product)).where(AffiliateLinkRequest.id == request_id)
    )
    if not request_row or request_row.producer_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")

    request_row.status = "approved"
    request_row.approved_by = user.id
    request_row.responded_at = datetime.now(timezone.utc)

    code = f"{request_row.influencer.full_name or 'AFF'}".upper().replace(" ", "")[:8]
    code = f"{code}{str(request_row.id).replace('-', '')[:4]}"
    link = AffiliateLink(
        influencer_id=request_row.influencer_id,
        product_id=request_row.product_id,
        code=code,
        tracking_url=f"https://hispaloshop.com/r/{code}",
        status="active",
    )
    db.add(link)
    await db.flush()
    return link


@router.post("/affiliate/requests/{request_id}/reject")
async def reject_affiliate_request(
    request_id: UUID,
    payload: RejectRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_producer(user)
    request_row = await db.scalar(select(AffiliateLinkRequest).where(AffiliateLinkRequest.id == request_id))
    if not request_row or request_row.producer_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    request_row.status = "rejected"
    request_row.responded_at = datetime.now(timezone.utc)
    if payload.reason:
        request_row.message = f"{request_row.message or ''}\nRechazado: {payload.reason}".strip()
    await db.flush()
    return {"ok": True}


@router.get("/affiliate/links")
async def get_producer_affiliate_links(product_id: UUID | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    stmt = select(AffiliateLink).join(Product, Product.id == AffiliateLink.product_id).where(Product.producer_id == user.id)
    if product_id:
        stmt = stmt.where(AffiliateLink.product_id == product_id)
    links = (await db.execute(stmt.order_by(AffiliateLink.created_at.desc()))).scalars().all()
    return {"items": links, "total": len(links)}


@router.patch("/affiliate/links/{link_id}/toggle")
async def toggle_affiliate_link(link_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    link = await db.scalar(select(AffiliateLink).join(Product, Product.id == AffiliateLink.product_id).where(AffiliateLink.id == link_id, Product.producer_id == user.id))
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    link.status = "paused" if link.status == "active" else "active"
    await db.flush()
    return {"id": link.id, "status": link.status}


@router.get("/affiliate/stats")
async def producer_affiliate_stats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    require_producer(user)
    links = (
        await db.execute(select(AffiliateLink).join(Product, Product.id == AffiliateLink.product_id).where(Product.producer_id == user.id))
    ).scalars().all()
    clicks = sum(l.total_clicks for l in links)
    conversions = sum(l.total_conversions for l in links)
    gmv = sum(l.total_gmv_cents for l in links)
    commissions = sum(l.total_commission_cents for l in links)

    return {
        "period": "last_30_days",
        "affiliates": {
            "total": len({str(l.influencer_id) for l in links}),
            "active": len({str(l.influencer_id) for l in links if l.status == 'active'}),
            "new": 0,
        },
        "performance": {
            "clicks": clicks,
            "conversions": conversions,
            "conversion_rate": round((conversions / clicks) * 100, 2) if clicks else 0,
            "gmv_cents": gmv,
            "commission_paid_cents": commissions,
            "platform_earnings_cents": int(gmv * 0.15),
        },
        "top_affiliates": [],
    }
