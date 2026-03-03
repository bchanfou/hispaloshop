import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import InfluencerProfile, Subscription, Tenant, User
from schemas import LoginRequest, RegisterRequest, TokenResponse, UserProfileResponse, UserResponse, UserUpdateRequest
from security import create_access_token, create_refresh_token, decode_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth")
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user




async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        return None

    return await db.get(User, payload.get("sub"))


def _validate_password(password: str) -> None:
    if len(password) < 8 or not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must include min 8 chars, 1 uppercase and 1 number")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    _validate_password(payload.password)
    tenant = await db.scalar(select(Tenant).where(Tenant.code == "ES"))
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant ES not found. Run seed_tenant.py first")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        tenant_id=tenant.id,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.role == "influencer":
        db.add(InfluencerProfile(user_id=user.id))

    db.add(
        Subscription(
            user_id=user.id,
            plan="free",
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
            commission_bps=2000,
        )
    )
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {"sub": str(user.id), "role": user.role, "tenant_id": str(user.tenant_id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=1800,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserProfileResponse)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.scalar(
        select(User)
        .options(selectinload(User.subscription), selectinload(User.influencer_profile), selectinload(User.tenant))
        .where(User.id == current_user.id)
    )
    return user


@router.patch("/me", response_model=UserProfileResponse)
async def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user, ["tenant", "subscription", "influencer_profile"])
    return current_user
