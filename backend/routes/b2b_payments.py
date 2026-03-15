"""
B2B Payments — Stripe PaymentIntent creation, capture, webhooks, and fee breakdown
for B2B operations (deposit / final payments).
"""
import stripe
from core.config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from core.database import get_db
from core.auth import get_current_user
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
import logging
import os
import json as _json
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(tags=["B2B Payments"])
stripe.api_key = STRIPE_SECRET_KEY
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PLATFORM_FEE_PCT = 3.0          # 3% platform fee
STRIPE_FEE_PCT = 1.4            # 1.4% Stripe fee passed to buyer
STRIPE_FEE_FIXED_EUR = 0.25     # €0.25 fixed Stripe fee


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_accepted_offer(operation: dict) -> dict:
    """Return the last (accepted) offer from the operation's offers array."""
    offers = operation.get("offers", [])
    if not offers:
        raise HTTPException(status_code=400, detail="No offers found in this operation")
    return offers[-1]


def _calculate_amounts(offer: dict, payment_type: str):
    """
    Calculate deposit/final amounts based on payment_terms.
    Returns (amount, total_price) where amount is the portion to charge now.
    """
    total_price = offer.get("total_price", 0)
    payment_terms = offer.get("payment_terms", "")

    if payment_type == "deposit":
        if payment_terms == "prepaid":
            amount = total_price  # 100% upfront
        elif payment_terms in ("net_30", "net_60"):
            amount = 0  # nothing upfront, paid later
        elif payment_terms == "letter_of_credit":
            amount = total_price * 0.50
        else:
            amount = total_price * 0.50  # default 50/50
    elif payment_type == "final":
        if payment_terms == "prepaid":
            amount = 0  # already paid in full
        elif payment_terms in ("net_30", "net_60"):
            amount = total_price  # 100% at final
        elif payment_terms == "letter_of_credit":
            amount = total_price * 0.50
        else:
            amount = total_price * 0.50  # default 50/50
    else:
        raise HTTPException(status_code=400, detail="payment_type must be 'deposit' or 'final'")

    return round(amount, 2), round(total_price, 2)


def _calculate_fees(amount: float):
    """
    Calculate Stripe fee (passed to buyer) and platform fee.
    Returns (stripe_fee, platform_fee, buyer_total, seller_amount).
    """
    stripe_fee = round(amount * (STRIPE_FEE_PCT / 100) + STRIPE_FEE_FIXED_EUR, 2)
    platform_fee = round(amount * (PLATFORM_FEE_PCT / 100), 2)
    buyer_total = round(amount + stripe_fee, 2)
    seller_amount = round(amount - platform_fee, 2)
    return stripe_fee, platform_fee, buyer_total, seller_amount


# ---------------------------------------------------------------------------
# 1. POST /{operation_id}/pay — Create PaymentIntent
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/pay")
async def create_b2b_payment(
    operation_id: str,
    body: dict,
    current_user=Depends(get_current_user),
):
    """Create a Stripe PaymentIntent for a B2B deposit or final payment."""
    db = get_db()
    payment_type = body.get("payment_type")
    if payment_type not in ("deposit", "final"):
        raise HTTPException(status_code=400, detail="payment_type must be 'deposit' or 'final'")

    # --- Fetch operation ---
    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation_id")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    # --- Auth: buyer only ---
    if operation["buyer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the buyer can initiate payment")

    # --- Status check ---
    status = operation.get("status", "")
    if payment_type == "deposit" and status != "contract_signed":
        raise HTTPException(
            status_code=400,
            detail=f"Deposit payment requires status 'contract_signed', current is '{status}'",
        )
    if payment_type == "final" and status not in ("in_transit", "delivered"):
        raise HTTPException(
            status_code=400,
            detail=f"Final payment requires status 'in_transit' or 'delivered', current is '{status}'",
        )

    # --- Offer & amounts ---
    offer = _get_accepted_offer(operation)
    amount, total_price = _calculate_amounts(offer, payment_type)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Nothing to charge for this payment_type with the current payment_terms")

    stripe_fee, platform_fee, buyer_total, seller_amount = _calculate_fees(amount)

    # --- Seller Stripe account ---
    seller = await db.users.find_one(
        {"user_id": operation["seller_id"]},
        {"stripe_account_id": 1},
    )
    seller_stripe_account = (seller or {}).get("stripe_account_id")
    if not seller_stripe_account:
        raise HTTPException(
            status_code=400,
            detail="Seller has not connected a Stripe account. Please ask the seller to complete Stripe onboarding before proceeding.",
        )

    # --- Create PaymentIntent ---
    buyer_total_cents = int(round(buyer_total * 100))
    platform_fee_cents = int(round(platform_fee * 100))
    currency = offer.get("currency", "EUR").lower()

    try:
        intent = stripe.PaymentIntent.create(
            amount=buyer_total_cents,
            currency=currency,
            capture_method="manual",
            metadata={
                "type": "b2b",
                "operation_id": operation_id,
                "payment_type": payment_type,
                "seller_id": operation["seller_id"],
                "buyer_id": operation["buyer_id"],
                "platform_fee_pct": "3.0",
            },
            transfer_data={
                "destination": seller_stripe_account,
            } if seller_stripe_account else None,
            application_fee_amount=platform_fee_cents if seller_stripe_account else None,
        )
    except stripe.error.StripeError as e:
        logger.error(f"[B2B PAY] Stripe error creating PaymentIntent: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # --- Store payment record ---
    await db.b2b_operations.update_one(
        {"_id": oid},
        {"$push": {"payments": {
            "payment_intent_id": intent.id,
            "payment_type": payment_type,
            "amount": buyer_total,
            "stripe_fee": stripe_fee,
            "platform_fee": platform_fee,
            "seller_amount": seller_amount,
            "currency": offer.get("currency", "EUR"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }}},
    )

    logger.info(f"[B2B PAY] PaymentIntent {intent.id} created for operation {operation_id} ({payment_type})")

    return {
        "client_secret": intent.client_secret,
        "amount": buyer_total,
        "currency": offer.get("currency", "EUR"),
        "payment_intent_id": intent.id,
    }


# ---------------------------------------------------------------------------
# 2. POST /{operation_id}/capture-payment — Capture authorized payment
# ---------------------------------------------------------------------------

@router.post("/{operation_id}/capture-payment")
async def capture_b2b_payment(
    operation_id: str,
    current_user=Depends(get_current_user),
):
    """Capture a previously authorized B2B payment (seller confirms shipment)."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation_id")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    # --- Auth: seller or admin ---
    user_role = getattr(current_user, "role", "")
    if operation["seller_id"] != current_user.user_id and user_role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only the seller or an admin can capture payment")

    # --- Find pending payment ---
    payments = operation.get("payments", [])
    pending_payment = None
    for p in payments:
        if p.get("status") == "pending":
            pending_payment = p
            break

    if not pending_payment:
        raise HTTPException(status_code=400, detail="No pending payment found to capture")

    payment_intent_id = pending_payment["payment_intent_id"]

    # --- Capture via Stripe ---
    try:
        captured = stripe.PaymentIntent.capture(payment_intent_id)
    except stripe.error.StripeError as e:
        logger.error(f"[B2B CAPTURE] Stripe error capturing {payment_intent_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # --- Update payment status ---
    await db.b2b_operations.update_one(
        {"_id": oid, "payments.payment_intent_id": payment_intent_id},
        {"$set": {
            "payments.$.status": "captured",
            "status": "payment_confirmed",
        }},
    )

    logger.info(f"[B2B CAPTURE] PaymentIntent {payment_intent_id} captured for operation {operation_id}")

    return {
        "captured": True,
        "status": captured.status,
    }


# ---------------------------------------------------------------------------
# 3. POST /webhook/stripe-b2b — Stripe webhook for B2B events
# ---------------------------------------------------------------------------

@router.post("/webhook/stripe-b2b")
async def stripe_b2b_webhook(request: Request):
    """Stripe webhook handler for B2B payment events."""
    db = get_db()
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")

    # Determine if we have a real webhook secret
    _real_webhook_secret = (
        STRIPE_WEBHOOK_SECRET
        if (
            STRIPE_WEBHOOK_SECRET
            and STRIPE_WEBHOOK_SECRET.startswith("whsec_")
            and len(STRIPE_WEBHOOK_SECRET) > 32
        )
        else None
    )

    try:
        if _real_webhook_secret:
            event = stripe.Webhook.construct_event(body, signature, _real_webhook_secret)
        else:
            logger.warning("[B2B WEBHOOK] Signature verification skipped — STRIPE_WEBHOOK_SECRET not configured")
            payload = body.decode("utf-8")
            event = _json.loads(payload)

        event_type = event.get("type", "unknown")
        logger.info(f"[B2B WEBHOOK] Event: {event_type}")

        data_object = event.get("data", {}).get("object", {})
        metadata = data_object.get("metadata", {})

        # Only process b2b-typed events
        if metadata.get("type") != "b2b":
            return {"status": "success", "message": "Not a B2B event, ignored"}

        operation_id = metadata.get("operation_id")
        payment_type = metadata.get("payment_type")
        payment_intent_id = data_object.get("id")

        if not operation_id:
            logger.warning("[B2B WEBHOOK] Missing operation_id in metadata")
            return {"status": "success"}

        try:
            oid = ObjectId(operation_id)
        except Exception:
            logger.error(f"[B2B WEBHOOK] Invalid operation_id: {operation_id}")
            return {"status": "success"}

        # --- payment_intent.succeeded ---
        if event_type == "payment_intent.succeeded":
            # Update payment status
            await db.b2b_operations.update_one(
                {"_id": oid, "payments.payment_intent_id": payment_intent_id},
                {"$set": {"payments.$.status": "succeeded"}},
            )

            if payment_type == "deposit":
                await db.b2b_operations.update_one(
                    {"_id": oid},
                    {"$set": {"status": "payment_confirmed"}},
                )
                logger.info(f"[B2B WEBHOOK] Deposit succeeded for operation {operation_id} — status → payment_confirmed")
            elif payment_type == "final":
                await db.b2b_operations.update_one(
                    {"_id": oid},
                    {"$set": {"status": "completed"}},
                )
                logger.info(f"[B2B WEBHOOK] Final payment succeeded for operation {operation_id} — status → completed")

            # TODO: Send notification to buyer/seller

        # --- payment_intent.payment_failed ---
        elif event_type == "payment_intent.payment_failed":
            await db.b2b_operations.update_one(
                {"_id": oid, "payments.payment_intent_id": payment_intent_id},
                {"$set": {"payments.$.status": "failed"}},
            )
            failure_message = data_object.get("last_payment_error", {}).get("message", "Unknown")
            logger.error(f"[B2B WEBHOOK] Payment failed for operation {operation_id}: {failure_message}")

        return {"status": "success"}

    except stripe.error.SignatureVerificationError as e:
        logger.error(f"[B2B WEBHOOK] Signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"[B2B WEBHOOK] Error processing webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# 4. GET /{operation_id}/payment-info — Fee breakdown for frontend
# ---------------------------------------------------------------------------

@router.get("/{operation_id}/payment-info")
async def get_payment_info(
    operation_id: str,
    current_user=Depends(get_current_user),
):
    """Return fee breakdown for the B2B operation (no PaymentIntent created)."""
    db = get_db()

    try:
        oid = ObjectId(operation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation_id")

    operation = await db.b2b_operations.find_one({"_id": oid})
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")

    # Auth: buyer or seller can view
    if current_user.user_id not in (operation.get("buyer_id"), operation.get("seller_id")):
        user_role = getattr(current_user, "role", "")
        if user_role not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Not authorized to view this operation")

    offer = _get_accepted_offer(operation)
    total_price = offer.get("total_price", 0)
    payment_terms = offer.get("payment_terms", "")

    # Calculate deposit & final amounts
    deposit_amount, _ = _calculate_amounts(offer, "deposit")
    final_amount, _ = _calculate_amounts(offer, "final")

    # Fee breakdown based on the next payment due
    # Use deposit if not yet paid, otherwise final
    next_amount = deposit_amount if deposit_amount > 0 else final_amount
    stripe_fee, platform_fee, buyer_total, seller_receives = _calculate_fees(next_amount) if next_amount > 0 else (0, 0, 0, 0)

    return {
        "total_price": round(total_price, 2),
        "payment_terms": payment_terms,
        "deposit_amount": deposit_amount,
        "final_amount": final_amount,
        "stripe_fee": stripe_fee,
        "platform_fee": platform_fee,
        "buyer_total": buyer_total,
        "seller_receives": seller_receives,
        "currency": offer.get("currency", "EUR"),
        "payments": operation.get("payments", []),
    }
