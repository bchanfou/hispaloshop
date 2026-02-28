"""
Influencer routes: Apply, dashboard, codes, commissions, analytics, Stripe, withdrawals.
"""
import uuid
import os
import logging
import stripe
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Query

from core.database import db
from core.auth import get_current_user
from core.models import User, InfluencerApplication, CreateInfluencerCodeInput, WithdrawalRequest

logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://auth-rework.preview.emergentagent.com")

router = APIRouter()

@router.post("/influencer/apply")
async def apply_as_influencer(input: InfluencerApplication):
    """Submit application to become an influencer"""
    email_lower = input.email.lower()
    
    # Check if already an influencer or has pending application
    existing = await db.influencers.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=409, detail="Already registered or has pending application")
    
    existing_app = await db.influencer_applications.find_one({"email": email_lower})
    if existing_app:
        raise HTTPException(status_code=409, detail="Application already pending")
    
    # Create application
    application = {
        "application_id": f"app_{uuid.uuid4().hex[:12]}",
        "name": input.name,
        "email": email_lower,
        "instagram": input.instagram,
        "youtube": input.youtube,
        "twitter": input.twitter,
        "followers": input.followers,
        "niche": input.niche,
        "message": input.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.influencer_applications.insert_one(application)
    
    # Notify admin (optional - create notification)
    admin_notif = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "type": "influencer_application",
        "title": "Nueva solicitud de influencer",
        "message": f"{input.name} ha solicitado ser influencer",
        "link": "/admin/influencers",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notif)
    
    return {"message": "Application submitted successfully"}

@router.get("/influencer/dashboard")
async def get_influencer_dashboard(user: User = Depends(get_current_user)):
    """Get influencer's own dashboard data"""
    # Find influencer by email
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    if influencer.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Your influencer account has been suspended")
    
    # Get their discount code
    discount_code = None
    if influencer.get("discount_code_id"):
        code = await db.discount_codes.find_one({"code_id": influencer["discount_code_id"]}, {"_id": 0})
        if code:
            discount_code = code["code"]
    
    # Get recent commissions with payment info
    recent_commissions = await db.influencer_commissions.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    # Count orders by status
    pending_count = await db.influencer_commissions.count_documents({
        "influencer_id": influencer["influencer_id"],
        "commission_status": "pending"
    })
    paid_count = await db.influencer_commissions.count_documents({
        "influencer_id": influencer["influencer_id"],
        "commission_status": "paid"
    })
    
    # Calculate upcoming payments (commissions that are pending and payment date is approaching)
    now = datetime.now(timezone.utc)
    pending_commissions_list = await db.influencer_commissions.find({
        "influencer_id": influencer["influencer_id"],
        "commission_status": "pending"
    }, {"_id": 0}).to_list(100)
    
    # Group by payment availability
    available_now = 0  # Commissions where 15 days have passed
    available_soon = 0  # Commissions where payment date is within 7 days
    next_payment_date = None
    
    for comm in pending_commissions_list:
        payment_date_str = comm.get("payment_available_date")
        if payment_date_str:
            try:
                payment_date = datetime.fromisoformat(payment_date_str.replace('Z', '+00:00'))
                if payment_date <= now:
                    available_now += comm.get("commission_amount", 0)
                elif payment_date <= now + timedelta(days=7):
                    available_soon += comm.get("commission_amount", 0)
                    if next_payment_date is None or payment_date < next_payment_date:
                        next_payment_date = payment_date
            except:
                pass
    
    return {
        "influencer_id": influencer["influencer_id"],
        "full_name": influencer.get("full_name", "Influencer"),
        "status": influencer.get("status", "pending"),
        "discount_code": discount_code,
        "commission_type": influencer.get("commission_type", "percentage"),
        "commission_value": influencer.get("commission_value", 10),
        "platform_commission": PLATFORM_COMMISSION,  # 0.18 = 18%
        "total_sales_generated": round(influencer.get("total_sales_generated", 0), 2),
        "total_commission_earned": round(influencer.get("total_commission_earned", 0), 2),
        "available_balance": round(influencer.get("available_balance", 0), 2),
        "stripe_connected": influencer.get("stripe_onboarding_complete", False),
        "pending_commissions": pending_count,
        "paid_commissions": paid_count,
        "recent_commissions": recent_commissions,
        # Payment schedule info
        "payment_schedule": {
            "available_to_withdraw": round(available_now, 2),
            "available_soon": round(available_soon, 2),
            "next_payment_date": next_payment_date.isoformat() if next_payment_date else None,
            "payment_terms_days": 15  # Commissions are available 15 days after sale
        }
    }


@router.post("/influencer/create-code")
async def create_influencer_discount_code(input: CreateInfluencerCodeInput, user: User = Depends(get_current_user)):
    """Create personalized discount code for influencer (requires admin approval)"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres influencer registrado")
    
    # Check if influencer is approved
    if influencer.get("status") != "active":
        raise HTTPException(status_code=403, detail="Tu cuenta debe ser aprobada por un administrador antes de crear tu código")
    
    # Check if already has a code
    if influencer.get("discount_code_id"):
        raise HTTPException(status_code=400, detail="Ya tienes un código de descuento creado")
    
    # Validate code format (alphanumeric, 3-20 chars)
    code = input.code.strip().upper()
    if not code or len(code) < 3 or len(code) > 20:
        raise HTTPException(status_code=400, detail="El código debe tener entre 3 y 20 caracteres")
    
    import re
    if not re.match(r'^[A-Z0-9]+$', code):
        raise HTTPException(status_code=400, detail="El código solo puede contener letras y números")
    
    # Check if code already exists in system
    existing = await db.discount_codes.find_one({"code": code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Este código ya está en uso. Elige otro.")
    
    # Create the discount code
    code_id = f"code_{uuid.uuid4().hex[:12]}"
    discount_code = {
        "code_id": code_id,
        "code": code,
        "type": "percentage",
        "value": 10,  # 10% discount for customers
        "active": True,
        "description": f"Código de influencer {influencer['full_name']}",
        "min_cart_amount": None,
        "usage_limit": None,  # Unlimited uses
        "usage_count": 0,
        "applicable_products": [],
        "start_date": None,
        "end_date": None,
        "is_influencer_code": True,
        "influencer_id": influencer["influencer_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discount_codes.insert_one(discount_code)
    
    # Update influencer with the code
    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {"discount_code_id": code_id}}
    )
    
    return {
        "success": True,
        "code": code,
        "message": f"¡Código {code} creado! Tus seguidores recibirán 10% de descuento."
    }

@router.get("/influencer/commissions")
async def get_my_commissions(user: User = Depends(get_current_user)):
    """Get influencer's commission history"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    commissions = await db.influencer_commissions.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return commissions

@router.get("/influencer/analytics")
async def get_influencer_analytics(user: User = Depends(get_current_user), days: int = 30):
    """Get influencer analytics: clicks, conversions, commissions over time"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    from datetime import timedelta
    
    # Get date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Get discount code
    discount_code = None
    if influencer.get("discount_code_id"):
        discount_code = await db.discount_codes.find_one(
            {"code_id": influencer["discount_code_id"]},
            {"_id": 0}
        )
    
    # Get all orders with this influencer's code
    orders_with_code = []
    if discount_code:
        orders_with_code = await db.orders.find({
            "discount_code": discount_code["code"],
            "created_at": {"$gte": start_date.isoformat()}
        }, {"_id": 0, "order_id": 1, "total_amount": 1, "created_at": 1, "discount_amount": 1}).to_list(1000)
    
    # Get commissions in date range
    commissions = await db.influencer_commissions.find({
        "influencer_id": influencer["influencer_id"],
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Get link clicks (tracked separately from code uses)
    link_clicks = await db.influencer_link_clicks.find({
        "influencer_id": influencer["influencer_id"],
        "clicked_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get code usage stats (clicks tracked when code is applied to cart)
    code_uses = await db.cart_discounts.find({
        "code": discount_code["code"] if discount_code else None,
        "applied_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000) if discount_code else []
    
    # Generate daily data
    daily_data = {}
    current = start_date
    while current <= end_date:
        date_key = current.strftime("%Y-%m-%d")
        daily_data[date_key] = {
            "date": date_key,
            "link_clicks": 0,  # Link clicks (visits to referral link)
            "code_uses": 0,  # Code applications (code entered at checkout)
            "conversions": 0,  # Completed orders
            "revenue": 0,  # Total order value
            "commission": 0  # Commission earned
        }
        current += timedelta(days=1)
    
    # Aggregate link clicks
    for click in link_clicks:
        try:
            date_key = click.get("clicked_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["link_clicks"] += 1
        except:
            pass
    
    # Aggregate code uses
    for use in code_uses:
        try:
            date_key = use.get("applied_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["code_uses"] += 1
        except:
            pass
    
    # Aggregate orders (conversions)
    for order in orders_with_code:
        try:
            date_key = order.get("created_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["conversions"] += 1
                daily_data[date_key]["revenue"] += order.get("total_amount", 0)
        except:
            pass
    
    # Aggregate commissions
    for comm in commissions:
        try:
            date_key = comm.get("created_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["commission"] += comm.get("commission_amount", 0)
        except:
            pass
    
    chart_data = sorted(daily_data.values(), key=lambda x: x["date"])
    
    # Calculate totals
    total_link_clicks = sum(d["link_clicks"] for d in chart_data)
    total_code_uses = sum(d["code_uses"] for d in chart_data)
    total_conversions = sum(d["conversions"] for d in chart_data)
    total_revenue = sum(d["revenue"] for d in chart_data)
    total_commission = sum(d["commission"] for d in chart_data)
    
    # Conversion rate: from link clicks to orders
    click_to_order_rate = (total_conversions / total_link_clicks * 100) if total_link_clicks > 0 else 0
    # Code to order rate: from code uses to orders  
    code_to_order_rate = (total_conversions / total_code_uses * 100) if total_code_uses > 0 else 0
    
    # Get all-time stats
    all_time_orders = await db.orders.count_documents({
        "discount_code": discount_code["code"]
    }) if discount_code else 0
    
    all_time_link_clicks = await db.influencer_link_clicks.count_documents({
        "influencer_id": influencer["influencer_id"]
    })
    
    # Referral link for influencer
    referral_code = discount_code["code"] if discount_code else None
    
    return {
        "chart_data": chart_data,
        "summary": {
            "total_link_clicks": total_link_clicks,
            "total_code_uses": total_code_uses,
            "total_conversions": total_conversions,
            "total_revenue": round(total_revenue, 2),
            "total_commission": round(total_commission, 2),
            "click_to_order_rate": round(click_to_order_rate, 1),
            "code_to_order_rate": round(code_to_order_rate, 1),
            "all_time_orders": all_time_orders,
            "all_time_link_clicks": all_time_link_clicks,
            "code_usage_count": discount_code.get("usage_count", 0) if discount_code else 0
        },
        "discount_code": referral_code,
        "referral_link": f"/r/{referral_code}" if referral_code else None,
        "period_days": days
    }

# Referral link click tracking
@router.get("/r/{code}")
async def track_referral_click(code: str, request: Request):
    """
    Track click on influencer referral link and redirect to homepage.
    This allows influencers to share a link like hispaloshop.com/r/MYCODE
    """
    # Find the discount code
    discount_code = await db.discount_codes.find_one(
        {"code": code.upper()},
        {"_id": 0}
    )
    
    if not discount_code:
        # Code not found - still redirect to homepage
        return RedirectResponse(url="/", status_code=302)
    
    # Check if it's an influencer code
    influencer_id = discount_code.get("influencer_id")
    
    if influencer_id:
        # Record the click
        click_record = {
            "click_id": f"click_{uuid.uuid4().hex[:12]}",
            "influencer_id": influencer_id,
            "code": code.upper(),
            "clicked_at": datetime.now(timezone.utc).isoformat(),
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
            "ip_hash": str(hash(request.client.host))[:8] if request.client else ""  # Hashed for privacy
        }
        await db.influencer_link_clicks.insert_one(click_record)
        
        logger.info(f"[REFERRAL] Click tracked for code {code.upper()}, influencer {influencer_id}")
    
    # Redirect to homepage with the code pre-applied (stored in session/cookie)
    response = RedirectResponse(url=f"/?ref={code.upper()}", status_code=302)
    # Set a cookie with the referral code (expires in 7 days)
    response.set_cookie(
        key="referral_code",
        value=code.upper(),
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=False,  # Allow JS to read it for UI purposes
        samesite="lax"
    )
    
    return response

# =====================================================
# PHASE 4: STRIPE CONNECT FOR INFLUENCERS
# =====================================================

@router.post("/influencer/stripe/connect")
async def connect_influencer_stripe(request: Request, user: User = Depends(get_current_user)):
    """Start Stripe Connect onboarding for influencer"""
    influencer = await db.influencers.find_one({"email": user.email.lower()})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    origin = request.headers.get('origin', str(request.base_url).rstrip('/'))
    
    # Check if already has Stripe account
    if influencer.get("stripe_account_id"):
        try:
            account_link = stripe.AccountLink.create(
                account=influencer["stripe_account_id"],
                refresh_url=f"{origin}/influencer?stripe_refresh=true",
                return_url=f"{origin}/influencer?stripe_return=true",
                type="account_onboarding",
            )
            return {"url": account_link.url, "account_id": influencer["stripe_account_id"]}
        except Exception as e:
            logger.error(f"Error creating account link: {e}")
    
    # Create new Stripe Connect Express account
    try:
        account = stripe.Account.create(
            type="express",
            country="ES",
            email=influencer["email"],
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={
                "influencer_id": influencer["influencer_id"],
                "type": "influencer"
            }
        )
        
        # Update influencer with Stripe account ID
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "stripe_account_id": account.id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create account link for onboarding
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{origin}/influencer?stripe_refresh=true",
            return_url=f"{origin}/influencer?stripe_return=true",
            type="account_onboarding",
        )
        
        return {"url": account_link.url, "account_id": account.id}
        
    except Exception as e:
        logger.error(f"Error creating Stripe Connect account for influencer: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Stripe Connect account")

@router.get("/influencer/stripe/status")
async def get_influencer_stripe_status(user: User = Depends(get_current_user)):
    """Check Stripe Connect status for influencer"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    stripe_account_id = influencer.get("stripe_account_id")
    
    if not stripe_account_id:
        return {
            "connected": False,
            "stripe_account_id": None,
            "payouts_enabled": False,
            "charges_enabled": False
        }
    
    try:
        account = stripe.Account.retrieve(stripe_account_id)
        
        # Update onboarding status if completed
        if account.details_submitted and not influencer.get("stripe_onboarding_complete"):
            await db.influencers.update_one(
                {"influencer_id": influencer["influencer_id"]},
                {"$set": {"stripe_onboarding_complete": True}}
            )
        
        return {
            "connected": True,
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": account.payouts_enabled,
            "charges_enabled": account.charges_enabled,
            "details_submitted": account.details_submitted,
            "onboarding_complete": account.details_submitted
        }
    except Exception as e:
        logger.error(f"Error retrieving Stripe account: {e}")
        # Fall back to database flag if Stripe API fails
        # This allows testing without real Stripe accounts
        onboarding_complete = influencer.get("stripe_onboarding_complete", False)
        return {
            "connected": onboarding_complete,
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": onboarding_complete,
            "charges_enabled": onboarding_complete,
            "onboarding_complete": onboarding_complete,
            "error": "Failed to retrieve account status from Stripe API"
        }

@router.post("/admin/influencers/{influencer_id}/payout")
async def process_influencer_payout(influencer_id: str, user: User = Depends(get_current_user)):
    """Process payout to influencer (Admin only)"""
    await require_role(user, ["admin"])
    
    influencer = await db.influencers.find_one({"influencer_id": influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    if influencer.get("status") != "active":
        raise HTTPException(status_code=400, detail="Cannot payout to inactive influencer")
    
    if not influencer.get("stripe_account_id"):
        raise HTTPException(status_code=400, detail="Influencer has not connected Stripe")
    
    if not influencer.get("stripe_onboarding_complete"):
        raise HTTPException(status_code=400, detail="Influencer has not completed Stripe onboarding")
    
    available_balance = influencer.get("available_balance", 0)
    if available_balance < 1:  # Minimum €1 payout
        raise HTTPException(status_code=400, detail="Minimum payout amount is €1")
    
    try:
        # Create transfer to influencer's Stripe account
        transfer = stripe.Transfer.create(
            amount=int(available_balance * 100),  # Convert to cents
            currency="eur",
            destination=influencer["stripe_account_id"],
            metadata={
                "influencer_id": influencer_id,
                "type": "influencer_commission_payout"
            }
        )
        
        # Update influencer balance
        await db.influencers.update_one(
            {"influencer_id": influencer_id},
            {"$set": {
                "available_balance": 0,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update all pending commissions to paid
        await db.influencer_commissions.update_many(
            {"influencer_id": influencer_id, "commission_status": "pending"},
            {"$set": {
                "commission_status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "stripe_transfer_id": transfer.id
            }}
        )
        
        return {
            "message": f"Payout of €{available_balance:.2f} processed successfully",
            "transfer_id": transfer.id,
            "amount": available_balance
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error processing payout: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process payout: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing payout: {e}")
        raise HTTPException(status_code=500, detail="Failed to process payout")

# Influencer self-service withdrawal
MINIMUM_WITHDRAWAL_AMOUNT = 50  # €50 minimum for self-service withdrawal


@router.post("/influencer/request-withdrawal")
async def request_influencer_withdrawal(request: WithdrawalRequest, user: User = Depends(get_current_user)):
    """Influencer requests withdrawal of their available balance"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")
    
    if influencer.get("status") != "active":
        raise HTTPException(status_code=400, detail="Tu cuenta debe estar activa para solicitar retiros")
    
    if not influencer.get("stripe_account_id"):
        raise HTTPException(status_code=400, detail="Debes conectar tu cuenta de Stripe primero")
    
    if not influencer.get("stripe_onboarding_complete"):
        raise HTTPException(status_code=400, detail="Debes completar la configuración de Stripe")
    
    # Calculate available balance (only commissions where 15 days have passed)
    now = datetime.now(timezone.utc)
    available_commissions = await db.influencer_commissions.find({
        "influencer_id": influencer["influencer_id"],
        "commission_status": "pending"
    }, {"_id": 0}).to_list(1000)
    
    available_balance = 0
    eligible_commission_ids = []
    
    for comm in available_commissions:
        payment_date_str = comm.get("payment_available_date")
        if payment_date_str:
            try:
                payment_date = datetime.fromisoformat(payment_date_str.replace('Z', '+00:00'))
                if payment_date <= now:
                    available_balance += comm.get("commission_amount", 0)
                    eligible_commission_ids.append(comm["commission_id"])
            except:
                pass
    
    available_balance = round(available_balance, 2)
    
    # Determine withdrawal amount
    withdrawal_amount = request.amount if request.amount else available_balance
    withdrawal_amount = min(withdrawal_amount, available_balance)  # Can't withdraw more than available
    
    if withdrawal_amount < MINIMUM_WITHDRAWAL_AMOUNT:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto mínimo de retiro es €{MINIMUM_WITHDRAWAL_AMOUNT}. Tu saldo disponible es €{available_balance:.2f}"
        )
    
    try:
        # Create transfer to influencer's Stripe account
        transfer = stripe.Transfer.create(
            amount=int(withdrawal_amount * 100),  # Convert to cents
            currency="eur",
            destination=influencer["stripe_account_id"],
            metadata={
                "influencer_id": influencer["influencer_id"],
                "type": "influencer_self_withdrawal",
                "requested_by": user.email
            }
        )
        
        # Create withdrawal record
        withdrawal_record = {
            "withdrawal_id": f"wd_{uuid.uuid4().hex[:12]}",
            "influencer_id": influencer["influencer_id"],
            "amount": withdrawal_amount,
            "stripe_transfer_id": transfer.id,
            "status": "completed",
            "created_at": now.isoformat(),
            "completed_at": now.isoformat()
        }
        await db.influencer_withdrawals.insert_one(withdrawal_record)
        
        # Update commissions to paid (proportionally if partial withdrawal)
        if withdrawal_amount >= available_balance:
            # Full withdrawal - mark all eligible as paid
            await db.influencer_commissions.update_many(
                {"commission_id": {"$in": eligible_commission_ids}},
                {"$set": {
                    "commission_status": "paid",
                    "paid_at": now.isoformat(),
                    "stripe_transfer_id": transfer.id
                }}
            )
        else:
            # Partial withdrawal - mark commissions as paid until we reach the amount
            remaining = withdrawal_amount
            for comm in available_commissions:
                if comm["commission_id"] in eligible_commission_ids and remaining > 0:
                    comm_amount = comm.get("commission_amount", 0)
                    if comm_amount <= remaining:
                        await db.influencer_commissions.update_one(
                            {"commission_id": comm["commission_id"]},
                            {"$set": {
                                "commission_status": "paid",
                                "paid_at": now.isoformat(),
                                "stripe_transfer_id": transfer.id
                            }}
                        )
                        remaining -= comm_amount
        
        # Update influencer's available_balance
        new_balance = max(0, influencer.get("available_balance", 0) - withdrawal_amount)
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "available_balance": round(new_balance, 2),
                "updated_at": now.isoformat()
            }}
        )
        
        return {
            "message": f"¡Retiro de €{withdrawal_amount:.2f} procesado exitosamente!",
            "withdrawal_id": withdrawal_record["withdrawal_id"],
            "transfer_id": transfer.id,
            "amount": withdrawal_amount,
            "new_balance": round(new_balance, 2)
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error processing influencer withdrawal: {e}")
        raise HTTPException(status_code=500, detail=f"Error de Stripe: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing influencer withdrawal: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el retiro")

@router.get("/influencer/withdrawals")
async def get_influencer_withdrawals(user: User = Depends(get_current_user)):
    """Get influencer's withdrawal history"""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")
    
    withdrawals = await db.influencer_withdrawals.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "withdrawals": withdrawals,
        "minimum_amount": MINIMUM_WITHDRAWAL_AMOUNT
    }

@router.post("/influencer/check-withdrawal-notification")
async def trigger_withdrawal_notification_check(user: User = Depends(get_current_user)):
    """
    Manually trigger check for withdrawal notification.
    Called when influencer visits dashboard to ensure they get notified.
    """
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")
    
    await check_and_notify_influencer_withdrawal_available(influencer["influencer_id"], db)
    
    return {"message": "Notification check completed"}

# ============================================
# DISCOUNT CODE APPLICATION (CART)
# ============================================

