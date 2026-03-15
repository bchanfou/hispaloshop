"""
Content Moderation Tests — 8 tests covering the alcohol blocklist,
exception handling, and keyword detection logic.
Tests the synchronous _is_alcohol_product function (no AI calls needed).
"""
import pytest

import sys, os
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")

from services.content_moderation import (
    _is_alcohol_product,
    ALCOHOL_KEYWORDS,
    ALCOHOL_EXCEPTIONS,
    _parse_ai_json,
)


# ── Test 1: Alcohol product is blocked ──────────────────────────────────────

def test_alcohol_product_blocked():
    """Products with alcohol keywords in the name must be blocked."""
    result = _is_alcohol_product("Vino tinto Rioja Reserva 2019")
    assert result is not None
    assert result["decision"] == "blocked"
    assert result["violation_type"] == "alcohol"
    assert result["confidence"] == "high"


def test_beer_blocked():
    """Beer products must be blocked."""
    result = _is_alcohol_product("Cerveza artesanal IPA")
    assert result is not None
    assert result["decision"] == "blocked"
    assert "cerveza" in result["reason"].lower()


def test_whisky_blocked():
    """Whisky products must be blocked."""
    result = _is_alcohol_product("Whisky escocés 12 años")
    assert result is not None
    assert result["decision"] == "blocked"


# ── Test 2: Vinegar is allowed (exception) ──────────────────────────────────

def test_vinegar_allowed():
    """Vinegar (vinagre) must be allowed — it's not alcohol."""
    result = _is_alcohol_product("Vinagre de Jerez Reserva")
    assert result is None  # None means allowed


# ── Test 3: Vanilla is allowed (exception) ──────────────────────────────────

def test_vanilla_allowed():
    """Vanilla (vainilla) must be allowed — contains 'vino' substring but is food."""
    result = _is_alcohol_product("Extracto de vainilla premium")
    assert result is None


# ── Test 4: Non-food items pass alcohol check (handled by AI later) ─────────

def test_cutting_board_passes_alcohol_check():
    """Non-alcohol non-food items should pass the alcohol check (AI handles category)."""
    result = _is_alcohol_product("Tabla de cortar de madera de olivo")
    assert result is None  # Alcohol check doesn't block non-alcohol items


# ── Test 5: Multilingual keyword detection ──────────────────────────────────

def test_multilingual_alcohol_detection():
    """Alcohol keywords in multiple languages must be detected."""
    # English
    result_wine = _is_alcohol_product("Red Wine Organic")
    assert result_wine is not None and result_wine["decision"] == "blocked"

    # French
    result_biere = _is_alcohol_product("Bière artisanale belge")
    assert result_biere is not None and result_biere["decision"] == "blocked"

    # Italian
    result_birra = _is_alcohol_product("Birra artigianale")
    assert result_birra is not None and result_birra["decision"] == "blocked"

    # Korean
    result_soju = _is_alcohol_product("소주 전통")
    assert result_soju is not None and result_soju["decision"] == "blocked"


# ── Test 6: Alcohol-free is allowed ─────────────────────────────────────────

def test_alcohol_free_allowed():
    """Products labeled 'sin alcohol' or 'alcohol-free' must be allowed."""
    result1 = _is_alcohol_product("Cerveza sin alcohol")
    assert result1 is None

    result2 = _is_alcohol_product("Alcohol-free beer")
    assert result2 is None


# ── Test 7: AI JSON parser handles code blocks ──────────────────────────────

def test_parse_ai_json_handles_code_blocks():
    """_parse_ai_json must strip markdown code fences from AI responses."""
    raw = '```json\n{"action": "approve", "reason": null}\n```'
    result = _parse_ai_json(raw)
    assert result["action"] == "approve"

    raw_plain = '{"decision": "allowed"}'
    result2 = _parse_ai_json(raw_plain)
    assert result2["decision"] == "allowed"


# ── Test 8: Alcohol keywords and exceptions sets are non-empty ───────────────

def test_keyword_sets_are_populated():
    """ALCOHOL_KEYWORDS and ALCOHOL_EXCEPTIONS must be populated."""
    assert len(ALCOHOL_KEYWORDS) >= 30, "Should have at least 30 alcohol keywords"
    assert len(ALCOHOL_EXCEPTIONS) >= 5, "Should have at least 5 exception phrases"

    # Verify key entries
    assert "vino" in ALCOHOL_KEYWORDS
    assert "beer" in ALCOHOL_KEYWORDS
    assert "sake" in ALCOHOL_KEYWORDS
    assert "vinagre" in ALCOHOL_EXCEPTIONS
    assert "vainilla" in ALCOHOL_EXCEPTIONS
