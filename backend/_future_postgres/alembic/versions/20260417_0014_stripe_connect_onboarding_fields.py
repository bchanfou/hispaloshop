"""Add Stripe Connect onboarding and payout tracking fields.

Revision ID: 20260417_0014
Revises: 20260416_0013
Create Date: 2026-04-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260417_0014"
down_revision = "20260416_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_account_type", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("stripe_account_created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("stripe_account_payouts_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("stripe_account_charges_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("connect_onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("connect_requirements_due", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.add_column("order_items", sa.Column("producer_transfer_id", sa.String(length=255), nullable=True))
    op.add_column("order_items", sa.Column("producer_payout_status", sa.String(length=50), nullable=False, server_default="pending"))

    op.alter_column("users", "stripe_account_payouts_enabled", server_default=None)
    op.alter_column("users", "stripe_account_charges_enabled", server_default=None)
    op.alter_column("users", "connect_onboarding_completed", server_default=None)
    op.alter_column("order_items", "producer_payout_status", server_default=None)


def downgrade() -> None:
    op.drop_column("order_items", "producer_payout_status")
    op.drop_column("order_items", "producer_transfer_id")

    op.drop_column("users", "connect_requirements_due")
    op.drop_column("users", "connect_onboarding_completed")
    op.drop_column("users", "stripe_account_charges_enabled")
    op.drop_column("users", "stripe_account_payouts_enabled")
    op.drop_column("users", "stripe_account_created_at")
    op.drop_column("users", "stripe_account_type")
