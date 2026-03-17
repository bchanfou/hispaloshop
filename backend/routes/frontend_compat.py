from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
from urllib.parse import urlencode, urlparse
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
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}
_TRUSTED_FRONTEND_SUFFIXES = ("hispaloshop.com", "vercel.app")

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


def _feed_popularity_score(post: Dict[str, object], signal_counts: Dict[str, int]) -> float:
    return (
        (int(post.get("likes_count", 0)) * 1.0)
        + (int(post.get("comments_count", 0)) * 2.0)
        + (int(post.get("shares_count", 0)) * 2.5)
        + (int(post.get("saves_count", 0)) * 2.25)
        + (signal_counts.get("product_click", 0) * 3.5)
        + (signal_counts.get("add_to_cart", 0) * 5.0)
        + (signal_counts.get("recipe_save", 0) * 3.0)
        + (len(post.get("tagged_products") or []) * 1.5)
    )


def _coerce_iso(value: object, default: Optional[datetime] = None) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    base = default or datetime.now(timezone.utc)
    return base.isoformat()


def _extract_origin(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    parsed = urlparse(value.strip())
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def _is_local_origin(value: Optional[str]) -> bool:
    origin = _extract_origin(value)
    if not origin:
        return False
    hostname = (urlparse(origin).hostname or "").lower()
    return hostname in _LOCAL_HOSTS


def _is_trusted_frontend_origin(value: Optional[str]) -> bool:
    origin = _extract_origin(value)
    if not origin:
        return False
    hostname = (urlparse(origin).hostname or "").lower()
    if hostname in _LOCAL_HOSTS:
        return True
    return any(hostname.endswith(suffix) for suffix in _TRUSTED_FRONTEND_SUFFIXES)


def _get_request_origin(request: Request) -> str:
    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    scheme = forwarded_proto or request.url.scheme or "http"
    return f"{scheme}://{host}".rstrip("/")


def _is_secure_request(request: Request) -> bool:
    return _get_request_origin(request).startswith("https://")


def _get_public_auth_backend_url(request: Request) -> str:
    configured = (settings.AUTH_BACKEND_URL or "").rstrip("/")
    request_origin = _get_request_origin(request)
    if request_origin and not _is_local_origin(request_origin):
        return request_origin
    return configured or request_origin


def _get_public_frontend_url(request: Request) -> str:
    header_origin = _extract_origin(request.headers.get("origin")) or _extract_origin(request.headers.get("referer"))
    configured = (settings.FRONTEND_URL or "").rstrip("/")
    if header_origin and _is_trusted_frontend_origin(header_origin):
        return header_origin
    return configured or header_origin or _get_request_origin(request)


def _flat_user_doc(user_doc: dict) -> dict:
    """Return a flat, JSON-safe user dict identical in shape to auth.py's _sanitize_user_doc."""
    from datetime import datetime as _dt
    def _json_safe(v):
        if isinstance(v, _dt):
            return v.isoformat()
        if isinstance(v, dict):
            return {k: _json_safe(i) for k, i in v.items()}
        if isinstance(v, list):
            return [_json_safe(i) for i in v]
        return v
    doc = {k: _json_safe(v) for k, v in user_doc.items()}
    if doc.get("role") == "customer":
        doc["onboarding_completed"] = bool(doc.get("onboarding_completed", False))
        doc["onboarding_step"] = int(doc.get("onboarding_step", 1) or 1)
    else:
        doc["onboarding_completed"] = bool(doc.get("onboarding_completed", True))
        doc["onboarding_step"] = int(doc.get("onboarding_step", 0) or 0)
    doc.setdefault("followers_count", len(doc.get("followers", [])))
    return doc


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
        onboarding_completed=user_doc.get("onboarding_completed"),
        username=user_doc.get("username"),
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
    """Return active stories from the last 24 hours."""
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
    """Return locale configuration for the current user or request."""
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


@router.get("/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(default=None)):
    """Return the authenticated user profile or None."""
    user = await _resolve_current_user(request, authorization)
    if not user:
        return None
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        return None
    return _flat_user_doc(user_doc)


@router.get("/exchange-rates", response_model=ExchangeRatesOut)
async def get_exchange_rates():
    """Return cached EUR-based exchange rates."""
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
    before: Optional[str] = Query(default=None, description="Cursor: created_at of last seen post (ISO)"),
    authorization: Optional[str] = Header(default=None),
):
    """Return the social feed with pagination and scope filtering.
    Supports cursor-based pagination via `before` param to prevent duplicate posts on scroll.
    Falls back to offset-based if `before` is not provided (backward compat).
    """
    current_user = await _resolve_current_user(request, authorization)
    normalized_scope = "following" if scope == "following" else "for-you"

    # Cursor-based filter: only fetch posts older than the cursor to prevent duplicates
    post_filter: Dict[str, object] = {}
    if before:
        post_filter["created_at"] = {"$lt": before}

    base_posts = await db.user_posts.find(post_filter, {"_id": 0}).sort("created_at", -1).limit(300).to_list(300)
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
        post_ids = [post.get("post_id") for post in base_posts if post.get("post_id")]
        signal_rows = []
        if post_ids:
            signal_rows = await db.intelligence_signals.aggregate(
                [
                    {"$match": {"content_type": "post", "content_id": {"$in": post_ids}, "event_type": {"$in": ["product_click", "add_to_cart", "recipe_save"]}}},
                    {"$group": {"_id": {"content_id": "$content_id", "event_type": "$event_type"}, "count": {"$sum": 1}}},
                ]
            ).to_list(500)

        signal_map: Dict[str, Dict[str, int]] = {}
        for row in signal_rows:
            content_id = row.get("_id", {}).get("content_id")
            event_type = row.get("_id", {}).get("event_type")
            if not content_id or not event_type:
                continue
            signal_map.setdefault(content_id, {})[event_type] = row.get("count", 0)

        filtered_posts = sorted(
            base_posts,
            key=lambda post: _feed_popularity_score(post, signal_map.get(post.get("post_id"), {})),
            reverse=True,
        )

    page = filtered_posts[offset:offset + limit]
    items: List[Dict[str, object]] = []
    user_cache: Dict[str, Dict[str, object]] = {}
    for post in page:
        post_user_id = post.get("user_id")
        if post_user_id and post_user_id not in user_cache:
            user_cache[post_user_id] = await db.users.find_one(
                {"user_id": post_user_id},
                {"_id": 0, "name": 1, "profile_image": 1, "picture": 1, "role": 1, "country": 1, "account_status": 1},
            ) or {}

        author = user_cache.get(post_user_id, {})
        # Skip posts from suspended users
        if author.get("account_status") == "suspended":
            continue
        tagged_product = post.get("tagged_product")
        # tagged_product can be a string (product_id) or a dict
        if isinstance(tagged_product, str):
            tagged_product = {"product_id": tagged_product}
        tagged_products = post.get("tagged_products") or ([tagged_product] if tagged_product else [])
        if tagged_product and isinstance(tagged_product, dict) and tagged_product.get("product_id"):
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

        hydrated_tags = []
        for tag in tagged_products:
            product_id = tag.get("product_id")
            if not product_id:
                continue
            live_product = await db.products.find_one(
                {"product_id": product_id},
                {"_id": 0, "name": 1, "price": 1, "stock": 1, "images": 1, "track_stock": 1},
            )
            hydrated_tags.append(
                {
                    **tag,
                    "name": live_product.get("name", tag.get("name", "")) if live_product else tag.get("name", ""),
                    "price": live_product.get("price", tag.get("price", 0)) if live_product else tag.get("price", 0),
                    "image": (live_product.get("images") or [tag.get("image")])[0] if live_product else tag.get("image"),
                }
            )

        items.append(
            {
                **post,
                "post_id": post.get("post_id") or post.get("id") or f"post_{uuid.uuid4().hex[:10]}",
                "user_name": author.get("name", post.get("user_name", "Usuario")),
                "user_profile_image": author.get("profile_image") or author.get("picture"),
                "user_role": author.get("role", "customer"),
                "user_country": author.get("country"),
                "tagged_product": tagged_product,
                "tagged_products": hydrated_tags,
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
    """Record an analytics page visit."""
    visit_doc = {
        "visit_id": str(uuid.uuid4()),
        "path": payload.resolved_path,
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


@router.get("/auth/google/url")
async def get_google_auth_url(request: Request):
    """Generate the Google OAuth2 authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    backend_url = _get_public_auth_backend_url(request)
    state = uuid.uuid4().hex
    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": f"{backend_url}/api/auth/google/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    is_secure = _is_secure_request(request)
    frontend_origin = _extract_origin(request.headers.get("origin")) or _extract_origin(request.headers.get("referer")) or _get_public_frontend_url(request)
    from fastapi.responses import JSONResponse as _JSONResponse
    resp = _JSONResponse(content={"auth_url": auth_url, "state": state})
    resp.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,
        httponly=True,
        secure=is_secure,
        samesite="lax" if not is_secure else "none",
    )
    resp.set_cookie(
        key="oauth_frontend_origin",
        value=frontend_origin,
        max_age=600,
        httponly=True,
        secure=is_secure,
        samesite="lax" if not is_secure else "none",
    )
    return resp
