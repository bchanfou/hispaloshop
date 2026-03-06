import os
import sys

# === VALIDACIÓN FAIL-FAST DE VARIABLES CRÍTICAS ===
REQUIRED_ENV_VARS = [
    "JWT_SECRET",
    "MONGO_URL",
    "STRIPE_SECRET_KEY",
]

OPTIONAL_ENV_VARS = [
    "STRIPE_WEBHOOK_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "REDIS_URL",
]

missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing:
    print(f"FATAL: Missing required environment variables: {', '.join(missing)}")
    print("Set them before starting the application.")
    sys.exit(1)

# Warnings para opcionales
for var in OPTIONAL_ENV_VARS:
    if not os.getenv(var):
        print(f"WARNING: Optional {var} not set. Some features may be disabled.")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

# === STACK MONGODB (LEGACY - ACTIVO) ===
from routes.auth import router as legacy_auth_router
from routes.config import router as legacy_config_router
from routes.feed import router as legacy_feed_router
from routes.products import router as legacy_products_router
from routes.social import router as legacy_social_router
from routes.stores import router as legacy_stores_router
from routes.cart import router as legacy_cart_router
from routes.orders import router as legacy_orders_router
from routes.influencer import router as legacy_influencer_router
from routes.subscriptions import router as legacy_subscriptions_router
from routes.customer import router as legacy_customer_router
from routes.wishlist import router as legacy_wishlist_router
from routes.notifications import router as legacy_notifications_router
from routes.uploads import router as legacy_uploads_router
from routes.certificates import router as legacy_certificates_router
from routes.cron import router as legacy_cron_router
from routes.recipes_reviews import router as legacy_recipes_reviews_router
from routes.admin import router as legacy_admin_router
from routes.admin_dashboard import router as legacy_admin_dashboard_router
from routes.badges import router as legacy_badges_router
from routes.conversations import router as legacy_conversations_router
from routes.directory import router as legacy_directory_router
from routes.insights import router as legacy_insights_router
from routes.internal_chat import router as legacy_internal_chat_router
from routes.predictions import router as legacy_predictions_router
from routes.producer import router as legacy_producer_router
from routes.push_notifications import router as legacy_push_notifications_router
from routes.producer_registration import router as producer_registration_router
from routes.importer_registration import router as importer_registration_router
from routes.importer import router as legacy_importer_router

logger = logging.getLogger(__name__)

try:
    from routes.ai_chat import router as legacy_ai_chat_router
except Exception as exc:
    logger.warning("Legacy AI router disabled: %s", exc)
    legacy_ai_chat_router = None


app = FastAPI(
    title="Hispaloshop API",
    version="1.0.0"
)
# Ensure static uploads path exists in local/dev startup.
Path("uploads").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Configuration
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://hispaloshop.com,https://www.hispaloshop.com"
).split(",")

# En producción, rechazar wildcard origins
if os.getenv("ENV") == "production":
    if "*" in allowed_origins:
        raise ValueError("Wildcard '*' not allowed in ALLOWED_ORIGINS in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# === API Routes - Stack MongoDB (Funcional) ===
app.include_router(legacy_auth_router, prefix="/api", tags=["auth"])
app.include_router(legacy_config_router, prefix="/api", tags=["config"])
app.include_router(legacy_feed_router, prefix="/api", tags=["feed"])
app.include_router(legacy_products_router, prefix="/api", tags=["products"])
app.include_router(legacy_social_router, prefix="/api", tags=["social"])
app.include_router(legacy_stores_router, prefix="/api", tags=["stores"])
app.include_router(legacy_cart_router, prefix="/api", tags=["cart"])
app.include_router(legacy_orders_router, prefix="/api", tags=["orders"])
app.include_router(legacy_influencer_router, prefix="/api", tags=["influencer"])
app.include_router(legacy_subscriptions_router, prefix="/api", tags=["subscriptions"])
app.include_router(legacy_customer_router, prefix="/api", tags=["customer"])
app.include_router(legacy_wishlist_router, prefix="/api", tags=["wishlist"])
app.include_router(legacy_notifications_router, prefix="/api", tags=["notifications"])
app.include_router(legacy_uploads_router, prefix="/api", tags=["uploads"])
app.include_router(legacy_certificates_router, prefix="/api", tags=["certificates"])
app.include_router(legacy_cron_router, prefix="/api", tags=["cron"])
app.include_router(legacy_recipes_reviews_router, prefix="/api", tags=["recipes-reviews"])
app.include_router(legacy_admin_router, prefix="/api", tags=["admin"])
app.include_router(legacy_admin_dashboard_router, prefix="/api", tags=["admin-dashboard"])
if legacy_ai_chat_router is not None:
    app.include_router(legacy_ai_chat_router, prefix="/api", tags=["ai-chat"])
app.include_router(legacy_badges_router, prefix="/api", tags=["badges"])
app.include_router(legacy_conversations_router, prefix="/api", tags=["conversations"])
app.include_router(legacy_directory_router, prefix="/api", tags=["directory"])
app.include_router(legacy_insights_router, prefix="/api", tags=["insights"])
app.include_router(legacy_internal_chat_router, prefix="/api", tags=["internal-chat"])
app.include_router(legacy_predictions_router, prefix="/api", tags=["predictions"])
app.include_router(legacy_producer_router, prefix="/api", tags=["producer"])
app.include_router(legacy_importer_router, prefix="/api", tags=["importer"])
app.include_router(legacy_push_notifications_router, prefix="/api", tags=["push"])
app.include_router(producer_registration_router, prefix="/api", tags=["producer-registration"])
app.include_router(importer_registration_router, prefix="/api", tags=["importer-registration"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def legacy_health():
    return {
        "status": "ok",
        "version": "1.0.0"
    }
