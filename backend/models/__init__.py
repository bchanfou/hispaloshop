"""
Compatibility bridge for legacy imports: ``from models import ...``.

The actively maintained SQLAlchemy models live in ``_future_postgres.models``.
"""

from _future_postgres.models import *  # noqa: F401,F403

