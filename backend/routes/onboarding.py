"""
Onboarding routes - 3-step customer onboarding flow.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.auth import get_current_user
from core.database import db

router = APIRouter()

MIN_INTERESTS = 3
MAX_INTERESTS = 10
DEFAULT_SUGGESTION_LIMIT = 3


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_id(user) -> str:
    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def _ensure_customer(user) -> None:
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Onboarding is only available for customer accounts")


async def _get_user_doc(user_id: str, projection: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    user_doc = await db.users.find_one({"user_id": user_id}, projection or {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc


def _serialize_suggestion(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user_doc.get("user_id"),
        "name": user_doc.get("name"),
        "username": user_doc.get("username"),
        "picture": user_doc.get("picture"),
        "role": user_doc.get("role"),
        "bio": user_doc.get("bio"),
        "followers_count": user_doc.get("followers_count", 0),
        "country": user_doc.get("country"),
    }


async def _save_interests_for_user(user_id: str, data: dict) -> Dict[str, Any]:
    raw_interests = data.get("interests", [])
    interests = []

    if isinstance(raw_interests, list):
        for item in raw_interests:
            value = str(item).strip()
            if value and value not in interests:
                interests.append(value)

    if len(interests) < MIN_INTERESTS:
        raise HTTPException(status_code=400, detail="Select at least 3 interests")
    if len(interests) > MAX_INTERESTS:
        raise HTTPException(status_code=400, detail="Maximum 10 interests allowed")

    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "interests": interests,
                "onboarding_step": 2,
                "updated_at": _now_iso(),
            }
        },
    )

    return {"success": True, "step": 2, "interests": interests}


async def _save_location_for_user(
    user_id: str,
    data: dict,
    *,
    require_postal_code: bool = False,
) -> Dict[str, Any]:
    """
    Save the user's onboarding location.

    Consumer onboarding (section 1.1) asks only for country (required) and
    city (optional). Postal code is accepted when provided but NOT required
    by default — shipping flows prompt for it at checkout time when actually
    needed. Callers that need stricter validation can pass
    require_postal_code=True (no existing caller does — reserved for future).
    """
    country = str(data.get("country", "")).strip().upper()
    postal_code = str(data.get("postal_code", "")).strip()
    city = str(data.get("city", "")).strip()
    coordinates = data.get("coordinates") or {}

    if not country:
        raise HTTPException(status_code=400, detail="Country is required")
    if require_postal_code and not postal_code:
        raise HTTPException(status_code=400, detail="Postal code is required")

    location = {
        "country": country,
        "postal_code": postal_code,
        "city": city,
        "coordinates": coordinates,
    }

    update_set = {
        "country": country,
        "location": location,
        "onboarding_step": 3,
        "updated_at": _now_iso(),
    }
    if postal_code:
        update_set["postal_code"] = postal_code

    await db.users.update_one({"user_id": user_id}, {"$set": update_set})

    return {"success": True, "step": 3, "location": location}


async def _follow_users_for_user(user_id: str, data: dict) -> Dict[str, Any]:
    followed_ids = data.get("followed_ids")
    if followed_ids is None:
        followed_ids = data.get("user_ids", [])

    requested_ids = []
    if isinstance(followed_ids, list):
        for item in followed_ids:
            target_id = str(item).strip()
            if target_id and target_id != user_id and target_id not in requested_ids:
                requested_ids.append(target_id)

    if not requested_ids:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"onboarding_step": 3, "updated_at": _now_iso()}},
        )
        return {"success": True, "followed": [], "count": 0}

    targets = await db.users.find(
        {
            "user_id": {"$in": requested_ids},
            "role": "producer",
            "approved": True,
        },
        {"_id": 0, "user_id": 1},
    ).to_list(length=len(requested_ids))

    valid_ids = [target["user_id"] for target in targets]

    # Check which ones the user is already following via db.user_follows
    existing_follows = await db.user_follows.find(
        {"follower_id": user_id, "following_id": {"$in": valid_ids}},
        {"_id": 0, "following_id": 1},
    ).to_list(len(valid_ids))
    already_following = {f["following_id"] for f in existing_follows}
    new_ids = [tid for tid in valid_ids if tid not in already_following]

    now = _now_iso()
    if new_ids:
        # Insert into db.user_follows (the collection the rest of the app reads)
        await db.user_follows.insert_many([
            {"follower_id": user_id, "following_id": target_id, "created_at": now}
            for target_id in new_ids
        ])
        # Update followers_count on each followed user
        await db.users.update_many(
            {"user_id": {"$in": new_ids}},
            {"$inc": {"followers_count": 1}},
        )
        # Update following_count on current user
        await db.users.update_one(
            {"user_id": user_id},
            {"$inc": {"following_count": len(new_ids)}},
        )

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"onboarding_step": 3, "updated_at": now}},
    )

    return {"success": True, "followed": valid_ids, "count": len(valid_ids)}


async def _complete_onboarding_for_user(user_id: str) -> Dict[str, Any]:
    # Idempotency: only update onboarding_completed_at if not already completed
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "onboarding_completed": 1})
    if user_doc and user_doc.get("onboarding_completed"):
        return {"success": True, "message": "Onboarding already completed", "redirect_url": "/dashboard"}

    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "onboarding_completed": True,
                "onboarding_completed_at": _now_iso(),
                "onboarding_step": 3,
                "updated_at": _now_iso(),
            }
        },
    )

    return {
        "success": True,
        "message": "Onboarding completed",
        "redirect_url": "/dashboard",
    }


@router.get("/onboarding/status")
async def get_onboarding_status(user=Depends(get_current_user)):
    _ensure_customer(user)
    user_id = _user_id(user)
    user_doc = await _get_user_doc(
        user_id,
        {
            "_id": 0,
            "onboarding_completed": 1,
            "onboarding_step": 1,
            "interests": 1,
            "location": 1,
            "country": 1,
            "postal_code": 1,
            "following": 1,
        },
    )

    return {
        "completed": bool(user_doc.get("onboarding_completed", False)),
        "current_step": int(user_doc.get("onboarding_step", 1) or 1),
        "interests": user_doc.get("interests", []),
        "location": user_doc.get("location", {}),
        "country": user_doc.get("country", ""),
        "postal_code": user_doc.get("postal_code", ""),
        "following": user_doc.get("following", []),
    }


@router.post("/onboarding/interests")
async def save_interests(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _save_interests_for_user(_user_id(user), data)


@router.post("/users/me/interests")
async def save_interests_alias(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _save_interests_for_user(_user_id(user), data)


@router.post("/onboarding/location")
async def save_location(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _save_location_for_user(_user_id(user), data)


@router.post("/users/me/location")
async def save_location_alias(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _save_location_for_user(_user_id(user), data)


@router.get("/onboarding/suggestions")
async def get_follow_suggestions(
    limit: int = Query(default=DEFAULT_SUGGESTION_LIMIT, ge=1, le=12),
    user=Depends(get_current_user),
):
    _ensure_customer(user)
    user_id = _user_id(user)
    user_doc = await _get_user_doc(
        user_id,
        {"_id": 0, "country": 1},
    )
    country = user_doc.get("country")

    # Read from db.user_follows (the live collection) instead of legacy db.users.following array
    follow_docs = await db.user_follows.find(
        {"follower_id": user_id},
        {"_id": 0, "following_id": 1},
    ).to_list(length=500)
    following = [f["following_id"] for f in follow_docs]

    same_country_query = {
        "user_id": {"$nin": [user_id, *following]},
        "role": "producer",
        "approved": True,
    }
    if country:
        same_country_query["country"] = country

    primary = await db.users.find(
        same_country_query,
        {"_id": 0, "password_hash": 0},
    ).sort("followers_count", -1).to_list(length=limit)

    suggestions = primary[:limit]
    if len(suggestions) < limit:
        exclude_ids = [user_id, *following, *[item.get("user_id") for item in suggestions]]
        secondary = await db.users.find(
            {
                "user_id": {"$nin": exclude_ids},
                "role": "producer",
                "approved": True,
            },
            {"_id": 0, "password_hash": 0},
        ).sort("followers_count", -1).to_list(length=limit - len(suggestions))
        suggestions.extend(secondary)

    serialized = [_serialize_suggestion(item) for item in suggestions[:limit]]
    return {"suggestions": serialized, "total": len(serialized)}


@router.post("/onboarding/follow")
async def follow_users(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _follow_users_for_user(_user_id(user), data)


@router.post("/users/me/follows")
async def follow_users_alias(data: dict, user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _follow_users_for_user(_user_id(user), data)


@router.post("/onboarding/complete")
async def complete_onboarding(user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _complete_onboarding_for_user(_user_id(user))


@router.post("/users/me/onboarding-complete")
async def complete_onboarding_alias(user=Depends(get_current_user)):
    _ensure_customer(user)
    return await _complete_onboarding_for_user(_user_id(user))


@router.post("/onboarding/skip")
async def skip_onboarding(user=Depends(get_current_user)):
    _ensure_customer(user)
    result = await _complete_onboarding_for_user(_user_id(user))
    result["skipped"] = True
    return result
