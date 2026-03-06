"""add_reels_hashtags_stories_collections

Revision ID: 20260325_0008
Revises: 20260324_0007
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260325_0008"
down_revision = "20260324_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reels_count", sa.Integer(), nullable=False, server_default="0"))

    op.add_column("posts", sa.Column("views_count_unique", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("posts", sa.Column("avg_watch_time_seconds", sa.Float(), nullable=True))
    op.add_column("posts", sa.Column("completion_rate", sa.Float(), nullable=True))
    op.add_column("posts", sa.Column("viral_score", sa.Float(), nullable=False, server_default="0"))
    op.add_column("posts", sa.Column("is_reel", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("posts", sa.Column("video_duration_seconds", sa.Float(), nullable=True))
    op.add_column("posts", sa.Column("audio_track_id", sa.String(length=100), nullable=True))
    op.create_index("idx_posts_reel_viral", "posts", ["is_reel", "viral_score"], unique=False)

    op.create_table(
        "saved_collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("items_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.add_column("post_saves", sa.Column("collection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("saved_collections.id"), nullable=True))

    op.create_table(
        "hashtags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("posts_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("followers_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trending_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_hashtags_name"), "hashtags", ["name"], unique=True)

    op.create_table(
        "post_hashtags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("hashtag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hashtags.id"), nullable=False),
    )
    op.create_index("idx_post_hashtag_unique", "post_hashtags", ["post_id", "hashtag_id"], unique=True)

    op.create_table(
        "hashtag_follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("hashtag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hashtags.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_hashtag_follows_unique", "hashtag_follows", ["hashtag_id", "user_id"], unique=True)

    op.create_table(
        "reel_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("viewer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("watch_time_seconds", sa.Float(), nullable=False),
        sa.Column("watched_full", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("liked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="feed"),
        sa.Column("device_type", sa.String(length=20), nullable=False, server_default="mobile"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_reel_views_post_created", "reel_views", ["post_id", "created_at"], unique=False)

    op.create_table(
        "sounds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("artist", sa.String(length=200), nullable=True),
        sa.Column("audio_url", sa.String(length=500), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("posts_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trending_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_original", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.add_column("stories", sa.Column("polls", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("stories", sa.Column("questions", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("stories", sa.Column("sliders", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("stories", sa.Column("countdowns", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("stories", sa.Column("links", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("stories", sa.Column("views_unique_count", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("idx_stories_user_expires", "stories", ["user_id", "expires_at"], unique=False)

    op.create_table(
        "story_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("story_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stories.id"), nullable=False),
        sa.Column("viewer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("replied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reaction", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_story_views_unique", "story_views", ["story_id", "viewer_id"], unique=True)


def downgrade() -> None:
    op.drop_index("idx_story_views_unique", table_name="story_views")
    op.drop_table("story_views")
    op.drop_index("idx_stories_user_expires", table_name="stories")
    op.drop_column("stories", "views_unique_count")
    op.drop_column("stories", "links")
    op.drop_column("stories", "countdowns")
    op.drop_column("stories", "sliders")
    op.drop_column("stories", "questions")
    op.drop_column("stories", "polls")

    op.drop_table("sounds")
    op.drop_index("idx_reel_views_post_created", table_name="reel_views")
    op.drop_table("reel_views")

    op.drop_index("idx_hashtag_follows_unique", table_name="hashtag_follows")
    op.drop_table("hashtag_follows")
    op.drop_index("idx_post_hashtag_unique", table_name="post_hashtags")
    op.drop_table("post_hashtags")
    op.drop_index(op.f("ix_hashtags_name"), table_name="hashtags")
    op.drop_table("hashtags")

    op.drop_column("post_saves", "collection_id")
    op.drop_table("saved_collections")

    op.drop_index("idx_posts_reel_viral", table_name="posts")
    op.drop_column("posts", "audio_track_id")
    op.drop_column("posts", "video_duration_seconds")
    op.drop_column("posts", "is_reel")
    op.drop_column("posts", "viral_score")
    op.drop_column("posts", "completion_rate")
    op.drop_column("posts", "avg_watch_time_seconds")
    op.drop_column("posts", "views_count_unique")

    op.drop_column("users", "reels_count")
