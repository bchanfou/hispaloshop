"""
Auto-generate a digital product certificate with QR code.
Called after product creation/update when the product has certifications.
"""
import io
import base64
from datetime import datetime, timezone

import qrcode

from ..core.config import db


async def generate_product_certificate(
    product_id: str,
    product: dict,
    producer: dict,
) -> dict:
    """
    Generate (or regenerate) a digital certificate for a product.
    Returns the certificate document stored in MongoDB.
    """
    cert_id = f"HSP-{product_id[-8:].upper()}-{datetime.now(timezone.utc).strftime('%Y%m')}"
    verify_url = f"https://hispaloshop.com/certificate/{product_id}"

    # ── QR code ──────────────────────────────────────────
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_b64 = base64.b64encode(qr_buffer.getvalue()).decode()

    cert_doc = {
        "certificate_id": cert_id,
        "product_id": product_id,
        "producer_id": producer.get("user_id", ""),
        "product_name": product.get("name", ""),
        "certifications": product.get("certifications") or [],
        "nutritional_info": product.get("nutritional_info") or {},
        "ingredients": product.get("ingredients") or [],
        "country_origin": product.get("country_origin", ""),
        "qr_code_b64": qr_b64,
        "verify_url": verify_url,
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }

    await db.product_certificates.update_one(
        {"product_id": product_id},
        {"$set": cert_doc},
        upsert=True,
    )

    return cert_doc
