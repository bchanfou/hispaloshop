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

app = FastAPI(title="Hispaloshop API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://hispaloshop.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(categories_router, prefix="/api/v1", tags=["categories"])
app.include_router(products_router, prefix="/api/v1", tags=["products"])
app.include_router(producer_router, prefix="/api/v1", tags=["producer"])
app.include_router(cart_router, prefix="/api/v1", tags=["cart"])
app.include_router(checkout_router, prefix="/api/v1", tags=["checkout"])
app.include_router(orders_router, prefix="/api/v1", tags=["orders"])
app.include_router(webhooks_router, prefix="/api/v1", tags=["webhooks"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
