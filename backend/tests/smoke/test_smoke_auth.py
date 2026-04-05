"""
Auth endpoints smoke tests.

Verifies that the critical auth endpoints exist, enforce validation, and
reject invalid credentials. These tests do NOT require a live MongoDB —
they verify the HTTP contract (status codes + response shape) via the
FastAPI app in-process.

Full happy-path auth flows (register → verify email → login → cart) are
covered end-to-end by the Playwright E2E suite (frontend/e2e/).
"""
import pytest

pytestmark = pytest.mark.smoke


class TestAuthEndpointsExist:
    """Each auth endpoint must be reachable via the app in-process."""

    async def test_register_endpoint_exists(self, client):
        # Empty body → 422 validation error, but route exists
        response = await client.post("/api/auth/register", json={})
        # 422 = route reached, validation failed. 404 = route missing.
        assert response.status_code != 404
        assert response.status_code in (422, 400, 403, 500)

    async def test_login_endpoint_exists(self, client):
        response = await client.post("/api/auth/login", json={})
        assert response.status_code != 404
        assert response.status_code in (422, 400, 401, 500)

    async def test_verify_email_endpoint_exists(self, client):
        response = await client.post("/api/auth/verify-email", json={})
        assert response.status_code != 404
        assert response.status_code in (422, 400, 404, 500)


class TestAuthValidation:
    """Validation rules that must fire before any DB lookup."""

    async def test_register_rejects_missing_email(self, client):
        response = await client.post(
            "/api/auth/register",
            json={"password": "test12345", "name": "Test"},
        )
        assert response.status_code in (422, 400)

    async def test_register_rejects_invalid_email_format(self, client):
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "password": "strongPassword123",
                "name": "Test User",
            },
        )
        assert response.status_code in (422, 400)

    async def test_register_rejects_weak_password(self, client):
        """Password too short should be rejected at validation."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "test@hispaloshop.test",
                "password": "a",
                "name": "Test",
            },
        )
        assert response.status_code in (422, 400)

    async def test_login_rejects_missing_password(self, client):
        response = await client.post(
            "/api/auth/login",
            json={"email": "test@hispaloshop.test"},
        )
        assert response.status_code in (422, 400, 401)


class TestAuthSecurity:
    """Security guarantees that must hold even without a DB."""

    async def test_login_does_not_leak_user_existence(self, client):
        """
        Invalid login should return 401 with a generic message, not a specific
        "user not found" that would help attackers enumerate accounts.
        """
        response = await client.post(
            "/api/auth/login",
            json={"email": "nobody@hispaloshop.test", "password": "wrongpass"},
        )
        # 401/400/500 all acceptable; 404 is NOT (would leak existence)
        assert response.status_code != 404
        if response.status_code == 401:
            detail = response.json().get("detail", "").lower()
            # Must not contain "user not found" or "no such email"
            assert "not found" not in detail
            assert "no existe" not in detail

    async def test_register_and_login_are_csrf_exempt(self, client):
        """
        Registration and login must be callable without a prior CSRF cookie —
        a new user has no session yet. Documented in middleware/csrf.py.
        """
        # If CSRF blocked this, status would be 403 "CSRF token missing"
        response = await client.post(
            "/api/auth/register",
            json={"email": "x@y.z", "password": "short", "name": "X"},
        )
        # Validation 422/400 is fine; 403 "CSRF token missing" would be a regression
        assert response.status_code != 403 or "CSRF" not in response.json().get("detail", "")
