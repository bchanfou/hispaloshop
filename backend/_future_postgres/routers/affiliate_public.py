from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from models import AffiliateLink, Cart
from services.affiliate_service import track_click

router = APIRouter()


@router.get("/r/{code}")
async def redirect_affiliate(code: str, request: Request, db: AsyncSession = Depends(get_db)):
    link = await db.scalar(
        select(AffiliateLink)
        .options(selectinload(AffiliateLink.product))
        .where(AffiliateLink.code.ilike(code))
    )
    if not link or link.status != "active":
        return RedirectResponse(url="/", status_code=302)

    existing_ref = request.cookies.get(settings.AFFILIATE_COOKIE_NAME)
    visitor_id = request.cookies.get("hispaloshop_vid") or str(uuid4())

    if not existing_ref:
        metadata = {
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "referrer": request.headers.get("referer"),
            "cookie_id": visitor_id,
        }
        await track_click(db=db, code=link.code, request_metadata=metadata)

    if link.product_id and link.product:
        destination = f"/products/{link.product.slug}?ref={link.code}"
    else:
        destination = f"/?ref={link.code}"

    response = RedirectResponse(url=destination, status_code=302)
    if not existing_ref:
        response.set_cookie(
            key=settings.AFFILIATE_COOKIE_NAME,
            value=link.code,
            max_age=settings.AFFILIATE_ATTRIBUTION_DAYS * 24 * 60 * 60,
            httponly=True,
            samesite="lax",
        )
    response.set_cookie(
        key="hispaloshop_vid",
        value=visitor_id,
        max_age=settings.AFFILIATE_ATTRIBUTION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
    )

    user_id = getattr(request.state, "user_id", None)
    if user_id and not existing_ref:
        cart = await db.scalar(select(Cart).where(Cart.user_id == user_id, Cart.status == "active"))
        if cart and not cart.affiliate_code:
            cart.affiliate_code = link.code

    return response
