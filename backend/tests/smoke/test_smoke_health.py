"""
Health endpoint smoke tests.

Verifies that /health and /api/health respond with the expected shape.
Both endpoints call `_health_payload()` which pings MongoDB; when DB is
unreachable (CI without Mongo service) the status reports "degraded" but
the endpoint still returns 200 so Railway's healthcheck can distinguish
"down" (no response) from "partial" (DB unreachable).
"""
import pytest

pytestmark = pytest.mark.smoke


class TestHealthEndpoints:

    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    async def test_health_payload_shape(self, client):
        response = await client.get("/health")
        data = response.json()
        # Required keys (documented in /health contract)
        for key in ("status", "version", "environment", "db", "timestamp"):
            assert key in data, f"health payload missing key '{key}'"

    async def test_health_status_is_ok_or_degraded(self, client):
        response = await client.get("/health")
        data = response.json()
        assert data["status"] in ("ok", "degraded")

    async def test_health_version_is_set(self, client):
        response = await client.get("/health")
        assert response.json()["version"] == "1.0.0"

    async def test_api_health_legacy_path_works(self, client):
        """GET /api/health must be an alias of /health (legacy monitors)."""
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    async def test_health_is_csrf_exempt(self, client):
        """Health must be callable by external monitors without any auth/cookies."""
        response = await client.get("/health")
        assert response.status_code == 200
        # No CSRF 403
        assert "CSRF" not in response.text
