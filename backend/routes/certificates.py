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
from core.constants import SUPPORTED_LANGUAGES, TRANSLATION_LANGUAGES
from services.translation import TranslationService
from utils.images import extract_product_image

logger = logging.getLogger(__name__)
router = APIRouter()


def _cert_url(product_id: str) -> str:
    """Build smart certificate verification URL that auto-detects viewer's language via Accept-Language."""
    base = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com").rstrip("/")
    return f"{base}/certificate/{product_id}?scan=1&auto_lang=1"


def _generate_qr_png(data_url: str, box_size: int = 10, border: int = 4) -> bytes:
    """Generate QR code as PNG bytes with configurable resolution."""
    qr = qrcode.QRCode(version=1, box_size=box_size, border=border)
    qr.add_data(data_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _generate_qr_svg(data_url: str, box_size: int = 10, border: int = 4) -> str:
    """Generate QR code as SVG string for vector/print use."""
    import qrcode.image.svg
    qr = qrcode.QRCode(version=1, box_size=box_size, border=border)
    qr.add_data(data_url)
    qr.make(fit=True)
    factory = qrcode.image.svg.SvgPathImage
    img = qr.make_image(image_factory=factory)
    buffer = io.BytesIO()
    img.save(buffer)
    return buffer.getvalue().decode("utf-8")


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

    product_ids = list({c["product_id"] for c in certs if c.get("product_id")})
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
        stores = {s.get("store_id", ""): s.get("name", "") for s in store_docs}

    result = []
    for p in products:
        result.append({
            "product_id": p.get("product_id", ""),
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
async def verify_certificate(cert_id: str, lang: Optional[str] = "es", request: Request = None):
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
    target_collection = db.certificates
    if not cert:
        cert = await db.product_certificates.find_one(
            {"$or": [{"certificate_id": cert_id}, {"product_id": cert_id}]},
            {"_id": 0}
        )
        target_collection = db.product_certificates
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Increment verification scan counter + record detailed analytics (fire-and-forget)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        await target_collection.update_one(
            {"$or": [{"certificate_id": cert_id}, {"product_id": cert_id}]},
            {"$inc": {"scan_count": 1}, "$set": {"last_scanned_at": now_iso}},
        )
    except Exception:
        pass

    # Section 1.4b: detailed scan analytics for producer dashboard
    try:
        # Detect country from IP (reuse the geo helper from config.py)
        from routes.config import _client_ip, _hash_ip
        scan_ip = _client_ip(request) if hasattr(request, 'headers') else ""
        geo_country = None
        if scan_ip:
            try:
                cached_geo = await db.ip_geo_cache.find_one({"ip_hash": _hash_ip(scan_ip)}, {"_id": 0, "country": 1})
                geo_country = (cached_geo or {}).get("country")
            except Exception:
                pass
        asyncio.create_task(db.certificate_scans.insert_one({
            "product_id": cert.get("product_id"),
            "certificate_id": cert.get("certificate_id") or cert_id,
            "scanned_at": now_iso,
            "language": lang,
            "country": geo_country,
            "user_agent": (request.headers.get("user-agent") or "")[:200] if hasattr(request, 'headers') else None,
        }))
    except Exception:
        pass  # Analytics must never block the response

    # Get product info for enrichment
    product = await db.products.find_one(
        {"product_id": cert.get("product_id")},
        {"_id": 0, "name": 1, "images": 1, "description": 1, "short_description": 1, "country_origin": 1, "region": 1, "ingredients": 1, "allergens": 1, "nutritional_info": 1, "nutrition_info": 1, "certifications": 1, "producer_name": 1}
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

    # Enrich with store info for producer story
    store = await db.store_profiles.find_one(
        {"producer_id": cert.get("producer_id") or cert.get("seller_id")},
        {"_id": 0, "name": 1, "slug": 1, "story": 1, "tagline": 1, "logo": 1},
    )
    if store:
        cert["store_info"] = store

    return cert


@router.post("/certificates")
async def create_certificate(input: CertificateInput, user: User = Depends(get_current_user)):
    await require_role(user, ["producer", "importer", "admin"])
    product = await db.products.find_one({"product_id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    qr_url = _cert_url(input.product_id)
    qr_base64 = base64.b64encode(_generate_qr_png(qr_url)).decode()
    certificate = {
        "certificate_id": certificate_id,
        "product_id": input.product_id,
        "product_name": product["name"],
        "data": {
            "ingredients": product.get("ingredients", []),
            "allergens": product.get("allergens", []),
            "nutritional_info": product.get("nutritional_info") or product.get("nutrition_info"),
            "certifications": product.get("certifications", []),
            "origin_country": product.get("country_origin", ""),
            **(input.data or {}),
        },
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
    qr_base64 = base64.b64encode(_generate_qr_png(_cert_url(product_id))).decode()
    certificate = {
        "certificate_id": certificate_id, "certificate_number": cert_number,
        "product_id": product_id, "product_name": product["name"], "seller_id": product.get("producer_id"),
        "certificate_type": "food_safety" if "food_safety" in requirements else "origin",
        "data": {"origin_country": product.get("country_origin", ""), "ingredients": product.get("ingredients", []), "allergens": product.get("allergens", []), "nutritional_info": product.get("nutritional_info") or product.get("nutrition_info"), "certifications": product.get("certifications", []), "compliance_requirements": requirements, "target_markets": markets},
        "qr_code": qr_base64, "approved": False, "status": "pending_review",
        "issue_date": datetime.now(timezone.utc).isoformat(), "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(), "source_language": product.get("source_language", "es"), "translated_fields": {},
    }
    await db.certificates.insert_one(certificate)
    await db.products.update_one({"product_id": product_id}, {"$set": {"certificate_id": certificate_id}})
    logger.info(f"[CERT] Auto-generated {cert_number} for {product_id}")
    return {"certificate_id": certificate_id, "certificate_number": cert_number, "requirements": requirements, "status": "pending_review"}


@router.get("/certificates/{certificate_id}/qr")
async def download_certificate_qr(
    certificate_id: str,
    format: str = "png",
    resolution: str = "standard",
    user: User = Depends(get_current_user),
):
    """
    Download certificate QR code. Restricted to certificate owner (producer) and admins.

    Query params:
      - format: "png" (default) or "svg"
      - resolution: "standard" (~330px) or "hires" (1200px+ for print)
    """
    cert = await db.certificates.find_one(
        {"certificate_id": certificate_id},
        {"_id": 0, "qr_code": 1, "product_id": 1, "seller_id": 1, "producer_id": 1},
    )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # --- Access control: only owner or admin ---
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to download QR")
    cert_owner_id = cert.get("seller_id") or cert.get("producer_id")
    is_owner = cert_owner_id and cert_owner_id == user.user_id
    is_admin = user.role in ("admin", "superadmin")
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Only the product owner or admin can download the QR")

    product_id = cert.get("product_id", "")
    if not product_id:
        raise HTTPException(status_code=404, detail="Certificate has no linked product")
    qr_url = _cert_url(product_id)

    # --- SVG format ---
    if format == "svg":
        svg_content = _generate_qr_svg(qr_url, box_size=10, border=4)
        return Response(
            content=svg_content,
            media_type="image/svg+xml",
            headers={"Content-Disposition": f'attachment; filename="certificate-{certificate_id}-qr.svg"'},
        )

    # --- PNG format ---
    if resolution == "hires":
        # High resolution for print: box_size=40 → ~1200px+
        png_bytes = _generate_qr_png(qr_url, box_size=40, border=4)
    else:
        # Standard resolution: use cached base64 or generate fresh
        qr_base64 = cert.get("qr_code")
        if qr_base64:
            png_bytes = base64.b64decode(qr_base64)
        else:
            png_bytes = _generate_qr_png(qr_url)
            await db.certificates.update_one(
                {"certificate_id": certificate_id},
                {"$set": {"qr_code": base64.b64encode(png_bytes).decode(), "qr_url": qr_url}},
            )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="certificate-{certificate_id}-qr.png"'},
    )


@router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(
    certificate_id: str,
    user: User = Depends(get_current_user),
):
    """Generate and download a PDF certificate. Restricted to certificate owner and admins."""
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # --- Access control: only owner or admin ---
    cert_owner_id = cert.get("seller_id") or cert.get("producer_id")
    is_owner = cert_owner_id and cert_owner_id == user.user_id
    is_admin = user.role in ("admin", "superadmin")
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Only the product owner or admin can download the PDF")

    product_id = cert.get("product_id", "")
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})

    # Fetch producer + store info
    producer_id = cert.get("seller_id") or cert.get("producer_id")
    producer = await db.users.find_one(
        {"user_id": producer_id},
        {"_id": 0, "company_name": 1, "name": 1, "full_name": 1, "profile_image": 1},
    ) if producer_id else None
    store = await db.store_profiles.find_one(
        {"producer_id": producer_id},
        {"_id": 0, "name": 1, "story": 1, "tagline": 1, "logo": 1},
    ) if producer_id else None

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            Image as RLImage, HRFlowable, KeepTogether,
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed")

    # --- Color palette (stone) ---
    STONE_950 = colors.HexColor("#0c0a09")
    STONE_700 = colors.HexColor("#44403c")
    STONE_500 = colors.HexColor("#78716c")
    STONE_300 = colors.HexColor("#d6d3d1")
    STONE_200 = colors.HexColor("#e7e5e4")
    STONE_100 = colors.HexColor("#f5f5f4")
    STONE_50 = colors.HexColor("#fafaf9")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )
    page_w = A4[0] - 4 * cm  # usable width
    styles = getSampleStyleSheet()

    # --- Styles ---
    s_eyebrow = ParagraphStyle("Eyebrow", parent=styles["Normal"], fontSize=7, textColor=STONE_500,
                               spaceAfter=2, tracking=1.2, leading=10)
    s_title = ParagraphStyle("PdfTitle", parent=styles["Title"], fontSize=24, textColor=STONE_950,
                             spaceAfter=4, leading=28)
    s_subtitle = ParagraphStyle("PdfSub", parent=styles["Normal"], fontSize=10, textColor=STONE_500,
                                alignment=TA_CENTER, spaceAfter=14)
    s_h2 = ParagraphStyle("PdfH2", parent=styles["Heading2"], fontSize=12, textColor=STONE_950,
                          spaceBefore=18, spaceAfter=6, leading=16)
    s_body = ParagraphStyle("PdfBody", parent=styles["Normal"], fontSize=9.5, textColor=STONE_700, leading=14)
    s_small = ParagraphStyle("PdfSmall", parent=styles["Normal"], fontSize=8, textColor=STONE_500, leading=11)
    s_badge = ParagraphStyle("PdfBadge", parent=styles["Normal"], fontSize=9, textColor=STONE_950, leading=12)
    s_center = ParagraphStyle("PdfCenter", parent=s_body, alignment=TA_CENTER)

    elements = []

    def _hr():
        elements.append(Spacer(1, 6))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=STONE_200, spaceAfter=6))

    # ═══════════════════════════════════════════
    # HEADER — Premium band
    # ═══════════════════════════════════════════
    header_data = [[
        Paragraph("<b>HISPALOSHOP</b>", ParagraphStyle("HdrL", parent=s_body, fontSize=8, textColor=colors.white)),
        Paragraph("CERTIFICADO DIGITAL DE PRODUCTO", ParagraphStyle("HdrR", parent=s_body, fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
    ]]
    header_table = Table(header_data, colWidths=[page_w * 0.5, page_w * 0.5])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), STONE_950),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("ROUNDEDCORNERS", [6, 6, 0, 0]),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 16))

    # ═══════════════════════════════════════════
    # CERTIFICATE META
    # ═══════════════════════════════════════════
    cert_number = cert.get("certificate_number", cert.get("certificate_id", ""))
    issued = cert.get("issue_date") or cert.get("created_at") or ""
    issued_fmt = issued[:10] if issued else "—"
    scan_count = cert.get("scan_count", 0)

    meta_left = f"<b>N.º</b> {cert_number}<br/><b>Emisión</b> {issued_fmt}"
    meta_right = f"<b>Verificaciones</b> {scan_count}"
    meta_data = [[Paragraph(meta_left, s_small), Paragraph(meta_right, ParagraphStyle("MetaR", parent=s_small, alignment=TA_RIGHT))]]
    meta_table = Table(meta_data, colWidths=[page_w * 0.65, page_w * 0.35])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), STONE_50),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # ═══════════════════════════════════════════
    # PRODUCT SECTION — photo + name + origin
    # ═══════════════════════════════════════════
    product_name = cert.get("product_name") or (product.get("name") if product else "—")
    origin = (product or {}).get("country_origin") or cert.get("data", {}).get("origin_country", "")

    # Try to fetch product image
    product_image_url = extract_product_image(product) if product else None
    product_img_cell = ""
    if product_image_url:
        try:
            import urllib.request
            img_data = urllib.request.urlopen(product_image_url, timeout=5).read()
            img_buf = io.BytesIO(img_data)
            product_img_cell = RLImage(img_buf, width=3.5 * cm, height=3.5 * cm, kind="proportional")
        except Exception:
            product_img_cell = ""

    product_text = f"<b>{product_name}</b>"
    if origin:
        product_text += f"<br/><font color='#78716c'>Origen: {origin}</font>"

    if product_img_cell:
        prod_data = [[product_img_cell, Paragraph(product_text, ParagraphStyle("ProdName", parent=s_body, fontSize=14, leading=20))]]
        prod_table = Table(prod_data, colWidths=[4 * cm, page_w - 4 * cm])
        prod_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(prod_table)
    else:
        elements.append(Paragraph(product_text, ParagraphStyle("ProdNameOnly", parent=s_body, fontSize=16, leading=22)))

    _hr()

    # ═══════════════════════════════════════════
    # CERTIFICATIONS — badge pills
    # ═══════════════════════════════════════════
    certs_list = (product or {}).get("certifications") or cert.get("data", {}).get("certifications") or []
    if certs_list:
        elements.append(Paragraph("CERTIFICACIONES", s_eyebrow))
        badge_text = " &nbsp;·&nbsp; ".join(f"<b>{c}</b>" for c in certs_list)
        elements.append(Paragraph(badge_text, s_badge))
        _hr()

    # ═══════════════════════════════════════════
    # ALLERGENS
    # ═══════════════════════════════════════════
    allergens = (product or {}).get("allergens") or cert.get("data", {}).get("allergens") or []
    if allergens:
        elements.append(Paragraph("ALÉRGENOS", s_eyebrow))
        allergen_text = ", ".join(f"<b>{a}</b>" for a in allergens)
        elements.append(Paragraph(allergen_text, ParagraphStyle("Allergen", parent=s_body, textColor=colors.HexColor("#991b1b"))))
        _hr()

    # ═══════════════════════════════════════════
    # INGREDIENTS
    # ═══════════════════════════════════════════
    ingredients = (product or {}).get("ingredients") or cert.get("data", {}).get("ingredients") or []
    if ingredients:
        elements.append(Paragraph("INGREDIENTES", s_eyebrow))
        ing_text = ", ".join(i if isinstance(i, str) else i.get("name", "") for i in ingredients)
        elements.append(Paragraph(ing_text, s_body))

        # Ingredient origins (traceability)
        origins = cert.get("data", {}).get("ingredient_origins", "")
        if origins:
            elements.append(Spacer(1, 4))
            elements.append(Paragraph(f"<i>Trazabilidad: {origins}</i>", s_small))
        _hr()

    # ═══════════════════════════════════════════
    # NUTRITIONAL INFO — premium table
    # ═══════════════════════════════════════════
    nutrition = (product or {}).get("nutritional_info") or cert.get("data", {}).get("nutritional_info") or {}
    _PDF_UNITS = {
        "calories": "kcal", "energy": "kcal", "protein": "g", "carbs": "g",
        "carbohydrates": "g", "sugars": "g", "fat": "g", "saturated_fat": "g",
        "fiber": "g", "sodium": "mg", "salt": "g",
    }
    if nutrition and isinstance(nutrition, dict):
        elements.append(Paragraph("INFORMACIÓN NUTRICIONAL (por 100 g)", s_eyebrow))
        elements.append(Spacer(1, 4))
        table_data = [["Nutriente", "Valor"]]
        for k, v in nutrition.items():
            unit = _PDF_UNITS.get(k.lower().replace(" ", "_"), "")
            label = k.replace("_", " ").capitalize()
            # Indent sub-nutrients
            if k.lower() in ("sugars", "saturated_fat"):
                label = f"  — {label}"
            table_data.append([label, f"{v} {unit}".strip()])
        t = Table(table_data, colWidths=[page_w * 0.6, page_w * 0.4])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), STONE_950),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("TEXTCOLOR", (0, 1), (-1, -1), STONE_700),
            ("GRID", (0, 0), (-1, -1), 0.4, STONE_200),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, STONE_50]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        elements.append(t)
        _hr()

    # ═══════════════════════════════════════════
    # PRODUCER STORY — name, tagline, story excerpt
    # ═══════════════════════════════════════════
    producer_name = ""
    if producer:
        producer_name = producer.get("company_name") or producer.get("full_name") or producer.get("name", "")
    store_name = (store or {}).get("name", "")
    store_tagline = (store or {}).get("tagline", "")
    store_story = (store or {}).get("story", "")

    if producer_name or store_name:
        elements.append(Paragraph("PRODUCTOR", s_eyebrow))
        elements.append(Paragraph(f"<b>{store_name or producer_name}</b>", ParagraphStyle("ProdName2", parent=s_body, fontSize=11, leading=15)))
        if store_tagline:
            elements.append(Paragraph(f"<i>{store_tagline}</i>", s_small))
        if store_story:
            # Show first 300 chars of story
            story_excerpt = store_story[:300].rsplit(" ", 1)[0] + ("..." if len(store_story) > 300 else "")
            elements.append(Spacer(1, 4))
            elements.append(Paragraph(story_excerpt, s_body))
        _hr()

    # ═══════════════════════════════════════════
    # QR CODE + VERIFICATION — centered block
    # ═══════════════════════════════════════════
    qr_url = cert.get("qr_url") or _cert_url(product_id)
    # Generate high-quality QR for PDF (box_size=20 → ~600px, crisp in print)
    qr_png_bytes = _generate_qr_png(qr_url, box_size=20, border=3)
    qr_buf = io.BytesIO(qr_png_bytes)
    qr_image = RLImage(qr_buf, width=3.5 * cm, height=3.5 * cm)

    qr_block = [
        [qr_image],
        [Paragraph(f"<font size=7 color='#78716c'>Escanea para verificar este certificado</font>", s_center)],
        [Paragraph(f"<font size=6 color='#a8a29e'>{qr_url}</font>", s_center)],
    ]
    qr_table = Table(qr_block, colWidths=[page_w])
    qr_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(qr_table)

    # ═══════════════════════════════════════════
    # FOOTER — legal note
    # ═══════════════════════════════════════════
    elements.append(Spacer(1, 14))
    footer_data = [[Paragraph(
        "Este certificado ha sido generado por HispaloShop y valida la información declarada por el productor. "
        "Los datos nutricionales y de alérgenos son responsabilidad del productor.",
        ParagraphStyle("Footer", parent=s_small, fontSize=7, textColor=STONE_500),
    )]]
    footer_table = Table(footer_data, colWidths=[page_w])
    footer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), STONE_50),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(footer_table)

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


# NOTE: Translate endpoints not called from frontend (as of 2026-03-24).
# Protected with auth to prevent abuse.
@router.post("/translate/product")
async def translate_product(input: TranslateProductInput, user: User = Depends(get_current_user)):
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
async def translate_certificate(input: TranslateCertificateInput, user: User = Depends(get_current_user)):
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

@router.post("/translate/on-demand")
async def translate_on_demand(
    request: Request,
    user: User = Depends(get_current_user),
):
    """
    Generic on-demand text translation (section 1.4b).

    Used by future "Translate" button in feed posts, reviews, bios.
    Rate limited: 20 req/min per user. Uses the existing TranslationService
    with 3-tier cache (Redis → MongoDB → Google API).

    Request body: { "text": "...", "source_lang": "es", "target_lang": "ko" }
    Response:     { "translated": "...", "from_cache": false, "confidence": "high" }
    """
    body = await request.json()
    text = (body.get("text") or "").strip()
    source_lang = (body.get("source_lang") or "es").strip()[:5]
    target_lang = (body.get("target_lang") or "en").strip()[:5]

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text exceeds 5000 character limit")
    if target_lang not in TRANSLATION_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language. Supported: {TRANSLATION_LANGUAGES}")
    if source_lang == target_lang:
        return {"translated": text, "from_cache": True, "confidence": "high"}

    # Check cache first
    cached = await db.translation_cache.find_one(
        {"source_text": text, "source_lang": source_lang, f"translations.{target_lang}": {"$exists": True}},
        {"_id": 0, f"translations.{target_lang}": 1},
    )
    if cached:
        translated_text = cached.get("translations", {}).get(target_lang)
        if translated_text:
            # Increment usage count (fire-and-forget)
            asyncio.create_task(db.translation_cache.update_one(
                {"source_text": text, "source_lang": source_lang},
                {"$inc": {"usage_count": 1}, "$set": {"last_used": datetime.now(timezone.utc).isoformat()}},
            ))
            return {"translated": translated_text, "from_cache": True, "confidence": "high"}

    # Cache miss — translate via TranslationService (Google API with its own cache)
    try:
        translated = await TranslationService.translate_text(text, source_lang, target_lang)
        # Save in our on-demand cache for reuse
        await db.translation_cache.update_one(
            {"source_text": text, "source_lang": source_lang},
            {
                "$set": {
                    f"translations.{target_lang}": translated,
                    "last_used": datetime.now(timezone.utc).isoformat(),
                },
                "$setOnInsert": {
                    "source_text": text,
                    "source_lang": source_lang,
                    "category": "on_demand",
                    "confidence": "high",
                    "usage_count": 1,
                    "first_seen": datetime.now(timezone.utc).isoformat(),
                },
            },
            upsert=True,
        )
        return {"translated": translated, "from_cache": False, "confidence": "high"}
    except Exception as exc:
        logger.warning("[TRANSLATE] On-demand translation failed: %s", exc)
        return {"translated": text, "from_cache": False, "confidence": "low"}


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
            "product_id": p.get("product_id", ""),
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
            product_id = product.get("product_id", "")
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
async def get_batch_translation_status(job_id: str, user: User = Depends(get_current_user)):
    """Get status of a batch translation job (admin only)"""
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    if job_id not in translation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return translation_jobs[job_id]

@router.post("/translate/product-all/{product_id}")
async def translate_product_to_all_languages(product_id: str, user: User = Depends(get_current_user)):
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

    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    if job_id not in translation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return translation_jobs[job_id]

@router.post("/translate/product-all/{product_id}")
async def translate_product_to_all_languages(product_id: str, user: User = Depends(get_current_user)):
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


# ═══════════════════════════════════════════════════════════════════════════════
# DIGITAL CERTIFICATES API — Sección 1.4b
# ═══════════════════════════════════════════════════════════════════════════════

from core.models import CertificateType, DigitalCertificate, DigitalCertificateCreateInput
from services.certificate_generator import (
    certificate_generator, 
    auto_generate_certificates_for_product,
    get_product_certificates,
    track_scan,
    get_scan_analytics
)


@router.get("/digital-certificates")
async def list_digital_certificates(
    user: User = Depends(get_current_user),
    product_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Lista los certificados digitales del productor.
    
    Query params:
      - product_id: Filtrar por producto específico
      - status: Filtrar por estado (active, revoked, expired)
    """
    await require_role(user, ["producer", "importer", "admin"])
    
    query = {"producer_id": user.user_id}
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    
    certs = await db.digital_certificates.find(query).to_list(length=500)
    
    # Enriquecer con info de producto
    product_ids = list(set(c["product_id"] for c in certs if c.get("product_id")))
    products = {}
    if product_ids:
        product_docs = await db.products.find(
            {"product_id": {"in": product_ids}},
            {"_id": 0, "product_id": 1, "name": 1, "images": 1}
        ).to_list(len(product_ids))
        products = {p["product_id"]: p for p in product_docs}
    
    result = []
    for cert in certs:
        cert.pop("_id", None)
        product = products.get(cert.get("product_id", ""), {})
        cert["product"] = {
            "name": product.get("name", ""),
            "image": product.get("images", [None])[0] if product.get("images") else None
        }
        result.append(cert)
    
    return {"certificates": result}


@router.get("/digital-certificates/{certificate_id}")
async def get_digital_certificate(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Obtiene detalle de un certificado digital."""
    await require_role(user, ["producer", "importer", "admin"])
    
    cert = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Verificar ownership
    if cert.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cert.pop("_id", None)
    
    # Enriquecer con producto
    product = await db.products.find_one(
        {"product_id": cert.get("product_id")},
        {"_id": 0, "name": 1, "images": 1, "price": 1, "currency": 1}
    )
    cert["product"] = product
    
    return cert


@router.post("/digital-certificates/generate")
async def generate_digital_certificate(
    input: DigitalCertificateCreateInput,
    user: User = Depends(get_current_user)
):
    """
    Genera manualmente un certificado digital para un producto.
    Normalmente los certificados se generan automáticamente al crear/actualizar producto.
    """
    await require_role(user, ["producer", "importer", "admin"])
    
    # Verificar producto existe y pertenece al usuario
    product = await db.products.find_one({"product_id": input.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verificar si ya existe
    cert_id = f"cert_{input.product_id}_{input.certificate_type.value}"
    existing = await db.digital_certificates.find_one({"certificate_id": cert_id})
    if existing:
        raise HTTPException(status_code=409, detail="Certificate already exists for this type")
    
    # Generar
    certs = await auto_generate_certificates_for_product(product, user.user_id)
    created = [c for c in certs if c.certificate_id == cert_id]
    
    if created:
        return {"certificate": created[0].model_dump(), "status": "created"}
    else:
        raise HTTPException(status_code=500, detail="Failed to create certificate")


@router.get("/digital-certificates/{certificate_id}/qr.png")
async def download_certificate_qr_png(
    certificate_id: str,
    size: int = 300,
    user: User = Depends(get_current_user)
):
    """
    Descarga el QR code del certificado en formato PNG.
    
    Query params:
      - size: Tamaño en píxeles (default 300)
    """
    await require_role(user, ["producer", "importer", "admin"])
    
    cert = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Verificar ownership
    if cert.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        png_bytes = certificate_generator.generate_png(certificate_id, size=size, include_frame=True)
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'attachment; filename="certificate-{certificate_id}-qr.png"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        logger.error(f"[DigitalCertificates] Error generando QR PNG: {e}")
        raise HTTPException(status_code=500, detail="Error generating QR code")


@router.get("/digital-certificates/{certificate_id}/qr.svg")
async def download_certificate_qr_svg(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Descarga el QR code del certificado en formato SVG (vectorial)."""
    await require_role(user, ["producer", "importer", "admin"])
    
    cert = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        svg_content = certificate_generator.generate_svg(certificate_id)
        return Response(
            content=svg_content,
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'attachment; filename="certificate-{certificate_id}-qr.svg"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        logger.error(f"[DigitalCertificates] Error generando QR SVG: {e}")
        raise HTTPException(status_code=500, detail="Error generating QR code")


@router.get("/digital-certificates/{certificate_id}/pdf")
async def download_certificate_pdf(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Genera y descarga el certificado digital en formato PDF premium."""
    await require_role(user, ["producer", "importer", "admin"])
    
    cert_doc = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert_doc:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert_doc.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Obtener datos relacionados
        product = await db.products.find_one(
            {"product_id": cert_doc.get("product_id")},
            {"_id": 0}
        )
        producer = await db.users.find_one(
            {"user_id": cert_doc.get("producer_id")},
            {"_id": 0, "company_name": 1, "full_name": 1, "name": 1}
        )
        store = await db.store_profiles.find_one(
            {"producer_id": cert_doc.get("producer_id")},
            {"_id": 0, "name": 1, "logo": 1}
        )
        
        # Crear modelo DigitalCertificate desde el doc
        cert = DigitalCertificate(**cert_doc)
        
        pdf_bytes = certificate_generator.generate_certificate_pdf(
            cert, product or {}, producer or {}, store
        )
        
        safe_name = (product.get("name", "") if product else "")[:40].replace(" ", "_")
        filename = f"certificado-{safe_name or certificate_id}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Generación de PDF no disponible. Instala: pip install reportlab"
        )
    except Exception as e:
        logger.error(f"[DigitalCertificates] Error generando PDF: {e}")
        raise HTTPException(status_code=500, detail="Error generating PDF")


@router.get("/digital-certificates/{certificate_id}/analytics")
async def get_certificate_analytics(
    certificate_id: str,
    days: int = 30,
    user: User = Depends(get_current_user)
):
    """Obtiene analytics de escaneos del certificado."""
    await require_role(user, ["producer", "importer", "admin"])
    
    cert = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = await get_scan_analytics(certificate_id, days)
    return analytics


@router.post("/digital-certificates/{certificate_id}/revoke")
async def revoke_certificate(
    certificate_id: str,
    user: User = Depends(get_current_user)
):
    """Revoca un certificado digital (lo desactiva)."""
    await require_role(user, ["producer", "importer", "admin"])
    
    cert = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.digital_certificates.update_one(
        {"certificate_id": certificate_id},
        {"$set": {"status": "revoked", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"status": "revoked", "certificate_id": certificate_id}


@router.get("/products/{product_id}/digital-certificates")
async def get_product_digital_certificates(
    product_id: str,
    user: User = Depends(get_current_user)
):
    """Obtiene todos los certificados digitales de un producto específico."""
    await require_role(user, ["producer", "importer", "admin"])
    
    # Verificar ownership del producto
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("producer_id") != user.user_id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    certs = await get_product_certificates(product_id)
    return {"certificates": certs}
