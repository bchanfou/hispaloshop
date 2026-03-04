from __future__ import annotations

import logging

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import User
from routers.auth import get_current_user
from schemas import ConnectAccountResponse, ConnectStatusResponse
from services.stripe_connect_service import StripeConnectService

router = APIRouter(prefix="/connect", tags=["connect"])
logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/account", response_model=ConnectAccountResponse)
async def create_connect_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"producer", "admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Only producers can create Connect accounts")
    try:
        result = await StripeConnectService.create_connect_account(db=db, user=current_user, account_type="express")
        return ConnectAccountResponse(**result)
    except Exception as exc:
        logger.error("Error creating Connect account for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to create Connect account")


@router.get("/status", response_model=ConnectStatusResponse)
async def get_connect_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_account_id:
        return ConnectStatusResponse(
            has_account=False,
            account_id=None,
            status="not_created",
            charges_enabled=False,
            payouts_enabled=False,
            requirements_due=[],
            onboarding_completed=False,
        )

    try:
        status = await StripeConnectService.sync_account_status(db, current_user)
        return ConnectStatusResponse(
            has_account=True,
            account_id=current_user.stripe_account_id,
            status=status["status"],
            charges_enabled=status["charges_enabled"],
            payouts_enabled=status["payouts_enabled"],
            requirements_due=status["requirements_due"],
            onboarding_completed=current_user.connect_onboarding_completed,
        )
    except Exception as exc:
        logger.error("Error syncing Connect status for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to get account status")


@router.post("/refresh-link")
async def refresh_onboarding_link(
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_account_id:
        raise HTTPException(status_code=400, detail="No Connect account found")
    try:
        onboarding_url = await StripeConnectService.create_onboarding_link(current_user.stripe_account_id)
        return {"onboarding_url": onboarding_url}
    except Exception as exc:
        logger.error("Error creating onboarding refresh link for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to create onboarding link")


@router.post("/login-link")
async def create_connect_login_link(
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_account_id:
        raise HTTPException(status_code=400, detail="No Connect account found")
    try:
        login_url = await StripeConnectService.create_dashboard_login_link(current_user.stripe_account_id)
        return {"url": login_url}
    except Exception as exc:
        logger.error("Error creating Stripe dashboard login link for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to create dashboard login link")


@router.post("/webhook")
async def connect_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_CONNECT_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {exc}")

    if event.get("type") == "account.updated":
        account = event["data"]["object"]
        account_id = account.get("id")
        if account_id:
            user = await db.scalar(select(User).where(User.stripe_account_id == account_id))
            if user:
                await StripeConnectService.sync_account_status(db, user)

    return {"status": "success"}
