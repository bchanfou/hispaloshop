"""Add producer shipping policy fields.

Revision ID: 20260417_0015
Revises: 20260417_0014
Create Date: 2026-04-17 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260417_0015"
down_revision = "20260417_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("shipping_policy_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("shipping_base_cost_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("shipping_free_threshold_cents", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("shipping_per_item_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("shipping_regions", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.alter_column("users", "shipping_policy_enabled", server_default=None)
    op.alter_column("users", "shipping_base_cost_cents", server_default=None)
    op.alter_column("users", "shipping_per_item_cents", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "shipping_regions")
    op.drop_column("users", "shipping_per_item_cents")
    op.drop_column("users", "shipping_free_threshold_cents")
    op.drop_column("users", "shipping_base_cost_cents")
    op.drop_column("users", "shipping_policy_enabled")

