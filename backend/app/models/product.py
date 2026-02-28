"""
Product, category and certificate models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Category(BaseModel):
    category_id: str
    name: str
    slug: str
    icon: Optional[str] = None
    description: Optional[str] = None


class Pack(BaseModel):
    pack_id: str
    units: int
    unit_label: str
    price_per_unit: float
    total_price: float
    stock: int = 0


class Variant(BaseModel):
    variant_id: str
    name: str
    packs: List[Pack] = []


class Product(BaseModel):
    product_id: str
    name: str
    slug: str
    description: str
    price: float
    currency: str = "EUR"
    category_id: str
    producer_id: str
    images: List[str] = []
    certifications: List[str] = []
    status: str = "pending"
    visible: bool = True
    country_origin: Optional[str] = None
    region: Optional[str] = None
    ingredients: Optional[str] = None
    nutritional_info: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    translations: Optional[Dict[str, Dict[str, str]]] = None
    variants: Optional[List[Variant]] = None
    country_availability: Optional[List[Dict[str, Any]]] = None
    stock: int = 0
    low_stock_threshold: int = 10
    track_stock: bool = True


class Certificate(BaseModel):
    certificate_id: str
    product_id: str
    name: str
    issuing_authority: str
    issue_date: str
    expiry_date: Optional[str] = None
    document_url: Optional[str] = None
    qr_code: Optional[str] = None
    status: str = "pending"
    translations: Optional[Dict[str, Dict[str, str]]] = None


class ProductInput(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    images: List[str] = []
    certifications: List[str] = []
    country_origin: Optional[str] = None
    region: Optional[str] = None
    ingredients: Optional[str] = None
    nutritional_info: Optional[Dict[str, Any]] = None


class CertificateInput(BaseModel):
    name: str
    issuing_authority: str
    issue_date: str
    expiry_date: Optional[str] = None


class CategoryInput(BaseModel):
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None


class VariantCreateInput(BaseModel):
    name: str


class PackCreateInput(BaseModel):
    units: int
    unit_label: str
    price_per_unit: float
    stock: int = 0


class PackUpdateInput(BaseModel):
    units: Optional[int] = None
    unit_label: Optional[str] = None
    price_per_unit: Optional[float] = None
    stock: Optional[int] = None
