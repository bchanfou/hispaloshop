from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy.sql.elements import ColumnElement

from models import Product


def active_product_filters(category_id: Optional[UUID] = None) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = [Product.status == "active"]
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    return filters

