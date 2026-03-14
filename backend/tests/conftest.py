import os
import sys
import socket
from pathlib import Path
from urllib.parse import urlparse

import pytest

# Keep import-time BASE_URL logic in legacy integration tests from crashing
# during collection when env var is missing.
if not os.environ.get("REACT_APP_BACKEND_URL"):
    os.environ["REACT_APP_BACKEND_URL"] = "http://localhost:8000"

# Minimal env vars so the FastAPI app can be imported in test mode
os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")


# Allow running tests from repo root (`python -m pytest backend/tests/...`)
# while keeping imports like `from routers import ...` working.
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


def _is_backend_reachable() -> bool:
    """
    Returns True when REACT_APP_BACKEND_URL points to a reachable TCP host.
    Integration tests in this repository use live HTTP requests.
    """
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not base_url:
        return False

    parsed = urlparse(base_url)
    host = parsed.hostname
    if not host:
        return False

    if parsed.port:
        port = parsed.port
    elif parsed.scheme == "https":
        port = 443
    else:
        port = 80

    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


def pytest_collection_modifyitems(config, items):
    """
    Skip live API tests by default when the backend URL is not reachable.
    Opt in with LIVE_API_TESTS=1.
    """
    if os.environ.get("LIVE_API_TESTS") == "1":
        return

    backend_is_up = _is_backend_reachable()
    if backend_is_up:
        return

    skip_live = pytest.mark.skip(
        reason="Live API tests skipped: set REACT_APP_BACKEND_URL to a running backend or LIVE_API_TESTS=1"
    )
    for item in items:
        # Integration/E2E modules in this repo import the requests library.
        if hasattr(item.module, "requests"):
            item.add_marker(skip_live)
