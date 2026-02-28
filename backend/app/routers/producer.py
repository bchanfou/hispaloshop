"""
Producer routes: dashboard, products, orders, Stripe Connect.
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import FileResponse
from typing import Optional, List
from datetime import datetime, timezone
from pathlib import Path
import uuid
import stripe

from ..core.config import db, STRIPE_SECRET_KEY, FRONTEND_URL, logger
from ..core.security import get_current_user
from ..models.user import User
from ..models.commerce import ProducerAddressInput

router = APIRouter(prefix="/producer", tags=["Producer"])

# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Upload directory
UPLOAD_DIR = Path("/app/uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def require_producer(user: User):
    """Verify user is a producer."""
    if user.role != "producer":
        raise HTTPException(status_code=403, detail="Producer access required")


# Dashboard & Stats
@router.get("/dashboard")
async def get_producer_dashboard(user: User = Depends(get_current_user)):
    """Get producer dashboard data."""
    await require_producer(user)
    
    products = await db.products.find(
        {"producer_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    orders = await db.orders.find(
        {"line_items.producer_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    total_sales = sum(
        sum(item.get("amount", 0) for item in order.get("line_items", [])
            if item.get("producer_id") == user.user_id)
        for order in orders
    )
    
    return {
        "products": products,
        "recent_orders": orders,
        "stats": {
            "total_products": len(products),
            "total_orders": len(orders),
            "total_sales": total_sales
        }
    }


# Product Management
@router.get("/products")
async def get_producer_products(user: User = Depends(get_current_user)):
    """Get producer's products."""
    await require_producer(user)
    products = await db.products.find(
        {"producer_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    return products


@router.put("/products/{product_id}/stock")
async def update_product_stock(
    product_id: str,
    stock: int,
    user: User = Depends(get_current_user)
):
    """Update product stock."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"stock": stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Stock updated"}


@router.get("/products/low-stock")
async def get_low_stock_products(user: User = Depends(get_current_user)):
    """Get producer's low stock products."""
    await require_producer(user)
    products = await db.products.find(
        {
            "producer_id": user.user_id,
            "$expr": {"$lt": ["$stock", "$low_stock_threshold"]}
        },
        {"_id": 0}
    ).to_list(100)
    return products


# Country Management
@router.get("/products/{product_id}/countries")
async def get_product_countries(
    product_id: str,
    user: User = Depends(get_current_user)
):
    """Get product country availability."""
    await require_producer(user)
    
    product = await db.products.find_one(
        {"product_id": product_id, "producer_id": user.user_id},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "available_countries": product.get("available_countries", []),
        "country_prices": product.get("country_prices", {}),
        "country_currency": product.get("country_currency", {})
    }


@router.put("/products/{product_id}/countries")
async def update_product_countries(
    product_id: str,
    available_countries: List[str],
    user: User = Depends(get_current_user)
):
    """Update product country availability."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"available_countries": available_countries}}
    )
    return {"message": "Countries updated"}


@router.post("/products/{product_id}/countries/{country_code}")
async def add_country_pricing(
    product_id: str,
    country_code: str,
    price: float,
    currency: str = "EUR",
    user: User = Depends(get_current_user)
):
    """Add country-specific pricing."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {
            "$set": {
                f"country_prices.{country_code}": price,
                f"country_currency.{country_code}": currency
            },
            "$addToSet": {"available_countries": country_code}
        }
    )
    return {"message": f"Pricing added for {country_code}"}


@router.delete("/products/{product_id}/countries/{country_code}")
async def remove_country_pricing(
    product_id: str,
    country_code: str,
    user: User = Depends(get_current_user)
):
    """Remove country-specific pricing."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {
            "$unset": {
                f"country_prices.{country_code}": "",
                f"country_currency.{country_code}": ""
            },
            "$pull": {"available_countries": country_code}
        }
    )
    return {"message": f"Pricing removed for {country_code}"}


# Variants & Packs
@router.post("/products/{product_id}/variants")
async def create_variant(
    product_id: str,
    name: str,
    user: User = Depends(get_current_user)
):
    """Create a product variant."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    variant = {
        "variant_id": f"var_{uuid.uuid4().hex[:8]}",
        "name": name,
        "packs": []
    }
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$push": {"variants": variant}}
    )
    return variant


@router.delete("/products/{product_id}/variants/{variant_id}")
async def delete_variant(
    product_id: str,
    variant_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a product variant."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$pull": {"variants": {"variant_id": variant_id}}}
    )
    return {"message": "Variant deleted"}


@router.post("/products/{product_id}/packs")
async def create_pack(
    product_id: str,
    variant_id: str,
    units: int,
    label: str,
    price: float,
    stock: int = 0,
    user: User = Depends(get_current_user)
):
    """Create a pack for a variant."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    pack = {
        "pack_id": f"pack_{uuid.uuid4().hex[:8]}",
        "units": units,
        "label": label,
        "price": price,
        "stock": stock
    }
    
    await db.products.update_one(
        {"product_id": product_id, "variants.variant_id": variant_id},
        {"$push": {"variants.$.packs": pack}}
    )
    return pack


@router.delete("/products/{product_id}/packs/{pack_id}")
async def delete_pack(
    product_id: str,
    pack_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a pack."""
    await require_producer(user)
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product or product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find and remove pack from all variants
    for variant in product.get("variants", []):
        await db.products.update_one(
            {"product_id": product_id, "variants.variant_id": variant["variant_id"]},
            {"$pull": {"variants.$.packs": {"pack_id": pack_id}}}
        )
    
    return {"message": "Pack deleted"}


# Stripe Connect
@router.post("/stripe/connect")
async def create_stripe_connect(user: User = Depends(get_current_user)):
    """Create Stripe Connect account for producer."""
    await require_producer(user)
    
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    try:
        if user_doc.get("stripe_account_id"):
            account_link = stripe.AccountLink.create(
                account=user_doc["stripe_account_id"],
                refresh_url=f"{FRONTEND_URL}/producer/stripe-refresh",
                return_url=f"{FRONTEND_URL}/producer/stripe-complete",
                type="account_onboarding"
            )
            return {"url": account_link.url}
        
        account = stripe.Account.create(
            type="express",
            email=user.email,
            capabilities={"transfers": {"requested": True}},
            metadata={"producer_id": user.user_id}
        )
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"stripe_account_id": account.id}}
        )
        
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{FRONTEND_URL}/producer/stripe-refresh",
            return_url=f"{FRONTEND_URL}/producer/stripe-complete",
            type="account_onboarding"
        )
        
        return {"url": account_link.url, "account_id": account.id}
        
    except stripe.error.StripeError as e:
        logger.error(f"[STRIPE CONNECT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stripe/status")
async def get_stripe_status(user: User = Depends(get_current_user)):
    """Get Stripe Connect status."""
    await require_producer(user)
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    stripe_account_id = user_doc.get("stripe_account_id")
    
    if not stripe_account_id:
        return {"connected": False, "status": "not_connected"}
    
    if not STRIPE_SECRET_KEY:
        return {"connected": True, "status": "unknown"}
    
    try:
        account = stripe.Account.retrieve(stripe_account_id)
        is_connected = account.charges_enabled and account.payouts_enabled
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "stripe_connect_status": "connected" if is_connected else "pending",
                "stripe_payouts_enabled": account.payouts_enabled,
                "stripe_charges_enabled": account.charges_enabled
            }}
        )
        
        return {
            "connected": is_connected,
            "status": "connected" if is_connected else "pending",
            "payouts_enabled": account.payouts_enabled,
            "charges_enabled": account.charges_enabled
        }
        
    except stripe.error.StripeError as e:
        return {"connected": False, "status": "error", "error": str(e)}


# Address Management
@router.get("/addresses")
async def get_producer_addresses(user: User = Depends(get_current_user)):
    """Get producer's addresses."""
    await require_producer(user)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "office_address": user_doc.get("office_address"),
        "warehouse_address": user_doc.get("warehouse_address")
    }


@router.put("/addresses")
async def update_producer_addresses(
    input: ProducerAddressInput,
    user: User = Depends(get_current_user)
):
    """Update producer's addresses."""
    await require_producer(user)
    
    update_data = {}
    if input.office_address:
        update_data["office_address"] = input.office_address
    if input.warehouse_address:
        update_data["warehouse_address"] = input.warehouse_address
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    return {"message": "Addresses updated"}


# Image Upload
@router.post("/upload/image")
async def upload_product_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload a product image."""
    await require_producer(user)
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{user.user_id}_{uuid.uuid4().hex[:12]}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {"url": f"/api/uploads/products/{filename}", "filename": filename}
