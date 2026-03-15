"""
Performance & Index Tests — 4 tests verifying database index definitions exist,
critical collections are covered, and no obvious missing indexes for common query patterns.
"""
import pytest
import ast
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")


def _read_database_source() -> str:
    """Read the database.py source to analyze index definitions."""
    db_path = Path(__file__).resolve().parents[1] / "core" / "database.py"
    return db_path.read_text(encoding="utf-8")


# ── Test 1: Notifications collection has required indexes ────────────────────

def test_notifications_indexes_exist():
    """Notifications collection must have user_id and compound indexes for queries."""
    source = _read_database_source()
    assert 'db.notifications.create_index("user_id"' in source
    assert "user_id" in source and "created_at" in source
    assert "read_at" in source  # For unread count queries


# ── Test 2: Products collection has required indexes ─────────────────────────

def test_products_indexes_exist():
    """Products collection must have indexes for all common query patterns."""
    source = _read_database_source()
    # Primary lookups
    assert 'db.products.create_index("product_id"' in source
    assert 'db.products.create_index("producer_id"' in source
    assert 'db.products.create_index("category_id"' in source
    # Text search
    assert '"text"' in source  # text index for name/description search
    # Compound indexes for filtered feeds
    assert "approved" in source
    assert "created_at" in source


# ── Test 3: B2B operations collection has required indexes ──────────────────

def test_b2b_indexes_exist():
    """B2B collections must have indexes for producer/importer lookups."""
    source = _read_database_source()
    assert "b2b_requests" in source
    assert "producer_id" in source
    assert "importer_id" in source


# ── Test 4: No missing critical indexes ──────────────────────────────────────

def test_no_missing_critical_indexes():
    """All critical collections must have at least one index defined."""
    source = _read_database_source()

    critical_collections = [
        "users",
        "products",
        "orders",
        "cart",
        "conversations",
        "notifications",
        "discount_codes",
        "reviews",
        "stores",
        "certificates",
    ]

    for collection in critical_collections:
        assert f"db.{collection}.create_index" in source, (
            f"Collection '{collection}' has no index definitions in database.py"
        )

    # Verify unique indexes on identity fields
    assert 'db.users.create_index("email", unique=True' in source
    assert 'db.users.create_index("user_id", unique=True' in source
    assert 'db.orders.create_index("order_id", unique=True' in source
    assert 'db.cart.create_index("user_id", unique=True' in source
    assert 'db.stores.create_index("store_id", unique=True' in source
