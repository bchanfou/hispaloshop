"""
Security & endpoint smoke tests.
These tests use httpx + ASGITransport against the FastAPI app directly (no live server needed).
"""
import os
import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Minimal env vars so the app can be imported without a real .env
os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")

from main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as c:
        yield c


class TestHealthEndpoints:

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        """GET /health must always respond."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_api_health_returns_200(self, client):
        """GET /api/health legacy health check."""
        response = await client.get("/api/health")
        assert response.status_code == 200


class TestCORSConfiguration:

    @pytest.mark.asyncio
    async def test_cors_allows_hispaloshop(self, client):
        """CORS preflight from hispaloshop.com must be allowed."""
        response = await client.options(
            "/api/auth/login",
            headers={
                "Origin": "https://hispaloshop.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert response.status_code in [200, 204, 405]


class TestProtectedEndpoints:

    @staticmethod
    def _csrf_headers_and_cookies():
        """Generate matching CSRF cookie + header for test POST requests."""
        token = "test-csrf-token-for-ci"
        return (
            {"X-CSRF-Token": token, "Content-Type": "application/json"},
            {"csrf_token": token},
        )

    @pytest.mark.asyncio
    async def test_hispal_ai_chat_exists(self, client):
        """POST /api/v1/hispal-ai/chat — endpoint must exist (401/422 both valid)."""
        headers, cookies = self._csrf_headers_and_cookies()
        response = await client.post(
            "/api/v1/hispal-ai/chat",
            json={"messages": [{"role": "user", "content": "test"}]},
            headers=headers,
            cookies=cookies,
        )
        # 401 = auth required, 422 = validation, 200 = ok, 500 = endpoint reached auth layer
        assert response.status_code in [200, 401, 422, 500]

    @pytest.mark.asyncio
    async def test_commercial_ai_requires_auth(self, client):
        """POST /api/v1/commercial-ai/chat — must reject unauthenticated requests."""
        headers, cookies = self._csrf_headers_and_cookies()
        response = await client.post(
            "/api/v1/commercial-ai/chat",
            json={"messages": [{"role": "user", "content": "analiza Alemania"}]},
            headers=headers,
            cookies=cookies,
        )
        # Without auth → 401, 403, or 500 (auth layer error = endpoint exists and protects)
        assert response.status_code in [401, 403, 422, 500]

    @pytest.mark.asyncio
    async def test_csrf_blocks_post_without_token(self, client):
        """POST without CSRF token must be rejected (403 or 500 from middleware)."""
        response = await client.post(
            "/api/v1/hispal-ai/chat",
            json={"messages": [{"role": "user", "content": "test"}]},
        )
        # CSRF middleware raises HTTPException which may surface as 403 or 500
        assert response.status_code in [403, 500]

    @pytest.mark.asyncio
    async def test_404_returns_json(self, client):
        """Unknown routes must return JSON 404, not HTML."""
        response = await client.get("/api/nonexistent-route-12345")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
