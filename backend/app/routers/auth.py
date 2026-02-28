"""
Authentication routes: register, login, verify, password reset, Google OAuth.
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from datetime import datetime, timezone, timedelta
import uuid

# Import from core
from ..core.config import db, FRONTEND_URL, logger
from ..core.security import hash_password, generate_verification_token, get_current_user
from ..core.email import send_email

# Import models
from ..models.user import (
    User, RegisterInput, LoginInput, 
    ForgotPasswordInput, ResetPasswordInput
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(input: RegisterInput):
    """Register a new user with email verification."""
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(input.password)
    
    user_data = {
        "user_id": user_id,
        "email": input.email,
        "name": input.name,
        "role": input.role,
        "country": input.country,
        "password_hash": password_hash,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved": input.role == "customer",
        "consent": {
            "analytics_consent": input.analytics_consent,
            "consent_version": input.consent_version,
            "consent_date": datetime.now(timezone.utc).isoformat() if input.analytics_consent else None
        }
    }
    
    if input.role == "producer":
        user_data.update({
            "company_name": input.company_name,
            "phone": input.phone,
            "whatsapp": input.whatsapp,
            "contact_person": input.contact_person,
            "fiscal_address": input.fiscal_address,
            "vat_cif": input.vat_cif,
            "approved": False
        })
    
    await db.users.insert_one(user_data)
    
    # Generate verification token
    verification_token = generate_verification_token()
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "email": input.email,
        "token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    # Send verification email
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1C1C1C;">Verify your email</h2>
        <p>Welcome to Hispaloshop.</p>
        <p>Please verify your email by clicking the button below:</p>
        <a href="{verification_link}"
           style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0;">
           Verify Email
        </a>
        <p style="color: #7A7A7A; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{verification_link}">{verification_link}</a>
        </p>
        <p style="color: #7A7A7A; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours.
        </p>
    </div>
    """
    
    try:
        send_email(to=input.email, subject="Verify your email - Hispaloshop", html=email_html)
        logger.info(f"[REGISTRATION] Verification email sent to {input.email}")
    except HTTPException:
        logger.error(f"[REGISTRATION] Failed to send verification email to {input.email}")
    
    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "user_id": user_id
    }


@router.post("/verify-email")
async def verify_email(token: str):
    """Verify email using token."""
    verification = await db.email_verifications.find_one({"token": token}, {"_id": 0})
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    await db.email_verifications.delete_one({"token": token})
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(email: str):
    """Resend verification email."""
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    # Delete old tokens
    await db.email_verifications.delete_many({"user_id": user["user_id"]})
    
    # Generate new token
    verification_token = generate_verification_token()
    await db.email_verifications.insert_one({
        "user_id": user["user_id"],
        "email": email,
        "token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Click below to verify:</p>
        <a href="{verification_link}" style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px;">
            Verify Email
        </a>
    </div>
    """
    
    send_email(to=email, subject="Verify your email - Hispaloshop", html=email_html)
    return {"message": "Verification email sent"}


@router.get("/verification-status")
async def verification_status(user: User = Depends(get_current_user)):
    """Check if user's email is verified."""
    return {"email_verified": user.email_verified}


@router.post("/login")
async def login(input: LoginInput, response: Response):
    """Login with email and password."""
    user_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user_doc.get("password_hash") != hash_password(input.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    
    if user_doc.get("role") == "producer" and not user_doc.get("approved", False):
        raise HTTPException(status_code=403, detail="Your producer account is pending approval")
    
    # Generate session token
    session_token = f"session_{uuid.uuid4().hex}"
    await db.users.update_one(
        {"email": input.email},
        {"$set": {"session_token": session_token}}
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=86400 * 7
    )
    
    user_response = {k: v for k, v in user_doc.items() if k != "password_hash"}
    return {"user": user_response, "session_token": session_token}


@router.post("/forgot-password")
async def forgot_password(input: ForgotPasswordInput):
    """Request password reset email."""
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    if not user:
        return {"message": "If an account exists, you will receive an email"}
    
    reset_token = generate_verification_token()
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": input.email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    })
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Click below to reset your password:</p>
        <a href="{reset_link}" style="display: inline-block; padding: 12px 20px; background: #1C1C1C; color: #fff; text-decoration: none; border-radius: 4px;">
            Reset Password
        </a>
        <p style="color: #7A7A7A; font-size: 12px;">This link expires in 1 hour.</p>
    </div>
    """
    
    try:
        send_email(to=input.email, subject="Reset your password - Hispaloshop", html=email_html)
    except HTTPException:
        logger.error(f"[PASSWORD RESET] Failed to send email to {input.email}")
    
    return {"message": "If an account exists, you will receive an email"}


@router.post("/reset-password")
async def reset_password(input: ResetPasswordInput):
    """Reset password using token."""
    reset_doc = await db.password_resets.find_one({"token": input.token}, {"_id": 0})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = datetime.fromisoformat(reset_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    new_hash = hash_password(input.new_password)
    await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_resets.delete_one({"token": input.token})
    
    return {"message": "Password reset successfully"}


@router.get("/session")
async def get_session(request: Request):
    """Check if user has valid session."""
    session_token = request.cookies.get("session_token")
    if not session_token:
        return {"authenticated": False}
    
    user_doc = await db.users.find_one({"session_token": session_token}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        return {"authenticated": False}
    
    return {"authenticated": True, "user": user_doc}


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info."""
    return user


@router.post("/logout")
async def logout(response: Response, user: User = Depends(get_current_user)):
    """Logout user."""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$unset": {"session_token": ""}}
    )
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}
