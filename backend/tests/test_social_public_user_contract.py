"""
Contract tests for public username user endpoint in social routes.
"""

import os
import sys
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException


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

from routes import social


class FakeUsersCollection:
    def __init__(self, doc):
        self.doc = doc
        self.last_query = None
        self.last_projection = None

    async def find_one(self, query, projection):
        self.last_query = query
        self.last_projection = projection
        return self.doc


class FakeDb:
    def __init__(self, doc):
        self.users = FakeUsersCollection(doc)


def test_get_user_by_username_returns_public_contract(monkeypatch):
    fake_db = FakeDb(
        {
            "user_id": "u_1",
            "name": "Alice",
            "username": "test_user",
            "role": "influencer",
            "bio": "hola",
            "profile_image": None,
            "picture": "https://cdn.example.com/pic.jpg",
            "country": "ES",
            "company_name": None,
            "followers_count": 7,
            "following_count": 3,
            "posts_count": 5,
            "interests": ["food"],
            "created_at": "2026-01-01T00:00:00Z",
            "niche": "food",
            "social_links": {"instagram": "@alice"},
            "verified": False,
            "approved": True,
            "password_hash": "SHOULD_NOT_LEAK",
            "email": "secret@example.com",
        }
    )
    monkeypatch.setattr(social, "db", fake_db)

    result = asyncio.run(social.get_user_by_username("  Test User  "))

    assert fake_db.users.last_query == {"username": "test_user"}
    assert result["profile_image"] == "https://cdn.example.com/pic.jpg"
    assert result["is_verified"] is True
    assert "password_hash" not in result
    assert "email" not in result


def test_get_user_by_username_not_found(monkeypatch):
    fake_db = FakeDb(None)
    monkeypatch.setattr(social, "db", fake_db)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(social.get_user_by_username("unknown"))

    assert exc.value.status_code == 404
