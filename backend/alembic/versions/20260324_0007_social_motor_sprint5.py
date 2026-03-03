"""add_social_models_posts_comments_follows

Revision ID: 20260324_0007
Revises: 20260321_0006
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260324_0007"
down_revision = "20260321_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("website_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("users", sa.Column("followers_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("following_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("posts_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("engagement_rate", sa.Float(), nullable=True))
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("media_urls", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("media_type", sa.String(length=20), nullable=False, server_default="image"),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("aspect_ratio", sa.String(length=10), nullable=True),
        sa.Column("tagged_products", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False, server_default="{}"),
        sa.Column("product_tags_positions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shares_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("saves_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks_to_product", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conversions_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("gmv_generated_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("trending_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="published"),
        sa.Column("visibility", sa.String(length=20), nullable=False, server_default="public"),
        sa.Column("location_name", sa.String(length=200), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("published_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_posts_user_created", "posts", ["user_id", "created_at"], unique=False)
    op.create_index("idx_posts_score", "posts", ["score"], unique=False)
    op.create_index("idx_posts_search_vector", "posts", ["content"], postgresql_using="gin")

    op.create_table(
        "post_likes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_post_likes_unique", "post_likes", ["post_id", "user_id"], unique=True)

    op.create_table(
        "post_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("post_comments.id"), nullable=True),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "comment_likes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("comment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("post_comments.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "post_saves",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("collection_name", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("follower_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("following_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notify_posts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_stories", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_follows_unique", "follows", ["follower_id", "following_id"], unique=True)

    op.create_table(
        "feed_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("feed_posts", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("posts_considered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("generation_time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "stories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("media_url", sa.String(length=500), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False, server_default="image"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tagged_product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("stories")
    op.drop_table("feed_cache")
    op.drop_index("idx_follows_unique", table_name="follows")
    op.drop_table("follows")
    op.drop_table("post_saves")
    op.drop_table("comment_likes")
    op.drop_table("post_comments")
    op.drop_index("idx_post_likes_unique", table_name="post_likes")
    op.drop_table("post_likes")
    op.drop_index("idx_posts_search_vector", table_name="posts")
    op.drop_index("idx_posts_score", table_name="posts")
    op.drop_index("idx_posts_user_created", table_name="posts")
    op.drop_table("posts")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "engagement_rate")
    op.drop_column("users", "posts_count")
    op.drop_column("users", "following_count")
    op.drop_column("users", "followers_count")
    op.drop_column("users", "social_links")
    op.drop_column("users", "website_url")
    op.drop_column("users", "is_verified")
    op.drop_column("users", "username")
