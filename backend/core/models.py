"""
All Pydantic models for Hispaloshop.
Single source of truth — imported by server.py and all route modules.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── User & Auth ──────────────────────────────────────────────

class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: str
    country: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False
    password_hash: Optional[str] = None
    created_at: datetime
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    contact_person: Optional[str] = None
    fiscal_address: Optional[str] = None
    vat_cif: Optional[str] = None
    stripe_account_id: Optional[str] = None
    approved: bool = False


class Address(BaseModel):
    full_name: str
    street: str
    city: str
    postal_code: str
    country: str
    phone: Optional[str] = None


class ShippingAddress(BaseModel):
    address_id: Optional[str] = None
    name: str
    full_name: str
    street: str
    city: str
    postal_code: str
    country: str
    phone: Optional[str] = None
    is_default: bool = False


class UserPreferences(BaseModel):
    user_id: str
    diet_preferences: List[str] = []
    allergens: List[str] = []
    goals: Optional[str] = None
    updated_at: datetime


class UserConsent(BaseModel):
    analytics_consent: bool = False
    consent_version: str = "1.0"
    consent_date: Optional[datetime] = None
    consent_ip: Optional[str] = None


class RegisterInput(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str
    country: str
    username: Optional[str] = None
    language: Optional[str] = "es"
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    contact_person: Optional[str] = None
    fiscal_address: Optional[str] = None
    vat_cif: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    twitter: Optional[str] = None
    followers: Optional[str] = None
    niche: Optional[str] = None
    analytics_consent: bool = False
    consent_version: str = "1.0"


class LoginInput(BaseModel):
    email: str  # Accepts email or @username
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str


class UserAddressInput(BaseModel):
    addresses: List[ShippingAddress]
    default_address_id: Optional[str] = None


class ProducerAddressInput(BaseModel):
    office_address: Optional[Dict[str, str]] = None
    warehouse_address: Optional[Dict[str, str]] = None


class ShippingPolicyInput(BaseModel):
    enabled: bool = True
    base_cost_cents: int = Field(default=0, ge=0)
    free_threshold_cents: Optional[int] = Field(default=None, ge=0)
    per_item_cents: int = Field(default=0, ge=0)


class LocaleUpdateInput(BaseModel):
    country: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str


class UserStatusUpdate(BaseModel):
    status: str


class UserCredentialsUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None


# ── AI / Insights ────────────────────────────────────────────

class AIProfile(BaseModel):
    user_id: str
    language: str = "auto"
    tone: str = "friendly"
    diet: List[str] = []
    allergies: List[str] = []
    goals: List[str] = []
    restrictions: List[str] = []
    budget: str = "medium"
    preferred_categories: List[str] = []
    preferred_country: Optional[str] = None
    preferred_currency: Optional[str] = None
    preferred_formats: List[str] = []
    frequently_bought: List[str] = []
    first_visit_completed: bool = False
    last_updated: Optional[str] = None


class AIProfileUpdate(BaseModel):
    language: Optional[str] = None
    tone: Optional[str] = None
    diet: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    restrictions: Optional[List[str]] = None
    budget: Optional[str] = None
    preferred_categories: Optional[List[str]] = None
    preferred_country: Optional[str] = None
    preferred_currency: Optional[str] = None
    preferred_formats: Optional[List[str]] = None
    frequently_bought: Optional[List[str]] = None


class InferredTag(BaseModel):
    tag: str
    confidence: float
    source: str = "ai_chat"
    inferred_at: datetime


class UserInferredInsights(BaseModel):
    user_id: str
    likes_tags: List[InferredTag] = []
    dislikes_tags: List[InferredTag] = []
    budget_profile: Optional[str] = None
    diet_goal_tags: List[InferredTag] = []
    ai_action_usage: Dict[str, int] = {}
    allergy_tags: List[InferredTag] = []
    fear_tags: List[InferredTag] = []
    health_goal_tags: List[InferredTag] = []
    total_ai_interactions: int = 0
    last_inference_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class InsightsConfig(BaseModel):
    config_id: str = "global_insights_config"
    anonymity_threshold: int = 15
    sensitive_data_retention_days: int = 365
    enable_fear_tracking: bool = True
    enable_health_inference: bool = True
    enable_b2b_exports: bool = False
    updated_at: datetime
    updated_by: str


class InsightsConfigUpdate(BaseModel):
    anonymity_threshold: Optional[int] = None
    sensitive_data_retention_days: Optional[int] = None
    enable_fear_tracking: Optional[bool] = None
    enable_health_inference: Optional[bool] = None


class AICartActionTarget(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = 1


class AIExecuteActionInput(BaseModel):
    action: str
    targets: str
    count: Optional[int] = None
    products: Optional[List[AICartActionTarget]] = None


class AISmartCartAction(BaseModel):
    action: str
    target: Optional[str] = None
    target_product_id: Optional[str] = None
    constraint: Optional[str] = None
    allergen_to_remove: Optional[str] = None


class SellerAIInput(BaseModel):
    message: str
    producer_context: Optional[Dict] = None


class InfluencerAIInput(BaseModel):
    message: str
    influencer_context: Optional[dict] = None


# ── Product / Category / Certificate ────────────────────────

class Category(BaseModel):
    category_id: str
    name: str
    slug: str
    description: Optional[str] = None
    created_at: datetime


class Product(BaseModel):
    product_id: str
    producer_id: str
    producer_name: str
    category_id: str
    name: str
    slug: str
    description: str
    price: float
    images: List[str]
    country_origin: str
    ingredients: List[str]
    allergens: List[str]
    certifications: List[str]
    approved: bool = False
    created_at: datetime
    stock: int = 100
    low_stock_threshold: int = 5
    track_stock: bool = True
    variants: Optional[List[Dict[str, Any]]] = None
    available_countries: Optional[List[str]] = None
    country_prices: Optional[Dict[str, float]] = None
    country_currency: Optional[Dict[str, str]] = None
    source_language: Optional[str] = "es"
    translated_fields: Optional[Dict[str, Dict[str, Any]]] = None


class Pack(BaseModel):
    pack_id: str
    label: str
    units: int
    price: float
    stock: int = 100


class Variant(BaseModel):
    variant_id: str
    name: str
    sku: Optional[str] = None
    packs: List[Pack] = []


class VariantCreateInput(BaseModel):
    name: str
    sku: Optional[str] = None


class PackCreateInput(BaseModel):
    variant_id: str
    label: str
    units: int
    price: float
    stock: int = 100


class PackUpdateInput(BaseModel):
    label: Optional[str] = None
    units: Optional[int] = None
    price: Optional[float] = None
    stock: Optional[int] = None


class NutritionalInfo(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    sugars: Optional[float] = None
    fat: Optional[float] = None
    saturated_fat: Optional[float] = None
    fiber: Optional[float] = None
    sodium: Optional[float] = None
    salt: Optional[float] = None


class PackInput(BaseModel):
    pack_id: Optional[str] = None
    quantity: int
    price: float
    label: Optional[str] = None


class ProductInput(BaseModel):
    name: str
    category_id: str
    description: str
    price: float
    images: List[str]
    country_origin: str
    ingredients: List[str]
    allergens: List[str]
    certifications: List[str]
    source_language: Optional[str] = "es"
    sku: Optional[str] = None
    nutritional_info: Optional[NutritionalInfo] = None
    flavor: Optional[str] = None
    parent_product_id: Optional[str] = None
    packs: Optional[List[PackInput]] = None
    shipping_cost: Optional[float] = None
    free_shipping_min_qty: Optional[int] = None
    vat_rate: Optional[float] = None  # VAT % (e.g. 21 for 21%). None = auto by buyer country
    vat_included: bool = True  # True = price includes VAT, False = VAT added at checkout
    expiry_date: Optional[str] = None  # ISO date for Fresh Save dynamic pricing
    category_attributes: Optional[Dict[str, Any]] = None  # Dynamic attributes per category


class CertificateInput(BaseModel):
    product_id: str
    data: Dict[str, Any]
    source_language: Optional[str] = "es"


class CategoryInput(BaseModel):
    name: str
    description: Optional[str] = None


class Certificate(BaseModel):
    certificate_id: str
    product_id: str
    product_name: str
    data: Dict[str, Any]
    qr_code: Optional[str] = None
    approved: bool = False
    created_at: datetime
    source_language: Optional[str] = "es"
    translated_fields: Optional[Dict[str, Dict[str, Any]]] = None


class StockUpdateInput(BaseModel):
    stock: int
    low_stock_threshold: Optional[int] = None
    track_stock: Optional[bool] = None


class CountryPricingInput(BaseModel):
    country_code: str
    price: float
    available: bool = True


class Review(BaseModel):
    review_id: str
    product_id: str
    user_id: str
    order_id: str
    rating: int = Field(ge=0, le=10)
    comment: str = Field(max_length=500)
    verified: bool = True
    visible: bool = True
    user_name: Optional[str] = None
    created_at: str


class ReviewCreateInput(BaseModel):
    product_id: str
    order_id: str
    rating: int = Field(ge=0, le=10)
    comment: str = Field(max_length=500)


class RejectCertificateInput(BaseModel):
    reason: str


# ── Store ────────────────────────────────────────────────────

class StoreProfile(BaseModel):
    store_id: str
    producer_id: str
    slug: str
    name: str
    tagline: Optional[str] = None
    story: Optional[str] = None
    founder_name: Optional[str] = None
    founder_quote: Optional[str] = None
    hero_image: Optional[str] = None
    logo: Optional[str] = None
    gallery: List[str] = []
    country: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    full_address: Optional[str] = None
    map_image: Optional[str] = None
    coverage_area: Optional[str] = None
    delivery_time: Optional[str] = None
    store_type: str = "producer"
    verified: bool = False
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp: Optional[str] = None
    website: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    business_hours: Optional[str] = None
    badges: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    created_at: str
    updated_at: str


class StoreProfileUpdate(BaseModel):
    tagline: Optional[str] = None
    story: Optional[str] = None
    founder_name: Optional[str] = None
    founder_quote: Optional[str] = None
    hero_image: Optional[str] = None
    logo: Optional[str] = None
    gallery: Optional[List[str]] = None
    country: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    full_address: Optional[str] = None
    map_image: Optional[str] = None
    coverage_area: Optional[str] = None
    delivery_time: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp: Optional[str] = None
    website: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    business_hours: Optional[str] = None
    badges: Optional[List[str]] = None


class StoreFollower(BaseModel):
    follower_id: str
    user_id: str
    store_id: str
    store_slug: str
    store_name: str
    notify_email: bool = True
    created_at: str


# ── Order / Cart / Payment ───────────────────────────────────

class CartItem(BaseModel):
    user_id: str
    product_id: str
    product_name: str
    price: float
    quantity: int
    producer_id: str
    image: Optional[str] = None
    variant_id: Optional[str] = None
    variant_name: Optional[str] = None
    pack_id: Optional[str] = None
    pack_label: Optional[str] = None
    pack_units: Optional[int] = None


class Order(BaseModel):
    order_id: str
    user_id: str
    user_email: str
    user_name: str
    total_amount: float
    status: str
    line_items: List[Dict[str, Any]]
    shipping_address: Dict[str, str]
    payment_session_id: str
    created_at: datetime
    updated_at: datetime
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    status_history: Optional[List[Dict[str, Any]]] = None
    influencer_id: Optional[str] = None
    influencer_discount_code: Optional[str] = None
    influencer_commission_amount: Optional[float] = None
    influencer_commission_status: Optional[str] = None


class PaymentTransaction(BaseModel):
    transaction_id: str
    session_id: str
    order_id: Optional[str] = None
    user_id: str
    amount: float
    currency: str
    status: str
    payment_status: str
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class CartUpdateInput(BaseModel):
    product_id: str
    quantity: int
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None


class OrderCreateInput(BaseModel):
    shipping_address: Dict[str, str]


class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipping_carrier: Optional[str] = None
    notes: Optional[str] = None


class BuyNowInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = 1


# ── Commerce / Influencer / Discount ────────────────────────

class DiscountCode(BaseModel):
    code_id: str
    code: str
    type: str
    value: float
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_limit: Optional[int] = None
    usage_count: int = 0
    min_cart_amount: Optional[float] = None
    applicable_products: List[str] = []
    created_by: str
    created_at: str
    influencer_id: Optional[str] = None


class DiscountCodeCreate(BaseModel):
    code: str
    type: str
    value: float
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_limit: Optional[int] = None
    min_cart_amount: Optional[float] = None
    applicable_products: List[str] = []
    influencer_id: Optional[str] = None


class Influencer(BaseModel):
    influencer_id: str
    full_name: str
    email: str
    status: str = "active"
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: bool = False
    commission_type: str = "percentage"
    commission_value: float = 10.0
    discount_code_id: Optional[str] = None
    total_sales_generated: float = 0.0
    total_commission_earned: float = 0.0
    available_balance: float = 0.0
    created_at: str
    updated_at: str


class InfluencerCreate(BaseModel):
    full_name: str
    email: str
    commission_type: str = "percentage"
    commission_value: float = 10.0
    discount_code: Optional[str] = None
    discount_value: float = 10.0


class InfluencerCommission(BaseModel):
    commission_id: str
    influencer_id: str
    order_id: str
    discount_code: str
    order_total: float
    commission_amount: float
    commission_status: str = "pending"
    paid_at: Optional[str] = None
    stripe_transfer_id: Optional[str] = None
    created_at: str


class InfluencerApplication(BaseModel):
    name: str
    email: EmailStr
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    twitter: Optional[str] = None
    followers: Optional[str] = None
    niche: Optional[str] = None
    message: Optional[str] = None


class CreateInfluencerCodeInput(BaseModel):
    code: str


class WithdrawalRequest(BaseModel):
    amount: Optional[float] = None
    method: str = "stripe"  # stripe | bank_transfer
    bank_account_holder: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_bic: Optional[str] = None


# ── Chat / Messaging ────────────────────────────────────────

class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    session_id: str
    role: str
    content: str
    timestamp: datetime


class ChatMessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    session_memory: Optional[List[dict]] = None
    language: Optional[str] = "es"


class PreferencesInput(BaseModel):
    diet_preferences: List[str]
    allergens: List[str]


class Notification(BaseModel):
    notification_id: str
    producer_id: str
    order_id: str
    type: str
    content: Dict[str, Any]
    read: bool = False
    created_at: datetime


class MessageInput(BaseModel):
    content: str
    image_url: Optional[str] = None


class NewConversationInput(BaseModel):
    other_user_id: str


class InternalMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    recipient_id: Optional[str] = None
    image_url: Optional[str] = None


class InternalMessageResponse(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    status: str
    created_at: str


class ConversationResponse(BaseModel):
    conversation_id: str
    participants: List[dict]
    last_message: Optional[dict]
    unread_count: int
    created_at: str
    updated_at: str


# ── Admin ────────────────────────────────────────────────────

class AdminCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "admin"
    permissions: List[str] = []
    assigned_country: Optional[str] = None


class AdminStatusUpdate(BaseModel):
    status: str


# ── Translation ──────────────────────────────────────────────

class TranslateProductInput(BaseModel):
    product_id: str
    target_language: str


class TranslateCertificateInput(BaseModel):
    certificate_id: str
    target_language: str


# ── Analytics / Tracking ─────────────────────────────────────

class PageVisitRequest(BaseModel):
    page: str
    country: Optional[str] = None
    referrer: Optional[str] = None
