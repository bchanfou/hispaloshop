"""
Shared httpx.AsyncClient with connection pooling.
Import `shared_http` in any service that makes external HTTP calls.
Reusing a single client avoids the overhead of creating a new TCP connection per request.
"""
import httpx

# Module-level client — created once, reused across all async requests.
# FastAPI's event loop keeps it alive for the lifetime of the application.
shared_http = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0, connect=10.0),
    limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
    follow_redirects=True,
)
