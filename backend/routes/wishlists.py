"""
Multi-wishlist system: CRUD wishlists, items, sharing, quick-save bridge.
The legacy wishlist.py (singular) remains for backward compat.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone
import uuid, re

from core.database import db
from core.models import User
from core.auth import get_current_user, get_optional_user
from core.sanitize import sanitize_text
from utils.images import extract_product_image

router = APIRouter()
MAX_WISHLISTS = 20
MAX_ITEMS = 200
_STATUS_EXCLUDE = {"$nin": ["suspended_by_admin", "deleted", "rejected"]}
_now = lambda: datetime.now(timezone.utc).isoformat()


def _make_slug(title: str) -> str:
    s = re.sub(r"[^\w\s-]", "", title.lower().strip())
    return re.sub(r"[\s_]+", "-", s).strip("-") or "lista"


async def _ensure_default_wishlist(user_id: str):
    existing = await db.user_wishlists.find_one({"owner_id": user_id, "is_default": True})
    if existing:
        return existing
    now = _now()
    doc = {
        "wishlist_id": f"wl_{uuid.uuid4().hex[:12]}", "slug": f"favoritos-{user_id[:8]}",
        "owner_id": user_id, "title": "Favoritos", "description": "",
        "cover_image": None, "is_public": False, "is_default": True,
        "items": [], "created_at": now, "updated_at": now,
    }
    await db.user_wishlists.insert_one(doc)
    return doc


async def _enrich_items(items: list) -> list:
    pids = [i["product_id"] for i in items if i.get("product_id")]
    if not pids:
        return []
    prods = await db.products.find(
        {"product_id": {"$in": pids}, "status": _STATUS_EXCLUDE},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1,
         "image_urls": 1, "stock": 1, "track_stock": 1, "seller_name": 1, "producer_name": 1},
    ).to_list(200)
    pm = {p["product_id"]: p for p in prods}
    out = []
    for it in items:
        p = pm.get(it.get("product_id"))
        if not p:
            continue
        out.append({
            "product_id": it["product_id"], "added_at": it.get("added_at"),
            "note": it.get("note", ""), "marked_as_purchased": it.get("marked_as_purchased", False),
            "marked_by": it.get("marked_by"), "name": p.get("name"), "price": p.get("price"),
            "image": extract_product_image(p), "stock": p.get("stock"),
            "seller_name": p.get("seller_name") or p.get("producer_name"),
        })
    return out


def _clean(wl: dict) -> dict:
    wl.pop("_id", None)
    return wl


# ── CRUD Wishlists ──────────────────────────────────────────────────

@router.post("/wishlists")
async def create_wishlist(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    title = sanitize_text(body.get("title", ""), max_length=100).strip()
    if not title:
        raise HTTPException(400, "Title is required")
    count = await db.user_wishlists.count_documents({"owner_id": user.user_id})
    if count >= MAX_WISHLISTS:
        raise HTTPException(429, f"Maximum {MAX_WISHLISTS} wishlists reached")

    base_slug = _make_slug(title)
    slug, suffix = base_slug, 1
    while await db.user_wishlists.find_one({"owner_id": user.user_id, "slug": slug}):
        slug = f"{base_slug}-{suffix}"; suffix += 1

    now = _now()
    wl = {
        "wishlist_id": f"wl_{uuid.uuid4().hex[:12]}", "slug": slug,
        "owner_id": user.user_id, "title": title,
        "description": sanitize_text(body.get("description", ""), max_length=500),
        "cover_image": None, "is_public": bool(body.get("is_public", False)),
        "is_default": False, "items": [], "created_at": now, "updated_at": now,
    }
    await db.user_wishlists.insert_one(wl)
    return _clean(wl)


@router.get("/wishlists")
async def list_wishlists(user: User = Depends(get_current_user)):
    await _ensure_default_wishlist(user.user_id)
    wishlists = await db.user_wishlists.find(
        {"owner_id": user.user_id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(MAX_WISHLISTS + 1)

    # Gather first-4-item thumbnails in one batch query
    all_pids = []
    for wl in wishlists:
        for it in (wl.get("items") or [])[:4]:
            if it.get("product_id"):
                all_pids.append(it["product_id"])
    thumb_map = {}
    if all_pids:
        prods = await db.products.find(
            {"product_id": {"$in": list(set(all_pids))}},
            {"_id": 0, "product_id": 1, "images": 1, "image_urls": 1},
        ).to_list(len(all_pids))
        thumb_map = {p["product_id"]: extract_product_image(p) for p in prods}

    result = []
    for wl in wishlists:
        items = wl.get("items") or []
        covers = [thumb_map[i["product_id"]] for i in items[:4]
                  if i.get("product_id") in thumb_map and thumb_map[i["product_id"]]]
        result.append({
            "wishlist_id": wl["wishlist_id"], "slug": wl.get("slug"),
            "title": wl.get("title"), "is_public": wl.get("is_public", False),
            "is_default": wl.get("is_default", False), "item_count": len(items),
            "cover_thumbnails": covers, "updated_at": wl.get("updated_at"),
        })
    return result


@router.get("/wishlists/{wishlist_id}")
async def get_wishlist(wishlist_id: str, request: Request, user: User = Depends(get_optional_user)):
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id}, {"_id": 0})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    is_owner = user and user.user_id == wl["owner_id"]
    if not wl.get("is_public") and not is_owner:
        raise HTTPException(403, "This wishlist is private")
    wl["items"] = await _enrich_items(wl.get("items") or [])
    return wl


@router.put("/wishlists/{wishlist_id}")
async def update_wishlist(wishlist_id: str, request: Request, user: User = Depends(get_current_user)):
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id, "owner_id": user.user_id})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    body = await request.json()
    updates: dict = {"updated_at": _now()}
    if "title" in body:
        if wl.get("is_default"):
            raise HTTPException(400, "Cannot rename the default list")
        updates["title"] = sanitize_text(body["title"], max_length=100).strip()
    if "description" in body:
        updates["description"] = sanitize_text(body["description"], max_length=500)
    if "is_public" in body:
        updates["is_public"] = bool(body["is_public"])
    if "cover_image" in body:
        updates["cover_image"] = body["cover_image"]
    await db.user_wishlists.update_one({"wishlist_id": wishlist_id}, {"$set": updates})
    return {"message": "Updated", **updates}


@router.delete("/wishlists/{wishlist_id}")
async def delete_wishlist(wishlist_id: str, user: User = Depends(get_current_user)):
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id, "owner_id": user.user_id})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    if wl.get("is_default"):
        raise HTTPException(400, "Cannot delete the default Favoritos list")
    await db.user_wishlists.delete_one({"wishlist_id": wishlist_id})
    return {"message": "Deleted"}


# ── Items ───────────────────────────────────────────────────────────

@router.post("/wishlists/{wishlist_id}/items")
async def add_item(wishlist_id: str, request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    product_id = body.get("product_id", "").strip()
    if not product_id:
        raise HTTPException(400, "product_id is required")
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id, "owner_id": user.user_id})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    items = wl.get("items") or []
    if any(i["product_id"] == product_id for i in items):
        return {"message": "Already in list", "added": False}
    if len(items) >= MAX_ITEMS:
        raise HTTPException(429, f"Maximum {MAX_ITEMS} items per list")
    prod = await db.products.find_one({"product_id": product_id, "status": _STATUS_EXCLUDE}, {"_id": 0, "product_id": 1})
    if not prod:
        raise HTTPException(404, "Product not found")
    now = _now()
    new_item = {
        "product_id": product_id, "added_at": now,
        "note": sanitize_text(body.get("note", ""), max_length=300),
        "marked_as_purchased": False, "marked_by": None,
    }
    await db.user_wishlists.update_one(
        {"wishlist_id": wishlist_id},
        {"$push": {"items": new_item}, "$set": {"updated_at": now}},
    )
    return {"message": "Added", "added": True}


@router.delete("/wishlists/{wishlist_id}/items/{product_id}")
async def remove_item(wishlist_id: str, product_id: str, user: User = Depends(get_current_user)):
    result = await db.user_wishlists.update_one(
        {"wishlist_id": wishlist_id, "owner_id": user.user_id},
        {"$pull": {"items": {"product_id": product_id}}, "$set": {"updated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Wishlist not found")
    return {"message": "Removed"}


@router.put("/wishlists/{wishlist_id}/items/{product_id}/purchased")
async def mark_purchased(wishlist_id: str, product_id: str, user: User = Depends(get_current_user)):
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id}, {"_id": 0})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    if not wl.get("is_public") and user.user_id != wl["owner_id"]:
        raise HTTPException(403, "Private wishlist")
    result = await db.user_wishlists.update_one(
        {"wishlist_id": wishlist_id, "items.product_id": product_id},
        {"$set": {"items.$.marked_as_purchased": True, "items.$.marked_by": user.user_id, "updated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item not found in wishlist")
    return {"message": "Marked as purchased"}


# ── Quick Save (bridge) ────────────────────────────────────────────

@router.post("/wishlists/quick-save/{product_id}")
async def quick_save(product_id: str, user: User = Depends(get_current_user)):
    default = await _ensure_default_wishlist(user.user_id)
    items = default.get("items") or []
    now = _now()
    wid = default["wishlist_id"]
    if any(i["product_id"] == product_id for i in items):
        await db.user_wishlists.update_one(
            {"wishlist_id": wid},
            {"$pull": {"items": {"product_id": product_id}}, "$set": {"updated_at": now}},
        )
        return {"saved": False, "message": "Removed from Favoritos"}
    prod = await db.products.find_one({"product_id": product_id, "status": _STATUS_EXCLUDE}, {"_id": 0, "product_id": 1})
    if not prod:
        raise HTTPException(404, "Product not found")
    new_item = {"product_id": product_id, "added_at": now, "note": "", "marked_as_purchased": False, "marked_by": None}
    await db.user_wishlists.update_one(
        {"wishlist_id": wid}, {"$push": {"items": new_item}, "$set": {"updated_at": now}},
    )
    return {"saved": True, "message": "Added to Favoritos"}


# ── Shared (public, no auth) ───────────────────────────────────────

@router.get("/wishlists/shared/{slug}")
async def shared_wishlist(slug: str):
    wl = await db.user_wishlists.find_one({"slug": slug, "is_public": True}, {"_id": 0})
    if not wl:
        raise HTTPException(404, "Wishlist not found or is private")
    owner = await db.users.find_one(
        {"user_id": wl["owner_id"]},
        {"_id": 0, "full_name": 1, "display_name": 1, "avatar": 1, "avatar_url": 1},
    )
    wl["items"] = await _enrich_items(wl.get("items") or [])
    wl["owner"] = {
        "name": (owner or {}).get("display_name") or (owner or {}).get("full_name", ""),
        "avatar": (owner or {}).get("avatar_url") or (owner or {}).get("avatar"),
    }
    return wl


# ── Bulk buy-all ────────────────────────────────────────────────────

@router.post("/wishlists/{wishlist_id}/buy-all")
async def buy_all(wishlist_id: str, user: User = Depends(get_current_user)):
    wl = await db.user_wishlists.find_one({"wishlist_id": wishlist_id}, {"_id": 0})
    if not wl:
        raise HTTPException(404, "Wishlist not found")
    if not wl.get("is_public") and user.user_id != wl["owner_id"]:
        raise HTTPException(403, "Private wishlist")

    pending = [i for i in (wl.get("items") or []) if not i.get("marked_as_purchased")]
    if not pending:
        return {"added": 0, "skipped": 0, "total_price": 0}

    pids = [i["product_id"] for i in pending]
    prods = await db.products.find(
        {"product_id": {"$in": pids}, "status": _STATUS_EXCLUDE},
        {"_id": 0, "product_id": 1, "price": 1, "stock": 1, "track_stock": 1},
    ).to_list(len(pids))
    pm = {p["product_id"]: p for p in prods}

    added, skipped, total = 0, 0, 0.0
    now = _now()
    for item in pending:
        p = pm.get(item["product_id"])
        if not p or (p.get("track_stock") and (p.get("stock") or 0) <= 0):
            skipped += 1
            continue
        await db.carts.update_one(
            {"user_id": user.user_id, "product_id": item["product_id"]},
            {"$setOnInsert": {
                "cart_item_id": str(uuid.uuid4()), "user_id": user.user_id,
                "product_id": item["product_id"], "quantity": 1, "added_at": now,
            }},
            upsert=True,
        )
        added += 1
        total += float(p.get("price") or 0)
    return {"added": added, "skipped": skipped, "total_price": round(total, 2)}
