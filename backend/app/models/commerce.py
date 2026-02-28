"""
Discount, influencer and payment models.
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any


class DiscountCode(BaseModel):
    code_id: str
    code: str
    discount_type: str  # 'percentage' or 'fixed'
    discount_value: float
    min_purchase: float = 0
    max_uses: Optional[int] = None
    current_uses: int = 0
    valid_from: str
    valid_until: str
    active: bool = True
    created_at: Optional[str] = None
    influencer_id: Optional[str] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None


class DiscountCodeCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_purchase: float = 0
    max_uses: Optional[int] = None
    valid_from: str
    valid_until: str
    active: bool = True
    influencer_id: Optional[str] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None


class Influencer(BaseModel):
    influencer_id: str
    name: str
    email: EmailStr
    discount_code: str
    commission_percentage: float
    total_sales: float = 0
    total_orders: int = 0
    total_commission: float = 0
    status: str = "active"
    created_at: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: bool = False
    payout_method: str = "stripe_connect"


class InfluencerCreate(BaseModel):
    name: str
    email: EmailStr
    discount_code: str
    commission_percentage: float
    payout_method: str = "stripe_connect"


class InfluencerCommission(BaseModel):
    commission_id: str
    influencer_id: str
    order_id: str
    order_total: float
    commission_amount: float
    status: str = "pending"
    created_at: Optional[str] = None
    paid_at: Optional[str] = None


class PaymentTransaction(BaseModel):
    transaction_id: str
    order_id: str
    amount: float
    currency: str
    status: str
    stripe_payment_intent_id: Optional[str] = None
    created_at: Optional[str] = None


class Review(BaseModel):
    review_id: str
    product_id: str
    user_id: str
    user_name: str
    order_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    verified_purchase: bool = True
    created_at: Optional[str] = None
    hidden: bool = False


class ReviewCreateInput(BaseModel):
    product_id: str
    order_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None


class Notification(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool = False
    created_at: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class ProducerAddressInput(BaseModel):
    office_address: Optional[Dict[str, str]] = None
    warehouse_address: Optional[Dict[str, str]] = None
