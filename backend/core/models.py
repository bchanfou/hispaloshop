"""
All Pydantic models for Hispaloshop.
Single source of truth — imported by server.py and all route modules.
"""
from pydantic import BaseModel, ConfigDict, Field, EmailStr, validator, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── User & Auth ──────────────────────────────────────────────

class User(BaseModel):
    model_config = ConfigDict(extra="allow")

    user_id: str
    email: EmailStr
    name: str
    role: str
    username: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: Optional[datetime] = None
    onboarding_completed: bool = False
    onboarding_step: int = 1
    interests: List[str] = []
    food_preferences: List[str] = []
    is_private: bool = False
    following: List[str] = []
    followers: List[str] = []
    followers_count: int = 0
    following_count: int = 0
    subscription: Optional[Dict[str, Any]] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    contact_person: Optional[str] = None
    fiscal_address: Optional[str] = None
    vat_cif: Optional[str] = None
    stripe_account_id: Optional[str] = None
    approved: bool = False

    # Compatibilidad: el repositorio mezcla acceso tipo objeto y tipo dict.
    def __getitem__(self, key: str):
        return getattr(self, key)

    def get(self, key: str, default=None):
        return getattr(self, key, default)


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


VALID_ROLES = ("customer", "producer", "influencer", "importer")


class RegisterInput(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern="^(customer|consumer|producer|influencer|importer)$")
    country: str = Field(min_length=2, max_length=3)
    username: Optional[str] = None
    language: Optional[str] = "es"
    birth_date: Optional[str] = None  # YYYY-MM-DD, required for age verification
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
    email: str = Field(min_length=1, max_length=254)  # Accepts email or @username
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


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
    password: str = Field(min_length=1, max_length=128)
    confirmation: str = Field(min_length=1, max_length=50)


class UserStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|suspended|banned|pending)$")


class UserCredentialsUpdate(BaseModel):
    email: Optional[str] = Field(default=None, max_length=254)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


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
    producer_id: str  # ID del seller (producer, importer o admin)
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
    target_markets: Optional[List[str]] = None
    country_prices: Optional[Dict[str, float]] = None
    country_currency: Optional[Dict[str, str]] = None
    source_language: Optional[str] = "es"
    translated_fields: Optional[Dict[str, Dict[str, Any]]] = None
    # Multi-seller support
    seller_type: str = "producer"  # "producer", "importer", "admin"
    origin_country: Optional[str] = None  # Para productos importados
    import_batch: Optional[str] = None    # Batch de importación
    import_date: Optional[str] = None     # Fecha de importación
    customs_info: Optional[Dict[str, Any]] = None  # Info de aduanas


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
    quantity: int = Field(ge=1)
    price: float = Field(gt=0)
    label: Optional[str] = None


class ProductInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category_id: str
    description: str = Field(min_length=1, max_length=5000)
    price: float = Field(gt=0)
    images: List[str]
    country_origin: str
    target_markets: Optional[List[str]] = None
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
    rating: int = Field(ge=1, le=5)
    comment: str = Field(max_length=500)


class RejectCertificateInput(BaseModel):
    reason: str


# ── Store ────────────────────────────────────────────────────

class StoreProfile(BaseModel):
    store_id: str
    producer_id: str  # ID del owner (producer, importer o admin)
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
    store_type: str = "producer"  # "producer", "importer", "admin"
    owner_type: str = "producer"  # "producer", "importer", "admin"
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
    specialization: Optional[str] = None  # Especialización para importers


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
    quantity: int = Field(ge=1)
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None


class OrderShippingAddress(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    street: Optional[str] = Field(None, max_length=200)
    line1: Optional[str] = Field(None, max_length=200)  # Frontend compat alias for street
    line2: Optional[str] = Field(None, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=1, max_length=20)
    country: str = Field(min_length=2, max_length=3)
    phone: Optional[str] = Field(None, max_length=20)


class OrderCreateInput(BaseModel):
    shipping_address: Dict[str, str]  # Validated at checkout route level; accepts both street/line1 formats


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|confirmed|processing|shipped|delivered|cancelled|refunded)$")
    tracking_number: Optional[str] = Field(default=None, max_length=100)
    tracking_url: Optional[str] = Field(default=None, max_length=500)
    shipping_carrier: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)

    @validator('tracking_url')
    def validate_tracking_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('tracking_url must be a valid HTTP(S) URL')
        return v


class BuyNowInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = Field(default=1, ge=1)


class RFQCreateInput(BaseModel):
    producer_id: str
    product_ids: List[str]
    message: str
    target_country: str


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
    code: str = Field(min_length=1, max_length=50)
    type: str = Field(pattern="^(percentage|fixed|free_shipping)$")
    value: float = Field(ge=0)
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
    tier: str = "hercules"
    commission_type: str = "percentage"
    commission_value: Optional[float] = None
    phone: Optional[str] = None
    social_platform: Optional[str] = None
    social_handle: Optional[str] = None
    followers_count: int = 0
    discount_code: Optional[str] = None
    discount_percentage: float = 10.0


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
    artist_name: Optional[str] = None
    instagram_handle: Optional[str] = None
    phone: Optional[str] = None
    residence_country: Optional[str] = None
    residence_city: Optional[str] = None
    age_range: Optional[str] = None
    niches: Optional[List[str]] = None
    follower_range: Optional[str] = None
    audience_country: Optional[str] = None
    best_content_url: Optional[str] = None
    desired_tier: Optional[str] = None
    agreements: Optional[Dict[str, bool]] = None
    referred_by: Optional[str] = None
    application_source: Optional[str] = None
    requested_path: Optional[str] = None


class CreateInfluencerCodeInput(BaseModel):
    code: str
    discount_percent: Optional[int] = 10  # 5, 10, 15, or 20


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
    content: str = Field(max_length=5000)
    image_url: Optional[str] = None


class NewConversationInput(BaseModel):
    other_user_id: str


class InternalMessageCreate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    recipient_id: Optional[str] = None
    image_url: Optional[str] = None
    shared_item: Optional[Dict[str, Any]] = None
    reply_to_id: Optional[str] = None


class InternalMessageResponse(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    shared_item: Optional[Dict[str, Any]] = None
    reply_to_id: Optional[str] = None
    reply_to_preview: Optional[Dict[str, Any]] = None
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
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="admin", pattern="^(admin|super_admin)$")
    permissions: List[str] = []
    assigned_country: Optional[str] = None


class AdminStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|suspended|banned)$")


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


# ═══════════════════════════════════════════════════════════
# AI / RECOMMENDATIONS MODELS (Fase 1)
# ═══════════════════════════════════════════════════════════

class AIRecommendationCache(BaseModel):
    """Cache de recomendaciones generadas por IA para un usuario"""
    user_id: str
    tenant_id: str
    
    # Recomendaciones cacheadas
    product_ids: List[str] = []
    post_ids: List[str] = []
    
    # Metadata del calculo
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # TTL: 1 hora para FREE, 15 min para PRO
    cache_version: int = 1
    
    # Por que se recomendo cada producto (explicabilidad)
    reasons: Dict[str, str] = Field(default_factory=dict)
    # Ej: {"prod_123": "Porque compraste AOVE similar", "prod_456": "Tendencia en tu zona"}
    
    # Score de confianza general (0-100)
    confidence_score: float = 0.0
    
    # Si se uso cache o se genero fresh
    used_cached: bool = False


class ProductEmbedding(BaseModel):
    """Embedding vectorial de un producto para busqueda semantica"""
    product_id: str
    tenant_id: str
    
    # Vector de 1536 dimensiones
    embedding: List[float]
    
    # Texto que genero el embedding (para debugging)
    source_text: str = ""
    
    # Tags extraidos por IA
    ai_tags: List[str] = []
    
    # Score de trending (0-100, calculado por IA)
    trending_score: float = 50.0
    
    # Ultima actualizacion
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserEmbedding(BaseModel):
    """Perfil vectorial de preferencias de usuario"""
    user_id: str
    tenant_id: str
    
    embedding: List[float]
    
    # Componentes del perfil
    diet_preferences: List[str] = []
    allergy_restrictions: List[str] = []
    health_goals: List[str] = []
    favorite_categories: List[str] = []
    
    # Historial de interacciones ponderado
    interaction_weights: Dict[str, float] = Field(default_factory=dict)
    # Ej: {"category_organic": 0.8, "price_premium": 0.6}
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIQueryLog(BaseModel):
    """Logging de queries a IA para analisis y mejora"""
    user_id: Optional[str] = None  # None si es usuario no logueado
    query_type: str  # "feed_recommendation", "semantic_search", "ask_ai"
    query_text: Optional[str] = None  # Para busquedas semanticas
    
    # Resultados
    results_count: int = 0
    top_result_ids: List[str] = []
    response_time_ms: int = 0
    
    # Feedback implicito (clicks posteriores)
    clicked_results: List[str] = []
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIRecommendationResponse(BaseModel):
    """Respuesta estructurada del motor de recomendaciones"""
    products: List[Dict[str, Any]] = []
    posts: List[Dict[str, Any]] = []
    reasons: Dict[str, str] = Field(default_factory=dict)
    confidence_score: float = 0.0
    used_cached: bool = False
    refresh_available_at: Optional[str] = None


class SemanticSearchResult(BaseModel):
    """Resultado de busqueda semantica"""
    product_id: str
    similarity_score: float
    product_data: Optional[Dict[str, Any]] = None


# ═══════════════════════════════════════════════════════════
# AFFILIATE ENGINE MODELS (Fase 2)
# ═══════════════════════════════════════════════════════════

class AffiliateClick(BaseModel):
    """Registro de cada click en link de afiliado"""
    click_id: str  # UUID unico para este click
    affiliate_code: str  # Codigo del influencer (ej: "MARIA2024")
    influencer_id: str   # ObjectId del influencer
    
    # Contexto del click
    ip_address: str
    user_agent: str
    referrer: Optional[str] = None  # De donde vino (Instagram, etc.)
    
    # Que se estaba viendo
    product_id: Optional[str] = None  # Si fue click directo a producto
    post_id: Optional[str] = None     # Si vino de un post
    
    # Cookie/tracking
    cookie_set_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30))
    
    # Conversion (se actualiza si ocurre)
    converted: bool = False
    conversion_at: Optional[datetime] = None
    order_id: Optional[str] = None
    conversion_value_cents: Optional[int] = None
    commission_cents: Optional[int] = None
    commission_tier: Optional[str] = None  # hydra, nemea, atlas, olympus, hercules
    
    # Atribucion
    attribution_model: str = "last_click"  # first_click, last_click, linear
    
    # Geolocalizacion (para analytics)
    country: Optional[str] = None
    city: Optional[str] = None
    
    # Flags anti-fraude
    is_suspicious: bool = False  # Si detectamos patron raro
    suspicion_reason: Optional[str] = None


class CommissionRecord(BaseModel):
    """Registro inmutable de cada comision generada"""
    order_id: str
    order_number: str
    
    # Quien genero la venta
    influencer_id: str
    affiliate_code: str
    
    # Detalles de la venta
    product_id: str
    product_name: str
    seller_id: str  # Productor/importador que vendio
    
    # Finanzas
    sale_value_cents: int      # Valor total de la venta
    commission_rate: float     # 0.03, 0.04, 0.05, 0.06, 0.07
    commission_cents: int      # sale_value * commission_rate
    
    # Estado del pago
    status: str = "pending"    # pending, approved, paid, disputed, refunded
    paid_at: Optional[datetime] = None
    payout_method: Optional[str] = None  # stripe_transfer, paypal, bank
    payout_reference: Optional[str] = None  # ID de transferencia
    
    # Tracking de cambios
    status_history: List[Dict] = Field(default_factory=list)
    # [{"from": "pending", "to": "approved", "by": "system", "at": ISODate, "reason": "..."}]
    
    # Periodo de contabilidad
    period_year: int
    period_month: int  # Para reportes mensuales
    
    tenant_id: str


class InfluencerTierHistory(BaseModel):
    """Historial de cambios de tier del influencer"""
    influencer_id: str
    tenant_id: str
    
    from_tier: str   # hydra, nemea, atlas, olympus, hercules
    to_tier: str
    reason: str      # "gmv_threshold", "manual_review", "penalty"
    
    # Metricas en momento del cambio
    gmv_at_change: int
    conversions_at_change: int
    followers_at_change: int
    
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    changed_by: Optional[str] = None  # "system" o admin_id


class PayoutBatch(BaseModel):
    """Lote de pagos a influencers (para procesamiento masivo)"""
    tenant_id: str
    period_year: int
    period_month: int
    
    status: str = "draft"  # draft, processing, completed, failed
    
    # Resumen
    total_influencers: int
    total_commissions_cents: int
    total_payouts_cents: int  # Despues de retenciones/tasas
    
    # Detalle
    payouts: List[Dict] = Field(default_factory=list)
    # [{
    #   "influencer_id": "...",
    #   "commission_ids": ["...", "..."],
    #   "total_cents": 5000,
    #   "method": "stripe_transfer",
    #   "status": "pending|completed|failed",
    #   "transfer_id": "tr_..."
    # }]
    
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None
    
    # Reporte generado
    report_url: Optional[str] = None  # URL a archivo generado


class InfluencerStats(BaseModel):
    """Estadisticas acumuladas de influencer (para queries rapidas)"""
    influencer_id: str
    tenant_id: str
    
    # Totales lifetime
    total_clicks: int = 0
    total_conversions: int = 0
    total_gmv_generated_cents: int = 0
    total_commission_earned_cents: int = 0
    total_commission_paid_cents: int = 0
    
    # Por periodo (ultimos 30 dias)
    clicks_30d: int = 0
    conversions_30d: int = 0
    gmv_30d_cents: int = 0
    commission_30d_cents: int = 0
    
    # Metadata
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════
# SOCIAL FEED MODELS (Fase 3)
# ═══════════════════════════════════════════════════════════

class Post(BaseModel):
    """Post del feed social - el corazon del engagement"""
    tenant_id: str
    
    # Autor
    author_id: str
    author_type: str  # consumer, producer, importer, influencer
    author_name: str  # Denormalizado para performance
    author_avatar: Optional[str] = None
    
    # Contenido
    type: str = "product_showcase"  # product_showcase, recipe, review, lifestyle, reel, story
    content: str  # Texto del post
    
    # Media
    media: List[Dict] = Field(default_factory=list)
    # [{"type": "image|video", "url": "...", "thumbnail_url": "...", "duration_seconds": 15, "order": 0}]
    
    # PRODUCTOS TAGGEADOS - CHECKOUT IN-FEED
    tagged_products: List[Dict] = Field(default_factory=list)
    # [{
    #   "product_id": "prod_123",
    #   "product_name": "AOVE Premium",
    #   "product_price_cents": 1899,
    #   "product_image": "https://...",
    #   "position": {"x": 45, "y": 30},
    #   "caption": "El que uso siempre",
    #   "affiliate_code": "MARIA2024",
    #   "quick_buy": {"enabled": True, "variants": [...], "default_quantity": 1, "max_quantity": 5}
    # }]
    
    # Engagement
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    saves_count: int = 0
    views_count: int = 0
    
    # Quien ha interactuado
    liked_by: List[str] = Field(default_factory=list)
    saved_by: List[str] = Field(default_factory=list)
    
    # Algoritmo de feed
    feed_priority_score: float = 0.0
    is_featured: bool = False
    is_viral: bool = False
    
    # Hashtags
    hashtags: List[str] = Field(default_factory=list)
    mentions: List[str] = Field(default_factory=list)
    
    # Review especifica
    reviewed_product_id: Optional[str] = None
    rating: Optional[int] = None  # 1-5
    
    # Story (24h)
    is_story: bool = False
    expires_at: Optional[datetime] = None
    
    # Estado
    status: str = "published"  # draft, published, archived, reported
    reported_by: List[str] = Field(default_factory=list)
    report_reason: Optional[str] = None
    
    # Timestamps
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_engagement_at: Optional[datetime] = None


class Comment(BaseModel):
    """Comentario en post"""
    post_id: str
    tenant_id: str
    
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    author_type: str = "consumer"
    
    content: str
    parent_id: Optional[str] = None  # Para replies
    
    # Engagement
    likes_count: int = 0
    liked_by: List[str] = Field(default_factory=list)
    
    # Si es pregunta sobre producto
    tagged_product_question: Optional[str] = None
    
    is_pinned: bool = False
    status: str = "active"  # active, deleted, reported
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Follow(BaseModel):
    """Relacion de follow entre usuarios"""
    tenant_id: str
    follower_id: str
    following_id: str
    follow_type: str = "user"  # user, producer, importer, influencer
    notifications_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FeedInteraction(BaseModel):
    """Log de interacciones para entrenar algoritmo"""
    tenant_id: str
    user_id: str
    action_type: str  # view_post, like_post, comment_post, share_post, save_post, click_product_tag, quick_buy_from_post, view_product_from_post, follow_from_post, dwell_time
    post_id: Optional[str] = None
    product_id: Optional[str] = None
    dwell_time_seconds: Optional[float] = None
    session_id: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Collection(BaseModel):
    """Colecciones/guardados de usuarios"""
    tenant_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    is_private: bool = False
    items: List[Dict] = Field(default_factory=list)
    # [{"type": "product|post", "id": "...", "saved_at": datetime, "note": "..."}]
    cover_image: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════
# CART & CHECKOUT MODELS (Fase 4)
# ═══════════════════════════════════════════════════════════

class Cart(BaseModel):
    """Carrito de compras persistente"""
    user_id: str
    tenant_id: str
    status: str = "active"  # active, converted, abandoned
    affiliate_code: Optional[str] = None  # Código de afiliado si aplica
    coupon_code: Optional[str] = None
    discount_cents: int = 0
    items: List[Dict] = Field(default_factory=list)
    # [{
    #   "product_id": "...",
    #   "product_name": "...",
    #   "product_image": "...",
    #   "seller_id": "...",
    #   "seller_type": "producer",
    #   "quantity": 2,
    #   "unit_price_cents": 1000,
    #   "total_price_cents": 2000,
    #   "variant_id": null,
    #   "added_from_post_id": null,
    #   "added_at": datetime
    # }]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))


class Order(BaseModel):
    """Orden de compra completa"""
    order_id: str  # Número de orden legible (HSP-2024-001234)
    user_id: str
    tenant_id: str
    
    # Estado
    status: str = "pending_payment"  # pending_payment, paid, processing, shipped, delivered, cancelled, refunded
    
    # Items
    items: List[Dict] = Field(default_factory=list)
    # [{
    #   "product_id": "...",
    #   "product_name": "...",
    #   "seller_id": "...",
    #   "quantity": 2,
    #   "unit_price_cents": 1000,
    #   "total_price_cents": 2000,
    #   "affiliate_code": "..."  # Por item si aplica
    # }]
    
    # Totales
    subtotal_cents: int = 0
    shipping_cents: int = 0
    tax_cents: int = 0
    discount_cents: int = 0
    total_cents: int = 0
    
    # Split de pagos
    platform_fee_cents: int = 0  # Comisión de Hispaloshop
    affiliate_fee_cents: int = 0  # Comisión de afiliado
    producer_payout_cents: int = 0  # Lo que recibe el productor
    affiliate_code: Optional[str] = None
    
    # Stripe
    stripe_payment_intent_id: Optional[str] = None
    stripe_transfer_group: Optional[str] = None
    stripe_transfers: List[Dict] = Field(default_factory=list)  # Registro de transfers
    
    # Dirección de envío
    shipping_address: Dict = Field(default_factory=dict)
    # {
    #   "full_name": "...",
    #   "street": "...",
    #   "city": "...",
    #   "postal_code": "...",
    #   "country": "ES",
    #   "phone": "..."
    # }
    
    # Metadata
    cart_id: Optional[str] = None  # Referencia al carrito original
    notes: Optional[str] = None  # Notas del cliente
    
    # Timestamps
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderTransfer(BaseModel):
    """Transfer de Stripe Connect a productor"""
    order_id: str
    seller_id: str
    seller_stripe_account_id: str
    amount_cents: int
    currency: str = "eur"
    stripe_transfer_id: Optional[str] = None
    status: str = "pending"  # pending, completed, failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════
# B2B IMPORTER MODELS (Fase 4)
# ═══════════════════════════════════════════════════════════

class B2BProfile(BaseModel):
    """Perfil B2B de importador"""
    user_id: str
    tenant_id: str
    
    # Información de empresa
    company_name: str
    company_vat: Optional[str] = None
    business_type: str = "importer"  # importer, distributor, wholesaler, retailer
    
    # Preferencias de importación
    import_countries: List[str] = Field(default_factory=list)  # ['ES', 'FR', 'IT']
    categories_of_interest: List[str] = Field(default_factory=list)
    annual_volume_estimate: str = "medium"  # small, medium, large
    moq_preference_cents: int = 0  # Minimum Order Quantity preferido
    
    # Verificación
    verified_importer: bool = False
    verification_documents: List[Dict] = Field(default_factory=list)
    # [{"type": "vat_certificate", "url": "...", "verified_at": datetime}]
    
    # Búsqueda
    search_keywords: List[str] = Field(default_factory=list)
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class B2BCatalogPrice(BaseModel):
    """Precio mayorista B2B por producto"""
    product_id: str
    seller_id: str
    tenant_id: str
    
    min_quantity: int = 1  # MOQ
    unit_price_cents: int  # Precio mayorista
    max_quantity: Optional[int] = None  # NULL = sin límite superior
    
    is_active: bool = True
    valid_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class B2BDiscoveryMatch(BaseModel):
    """Match entre importador y productor"""
    importer_id: str
    producer_id: str
    tenant_id: str
    
    match_score: float = 0.0  # 0.00 a 1.00
    match_reasons: List[str] = Field(default_factory=list)  # ['category_match', 'country_match', 'volume_match']
    
    status: str = "suggested"  # suggested, contacted, negotiating, deal, rejected
    
    # Contacto
    first_contact_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    contact_count: int = 0
    
    # Notas
    importer_notes: Optional[str] = None
    producer_notes: Optional[str] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class B2BLead(BaseModel):
    """Lead B2B generado cuando un importador contacta a un productor"""
    match_id: str
    importer_id: str
    producer_id: str
    
    # Producto de interés (opcional)
    product_id: Optional[str] = None
    
    # Mensaje inicial
    initial_message: str
    expected_volume: Optional[str] = None  # "500 units/month"
    target_price_cents: Optional[int] = None
    
    # Estado
    status: str = "new"  # new, qualified, proposal, negotiation, won, lost
    priority: str = "medium"  # low, medium, high
    
    # Asignación
    assigned_to: Optional[str] = None  # Vendedor del productor
    
    # Timeline
    contacted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    qualified_at: Optional[datetime] = None
    proposal_sent_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════
# CHAT B2B MODELS (Fase 4)
# ═══════════════════════════════════════════════════════════

class ChatConversation(BaseModel):
    """Conversación de chat B2B"""
    conversation_id: str
    
    # Participantes
    importer_id: str
    producer_id: str
    tenant_id: str
    
    # Contexto
    related_product_id: Optional[str] = None  # Si es sobre producto específico
    related_lead_id: Optional[str] = None  # Si viene de un lead
    
    # Estado
    status: str = "active"  # active, archived, blocked
    
    # Última actividad
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count_importer: int = 0
    unread_count_producer: int = 0
    
    # Metadata
    initiated_by: str  # importer_id o producer_id
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatMessage(BaseModel):
    """Mensaje de chat"""
    conversation_id: str
    message_id: str
    
    sender_id: str
    sender_type: str  # importer, producer, system
    
    content: str
    
    # Adjuntos
    attachments: List[Dict] = Field(default_factory=list)
    # [{"type": "image|file", "url": "...", "name": "...", "size": 12345}]
    
    # Estado
    read_at: Optional[datetime] = None
    read_by: List[str] = Field(default_factory=list)  # IDs de usuarios que leyeron
    
    # Metadata del sistema
    is_system_message: bool = False
    system_message_type: Optional[str] = None  # 'lead_created', 'status_changed', etc.
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatNotification(BaseModel):
    """Notificación de chat para email/push"""
    user_id: str
    conversation_id: str
    message_id: str
    
    notified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None
    email_sent: bool = False
    push_sent: bool = False
