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


class CartItemProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    images: List[ProductImageResponse]
    producer: ProducerSummaryResponse
    model_config = ConfigDict(from_attributes=True)


class CartItemResponse(BaseModel):
    id: UUID
    product: CartItemProductResponse
    quantity: int
    unit_price_cents: int
    total_cents: int
    max_available: int
    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: UUID
    items: List[CartItemResponse]
    subtotal_cents: int
    item_count: int
    affiliate_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class CartItemCreateRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1, le=99)
    affiliate_code: Optional[str] = Field(None, max_length=20)


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=0, le=99)


class ShippingAddress(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    line1: str = Field(..., min_length=1, max_length=200)
    line2: Optional[str] = Field(None, max_length=200)
    city: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(..., min_length=2, max_length=2)
    phone: Optional[str] = Field(None, max_length=20)


class CheckoutCreateRequest(BaseModel):
    shipping_address: ShippingAddress


class CheckoutResponse(BaseModel):
    checkout_url: str
    order_id: UUID
    expires_at: datetime


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_sku: Optional[str]
    quantity: int
    unit_price_cents: int
    total_cents: int
    fulfillment_status: str
    tracking_number: Optional[str]
    shipped_at: Optional[datetime]
    delivered_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    status: str
    payment_status: str
    subtotal_cents: int
    shipping_cents: int
    tax_cents: int
    total_cents: int
    platform_fee_cents: int
    affiliate_code: Optional[str]
    affiliate_commission_cents: Optional[int]
    items: List[OrderItemResponse]
    shipping_address: Optional[dict]
    created_at: datetime
    paid_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    id: UUID
    status: str
    total_cents: int
    item_count: int
    created_at: datetime
    thumbnail_url: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class ProducerOrderItemResponse(BaseModel):
    order_item_id: UUID
    order_id: UUID
    product_name: str
    quantity: int
    unit_price_cents: int
    total_cents: int
    producer_payout_cents: int
    fulfillment_status: str
    shipping_address: dict
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FulfillRequest(BaseModel):
    action: str = Field(..., pattern="^(process|ship|deliver)$")
    tracking_number: Optional[str] = Field(None, max_length=100)


class AffiliateLinkCreateRequest(BaseModel):
    product_id: Optional[UUID] = None
    custom_code: Optional[str] = Field(None, min_length=4, max_length=20, pattern="^[A-Za-z0-9]+$")


class AffiliateLinkResponse(BaseModel):
    id: UUID
    code: str
    tracking_url: str
    product: Optional[ProductListResponse] = None
    status: str
    total_clicks: int
    total_conversions: int
    total_gmv_cents: int
    total_commission_cents: int
    conversion_rate: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AffiliateLinkListResponse(BaseModel):
    items: List[AffiliateLinkResponse]
    total: int


class InfluencerDashboardResponse(BaseModel):
    profile: dict
    earnings: dict
    this_month: dict
    trend: dict
    next_tier: Optional[dict]


class CommissionResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_name: str
    sale_amount_cents: int
    commission_rate_bps: int
    commission_cents: int
    status: str
    created_at: datetime
    can_approve_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class CommissionSummaryResponse(BaseModel):
    pending_cents: int
    approved_cents: int
    paid_cents: int


class CommissionListResponse(BaseModel):
    items: List[CommissionResponse]
    summary: CommissionSummaryResponse


class PayoutResponse(BaseModel):
    id: UUID
    amount_cents: int
    status: str
    method: str
    requested_at: datetime
    processed_at: Optional[datetime]
    paid_at: Optional[datetime]
    commissions_count: int
    model_config = ConfigDict(from_attributes=True)


class PayoutRequestCreate(BaseModel):
    pass

from typing import Dict, Any


class ProductEmbeddingCreate(BaseModel):
    product_id: UUID
    embedding_text: str


class RecommendationItem(BaseModel):
    product: ProductListResponse
    recommendation_reason: str
    similarity_score: float
    position: int

    model_config = ConfigDict(from_attributes=True)


class PersonalizedRecommendationsResponse(BaseModel):
    items: List[RecommendationItem]
    generated_at: datetime
    based_on: Dict[str, Any]


class TrendingProductsResponse(BaseModel):
    items: List[ProductListResponse]
    period: str
    generated_at: datetime


class ChatSessionCreateRequest(BaseModel):
    context: Optional[Dict[str, Any]] = None


class ChatSessionResponse(BaseModel):
    id: UUID
    status: str
    welcome_message: str
    created_at: datetime


class ChatMessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    recommended_products: Optional[List[UUID]]
    tokens_used: Optional[int]
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    session: ChatSessionResponse
    messages: List[ChatMessageResponse]
    suggested_products: List[ProductListResponse]


class ChatCloseRequest(BaseModel):
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=500)


class InfluencerMatchSummary(BaseModel):
    id: UUID
    full_name: str
    avatar_url: Optional[str]
    tier: str
    followers_count: int
    niche: List[str]
    engagement_rate: Optional[float]
    avg_gmv_monthly: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class MatchScoreBreakdown(BaseModel):
    category_match: float
    performance: float
    audience: float
    location: float
    values: float


class MatchResponse(BaseModel):
    influencer: InfluencerMatchSummary
    score: float
    breakdown: MatchScoreBreakdown
    reasons: List[str]
    suggested_collaboration: str
    confidence: str


class ProducerMatchesResponse(BaseModel):
    matches: List[MatchResponse]
    total_available: int
    generated_at: datetime


class ContactInfluencerRequest(BaseModel):
    influencer_id: UUID
    message: str = Field(..., min_length=10, max_length=1000)
    offer_type: str = Field(..., pattern="^(samples|paid|affiliate|event)$")


class InfluencerOpportunity(BaseModel):
    producer: ProducerSummaryResponse
    score: float
    reasons: List[str]
    product_categories: List[str]
    estimated_gmv_potential: int


class InfluencerOpportunitiesResponse(BaseModel):
    opportunities: List[InfluencerOpportunity]
    total_available: int
