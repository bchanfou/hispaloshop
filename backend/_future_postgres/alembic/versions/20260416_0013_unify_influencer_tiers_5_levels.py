"""Unify legacy influencer tier names to the 5-level model.

Revision ID: 20260416_0013
Revises: 20260415_0012
Create Date: 2026-04-16 00:00:00.000000
"""

from alembic import op


revision = "20260416_0013"
down_revision = "20260415_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQL profile tiers (legacy 3-tier naming -> canonical 5-tier naming)
    op.execute(
        """
        UPDATE influencer_profiles
        SET tier = CASE
            WHEN tier IN ('hercules', 'HERCULES') THEN 'perseo'
            WHEN tier IN ('atenea', 'ATENEA') THEN 'hercules'
            WHEN tier IN ('titan', 'TITAN') THEN 'zeus'
            ELSE tier
        END
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE influencer_profiles
        SET tier = CASE
            WHEN tier = 'perseo' THEN 'hercules'
            WHEN tier = 'aquiles' THEN 'hercules'
            WHEN tier = 'hercules' THEN 'atenea'
            WHEN tier = 'apolo' THEN 'atenea'
            WHEN tier = 'zeus' THEN 'titan'
            ELSE tier
        END
        """
    )

