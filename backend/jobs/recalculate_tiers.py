import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from database import AsyncSessionLocal
from models import Commission, InfluencerProfile
from services.affiliate_service import recalculate_influencer_tier


async def recalculate_all_tiers():
    async with AsyncSessionLocal() as db:
        profiles = (
            await db.execute(select(InfluencerProfile).where(InfluencerProfile.is_active.is_(True)))
        ).scalars().all()
        window_start = datetime.now(timezone.utc) - timedelta(days=30)

        for profile in profiles:
            monthly_gmv = await db.scalar(
                select(func.coalesce(func.sum(Commission.sale_amount_cents), 0)).where(
                    Commission.influencer_id == profile.user_id,
                    Commission.created_at >= window_start,
                    Commission.status.in_(["pending", "approved", "paid"]),
                )
            )
            profile.monthly_gmv_cents = monthly_gmv or 0
            await recalculate_influencer_tier(db, profile.user_id)

        await db.commit()


if __name__ == "__main__":
    asyncio.run(recalculate_all_tiers())
