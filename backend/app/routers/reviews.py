"""
Review routes.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from ..core.config import db
from ..core.security import get_current_user
from ..models.user import User
from ..models.commerce import ReviewCreateInput

router = APIRouter(tags=["Reviews"])


async def recalculate_store_rating(producer_id: str):
    """Recalculate store rating from all non-hidden reviews of the producer's products."""
    producer_products = await db.products.find(
        {"producer_id": producer_id},
        {"product_id": 1, "_id": 0}
    ).to_list(2000)
    product_ids = [p["product_id"] for p in producer_products]
    if not product_ids:
        return

    pipeline = [
        {"$match": {"product_id": {"$in": product_ids}, "hidden": {"$ne": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        await db.stores.update_one(
            {"producer_id": producer_id},
            {"$set": {
                "rating": round(result[0]["avg"], 1),
                "review_count": result[0]["count"]
            }}
        )
    else:
        await db.stores.update_one(
            {"producer_id": producer_id},
            {"$set": {"rating": 0.0, "review_count": 0}}
        )


@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, limit: int = 20):
    """Get reviews for a product."""
    reviews = await db.reviews.find(
        {"product_id": product_id, "hidden": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calculate average rating
    all_reviews = await db.reviews.find(
        {"product_id": product_id, "hidden": {"$ne": True}},
        {"rating": 1, "_id": 0}
    ).to_list(1000)
    
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    return {
        "reviews": reviews,
        "total": len(all_reviews),
        "average_rating": round(avg_rating, 1)
    }


@router.post("/reviews/create")
async def create_review(input: ReviewCreateInput, user: User = Depends(get_current_user)):
    """Create a review for a purchased product."""
    if user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can write reviews")
    
    # Verify user purchased this product
    order = await db.orders.find_one({
        "order_id": input.order_id,
        "user_id": user.user_id,
        "status": "delivered"
    })
    
    if not order:
        raise HTTPException(status_code=403, detail="You can only review products from delivered orders")
    
    # Check if product was in order
    product_in_order = any(item.get("product_id") == input.product_id for item in order.get("items", []))
    if not product_in_order:
        raise HTTPException(status_code=403, detail="Product not found in this order")
    
    # Check for existing review
    existing = await db.reviews.find_one({
        "product_id": input.product_id,
        "user_id": user.user_id,
        "order_id": input.order_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "product_id": input.product_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "order_id": input.order_id,
        "rating": max(1, min(5, input.rating)),
        "title": input.title,
        "comment": input.comment,
        "verified_purchase": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "hidden": False
    }
    
    await db.reviews.insert_one(review)
    review.pop("_id", None)

    # Recalculate the store rating for the product's producer
    product = await db.products.find_one(
        {"product_id": input.product_id},
        {"_id": 0, "producer_id": 1}
    )
    if product and product.get("producer_id"):
        await recalculate_store_rating(product["producer_id"])

    return review


@router.get("/reviews/can-review/{product_id}")
async def can_review_product(product_id: str, user: User = Depends(get_current_user)):
    """Check if user can review a product."""
    # Find delivered orders with this product
    orders = await db.orders.find({
        "user_id": user.user_id,
        "status": "delivered"
    }, {"_id": 0}).to_list(100)
    
    eligible_orders = []
    for order in orders:
        for item in order.get("items", []):
            if item.get("product_id") == product_id:
                # Check if not already reviewed
                existing = await db.reviews.find_one({
                    "product_id": product_id,
                    "order_id": order.get("order_id", ""),
                    "user_id": user.user_id
                })
                if not existing:
                    eligible_orders.append(order.get("order_id", ""))
    
    return {
        "can_review": len(eligible_orders) > 0,
        "eligible_orders": eligible_orders
    }


@router.get("/customer/reviews")
async def get_customer_reviews(user: User = Depends(get_current_user)):
    """Get reviews written by the current customer."""
    reviews = await db.reviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return reviews


@router.get("/admin/reviews")
async def get_all_reviews(
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get all reviews (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reviews


@router.put("/admin/reviews/{review_id}/hide")
async def hide_review(review_id: str, user: User = Depends(get_current_user)):
    """Hide a review (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"hidden": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review hidden"}


@router.put("/admin/reviews/{review_id}/show")
async def show_review(review_id: str, user: User = Depends(get_current_user)):
    """Show a hidden review (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"hidden": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review visible"}


@router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, user: User = Depends(get_current_user)):
    """Delete a review (admin only)."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.reviews.delete_one({"review_id": review_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted"}
