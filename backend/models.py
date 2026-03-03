from datetime import datetime
from typing import List, Optional
from uuid import UUID as UUIDType
import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
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
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    products: Mapped[List["Product"]] = relationship(back_populates="producer")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="user")
    influencer_profile: Mapped[Optional["InfluencerProfile"]] = relationship(back_populates="user")


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


class InfluencerProfile(Base):
    __tablename__ = "influencer_profiles"

    id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id"))
    tier: Mapped[str] = mapped_column(String(20), default="bronze")
    total_earnings_cents: Mapped[int] = mapped_column(default=0)
    followers_count: Mapped[int] = mapped_column(default=0)

    user: Mapped["User"] = relationship(back_populates="influencer_profile")
