"""
Category and configuration routes.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
import uuid

from ..core.config import (
    db, SUPPORTED_COUNTRIES, SUPPORTED_LANGUAGES, 
    SUPPORTED_CURRENCIES, EXCHANGE_RATES
)
from ..core.security import get_current_user
from ..models.user import User
from ..models.product import CategoryInput

router = APIRouter(tags=["Config"])


@router.get("/categories")
async def get_categories():
    """Get all product categories."""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories


@router.post("/categories")
async def create_category(input: CategoryInput, user: User = Depends(get_current_user)):
    """Create a new category (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    slug = input.name.lower().replace(" ", "-")
    
    category = {
        "category_id": category_id,
        "name": input.name,
        "slug": slug,
        "icon": input.icon,
        "description": input.description
    }
    await db.categories.insert_one(category)
    return {"_id": 0, **category}


@router.put("/categories/{category_id}")
async def update_category(category_id: str, input: CategoryInput, user: User = Depends(get_current_user)):
    """Update category (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {"name": input.name, "icon": input.icon, "description": input.description}}
    )
    return {"message": "Category updated"}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(get_current_user)):
    """Delete category (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.categories.delete_one({"category_id": category_id})
    return {"message": "Category deleted"}


@router.get("/config/countries")
async def get_countries():
    """Get supported countries."""
    return SUPPORTED_COUNTRIES


@router.get("/config/languages")
async def get_languages():
    """Get supported languages."""
    return SUPPORTED_LANGUAGES


@router.get("/config/currencies")
async def get_currencies():
    """Get supported currencies."""
    return SUPPORTED_CURRENCIES


@router.get("/config/locale")
async def get_locale(
    country: Optional[str] = None,
    language: Optional[str] = None,
    user: Optional[User] = None
):
    """Get locale configuration for a country/language."""
    # Default to Spain/Spanish
    effective_country = country or "ES"
    effective_language = language or "es"
    
    country_info = SUPPORTED_COUNTRIES.get(effective_country, SUPPORTED_COUNTRIES["ES"])
    currency = country_info.get("currency", "EUR")
    
    return {
        "country": effective_country,
        "country_name": country_info.get("name", "Spain"),
        "language": effective_language,
        "currency": currency,
        "currency_symbol": SUPPORTED_CURRENCIES.get(currency, {}).get("symbol", "€"),
        "exchange_rate": EXCHANGE_RATES.get(currency, 1.0)
    }


@router.get("/exchange-rates")
async def get_exchange_rates():
    """Get all exchange rates."""
    return EXCHANGE_RATES


@router.get("/user/locale")
async def get_user_locale(user: User = Depends(get_current_user)):
    """Get user's locale preferences."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    locale = user_doc.get("locale", {})
    
    country = locale.get("country", user.country or "ES")
    language = locale.get("language", "es")
    currency = locale.get("currency", SUPPORTED_COUNTRIES.get(country, {}).get("currency", "EUR"))
    
    return {
        "country": country,
        "language": language,
        "currency": currency,
        "exchange_rate": EXCHANGE_RATES.get(currency, 1.0)
    }


@router.put("/user/locale")
async def update_user_locale(
    country: Optional[str] = None,
    language: Optional[str] = None,
    currency: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Update user's locale preferences."""
    update_data = {}
    
    if country:
        update_data["locale.country"] = country
        if not currency:
            update_data["locale.currency"] = SUPPORTED_COUNTRIES.get(country, {}).get("currency", "EUR")
    if language:
        update_data["locale.language"] = language
    if currency:
        update_data["locale.currency"] = currency
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    return {"message": "Locale updated", "locale": update_data}


@router.get("/user/address")
async def get_user_address(user: User = Depends(get_current_user)):
    """Get user's saved address."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {"address": user_doc.get("address")}


@router.put("/user/address")
async def update_user_address(
    street: str,
    city: str,
    postal_code: str,
    country: str,
    phone: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Update user's saved address."""
    address = {
        "street": street,
        "city": city,
        "postal_code": postal_code,
        "country": country,
        "phone": phone
    }
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"address": address}}
    )
    
    return {"message": "Address updated", "address": address}
