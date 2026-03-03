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
    # Historical records may contain multiple rows for the same
    # (producer_id, influencer_id, match_type). We must collapse duplicates
    # before adding the unique constraint, otherwise migration would fail.
    # Keep the newest row by updated_at (fallback to id ordering) and delete
    # older duplicates in a single idempotent statement.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY producer_id, influencer_id, match_type
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                ) AS rn
            FROM matching_scores
        )
        DELETE FROM matching_scores
        WHERE id IN (
            SELECT id
            FROM ranked
            WHERE rn > 1
        )
        """
    )

    op.create_unique_constraint(
        CONSTRAINT_NAME,
        TABLE_NAME,
        ["producer_id", "influencer_id", "match_type"],
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, TABLE_NAME, type_="unique")
