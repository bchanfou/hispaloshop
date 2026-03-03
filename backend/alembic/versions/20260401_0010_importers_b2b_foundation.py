"""Sprint 7.5 importer and b2b foundation

Revision ID: 20260401_0010
Revises: 20260327_0009
Create Date: 2026-04-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260401_0010'
down_revision = '20260327_0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'importers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('vat_tax_id', sa.String(length=100), nullable=True),
        sa.Column('business_registration', sa.String(length=150), nullable=True),
        sa.Column('country_origin', sa.String(length=2), nullable=False),
        sa.Column('warehouses', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('specializations', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('certifications', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('annual_volume_usd', sa.Float(), nullable=True),
        sa.Column('payment_terms_accepted', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('verification_documents', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_importers_user_id', 'importers', ['user_id'])

    op.create_table(
        'importer_brands',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('importer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('importers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('brand_name', sa.String(length=255), nullable=False),
        sa.Column('brand_country', sa.String(length=2), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('exclusive_territory', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('contract_start', sa.DateTime(timezone=False), nullable=True),
        sa.Column('contract_end', sa.DateTime(timezone=False), nullable=True),
        sa.Column('minimum_order_value', sa.Float(), nullable=True),
        sa.Column('documentation_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_importer_brands_importer_id', 'importer_brands', ['importer_id'])

    op.create_table(
        'importer_clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('importer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('importers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_producer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('relationship_type', sa.String(length=20), nullable=False, server_default='regular'),
        sa.Column('credit_limit', sa.Float(), nullable=True),
        sa.Column('payment_terms', sa.String(length=20), nullable=True),
        sa.Column('since', sa.DateTime(timezone=False), nullable=True),
        sa.Column('total_purchases_usd', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_importer_clients_importer_id', 'importer_clients', ['importer_id'])
    op.create_index('ix_importer_clients_client_producer_id', 'importer_clients', ['client_producer_id'])

    op.create_table(
        'b2b_quotes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('importer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('importers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requester_producer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('items', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('total_value', sa.Float(), nullable=False, server_default='0'),
        sa.Column('valid_until', sa.DateTime(timezone=False), nullable=True),
        sa.Column('incoterm', sa.String(length=10), nullable=True),
        sa.Column('shipping_estimate', sa.String(length=120), nullable=True),
        sa.Column('terms_conditions', sa.Text(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=False), nullable=True),
        sa.Column('converted_to_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=False), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_b2b_quotes_importer_id', 'b2b_quotes', ['importer_id'])
    op.create_index('ix_b2b_quotes_requester_producer_id', 'b2b_quotes', ['requester_producer_id'])

    op.add_column('products', sa.Column('source_type', sa.String(length=20), nullable=False, server_default='own'))
    op.add_column('products', sa.Column('importer_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('products', sa.Column('b2b_pricing', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index('ix_products_importer_id', 'products', ['importer_id'])
    op.create_foreign_key(None, 'products', 'importers', ['importer_id'], ['id'])

    op.add_column('orders', sa.Column('order_type', sa.String(length=20), nullable=False, server_default='b2c'))
    op.add_column('orders', sa.Column('b2b_quote_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_orders_b2b_quote_id', 'orders', ['b2b_quote_id'])
    op.create_foreign_key(None, 'orders', 'b2b_quotes', ['b2b_quote_id'], ['id'])

    op.execute("ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'b2b_negotiation'")


def downgrade() -> None:
    op.drop_constraint(None, 'orders', type_='foreignkey')
    op.drop_index('ix_orders_b2b_quote_id', table_name='orders')
    op.drop_column('orders', 'b2b_quote_id')
    op.drop_column('orders', 'order_type')

    op.drop_constraint(None, 'products', type_='foreignkey')
    op.drop_index('ix_products_importer_id', table_name='products')
    op.drop_column('products', 'b2b_pricing')
    op.drop_column('products', 'importer_id')
    op.drop_column('products', 'source_type')

    op.drop_index('ix_b2b_quotes_requester_producer_id', table_name='b2b_quotes')
    op.drop_index('ix_b2b_quotes_importer_id', table_name='b2b_quotes')
    op.drop_table('b2b_quotes')

    op.drop_index('ix_importer_clients_client_producer_id', table_name='importer_clients')
    op.drop_index('ix_importer_clients_importer_id', table_name='importer_clients')
    op.drop_table('importer_clients')

    op.drop_index('ix_importer_brands_importer_id', table_name='importer_brands')
    op.drop_table('importer_brands')

    op.drop_index('ix_importers_user_id', table_name='importers')
    op.drop_table('importers')
