"""
Regression tests to prevent N+1 queries in social feeds.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Any, cast

from _pytest.monkeypatch import MonkeyPatch
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

from routes import social


class FakeCursor:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def sort(self, *args: Any, **kwargs: Any) -> "FakeCursor":
        return self

    def limit(self, *args: Any, **kwargs: Any) -> "FakeCursor":
        return self

    def skip(self, *args: Any, **kwargs: Any) -> "FakeCursor":
        return self

    async def to_list(self, length: int) -> list[dict[str, Any]]:
        return self.rows[:length]


class FakeUserPostsCollection:
    def __init__(self, posts: list[dict[str, Any]]) -> None:
        self.posts = posts

    def aggregate(self, pipeline: list[dict[str, Any]]) -> FakeCursor:
        return FakeCursor(self.posts)


class FakeUsersCollection:
    def __init__(self, users: list[dict[str, Any]]) -> None:
        self.users = users
        self.find_calls = 0
        self.find_one_calls = 0

    def find(self, query: dict[str, Any], projection: dict[str, int]) -> FakeCursor:
        self.find_calls += 1
        ids = set(query.get("user_id", {}).get("$in", []))
        return FakeCursor([user for user in self.users if user.get("user_id") in ids])

    async def find_one(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        self.find_one_calls += 1
        raise AssertionError("find_one should not be used in batched social feed paths")


class FakeSimpleCollection:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.find_calls = 0
        self.find_one_calls = 0

    def find(self, query: dict[str, Any], projection: dict[str, int]) -> FakeCursor:
        self.find_calls += 1
        post_ids = set(query.get("post_id", {}).get("$in", []))
        user_id = query.get("user_id")
        filtered = [row for row in self.rows if row.get("post_id") in post_ids and row.get("user_id") == user_id]
        return FakeCursor(filtered)

    async def find_one(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        self.find_one_calls += 1
        raise AssertionError("find_one should not be used in batched social feed paths")


class FakeStoriesCollection:
    def __init__(self, stories: list[dict[str, Any]]) -> None:
        self.stories = stories

    def find(self, query: dict[str, Any], projection: dict[str, int]) -> FakeCursor:
        return FakeCursor(self.stories)


class FakeCurrentUser:
    def __init__(self, user_id: str) -> None:
        self.user_id = user_id


def make_request() -> Request:
    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": b"", "more_body": False}

    return Request({"type": "http", "method": "GET", "path": "/", "headers": []}, receive)


def test_get_trending_posts_batches_user_and_reaction_queries(monkeypatch: MonkeyPatch) -> None:
    posts = [
        {"post_id": "p1", "user_id": "u1", "likes_count": 1, "comments_count": 1},
        {"post_id": "p2", "user_id": "u2", "likes_count": 2, "comments_count": 0},
        {"post_id": "p3", "user_id": "u1", "likes_count": 0, "comments_count": 4},
    ]
    users = [
        {"user_id": "u1", "name": "Ana", "profile_image": "a.jpg", "role": "producer"},
        {"user_id": "u2", "name": "Luis", "profile_image": "l.jpg", "role": "customer"},
    ]
    post_likes = FakeSimpleCollection([{"post_id": "p1", "user_id": "viewer"}])
    post_bookmarks = FakeSimpleCollection([{"post_id": "p3", "user_id": "viewer"}])
    users_collection = FakeUsersCollection(users)

    fake_db = type(
        "FakeDb",
        (),
        {
            "user_posts": FakeUserPostsCollection(posts),
            "users": users_collection,
            "post_likes": post_likes,
            "post_bookmarks": post_bookmarks,
        },
    )()

    async def fake_optional_user(request: Request) -> FakeCurrentUser:
        return FakeCurrentUser("viewer")

    monkeypatch.setattr(social, "db", fake_db)
    monkeypatch.setattr(social, "get_optional_user", fake_optional_user)

    result = asyncio.run(social.get_trending_posts(make_request(), limit=5))

    assert users_collection.find_calls == 1
    assert users_collection.find_one_calls == 0
    assert post_likes.find_calls == 1
    assert post_likes.find_one_calls == 0
    assert post_bookmarks.find_calls == 1
    assert post_bookmarks.find_one_calls == 0
    posts_result = result["posts"]
    assert [post["user_name"] for post in posts_result] == ["Ana", "Luis", "Ana"]
    assert posts_result[0]["is_liked"] is True
    assert posts_result[2]["is_bookmarked"] is True


def test_get_stories_feed_batches_user_lookup(monkeypatch: MonkeyPatch) -> None:
    stories = [
        {"story_id": "s1", "user_id": "u1", "created_at": "2026-03-23T10:00:00Z"},
        {"story_id": "s2", "user_id": "u2", "created_at": "2026-03-23T09:00:00Z"},
        {"story_id": "s3", "user_id": "u1", "created_at": "2026-03-23T08:00:00Z"},
    ]
    users_collection = FakeUsersCollection(
        [
            {"user_id": "u1", "name": "Ana", "profile_image": "a.jpg", "role": "producer"},
            {"user_id": "u2", "name": "Luis", "profile_image": "l.jpg", "role": "customer"},
        ]
    )
    fake_db = type(
        "FakeDb",
        (),
        {
            "hispalostories": FakeStoriesCollection(stories),
            "users": users_collection,
            # Post-Cycle-3: stories feed filters blocked users via db.blocked_users.find(...).to_list()
            "blocked_users": FakeStoriesCollection([]),  # empty = no blocks
        },
    )()

    async def fake_optional_user(request: Request) -> FakeCurrentUser:
        return FakeCurrentUser("u1")

    monkeypatch.setattr(social, "db", fake_db)
    monkeypatch.setattr(social, "get_optional_user", fake_optional_user)

    result = asyncio.run(social.get_stories_feed(make_request()))

    assert users_collection.find_calls == 1
    assert users_collection.find_one_calls == 0
    assert result[0]["user_id"] == "u1"
    assert result[0]["is_own"] is True
    assert len(result[0]["stories"]) == 2
