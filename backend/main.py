from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


app = FastAPI(
    title="Hispaloshop API",
    version="1.0.0"
)

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


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0"
    }
