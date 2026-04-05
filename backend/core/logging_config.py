"""
Structured logging configuration.

- In production (ENV=production or staging): JSON formatter — compatible with
  Railway / Datadog / Sentry log aggregation.
- In development: human-readable colored-ish formatter for local terminals.
- Log level configurable via LOG_LEVEL env var (DEBUG|INFO|WARNING|ERROR|CRITICAL).

Call `configure_logging()` ONCE at the very top of main.py, before any other
imports that might log. After that every module can use
`logger = logging.getLogger(__name__)` and it will inherit the config.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any


_LOG_LEVEL_DEFAULT = "INFO"
_JSON_FIELDS_RESERVED = {
    "args", "asctime", "created", "exc_info", "exc_text", "filename",
    "funcName", "levelname", "levelno", "lineno", "module", "msecs",
    "message", "msg", "name", "pathname", "process", "processName",
    "relativeCreated", "stack_info", "thread", "threadName",
}


class JsonFormatter(logging.Formatter):
    """Minimal JSON log formatter — one event per line, stable field set."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Include extra fields passed via logger.info("msg", extra={...})
        for key, value in record.__dict__.items():
            if key in _JSON_FIELDS_RESERVED or key.startswith("_"):
                continue
            try:
                json.dumps(value)  # only serializable values
                payload[key] = value
            except (TypeError, ValueError):
                payload[key] = repr(value)
        return json.dumps(payload, ensure_ascii=False)


class DevFormatter(logging.Formatter):
    """Human-readable formatter for local development."""

    def __init__(self) -> None:
        super().__init__(
            fmt="%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        )


def configure_logging() -> None:
    """
    Configure root logger. Safe to call multiple times (idempotent).
    """
    level_name = os.environ.get("LOG_LEVEL", _LOG_LEVEL_DEFAULT).upper()
    level = getattr(logging, level_name, logging.INFO)

    env = (os.environ.get("ENV") or os.environ.get("ENVIRONMENT") or "development").lower()
    use_json = env in {"production", "staging"}

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if use_json else DevFormatter())

    root = logging.getLogger()
    # Remove prior handlers to avoid duplicate output when reimported by uvicorn
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet down a few chatty libraries in production
    if use_json:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("pymongo").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)

    root.info(
        "logging configured",
        extra={"log_level": level_name, "format": "json" if use_json else "dev"},
    )
