"""
B2B Contract Service — AI-powered contract PDF generation, signing, and sealing.
Uses Claude for legal text, ReportLab for PDF rendering, Cloudinary for storage.
"""
from anthropic import AsyncAnthropic
import cloudinary
import cloudinary.uploader
import hashlib
import httpx
import io
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
)

from services.auth_helpers import send_email

_FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com").rstrip("/")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cloudinary config (mirrors services/cloudinary_storage.py)
# ---------------------------------------------------------------------------
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
GREEN_PRIMARY = HexColor("#2E7D52")
STONE_950 = HexColor("#0c0a09")
STONE_700 = HexColor("#44403c")
STONE_500 = HexColor("#78716c")
STONE_200 = HexColor("#e7e5e4")
STONE_100 = HexColor("#f5f5f4")
WHITE = colors.white
BLACK = colors.black


# ============================= 1. generate_contract ========================
async def generate_contract(operation: dict, db) -> dict:
    """
    Generate a B2B contract PDF with AI-written legal text.

    Returns: { pdf_url, contract_hash, generated_at }
    """
    # ---- a) Fetch parties ---------------------------------------------------
    seller = await db.users.find_one({"_id": ObjectId(operation["seller_id"])})
    buyer = await db.users.find_one({"_id": ObjectId(operation["buyer_id"])})

    if not seller or not buyer:
        raise HTTPException(status_code=404, detail="Seller or buyer not found")

    # ---- b) Last accepted offer ---------------------------------------------
    offer = operation["offers"][-1]

    # ---- c) Operation ID string ---------------------------------------------
    operation_id = str(operation["_id"])
    operation_id_short = operation_id[-8:].upper()
    operation_id_str = f"HSP-B2B-{operation_id_short}"

    # ---- d) AI contract text ------------------------------------------------
    contract_data = {
        "vendedor": {
            "nombre": seller.get("company_name", seller.get("name", "")),
            "cif": seller.get("cif", seller.get("nif", "N/A")),
            "direccion": seller.get("address", "N/A"),
            "email": seller.get("email", ""),
        },
        "comprador": {
            "nombre": buyer.get("company_name", buyer.get("name", "")),
            "cif": buyer.get("cif", buyer.get("nif", "N/A")),
            "direccion": buyer.get("address", "N/A"),
            "email": buyer.get("email", ""),
        },
        "producto": offer.get("product_name", ""),
        "cantidad": offer.get("quantity", 0),
        "unidad": offer.get("unit", "kg"),
        "precio_unitario": offer.get("price_per_unit", 0),
        "total": offer.get("total_price", 0),
        "incoterm": offer.get("incoterm", "EXW"),
        "condiciones_pago": offer.get("payment_terms", "Transferencia 30 días"),
        "entrega": offer.get("delivery_date", "A convenir"),
        "certificaciones": offer.get("certifications", []),
        "id_operacion": operation_id_str,
    }

    try:
        client = AsyncAnthropic()
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system="Eres un asistente legal especializado en contratos de compraventa internacional de alimentos. Genera contratos profesionales, claros y legalmente sólidos bajo derecho español y CISG. Responde SOLO con el texto del contrato en español, sin explicaciones adicionales.",
            messages=[{
                "role": "user",
                "content": (
                    f"Genera un contrato de compraventa con estos datos: "
                    f"{json.dumps(contract_data, ensure_ascii=False)}.\n"
                    "El contrato debe incluir:\n"
                    "1. Identificación de las partes\n"
                    "2. Objeto del contrato\n"
                    "3. Precio y condiciones de pago\n"
                    "4. Incoterm y condiciones de entrega\n"
                    "5. Certificaciones y calidad\n"
                    "6. Cláusula de comisión de plataforma (3% a cargo del vendedor, "
                    "gestionada por Hispaloshop SL)\n"
                    "7. Ley aplicable: Derecho español y CISG\n"
                    "8. Resolución de disputas: mediación por Hispaloshop, arbitraje "
                    "si no se resuelve\n"
                    "9. Cláusula de confidencialidad\n"
                    "10. Vigencia y rescisión\n"
                    "Formato: texto corrido con numeración de cláusulas. Sin tablas. "
                    "Máximo 1500 palabras."
                ),
            }],
        )
        contract_text = message.content[0].text
    except Exception as e:
        logger.error(f"[B2B_CONTRACT] Claude API failed: {e}")
        raise HTTPException(status_code=502, detail="Contract AI generation failed")

    # ---- e) Build PDF -------------------------------------------------------
    seller_name = seller.get("company_name", seller.get("name", ""))
    buyer_name = buyer.get("company_name", buyer.get("name", ""))

    pdf_bytes = _build_contract_pdf(
        operation_id_str=operation_id_str,
        seller=seller,
        buyer=buyer,
        seller_name=seller_name,
        buyer_name=buyer_name,
        offer=offer,
        contract_text=contract_text,
    )

    # ---- f) Upload to Cloudinary --------------------------------------------
    try:
        result = cloudinary.uploader.upload(
            pdf_bytes,
            folder="hispaloshop/b2b_contracts",
            public_id=f"HSP-B2B-{operation_id_short}-v{int(time.time())}",
            resource_type="raw",
            type="authenticated",
        )
        pdf_url = result["secure_url"]
    except Exception as e:
        logger.error(f"[B2B_CONTRACT] Cloudinary upload failed: {e}")
        raise HTTPException(status_code=502, detail="Contract PDF upload failed")

    # ---- g) Hash + return ---------------------------------------------------
    contract_hash = hashlib.sha256(pdf_bytes).hexdigest()
    generated_at = datetime.now(timezone.utc).isoformat()

    logger.info(
        f"[B2B_CONTRACT] Contract generated: {operation_id_str} | "
        f"hash={contract_hash[:16]}…"
    )

    return {
        "pdf_url": pdf_url,
        "contract_hash": contract_hash,
        "generated_at": generated_at,
    }


# ============================= 2. seal_contract ============================
async def seal_contract(operation: dict, db) -> dict:
    """
    Seal a fully-signed contract: overlay signatures + 'FIRMADO' watermark.

    Returns: { pdf_url, contract_hash }
    """
    contract = operation.get("contract", {})
    original_url = contract.get("pdf_url", "")
    operation_id = str(operation["_id"])
    operation_id_short = operation_id[-8:].upper()

    seller = await db.users.find_one({"_id": ObjectId(operation["seller_id"])})
    buyer = await db.users.find_one({"_id": ObjectId(operation["buyer_id"])})

    if not seller or not buyer:
        raise HTTPException(status_code=404, detail="Seller or buyer not found")

    # ---- a) Download original PDF -------------------------------------------
    async with httpx.AsyncClient() as http:
        resp = await http.get(original_url)
        original_pdf_bytes = resp.content

    # ---- b) Signature URLs from user profiles / operation signatures --------
    seller_sig = operation.get("signatures", {}).get("seller", {})
    buyer_sig = operation.get("signatures", {}).get("buyer", {})

    seller_sig_url = seller_sig.get("signature_url", seller.get("signature_url", ""))
    buyer_sig_url = buyer_sig.get("signature_url", buyer.get("signature_url", ""))

    seller_stamp_url = seller.get("stamp_url", "")
    buyer_stamp_url = buyer.get("stamp_url", "")

    # Download signature / stamp images
    sig_images = {}
    async with httpx.AsyncClient() as http:
        for key, url in [
            ("seller_sig", seller_sig_url),
            ("buyer_sig", buyer_sig_url),
            ("seller_stamp", seller_stamp_url),
            ("buyer_stamp", buyer_stamp_url),
        ]:
            if url:
                try:
                    r = await http.get(url)
                    sig_images[key] = r.content
                except Exception as e:
                    logger.warning(f"[B2B_CONTRACT] Could not download {key}: {e}")

    # ---- c) Build signature overlay -----------------------------------------
    reader = PdfReader(io.BytesIO(original_pdf_bytes))
    writer = PdfWriter()
    num_pages = len(reader.pages)

    seller_name = seller.get("company_name", seller.get("name", ""))
    buyer_name = buyer.get("company_name", buyer.get("name", ""))
    seller_date = seller_sig.get("signed_at", datetime.now(timezone.utc).isoformat())
    buyer_date = buyer_sig.get("signed_at", datetime.now(timezone.utc).isoformat())
    seller_ip = seller_sig.get("ip", "N/A")
    buyer_ip = buyer_sig.get("ip", "N/A")

    page_width, page_height = A4

    # Signature overlay for the last page
    sig_overlay_buf = io.BytesIO()
    c = pdfcanvas.Canvas(sig_overlay_buf, pagesize=A4)

    sig_y = 80  # bottom area
    sig_width = 120
    sig_height = 50

    # Seller signature (left side)
    if sig_images.get("seller_sig"):
        _draw_image_on_canvas(c, sig_images["seller_sig"], 2.5 * cm, sig_y, sig_width, sig_height)
    if sig_images.get("seller_stamp"):
        c.saveState()
        c.setFillAlpha(0.6)
        _draw_image_on_canvas(c, sig_images["seller_stamp"], 2.5 * cm, sig_y, sig_width, sig_height)
        c.restoreState()
    c.setFont("Helvetica", 9)
    c.setFillColor(STONE_700)
    c.drawString(2.5 * cm, sig_y - 10, seller_name)
    c.drawString(2.5 * cm, sig_y - 22, f"Fecha: {seller_date[:10]}")
    c.drawString(2.5 * cm, sig_y - 34, f"IP: {seller_ip}")

    # Buyer signature (right side)
    right_x = page_width / 2 + 1 * cm
    if sig_images.get("buyer_sig"):
        _draw_image_on_canvas(c, sig_images["buyer_sig"], right_x, sig_y, sig_width, sig_height)
    if sig_images.get("buyer_stamp"):
        c.saveState()
        c.setFillAlpha(0.6)
        _draw_image_on_canvas(c, sig_images["buyer_stamp"], right_x, sig_y, sig_width, sig_height)
        c.restoreState()
    c.drawString(right_x, sig_y - 10, buyer_name)
    c.drawString(right_x, sig_y - 22, f"Fecha: {buyer_date[:10]}")
    c.drawString(right_x, sig_y - 34, f"IP: {buyer_ip}")

    c.save()
    sig_overlay_buf.seek(0)
    sig_overlay_reader = PdfReader(sig_overlay_buf)

    # ---- d) 'FIRMADO' watermark on every page --------------------------------
    for i in range(num_pages):
        page = reader.pages[i]

        # Watermark overlay
        wm_buf = io.BytesIO()
        wm_canvas = pdfcanvas.Canvas(wm_buf, pagesize=A4)
        wm_canvas.saveState()
        wm_canvas.setFillColor(HexColor("#2E7D52"))
        wm_canvas.setFillAlpha(0.05)
        wm_canvas.setFont("Helvetica-Bold", 72)
        wm_canvas.translate(page_width / 2, page_height / 2)
        wm_canvas.rotate(45)
        wm_canvas.drawCentredString(0, 0, "FIRMADO")
        wm_canvas.restoreState()
        wm_canvas.save()
        wm_buf.seek(0)
        wm_reader = PdfReader(wm_buf)
        page.merge_page(wm_reader.pages[0])

        # Merge signature overlay on last page only
        if i == num_pages - 1 and sig_overlay_reader.pages:
            page.merge_page(sig_overlay_reader.pages[0])

        writer.add_page(page)

    # ---- e) Produce final PDF bytes -----------------------------------------
    output_buf = io.BytesIO()
    writer.write(output_buf)
    sealed_pdf_bytes = output_buf.getvalue()

    # ---- f) Upload sealed PDF -----------------------------------------------
    try:
        result = cloudinary.uploader.upload(
            sealed_pdf_bytes,
            folder="hispaloshop/b2b_contracts",
            public_id=f"HSP-B2B-{operation_id_short}-sealed-v{int(time.time())}",
            resource_type="raw",
            type="authenticated",
        )
        pdf_url = result["secure_url"]
    except Exception as e:
        logger.error(f"[B2B_CONTRACT] Sealed PDF upload failed: {e}")
        raise HTTPException(status_code=502, detail="Sealed contract upload failed")

    # ---- g) Hash + return ---------------------------------------------------
    contract_hash = hashlib.sha256(sealed_pdf_bytes).hexdigest()

    logger.info(
        f"[B2B_CONTRACT] Contract sealed: HSP-B2B-{operation_id_short} | "
        f"hash={contract_hash[:16]}…"
    )

    return {
        "pdf_url": pdf_url,
        "contract_hash": contract_hash,
    }


# ============================= 3. notify_contract_ready ====================
async def notify_contract_ready(operation: dict, db):
    """
    Email both parties that the contract is ready for signing.
    """
    seller = await db.users.find_one({"_id": ObjectId(operation["seller_id"])})
    buyer = await db.users.find_one({"_id": ObjectId(operation["buyer_id"])})

    offer = operation["offers"][-1]
    operation_id = str(operation["_id"])
    operation_id_short = operation_id[-8:].upper()
    operation_id_str = f"HSP-B2B-{operation_id_short}"

    subject = f"Contrato listo para firmar — #{operation_id_str}"
    html = f"""
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
  <h2 style="color: #0A0A0A;">Tu contrato B2B está listo</h2>
  <p>El contrato para la operación <strong>{operation_id_str}</strong> ha sido generado y está listo para tu firma.</p>
  <p><strong>Producto:</strong> {offer.get('product_name', '')}<br>
  <strong>Cantidad:</strong> {offer.get('quantity', '')} {offer.get('unit', '')}<br>
  <strong>Total:</strong> €{offer.get('total_price', 0):.2f}</p>
  <a href="{_FRONTEND_URL}/b2b/contract/{operation_id}"
     style="display:inline-block; background:#0A0A0A; color:#fff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:500;">
    Ver contrato →
  </a>
  <p style="font-size:12px; color:#8A8881; margin-top:24px;">Hispaloshop SL</p>
</div>
"""

    for user in [seller, buyer]:
        if user and user.get("email"):
            try:
                send_email(to=user["email"], subject=subject, html=html)
                logger.info(
                    f"[B2B_CONTRACT] Contract-ready email sent to {user['email']}"
                )
            except Exception as e:
                logger.error(
                    f"[B2B_CONTRACT] Failed to send contract-ready email "
                    f"to {user.get('email')}: {e}"
                )
        # In-app notification (so it appears in notification center)
        if user and user.get("user_id"):
            try:
                await db.notifications.insert_one({
                    "user_id": user["user_id"],
                    "type": "b2b_contract_ready",
                    "title": "Contrato listo para firmar",
                    "body": f"El contrato {operation_id_str} está listo para tu firma.",
                    "action_url": f"/b2b/contract/{operation_id}",
                    "data": {"operation_id": operation_id},
                    "channels": ["in_app"],
                    "status_by_channel": {"in_app": "sent"},
                    "read_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception:
                pass


# ============================= 4. notify_contract_signed ===================
async def notify_contract_signed(operation: dict, db):
    """
    Email both parties that the contract has been fully signed.
    """
    seller = await db.users.find_one({"_id": ObjectId(operation["seller_id"])})
    buyer = await db.users.find_one({"_id": ObjectId(operation["buyer_id"])})

    offer = operation["offers"][-1]
    operation_id = str(operation["_id"])
    operation_id_short = operation_id[-8:].upper()
    operation_id_str = f"HSP-B2B-{operation_id_short}"

    seller_name = seller.get("company_name", seller.get("name", "")) if seller else ""
    buyer_name = buyer.get("company_name", buyer.get("name", "")) if buyer else ""

    subject = f"Contrato firmado — #{operation_id_str}"
    html = f"""
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
  <h2 style="color: #0A0A0A;">Contrato firmado por ambas partes</h2>
  <p>El contrato de la operación <strong>{operation_id_str}</strong> ha sido firmado por ambas partes.</p>
  <p><strong>Vendedor:</strong> {seller_name}<br>
  <strong>Comprador:</strong> {buyer_name}<br>
  <strong>Producto:</strong> {offer.get('product_name', '')}<br>
  <strong>Total:</strong> €{offer.get('total_price', 0):.2f}</p>
  <p>El contrato sellado está disponible en tu panel de operaciones B2B.</p>
  <a href="{_FRONTEND_URL}/b2b/contract/{operation_id}"
     style="display:inline-block; background:#0A0A0A; color:#fff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:500;">
    Ver contrato firmado →
  </a>
  <p style="font-size:12px; color:#8A8881; margin-top:24px;">Hispaloshop SL</p>
</div>
"""

    for user in [seller, buyer]:
        if user and user.get("email"):
            try:
                send_email(to=user["email"], subject=subject, html=html)
                logger.info(
                    f"[B2B_CONTRACT] Contract-signed email sent to {user['email']}"
                )
            except Exception as e:
                logger.error(
                    f"[B2B_CONTRACT] Failed to send contract-signed email "
                    f"to {user.get('email')}: {e}"
                )
        # In-app notification
        if user and user.get("user_id"):
            try:
                await db.notifications.insert_one({
                    "user_id": user["user_id"],
                    "type": "b2b_contract_signed",
                    "title": "Contrato firmado",
                    "body": f"El contrato {operation_id_str} ha sido firmado por ambas partes.",
                    "action_url": f"/b2b/contract/{operation_id}",
                    "data": {"operation_id": operation_id},
                    "channels": ["in_app"],
                    "status_by_channel": {"in_app": "sent"},
                    "read_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception:
                pass


# ===========================================================================
# Internal helpers
# ===========================================================================

def _draw_image_on_canvas(c, image_bytes: bytes, x, y, width, height):
    """Draw raw image bytes onto a reportlab canvas."""
    from reportlab.lib.utils import ImageReader
    img_buf = io.BytesIO(image_bytes)
    try:
        img = ImageReader(img_buf)
        c.drawImage(img, x, y, width=width, height=height, preserveAspectRatio=True, mask="auto")
    except Exception as e:
        logger.warning(f"[B2B_CONTRACT] Could not draw image on canvas: {e}")


def _build_contract_pdf(
    operation_id_str: str,
    seller: dict,
    buyer: dict,
    seller_name: str,
    buyer_name: str,
    offer: dict,
    contract_text: str,
) -> bytes:
    """
    Build the contract PDF and return raw bytes.
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    style_title = ParagraphStyle(
        "ContractTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=4,
        textColor=STONE_950,
    )
    style_subtitle = ParagraphStyle(
        "ContractSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        alignment=TA_CENTER,
        spaceAfter=8,
        textColor=STONE_700,
    )
    style_date = ParagraphStyle(
        "ContractDate",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        alignment=TA_RIGHT,
        textColor=STONE_500,
    )
    style_party = ParagraphStyle(
        "PartyInfo",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=STONE_700,
    )
    style_party_bold = ParagraphStyle(
        "PartyBold",
        parent=style_party,
        fontName="Helvetica-Bold",
        textColor=STONE_950,
    )
    style_body = ParagraphStyle(
        "ContractBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12.6,  # 1.4x line height
        textColor=STONE_950,
        spaceAfter=6,
    )
    style_section = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=STONE_950,
        spaceBefore=14,
        spaceAfter=6,
    )

    elements = []

    # -- Header ---------------------------------------------------------------
    elements.append(Paragraph("HISPALOSHOP", style_title))
    elements.append(Paragraph("Contrato de Compraventa Internacional", style_subtitle))

    now = datetime.now(timezone.utc)
    date_str = now.strftime("%d/%m/%Y")
    elements.append(
        Paragraph(f"{date_str} &nbsp;&nbsp; #{operation_id_str}", style_date)
    )
    elements.append(Spacer(1, 6))

    # -- Green separator ------------------------------------------------------
    elements.append(_green_line())
    elements.append(Spacer(1, 10))

    # -- Two-column parties block ---------------------------------------------
    seller_info = (
        f"<b>{seller_name}</b><br/>"
        f"CIF/NIF: {seller.get('cif', seller.get('nif', 'N/A'))}<br/>"
        f"Dirección: {seller.get('address', 'N/A')}<br/>"
        f"Email: {seller.get('email', '')}"
    )
    buyer_info = (
        f"<b>{buyer_name}</b><br/>"
        f"CIF/NIF: {buyer.get('cif', buyer.get('nif', 'N/A'))}<br/>"
        f"Dirección: {buyer.get('address', 'N/A')}<br/>"
        f"Email: {buyer.get('email', '')}"
    )

    parties_data = [
        [
            Paragraph("<b>VENDEDOR</b>", style_party_bold),
            Paragraph("<b>COMPRADOR</b>", style_party_bold),
        ],
        [
            Paragraph(seller_info, style_party),
            Paragraph(buyer_info, style_party),
        ],
    ]

    col_width = (A4[0] - 5 * cm) / 2
    parties_table = Table(parties_data, colWidths=[col_width, col_width])
    parties_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(parties_table)
    elements.append(Spacer(1, 10))

    # -- Green separator ------------------------------------------------------
    elements.append(_green_line())
    elements.append(Spacer(1, 10))

    # -- Terms summary table --------------------------------------------------
    price_per_unit = offer.get("price_per_unit", 0)
    quantity = offer.get("quantity", 0)
    total_price = offer.get("total_price", 0)
    product_name = offer.get("product_name", "")
    unit = offer.get("unit", "kg")
    incoterm = offer.get("incoterm", "EXW")
    payment_terms = offer.get("payment_terms", "Transferencia 30 días")
    delivery_date = offer.get("delivery_date", "A convenir")
    validity = offer.get("validity", "30 días")

    terms_data = [
        ["Producto", "Cantidad", "Precio/ud", "Total"],
        [product_name, f"{quantity} {unit}", f"€{price_per_unit:.2f}", f"€{total_price:.2f}"],
        ["Incoterm", "Pago", "Entrega", "Validez"],
        [incoterm, payment_terms, str(delivery_date), validity],
    ]

    terms_table = Table(terms_data, colWidths=[col_width * 0.55, col_width * 0.45, col_width * 0.45, col_width * 0.55])
    terms_table.setStyle(TableStyle([
        # Header rows (row 0, row 2)
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 2), (-1, 2), BLACK),
        ("TEXTCOLOR", (0, 2), (-1, 2), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        # Data rows (row 1, row 3)
        ("BACKGROUND", (0, 1), (-1, 1), STONE_100),
        ("BACKGROUND", (0, 3), (-1, 3), STONE_200),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, STONE_500),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(terms_table)
    elements.append(Spacer(1, 16))

    # -- Contract text from AI ------------------------------------------------
    paragraphs = contract_text.split("\n")
    for para in paragraphs:
        para = para.strip()
        if not para:
            elements.append(Spacer(1, 4))
            continue
        elements.append(Paragraph(para, style_body))

    elements.append(Spacer(1, 24))

    # -- Signatures section ---------------------------------------------------
    elements.append(Paragraph("FIRMAS", style_section))
    elements.append(Spacer(1, 8))

    sig_style = ParagraphStyle(
        "SigBox",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        textColor=STONE_700,
    )

    seller_sig_text = (
        f"<b>VENDEDOR</b><br/>"
        f"{seller_name}<br/>"
        f"Fecha: ___________<br/>"
        f"Firma:"
    )
    buyer_sig_text = (
        f"<b>COMPRADOR</b><br/>"
        f"{buyer_name}<br/>"
        f"Fecha: ___________<br/>"
        f"Firma:"
    )

    sig_data = [[
        Paragraph(seller_sig_text, sig_style),
        Paragraph(buyer_sig_text, sig_style),
    ]]

    sig_table = Table(sig_data, colWidths=[col_width, col_width], rowHeights=[80])
    sig_table.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 1, STONE_500),
        ("BOX", (1, 0), (1, 0), 1, STONE_500),
        ("LINESTYLE", (0, 0), (0, 0), "DASHED"),
        ("LINESTYLE", (1, 0), (1, 0), "DASHED"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(sig_table)

    # -- Build with footer ----------------------------------------------------
    def footer_fn(canvas_obj, doc_obj):
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(STONE_500)
        page_text = (
            f"Hispaloshop SL · Contrato #{operation_id_str} · "
            f"Página {doc_obj.page} de {{total}}"
        )
        canvas_obj.drawCentredString(A4[0] / 2, 1.2 * cm, page_text)
        canvas_obj.restoreState()

    # We need a two-pass approach for "Page X of Y"
    # First pass to get total pages, then rebuild
    doc.build(elements, onFirstPage=footer_fn, onLaterPages=footer_fn)
    total_pages = doc.page

    # Rebuild with correct total
    buf = io.BytesIO()
    doc2 = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    # Recreate elements (platypus elements are consumed after build)
    elements2 = []
    elements2.append(Paragraph("HISPALOSHOP", style_title))
    elements2.append(Paragraph("Contrato de Compraventa Internacional", style_subtitle))
    elements2.append(Paragraph(f"{date_str} &nbsp;&nbsp; #{operation_id_str}", style_date))
    elements2.append(Spacer(1, 6))
    elements2.append(_green_line())
    elements2.append(Spacer(1, 10))

    parties_data2 = [
        [
            Paragraph("<b>VENDEDOR</b>", style_party_bold),
            Paragraph("<b>COMPRADOR</b>", style_party_bold),
        ],
        [
            Paragraph(seller_info, style_party),
            Paragraph(buyer_info, style_party),
        ],
    ]
    parties_table2 = Table(parties_data2, colWidths=[col_width, col_width])
    parties_table2.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements2.append(parties_table2)
    elements2.append(Spacer(1, 10))
    elements2.append(_green_line())
    elements2.append(Spacer(1, 10))

    terms_data2 = [
        ["Producto", "Cantidad", "Precio/ud", "Total"],
        [product_name, f"{quantity} {unit}", f"€{price_per_unit:.2f}", f"€{total_price:.2f}"],
        ["Incoterm", "Pago", "Entrega", "Validez"],
        [incoterm, payment_terms, str(delivery_date), validity],
    ]
    terms_table2 = Table(terms_data2, colWidths=[col_width * 0.55, col_width * 0.45, col_width * 0.45, col_width * 0.55])
    terms_table2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 2), (-1, 2), BLACK),
        ("TEXTCOLOR", (0, 2), (-1, 2), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 1), (-1, 1), STONE_100),
        ("BACKGROUND", (0, 3), (-1, 3), STONE_200),
        ("GRID", (0, 0), (-1, -1), 0.5, STONE_500),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements2.append(terms_table2)
    elements2.append(Spacer(1, 16))

    for para in paragraphs:
        para = para.strip()
        if not para:
            elements2.append(Spacer(1, 4))
            continue
        elements2.append(Paragraph(para, style_body))

    elements2.append(Spacer(1, 24))
    elements2.append(Paragraph("FIRMAS", style_section))
    elements2.append(Spacer(1, 8))

    sig_data2 = [[
        Paragraph(seller_sig_text, sig_style),
        Paragraph(buyer_sig_text, sig_style),
    ]]
    sig_table2 = Table(sig_data2, colWidths=[col_width, col_width], rowHeights=[80])
    sig_table2.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 1, STONE_500),
        ("BOX", (1, 0), (1, 0), 1, STONE_500),
        ("LINESTYLE", (0, 0), (0, 0), "DASHED"),
        ("LINESTYLE", (1, 0), (1, 0), "DASHED"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements2.append(sig_table2)

    final_total = total_pages

    def footer_fn2(canvas_obj, doc_obj):
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(STONE_500)
        page_text = (
            f"Hispaloshop SL · Contrato #{operation_id_str} · "
            f"Página {doc_obj.page} de {final_total}"
        )
        canvas_obj.drawCentredString(A4[0] / 2, 1.2 * cm, page_text)
        canvas_obj.restoreState()

    doc2.build(elements2, onFirstPage=footer_fn2, onLaterPages=footer_fn2)

    return buf.getvalue()


def _green_line():
    """Return a thin green horizontal rule as a Table."""
    line = Table([[""]], colWidths=[A4[0] - 5 * cm], rowHeights=[1.5])
    line.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN_PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return line
