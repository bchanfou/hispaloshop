"""
Sitemap XML endpoint — dynamically generated from MongoDB collections.
GET /sitemap.xml
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import Response

from core.database import get_db

router = APIRouter()

STATIC_PAGES = [
    {"loc": "/", "changefreq": "daily", "priority": "1.0"},
    {"loc": "/products", "changefreq": "daily", "priority": "0.9"},
    {"loc": "/stores", "changefreq": "daily", "priority": "0.9"},
    {"loc": "/recipes", "changefreq": "weekly", "priority": "0.8"},
    {"loc": "/discover", "changefreq": "daily", "priority": "0.8"},
    {"loc": "/que-es", "changefreq": "monthly", "priority": "0.6"},
    {"loc": "/soy-influencer", "changefreq": "monthly", "priority": "0.6"},
    {"loc": "/soy-productor", "changefreq": "monthly", "priority": "0.6"},
    {"loc": "/soy-importador", "changefreq": "monthly", "priority": "0.6"},
]

import os
BASE_URL = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com").rstrip("/")


def _escape_xml(text: str) -> str:
    """Escape XML special characters."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("'", "&apos;")
        .replace('"', "&quot;")
    )


def _format_date(dt) -> str:
    """Format a datetime or date-like value to W3C date string."""
    if not dt:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return str(dt)[:10]


def _url_entry(loc: str, lastmod: str = "", changefreq: str = "weekly", priority: str = "0.5") -> str:
    """Build a single <url> entry."""
    parts = [
        "  <url>",
        f"    <loc>{_escape_xml(loc)}</loc>",
    ]
    if lastmod:
        parts.append(f"    <lastmod>{lastmod}</lastmod>")
    parts.append(f"    <changefreq>{changefreq}</changefreq>")
    parts.append(f"    <priority>{priority}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap():
    """Generate sitemap.xml from static pages + products, stores, and recipes."""
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    entries = []

    # Static pages
    for page in STATIC_PAGES:
        entries.append(_url_entry(
            loc=f"{BASE_URL}{page['loc']}",
            lastmod=today,
            changefreq=page["changefreq"],
            priority=page["priority"],
        ))

    # Products (active)
    try:
        products_cursor = db["products"].find(
            {"status": {"$in": ["active", "approved", None]}},
            {"product_id": 1, "updated_at": 1, "created_at": 1, "_id": 0},
        ).limit(5000)
        async for product in products_cursor:
            pid = product.get("product_id")
            if not pid:
                continue
            lastmod = _format_date(product.get("updated_at") or product.get("created_at"))
            entries.append(_url_entry(
                loc=f"{BASE_URL}/product/{_escape_xml(str(pid))}",
                lastmod=lastmod,
                changefreq="weekly",
                priority="0.7",
            ))
    except Exception:
        pass

    # Stores (producers)
    try:
        stores_cursor = db["stores"].find(
            {},
            {"slug": 1, "store_slug": 1, "updated_at": 1, "created_at": 1, "_id": 0},
        ).limit(2000)
        async for store in stores_cursor:
            slug = store.get("slug") or store.get("store_slug")
            if not slug:
                continue
            lastmod = _format_date(store.get("updated_at") or store.get("created_at"))
            entries.append(_url_entry(
                loc=f"{BASE_URL}/store/{_escape_xml(str(slug))}",
                lastmod=lastmod,
                changefreq="weekly",
                priority="0.7",
            ))
    except Exception:
        pass

    # Recipes (published)
    try:
        recipes_cursor = db["recipes"].find(
            {"status": {"$in": ["published", "active", None]}},
            {"recipe_id": 1, "updated_at": 1, "created_at": 1, "_id": 0},
        ).limit(3000)
        async for recipe in recipes_cursor:
            rid = recipe.get("recipe_id")
            if not rid:
                continue
            lastmod = _format_date(recipe.get("updated_at") or recipe.get("created_at"))
            entries.append(_url_entry(
                loc=f"{BASE_URL}/recipes/{_escape_xml(str(rid))}",
                lastmod=lastmod,
                changefreq="weekly",
                priority="0.6",
            ))
    except Exception:
        pass

    xml_content = '\n'.join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        *entries,
        '</urlset>',
    ])

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )
