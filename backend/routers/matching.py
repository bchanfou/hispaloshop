from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import InfluencerProfile, MatchingScore, User
from routers.auth import get_current_user
from schemas import ContactInfluencerRequest, InfluencerMatchSummary, InfluencerOpportunitiesResponse, MatchResponse, ProducerMatchesResponse
from services.matching_service import matching_service

router = APIRouter(prefix="/matching")


@router.get("/producer/suggestions", response_model=ProducerMatchesResponse)
async def producer_suggestions(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer role required")

    matches = await matching_service.find_matches_for_producer(db, current_user.id, limit=limit)
    items = []
    for row in matches:
        influencer = row["influencer"]
        profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == influencer.id))
        items.append(
            MatchResponse(
                influencer=InfluencerMatchSummary(
                    id=influencer.id,
                    full_name=influencer.full_name or "",
                    avatar_url=influencer.avatar_url,
                    tier=profile.tier if profile else "perseo",
                    followers_count=profile.followers_count if profile else 0,
                    niche=profile.niche or [] if profile else [],
                    engagement_rate=profile.avg_engagement_rate if profile else None,
                    avg_gmv_monthly=int((profile.monthly_gmv_cents or 0) / 100) if profile else None,
                ),
                score=row["overall_score"],
                breakdown=row["breakdown"],
                reasons=row["reasons"],
                suggested_collaboration="Envío de muestras + código de descuento 15%",
                confidence=row["confidence"],
            )
        )

    return ProducerMatchesResponse(matches=items, total_available=len(items), generated_at=datetime.now(timezone.utc))


@router.post("/contact")
async def contact_influencer(payload: ContactInfluencerRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer role required")
    influencer = await db.get(User, payload.influencer_id)
    if not influencer or influencer.role != "influencer":
        raise HTTPException(status_code=404, detail="Influencer not found")

    score_breakdown = {"category_match": 75, "performance": 75, "audience": 75, "location": 75, "values": 75}
    reasons = ["Contacto iniciado por productor"]

    # Atomic upsert prevents race condition under concurrent requests.
    stmt = (
        insert(MatchingScore)
        .values(
            producer_id=current_user.id,
            influencer_id=influencer.id,
            match_type="product_influencer",
            overall_score=75,
            score_breakdown=score_breakdown,
            reasons=reasons,
            status="contacted",
            updated_at=func.now(),
        )
        .on_conflict_do_update(
            index_elements=["producer_id", "influencer_id", "match_type"],
            set_={
                "overall_score": 75,
                "score_breakdown": score_breakdown,
                "reasons": reasons,
                "status": "contacted",
                "updated_at": func.now(),
            },
        )
    )
    await db.execute(stmt)
    await db.flush()
    return {"ok": True, "message": "Contacto registrado"}


@router.get("/influencer/opportunities", response_model=InfluencerOpportunitiesResponse)
async def influencer_opportunities(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencer role required")
    rows = list((await db.scalars(select(MatchingScore).options(selectinload(MatchingScore.producer)).where(MatchingScore.influencer_id == current_user.id))).all())
    opportunities = [
        {
            "producer": {"id": row.producer.id, "full_name": row.producer.full_name, "avatar_url": row.producer.avatar_url},
            "score": row.overall_score,
            "reasons": row.reasons,
            "product_categories": [],
            "estimated_gmv_potential": int(row.overall_score * 25),
        }
        for row in rows
    ]
    return InfluencerOpportunitiesResponse(opportunities=opportunities, total_available=len(opportunities))
