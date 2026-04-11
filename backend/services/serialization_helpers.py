"""
Section 3.5b — public-text serializers.

This module is the single entry point for redacting PII in user-facing
text fields (post captions, comments, review bodies, recipe descriptions,
community post text).

Strict rules from section 3.5:
  - Redact at READ time, NOT at write time. The original text stays intact
    in MongoDB so admins/moderators can see it untouched.
  - NEVER redact DMs (services/moderation_ai.redact_pii is not invoked
    by routes/messages.py / chat handlers).
  - NEVER redact official profile fields (email, phone, bio of the user
    themselves).
  - Fail-open: if redaction explodes for any reason, return the original
    text unchanged. The reader sees raw text rather than crashing.
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Map ISO country code to language for the PII regex.
_COUNTRY_LANGUAGE_MAP = {
    "ES": "es", "MX": "es", "AR": "es", "CO": "es", "CL": "es",
    "PE": "es", "PA": "es", "EC": "es", "SV": "es", "PR": "es",
    "US": "en", "GB": "en", "IE": "en", "AU": "en", "CA": "en",
    "FR": "fr", "BE": "fr",
    "DE": "de", "AT": "de", "CH": "de",
    "IT": "it",
    "PT": "pt", "BR": "pt",
    "KR": "ko",
}


def language_for(country_or_lang: Optional[str]) -> str:
    """Resolve a language code from a country code or an explicit lang."""
    if not country_or_lang:
        return "es"
    val = str(country_or_lang).strip()
    if len(val) == 2 and val.lower() in ("es", "en", "ko", "fr", "de", "it", "pt"):
        return val.lower()
    return _COUNTRY_LANGUAGE_MAP.get(val.upper(), "es")


def redact_public_text(text: Optional[str], language: Optional[str] = "es") -> Optional[str]:
    """
    Replace PII (emails, phones, NIFs, IBANs) inside ``text`` with the
    locale-appropriate label. Used by feed serializers BEFORE returning
    the response to the client.

    Returns the input unchanged on any failure (fail-open).
    """
    if not text:
        return text
    try:
        from services.moderation_ai import redact_pii
        return redact_pii(text, language or "es")
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("[REDACT] failed, returning original: %s", exc)
        return text


def redact_doc_field(doc: dict, field: str, language: Optional[str] = "es") -> dict:
    """Convenience: mutate `doc[field]` in place if present."""
    if not doc or not isinstance(doc, dict):
        return doc
    val = doc.get(field)
    if isinstance(val, str) and val:
        doc[field] = redact_public_text(val, language)
    return doc
