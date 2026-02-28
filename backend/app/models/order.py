"""
Order and cart models.
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    currency: str
    quantity: int
    image: Optional[str] = None
    variant_id: Optional[str] = None
    variant_name: Optional[str] = None
    pack_id: Optional[str] = None
    pack_info: Optional[Dict[str, Any]] = None
    producer_id: Optional[str] = None


class Order(BaseModel):
    order_id: str
    user_id: str
    user_email: str
    user_name: str
    items: List[CartItem]
    total: float
    currency: str
    status: str = "pending"
    shipping_address: Dict[str, str]
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    stripe_session_id: Optional[str] = None
    payment_status: str = "pending"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    discount_code: Optional[str] = None
    discount_amount: float = 0
    influencer_code: Optional[str] = None
    status_history: Optional[List[Dict[str, Any]]] = None


class CartUpdateInput(BaseModel):
    quantity: int


class OrderCreateInput(BaseModel):
    shipping_address: Dict[str, str]


class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None


class BuyNowInput(BaseModel):
    product_id: str
    quantity: int
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    shipping_address: Dict[str, str]
