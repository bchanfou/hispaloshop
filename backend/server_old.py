from fastapi import FastAPI, APIRouter, HTTPException, Request, Cookie, Header, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import qrcode
import io
import base64
import hashlib
import stripe
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')  # Real key for Stripe Connect
PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION', '0.20'))

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Email configuration - Initialize after logger
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Hispaloshop <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 'PLACEHOLDER_RESEND_KEY':
    resend.api_key = RESEND_API_KEY
    logger.info("[EMAIL] Resend API key configured successfully")
else:
    logger.warning("[EMAIL] Resend API key not configured - email sending will fail")

# Helper function for password hashing
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Generate verification token
def generate_verification_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex  # 64 char token

# Central email sending function (MANDATORY - DO NOT DUPLICATE)
def send_email(to: str, subject: str, html: str):
    """
    Send email using Resend.
    This is the ONLY function that should send emails.
    Raises HTTPException if sending fails.
    """
    if not RESEND_API_KEY or RESEND_API_KEY == 'PLACEHOLDER_RESEND_KEY':
        logger.error(f"[EMAIL] Cannot send email to {to}: Resend not configured")
        raise HTTPException(
            status_code=500,
            detail="Email service not configured. Please contact support."
        )
    
    try:
        params = {
            "from": EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html
        }
        response = resend.Emails.send(params)
        logger.info(f"[EMAIL] Successfully sent '{subject}' to {to}")
        return response
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send email to {to}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )

# Models (keeping existing ones, adding password field)

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

class UserPreferences(BaseModel):
    user_id: str
    diet_preferences: List[str] = []
    allergens: List[str] = []
    goals: Optional[str] = None
    updated_at: datetime

class AIProfile(BaseModel):
    """AI Memory Profile for personalized shopping assistance"""
    user_id: str
    language: str = "auto"  # auto | es | en | fr | de | etc.
    tone: str = "friendly"  # short_direct | friendly | explanatory
    diet: List[str] = []  # vegan, gluten_free, halal, vegetarian, etc.
    allergies: List[str] = []  # nuts, lactose, shellfish, etc.
    goals: List[str] = []  # healthy_eating, weight_loss, muscle_gain, energy
    restrictions: List[str] = []  # no_sugar, low_sodium, low_carb, etc.
    budget: str = "medium"  # low | medium | high
    preferred_categories: List[str] = []  # snacks, oils, preserves, etc.
    first_visit_completed: bool = False
    last_updated: Optional[str] = None

class AIProfileUpdate(BaseModel):
    """Model for updating AI Profile"""
    language: Optional[str] = None
    tone: Optional[str] = None
    diet: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    restrictions: Optional[List[str]] = None
    budget: Optional[str] = None
    preferred_categories: Optional[List[str]] = None

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
    price: float  # Base price (for products without variants)
    images: List[str]
    country_origin: str
    ingredients: List[str]
    allergens: List[str]
    certifications: List[str]
    approved: bool = False
    created_at: datetime
    # Stock Management Fields (for products without variants)
    stock: int = 100
    low_stock_threshold: int = 5
    track_stock: bool = True
    # Variants & Packs (optional)
    variants: Optional[List[Dict[str, Any]]] = None  # Array of variants with packs
    # Country Availability & Pricing (Phase C)
    available_countries: Optional[List[str]] = None  # ISO 3166-1 alpha-2 codes
    country_prices: Optional[Dict[str, float]] = None  # {"ES": 24.99, "FR": 26.99}
    country_currency: Optional[Dict[str, str]] = None  # {"ES": "EUR", "FR": "EUR"}
    # Translations (optional)
    translations: Optional[Dict[str, Dict[str, str]]] = None  # {"es": {"name": "...", "description": "..."}}

# Country/Language/Currency Configuration
SUPPORTED_COUNTRIES = {
    "ES": {"name": "Spain", "flag": "🇪🇸", "currency": "EUR", "languages": ["es", "en"]},
    "FR": {"name": "France", "flag": "🇫🇷", "currency": "EUR", "languages": ["fr", "en"]},
    "DE": {"name": "Germany", "flag": "🇩🇪", "currency": "EUR", "languages": ["de", "en"]},
    "IT": {"name": "Italy", "flag": "🇮🇹", "currency": "EUR", "languages": ["it", "en"]},
    "PT": {"name": "Portugal", "flag": "🇵🇹", "currency": "EUR", "languages": ["pt", "en"]},
    "US": {"name": "United States", "flag": "🇺🇸", "currency": "USD", "languages": ["en", "es"]},
    "CA": {"name": "Canada", "flag": "🇨🇦", "currency": "CAD", "languages": ["en", "fr"]},
    "GB": {"name": "United Kingdom", "flag": "🇬🇧", "currency": "GBP", "languages": ["en"]},
    "MX": {"name": "Mexico", "flag": "🇲🇽", "currency": "MXN", "languages": ["es", "en"]},
    "JP": {"name": "Japan", "flag": "🇯🇵", "currency": "JPY", "languages": ["ja", "en"]},
    "KR": {"name": "South Korea", "flag": "🇰🇷", "currency": "KRW", "languages": ["ko", "en"]},
    "CN": {"name": "China", "flag": "🇨🇳", "currency": "CNY", "languages": ["zh", "en"]},
    "IN": {"name": "India", "flag": "🇮🇳", "currency": "INR", "languages": ["hi", "en"]},
    "AE": {"name": "UAE", "flag": "🇦🇪", "currency": "AED", "languages": ["ar", "en"]},
    "SA": {"name": "Saudi Arabia", "flag": "🇸🇦", "currency": "SAR", "languages": ["ar", "en"]},
    "BR": {"name": "Brazil", "flag": "🇧🇷", "currency": "BRL", "languages": ["pt", "en"]},
    "AU": {"name": "Australia", "flag": "🇦🇺", "currency": "AUD", "languages": ["en"]},
    "RU": {"name": "Russia", "flag": "🇷🇺", "currency": "RUB", "languages": ["ru", "en"]},
}

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "zh": {"name": "Mandarin Chinese", "native": "中文"},
    "es": {"name": "Spanish", "native": "Español"},
    "hi": {"name": "Hindi", "native": "हिन्दी"},
    "ar": {"name": "Arabic", "native": "العربية"},
    "fr": {"name": "French", "native": "Français"},
    "pt": {"name": "Portuguese", "native": "Português"},
    "ru": {"name": "Russian", "native": "Русский"},
    "de": {"name": "German", "native": "Deutsch"},
    "ja": {"name": "Japanese", "native": "日本語"},
    "ko": {"name": "Korean", "native": "한국어"},
}

SUPPORTED_CURRENCIES = {
    "EUR": {"symbol": "€", "name": "Euro"},
    "USD": {"symbol": "$", "name": "US Dollar"},
    "GBP": {"symbol": "£", "name": "British Pound"},
    "JPY": {"symbol": "¥", "name": "Japanese Yen"},
    "KRW": {"symbol": "₩", "name": "Korean Won"},
    "CNY": {"symbol": "¥", "name": "Chinese Yuan"},
    "INR": {"symbol": "₹", "name": "Indian Rupee"},
    "AED": {"symbol": "د.إ", "name": "UAE Dirham"},
    "SAR": {"symbol": "﷼", "name": "Saudi Riyal"},
    "BRL": {"symbol": "R$", "name": "Brazilian Real"},
    "MXN": {"symbol": "$", "name": "Mexican Peso"},
    "CAD": {"symbol": "$", "name": "Canadian Dollar"},
    "AUD": {"symbol": "$", "name": "Australian Dollar"},
    "RUB": {"symbol": "₽", "name": "Russian Ruble"},
}

# Pack Model (embedded in variants)
class Pack(BaseModel):
    pack_id: str
    label: str  # "1 unit", "Pack 6", "Pack 12"
    units: int
    price: float
    stock: int = 100

# Variant Model (embedded in products)
class Variant(BaseModel):
    variant_id: str
    name: str  # "Tomato", "250g", "Original"
    sku: Optional[str] = None
    packs: List[Pack] = []

# Input models for variants and packs
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

class DiscountCode(BaseModel):
    """Discount code for orders"""
    code_id: str
    code: str  # Unique, uppercase
    type: str  # percentage | fixed | free_shipping
    value: float  # 10 for 10% or €10
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_limit: Optional[int] = None  # None = unlimited
    usage_count: int = 0
    min_cart_amount: Optional[float] = None
    applicable_products: List[str] = []  # Empty = all products
    created_by: str
    created_at: str

class DiscountCodeCreate(BaseModel):
    """Model for creating discount codes"""
    code: str
    type: str  # percentage | fixed | free_shipping
    value: float
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_limit: Optional[int] = None
    min_cart_amount: Optional[float] = None
    applicable_products: List[str] = []

class Certificate(BaseModel):
    certificate_id: str
    product_id: str
    product_name: str
    data: Dict[str, Any]
    qr_code: Optional[str] = None
    approved: bool = False
    created_at: datetime

class CartItem(BaseModel):
    user_id: str
    product_id: str
    product_name: str
    price: float
    quantity: int
    producer_id: str
    image: Optional[str] = None
    # Variant & Pack support
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

class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    session_id: str
    role: str
    content: str
    timestamp: datetime

class Notification(BaseModel):
    notification_id: str
    producer_id: str
    order_id: str
    type: str
    content: Dict[str, Any]
    read: bool = False
    created_at: datetime

# Input Models

class RegisterInput(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str
    country: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    contact_person: Optional[str] = None
    fiscal_address: Optional[str] = None
    vat_cif: Optional[str] = None

class LoginInput(BaseModel):
    email: EmailStr
    password: str

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

class CertificateInput(BaseModel):
    product_id: str
    data: Dict[str, Any]

class CategoryInput(BaseModel):
    name: str
    description: Optional[str] = None

class CartUpdateInput(BaseModel):
    product_id: str
    quantity: int
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None

class OrderCreateInput(BaseModel):
    shipping_address: Dict[str, str]

class ChatMessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None

class PreferencesInput(BaseModel):
    diet_preferences: List[str]
    allergens: List[str]

class ForgotPasswordInput(BaseModel):
    email: EmailStr

class ResetPasswordInput(BaseModel):
    token: str
    new_password: str

class BuyNowInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = 1


    goals: Optional[str] = None

# Review Models
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

# Auth helpers

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    session_token = request.cookies.get('session_token')
    
    # Log for debugging
    logger.info(f"[get_current_user] Cookies received: {dict(request.cookies)}")
    logger.info(f"[get_current_user] Authorization header: {authorization[:20] if authorization else 'None'}...")
    
    if not session_token and authorization:
        if authorization.startswith('Bearer '):
            session_token = authorization.replace('Bearer ', '')
    
    if not session_token:
        logger.warning("[get_current_user] No session token found")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logger.info(f"[get_current_user] Using session token: {session_token[:20]}...")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        logger.warning(f"[get_current_user] Session not found in DB for token: {session_token[:20]}...")
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"[get_current_user] Authenticated user: {user_doc.get('email', 'unknown')}")
    return User(**user_doc)

async def require_role(user: User, allowed_roles: List[str]):
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

# Auth routes

@api_router.post("/auth/register")
async def register(input: RegisterInput):
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(input.password)
    
    user_data = {
        "user_id": user_id,
        "email": input.email,
        "name": input.name,
        "role": input.role,
        "country": input.country,
        "password_hash": password_hash,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved": input.role == "customer"
    }
    
    if input.role == "producer":
        user_data.update({
            "company_name": input.company_name,
            "phone": input.phone,
            "whatsapp": input.whatsapp,
            "contact_person": input.contact_person,
            "fiscal_address": input.fiscal_address,
            "vat_cif": input.vat_cif,
            "approved": False
        })
    
    await db.users.insert_one(user_data)
    
    # Generate verification token
    verification_token = generate_verification_token()
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "email": input.email,
        "token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    # Send real verification email
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C1C1C;">Verify your email</h2>
        <p>Welcome to Hispaloshop.</p>
        <p>Please verify your email by clicking the button below:</p>
        
        <a href="{verification_link}"
           style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0;">
           Verify Email
        </a>
        
        <p style="color: #7A7A7A; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{verification_link}">{verification_link}</a>
        </p>
        
        <p style="color: #7A7A7A; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours.
        </p>
    </div>
    """
    
    try:
        send_email(
            to=input.email,
            subject="Verify your email - Hispaloshop",
            html=email_html
        )
        logger.info(f"[REGISTRATION] Verification email sent to {input.email}")
    except HTTPException as e:
        # If email fails, we should still allow registration but warn the user
        logger.error(f"[REGISTRATION] Failed to send verification email to {input.email}")
        # Don't block registration, but user won't get email
    
    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "user_id": user_id
    }

# Email verification endpoints
@api_router.post("/auth/verify-email")
async def verify_email(token: str):
    """Verify email using token"""
    verification = await db.email_verifications.find_one(
        {"token": token},
        {"_id": 0}
    )
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check if expired
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Update user's email_verified status
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    # Delete the verification token
    await db.email_verifications.delete_one({"token": token})
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(user: User = Depends(get_current_user)):
    """Resend verification email"""
    if user.email_verified:
        return {"message": "Email already verified"}
    
    # Delete old tokens
    await db.email_verifications.delete_many({"user_id": user.user_id})
    
    # Generate new token
    verification_token = generate_verification_token()
    await db.email_verifications.insert_one({
        "user_id": user.user_id,
        "email": user.email,
        "token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    # Send real verification email
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C1C1C;">Verify your email</h2>
        <p>Welcome back to Hispaloshop.</p>
        <p>Please verify your email by clicking the button below:</p>
        
        <a href="{verification_link}"
           style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0;">
           Verify Email
        </a>
        
        <p style="color: #7A7A7A; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{verification_link}">{verification_link}</a>
        </p>
        
        <p style="color: #7A7A7A; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours.
        </p>
    </div>
    """
    
    # Send email - this will raise HTTPException if it fails
    send_email(
        to=user.email,
        subject="Verify your email - Hispaloshop",
        html=email_html
    )
    
    logger.info(f"[RESEND_VERIFICATION] Email sent to {user.email}")
    
    return {
        "message": "Verification email sent. Please check your inbox."
    }

@api_router.get("/auth/verification-status")
async def get_verification_status(user: User = Depends(get_current_user)):
    """Get email verification status"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email_verified": 1})
    return {"email_verified": user_doc.get("email_verified", False)}

@api_router.post("/auth/login")
async def login(input: LoginInput):
    user_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if "password_hash" not in user_doc:
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    password_hash = hash_password(input.password)
    if password_hash != user_doc["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user_doc.pop("password_hash", None)
    
    # Create response and set cookie
    response = JSONResponse(content={
        "user": user_doc,
        "session_token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,  # 7 days
        path="/",
        samesite="none",
        httponly=False,
        secure=True
    )
    
    return response

# Password Recovery Endpoints

@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordInput):
    """Request password reset email"""
    # Find user by email
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        logger.warning(f"[FORGOT_PASSWORD] Email not found: {input.email}")
        return {"message": "If that email exists, a password reset link has been sent."}
    
    # Delete any existing reset tokens for this user
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    
    # Generate secure reset token
    reset_token = generate_verification_token()
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": input.email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),  # 1 hour expiry
        "used": False
    })
    
    # Send password reset email
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C1C1C;">Reset your password</h2>
        <p>You requested to reset your password for Hispaloshop.</p>
        <p>Click the button below to set a new password:</p>
        
        <a href="{reset_link}"
           style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0;">
           Reset Password
        </a>
        
        <p style="color: #7A7A7A; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}">{reset_link}</a>
        </p>
        
        <p style="color: #7A7A7A; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour.<br>
            If you didn't request this, please ignore this email.
        </p>
    </div>
    """
    
    try:
        send_email(
            to=input.email,
            subject="Reset your password - Hispaloshop",
            html=email_html
        )
        logger.info(f"[FORGOT_PASSWORD] Reset email sent to {input.email}")
    except HTTPException:
        logger.error(f"[FORGOT_PASSWORD] Failed to send reset email to {input.email}")
        # Still return success to user
    
    return {"message": "If that email exists, a password reset link has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput):
    """Reset password using token"""
    # Find valid reset token
    reset = await db.password_resets.find_one(
        {"token": input.token, "used": False},
        {"_id": 0}
    )
    
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate new password
    if len(input.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Update user's password
    password_hash = hash_password(input.new_password)
    await db.users.update_one(
        {"user_id": reset["user_id"]},
        {"$set": {"password_hash": password_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": input.token},
        {"$set": {"used": True}}
    )
    
    # Invalidate all user sessions for security
    await db.user_sessions.delete_many({"user_id": reset["user_id"]})
    
    logger.info(f"[RESET_PASSWORD] Password reset successful for user {reset['user_id']}")
    
    return {"message": "Password reset successfully. Please login with your new password."}

@api_router.get("/auth/session")
async def auth_session(request: Request, response: JSONResponse):
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    import httpx
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "customer",
            "email_verified": True,
            "approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    else:
        user_id = user_doc["user_id"]
    
    session_token = auth_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request):
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    return {"message": "Logged out"}

# [REST OF THE ROUTES - Categories, Products, Certificates, Cart, Orders, Payments, Chat, Preferences, Notifications, Admin - KEEPING THEM IDENTICAL TO PREVIOUS VERSION]
# Copying from previous implementation...

# Categories
@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories")
async def create_category(input: CategoryInput, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    slug = input.name.lower().replace(' ', '-')
    category = {
        "category_id": category_id,
        "name": input.name,
        "slug": slug,
        "description": input.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category)
    return category

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, input: CategoryInput, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {"name": input.name, "description": input.description, "slug": input.name.lower().replace(' ', '-')}}
    )
    return {"message": "Category updated"}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.categories.delete_one({"category_id": category_id})
    return {"message": "Category deleted"}

# ============================================
# LOCALE & CONFIGURATION
# ============================================

@api_router.get("/config/countries")
async def get_countries():
    """Get all supported countries with their configurations"""
    return SUPPORTED_COUNTRIES

@api_router.get("/config/languages")
async def get_languages():
    """Get all supported languages"""
    return SUPPORTED_LANGUAGES

@api_router.get("/config/currencies")
async def get_currencies():
    """Get all supported currencies"""
    return SUPPORTED_CURRENCIES

@api_router.get("/config/locale")
async def get_full_locale_config():
    """Get complete locale configuration for frontend"""
    return {
        "countries": SUPPORTED_COUNTRIES,
        "languages": SUPPORTED_LANGUAGES,
        "currencies": SUPPORTED_CURRENCIES,
        "default_country": "ES",
        "default_language": "en",
        "default_currency": "EUR"
    }


# Exchange rate cache (in-memory)
exchange_rate_cache = {
    "rates": None,
    "updated_at": None
}

@api_router.get("/exchange-rates")
async def get_exchange_rates():
    """
    Get current exchange rates from cache or external API.
    Base currency: EUR
    Cached for 24 hours.
    """
    from datetime import timedelta
    
    # Check if cache is valid (< 24 hours old)
    if exchange_rate_cache["rates"] and exchange_rate_cache["updated_at"]:
        cache_age = datetime.now(timezone.utc) - exchange_rate_cache["updated_at"]
        if cache_age < timedelta(hours=24):
            logger.info("[Exchange Rates] Returning cached rates")
            return {
                "base": "EUR",
                "rates": exchange_rate_cache["rates"],
                "updated_at": exchange_rate_cache["updated_at"].isoformat()
            }
    
    # Fetch new rates from external API
    try:
        import httpx
        logger.info("[Exchange Rates] Fetching fresh rates from API")
        
        # Using exchangerate-api.com (free tier, no API key needed)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://open.er-api.com/v6/latest/EUR",
                timeout=5.0
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") == "success":
                rates = data.get("rates", {})
                
                # Update cache
                exchange_rate_cache["rates"] = rates
                exchange_rate_cache["updated_at"] = datetime.now(timezone.utc)
                
                logger.info(f"[Exchange Rates] Updated cache with {len(rates)} rates")
                
                return {
                    "base": "EUR",
                    "rates": rates,
                    "updated_at": exchange_rate_cache["updated_at"].isoformat()
                }
            else:
                raise Exception("API returned unsuccessful result")
                
    except Exception as e:
        logger.error(f"[Exchange Rates] Error fetching rates: {e}")
        
        # Fallback to cached rates even if expired
        if exchange_rate_cache["rates"]:
            logger.warning("[Exchange Rates] Using stale cache as fallback")
            return {
                "base": "EUR",
                "rates": exchange_rate_cache["rates"],
                "updated_at": exchange_rate_cache["updated_at"].isoformat() if exchange_rate_cache["updated_at"] else None,
                "stale": True
            }
        
        # Last resort: return hardcoded rates
        logger.warning("[Exchange Rates] Using hardcoded fallback rates")
        fallback_rates = {
            "USD": 1.08,
            "GBP": 0.85,
            "JPY": 161.0,
            "CNY": 7.78,
            "INR": 89.5,
            "KRW": 1450.0,
            "AED": 3.97,
            "BRL": 5.35,
            "CAD": 1.47,
            "AUD": 1.65,
            "RUB": 99.0,
            "MXN": 18.5,
            "EUR": 1.0
        }
        return {
            "base": "EUR",
            "rates": fallback_rates,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "fallback": True
        }


@api_router.get("/user/locale")
async def get_user_locale(user: User = Depends(get_current_user)):
    """Get current user's locale preferences"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    locale = user_doc.get("locale", {}) if user_doc else {}
    return {
        "country": locale.get("country", "ES"),
        "language": locale.get("language", "en"),
        "currency": locale.get("currency", "EUR")
    }

class LocaleUpdateInput(BaseModel):
    country: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None

@api_router.put("/user/locale")
async def update_user_locale(input: LocaleUpdateInput, user: User = Depends(get_current_user)):
    """Update user's locale preferences"""
    update_data = {}
    
    if input.country:
        if input.country not in SUPPORTED_COUNTRIES:
            raise HTTPException(status_code=400, detail="Invalid country code")
        update_data["locale.country"] = input.country
        # Auto-set base currency for country if currency not specified
        if not input.currency:
            update_data["locale.currency"] = SUPPORTED_COUNTRIES[input.country]["currency"]
    
    if input.language:
        if input.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Invalid language code")
        update_data["locale.language"] = input.language
    
    if input.currency:
        if input.currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail="Invalid currency code")
        update_data["locale.currency"] = input.currency
    
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})


# Address endpoints
@api_router.get("/user/address")
async def get_user_address(user: User = Depends(get_current_user)):
    """Get user's saved shipping address"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "address": 1})
    
    if not user_doc or "address" not in user_doc:
        return {"address": None}
    
    return {"address": user_doc["address"]}


@api_router.put("/user/address")
async def update_user_address(address: Address, user: User = Depends(get_current_user)):
    """Save or update user's shipping address"""
    # Validate required fields
    if not address.full_name or not address.street or not address.city or not address.postal_code or not address.country:
        raise HTTPException(status_code=400, detail="All address fields are required except phone")
    
    # Convert address to dict
    address_data = {
        "full_name": address.full_name,
        "street": address.street,
        "city": address.city,
        "postal_code": address.postal_code,
        "country": address.country,
        "phone": address.phone
    }
    
    # Update user's address
    result = await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"address": address_data}}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"[ADDRESS] Updated address for user {user.user_id}")
    
    return {
        "message": "Address saved successfully",
        "address": address_data
    }

    
    return {"message": "Locale updated"}

# Products
@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    country: Optional[str] = None,
    certifications: Optional[str] = None,
    approved_only: bool = True
):
    query = {}
    if approved_only:
        query["approved"] = True
    if category:
        query["category_id"] = category
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    if country:
        # Filter by country availability (products available in this country)
        query["$or"] = [
            {"available_countries": country},
            {"available_countries": None},  # Legacy products without country restrictions
            {"available_countries": {"$exists": False}}
        ]
    if certifications:
        cert_list = certifications.split(',')
        query["certifications"] = {"$in": cert_list}
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich products with country-specific pricing if country is specified
    if country:
        for product in products:
            country_prices = product.get("country_prices", {})
            if country in country_prices:
                product["display_price"] = country_prices[country]
                product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
            else:
                product["display_price"] = product["price"]
                product["display_currency"] = "EUR"
    
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, country: Optional[str] = None):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Add country-specific pricing info
    if country:
        available_countries = product.get("available_countries", [])
        country_prices = product.get("country_prices", {})
        
        # Check if available in country (or has no restrictions)
        is_available = not available_countries or country in available_countries
        product["is_available_in_country"] = is_available
        
        if country in country_prices:
            product["display_price"] = country_prices[country]
            product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
        else:
            product["display_price"] = product["price"]
            product["display_currency"] = "EUR"
    
    return product

@api_router.post("/products")
async def create_product(input: ProductInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "admin"])
    if user.role == "producer" and not user.approved:
        raise HTTPException(status_code=403, detail="Producer account not approved")
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    slug = input.name.lower().replace(' ', '-')
    product = {
        "product_id": product_id,
        "producer_id": user.user_id,
        "producer_name": user.company_name or user.name,
        "category_id": input.category_id,
        "name": input.name,
        "slug": slug,
        "description": input.description,
        "price": input.price,
        "images": input.images,
        "country_origin": input.country_origin,
        "ingredients": input.ingredients,
        "allergens": input.allergens,
        "certifications": input.certifications,
        "approved": user.role == "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Stock management fields
        "stock": 100,
        "low_stock_threshold": 5,
        "track_stock": True,
        # Country availability - default to country of origin
        "available_countries": [input.country_origin] if input.country_origin else [],
        "country_prices": {input.country_origin: input.price} if input.country_origin else {},
        "country_currency": {input.country_origin: "EUR"} if input.country_origin else {}
    }
    await db.products.insert_one(product)
    product.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return product

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, input: ProductInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "admin"])
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role == "producer" and product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "name": input.name,
            "description": input.description,
            "price": input.price,
            "images": input.images,
            "country_origin": input.country_origin,
            "ingredients": input.ingredients,
            "allergens": input.allergens,
            "certifications": input.certifications,
            "slug": input.name.lower().replace(' ', '-')
        }}
    )
    return {"message": "Product updated"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.products.delete_one({"product_id": product_id})
    return {"message": "Product deleted"}

# Certificates
@api_router.get("/certificates/product/{product_id}")
async def get_certificate(product_id: str, lang: str = "en"):
    cert = await db.certificates.find_one(
        {"product_id": product_id, "approved": True},
        {"_id": 0}
    )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert

@api_router.post("/certificates")
async def create_certificate(input: CertificateInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "admin"])
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_url = f"https://app.hispaloshop.com/certificate/{input.product_id}"
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    certificate = {
        "certificate_id": certificate_id,
        "product_id": input.product_id,
        "product_name": product["name"],
        "data": input.data,
        "qr_code": qr_base64,
        "approved": user.role == "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.certificates.insert_one(certificate)
    return certificate

# Cart
@api_router.get("/cart")
async def get_cart(user: User = Depends(get_current_user)):
    logger.info(f"[GET /cart] Fetching cart for user: {user.user_id}")
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    # Enrich cart items with current stock info
    enriched_items = []
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0, "stock": 1, "track_stock": 1})
        item["stock"] = product.get("stock", 0) if product else 0
        item["track_stock"] = product.get("track_stock", True) if product else True
        item["stock_available"] = not product.get("track_stock", True) or item["stock"] >= item["quantity"]
        enriched_items.append(item)
    
    # Get applied discount if any
    applied_discount = await db.cart_discounts.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "items": enriched_items,
        "discount": applied_discount
    }

@api_router.post("/cart/add")
async def add_to_cart(input: CartUpdateInput, user: User = Depends(get_current_user)):
    logger.info(f"[POST /cart/add] Adding to cart for user: {user.user_id}, product: {input.product_id}")
    
    # Get user's selected country
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # === COUNTRY AVAILABILITY CHECK ===
    available_countries = product.get("available_countries", [])
    if available_countries and user_country not in available_countries:
        raise HTTPException(
            status_code=400, 
            detail=f"This product is not available in your selected country ({user_country})"
        )
    
    # Initialize cart item data
    price = product["price"]
    currency = "EUR"
    stock = product.get("stock", 0)
    track_stock = product.get("track_stock", True)
    variant_id = input.variant_id
    variant_name = None
    pack_id = input.pack_id
    pack_label = None
    pack_units = 1
    
    # === COUNTRY PRICING ===
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    if user_country in country_prices:
        price = country_prices[user_country]
        currency = country_currency.get(user_country, "EUR")
    
    # Handle variants and packs
    variants = product.get("variants", [])
    
    if variants and (input.variant_id or input.pack_id):
        # Product has variants - must specify variant_id and pack_id
        if not input.variant_id:
            raise HTTPException(status_code=400, detail="Variant ID required for this product")
        
        # Find the variant
        variant = next((v for v in variants if v["variant_id"] == input.variant_id), None)
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        
        variant_name = variant["name"]
        
        # If packs exist, must specify pack_id
        packs = variant.get("packs", [])
        if packs:
            if not input.pack_id:
                raise HTTPException(status_code=400, detail="Pack ID required for this variant")
            
            pack = next((p for p in packs if p["pack_id"] == input.pack_id), None)
            if not pack:
                raise HTTPException(status_code=404, detail="Pack not found")
            
            price = pack["price"]
            stock = pack.get("stock", 0)
            pack_label = pack["label"]
            pack_units = pack["units"]
    elif variants:
        # Product has variants but none specified - error
        raise HTTPException(status_code=400, detail="This product has variants. Please select a variant.")
    
    # Stock validation
    if track_stock and stock <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock")
    
    if track_stock and input.quantity > stock:
        raise HTTPException(status_code=400, detail=f"Only {stock} units available")
    
    # Build unique cart item key (product + variant + pack)
    cart_query = {"user_id": user.user_id, "product_id": input.product_id}
    if variant_id:
        cart_query["variant_id"] = variant_id
    if pack_id:
        cart_query["pack_id"] = pack_id
    
    existing = await db.cart_items.find_one(cart_query, {"_id": 0})
    
    new_quantity = input.quantity
    if existing:
        # If updating, check total quantity doesn't exceed stock
        if track_stock and new_quantity > stock:
            raise HTTPException(status_code=400, detail=f"Only {stock} units available")
        
        await db.cart_items.update_one(cart_query, {"$set": {"quantity": new_quantity, "price": price, "currency": currency}})
    else:
        cart_item = {
            "user_id": user.user_id,
            "product_id": input.product_id,
            "product_name": product["name"],
            "price": price,
            "currency": currency,
            "quantity": input.quantity,
            "producer_id": product["producer_id"],
            "image": product["images"][0] if product.get("images") else None,
            "variant_id": variant_id,
            "variant_name": variant_name,
            "pack_id": pack_id,
            "pack_label": pack_label,
            "pack_units": pack_units,
            "country": user_country
        }
        await db.cart_items.insert_one(cart_item)
    return {"message": "Added to cart", "stock": stock}

@api_router.put("/cart/{product_id}")
async def update_cart_quantity(product_id: str, quantity: int, user: User = Depends(get_current_user)):
    """Update cart item quantity with stock validation"""
    if quantity <= 0:
        # Remove item if quantity is 0 or less
        await db.cart_items.delete_one({"user_id": user.user_id, "product_id": product_id})
        return {"message": "Item removed from cart"}
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "stock": 1, "track_stock": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    track_stock = product.get("track_stock", True)
    current_stock = product.get("stock", 0)
    
    if track_stock and quantity > current_stock:
        raise HTTPException(status_code=400, detail=f"Only {current_stock} units available")
    
    await db.cart_items.update_one(
        {"user_id": user.user_id, "product_id": product_id},
        {"$set": {"quantity": quantity}}
    )
    return {"message": "Cart updated", "quantity": quantity}

# IMPORTANT: This route must come BEFORE /cart/{product_id} to avoid being caught by the parameterized route
@api_router.post("/cart/validate-country")
async def validate_cart_country(input: dict, user: User = Depends(get_current_user)):
    """
    Validate cart items against a new country selection.
    Returns list of unavailable items and updates prices for available items.
    """
    new_country = input.get("country")
    if not new_country:
        raise HTTPException(status_code=400, detail="Country code required")
    
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    unavailable_items = []
    updated_items = []
    
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        available_countries = product.get("available_countries", [])
        
        # Check if product is available in new country
        if available_countries and new_country not in available_countries:
            unavailable_items.append({
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "variant_name": item.get("variant_name"),
                "pack_label": item.get("pack_label")
            })
        else:
            # Update price for new country
            new_price = item["price"]
            new_currency = item.get("currency", "EUR")
            
            country_prices = product.get("country_prices", {})
            country_currency = product.get("country_currency", {})
            
            if new_country in country_prices:
                new_price = country_prices[new_country]
                new_currency = country_currency.get(new_country, "EUR")
            
            updated_items.append({
                "product_id": item["product_id"],
                "old_price": item["price"],
                "new_price": new_price,
                "new_currency": new_currency
            })
    
    return {
        "unavailable_items": unavailable_items,
        "updated_items": updated_items,
        "unavailable_count": len(unavailable_items)
    }

@api_router.post("/cart/apply-country-change")
async def apply_country_change(input: dict, user: User = Depends(get_current_user)):
    """
    Apply country change: remove unavailable items and update prices for available items.
    """
    new_country = input.get("country")
    if not new_country:
        raise HTTPException(status_code=400, detail="Country code required")
    
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    removed_count = 0
    updated_count = 0
    
    for item in cart_items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        available_countries = product.get("available_countries", [])
        
        # Remove if not available in new country
        if available_countries and new_country not in available_countries:
            cart_query = {"user_id": user.user_id, "product_id": item["product_id"]}
            if item.get("variant_id"):
                cart_query["variant_id"] = item["variant_id"]
            if item.get("pack_id"):
                cart_query["pack_id"] = item["pack_id"]
            
            await db.cart_items.delete_one(cart_query)
            removed_count += 1
        else:
            # Update price and currency for new country
            new_price = product["price"]
            new_currency = "EUR"
            
            country_prices = product.get("country_prices", {})
            country_currency = product.get("country_currency", {})
            
            if new_country in country_prices:
                new_price = country_prices[new_country]
                new_currency = country_currency.get(new_country, "EUR")
            
            cart_query = {"user_id": user.user_id, "product_id": item["product_id"]}
            if item.get("variant_id"):
                cart_query["variant_id"] = item["variant_id"]
            if item.get("pack_id"):
                cart_query["pack_id"] = item["pack_id"]
            
            await db.cart_items.update_one(
                cart_query,
                {"$set": {"price": new_price, "currency": new_currency, "country": new_country}}
            )
            updated_count += 1
    
    return {
        "message": "Cart updated for new country",
        "removed_count": removed_count,
        "updated_count": updated_count
    }

@api_router.delete("/cart/remove-discount")
async def remove_discount_code(user: User = Depends(get_current_user)):
    """Remove applied discount code from cart"""
    logger.info(f"[remove_discount] Removing discount for user: {user.user_id}")
    result = await db.cart_discounts.delete_one({"user_id": user.user_id})
    logger.info(f"[remove_discount] Delete result: deleted_count={result.deleted_count}")
    return {"message": "Discount code removed"}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(
    product_id: str, 
    variant_id: Optional[str] = None, 
    pack_id: Optional[str] = None, 
    user: User = Depends(get_current_user)
):
    """Remove item from cart. For products with variants, variant_id and pack_id are required."""
    query = {"user_id": user.user_id, "product_id": product_id}
    if variant_id:
        query["variant_id"] = variant_id
    if pack_id:
        query["pack_id"] = pack_id
    await db.cart_items.delete_one(query)
    return {"message": "Removed from cart"}

# Payments & Orders (keeping existing implementation)
# [Keeping all remaining routes identical]
# Continuing from cart routes...

# Payment & Order Routes
@api_router.post("/payments/create-checkout")
async def create_checkout(request: Request, input: OrderCreateInput, user: User = Depends(get_current_user)):
    # Check email verification before checkout
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email_verified": 1, "locale": 1})
    if not user_doc.get("email_verified", False):
        raise HTTPException(
            status_code=403, 
            detail="Please verify your email before placing an order. Check your email or request a new verification link."
        )
    
    # Get user's selected country for pricing and currency
    user_country = user_doc.get("locale", {}).get("country", "ES")
    base_currency = SUPPORTED_COUNTRIES.get(user_country, {}).get("currency", "EUR")
    
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # === COUNTRY AVAILABILITY & STOCK VALIDATION AT CHECKOUT ===
    stock_issues = []
    for item in cart_items:
        product = await db.products.find_one(
            {"product_id": item["product_id"]}, 
            {"_id": 0, "stock": 1, "track_stock": 1, "name": 1, "variants": 1, 
             "available_countries": 1, "country_prices": 1}
        )
        if not product:
            stock_issues.append(f"Product '{item['product_name']}' no longer available")
            continue
        
        # Validate country availability
        available_countries = product.get("available_countries", [])
        if available_countries and user_country not in available_countries:
            stock_issues.append(f"Product '{item['product_name']}' is not available in {user_country}")
            continue
        
        # Validate pricing matches
        country_prices = product.get("country_prices", {})
        if country_prices and user_country in country_prices:
            expected_price = country_prices[user_country]
            if abs(item["price"] - expected_price) > 0.01:
                stock_issues.append(f"Price changed for '{item['product_name']}'. Please refresh your cart.")
                continue
        
        track_stock = product.get("track_stock", True)
        variant_id = item.get("variant_id")
        pack_id = item.get("pack_id")
        
        # Determine stock based on variant/pack or product level
        if variant_id and pack_id and product.get("variants"):
            # Find pack stock
            current_stock = 0
            for variant in product["variants"]:
                if variant["variant_id"] == variant_id:
                    for pack in variant.get("packs", []):
                        if pack["pack_id"] == pack_id:
                            current_stock = pack.get("stock", 0)
                            break
                    break
            item_label = f"{item['product_name']} ({item.get('variant_name', '')} - {item.get('pack_label', '')})"
        else:
            current_stock = product.get("stock", 0)
            item_label = item['product_name']
        
        if track_stock:
            if current_stock <= 0:
                stock_issues.append(f"'{item_label}' is out of stock")
            elif item["quantity"] > current_stock:
                stock_issues.append(f"Only {current_stock} units of '{item_label}' available")
    
    if stock_issues:
        raise HTTPException(status_code=400, detail={"message": "Checkout validation failed", "issues": stock_issues})
    
    # Calculate base total
    subtotal = sum(item["price"] * item["quantity"] for item in cart_items)
    
    # === APPLY DISCOUNT IF ANY ===
    discount_amount = 0
    applied_discount = await db.cart_discounts.find_one({"user_id": user.user_id}, {"_id": 0})
    discount_info = None
    
    if applied_discount:
        # Re-validate discount code at checkout time
        discount_code = await db.discount_codes.find_one({"code_id": applied_discount["code_id"]}, {"_id": 0})
        
        if discount_code and discount_code.get("active", True):
            now = datetime.now(timezone.utc).isoformat()
            valid = True
            
            if discount_code.get("start_date") and now < discount_code["start_date"]:
                valid = False
            if discount_code.get("end_date") and now > discount_code["end_date"]:
                valid = False
            if discount_code.get("usage_limit") is not None and discount_code.get("usage_count", 0) >= discount_code["usage_limit"]:
                valid = False
            if discount_code.get("min_cart_amount") and subtotal < discount_code["min_cart_amount"]:
                valid = False
            
            if valid:
                # Calculate discount
                if discount_code["type"] == "percentage":
                    applicable_products = discount_code.get("applicable_products", [])
                    if applicable_products:
                        applicable_total = sum(
                            item["price"] * item["quantity"] 
                            for item in cart_items 
                            if item["product_id"] in applicable_products
                        )
                        discount_amount = applicable_total * (discount_code["value"] / 100)
                    else:
                        discount_amount = subtotal * (discount_code["value"] / 100)
                elif discount_code["type"] == "fixed":
                    discount_amount = min(discount_code["value"], subtotal)
                # free_shipping would be handled separately in shipping calculation
                
                discount_info = {
                    "code": discount_code["code"],
                    "type": discount_code["type"],
                    "value": discount_code["value"],
                    "discount_amount": round(discount_amount, 2)
                }
    
    total_amount = max(0, subtotal - discount_amount)
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    
    line_items = []
    for item in cart_items:
        line_item = {
            "product_id": item["product_id"],
            "product_name": item["product_name"],
            "producer_id": item["producer_id"],
            "quantity": item["quantity"],
            "price": item["price"],
            "subtotal": item["price"] * item["quantity"]
        }
        # Include variant/pack info if present
        if item.get("variant_id"):
            line_item["variant_id"] = item["variant_id"]
            line_item["variant_name"] = item.get("variant_name")
        if item.get("pack_id"):
            line_item["pack_id"] = item["pack_id"]
            line_item["pack_label"] = item.get("pack_label")
            line_item["pack_units"] = item.get("pack_units")
        line_items.append(line_item)
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    origin = request.headers.get('origin', host_url)
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/cart"
    
    checkout_request = CheckoutSessionRequest(
        amount=total_amount,
        currency=base_currency.lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id, "user_id": user.user_id, "country": user_country}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    transaction = {
        "transaction_id": transaction_id,
        "session_id": session.session_id,
        "order_id": order_id,
        "user_id": user.user_id,
        "amount": total_amount,
        "currency": base_currency,
        "country": user_country,
        "status": "initiated",
        "payment_status": "pending",
        "metadata": {"order_id": order_id, "country": user_country},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    order = {
        "order_id": order_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_name": user.name,
        "country": user_country,
        "currency": base_currency,
        "subtotal": subtotal,
        "discount_info": discount_info,
        "discount_amount": round(discount_amount, 2),
        "total_amount": round(total_amount, 2),
        "status": "pending",
        "line_items": line_items,
        "shipping_address": input.shipping_address,
        "payment_session_id": session.session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    
    return {"url": session.url, "session_id": session.session_id}


@api_router.post("/checkout/buy-now")
async def buy_now_checkout(input: BuyNowInput, request: Request, user: User = Depends(get_current_user)):
    """
    Create direct checkout session for Buy Now (skip cart)
    """
    # Get user's country for pricing
    user_country = user.country or 'ES'
    
    # Fetch product with country-specific pricing
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check country availability
    available_countries = product.get("available_countries", [])
    if available_countries and user_country not in available_countries:
        raise HTTPException(status_code=400, detail=f"Product not available in {user_country}")
    
    # Get country-specific price and currency
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    
    base_price = country_prices.get(user_country, product.get("price", 0))
    base_currency = country_currency.get(user_country, "EUR")
    
    # Handle variant selection
    variant_price_modifier = 0
    variant_name = None
    if input.variant_id:
        variants = product.get("variants", [])
        variant = next((v for v in variants if v["variant_id"] == input.variant_id), None)
        if not variant:
            raise HTTPException(status_code=400, detail="Variant not found")
        variant_name = variant.get("name")
        variant_price_modifier = variant.get("price_modifier", 0)
    
    # Handle pack selection
    pack_price = None
    pack_label = None
    pack_units = None
    if input.pack_id:
        packs = product.get("packs", [])
        pack = next((p for p in packs if p["pack_id"] == input.pack_id), None)
        if not pack:
            raise HTTPException(status_code=400, detail="Pack not found")
        pack_price = pack.get("price")
        pack_label = pack.get("label")
        pack_units = pack.get("units")
    
    # Calculate final price
    if pack_price is not None:
        unit_price = pack_price
    else:
        unit_price = base_price + variant_price_modifier
    
    # Stock validation
    track_stock = product.get("track_stock", True)
    if track_stock:
        current_stock = product.get("stock", 0)
        if current_stock < input.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock. Only {current_stock} units available"
            )
    
    # Calculate total
    total_amount = unit_price * input.quantity
    
    # Generate order ID
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    
    # Create line item
    line_item = {
        "product_id": input.product_id,
        "product_name": product["name"],
        "producer_id": product.get("producer_id", ""),
        "quantity": input.quantity,
        "price": unit_price,
        "subtotal": total_amount
    }
    
    # Add variant/pack info
    if input.variant_id:
        line_item["variant_id"] = input.variant_id
        line_item["variant_name"] = variant_name
    if input.pack_id:
        line_item["pack_id"] = input.pack_id
        line_item["pack_label"] = pack_label
        line_item["pack_units"] = pack_units
    
    # Setup Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    origin = request.headers.get('origin', host_url)
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/products/{input.product_id}"
    
    # Create checkout session with buy_now flag
    checkout_request = CheckoutSessionRequest(
        amount=total_amount,
        currency=base_currency.lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": order_id,
            "user_id": user.user_id,
            "country": user_country,
            "buy_now": "true"
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store transaction
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    transaction = {
        "transaction_id": transaction_id,
        "session_id": session.session_id,
        "order_id": order_id,
        "user_id": user.user_id,
        "amount": total_amount,
        "currency": base_currency,
        "country": user_country,
        "status": "initiated",
        "payment_status": "pending",
        "metadata": {
            "order_id": order_id,
            "country": user_country,
            "buy_now": True
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    # Store pending order (not in orders yet, will be created after payment)
    pending_order = {
        "order_id": order_id,
        "user_id": user.user_id,
        "session_id": session.session_id,
        "line_items": [line_item],
        "subtotal": total_amount,
        "total_amount": total_amount,
        "currency": base_currency,
        "country": user_country,
        "discount_info": None,
        "status": "pending_payment",
        "buy_now": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pending_orders.insert_one(pending_order)
    
    logger.info(f"[BUY_NOW] Created checkout session for user {user.user_id}, order {order_id}")
    
    return {
        "checkout_url": session.checkout_url,
        "session_id": session.session_id,
        "order_id": order_id
    }

@api_router.get("/payments/checkout-status/{session_id}")
async def checkout_status(session_id: str, user: User = Depends(get_current_user)):
    webhook_url = "https://placeholder.com/webhook"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["status"] == "paid":
        return {"message": "Payment already processed", "status": "paid"}
    
    if status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "paid", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        await db.orders.update_one(
            {"payment_session_id": session_id},
            {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        order = await db.orders.find_one({"payment_session_id": session_id}, {"_id": 0})
        
        # === ATOMIC STOCK DECREMENT ===
        for item in order["line_items"]:
            product = await db.products.find_one(
                {"product_id": item["product_id"]},
                {"_id": 0, "track_stock": 1, "variants": 1}
            )
            if product and product.get("track_stock", True):
                variant_id = item.get("variant_id")
                pack_id = item.get("pack_id")
                
                if variant_id and pack_id and product.get("variants"):
                    # Decrement pack stock within variants array
                    await db.products.update_one(
                        {
                            "product_id": item["product_id"],
                            "variants.variant_id": variant_id,
                            "variants.packs.pack_id": pack_id,
                            "variants.packs.stock": {"$gte": item["quantity"]}
                        },
                        {"$inc": {"variants.$[v].packs.$[p].stock": -item["quantity"]}},
                        array_filters=[
                            {"v.variant_id": variant_id},
                            {"p.pack_id": pack_id}
                        ]
                    )
                else:
                    # Decrement product-level stock (no variants)
                    await db.products.update_one(
                        {"product_id": item["product_id"], "stock": {"$gte": item["quantity"]}},
                        {"$inc": {"stock": -item["quantity"]}}
                    )
        
        # === INCREMENT DISCOUNT USAGE ===
        if order.get("discount_info"):
            discount_code = order["discount_info"].get("code")
            if discount_code:
                await db.discount_codes.update_one(
                    {"code": discount_code},
                    {"$inc": {"usage_count": 1}}
                )
        
        # Clear cart items
        await db.cart_items.delete_many({"user_id": user.user_id})
        
        # Clear applied discount
        await db.cart_discounts.delete_one({"user_id": user.user_id})
        
        producers = set(item["producer_id"] for item in order["line_items"])
        
        for producer_id in producers:
            producer_items = [item for item in order["line_items"] if item["producer_id"] == producer_id]
            notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "producer_id": producer_id,
                "order_id": order["order_id"],
                "type": "order_received",
                "content": {
                    "order_number": order["order_id"],
                    "items": producer_items,
                    "customer_name": order["user_name"],
                    "customer_email": order["user_email"],
                    "shipping_address": order["shipping_address"]
                },
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
    
    return {"status": status.status, "payment_status": status.payment_status, "amount_total": status.amount_total, "currency": status.currency}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    webhook_url = "https://placeholder.com/webhook"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Webhook event: {webhook_response.event_type}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Orders
@api_router.get("/orders")
async def get_orders(user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if user.role == "producer":
        orders = await db.orders.find({"line_items.producer_id": user.user_id}, {"_id": 0}).to_list(100)
        return orders
    elif user.role == "admin":
        orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
        return orders
    else:
        orders = await db.orders.find(query, {"_id": 0}).to_list(100)
        return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == "customer" and order["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, user: User = Depends(get_current_user)):
    await require_role(user, ["admin", "producer"])
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Order status updated"}

# ============================================
# AI PROFILE - Memory & Personalization
# ============================================

@api_router.get("/ai/profile")
async def get_ai_profile(user: User = Depends(get_current_user)):
    """Get the user's AI profile for personalization"""
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile:
        # Create default profile
        profile = {
            "user_id": user.user_id,
            "language": "auto",
            "tone": "friendly",
            "diet": [],
            "allergies": [],
            "goals": [],
            "restrictions": [],
            "budget": "medium",
            "preferred_categories": [],
            "first_visit_completed": False,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_profiles.insert_one(profile)
        profile.pop("_id", None)
    
    return profile

@api_router.put("/ai/profile")
async def update_ai_profile(update: AIProfileUpdate, user: User = Depends(get_current_user)):
    """Update the user's AI profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    return profile

@api_router.post("/ai/profile/reset")
async def reset_ai_profile(user: User = Depends(get_current_user)):
    """Reset the user's AI profile to defaults"""
    default_profile = {
        "user_id": user.user_id,
        "language": "auto",
        "tone": "friendly",
        "diet": [],
        "allergies": [],
        "goals": [],
        "restrictions": [],
        "budget": "medium",
        "preferred_categories": [],
        "first_visit_completed": False,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ai_profiles.replace_one(
        {"user_id": user.user_id},
        default_profile,
        upsert=True
    )
    
    return {"message": "AI profile reset successfully", "profile": default_profile}

@api_router.post("/ai/profile/mark-first-visit")
async def mark_first_visit_completed(user: User = Depends(get_current_user)):
    """Mark that the user has completed their first AI interaction"""
    await db.ai_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": {"first_visit_completed": True, "last_updated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "First visit marked as completed"}

# Chat - Shopping AI Assistant
@api_router.post("/chat/message")
async def send_chat_message(input: ChatMessageInput, user: User = Depends(get_current_user)):
    import re
    
    session_id = input.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    # Get user's selected country for filtering
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    user_country = user_doc.get("locale", {}).get("country", "ES") if user_doc else "ES"
    
    # Fetch AI Profile for personalization
    ai_profile = await db.ai_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not ai_profile:
        ai_profile = {"language": "auto", "tone": "friendly", "diet": [], "allergies": [], "goals": [], "restrictions": [], "budget": "medium"}
    
    # Fetch product catalog FILTERED BY COUNTRY
    # Only include products available in the user's selected country
    country_filter = {
        "approved": True,
        "$or": [
            {"available_countries": user_country},
            {"available_countries": None},
            {"available_countries": {"$exists": False}}
        ]
    }
    
    products = await db.products.find(
        country_filter, 
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "category_id": 1, 
         "certifications": 1, "allergens": 1, "country_origin": 1, "images": 1,
         "country_prices": 1, "country_currency": 1}
    ).limit(50).to_list(50)
    
    # Build product catalog for AI prompt (with country-specific pricing)
    product_catalog = "\n\n=== PRODUCT CATALOG (Use ONLY these products) ===\n"
    for p in products:
        # Use country-specific price if available
        price = p.get("price", 0)
        currency = "EUR"
        country_prices = p.get("country_prices", {})
        country_currency = p.get("country_currency", {})
        
        if user_country in country_prices:
            price = country_prices[user_country]
            currency = country_currency.get(user_country, "EUR")
        
        certs = ", ".join(p.get("certifications", [])) or "None"
        allergens = ", ".join(p.get("allergens", [])) or "None"
        product_catalog += f"""
[PRODUCT_ID: {p['product_id']}]
Name: {p['name']}
Price: {currency} {price:.2f}
Certifications: {certs}
Allergens: {allergens}
Origin: {p.get('country_origin', 'Unknown')}
"""
    
    # Build personalization context from AI Profile
    tone_instructions = {
        "short_direct": "Keep responses very brief and to the point. Use short sentences. No elaboration.",
        "friendly": "Be warm and conversational. Use a natural, approachable tone.",
        "explanatory": "Provide detailed explanations. Include context and reasoning."
    }
    tone_style = tone_instructions.get(ai_profile.get("tone", "friendly"), tone_instructions["friendly"])
    
    personalization_context = ""
    if ai_profile.get("diet"):
        personalization_context += f"\nUser dietary preferences: {', '.join(ai_profile['diet'])}"
    if ai_profile.get("allergies"):
        personalization_context += f"\nUser allergies (MUST AVOID): {', '.join(ai_profile['allergies'])}"
    if ai_profile.get("goals"):
        personalization_context += f"\nUser goals: {', '.join(ai_profile['goals'])}"
    if ai_profile.get("restrictions"):
        personalization_context += f"\nUser restrictions: {', '.join(ai_profile['restrictions'])}"
    if ai_profile.get("budget"):
        budget_map = {"low": "budget-conscious, prefer affordable options", "medium": "balanced value and quality", "high": "premium quality, price is not a concern"}
        personalization_context += f"\nUser budget: {budget_map.get(ai_profile['budget'], 'balanced')}"
    
    system_msg = f"""You are Hispalo AI, a personal shopping assistant for Hispaloshop food marketplace.

YOUR ROLE:
- Help users discover and buy food products based on their dietary needs
- Act as a nutrition guide (non-medical), chef assistant, and shopping advisor
- Recommend products from our catalog that match user preferences

COMMUNICATION STYLE:
{tone_style}

FORMATTING RULES (CRITICAL):
- NO asterisks (*) in your response
- NO hashtags (#) in your response
- NO markdown formatting (no bold, italic, headers)
- Write in plain, clean text like a natural conversation
- Use line breaks for readability when needed
- Keep responses conversational and human-like

RECOMMENDATION FORMAT:
When recommending products, include this tag in your response:
[RECOMMEND: product_id_1, product_id_2, product_id_3]

Example: "Based on your preferences, I recommend these gluten-free options: [RECOMMEND: prod_abc123, prod_def456]"

CRITICAL RULES:
1. ONLY recommend products from the catalog below - never invent products
2. Maximum 4-6 products per recommendation
3. Prioritize: dietary compatibility > certifications > price relevance
4. If no products match, say so clearly and suggest alternatives from the catalog
5. If user is just chatting (greeting, general question), respond naturally WITHOUT forcing products
6. NO medical advice, NO legal advice, NO invented data
7. ALWAYS respect user allergies - never recommend products with their allergens

FALLBACK BEHAVIORS:
- No exact match: Suggest closest alternatives within same dietary constraint
- No relevant products: "I don't have [X] in our catalog, but here are similar options..."
- Off-topic request: "I specialize in food products. Would you like to explore our snacks, oils, or preserves?"

{personalization_context}
{product_catalog}"""
    
    # Send message to AI
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_msg)
    chat.with_model("openai", "gpt-5.2")
    user_message = UserMessage(text=input.message)
    response = await chat.send_message(user_message)
    
    # Clean up any markdown formatting that slipped through
    response = response.replace('**', '').replace('##', '').replace('# ', '')
    
    # Parse [RECOMMEND: ...] tags from response
    recommended_product_ids = []
    recommend_pattern = r'\[RECOMMEND:\s*([^\]]+)\]'
    matches = re.findall(recommend_pattern, response)
    
    for match in matches:
        ids = [id.strip() for id in match.split(',')]
        recommended_product_ids.extend(ids)
    
    # Remove duplicate IDs and limit to 6
    recommended_product_ids = list(dict.fromkeys(recommended_product_ids))[:6]
    
    # Fetch full product details for recommendations
    recommended_products = []
    if recommended_product_ids:
        for pid in recommended_product_ids:
            product = await db.products.find_one(
                {"product_id": pid, "approved": True},
                {"_id": 0}
            )
            if product:
                recommended_products.append(product)
    
    # Clean response text (remove [RECOMMEND: ...] tags for display)
    clean_response = re.sub(recommend_pattern, '', response).strip()
    
    # Save messages to DB
    user_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "session_id": session_id,
        "role": "user",
        "content": input.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    assistant_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "session_id": session_id,
        "role": "assistant",
        "content": clean_response,
        "recommended_products": [p["product_id"] for p in recommended_products],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_many([user_msg, assistant_msg])
    
    return {
        "response": clean_response,
        "session_id": session_id,
        "recommended_products": recommended_products
    }

@api_router.get("/chat/history")
async def get_chat_history(session_id: str, user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find({"user_id": user.user_id, "session_id": session_id}, {"_id": 0}).to_list(1000)
    return messages

# Preferences
@api_router.post("/preferences")
async def update_preferences(input: PreferencesInput, user: User = Depends(get_current_user)):
    prefs = {
        "user_id": user.user_id,
        "diet_preferences": input.diet_preferences,
        "allergens": input.allergens,
        "goals": input.goals,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_preferences.update_one({"user_id": user.user_id}, {"$set": prefs}, upsert=True)
    return {"message": "Preferences updated"}

@api_router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    if not prefs:
        return {"user_id": user.user_id, "diet_preferences": [], "allergens": [], "goals": None}
    return prefs

# Notifications
@api_router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user)):
    await require_role(user, ["producer"])
    notifications = await db.notifications.find({"producer_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    await db.notifications.update_one({"notification_id": notification_id, "producer_id": user.user_id}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

# ============================================
# ADMIN DASHBOARD ENDPOINTS
# ============================================

# Admin - Producer Management
@api_router.get("/admin/producers")
async def get_all_producers(user: User = Depends(get_current_user)):
    """Get all producers with all statuses"""
    await require_role(user, ["admin"])
    producers = await db.users.find({"role": "producer"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return producers

@api_router.get("/admin/producers/pending")
async def get_pending_producers(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    producers = await db.users.find({"role": "producer", "approved": False, "status": {"$ne": "rejected"}}, {"_id": 0, "password_hash": 0}).to_list(100)
    return producers

@api_router.get("/admin/producers/{producer_id}")
async def get_producer_detail(producer_id: str, user: User = Depends(get_current_user)):
    """Get single producer details"""
    await require_role(user, ["admin"])
    producer = await db.users.find_one({"user_id": producer_id, "role": "producer"}, {"_id": 0, "password_hash": 0})
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")
    return producer

@api_router.put("/admin/producers/{producer_id}/status")
async def update_producer_status(producer_id: str, status: str, user: User = Depends(get_current_user)):
    """Update producer status: pending, approved, rejected, paused"""
    await require_role(user, ["admin"])
    if status not in ["pending", "approved", "rejected", "paused"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status, "approved": status == "approved"}
    await db.users.update_one({"user_id": producer_id, "role": "producer"}, {"$set": update_data})
    return {"message": f"Producer status updated to {status}"}

@api_router.put("/admin/producers/{producer_id}")
async def update_producer(producer_id: str, data: dict, user: User = Depends(get_current_user)):
    """Edit producer data"""
    await require_role(user, ["admin"])
    # Only allow certain fields to be updated
    allowed_fields = ["name", "company_name", "phone", "whatsapp", "contact_person", "fiscal_address", "vat_cif", "country"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if update_data:
        await db.users.update_one({"user_id": producer_id, "role": "producer"}, {"$set": update_data})
    return {"message": "Producer updated"}

# Admin - Product Management (enhanced)
@api_router.get("/admin/products")
async def get_all_products_admin(user: User = Depends(get_current_user)):
    """Get all products for admin (including unapproved)"""
    await require_role(user, ["admin"])
    products = await db.products.find({}, {"_id": 0}).to_list(500)
    return products

@api_router.get("/admin/products/pending")
async def get_pending_products(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    products = await db.products.find({"approved": False}, {"_id": 0}).to_list(100)
    return products

@api_router.put("/admin/products/{product_id}/approve")
async def approve_product(product_id: str, approved: bool, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.products.update_one({"product_id": product_id}, {"$set": {"approved": approved}})
    return {"message": "Product approval updated"}

@api_router.put("/admin/products/{product_id}/price")
async def update_product_price(product_id: str, price: float, user: User = Depends(get_current_user)):
    """Admin can edit product prices"""
    await require_role(user, ["admin"])
    await db.products.update_one({"product_id": product_id}, {"$set": {"price": price}})
    return {"message": "Product price updated"}

# Admin - Certificate Management (enhanced)
@api_router.get("/admin/certificates")
async def get_all_certificates_admin(user: User = Depends(get_current_user)):
    """Get all certificates for admin"""
    await require_role(user, ["admin"])
    certificates = await db.certificates.find({}, {"_id": 0}).to_list(500)
    return certificates

@api_router.get("/admin/certificates/pending")
async def get_pending_certificates(user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    certificates = await db.certificates.find({"approved": False}, {"_id": 0}).to_list(100)
    return certificates

@api_router.put("/admin/certificates/{certificate_id}/approve")
async def approve_certificate(certificate_id: str, approved: bool, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": {"approved": approved}})
    # Log the change
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "approved" if approved else "rejected",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate approval updated"}

@api_router.put("/admin/certificates/{certificate_id}")
async def update_certificate_admin(certificate_id: str, data: Dict[str, Any], user: User = Depends(get_current_user)):
    """Admin can edit certificate data"""
    await require_role(user, ["admin"])
    await db.certificates.update_one({"certificate_id": certificate_id}, {"$set": {"data": data}})
    # Log the change
    await db.certificate_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "action": "edited",
        "admin_id": user.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Certificate updated"}

@api_router.get("/admin/certificates/{certificate_id}/history")
async def get_certificate_history(certificate_id: str, user: User = Depends(get_current_user)):
    """Get certificate change history"""
    await require_role(user, ["admin"])
    logs = await db.certificate_logs.find({"certificate_id": certificate_id}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return logs

# Admin - Orders & Payments (view-only)
@api_router.get("/admin/orders")
async def get_all_orders_admin(user: User = Depends(get_current_user)):
    """Get all orders for admin view"""
    await require_role(user, ["admin"])
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.get("/admin/payments")
async def get_all_payments_admin(user: User = Depends(get_current_user)):
    """Get all payments with commission breakdown"""
    await require_role(user, ["admin"])
    payments = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Calculate totals
    total_amount = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    platform_commission = total_amount * PLATFORM_COMMISSION
    producer_share = total_amount * (1 - PLATFORM_COMMISSION)
    return {
        "payments": payments,
        "summary": {
            "total_amount": total_amount,
            "platform_commission": platform_commission,
            "producer_share": producer_share,
            "commission_rate": PLATFORM_COMMISSION
        }
    }

@api_router.get("/admin/payments/by-producer/{producer_id}")
async def get_payments_by_producer(producer_id: str, user: User = Depends(get_current_user)):
    """Get payments for a specific producer"""
    await require_role(user, ["admin"])
    # Get orders containing this producer's products
    orders = await db.orders.find({}, {"_id": 0}).to_list(500)
    producer_orders = []
    for order in orders:
        producer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == producer_id]
        if producer_items:
            producer_orders.append({
                "order_id": order["order_id"],
                "items": producer_items,
                "total": sum(item.get("amount", 0) for item in producer_items),
                "status": order["status"],
                "created_at": order["created_at"]
            })
    return producer_orders

# Admin - Dashboard Stats
@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    await require_role(user, ["admin"])
    
    pending_producers = await db.users.count_documents({"role": "producer", "approved": False, "status": {"$ne": "rejected"}})
    total_producers = await db.users.count_documents({"role": "producer"})
    pending_products = await db.products.count_documents({"approved": False})
    total_products = await db.products.count_documents({})
    pending_certificates = await db.certificates.count_documents({"approved": False})
    total_orders = await db.orders.count_documents({})
    
    return {
        "pending_producers": pending_producers,
        "total_producers": total_producers,
        "pending_products": pending_products,
        "total_products": total_products,
        "pending_certificates": pending_certificates,
        "total_orders": total_orders
    }

# ============================================
# PRODUCER DASHBOARD ENDPOINTS
# ============================================

@api_router.get("/producer/products")
async def get_producer_products(user: User = Depends(get_current_user)):
    """Get products for logged-in producer"""
    await require_role(user, ["producer"])
    products = await db.products.find({"producer_id": user.user_id}, {"_id": 0}).to_list(100)
    return products

@api_router.get("/producer/certificates")
async def get_producer_certificates(user: User = Depends(get_current_user)):
    """Get certificates for producer's products"""
    await require_role(user, ["producer"])
    products = await db.products.find({"producer_id": user.user_id}, {"product_id": 1}).to_list(100)
    product_ids = [p["product_id"] for p in products]
    certificates = await db.certificates.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(100)
    return certificates

@api_router.get("/producer/orders")
async def get_producer_orders(user: User = Depends(get_current_user)):
    """Get orders containing producer's products"""
    await require_role(user, ["producer"])
    orders = await db.orders.find({}, {"_id": 0}).to_list(500)
    producer_orders = []
    for order in orders:
        producer_items = [item for item in order.get("line_items", []) if item.get("producer_id") == user.user_id]
        if producer_items:
            producer_orders.append({
                "order_id": order["order_id"],
                "customer_name": order.get("user_name", "Unknown"),
                "shipping_address": order.get("shipping_address", {}),
                "items": producer_items,
                "total": sum(item.get("amount", 0) for item in producer_items),
                "status": order["status"],
                "created_at": order["created_at"]
            })
    return producer_orders

@api_router.get("/producer/payments")
async def get_producer_payments(user: User = Depends(get_current_user)):
    """Get payment summary for producer"""
    await require_role(user, ["producer"])
    orders = await db.orders.find({"status": "completed"}, {"_id": 0}).to_list(500)
    
    total_sold = 0
    for order in orders:
        for item in order.get("line_items", []):
            if item.get("producer_id") == user.user_id:
                total_sold += item.get("amount", 0)
    
    producer_share = total_sold * (1 - PLATFORM_COMMISSION)
    
    return {
        "total_sold": total_sold,
        "producer_share": producer_share,
        "platform_commission": total_sold * PLATFORM_COMMISSION,
        "commission_rate": PLATFORM_COMMISSION
    }

@api_router.get("/producer/stats")
async def get_producer_stats(user: User = Depends(get_current_user)):
    """Get producer dashboard statistics"""
    await require_role(user, ["producer"])
    
    total_products = await db.products.count_documents({"producer_id": user.user_id})
    approved_products = await db.products.count_documents({"producer_id": user.user_id, "approved": True})
    pending_products = await db.products.count_documents({"producer_id": user.user_id, "approved": False})
    
    # Count orders with producer's products
    orders = await db.orders.find({}, {"line_items": 1}).to_list(500)
    order_count = sum(1 for o in orders if any(item.get("producer_id") == user.user_id for item in o.get("line_items", [])))
    
    return {
        "total_products": total_products,
        "approved_products": approved_products,
        "pending_products": pending_products,
        "total_orders": order_count,
        "account_status": "approved" if user.approved else "pending"
    }

# ============================================
# STRIPE CONNECT FOR PRODUCERS
# ============================================

# Initialize Stripe with real secret key for Connect features
stripe.api_key = STRIPE_SECRET_KEY

@api_router.post("/producer/stripe/create-account")
async def create_stripe_connect_account(request: Request, user: User = Depends(get_current_user)):
    """Create a Stripe Connect Express account for the producer"""
    await require_role(user, ["producer"])
    
    # Country name to ISO 3166-1 alpha-2 code mapping
    COUNTRY_TO_ISO = {
        "spain": "ES", "españa": "ES",
        "united states": "US", "usa": "US", "us": "US",
        "united kingdom": "GB", "uk": "GB", "great britain": "GB",
        "france": "FR", "francia": "FR",
        "germany": "DE", "alemania": "DE", "deutschland": "DE",
        "italy": "IT", "italia": "IT",
        "portugal": "PT",
        "netherlands": "NL", "holland": "NL",
        "belgium": "BE", "bélgica": "BE",
        "austria": "AT",
        "switzerland": "CH", "suiza": "CH",
        "ireland": "IE", "irlanda": "IE",
        "greece": "GR", "grecia": "GR",
        "poland": "PL", "polonia": "PL",
        "sweden": "SE", "suecia": "SE",
        "denmark": "DK", "dinamarca": "DK",
        "finland": "FI", "finlandia": "FI",
        "norway": "NO", "noruega": "NO",
        "canada": "CA", "canadá": "CA",
        "australia": "AU",
        "new zealand": "NZ", "nueva zelanda": "NZ",
        "mexico": "MX", "méxico": "MX",
        "brazil": "BR", "brasil": "BR",
        "argentina": "AR",
        "japan": "JP", "japón": "JP",
        "china": "CN",
        "india": "IN",
        "singapore": "SG", "singapur": "SG",
    }
    
    def get_country_code(country_input):
        """Convert country name or code to ISO 3166-1 alpha-2"""
        if not country_input:
            return "US"  # Default
        
        country_input = country_input.strip()
        
        # If already a 2-letter code, return uppercase
        if len(country_input) == 2 and country_input.isalpha():
            return country_input.upper()
        
        # Look up in mapping
        country_lower = country_input.lower()
        if country_lower in COUNTRY_TO_ISO:
            return COUNTRY_TO_ISO[country_lower]
        
        # Default to US if unknown
        logger.warning(f"Unknown country '{country_input}', defaulting to US")
        return "US"
    
    # Check if producer already has a Stripe account
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if user_doc.get("stripe_account_id"):
        # Account already exists, create a new onboarding link
        try:
            origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
            account_link = stripe.AccountLink.create(
                account=user_doc["stripe_account_id"],
                refresh_url=f"{origin}/producer?stripe_refresh=true",
                return_url=f"{origin}/producer?stripe_return=true",
                type="account_onboarding",
            )
            return {"url": account_link.url, "account_id": user_doc["stripe_account_id"]}
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account link: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    try:
        # Create a new Stripe Connect Express account
        country_code = get_country_code(user.country)
        logger.info(f"Creating Stripe account for {user.email} with country code: {country_code}")
        
        account = stripe.Account.create(
            type="express",
            country=country_code,
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={
                "producer_id": user.user_id,
                "platform": "hispaloshop"
            }
        )
        
        # Store the account ID in the database
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "stripe_account_id": account.id,
                "stripe_connect_status": "pending",
                "stripe_connect_created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create an account link for onboarding
        origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{origin}/producer?stripe_refresh=true",
            return_url=f"{origin}/producer?stripe_return=true",
            type="account_onboarding",
        )
        
        logger.info(f"Created Stripe Connect account {account.id} for producer {user.user_id}")
        return {"url": account_link.url, "account_id": account.id}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@api_router.get("/producer/stripe/status")
async def get_stripe_connect_status(user: User = Depends(get_current_user)):
    """Get the Stripe Connect status for the producer"""
    await require_role(user, ["producer"])
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    stripe_account_id = user_doc.get("stripe_account_id")
    
    if not stripe_account_id:
        return {
            "connected": False,
            "status": "not_connected",
            "stripe_account_id": None,
            "payouts_enabled": False,
            "charges_enabled": False
        }
    
    try:
        # Fetch the account status from Stripe
        account = stripe.Account.retrieve(stripe_account_id)
        
        # Determine connection status
        is_connected = account.charges_enabled and account.payouts_enabled
        status = "connected" if is_connected else "pending"
        
        # Update the status in our database
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "stripe_connect_status": status,
                "stripe_payouts_enabled": account.payouts_enabled,
                "stripe_charges_enabled": account.charges_enabled
            }}
        )
        
        return {
            "connected": is_connected,
            "status": status,
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": account.payouts_enabled,
            "charges_enabled": account.charges_enabled,
            "details_submitted": account.details_submitted
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error fetching account: {str(e)}")
        return {
            "connected": False,
            "status": "error",
            "stripe_account_id": stripe_account_id,
            "error": str(e)
        }

@api_router.post("/producer/stripe/create-login-link")
async def create_stripe_login_link(user: User = Depends(get_current_user)):
    """Create a login link to the Stripe Express dashboard"""
    await require_role(user, ["producer"])
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    stripe_account_id = user_doc.get("stripe_account_id")
    
    if not stripe_account_id:
        raise HTTPException(status_code=400, detail="No Stripe account connected")
    
    try:
        login_link = stripe.Account.create_login_link(stripe_account_id)
        return {"url": login_link.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating login link: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

# ============================================
# IMAGE UPLOAD FOR PRODUCTS
# ============================================
from fastapi import File, UploadFile
from fastapi.responses import FileResponse
import shutil

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@api_router.post("/upload/product-image")
async def upload_product_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a product image. Returns the URL of the uploaded image."""
    await require_role(user, ["producer", "admin"])
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_id = str(uuid.uuid4())[:12]
    filename = f"{user.user_id}_{unique_id}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    # Return the URL
    image_url = f"/api/uploads/products/{filename}"
    
    logger.info(f"Image uploaded by {user.user_id}: {filename}")
    return {"url": image_url, "filename": filename}

@api_router.get("/uploads/products/{filename}")
async def get_product_image(filename: str):
    """Serve uploaded product images"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

# ============================================
# CUSTOMER DASHBOARD ENDPOINTS
# ============================================

@api_router.get("/customer/orders")
async def get_customer_orders(user: User = Depends(get_current_user)):
    """Get orders for logged-in customer"""
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/customer/orders/{order_id}")
async def get_customer_order_detail(order_id: str, user: User = Depends(get_current_user)):
    """Get single order details"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.put("/customer/orders/{order_id}/cancel")
async def cancel_customer_order(order_id: str, user: User = Depends(get_current_user)):
    """Cancel an order (if status allows)"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Order cancelled"}

@api_router.get("/customer/profile")
async def get_customer_profile(user: User = Depends(get_current_user)):
    """Get customer profile with preferences"""
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "country": user.country,
        "preferences": prefs
    }

@api_router.put("/customer/profile")
async def update_customer_profile(data: dict, user: User = Depends(get_current_user)):
    """Update customer profile"""
    allowed_fields = ["name", "country"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    return {"message": "Profile updated"}

@api_router.put("/customer/password")
async def change_customer_password(current_password: str, new_password: str, user: User = Depends(get_current_user)):
    """Change customer password"""
    user_doc = await db.users.find_one({"user_id": user.user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("password_hash") != hash_password(current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"message": "Password changed"}

@api_router.get("/customer/stats")
async def get_customer_stats(user: User = Depends(get_current_user)):
    """Get customer dashboard statistics"""
    total_orders = await db.orders.count_documents({"user_id": user.user_id})
    pending_orders = await db.orders.count_documents({"user_id": user.user_id, "status": {"$in": ["pending", "processing"]}})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders
    }

# ============================================
# DISCOUNT CODE MANAGEMENT (ADMIN)
# ============================================

@api_router.get("/admin/discount-codes")
async def get_all_discount_codes(user: User = Depends(get_current_user)):
    """Get all discount codes (admin only)"""
    await require_role(user, ["admin"])
    codes = await db.discount_codes.find({}, {"_id": 0}).to_list(500)
    return codes

@api_router.get("/admin/discount-codes/{code_id}")
async def get_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Get single discount code details"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return code

@api_router.post("/admin/discount-codes")
async def create_discount_code(input: DiscountCodeCreate, user: User = Depends(get_current_user)):
    """Create a new discount code (admin only)"""
    await require_role(user, ["admin"])
    
    # Validate code uniqueness
    existing = await db.discount_codes.find_one({"code": input.code.upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    
    # Validate discount type and value
    if input.type not in ["percentage", "fixed", "free_shipping"]:
        raise HTTPException(status_code=400, detail="Invalid discount type. Must be 'percentage', 'fixed', or 'free_shipping'")
    
    if input.type == "percentage" and (input.value < 0 or input.value > 100):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    
    if input.type == "fixed" and input.value < 0:
        raise HTTPException(status_code=400, detail="Fixed discount value must be positive")
    
    code_id = f"disc_{uuid.uuid4().hex[:12]}"
    discount_code = {
        "code_id": code_id,
        "code": input.code.upper(),
        "type": input.type,
        "value": input.value,
        "active": input.active,
        "start_date": input.start_date,
        "end_date": input.end_date,
        "usage_limit": input.usage_limit,
        "usage_count": 0,
        "min_cart_amount": input.min_cart_amount,
        "applicable_products": input.applicable_products,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discount_codes.insert_one(discount_code)
    discount_code.pop("_id", None)
    return discount_code

@api_router.put("/admin/discount-codes/{code_id}")
async def update_discount_code(code_id: str, input: DiscountCodeCreate, user: User = Depends(get_current_user)):
    """Update a discount code (admin only)"""
    await require_role(user, ["admin"])
    
    existing = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    # Check for code collision if changing code
    if input.code.upper() != existing["code"]:
        collision = await db.discount_codes.find_one({"code": input.code.upper(), "code_id": {"$ne": code_id}}, {"_id": 0})
        if collision:
            raise HTTPException(status_code=400, detail="Discount code already exists")
    
    update_data = {
        "code": input.code.upper(),
        "type": input.type,
        "value": input.value,
        "active": input.active,
        "start_date": input.start_date,
        "end_date": input.end_date,
        "usage_limit": input.usage_limit,
        "min_cart_amount": input.min_cart_amount,
        "applicable_products": input.applicable_products
    }
    await db.discount_codes.update_one({"code_id": code_id}, {"$set": update_data})
    return {"message": "Discount code updated"}

@api_router.delete("/admin/discount-codes/{code_id}")
async def delete_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Delete a discount code (admin only)"""
    await require_role(user, ["admin"])
    result = await db.discount_codes.delete_one({"code_id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return {"message": "Discount code deleted"}

@api_router.put("/admin/discount-codes/{code_id}/toggle")
async def toggle_discount_code(code_id: str, user: User = Depends(get_current_user)):
    """Toggle discount code active status"""
    await require_role(user, ["admin"])
    code = await db.discount_codes.find_one({"code_id": code_id}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    new_status = not code.get("active", True)
    await db.discount_codes.update_one({"code_id": code_id}, {"$set": {"active": new_status}})
    return {"message": f"Discount code {'activated' if new_status else 'deactivated'}", "active": new_status}

# ============================================
# DISCOUNT CODE APPLICATION (CART)
# ============================================

@api_router.post("/cart/apply-discount")
async def apply_discount_code(code: str, user: User = Depends(get_current_user)):
    """Apply a discount code to the cart"""
    code = code.strip().upper()
    
    # Find the discount code
    discount = await db.discount_codes.find_one({"code": code}, {"_id": 0})
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    
    # Check if active
    if not discount.get("active", True):
        raise HTTPException(status_code=400, detail="This discount code is no longer active")
    
    # Check date validity
    now = datetime.now(timezone.utc).isoformat()
    if discount.get("start_date") and now < discount["start_date"]:
        raise HTTPException(status_code=400, detail="This discount code is not yet valid")
    if discount.get("end_date") and now > discount["end_date"]:
        raise HTTPException(status_code=400, detail="This discount code has expired")
    
    # Check usage limit
    if discount.get("usage_limit") is not None and discount.get("usage_count", 0) >= discount["usage_limit"]:
        raise HTTPException(status_code=400, detail="This discount code has reached its usage limit")
    
    # Get cart items to validate minimum amount and applicable products
    cart_items = await db.cart_items.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    cart_total = sum(item["price"] * item["quantity"] for item in cart_items)
    
    # Check minimum cart amount
    if discount.get("min_cart_amount") and cart_total < discount["min_cart_amount"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum order amount of ${discount['min_cart_amount']:.2f} required for this code"
        )
    
    # Check applicable products
    applicable_products = discount.get("applicable_products", [])
    if applicable_products:
        cart_product_ids = [item["product_id"] for item in cart_items]
        matching_products = [pid for pid in cart_product_ids if pid in applicable_products]
        if not matching_products:
            raise HTTPException(status_code=400, detail="This discount code doesn't apply to any items in your cart")
    
    # Calculate discount amount
    discount_amount = 0
    if discount["type"] == "percentage":
        # Apply percentage to applicable items only
        if applicable_products:
            applicable_total = sum(
                item["price"] * item["quantity"] 
                for item in cart_items 
                if item["product_id"] in applicable_products
            )
            discount_amount = applicable_total * (discount["value"] / 100)
        else:
            discount_amount = cart_total * (discount["value"] / 100)
    elif discount["type"] == "fixed":
        discount_amount = min(discount["value"], cart_total)  # Don't exceed cart total
    # free_shipping has no direct cart discount - applied at checkout
    
    # Store applied discount in cart_discounts collection (one per user)
    applied_discount = {
        "user_id": user.user_id,
        "code_id": discount["code_id"],
        "code": discount["code"],
        "type": discount["type"],
        "value": discount["value"],
        "discount_amount": round(discount_amount, 2),
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cart_discounts.update_one(
        {"user_id": user.user_id},
        {"$set": applied_discount},
        upsert=True
    )
    
    return {
        "message": "Discount code applied",
        "discount": applied_discount,
        "cart_total": cart_total,
        "new_total": round(cart_total - discount_amount, 2)
    }

# NOTE: remove-discount route moved to before /cart/{product_id} to avoid route conflict

# ============================================
# STOCK MANAGEMENT (PRODUCER & ADMIN)
# ============================================

class StockUpdateInput(BaseModel):
    stock: int
    low_stock_threshold: Optional[int] = None
    track_stock: Optional[bool] = None

@api_router.put("/producer/products/{product_id}/stock")
async def update_product_stock_producer(product_id: str, input: StockUpdateInput, user: User = Depends(get_current_user)):
    """Producer updates stock for their product"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product's stock")
    
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    update_data = {"stock": input.stock}
    if input.low_stock_threshold is not None:
        update_data["low_stock_threshold"] = input.low_stock_threshold
    if input.track_stock is not None:
        update_data["track_stock"] = input.track_stock
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return {"message": "Stock updated", "stock": input.stock}

@api_router.put("/admin/products/{product_id}/stock")
async def update_product_stock_admin(product_id: str, input: StockUpdateInput, user: User = Depends(get_current_user)):
    """Admin updates stock for any product"""
    await require_role(user, ["admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    update_data = {"stock": input.stock}
    if input.low_stock_threshold is not None:
        update_data["low_stock_threshold"] = input.low_stock_threshold
    if input.track_stock is not None:
        update_data["track_stock"] = input.track_stock
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return {"message": "Stock updated", "stock": input.stock}

@api_router.get("/admin/products/low-stock")
async def get_low_stock_products(user: User = Depends(get_current_user)):
    """Get products with low stock (admin)"""
    await require_role(user, ["admin"])
    
    # Find products where stock <= low_stock_threshold and track_stock is true
    products = await db.products.find(
        {
            "track_stock": True,
            "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
        },
        {"_id": 0}
    ).to_list(500)
    return products

@api_router.get("/producer/products/low-stock")
async def get_low_stock_products_producer(user: User = Depends(get_current_user)):
    """Get producer's products with low stock"""
    await require_role(user, ["producer"])
    
    products = await db.products.find(
        {
            "producer_id": user.user_id,
            "track_stock": True,
            "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
        },
        {"_id": 0}
    ).to_list(100)
    return products


# ============================================
# PRODUCER: COUNTRY AVAILABILITY & PRICING MANAGEMENT
# ============================================

class CountryPricingInput(BaseModel):
    """Input for managing country-specific pricing"""
    country_code: str
    price: float
    available: bool = True

@api_router.get("/producer/products/{product_id}/countries")
async def get_product_countries(product_id: str, user: User = Depends(get_current_user)):
    """Get country availability and pricing for a product"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one(
        {"product_id": product_id, "producer_id": user.user_id}, 
        {"_id": 0, "available_countries": 1, "country_prices": 1, "country_currency": 1}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    return {
        "product_id": product_id,
        "available_countries": product.get("available_countries", []),
        "country_prices": product.get("country_prices", {}),
        "country_currency": product.get("country_currency", {}),
        "supported_countries": SUPPORTED_COUNTRIES
    }

@api_router.put("/producer/products/{product_id}/countries")
async def update_product_countries(
    product_id: str, 
    countries_data: List[CountryPricingInput], 
    user: User = Depends(get_current_user)
):
    """Update country availability and pricing for a product"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    # Build country data structures
    available_countries = []
    country_prices = {}
    country_currency = {}
    
    for country_data in countries_data:
        country_code = country_data.country_code.upper()
        
        # Validate country code
        if country_code not in SUPPORTED_COUNTRIES:
            raise HTTPException(status_code=400, detail=f"Unsupported country code: {country_code}")
        
        if country_data.available:
            available_countries.append(country_code)
            country_prices[country_code] = country_data.price
            country_currency[country_code] = SUPPORTED_COUNTRIES[country_code]["currency"]
    
    # Update product
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries if available_countries else None,
            "country_prices": country_prices if country_prices else None,
            "country_currency": country_currency if country_currency else None
        }}
    )
    
    return {
        "message": "Country availability and pricing updated",
        "available_countries": available_countries,
        "country_prices": country_prices
    }

@api_router.post("/producer/products/{product_id}/countries/{country_code}")
async def add_country_to_product(
    product_id: str,
    country_code: str,
    pricing_input: dict,
    user: User = Depends(get_current_user)
):
    """Add a single country to product availability"""
    await require_role(user, ["producer"])
    
    country_code = country_code.upper()
    if country_code not in SUPPORTED_COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Unsupported country code: {country_code}")
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    price = pricing_input.get("price")
    if price is None:
        raise HTTPException(status_code=400, detail="Price is required")
    
    # Update arrays
    available_countries = product.get("available_countries", [])
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    
    if country_code not in available_countries:
        available_countries.append(country_code)
    
    country_prices[country_code] = price
    country_currency[country_code] = SUPPORTED_COUNTRIES[country_code]["currency"]
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries,
            "country_prices": country_prices,
            "country_currency": country_currency
        }}
    )
    
    return {"message": f"Added {country_code} to product availability", "price": price}

@api_router.delete("/producer/products/{product_id}/countries/{country_code}")
async def remove_country_from_product(
    product_id: str,
    country_code: str,
    user: User = Depends(get_current_user)
):
    """Remove a country from product availability"""
    await require_role(user, ["producer"])
    
    country_code = country_code.upper()
    
    product = await db.products.find_one({"product_id": product_id, "producer_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    available_countries = product.get("available_countries", [])
    country_prices = product.get("country_prices", {})
    country_currency = product.get("country_currency", {})
    
    if country_code in available_countries:
        available_countries.remove(country_code)
    if country_code in country_prices:
        del country_prices[country_code]
    if country_code in country_currency:
        del country_currency[country_code]
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "available_countries": available_countries if available_countries else None,
            "country_prices": country_prices if country_prices else None,
            "country_currency": country_currency if country_currency else None
        }}
    )
    
    return {"message": f"Removed {country_code} from product availability"}

# ============================================
# VARIANTS & PACKS MANAGEMENT
# ============================================

@api_router.post("/producer/products/{product_id}/variants")
async def create_variant(product_id: str, input: VariantCreateInput, user: User = Depends(get_current_user)):
    """Create a variant for a product (producer only)"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variant_id = f"var_{uuid.uuid4().hex[:8]}"
    new_variant = {
        "variant_id": variant_id,
        "name": input.name,
        "sku": input.sku,
        "packs": []
    }
    
    variants = product.get("variants", [])
    variants.append(new_variant)
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return new_variant

@api_router.put("/producer/products/{product_id}/variants/{variant_id}")
async def update_variant(product_id: str, variant_id: str, input: VariantCreateInput, user: User = Depends(get_current_user)):
    """Update a variant (producer only)"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    variant_idx = next((i for i, v in enumerate(variants) if v["variant_id"] == variant_id), None)
    
    if variant_idx is None:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    variants[variant_idx]["name"] = input.name
    if input.sku:
        variants[variant_idx]["sku"] = input.sku
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return variants[variant_idx]

@api_router.delete("/producer/products/{product_id}/variants/{variant_id}")
async def delete_variant(product_id: str, variant_id: str, user: User = Depends(get_current_user)):
    """Delete a variant (producer only)"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    original_count = len(variants)
    variants = [v for v in variants if v["variant_id"] != variant_id]
    
    if len(variants) == original_count:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants if variants else None}}
    )
    
    return {"message": "Variant deleted"}

@api_router.post("/producer/products/{product_id}/packs")
async def create_pack(product_id: str, input: PackCreateInput, user: User = Depends(get_current_user)):
    """Create a pack for a variant (producer only)"""
    await require_role(user, ["producer"])
    
    if input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    if input.units < 1:
        raise HTTPException(status_code=400, detail="Units must be at least 1")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    variant_idx = next((i for i, v in enumerate(variants) if v["variant_id"] == input.variant_id), None)
    
    if variant_idx is None:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    pack_id = f"pack_{uuid.uuid4().hex[:8]}"
    new_pack = {
        "pack_id": pack_id,
        "label": input.label,
        "units": input.units,
        "price": input.price,
        "stock": input.stock
    }
    
    packs = variants[variant_idx].get("packs", [])
    packs.append(new_pack)
    variants[variant_idx]["packs"] = packs
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return new_pack

@api_router.put("/producer/products/{product_id}/packs/{pack_id}")
async def update_pack(product_id: str, pack_id: str, input: PackUpdateInput, user: User = Depends(get_current_user)):
    """Update a pack (producer only)"""
    await require_role(user, ["producer"])
    
    if input.price is not None and input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock is not None and input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    if input.units is not None and input.units < 1:
        raise HTTPException(status_code=400, detail="Units must be at least 1")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        for pack in packs:
            if pack["pack_id"] == pack_id:
                if input.label is not None:
                    pack["label"] = input.label
                if input.units is not None:
                    pack["units"] = input.units
                if input.price is not None:
                    pack["price"] = input.price
                if input.stock is not None:
                    pack["stock"] = input.stock
                pack_found = True
                break
        if pack_found:
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack updated"}

@api_router.delete("/producer/products/{product_id}/packs/{pack_id}")
async def delete_pack(product_id: str, pack_id: str, user: User = Depends(get_current_user)):
    """Delete a pack (producer only)"""
    await require_role(user, ["producer"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this product")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        original_count = len(packs)
        packs = [p for p in packs if p["pack_id"] != pack_id]
        if len(packs) != original_count:
            variant["packs"] = packs
            pack_found = True
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack deleted"}

# Admin variant/pack management
@api_router.put("/admin/products/{product_id}/packs/{pack_id}")
async def admin_update_pack(product_id: str, pack_id: str, input: PackUpdateInput, user: User = Depends(get_current_user)):
    """Admin update a pack (price/stock override)"""
    await require_role(user, ["admin"])
    
    if input.price is not None and input.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if input.stock is not None and input.stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    variants = product.get("variants", [])
    pack_found = False
    
    for variant in variants:
        packs = variant.get("packs", [])
        for pack in packs:
            if pack["pack_id"] == pack_id:
                if input.label is not None:
                    pack["label"] = input.label
                if input.units is not None:
                    pack["units"] = input.units
                if input.price is not None:
                    pack["price"] = input.price
                if input.stock is not None:
                    pack["stock"] = input.stock
                pack_found = True
                break
        if pack_found:
            break
    
    if not pack_found:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"variants": variants}}
    )
    
    return {"message": "Pack updated by admin"}

# ============================================
# REVIEWS & RATINGS
# ============================================

@api_router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
    """Get visible reviews and average rating for a product (public)"""
    # Get visible reviews for the product
    reviews = await db.reviews.find(
        {"product_id": product_id, "visible": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate average rating
    total_reviews = len(reviews)
    average_rating = 0
    if total_reviews > 0:
        average_rating = round(sum(r["rating"] for r in reviews) / total_reviews, 1)
    
    return {
        "reviews": reviews,
        "average_rating": average_rating,
        "total_reviews": total_reviews
    }

@api_router.post("/reviews/create")
async def create_review(input: ReviewCreateInput, user: User = Depends(get_current_user)):
    """Create a review for a product (verified buyers only)"""
    # Validate order exists and belongs to user
    order = await db.orders.find_one(
        {"order_id": input.order_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order status is COMPLETED
    if order.get("status", "").lower() != "completed":
        raise HTTPException(
            status_code=400, 
            detail="You can only review products from completed orders"
        )
    
    # Validate product exists in order
    product_in_order = any(
        item["product_id"] == input.product_id 
        for item in order.get("line_items", [])
    )
    if not product_in_order:
        raise HTTPException(
            status_code=400, 
            detail="This product was not in your order"
        )
    
    # Check product exists
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing_review = await db.reviews.find_one(
        {"product_id": input.product_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if existing_review:
        raise HTTPException(
            status_code=400, 
            detail="You have already reviewed this product"
        )
    
    # Create the review
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    review = {
        "review_id": review_id,
        "product_id": input.product_id,
        "user_id": user.user_id,
        "order_id": input.order_id,
        "rating": input.rating,
        "comment": input.comment[:500],  # Enforce max length
        "verified": True,
        "visible": True,
        "user_name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review)
    review.pop("_id", None)
    return review

@api_router.get("/reviews/can-review/{product_id}")
async def can_review_product(product_id: str, user: User = Depends(get_current_user)):
    """Check if user can review a product"""
    # Check if user already reviewed
    existing_review = await db.reviews.find_one(
        {"product_id": product_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if existing_review:
        return {"can_review": False, "reason": "already_reviewed"}
    
    # Check if user has a completed order with this product
    completed_order = await db.orders.find_one(
        {
            "user_id": user.user_id,
            "status": "completed",
            "line_items.product_id": product_id
        },
        {"_id": 0, "order_id": 1}
    )
    
    if not completed_order:
        return {"can_review": False, "reason": "no_completed_order"}
    
    return {
        "can_review": True, 
        "order_id": completed_order["order_id"]
    }

@api_router.get("/customer/reviews")
async def get_customer_reviews(user: User = Depends(get_current_user)):
    """Get all reviews by the current customer"""
    reviews = await db.reviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return reviews

# Admin Review Moderation
@api_router.get("/admin/reviews")
async def get_all_reviews(user: User = Depends(get_current_user)):
    """Get all reviews for admin moderation"""
    await require_role(user, ["admin"])
    
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with product names
    for review in reviews:
        product = await db.products.find_one(
            {"product_id": review["product_id"]},
            {"_id": 0, "name": 1}
        )
        review["product_name"] = product["name"] if product else "Unknown Product"
    
    return reviews

@api_router.put("/admin/reviews/{review_id}/hide")
async def hide_review(review_id: str, user: User = Depends(get_current_user)):
    """Hide a review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review hidden"}

@api_router.put("/admin/reviews/{review_id}/show")
async def show_review(review_id: str, user: User = Depends(get_current_user)):
    """Show a hidden review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"visible": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review visible"}

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, user: User = Depends(get_current_user)):
    """Delete a review (admin only)"""
    await require_role(user, ["admin"])
    
    result = await db.reviews.delete_one({"review_id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted"}

# Seed Data
@api_router.post("/seed-data")
async def seed_data():
    existing_cats = await db.categories.count_documents({})
    if existing_cats > 0:
        return {"message": "Data already seeded"}
    
    categories = [
        {"category_id": "cat_snacks", "name": "Snacks", "slug": "snacks", "description": "Healthy snacks and treats", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_frozen", "name": "Frozen", "slug": "frozen", "description": "Frozen foods", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_beverages", "name": "Beverages", "slug": "beverages", "description": "Drinks and beverages", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_preserves", "name": "Preserves", "slug": "preserves", "description": "Jams and preserves", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_oils", "name": "Oils", "slug": "oils", "description": "Cooking oils", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_dried", "name": "Dried", "slug": "dried", "description": "Dried fruits and goods", "created_at": datetime.now(timezone.utc).isoformat()},
        {"category_id": "cat_precooked", "name": "Pre cooked", "slug": "pre-cooked", "description": "Ready to eat meals", "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.categories.insert_many(categories)
    
    admin_id = "user_admin_root"
    admin_user = {
        "user_id": admin_id,
        "email": "admin@hispaloshop.com",
        "name": "Admin",
        "role": "admin",
        "email_verified": True,
        "approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    
    return {"message": "Data seeded successfully", "admin_email": "admin@hispaloshop.com"}

# Setup - Add CORS middleware BEFORE router for proper handling
cors_origins = os.environ.get('CORS_ORIGINS', '').split(',')
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
