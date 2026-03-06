from datetime import datetime
from typing import Any, Dict, List, Optional, Literal
from uuid import UUID

from pydantic import AliasChoices, BaseModel, EmailStr, Field, HttpUrl, ConfigDict


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(customer|buyer|producer|influencer|importer)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


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
    tier: Literal["perseo", "aquiles", "hercules", "apolo", "zeus"]
    tier_name: Optional[str] = None
    tier_percentage: Optional[int] = None
    next_tier: Optional[Literal["perseo", "aquiles", "hercules", "apolo", "zeus"]] = None
    next_tier_gmv_required_cents: Optional[int] = None
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
    description: Optional[str] = None
    image_url: Optional[str] = None
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
    shipping_cents: int = 0
    tax_cents: int = 0
    tax_rate_bp: int = 2100
    total_cents: int = 0
    currency: str = "EUR"
    item_count: int
    affiliate_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ShippingPolicyUpdate(BaseModel):
    enabled: bool = True
    base_cost_cents: int = Field(default=0, ge=0)
    free_threshold_cents: Optional[int] = Field(default=None, ge=0)
    per_item_cents: int = Field(default=0, ge=0)


class ShippingPolicyResponse(ShippingPolicyUpdate):
    pass


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


class InfluencerDashboardProfile(BaseModel):
    tier: Literal["perseo", "aquiles", "hercules", "apolo", "zeus"]
    tier_name: str
    tier_badge: str
    commission_rate: str
    followers_count: int
    niche: List[str] = Field(default_factory=list)
    is_verified: bool


class InfluencerDashboardNextTier(BaseModel):
    key: Literal["perseo", "aquiles", "hercules", "apolo", "zeus"]
    name: str
    commission_rate: str
    gmv_needed_cents: int


class InfluencerDashboardResponse(BaseModel):
    profile: InfluencerDashboardProfile
    earnings: dict
    this_month: dict
    trend: dict
    next_tier: Optional[InfluencerDashboardNextTier] = None


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


class PostCreateRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=2200)
    visibility: str = Field(default="public", pattern="^(public|followers|private)$")
    location: Optional[Dict[str, Any]] = None
    tagged_products: Optional[List[Dict[str, Any]]] = None


class PostMediaResponse(BaseModel):
    url: str
    width: int = 0
    height: int = 0
    type: str
    thumbnail_url: Optional[str] = None


class PostUserSummary(BaseModel):
    id: UUID
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]
    is_followed_by_me: bool = False
    is_verified: bool = False


class PostEngagementResponse(BaseModel):
    likes_count: int
    comments_count: int
    shares_count: int
    saves_count: int
    is_liked_by_me: bool = False
    is_saved_by_me: bool = False


class PostResponse(BaseModel):
    id: UUID
    user: PostUserSummary
    content: Optional[str]
    media: List[PostMediaResponse] = Field(default_factory=list)
    tagged_products: List[Dict[str, Any]] = Field(default_factory=list)
    engagement: PostEngagementResponse
    created_at: datetime
    score: Optional[float] = None


class PostListResponse(BaseModel):
    items: List[PostResponse]
    next_cursor: Optional[str] = None
    has_more: bool


class CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[UUID] = None


class CommentUserSummary(BaseModel):
    id: UUID
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool = False


class CommentResponse(BaseModel):
    id: UUID
    user: CommentUserSummary
    content: str
    likes_count: int
    is_liked_by_me: bool = False
    is_edited: bool
    created_at: datetime
    replies: List["CommentResponse"] = Field(default_factory=list)


class FollowResponse(BaseModel):
    id: UUID
    follower_id: UUID
    following_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FollowerResponse(BaseModel):
    id: UUID
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool = False
    is_followed_by_me: bool = False
    followers_count: int = 0


class PublicProfileResponse(BaseModel):
    id: UUID
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    website_url: Optional[str]
    social_links: Optional[Dict[str, str]]
    is_verified: bool
    is_followed_by_me: bool
    stats: Dict[str, Any]
    role_info: Dict[str, Any]
    recent_posts: List[PostResponse]


class ReelCreateRequest(BaseModel):
    caption: Optional[str] = Field(None, max_length=2200)
    hashtags: Optional[str] = Field(None, max_length=500)
    tagged_products: Optional[List[Dict[str, Any]]] = None
    sound_id: Optional[UUID] = None
    cover_frame_seconds: Optional[float] = Field(default=0, ge=0)


class ReelVideoResponse(BaseModel):
    url_480p: str
    url_720p: str
    thumbnail_url: str
    duration_seconds: float
    aspect_ratio: str


class ReelResponse(PostResponse):
    is_reel: bool = True
    video: ReelVideoResponse
    views_unique: int
    completion_rate: Optional[float]
    viral_score: float
    hashtags: List[str] = Field(default_factory=list)


class ReelViewTrackRequest(BaseModel):
    watch_time_seconds: float = Field(..., ge=0)
    watched_full: bool
    device_type: str = Field(..., pattern="^(mobile|tablet|desktop)$")
    source: str = Field(default="for_you", pattern="^(for_you|following|hashtag|profile|feed)$")


class HashtagResponse(BaseModel):
    id: UUID
    name: str
    posts_count: int
    is_followed_by_me: bool

    model_config = ConfigDict(from_attributes=True)


class ConnectAccountResponse(BaseModel):
    account_id: str
    status: bool
    onboarding_url: Optional[str] = None


class ConnectStatusResponse(BaseModel):
    has_account: bool
    account_id: Optional[str] = None
    status: str
    charges_enabled: Optional[bool] = None
    payouts_enabled: Optional[bool] = None
    requirements_due: Optional[List[str]] = None
    onboarding_completed: bool = False


class HashtagDetailResponse(HashtagResponse):
    trending_score: float
    recent_posts: List[Any]


class StoryInteractiveElement(BaseModel):
    type: str
    data: Dict[str, Any]


class StoryCreateRequest(BaseModel):
    tagged_product_id: Optional[UUID] = None
    polls: Optional[List[StoryInteractiveElement]] = None
    questions: Optional[List[StoryInteractiveElement]] = None
    sliders: Optional[List[StoryInteractiveElement]] = None
    countdowns: Optional[List[StoryInteractiveElement]] = None
    links: Optional[List[StoryInteractiveElement]] = None


class StoryResponse(BaseModel):
    id: UUID
    user: PostUserSummary
    media_url: str
    media_type: str
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    tagged_product: Optional[ProductListResponse] = None
    interactive_elements: List[StoryInteractiveElement] = Field(default_factory=list)
    expires_at: datetime
    is_viewed_by_me: bool = False

    model_config = ConfigDict(from_attributes=True)


class StoryFeedResponse(BaseModel):
    user: PostUserSummary
    has_unviewed_stories: bool
    latest_story_thumbnail: Optional[str]


class SavedCollectionCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_private: bool = True


class SavedCollectionResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    cover_image_url: Optional[str]
    items_count: int
    is_private: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageAttachmentCreate(BaseModel):
    type: str = Field(pattern="^(image|document)$")
    url: HttpUrl
    cloudinary_public_id: Optional[str] = None
    size: Optional[int] = Field(default=None, ge=1)


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender_type: str
    content: str
    message_type: str
    reply_to_id: Optional[UUID] = None
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("metadata_json", "metadata"),
        serialization_alias="metadata",
    )
    created_at: datetime
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ConversationParticipantResponse(BaseModel):
    user_id: UUID
    role: str
    last_read_at: Optional[datetime] = None
    notifications_enabled: bool
    joined_at: datetime
    left_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: UUID
    type: str
    related_order_id: Optional[UUID] = None
    related_product_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("metadata_json", "metadata"),
        serialization_alias="metadata",
    )
    model_config = ConfigDict(from_attributes=True)


class ConversationListItemResponse(ConversationResponse):
    unread_count: int = 0
    last_message: Optional[MessageResponse] = None


class ConversationDetailResponse(BaseModel):
    conversation: ConversationResponse
    messages: List[MessageResponse] = Field(default_factory=list)
    next_cursor: Optional[datetime] = None
    has_more: bool = False


class ConversationCreateRequest(BaseModel):
    type: str = Field(pattern="^(support|transaction|influencer_brand|social|group_order|b2b_negotiation)$")
    participant_ids: List[UUID] = Field(default_factory=list, min_length=1, max_length=50)
    related_order_id: Optional[UUID] = None
    related_product_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    message_type: str = Field(default="text", pattern="^(text|image|product|order|ai_response)$")
    reply_to_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None
    attachments: List[MessageAttachmentCreate] = Field(default_factory=list)


class MarkConversationReadRequest(BaseModel):
    read_at: Optional[datetime] = None


class ImporterProfileBase(BaseModel):
    company_name: str = Field(min_length=2, max_length=255)
    vat_tax_id: Optional[str] = None
    business_registration: Optional[str] = None
    country_origin: str = Field(min_length=2, max_length=2)
    warehouses: List[Dict[str, Any]] = Field(default_factory=list)
    specializations: List[str] = Field(default_factory=list)
    years_experience: Optional[int] = Field(default=None, ge=0)
    certifications: Dict[str, Any] = Field(default_factory=dict)
    annual_volume_usd: Optional[float] = Field(default=None, ge=0)
    payment_terms_accepted: List[str] = Field(default_factory=list)


class ImporterProfileCreateRequest(ImporterProfileBase):
    verification_documents: Dict[str, Any] = Field(default_factory=dict)


class ImporterProfileUpdateRequest(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    vat_tax_id: Optional[str] = None
    business_registration: Optional[str] = None
    country_origin: Optional[str] = Field(default=None, min_length=2, max_length=2)
    warehouses: Optional[List[Dict[str, Any]]] = None
    specializations: Optional[List[str]] = None
    years_experience: Optional[int] = Field(default=None, ge=0)
    certifications: Optional[Dict[str, Any]] = None
    annual_volume_usd: Optional[float] = Field(default=None, ge=0)
    payment_terms_accepted: Optional[List[str]] = None


class ImporterBrandCreateRequest(BaseModel):
    brand_name: str = Field(min_length=2, max_length=255)
    brand_country: Optional[str] = Field(default=None, min_length=2, max_length=2)
    category: Optional[str] = None
    exclusive_territory: List[str] = Field(default_factory=list)
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    minimum_order_value: Optional[float] = Field(default=None, ge=0)
    documentation_url: Optional[str] = None


class ImporterBrandResponse(ImporterBrandCreateRequest):
    id: UUID
    importer_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ImporterProfileResponse(ImporterProfileBase):
    id: UUID
    user_id: UUID
    is_verified: bool
    verification_documents: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    brands: List[ImporterBrandResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class ImporterPublicProfileResponse(BaseModel):
    id: UUID
    company_name: str
    country_origin: str
    specializations: List[str] = Field(default_factory=list)
    is_verified: bool
    brands: List[ImporterBrandResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class ImporterVerificationRequest(BaseModel):
    verification_documents: Dict[str, Any]


class QuoteItem(BaseModel):
    product_id: UUID
    qty_requested: int = Field(ge=1)
    unit_price_quoted: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class B2BQuoteCreateRequest(BaseModel):
    importer_id: UUID
    items: List[QuoteItem] = Field(min_length=1)
    valid_until: Optional[datetime] = None
    incoterm: Optional[str] = None
    shipping_estimate: Optional[str] = None
    terms_conditions: Optional[str] = None


class B2BQuoteUpdateRequest(BaseModel):
    status: Optional[str] = Field(default=None, pattern='^(draft|sent|accepted|rejected|expired)$')
    items: Optional[List[QuoteItem]] = None
    valid_until: Optional[datetime] = None
    incoterm: Optional[str] = None
    shipping_estimate: Optional[str] = None
    terms_conditions: Optional[str] = None


class B2BQuoteResponse(BaseModel):
    id: UUID
    importer_id: UUID
    requester_producer_id: UUID
    status: str
    items: List[Dict[str, Any]]
    total_value: float
    valid_until: Optional[datetime] = None
    incoterm: Optional[str] = None
    shipping_estimate: Optional[str] = None
    terms_conditions: Optional[str] = None
    accepted_at: Optional[datetime] = None
    converted_to_order_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ShippingQuoteCargo(BaseModel):
    actual_weight_kg: float = Field(gt=0)
    volume_cbm: float = Field(gt=0)
    declared_value: float = Field(gt=0)
    hs_code_tariff_rate: float = Field(ge=0, le=1)


class ShippingQuoteRequest(BaseModel):
    origin_country: str = Field(min_length=2, max_length=2)
    destination_country: str = Field(min_length=2, max_length=2)
    mode: Optional[str] = Field(default=None, pattern="^(sea|air|road|rail)$")
    cargo: ShippingQuoteCargo


class ShippingQuoteResponse(BaseModel):
    freight_cost: float
    origin_charges: float
    destination_charges: float
    insurance: float
    total_estimated: float
    transit_time_days: int
    valid_until: datetime


class ShipmentCreateRequest(BaseModel):
    type: str = Field(pattern="^(fcl|lcl|air|road|rail)$")
    importer_id: UUID
    exporter_id: UUID
    route_id: UUID
    carrier_id: Optional[UUID] = None
    service_level: str = Field(default="standard", pattern="^(economy|standard|express)$")
    containers: List[Dict[str, Any]] = Field(default_factory=list)
    incoterm: Optional[str] = None
    payment_term: Optional[str] = None
    estimated_departure: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    related_order_ids: List[UUID] = Field(default_factory=list)


class ShipmentDocumentUpdateRequest(BaseModel):
    documents: Dict[str, Any]


class ShipmentEventCreateRequest(BaseModel):
    status: str = Field(pattern="^(draft|booked|in_transit|customs_clearance|delivered)$")
    location: str = Field(min_length=2)
    description: Optional[str] = None
    occurred_at: Optional[datetime] = None


class ShipmentResponse(BaseModel):
    id: UUID
    shipment_number: str
    type: str
    importer_id: UUID
    exporter_id: UUID
    route_id: UUID
    carrier_id: Optional[UUID] = None
    service_level: str
    status: str
    containers: List[Dict[str, Any]] = Field(default_factory=list)
    incoterm: Optional[str] = None
    payment_term: Optional[str] = None
    documents: Dict[str, Any] = Field(default_factory=dict)
    tracking_events: List[Dict[str, Any]] = Field(default_factory=list)
    cost_breakdown: Dict[str, Any] = Field(default_factory=dict)
    estimated_departure: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EscrowCreateRequest(BaseModel):
    importer_id: UUID
    exporter_id: UUID
    shipment_id: Optional[UUID] = None
    amount_cents: int = Field(gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    provider: Optional[str] = None


class EscrowFundRequest(BaseModel):
    provider_reference: Optional[str] = None


class EscrowDisputeRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class EscrowResponse(BaseModel):
    id: UUID
    importer_id: UUID
    exporter_id: UUID
    shipment_id: Optional[UUID] = None
    amount_cents: int
    currency: str
    status: str
    provider: Optional[str] = None
    provider_reference: Optional[str] = None
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)
    released_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DocumentGenerateRequest(BaseModel):
    shipment_id: UUID
    document_types: List[str] = Field(min_length=1)


class DocumentSignRequest(BaseModel):
    signer_name: str = Field(min_length=2)


class B2BDocumentResponse(BaseModel):
    id: UUID
    shipment_id: UUID
    document_type: str
    status: str
    file_url: Optional[str] = None
    content: Dict[str, Any] = Field(default_factory=dict)
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ForwarderResponse(BaseModel):
    id: UUID
    company_name: str
    countries_covered: List[str] = Field(default_factory=list)
    specialties: Dict[str, Any] = Field(default_factory=dict)
    services: List[str] = Field(default_factory=list)
    api_integration: bool
    api_endpoint: Optional[str] = None
    rating: float
    volume_handled_ytd: float
    active: bool
    model_config = ConfigDict(from_attributes=True)
