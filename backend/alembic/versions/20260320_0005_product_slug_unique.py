"""add unique constraint to product slug

Revision ID: 20260320_0005
Revises: 20260317_0004
Create Date: 2026-03-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260320_0005"
down_revision = "20260317_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
                FROM products
            )
            UPDATE products p
            SET slug = CONCAT(r.slug, '-', r.rn)
            FROM ranked r
            WHERE p.id = r.id AND r.rn > 1
            """
        )
    )
    op.create_unique_constraint("uq_products_slug", "products", ["slug"])


def downgrade() -> None:
    op.drop_constraint("uq_products_slug", "products", type_="unique")
