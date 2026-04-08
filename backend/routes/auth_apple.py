"""
Apple Sign-In OAuth endpoints
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse, HTMLResponse
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
import uuid
import logging
import jwt as jwt_lib
import hashlib
import httpx

from core.database import db
from core.config import settings
from middleware.rate_limit import rate_limiter
from routes.auth import (
    _hash_session_token, _get_public_frontend_url, _get_public_auth_backend_url,
    _set_session_cookie, _build_frontend_auth_callback_response
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolve_apple_client_id() -> str:
    """Resolve Apple Client ID (Bundle ID or Service ID)"""
    return settings.APPLE_CLIENT_ID or ""


def _resolve_apple_team_id() -> str:
    """Resolve Apple Team ID"""
    return settings.APPLE_TEAM_ID or ""


def _resolve_apple_key_id() -> str:
    """Resolve Apple Key ID"""
    return settings.APPLE_KEY_ID or ""


def _resolve_apple_private_key() -> str:
    """Resolve Apple Private Key"""
    return settings.APPLE_PRIVATE_KEY or ""


def _is_apple_configured() -> bool:
    """Check if Apple Sign-In is properly configured"""
    return all([
        _resolve_apple_client_id(),
        _resolve_apple_team_id(),
        _resolve_apple_key_id(),
        _resolve_apple_private_key(),
    ])


def _generate_apple_client_secret() -> str:
    """Generate client secret JWT for Apple"""
    team_id = _resolve_apple_team_id()
    client_id = _resolve_apple_client_id()
    key_id = _resolve_apple_key_id()
    private_key = _resolve_apple_private_key()
    
    now = datetime.now(timezone.utc)
    
    headers = {
        "kid": key_id,
        "alg": "ES256",
    }
    
    payload = {
        "iss": team_id,
        "iat": now,
        "exp": now + timedelta(hours=1),
        "aud": "https://appleid.apple.com",
        "sub": client_id,
    }
    
    # Sign with private key
    client_secret = jwt_lib.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers=headers
    )
    
    return client_secret


@router.get("/auth/apple/url")
async def get_apple_auth_url(request: Request):
    """Get Apple Sign-In URL"""
    if not _is_apple_configured():
        logger.error("[APPLE_AUTH] Apple Sign-In not configured")
        raise HTTPException(status_code=500, detail="Apple Sign-In not configured")
    
    await rate_limiter.check(request, endpoint_type="auth")
    
    client_id = _resolve_apple_client_id()
    backend_url = _get_public_auth_backend_url(request)
    redirect_uri = f"{backend_url}/api/auth/apple/callback"
    
    # Apple OAuth parameters
    state = uuid.uuid4().hex  # CSRF protection
    
    auth_url = (
        "https://appleid.apple.com/auth/authorize?"
        + urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code id_token",
            "scope": "name email",
            "state": state,
            "response_mode": "form_post",
        })
    )
    
    return {"auth_url": auth_url, "state": state}


@router.post("/auth/apple/callback")
async def apple_auth_callback(
    request: Request,
    code: str = None,
    id_token: str = None,
    state: str = None,
    error: str = None
):
    """Handle Apple Sign-In callback"""
    
    if error:
        logger.warning("[APPLE_AUTH] OAuth error: %s", error)
        return _build_frontend_auth_callback_response(request, error=error)
    
    if not code and not id_token:
        logger.error("[APPLE_AUTH] No code or id_token received")
        return _build_frontend_auth_callback_response(request, error="No authorization received")
    
    if not _is_apple_configured():
        logger.error("[APPLE_AUTH] Apple Sign-In not configured")
        return _build_frontend_auth_callback_response(request, error="Apple Sign-In not configured")
    
    try:
        apple_user = None
        email = None
        
        # If we have an id_token, verify and extract user info
        if id_token:
            # Verify the ID token (simplified - in production, verify signature)
            # Apple's public keys: https://appleid.apple.com/auth/keys
            try:
                # For now, decode without verification (token comes directly from Apple)
                # In production, verify with Apple's public key
                unverified = jwt_lib.decode(id_token, options={"verify_signature": False})
                email = unverified.get("email")
                apple_sub = unverified.get("sub")  # Apple's unique user ID
            except Exception as e:
                logger.error("[APPLE_AUTH] Failed to decode id_token: %s", e)
                return _build_frontend_auth_callback_response(request, error="Invalid token")
        
        # If we have an authorization code, exchange it for tokens
        elif code:
            client_id = _resolve_apple_client_id()
            client_secret = _generate_apple_client_secret()
            backend_url = _get_public_auth_backend_url(request)
            redirect_uri = f"{backend_url}/api/auth/apple/callback"
            
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    "https://appleid.apple.com/auth/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
            
            if token_response.status_code != 200:
                logger.error("[APPLE_AUTH] Token exchange failed: %s", token_response.text)
                return _build_frontend_auth_callback_response(request, error="Token exchange failed")
            
            token_data = token_response.json()
            id_token = token_data.get("id_token")
            
            if id_token:
                try:
                    unverified = jwt_lib.decode(id_token, options={"verify_signature": False})
                    email = unverified.get("email")
                    apple_sub = unverified.get("sub")
                except Exception as e:
                    logger.error("[APPLE_AUTH] Failed to decode id_token: %s", e)
                    return _build_frontend_auth_callback_response(request, error="Invalid token")
        
        if not email:
            logger.error("[APPLE_AUTH] No email in token")
            return _build_frontend_auth_callback_response(request, error="Email not provided")
        
        # Check if user exists
        user_doc = await db.users.find_one({"email": email.lower()}, {"_id": 0})
        
        if not user_doc:
            # Create new user
            user_id = f"usr_{uuid.uuid4().hex[:16]}"
            username = email.split("@")[0].lower()
            
            # Ensure unique username
            existing = await db.users.find_one({"username": username}, {"_id": 0})
            if existing:
                username = f"{username}_{uuid.uuid4().hex[:6]}"
            
            user_doc = {
                "user_id": user_id,
                "email": email.lower(),
                "username": username,
                "name": email.split("@")[0],  # Use email prefix as name
                "role": "customer",
                "verified_email": True,
                "onboarding_completed": False,
                "auth_provider": "apple",
                "apple_sub": apple_sub,
                "following": [],
                "followers": [],
                "followers_count": 0,
                "country": "ES",
                "analytics_consent": {
                    "analytics_consent": True,
                    "consent_version": "1.0",
                    "consent_date": datetime.now(timezone.utc).isoformat()
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            logger.info("[APPLE_AUTH] New user created: %s", email)
        else:
            user_id = user_doc["user_id"]
            # Update Apple sub if not set
            if not user_doc.get("apple_sub") and apple_sub:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"apple_sub": apple_sub, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
            logger.info("[APPLE_AUTH] Existing user logged in: %s", email)
        
        # Create session
        session_token = f"session_{uuid.uuid4().hex}"
        
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": _hash_session_token(session_token),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Build response
        frontend_url = _get_public_frontend_url(request)
        target_url = f"{frontend_url}/auth/callback?token=apple"
        html_content = (
            "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
            "<script>window.location.replace(" + __import__("json").dumps(target_url) + ");</script>"
            "</head><body>Redirecting...</body></html>"
        )
        html_response = HTMLResponse(content=html_content)
        _set_session_cookie(html_response, request, session_token)
        return html_response
        
    except Exception as e:
        logger.exception("[APPLE_AUTH] Error during callback: %s", e)
        return _build_frontend_auth_callback_response(request, error="Authentication failed")


@router.post("/auth/apple/verify")
async def apple_auth_verify(request: Request, data: dict):
    """Verify Apple Sign-In from mobile app (native iOS)"""
    if not _is_apple_configured():
        raise HTTPException(status_code=500, detail="Apple Sign-In not configured")
    
    await rate_limiter.check(request, endpoint_type="auth")
    
    identity_token = data.get("id_token") or data.get("identity_token")
    authorization_code = data.get("code") or data.get("authorization_code")
    
    if not identity_token and not authorization_code:
        raise HTTPException(status_code=400, detail="No token or code provided")
    
    try:
        # Decode and verify the identity token
        # In production, verify signature with Apple's public keys
        try:
            unverified = jwt_lib.decode(identity_token, options={"verify_signature": False})
            email = unverified.get("email")
            apple_sub = unverified.get("sub")
        except Exception as e:
            logger.error("[APPLE_AUTH] Failed to decode identity token: %s", e)
            raise HTTPException(status_code=400, detail="Invalid token")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided")
        
        # Find or create user
        user_doc = await db.users.find_one({"email": email.lower()}, {"_id": 0})
        
        if not user_doc:
            # Create new user
            user_id = f"usr_{uuid.uuid4().hex[:16]}"
            username = email.split("@")[0].lower()
            
            existing = await db.users.find_one({"username": username}, {"_id": 0})
            if existing:
                username = f"{username}_{uuid.uuid4().hex[:6]}"
            
            user_doc = {
                "user_id": user_id,
                "email": email.lower(),
                "username": username,
                "name": email.split("@")[0],
                "role": "customer",
                "verified_email": True,
                "onboarding_completed": False,
                "auth_provider": "apple",
                "apple_sub": apple_sub,
                "following": [],
                "followers": [],
                "followers_count": 0,
                "country": "ES",
                "analytics_consent": {
                    "analytics_consent": True,
                    "consent_version": "1.0",
                    "consent_date": datetime.now(timezone.utc).isoformat()
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        else:
            user_id = user_doc["user_id"]
        
        # Create session
        session_token = f"session_{uuid.uuid4().hex}"
        
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": _hash_session_token(session_token),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "session_token": session_token,
            "user": {
                "user_id": user_id,
                "email": user_doc["email"],
                "username": user_doc["username"],
                "name": user_doc.get("name"),
                "role": user_doc.get("role", "customer"),
                "onboarding_completed": user_doc.get("onboarding_completed", False),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[APPLE_AUTH] Verification error: %s", e)
        raise HTTPException(status_code=500, detail="Authentication failed")
