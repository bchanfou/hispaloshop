from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StoryOut(BaseModel):
    story_id: str
    user_id: str
    media_url: str
    thumbnail_url: Optional[str] = None
    created_at: str
    expires_at: str
    viewed: bool = False
    caption: Optional[str] = None
    image_url: Optional[str] = None


class StoryGroupOut(BaseModel):
    user_id: str
    user_name: str
    profile_image: Optional[str] = None
    role: str = "customer"
    is_own: bool = False
    stories: List[StoryOut]


class LocaleConfigOut(BaseModel):
    currency: str = "EUR"
    language: str = "en"
    country_code: str = "ES"
    tax_rate: float = 0.21
    countries: Dict[str, Any] = Field(default_factory=dict)
    languages: Dict[str, Any] = Field(default_factory=dict)
    currencies: Dict[str, Any] = Field(default_factory=dict)
    default_country: str = "ES"
    default_language: str = "en"
    default_currency: str = "EUR"


class UserProfileOut(BaseModel):
    picture: Optional[str] = None
    profile_image: Optional[str] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    locale: Dict[str, Any] = Field(default_factory=dict)


class UserOut(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    role: str = "customer"
    email_verified: bool = False
    approved: bool = False
    onboarding_completed: Optional[bool] = None
    username: Optional[str] = None
    profile: UserProfileOut


class ExchangeRatesOut(BaseModel):
    base: str = "EUR"
    rates: Dict[str, float]
    updated_at: Optional[str] = None
    fallback: bool = False


class FeedPostOut(BaseModel):
    post_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_profile_image: Optional[str] = None
    user_role: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    tagged_product: Optional[Dict[str, Any]] = None
    product_available_in_country: bool = True
    is_liked: bool = False
    is_bookmarked: bool = False


class FeedResponseOut(BaseModel):
    posts: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int
    scope: str
    has_more: bool


class TrackVisitIn(BaseModel):
    path: Optional[str] = None
    page: Optional[str] = None
    country: Optional[str] = None
    referrer: Optional[str] = None

    @property
    def resolved_path(self) -> str:
        return self.path or self.page or "/"


class TrackVisitOut(BaseModel):
    success: bool = True


class GoogleAuthUrlOut(BaseModel):
    auth_url: str
    state: str
