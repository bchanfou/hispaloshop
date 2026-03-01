"""
Hispaloshop Backend Server
Modularization in progress:
  - db.py: Database connection
  - auth_utils.py: Password hashing, user auth  
  - services/storage.py: File upload abstraction
  - routes/: Route modules (in progress)
- /app/backend/app/models/   - Pydantic models
- /app/backend/app/services/ - Business logic (future)
- /app/backend/app/routers/  - API routes (future)
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header, Depends, BackgroundTasks, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any

# ── Shared modules (canonical source for models, constants, auth) ──
from core.models import (
    User, Address, ShippingAddress, UserPreferences, UserConsent,
    RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput,
    UserAddressInput, ProducerAddressInput, LocaleUpdateInput,
    DeleteAccountRequest, UserStatusUpdate, UserCredentialsUpdate,
    AIProfile, AIProfileUpdate, InferredTag, UserInferredInsights,
    InsightsConfig, InsightsConfigUpdate, AICartActionTarget,
    AIExecuteActionInput, AISmartCartAction, SellerAIInput, InfluencerAIInput,
    Category, Product, Pack, Variant, VariantCreateInput, PackCreateInput,
    PackUpdateInput, NutritionalInfo, PackInput, ProductInput,
    CertificateInput, CategoryInput, Certificate, StockUpdateInput,
    CountryPricingInput, Review, ReviewCreateInput, RejectCertificateInput,
    StoreProfile, StoreProfileUpdate, StoreFollower,
    CartItem, Order, PaymentTransaction, CartUpdateInput, OrderCreateInput,
    OrderStatusUpdate, BuyNowInput,
    DiscountCode, DiscountCodeCreate, Influencer, InfluencerCreate,
    InfluencerCommission, InfluencerApplication, CreateInfluencerCodeInput,
    WithdrawalRequest,
    ChatMessage, ChatMessageInput, PreferencesInput, Notification,
    MessageInput, NewConversationInput,
    InternalMessageCreate, InternalMessageResponse, ConversationResponse,
    AdminCreate, AdminStatusUpdate,
    TranslateProductInput, TranslateCertificateInput, PageVisitRequest,
)
from core.constants import (
    SUPPORTED_COUNTRIES, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES,
    EMAIL_TEMPLATES, get_email_template,
)
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
# from emergentintegrations.llm.chat import LlmChat, UserMessage
# emergentintegrations Stripe helper removed — using raw stripe SDK for Connect support
import qrcode
import io
import base64
import hashlib
import bcrypt as _bcrypt
import stripe
import resend
from services.ledger import write_ledger_event
from services.auth_helpers import (
    hash_password, verify_password, needs_rehash,
    generate_verification_token, generate_verification_code,
    send_email as _send_email_helper,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION', '0.20'))
INFLUENCER_COMMISSION_SHARE = 0.15  # 15% of platform fee

# Initialize Stripe SDK globally with the real secret key
stripe.api_key = STRIPE_SECRET_KEY

app = FastAPI(
    title="Hispaloshop API",
    description="E-commerce platform for certified food products",
    version="2.0.0"
)
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ── Health check (must always respond 200 when backend is alive) ──
@app.get("/api/health")
async def health_check():
    """Health check — verifies backend + DB are alive."""
    try:
        await asyncio.wait_for(db.command("ping"), timeout=3.0)
        return {"status": "ok", "db": "connected"}
    except asyncio.TimeoutError:
        return JSONResponse(status_code=503, content={"status": "degraded", "db": "timeout"})
    except Exception:
        return JSONResponse(status_code=503, content={"status": "degraded", "db": "unreachable"})


@app.get("/api/sitemap.xml")
async def sitemap():
    """Dynamic sitemap.xml for SEO."""
    from fastapi.responses import Response
    products = await db.products.find({"status": "active"}, {"_id": 0, "product_id": 1, "slug": 1}).to_list(5000)
    stores = await db.store_profiles.find({}, {"_id": 0, "slug": 1}).to_list(500)
    categories = await db.categories.find({}, {"_id": 0, "slug": 1}).to_list(100)
    
    base = "https://www.hispaloshop.com"
    urls = [
        f"<url><loc>{base}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>",
        f"<url><loc>{base}/vender</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>",
        f"<url><loc>{base}/influencers</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>",
        f"<url><loc>{base}/products</loc><changefreq>daily</changefreq><priority>0.9</priority></url>",
        f"<url><loc>{base}/stores</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>",
        f"<url><loc>{base}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>",
        f"<url><loc>{base}/pricing</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>",
        f"<url><loc>{base}/recipes</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>",
        f"<url><loc>{base}/discover</loc><changefreq>daily</changefreq><priority>0.7</priority></url>",
        f"<url><loc>{base}/signup</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>",
        f"<url><loc>{base}/vender/registro</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>",
        f"<url><loc>{base}/influencers/registro</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>",
    ]
    for p in products:
        urls.append(f"<url><loc>{base}/products/{p['product_id']}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>")
    for s in stores:
        urls.append(f"<url><loc>{base}/store/{s['slug']}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>")
    for c in categories:
        urls.append(f"<url><loc>{base}/products?category={c['slug']}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>")
    
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{"".join(urls)}\n</urlset>'
    return Response(content=xml, media_type="application/xml")


@app.get("/api/robots.txt")
async def robots_txt():
    """robots.txt for SEO."""
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /super-admin\nDisallow: /producer\nDisallow: /influencer/dashboard\nSitemap: https://www.hispaloshop.com/api/sitemap.xml\n"
    )


# ── Global exception handler — prevents unhandled crashes → 520 ──
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    logger.error(f"[UNHANDLED] {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    logger.error(f"[TRACEBACK] {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."}
    )


# ── Performance: Cache headers for static-ish API responses ──
@app.middleware("http")
async def add_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    # Cache static configs for 1 hour
    if path in ("/api/config/countries", "/api/config/languages", "/api/config/currencies", "/api/config/locale", "/api/sellers/plans", "/api/influencers/tiers"):
        response.headers["Cache-Control"] = "public, max-age=3600"
    # Cache exchange rates for 30 min
    elif path == "/api/exchange-rates":
        response.headers["Cache-Control"] = "public, max-age=1800"
    # Cache sitemap for 1 hour
    elif path == "/api/sitemap.xml":
        response.headers["Cache-Control"] = "public, max-age=3600"
    # Products listing — short cache
    elif path == "/api/products" and request.method == "GET":
        response.headers["Cache-Control"] = "public, max-age=60"
    # No cache for auth/user-specific endpoints
    elif any(x in path for x in ("/auth/", "/cart/", "/checkout/", "/webhook/", "/user/")):
        response.headers["Cache-Control"] = "no-store"
    return response

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

# Helper function for password hashing (bcrypt)
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
    """Check if user has required role. super_admin has access to all admin routes."""
    # super_admin has access to everything
    if user.role == "super_admin":
        return
    if "admin" in allowed_roles and user.role == "super_admin":
        return
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

async def require_super_admin(user: User):
    """Check if user is a super admin"""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise (no error)"""

# Auth routes — extracted to routes/auth.py
from routes.auth import router as auth_router
api_router.include_router(auth_router)

# Subscriptions & Billing
from routes.subscriptions import router as subscriptions_router
api_router.include_router(subscriptions_router)

# Cron/Scheduled tasks
from routes.cron import router as cron_router
api_router.include_router(cron_router)

# Config, Locale, Categories, Regions, Exchange Rates — extracted to routes/config.py
from routes.config import router as config_router
api_router.include_router(config_router)

# Products — extracted to routes/products.py
from routes.products import router as products_router
api_router.include_router(products_router)

# ============================================

# Store routes — extracted to routes/stores.py
# ============================================

# Store routes — extracted to routes/stores.py
from routes.stores import router as stores_router
api_router.include_router(stores_router)

# Certificates & Translation — extracted to routes/certificates.py
from routes.certificates import router as certificates_router
api_router.include_router(certificates_router)

# AI Chat — extracted to routes/ai_chat.py
from routes.ai_chat import router as ai_chat_router
api_router.include_router(ai_chat_router)

# Admin Dashboard — extracted to routes/admin_dashboard.py
from routes.admin_dashboard import router as admin_dashboard_router
api_router.include_router(admin_dashboard_router)

# Feed & Tracking — extracted to routes/feed.py
from routes.feed import router as feed_router
api_router.include_router(feed_router)

# Uploads — extracted to routes/uploads.py
from routes.uploads import router as uploads_router
api_router.include_router(uploads_router)

# Conversations — extracted to routes/conversations.py
from routes.conversations import router as conversations_router
api_router.include_router(conversations_router)

# User notifications — extracted to routes/notifications.py
from routes.notifications import router as notifications_router
api_router.include_router(notifications_router)

# Cart — extracted to routes/cart.py
from routes.cart import router as cart_router
api_router.include_router(cart_router)

# Customer routes — extracted to routes/customer.py
from routes.customer import router as customer_router
api_router.include_router(customer_router)

# Predictions — extracted to routes/predictions.py
from routes.predictions import router as predictions_router
api_router.include_router(predictions_router)

# Admin routes — extracted to routes/admin.py
from routes.admin import router as admin_router
api_router.include_router(admin_router)

# Orders & Payments — extracted to routes/orders.py
from routes.orders import router as orders_router
api_router.include_router(orders_router)

# Producer dashboard — extracted to routes/producer.py
from routes.producer import router as producer_router
api_router.include_router(producer_router)

# Influencer — extracted to routes/influencer.py
from routes.influencer import router as influencer_router
api_router.include_router(influencer_router)

# ============================================
# REVIEWS & RATINGS
# ============================================

# Recipes & Reviews — extracted to routes/recipes_reviews.py
from routes.recipes_reviews import router as recipes_reviews_router
api_router.include_router(recipes_reviews_router)

@api_router.post("/seed-data")
async def seed_data():
    existing_cats = await db.categories.count_documents({"is_active": True})
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


# ============================================================================
# CUSTOMER INSIGHTS API - SUPER ADMIN ONLY
# GDPR-Compliant Aggregated Analytics
# ============================================================================



# Insights — extracted to routes/insights.py
from routes.insights import router as insights_router
api_router.include_router(insights_router)


# ============================================================================
# INTERNAL CHAT API (Producers <-> Influencers)
# ============================================================================



# ============================================================================
# END CUSTOMER INSIGHTS API
# ============================================================================

# ============================================================================
# PUBLIC DIRECTORY API - Influencers and Producers for Internal Chat
# ============================================================================

# Directory — extracted to routes/directory.py
from routes.directory import router as directory_router
api_router.include_router(directory_router)

# Internal Chat — extracted to routes/internal_chat.py
from routes.internal_chat import router as internal_chat_router
api_router.include_router(internal_chat_router)




# Social routes — extracted to routes/social.py
from routes.social import router as social_router
api_router.include_router(social_router)

# Push notifications
from routes.push_notifications import router as push_router
api_router.include_router(push_router)

# Badges / Achievements
from routes.badges import router as badges_router
api_router.include_router(badges_router)

# Wishlist
from routes.wishlist import router as wishlist_router
api_router.include_router(wishlist_router)


# SETUP - CORS CONFIGURATION (CRÍTICO PARA PRODUCCIÓN)
# =======================================================================================

# Always include production domains
PRODUCTION_ORIGINS = [
    "https://www.hispaloshop.com",
    "https://hispaloshop.com",
    "https://api.hispaloshop.com",
]

# Preview and development origins
DEV_ORIGINS = [
    "https://auth-rework.preview.emergentagent.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

# Additional origins from environment (if any)
cors_origins_str = os.environ.get('CORS_ORIGINS', '')
env_origins = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip() and origin.strip() != '*']

# Combine all origins - production first
cors_origins = PRODUCTION_ORIGINS + DEV_ORIGINS + env_origins

# Remove duplicates while preserving order
cors_origins = list(dict.fromkeys(cors_origins))

logger.info(f"[CORS] Configured origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],  # Allow all headers for production compatibility
    expose_headers=["Set-Cookie", "Content-Length", "X-Request-ID"],
    max_age=600,  # Cache preflight for 10 minutes
)

app.include_router(api_router)

# ================ MONGODB INDEXES ================
# INTERNAL CHAT SYSTEM - WebSocket based real-time messaging
# =======================================================================================

# Pydantic models imported from core.models

# WebSocket connection manager (shared instance from core.websocket)
from core.websocket import chat_manager

# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat messages"""
    # Verify user exists
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        await websocket.close(code=4001)
        return
    
    await chat_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "typing":
                # Broadcast typing indicator to conversation participants
                conversation_id = data.get("conversation_id")
                if conversation_id:
                    conv = await db.internal_conversations.find_one({"conversation_id": conversation_id})
                    if conv:
                        for participant in conv.get("participants", []):
                            if participant["user_id"] != user_id:
                                await chat_manager.send_personal_message({
                                    "type": "typing",
                                    "conversation_id": conversation_id,
                                    "user_id": user_id,
                                    "user_name": user.get("name", "User")
                                }, participant["user_id"])
            elif data.get("type") == "read":
                # Mark messages as read
                conversation_id = data.get("conversation_id")
                if conversation_id:
                    await db.internal_messages.update_many(
                        {
                            "conversation_id": conversation_id,
                            "sender_id": {"$ne": user_id},
                            "status": {"$ne": "read"}
                        },
                        {"$set": {"status": "read", "read_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    # Notify senders that their messages were read
                    conv = await db.internal_conversations.find_one({"conversation_id": conversation_id})
                    if conv:
                        for participant in conv.get("participants", []):
                            if participant["user_id"] != user_id:
                                await chat_manager.send_personal_message({
                                    "type": "messages_read",
                                    "conversation_id": conversation_id,
                                    "read_by": user_id
                                }, participant["user_id"])
                                
    except WebSocketDisconnect:
        chat_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"[WS] Error in chat: {e}")
        chat_manager.disconnect(user_id)

# REST endpoints for internal chat
@app.on_event("startup")
async def create_indexes():
    """Create MongoDB indexes for performance and uniqueness."""
    try:
        # Users
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("username", unique=True, sparse=True)
        # Sessions
        await db.sessions.create_index("session_token", unique=True)
        await db.sessions.create_index("created_at", expireAfterSeconds=86400 * 30)  # 30 day TTL
        # Products
        await db.products.create_index("product_id", unique=True)
        await db.products.create_index([("status", 1), ("producer_id", 1)])
        await db.products.create_index("store_id")
        # Orders
        await db.orders.create_index("order_id", unique=True)
        await db.orders.create_index([("user_id", 1), ("created_at", -1)])
        await db.orders.create_index("status")
        # Cart
        await db.cart_items.create_index("user_id")
        # Stores
        await db.stores.create_index("store_slug", unique=True, sparse=True)
        await db.stores.create_index("user_id")
        # Influencers
        await db.influencers.create_index("user_id", sparse=True)
        await db.influencers.create_index("email", sparse=True)
        # Chat
        await db.internal_conversations.create_index("participants")
        await db.internal_messages.create_index([("conversation_id", 1), ("created_at", -1)])
        # Social
        await db.user_posts.create_index([("user_id", 1), ("created_at", -1)])
        await db.user_posts.create_index("post_id", unique=True)
        await db.post_likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
        await db.post_comments.create_index("post_id")
        await db.post_bookmarks.create_index([("post_id", 1), ("user_id", 1)], unique=True)
        await db.user_follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
        await db.user_follows.create_index("following_id")
        # Notifications
        await db.user_notifications.create_index([("user_id", 1), ("created_at", -1)])
        await db.user_notifications.create_index([("user_id", 1), ("type", 1, ), ("created_at", -1)])
        logger.info("[DB] All MongoDB indexes created successfully")
    except Exception as e:
        logger.warning(f"[DB] Index creation warning (may already exist): {e}")

# Mount static files for chat images
from fastapi.staticfiles import StaticFiles
upload_dir = Path("/app/uploads")
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
