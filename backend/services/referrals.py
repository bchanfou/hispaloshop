import logging
from datetime import datetime, timedelta, timezone


logger = logging.getLogger(__name__)

ATTRIBUTION_LOCK_MONTHS = 18


async def check_influencer_attribution(db, customer_id: str, influencer_code: str) -> dict:
    """
    Check if a customer can use an influencer code.
    The active runtime stores attribution on the user document.
    """
    customer = await db.users.find_one(
        {"user_id": customer_id},
        {"_id": 0, "referred_by": 1, "referral_code": 1, "referral_expires_at": 1},
    )

    if customer and customer.get("referred_by"):
        expiry = customer.get("referral_expires_at", "")
        expiry_dt = None
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            except ValueError:
                expiry_dt = None

        if expiry_dt and expiry_dt > datetime.now(timezone.utc):
            if str(customer.get("referral_code", "")).upper() == influencer_code.upper():
                return {"allowed": True, "influencer_id": customer["referred_by"], "existing": True}

            return {
                "allowed": False,
                "error": "Ya tienes un codigo de referido activo. No puedes usar otro hasta que expire.",
                "locked_until": expiry,
            }

        await db.users.update_one(
            {"user_id": customer_id},
            {"$unset": {"referred_by": "", "referral_code": "", "referral_expires_at": ""}},
        )

    discount = await db.discount_codes.find_one(
        {"code": influencer_code.upper(), "influencer_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "influencer_id": 1, "code": 1},
    )
    if not discount:
        return {"allowed": False, "error": "Codigo de descuento no valido"}

    return {"allowed": True, "influencer_id": discount["influencer_id"], "code": discount["code"], "existing": False}


async def create_attribution(db, customer_id: str, influencer_id: str, code_used: str):
    """Create or update a user-level referral attribution (18 month lock)."""
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=ATTRIBUTION_LOCK_MONTHS * 30)

    await db.users.update_one(
        {"user_id": customer_id},
        {
            "$set": {
                "referred_by": influencer_id,
                "referral_code": code_used.upper(),
                "referral_expires_at": expiry.isoformat(),
            }
        },
    )
    logger.info(f"[ATTRIBUTION] Customer {customer_id} -> Influencer {influencer_id} (18 months)")
