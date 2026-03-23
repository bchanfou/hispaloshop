"""
Regression tests for create_reel settings normalization.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Any, Optional, cast

from _pytest.monkeypatch import MonkeyPatch
from fastapi import UploadFile


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
from core.models import User


class FakeUploadFile:
    def __init__(self, content_type: str, content: bytes):
        self.content_type = content_type
        self._content = content

    async def read(self) -> bytes:
        return self._content


class FakeUsersCollection:
    async def find_one(self, query: dict[str, Any], projection: dict[str, int]) -> dict[str, str]:
        return {"profile_image": "https://cdn.example.com/avatar.jpg", "company_name": "Acme Foods"}


class FakeReelsCollection:
    def __init__(self):
        self.inserted: Optional[dict[str, Any]] = None

    async def insert_one(self, doc: dict[str, Any]) -> None:
        self.inserted = doc


class FakeDb:
    def __init__(self):
        self.users = FakeUsersCollection()
        self.reels = FakeReelsCollection()


class FakeUser:
    def __init__(self, user_id: str = "u_1", name: str = "Alice"):
        self.user_id = user_id
        self.name = name


def test_create_reel_clamps_extreme_settings_and_fallbacks_without_cloudinary(monkeypatch: MonkeyPatch):
    fake_db = FakeDb()
    monkeypatch.setattr(social, "db", fake_db)

    async def fake_upload_video(contents: bytes, folder: str, filename: str) -> dict[str, Any]:
        return {
            "url": "https://cdn.example.com/original.mp4",
            "public_id": "cloud_public_123",
            "duration": 20.0,
            "thumbnail": "https://cdn.example.com/thumb.jpg",
        }

    async def fake_thumbnail(public_id: str, second: float) -> str:
        assert public_id == "cloud_public_123"
        assert second == 20.0
        return "https://cdn.example.com/generated-thumb.jpg"

    async def fake_hydrate(tags: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return []

    async def fake_record(event_type: str, payload: dict[str, Any], user_id: Optional[str] = None) -> None:
        return None

    def fake_import_module(name: str) -> Any:
        raise ModuleNotFoundError("cloudinary")

    monkeypatch.setattr(social, "cloudinary_upload_video", fake_upload_video)
    monkeypatch.setattr(social.VideoService, "generate_thumbnail_at_time", fake_thumbnail)
    monkeypatch.setattr(social, "_hydrate_tagged_products", fake_hydrate)
    monkeypatch.setattr(social, "_record_intelligence_signal", fake_record)
    monkeypatch.setattr(social.importlib, "import_module", fake_import_module)

    result = asyncio.run(
        social.create_reel(
            file=cast(UploadFile, FakeUploadFile("video/mp4", b"video-bytes")),
            caption="hola",
            location="Madrid",
            cover_frame_seconds=99,
            trim_start_seconds=12,
            trim_end_seconds=5,
            playback_rate=9,
            muted="true",
            slow_motion_enabled="true",
            slow_motion_start=0,
            slow_motion_end=50,
            product_id="",
            tagged_products_json="[]",
            user=cast(User, FakeUser()),
        )
    )

    assert result["video_url"] == "https://cdn.example.com/original.mp4"
    assert result["thumbnail_url"] == "https://cdn.example.com/generated-thumb.jpg"
    assert result["cover_frame_seconds"] == 20.0
    assert result["trim_start_seconds"] == 12.0
    assert result["trim_end_seconds"] == 12.1
    assert result["playback_rate"] == 2.0
    assert result["muted"] is True
    assert result["slow_motion_enabled"] is True
    assert result["slow_motion_start"] == 12.0
    assert result["slow_motion_end"] == 12.1


def test_create_reel_clamps_playback_to_minimum(monkeypatch: MonkeyPatch):
    fake_db = FakeDb()
    monkeypatch.setattr(social, "db", fake_db)

    async def fake_upload_video(contents: bytes, folder: str, filename: str) -> dict[str, Any]:
        return {
            "url": "https://cdn.example.com/reel.mp4",
            "public_id": "",
            "duration": 0,
        }

    async def fake_hydrate(tags: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return []

    async def fake_record(event_type: str, payload: dict[str, Any], user_id: Optional[str] = None) -> None:
        return None

    monkeypatch.setattr(social, "cloudinary_upload_video", fake_upload_video)
    monkeypatch.setattr(social, "_hydrate_tagged_products", fake_hydrate)
    monkeypatch.setattr(social, "_record_intelligence_signal", fake_record)

    result = asyncio.run(
        social.create_reel(
            file=cast(UploadFile, FakeUploadFile("video/mp4", b"video-bytes")),
            caption="",
            location="",
            cover_frame_seconds=-4,
            trim_start_seconds=-10,
            trim_end_seconds=-20,
            playback_rate=0.01,
            muted="false",
            slow_motion_enabled="false",
            slow_motion_start=-5,
            slow_motion_end=-1,
            product_id="",
            tagged_products_json="[]",
            user=cast(User, FakeUser()),
        )
    )

    assert result["cover_frame_seconds"] == 0.0
    assert result["trim_start_seconds"] == 0.0
    assert result["trim_end_seconds"] == 0.0
    assert result["playback_rate"] == 0.5
    assert result["muted"] is False
    assert result["slow_motion_enabled"] is False
    assert result["slow_motion_start"] == 0.0
    assert result["slow_motion_end"] == 0.0
