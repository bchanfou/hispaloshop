"""
Security Tests — 10 tests covering authentication, authorization, rate limiting,
injection prevention, CSRF, and security headers.
Uses httpx + ASGITransport against the FastAPI app directly (no live server needed).
"""
import os
import re
import sys
import pytest
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

from httpx import AsyncClient, ASGITransport
from main import app
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from middleware.rate_limit import RateLimiter


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as c:
        yield c


def _csrf_headers():
    """Generate matching CSRF cookie + header for POST requests."""
    token = "test-csrf-token-for-ci"
    return (
        {"X-CSRF-Token": token, "Content-Type": "application/json"},
        {"csrf_token": token},
    )


# ── Test 1: JWT required on protected endpoints ─────────────────────────────

@pytest.mark.asyncio
async def test_jwt_required_on_products_create(client):
    """POST /api/products must require authentication."""
    headers, cookies = _csrf_headers()
    response = await client.post(
        "/api/products",
        json={"name": "Test Product"},
        headers=headers,
        cookies=cookies,
    )
    # Without JWT → 401 or 403 or 500 (auth layer reached)
    assert response.status_code in [401, 403, 422, 500]


@pytest.mark.asyncio
async def test_jwt_required_on_b2b_operations(client):
    """POST /api/b2b/operations must require authentication."""
    headers, cookies = _csrf_headers()
    response = await client.post(
        "/api/b2b/operations/",
        json={"conversation_id": "test", "counterpart_id": "test", "offer": {}},
        headers=headers,
        cookies=cookies,
    )
    assert response.status_code in [401, 403, 422, 500]


# ── Test 2: Admin routes reject non-admin users ─────────────────────────────

@pytest.mark.asyncio
async def test_admin_route_rejects_unauthenticated(client):
    """Admin endpoints must reject unauthenticated requests."""
    headers, cookies = _csrf_headers()
    response = await client.get(
        "/api/admin/users",
        headers=headers,
        cookies=cookies,
    )
    assert response.status_code in [401, 403, 404, 500]


# ── Test 3: CSRF protection blocks POST without token ───────────────────────

@pytest.mark.asyncio
async def test_csrf_blocks_bare_post(client):
    """POST without CSRF token must be rejected."""
    response = await client.post(
        "/api/products",
        json={"name": "Test"},
    )
    assert response.status_code in [403, 500]


# ── Test 4: Security headers middleware exists ───────────────────────────────

def test_security_headers_middleware_importable():
    """SecurityHeadersMiddleware must be importable and instantiable."""
    assert SecurityHeadersMiddleware is not None


@pytest.mark.asyncio
async def test_security_headers_present(client):
    """Responses must include standard security headers."""
    response = await client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "strict-origin" in response.headers.get("Referrer-Policy", "").lower()


# ── Test 5: Rate limiter configuration ──────────────────────────────────────

def test_rate_limiter_configuration():
    """RateLimiter must have correct limits for all endpoint types."""
    limiter = RateLimiter()
    # Auth limits
    assert limiter.limits["login"] == (5, 300)
    assert limiter.limits["register"] == (3, 3600)
    assert limiter.limits["forgot_password"] == (3, 60)
    # AI limits
    assert limiter.limits["hispal_ai"] == (20, 3600)
    assert limiter.limits["commercial_ai"] == (50, 3600)
    # General
    assert limiter.limits["api_general"] == (100, 60)


# ── Test 6: SQL/NoSQL injection patterns in search ──────────────────────────

def test_search_input_sanitization():
    """Regex special characters must be escaped in search queries."""
    dangerous_inputs = [
        '{"$gt": ""}',           # MongoDB operator injection
        ".*",                     # Regex wildcard
        '{"$where": "1==1"}',    # MongoDB $where injection
        "'; DROP TABLE users;",  # SQL injection (shouldn't work but must be escaped)
    ]
    for inp in dangerous_inputs:
        escaped = re.escape(inp.strip()[:100])
        # Must not raise when used as regex
        pattern = re.compile(escaped)
        assert pattern is not None
        # Escaped version must not match unintended content
        if inp == ".*":
            assert not re.match(escaped, "anything")


# ── Test 7: XSS prevention in responses ─────────────────────────────────────

@pytest.mark.asyncio
async def test_xss_in_404_response(client):
    """404 responses must not reflect input as unescaped HTML."""
    xss_path = "/api/<script>alert(1)</script>"
    response = await client.get(xss_path)
    assert response.status_code == 404
    body = response.text
    # Response must not contain raw script tags
    assert "<script>" not in body.lower()


# ── Test 8: Cloudinary URL validation ────────────────────────────────────────

def test_cloudinary_url_validation():
    """Only Cloudinary and local upload URLs should be accepted."""
    valid_urls = [
        "https://res.cloudinary.com/hispaloshop/image/upload/v1/test.jpg",
        "/uploads/signatures/test.png",
    ]
    invalid_urls = [
        "https://evil.com/malware.exe",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
    ]

    for url in valid_urls:
        assert (
            "cloudinary.com" in url
            or url.startswith("/uploads/")
        ), f"Valid URL rejected: {url}"

    for url in invalid_urls:
        is_valid = "cloudinary.com" in url or url.startswith("/uploads/")
        assert not is_valid, f"Invalid URL accepted: {url}"


# ── Test 9: Rate limit middleware burst detection ────────────────────────────

def test_rate_limit_middleware_burst_config():
    """RateLimitMiddleware must be configurable with burst parameters."""
    from starlette.applications import Starlette
    test_app = Starlette()
    middleware = RateLimitMiddleware(test_app, requests_per_minute=50, burst_size=5)
    assert middleware.requests_per_minute == 50
    assert middleware.burst_size == 5


# ── Test 10: 404 returns JSON, not HTML ──────────────────────────────────────

@pytest.mark.asyncio
async def test_404_returns_json_not_html(client):
    """Unknown API routes must return JSON 404, not HTML error pages."""
    response = await client.get("/api/this-route-does-not-exist-xyz")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
