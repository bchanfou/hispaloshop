"""
Influencer routes: dashboard, commissions, Stripe Connect.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import stripe

from ..core.config import db, STRIPE_SECRET_KEY, FRONTEND_URL, logger
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter(tags=["Influencers"])


class InfluencerCreateInput(BaseModel):
    name: str
    email: EmailStr
    discount_code: str
    commission_type: str = "percentage"
    commission_value: float


# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


@router.get("/influencer/dashboard")
async def get_influencer_dashboard(user: User = Depends(get_current_user)):
    """Get influencer dashboard data."""
    influencer = await db.influencers.find_one(
        {"email": user.email, "status": "active"},
        {"_id": 0}
    )
    
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer account not found")
    
    # Get recent commissions
    commissions = await db.influencer_commissions.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Calculate stats
    total_earned = sum(c.get("commission_amount", 0) for c in commissions if c.get("status") == "paid")
    pending = sum(c.get("commission_amount", 0) for c in commissions if c.get("status") == "pending")
    
    return {
        "influencer": influencer,
        "stats": {
            "total_earned": round(total_earned, 2),
            "pending_amount": round(pending, 2),
            "total_orders": influencer.get("total_orders", 0),
            "total_sales": influencer.get("total_sales", 0)
        },
        "recent_commissions": commissions[:10]
    }


@router.get("/influencer/commissions")
async def get_influencer_commissions(
    status: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get influencer commissions."""
    influencer = await db.influencers.find_one(
        {"email": user.email},
        {"_id": 0}
    )
    
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer account not found")
    
    query = {"influencer_id": influencer["influencer_id"]}
    if status:
        query["status"] = status
    
    commissions = await db.influencer_commissions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return commissions


@router.post("/influencer/stripe/connect")
async def create_stripe_connect(user: User = Depends(get_current_user)):
    """Create Stripe Connect account for influencer."""
    influencer = await db.influencers.find_one(
        {"email": user.email},
        {"_id": 0}
    )
    
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer account not found")
    
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        # Check if already has Stripe account
        if influencer.get("stripe_account_id"):
            # Create new login link
            account_link = stripe.AccountLink.create(
                account=influencer["stripe_account_id"],
                refresh_url=f"{FRONTEND_URL}/influencer/stripe-refresh",
                return_url=f"{FRONTEND_URL}/influencer/stripe-complete",
                type="account_onboarding"
            )
            return {"url": account_link.url}
        
        # Create new Stripe Connect account
        account = stripe.Account.create(
            type="express",
            email=influencer["email"],
            capabilities={
                "transfers": {"requested": True}
            },
            metadata={
                "influencer_id": influencer["influencer_id"]
            }
        )
        
        # Save Stripe account ID
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {"stripe_account_id": account.id}}
        )
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{FRONTEND_URL}/influencer/stripe-refresh",
            return_url=f"{FRONTEND_URL}/influencer/stripe-complete",
            type="account_onboarding"
        )
        
        return {"url": account_link.url, "account_id": account.id}
        
    except stripe.error.StripeError as e:
        logger.error(f"[STRIPE CONNECT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/influencer/stripe/status")
async def get_stripe_status(user: User = Depends(get_current_user)):
    """Get Stripe Connect status for influencer."""
    influencer = await db.influencers.find_one(
        {"email": user.email},
        {"_id": 0}
    )
    
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer account not found")
    
    if not influencer.get("stripe_account_id"):
        return {"connected": False, "onboarding_complete": False}
    
    if not STRIPE_SECRET_KEY:
        return {"connected": True, "onboarding_complete": influencer.get("stripe_onboarding_complete", False)}
    
    try:
        account = stripe.Account.retrieve(influencer["stripe_account_id"])
        
        onboarding_complete = (
            account.charges_enabled and
            account.payouts_enabled and
            account.details_submitted
        )
        
        # Update DB if status changed
        if onboarding_complete != influencer.get("stripe_onboarding_complete"):
            await db.influencers.update_one(
                {"influencer_id": influencer["influencer_id"]},
                {"$set": {"stripe_onboarding_complete": onboarding_complete}}
            )
        
        return {
            "connected": True,
            "onboarding_complete": onboarding_complete,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"[STRIPE STATUS] Error: {e}")
        return {"connected": True, "onboarding_complete": False, "error": str(e)}


# Admin routes for influencer management
@router.get("/admin/influencers")
async def get_all_influencers(user: User = Depends(get_current_user)):
    """Get all influencers (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    influencers = await db.influencers.find({}, {"_id": 0}).to_list(100)
    return influencers


@router.post("/admin/influencers")
async def create_influencer(
    input: InfluencerCreateInput,
    user: User = Depends(get_current_user)
):
    """Create a new influencer (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if code exists
    existing = await db.influencers.find_one({"discount_code": input.discount_code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already in use")
    
    influencer_id = f"inf_{uuid.uuid4().hex[:12]}"
    
    influencer = {
        "influencer_id": influencer_id,
        "name": input.name,
        "email": input.email,
        "discount_code": input.discount_code.upper(),
        "commission_type": input.commission_type,
        "commission_value": input.commission_value,
        "status": "active",
        "total_orders": 0,
        "total_sales": 0,
        "total_commission": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create matching discount code
    discount_code = {
        "code_id": f"dc_{uuid.uuid4().hex[:12]}",
        "code": input.discount_code.upper(),
        "type": "percentage",
        "value": 10,  # Default customer discount
        "active": True,
        "influencer_id": influencer_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.influencers.insert_one(influencer)
    await db.discount_codes.insert_one(discount_code)
    
    influencer.pop("_id", None)
    return influencer


@router.post("/admin/influencers/{influencer_id}/payout")
async def process_influencer_payout(
    influencer_id: str,
    user: User = Depends(get_current_user)
):
    """Process payout for influencer (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    influencer = await db.influencers.find_one(
        {"influencer_id": influencer_id},
        {"_id": 0}
    )
    
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    # Get pending commissions
    pending = await db.influencer_commissions.find(
        {"influencer_id": influencer_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    if not pending:
        return {"message": "No pending commissions"}
    
    total_payout = sum(c.get("commission_amount", 0) for c in pending)
    
    # If Stripe Connect is set up, process transfer
    if influencer.get("stripe_account_id") and influencer.get("stripe_onboarding_complete"):
        try:
            transfer = stripe.Transfer.create(
                amount=int(total_payout * 100),  # Convert to cents
                currency="eur",
                destination=influencer["stripe_account_id"],
                metadata={"influencer_id": influencer_id}
            )
            
            # Mark commissions as paid
            await db.influencer_commissions.update_many(
                {"influencer_id": influencer_id, "status": "pending"},
                {"$set": {
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "stripe_transfer_id": transfer.id
                }}
            )
            
            return {
                "message": "Payout processed",
                "amount": total_payout,
                "transfer_id": transfer.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"[PAYOUT] Stripe error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    else:
        return {
            "message": "Manual payout required - Stripe Connect not set up",
            "amount": total_payout,
            "commissions": len(pending)
        }
