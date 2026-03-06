"""affiliates_sprint3

Revision ID: 20260310_0003
Revises: 20260303_0002
Create Date: 2026-03-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260310_0003"
down_revision = "20260303_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("influencer_profiles", sa.Column("pending_earnings_cents", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("paid_earnings_cents", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("monthly_gmv_cents", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("total_gmv_cents", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("total_referrals", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("total_clicks", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("influencer_profiles", sa.Column("niche", postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column("influencer_profiles", sa.Column("avg_engagement_rate", sa.Float(), nullable=True))
    op.add_column("influencer_profiles", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("influencer_profiles", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("influencer_profiles", sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))
    op.add_column("influencer_profiles", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))
    op.add_column("influencer_profiles", sa.Column("tier_updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))

    op.add_column("products", sa.Column("is_affiliate_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("order_items", sa.Column("affiliate_commission_cents", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "affiliate_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("influencer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("code", sa.String(length=20), nullable=False, unique=True),
        sa.Column("tracking_url", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("total_clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_conversions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_gmv_cents", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total_commission_cents", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("influencer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="EUR"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="requested"),
        sa.Column("method", sa.String(length=20), nullable=False, server_default="stripe_transfer"),
        sa.Column("stripe_transfer_id", sa.String(length=100), nullable=True),
        sa.Column("requested_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "affiliate_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("link_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliate_links.id"), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("cookie_id", sa.String(length=100), nullable=False),
        sa.Column("attributed_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("conversion_value_cents", sa.Integer(), nullable=True),
        sa.Column("commission_cents", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "commissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("influencer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("order_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("order_items.id"), nullable=False),
        sa.Column("affiliate_link_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliate_links.id"), nullable=True),
        sa.Column("sale_amount_cents", sa.Integer(), nullable=False),
        sa.Column("commission_rate_bps", sa.Integer(), nullable=False),
        sa.Column("commission_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("payout_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payouts.id"), nullable=True),
        sa.Column("cookie_attribution_days", sa.Integer(), nullable=False, server_default="548"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "affiliate_link_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("influencer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("producer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
    )

    op.create_index("idx_affiliate_events_cookie_created", "affiliate_events", ["cookie_id", "created_at"])
    op.create_index("idx_commissions_influencer_status", "commissions", ["influencer_id", "status"])
    op.create_index("idx_affiliate_links_code_status", "affiliate_links", ["code", "status"])


def downgrade() -> None:
    op.drop_index("idx_affiliate_links_code_status", table_name="affiliate_links")
    op.drop_index("idx_commissions_influencer_status", table_name="commissions")
    op.drop_index("idx_affiliate_events_cookie_created", table_name="affiliate_events")
    op.drop_table("affiliate_link_requests")
    op.drop_table("commissions")
    op.drop_table("affiliate_events")
    op.drop_table("payouts")
    op.drop_table("affiliate_links")

    op.drop_column("order_items", "affiliate_commission_cents")
    op.drop_column("products", "is_affiliate_enabled")

    for column in [
        "tier_updated_at",
        "updated_at",
        "created_at",
        "is_active",
        "is_verified",
        "avg_engagement_rate",
        "niche",
        "total_clicks",
        "total_referrals",
        "total_gmv_cents",
        "monthly_gmv_cents",
        "paid_earnings_cents",
        "pending_earnings_cents",
    ]:
        op.drop_column("influencer_profiles", column)
