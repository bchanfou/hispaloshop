"""
User and authentication related models.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: str
    country: Optional[str] = None
    email_verified: bool = False
    approved: bool = True
    created_at: Optional[str] = None
    locale: Optional[Dict[str, str]] = None
    address: Optional[Dict[str, str]] = None
    shipping_addresses: Optional[List[Dict[str, Any]]] = None
    consent: Optional[Dict[str, Any]] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    # Admin country scope — admin can manage multiple countries
    country_scope: List[str] = []
    # Extra capabilities on top of the main role (e.g. "affiliate")
    capabilities: List[str] = []


class Address(BaseModel):
    street: str
    city: str
    postal_code: str
    country: str
    phone: Optional[str] = None


class UserPreferences(BaseModel):
    diet_preferences: List[str] = []
    allergens: List[str] = []
    goals: Optional[str] = None


class UserConsent(BaseModel):
    analytics_consent: bool = False
    consent_version: str = "1.0"
    consent_date: Optional[str] = None
    withdrawal_date: Optional[str] = None
    reactivation_date: Optional[str] = None


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


class UserAddressInput(BaseModel):
    addresses: List[ShippingAddress]
    default_address_id: Optional[str] = None


class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"
    country: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    contact_person: Optional[str] = None
    fiscal_address: Optional[str] = None
    vat_cif: Optional[str] = None
    analytics_consent: bool = False
    consent_version: str = "1.0"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str
