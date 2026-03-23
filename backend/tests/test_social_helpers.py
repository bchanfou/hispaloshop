"""
Regression tests for social route helper normalization.
"""

import os
import sys
from pathlib import Path


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

from routes.social import _normalize_tagged_products, _normalize_post_media


def test_normalize_tagged_products_handles_mixed_types():
    parsed = _normalize_tagged_products(
        [
            {"id": 123, "x": "12.5", "y": "bad"},
            {"productId": "  prod_9  ", "position_x": None, "position_y": "88"},
            {"product_id": ""},
            {"foo": "bar"},
        ]
    )

    assert len(parsed) == 2
    assert parsed[0]["product_id"] == "123"
    assert parsed[0]["x"] == 12.5
    assert parsed[0]["y"] == 50

    assert parsed[1]["product_id"] == "prod_9"
    assert parsed[1]["x"] == 50
    assert parsed[1]["y"] == 88


def test_normalize_post_media_handles_dict_and_fallback_image_url():
    post_dict_media = {"media": {"url": "https://cdn.example.com/a.jpg", "type": "image"}}
    normalized_dict_media = _normalize_post_media(post_dict_media)

    assert isinstance(normalized_dict_media["media"], list)
    assert normalized_dict_media["media"][0]["url"] == "https://cdn.example.com/a.jpg"
    assert normalized_dict_media["image_url"] == "https://cdn.example.com/a.jpg"

    post_bad_media = {"media": ["bad", {"type": "image"}], "image_url": "https://cdn.example.com/fallback.jpg"}
    normalized_bad_media = _normalize_post_media(post_bad_media)

    assert len(normalized_bad_media["media"]) == 1
    assert normalized_bad_media["media"][0]["url"] == "https://cdn.example.com/fallback.jpg"
    assert normalized_bad_media["image_url"] == "https://cdn.example.com/fallback.jpg"
