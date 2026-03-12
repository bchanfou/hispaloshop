"""
Compatibility bridge for legacy imports: ``from database import ...``.

Canonical async database objects live in ``_future_postgres.database``.
"""

from _future_postgres.database import *  # noqa: F401,F403

