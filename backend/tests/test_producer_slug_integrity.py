from types import SimpleNamespace

from sqlalchemy.exc import IntegrityError

from backend.routers.producer import _http_error_from_integrity_error, _is_slug_unique_violation


class _OrigError(Exception):
    def __init__(self, message: str, *, constraint_name: str | None = None, pgcode: str | None = None):
        super().__init__(message)
        self.diag = SimpleNamespace(constraint_name=constraint_name)
        self.pgcode = pgcode


def _integrity_error(orig: Exception) -> IntegrityError:
    return IntegrityError("INSERT", {}, orig)


def test_slug_unique_violation_detected_by_constraint_name():
    err = _integrity_error(_OrigError("duplicate key", constraint_name="uq_products_slug", pgcode="23505"))
    assert _is_slug_unique_violation(err) is True


def test_slug_unique_violation_not_detected_for_other_constraints():
    err = _integrity_error(_OrigError("foreign key violation", constraint_name="fk_products_category", pgcode="23503"))
    assert _is_slug_unique_violation(err) is False


def test_non_slug_integrity_maps_to_422_for_validation_like_errors():
    err = _integrity_error(_OrigError("null value in column", pgcode="23502"))
    http_exc = _http_error_from_integrity_error(err)
    assert http_exc.status_code == 422


def test_non_slug_integrity_maps_to_500_for_unexpected_errors():
    err = _integrity_error(_OrigError("some unexpected integrity problem", pgcode="99999"))
    http_exc = _http_error_from_integrity_error(err)
    assert http_exc.status_code == 500
