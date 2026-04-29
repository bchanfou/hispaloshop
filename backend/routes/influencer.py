"""
Influencer routes: Apply, dashboard, codes, commissions, analytics, Stripe, withdrawals.
"""
import asyncio
import uuid
from decimal import Decimal
import os
import logging
import stripe
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import RedirectResponse

from core.database import db
from core.auth import get_current_user, require_role
from core.config import PLATFORM_COMMISSION, settings, STRIPE_SECRET_KEY
from core.models import User, InfluencerApplication, CreateInfluencerCodeInput, WithdrawalRequest
from config import normalize_influencer_tier, settings as legacy_settings
from routes.orders import check_and_notify_influencer_withdrawal_available

logger = logging.getLogger(__name__)

stripe.api_key = STRIPE_SECRET_KEY
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.hispaloshop.com")

router = APIRouter()


def _stripe_ready() -> bool:
    key = STRIPE_SECRET_KEY or ""
    return key.startswith(("sk_test_", "sk_live_"))


def _ensure_stripe_ready() -> None:
    if not _stripe_ready():
        raise HTTPException(status_code=503, detail="Stripe no esta configurado")

@router.post("/influencer/apply")
@router.post("/influencers/apply")
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
    desired_tier = (input.desired_tier or "hercules").strip().lower()
    review_mode = "instant" if desired_tier == "hercules" else "manual_review"
    normalized_instagram = input.instagram_handle or input.instagram
    normalized_followers = input.follower_range or input.followers
    normalized_niches = input.niches or ([input.niche] if input.niche else [])

    application = {
        "application_id": f"app_{uuid.uuid4().hex[:12]}",
        "name": input.artist_name or input.name,
        "email": email_lower,
        "instagram": normalized_instagram,
        "instagram_handle": normalized_instagram,
        "youtube": input.youtube,
        "twitter": input.twitter,
        "followers": normalized_followers,
        "follower_range": input.follower_range,
        "niche": input.niche or ", ".join(normalized_niches),
        "niches": normalized_niches,
        "message": input.message,
        "phone": input.phone,
        "residence_country": input.residence_country,
        "residence_city": input.residence_city,
        "age_range": input.age_range,
        "audience_country": input.audience_country,
        "best_content_url": input.best_content_url,
        "desired_tier": desired_tier,
        "review_mode": review_mode,
        "tracking_months": 18,
        "commission_tiers": {"hercules": 3, "atenea": 5, "zeus": 7},
        "agreements": input.agreements or {},
        "referred_by": input.referred_by,
        "application_source": input.application_source or "influencer_landing",
        "requested_path": input.requested_path,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.influencer_applications.insert_one(application)
    
    # Notify admins about new application
    try:
        admins = await db.users.find({"role": {"$in": ["admin", "super_admin"]}}, {"user_id": 1}).to_list(20)
        now = datetime.now(timezone.utc)
        for admin in admins:
            await db.notifications.insert_one({
                "user_id": admin["user_id"],
                "type": "system",
                "title": "Nueva solicitud de influencer",
                "body": f"{input.artist_name or input.name} ha solicitado ser influencer ({desired_tier})",
                "action_url": "/admin/influencers",
                "data": {},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
    except Exception:
        pass  # non-critical
    
    return {
        "message": "Application submitted successfully",
        "desired_tier": desired_tier,
        "review_mode": review_mode,
        "tracking_months": 18,
    }

async def _get_in_transit_amount(influencer_id: str) -> float:
    """Sum of withdrawals currently in transit (pending_bank_transfer) for this influencer."""
    in_transit = await db.influencer_withdrawals.aggregate([
        {"$match": {"influencer_id": influencer_id, "status": "pending_bank_transfer"}},
        {"$group": {"_id": None, "total": {"$sum": "$net_amount"}}}
    ]).to_list(1)
    return round(in_transit[0]["total"], 2) if in_transit else 0


@router.get("/influencer/dashboard")
async def get_influencer_dashboard(user: User = Depends(get_current_user)):
    """Get influencer's own dashboard data"""
    # Find influencer by email
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="You are not registered as an influencer")
    
    if influencer.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Your influencer account has been suspended")

    current_tier = normalize_influencer_tier(influencer.get("current_tier", "hercules"), influencer.get("commission_rate"))
    commission_rate = float(influencer.get("commission_rate", 0.03) or 0.03)
    commission_value = int(round(commission_rate * 100))
    
    # Get their discount code
    discount_code = None
    discount_code_active = False
    discount_code_approval_status = None
    if influencer.get("discount_code_id"):
        code = await db.discount_codes.find_one({"code_id": influencer["discount_code_id"]}, {"_id": 0})
        if code:
            discount_code = code["code"]
            discount_code_active = code.get("active", False)
            discount_code_approval_status = code.get("approval_status", "approved" if code.get("active") else "pending")
    
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
            except (ValueError, TypeError, KeyError):
                pass
    
    return {
        "influencer_id": influencer["influencer_id"],
        "full_name": influencer.get("full_name", "Influencer"),
        "status": influencer.get("status", "pending"),
        "discount_code": discount_code,
        "discount_code_active": discount_code_active,
        "discount_code_approval_status": discount_code_approval_status,
        "current_tier": current_tier,
        "commission_type": "percentage",
        "commission_rate": commission_rate,
        "commission_value": commission_value,
        "platform_commission": PLATFORM_COMMISSION,  # 0.18 = 18%
        "total_sales_generated": round(influencer.get("total_sales_generated", 0), 2),
        "total_commission_earned": round(influencer.get("total_commission_earned", 0), 2),
        "available_balance": max(0, round(influencer.get("available_balance", 0), 2)),
        "stripe_connected": influencer.get("stripe_onboarding_complete", False),
        "pending_commissions": pending_count,
        "paid_commissions": paid_count,
        "recent_commissions": recent_commissions,
        # Payment schedule info
        "payment_schedule": {
            "available_to_withdraw": round(available_now, 2),
            "available_soon": round(available_soon, 2),
            "in_transit": await _get_in_transit_amount(influencer["influencer_id"]),
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
    
    # Platform rule: influencer codes always offer 10% first-purchase discount.
    # The influencer's requested value is ignored — rate is fixed at platform level.
    # This keeps the buyer's discount in sync with what calculate_order_split
    # absorbs internally (FIRST_PURCHASE_DISCOUNT_PCT = 10).
    discount_pct = 10

    # Create the discount code (inactive until admin approves)
    code_id = f"code_{uuid.uuid4().hex[:12]}"
    discount_code = {
        "code_id": code_id,
        "code": code,
        "type": "percentage",
        "value": discount_pct,
        "active": False,  # Activated only after admin approval
        "approval_status": "pending",  # pending | approved | rejected
        "description": f"Código de influencer {influencer['full_name']}",
        "min_cart_amount": None,
        "usage_limit": None,  # Unlimited uses
        "usage_count": 0,
        "applicable_products": [],
        "start_date": None,
        "end_date": None,
        "is_influencer_code": True,
        "first_purchase_only": True,  # Platform enforces first-purchase only for influencer codes
        "influencer_id": influencer["influencer_id"],
        "creator_id": user.user_id,
        "influencer_name": influencer.get("full_name", ""),
        "influencer_handle": influencer.get("social_handle", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discount_codes.insert_one(discount_code)

    # Update influencer with the code
    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {"discount_code_id": code_id}}
    )

    # Notify admins
    try:
        admins = await db.users.find({"role": {"$in": ["admin", "super_admin"]}}, {"user_id": 1}).to_list(20)
        now = datetime.now(timezone.utc)
        for admin in admins:
            await db.notifications.insert_one({
                "user_id": admin["user_id"],
                "type": "system",
                "title": "Código de descuento pendiente",
                "body": f"El influencer {influencer['full_name']} ha creado el código {code} — requiere aprobación",
                "action_url": "/admin/influencers",
                "data": {"influencer_id": influencer["influencer_id"], "code_id": code_id},
                "channels": ["in_app"],
                "status_by_channel": {"in_app": "sent"},
                "read_at": None,
                "created_at": now,
                "sent_at": now,
            })
    except Exception:
        pass  # non-critical

    return {
        "success": True,
        "code": code,
        "approval_status": "pending",
        "message": f"¡Código {code} solicitado! El equipo de Hispaloshop lo revisará en menos de 24h."
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
    }, {"_id": 0}).to_list(2000)

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
        except (ValueError, TypeError, KeyError):
            pass
    
    # Aggregate code uses
    for use in code_uses:
        try:
            date_key = use.get("applied_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["code_uses"] += 1
        except (ValueError, TypeError, KeyError):
            pass
    
    # Aggregate orders (conversions)
    for order in orders_with_code:
        try:
            date_key = order.get("created_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["conversions"] += 1
                daily_data[date_key]["revenue"] += order.get("total_amount", 0)
        except (ValueError, TypeError, KeyError):
            pass
    
    # Aggregate commissions
    for comm in commissions:
        try:
            date_key = comm.get("created_at", "")[:10]
            if date_key in daily_data:
                daily_data[date_key]["commission"] += comm.get("commission_amount", 0)
        except (ValueError, TypeError, KeyError):
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
    
    # Geographic breakdown (from orders with shipping_address)
    geography = {}
    if discount_code:
        geo_orders = await db.orders.find(
            {"discount_code": discount_code["code"], "created_at": {"$gte": start_date.isoformat()}},
            {"_id": 0, "shipping_address.country": 1},
        ).to_list(1000)
        for o in geo_orders:
            country_code = (o.get("shipping_address") or {}).get("country", "")
            if country_code:
                geography[country_code] = geography.get(country_code, 0) + 1
    geo_total = sum(geography.values()) or 1
    customer_geography = sorted(
        [{"country": k, "count": v, "pct": round(v / geo_total * 100)} for k, v in geography.items()],
        key=lambda x: x["count"], reverse=True,
    )

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
        "customer_geography": customer_geography,
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
        max_age=legacy_settings.AFFILIATE_ATTRIBUTION_DAYS * 24 * 60 * 60,
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
    _ensure_stripe_ready()
    
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

    if not _stripe_ready():
        onboarding_complete = influencer.get("stripe_onboarding_complete", False)
        return {
            "connected": onboarding_complete,
            "stripe_account_id": stripe_account_id,
            "payouts_enabled": onboarding_complete,
            "charges_enabled": onboarding_complete,
            "onboarding_complete": onboarding_complete,
            "status": "not_configured",
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
    _ensure_stripe_ready()
    
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
    
    amount_cents = int(round(available_balance * 100))
    destination = influencer["stripe_account_id"]
    backoff_seconds = [1, 4, 16]
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency=PAYOUT_CURRENCY,
                destination=destination,
                metadata={
                    "influencer_id": influencer_id,
                    "type": "influencer_commission_payout",
                },
            )
            last_error = None
            break
        except stripe.error.StripeError as e:
            last_error = e
            logger.warning(
                "Stripe transfer attempt %d/%d failed for influencer %s: %s",
                attempt + 1, max_retries, influencer_id, e,
            )
            if attempt < max_retries - 1:
                await asyncio.sleep(backoff_seconds[attempt])

    if last_error:
        logger.error("Stripe payout failed for influencer %s after %d retries: %s", influencer_id, max_retries, last_error)
        # Notify super_admin — reuse the shared helper from affiliate_service
        try:
            from services.affiliate_service import _notify_admin_transfer_failed
            await _notify_admin_transfer_failed(influencer_id, last_error)
        except Exception as notify_err:
            logger.error("Failed to send admin notification for influencer payout %s: %s", influencer_id, notify_err)
        raise HTTPException(status_code=500, detail=f"Failed to process payout after {max_retries} attempts")

    # Transfer succeeded — update balance and commissions
    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {
            "available_balance": 0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
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

# Influencer payout constants (centralized)
MINIMUM_WITHDRAWAL_AMOUNT = 20  # minimum net amount for withdrawal
STRIPE_TRANSFER_FEE = 0.25  # fee per Stripe transfer
PAYOUT_CURRENCY = "eur"  # default payout currency


@router.post("/influencer/request-withdrawal")
async def request_influencer_withdrawal(request: WithdrawalRequest, user: User = Depends(get_current_user)):
    """Influencer requests withdrawal of their available balance."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="No eres un influencer registrado")

    if influencer.get("status") != "active":
        raise HTTPException(status_code=400, detail="Tu cuenta debe estar activa para solicitar retiros")

    raw_method = (request.method or "stripe").strip().lower()
    # Normalize 'sepa' alias to 'bank_transfer'
    payout_method = "bank_transfer" if raw_method == "sepa" else raw_method
    if payout_method not in {"stripe", "bank_transfer"}:
        raise HTTPException(status_code=400, detail="Metodo de retiro invalido. Usa 'stripe' o 'bank_transfer'.")

    if payout_method == "stripe":
        _ensure_stripe_ready()
        if not influencer.get("stripe_account_id"):
            raise HTTPException(status_code=400, detail="Debes conectar tu cuenta de Stripe primero")
        if not influencer.get("stripe_onboarding_complete"):
            raise HTTPException(status_code=400, detail="Debes completar la configuracion de Stripe")
    else:
        # Fall back to stored IBAN/account from fiscal setup when not provided in request
        if not request.bank_account_holder:
            request.bank_account_holder = influencer.get("sepa_account_name")
        if not request.bank_iban:
            request.bank_iban = influencer.get("sepa_iban")
        if not request.bank_account_holder or not request.bank_iban:
            raise HTTPException(status_code=400, detail="Para transferencia bancaria debes indicar titular e IBAN.")

    now = datetime.now(timezone.utc)

    # Atomic lock: prevent concurrent withdrawals. TTL: 5 minutes (auto-release stale locks).
    stale_cutoff = (now - timedelta(minutes=5)).isoformat()
    lock_result = await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"], "$or": [
            {"withdrawal_in_progress": {"$ne": True}},
            {"withdrawal_lock_at": {"$lt": stale_cutoff}},  # Stale lock — release
        ]},
        {"$set": {"withdrawal_in_progress": True, "withdrawal_lock_at": now.isoformat()}}
    )
    if lock_result.matched_count == 0:
        raise HTTPException(status_code=409, detail="Ya hay un retiro en proceso. Intenta de nuevo en unos segundos.")

    try:
        return await _execute_withdrawal(db, influencer, user, request, now)
    finally:
        # Always release lock
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {"withdrawal_in_progress": False}}
        )


async def _execute_withdrawal(db, influencer, user, request, now):
    """Inner withdrawal logic, called under atomic lock."""
    raw = (request.method or "stripe").strip().lower()
    payout_method = "bank_transfer" if raw == "sepa" else raw

    available_commissions = await db.influencer_commissions.find({
        "influencer_id": influencer["influencer_id"],
        "commission_status": "pending"
    }, {"_id": 0}).to_list(1000)

    available_balance = 0
    eligible_commission_ids = []
    for comm in available_commissions:
        payment_date_str = comm.get("payment_available_date")
        if not payment_date_str:
            continue
        try:
            payment_date = datetime.fromisoformat(payment_date_str.replace("Z", "+00:00"))
            if payment_date <= now:
                available_balance += comm.get("commission_amount", 0)
                eligible_commission_ids.append(comm["commission_id"])
        except Exception:
            continue

    available_balance = round(available_balance, 2)
    gross_amount = request.amount if request.amount else available_balance
    gross_amount = min(gross_amount, available_balance)

    # Calculate withholding and transfer fee
    fiscal = influencer.get("fiscal_status", {})
    withholding_pct = fiscal.get("withholding_pct", 0.0)
    withholding = float((Decimal(str(gross_amount)) * Decimal(str(withholding_pct)) / 100).quantize(Decimal("0.01")))
    transfer_fee = STRIPE_TRANSFER_FEE if payout_method == "stripe" else 0.0
    net_amount = round(gross_amount - withholding - transfer_fee, 2)

    if net_amount < MINIMUM_WITHDRAWAL_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Balance insuficiente. Mínimo {MINIMUM_WITHDRAWAL_AMOUNT}€ neto para solicitar cobro. "
                   f"Tu neto sería {net_amount:.2f}€ (bruto {gross_amount:.2f}€ - retención {withholding:.2f}€ - fee {transfer_fee:.2f}€)"
        )

    try:
        transfer_id = None
        withdrawal_status = "completed"
        transfer_amount_cents = int(round(net_amount * 100))
        if payout_method == "stripe":
            transfer = stripe.Transfer.create(
                amount=transfer_amount_cents,
                currency=PAYOUT_CURRENCY,
                destination=influencer["stripe_account_id"],
                metadata={
                    "influencer_id": influencer["influencer_id"],
                    "type": "influencer_self_withdrawal",
                    "requested_by": user.email,
                    "gross_amount": str(gross_amount),
                    "withholding": str(withholding),
                    "transfer_fee": str(transfer_fee),
                }
            )
            transfer_id = transfer.id
        else:
            withdrawal_status = "pending_bank_transfer"

        # For SEPA, read bank details from request first, fall back to influencer's stored SEPA info
        if payout_method == "bank_transfer":
            bank_holder = request.bank_account_holder or influencer.get("sepa_account_name", "")
            bank_iban = request.bank_iban or influencer.get("sepa_iban", "")
            bank_bic = request.bank_bic or influencer.get("sepa_bic", "")
        else:
            bank_holder = bank_iban = bank_bic = None

        wd_id_self = f"wd_{uuid.uuid4().hex[:12]}"
        withdrawal_record = {
            "withdrawal_id": wd_id_self,
            "influencer_id": influencer["influencer_id"],
            "amount": gross_amount,
            "gross_amount": gross_amount,
            "withholding_amount": withholding,
            "withholding_pct": withholding_pct,
            "transfer_fee": transfer_fee,
            "net_amount": net_amount,
            "payout_method": payout_method,
            "stripe_transfer_id": transfer_id,
            "status": withdrawal_status,
            "bank_account_holder": bank_holder,
            "bank_iban": bank_iban,
            "bank_bic": bank_bic,
            "created_at": now.isoformat(),
            "completed_at": now.isoformat() if withdrawal_status == "completed" else None
        }
        await db.influencer_withdrawals.insert_one(withdrawal_record)

        # For SEPA/bank transfers: also create a manual_payout record for admin processing
        if withdrawal_status == "pending_bank_transfer" and bank_iban:
            await db.manual_payouts.insert_one({
                "payout_id": f"payout_{uuid.uuid4().hex[:12]}",
                "producer_id": influencer["influencer_id"],
                "producer_name": influencer.get("full_name", user.name or ""),
                "producer_email": user.email or "",
                "amount": round(net_amount, 2),
                "currency": "EUR",
                "bank_details": {
                    "account_holder": bank_holder,
                    "bank_name": "SEPA",
                    "country": influencer.get("fiscal_status", {}).get("tax_country", "ES"),
                    "iban": bank_iban,
                    "swift_bic": bank_bic or "",
                    "currency": "EUR",
                    "notes": f"Influencer withdrawal {withdrawal_record['withdrawal_id']}",
                },
                "status": "pending",
                "requested_at": now.isoformat(),
                "processed_at": None,
                "admin_notes": "",
            })

        paid_set = {
            "commission_status": "paid",
            "paid_at": now.isoformat(),
            "stripe_transfer_id": transfer_id,
            "withdrawal_id": wd_id_self,
        }
        if gross_amount >= available_balance:
            await db.influencer_commissions.update_many(
                {"commission_id": {"$in": eligible_commission_ids}},
                {"$set": paid_set},
            )
        else:
            remaining = gross_amount
            for comm in available_commissions:
                if comm["commission_id"] not in eligible_commission_ids or remaining <= 0:
                    continue
                await db.influencer_commissions.update_one(
                    {"commission_id": comm["commission_id"]},
                    {"$set": paid_set},
                )
                remaining -= comm.get("commission_amount", 0)
                if remaining <= 0:
                    break

        new_balance = max(0, influencer.get("available_balance", 0) - gross_amount)
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "available_balance": round(new_balance, 2),
                "updated_at": now.isoformat()
            }}
        )

        # Modelo 190 recording removed in 4.2 — LLC US is not a withholding agent.
        # withholding is always 0 (calculate_withholding returns 0 for all countries).

        return {
            "message": f"Cobro de {net_amount:.2f}€ neto registrado correctamente.",
            "withdrawal_id": withdrawal_record["withdrawal_id"],
            "transfer_id": transfer_id,
            "status": withdrawal_status,
            "method": payout_method,
            "gross_amount": gross_amount,
            "withholding": withholding,
            "withholding_pct": withholding_pct,
            "transfer_fee": transfer_fee,
            "net_amount": net_amount,
            "new_balance": round(new_balance, 2),
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
# FASE 08: COMMISSION SYSTEM ENDPOINTS
# ============================================

TIER_RATES = {"hercules": 0.03, "atenea": 0.05, "zeus": 0.07}
TIER_THRESHOLDS_EUR = {"atenea": 1000, "zeus": 5000}


@router.post("/influencer/codes/validate")
async def validate_discount_code(request: Request):
    """Validate an influencer discount code for a consumer."""
    body = await request.json()
    code = (body.get("code") or "").upper().strip()
    consumer_id = body.get("consumer_id", "")

    if not code:
        raise HTTPException(status_code=400, detail="code_required")

    # Search in discount_codes for influencer codes
    discount = await db.discount_codes.find_one({
        "code": code,
        "is_influencer_code": True,
    }, {"_id": 0})

    if not discount:
        # Also search users with affiliate capability
        affiliate_user = await db.users.find_one({
            "discount_code": code,
            "capabilities": "affiliate",
        }, {"_id": 0})
        if not affiliate_user:
            raise HTTPException(status_code=404, detail="code_not_found")
        # Build response from user data
        return {
            "code": code,
            "discount_pct": 10,
            "influencer_id": affiliate_user.get("user_id", ""),
            "influencer_username": affiliate_user.get("username", ""),
        }

    # Check if consumer already has active attribution
    if consumer_id:
        existing = await db.customer_influencer_attribution.find_one({
            "consumer_id": str(consumer_id),
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()},
        })
        if existing:
            raise HTTPException(status_code=409, detail="already_used")

    influencer_id = discount.get("influencer_id", "")
    influencer = await db.influencers.find_one(
        {"influencer_id": influencer_id}, {"_id": 0, "full_name": 1}
    ) if influencer_id else None

    return {
        "code": code,
        "discount_pct": discount.get("value", 10),
        "influencer_id": influencer_id,
        "influencer_username": influencer.get("full_name", "") if influencer else "",
    }


@router.get("/influencer/stats")
async def get_influencer_stats(user: User = Depends(get_current_user)):
    """KPI stats for the influencer overview page."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    inf_id = influencer["influencer_id"]
    tier = normalize_influencer_tier(
        influencer.get("current_tier", "hercules"),
        influencer.get("commission_rate"),
    )
    rate = TIER_RATES.get(tier, 0.03)

    # GMV last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    commissions_30d = await db.influencer_commissions.find({
        "influencer_id": inf_id,
        "created_at": {"$gte": thirty_days_ago},
    }, {"_id": 0, "order_total": 1}).to_list(1000)
    gmv_30d = sum(c.get("order_total", 0) for c in commissions_30d)

    # Active attributions
    now_iso = datetime.now(timezone.utc).isoformat()
    active_attributions = await db.customer_influencer_attribution.count_documents({
        "influencer_id": inf_id,
        "expires_at": {"$gt": now_iso},
    })

    # Pending EUR (commissions not yet paid)
    pending_comms = await db.influencer_commissions.find({
        "influencer_id": inf_id,
        "commission_status": "pending",
    }, {"_id": 0, "commission_amount": 1, "payment_available_date": 1}).to_list(1000)
    pending_eur = sum(c.get("commission_amount", 0) for c in pending_comms)

    # Paid total
    paid_total = influencer.get("total_commission_earned", 0) - pending_eur

    # Split pending into available now (past 15-day hold) vs locked
    now = datetime.now(timezone.utc)
    available_to_withdraw = 0
    next_payout_date = None
    for c in pending_comms:
        pad = c.get("payment_available_date")
        if pad:
            try:
                pd = datetime.fromisoformat(pad.replace("Z", "+00:00"))
                if pd <= now:
                    available_to_withdraw += c.get("commission_amount", 0)
                elif next_payout_date is None or pd < next_payout_date:
                    next_payout_date = pd
            except Exception:
                pass
        else:
            # No payment date set → treat as available
            available_to_withdraw += c.get("commission_amount", 0)

    # Discount code
    discount_code = None
    if influencer.get("discount_code_id"):
        code_doc = await db.discount_codes.find_one(
            {"code_id": influencer["discount_code_id"]}, {"_id": 0, "code": 1}
        )
        discount_code = code_doc["code"] if code_doc else None

    # Has Stripe Connect
    has_stripe = bool(influencer.get("stripe_onboarding_complete"))

    return {
        "tier": tier,
        "tier_rate": rate,
        "discount_code": discount_code or influencer.get("discount_code", ""),
        "gmv_30d": round(gmv_30d, 2),
        "active_attributions": active_attributions,
        "pending_eur": round(pending_eur, 2),
        "available_to_withdraw": round(available_to_withdraw, 2),
        "paid_total_eur": round(max(paid_total, 0), 2),
        "next_payout_date": next_payout_date.isoformat() if next_payout_date else None,
        "has_stripe_connect": has_stripe,
    }


@router.get("/influencer/sales")
async def get_influencer_sales(
    user: User = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50),
):
    """Recent sales attributed to this influencer."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    inf_id = influencer["influencer_id"]
    commissions = await db.influencer_commissions.find(
        {"influencer_id": inf_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(limit)

    sales = []
    for comm in commissions:
        order_id = comm.get("order_id")
        order = await db.orders.find_one(
            {"order_id": order_id},
            {"_id": 0, "user_name": 1, "line_items": 1, "total_amount": 1},
        ) if order_id else None

        # Check if consumer has previous orders with this influencer (reorder)
        consumer_id = comm.get("consumer_id", "")
        is_reorder = False
        if consumer_id:
            prev_count = await db.influencer_commissions.count_documents({
                "influencer_id": inf_id,
                "consumer_id": consumer_id,
                "created_at": {"$lt": comm.get("created_at", "")},
            })
            is_reorder = prev_count > 0

        product_name = ""
        product_image = ""
        if order and order.get("line_items"):
            first_item = order["line_items"][0]
            product_name = first_item.get("name", first_item.get("product_name", ""))
            product_image = first_item.get("image", first_item.get("image_url", ""))

        tier_rate = TIER_RATES.get(
            comm.get("tier_at_time", influencer.get("current_tier", "hercules")), 0.03
        )

        sales.append({
            "id": comm.get("commission_id", ""),
            "consumer_username": (order.get("user_name", "") if order else "")
                or comm.get("consumer_name", "Cliente"),
            "product_name": product_name or comm.get("product_name", "Producto"),
            "product_image": product_image,
            "order_total": comm.get("order_total", 0),
            "commission_eur": comm.get("commission_amount", 0),
            "tier_rate": tier_rate,
            "is_reorder": is_reorder,
            "created_at": comm.get("created_at", ""),
        })

    return {"sales": sales}


@router.get("/influencer/links")
async def get_influencer_links(user: User = Depends(get_current_user)):
    """Get all affiliate links for this influencer."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    # Fiscal gate: block if certificate not verified
    fiscal = influencer.get("fiscal_status", {})
    if fiscal.get("affiliate_blocked", True):
        raise HTTPException(status_code=403, detail={
            "blocked": True,
            "reason": fiscal.get("block_reason", "Certificado de residencia fiscal pendiente"),
            "action": "upload_certificate",
        })

    links = await db.affiliate_links.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)

    return {"links": links}


@router.post("/influencer/links")
async def create_affiliate_link(request: Request, user: User = Depends(get_current_user)):
    """Generate an affiliate link for a product."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    # Fiscal gate: block if certificate not verified
    fiscal = influencer.get("fiscal_status", {})
    if fiscal.get("affiliate_blocked", True):
        raise HTTPException(status_code=403, detail={
            "blocked": True,
            "reason": fiscal.get("block_reason", "Certificado de residencia fiscal pendiente"),
            "action": "upload_certificate",
        })

    body = await request.json()
    product_id = body.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id required")

    product = await db.products.find_one(
        {"product_id": product_id},
        {"_id": 0, "name": 1, "price": 1, "images": 1},
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    inf_id = influencer["influencer_id"]

    # Check if link already exists for this product
    existing = await db.affiliate_links.find_one({
        "influencer_id": inf_id,
        "product_id": product_id,
    }, {"_id": 0})
    if existing:
        return existing

    # Get the discount code for this influencer
    code = ""
    if influencer.get("discount_code_id"):
        code_doc = await db.discount_codes.find_one(
            {"code_id": influencer["discount_code_id"]}, {"_id": 0, "code": 1}
        )
        code = code_doc["code"] if code_doc else ""

    link_id = f"alink_{uuid.uuid4().hex[:12]}"
    frontend_url = FRONTEND_URL.rstrip("/")
    url = f"{frontend_url}/products/{product_id}?ref={code}" if code else f"{frontend_url}/products/{product_id}?aff={inf_id}"

    link_doc = {
        "link_id": link_id,
        "influencer_id": inf_id,
        "product_id": product_id,
        "product_name": product.get("name", ""),
        "product_price": product.get("price", 0),
        "product_image": extract_product_image(product),
        "url": url,
        "code": code,
        "clicks": 0,
        "conversions": 0,
        "commission_eur": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.affiliate_links.insert_one(link_doc)

    return {
        "id": link_id,
        "url": url,
        "product_name": link_doc["product_name"],
        "product_price": link_doc["product_price"],
        "product_image": link_doc["product_image"],
    }


@router.get("/influencer/payouts")
async def get_influencer_payouts(user: User = Depends(get_current_user)):
    """Get payout history for influencer."""
    influencer = await db.influencers.find_one({"email": user.email.lower()}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    # Combine withdrawals (self-service) and scheduled payouts
    withdrawals = await db.influencer_withdrawals.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    payouts = []
    for wd in withdrawals:
        # Count commissions in this withdrawal (works for both Stripe and SEPA)
        comm_count = 0
        wd_id = wd.get("withdrawal_id")
        if wd_id:
            # Preferred: match by withdrawal_id stored on commission records
            comm_count = await db.influencer_commissions.count_documents({"withdrawal_id": wd_id})
        if comm_count == 0 and wd.get("stripe_transfer_id"):
            # Fallback for legacy records: match by stripe_transfer_id
            comm_count = await db.influencer_commissions.count_documents({
                "stripe_transfer_id": wd["stripe_transfer_id"],
            })

        payouts.append({
            "id": wd.get("withdrawal_id", ""),
            "paid_at": wd.get("completed_at") or wd.get("created_at", ""),
            "net_amount_eur": wd.get("net_amount") or wd.get("amount", 0),
            "fee_amount_eur": wd.get("transfer_fee"),
            "withholding_amount_eur": wd.get("withholding_amount"),
            "commission_count": comm_count,
            "stripe_transfer_id": wd.get("stripe_transfer_id"),
            "status": wd.get("status", "completed"),
        })

    return {"payouts": payouts}


# ── Cron job functions ──────────────────────────────────────


async def update_influencer_tiers():
    """
    Weekly cron: review GMV of each influencer in the last 30 days
    and update tier accordingly.
    """
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # Get all active influencers
    influencers = await db.influencers.find(
        {"status": "active"}, {"_id": 0, "influencer_id": 1, "current_tier": 1, "commission_rate": 1}
    ).to_list(1000)

    for inf in influencers:
        inf_id = inf["influencer_id"]
        old_tier = normalize_influencer_tier(inf.get("current_tier", "hercules"), inf.get("commission_rate"))

        # Calculate 30-day GMV
        comms = await db.influencer_commissions.find({
            "influencer_id": inf_id,
            "created_at": {"$gte": thirty_days_ago},
        }, {"_id": 0, "order_total": 1}).to_list(2000)
        gmv = sum(c.get("order_total", 0) for c in comms)

        # Determine new tier
        if gmv >= TIER_THRESHOLDS_EUR["zeus"]:
            new_tier = "zeus"
        elif gmv >= TIER_THRESHOLDS_EUR["atenea"]:
            new_tier = "atenea"
        else:
            new_tier = "hercules"

        if new_tier != old_tier:
            new_rate = TIER_RATES[new_tier]
            await db.influencers.update_one(
                {"influencer_id": inf_id},
                {"$set": {
                    "current_tier": new_tier,
                    "commission_rate": new_rate,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            # Notify on upgrade
            tier_order = ["hercules", "atenea", "zeus"]
            if tier_order.index(new_tier) > tier_order.index(old_tier):
                tier_labels = {"atenea": "Atenea", "zeus": "Zeus"}
                from routes.notifications import create_notification
                await create_notification(
                    user_id=inf_id,
                    title=f"¡Has alcanzado el nivel {tier_labels.get(new_tier, new_tier)}!",
                    body=f"Ahora ganas un {int(round(new_rate * 100))}% de comisión en cada venta",
                    notification_type="tier_upgraded",
                    data={"new_tier": new_tier, "commission_rate": new_rate},
                    action_url="/influencer/dashboard",
                )
            logger.info(f"[TIER] Influencer {inf_id}: {old_tier} → {new_tier} (GMV 30d: {gmv:.0f}€)")


async def process_influencer_payouts():
    """
    Daily cron (08:00 UTC): process scheduled payouts where D+15 has passed
    and balance >= 20€.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Find all influencers with pending commissions where payment_available_date has passed
    influencers = await db.influencers.find(
        {"status": "active", "stripe_onboarding_complete": True},
        {"_id": 0, "influencer_id": 1, "stripe_account_id": 1, "fiscal_status": 1},
    ).to_list(1000)

    for inf in influencers:
        inf_id = inf["influencer_id"]
        stripe_account = inf.get("stripe_account_id")
        if not stripe_account:
            continue

        # Get eligible commissions (D+15 passed)
        eligible = await db.influencer_commissions.find({
            "influencer_id": inf_id,
            "commission_status": "pending",
            "payment_available_date": {"$lte": now_iso},
        }, {"_id": 0, "commission_id": 1, "commission_amount": 1}).to_list(1000)

        if not eligible:
            continue

        gross_amount = sum(c.get("commission_amount", 0) for c in eligible)
        if gross_amount < MINIMUM_WITHDRAWAL_AMOUNT:
            continue  # Below minimum

        comm_ids = [c["commission_id"] for c in eligible]

        # Apply fiscal withholding (IRPF) like self-service withdrawal
        fiscal = inf.get("fiscal_status", {})
        withholding_pct = fiscal.get("withholding_pct", 0) if fiscal.get("certificate_verified") else 0
        withholding_amount = round(gross_amount * withholding_pct / 100, 2)
        transfer_fee = STRIPE_TRANSFER_FEE
        net_amount = round(gross_amount - withholding_amount - transfer_fee, 2)

        if net_amount < MINIMUM_WITHDRAWAL_AMOUNT:
            continue  # Below minimum after deductions

        try:
            transfer = stripe.Transfer.create(
                amount=int(round(net_amount * 100)),
                currency=PAYOUT_CURRENCY,
                destination=stripe_account,
                transfer_group=f"INFLUENCER_{inf_id}_{now.strftime('%Y%m')}",
                metadata={
                    "influencer_id": inf_id,
                    "type": "influencer_auto_payout",
                    "period": now.strftime("%Y-%m"),
                    "gross": str(gross_amount),
                    "withholding": str(withholding_amount),
                },
                idempotency_key=f"auto_payout_{inf_id}_{now.strftime('%Y%m%d')}",
            )
            # Mark as paid
            await db.influencer_commissions.update_many(
                {"commission_id": {"$in": comm_ids}},
                {"$set": {
                    "commission_status": "paid",
                    "paid_at": now_iso,
                    "stripe_transfer_id": transfer.id,
                }},
            )
            # Record withdrawal (with withholding details)
            wd_id = f"wd_{uuid.uuid4().hex[:12]}"
            await db.influencer_withdrawals.insert_one({
                "withdrawal_id": wd_id,
                "influencer_id": inf_id,
                "gross_amount": round(gross_amount, 2),
                "withholding_amount_eur": round(withholding_amount, 2),
                "fee_amount_eur": transfer_fee,
                "net_amount": round(net_amount, 2),
                "amount": round(net_amount, 2),
                "payout_method": "stripe",
                "stripe_transfer_id": transfer.id,
                "status": "completed",
                "created_at": now_iso,
                "completed_at": now_iso,
            })
            # Record withholding for tax reporting (Modelo 190)
            if withholding_amount > 0:
                quarter = (now.month - 1) // 3 + 1
                await db.withholding_records.insert_one({
                    "influencer_id": inf_id,
                    "year": now.year,
                    "quarter": quarter,
                    "gross_amount": round(gross_amount, 2),
                    "withholding_pct": withholding_pct,
                    "withholding_amount": round(withholding_amount, 2),
                    "withdrawal_id": wd_id,
                    "created_at": now_iso,
                    "source": "auto_payout",
                })
            # Update balance
            await db.influencers.update_one(
                {"influencer_id": inf_id},
                {"$inc": {"available_balance": -gross_amount}},
            )
            # Notify
            from routes.notifications import create_notification
            await create_notification(
                user_id=inf_id,
                title="Cobro enviado",
                body=f"{net_amount:.2f}€ enviados a tu cuenta bancaria" + (f" (retención {withholding_pct}%: {withholding_amount:.2f}€)" if withholding_amount > 0 else ""),
                notification_type="payout_sent",
                data={"amount": net_amount, "gross": gross_amount},
                action_url="/influencer/dashboard",
            )
            logger.info(f"[PAYOUT] Auto-payout {net_amount:.2f}€ (gross {gross_amount:.2f}€, IRPF {withholding_amount:.2f}€) to influencer {inf_id}")

        except Exception as e:
            await db.influencer_commissions.update_many(
                {"commission_id": {"$in": comm_ids}},
                {"$set": {"payout_error": str(e), "payout_failed_at": now_iso}},
            )
            logger.error(f"[PAYOUT] Failed for influencer {inf_id}: {e}")


# ── Enable affiliate capability ─────────────────────────────

import secrets as _secrets
import string as _string
from utils.images import extract_product_image


def generate_discount_code(username: str, tier: str = "hercules") -> str:
    """Generate a unique tier-prefixed discount code."""
    prefix = {"hercules": "HERC", "atenea": "ATEN", "zeus": "ZEUS"}.get(tier, "HERC")
    clean = "".join(c.upper() for c in username if c.isalnum())[:8]
    suffix = "".join(_secrets.choice(_string.digits) for _ in range(4))
    return f"{prefix}-{clean}{suffix}"


@router.post("/account/enable-affiliate")
async def enable_affiliate_capability(user: User = Depends(get_current_user)):
    """Enable affiliate capability: generate discount code, set tier to hercules."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    caps = user_doc.get("capabilities", [])
    if "affiliate" in caps:
        # Return existing code
        code_doc = await db.discount_codes.find_one(
            {"owner_user_id": user.user_id, "is_affiliate_code": True},
            {"_id": 0, "code": 1},
        )
        return {
            "code": code_doc["code"] if code_doc else "",
            "tier": "hercules",
            "discount_pct": 10,
        }

    # Generate unique code
    username = user_doc.get("username", user.user_id[:8])
    code = generate_discount_code(username, "hercules")

    # Ensure uniqueness
    while await db.discount_codes.find_one({"code": code}):
        code = generate_discount_code(username, "hercules")

    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$addToSet": {"capabilities": "affiliate"},
            "$set": {
                "influencer_tier": "hercules",
                "discount_code": code,
            },
        },
    )

    await db.discount_codes.insert_one({
        "code_id": f"aff_{user.user_id}",
        "code": code,
        "type": "percentage",
        "value": 10,
        "active": True,
        "owner_user_id": user.user_id,
        "is_affiliate_code": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"code": code, "tier": "hercules", "discount_pct": 10}


@router.get("/influencer/discount-codes")
async def get_discount_codes(user: User = Depends(get_current_user)):
    """Get all discount codes created by this influencer."""
    user_id = getattr(user, "user_id", None)
    codes = await db.discount_codes.find({"owner_user_id": user_id}).sort("created_at", -1).to_list(50)
    for c in codes:
        c["_id"] = str(c["_id"])
    return codes
