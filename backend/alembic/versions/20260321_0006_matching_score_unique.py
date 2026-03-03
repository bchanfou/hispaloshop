"""matching_score_unique

Revision ID: 20260321_0006
Revises: 20260320_0005
Create Date: 2026-03-21
"""

from alembic import op


revision = "20260321_0006"
down_revision = "20260320_0005"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "uq_matching_scores_pair_type"
TABLE_NAME = "matching_scores"


def upgrade() -> None:
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        TABLE_NAME,
        ["producer_id", "influencer_id", "match_type"],
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, TABLE_NAME, type_="unique")
