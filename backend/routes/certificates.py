"""
Certificate management and Translation endpoints.
Extracted from server.py.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import os
import logging
import qrcode
import io
import base64

from core.database import db
from core.models import User, CertificateInput, TranslateProductInput, TranslateCertificateInput
from core.auth import get_current_user, require_role
from core.constants import SUPPORTED_LANGUAGES

TRANSLATION_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'ru']
from services.translation import TranslationService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/certificates/products")
async def get_certified_products():
    """Get all products that have approved certificates, with cert info from products."""
    certs = await db.certificates.find(
        {"approved": True},
        {"_id": 0, "product_id": 1}
    ).to_list(500)

    if not certs:
        return {"products": []}

    product_ids = list({c["product_id"] for c in certs})
    products = await db.products.find(
        {"product_id": {"$in": product_ids}},
        {"_id": 0, "product_id": 1, "name": 1, "images": 1, "image_urls": 1,
         "country_origin": 1, "ingredients": 1, "category": 1, "store_id": 1,
         "certifications": 1}
    ).to_list(500)

    # Attach store name
    store_ids = list({p.get("store_id") for p in products if p.get("store_id")})
    stores = {}
    if store_ids:
        store_docs = await db.stores.find(
            {"store_id": {"$in": store_ids}},
            {"_id": 0, "store_id": 1, "name": 1}
        ).to_list(500)
        stores = {s["store_id"]: s["name"] for s in store_docs}

    result = []
    for p in products:
        result.append({
            "product_id": p["product_id"],
            "name": p.get("name", ""),
            "images": p.get("images") or p.get("image_urls") or [],
            "country_origin": p.get("country_origin", ""),
            "ingredients": p.get("ingredients", []),
            "producer_name": stores.get(p.get("store_id"), ""),
            "certifications": p.get("certifications") or [],
        })

    return {"products": result}


@router.get("/certificates/product/{product_id}")
async def get_certificate(product_id: str, lang: Optional[str] = None):
    """Get certificate for a product, optionally translated to the specified language"""
    cert = await db.certificates.find_one(
        {"product_id": product_id, "approved": True},
        {"_id": 0}
    )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Apply translation if language is specified
    if lang and lang in SUPPORTED_LANGUAGES:
        cert = await TranslationService.get_certificate_in_language(cert['certificate_id'], lang)
    
    return cert

@router.post("/certificates")
async def create_certificate(input: CertificateInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "importer", "admin"])
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Translation fields
        "source_language": input.source_language or "es",
        "translated_fields": {}
    }
    await db.certificates.insert_one(certificate)
    
    # Trigger background translation to all languages
    asyncio.create_task(translate_certificate_to_all(certificate_id, input.source_language or "es"))
    
    return certificate


@router.post("/certificates/auto-generate")
async def auto_generate_certificate(request: Request, user: User = Depends(get_current_user)):
    """Auto-generate a certificate when creating/publishing a product."""
    await require_role(user, ["producer", "importer", "admin"])
    body = await request.json()
    product_id = body.get("product_id")
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = await db.certificates.find_one({"product_id": product_id})
    if existing:
        return {"certificate_id": existing["certificate_id"], "status": "existing"}
    category = product.get("category_id", "")
    markets = [m["country_code"] for m in product.get("inventory_by_country", []) if m.get("active")]
    requirements = ["origin_verification", "quality_check"]
    if any(k in category.lower() for k in ["food", "snack", "oil", "jam", "drink"]):
        requirements.extend(["food_safety", "allergen_labeling", "nutritional_info"])
        if "US" in markets: requirements.append("fda_registration")
        if any(c in markets for c in ["ES", "FR", "DE", "IT", "PT"]): requirements.append("eu_health_mark")
        if "KR" in markets: requirements.append("mfds_registration")
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    cert_number = f"HSP-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"https://www.hispaloshop.com/certificate/{product_id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    certificate = {
        "certificate_id": certificate_id, "certificate_number": cert_number,
        "product_id": product_id, "product_name": product["name"], "seller_id": product.get("producer_id"),
        "certificate_type": "food_safety" if "food_safety" in requirements else "origin",
        "data": {"origin_country": product.get("country_origin", ""), "ingredients": product.get("ingredients", []), "allergens": product.get("allergens", []), "compliance_requirements": requirements, "target_markets": markets},
        "qr_code": qr_base64, "approved": False, "status": "auto_generated",
        "issue_date": datetime.now(timezone.utc).isoformat(), "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(), "source_language": product.get("source_language", "es"), "translated_fields": {},
    }
    await db.certificates.insert_one(certificate)
    await db.products.update_one({"product_id": product_id}, {"$set": {"certificate_id": certificate_id}})
    logger.info(f"[CERT] Auto-generated {cert_number} for {product_id}")
    return {"certificate_id": certificate_id, "certificate_number": cert_number, "requirements": requirements, "status": "auto_generated"}


@router.get("/certificates/{certificate_id}/qr")
async def download_certificate_qr(certificate_id: str):
    """Download certificate QR as PNG for printing on physical products."""
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0, "qr_code": 1, "product_id": 1})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    qr_base64 = cert.get("qr_code")
    if not qr_base64:
        # Backfill QR when old certificates don't have it yet
        product_id = cert.get("product_id")
        qr_url = f"https://www.hispaloshop.com/certificate/{product_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()
        await db.certificates.update_one(
            {"certificate_id": certificate_id},
            {"$set": {"qr_code": base64.b64encode(png_bytes).decode(), "qr_url": qr_url}},
        )
    else:
        png_bytes = base64.b64decode(qr_base64)

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="certificate-{certificate_id}-qr.png"'},
    )


async def translate_certificate_to_all(certificate_id: str, source_lang: str):
    """Background task to translate certificate to all languages"""
    try:
        for target_lang in TRANSLATION_LANGUAGES:
            if target_lang == source_lang:
                continue
            try:
                await TranslationService.get_certificate_in_language(certificate_id, target_lang)
            except Exception as e:
                logger.error(f"Error translating certificate {certificate_id} to {target_lang}: {e}")
    except Exception as e:
        logger.error(f"Background certificate translation failed: {e}")

# =============================================================================
# TRANSLATION API ENDPOINTS
# =============================================================================


@router.post("/translate/product")
async def translate_product(input: TranslateProductInput):
    """
    Trigger translation of a product to a specific language.
    Returns the translated product and caches the result.
    """
    if input.target_language not in TRANSLATION_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {TRANSLATION_LANGUAGES}")
    
    product = await TranslationService.get_product_in_language(input.product_id, input.target_language)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.post("/translate/certificate")
async def translate_certificate(input: TranslateCertificateInput):
    """
    Trigger translation of a certificate to a specific language.
    Returns the translated certificate and caches the result.
    """
    if input.target_language not in TRANSLATION_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {TRANSLATION_LANGUAGES}")
    
    cert = await TranslationService.get_certificate_in_language(input.certificate_id, input.target_language)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    return cert

@router.get("/translate/status/{product_id}")
async def get_translation_status(product_id: str):
    """Get translation status for a product - which languages are cached"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "source_language": 1, "translated_fields": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    source_lang = product.get('source_language', 'es')
    translated = list(product.get('translated_fields', {}).keys())
    
    return {
        "product_id": product_id,
        "source_language": source_lang,
        "translated_languages": translated,
        "available_languages": TRANSLATION_LANGUAGES,
        "missing_translations": [l for l in TRANSLATION_LANGUAGES if l != source_lang and l not in translated]
    }

@router.get("/translate/status-all")
async def get_all_translation_status():
    """Get translation status for all products"""
    products = await db.products.find(
        {"approved": True},
        {"_id": 0, "product_id": 1, "name": 1, "source_language": 1, "translated_fields": 1}
    ).to_list(1000)
    
    status = []
    for p in products:
        source_lang = p.get('source_language', 'en')
        translated = list(p.get('translated_fields', {}).keys())
        missing = [l for l in TRANSLATION_LANGUAGES if l != source_lang and l not in translated]
        status.append({
            "product_id": p["product_id"],
            "name": p.get("name", "Unknown"),
            "source_language": source_lang,
            "translated_count": len(translated),
            "missing_count": len(missing)
        })
    
    total_products = len(products)
    fully_translated = sum(1 for s in status if s["missing_count"] == 0)
    
    return {
        "total_products": total_products,
        "fully_translated": fully_translated,
        "products": status
    }

# Background translation task tracking
translation_jobs = {}

@router.post("/translate/batch-start")
async def start_batch_translation(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Start background job to translate all products to all languages (Admin only)"""
    await require_role(user, ["admin", "super_admin"])
    
    job_id = f"batch_{uuid.uuid4().hex[:8]}"
    translation_jobs[job_id] = {
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "progress": 0,
        "total": 0,
        "completed": 0,
        "errors": []
    }
    
    # Start background task
    background_tasks.add_task(run_batch_translation, job_id)
    
    return {"job_id": job_id, "status": "started"}

async def run_batch_translation(job_id: str):
    """Background task to translate all products"""
    try:
        # Get all products that need translation
        products = await db.products.find(
            {"approved": True},
            {"_id": 0, "product_id": 1, "source_language": 1, "translated_fields": 1}
        ).to_list(1000)
        
        translation_jobs[job_id]["total"] = len(products) * (len(TRANSLATION_LANGUAGES) - 1)
        completed = 0
        
        for product in products:
            product_id = product["product_id"]
            source_lang = product.get("source_language", "en")
            existing_translations = list(product.get("translated_fields", {}).keys())
            
            # Translate to each missing language
            for target_lang in TRANSLATION_LANGUAGES:
                if target_lang == source_lang or target_lang in existing_translations:
                    completed += 1
                    continue
                
                try:
                    await TranslationService.get_product_in_language(product_id, target_lang)
                    completed += 1
                    translation_jobs[job_id]["completed"] = completed
                    translation_jobs[job_id]["progress"] = int((completed / translation_jobs[job_id]["total"]) * 100)
                except Exception as e:
                    translation_jobs[job_id]["errors"].append(f"{product_id}/{target_lang}: {str(e)}")
                    completed += 1
        
        translation_jobs[job_id]["status"] = "completed"
        translation_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        translation_jobs[job_id]["status"] = "failed"
        translation_jobs[job_id]["error"] = str(e)

@router.get("/translate/batch-status/{job_id}")
async def get_batch_translation_status(job_id: str):
    """Get status of a batch translation job"""
    if job_id not in translation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return translation_jobs[job_id]

@router.post("/translate/product-all/{product_id}")
async def translate_product_to_all_languages(product_id: str):
    """Translate a single product to all supported languages"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    source_lang = product.get("source_language", "en")
    results = {"product_id": product_id, "translations": {}}
    
    for target_lang in TRANSLATION_LANGUAGES:
        if target_lang == source_lang:
            results["translations"][target_lang] = "skipped (source)"
            continue
        
        try:
            await TranslationService.get_product_in_language(product_id, target_lang)
            results["translations"][target_lang] = "success"
        except Exception as e:
            results["translations"][target_lang] = f"error: {str(e)}"
    
    return results

