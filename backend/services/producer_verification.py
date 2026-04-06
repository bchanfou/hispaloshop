"""
Producer/Importer verification service.
Uses Claude Haiku vision to verify CIF/NIF documents,
facility photos, and product certificates.
"""
import os
import json
import logging
import base64
from datetime import datetime, timezone, timedelta

import httpx
from anthropic import AsyncAnthropic

from core.database import db

logger = logging.getLogger(__name__)

# Business ID format validation is now in services/document_formats.py (multi-country).


# ── Helpers ───────────────────────────────────────────────────────

def _detect_content_type(url: str) -> str:
    """Detect media type from URL extension."""
    lower = url.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


async def _download_file(url: str) -> bytes | None:
    """Download file from Cloudinary URL."""
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.get(url)
            if resp.status_code == 200:
                return resp.content
    except Exception as e:
        logger.error("Download failed for %s: %s", url, e)
    return None


def _build_vision_message(file_b64: str, content_type: str, prompt_text: str) -> list:
    """Build Claude message content for vision analysis."""
    if content_type == "application/pdf":
        return [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": file_b64}},
            {"type": "text", "text": prompt_text},
        ]
    return [
        {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": file_b64}},
        {"type": "text", "text": prompt_text},
    ]


def _parse_ai_json(raw_text: str) -> dict:
    """Parse JSON from AI response, stripping markdown fences."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
    return json.loads(text)


# ── verify_cif_nif ───────────────────────────────────────────────

async def verify_cif_nif(file_url: str, country: str = "ES") -> dict:
    """
    Extract and verify business ID from an official document.
    Step 1: AI extracts the ID from the document image.
    Step 2: Algorithmic format/checksum validation per country.
    Step 3: Confidence → auto-approve, flag for manual review, or reject.
    Returns: status, tax_id, entity_name, document_type, confidence
    """
    result = {
        "status": "rejected",
        "tax_id": None,
        "entity_name": None,
        "document_type": None,
        "confidence": "low",
        "rejection_reason": None,
        "country": country,
    }

    file_bytes = await _download_file(file_url)
    if not file_bytes:
        result["rejection_reason"] = "No se pudo descargar el documento"
        return result

    content_type = _detect_content_type(file_url)
    file_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

    prompt = (
        "Analiza este documento oficial español. Extrae:\n"
        "1. CIF o NIF (formato: letra+8dígitos o letra+7dígitos+letra)\n"
        "2. Nombre de la empresa o persona\n"
        "3. Tipo de documento (CIF empresarial / NIF personal / Otro)\n"
        "4. ¿Es un documento oficial válido?\n"
        "Responde SOLO con JSON:\n"
        '{"tax_id": "CIF/NIF o null", "entity_name": "nombre o null", '
        '"document_type": "cif|nif|other", "is_official": true/false, '
        '"confidence": "high|medium|low"}'
    )

    try:
        client = AsyncAnthropic()
        message_content = _build_vision_message(file_b64, content_type, prompt)

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": message_content}],
        )

        ai = _parse_ai_json(response.content[0].text)
        result["confidence"] = ai.get("confidence", "low")
        result["entity_name"] = ai.get("entity_name")

        # Check if official document
        if not ai.get("is_official"):
            result["rejection_reason"] = "El documento no se reconoce como oficial"
            return result

        extracted_id = ai.get("tax_id")
        if not extracted_id:
            result["rejection_reason"] = "No se pudo extraer el CIF/NIF del documento"
            return result

        # Validate format/checksum using country-specific validator
        from services.document_formats import validate_business_id
        fmt = validate_business_id(country, extracted_id)
        if not fmt["valid"]:
            result["rejection_reason"] = f"Formato inválido ({country}): {fmt.get('error', extracted_id)}"
            result["tax_id"] = extracted_id
            return result

        result["tax_id"] = fmt["formatted"]
        result["document_type"] = fmt.get("type", ai.get("document_type"))
        result["format_validation"] = fmt.get("validation_level", "none")

        if result["confidence"] == "low":
            result["status"] = "manual_review"
            result["rejection_reason"] = "Confianza baja — revisión manual pendiente"
        else:
            result["status"] = "verified"

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI response for CIF/NIF verification")
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error de análisis)"
        return result
    except Exception as e:
        logger.error("CIF/NIF verification error: %s", e)
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error del sistema)"
        return result


# ── verify_facility_photo ────────────────────────────────────────

async def verify_facility_photo(file_url: str) -> dict:
    """
    Verify a facility photo using Claude Haiku vision.
    Returns: status, description, confidence
    """
    result = {
        "status": "rejected",
        "description": None,
        "confidence": "low",
        "rejection_reason": None,
    }

    file_bytes = await _download_file(file_url)
    if not file_bytes:
        result["rejection_reason"] = "No se pudo descargar la imagen"
        return result

    content_type = _detect_content_type(file_url)
    if content_type == "application/pdf":
        result["rejection_reason"] = "La foto de instalación debe ser una imagen (JPG/PNG), no un PDF"
        return result

    file_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

    prompt = (
        "Analiza esta fotografía. Determina:\n"
        "1. ¿Muestra una instalación productiva, almacén, obrador, campo de cultivo, "
        "tienda o lugar de trabajo relacionado con la producción o distribución de alimentos?\n"
        "2. ¿La imagen es una fotografía real (no una ilustración ni captura de pantalla)?\n"
        "3. Describe brevemente lo que ves.\n"
        "Responde SOLO con JSON:\n"
        '{"shows_facility": true/false, "is_real_photo": true/false, '
        '"description": "descripción breve", "confidence": "high|medium|low"}'
    )

    try:
        client = AsyncAnthropic()
        message_content = _build_vision_message(file_b64, content_type, prompt)

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": message_content}],
        )

        ai = _parse_ai_json(response.content[0].text)
        result["confidence"] = ai.get("confidence", "low")
        result["description"] = ai.get("description")

        if not ai.get("is_real_photo"):
            result["rejection_reason"] = "La imagen no parece ser una fotografía real"
            return result

        if not ai.get("shows_facility"):
            result["rejection_reason"] = (
                "La imagen no muestra una instalación productiva, almacén u obrador "
                "relacionado con la producción de alimentos"
            )
            return result

        if result["confidence"] == "low":
            result["status"] = "manual_review"
            result["rejection_reason"] = "Confianza baja — revisión manual pendiente"
        else:
            result["status"] = "verified"

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI response for facility photo")
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error de análisis)"
        return result
    except Exception as e:
        logger.error("Facility photo verification error: %s", e)
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error del sistema)"
        return result


# ── verify_certificate ───────────────────────────────────────────

CERT_TYPE_LABELS = {
    "ecological_eu": "Ecológico UE",
    "dop": "Denominación de Origen Protegida (DOP)",
    "igp": "Indicación Geográfica Protegida (IGP)",
    "halal": "Halal",
    "gluten_free": "Sin Gluten",
    "vegan": "Vegano",
    "other": "Otro",
}


async def verify_certificate(file_url: str, cert_type: str) -> dict:
    """
    Verify a product/quality certificate using Claude Haiku vision.
    Returns: status, issued_to, issuer, issue_date, expiry_date, confidence, expiry_warning
    """
    label = CERT_TYPE_LABELS.get(cert_type, cert_type)
    result = {
        "status": "rejected",
        "issued_to": None,
        "issuer": None,
        "issue_date": None,
        "expiry_date": None,
        "confidence": "low",
        "rejection_reason": None,
        "expiry_warning": None,
    }

    file_bytes = await _download_file(file_url)
    if not file_bytes:
        result["rejection_reason"] = "No se pudo descargar el certificado"
        return result

    content_type = _detect_content_type(file_url)
    file_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

    prompt = (
        f"Analiza este certificado de {label}. Extrae:\n"
        f"1. ¿Es un certificado válido de {label}?\n"
        "2. ¿A quién está emitido? (empresa/persona)\n"
        "3. Fecha de emisión (YYYY-MM-DD)\n"
        "4. Fecha de caducidad (YYYY-MM-DD o null si no caduca)\n"
        "5. Entidad emisora\n"
        "Responde SOLO con JSON:\n"
        '{"is_valid_certificate": true/false, "issued_to": "nombre o null", '
        '"issuer": "entidad o null", "issue_date": "YYYY-MM-DD o null", '
        '"expiry_date": "YYYY-MM-DD o null", "confidence": "high|medium|low"}'
    )

    try:
        client = AsyncAnthropic()
        message_content = _build_vision_message(file_b64, content_type, prompt)

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": message_content}],
        )

        ai = _parse_ai_json(response.content[0].text)
        result["confidence"] = ai.get("confidence", "low")
        result["issued_to"] = ai.get("issued_to")
        result["issuer"] = ai.get("issuer")
        result["issue_date"] = ai.get("issue_date")
        result["expiry_date"] = ai.get("expiry_date")

        if not ai.get("is_valid_certificate"):
            result["rejection_reason"] = f"No se reconoce como un certificado válido de {label}"
            return result

        # Check expiry
        if result["expiry_date"]:
            try:
                expiry = datetime.strptime(result["expiry_date"], "%Y-%m-%d").date()
                today = datetime.now(timezone.utc).date()
                if expiry < today:
                    result["status"] = "expired"
                    result["rejection_reason"] = f"El certificado caducó el {result['expiry_date']}"
                    return result
                days_left = (expiry - today).days
                if days_left <= 30:
                    result["expiry_warning"] = f"Caduca en {days_left} días"
            except ValueError:
                pass

        if result["confidence"] == "low":
            result["status"] = "manual_review"
            result["rejection_reason"] = "Confianza baja — revisión manual pendiente"
        else:
            result["status"] = "verified"

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI response for certificate verification")
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error de análisis)"
        return result
    except Exception as e:
        logger.error("Certificate verification error: %s", e)
        result["status"] = "manual_review"
        result["rejection_reason"] = "Revisión manual pendiente (error del sistema)"
        return result


# ── run_full_verification ────────────────────────────────────────

async def run_full_verification(user_id: str) -> dict:
    """
    Orchestrate full verification for a producer/importer.
    Checks all documents and determines the global result.

    Returns the updated verification_status dict.
    """
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return {"error": "User not found"}

    vs = user.get("verification_status", {})
    docs = vs.get("documents", {})

    cif_doc = docs.get("cif_nif", {})
    facility_doc = docs.get("facility_photo", {})
    certs = docs.get("certificates", [])

    # ── Evaluate each document ──
    cif_ok = cif_doc.get("status") == "verified"
    cif_low = cif_doc.get("status") == "manual_review"
    cif_rejected = cif_doc.get("status") == "rejected"

    facility_ok = facility_doc.get("status") == "verified"
    facility_low = facility_doc.get("status") == "manual_review"

    # At least 1 verified, non-expired certificate
    valid_certs = [c for c in certs if c.get("status") == "verified"]
    has_valid_cert = len(valid_certs) >= 1

    any_low_confidence = cif_low or facility_low
    any_cert_low = any(c.get("status") == "manual_review" for c in certs)

    # ── Determine global result ──
    now = datetime.now(timezone.utc)

    if cif_rejected:
        # Rejected — CIF invalid
        update = {
            "verification_status.is_verified": False,
            "verification_status.ai_confidence": "low",
            "verification_status.admin_review_required": False,
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": cif_doc.get("rejection_reason", "CIF/NIF rechazado"),
        }
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=user_id,
                title="Verificación rechazada",
                body="Algunos documentos necesitan ser revisados. Consulta los detalles en tu panel.",
                notification_type="verification_rejected",
                channels=["in_app", "push", "email"],
                action_url="/producer/verification",
            )
        except Exception as e:
            logger.warning(f"[VERIFICATION] Could not send rejection notification to {user_id}: {e}")

    elif cif_ok and facility_ok and has_valid_cert and not any_low_confidence and not any_cert_low:
        # APPROVED
        update = {
            "approved": True,
            "verification_status.is_verified": True,
            "verification_status.verified_at": now,
            "verification_status.verified_by": "ai",
            "verification_status.ai_confidence": "high",
            "verification_status.admin_review_required": False,
            "verification_status.admin_review_reason": None,
            "verification_status.blocked_from_selling": False,
            "verification_status.block_reason": None,
        }
        try:
            from services.notifications.dispatcher_service import notification_dispatcher
            await notification_dispatcher.send_notification(
                user_id=user_id,
                title="Cuenta verificada",
                body="Tu cuenta de productor ha sido verificada. Ya puedes publicar y vender productos.",
                notification_type="verification_approved",
                channels=["in_app", "push", "email"],
                action_url="/producer/products",
            )
        except Exception as e:
            logger.warning(f"[VERIFICATION] Could not send approval notification to {user_id}: {e}")

        # Auto-create producer community if none exists
        try:
            existing_community = await db.communities.find_one(
                {"creator_id": user_id, "type": "producer", "is_active": {"$ne": False}}
            )
            if not existing_community:
                store_name = user_doc.get("company_name") or user_doc.get("name", "Mi tienda")
                slug_base = store_name.lower().replace(" ", "-")[:30]
                import re as _re
                slug_base = _re.sub(r"[^a-z0-9-]", "", slug_base) or f"producer-{user_id[:8]}"
                # Ensure slug uniqueness
                slug = slug_base
                counter = 0
                while await db.communities.find_one({"slug": slug}):
                    counter += 1
                    slug = f"{slug_base}-{counter}"
                from datetime import datetime as _dt, timezone as _tz
                await db.communities.insert_one({
                    "name": store_name,
                    "slug": slug,
                    "description": f"Comunidad oficial de {store_name}",
                    "emoji": "",
                    "category": "Productores",
                    "tags": [],
                    "cover_image": user_doc.get("store_cover_image") or user_doc.get("profile_image"),
                    "logo_url": user_doc.get("profile_image"),
                    "rules": [],
                    "type": "producer",
                    "is_auto_created": True,
                    "creator_id": user_id,
                    "creator_username": user_doc.get("username") or user_doc.get("name", ""),
                    "member_count": 1,
                    "post_count": 0,
                    "created_at": _dt.now(_tz.utc).isoformat(),
                    "is_active": True,
                })
                # Add creator as member
                community_doc = await db.communities.find_one({"slug": slug})
                if community_doc:
                    await db.community_members.insert_one({
                        "community_id": str(community_doc["_id"]),
                        "user_id": user_id,
                        "username": user_doc.get("username") or user_doc.get("name", ""),
                        "is_admin": True,
                        "role": "creator",
                        "is_seller": True,
                        "joined_at": _dt.now(_tz.utc).isoformat(),
                    })
                logger.info(f"[VERIFICATION] Auto-created producer community '{slug}' for {user_id}")
        except Exception as e:
            logger.warning(f"[VERIFICATION] Failed to auto-create community for {user_id}: {e}")

    elif any_low_confidence or any_cert_low:
        # Manual review needed
        reasons = []
        if cif_low:
            reasons.append("CIF/NIF con confianza baja")
        if facility_low:
            reasons.append("Foto de instalación ambigua")
        if any_cert_low:
            reasons.append("Certificado con confianza baja")
        update = {
            "verification_status.is_verified": False,
            "verification_status.ai_confidence": "medium",
            "verification_status.admin_review_required": True,
            "verification_status.admin_review_reason": "; ".join(reasons),
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": "Documentación en revisión manual",
        }

    else:
        # Incomplete — some documents missing or not yet verified
        missing = []
        if not cif_ok and not cif_low:
            missing.append("CIF/NIF")
        if not facility_ok and not facility_low:
            missing.append("Foto de instalación")
        if not has_valid_cert and not any_cert_low:
            missing.append("Al menos 1 certificado")
        update = {
            "verification_status.is_verified": False,
            "verification_status.blocked_from_selling": True,
            "verification_status.block_reason": f"Documentación incompleta: {', '.join(missing)}" if missing else "Verificación en curso",
        }

    await db.users.update_one({"user_id": user_id}, {"$set": update})

    # Return updated status
    updated = await db.users.find_one({"user_id": user_id})
    return updated.get("verification_status", {})
