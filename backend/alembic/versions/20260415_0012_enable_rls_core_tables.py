"""Enable row-level security for critical commerce tables.

Revision ID: 20260415_0012
Revises: 20260408_0011
Create Date: 2026-04-15 10:00:00.000000
"""

from alembic import op


revision = '20260415_0012'
down_revision = '20260408_0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE shipments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE b2b_quotes ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY user_isolation_orders ON orders
        USING (
            current_setting('app.current_user_id', true) IS NOT NULL
            AND user_id = current_setting('app.current_user_id', true)::UUID
        )
        """
    )
    op.execute(
        """
        CREATE POLICY admin_all_orders ON orders
        USING (
            COALESCE(current_setting('app.is_admin', true), 'false')::BOOLEAN
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS admin_all_orders ON orders")
    op.execute("DROP POLICY IF EXISTS user_isolation_orders ON orders")
    op.execute("ALTER TABLE b2b_quotes DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE shipments DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE orders DISABLE ROW LEVEL SECURITY")
