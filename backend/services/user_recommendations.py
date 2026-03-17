"""
User Recommendation Engine — multi-signal scoring for people discovery.

Scores:
  0.30 × preference_overlap   (onboarding food_preferences match)
  0.25 × social_proximity     (friends-of-friends)
  0.20 × commerce_impact      (product clicks, sales, content attribution)
  0.15 × role_diversity        (boost underrepresented roles in user's graph)
  0.10 × recency               (active in last 14 days)
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set

from core.database import get_db

WEIGHTS = {
    "preference": 0.30,
    "social": 0.25,
    "commerce": 0.20,
    "diversity": 0.15,
    "recency": 0.10,
}

USER_PROJECTION = {
    "user_id": 1, "name": 1, "username": 1, "role": 1,
    "bio": 1, "country": 1, "followers_count": 1,
    "profile_image": 1, "avatar": 1, "picture": 1,
    "food_preferences": 1, "is_verified": 1,
    "last_active_at": 1, "updated_at": 1, "created_at": 1,
}

ALL_ROLES = {"consumer", "producer", "influencer", "importer"}


def _avatar(user: Dict) -> Optional[str]:
    return user.get("profile_image") or user.get("avatar") or user.get("picture")


def _normalize_user(user: Dict, score: float = 0) -> Dict:
    return {
        "user_id": user.get("user_id"),
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "role": user.get("role", "consumer"),
        "bio": (user.get("bio") or "")[:120],
        "profile_image": _avatar(user),
        "country": user.get("country"),
        "followers_count": user.get("followers_count", 0),
        "is_verified": user.get("is_verified", False),
        "food_preferences": user.get("food_preferences", []),
        "score": round(score, 4),
    }


async def _get_following_ids(db, user_id: str) -> Set[str]:
    """All user IDs the caller already follows."""
    docs = await db.user_follows.find(
        {"follower_id": user_id}, {"following_id": 1}
    ).to_list(length=2000)
    return {d["following_id"] for d in docs if d.get("following_id")}


async def _get_friends_of_friends(db, following_ids: Set[str], user_id: str, limit: int = 200) -> Dict[str, int]:
    """Users followed by people you follow, with overlap count."""
    if not following_ids:
        return {}
    pipeline = [
        {"$match": {"follower_id": {"$in": list(following_ids)}}},
        {"$group": {"_id": "$following_id", "mutual_count": {"$sum": 1}}},
        {"$match": {"_id": {"$nin": [user_id, *list(following_ids)]}}},
        {"$sort": {"mutual_count": -1}},
        {"$limit": limit},
    ]
    results = await db.user_follows.aggregate(pipeline).to_list(length=limit)
    return {r["_id"]: r["mutual_count"] for r in results}


def _preference_score(user_prefs: List[str], target_prefs: List[str]) -> float:
    """Jaccard-like overlap between food preferences."""
    if not user_prefs or not target_prefs:
        return 0.0
    s1, s2 = set(p.lower() for p in user_prefs), set(p.lower() for p in target_prefs)
    intersection = len(s1 & s2)
    if intersection == 0:
        return 0.0
    return intersection / max(len(s1 | s2), 1)


def _role_diversity_score(role: str, role_counts: Dict[str, int]) -> float:
    """Boost roles that are underrepresented in the user's following graph."""
    total = sum(role_counts.values()) or 1
    role_pct = role_counts.get(role, 0) / total
    # Inverse: less represented = higher score
    return max(0, 1.0 - role_pct * 2)


def _recency_score(user: Dict) -> float:
    """Score based on how recently the user was active."""
    last = user.get("last_active_at") or user.get("updated_at") or user.get("created_at")
    if not last:
        return 0.0
    if isinstance(last, str):
        try:
            last = datetime.fromisoformat(last.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return 0.0
    now = datetime.now(timezone.utc)
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    days_ago = (now - last).total_seconds() / 86400
    if days_ago <= 1:
        return 1.0
    if days_ago <= 7:
        return 0.7
    if days_ago <= 14:
        return 0.4
    if days_ago <= 30:
        return 0.15
    return 0.0


# ── Main API ──────────────────────────────────────────────────────────────────


async def get_personalized_suggestions(
    user_id: str,
    limit: int = 6,
    exclude_ids: Optional[List[str]] = None,
    context: str = "feed",
) -> List[Dict]:
    """
    Multi-signal personalized user recommendations.
    Works for any logged-in user across all roles.
    """
    db = get_db()

    # Caller's data
    caller = await db.users.find_one({"user_id": user_id}, {
        "food_preferences": 1, "country": 1, "role": 1,
    })
    if not caller:
        return await get_anonymous_suggestions(limit=limit)

    caller_prefs = caller.get("food_preferences", [])
    caller_country = caller.get("country")
    following_ids = await _get_following_ids(db, user_id)
    exclude = set(exclude_ids or []) | following_ids | {user_id}

    # Role distribution of current following graph
    if following_ids:
        role_pipeline = [
            {"$match": {"user_id": {"$in": list(following_ids)}}},
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        ]
        role_agg = await db.users.aggregate(role_pipeline).to_list(length=10)
        role_counts = {r["_id"]: r["count"] for r in role_agg}
    else:
        role_counts = {}

    # Friends-of-friends
    fof_scores = await _get_friends_of_friends(db, following_ids, user_id, limit=100)

    # Commerce impact (30 days)
    since = datetime.now(timezone.utc) - timedelta(days=30)
    commerce_pipeline = [
        {"$match": {"interaction_type": {"$in": ["product_click", "add_to_cart", "purchase"]}, "created_at": {"$gte": since}}},
        {"$group": {"_id": "$context_id", "impact": {"$sum": 1}}},
        {"$sort": {"impact": -1}},
        {"$limit": 200},
    ]
    commerce_agg = await db.growth_interactions.aggregate(commerce_pipeline).to_list(length=200)
    commerce_map = {c["_id"]: c["impact"] for c in commerce_agg}
    max_commerce = max(commerce_map.values(), default=1)

    # Candidate pool: broader than just producers/influencers
    candidate_query = {"user_id": {"$nin": list(exclude)}}
    candidates = await db.users.find(
        candidate_query, USER_PROJECTION
    ).sort("followers_count", -1).limit(limit * 8).to_list(length=limit * 8)

    # Score each candidate
    scored = []
    max_fof = max(fof_scores.values(), default=1)

    for c in candidates:
        cid = c.get("user_id")
        if not cid:
            continue

        pref = _preference_score(caller_prefs, c.get("food_preferences", []))
        social = fof_scores.get(cid, 0) / max_fof if max_fof else 0
        commerce = (commerce_map.get(cid, 0) / max_commerce) if max_commerce else 0
        diversity = _role_diversity_score(c.get("role", "consumer"), role_counts)
        recency = _recency_score(c)

        # Country affinity bonus applied to social signal
        if caller_country and c.get("country") == caller_country:
            social = min(1.0, social + 0.2)

        total = (
            WEIGHTS["preference"] * pref
            + WEIGHTS["social"] * social
            + WEIGHTS["commerce"] * commerce
            + WEIGHTS["diversity"] * diversity
            + WEIGHTS["recency"] * recency
        )

        scored.append(_normalize_user(c, total))

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


async def get_contextual_suggestions(
    user_id: str,
    just_followed_id: str,
    limit: int = 5,
) -> List[Dict]:
    """
    'Similar to X' — users who share followers/preferences with just_followed_id.
    Shown after a follow action.
    """
    db = get_db()

    # Who follows the just-followed user?
    their_followers = await db.user_follows.find(
        {"following_id": just_followed_id}, {"follower_id": 1}
    ).to_list(length=500)
    follower_ids = {f["follower_id"] for f in their_followers}

    # What do those followers also follow?
    if not follower_ids:
        return await get_personalized_suggestions(user_id, limit=limit)

    pipeline = [
        {"$match": {"follower_id": {"$in": list(follower_ids)}}},
        {"$group": {"_id": "$following_id", "shared": {"$sum": 1}}},
        {"$sort": {"shared": -1}},
        {"$limit": limit * 4},
    ]
    similar_agg = await db.user_follows.aggregate(pipeline).to_list(length=limit * 4)

    following_ids = await _get_following_ids(db, user_id)
    exclude = following_ids | {user_id, just_followed_id}

    candidate_ids = [s["_id"] for s in similar_agg if s["_id"] not in exclude][:limit * 2]
    if not candidate_ids:
        return await get_personalized_suggestions(user_id, limit=limit, exclude_ids=[just_followed_id])

    candidates = await db.users.find(
        {"user_id": {"$in": candidate_ids}}, USER_PROJECTION
    ).to_list(length=limit * 2)

    # Simple scoring: shared follower count
    shared_map = {s["_id"]: s["shared"] for s in similar_agg}
    max_shared = max(shared_map.values(), default=1)
    results = []
    for c in candidates:
        cid = c.get("user_id")
        score = shared_map.get(cid, 0) / max_shared
        results.append(_normalize_user(c, score))

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


async def get_anonymous_suggestions(
    country: Optional[str] = None,
    limit: int = 6,
) -> List[Dict]:
    """For logged-out users: trending creators by country."""
    db = get_db()
    query: Dict = {}
    if country:
        query["country"] = country.upper()

    users = await db.users.find(
        query, USER_PROJECTION
    ).sort("followers_count", -1).limit(limit * 2).to_list(length=limit * 2)

    results = [_normalize_user(u, u.get("followers_count", 0)) for u in users]
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


async def get_onboarding_suggestions(
    preferences: List[str],
    role: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = 12,
) -> List[Dict]:
    """
    For brand-new users right after onboarding.
    Heavy weight on preference overlap since we have no social graph.
    """
    db = get_db()

    query: Dict = {}
    if country:
        query["country"] = {"$in": [country.upper(), None]}

    candidates = await db.users.find(
        query, USER_PROJECTION
    ).sort("followers_count", -1).limit(limit * 6).to_list(length=limit * 6)

    scored = []
    for c in candidates:
        pref = _preference_score(preferences, c.get("food_preferences", []))
        recency = _recency_score(c)
        followers_norm = min(1.0, (c.get("followers_count", 0) / 100))

        # Onboarding: 60% preference, 20% popularity, 20% recency
        total = 0.60 * pref + 0.20 * followers_norm + 0.20 * recency
        scored.append(_normalize_user(c, total))

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
