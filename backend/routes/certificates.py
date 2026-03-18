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
from utils.images import extract_product_image

logger = logging.getLogger(__name__)
router = APIRouter()


def _public_product_filter() -> dict:
    return {
        "$or": [
            {"status": "active"},
            {"approved": True},
            {"status": "approved"},
        ]
    }


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
        {"product_id": {"$in": product_ids}, **_public_product_filter()},
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

@router.get("/certificates/{cert_id}/verify")
async def verify_certificate(cert_id: str, lang: Optional[str] = "es"):
    """
    Public verification endpoint for certificate QR codes.
    Returns certificate data translated to the requested language.
    """
    from services.translation import CERT_UI_LABELS

    # Search by certificate_id or product_id across both collections
    cert = await db.certificates.find_one(
        {"$or": [{"certificate_id": cert_id}, {"product_id": cert_id}]},
        {"_id": 0}
    )
    if not cert:
        cert = await db.product_certificates.find_one(
            {"$or": [{"certificate_id": cert_id}, {"product_id": cert_id}]},
            {"_id": 0}
        )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Get product info for enrichment
    product = await db.products.find_one(
        {"product_id": cert.get("product_id")},
        {"_id": 0, "name": 1, "images": 1, "description": 1, "country_origin": 1}
    )

    # Get producer info
    producer = await db.users.find_one(
        {"user_id": cert.get("producer_id")},
        {"_id": 0, "company_name": 1, "full_name": 1}
    )

    # Translate if not Spanish
    target_lang = lang if lang in CERT_UI_LABELS else "es"
    if target_lang != "es" and cert.get("certificate_id"):
        translated = await TranslationService.get_certificate_in_language(cert["certificate_id"], target_lang)
        if translated:
            cert = translated

    # Ensure UI labels are present
    if "ui_labels" not in cert:
        cert["ui_labels"] = CERT_UI_LABELS.get(target_lang, CERT_UI_LABELS["es"])

    # Enrich response
    cert["verified"] = True
    cert["language"] = target_lang
    if product:
        cert.setdefault("product_image", extract_product_image(product))
        if not cert.get("product_name"):
            cert["product_name"] = product.get("name", "")
        if not cert.get("country_origin"):
            cert["country_origin"] = product.get("country_origin", "")
    if producer:
        cert["producer_name"] = producer.get("company_name") or producer.get("full_name", "")

    return cert


@router.post("/certificates")
async def create_certificate(input: CertificateInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "importer", "admin"])
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_url = f"https://www.hispaloshop.com/certificate/{input.product_id}"
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
        "qr_url": qr_url,
        "qr_code": qr_base64,
        "approved": user.role == "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Translation fields
        "source_language": input.source_language or "es",
        "translated_fields": {}
    }
    await db.certificates.insert_one(certificate)
    
    # Trigger background translation to all languages
    from services.background import create_safe_task
    create_safe_task(translate_certificate_to_all(certificate_id, input.source_language or "es"), name="cert_translate")
    
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


@router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(certificate_id: str):
    """Generate and download a PDF certificate with QR code."""
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    product_id = cert.get("product_id", "")
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("CertTitle", parent=styles["Title"], fontSize=22, textColor=colors.HexColor("#0c0a09"), spaceAfter=6)
    subtitle_style = ParagraphStyle("CertSub", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#78716c"), alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle("CertH2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#0c0a09"), spaceBefore=16, spaceAfter=6)
    body_style = ParagraphStyle("CertBody", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#44403c"), leading=14)

    elements = []

    # Title
    elements.append(Paragraph("CERTIFICADO DIGITAL", title_style))
    elements.append(Paragraph("HispaloShop — Ficha de confianza y trazabilidad", subtitle_style))

    cert_number = cert.get("certificate_number", cert.get("certificate_id", ""))
    issued = cert.get("issue_date") or cert.get("created_at") or ""
    elements.append(Paragraph(f"<b>N.º certificado:</b> {cert_number}", body_style))
    elements.append(Paragraph(f"<b>Fecha emisión:</b> {issued[:10] if issued else '—'}", body_style))
    elements.append(Spacer(1, 10))

    # Product info
    product_name = cert.get("product_name") or (product.get("name") if product else "—")
    elements.append(Paragraph("Producto", heading_style))
    elements.append(Paragraph(f"<b>{product_name}</b>", body_style))
    origin = (product or {}).get("country_origin") or cert.get("data", {}).get("origin_country", "")
    if origin:
        elements.append(Paragraph(f"Origen: {origin}", body_style))

    # Certifications
    certs_list = (product or {}).get("certifications") or cert.get("data", {}).get("certifications") or []
    if certs_list:
        elements.append(Paragraph("Certificaciones", heading_style))
        elements.append(Paragraph(", ".join(certs_list), body_style))

    # Ingredients
    ingredients = (product or {}).get("ingredients") or cert.get("data", {}).get("ingredients") or []
    if ingredients:
        elements.append(Paragraph("Ingredientes", heading_style))
        ing_text = ", ".join(i if isinstance(i, str) else i.get("name", "") for i in ingredients)
        elements.append(Paragraph(ing_text, body_style))

    # Allergens
    allergens = (product or {}).get("allergens") or cert.get("data", {}).get("allergens") or []
    if allergens:
        elements.append(Paragraph("Alérgenos", heading_style))
        elements.append(Paragraph(", ".join(allergens), body_style))

    # Nutritional info
    nutrition = (product or {}).get("nutritional_info") or cert.get("data", {}).get("nutritional_info") or {}
    if nutrition and isinstance(nutrition, dict):
        elements.append(Paragraph("Información nutricional (por 100 g)", heading_style))
        table_data = [["Nutriente", "Valor"]]
        for k, v in nutrition.items():
            table_data.append([k.replace("_", " ").capitalize(), str(v)])
        t = Table(table_data, colWidths=[8 * cm, 5 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0c0a09")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafaf9")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)

    # QR code
    qr_b64 = cert.get("qr_code")
    if qr_b64:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Verificación", heading_style))
        qr_bytes = base64.b64decode(qr_b64)
        qr_buf = io.BytesIO(qr_bytes)
        qr_image = RLImage(qr_buf, width=3 * cm, height=3 * cm)
        elements.append(qr_image)
        verify_url = cert.get("qr_url") or f"https://www.hispaloshop.com/certificate/{product_id}"
        elements.append(Paragraph(f"<font size=8 color='#78716c'>{verify_url}</font>", body_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()

    safe_name = product_name.replace(" ", "_")[:40] if product_name else certificate_id
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="certificado-{safe_name}.pdf"'},
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

