import os
import sys
from pathlib import Path


# Keep integration tests stable when REACT_APP_BACKEND_URL is not exported.
# Many test modules compute BASE_URL at import time.
if not os.environ.get("REACT_APP_BACKEND_URL"):
    os.environ["REACT_APP_BACKEND_URL"] = "http://localhost:8000"

# Allow running tests from repo root (`python -m pytest backend/tests/...`)
# while keeping imports like `from routers import ...` working.
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
