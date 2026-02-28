"""
Customer routes: orders, profile, addresses.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from ..core.config import db, logger
from ..core.security import get_current_user, hash_password
from ..models.user import User, ShippingAddress

router = APIRouter(prefix="/customer", tags=["Customer"])


# Orders
@router.get("/orders")
async def get_customer_orders(user: User = Depends(get_current_user)):
    """Get orders for logged-in customer."""
    orders = await db.orders.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders


@router.get("/orders/{order_id}")
async def get_customer_order_detail(
    order_id: str,
    user: User = Depends(get_current_user)
):
    """Get single order details."""
    order = await db.orders.find_one(
        {"order_id": order_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}/cancel")
async def cancel_customer_order(
    order_id: str,
    user: User = Depends(get_current_user)
):
    """Cancel an order (if status allows)."""
    order = await db.orders.find_one(
        {"order_id": order_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Reverse influencer commission if applicable
    if order.get("influencer_id") and order.get("influencer_commission_status") == "pending":
        commission_amount = order.get("influencer_commission_amount", 0)
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"influencer_commission_status": "reversed"}}
        )
        
        await db.influencer_commissions.update_one(
            {"order_id": order_id},
            {"$set": {"commission_status": "reversed"}}
        )
        
        await db.influencers.update_one(
            {"influencer_id": order["influencer_id"]},
            {"$inc": {
                "total_sales_generated": -order.get("total_amount", 0),
                "total_commission_earned": -commission_amount,
                "available_balance": -commission_amount
            }}
        )
    
    return {"message": "Order cancelled"}


# Profile
@router.get("/profile")
async def get_customer_profile(user: User = Depends(get_current_user)):
    """Get customer profile."""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "password_hash": 0}
    )
    return user_doc


@router.put("/profile")
async def update_customer_profile(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Update customer profile."""
    update_data = {}
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated"}


@router.put("/profile/password")
async def change_password(
    current_password: str,
    new_password: str,
    user: User = Depends(get_current_user)
):
    """Change customer password."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if user_doc.get("password_hash") != hash_password(current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    return {"message": "Password changed successfully"}


# Dietary Preferences
@router.get("/preferences")
async def get_dietary_preferences(user: User = Depends(get_current_user)):
    """Get customer dietary preferences."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "diet_preferences": user_doc.get("diet_preferences", []),
        "allergens": user_doc.get("allergens", [])
    }


@router.put("/preferences")
async def update_dietary_preferences(
    diet_preferences: List[str] = [],
    allergens: List[str] = [],
    user: User = Depends(get_current_user)
):
    """Update dietary preferences."""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "diet_preferences": diet_preferences,
            "allergens": allergens
        }}
    )
    return {"message": "Preferences updated"}


# Shipping Addresses
@router.get("/addresses")
async def get_shipping_addresses(user: User = Depends(get_current_user)):
    """Get customer shipping addresses."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "addresses": user_doc.get("shipping_addresses", []),
        "default_address_id": user_doc.get("default_address_id")
    }


@router.post("/addresses")
async def add_shipping_address(
    address: ShippingAddress,
    user: User = Depends(get_current_user)
):
    """Add a new shipping address."""
    address_data = address.dict()
    address_data["address_id"] = f"addr_{uuid.uuid4().hex[:8]}"
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    existing = user_doc.get("shipping_addresses", [])
    
    # If first address or marked as default, set as default
    if not existing or address.is_default:
        address_data["is_default"] = True
        # Unset other defaults
        for addr in existing:
            addr["is_default"] = False
        existing.append(address_data)
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "shipping_addresses": existing,
                "default_address_id": address_data["address_id"]
            }}
        )
    else:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$push": {"shipping_addresses": address_data}}
        )
    
    return {"address_id": address_data["address_id"], "message": "Address added"}


@router.put("/addresses/{address_id}")
async def update_shipping_address(
    address_id: str,
    address: ShippingAddress,
    user: User = Depends(get_current_user)
):
    """Update a shipping address."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    addresses = user_doc.get("shipping_addresses", [])
    
    for i, addr in enumerate(addresses):
        if addr.get("address_id") == address_id:
            addresses[i] = {**address.dict(), "address_id": address_id}
            break
    else:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Handle default flag
    if address.is_default:
        for addr in addresses:
            addr["is_default"] = addr.get("address_id") == address_id
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "shipping_addresses": addresses,
                "default_address_id": address_id
            }}
        )
    else:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"shipping_addresses": addresses}}
        )
    
    return {"message": "Address updated"}


@router.delete("/addresses/{address_id}")
async def delete_shipping_address(
    address_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a shipping address."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    addresses = user_doc.get("shipping_addresses", [])
    
    # Find and remove
    new_addresses = [a for a in addresses if a.get("address_id") != address_id]
    
    if len(new_addresses) == len(addresses):
        raise HTTPException(status_code=404, detail="Address not found")
    
    update_data = {"shipping_addresses": new_addresses}
    
    # If deleted was default, set new default
    if user_doc.get("default_address_id") == address_id and new_addresses:
        new_addresses[0]["is_default"] = True
        update_data["default_address_id"] = new_addresses[0]["address_id"]
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_data}
    )
    
    return {"message": "Address deleted"}


@router.put("/addresses/{address_id}/default")
async def set_default_address(
    address_id: str,
    user: User = Depends(get_current_user)
):
    """Set address as default."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    addresses = user_doc.get("shipping_addresses", [])
    
    found = False
    for addr in addresses:
        if addr.get("address_id") == address_id:
            addr["is_default"] = True
            found = True
        else:
            addr["is_default"] = False
    
    if not found:
        raise HTTPException(status_code=404, detail="Address not found")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "shipping_addresses": addresses,
            "default_address_id": address_id
        }}
    )
    
    return {"message": "Default address updated"}
