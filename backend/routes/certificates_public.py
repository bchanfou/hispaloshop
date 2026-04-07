"""
Certificados Públicos — Endpoints para certificados digitales y QR.

Rutas públicas (no requiere auth):
- GET /c/{product_id} — Página pública del certificado (HTML)
- GET /api/certificates/{product_id} — Datos del certificado (JSON)
- GET /api/certificates/{product_id}/qr.png — QR code PNG
- GET /api/certificates/{product_id}/qr.svg — QR code SVG
- GET /api/certificates/{product_id}/qr.pdf — QR code PDF

Analytics:
- POST /api/certificates/{product_id}/track — Registra escaneo
- GET /api/certificates/{product_id}/analytics — Stats (auth required)
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse, HTMLResponse
from typing import Optional
import logging

from core.database import db
from services.certificate_generator import (
    certificate_generator, track_scan, get_scan_analytics
)
from services.hispalo_translate import translate_product_fields
from core.auth import get_optional_user, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS PÚBLICOS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{product_id}")
async def get_certificate(
    product_id: str,
    request: Request,
    lang: Optional[str] = None
):
    """
    Obtiene los datos del certificado para un producto.
    Auto-detecta idioma del header Accept-Language si no se especifica.
    """
    # Detectar idioma preferido
    target_lang = lang
    if not target_lang:
        accept_lang = request.headers.get("accept-language", "")
        # Prioridad: es, en, ko
        if "es" in accept_lang:
            target_lang = "es"
        elif "en" in accept_lang:
            target_lang = "en"
        elif "ko" in accept_lang:
            target_lang = "ko"
        else:
            target_lang = "en"  # Default
    
    # Buscar producto
    product = await db.products.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Verificar que está activo
    if product.get("status") != "active":
        raise HTTPException(status_code=404, detail="Producto no disponible")
    
    # Obtener tienda del productor
    store = None
    if product.get("store_id"):
        store = await db.stores.find_one({"_id": product["store_id"]})
    elif product.get("producer_id"):
        store = await db.stores.find_one({"owner_id": product["producer_id"]})
    
    # Traducir campos si es necesario
    source_lang = product.get("language", "es")
    translated = None
    
    if target_lang != source_lang:
        # Verificar si ya tenemos traducción cacheada
        cached_translation = await db.product_translations.find_one({
            "product_id": product_id,
            "target_lang": target_lang
        })
        
        if cached_translation:
            translated = {
                "name": cached_translation.get("name"),
                "description": cached_translation.get("description"),
                "ingredients": cached_translation.get("ingredients"),
                "allergens": cached_translation.get("allergens")
            }
        else:
            # Traducir y cachear
            translated = await translate_product_fields(product, target_lang, source_lang)
            
            # Guardar en cache
            await db.product_translations.update_one(
                {"product_id": product_id, "target_lang": target_lang},
                {"$set": {
                    **translated,
                    "source_lang": source_lang,
                    "updated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
                }},
                upsert=True
            )
    
    # Construir respuesta
    certificate_data = {
        "product_id": product_id,
        "product": {
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
            "origin_country": product.get("origin_country"),
        },
        "store": {
            "name": store.get("name") if store else None,
            "slug": store.get("slug") if store else None,
            "logo": store.get("logo") if store else None,
            "location": store.get("location") if store else None,
        } if store else None,
        "translation": {
            "target_lang": target_lang,
            "source_lang": source_lang,
            "was_translated": translated is not None
        }
    }
    
    return certificate_data


@router.get("/{product_id}/qr.png")
async def get_qr_png(
    product_id: str,
    size: int = 300,
    frame: bool = False
):
    """Genera y devuelve QR code en formato PNG."""
    try:
        png_data = certificate_generator.generate_png(product_id, size=size, include_frame=frame)
        return Response(
            content=png_data,
            media_type="image/png",
            headers={
                "Content-Disposition": f'inline; filename="certificate_{product_id}.png"',
                "Cache-Control": "public, max-age=86400"  # Cache 24h
            }
        )
    except Exception as e:
        logger.error(f"[Certificates] Error generando QR PNG: {e}")
        raise HTTPException(status_code=500, detail="Error generando QR code")


@router.get("/{product_id}/qr.svg")
async def get_qr_svg(product_id: str):
    """Genera y devuelve QR code en formato SVG (vectorial)."""
    try:
        svg_data = certificate_generator.generate_svg(product_id)
        return Response(
            content=svg_data,
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'inline; filename="certificate_{product_id}.svg"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        logger.error(f"[Certificates] Error generando QR SVG: {e}")
        raise HTTPException(status_code=500, detail="Error generando QR code")


@router.get("/{product_id}/qr.pdf")
async def get_qr_pdf(
    product_id: str,
    size_mm: float = 50
):
    """Genera y devuelve QR code en formato PDF para imprimir."""
    try:
        # Obtener nombre del producto
        product = await db.products.find_one({"_id": product_id})
        product_name = product.get("name", "") if product else ""
        
        pdf_data = certificate_generator.generate_pdf(product_id, product_name, size_mm)
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="certificate_{product_id}.pdf"',
            }
        )
    except ImportError:
        raise HTTPException(
            status_code=501, 
            detail="Generación de PDF no disponible. Instala: pip install reportlab"
        )
    except Exception as e:
        logger.error(f"[Certificates] Error generando QR PDF: {e}")
        raise HTTPException(status_code=500, detail="Error generando PDF")


# ═══════════════════════════════════════════════════════════════════════════════
# TRACKING Y ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{product_id}/track")
async def track_certificate_scan(
    product_id: str,
    request: Request
):
    """
    Registra un escaneo del certificado.
    Llamado automáticamente desde la página del certificado.
    """
    # Detectar idioma y país
    accept_lang = request.headers.get("accept-language", "")
    language = "unknown"
    if "es" in accept_lang:
        language = "es"
    elif "en" in accept_lang:
        language = "en"
    elif "ko" in accept_lang:
        language = "ko"
    
    # País desde IP (simplificado - en producción usar geoip)
    country = request.headers.get("cf-ipcountry", "unknown")
    
    # User agent
    user_agent = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    
    await track_scan(
        product_id=product_id,
        language=language,
        country=country,
        user_agent=user_agent,
        referrer=referrer
    )
    
    return {"status": "tracked"}


@router.get("/{product_id}/analytics")
async def get_product_certificate_analytics(
    product_id: str,
    user: dict = Depends(get_current_user),
    days: int = 30
):
    """
    Obtiene analytics de escaneos del certificado.
    Requiere ser el dueño del producto o admin.
    """
    # Verificar ownership
    product = await db.products.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    is_owner = product.get("producer_id") == user.get("user_id")
    is_admin = user.get("role") in ["admin", "super_admin"]
    
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver estos analytics")
    
    analytics = await get_scan_analytics(product_id, days)
    return analytics


# ═══════════════════════════════════════════════════════════════════════════════
# PÁGINA PÚBLICA HTML
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/c/{product_id}", include_in_schema=False)
async def certificate_public_page(
    product_id: str,
    request: Request
):
    """
    Página HTML pública del certificado.
    Ruta: /c/{product_id}
    """
    # Esta ruta se maneja mejor en el frontend, pero aquí devolvemos un HTML básico
    # que redirige al frontend o muestra info básica
    
    html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificado Digital - HispaloShop</title>
    <script>
        // Redirigir al frontend con el producto
        window.location.href = '/certificate/{product_id}' + window.location.search;
    </script>
</head>
<body>
    <p>Redirigiendo...</p>
</body>
</html>
"""
    return HTMLResponse(content=html_content)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS DE ADMIN/SUPERADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/stats")
async def get_global_certificate_stats(
    user: dict = Depends(get_current_user)
):
    """Estadísticas globales de certificados (superadmin only)."""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Total de productos con certificados
    total_products = await db.products.count_documents({
        "status": "active"
    })
    
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
        "total_active_products": total_products,
        "total_scans": total_scans,
        "top_languages": {b["_id"]: b["count"] for b in by_language if b["_id"]},
        "top_countries": {b["_id"]: b["count"] for b in by_country if b["_id"]}
    }
