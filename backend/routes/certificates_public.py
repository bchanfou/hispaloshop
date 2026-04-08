"""
Certificados Públicos — Endpoints para certificados digitales y QR.

Rutas públicas (no requiere auth):
- GET /c/{certificate_id} — Página pública del certificado (HTML)
- GET /api/certificates/public/{certificate_id} — Datos del certificado (JSON)
- GET /api/certificates/public/{certificate_id}/qr.png — QR code PNG
- GET /api/certificates/public/{certificate_id}/qr.svg — QR code SVG
- POST /api/certificates/public/{certificate_id}/track — Registra escaneo

Section 1.4b — Digital Certificates & HispaloTranslate
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional
import logging
import os

from core.database import db
from core.models import CertificateType
from services.certificate_generator import certificate_generator, track_scan
from services.hispalo_translate import translate_product_fields

logger = logging.getLogger(__name__)

router = APIRouter(tags=["certificates_public"])


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS PÚBLICOS — No requieren autenticación
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/certificates/public/{certificate_id}")
async def get_public_certificate(
    certificate_id: str,
    request: Request,
    lang: Optional[str] = None
):
    """
    Obtiene los datos públicos de un certificado digital.
    Auto-detecta idioma del header Accept-Language si no se especifica.
    """
    # Detectar idioma preferido
    target_lang = lang
    if not target_lang:
        accept_lang = request.headers.get("accept-language", "")
        if "es" in accept_lang:
            target_lang = "es"
        elif "en" in accept_lang:
            target_lang = "en"
        elif "ko" in accept_lang:
            target_lang = "ko"
        else:
            target_lang = "en"
    
    # Buscar certificado
    cert = await db.digital_certificates.find_one({
        "certificate_id": certificate_id,
        "status": "active"
    })
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    # Obtener producto
    product = await db.products.find_one({"product_id": cert.get("product_id")})
    if not product or product.get("status") != "active":
        raise HTTPException(status_code=404, detail="Producto no disponible")
    
    # Obtener tienda del productor
    store = None
    if product.get("store_id"):
        store = await db.stores.find_one({"_id": product["store_id"]})
    elif product.get("producer_id"):
        store = await db.stores.find_one({"owner_id": product["producer_id"]})
    
    # Obtener productor
    producer = await db.users.find_one(
        {"user_id": cert.get("producer_id")},
        {"_id": 0, "company_name": 1, "full_name": 1, "name": 1, "profile_image": 1}
    )
    
    # Traducir si es necesario
    source_lang = product.get("language", "es")
    translated = None
    
    if target_lang != source_lang:
        cached = await db.product_translations.find_one({
            "product_id": product.get("product_id"),
            "target_lang": target_lang
        })
        
        if cached:
            translated = {
                "name": cached.get("name"),
                "description": cached.get("description"),
                "ingredients": cached.get("ingredients"),
                "allergens": cached.get("allergens")
            }
        else:
            translated = await translate_product_fields(product, target_lang, source_lang)
            await db.product_translations.update_one(
                {"product_id": product.get("product_id"), "target_lang": target_lang},
                {"$set": {
                    **translated,
                    "source_lang": source_lang,
                    "updated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
                }},
                upsert=True
            )
    
    # Labels de tipos de certificado
    cert_type_labels = {
        CertificateType.ORIGIN: {"es": "Origen", "en": "Origin", "ko": "원산지"},
        CertificateType.ARTISAN: {"es": "Artesanal", "en": "Artisan", "ko": "수제"},
        CertificateType.SUSTAINABLE: {"es": "Sostenible", "en": "Sustainable", "ko": "지속가능"},
        CertificateType.ORGANIC: {"es": "Orgánico", "en": "Organic", "ko": "유기농"},
        CertificateType.LOCAL: {"es": "Producto Local", "en": "Local Product", "ko": "지역제품"},
        CertificateType.TRADITIONAL: {"es": "Tradicional", "en": "Traditional", "ko": "전통"},
        CertificateType.WOMEN_OWNED: {"es": "Empresa de Mujeres", "en": "Women-Owned", "ko": "여성기업"},
        CertificateType.FAMILY_BUSINESS: {"es": "Negocio Familiar", "en": "Family Business", "ko": "가족기업"},
    }
    
    cert_type = cert.get("type")
    if isinstance(cert_type, str):
        cert_type = CertificateType(cert_type)
    
    cert_label = cert_type_labels.get(cert_type, {}).get(target_lang, str(cert_type))
    
    # Construir respuesta
    result = {
        "certificate_id": certificate_id,
        "type": cert.get("type"),
        "type_label": cert_label,
        "issued_at": cert.get("issued_at"),
        "verification_hash": cert.get("verification_hash"),
        "product": {
            "product_id": product.get("product_id"),
            "name": translated.get("name") if translated else product.get("name"),
            "description": translated.get("description") if translated else product.get("description"),
            "images": product.get("images", []),
            "price": product.get("price"),
            "currency": product.get("currency", "EUR"),
            "unit": product.get("unit"),
            "ingredients": translated.get("ingredients") if translated else product.get("ingredients"),
            "allergens": translated.get("allergens") if translated else product.get("allergens"),
            "nutrition": product.get("nutrition"),
            "certifications": product.get("certifications", []),
            "origin_country": product.get("origin_country") or product.get("country_origin"),
        },
        "store": {
            "name": store.get("name") if store else None,
            "slug": store.get("slug") if store else None,
            "logo": store.get("logo") if store else None,
            "location": store.get("location") if store else None,
        } if store else None,
        "producer": {
            "name": producer.get("company_name") or producer.get("full_name") or producer.get("name"),
            "image": producer.get("profile_image")
        } if producer else None,
        "translation": {
            "target_lang": target_lang,
            "source_lang": source_lang,
            "was_translated": translated is not None
        },
        "verified_by": "Hispaloshop"
    }
    
    return result


@router.get("/api/certificates/public/{certificate_id}/qr.png")
async def get_public_qr_png(
    certificate_id: str,
    size: int = 300
):
    """Genera y devuelve QR code público en formato PNG."""
    try:
        # Verificar certificado existe
        cert = await db.digital_certificates.find_one({
            "certificate_id": certificate_id,
            "status": "active"
        })
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        png_data = certificate_generator.generate_png(certificate_id, size=size, include_frame=True)
        return Response(
            content=png_data,
            media_type="image/png",
            headers={
                "Content-Disposition": f'inline; filename="certificate_{certificate_id}.png"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CertificatesPublic] Error generando QR PNG: {e}")
        raise HTTPException(status_code=500, detail="Error generando QR code")


@router.get("/api/certificates/public/{certificate_id}/qr.svg")
async def get_public_qr_svg(certificate_id: str):
    """Genera y devuelve QR code público en formato SVG (vectorial)."""
    try:
        cert = await db.digital_certificates.find_one({
            "certificate_id": certificate_id,
            "status": "active"
        })
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        svg_data = certificate_generator.generate_svg(certificate_id)
        return Response(
            content=svg_data,
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'inline; filename="certificate_{certificate_id}.svg"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CertificatesPublic] Error generando QR SVG: {e}")
        raise HTTPException(status_code=500, detail="Error generando QR code")


@router.post("/api/certificates/public/{certificate_id}/track")
async def track_public_scan(
    certificate_id: str,
    request: Request
):
    """Registra un escaneo del certificado (llamado desde la página pública)."""
    # Detectar idioma
    accept_lang = request.headers.get("accept-language", "")
    language = "unknown"
    if "es" in accept_lang:
        language = "es"
    elif "en" in accept_lang:
        language = "en"
    elif "ko" in accept_lang:
        language = "ko"
    
    # País desde IP o headers CDN
    country = request.headers.get("cf-ipcountry", "unknown")
    
    user_agent = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    
    await track_scan(
        certificate_id=certificate_id,
        language=language,
        country=country,
        user_agent=user_agent,
        referrer=referrer
    )
    
    return {"status": "tracked"}


# ═══════════════════════════════════════════════════════════════════════════════
# PÁGINA PÚBLICA HTML — SEO-friendly
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/c/{certificate_id}", include_in_schema=False)
async def certificate_public_page(
    certificate_id: str,
    request: Request
):
    """
    Página HTML pública del certificado.
    Ruta: /c/{certificate_id}
    SEO-friendly con meta tags para social sharing.
    """
    # Obtener datos del certificado
    cert = await db.digital_certificates.find_one({
        "certificate_id": certificate_id,
        "status": "active"
    })
    
    if not cert:
        return HTMLResponse(content=_get_not_found_html(), status_code=404)
    
    # Obtener producto
    product = await db.products.find_one({"product_id": cert.get("product_id")})
    if not product:
        return HTMLResponse(content=_get_not_found_html(), status_code=404)
    
    product_name = product.get("name", "Producto")
    product_image = product.get("images", [""])[0] if product.get("images") else ""
    product_description = product.get("description", "")[:200]
    
    # Tipo de certificado
    cert_type_labels = {
        "origin": "Origen",
        "artisan": "Artesanal",
        "sustainable": "Sostenible",
        "organic": "Orgánico",
        "local": "Local",
        "traditional": "Tradicional",
        "women_owned": "Empresa de Mujeres",
        "family_business": "Negocio Familiar",
    }
    cert_type = cert.get("type", "")
    if isinstance(cert_type, CertificateType):
        cert_type = cert_type.value
    cert_label = cert_type_labels.get(cert_type, "Certificado")
    
    # Meta tags
    title = f"{cert_label} — {product_name} | HispaloShop"
    description = f"{product_description}... Verificado por HispaloShop"
    canonical_url = f"https://hispaloshop.com/c/{certificate_id}"
    
    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="{canonical_url}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{product_image}">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:type" content="product">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{product_image}">
    
    <script>
        // Redirigir al frontend SPA
        window.location.href = '/certificate/{certificate_id}' + window.location.search;
    </script>
    
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, sans-serif;
            background: #fafaf9;
            color: #1c1917;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }}
        .container {{
            max-width: 400px;
        }}
        h1 {{
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }}
        p {{
            color: #78716c;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
        }}
        a {{
            color: #0c0a09;
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{product_name}</h1>
        <p>Certificado {cert_label} verificado por HispaloShop</p>
        <p><a href="/certificate/{certificate_id}">Ver certificado completo</a></p>
    </div>
</body>
</html>"""
    
    return HTMLResponse(content=html_content)


def _get_not_found_html() -> str:
    """HTML para certificado no encontrado."""
    return """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificado no encontrado | HispaloShop</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, sans-serif;
            background: #fafaf9;
            color: #1c1917;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container { max-width: 400px; padding: 20px; }
        h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
        p { color: #78716c; font-size: 0.875rem; }
        a { color: #0c0a09; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Certificado no encontrado</h1>
        <p>Este certificado no existe o ha sido desactivado.</p>
        <p><a href="/">Volver al inicio</a></p>
    </div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS DE ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/admin/certificate-stats")
async def get_global_certificate_stats(
    request: Request
):
    """Estadísticas globales de certificados (público)."""
    # Total de certificados activos
    total_certs = await db.digital_certificates.count_documents({"status": "active"})
    
    # Total de escaneos
    total_scans = await db.certificate_scans.estimated_document_count()
    
    # Escaneos por idioma (top 10)
    by_language = await db.certificate_scans.aggregate([
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=10)
    
    # Escaneos por país (top 10)
    by_country = await db.certificate_scans.aggregate([
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=10)
    
    return {
        "total_active_certificates": total_certs,
        "total_scans": total_scans,
        "top_languages": {b["_id"]: b["count"] for b in by_language if b["_id"]},
        "top_countries": {b["_id"]: b["count"] for b in by_country if b["_id"]}
    }
