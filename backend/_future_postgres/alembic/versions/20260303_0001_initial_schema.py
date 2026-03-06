"""initial_schema

Revision ID: 20260303_0001
Revises:
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260303_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(10), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("default_currency", sa.String(3), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200)),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
        sa.Column("bio", sa.Text()),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("location", sa.String(200)),
        sa.Column("kyc_status", sa.String(20), nullable=False),
        sa.Column("kyc_document_url", sa.String(500)),
        sa.Column("stripe_customer_id", sa.String(100)),
        sa.Column("stripe_account_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("image_url", sa.String(500)),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("producer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("short_description", sa.String(500)),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("compare_at_price_cents", sa.Integer()),
        sa.Column("inventory_quantity", sa.Integer(), nullable=False),
        sa.Column("track_inventory", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("is_featured", sa.Boolean(), nullable=False),
        sa.Column("is_vegan", sa.Boolean(), nullable=False),
        sa.Column("is_gluten_free", sa.Boolean(), nullable=False),
        sa.Column("is_organic", sa.Boolean(), nullable=False),
        sa.Column("origin_country", sa.String(2)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("published_at", sa.DateTime()),
    )
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("current_period_start", sa.DateTime(), nullable=False),
        sa.Column("current_period_end", sa.DateTime(), nullable=False),
        sa.Column("commission_bps", sa.Integer(), nullable=False),
    )
    op.create_table(
        "influencer_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("total_earnings_cents", sa.Integer(), nullable=False),
        sa.Column("followers_count", sa.Integer(), nullable=False),
    )
    op.create_table(
        "product_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("thumbnail_url", sa.String(500)),
        sa.Column("alt_text", sa.String(200)),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "product_certificates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("issuer", sa.String(100), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("product_certificates")
    op.drop_table("product_images")
    op.drop_table("influencer_profiles")
    op.drop_table("subscriptions")
    op.drop_table("products")
    op.drop_table("categories")
    op.drop_table("users")
    op.drop_table("tenants")
