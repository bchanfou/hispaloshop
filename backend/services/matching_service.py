from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models import InfluencerProfile, MatchingScore, Product, User


class MatchingService:
    @staticmethod
    async def calculate_producer_influencer_score(db: AsyncSession, producer_id: UUID, influencer_id: UUID) -> Dict[str, Any]:
        producer = await db.get(User, producer_id)
        influencer = await db.get(User, influencer_id)
        profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == influencer_id))
        producer_categories = list((await db.scalars(select(Product.category_id).where(Product.producer_id == producer_id))).all())
        category_score = 85.0 if producer_categories and (profile and profile.niche) else 60.0
        performance_score = min(100.0, (profile.monthly_gmv_cents / 20_000) if profile else 20.0)
        audience_score = min(100.0, (profile.followers_count / 200) if profile else 10.0)
        location_score = 90.0 if producer and influencer and producer.location and producer.location == influencer.location else 55.0
        values_score = 75.0
        overall = category_score * 0.30 + performance_score * 0.25 + audience_score * 0.20 + location_score * 0.15 + values_score * 0.10
        reasons = [
            f"Alineación por categoría estimada en {category_score:.0f}%.",
            f"Rendimiento histórico aproximado de {performance_score:.0f}/100.",
        ]
        return {
            "overall_score": round(overall, 2),
            "breakdown": {
                "category_match": round(category_score, 2),
                "performance": round(performance_score, 2),
                "audience": round(audience_score, 2),
                "location": round(location_score, 2),
                "values": round(values_score, 2),
            },
            "reasons": reasons,
            "confidence": "high" if overall > 75 else "medium" if overall > 50 else "low",
        }

    @staticmethod
    async def find_matches_for_producer(db: AsyncSession, producer_id: UUID, limit: int = 10, min_score: float = 60.0) -> List[Dict[str, Any]]:
        influencers = list((await db.scalars(select(User).where(User.role == "influencer", User.is_active.is_(True)))).all())
        result: List[Dict[str, Any]] = []
        for influencer in influencers:
            score = await MatchingService.calculate_producer_influencer_score(db, producer_id, influencer.id)
            if score["overall_score"] < min_score:
                continue
            stmt = pg_insert(MatchingScore).values(
                producer_id=producer_id,
                influencer_id=influencer.id,
                overall_score=score["overall_score"],
                score_breakdown=score["breakdown"],
                reasons=score["reasons"],
                match_type="product_influencer",
            )
            await db.execute(
                stmt.on_conflict_do_update(
                    index_elements=[MatchingScore.producer_id, MatchingScore.influencer_id, MatchingScore.match_type],
                    set_={
                        "overall_score": stmt.excluded.overall_score,
                        "score_breakdown": stmt.excluded.score_breakdown,
                        "reasons": stmt.excluded.reasons,
                        "updated_at": func.now(),
                    },
                )
            )
            result.append({"influencer": influencer, **score})
        result.sort(key=lambda row: row["overall_score"], reverse=True)
        await db.flush()
        return result[:limit]


matching_service = MatchingService()
