"""
Onboarding routes - 4-step flow for new users
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from core.database import db
from core.auth import get_current_user

router = APIRouter()


@router.get("/onboarding/status")
async def get_onboarding_status(user=Depends(get_current_user)):
    """Get onboarding completion status for current user"""
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "onboarding_completed": 1, "onboarding_step": 1, 
         "interests": 1, "location": 1, "country": 1}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "completed": user_doc.get("onboarding_completed", False),
        "current_step": user_doc.get("onboarding_step", 1),
        "interests": user_doc.get("interests", []),
        "location": user_doc.get("location", {}),
        "country": user_doc.get("country", "")
    }


@router.post("/onboarding/interests")
async def save_interests(
    data: dict,
    user=Depends(get_current_user)
):
    """Save user interests (categories) - Step 1"""
    interests = data.get("interests", [])
    
    if not interests or len(interests) < 3:
        raise HTTPException(status_code=400, detail="Select at least 3 interests")
    
    if len(interests) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 interests allowed")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "interests": interests,
                "onboarding_step": 2,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "step": 2, "interests": interests}


@router.post("/onboarding/location")
async def save_location(
    data: dict,
    user=Depends(get_current_user)
):
    """Save user location - Step 2"""
    country = data.get("country", "")
    city = data.get("city", "")
    
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")
    
    location_data = {
        "country": country,
        "city": city,
        "coordinates": data.get("coordinates", {})
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "country": country,
                "location": location_data,
                "onboarding_step": 3,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "step": 3, "location": location_data}


@router.get("/onboarding/suggestions")
async def get_follow_suggestions(
    limit: int = 10,
    user=Depends(get_current_user)
):
    """Get users to follow based on interests and location - Step 3"""
    
    # Get user data
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "interests": 1, "country": 1, "following": 1}
    )
    
    interests = user_doc.get("interests", [])
    country = user_doc.get("country", "")
    following = user_doc.get("following", [])
    
    # Build query for suggestions
    query = {
        "user_id": {"$ne": user["user_id"]},
        "user_id": {"$nin": following},
        "role": {"$in": ["producer", "influencer"]}
    }
    
    # Prefer users with matching interests or country
    suggestions = []
    
    # 1. Same country + interests
    if interests and country:
        pipeline = [
            {
                "$match": {
                    "user_id": {"$ne": user["user_id"]},
                    "user_id": {"$nin": following},
                    "role": {"$in": ["producer", "influencer"]},
                    "country": country,
                    "interests": {"$in": interests}
                }
            },
            {"$limit": limit},
            {
                "$project": {
                    "_id": 0,
                    "user_id": 1,
                    "name": 1,
                    "username": 1,
                    "picture": 1,
                    "role": 1,
                    "bio": 1,
                    "followers_count": 1
                }
            }
        ]
        matching = await db.users.aggregate(pipeline).to_list(length=limit)
        suggestions.extend(matching)
    
    # 2. Fill with popular producers/influencers
    remaining = limit - len(suggestions)
    if remaining > 0:
        exclude_ids = [s["user_id"] for s in suggestions] + [user["user_id"]] + following
        
        popular_pipeline = [
            {
                "$match": {
                    "user_id": {"$nin": exclude_ids},
                    "role": {"$in": ["producer", "influencer"]}
                }
            },
            {"$sort": {"followers_count": -1}},
            {"$limit": remaining},
            {
                "$project": {
                    "_id": 0,
                    "user_id": 1,
                    "name": 1,
                    "username": 1,
                    "picture": 1,
                    "role": 1,
                    "bio": 1,
                    "followers_count": 1
                }
            }
        ]
        popular = await db.users.aggregate(popular_pipeline).to_list(length=remaining)
        suggestions.extend(popular)
    
    return {
        "suggestions": suggestions,
        "total": len(suggestions)
    }


@router.post("/onboarding/follow")
async def follow_users(
    data: dict,
    user=Depends(get_current_user)
):
    """Follow selected users - Step 3 completion"""
    user_ids = data.get("user_ids", [])
    
    if not user_ids:
        # Allow skipping this step
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"onboarding_step": 4}}
        )
        return {"success": True, "followed": [], "skipped": True}
    
    # Validate users exist
    existing = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1}
    ).to_list(length=len(user_ids))
    
    valid_ids = [u["user_id"] for u in existing]
    
    # Add to following list
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$addToSet": {"following": {"$each": valid_ids}},
            "$set": {
                "onboarding_step": 4,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update followers count for followed users
    for target_id in valid_ids:
        await db.users.update_one(
            {"user_id": target_id},
            {
                "$addToSet": {"followers": user["user_id"]},
                "$inc": {"followers_count": 1}
            }
        )
    
    return {"success": True, "followed": valid_ids, "count": len(valid_ids)}


@router.post("/onboarding/complete")
async def complete_onboarding(user=Depends(get_current_user)):
    """Mark onboarding as completed - Step 4"""
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "onboarding_completed": True,
                "onboarding_completed_at": datetime.now(timezone.utc).isoformat(),
                "onboarding_step": 5,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Onboarding completed",
        "redirect_url": "/dashboard"
    }


@router.post("/onboarding/skip")
async def skip_onboarding(user=Depends(get_current_user)):
    """Skip entire onboarding (not recommended but allowed)"""
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "onboarding_completed": True,
                "onboarding_skipped": True,
                "onboarding_skipped_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "skipped": True}
