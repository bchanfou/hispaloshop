from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routers.auth import router as auth_router
from routers.categories import router as categories_router
from routers.products import router as products_router
from routers.producer import router as producer_router
from routers.cart import router as cart_router
from routers.checkout import router as checkout_router
from routers.orders import router as orders_router
from routers.webhooks import router as webhooks_router
from routers.affiliate_public import router as affiliate_public_router
from routers.influencer import router as influencer_router
from routers.matching import router as matching_router
from routers.chat import router as chat_router
from routers.recommendations import router as recommendations_router
from routers.posts import router as posts_router
from routers.interactions import router as interactions_router
from routers.follows import router as follows_router
from routers.reels import router as reels_router
from routers.hashtags import router as hashtags_router
from routers.stories import router as stories_router
from routers.collections import router as collections_router
from routers.realtime_chat import router as realtime_chat_router
from routers.importers import router as importers_router
from routers.b2b_quotes import router as b2b_quotes_router
from routers.b2b_logistics import router as b2b_logistics_router
from routers.connect import router as connect_router

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


app = FastAPI(
    title="Hispaloshop API",
    version="1.0.0"
)
# Ensure static uploads path exists in local/dev startup.
Path("uploads").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://hispaloshop.com",
        "https://www.hispaloshop.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Routes
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(categories_router, prefix="/api/v1", tags=["categories"])
app.include_router(products_router, prefix="/api/v1", tags=["products"])
app.include_router(producer_router, prefix="/api/v1", tags=["producer"])
app.include_router(cart_router, prefix="/api/v1", tags=["cart"])
app.include_router(checkout_router, prefix="/api/v1", tags=["checkout"])
app.include_router(orders_router, prefix="/api/v1", tags=["orders"])
app.include_router(webhooks_router, prefix="/api/v1", tags=["webhooks"])
app.include_router(affiliate_public_router, prefix="/api/v1", tags=["affiliate"])
app.include_router(influencer_router, prefix="/api/v1", tags=["influencer"])
app.include_router(matching_router, prefix="/api/v1", tags=["matching"])
app.include_router(chat_router, prefix="/api/v1", tags=["chat"])
app.include_router(recommendations_router, prefix="/api/v1", tags=["recommendations"])
app.include_router(posts_router, prefix="/api/v1", tags=["posts"])
app.include_router(interactions_router, prefix="/api/v1", tags=["interactions"])
app.include_router(follows_router, prefix="/api/v1", tags=["follows"])
app.include_router(reels_router, prefix="/api/v1", tags=["reels"])
app.include_router(hashtags_router, prefix="/api/v1", tags=["hashtags"])
app.include_router(stories_router, prefix="/api/v1", tags=["stories"])
app.include_router(collections_router, prefix="/api/v1", tags=["collections"])
app.include_router(realtime_chat_router, prefix="/api/v1", tags=["realtime-chat"])
app.include_router(importers_router, prefix="/api/v1", tags=["importers"])
app.include_router(b2b_quotes_router, prefix="/api/v1", tags=["b2b-quotes"])
app.include_router(b2b_logistics_router, prefix="/api/v1", tags=["b2b-logistics"])
app.include_router(connect_router, prefix="/api/v1", tags=["connect"])

# Backward-compatible API routes used by the current frontend bundle (/api/*)
app.include_router(legacy_auth_router, prefix="/api", tags=["legacy-auth"])
app.include_router(legacy_config_router, prefix="/api", tags=["legacy-config"])
app.include_router(legacy_feed_router, prefix="/api", tags=["legacy-feed"])
app.include_router(legacy_products_router, prefix="/api", tags=["legacy-products"])
app.include_router(legacy_social_router, prefix="/api", tags=["legacy-social"])
app.include_router(legacy_stores_router, prefix="/api", tags=["legacy-stores"])
app.include_router(legacy_cart_router, prefix="/api", tags=["legacy-cart"])
app.include_router(legacy_orders_router, prefix="/api", tags=["legacy-orders"])
app.include_router(legacy_influencer_router, prefix="/api", tags=["legacy-influencer"])
app.include_router(legacy_subscriptions_router, prefix="/api", tags=["legacy-subscriptions"])
app.include_router(legacy_customer_router, prefix="/api", tags=["legacy-customer"])
app.include_router(legacy_wishlist_router, prefix="/api", tags=["legacy-wishlist"])
app.include_router(legacy_notifications_router, prefix="/api", tags=["legacy-notifications"])
app.include_router(legacy_uploads_router, prefix="/api", tags=["legacy-uploads"])
app.include_router(legacy_certificates_router, prefix="/api", tags=["legacy-certificates"])
app.include_router(legacy_cron_router, prefix="/api", tags=["legacy-cron"])
app.include_router(legacy_recipes_reviews_router, prefix="/api", tags=["legacy-recipes-reviews"])
app.include_router(connect_router, prefix="/api", tags=["connect"])


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
