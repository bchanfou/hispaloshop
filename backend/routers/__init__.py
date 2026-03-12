"""
Compatibility layer for legacy imports like ``from routers import auth``.

Canonical router modules live under ``_future_postgres.routers``.
This shim lazily resolves submodules so importing ``routers`` itself does not
eagerly import heavy optional dependencies.
"""

from importlib import import_module

_source_pkg = import_module("_future_postgres.routers")

# Reuse the source package path so statements like `import routers.auth`
# transparently resolve to backend/_future_postgres/routers/auth.py.
__path__ = _source_pkg.__path__


def __getattr__(name: str):
    module = import_module(f"{__name__}.{name}")
    globals()[name] = module
    return module

