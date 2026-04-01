"""
Translation API endpoints.
- POST /translate          — translate a single text
- POST /translate/batch    — translate multiple texts
- GET  /translate/languages — list supported languages
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional

from core.constants import SUPPORTED_LANGUAGES, TRANSLATION_LANGUAGES
from core.redis_client import redis_manager
from services.translation import TranslationService

router = APIRouter(prefix="/translate", tags=["translation"])


# ── Rate limiting helpers ──

async def _check_rate_limit(request: Request, authenticated: bool):
    """Rate limit: 100 req/min authenticated, 20 req/min anonymous."""
    if authenticated:
        user = getattr(request.state, "user", None)
        key = f"translate:{getattr(user, 'user_id', 'unknown')}"
        limit = 100
    else:
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        key = f"translate:anon:{ip}"
        limit = 20

    allowed = await redis_manager.check_rate_limit(key, max_requests=limit, window=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")


# ── Request/Response models ──

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    target_lang: str = Field(..., min_length=2, max_length=5)
    source_lang: Optional[str] = Field(None, min_length=2, max_length=5)


class TranslateResponse(BaseModel):
    translated: str
    detected_source: str
    cached: bool = False


class BatchTranslateRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=50)
    target_lang: str = Field(..., min_length=2, max_length=5)
    source_lang: Optional[str] = Field(None, min_length=2, max_length=5)


class BatchTranslateResponse(BaseModel):
    translations: List[dict]


class LanguageInfo(BaseModel):
    code: str
    name: str
    native: str
    rtl: bool = False


# ── Endpoints ──

@router.post("", response_model=TranslateResponse)
async def translate_text(body: TranslateRequest, request: Request):
    """Translate a single text string."""
    if body.target_lang not in TRANSLATION_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {body.target_lang}")

    # Check auth (optional) for rate limiting
    token = request.headers.get("authorization", "")
    authenticated = bool(token and token.startswith("Bearer "))
    await _check_rate_limit(request, authenticated)

    if body.source_lang:
        translated = await TranslationService.translate_text(body.text, body.source_lang, body.target_lang)
        return TranslateResponse(translated=translated, detected_source=body.source_lang)
    else:
        translated, detected = await TranslationService.translate_with_detection(body.text, body.target_lang)
        return TranslateResponse(translated=translated, detected_source=detected)


@router.post("/batch", response_model=BatchTranslateResponse)
async def translate_batch(body: BatchTranslateRequest, request: Request):
    """Translate multiple texts at once (max 50)."""
    if body.target_lang not in TRANSLATION_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {body.target_lang}")

    token = request.headers.get("authorization", "")
    authenticated = bool(token and token.startswith("Bearer "))
    await _check_rate_limit(request, authenticated)

    source = body.source_lang or "es"
    results = []

    for text in body.texts:
        if body.source_lang:
            translated = await TranslationService.translate_text(text, source, body.target_lang)
            detected = source
        else:
            translated, detected = await TranslationService.translate_with_detection(text, body.target_lang)
        results.append({
            "original": text,
            "translated": translated,
            "detected_source": detected,
        })

    return BatchTranslateResponse(translations=results)


@router.get("/languages", response_model=List[LanguageInfo])
async def get_supported_languages():
    """List all supported translation languages with native names."""
    rtl_langs = {"ar", "fa", "ur"}
    languages = []
    for code, info in SUPPORTED_LANGUAGES.items():
        if code in TRANSLATION_LANGUAGES:
            languages.append(LanguageInfo(
                code=code,
                name=info["name"],
                native=info["native"],
                rtl=code in rtl_langs,
            ))
    return languages
