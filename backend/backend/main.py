"""Compatibility wrapper for `uvicorn backend.main:app` when cwd is /backend."""

import sys
from pathlib import Path

_PARENT_DIR = Path(__file__).resolve().parents[1]
if str(_PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(_PARENT_DIR))

from main import app

__all__ = ["app"]
