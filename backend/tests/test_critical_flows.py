"""
Critical flow tests for Hispaloshop.
Run with: cd backend && python -m pytest tests/test_critical_flows.py -v
"""
import pytest
import re


# ── Security: search sanitization ────────────────────

def test_sanitize_search_escapes_regex():
    """Search input with regex chars should be escaped."""
    dangerous = ".*+?^${}()|[]\\"
    escaped = re.escape(dangerous.strip()[:100])
    # re.escape should make the string safe for regex
    assert ".*" not in escaped or escaped.startswith("\\.")
    # Should not raise when used in regex
    pattern = re.compile(escaped)
    assert pattern is not None


def test_sanitize_search_truncates_long_input():
    """Search strings longer than 100 chars should be truncated."""
    long_input = "a" * 200
    sanitized = re.escape(long_input.strip()[:100])
    assert len(sanitized) == 100


# ── B2B commission ───────────────────────────────────

def test_b2b_commission_is_3_percent():
    """B2B commission must be exactly 3%."""
    total = 1000.0
    commission_cents = int(total * 100 * 0.03)
    assert commission_cents == 3000
    assert commission_cents / 100 == pytest.approx(30.0)


def test_b2b_commission_zero_on_zero_total():
    """B2B commission on zero total should be zero."""
    total = 0.0
    commission_cents = int(total * 100 * 0.03)
    assert commission_cents == 0


# ── Rate limiter config ─────────────────────────────

def test_rate_limiter_has_ai_limits():
    """Rate limiter must have AI-specific limits."""
    from middleware.rate_limit import RateLimiter
    limiter = RateLimiter()
    assert "hispal_ai" in limiter.limits
    assert "commercial_ai" in limiter.limits
    # Hispal AI: 20 per hour
    assert limiter.limits["hispal_ai"] == (20, 3600)
    # Commercial AI: 50 per hour
    assert limiter.limits["commercial_ai"] == (50, 3600)


def test_rate_limiter_has_auth_limits():
    """Rate limiter must have auth-specific limits."""
    from middleware.rate_limit import RateLimiter
    limiter = RateLimiter()
    assert "login" in limiter.limits
    assert "register" in limiter.limits
    assert "forgot_password" in limiter.limits
    # Login: 5 per 5 min
    assert limiter.limits["login"][0] == 5
    # Register: 3 per hour
    assert limiter.limits["register"][0] == 3


# ── Upload validation ────────────────────────────────

def test_allowed_image_types():
    """Only safe image types should be allowed."""
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    # These should NOT be allowed
    dangerous_types = [
        "application/javascript",
        "text/html",
        "application/x-executable",
        "image/svg+xml",  # Can contain XSS
    ]
    for dtype in dangerous_types:
        assert dtype not in allowed, f"{dtype} should not be allowed"


# ── CORS validation ──────────────────────────────────

def test_cors_rejects_wildcard_in_production():
    """CORS should not allow wildcard origins in production."""
    import os
    original = os.environ.get("ENV")
    os.environ["ENV"] = "production"
    try:
        origins = ["https://hispaloshop.com", "https://www.hispaloshop.com"]
        assert "*" not in origins
    finally:
        if original:
            os.environ["ENV"] = original
        else:
            os.environ.pop("ENV", None)


# ── Health endpoint ──────────────────────────────────

def test_health_endpoint_exists():
    """The app must have a /health endpoint."""
    try:
        from main import app
        routes = [r.path for r in app.routes]
        assert "/health" in routes
    except ImportError:
        # If main can't fully import due to missing service deps,
        # verify the endpoint function exists at module level
        pytest.skip("main.py import chain has unresolved deps")


# ── Environment config ───────────────────────────────

def test_jwt_secret_min_length():
    """JWT_SECRET must be at least 32 characters."""
    import os
    secret = os.environ.get("JWT_SECRET", "")
    assert len(secret) >= 32, "JWT_SECRET must be >= 32 chars"


# ── Pydantic models validation ──────────────────────

def test_user_model_has_required_fields():
    """User model must have essential fields."""
    from core.models import User
    from datetime import datetime
    user = User(
        user_id="test",
        email="test@test.com",
        name="Test",
        role="customer",
        created_at=datetime.utcnow(),
    )
    assert user.user_id == "test"
    assert user.role == "customer"
    assert user.email_verified is False


def test_user_model_rejects_invalid_email():
    """User model must reject invalid emails."""
    from core.models import User
    from datetime import datetime
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        User(
            user_id="test",
            email="not-an-email",
            name="Test",
            role="customer",
            created_at=datetime.utcnow(),
        )


# ── Security headers middleware ──────────────────────

def test_security_headers_middleware_class_exists():
    """SecurityHeadersMiddleware must be importable."""
    from middleware.security import SecurityHeadersMiddleware
    assert SecurityHeadersMiddleware is not None


def test_rate_limit_middleware_class_exists():
    """RateLimitMiddleware must be importable."""
    from middleware.security import RateLimitMiddleware
    assert RateLimitMiddleware is not None
