"""
Regression tests for social highlights normalization and validation.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Any, cast

import pytest
from _pytest.monkeypatch import MonkeyPatch
from fastapi import HTTPException
from starlette.requests import Request


backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")
os.environ.setdefault("DB_NAME", "hispaloshop_test")
os.environ.setdefault("SMTP_HOST", "")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASS", "")

from core.models import User
from routes import social


class FakeHighlightCollection:
    def __init__(self) -> None:
        self.inserted: dict[str, Any] | None = None
        self.updated: dict[str, Any] | None = None

    async def count_documents(self, query: dict[str, Any]) -> int:
        return 2

    async def insert_one(self, doc: dict[str, Any]) -> None:
        self.inserted = doc

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]):
        self.updated = {"query": query, "update": update}
        return type("Result", (), {"matched_count": 1})()


class FakeUser:
    def __init__(self, user_id: str = "u_1") -> None:
        self.user_id = user_id


def make_request(body: dict[str, Any]) -> Request:
    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": str.encode(__import__("json").dumps(body)), "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-type", b"application/json")],
        },
        receive,
    )


def test_normalize_story_ids_dedupes_and_sanitizes() -> None:
    result = social._normalize_story_ids([" s1 ", "", None, "s2", "s1", 123, "   "])
    assert result == ["s1", "s2", "123"]


def test_create_highlight_sanitizes_story_ids(monkeypatch: MonkeyPatch) -> None:
    fake_collection = FakeHighlightCollection()
    fake_db = type("FakeDb", (), {"story_highlights": fake_collection})()
    monkeypatch.setattr(social, "db", fake_db)

    request = make_request({"title": "Verano", "story_ids": [" a ", "a", "", None, "b", 45]})
    result = asyncio.run(social.create_highlight(request, cast(User, FakeUser())))

    assert result["story_ids"] == ["a", "b", "45"]
    assert fake_collection.inserted is not None
    assert fake_collection.inserted["story_ids"] == ["a", "b", "45"]


def test_update_highlight_rejects_invalid_order(monkeypatch: MonkeyPatch) -> None:
    fake_collection = FakeHighlightCollection()
    fake_db = type("FakeDb", (), {"story_highlights": fake_collection})()
    monkeypatch.setattr(social, "db", fake_db)

    request = make_request({"order": "not-a-number"})

    with pytest.raises(HTTPException) as exc:
        asyncio.run(social.update_highlight("hl_123", request, cast(User, FakeUser())))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Order must be a non-negative integer"
