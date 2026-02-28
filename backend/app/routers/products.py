"""
Product routes: CRUD, search, certificates.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from ..core.config import db, SUPPORTED_LANGUAGES, logger
from ..core.security import get_current_user
from ..models.user import User
from ..models.product import ProductInput, CertificateInput

router = APIRouter(tags=["Products"])


async def require_role(user: User, roles: List[str]):
    """Check if user has required role."""
    if user.role not in roles:
        raise HTTPException(status_code=403, detail=f"Access denied. Required: {roles}")


@router.get("/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    country: Optional[str] = None,
    certifications: Optional[str] = None,
    approved_only: bool = True,
    lang: Optional[str] = None
):
    """Get all products with optional filters and translation."""
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
        query["$or"] = [
            {"available_countries": country},
            {"available_countries": None},
            {"available_countries": {"$exists": False}}
        ]
    if certifications:
        cert_list = certifications.split(',')
        query["certifications"] = {"$in": cert_list}
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with country-specific pricing
    if country:
        for product in products:
            country_prices = product.get("country_prices", {})
            if country in country_prices:
                product["display_price"] = country_prices[country]
                product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
            else:
                product["display_price"] = product["price"]
                product["display_currency"] = "EUR"
    
    # Apply translations if language specified
    if lang and lang in SUPPORTED_LANGUAGES:
        for product in products:
            source_lang = product.get('source_language', 'es')
            if source_lang != lang:
                translated_fields = product.get('translated_fields', {})
                if lang in translated_fields:
                    for field, value in translated_fields[lang].items():
                        product[field] = value
    
    return products


@router.get("/products/{product_id}")
async def get_product(product_id: str, country: Optional[str] = None, lang: Optional[str] = None):
    """Get a single product with optional translation."""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Apply translation if requested
    if lang and lang in SUPPORTED_LANGUAGES:
        source_lang = product.get('source_language', 'es')
        if source_lang != lang:
            translated_fields = product.get('translated_fields', {})
            if lang in translated_fields:
                for field, value in translated_fields[lang].items():
                    product[field] = value
    
    # Add country-specific pricing
    if country:
        available_countries = product.get("available_countries", [])
        country_prices = product.get("country_prices", {})
        
        is_available = not available_countries or country in available_countries
        product["is_available_in_country"] = is_available
        
        if country in country_prices:
            product["display_price"] = country_prices[country]
            product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
        else:
            product["display_price"] = product["price"]
            product["display_currency"] = "EUR"
    
    return product


@router.post("/products")
async def create_product(input: ProductInput, user: User = Depends(get_current_user)):
    """Create a new product (producer/admin only)."""
    await require_role(user, ["producer", "admin"])
    
    if user.role == "producer" and not user.approved:
        raise HTTPException(status_code=403, detail="Producer account not approved")
    
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    slug = input.name.lower().replace(' ', '-')
    
    product = {
        "product_id": product_id,
        "producer_id": user.user_id,
        "producer_name": user.company_name or user.name if hasattr(user, 'company_name') else user.name,
        "category_id": input.category_id,
        "name": input.name,
        "slug": slug,
        "description": input.description,
        "price": input.price,
        "images": input.images,
        "country_origin": input.country_origin,
        "ingredients": input.ingredients,
        "certifications": input.certifications,
        "nutritional_info": input.nutritional_info,
        "approved": user.role == "admin",
        "visible": True,
        "stock": 0,
        "track_stock": True,
        "low_stock_threshold": 10,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product)
    product.pop("_id", None)
    return product


@router.put("/products/{product_id}")
async def update_product(product_id: str, input: ProductInput, user: User = Depends(get_current_user)):
    """Update a product."""
    await require_role(user, ["producer", "admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if user.role == "producer" and product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {
        "name": input.name,
        "description": input.description,
        "price": input.price,
        "category_id": input.category_id,
        "images": input.images,
        "country_origin": input.country_origin,
        "ingredients": input.ingredients,
        "certifications": input.certifications,
        "nutritional_info": input.nutritional_info,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return {"message": "Product updated"}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(get_current_user)):
    """Delete a product."""
    await require_role(user, ["producer", "admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if user.role == "producer" and product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.products.delete_one({"product_id": product_id})
    return {"message": "Product deleted"}


# Certificates
@router.get("/certificates/product/{product_id}")
async def get_product_certificates(product_id: str):
    """Get certificates for a product."""
    certificates = await db.certificates.find(
        {"product_id": product_id},
        {"_id": 0}
    ).to_list(50)
    return certificates


@router.post("/certificates")
async def create_certificate(
    product_id: str,
    input: CertificateInput,
    user: User = Depends(get_current_user)
):
    """Create a certificate for a product."""
    await require_role(user, ["producer", "admin"])
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if user.role == "producer" and product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    
    certificate = {
        "certificate_id": certificate_id,
        "product_id": product_id,
        "name": input.name,
        "issuing_authority": input.issuing_authority,
        "issue_date": input.issue_date,
        "expiry_date": input.expiry_date,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.certificates.insert_one(certificate)
    certificate.pop("_id", None)
    return certificate
