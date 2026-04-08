"""
Certificate Generator — Generación de certificados digitales con QR.

Features:
- Genera QR codes que apuntan a /c/{certificate_id}
- Múltiples formatos: PNG, SVG, PDF
- Diseño con marco para imprimir
- Analytics tracking de escaneos
- Auto-generación de certificados desde producto

Section 1.4b — Digital Certificates & HispaloTranslate
"""
import io
import qrcode
import hashlib
import uuid
from qrcode.image.svg import SvgImage
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Literal, Dict, Any, List, Tuple
import logging
from datetime import datetime, timezone, timedelta

import os
from core.database import db
from core.models import CertificateType, DigitalCertificate

logger = logging.getLogger(__name__)


class CertificateGenerator:
    """Generador de certificados digitales y QR codes."""
    
    # Dimensiones del QR
    QR_SIZE_PX = 300  # Tamaño base del QR
    BORDER_PX = 20    # Borde blanco alrededor
    
    # Mapeo de tipos de certificado a iconos/nombres
    CERT_TYPE_LABELS = {
        CertificateType.ORIGIN: {"es": "Origen", "en": "Origin", "ko": "원산지"},
        CertificateType.ARTISAN: {"es": "Artesanal", "en": "Artisan", "ko": "수제"},
        CertificateType.SUSTAINABLE: {"es": "Sostenible", "en": "Sustainable", "ko": "지속가능"},
        CertificateType.ORGANIC: {"es": "Orgánico", "en": "Organic", "ko": "유기농"},
        CertificateType.LOCAL: {"es": "Producto Local", "en": "Local Product", "ko": "지역제품"},
        CertificateType.TRADITIONAL: {"es": "Tradicional", "en": "Traditional", "ko": "전통"},
        CertificateType.WOMEN_OWNED: {"es": "Empresa de Mujeres", "en": "Women-Owned", "ko": "여성기업"},
        CertificateType.FAMILY_BUSINESS: {"es": "Negocio Familiar", "en": "Family Business", "ko": "가족기업"},
    }
    
    def __init__(self, base_url: str = "https://hispaloshop.com"):
        self.base_url = base_url.rstrip("/")
    
    def _generate_cert_id(self, product_id: str, cert_type: CertificateType) -> str:
        """Genera ID único de certificado."""
        return f"cert_{product_id}_{cert_type.value}"
    
    def _generate_verification_hash(self, certificate_id: str) -> str:
        """Genera hash único de verificación."""
        data = f"{certificate_id}:{datetime.now(timezone.utc).isoformat()}:{uuid.uuid4().hex}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _cert_url(self, certificate_id: str) -> str:
        """Build smart certificate verification URL."""
        return f"{self.base_url}/c/{certificate_id}"
    
    def _generate_qr_code(
        self, 
        certificate_id: str,
        size: int = QR_SIZE_PX,
        error_correction = qrcode.constants.ERROR_CORRECT_H
    ) -> qrcode.QRCode:
        """Genera el objeto QR code."""
        url = self._cert_url(certificate_id)
        
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
        certificate_id: str,
        size: int = 300,
        include_frame: bool = False
    ) -> bytes:
        """
        Genera QR code en formato PNG.
        
        Args:
            certificate_id: ID del certificado
            size: Tamaño en píxeles
            include_frame: Si incluir marco decorativo
        
        Returns:
            Bytes del archivo PNG
        """
        qr = self._generate_qr_code(certificate_id, size)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Redimensionar al tamaño exacto
        img = img.convert('RGB')
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        if include_frame:
            img = self._add_frame(img, certificate_id)
        
        # Guardar a bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORMATO SVG
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_svg(self, certificate_id: str) -> str:
        """
        Genera QR code en formato SVG (vectorial).
        
        Returns:
            String con el contenido SVG
        """
        qr = self._generate_qr_code(certificate_id)
        
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
        certificate_id: str,
        product_name: str,
        size_mm: float = 50
    ) -> bytes:
        """
        Genera PDF con QR para imprimir (con marco y texto).
        
        Args:
            certificate_id: ID del certificado
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
        qr_png = self.generate_png(certificate_id, size=500)
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
        c.drawCentredString(page_size[0]/2, text_y - 15, f"hispaloshop.com/c/{certificate_id}")
        
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
    # GENERACIÓN DE CERTIFICADO COMPLETO (PDF con diseño premium)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def generate_certificate_pdf(
        self,
        certificate: DigitalCertificate,
        product: Dict[str, Any],
        producer: Dict[str, Any],
        store: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Genera PDF completo del certificado digital con diseño premium.
        
        Args:
            certificate: Datos del certificado
            product: Datos del producto
            producer: Datos del productor
            store: Datos de la tienda (opcional)
        
        Returns:
            Bytes del PDF
        """
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
            logger.error("[CertificateGenerator] reportlab no instalado")
            raise
        
        # Colores stone palette
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
        page_w = A4[0] - 4 * cm
        styles = getSampleStyleSheet()
        
        # Estilos
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
        
        # Header
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
        
        # Meta del certificado
        cert_type_label = self.CERT_TYPE_LABELS.get(certificate.type, {}).get("es", certificate.type.value)
        issued = certificate.issued_at.isoformat() if isinstance(certificate.issued_at, datetime) else str(certificate.issued_at)
        issued_fmt = issued[:10] if issued else "—"
        
        meta_left = f"<b>Tipo</b> {cert_type_label}<br/><b>Emisión</b> {issued_fmt}"
        meta_right = f"<b>ID</b> {certificate.certificate_id[:20]}..."
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
        
        # Producto
        product_name = product.get("name", "—")
        origin = product.get("country_origin", "")
        
        product_text = f"<b>{product_name}</b>"
        if origin:
            product_text += f"<br/><font color='#78716c'>Origen: {origin}</font>"
        
        elements.append(Paragraph(product_text, ParagraphStyle("ProdNameOnly", parent=s_body, fontSize=16, leading=22)))
        _hr()
        
        # Productor
        producer_name = producer.get("company_name") or producer.get("full_name") or producer.get("name", "")
        store_name = store.get("name") if store else ""
        
        if producer_name or store_name:
            elements.append(Paragraph("PRODUCTOR", s_eyebrow))
            elements.append(Paragraph(f"<b>{store_name or producer_name}</b>", ParagraphStyle("ProdName2", parent=s_body, fontSize=11, leading=15)))
            _hr()
        
        # QR Code
        qr_png_bytes = self.generate_png(certificate.certificate_id, size=300, include_frame=True)
        qr_buf = io.BytesIO(qr_png_bytes)
        qr_image = RLImage(qr_buf, width=4 * cm, height=4 * cm)
        
        qr_block = [
            [qr_image],
            [Paragraph(f"<font size=7 color='#78716c'>Escanea para verificar este certificado</font>", s_center)],
            [Paragraph(f"<font size=6 color='#a8a29e'>{self._cert_url(certificate.certificate_id)}</font>", s_center)],
        ]
        qr_table = Table(qr_block, colWidths=[page_w])
        qr_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(qr_table)
        
        # Footer
        elements.append(Spacer(1, 14))
        footer_data = [[Paragraph(
            "Este certificado ha sido generado por HispaloShop y valida la información declarada por el productor. "
            "Escanea el código QR para ver la información completa del producto en tu idioma.",
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
        return buffer.getvalue()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MARCO DECORATIVO
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _add_frame(self, img: Image.Image, certificate_id: str) -> Image.Image:
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
        
        text = f"hispaloshop.com/c/{certificate_id}"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (frame_size - text_width) // 2
        text_y = frame_size - 25
        
        draw.text((text_x, text_y), text, fill=(100, 100, 100), font=font)
        
        return framed


# ═══════════════════════════════════════════════════════════════════════════════
# AUTO-GENERACIÓN DE CERTIFICADOS
# ═══════════════════════════════════════════════════════════════════════════════

async def auto_generate_certificates_for_product(
    product: Dict[str, Any],
    producer_id: str
) -> List[DigitalCertificate]:
    """
    Genera automáticamente certificados digitales para un producto
    basado en sus atributos y checkboxes del productor.
    
    Args:
        product: Datos del producto
        producer_id: ID del productor
    
    Returns:
        Lista de certificados generados
    """
    generator = CertificateGenerator()
    generated_certs = []
    
    # Mapeo de campos del producto a tipos de certificado
    cert_mappings = [
        ("is_artisan", CertificateType.ARTISAN),
        ("is_organic", CertificateType.ORGANIC),
        ("is_sustainable", CertificateType.SUSTAINABLE),
        ("is_local", CertificateType.LOCAL),
        ("is_traditional", CertificateType.TRADITIONAL),
        ("is_women_owned", CertificateType.WOMEN_OWNED),
        ("is_family_business", CertificateType.FAMILY_BUSINESS),
    ]
    
    product_id = product.get("product_id") or product.get("_id")
    if not product_id:
        logger.error("[AutoGenerate] Producto sin ID")
        return []
    
    # Siempre generar certificado de origen si hay país de origen
    origin_country = product.get("country_origin") or product.get("origin_country")
    if origin_country:
        cert = await _create_certificate(
            generator, product_id, producer_id, 
            CertificateType.ORIGIN,
            metadata={"country": origin_country}
        )
        if cert:
            generated_certs.append(cert)
    
    # Generar certificados basados en checkboxes
    for field, cert_type in cert_mappings:
        if product.get(field, False):
            cert = await _create_certificate(
                generator, product_id, producer_id, cert_type
            )
            if cert:
                generated_certs.append(cert)
    
    logger.info(f"[AutoGenerate] {len(generated_certs)} certificados generados para {product_id}")
    return generated_certs


async def _create_certificate(
    generator: CertificateGenerator,
    product_id: str,
    producer_id: str,
    cert_type: CertificateType,
    metadata: Optional[Dict] = None,
    expires_at: Optional[datetime] = None
) -> Optional[DigitalCertificate]:
    """
    Crea un certificado digital único.
    """
    certificate_id = f"cert_{product_id}_{cert_type.value}"
    
    # Verificar si ya existe
    existing = await db.digital_certificates.find_one({"certificate_id": certificate_id})
    if existing:
        logger.debug(f"[CreateCert] Certificado {certificate_id} ya existe")
        return None
    
    # Generar QR y subir a Cloudinary si está disponible
    qr_bytes = generator.generate_png(certificate_id, size=300, include_frame=False)
    qr_url = await _upload_to_cloudinary(qr_bytes, f"qr_{certificate_id}", "image/png")
    
    # Si no se pudo subir a Cloudinary, usar data URI temporal
    if not qr_url:
        import base64
        qr_url = f"data:image/png;base64,{base64.b64encode(qr_bytes).decode()}"
    
    # Crear certificado
    cert = DigitalCertificate(
        certificate_id=certificate_id,
        product_id=product_id,
        producer_id=producer_id,
        type=cert_type,
        issued_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        qr_code_url=qr_url,
        verification_hash=generator._generate_verification_hash(certificate_id),
        status="active",
        metadata=metadata or {},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Guardar en DB
    await db.digital_certificates.insert_one(cert.model_dump())
    
    logger.info(f"[CreateCert] Creado {certificate_id}")
    return cert


async def _upload_to_cloudinary(
    file_bytes: bytes,
    public_id: str,
    resource_type: str = "image"
) -> Optional[str]:
    """
    Sube archivo a Cloudinary. Retorna URL o None si falla.
    """
    try:
        import cloudinary
        import cloudinary.uploader
        
        # Verificar configuración
        if not all([
            os.getenv("CLOUDINARY_CLOUD_NAME"),
            os.getenv("CLOUDINARY_API_KEY"),
            os.getenv("CLOUDINARY_API_SECRET")
        ]):
            return None
        
        result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            public_id=f"certificates/{public_id}",
            resource_type="image" if resource_type.startswith("image") else "raw",
            overwrite=True
        )
        return result.get("secure_url")
    except Exception as e:
        logger.warning(f"[Cloudinary] Error subiendo {public_id}: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS DE ESCANEOS
# ═══════════════════════════════════════════════════════════════════════════════

async def track_scan(
    certificate_id: str,
    language: str,
    country: str,
    user_agent: str = "",
    referrer: str = ""
):
    """
    Registra un escaneo de certificado.
    
    Args:
        certificate_id: ID del certificado escaneado
        language: Idioma del dispositivo (Accept-Language)
        country: País detectado por IP
        user_agent: User-Agent del navegador
        referrer: Referrer URL
    """
    scan_data = {
        "certificate_id": certificate_id,
        "language": language,
        "country": country,
        "user_agent": user_agent[:200] if user_agent else "",
        "referrer": referrer[:500] if referrer else "",
        "scanned_at": datetime.now(timezone.utc),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    
    await db.certificate_scans.insert_one(scan_data)
    
    # Incrementar contador del certificado
    await db.digital_certificates.update_one(
        {"certificate_id": certificate_id},
        {"inc": {"scan_count": 1}, "set": {"last_scanned_at": datetime.now(timezone.utc).isoformat()}}
    )


async def get_scan_analytics(
    certificate_id: str,
    days: int = 30
) -> dict:
    """
    Obtiene analytics de escaneos para un certificado.
    
    Returns:
        Dict con: total_scans, by_language, by_country, daily_trend
    """
    from_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Total scans
    total = await db.certificate_scans.count_documents({
        "certificate_id": certificate_id,
        "scanned_at": {"gte": from_date}
    })
    
    # Por idioma
    by_language = await db.certificate_scans.aggregate([
        {"match": {"certificate_id": certificate_id, "scanned_at": {"gte": from_date}}},
        {"group": {"_id": "$language", "count": {"sum": 1}}},
        {"sort": {"count": -1}}
    ]).to_list(length=20)
    
    # Por país
    by_country = await db.certificate_scans.aggregate([
        {"match": {"certificate_id": certificate_id, "scanned_at": {"gte": from_date}}},
        {"group": {"_id": "$country", "count": {"sum": 1}}},
        {"sort": {"count": -1}}
    ]).to_list(length=20)
    
    # Tendencia diaria
    daily = await db.certificate_scans.aggregate([
        {"match": {"certificate_id": certificate_id, "scanned_at": {"gte": from_date}}},
        {"group": {"_id": "$date", "count": {"sum": 1}}},
        {"sort": {"_id": 1}}
    ]).to_list(length=days)
    
    return {
        "total_scans": total,
        "by_language": {b["_id"]: b["count"] for b in by_language if b["_id"]},
        "by_country": {b["_id"]: b["count"] for b in by_country if b["_id"]},
        "daily_trend": {d["_id"]: d["count"] for d in daily}
    }


async def get_product_certificates(product_id: str) -> List[Dict[str, Any]]:
    """
    Obtiene todos los certificados digitales de un producto.
    
    Args:
        product_id: ID del producto
    
    Returns:
        Lista de certificados en formato dict
    """
    certs = await db.digital_certificates.find(
        {"product_id": product_id, "status": "active"}
    ).to_list(length=50)
    
    # Convertir ObjectId a string
    for cert in certs:
        cert.pop("_id", None)
    
    return certs


# Singleton
certificate_generator = CertificateGenerator()
