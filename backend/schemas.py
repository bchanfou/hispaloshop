from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(buyer|producer|influencer)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TenantResponse(BaseModel):
    id: UUID
    code: str
    name: str
    default_currency: str
    model_config = ConfigDict(from_attributes=True)


class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    current_period_end: datetime
    commission_bps: int
    model_config = ConfigDict(from_attributes=True)


class InfluencerProfileResponse(BaseModel):
    tier: str
    total_earnings_cents: int
    followers_count: int
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    tenant_id: UUID
    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(UserResponse):
    bio: Optional[str]
    avatar_url: Optional[str]
    subscription: Optional[SubscriptionResponse]
    influencer_profile: Optional[InfluencerProfileResponse]
    tenant: TenantResponse


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[HttpUrl] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class CategoryBase(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    image_url: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(CategoryBase):
    product_count: int = 0
    children: List["CategoryResponse"] = Field(default_factory=list)


class ProductImageResponse(BaseModel):
    id: UUID
    url: str
    thumbnail_url: Optional[str]
    alt_text: Optional[str]
    sort_order: int
    is_primary: bool
    model_config = ConfigDict(from_attributes=True)


class ProductCertificateResponse(BaseModel):
    id: UUID
    name: str
    issuer: str
    is_verified: bool
    model_config = ConfigDict(from_attributes=True)


class ProducerSummaryResponse(BaseModel):
    id: UUID
    full_name: str
    avatar_url: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    short_description: Optional[str]
    price_cents: int
    compare_at_price_cents: Optional[int]
    currency: str = "EUR"
    images: List[ProductImageResponse] = Field(default_factory=list)
    producer: ProducerSummaryResponse
    badges: List[str] = Field(default_factory=list)
    inventory_quantity: int
    category: CategoryBase
    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(ProductListResponse):
    description: Optional[str]
    certificates: List[ProductCertificateResponse] = Field(default_factory=list)
    related_products: List[ProductListResponse] = Field(default_factory=list)


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    category_id: UUID
    description: Optional[str] = Field(None, max_length=5000)
    short_description: Optional[str] = Field(None, max_length=500)
    price_cents: int = Field(..., gt=0)
    compare_at_price_cents: Optional[int] = Field(None, gt=0)
    inventory_quantity: int = Field(default=0, ge=0)
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_organic: bool = False
    origin_country: Optional[str] = Field(None, max_length=2)


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    short_description: Optional[str] = None
    price_cents: Optional[int] = Field(None, gt=0)
    inventory_quantity: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(draft|active|paused|deleted)$")


class ProductImageUploadResponse(BaseModel):
    id: UUID
    url: str
    thumbnail_url: Optional[str]


class CursorPaginationResponse(BaseModel):
    items: List[ProductListResponse]
    next_cursor: Optional[str] = None
    has_more: bool
    total_count: Optional[int] = None


class CategoryListResponse(BaseModel):
    items: List[CategoryResponse]
