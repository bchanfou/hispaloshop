from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models import UserInteraction


class TrackingService:
    @staticmethod
    async def track_interaction(
        db: AsyncSession,
        *,
        user_id: Optional[UUID],
        product_id: UUID,
        interaction_type: str,
        source: Optional[str] = None,
        affiliate_code: Optional[str] = None,
        session_id: Optional[str] = None,
        device_type: Optional[str] = None,
        purchase_value_cents: Optional[int] = None,
    ) -> UserInteraction:
        interaction = UserInteraction(
            user_id=user_id,
            product_id=product_id,
            interaction_type=interaction_type,
            source=source,
            affiliate_code=affiliate_code,
            session_id=session_id,
            device_type=device_type,
            purchase_value_cents=purchase_value_cents,
        )
        db.add(interaction)
        await db.flush()
        return interaction


tracking_service = TrackingService()
