from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Importer, ImporterBrand, Product, User
from routers.auth import get_current_user
from schemas import (
    ImporterBrandCreateRequest,
    ImporterBrandResponse,
    ImporterProfileCreateRequest,
    ImporterProfileResponse,
    ImporterProfileUpdateRequest,
    ImporterPublicProfileResponse,
    ImporterVerificationRequest,
    ProductListResponse,
)

router = APIRouter(prefix="/importers", tags=["importers"])


@router.post("", response_model=ImporterProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_importer_profile(
    payload: ImporterProfileCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    existing = await db.scalar(select(Importer).where(Importer.user_id == user.id))
    if existing:
        raise HTTPException(status_code=400, detail="Importer profile already exists")

    importer = Importer(user_id=user.id, **payload.model_dump())
    db.add(importer)
    await db.flush()
    await db.refresh(importer, ["brands"])
    return importer


@router.get("/me", response_model=ImporterProfileResponse)
async def get_my_importer_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).options(selectinload(Importer.brands)).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")
    return importer


@router.put("/me", response_model=ImporterProfileResponse)
async def update_my_importer_profile(
    payload: ImporterProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).options(selectinload(Importer.brands)).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(importer, field, value)
    await db.flush()
    return importer


@router.post("/me/brands", response_model=ImporterBrandResponse, status_code=status.HTTP_201_CREATED)
async def add_importer_brand(
    payload: ImporterBrandCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")

    brand = ImporterBrand(importer_id=importer.id, **payload.model_dump())
    db.add(brand)
    await db.flush()
    return brand


@router.get("/{importer_id}/public", response_model=ImporterPublicProfileResponse)
async def get_importer_public_profile(importer_id: UUID, db: AsyncSession = Depends(get_db)):
    importer = await db.scalar(select(Importer).options(selectinload(Importer.brands)).where(Importer.id == importer_id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")
    return importer


@router.get("/{importer_id}/catalog", response_model=list[ProductListResponse])
async def get_importer_catalog(importer_id: UUID, db: AsyncSession = Depends(get_db)):
    products = list(
        (
            await db.scalars(
                select(Product)
                .options(selectinload(Product.images), selectinload(Product.producer), selectinload(Product.category))
                .where(Product.importer_id == importer_id, Product.source_type == "imported", Product.status == "active")
            )
        ).all()
    )
    return products


@router.get("/search", response_model=list[ImporterPublicProfileResponse])
async def search_importers(
    category: str | None = Query(default=None),
    country: str | None = Query(default=None, min_length=2, max_length=2),
    specialization: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Importer).options(selectinload(Importer.brands))
    if country:
        query = query.where(Importer.country_origin == country.upper())
    if specialization:
        query = query.where(Importer.specializations.any(specialization))
    if category:
        lowered = category.lower()
        query = query.where(
            or_(
                Importer.specializations.any(category),
                Importer.id.in_(
                    select(ImporterBrand.importer_id).where(ImporterBrand.category.ilike(f"%{lowered}%"))
                ),
            )
        )
    return list((await db.scalars(query)).all())


@router.post("/verification", response_model=ImporterProfileResponse)
async def submit_verification(
    payload: ImporterVerificationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).options(selectinload(Importer.brands)).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")

    importer.verification_documents = payload.verification_documents
    importer.is_verified = False
    return importer


@router.get("/verification/status")
async def verification_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if user.role != "importer":
        raise HTTPException(status_code=403, detail="Importer role required")
    importer = await db.scalar(select(Importer).where(Importer.user_id == user.id))
    if not importer:
        raise HTTPException(status_code=404, detail="Importer profile not found")

    return {
        "status": "verified" if importer.is_verified else "pending_review",
        "is_verified": importer.is_verified,
        "submitted_documents": importer.verification_documents,
    }
