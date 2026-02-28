"""
Account management routes.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone

from ..core.config import db, logger
from ..core.security import get_current_user, hash_password
from ..models.user import User

router = APIRouter(prefix="/account", tags=["Account"])


class AccountDeleteInput(BaseModel):
    password: str
    confirmation: str  # Must be "DELETE"


@router.delete("/delete")
async def delete_account(input: AccountDeleteInput, user: User = Depends(get_current_user)):
    """
    Permanently delete user account and all associated data.
    GDPR Article 17 - Right to Erasure.
    """
    # Validate confirmation
    if input.confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Please type DELETE to confirm")
    
    # Verify password
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("password_hash") != hash_password(input.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    logger.info(f"[ACCOUNT DELETE] Starting deletion for user {user.user_id}")
    
    if user.role == "customer":
        # Anonymize orders (keep for business records)
        await db.orders.update_many(
            {"user_id": user.user_id},
            {"$set": {
                "user_name": "[Deleted User]",
                "user_email": "[deleted]",
                "shipping_address": {"street": "[deleted]", "city": "[deleted]", "postal_code": "[deleted]", "country": "[deleted]"}
            }}
        )
        
        # Delete cart
        await db.carts.delete_one({"user_id": user.user_id})
        
        # Delete AI profile
        await db.ai_profiles.delete_one({"user_id": user.user_id})
        
        # Delete chat history
        await db.chat_history.delete_many({"user_id": user.user_id})
        
        # Anonymize reviews
        await db.reviews.update_many(
            {"user_id": user.user_id},
            {"$set": {"user_name": "[Deleted User]", "user_id": "deleted"}}
        )
        
        # Delete inferred insights (GDPR compliance)
        await db.user_inferred_insights.delete_one({"user_id": user.user_id})
        
    elif user.role == "producer":
        # Check for pending orders
        pending = await db.orders.count_documents({
            "items.producer_id": user.user_id,
            "status": {"$in": ["pending", "processing", "shipped"]}
        })
        
        if pending > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete account with {pending} pending orders. Please complete them first."
            )
        
        # Deactivate products (keep for order history)
        await db.products.update_many(
            {"producer_id": user.user_id},
            {"$set": {"status": "deleted", "visible": False}}
        )
    
    # Delete the user
    await db.users.delete_one({"user_id": user.user_id})
    
    # Delete verification tokens
    await db.email_verifications.delete_many({"user_id": user.user_id})
    await db.password_resets.delete_many({"user_id": user.user_id})
    
    logger.info(f"[ACCOUNT DELETE] Completed deletion for user {user.user_id}")
    
    return {"message": "Account deleted successfully"}


@router.put("/withdraw-consent")
async def withdraw_analytics_consent(user: User = Depends(get_current_user)):
    """
    Withdraw analytics consent.
    Deletes all inferred data and disables AI personalization.
    """
    # Update consent status
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "consent.analytics_consent": False,
            "consent.withdrawal_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Delete inferred insights
    await db.user_inferred_insights.delete_one({"user_id": user.user_id})
    
    logger.info(f"[CONSENT] User {user.user_id} withdrew analytics consent")
    
    return {"message": "Analytics consent withdrawn. Your inferred data has been deleted."}


@router.put("/reactivate-consent")
async def reactivate_analytics_consent(user: User = Depends(get_current_user)):
    """Reactivate analytics consent for the user."""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "consent.analytics_consent": True,
            "consent.reactivation_date": datetime.now(timezone.utc).isoformat(),
            "consent.consent_version": "1.0"
        }}
    )
    
    logger.info(f"[CONSENT] User {user.user_id} reactivated analytics consent")
    
    return {"message": "Analytics consent reactivated. AI personalization is now enabled."}
