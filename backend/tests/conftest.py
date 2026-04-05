"""
Central test configuration — fixtures + env var setup.

All env vars required for `import main` are set HERE (once, via a session-scoped
autouse fixture), NOT via dispersed `os.environ.setdefault` in each test file.
This is the single source of truth for test env configuration.

Two categories of tests coexist in this directory:
1. **Smoke tests** (backend/tests/smoke/, test_security.py, test_fiscal.py, ...)
   Use fixtures from this conftest: `client`, `mock_anthropic`, etc.
   They use httpx+ASGITransport against the FastAPI app — no live server needed.

2. **Legacy integration tests** (test_iteration_*.py, test_hispaloshop_api.py, ...)
   They use the `requests` library against `REACT_APP_BACKEND_URL`. They are
   auto-skipped via `pytest_collection_modifyitems` when no backend is reachable.
   Do not add new tests of this kind — write smoke tests instead.
"""
from __future__ import annotations

import os
import socket
import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest


# ═══════════════════════════════════════════════════════════════════════════
# 1. PATH SETUP — allow `from main import app` and `from routes import ...`
# ═══════════════════════════════════════════════════════════════════════════
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


# ═══════════════════════════════════════════════════════════════════════════
# 2. ENV VARS — set once, before `main` or any module that reads settings
# ═══════════════════════════════════════════════════════════════════════════
# These must be set at module import time (not inside a fixture) because
# some tests do `from main import app` at file top, which triggers
# `core.config.Settings()` which raises if JWT_SECRET / MONGO_URL are missing.
_TEST_ENV = {
    "ENV": "development",
    "JWT_SECRET": "test-secret-for-ci-hispaloshop-32chars-long-ok!",
    "MONGO_URL": "mongodb://localhost:27017/hispaloshop_test",
    "DB_NAME": "hispaloshop_test",
    "FRONTEND_URL": "http://localhost:3000",
    "AUTH_BACKEND_URL": "http://localhost:8000",
    "BACKEND_URL": "http://localhost:8000",
    "ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:5173",
    "LOG_LEVEL": "WARNING",  # quiet test output
    "CSRF_ENABLED": "true",
    # Legacy integration tests read this via requests library
    "REACT_APP_BACKEND_URL": "http://localhost:8000",
}
for key, value in _TEST_ENV.items():
    os.environ.setdefault(key, value)


# ═══════════════════════════════════════════════════════════════════════════
# 3. FIXTURES — reusable across smoke tests
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture
async def client():
    """
    httpx AsyncClient wrapping the FastAPI app via ASGITransport.
    No live server needed — tests hit the app in-process.
    """
    from httpx import ASGITransport, AsyncClient
    from main import app

    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as c:
        yield c


@pytest.fixture
def mock_anthropic(monkeypatch):
    """
    Mock Anthropic SDK so David / Rebeca / Commercial AI tests don't hit the real API.
    Returns a canned response that tests can assert against.
    """
    class _FakeContent:
        def __init__(self, text: str):
            self.text = text
            self.type = "text"

    class _FakeMessage:
        def __init__(self, text: str = "David responde: probando."):
            self.content = [_FakeContent(text)]
            self.stop_reason = "end_turn"
            self.usage = type("Usage", (), {"input_tokens": 10, "output_tokens": 20})()
            self.id = "msg_test_fake"
            self.model = "claude-haiku-4-5-20251001"
            self.role = "assistant"

    class _FakeMessages:
        def create(self, **kwargs):
            return _FakeMessage()

    class _FakeAnthropic:
        def __init__(self, *args, **kwargs):
            self.messages = _FakeMessages()

    # Patch both the sync client and the async one if used
    try:
        import anthropic  # noqa: F401
        monkeypatch.setattr("anthropic.Anthropic", _FakeAnthropic)
    except ImportError:
        pass  # anthropic not installed in this test run

    return _FakeAnthropic


@pytest.fixture
def mock_stripe(monkeypatch):
    """
    Mock Stripe SDK calls so payment/webhook tests don't hit Stripe.
    Returns canned fake objects for Session, PaymentIntent, Transfer.
    """
    class _Obj(dict):
        """dict that also supports attribute access (like stripe's objects)."""
        def __getattr__(self, name):
            try:
                return self[name]
            except KeyError as e:
                raise AttributeError(name) from e

    def _fake_session_create(**kwargs):
        return _Obj(
            id="cs_test_fake_session_id",
            url="https://checkout.stripe.com/c/pay/cs_test_fake",
            payment_status="unpaid",
            amount_total=kwargs.get("line_items", [{}])[0].get("price_data", {}).get("unit_amount", 0),
            metadata=kwargs.get("metadata", {}),
        )

    def _fake_payment_intent_create(**kwargs):
        return _Obj(
            id="pi_test_fake",
            client_secret="pi_test_fake_secret",
            status="requires_payment_method",
            amount=kwargs.get("amount", 0),
            currency=kwargs.get("currency", "eur"),
        )

    def _fake_transfer_create(**kwargs):
        return _Obj(
            id="tr_test_fake",
            amount=kwargs.get("amount", 0),
            currency=kwargs.get("currency", "eur"),
            destination=kwargs.get("destination", ""),
        )

    def _fake_webhook_construct(payload, sig_header, secret):
        import json
        data = json.loads(payload) if isinstance(payload, (str, bytes)) else payload
        return _Obj(**data)

    try:
        import stripe
        monkeypatch.setattr(stripe.checkout.Session, "create", _fake_session_create)
        monkeypatch.setattr(stripe.PaymentIntent, "create", _fake_payment_intent_create)
        monkeypatch.setattr(stripe.Transfer, "create", _fake_transfer_create)
        monkeypatch.setattr(stripe.Webhook, "construct_event", _fake_webhook_construct)
    except ImportError:
        pass

    return {
        "session_create": _fake_session_create,
        "payment_intent_create": _fake_payment_intent_create,
        "transfer_create": _fake_transfer_create,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 4. LEGACY INTEGRATION TEST SKIP — preserves existing behavior
# ═══════════════════════════════════════════════════════════════════════════
def _is_backend_reachable() -> bool:
    """True when REACT_APP_BACKEND_URL points to a reachable TCP host."""
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not base_url:
        return False

    parsed = urlparse(base_url)
    host = parsed.hostname
    if not host:
        return False

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


def pytest_collection_modifyitems(config, items):
    """
    Skip live integration tests (test_iteration_*, etc.) by default when the
    backend URL is not reachable. Opt in with LIVE_API_TESTS=1.

    A test is considered "live integration" if its module imports the `requests`
    library at top level — this heuristic matches all test_iteration_* files.
    """
    if os.environ.get("LIVE_API_TESTS") == "1":
        return

    if _is_backend_reachable():
        return

    skip_live = pytest.mark.skip(
        reason="Live API test skipped: backend not reachable. Set LIVE_API_TESTS=1 to run."
    )
    for item in items:
        if hasattr(item.module, "requests"):
            item.add_marker(skip_live)


# ═══════════════════════════════════════════════════════════════════════════
# 5. MARKERS
# ═══════════════════════════════════════════════════════════════════════════
def pytest_configure(config):
    """Register custom markers so pytest doesn't warn about unknown marks."""
    config.addinivalue_line(
        "markers",
        "smoke: fast, critical-path smoke tests (run in CI on every PR)",
    )
    config.addinivalue_line(
        "markers",
        "integration: integration tests that hit a real backend or DB",
    )
    config.addinivalue_line(
        "markers",
        "slow: tests that take >5s (excluded from default smoke runs)",
    )
    config.addinivalue_line(
        "markers",
        "commission: commission split accuracy tests (critical for revenue)",
    )
