from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
from urllib.parse import urlencode
import uuid

from fastapi import APIRouter, Header, HTTPException, Query, Request, Response

from core.auth import get_current_user, get_optional_user
from core.config import settings
from core.constants import SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES
from core.database import db
from schemas.frontend_compat import (
    ExchangeRatesOut,
    FeedResponseOut,
    GoogleAuthUrlOut,
    LocaleConfigOut,
    StoryGroupOut,
    StoryOut,
    TrackVisitIn,
    TrackVisitOut,
    UserOut,
    UserProfileOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Frontend Compatibility"])

_EXCHANGE_RATES_CACHE: Dict[str, object] = {"rates": None, "updated_at": None}
_DEFAULT_EXCHANGE_RATES = {"EUR": 1.0, "USD": 1.08, "GBP": 0.85}
_COUNTRY_CURRENCY = {
    "ES": "EUR",
    "FR": "EUR",
    "DE": "EUR",
    "IT": "EUR",
    "PT": "EUR",
    "IE": "EUR",
    "US": "USD",
    "GB": "GBP",
}
_COUNTRY_LANGUAGE = {
    "ES": "es",
    "FR": "fr",
    "DE": "de",
    "IT": "it",
    "PT": "pt",
    "US": "en",
    "GB": "en",
}
_COUNTRY_TAX_RATE = {
    "ES": 0.21,
    "FR": 0.20,
    "DE": 0.19,
    "IT": 0.22,
    "PT": 0.23,
    "US": 0.0,
    "GB": 0.20,
}


def _coerce_iso(value: object, default: Optional[datetime] = None) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    base = default or datetime.now(timezone.utc)
    return base.isoformat()


async def _resolve_current_user(request: Request, authorization: Optional[str]) -> Optional[object]:
    try:
        return await get_current_user(request, authorization=authorization)
    except HTTPException:
        return None


async def _serialize_user_from_request(request: Request, authorization: Optional[str]) -> Optional[UserOut]:
    user = await _resolve_current_user(request, authorization)
    if not user:
        return None

    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        return None

    return UserOut(
        user_id=user_doc["user_id"],
        email=user_doc.get("email", ""),
        name=user_doc.get("name"),
        role=user_doc.get("role", "customer"),
        email_verified=bool(user_doc.get("email_verified", False)),
        approved=bool(user_doc.get("approved", False)),
        profile=UserProfileOut(
            picture=user_doc.get("picture"),
            profile_image=user_doc.get("profile_image") or user_doc.get("picture"),
            company_name=user_doc.get("company_name"),
            country=user_doc.get("country"),
            locale=user_doc.get("locale", {}) or {},
        ),
    )


@router.get("/stories", response_model=List[StoryGroupOut])
async def get_active_stories(
    request: Request,
    response: Response,
    authorization: Optional[str] = Header(default=None),
):
    current_user = await _resolve_current_user(request, authorization)
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    active_stories = await db.hispalostories.find(
        {
            "$or": [
                {"created_at": {"$gte": twenty_four_hours_ago.isoformat()}},
                {"expires_at": {"$gt": now.isoformat()}},
            ]
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)

    groups: Dict[str, Dict[str, object]] = {}
    for story in active_stories:
        created_at = story.get("created_at")
        expires_at = story.get("expires_at")
        if created_at and created_at < twenty_four_hours_ago.isoformat() and expires_at and expires_at <= now.isoformat():
            continue

        user_id = story.get("user_id")
        if not user_id:
            continue

        user_doc = groups.get(user_id)
        if user_doc is None:
            profile = await db.users.find_one(
                {"user_id": user_id},
                {"_id": 0, "name": 1, "profile_image": 1, "picture": 1, "role": 1},
            )
            if not profile:
                continue
            user_doc = {
                "user_id": user_id,
                "user_name": profile.get("name", ""),
                "profile_image": profile.get("profile_image") or profile.get("picture"),
                "role": profile.get("role", "customer"),
                "is_own": bool(current_user and current_user.user_id == user_id),
                "stories": [],
            }
            groups[user_id] = user_doc

        views = story.get("views", []) or []
        viewed = bool(current_user and current_user.user_id in views)
        user_doc["stories"].append(
            StoryOut(
                story_id=story.get("story_id", f"story_{uuid.uuid4().hex[:12]}"),
                user_id=user_id,
                media_url=story.get("media_url") or story.get("image_url") or "",
                thumbnail_url=story.get("thumbnail_url") or story.get("image_url"),
                created_at=_coerce_iso(created_at, now),
                expires_at=_coerce_iso(expires_at, now + timedelta(hours=24)),
                viewed=viewed,
                caption=story.get("caption"),
                image_url=story.get("image_url") or story.get("media_url"),
            )
        )

    result = list(groups.values())
    if current_user:
        result.sort(key=lambda item: (not bool(item["is_own"]), item["stories"][0].created_at), reverse=False)
    response.headers["X-Total-Count"] = str(sum(len(item["stories"]) for item in result))
    return result


@router.get("/config/locale", response_model=LocaleConfigOut)
async def get_locale_config(
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    current_user = await _resolve_current_user(request, authorization)

    country_code = "ES"
    language = "en"
    currency = "EUR"

    if current_user:
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "locale": 1, "country": 1})
        locale = (user_doc or {}).get("locale", {}) or {}
        country_code = locale.get("country") or (user_doc or {}).get("country") or "ES"
        language = locale.get("language") or _COUNTRY_LANGUAGE.get(country_code, "en")
        currency = locale.get("currency") or _COUNTRY_CURRENCY.get(country_code, "EUR")
    else:
        country_header = request.headers.get("x-tenant-country") or request.headers.get("x-country-code")
        if country_header and country_header.upper() in SUPPORTED_COUNTRIES:
            country_code = country_header.upper()
        language = _COUNTRY_LANGUAGE.get(country_code, "en")
        currency = _COUNTRY_CURRENCY.get(country_code, "EUR")

    return LocaleConfigOut(
        currency=currency,
        language=language,
        country_code=country_code,
        tax_rate=_COUNTRY_TAX_RATE.get(country_code, 0.21),
        countries=SUPPORTED_COUNTRIES,
        languages=SUPPORTED_LANGUAGES,
        currencies=SUPPORTED_CURRENCIES,
        default_country="ES",
        default_language="en",
        default_currency="EUR",
    )


@router.get("/auth/me", response_model=Optional[UserOut])
async def get_me(request: Request, authorization: Optional[str] = Header(default=None)):
    return await _serialize_user_from_request(request, authorization)


@router.get("/exchange-rates", response_model=ExchangeRatesOut)
async def get_exchange_rates():
    now = datetime.now(timezone.utc)
    updated_at = _EXCHANGE_RATES_CACHE.get("updated_at")
    if _EXCHANGE_RATES_CACHE.get("rates") and isinstance(updated_at, datetime):
        if now - updated_at < timedelta(hours=24):
            return ExchangeRatesOut(
                base="EUR",
                rates=_EXCHANGE_RATES_CACHE["rates"],
                updated_at=updated_at.isoformat(),
                fallback=False,
            )

    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as client:
            api_response = await client.get("https://open.er-api.com/v6/latest/EUR")
            api_response.raise_for_status()
            payload = api_response.json()
            api_rates = payload.get("rates", {})
            filtered_rates = {
                "EUR": 1.0,
                "USD": float(api_rates.get("USD", 1.08)),
                "GBP": float(api_rates.get("GBP", 0.85)),
            }
            _EXCHANGE_RATES_CACHE["rates"] = filtered_rates
            _EXCHANGE_RATES_CACHE["updated_at"] = now
            return ExchangeRatesOut(base="EUR", rates=filtered_rates, updated_at=now.isoformat(), fallback=False)
    except Exception as exc:
        logger.warning("exchange-rates fallback enabled: %s", exc)

    cached_rates = _EXCHANGE_RATES_CACHE.get("rates") or _DEFAULT_EXCHANGE_RATES
    cached_updated = _EXCHANGE_RATES_CACHE.get("updated_at")
    return ExchangeRatesOut(
        base="EUR",
        rates=cached_rates,
        updated_at=cached_updated.isoformat() if isinstance(cached_updated, datetime) else now.isoformat(),
        fallback=True,
    )


@router.get("/feed", response_model=FeedResponseOut)
async def get_feed(
    request: Request,
    response: Response,
    scope: str = Query(default="for-you", pattern="^(following|for-you|for_you|global|hybrid)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    authorization: Optional[str] = Header(default=None),
):
    current_user = await _resolve_current_user(request, authorization)
    normalized_scope = "following" if scope == "following" else "for-you"

    base_posts = await db.user_posts.find({}, {"_id": 0}).sort("created_at", -1).limit(300).to_list(300)
    following_ids: List[str] = []
    if current_user:
        follows = await db.user_follows.find(
            {"follower_id": current_user.user_id},
            {"_id": 0, "following_id": 1},
        ).to_list(1000)
        following_ids = [item["following_id"] for item in follows if item.get("following_id")]

    if normalized_scope == "following" and current_user and following_ids:
        allowed = set(following_ids)
        allowed.add(current_user.user_id)
        filtered_posts = [post for post in base_posts if post.get("user_id") in allowed]
    else:
        def popularity(post: Dict[str, object]) -> int:
            return int(post.get("likes_count", 0)) + (2 * int(post.get("comments_count", 0))) + int(post.get("shares_count", 0))

        filtered_posts = sorted(base_posts, key=popularity, reverse=True)

    page = filtered_posts[offset:offset + limit]
    items: List[Dict[str, object]] = []
    user_cache: Dict[str, Dict[str, object]] = {}
    for post in page:
        post_user_id = post.get("user_id")
        if post_user_id and post_user_id not in user_cache:
            user_cache[post_user_id] = await db.users.find_one(
                {"user_id": post_user_id},
                {"_id": 0, "name": 1, "profile_image": 1, "picture": 1, "role": 1, "country": 1},
            ) or {}

        author = user_cache.get(post_user_id, {})
        tagged_product = post.get("tagged_product")
        if tagged_product and tagged_product.get("product_id"):
            live_product = await db.products.find_one(
                {"product_id": tagged_product["product_id"]},
                {"_id": 0, "name": 1, "price": 1, "stock": 1, "images": 1, "track_stock": 1},
            )
            if live_product:
                tagged_product = {
                    **tagged_product,
                    "name": live_product.get("name", tagged_product.get("name")),
                    "price": live_product.get("price", tagged_product.get("price", 0)),
                    "stock": live_product.get("stock", 0),
                    "in_stock": bool(live_product.get("stock", 0) > 0 or not live_product.get("track_stock", True)),
                    "image": (live_product.get("images") or [tagged_product.get("image")])[0],
                }

        items.append(
            {
                **post,
                "post_id": post.get("post_id") or post.get("id") or f"post_{uuid.uuid4().hex[:10]}",
                "user_name": author.get("name", post.get("user_name", "Usuario")),
                "user_profile_image": author.get("profile_image") or author.get("picture"),
                "user_role": author.get("role", "customer"),
                "user_country": author.get("country"),
                "tagged_product": tagged_product,
                "product_available_in_country": True,
                "is_liked": False,
                "is_bookmarked": False,
            }
        )

    response.headers["X-Total-Count"] = str(len(filtered_posts))
    return FeedResponseOut(
        posts=items,
        total=len(filtered_posts),
        limit=limit,
        offset=offset,
        scope=normalized_scope,
        has_more=offset + limit < len(filtered_posts),
    )


@router.post("/track/visit", response_model=TrackVisitOut)
async def track_visit(payload: TrackVisitIn, request: Request):
    visit_doc = {
        "visit_id": str(uuid.uuid4()),
        "path": payload.path,
        "referrer": payload.referrer,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_agent": request.headers.get("user-agent"),
        "ip_address": (request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if request.client else None),
    }
    try:
        await db.analytics_visits.insert_one(visit_doc)
    except Exception as exc:
        logger.warning("track/visit write failed: %s", exc)
    return TrackVisitOut(success=True)


@router.get("/auth/google/url", response_model=GoogleAuthUrlOut)
async def get_google_auth_url():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    backend_url = (settings.AUTH_BACKEND_URL or "").rstrip("/")
    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": f"{backend_url}/api/auth/google/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "state": uuid.uuid4().hex,
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    return GoogleAuthUrlOut(url=f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
