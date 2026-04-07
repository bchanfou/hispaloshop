"""
Market Interest Requests — the killer feature.
Consumer votes "Tráelo a mi país" → generates leads for producers & importers.
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request

from core.database import db
from core.auth import get_current_user, get_optional_user
from core.models import User
from core.monetization import normalize_seller_plan

logger = logging.getLogger(__name__)
router = APIRouter()

MILESTONE_THRESHOLDS = [10, 50, 100, 500, 1000]


# ── POST /market-requests ──

@router.post("/market-requests")
async def create_market_request(request: Request, user: User = Depends(get_current_user)):
    """Consumer requests a product in their country. Dedup: 1 vote per consumer per product."""
    body = await request.json()
    product_id = body.get("product_id")
    notes = (body.get("notes") or "")[:200].strip()

    if not product_id:
        raise HTTPException(status_code=400, detail="product_id required")

    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "producer_id": 1, "name": 1, "images": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get consumer country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"country": 1})
    consumer_country = (user_doc or {}).get("country", "ES")

    # Dedup
    existing = await db.market_interest_requests.find_one({
        "consumer_id": user.user_id,
        "product_id": product_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Ya has solicitado este producto")

    request_doc = {
        "request_id": f"mir_{uuid.uuid4().hex[:12]}",
        "product_id": product_id,
        "product_name": product.get("name", ""),
        "product_image": (product.get("images") or [""])[0],
        "producer_id": product.get("producer_id", ""),
        "consumer_id": user.user_id,
        "consumer_country": consumer_country,
        "notes": notes,
        "status": "pending",
        "fulfilled_at": None,
        "fulfilled_by_importer_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.market_interest_requests.insert_one(request_doc)

    # Check milestones
    count = await db.market_interest_requests.count_documents({
        "product_id": product_id,
        "consumer_country": consumer_country,
    })
    if count in MILESTONE_THRESHOLDS:
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            producer_id = product.get("producer_id")
            await notification_dispatcher.send_notification(
                user_id=producer_id,
                title=f"{count} solicitudes desde {consumer_country}",
                body=f"Tu producto '{product.get('name', '')}' tiene {count} solicitudes desde {consumer_country}.",
                notification_type="market_request_milestone",
                channels=["in_app", "push"],
                action_url=f"/producer/products",
            )
        except Exception as e:
            logger.warning(f"[MARKET_REQUEST] milestone notification failed: {e}")

    return {"ok": True, "count": count}


# ── GET /market-requests/product/{product_id}/count ──

@router.get("/market-requests/product/{product_id}/count")
async def get_request_count(product_id: str, country: str = "ES", user=Depends(get_optional_user)):
    """Get request count for a product in a country + whether current user requested."""
    count = await db.market_interest_requests.count_documents({
        "product_id": product_id,
        "consumer_country": country,
    })
    user_requested = False
    if user:
        user_requested = bool(await db.market_interest_requests.find_one({
            "consumer_id": user.user_id,
            "product_id": product_id,
        }))
    return {"count": count, "user_has_requested": user_requested}


# ── GET /market-requests/trending ──

@router.get("/market-requests/trending")
async def get_trending_requests(country: str = "ES", limit: int = 10):
    """Top requested products in a country (for Discover section)."""
    pipeline = [
        {"$match": {"consumer_country": country, "status": "pending"}},
        {"$group": {
            "_id": "$product_id",
            "count": {"$sum": 1},
            "product_name": {"$first": "$product_name"},
            "product_image": {"$first": "$product_image"},
            "producer_id": {"$first": "$producer_id"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = await db.market_interest_requests.aggregate(pipeline).to_list(limit)
    return [
        {
            "product_id": r["_id"],
            "product_name": r.get("product_name", ""),
            "product_image": r.get("product_image", ""),
            "producer_id": r.get("producer_id", ""),
            "count": r["count"],
        }
        for r in results
    ]


# ── GET /market-requests/opportunities ──

@router.get("/market-requests/opportunities")
async def get_market_opportunities(user: User = Depends(get_current_user), page: int = 1, limit: int = 20):
    """Market opportunities for importers/producers. Tiered access by plan."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"subscription": 1, "country": 1, "role": 1})
    plan = normalize_seller_plan((user_doc or {}).get("subscription", {}).get("plan", "FREE"))
    user_country = (user_doc or {}).get("country", "ES")

    # For importers: show products requested in THEIR country
    # For producers: show products requested from OTHER countries (their products)
    if user.role == "importer":
        match = {"consumer_country": user_country, "status": "pending"}
    else:
        match = {"producer_id": user.user_id, "status": "pending"}

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {"product_id": "$product_id", "country": "$consumer_country"},
            "count": {"$sum": 1},
            "product_name": {"$first": "$product_name"},
            "product_image": {"$first": "$product_image"},
            "producer_id": {"$first": "$producer_id"},
            "latest_notes": {"$push": "$notes"},
            "latest_at": {"$max": "$created_at"},
        }},
        {"$sort": {"count": -1}},
    ]
    all_opps = await db.market_interest_requests.aggregate(pipeline).to_list(200)

    # ELITE: 72h early access — only show requests older than 72h to non-ELITE
    if plan != "ELITE":
        cutoff_72h = (datetime.now(timezone.utc) - timedelta(hours=72)).isoformat()
        all_opps = [o for o in all_opps if (o.get("latest_at") or "") <= cutoff_72h]

    # Tiered access
    if plan == "FREE":
        # Top 3 only, no notes
        opps = all_opps[:3]
        for o in opps:
            o.pop("latest_notes", None)
        is_teaser = True
    elif plan == "PRO":
        # Full list, no notes
        opps = all_opps[(page - 1) * limit: page * limit]
        for o in opps:
            o.pop("latest_notes", None)
        is_teaser = False
    else:
        # ELITE: full list + notes
        opps = all_opps[(page - 1) * limit: page * limit]
        for o in opps:
            notes = [n for n in (o.get("latest_notes") or []) if n]
            o["consumer_notes"] = notes[:5]
            o.pop("latest_notes", None)
        is_teaser = False

    # Enrich with producer info for importers
    if user.role == "importer":
        producer_ids = list({o.get("producer_id") for o in opps if o.get("producer_id")})
        if producer_ids:
            producers = await db.users.find(
                {"user_id": {"$in": producer_ids}},
                {"_id": 0, "user_id": 1, "name": 1, "company_name": 1},
            ).to_list(len(producer_ids))
            pmap = {p["user_id"]: p for p in producers}
            for o in opps:
                prod = pmap.get(o.get("producer_id"), {})
                o["producer_name"] = prod.get("company_name") or prod.get("name", "")

    return {
        "opportunities": [
            {
                "product_id": o["_id"]["product_id"] if isinstance(o["_id"], dict) else o["_id"],
                "consumer_country": o["_id"]["country"] if isinstance(o["_id"], dict) else user_country,
                "count": o["count"],
                "product_name": o.get("product_name", ""),
                "product_image": o.get("product_image", ""),
                "producer_id": o.get("producer_id", ""),
                "producer_name": o.get("producer_name", ""),
                "consumer_notes": o.get("consumer_notes"),
                "latest_at": o.get("latest_at"),
            }
            for o in opps
        ],
        "total": len(all_opps),
        "plan": plan,
        "is_teaser": is_teaser,
    }


# ── POST /market-requests/{product_id}/fulfill ──

@router.post("/market-requests/{product_id}/fulfill")
async def fulfill_market_request(product_id: str, request: Request, user: User = Depends(get_current_user)):
    """Mark requests as fulfilled when product becomes available in a country."""
    body = await request.json()
    country = body.get("country")
    if not country:
        raise HTTPException(status_code=400, detail="country required")

    # Find all pending requests for this product/country
    requests = await db.market_interest_requests.find(
        {"product_id": product_id, "consumer_country": country, "status": "pending"},
        {"_id": 0, "consumer_id": 1, "request_id": 1},
    ).to_list(5000)

    if not requests:
        return {"ok": True, "notified": 0}

    now = datetime.now(timezone.utc).isoformat()
    await db.market_interest_requests.update_many(
        {"product_id": product_id, "consumer_country": country, "status": "pending"},
        {"$set": {
            "status": "fulfilled",
            "fulfilled_at": now,
            "fulfilled_by_importer_id": user.user_id,
        }},
    )

    # Notify all consumers
    product = await db.products.find_one({"product_id": product_id}, {"name": 1})
    product_name = (product or {}).get("name", "")
    notified = 0
    try:
        from services.notifications.dispatcher_service import notification_dispatcher
        for req in requests[:500]:
            await notification_dispatcher.send_notification(
                user_id=req["consumer_id"],
                title=f"{product_name} ya esta disponible",
                body=f"El producto que pediste ya esta disponible en tu pais.",
                notification_type="market_request_fulfilled",
                channels=["in_app", "push", "email"],
                action_url=f"/products/{product_id}",
            )
            notified += 1
    except Exception as e:
        logger.warning(f"[MARKET_REQUEST] fulfill notification failed: {e}")

    return {"ok": True, "notified": notified}
