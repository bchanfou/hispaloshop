"""
Fiscal certificate verification service.
Uses Claude Haiku vision to analyze tax residency certificates.
"""
import os
import logging
import httpx
from anthropic import AsyncAnthropic
import base64
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# EU member states (ISO 3166-1 alpha-2)
EU_COUNTRIES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
}


def get_tax_region(country_code: str) -> str:
    """Determine tax region from country code."""
    if not country_code:
        return "unknown"
    code = country_code.upper()
    if code in EU_COUNTRIES:
        return "EU"
    return "non-EU"


def calculate_withholding(country_code: str) -> float:
    """Withholding percentage — always 0%.
    HispaloShop LLC (Florida, USA) is NOT a withholding agent in any jurisdiction.
    All payouts are gross. Sellers/influencers are responsible for their own tax filings.
    Legacy 15% IRPF for Spain removed in section 4.2.
    """
    return 0.0


async def verify_certificate(file_url: str, declared_country: str) -> dict:
    """
    Verify a tax residency certificate using Claude Haiku vision.

    Returns:
        dict with keys: is_valid, verified, country_match, withholding_pct,
        affiliate_blocked, block_reason, needs_manual_review,
        entity_name, issue_date, expiry_date, confidence, verified_by
    """
    result = {
        "is_valid": False,
        "verified": False,
        "country_match": False,
        "withholding_pct": 0.0,
        "affiliate_blocked": True,
        "block_reason": None,
        "needs_manual_review": False,
        "entity_name": None,
        "issue_date": None,
        "expiry_date": None,
        "confidence": "low",
        "verified_by": "ai",
    }

    try:
        # Download the certificate from Cloudinary
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.get(file_url)
            if resp.status_code != 200:
                result["block_reason"] = "No se pudo descargar el certificado"
                return result
            file_bytes = resp.content

        content_type = "image/jpeg"
        if file_url.lower().endswith(".png"):
            content_type = "image/png"
        elif file_url.lower().endswith(".pdf"):
            content_type = "application/pdf"
        elif file_url.lower().endswith(".webp"):
            content_type = "image/webp"

        file_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

        # Analyze with Claude Haiku vision
        client = AsyncAnthropic()

        if content_type == "application/pdf":
            # For PDFs, use document type
            message_content = [
                {
                    "type": "document",
                    "source": {"type": "base64", "media_type": "application/pdf", "data": file_b64},
                },
                {
                    "type": "text",
                    "text": (
                        "Analiza este documento. Determina:\n"
                        "1. ¿Es un certificado de residencia fiscal?\n"
                        "2. ¿Para qué país?\n"
                        "3. ¿Aparece un nombre de persona o empresa?\n"
                        "4. ¿Tiene fecha de emisión y/o caducidad?\n"
                        "Responde SOLO con JSON (sin markdown):\n"
                        '{"is_valid_certificate": bool, "country": "código ISO 2 letras o null", '
                        '"entity_name": "nombre o null", "issue_date": "YYYY-MM-DD o null", '
                        '"expiry_date": "YYYY-MM-DD o null", "confidence": "high|medium|low"}'
                    ),
                },
            ]
        else:
            message_content = [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": content_type, "data": file_b64},
                },
                {
                    "type": "text",
                    "text": (
                        "Analiza este documento. Determina:\n"
                        "1. ¿Es un certificado de residencia fiscal?\n"
                        "2. ¿Para qué país?\n"
                        "3. ¿Aparece un nombre de persona o empresa?\n"
                        "4. ¿Tiene fecha de emisión y/o caducidad?\n"
                        "Responde SOLO con JSON (sin markdown):\n"
                        '{"is_valid_certificate": bool, "country": "código ISO 2 letras o null", '
                        '"entity_name": "nombre o null", "issue_date": "YYYY-MM-DD o null", '
                        '"expiry_date": "YYYY-MM-DD o null", "confidence": "high|medium|low"}'
                    ),
                },
            ]

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": message_content}],
        )

        # Parse AI response
        import json
        raw_text = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        ai_result = json.loads(raw_text)

        result["entity_name"] = ai_result.get("entity_name")
        result["issue_date"] = ai_result.get("issue_date")
        result["expiry_date"] = ai_result.get("expiry_date")
        result["confidence"] = ai_result.get("confidence", "low")

        # Validation logic
        if not ai_result.get("is_valid_certificate"):
            result["block_reason"] = "Documento no reconocido como certificado de residencia fiscal"
            return result

        detected_country = (ai_result.get("country") or "").upper()
        declared = (declared_country or "").upper()

        if detected_country and declared and detected_country != declared:
            result["block_reason"] = (
                f"El país del certificado ({detected_country}) no coincide con el declarado ({declared})"
            )
            return result

        if result["confidence"] == "low":
            result["needs_manual_review"] = True
            result["block_reason"] = "Revisión manual pendiente"
            return result

        # All checks passed
        country = detected_country or declared
        result["is_valid"] = True
        result["verified"] = True
        result["country_match"] = True
        result["withholding_pct"] = calculate_withholding(country)
        result["affiliate_blocked"] = False
        result["block_reason"] = None

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI response for fiscal certificate")
        result["needs_manual_review"] = True
        result["block_reason"] = "Revisión manual pendiente (error de análisis)"
        return result
    except Exception as e:
        logger.error(f"Fiscal certificate verification error: {e}")
        result["needs_manual_review"] = True
        result["block_reason"] = "Revisión manual pendiente (error del sistema)"
        return result
