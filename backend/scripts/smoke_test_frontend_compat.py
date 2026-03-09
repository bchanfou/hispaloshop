"""
Smoke tests for the frontend compatibility layer in production/staging.

Usage:
    python backend/scripts/smoke_test_frontend_compat.py --base-url https://api.hispaloshop.com
    python backend/scripts/smoke_test_frontend_compat.py --base-url https://api.hispaloshop.com --token <TOKEN>
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, Optional
from urllib import error, request


DEFAULT_ORIGIN = "https://hispaloshop.com"


def _http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
) -> tuple[int, Dict[str, str], str]:
    encoded_body = None
    req_headers = dict(headers or {})
    if body is not None:
        encoded_body = json.dumps(body).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")

    req = request.Request(url=url, method=method, headers=req_headers, data=encoded_body)
    try:
        with request.urlopen(req, timeout=20) as response:
            payload = response.read().decode("utf-8", errors="replace")
            return response.status, dict(response.headers.items()), payload
    except error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        return exc.code, dict(exc.headers.items()), payload


def _pretty_json(payload: str) -> str:
    try:
        return json.dumps(json.loads(payload), indent=2, ensure_ascii=False)
    except Exception:
        return payload


def _assert(condition: bool, success: str, failure: str) -> bool:
    if condition:
        print(f"[PASS] {success}")
        return True
    print(f"[FAIL] {failure}")
    return False


def run(base_url: str, token: Optional[str], origin: str) -> int:
    base_url = base_url.rstrip("/")
    auth_headers = {"Authorization": f"Bearer {token}"} if token else {}
    failures = 0

    print(f"Running smoke tests against {base_url}")
    print("")

    status, headers, body = _http_request(
        f"{base_url}/api/stories",
        method="OPTIONS",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    cors_ok = (
        status in (200, 204)
        and headers.get("access-control-allow-origin") == origin
        and "GET" in headers.get("access-control-allow-methods", "")
    )
    if not _assert(cors_ok, "CORS preflight /api/stories", f"CORS preflight failed: status={status}, headers={headers}"):
        failures += 1

    checks = [
        ("GET /api/stories", "GET", "/api/stories", None, lambda s, p: s == 200),
        ("GET /api/config/locale", "GET", "/api/config/locale", None, lambda s, p: s == 200 and "country_code" in p),
        ("GET /api/auth/me (anonymous)", "GET", "/api/auth/me", None, lambda s, p: s in (200, 401)),
        ("GET /api/exchange-rates", "GET", "/api/exchange-rates", None, lambda s, p: s == 200 and "rates" in p),
        ("GET /api/feed?scope=following", "GET", "/api/feed?scope=following", None, lambda s, p: s == 200 and "posts" in p),
        ("POST /api/track/visit", "POST", "/api/track/visit", {"path": "/smoke-test", "referrer": "https://google.com"}, lambda s, p: s == 200 and p.get("success") is True),
        ("GET /api/auth/google/url", "GET", "/api/auth/google/url", None, lambda s, p: s in (200, 500)),
    ]

    for label, method, path, payload, validator in checks:
        status, _, body = _http_request(f"{base_url}{path}", method=method, headers=auth_headers, body=payload)
        try:
            parsed = json.loads(body) if body else {}
        except Exception:
            parsed = {}
        ok = validator(status, parsed)
        if not _assert(ok, label, f"{label} failed: status={status}, body={_pretty_json(body)}"):
            failures += 1

    if token:
        status, _, body = _http_request(f"{base_url}/api/auth/me", headers=auth_headers)
        try:
            parsed = json.loads(body) if body else {}
        except Exception:
            parsed = {}
        ok = status in (200, 401) and (status == 401 or "user_id" in parsed or "email" in parsed)
        if not _assert(ok, "GET /api/auth/me (with token)", f"Authenticated /api/auth/me failed: status={status}, body={_pretty_json(body)}"):
            failures += 1

    print("")
    if failures:
        print(f"Completed with {failures} failing check(s).")
        return 1

    print("All smoke checks passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke tests for frontend compatibility endpoints.")
    parser.add_argument("--base-url", required=True, help="API base URL, e.g. https://api.hispaloshop.com")
    parser.add_argument("--token", default=None, help="Optional bearer token for authenticated checks")
    parser.add_argument("--origin", default=DEFAULT_ORIGIN, help=f"Origin header for CORS preflight. Default: {DEFAULT_ORIGIN}")
    args = parser.parse_args()
    return run(base_url=args.base_url, token=args.token, origin=args.origin)


if __name__ == "__main__":
    sys.exit(main())
