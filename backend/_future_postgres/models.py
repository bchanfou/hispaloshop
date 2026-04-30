from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID as UUIDType
import uuid

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover - optional dependency fallback
    class Vector(ARRAY):
        def __init__(self, dimensions: int):
            super().__init__(Float)

from database import Base
from config import INFLUENCER_TIER_CONFIG, normalize_influencer_tier


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    default_currency: Mapped[str] = mapped_column(String(3), default="EUR")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    products: Mapped[List["Product"]] = relationship(back_populates="tenant")
    categories: Mapped[List["Category"]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(default=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    is_verified: Mapped[bool] = mapped_column(default=False)
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    social_links: Mapped[Optional[Dict[str, str]]] = mapped_column(JSONB, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    kyc_status: Mapped[str] = mapped_column(String(20), default="pending")
    kyc_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_account_status: Mapped[str] = mapped_column(String(20), default="inactive")
    stripe_account_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stripe_account_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_account_payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_account_charges_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    connect_onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    connect_requirements_due: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    shipping_policy_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    shipping_base_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    shipping_free_threshold_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shipping_per_item_cents: Mapped[int] = mapped_column(Integer, default=0)
    shipping_regions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    products: Mapped[List["Product"]] = relationship(back_populates="producer")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="user")
    influencer_profile: Mapped[Optional["InfluencerProfile"]] = relationship(back_populates="user")
    cart: Mapped[Optional["Cart"]] = relationship(back_populates="user", uselist=False)
    orders: Mapped[List["Order"]] = relationship(back_populates="user")
    affiliate_links: Mapped[List["AffiliateLink"]] = relationship(back_populates="influencer")
    commissions: Mapped[List["Commission"]] = relationship(back_populates="influencer")
    payouts: Mapped[List["Payout"]] = relationship(back_populates="influencer")
    embedding_profile: Mapped[Optional["UserEmbedding"]] = relationship(back_populates="user", uselist=False)
    interactions: Mapped[List["UserInteraction"]] = relationship(back_populates="user")
    chat_sessions: Mapped[List["ChatSession"]] = relationship(back_populates="user")
    chat_conversation_participants: Mapped[List["ConversationParticipant"]] = relationship(back_populates="user")
    chat_messages_sent: Mapped[List["Message"]] = relationship(back_populates="sender")
    posts: Mapped[List["Post"]] = relationship(back_populates="user")
    saved_collections: Mapped[List["SavedCollection"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    stories: Mapped[List["Story"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    story_views: Mapped[List["StoryView"]] = relationship(back_populates="viewer", cascade="all, delete-orphan")
    following: Mapped[List["Follow"]] = relationship(
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    followers: Mapped[List["Follow"]] = relationship(
        foreign_keys="Follow.following_id",
        back_populates="following",
        cascade="all, delete-orphan",
    )
    followers_count: Mapped[int] = mapped_column(default=0)
    following_count: Mapped[int] = mapped_column(default=0)
    posts_count: Mapped[int] = mapped_column(default=0)
    reels_count: Mapped[int] = mapped_column(default=0)
    engagement_rate: Mapped[Optional[float]] = mapped_column(nullable=True)
    importer_profile: Mapped[Optional["Importer"]] = relationship(back_populates="user", uselist=False)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"))
    parent_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    parent: Mapped[Optional["Category"]] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[List["Category"]] = relationship(back_populates="parent")
    products: Mapped[List["Product"]] = relationship(back_populates="category")
    tenant: Mapped["Tenant"] = relationship(back_populates="categories")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"))
    producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    category_id: Mapped[UUIDType] = mapped_column(ForeignKey("categories.id"))

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    price_cents: Mapped[int] = mapped_column(default=0)
    compare_at_price_cents: Mapped[Optional[int]] = mapped_column(nullable=True)
    inventory_quantity: Mapped[int] = mapped_column(default=0)
    track_inventory: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    is_featured: Mapped[bool] = mapped_column(default=False)
    is_vegan: Mapped[bool] = mapped_column(default=False)
    is_gluten_free: Mapped[bool] = mapped_column(default=False)
    is_organic: Mapped[bool] = mapped_column(default=False)
    origin_country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    is_affiliate_enabled: Mapped[bool] = mapped_column(default=True)
    source_type: Mapped[str] = mapped_column(String(20), default="own")
    importer_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("importers.id"), nullable=True, index=True)
    b2b_pricing: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="products")
    producer: Mapped["User"] = relationship(back_populates="products")
    category: Mapped["Category"] = relationship(back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship(back_populates="product", order_by="ProductImage.sort_order")
    certificates: Mapped[List["ProductCertificate"]] = relationship(back_populates="product")
    order_items: Mapped[List["OrderItem"]] = relationship(back_populates="product")
    affiliate_link_requests: Mapped[List["AffiliateLinkRequest"]] = relationship(back_populates="product")
    embedding: Mapped[Optional["ProductEmbedding"]] = relationship(back_populates="product", uselist=False)
    interactions: Mapped[List["UserInteraction"]] = relationship(back_populates="product")
    importer: Mapped[Optional["Importer"]] = relationship(back_populates="products")

    def get_price_cents(self) -> int:
        return self.price_cents


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"))
    url: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    alt_text: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    is_primary: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    product: Mapped["Product"] = relationship(back_populates="images")


class ProductCertificate(Base):
    __tablename__ = "product_certificates"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"))
    name: Mapped[str] = mapped_column(String(100))
    issuer: Mapped[str] = mapped_column(String(100))
    is_verified: Mapped[bool] = mapped_column(default=False)

    product: Mapped["Product"] = relationship(back_populates="certificates")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    plan: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="active")
    current_period_start: Mapped[datetime]
    current_period_end: Mapped[datetime]
    commission_bps: Mapped[int] = mapped_column(default=2000)

    user: Mapped["User"] = relationship(back_populates="subscription")

    def get_commission_bps(self) -> int:
        bps_map = {"free": 2000, "pro": 1800, "elite": 1700}
        return bps_map.get(self.plan, 2000)


class StripeEvent(Base):
    __tablename__ = "stripe_events"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class InfluencerProfile(Base):
    __tablename__ = "influencer_profiles"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    tier: Mapped[str] = mapped_column(String(20), default="perseo")
    total_earnings_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    pending_earnings_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    paid_earnings_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    followers_count: Mapped[int] = mapped_column(default=0)
    monthly_gmv_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    total_gmv_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    total_referrals: Mapped[int] = mapped_column(default=0)
    total_clicks: Mapped[int] = mapped_column(default=0)
    niche: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    avg_engagement_rate: Mapped[Optional[float]] = mapped_column(nullable=True)
    is_verified: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    tier_updated_at: Mapped[datetime] = mapped_column(default=func.now())

    user: Mapped["User"] = relationship(back_populates="influencer_profile")

    def recalculate_tier(self) -> str:
        # GMV-based ladder is the source of truth for tier progression.
        if self.monthly_gmv_cents >= INFLUENCER_TIER_CONFIG["zeus"]["min_gmv_cents"]:
            return "zeus"
        if self.monthly_gmv_cents >= INFLUENCER_TIER_CONFIG["apolo"]["min_gmv_cents"]:
            return "apolo"
        if self.monthly_gmv_cents >= INFLUENCER_TIER_CONFIG["hercules"]["min_gmv_cents"]:
            return "hercules"
        if self.monthly_gmv_cents >= INFLUENCER_TIER_CONFIG["aquiles"]["min_gmv_cents"]:
            return "aquiles"
        return "perseo"

    def get_commission_bps(self) -> int:
        tier = normalize_influencer_tier(self.tier)
        return INFLUENCER_TIER_CONFIG[tier]["commission_bps"]


class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), unique=True)
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")
    affiliate_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="cart")
    items: Mapped[List["CartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id: Mapped[UUIDType] = mapped_column(ForeignKey("carts.id"))
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(default=1)
    unit_price_cents: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    cart: Mapped["Cart"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    subtotal_cents: Mapped[int] = mapped_column(default=0)
    shipping_cents: Mapped[int] = mapped_column(default=0)
    tax_cents: Mapped[int] = mapped_column(default=0)
    discount_cents: Mapped[int] = mapped_column(default=0)
    total_cents: Mapped[int] = mapped_column(default=0)
    platform_fee_bps: Mapped[int] = mapped_column(default=2000)
    platform_fee_cents: Mapped[int] = mapped_column(default=0)
    affiliate_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    affiliate_commission_bps: Mapped[Optional[int]] = mapped_column(nullable=True)
    affiliate_commission_cents: Mapped[Optional[int]] = mapped_column(nullable=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_checkout_session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    shipping_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    order_type: Mapped[str] = mapped_column(String(20), default="b2c")
    b2b_quote_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("b2b_quotes.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    b2b_quote: Mapped[Optional["B2BQuote"]] = relationship(
        back_populates="orders",
        foreign_keys=[b2b_quote_id],
    )


class Importer(Base):
    __tablename__ = "importers"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    vat_tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    business_registration: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    country_origin: Mapped[str] = mapped_column(String(2))
    warehouses: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    specializations: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    years_experience: Mapped[Optional[int]] = mapped_column(nullable=True)
    certifications: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    annual_volume_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_terms_accepted: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    is_verified: Mapped[bool] = mapped_column(default=False)
    verification_documents: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="importer_profile")
    brands: Mapped[List["ImporterBrand"]] = relationship(back_populates="importer", cascade="all, delete-orphan")
    clients: Mapped[List["ImporterClient"]] = relationship(back_populates="importer", cascade="all, delete-orphan")
    quotes: Mapped[List["B2BQuote"]] = relationship(back_populates="importer", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship(back_populates="importer")
    shipments: Mapped[List["Shipment"]] = relationship(
        foreign_keys="Shipment.importer_id", back_populates="importer", cascade="all, delete-orphan"
    )
    escrow_transactions: Mapped[List["B2BEscrow"]] = relationship(
        foreign_keys="B2BEscrow.importer_id", back_populates="importer", cascade="all, delete-orphan"
    )


class ImporterBrand(Base):
    __tablename__ = "importer_brands"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    importer_id: Mapped[UUIDType] = mapped_column(ForeignKey("importers.id", ondelete="CASCADE"), index=True)
    brand_name: Mapped[str] = mapped_column(String(255))
    brand_country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    exclusive_territory: Mapped[List[str]] = mapped_column(JSONB, default=list)
    contract_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    contract_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    minimum_order_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    documentation_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    importer: Mapped["Importer"] = relationship(back_populates="brands")


class ImporterClient(Base):
    __tablename__ = "importer_clients"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    importer_id: Mapped[UUIDType] = mapped_column(ForeignKey("importers.id", ondelete="CASCADE"), index=True)
    client_producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    relationship_type: Mapped[str] = mapped_column(String(20), default="regular")
    credit_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    since: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_purchases_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    importer: Mapped["Importer"] = relationship(back_populates="clients")
    client_producer: Mapped["User"] = relationship()


class B2BQuote(Base):
    __tablename__ = "b2b_quotes"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    importer_id: Mapped[UUIDType] = mapped_column(ForeignKey("importers.id", ondelete="CASCADE"), index=True)
    requester_producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    items: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    total_value: Mapped[float] = mapped_column(Float, default=0)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    incoterm: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    shipping_estimate: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    terms_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    converted_to_order_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("orders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    importer: Mapped["Importer"] = relationship(back_populates="quotes")
    requester_producer: Mapped["User"] = relationship()
    orders: Mapped[List["Order"]] = relationship(
        back_populates="b2b_quote",
        foreign_keys="Order.b2b_quote_id",
    )


class ShippingRoute(Base):
    __tablename__ = "shipping_routes"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    origin_country: Mapped[str] = mapped_column(String(2), index=True)
    destination_country: Mapped[str] = mapped_column(String(2), index=True)
    transit_time_days: Mapped[int] = mapped_column(default=0)
    modes_available: Mapped[List[str]] = mapped_column(JSONB, default=list)
    base_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    base_cost_per_cbm: Mapped[float] = mapped_column(Float, default=0)
    fuel_surcharge_percent: Mapped[float] = mapped_column(Float, default=0)
    active_carriers: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    shipments: Mapped[List["Shipment"]] = relationship(back_populates="route")


class ForwarderPartner(Base):
    __tablename__ = "forwarder_partners"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), unique=True)
    countries_covered: Mapped[List[str]] = mapped_column(JSONB, default=list)
    specialties: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    services: Mapped[List[str]] = mapped_column(JSONB, default=list)
    api_integration: Mapped[bool] = mapped_column(default=False)
    api_endpoint: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    api_credentials: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0)
    volume_handled_ytd: Mapped[float] = mapped_column(Float, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    shipments: Mapped[List["Shipment"]] = relationship(back_populates="carrier")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(10))
    importer_id: Mapped[UUIDType] = mapped_column(ForeignKey("importers.id"), index=True)
    exporter_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    route_id: Mapped[UUIDType] = mapped_column(ForeignKey("shipping_routes.id"), index=True)
    carrier_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("forwarder_partners.id"), nullable=True, index=True)
    service_level: Mapped[str] = mapped_column(String(20), default="standard")
    status: Mapped[str] = mapped_column(String(30), default="draft")
    containers: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    incoterm: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    payment_term: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    documents: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    tracking_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    cost_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    estimated_departure: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    importer: Mapped["Importer"] = relationship(back_populates="shipments")
    exporter: Mapped["User"] = relationship()
    route: Mapped["ShippingRoute"] = relationship(back_populates="shipments")
    carrier: Mapped[Optional["ForwarderPartner"]] = relationship(back_populates="shipments")
    orders: Mapped[List["ShipmentOrder"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")
    escrow_transactions: Mapped[List["B2BEscrow"]] = relationship(back_populates="shipment")


class ShipmentOrder(Base):
    __tablename__ = "shipment_orders"
    __table_args__ = (UniqueConstraint("shipment_id", "order_id", name="uq_shipment_order_pair"),)

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[UUIDType] = mapped_column(ForeignKey("shipments.id", ondelete="CASCADE"), index=True)
    order_id: Mapped[UUIDType] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    consolidation_fee_applied: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    shipment: Mapped["Shipment"] = relationship(back_populates="orders")
    order: Mapped["Order"] = relationship()


class B2BDocument(Base):
    __tablename__ = "b2b_documents"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[UUIDType] = mapped_column(ForeignKey("shipments.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(20), default="generated")
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())


class B2BEscrow(Base):
    __tablename__ = "b2b_escrows"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    importer_id: Mapped[UUIDType] = mapped_column(ForeignKey("importers.id"), index=True)
    exporter_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    shipment_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("shipments.id"), nullable=True, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    status: Mapped[str] = mapped_column(String(20), default="PENDING_FUNDS")
    provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    timeline_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    released_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    importer: Mapped["Importer"] = relationship(back_populates="escrow_transactions")
    exporter: Mapped["User"] = relationship()
    shipment: Mapped[Optional["Shipment"]] = relationship(back_populates="escrow_transactions")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[UUIDType] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(200))
    product_sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit_price_cents: Mapped[int] = mapped_column()
    quantity: Mapped[int] = mapped_column()
    total_cents: Mapped[int] = mapped_column()
    producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    producer_payout_cents: Mapped[int] = mapped_column(default=0)
    platform_fee_cents: Mapped[int] = mapped_column(default=0)
    affiliate_commission_cents: Mapped[int] = mapped_column(default=0)
    producer_transfer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    producer_payout_status: Mapped[str] = mapped_column(String(50), default="pending")
    fulfillment_status: Mapped[str] = mapped_column(String(20), default="pending")
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    shipped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")
    producer: Mapped["User"] = relationship()


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[UUIDType] = mapped_column(ForeignKey("orders.id"))
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20))
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AffiliateLink(Base):
    __tablename__ = "affiliate_links"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    influencer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    product_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("products.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    tracking_url: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="active")
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    total_clicks: Mapped[int] = mapped_column(default=0)
    total_conversions: Mapped[int] = mapped_column(default=0)
    total_gmv_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    total_commission_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    influencer: Mapped["User"] = relationship(back_populates="affiliate_links")
    product: Mapped[Optional["Product"]] = relationship()
    events: Mapped[List["AffiliateEvent"]] = relationship(back_populates="link")


class AffiliateEvent(Base):
    __tablename__ = "affiliate_events"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    link_id: Mapped[UUIDType] = mapped_column(ForeignKey("affiliate_links.id"))
    event_type: Mapped[str] = mapped_column(String(20))
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cookie_id: Mapped[str] = mapped_column(String(100), index=True)
    attributed_order_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("orders.id"), nullable=True)
    conversion_value_cents: Mapped[Optional[int]] = mapped_column(nullable=True)
    commission_cents: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    link: Mapped["AffiliateLink"] = relationship(back_populates="events")
    order: Mapped[Optional["Order"]] = relationship()


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    influencer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    amount_cents: Mapped[int] = mapped_column()
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    status: Mapped[str] = mapped_column(String(20), default="requested")
    method: Mapped[str] = mapped_column(String(20), default="stripe_transfer")
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    commissions: Mapped[List["Commission"]] = relationship(back_populates="payout")
    influencer: Mapped["User"] = relationship(back_populates="payouts")


class Commission(Base):
    __tablename__ = "commissions"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    influencer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    order_id: Mapped[UUIDType] = mapped_column(ForeignKey("orders.id"))
    order_item_id: Mapped[UUIDType] = mapped_column(ForeignKey("order_items.id"))
    affiliate_link_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("affiliate_links.id"), nullable=True)
    sale_amount_cents: Mapped[int] = mapped_column()
    commission_rate_bps: Mapped[int] = mapped_column()
    commission_cents: Mapped[int] = mapped_column()
    platform_fee_cents: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    payout_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("payouts.id"), nullable=True)
    cookie_attribution_days: Mapped[int] = mapped_column(default=548)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    influencer: Mapped["User"] = relationship(back_populates="commissions")
    order: Mapped["Order"] = relationship()
    order_item: Mapped["OrderItem"] = relationship()
    affiliate_link: Mapped[Optional["AffiliateLink"]] = relationship()
    payout: Mapped[Optional["Payout"]] = relationship(back_populates="commissions")


class AffiliateLinkRequest(Base):
    __tablename__ = "affiliate_link_requests"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"))
    influencer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    approved_by: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    responded_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    product: Mapped["Product"] = relationship(back_populates="affiliate_link_requests")
    influencer: Mapped["User"] = relationship(foreign_keys=[influencer_id])
    producer: Mapped["User"] = relationship(foreign_keys=[producer_id])


class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"), unique=True, index=True)
    embedding: Mapped[List[float]] = mapped_column(Vector(1536))
    embedding_text: Mapped[str] = mapped_column(Text)
    model_version: Mapped[str] = mapped_column(String(50), default="text-embedding-3-small")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    product: Mapped["Product"] = relationship(back_populates="embedding")


class UserEmbedding(Base):
    __tablename__ = "user_embeddings"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    embedding: Mapped[List[float]] = mapped_column(Vector(1536))
    based_on: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    model_version: Mapped[str] = mapped_column(String(50), default="text-embedding-3-small")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="embedding_profile")


class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    product_id: Mapped[UUIDType] = mapped_column(ForeignKey("products.id"), index=True)
    interaction_type: Mapped[str] = mapped_column(String(20))
    source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    affiliate_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    purchase_value_cents: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)

    user: Mapped[Optional["User"]] = relationship(back_populates="interactions")
    product: Mapped["Product"] = relationship(back_populates="interactions")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    context: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    message_count: Mapped[int] = mapped_column(default=0)
    user_satisfaction: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    messages: Mapped[List["ChatMessage"]] = relationship(back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[UUIDType] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    recommended_products: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    prompt_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    total_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(
        Enum("support", "transaction", "influencer_brand", "social", "group_order", "b2b_negotiation", name="conversation_type"),
        default="social",
    )
    related_order_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    related_product_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("products.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(default=True, index=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now(), index=True)

    participants: Mapped[List["ConversationParticipant"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    messages: Mapped[List["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    related_order: Mapped[Optional["Order"]] = relationship()
    related_product: Mapped[Optional["Product"]] = relationship()


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),)

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[UUIDType] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(Enum("admin", "member", name="participant_role"), default="member")
    notifications_enabled: Mapped[bool] = mapped_column(default=True)
    joined_at: Mapped[datetime] = mapped_column(default=func.now())
    left_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    last_read_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(back_populates="chat_conversation_participants")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[UUIDType] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    sender_type: Mapped[str] = mapped_column(Enum("user", "system", "ai", name="message_sender_type"), default="user")
    content: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(
        Enum("text", "image", "product", "order", "ai_response", name="message_type"),
        default="text",
    )
    reply_to_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("messages.id"), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    edited_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(back_populates="chat_messages_sent")
    reply_to: Mapped[Optional["Message"]] = relationship(remote_side=[id])
    attachments: Mapped[List["MessageAttachment"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[UUIDType] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(Enum("image", "document", name="message_attachment_type"), default="image")
    url: Mapped[str] = mapped_column(String(1000))
    cloudinary_public_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    size: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    message: Mapped["Message"] = relationship(back_populates="attachments")


class MatchingScore(Base):
    __tablename__ = "matching_scores"
    __table_args__ = (
        UniqueConstraint("producer_id", "influencer_id", "match_type", name="uq_matching_scores_pair_type"),
    )

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    producer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    influencer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    match_type: Mapped[str] = mapped_column(String(20), default="product_influencer")
    overall_score: Mapped[float] = mapped_column(Float)
    score_breakdown: Mapped[Dict[str, float]] = mapped_column(JSONB)
    reasons: Mapped[List[str]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default="suggested")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    producer: Mapped["User"] = relationship(foreign_keys=[producer_id])
    influencer: Mapped["User"] = relationship(foreign_keys=[influencer_id])


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    tenant_id: Mapped[UUIDType] = mapped_column(ForeignKey("tenants.id"), index=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_urls: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    media_type: Mapped[str] = mapped_column(String(20), default="image")
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aspect_ratio: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    tagged_products: Mapped[List[UUIDType]] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list)
    product_tags_positions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    likes_count: Mapped[int] = mapped_column(default=0)
    comments_count: Mapped[int] = mapped_column(default=0)
    shares_count: Mapped[int] = mapped_column(default=0)
    saves_count: Mapped[int] = mapped_column(default=0)
    views_count: Mapped[int] = mapped_column(default=0)
    views_count_unique: Mapped[int] = mapped_column(BigInteger, default=0)
    avg_watch_time_seconds: Mapped[Optional[float]] = mapped_column(nullable=True)
    completion_rate: Mapped[Optional[float]] = mapped_column(nullable=True)
    clicks_to_product: Mapped[int] = mapped_column(default=0)
    conversions_count: Mapped[int] = mapped_column(default=0)
    gmv_generated_cents: Mapped[int] = mapped_column(default=0)
    score: Mapped[float] = mapped_column(default=0.0)
    trending_score: Mapped[float] = mapped_column(default=0.0)
    viral_score: Mapped[float] = mapped_column(default=0.0)
    is_reel: Mapped[bool] = mapped_column(default=False)
    video_duration_seconds: Mapped[Optional[float]] = mapped_column(nullable=True)
    audio_track_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="published")
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    location_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    location_lat: Mapped[Optional[float]] = mapped_column(nullable=True)
    location_lng: Mapped[Optional[float]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    user: Mapped["User"] = relationship(back_populates="posts")
    likes: Mapped[List["PostLike"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    comments: Mapped[List["PostComment"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    saves: Mapped[List["PostSave"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    reel_views: Mapped[List["ReelView"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    hashtags: Mapped[List["PostHashtag"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[UUIDType] = mapped_column(ForeignKey("posts.id"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    post: Mapped["Post"] = relationship(back_populates="likes")
    user: Mapped["User"] = relationship()


class PostComment(Base):
    __tablename__ = "post_comments"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[UUIDType] = mapped_column(ForeignKey("posts.id"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("post_comments.id"), nullable=True)
    likes_count: Mapped[int] = mapped_column(default=0)
    is_edited: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    post: Mapped["Post"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship()
    parent: Mapped[Optional["PostComment"]] = relationship(remote_side=[id], back_populates="replies")
    replies: Mapped[List["PostComment"]] = relationship(back_populates="parent")
    likes: Mapped[List["CommentLike"]] = relationship(back_populates="comment", cascade="all, delete-orphan")


class CommentLike(Base):
    __tablename__ = "comment_likes"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id: Mapped[UUIDType] = mapped_column(ForeignKey("post_comments.id"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    comment: Mapped["PostComment"] = relationship(back_populates="likes")
    user: Mapped["User"] = relationship()


class SavedCollection(Base):
    __tablename__ = "saved_collections"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_private: Mapped[bool] = mapped_column(default=True)
    items_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="saved_collections")


class PostSave(Base):
    __tablename__ = "post_saves"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[UUIDType] = mapped_column(ForeignKey("posts.id"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    collection_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("saved_collections.id"), nullable=True)
    collection_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    post: Mapped["Post"] = relationship(back_populates="saves")
    user: Mapped["User"] = relationship()
    collection: Mapped[Optional["SavedCollection"]] = relationship()


class Hashtag(Base):
    __tablename__ = "hashtags"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    posts_count: Mapped[int] = mapped_column(default=0)
    followers_count: Mapped[int] = mapped_column(default=0)
    trending_score: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class PostHashtag(Base):
    __tablename__ = "post_hashtags"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[UUIDType] = mapped_column(ForeignKey("posts.id"), index=True)
    hashtag_id: Mapped[UUIDType] = mapped_column(ForeignKey("hashtags.id"), index=True)

    post: Mapped["Post"] = relationship(back_populates="hashtags")
    hashtag: Mapped["Hashtag"] = relationship()


class HashtagFollow(Base):
    __tablename__ = "hashtag_follows"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hashtag_id: Mapped[UUIDType] = mapped_column(ForeignKey("hashtags.id"), index=True)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class ReelView(Base):
    __tablename__ = "reel_views"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[UUIDType] = mapped_column(ForeignKey("posts.id"), index=True)
    viewer_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    watch_time_seconds: Mapped[float] = mapped_column()
    watched_full: Mapped[bool] = mapped_column(default=False)
    liked: Mapped[bool] = mapped_column(default=False)
    shared: Mapped[bool] = mapped_column(default=False)
    source: Mapped[str] = mapped_column(String(20), default="feed")
    device_type: Mapped[str] = mapped_column(String(20), default="mobile")
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)

    post: Mapped["Post"] = relationship(back_populates="reel_views")
    viewer: Mapped[Optional["User"]] = relationship()


class Sound(Base):
    __tablename__ = "sounds"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    artist: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    audio_url: Mapped[str] = mapped_column(String(500))
    duration_seconds: Mapped[float] = mapped_column()
    posts_count: Mapped[int] = mapped_column(default=0)
    trending_score: Mapped[float] = mapped_column(default=0.0)
    is_original: Mapped[bool] = mapped_column(default=False)
    uploaded_by_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class Follow(Base):
    __tablename__ = "follows"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    following_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    notify_posts: Mapped[bool] = mapped_column(default=True)
    notify_stories: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    follower: Mapped["User"] = relationship(foreign_keys=[follower_id], back_populates="following")
    following: Mapped["User"] = relationship(foreign_keys=[following_id], back_populates="followers")


class FeedCache(Base):
    __tablename__ = "feed_cache"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    feed_posts: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    generated_at: Mapped[datetime] = mapped_column(default=func.now())
    expires_at: Mapped[datetime] = mapped_column()
    posts_considered: Mapped[int] = mapped_column(default=0)
    generation_time_ms: Mapped[int] = mapped_column(default=0)


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    media_url: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    media_type: Mapped[str] = mapped_column(String(20), default="image")
    polls: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    questions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    sliders: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    countdowns: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    links: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    expires_at: Mapped[datetime] = mapped_column(index=True)
    views_count: Mapped[int] = mapped_column(default=0)
    views_unique_count: Mapped[int] = mapped_column(default=0)
    tagged_product_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("products.id"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="stories")
    tagged_product: Mapped[Optional["Product"]] = relationship()
    viewers: Mapped[List["StoryView"]] = relationship(back_populates="story", cascade="all, delete-orphan")


class StoryView(Base):
    __tablename__ = "story_views"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id: Mapped[UUIDType] = mapped_column(ForeignKey("stories.id"), index=True)
    viewer_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"), index=True)
    replied: Mapped[bool] = mapped_column(default=False)
    reaction: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    story: Mapped["Story"] = relationship(back_populates="viewers")
    viewer: Mapped["User"] = relationship(back_populates="story_views")


class AnalyticsVisit(Base):
    __tablename__ = "analytics_visits"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("tenants.id"), nullable=True, index=True)
    user_id: Mapped[Optional[UUIDType]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    path: Mapped[str] = mapped_column(String(500), index=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)


Index("idx_affiliate_events_cookie_created", AffiliateEvent.cookie_id, AffiliateEvent.created_at)
Index("idx_commissions_influencer_status", Commission.influencer_id, Commission.status)
Index("idx_affiliate_links_code_status", AffiliateLink.code, AffiliateLink.status)
Index("idx_posts_user_created", Post.user_id, Post.created_at)
Index("idx_posts_score", Post.score)
Index("idx_posts_search_vector", Post.content, postgresql_using="gin")
Index("idx_post_likes_unique", PostLike.post_id, PostLike.user_id, unique=True)
Index("idx_follows_unique", Follow.follower_id, Follow.following_id, unique=True)

Index("idx_posts_reel_viral", Post.is_reel, Post.viral_score)
Index("idx_reel_views_post_created", ReelView.post_id, ReelView.created_at)
Index("idx_stories_user_expires", Story.user_id, Story.expires_at)
Index("idx_post_hashtag_unique", PostHashtag.post_id, PostHashtag.hashtag_id, unique=True)
Index("idx_hashtag_follows_unique", HashtagFollow.hashtag_id, HashtagFollow.user_id, unique=True)
Index("idx_story_views_unique", StoryView.story_id, StoryView.viewer_id, unique=True)
