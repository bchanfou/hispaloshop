from __future__ import annotations

from pathlib import Path
import asyncio
from types import SimpleNamespace
from uuid import uuid4
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from models import User
from routers.recommendations import personalized_recommendations, similar_products
from services import matching_service as matching_service_module
from services.matching_service import MatchingService


class _ScalarRows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _RecommendationDB:
    def __init__(self, fallback_rows):
        self.fallback_rows = fallback_rows
        self.scalars_statements = []

    async def scalars(self, stmt):
        self.scalars_statements.append(stmt)
        return _ScalarRows(self.fallback_rows)

    async def scalar(self, stmt):
        return 0


@pytest.mark.asyncio
async def test_personalized_fallback_keeps_category_filter(monkeypatch):
    category_id = uuid4()
    current_user = SimpleNamespace(id=uuid4())

    async def _no_embedding_matches(*args, **kwargs):
        return []

    fallback_product = SimpleNamespace(
        id=uuid4(),
        name="A",
        slug="a",
        short_description="a",
        price_cents=100,
        compare_at_price_cents=None,
        images=[],
        producer=SimpleNamespace(id=uuid4(), full_name="Producer", avatar_url=None),
        is_vegan=False,
        is_gluten_free=False,
        is_organic=False,
        inventory_quantity=10,
        category=SimpleNamespace(id=category_id, name="Cat", slug="cat"),
        category_id=category_id,
    )
    db = _RecommendationDB([fallback_product])
    monkeypatch.setattr("routers.recommendations.embedding_service.find_products_for_user", _no_embedding_matches)

    response = await personalized_recommendations(limit=5, category=category_id, current_user=current_user, db=db)

    assert len(response.items) == 1
    fallback_stmt = db.scalars_statements[0]
    stmt_sql = str(fallback_stmt)
    assert "products.status =" in stmt_sql
    assert "products.category_id =" in stmt_sql


@pytest.mark.asyncio
async def test_similar_products_excludes_inactive_rows(monkeypatch):
    requested_product_id = uuid4()
    active_id = uuid4()
    inactive_id = uuid4()

    async def _matches(*args, **kwargs):
        return [(inactive_id, 0.95), (active_id, 0.90)]

    product = SimpleNamespace(
        id=active_id,
        name="Active",
        slug="active",
        short_description="ok",
        price_cents=100,
        compare_at_price_cents=None,
        images=[],
        producer=SimpleNamespace(id=uuid4(), full_name="Producer", avatar_url=None),
        is_vegan=False,
        is_gluten_free=False,
        is_organic=False,
        inventory_quantity=3,
        category=SimpleNamespace(id=uuid4(), name="Cat", slug="cat"),
    )

    class _DB:
        def __init__(self):
            self.scalars_stmt = None

        async def scalar(self, stmt):
            return SimpleNamespace(product_id=requested_product_id, embedding=[0.1, 0.2])

        async def scalars(self, stmt):
            self.scalars_stmt = stmt
            return _ScalarRows([product])

    db = _DB()
    monkeypatch.setattr("routers.recommendations.embedding_service.find_similar_products", _matches)

    response = await similar_products(product_id=requested_product_id, limit=6, db=db)

    assert [item.id for item in response["items"]] == [active_id]
    assert "products.status =" in str(db.scalars_stmt)


class _MatchingDB:
    def __init__(self, influencers):
        self.influencers = influencers
        self.rows = {}
        self._lock = asyncio.Lock()

    async def scalars(self, stmt):
        entity = stmt.column_descriptions[0].get("entity")
        if entity is User:
            return _ScalarRows(self.influencers)
        raise AssertionError("unexpected scalars query")

    async def execute(self, stmt):
        params = stmt.compile().params
        key = (
            params["producer_id_m0"],
            params["influencer_id_m0"],
            params["match_type_m0"],
        )
        async with self._lock:
            self.rows[key] = {
                "overall_score": params["overall_score_m0"],
                "score_breakdown": params["score_breakdown_m0"],
                "reasons": params["reasons_m0"],
            }

    async def flush(self):
        return None


@pytest.mark.asyncio
async def test_matching_service_upserts_instead_of_duplicates(monkeypatch):
    producer_id = uuid4()
    influencer = SimpleNamespace(id=uuid4(), role="influencer", is_active=True)
    db = _MatchingDB([influencer])

    async def _score(*args, **kwargs):
        return {
            "overall_score": 88.0,
            "breakdown": {"category_match": 88.0},
            "reasons": ["score 88.0"],
            "confidence": "high",
        }

    monkeypatch.setattr(MatchingService, "calculate_producer_influencer_score", staticmethod(_score))

    await asyncio.gather(
        matching_service_module.matching_service.find_matches_for_producer(db, producer_id=producer_id, limit=10),
        matching_service_module.matching_service.find_matches_for_producer(db, producer_id=producer_id, limit=10),
    )
    await matching_service_module.matching_service.find_matches_for_producer(db, producer_id=producer_id, limit=10)

    assert len(db.rows) == 1
    only_row = next(iter(db.rows.values()))
    assert only_row["overall_score"] == 88.0
    assert only_row["reasons"] == ["score 88.0"]
