"""
AI content moderation service for posts and products.
Uses Claude Haiku vision for text + image analysis.
"""
import re
import json
import logging
import base64

import httpx
import anthropic

logger = logging.getLogger(__name__)

# ── Alcohol keyword blocklist (product names only) ────────────────

ALCOHOL_KEYWORDS = {
    # Spanish
    "vino", "cerveza", "sidra", "cava", "champán", "champagne",
    "whisky", "whiskey", "ron", "vodka", "gin", "ginebra",
    "vermut", "licor", "licores", "tequila", "mezcal",
    "sake", "hidromiel", "espumoso", "cuvée", "bodega",
    "viña", "winery", "brewery", "destilería", "distillery",
    "alcohol", "alcoholic", "alcohólico", "mead",
    # French
    "vin", "bière", "cidre", "cognac", "armagnac", "calvados",
    # English
    "wine", "beer", "spirits", "ale", "lager", "stout", "porter",
    "bourbon", "brandy", "rum",
    # Korean
    "와인", "맥주", "소주", "막걸리", "청주", "사케",
    # Italian
    "birra", "grappa", "prosecco", "chianti", "brunello", "barolo",
}

# Words that look like alcohol but are food ingredients
ALCOHOL_EXCEPTIONS = {
    "vinagre", "vainilla", "cerveza sin alcohol", "alcohol-free",
    "sin alcohol", "non-alcoholic", "sans alcool",
    "extracto", "esencia", "aroma",
}


def _is_alcohol_product(name: str, description: str = "") -> dict | None:
    """Check if a product name contains alcohol keywords.
    Returns blocking dict if blocked, None if allowed.
    Context-aware: 'vinagre' and ingredients in descriptions are OK.
    """
    name_lower = name.lower().strip()
    desc_lower = (description or "").lower()
    combined = f"{name_lower} {desc_lower}"

    # Check exceptions first — if exception phrase is in the name, allow
    for exc in ALCOHOL_EXCEPTIONS:
        if exc in name_lower:
            return None

    # Check if any alcohol keyword IS the product name (not just a substring in a description)
    name_words = set(re.findall(r'\w+', name_lower))
    for kw in ALCOHOL_KEYWORDS:
        if kw in name_words:
            return {
                "decision": "blocked",
                "reason": f"Las bebidas alcohólicas no pueden venderse en Hispaloshop (detectado: '{kw}')",
                "violation_type": "alcohol",
                "confidence": "high",
            }

    return None


# ── Helpers ───────────────────────────────────────────────────────

def _detect_content_type(url: str) -> str:
    lower = url.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


async def _download_file(url: str) -> bytes | None:
    try:
        async with httpx.AsyncClient(timeout=20) as http:
            resp = await http.get(url)
            if resp.status_code == 200:
                return resp.content
    except Exception as e:
        logger.error("Download failed for %s: %s", url, e)
    return None


def _parse_ai_json(raw_text: str) -> dict:
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
    return json.loads(text)


# ── moderate_post_content ─────────────────────────────────────────

async def moderate_post_content(content: dict) -> dict:
    """
    Moderate a post/reel/story/recipe.
    content = { text, image_urls: [str], tags: [str] }

    Returns: { action: 'approve'|'hide'|'review', reason, violation_type, confidence }
    """
    result = {"action": "approve", "reason": None, "violation_type": None, "confidence": "high"}
    text = content.get("text", "")
    image_urls = content.get("image_urls", [])
    tags = content.get("tags", [])

    try:
        client = anthropic.Anthropic()

        # 1. Text analysis
        if text.strip():
            text_prompt = (
                "Analiza este contenido para una plataforma de alimentación artesanal.\n\n"
                "OCULTAR AUTOMÁTICAMENTE si contiene:\n"
                "- Desnudos completos o contenido sexual explícito\n"
                "- Violencia gráfica u obscenidades graves\n"
                "- Spam o publicidad no autorizada masiva\n"
                "- Afirmaciones médicas o curativas falsas sobre alimentos ('cura el cáncer', etc.)\n"
                "- Contenido que involucre menores de forma inapropiada\n\n"
                "MARCAR PARA REVISIÓN si contiene:\n"
                "- Contenido completamente ajeno a la alimentación o gastronomía\n"
                "- Competencia desleal o difamación\n"
                "- Claims de salud cuestionables pero no claramente falsos\n\n"
                "NOTA IMPORTANTE: Las bebidas alcohólicas que aparecen en fotos o vídeos "
                "están PERMITIDAS siempre que no se estén vendiendo como producto.\n\n"
                f"Texto: {text[:2000]}\n"
                f"Tags: {', '.join(tags[:20])}\n\n"
                "Responde SOLO con JSON:\n"
                '{"action": "approve"|"hide"|"review", "reason": null o motivo breve en español, '
                '"violation_type": "nudity"|"violence"|"spam"|"health_misinformation"|'
                '"minor_safety"|"off_topic"|"health_claims"|null, '
                '"confidence": "high"|"medium"|"low"}'
            )

            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{"role": "user", "content": text_prompt}],
            )
            text_result = _parse_ai_json(resp.content[0].text)

            if text_result.get("action") == "hide" and text_result.get("confidence") != "low":
                return text_result
            if text_result.get("action") == "hide" and text_result.get("confidence") == "low":
                text_result["action"] = "review"
            if text_result.get("action") == "review":
                result = text_result

        # 2. Image analysis (first image only for performance)
        if image_urls:
            img_url = image_urls[0]
            file_bytes = await _download_file(img_url)
            if file_bytes:
                ct = _detect_content_type(img_url)
                b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

                img_prompt = (
                    "Analiza esta imagen para una plataforma de alimentación artesanal.\n"
                    "Detecta únicamente:\n"
                    "1. ¿Contiene desnudos completos o contenido sexual explícito?\n"
                    "2. ¿Contiene violencia gráfica?\n"
                    "3. ¿Aparecen menores en situaciones inapropiadas?\n"
                    "4. Describe brevemente qué muestra la imagen.\n\n"
                    "NOTA: Las bebidas alcohólicas en imágenes están PERMITIDAS.\n\n"
                    "Responde SOLO con JSON:\n"
                    '{"contains_nudity": bool, "contains_violence": bool, '
                    '"minor_safety_concern": bool, "confidence": "high"|"medium"|"low", '
                    '"description": "descripción breve"}'
                )

                msg_content = [
                    {"type": "image", "source": {"type": "base64", "media_type": ct, "data": b64}},
                    {"type": "text", "text": img_prompt},
                ]

                resp = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=300,
                    messages=[{"role": "user", "content": msg_content}],
                )
                img_result = _parse_ai_json(resp.content[0].text)
                conf = img_result.get("confidence", "low")

                if img_result.get("minor_safety_concern"):
                    return {"action": "hide", "reason": "Contenido que puede comprometer la seguridad de menores",
                            "violation_type": "minor_safety", "confidence": conf}

                if img_result.get("contains_nudity") and conf != "low":
                    return {"action": "hide" if conf == "high" else "review",
                            "reason": "Contenido no apropiado para la plataforma",
                            "violation_type": "nudity", "confidence": conf}

                if img_result.get("contains_violence") and conf != "low":
                    return {"action": "hide" if conf == "high" else "review",
                            "reason": "Contenido violento detectado",
                            "violation_type": "violence", "confidence": conf}

                if conf == "low" and (img_result.get("contains_nudity") or img_result.get("contains_violence")):
                    result = {"action": "review", "reason": "Imagen ambigua — revisión manual",
                              "violation_type": "nudity" if img_result.get("contains_nudity") else "violence",
                              "confidence": "low"}

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI moderation response")
        return {"action": "review", "reason": "Error de análisis — revisión manual",
                "violation_type": None, "confidence": "low"}
    except Exception as e:
        logger.error("Content moderation error: %s", e)
        return {"action": "review", "reason": "Error del sistema — revisión manual",
                "violation_type": None, "confidence": "low"}


# ── moderate_product ──────────────────────────────────────────────

async def moderate_product(product: dict) -> dict:
    """
    Moderate a product before publishing.
    product = { name, description, category, images: [str], tags: [str], price }

    Returns: { decision: 'allowed'|'blocked'|'review', reason, violation_type, confidence }
    """
    name = product.get("name", "")
    description = product.get("description", "")

    # 1. Hardcoded alcohol check FIRST (before AI)
    alcohol_block = _is_alcohol_product(name, description)
    if alcohol_block:
        return alcohol_block

    try:
        client = anthropic.Anthropic()

        # 2. AI category check
        category = product.get("category", "")
        product_prompt = (
            "Determina si este producto puede venderse en una plataforma de alimentación artesanal.\n\n"
            "PERMITIDO:\n"
            "- Cualquier alimento o bebida no alcohólica\n"
            "- Utensilios, accesorios y recipientes directamente relacionados con cocinar, "
            "conservar o presentar alimentos (botes, moldes, cucharas, tablas, etc.)\n"
            "- Ingredientes y especias\n"
            "- Panadería, repostería, charcutería, lácteos, conservas, aceites, mieles, salsas\n\n"
            "NO PERMITIDO:\n"
            "- Bebidas alcohólicas (vino, cerveza, licores, sidra, sake, etc.)\n"
            "- Productos no alimentarios ni relacionados con la cocina (ropa, electrónica, cosméticos)\n"
            "- Suplementos o productos con claims médicos/farmacéuticos\n\n"
            "REVISIÓN (zona gris):\n"
            "- Infusiones medicinales\n"
            "- Cosmética natural con ingredientes comestibles\n"
            "- Suplementos deportivos de origen natural\n\n"
            f"Producto: {name}\n"
            f"Descripción: {description[:1000]}\n"
            f"Categoría: {category}\n\n"
            "Responde SOLO con JSON:\n"
            '{"decision": "allowed"|"blocked"|"review", "reason": null o motivo breve en español, '
            '"violation_type": "alcohol"|"non_food_product"|"medical_claims"|"grey_area"|null, '
            '"confidence": "high"|"medium"|"low"}'
        )

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": product_prompt}],
        )
        ai_result = _parse_ai_json(resp.content[0].text)

        # Low confidence → never block, send to review
        if ai_result.get("confidence") == "low" and ai_result.get("decision") == "blocked":
            ai_result["decision"] = "review"

        # 3. Image check (first product image)
        images = product.get("images", [])
        img_url = None
        if images:
            if isinstance(images[0], str):
                img_url = images[0]
            elif isinstance(images[0], dict):
                img_url = images[0].get("url")

        if img_url and ai_result.get("decision") != "blocked":
            file_bytes = await _download_file(img_url)
            if file_bytes:
                ct = _detect_content_type(img_url)
                b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

                img_prompt = (
                    "Analiza esta imagen de un producto en una plataforma de alimentación artesanal.\n"
                    "1. ¿Contiene desnudos o contenido inapropiado?\n"
                    "2. ¿La imagen muestra claramente una botella u otro recipiente típico "
                    "de bebida alcohólica como producto a la venta (no como decoración)?\n"
                    "3. Describe brevemente el producto.\n\n"
                    "Responde SOLO con JSON:\n"
                    '{"contains_nudity": bool, "is_alcohol_product": bool, '
                    '"confidence": "high"|"medium"|"low", "description": "breve"}'
                )

                msg_content = [
                    {"type": "image", "source": {"type": "base64", "media_type": ct, "data": b64}},
                    {"type": "text", "text": img_prompt},
                ]

                resp2 = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=300,
                    messages=[{"role": "user", "content": msg_content}],
                )
                img_result = _parse_ai_json(resp2.content[0].text)

                if img_result.get("is_alcohol_product") and img_result.get("confidence") != "low":
                    return {
                        "decision": "blocked",
                        "reason": "Las bebidas alcohólicas no pueden venderse en Hispaloshop",
                        "violation_type": "alcohol",
                        "confidence": img_result["confidence"],
                    }

        return ai_result

    except json.JSONDecodeError:
        logger.error("Failed to parse AI product moderation response")
        return {"decision": "review", "reason": "Error de análisis — revisión manual",
                "violation_type": None, "confidence": "low"}
    except Exception as e:
        logger.error("Product moderation error: %s", e)
        return {"decision": "review", "reason": "Error del sistema — revisión manual",
                "violation_type": None, "confidence": "low"}
