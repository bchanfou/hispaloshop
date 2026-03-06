"""hi_ai_pgvector

Revision ID: 20260317_0004
Revises: 20260310_0003
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import DBAPIError


revision = "20260317_0004"
down_revision = "20260310_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Run extension creation outside the migration transaction so a missing
    # pgvector package does not abort subsequent DDL statements.
    with op.get_context().autocommit_block():
        try:
            op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        except DBAPIError as exc:
            # Local/CI environments may not have pgvector installed.
            # Embeddings in this project are stored as float arrays, so migration can continue.
            if "extension \"vector\" is not available" not in str(exc):
                raise

    op.create_table(
        "product_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False, unique=True),
        sa.Column("embedding", sa.dialects.postgresql.ARRAY(sa.Float()), nullable=False),
        sa.Column("embedding_text", sa.Text(), nullable=False),
        sa.Column("model_version", sa.String(length=50), nullable=False, server_default="text-embedding-3-small"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "user_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("embedding", sa.dialects.postgresql.ARRAY(sa.Float()), nullable=False),
        sa.Column("based_on", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("model_version", sa.String(length=50), nullable=False, server_default="text-embedding-3-small"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "user_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("interaction_type", sa.String(length=20), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=True),
        sa.Column("affiliate_code", sa.String(length=20), nullable=True),
        sa.Column("session_id", sa.String(length=100), nullable=True),
        sa.Column("device_type", sa.String(length=20), nullable=True),
        sa.Column("purchase_value_cents", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("user_satisfaction", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_sessions.id"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("recommended_products", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "matching_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("producer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("influencer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("match_type", sa.String(length=20), nullable=False, server_default="product_influencer"),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("score_breakdown", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="suggested"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("matching_scores")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("user_interactions")
    op.drop_table("user_embeddings")
    op.drop_table("product_embeddings")
