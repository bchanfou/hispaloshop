"""
Auth routes: register, login, logout, verify-email, password reset, session.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, urlparse
import uuid
import logging
import re
import hashlib
import os
import jwt as jwt_lib
import json

from core.database import db
from core.models import User, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput
from core.auth import get_current_user
from core.config import settings
from core.sanitize import sanitize_text
from core.constants import get_email_template
from services.auth_helpers import (
    hash_password, verify_password, needs_rehash,
    generate_verification_token, generate_verification_code,
    send_email, FRONTEND_URL, AUTH_BACKEND_URL,
)
from middleware.rate_limit import rate_limiter
from core.redis_client import redis_manager

logger = logging.getLogger(__name__)


def _hash_session_token(token: str) -> str:
    """Hash session token for storage. SHA-256 is safe here because tokens are high-entropy UUIDs."""
    return hashlib.sha256(token.encode()).hexdigest()


router = APIRouter()
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}
_TRUSTED_FRONTEND_SUFFIXES = ("hispaloshop.com",)


def _allowed_frontend_origins() -> set[str]:
    allowed = set()
    configured_origins = str(settings.ALLOWED_ORIGINS or "").split(",")
    for candidate in configured_origins + [settings.FRONTEND_URL]:
        origin = _extract_origin(candidate)
        if origin:
            allowed.add(origin)
    return allowed


def _extract_origin(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    parsed = urlparse(value.strip())
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def _is_local_origin(value: Optional[str]) -> bool:
    origin = _extract_origin(value)
    if not origin:
        return False
    hostname = (urlparse(origin).hostname or "").lower()
    return hostname in _LOCAL_HOSTS


def _is_trusted_frontend_origin(value: Optional[str]) -> bool:
    origin = _extract_origin(value)
    if not origin:
        return False
    hostname = (urlparse(origin).hostname or "").lower()
    if hostname in _LOCAL_HOSTS:
        return True
    if origin in _allowed_frontend_origins():
        return True
    return any(hostname.endswith(suffix) for suffix in _TRUSTED_FRONTEND_SUFFIXES)


def _get_request_origin(request: Request) -> str:
    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    scheme = forwarded_proto or request.url.scheme or "http"
    return f"{scheme}://{host}".rstrip("/")


def _is_secure_request(request: Request) -> bool:
    return _get_request_origin(request).startswith("https://")


def _get_public_auth_backend_url(request: Request) -> str:
    configured = (settings.AUTH_BACKEND_URL or "").rstrip("/")
    request_origin = _get_request_origin(request)
    # For non-local requests (production/Vercel), use the actual request origin
    # from x-forwarded-host — this correctly resolves to hispaloshop.com.
    if request_origin and not _is_local_origin(request_origin):
        return request_origin
    return configured or request_origin


def _get_public_frontend_url(request: Request) -> str:
    cookie_origin = _extract_origin(request.cookies.get("oauth_frontend_origin"))
    header_origin = _extract_origin(request.headers.get("origin")) or _extract_origin(request.headers.get("referer"))
    configured = (settings.FRONTEND_URL or "").rstrip("/")

    for candidate in (cookie_origin, header_origin):
        if candidate and _is_trusted_frontend_origin(candidate):
            return candidate

    return configured or _get_request_origin(request)


def _resolve_google_client_id() -> Optional[str]:
    candidates = [
        settings.GOOGLE_CLIENT_ID,
        os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
        os.getenv("GOOGLE_AUTH_CLIENT_ID"),
        os.getenv("REACT_APP_GOOGLE_CLIENT_ID"),
    ]
    for value in candidates:
        value = (value or "").strip()
        if value:
            return value
    return None


def _resolve_google_client_secret() -> Optional[str]:
    candidates = [
        settings.GOOGLE_CLIENT_SECRET,
        os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
        os.getenv("GOOGLE_AUTH_CLIENT_SECRET"),
    ]
    for value in candidates:
        value = (value or "").strip()
        if value:
            return value
    return None


def _is_email_delivery_configured() -> bool:
    import os
    api_key = (settings.RESEND_API_KEY or "").strip()
    configured = bool(api_key and api_key != "PLACEHOLDER_RESEND_KEY")
    if not configured:
        is_production = bool(os.environ.get("RAILWAY_ENVIRONMENT") or settings.ENV == "production")
        if is_production:
            logging.getLogger(__name__).warning(
                "[EMAIL] CRITICAL: Resend API key is missing or placeholder in PRODUCTION. "
                "Email delivery is disabled. Set RESEND_API_KEY to a valid key."
            )
        else:
            logging.getLogger(__name__).warning(
                "[EMAIL] Resend API key not configured — email delivery disabled (dev mode)."
            )
    return configured


def _build_verification_link(request: Request, verification_key: str) -> str:
    frontend_url = _get_public_frontend_url(request)
    return f"{frontend_url}/verify-email?code={verification_key}"


def _build_frontend_auth_callback_response(request: Request, **params: str) -> RedirectResponse:
    frontend_url = _get_public_frontend_url(request)
    query = urlencode({key: value for key, value in params.items() if value})
    target_url = f"{frontend_url}/auth/callback"
    if query:
        target_url = f"{target_url}?{query}"
    response = RedirectResponse(url=target_url)
    response.delete_cookie("oauth_state", path="/")
    response.delete_cookie("oauth_frontend_origin", path="/")
    return response


def _set_session_cookie(target_response: Response, request: Request, session_token: str) -> None:
    """Apply the session cookie consistently for JSON and redirect responses."""
    is_secure_cookie = _is_secure_request(request)
    target_response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        samesite="lax",
        httponly=True,
        secure=is_secure_cookie
    )


def _json_safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _sanitize_user_doc(user_doc: dict) -> dict:
    sanitized = {key: value for key, value in dict(user_doc).items() if key not in {"_id", "password_hash"}}
    if sanitized.get("role") == "customer":
        sanitized["onboarding_completed"] = bool(sanitized.get("onboarding_completed", False))
        sanitized["onboarding_step"] = int(sanitized.get("onboarding_step", 1) or 1)
    else:
        sanitized["onboarding_completed"] = bool(sanitized.get("onboarding_completed", True))
        sanitized["onboarding_step"] = int(sanitized.get("onboarding_step", 0) or 0)
    sanitized.setdefault("followers_count", len(sanitized.get("followers", [])))
    # Normalize avatar field — backend stores profile_image/picture, frontend reads avatar_url
    avatar = sanitized.get("avatar_url") or sanitized.get("profile_image") or sanitized.get("picture") or ""
    sanitized["avatar_url"] = avatar
    sanitized["profile_image"] = avatar
    return _json_safe(sanitized)


async def _create_user_session(user_id: str) -> str:
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": _hash_session_token(session_token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return session_token


def _build_auth_response(request: Request, user_doc: dict, session_token: str, **extra_payload: Any) -> JSONResponse:
    response = JSONResponse(content={
        **extra_payload,
        "user": _sanitize_user_doc(user_doc),
        "session_token": session_token,
    })
    _set_session_cookie(response, request, session_token)
    return response


async def _resolve_referral_influencer(referral_code: Optional[str]) -> tuple[Optional[dict], Optional[str]]:
    if not referral_code:
        return None, None

    normalized_code = str(referral_code).strip().upper()
    discount = await db.discount_codes.find_one(
        {"code": normalized_code, "influencer_id": {"$exists": True, "$ne": None}, "active": True},
        {"_id": 0, "code": 1, "influencer_id": 1},
    )
    if not discount:
        return None, None

    influencer = await db.influencers.find_one(
        {"influencer_id": discount["influencer_id"], "status": {"$in": ["active", "pending"]}},
        {"_id": 0, "influencer_id": 1, "user_id": 1, "email": 1},
    )
    if not influencer:
        return None, None

    return influencer, discount["code"]

# Auth routes

@router.post("/auth/register")
async def register(input: RegisterInput, request: Request):
    # Rate limit por IP/dispositivo (anti-bot)
    await rate_limiter.check(request, endpoint_type="register")
    
    # Rate limit adicional por email (anti-spam masivo)
    email_key = f"register_email:{input.email.lower()}"
    if not await redis_manager.check_rate_limit(email_key, max_requests=2, window=3600):
        raise HTTPException(
            status_code=429, 
            detail="Demasiados intentos de registro con este email. Por favor, espera 1 hora."
        )
    # Age verification — must be 16+ (required for customers)
    if input.role == "customer" and not input.birth_date:
        raise HTTPException(status_code=400, detail="La fecha de nacimiento es obligatoria")
    if input.birth_date:
        try:
            from datetime import date
            birth = date.fromisoformat(input.birth_date)
            today = date.today()
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            if age < 16:
                # Do NOT store data of rejected minors
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "age_requirement",
                        "message": "Debes tener al menos 16 años para registrarte en Hispaloshop.",
                    },
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha de nacimiento no válido (YYYY-MM-DD)")

    # GDPR Compliance: Consent is MANDATORY for all roles
    if not input.analytics_consent:
        raise HTTPException(
            status_code=400,
            detail="Es necesario aceptar el consentimiento para registrarse"
        )

    # Influencer: at least one social media handle required
    if input.role == "influencer":
        instagram = (input.instagram or "").strip()
        tiktok = (input.tiktok or "").strip()
        if not instagram and not tiktok:
            raise HTTPException(
                status_code=400,
                detail="Se requiere al menos una red social (Instagram o TikTok)"
            )

    normalized_email = input.email.lower()
    existing = await db.users.find_one({"email": normalized_email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    # Username validation
    username = input.username
    if username:
        username = username.strip().lower()
        if not re.match(r"^[a-z0-9_.\-]{3,20}$", username):
            raise HTTPException(status_code=400, detail="Nombre de usuario no válido. Usa 3-20 caracteres: letras minúsculas, números o guiones.")
        existing_username = await db.users.find_one({"username": username}, {"_id": 0})
        if existing_username:
            raise HTTPException(status_code=400, detail="Este nombre de usuario ya está en uso")
    else:
        username = f"user_{uuid.uuid4().hex[:8]}"
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(input.password)
    referral_code = request.query_params.get("ref") or request.cookies.get("referral_code")
    referred_influencer, resolved_referral_code = await _resolve_referral_influencer(referral_code)
    referral_expires_at = None
    if referred_influencer:
        referral_expires_at = (
            datetime.now(timezone.utc) + timedelta(days=settings.AFFILIATE_ATTRIBUTION_DAYS)
        ).isoformat()
    
    user_data = {
        "user_id": user_id,
        "email": normalized_email,
        "name": sanitize_text(input.name),
        "username": username,
        "role": input.role,
        "country": input.country,
        "password_hash": password_hash,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "approved": input.role == "customer",
        "auth_provider": "local",
        "birth_date": input.birth_date,
        "age_verified": bool(input.birth_date),
        "onboarding_completed": input.role != "customer",
        "onboarding_step": 1 if input.role == "customer" else 0,
        "interests": [],
        "following": [],
        "followers": [],
        "followers_count": 0,
        # GDPR Consent tracking
        "consent": {
            "analytics_consent": input.analytics_consent,
            "marketing_consent": input.marketing_consent,
            "consent_version": input.consent_version,
            "consent_date": datetime.now(timezone.utc).isoformat() if input.analytics_consent else None
        },
        "referred_by": referred_influencer["influencer_id"] if referred_influencer else None,
        "referral_code": resolved_referral_code,
        "referral_expires_at": referral_expires_at,
    }

    if input.role == "customer":
        if input.dietary_restrictions:
            user_data["dietary_restrictions"] = input.dietary_restrictions
        if input.preferred_categories:
            user_data["preferred_categories"] = input.preferred_categories
        if input.postal_code:
            user_data["postal_code"] = input.postal_code
        if input.discovery_method:
            user_data["discovery_method"] = input.discovery_method
            user_data.setdefault("consumer_data", {})["feed_mode"] = input.discovery_method
        if input.purchase_frequency:
            user_data["purchase_frequency"] = input.purchase_frequency

    if input.role in ["producer", "importer"]:
        user_data.update({
            "company_name": input.company_name,
            "phone": input.phone,
            "whatsapp": input.whatsapp,
            "contact_person": input.contact_person,
            "fiscal_address": input.fiscal_address,
            "vat_cif": input.vat_cif,
            "approved": False,
            "subscription": {
                "plan": "FREE",
                "plan_status": "active",
                "commission_rate": 0.20,
            },
            "verification_status": {
                "is_verified": False,
                "verified_at": None,
                "verified_by": None,
                "documents": {"cif_nif": {}, "facility_photo": {}, "certificates": []},
                "ai_confidence": None,
                "admin_review_required": False,
                "admin_review_reason": None,
                "blocked_from_selling": True,
                "block_reason": "Verificación de cuenta pendiente",
            },
        })
    
    influencer_data = None
    if input.role == "influencer":
        audience_size = int(str(input.followers or "0").replace(".", "").replace(",", "") or 0)
        user_data.update({
            "approved": False,  # Needs admin approval
            "influencer_profile": {
                "tier": "hercules",
                "commission_rate": 0.03,
                "followers_count": audience_size,
            },
            "followers_count": audience_size,
        })
        # Create influencer record
        influencer_id = f"inf_{uuid.uuid4().hex[:12]}"
        influencer_data = {
            "influencer_id": influencer_id,
            "user_id": user_id,
            "email": input.email.lower(),
            "full_name": input.name,
            "social_media": {
                "instagram": input.instagram,
                "tiktok": input.tiktok,
                "youtube": input.youtube,
                "twitter": input.twitter
            },
            "followers": input.followers,
            "followers_count": audience_size,
            "niche": input.niche,
            "status": "pending",
            "current_tier": "hercules",
            "commission_rate": 0.03,
            "commission_type": "percentage",
            "commission_value": 3,
            "discount_code_id": None,  # Will be set when they create their code
            "total_sales_generated": 0,
            "total_commission_earned": 0,
            "available_balance": 0,
            "fiscal_status": {
                "affiliate_blocked": True,
                "block_reason": "Certificado de residencia fiscal pendiente",
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    try:
        await db.users.insert_one(user_data)
    except Exception as insert_err:
        # Handle race condition: duplicate email/username from concurrent registration
        if "duplicate key" in str(insert_err).lower() or "E11000" in str(insert_err):
            raise HTTPException(status_code=400, detail="Este email ya está registrado")
        raise

    # Insert influencer record AFTER user insert succeeds (avoid orphaned records)
    if input.role == "influencer" and influencer_data:
        try:
            await db.influencers.insert_one(influencer_data)
        except Exception as inf_err:
            logger.warning(f"[AUTH] Failed to create influencer record for {user_id}: {inf_err}")

    # Generate 6-digit verification code
    verification_code = generate_verification_code()
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "email": normalized_email,
        "token": verification_code,
        "code": verification_code,  # Store as code for clarity
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    # Get email template in user's language
    user_lang = input.language if input.language in ["es", "en", "ko"] else "en"
    template = get_email_template("verification", user_lang)
    verification_link = _build_verification_link(request, verification_code)
    
    # Send verification email with 6-digit code in user's language
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFFFFF;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0c0a09; font-size: 24px; margin: 0;">Hispaloshop</h1>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #e7e5e4; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #0c0a09; margin: 0 0 15px 0;">{template['title']}</h2>
            <p style="color: #78716c; font-size: 16px; margin: 0 0 25px 0;">
                {template['body']}
            </p>
            <div style="background-color: #0c0a09; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
                {verification_code}
            </div>
            <div style="margin-top: 24px;">
                <a href="{verification_link}" style="display: inline-block; padding: 12px 20px; background: #0c0a09; color: white; text-decoration: none; border-radius: 999px; font-weight: 600;">
                    Verificar email
                </a>
            </div>
            <p style="color: #78716c; font-size: 14px; margin-top: 20px; line-height: 1.5;">
                También puedes abrir este enlace directamente:<br>
                <a href="{verification_link}" style="color: #0c0a09;">{verification_link}</a>
            </p>
            <p style="color: #78716c; font-size: 14px; margin-top: 25px;">
                {template['expires']}
            </p>
        </div>

        <p style="color: #78716c; font-size: 12px; text-align: center; margin-top: 30px;">
            {template['ignore']}
        </p>
    </div>
    """

    session_token = await _create_user_session(user_id)

    if not _is_email_delivery_configured():
        logger.warning("[REGISTRATION] Email delivery unavailable for %s", normalized_email)
        # Cuenta creada pero email no enviado - no es error crítico
        # El usuario puede solicitar reenvío más tarde
    else:
        try:
            send_email(
                to=normalized_email,
                subject=template['subject'],
                html=email_html
            )
            logger.info(f"[REGISTRATION] Verification email sent to {normalized_email} in {user_lang}")
        except Exception as email_err:
            # If email fails, we should still allow registration but warn the user
            logger.exception("[REGISTRATION] Failed to send verification email to %s: %s", normalized_email, str(email_err))
            # No devolver error HTTP - la cuenta se creó correctamente
            # El usuario puede verificar su email más tarde desde su perfil
    
    return _build_auth_response(
        request,
        user_data,
        session_token,
        email_delivery_available=True,
        message="Registro completado. Revisa tu email para verificar tu cuenta.",
    )

# Email verification endpoints
@router.post("/auth/verify-email")
async def verify_email(request: Request, token: str = None, code: str = None):
    """Verify email using 6-digit code or legacy token"""
    await rate_limiter.check(request, endpoint_type="verify_email")
    verification_key = code or token
    if not verification_key:
        raise HTTPException(status_code=400, detail="Se requiere el código de verificación")

    # If user is authenticated, scope verification to their account
    current_user = None
    try:
        current_user = await get_current_user(request)
    except Exception:
        pass  # Unauthenticated verification (link click) is still allowed

    query = {"$or": [{"code": verification_key}, {"token": verification_key}]}
    if current_user:
        query["user_id"] = current_user.user_id

    verification = await db.email_verifications.find_one(query, {"_id": 0})

    if not verification:
        raise HTTPException(status_code=400, detail="Código de verificación inválido")

    # Check if expired
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")

    # Update user's email_verified status
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )

    # Delete all verification records for this user
    await db.email_verifications.delete_many({"user_id": verification["user_id"]})

    return {"message": "Email verificado correctamente", "success": True}

@router.post("/auth/resend-verification")
async def resend_verification(request: Request, user: User = Depends(get_current_user)):
    """Resend verification email with 6-digit code"""
    await rate_limiter.check(request, endpoint_type="resend_verification")
    if user.email_verified:
        return {"message": "El email ya está verificado"}

    # Rate limit: max 3 resends per user per 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    cutoff_iso = cutoff.isoformat()
    recent_resends = await db.email_resend_log.count_documents({
        "user_id": user.user_id,
        "$or": [
            {"created_at": {"$gt": cutoff}},       # datetime objects
            {"created_at": {"$gt": cutoff_iso}},    # ISO strings (legacy)
        ],
    })
    if recent_resends >= 3:
        raise HTTPException(status_code=429, detail="Máximo de reenvíos alcanzado. Inténtalo en 24 horas.")

    # NOTE: resend log inserted AFTER successful email send (not before)
    # to avoid consuming quota on failed sends

    # Delete old tokens
    await db.email_verifications.delete_many({"user_id": user.user_id})
    
    # Generate new 6-digit code
    verification_code = generate_verification_code()
    await db.email_verifications.insert_one({
        "user_id": user.user_id,
        "email": user.email,
        "token": verification_code,
        "code": verification_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    verification_link = _build_verification_link(request, verification_code)

    # Get email template in user's language (default to "es")
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "country": 1})
    user_lang = "es"  # Default; could be extended with user preference
    template = get_email_template("verification", user_lang)

    # Send verification email with 6-digit code (same structure as registration email)
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFFFFF;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0c0a09; font-size: 24px; margin: 0;">Hispaloshop</h1>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #e7e5e4; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #0c0a09; margin: 0 0 15px 0;">{template['title']}</h2>
            <p style="color: #78716c; font-size: 16px; margin: 0 0 25px 0;">
                {template['body']}
            </p>
            <div style="background-color: #0c0a09; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
                {verification_code}
            </div>
            <div style="margin-top: 24px;">
                <a href="{verification_link}" style="display: inline-block; padding: 12px 20px; background: #0c0a09; color: white; text-decoration: none; border-radius: 999px; font-weight: 600;">
                    Verificar email
                </a>
            </div>
            <p style="color: #78716c; font-size: 14px; margin-top: 20px; line-height: 1.5;">
                También puedes abrir este enlace directamente:<br>
                <a href="{verification_link}" style="color: #0c0a09;">{verification_link}</a>
            </p>
            <p style="color: #78716c; font-size: 14px; margin-top: 25px;">
                {template['expires']}
            </p>
        </div>

        <p style="color: #78716c; font-size: 12px; text-align: center; margin-top: 30px;">
            {template['ignore']}
        </p>
    </div>
    """
    
    if not _is_email_delivery_configured():
        logger.error("[RESEND_VERIFICATION] Email delivery unavailable for %s", user.email)
        raise HTTPException(status_code=503, detail="No se pudo enviar el código. Inténtalo de nuevo en unos minutos.")

    # Send email
    try:
        send_email(
            to=user.email,
            subject=template['subject'],
            html=email_html
        )
    except Exception as exc:
        logger.exception("[RESEND_VERIFICATION] Failed to send verification email to %s", user.email)
        raise HTTPException(status_code=503, detail="No se pudo enviar el código. Inténtalo de nuevo en unos minutos.") from exc

    logger.info(f"[RESEND_VERIFICATION] Code sent to {user.email}")

    # Log resend AFTER successful send (not before) to avoid quota loss on failures
    await db.email_resend_log.insert_one({
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "message": "Código enviado. Revisa tu email."
    }

@router.get("/auth/verification-status")
async def get_verification_status(user: User = Depends(get_current_user)):
    """Get email verification status"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email_verified": 1})
    return {"email_verified": user_doc.get("email_verified", False)}

@router.post("/auth/login")
async def login(input: LoginInput, request: Request):
    await rate_limiter.check(request, endpoint_type="login")
    identifier = input.email.strip().lower()
    
    # Determine if identifier is email or username
    if "@" in identifier and "." in identifier.split("@")[-1]:
        user_doc = await db.users.find_one({"email": identifier}, {"_id": 0})
    else:
        # Strip leading @ if present
        username = identifier.lstrip("@")
        user_doc = await db.users.find_one({"username": username}, {"_id": 0})
    
    # Constant-time check: always run bcrypt even if user not found to prevent timing attacks
    DUMMY_HASH = "$2b$12$LJ3m4ys3Lg2VGqsMhW8kuOQ.sVyRNGKBcMK.FS3q5aBn5gZPHjXYm"
    if not user_doc:
        verify_password(input.password, DUMMY_HASH)  # ~500ms to match real verification
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    if "password_hash" not in user_doc:
        verify_password(input.password, DUMMY_HASH)  # timing consistency
        raise HTTPException(status_code=401, detail="Esta cuenta usa inicio de sesión con Google")

    if not verify_password(input.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    # Note: approved status is included in the response for the frontend to handle via ProtectedRoute.
    # We no longer block login for non-approved users.
    
    # Progressive rehash: SHA256 → bcrypt
    if needs_rehash(user_doc["password_hash"]):
        new_hash = hash_password(input.password)
        await db.users.update_one({"user_id": user_doc["user_id"]}, {"$set": {"password_hash": new_hash}})
        logger.info(f"[AUTH] Migrated password hash to bcrypt for {user_doc.get('email')}")
    
    session_token = await _create_user_session(user_doc["user_id"])
    return _build_auth_response(request, user_doc, session_token)

# Password Recovery Endpoints

@router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordInput, request: Request):
    """Request password reset email — uses request origin for correct URL."""
    await rate_limiter.check(request, endpoint_type="forgot_password")
    normalized_email = input.email.lower()
    user = await db.users.find_one({"email": normalized_email}, {"_id": 0})
    
    if not user:
        return {"message": "Si el email existe, recibirás instrucciones."}
    
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    
    reset_token = generate_verification_token()
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": normalized_email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "used": False
    })
    
    # Validate origin against trusted domains to prevent open redirect
    raw_origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/") or ""
    if "/api" in raw_origin:
        raw_origin = raw_origin.split("/api")[0]
    origin = FRONTEND_URL  # safe default
    if raw_origin:
        from urllib.parse import urlparse
        parsed = urlparse(raw_origin)
        candidate = f"{parsed.scheme}://{parsed.netloc}"
        if _is_trusted_frontend_origin(candidate):
            origin = candidate
    reset_link = f"{origin}/reset-password?token={reset_token}"
    
    # Detect language from user preferences
    user_lang = user.get("locale", {}).get("language", "es")
    
    subjects = {"es": "Restablecer contrasena - Hispaloshop", "en": "Reset your password - Hispaloshop", "ko": "비밀번호 재설정 - Hispaloshop"}
    titles = {"es": "Restablecer contrasena", "en": "Reset your password", "ko": "비밀번호 재설정"}
    bodies = {"es": "Has solicitado restablecer tu contrasena en Hispaloshop.", "en": "You requested to reset your password for Hispaloshop.", "ko": "Hispaloshop 비밀번호 재설정을 요청하셨습니다."}
    buttons = {"es": "Restablecer Contrasena", "en": "Reset Password", "ko": "비밀번호 재설정"}
    expires = {"es": "Este enlace expira en 24 horas.", "en": "This link will expire in 24 hours.", "ko": "이 링크는 24시간 후에 만료됩니다."}
    ignores = {"es": "Si no solicitaste esto, ignora este email.", "en": "If you didn't request this, please ignore this email.", "ko": "요청하지 않으셨다면 이 이메일을 무시하세요."}
    
    lang = user_lang if user_lang in subjects else "en"
    
    email_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1C1C1C; font-size: 24px; margin-bottom: 8px;">Hispaloshop</h1>
        <h2 style="color: #1C1C1C; font-size: 18px; margin-bottom: 16px;">{titles[lang]}</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">{bodies[lang]}</p>
        <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 999px; margin: 24px 0; font-size: 14px; font-weight: 600;">
            {buttons[lang]}
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">{expires[lang]}<br>{ignores[lang]}</p>
    </div>
    """

    if not _is_email_delivery_configured():
        logger.error("[FORGOT_PASSWORD] Email delivery unavailable for %s", normalized_email)
        return {
            "message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña.",
            "email_delivery_available": False,
        }
    
    try:
        send_email(to=normalized_email, subject=subjects[lang], html=email_html)
        logger.info(f"[FORGOT_PASSWORD] Reset email sent to {normalized_email} (lang={lang}, origin={origin})")
    except Exception as e:
        logger.error(f"[FORGOT_PASSWORD] Email failed: {e}")
        logger.error(f"[FORGOT_PASSWORD] Failed to send reset email to {normalized_email}")
        # Still return success to user
    
    return {
        "message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña.",
        "email_delivery_available": True,
    }


@router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput, request: Request):
    """Reset password using token"""
    await rate_limiter.check(request, endpoint_type="reset_password")
    # Find valid reset token — constant-time verification to prevent timing attacks
    import secrets as _secrets
    reset = await db.password_resets.find_one(
        {"token": input.token},
        {"_id": 0}
    )

    if not reset or not _secrets.compare_digest(reset.get("token", ""), input.token):
        logger.warning("[RESET_PASSWORD] Invalid or not found token attempt")
        raise HTTPException(status_code=400, detail="El enlace de recuperación no es válido. Por favor solicita uno nuevo.")
    
    # Check if already used
    if reset.get("used"):
        logger.warning("[RESET_PASSWORD] Attempted reuse of already-used token")
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado. Por favor solicita uno nuevo.")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        logger.warning("[RESET_PASSWORD] Expired token attempt")
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Por favor solicita uno nuevo.")
    
    # Validate new password
    if len(input.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Prevent reuse of the same password
    user_doc = await db.users.find_one({"user_id": reset["user_id"]}, {"_id": 0, "password_hash": 1})
    if user_doc and user_doc.get("password_hash"):
        if verify_password(input.new_password, user_doc["password_hash"]):
            raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la anterior")

    # Update user's password
    password_hash = hash_password(input.new_password)
    await db.users.update_one(
        {"user_id": reset["user_id"]},
        {"$set": {"password_hash": password_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": input.token},
        {"$set": {"used": True}}
    )
    
    # Invalidate all user sessions for security
    await db.user_sessions.delete_many({"user_id": reset["user_id"]})
    
    logger.info(f"[RESET_PASSWORD] Password reset successful for user {reset['user_id']}")
    
    return {"message": "Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña."}

@router.post("/auth/add-password")
async def add_password_to_account(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Allow Google-only users to add a password to their account"""
    body = await request.json()
    new_password = body.get("new_password", "")
    if not new_password or len(new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    user_doc = await db.users.find_one({"user_id": current_user.user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Only allow if user has no password yet (Google-only account)
    if user_doc.get("password_hash") and user_doc.get("auth_provider") != "google":
        raise HTTPException(status_code=400, detail="Ya tienes una contraseña configurada. Usa la opción de cambiar contraseña.")

    password_hash = hash_password(new_password)
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"password_hash": password_hash, "has_password": True}}
    )
    return {"message": "Contraseña añadida correctamente"}


@router.get("/auth/session")
async def auth_session(request: Request, response: Response):
    """Exchange session_id for a session token (legacy)"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    auth_backend_url = _get_public_auth_backend_url(request)
    
    import httpx
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            f"{auth_backend_url}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    
    # Check if user already exists
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user with Google data
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        auto_username = f"user_{uuid.uuid4().hex[:8]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "username": auto_username,
            "picture": auth_data.get("picture"),
            "role": "customer",
            "email_verified": True,
            "approved": True,
            "onboarding_completed": False,
            "onboarding_step": 1,
            "interests": [],
            "following": [],
            "followers": [],
            "followers_count": 0,
            "analytics_consent": {
                "version": "1.0",
                "granted": True,
                "date": datetime.now(timezone.utc).isoformat()
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"[GOOGLE_AUTH] New user created: {auth_data['email']}")
    else:
        user_id = user_doc["user_id"]
        # Update user picture if changed
        if auth_data.get("picture") and auth_data["picture"] != user_doc.get("picture"):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": auth_data["picture"]}}
            )
            user_doc["picture"] = auth_data["picture"]
        logger.info(f"[GOOGLE_AUTH] Existing user logged in: {auth_data['email']}")
    
    session_token = auth_data["session_token"]
    
    # Store session in database (hashed for security)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": _hash_session_token(session_token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response = JSONResponse(content={
        "user": _sanitize_user_doc(user_doc),
        "session_token": session_token
    })
    _set_session_cookie(response, request, session_token)
    return response
@router.get("/auth/me")
async def get_me(request: Request):
    """Get current user - returns null if not authenticated (no 401)"""
    from core.auth import get_optional_user
    user = await get_optional_user(request)
    if not user:
        return None
    user_dict = user.model_dump()
    # Backfill missing username for legacy/OAuth users
    if not user_dict.get("username"):
        auto_username = f"user_{uuid.uuid4().hex[:8]}"
        await db.users.update_one(
            {"user_id": user_dict["user_id"]},
            {"$set": {"username": auto_username}}
        )
        user_dict["username"] = auto_username
    return _sanitize_user_doc(user_dict)


@router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh session token - creates new session if valid"""
    session_token = request.cookies.get('session_token')
    
    if not session_token:
        raise HTTPException(status_code=401, detail="No session token")
    
    # Find valid session (hash the token for DB lookup)
    hashed_token = _hash_session_token(session_token)
    session = await db.user_sessions.find_one(
        {"session_token": hashed_token},
        {"_id": 0}
    )

    if not session:
        # Legacy fallback: sessions created before token hashing migration
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            await db.user_sessions.update_one(
                {"session_token": session_token},
                {"$set": {"session_token": hashed_token}}
            )

    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check expiration
    expires_at = datetime.fromisoformat(session["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": hashed_token})
        raise HTTPException(status_code=401, detail="Session expired")

    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0, "password_hash": 0}
    )

    if not user_doc:
        await db.user_sessions.delete_one({"session_token": hashed_token})
        raise HTTPException(status_code=401, detail="User not found")

    # Create new session BEFORE deleting old one to prevent session loss on crash
    new_session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": _hash_session_token(new_session_token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Delete old session after new one is safely persisted
    await db.user_sessions.delete_one({"session_token": hashed_token})
    
    # Set new cookie
    _set_session_cookie(response, request, new_session_token)
    
    return {
        "user": user_doc,
        "session_token": new_session_token
    }


@router.post("/auth/logout")
async def logout(request: Request):
    session_token = request.cookies.get('session_token')
    if session_token:
        # Delete by hashed token, or legacy plaintext token
        result = await db.user_sessions.delete_one({"session_token": _hash_session_token(session_token)})
        if result.deleted_count == 0:
            await db.user_sessions.delete_one({"session_token": session_token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token", path="/")
    return response


# ============================================================================
# SET ROLE (Onboarding)
# ============================================================================

@router.post("/auth/set-role")
async def set_role(request: Request, user: User = Depends(get_current_user)):
    """Set user role and food preferences during onboarding."""
    body = await request.json()
    role = body.get("role")
    preferences = body.get("preferences", [])

    # Only allow consumer/customer during onboarding — privileged roles
    # (producer, influencer, importer) require dedicated registration flows
    valid_roles = ["consumer", "customer"]
    if not role or role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Normalize consumer → customer
    if role == "consumer":
        role = "customer"

    update_data = {
        "role": role,
        "updated_at": datetime.now(timezone.utc),
    }
    if preferences:
        update_data["food_preferences"] = preferences

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_data}
    )

    updated_user = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "password_hash": 0}
    )
    return updated_user


# ============================================================================
# GOOGLE OAUTH - Sistema propio
# ============================================================================

@router.get("/auth/google/status")
async def get_google_auth_status(request: Request):
    """Expose Google OAuth readiness so frontend can disable unavailable flows."""
    client_id = _resolve_google_client_id()
    client_secret = _resolve_google_client_secret()
    backend_url = _get_public_auth_backend_url(request)
    configured = bool(client_id and client_secret and backend_url)

    return {
        "configured": configured,
        "has_client_id": bool(client_id),
        "has_client_secret": bool(client_secret),
    }

@router.get("/auth/google/url")
async def get_google_auth_url(request: Request):
    """Get Google OAuth URL for self-managed authentication"""
    client_id = _resolve_google_client_id()
    if not client_id:
        logger.error("[GOOGLE_AUTH] GOOGLE_CLIENT_ID missing in environment")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    backend_url = _get_public_auth_backend_url(request)
    redirect_uri = f"{backend_url}/api/auth/google/callback"
    
    # Google OAuth parameters
    scope = "openid email profile"
    state = uuid.uuid4().hex  # CSRF protection
    
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scope,
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
            }
        )
    )
    logger.info("[GOOGLE_AUTH] Generated Google auth URL with redirect_uri=%s", redirect_uri)
    
    # Store state in a short-lived, secure cookie
    is_secure_cookie = _is_secure_request(request)
    frontend_origin = _extract_origin(request.headers.get("origin")) or _extract_origin(request.headers.get("referer")) or _get_public_frontend_url(request)
    response = JSONResponse(content={"auth_url": auth_url, "state": state})
    response.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,  # 10 minutes
        httponly=True,
        secure=is_secure_cookie,
        samesite="lax"
    )
    response.set_cookie(
        key="oauth_frontend_origin",
        value=frontend_origin,
        max_age=600,
        httponly=True,
        secure=is_secure_cookie,
        samesite="lax"
    )
    return response


@router.get("/auth/google/callback")
async def google_auth_callback(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None
):
    """Handle Google OAuth callback"""
    stored_state = request.cookies.get("oauth_state")
    if not state or state != stored_state:
        logger.warning("[GOOGLE_AUTH] Invalid OAuth state. received=%s stored=%s", state, stored_state)
        return _build_frontend_auth_callback_response(request, error="Invalid state parameter")

    if error:
        logger.error("[GOOGLE_AUTH] Google returned error=%s", error)
        return _build_frontend_auth_callback_response(request, error=f"Google auth error: {error}")
    
    if not code:
        return _build_frontend_auth_callback_response(request, error="No authorization code provided")
    
    client_id = _resolve_google_client_id()
    client_secret = _resolve_google_client_secret()
    
    if not client_id or not client_secret:
        logger.error("[GOOGLE_AUTH] Google OAuth missing credentials. client_id=%s client_secret_present=%s", bool(client_id), bool(client_secret))
        return _build_frontend_auth_callback_response(request, error="Google OAuth not configured")
    
    backend_url = _get_public_auth_backend_url(request)
    redirect_uri = f"{backend_url}/api/auth/google/callback"
    
    import httpx
    async with httpx.AsyncClient() as client:
        # Exchange authorization code for access token
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
    
    if token_response.status_code != 200:
        logger.error("[GOOGLE_AUTH] Token exchange failed. status=%s body=%s", token_response.status_code, token_response.text)
        return _build_frontend_auth_callback_response(request, error="Failed to exchange authorization code")
    
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    
    # Get user info from Google
    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
    
    if userinfo_response.status_code != 200:
        logger.error("[GOOGLE_AUTH] Failed fetching userinfo. status=%s body=%s", userinfo_response.status_code, userinfo_response.text)
        return _build_frontend_auth_callback_response(request, error="Failed to get user info from Google")
    
    google_user = userinfo_response.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": google_user["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        auto_username = f"user_{uuid.uuid4().hex[:8]}"
        user_doc = {
            "user_id": user_id,
            "email": google_user["email"],
            "name": google_user.get("name", google_user["email"].split("@")[0]),
            "username": auto_username,
            "picture": google_user.get("picture"),
            "role": "customer",
            "email_verified": google_user.get("verified_email", False),
            "approved": True,
            "auth_provider": "google",
            "onboarding_completed": False,
            "onboarding_step": 1,
            "interests": [],
            "following": [],
            "followers": [],
            "followers_count": 0,
            # NOTE: Google OAuth users bypass age verification. Consider adding
            # age check during onboarding for Google users.
            "country": "ES",  # Default, user can change in settings
            "analytics_consent": {
                "analytics_consent": True,
                "consent_version": "1.0",
                "consent_date": datetime.now(timezone.utc).isoformat()
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"[GOOGLE_AUTH] New user created: {google_user['email']}")
    else:
        user_id = user_doc["user_id"]
        # Update Google picture if changed
        if google_user.get("picture") and google_user["picture"] != user_doc.get("picture"):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": google_user["picture"], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            user_doc["picture"] = google_user["picture"]
        logger.info(f"[GOOGLE_AUTH] Existing user logged in: {google_user['email']}")
    
    # Create session (store hashed token, plain token goes to client cookie)
    session_token = f"session_{uuid.uuid4().hex}"

    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": _hash_session_token(session_token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Use an HTML response (not a redirect) so that Set-Cookie is forwarded
    # correctly by Vercel's proxy edge (which may strip cookies from 3xx redirects).
    frontend_url = _get_public_frontend_url(request)
    import json as _json
    target_url = f"{frontend_url}/auth/callback?token=google"
    html_content = (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        "<script>window.location.replace(" + _json.dumps(target_url) + ");</script>"
        "</head><body>Redirecting...</body></html>"
    )
    html_response = HTMLResponse(content=html_content)
    _set_session_cookie(html_response, request, session_token)
    html_response.delete_cookie("oauth_state", path="/")
    html_response.delete_cookie("oauth_frontend_origin", path="/")
    return html_response
