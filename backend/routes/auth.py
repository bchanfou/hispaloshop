"""
Auth routes: register, login, logout, verify-email, password reset, session.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
import uuid
import logging
import re

from core.database import db
from core.models import User, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput
from core.auth import get_current_user
from core.config import settings
from core.constants import get_email_template
from services.auth_helpers import (
    hash_password, verify_password, needs_rehash,
    generate_verification_token, generate_verification_code,
    send_email, FRONTEND_URL, AUTH_BACKEND_URL,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _set_session_cookie(target_response: Response, request: Request, session_token: str) -> None:
    """Apply the session cookie consistently for JSON and redirect responses."""
    is_secure_cookie = request.url.scheme == "https"
    target_response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        samesite="none" if is_secure_cookie else "lax",
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
    return _json_safe(sanitized)


async def _create_user_session(user_id: str) -> str:
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
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

# Auth routes

@router.post("/auth/register")
async def register(input: RegisterInput, request: Request):
    # GDPR Compliance: Consent is MANDATORY for customers
    if input.role == "customer" and not input.analytics_consent:
        raise HTTPException(
            status_code=400, 
            detail="Analytics consent is required for customer registration"
        )
    
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Username validation
    username = input.username
    if username:
        username = username.strip().lower()
        if not re.match(r"^[a-z0-9_]{3,20}$", username):
            raise HTTPException(status_code=400, detail="Invalid username. Use 3-20 lowercase letters, numbers, or underscores.")
        existing_username = await db.users.find_one({"username": username}, {"_id": 0})
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    else:
        username = f"user_{uuid.uuid4().hex[:8]}"
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(input.password)
    
    user_data = {
        "user_id": user_id,
        "email": input.email.lower(),
        "name": input.name,
        "username": username,
        "role": input.role,
        "country": input.country,
        "password_hash": password_hash,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "approved": input.role == "customer",
        "auth_provider": "local",
        "onboarding_completed": input.role != "customer",
        "onboarding_step": 1 if input.role == "customer" else 0,
        "interests": [],
        "following": [],
        "followers": [],
        "followers_count": 0,
        # GDPR Consent tracking
        "consent": {
            "analytics_consent": input.analytics_consent,
            "consent_version": input.consent_version,
            "consent_date": datetime.now(timezone.utc).isoformat() if input.analytics_consent else None
        }
    }
    
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
        })
    
    if input.role == "influencer":
        user_data.update({
            "approved": False,  # Needs admin approval
            "influencer_profile": {
                "tier": "perseo",
                "commission_rate": 0.03,
                "followers_count": int(str(input.followers or "0").replace(".", "").replace(",", "") or 0),
            },
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
            "niche": input.niche,
            "status": "pending",  # pending, active, banned
            "commission_type": "percentage",
            "commission_value": 3,  # Base tier (Perseo) 3%
            "discount_code_id": None,  # Will be set when they create their code
            "total_sales_generated": 0,
            "total_commission_earned": 0,
            "available_balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.influencers.insert_one(influencer_data)
    
    await db.users.insert_one(user_data)
    
    # Generate 6-digit verification code
    verification_code = generate_verification_code()
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "email": input.email,
        "token": verification_code,
        "code": verification_code,  # Store as code for clarity
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    # Get email template in user's language
    user_lang = input.language if input.language in ["es", "en", "ko"] else "en"
    template = get_email_template("verification", user_lang)
    
    # Send verification email with 6-digit code in user's language
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1C1C1C; font-size: 24px; margin: 0;">Hispaloshop</h1>
        </div>
        
        <div style="background-color: #FAF7F2; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1C1C1C; margin: 0 0 15px 0;">{template['title']}</h2>
            <p style="color: #4A4A4A; font-size: 16px; margin: 0 0 25px 0;">
                {template['body']}
            </p>
            <div style="background-color: #1C1C1C; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
                {verification_code}
            </div>
            <p style="color: #7A7A7A; font-size: 14px; margin-top: 25px;">
                {template['expires']}
            </p>
        </div>
        
        <p style="color: #7A7A7A; font-size: 12px; text-align: center; margin-top: 30px;">
            {template['ignore']}
        </p>
    </div>
    """
    
    session_token = await _create_user_session(user_id)

    try:
        send_email(
            to=input.email,
            subject=template['subject'],
            html=email_html
        )
        logger.info(f"[REGISTRATION] Verification email sent to {input.email} in {user_lang}")
    except HTTPException as e:
        # If email fails, we should still allow registration but warn the user
        logger.error(f"[REGISTRATION] Failed to send verification email to {input.email}")
        return _build_auth_response(
            request,
            user_data,
            session_token,
            message="Registration successful, but failed to send verification email. Please try resending it later.",
        )
    
    return _build_auth_response(
        request,
        user_data,
        session_token,
        message="Registration successful. Please check your email to verify your account.",
    )

# Email verification endpoints
@router.post("/auth/verify-email")
async def verify_email(token: str = None, code: str = None):
    """Verify email using 6-digit code or legacy token"""
    verification_key = code or token
    if not verification_key:
        raise HTTPException(status_code=400, detail="Verification code required")
    
    # Try to find by code first, then by token (for backwards compatibility)
    verification = await db.email_verifications.find_one(
        {"$or": [{"code": verification_key}, {"token": verification_key}]},
        {"_id": 0}
    )
    
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
    
    # Delete the verification record
    await db.email_verifications.delete_one({"user_id": verification["user_id"]})
    
    return {"message": "Email verificado correctamente", "success": True}

@router.post("/auth/resend-verification")
async def resend_verification(user: User = Depends(get_current_user)):
    """Resend verification email with 6-digit code"""
    if user.email_verified:
        return {"message": "Email already verified"}
    
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
    
    # Send verification email with 6-digit code
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1C1C1C; font-size: 24px; margin: 0;">Hispaloshop</h1>
        </div>
        
        <div style="background-color: #FAF7F2; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1C1C1C; margin: 0 0 15px 0;">Verifica tu cuenta</h2>
            <p style="color: #4A4A4A; font-size: 16px; margin: 0 0 25px 0;">
                Introduce este código en tu panel para activar tu cuenta:
            </p>
            <div style="background-color: #1C1C1C; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
                {verification_code}
            </div>
            <p style="color: #7A7A7A; font-size: 14px; margin-top: 25px;">
                Este código expira en 24 horas.
            </p>
        </div>
    </div>
    """
    
    # Send email
    send_email(
        to=user.email,
        subject="Código de verificación - Hispaloshop",
        html=email_html
    )
    
    logger.info(f"[RESEND_VERIFICATION] Code sent to {user.email}")
    
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
    identifier = input.email.strip().lower()
    
    # Determine if identifier is email or username
    if "@" in identifier and "." in identifier.split("@")[-1]:
        user_doc = await db.users.find_one({"email": identifier}, {"_id": 0})
    else:
        # Strip leading @ if present
        username = identifier.lstrip("@")
        user_doc = await db.users.find_one({"username": username}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if "password_hash" not in user_doc:
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(input.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Producer, importer and influencer accounts require admin approval before access.
    if user_doc.get("role") in ["producer", "importer", "influencer"] and not user_doc.get("approved", False):
        raise HTTPException(status_code=403, detail="Your account is pending admin approval")
    
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
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    if not user:
        return {"message": "If that email exists, a password reset link has been sent."}
    
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    
    reset_token = generate_verification_token()
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": input.email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "used": False
    })
    
    # Use request origin (works on preview + production)
    origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/") or FRONTEND_URL
    # Strip any path from referer
    if "/api" in origin:
        origin = origin.split("/api")[0]
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
    
    try:
        send_email(to=input.email, subject=subjects[lang], html=email_html)
        logger.info(f"[FORGOT_PASSWORD] Reset email sent to {input.email} (lang={lang}, origin={origin})")
    except Exception as e:
        logger.error(f"[FORGOT_PASSWORD] Email failed: {e}")
        logger.error(f"[FORGOT_PASSWORD] Failed to send reset email to {input.email}")
        # Still return success to user
    
    return {"message": "If that email exists, a password reset link has been sent."}


@router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput):
    """Reset password using token"""
    # Find valid reset token
    reset = await db.password_resets.find_one(
        {"token": input.token},
        {"_id": 0}
    )
    
    if not reset:
        logger.warning(f"[RESET_PASSWORD] Token not found: {input.token[:20]}...")
        raise HTTPException(status_code=400, detail="El enlace de recuperación no es válido. Por favor solicita uno nuevo.")
    
    # Check if already used
    if reset.get("used"):
        logger.warning(f"[RESET_PASSWORD] Token already used: {input.token[:20]}...")
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado. Por favor solicita uno nuevo.")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        logger.warning(f"[RESET_PASSWORD] Token expired: {input.token[:20]}...")
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Por favor solicita uno nuevo.")
    
    # Validate new password
    if len(input.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
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
    
    return {"message": "Password reset successfully. Please login with your new password."}

@router.get("/auth/session")
async def auth_session(request: Request, response: Response):
    """Exchange session_id from Emergent Auth for a session token"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    auth_backend_url = settings.AUTH_BACKEND_URL
    
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
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
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
    
    # Store session in database
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
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
    return _sanitize_user_doc(user.model_dump())


@router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh session token - creates new session if valid"""
    session_token = request.cookies.get('session_token')
    
    if not session_token:
        raise HTTPException(status_code=401, detail="No session token")
    
    # Find valid session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiration
    expires_at = datetime.fromisoformat(session["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user_doc:
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create new session
    new_session_token = f"session_{uuid.uuid4().hex}"
    
    # Delete old session
    await db.user_sessions.delete_one({"session_token": session_token})
    
    # Create new session
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": new_session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
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
        await db.user_sessions.delete_one({"session_token": session_token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token", path="/")
    return response


# ============================================================================
# GOOGLE OAUTH - Sistema propio (sin Emergent)
# ============================================================================

@router.get("/auth/google/url")
async def get_google_auth_url(request: Request):
    """Get Google OAuth URL for self-managed authentication"""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        logger.error("[GOOGLE_AUTH] GOOGLE_CLIENT_ID missing in environment")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    backend_url = settings.AUTH_BACKEND_URL
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
    is_secure_cookie = request.url.scheme == "https"
    response = JSONResponse(content={"auth_url": auth_url, "state": state})
    response.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,  # 10 minutes
        httponly=True,
        secure=is_secure_cookie,
        samesite="lax" if not is_secure_cookie else "none"
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
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    if error:
        logger.error("[GOOGLE_AUTH] Google returned error=%s", error)
        raise HTTPException(status_code=400, detail=f"Google auth error: {error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")
    
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    
    if not client_id or not client_secret:
        logger.error("[GOOGLE_AUTH] Google OAuth missing credentials. client_id=%s client_secret_present=%s", bool(client_id), bool(client_secret))
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    backend_url = settings.AUTH_BACKEND_URL
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
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
    
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
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")
    
    google_user = userinfo_response.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": google_user["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": google_user["email"],
            "name": google_user.get("name", google_user["email"].split("@")[0]),
            "picture": google_user.get("picture"),
            "role": "customer",
            "email_verified": google_user.get("verified_email", True),
            "approved": True,
            "auth_provider": "google",
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
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    frontend_redirect = settings.FRONTEND_URL
    redirect_response = RedirectResponse(url=f"{frontend_redirect}/auth/callback?token=google")
    _set_session_cookie(redirect_response, request, session_token)
    redirect_response.delete_cookie("oauth_state", path="/")
    return redirect_response
