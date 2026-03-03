from datetime import datetime
from typing import List, Optional
from uuid import UUID as UUIDType
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


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
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    kyc_status: Mapped[str] = mapped_column(String(20), default="pending")
    kyc_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_account_status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    products: Mapped[List["Product"]] = relationship(back_populates="producer")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="user")
    influencer_profile: Mapped[Optional["InfluencerProfile"]] = relationship(back_populates="user")
    cart: Mapped[Optional["Cart"]] = relationship(back_populates="user", uselist=False)
    orders: Mapped[List["Order"]] = relationship(back_populates="user")


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
    slug: Mapped[str] = mapped_column(String(200))
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
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="products")
    producer: Mapped["User"] = relationship(back_populates="products")
    category: Mapped["Category"] = relationship(back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship(back_populates="product", order_by="ProductImage.sort_order")
    certificates: Mapped[List["ProductCertificate"]] = relationship(back_populates="product")
    order_items: Mapped[List["OrderItem"]] = relationship(back_populates="product")

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
        bps_map = {"free": 2000, "pro": 1800, "elite": 1600}
        return bps_map.get(self.plan, 2000)


class InfluencerProfile(Base):
    __tablename__ = "influencer_profiles"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    tier: Mapped[str] = mapped_column(String(20), default="bronze")
    total_earnings_cents: Mapped[int] = mapped_column(default=0)
    followers_count: Mapped[int] = mapped_column(default=0)

    user: Mapped["User"] = relationship(back_populates="influencer_profile")


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
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


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
