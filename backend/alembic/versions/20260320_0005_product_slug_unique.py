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
    bind = op.get_bind()

    # Pull all products in deterministic order so slug rewrites are stable.
    rows = bind.execute(
        sa.text(
            """
            SELECT id, slug
            FROM products
            ORDER BY slug, created_at, id
            """
        )
    ).fetchall()

    # Track every existing slug (including already suffixed values) to avoid collisions.
    used_slugs = {row.slug for row in rows}
    seen_original = set()

    for row in rows:
        slug = row.slug
        if slug not in seen_original:
            # Keep the first row for each original slug untouched.
            seen_original.add(slug)
            continue

        # Duplicate slug: generate slug-1, slug-2, ... and pick first globally free value.
        suffix = 1
        while True:
            candidate = f"{slug}-{suffix}"
            if candidate not in used_slugs:
                bind.execute(
                    sa.text("UPDATE products SET slug = :candidate WHERE id = :product_id"),
                    {"candidate": candidate, "product_id": row.id},
                )
                used_slugs.add(candidate)
                break
            suffix += 1

    # Idempotent guard in case the migration is replayed in non-standard workflows.
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_products_slug'
                ) THEN
                    ALTER TABLE products
                    ADD CONSTRAINT uq_products_slug UNIQUE (slug);
                END IF;
            END
            $$;
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_products_slug'
                ) THEN
                    ALTER TABLE products DROP CONSTRAINT uq_products_slug;
                END IF;
            END
            $$;
            """
        )
    )
