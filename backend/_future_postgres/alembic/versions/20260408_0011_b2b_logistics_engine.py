"""Sprint 8 b2b logistics engine

Revision ID: 20260408_0011
Revises: 20260401_0010
Create Date: 2026-04-08 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260408_0011'
down_revision = '20260401_0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'shipping_routes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('origin_country', sa.String(length=2), nullable=False),
        sa.Column('destination_country', sa.String(length=2), nullable=False),
        sa.Column('transit_time_days', sa.Integer(), nullable=False),
        sa.Column('modes_available', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('base_cost_per_kg', sa.Float(), nullable=False),
        sa.Column('base_cost_per_cbm', sa.Float(), nullable=False),
        sa.Column('fuel_surcharge_percent', sa.Float(), nullable=False),
        sa.Column('active_carriers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_shipping_routes_origin_country', 'shipping_routes', ['origin_country'])
    op.create_index('ix_shipping_routes_destination_country', 'shipping_routes', ['destination_country'])

    op.create_table(
        'forwarder_partners',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('countries_covered', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('specialties', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('services', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('api_integration', sa.Boolean(), nullable=False),
        sa.Column('api_endpoint', sa.String(length=500), nullable=True),
        sa.Column('api_credentials', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('volume_handled_ytd', sa.Float(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_name'),
    )

    op.create_table(
        'shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_number', sa.String(length=30), nullable=False),
        sa.Column('type', sa.String(length=10), nullable=False),
        sa.Column('importer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exporter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('route_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('carrier_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('service_level', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('containers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('incoterm', sa.String(length=20), nullable=True),
        sa.Column('payment_term', sa.String(length=50), nullable=True),
        sa.Column('documents', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('tracking_events', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('cost_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('estimated_departure', sa.DateTime(), nullable=True),
        sa.Column('estimated_arrival', sa.DateTime(), nullable=True),
        sa.Column('actual_arrival', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['importer_id'], ['importers.id']),
        sa.ForeignKeyConstraint(['exporter_id'], ['users.id']),
        sa.ForeignKeyConstraint(['route_id'], ['shipping_routes.id']),
        sa.ForeignKeyConstraint(['carrier_id'], ['forwarder_partners.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_shipments_shipment_number', 'shipments', ['shipment_number'], unique=True)
    op.create_index('ix_shipments_importer_id', 'shipments', ['importer_id'])
    op.create_index('ix_shipments_exporter_id', 'shipments', ['exporter_id'])
    op.create_index('ix_shipments_route_id', 'shipments', ['route_id'])
    op.create_index('ix_shipments_carrier_id', 'shipments', ['carrier_id'])

    op.create_table(
        'shipment_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('consolidation_fee_applied', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('shipment_id', 'order_id', name='uq_shipment_order_pair'),
    )
    op.create_index('ix_shipment_orders_shipment_id', 'shipment_orders', ['shipment_id'])
    op.create_index('ix_shipment_orders_order_id', 'shipment_orders', ['order_id'])

    op.create_table(
        'b2b_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('signed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_b2b_documents_shipment_id', 'b2b_documents', ['shipment_id'])
    op.create_index('ix_b2b_documents_document_type', 'b2b_documents', ['document_type'])

    op.create_table(
        'b2b_escrows',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('importer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exporter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=True),
        sa.Column('provider_reference', sa.String(length=120), nullable=True),
        sa.Column('timeline_events', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('released_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['importer_id'], ['importers.id']),
        sa.ForeignKeyConstraint(['exporter_id'], ['users.id']),
        sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_b2b_escrows_importer_id', 'b2b_escrows', ['importer_id'])
    op.create_index('ix_b2b_escrows_exporter_id', 'b2b_escrows', ['exporter_id'])
    op.create_index('ix_b2b_escrows_shipment_id', 'b2b_escrows', ['shipment_id'])


def downgrade() -> None:
    op.drop_index('ix_b2b_escrows_shipment_id', table_name='b2b_escrows')
    op.drop_index('ix_b2b_escrows_exporter_id', table_name='b2b_escrows')
    op.drop_index('ix_b2b_escrows_importer_id', table_name='b2b_escrows')
    op.drop_table('b2b_escrows')

    op.drop_index('ix_b2b_documents_document_type', table_name='b2b_documents')
    op.drop_index('ix_b2b_documents_shipment_id', table_name='b2b_documents')
    op.drop_table('b2b_documents')

    op.drop_index('ix_shipment_orders_order_id', table_name='shipment_orders')
    op.drop_index('ix_shipment_orders_shipment_id', table_name='shipment_orders')
    op.drop_table('shipment_orders')

    op.drop_index('ix_shipments_carrier_id', table_name='shipments')
    op.drop_index('ix_shipments_route_id', table_name='shipments')
    op.drop_index('ix_shipments_exporter_id', table_name='shipments')
    op.drop_index('ix_shipments_importer_id', table_name='shipments')
    op.drop_index('ix_shipments_shipment_number', table_name='shipments')
    op.drop_table('shipments')

    op.drop_table('forwarder_partners')

    op.drop_index('ix_shipping_routes_destination_country', table_name='shipping_routes')
    op.drop_index('ix_shipping_routes_origin_country', table_name='shipping_routes')
    op.drop_table('shipping_routes')
