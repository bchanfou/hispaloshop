"""add_cart_order_transaction_tables

Revision ID: 20260303_0002
Revises: 20260303_0001
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260303_0002"
down_revision = "20260303_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_account_status", sa.String(length=20), nullable=False, server_default="inactive"))

    op.create_table(
        "carts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("affiliate_code", sa.String(length=20)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payment_status", sa.String(length=20), nullable=False),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False),
        sa.Column("shipping_cents", sa.Integer(), nullable=False),
        sa.Column("tax_cents", sa.Integer(), nullable=False),
        sa.Column("discount_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_bps", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
        sa.Column("affiliate_code", sa.String(length=20)),
        sa.Column("affiliate_commission_bps", sa.Integer()),
        sa.Column("affiliate_commission_cents", sa.Integer()),
        sa.Column("stripe_payment_intent_id", sa.String(length=100)),
        sa.Column("stripe_checkout_session_id", sa.String(length=100)),
        sa.Column("shipping_address", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("paid_at", sa.DateTime()),
    )
    op.create_table(
        "cart_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cart_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("carts.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("product_sku", sa.String(length=100)),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("producer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("producer_payout_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
        sa.Column("fulfillment_status", sa.String(length=20), nullable=False),
        sa.Column("tracking_number", sa.String(length=100)),
        sa.Column("shipped_at", sa.DateTime()),
        sa.Column("delivered_at", sa.DateTime()),
    )
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("stripe_transfer_id", sa.String(length=100)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("order_items")
    op.drop_table("cart_items")
    op.drop_table("orders")
    op.drop_table("carts")
    op.drop_column("users", "stripe_account_status")
