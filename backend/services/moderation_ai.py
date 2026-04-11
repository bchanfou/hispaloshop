"""
Moderation AI service — section 3.5.

Provides text/image/PII analysis with strict graceful degradation:

  - If no API keys are configured, all functions return shape-consistent
    results with `source='unavailable'` and confidence 0. Callers MUST
    treat this as "could not analyze" and route to human review, NOT as
    "content is safe".

  - Text uses a per-language keyword list as the heuristic baseline. If
    MODERATION_AI_ENABLED=true and Anthropic SDK is reachable, an Haiku
    call is attempted as a refinement.

  - Images use Sightengine if SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET
    env vars are set. Otherwise return unavailable.

  - PII is regex-only (no AI). Email / phone / Spanish NIF / IBAN /
    address heuristic. The redact() helper replaces matches with
    [oculto] / [hidden] / [숨김] depending on language.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Keyword blocklists per language
# ─────────────────────────────────────────────────────────────────────────────

# Conservative starter lists. Country admins can extend via the AI filter
# config endpoint in section 3.5 (super-admin/moderation/system/ai-filter).
TEXT_KEYWORDS = {
    "es": {
        "hate_speech": ["mata", "muerte a", "puta", "maricón", "negrata", "moros de mierda"],
        "spam": ["whatsapp +", "telegram @", "click aquí gratis", "envíame dinero"],
        "scam": ["hazte rico", "duplica tu dinero", "100% garantizado"],
        "nsfw_adult": ["porno", "xxx"],
        "illegal_content": ["cocaína", "hachís a domicilio", "armas a la venta"],
    },
    "en": {
        "hate_speech": ["kill all", "die already", "fuck off", "n-word", "f-word"],
        "spam": ["whatsapp +", "telegram @", "click here free", "send me money"],
        "scam": ["get rich quick", "double your money", "100% guaranteed"],
        "nsfw_adult": ["porn", "xxx"],
        "illegal_content": ["cocaine for sale", "weapons for sale"],
    },
    "ko": {
        "hate_speech": ["죽어", "꺼져"],
        "spam": ["whatsapp +", "telegram @", "무료 클릭"],
        "scam": ["부자 되기", "돈 두 배"],
    },
}


# Critical categories. Confidence ≥ 0.95 in any of these → suggested action = block.
CRITICAL_CATEGORIES = ("nsfw_adult", "nsfw_violence", "hate_speech")


# ─────────────────────────────────────────────────────────────────────────────
# Text analysis
# ─────────────────────────────────────────────────────────────────────────────

def _empty_result(extra: Optional[dict] = None) -> dict:
    base = {
        "nsfw_adult": 0.0,
        "nsfw_violence": 0.0,
        "hate_speech": 0.0,
        "spam": 0.0,
        "scam": 0.0,
        "illegal_content": 0.0,
        "harassment": 0.0,
        "personal_info": 0.0,
        "max_category": None,
        "max_confidence": 0.0,
        "suggested_action": "allow",
        "source": "unavailable",
    }
    if extra:
        base.update(extra)
    return base


async def analyze_text(text: str, language: str = "es") -> dict:
    """
    Analyze a text payload. Returns confidence per category + a suggested action.

    suggested_action ∈ {allow, flag, block}
      - block: confidence ≥ 0.95 in a critical category
      - flag:  confidence 0.5-0.94 in any category
      - allow: everything below 0.5

    Source ∈ {keyword, ai, unavailable}.
    """
    if not text or not isinstance(text, str):
        return _empty_result({"source": "keyword"})

    text_l = text.lower()
    keywords = TEXT_KEYWORDS.get(language, TEXT_KEYWORDS["en"])
    confidences: Dict[str, float] = {}

    # Keyword pass — naive but fast and reliable.
    for category, words in keywords.items():
        hits = sum(1 for w in words if w in text_l)
        if hits:
            confidences[category] = min(0.6 + (hits * 0.1), 0.99)

    # PII detection bumps personal_info confidence
    pii = extract_pii(text, language)
    pii_count = sum(len(v) for v in pii.values())
    if pii_count > 0:
        confidences["personal_info"] = min(0.5 + (pii_count * 0.15), 0.95)

    # Build result
    result = _empty_result({"source": "keyword"})
    for cat, conf in confidences.items():
        if cat in result:
            result[cat] = round(conf, 2)
    if confidences:
        max_cat = max(confidences, key=confidences.get)
        max_conf = confidences[max_cat]
        result["max_category"] = max_cat
        result["max_confidence"] = round(max_conf, 2)
        if max_conf >= 0.95 and max_cat in CRITICAL_CATEGORIES:
            result["suggested_action"] = "block"
        elif max_conf >= 0.5:
            result["suggested_action"] = "flag"

    # Optional AI refinement (gated by env var to avoid surprise costs)
    if os.environ.get("MODERATION_AI_ENABLED") == "true":
        try:
            from services.ai_helpers import moderation_text_classify  # type: ignore
            ai_result = await moderation_text_classify(text, language)
            if ai_result and isinstance(ai_result, dict):
                result.update(ai_result)
                result["source"] = "ai"
        except Exception as exc:
            logger.debug("[MOD] AI text classify unavailable: %s", exc)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Image analysis
# ─────────────────────────────────────────────────────────────────────────────

async def analyze_image(image_url: str) -> dict:
    """
    Analyze an image URL. Returns nsfw + violence confidence + suggested action.
    Falls back to `unavailable` if no provider is configured — caller must
    flag for human review in that case.
    """
    if not image_url:
        return _empty_result({"source": "unavailable"})

    sightengine_user = os.environ.get("SIGHTENGINE_API_USER")
    sightengine_secret = os.environ.get("SIGHTENGINE_API_SECRET")
    if not (sightengine_user and sightengine_secret):
        return _empty_result({"source": "unavailable"})

    try:
        import httpx
        params = {
            "url": image_url,
            "models": "nudity-2.0,wad,offensive",
            "api_user": sightengine_user,
            "api_secret": sightengine_secret,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.sightengine.com/1.0/check.json", params=params)
            data = resp.json()
        if data.get("status") != "success":
            return _empty_result({"source": "unavailable"})
        nudity_raw = (data.get("nudity") or {}).get("raw", 0.0)
        weapon = (data.get("weapon") or 0.0)
        result = _empty_result({"source": "ai"})
        result["nsfw_adult"] = round(float(nudity_raw), 2)
        result["nsfw_violence"] = round(float(weapon), 2)
        max_cat, max_conf = max(
            [("nsfw_adult", result["nsfw_adult"]), ("nsfw_violence", result["nsfw_violence"])],
            key=lambda x: x[1],
        )
        result["max_category"] = max_cat
        result["max_confidence"] = max_conf
        if max_conf >= 0.95 and max_cat in CRITICAL_CATEGORIES:
            result["suggested_action"] = "block"
        elif max_conf >= 0.5:
            result["suggested_action"] = "flag"
        return result
    except Exception as exc:
        logger.warning("[MOD] Sightengine call failed: %s", exc)
        return _empty_result({"source": "unavailable"})


# ─────────────────────────────────────────────────────────────────────────────
# PII detection + redaction
# ─────────────────────────────────────────────────────────────────────────────

# Email: simple but strict enough for posts
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

# Phone: international or national, with separators (+34 600 000 000, 600-000-000, etc.)
PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}")

# Spanish NIF/CIF
NIF_RE = re.compile(r"\b[XYZ]?\d{7,8}[A-HJ-NP-TV-Z]\b", re.IGNORECASE)
CIF_RE = re.compile(r"\b[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]\b", re.IGNORECASE)

# IBAN (basic)
IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}[\s\d]{16,30}\b")


REDACT_LABELS = {
    "es": "[oculto]",
    "en": "[hidden]",
    "ko": "[숨김]",
}


def extract_pii(text: str, language: str = "es") -> dict:
    """Find PII matches in a text. Returns dict with 5 lists."""
    if not text:
        return {"emails": [], "phones": [], "nifs": [], "ibans": [], "addresses": []}
    return {
        "emails": EMAIL_RE.findall(text),
        # Phones: filter to results with at least 7 digits to avoid false positives.
        "phones": [m for m in PHONE_RE.findall(text) if sum(c.isdigit() for c in m) >= 7],
        "nifs": [*NIF_RE.findall(text), *CIF_RE.findall(text)],
        "ibans": IBAN_RE.findall(text),
        "addresses": [],  # left empty in V1 — too many false positives without NER
    }


def redact_pii(text: str, language: str = "es") -> str:
    """Replace detected PII with the language label. Used by post / comment / review serializers."""
    if not text:
        return text
    label = REDACT_LABELS.get(language, REDACT_LABELS["en"])
    out = EMAIL_RE.sub(label, text)
    out = NIF_RE.sub(label, out)
    out = CIF_RE.sub(label, out)
    out = IBAN_RE.sub(label, out)
    # Phone: only redact long enough digit groups to avoid eating prices like "12,99 €"
    def _phone_sub(m):
        if sum(c.isdigit() for c in m.group(0)) >= 7:
            return label
        return m.group(0)
    out = PHONE_RE.sub(_phone_sub, out)
    return out
