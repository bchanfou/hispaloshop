"""
Certificate Generator — Generación de certificados digitales con QR.

Features:
- Genera QR codes que apuntan a /c/{product_id}
- Múltiples formatos: PNG, SVG, PDF
- Diseño con marco para imprimir
- Analytics tracking de escaneos
"""
import io
import qrcode
from qrcode.image.svg import SvgImage
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Literal
import logging
from datetime import datetime, timezone

from core.database import db

logger = logging.getLogger(__name__)


class CertificateGenerator:
    """Generador de certificados digitales y QR codes."""
    
    # Dimensiones del QR
    QR_SIZE_PX = 300  # Tamaño base del QR
    BORDER_PX = 20    # Borde blanco alrededor
    
    def __init__(self, base_url: str = "https://hispaloshop.com"):
        self.base_url = base_url.rstrip("/")
    
    def _generate_qr_code(
        self, 
        product_id: str,
        size: int = QR_SIZE_PX,
        error_correction = qrcode.constants.ERROR_CORRECT_H
    ) -> qrcode.QRCode:
        """Genera el objeto QR code."""
        url = f"{self.base_url}/c/{product_id}"
        
        qr = qrcode.QRCode(
            version=None,  # Auto-determinar versión
            error_correction=error_correction,
            box_size=size // 30,  # Tamaño de cada caja
            border=2,  # Borde en módulos QR
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        return qr
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORMATO PNG
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_png(
        self, 
        product_id: str,
        size: int = 300,
        include_frame: bool = False
    ) -> bytes:
        """
        Genera QR code en formato PNG.
        
        Args:
            product_id: ID del producto
            size: Tamaño en píxeles
            include_frame: Si incluir marco decorativo
        
        Returns:
            Bytes del archivo PNG
        """
        qr = self._generate_qr_code(product_id, size)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Redimensionar al tamaño exacto
        img = img.convert('RGB')
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        if include_frame:
            img = self._add_frame(img, product_id)
        
        # Guardar a bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORMATO SVG
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_svg(self, product_id: str) -> str:
        """
        Genera QR code en formato SVG (vectorial).
        
        Returns:
            String con el contenido SVG
        """
        qr = self._generate_qr_code(product_id)
        
        # Generar SVG
        factory = qrcode.image.svg.SvgImage
        img = qr.make_image(image_factory=factory)
        
        # Convertir a string
        buffer = io.BytesIO()
        img.save(buffer)
        buffer.seek(0)
        
        return buffer.read().decode('utf-8')
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORMATO PDF
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_pdf(
        self, 
        product_id: str,
        product_name: str,
        size_mm: float = 50
    ) -> bytes:
        """
        Genera PDF con QR para imprimir (con marco y texto).
        
        Args:
            product_id: ID del producto
            product_name: Nombre del producto (para mostrar)
            size_mm: Tamaño del QR en mm
        
        Returns:
            Bytes del archivo PDF
        """
        try:
            from reportlab.lib.pagesizes import mm
            from reportlab.pdfgen import canvas
            from reportlab.lib.utils import ImageReader
        except ImportError:
            logger.error("[CertificateGenerator] reportlab no instalado. Usa: pip install reportlab")
            raise
        
        # Generar QR PNG primero
        qr_png = self.generate_png(product_id, size=500)
        qr_image = ImageReader(io.BytesIO(qr_png))
        
        # Crear PDF
        buffer = io.BytesIO()
        page_size = (size_mm * mm + 40, size_mm * mm + 60)  # QR + margen + texto
        c = canvas.Canvas(buffer, pagesize=page_size)
        
        # Dibujar marco
        frame_padding = 10
        c.setStrokeColorRGB(0.1, 0.1, 0.1)  # stone-950
        c.setLineWidth(1)
        c.roundRect(
            frame_padding, frame_padding,
            page_size[0] - 2*frame_padding, page_size[1] - 2*frame_padding,
            5,  # Radio de esquina
            stroke=1, fill=0
        )
        
        # Dibujar QR
        qr_size = size_mm * mm
        qr_x = (page_size[0] - qr_size) / 2
        qr_y = 40  # Espacio para texto arriba
        c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)
        
        # Añadir texto
        c.setFont("Helvetica-Bold", 10)
        text_y = page_size[1] - 25
        c.drawCentredString(page_size[0]/2, text_y, "Escanea para ver en tu idioma")
        
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(page_size[0]/2, text_y - 15, f"hispaloshop.com/c/{product_id}")
        
        # Nombre del producto (si cabe)
        if product_name:
            c.setFont("Helvetica", 7)
            c.setFillColorRGB(0.3, 0.3, 0.3)
            # Truncar si es muy largo
            display_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
            c.drawCentredString(page_size[0]/2, 20, display_name)
        
        c.save()
        buffer.seek(0)
        
        return buffer.getvalue()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MARCO DECORATIVO
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _add_frame(self, img: Image.Image, product_id: str) -> Image.Image:
        """Añade marco decorativo alrededor del QR."""
        # Crear imagen más grande para el marco
        frame_size = img.size[0] + 2 * self.BORDER_PX + 40
        framed = Image.new('RGB', (frame_size, frame_size), 'white')
        
        # Dibujar borde
        draw = ImageDraw.Draw(framed)
        border_color = (12, 10, 9)  # stone-950
        draw.rectangle(
            [10, 10, frame_size-10, frame_size-10],
            outline=border_color,
            width=2
        )
        
        # Pegar QR en el centro
        qr_pos = (self.BORDER_PX + 20, self.BORDER_PX + 20)
        framed.paste(img, qr_pos)
        
        # Añadir texto pequeño abajo
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            font = ImageFont.load_default()
        
        text = f"hispaloshop.com/c/{product_id}"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (frame_size - text_width) // 2
        text_y = frame_size - 25
        
        draw.text((text_x, text_y), text, fill=(100, 100, 100), font=font)
        
        return framed


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS DE ESCANEOS
# ═══════════════════════════════════════════════════════════════════════════════

async def track_scan(
    product_id: str,
    language: str,
    country: str,
    user_agent: str = "",
    referrer: str = ""
):
    """
    Registra un escaneo de certificado.
    
    Args:
        product_id: ID del producto escaneado
        language: Idioma del dispositivo (Accept-Language)
        country: País detectado por IP
        user_agent: User-Agent del navegador
        referrer: Referrer URL
    """
    scan_data = {
        "product_id": product_id,
        "language": language,
        "country": country,
        "user_agent": user_agent[:200] if user_agent else "",  # Limitar tamaño
        "referrer": referrer[:500] if referrer else "",
        "scanned_at": datetime.now(timezone.utc),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    
    await db.certificate_scans.insert_one(scan_data)
    
    # Incrementar contador del producto
    await db.products.update_one(
        {"_id": product_id},
        {"$inc": {"certificate_scan_count": 1}}
    )


async def get_scan_analytics(
    product_id: str,
    days: int = 30
) -> dict:
    """
    Obtiene analytics de escaneos para un producto.
    
    Returns:
        Dict con: total_scans, by_language, by_country, daily_trend
    """
    from_date = datetime.now(timezone.utc) - __import__('datetime').timedelta(days=days)
    
    # Total scans
    total = await db.certificate_scans.count_documents({
        "product_id": product_id,
        "scanned_at": {"$gte": from_date}
    })
    
    # Por idioma
    by_language = await db.certificate_scans.aggregate([
        {"$match": {"product_id": product_id, "scanned_at": {"$gte": from_date}}},
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(length=20)
    
    # Por país
    by_country = await db.certificate_scans.aggregate([
        {"$match": {"product_id": product_id, "scanned_at": {"$gte": from_date}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(length=20)
    
    # Tendencia diaria
    daily = await db.certificate_scans.aggregate([
        {"$match": {"product_id": product_id, "scanned_at": {"$gte": from_date}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(length=days)
    
    return {
        "total_scans": total,
        "by_language": {b["_id"]: b["count"] for b in by_language if b["_id"]},
        "by_country": {b["_id"]: b["count"] for b in by_country if b["_id"]},
        "daily_trend": {d["_id"]: d["count"] for d in daily}
    }


# Singleton
certificate_generator = CertificateGenerator()
