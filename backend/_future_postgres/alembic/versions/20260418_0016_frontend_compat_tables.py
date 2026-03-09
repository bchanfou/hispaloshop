"""add analytics visits and story thumbnail support

Revision ID: 20260418_0016
Revises: 20260417_0015
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260418_0016"
down_revision = "20260417_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stories", sa.Column("thumbnail_url", sa.String(length=500), nullable=True))

    op.create_table(
        "analytics_visits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("country_code", sa.String(length=2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_analytics_visits_created_at", "analytics_visits", ["created_at"], unique=False)
    op.create_index("idx_analytics_visits_path_created", "analytics_visits", ["path", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_analytics_visits_path_created", table_name="analytics_visits")
    op.drop_index("idx_analytics_visits_created_at", table_name="analytics_visits")
    op.drop_table("analytics_visits")
    op.drop_column("stories", "thumbnail_url")
