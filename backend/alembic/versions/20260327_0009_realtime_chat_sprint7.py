"""Sprint 7 realtime chat schema

Revision ID: 20260327_0009
Revises: 20260325_0008
Create Date: 2026-03-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260327_0009'
down_revision = '20260325_0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    def create_enum_if_not_exists(type_name: str, labels: list[str]) -> None:
        labels_sql = ", ".join(f"'{label}'" for label in labels)
        op.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = '{type_name}'
                      AND n.nspname = current_schema()
                ) THEN
                    CREATE TYPE {type_name} AS ENUM ({labels_sql});
                END IF;
            END$$;
            """
        )

    create_enum_if_not_exists(
        "conversation_type",
        ["support", "transaction", "influencer_brand", "social", "group_order"],
    )
    create_enum_if_not_exists("participant_role", ["admin", "member"])
    create_enum_if_not_exists("message_sender_type", ["user", "system", "ai"])
    create_enum_if_not_exists("message_type", ["text", "image", "product", "order", "ai_response"])
    create_enum_if_not_exists("message_attachment_type", ["image", "document"])

    conversation_type = postgresql.ENUM(
        "support",
        "transaction",
        "influencer_brand",
        "social",
        "group_order",
        name="conversation_type",
        create_type=False,
    )
    participant_role = postgresql.ENUM(
        "admin",
        "member",
        name="participant_role",
        create_type=False,
    )
    message_sender_type = postgresql.ENUM(
        "user",
        "system",
        "ai",
        name="message_sender_type",
        create_type=False,
    )
    message_type = postgresql.ENUM(
        "text",
        "image",
        "product",
        "order",
        "ai_response",
        name="message_type",
        create_type=False,
    )
    attachment_type = postgresql.ENUM(
        "image",
        "document",
        name="message_attachment_type",
        create_type=False,
    )

    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('type', conversation_type, nullable=False, server_default='social'),
        sa.Column('related_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=True),
        sa.Column('related_product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_conversations_updated_at', 'conversations', ['updated_at'])

    op.create_table(
        'conversation_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', participant_role, nullable=False, server_default='member'),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('joined_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=False), nullable=True),
        sa.Column('last_read_at', sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user')
    )
    op.create_index('ix_conversation_participants_conversation_id', 'conversation_participants', ['conversation_id'])
    op.create_index('ix_conversation_participants_user_id', 'conversation_participants', ['user_id'])

    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('sender_type', message_sender_type, nullable=False, server_default='user'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', message_type, nullable=False, server_default='text'),
        sa.Column('reply_to_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('messages.id'), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('edited_at', sa.DateTime(timezone=False), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=False), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=False), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=False), nullable=True),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])

    op.create_table(
        'message_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', attachment_type, nullable=False, server_default='image'),
        sa.Column('url', sa.String(length=1000), nullable=False),
        sa.Column('cloudinary_public_id', sa.String(length=255), nullable=True),
        sa.Column('size', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_message_attachments_message_id', 'message_attachments', ['message_id'])


def downgrade() -> None:
    op.drop_index('ix_message_attachments_message_id', table_name='message_attachments')
    op.drop_table('message_attachments')
    op.drop_index('ix_messages_sender_id', table_name='messages')
    op.drop_index('ix_messages_conversation_id', table_name='messages')
    op.drop_table('messages')
    op.drop_index('ix_conversation_participants_user_id', table_name='conversation_participants')
    op.drop_index('ix_conversation_participants_conversation_id', table_name='conversation_participants')
    op.drop_table('conversation_participants')
    op.drop_index('ix_conversations_updated_at', table_name='conversations')
    op.drop_table('conversations')

    bind = op.get_bind()
    sa.Enum(name='message_attachment_type').drop(bind, checkfirst=True)
    sa.Enum(name='message_type').drop(bind, checkfirst=True)
    sa.Enum(name='message_sender_type').drop(bind, checkfirst=True)
    sa.Enum(name='participant_role').drop(bind, checkfirst=True)
    sa.Enum(name='conversation_type').drop(bind, checkfirst=True)
