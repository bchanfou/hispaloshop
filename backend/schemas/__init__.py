"""
Compatibility bridge for legacy imports: ``from schemas import ...``.

Primary request/response schemas live in ``_future_postgres.schemas``.
"""

from _future_postgres.schemas import *  # noqa: F401,F403

