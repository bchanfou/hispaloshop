from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import OrderItem, User

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeConnectService:
    @staticmethod
    async def create_connect_account(
        db: AsyncSession,
        user: User,
        account_type: str = "express",
        country: str = "ES",
    ) -> dict[str, Any]:
        if user.stripe_account_id:
            status = await StripeConnectService.sync_account_status(db, user)
            onboarding_url = None
            if not status["charges_enabled"] or not status["payouts_enabled"]:
                onboarding_url = await StripeConnectService.create_onboarding_link(user.stripe_account_id)
            return {
                "account_id": user.stripe_account_id,
                "status": bool(status["charges_enabled"] and status["payouts_enabled"]),
                "onboarding_url": onboarding_url,
            }

        account = await asyncio.to_thread(
            stripe.Account.create,
            type=account_type,
            country=country,
            email=user.email,
            capabilities={"transfers": {"requested": True}},
            business_type="individual",
            metadata={"user_id": str(user.id), "platform": "hispaloshop"},
        )

        user.stripe_account_id = account.id
        user.stripe_account_type = account_type
        user.stripe_account_status = "pending"
        user.stripe_account_created_at = datetime.now(timezone.utc)
        user.stripe_account_charges_enabled = bool(getattr(account, "charges_enabled", False))
        user.stripe_account_payouts_enabled = bool(getattr(account, "payouts_enabled", False))
        user.connect_requirements_due = list(getattr(getattr(account, "requirements", None), "currently_due", []) or [])
        user.connect_onboarding_completed = bool(user.stripe_account_charges_enabled and user.stripe_account_payouts_enabled)
        await db.flush()

        onboarding_url = await StripeConnectService.create_onboarding_link(account.id)
        return {"account_id": account.id, "status": False, "onboarding_url": onboarding_url}

    @staticmethod
    async def create_onboarding_link(account_id: str) -> str:
        account_link = await asyncio.to_thread(
            stripe.AccountLink.create,
            account=account_id,
            refresh_url=f"{settings.FRONTEND_URL}/producer/connect/refresh",
            return_url=f"{settings.FRONTEND_URL}/producer/connect/success",
            type="account_onboarding",
        )
        return account_link.url

    @staticmethod
    async def create_dashboard_login_link(account_id: str) -> str:
        login_link = await asyncio.to_thread(stripe.Account.create_login_link, account_id)
        return login_link.url

    @staticmethod
    async def get_account_status(account_id: str) -> dict[str, Any]:
        account = await asyncio.to_thread(stripe.Account.retrieve, account_id)
        requirements = getattr(account, "requirements", None)
        due = list(getattr(requirements, "currently_due", []) or [])
        charges_enabled = bool(getattr(account, "charges_enabled", False))
        payouts_enabled = bool(getattr(account, "payouts_enabled", False))
        return {
            "charges_enabled": charges_enabled,
            "payouts_enabled": payouts_enabled,
            "requirements_due": due,
            "status": "active" if charges_enabled and payouts_enabled else "pending",
        }

    @staticmethod
    async def sync_account_status(db: AsyncSession, user: User) -> dict[str, Any]:
        if not user.stripe_account_id:
            return {"error": "No Connect account"}
        status = await StripeConnectService.get_account_status(user.stripe_account_id)
        user.stripe_account_charges_enabled = status["charges_enabled"]
        user.stripe_account_payouts_enabled = status["payouts_enabled"]
        user.stripe_account_status = status["status"]
        user.connect_requirements_due = status["requirements_due"]
        user.connect_onboarding_completed = bool(status["charges_enabled"] and status["payouts_enabled"])
        await db.flush()
        return status

    @staticmethod
    async def create_transfer(
        destination_account_id: str,
        amount_cents: int,
        metadata: dict[str, Any],
        transfer_group: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        transfer_params: dict[str, Any] = {
            "amount": int(amount_cents),
            "currency": "eur",
            "destination": destination_account_id,
            "metadata": metadata,
        }
        if transfer_group:
            transfer_params["transfer_group"] = transfer_group
        create_kwargs: dict[str, Any] = {}
        if idempotency_key:
            create_kwargs["idempotency_key"] = idempotency_key
        transfer = await asyncio.to_thread(stripe.Transfer.create, **transfer_params, **create_kwargs)
        return {"transfer_id": transfer.id, "amount_cents": int(amount_cents), "status": getattr(transfer, "status", "pending")}

    @staticmethod
    async def transfer_order_item_to_producer(db: AsyncSession, item: OrderItem) -> None:
        if item.producer_transfer_id or item.producer_payout_status == "transferred":
            return
        producer = item.producer
        if not producer or not producer.stripe_account_id:
            item.producer_payout_status = "pending_onboarding"
            return
        if not producer.stripe_account_payouts_enabled:
            item.producer_payout_status = "pending_onboarding"
            return
        if item.producer_payout_cents <= 0:
            item.producer_payout_status = "not_required"
            return

        metadata = {
            "order_id": str(item.order_id),
            "order_item_id": str(item.id),
            "product_id": str(item.product_id),
            "producer_id": str(item.producer_id),
            "type": "producer_payout",
        }
        try:
            transfer = await StripeConnectService.create_transfer(
                destination_account_id=producer.stripe_account_id,
                amount_cents=item.producer_payout_cents,
                metadata=metadata,
                transfer_group=str(item.order_id),
                idempotency_key=f"{item.order_id}:{item.id}:producer_payout",
            )
            item.producer_transfer_id = transfer["transfer_id"]
            item.producer_payout_status = "transferred"
        except Exception as exc:
            logger.error("Producer transfer failed order_item=%s producer=%s err=%s", item.id, item.producer_id, exc)
            item.producer_payout_status = "failed"
