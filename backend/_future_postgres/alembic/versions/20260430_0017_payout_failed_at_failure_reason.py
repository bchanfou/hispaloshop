"""Add failed_at and failure_reason to payouts table.

Revision ID: 20260430_0017
Revises: 20260418_0016
Create Date: 2026-04-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260430_0017"
down_revision = "20260418_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payouts", sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payouts", sa.Column("failure_reason", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("payouts", "failure_reason")
    op.drop_column("payouts", "failed_at")
