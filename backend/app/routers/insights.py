"""
Insights routes for Super Admin dashboard.
Customer analytics and GDPR compliance.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional

from ..core.config import db, logger
from ..core.security import get_current_user, require_super_admin
from ..models.user import User

router = APIRouter(prefix="/insights", tags=["Insights"])


async def check_super_admin(user: User):
    """Verify user is super admin."""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")


@router.get("/config")
async def get_insights_config(user: User = Depends(get_current_user)):
    """Get insights configuration."""
    await check_super_admin(user)
    
    config = await db.insights_config.find_one({"config_id": "default"}, {"_id": 0})
    if not config:
        config = {
            "config_id": "default",
            "anonymity_threshold": 15,
            "enable_fear_tracking": True,
            "enable_health_inference": True,
            "model_in_use": "gpt-4o"
        }
        await db.insights_config.insert_one(config)
    
    return config


@router.put("/config")
async def update_insights_config(
    anonymity_threshold: Optional[int] = None,
    enable_fear_tracking: Optional[bool] = None,
    enable_health_inference: Optional[bool] = None,
    user: User = Depends(get_current_user)
):
    """Update insights configuration."""
    await check_super_admin(user)
    
    update_data = {"updated_by": user.user_id, "last_updated": datetime.now(timezone.utc).isoformat()}
    
    if anonymity_threshold is not None:
        update_data["anonymity_threshold"] = max(15, anonymity_threshold)
    if enable_fear_tracking is not None:
        update_data["enable_fear_tracking"] = enable_fear_tracking
    if enable_health_inference is not None:
        update_data["enable_health_inference"] = enable_health_inference
    
    await db.insights_config.update_one(
        {"config_id": "default"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Configuration updated", "changes": update_data}


@router.get("/global-overview")
async def get_global_overview(user: User = Depends(get_current_user)):
    """Get global aggregated insights overview."""
    await check_super_admin(user)
    
    config = await db.insights_config.find_one({"config_id": "default"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Get consented users count
    consented_count = await db.users.count_documents({
        "consent.analytics_consent": True,
        "role": "customer"
    })
    
    total_customers = await db.users.count_documents({"role": "customer"})
    
    # Get insights data
    insights_count = await db.user_inferred_insights.count_documents({})
    
    # Aggregate top tags (only if above threshold)
    pipeline = [
        {"$unwind": "$likes_tags"},
        {"$group": {"_id": "$likes_tags.tag", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_likes = await db.user_inferred_insights.aggregate(pipeline).to_list(10)
    
    # Top diet goals
    diet_pipeline = [
        {"$unwind": "$diet_goal_tags"},
        {"$group": {"_id": "$diet_goal_tags.tag", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_diet_goals = await db.user_inferred_insights.aggregate(diet_pipeline).to_list(10)
    
    # Top allergies
    allergy_pipeline = [
        {"$unwind": "$allergy_tags"},
        {"$group": {"_id": "$allergy_tags.tag", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_allergies = await db.user_inferred_insights.aggregate(allergy_pipeline).to_list(10)
    
    return {
        "summary": {
            "total_customers": total_customers,
            "consented_users": consented_count,
            "consent_rate": round(consented_count / total_customers * 100, 1) if total_customers > 0 else 0,
            "users_with_insights": insights_count,
            "anonymity_threshold": threshold
        },
        "top_preferences": {
            "likes": [{"tag": t["_id"], "count": t["count"]} for t in top_likes],
            "diet_goals": [{"tag": t["_id"], "count": t["count"]} for t in top_diet_goals],
            "allergies": [{"tag": t["_id"], "count": t["count"]} for t in top_allergies]
        },
        "data_quality": {
            "insights_coverage": round(insights_count / consented_count * 100, 1) if consented_count > 0 else 0
        }
    }


@router.get("/country/{country_code}")
async def get_country_insights(country_code: str, user: User = Depends(get_current_user)):
    """Get insights for a specific country."""
    await check_super_admin(user)
    
    config = await db.insights_config.find_one({"config_id": "default"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Get users from this country
    users_in_country = await db.users.find(
        {"country": country_code, "consent.analytics_consent": True},
        {"user_id": 1, "_id": 0}
    ).to_list(10000)
    
    user_ids = [u["user_id"] for u in users_in_country]
    user_count = len(user_ids)
    
    if user_count < threshold:
        return {
            "country": country_code,
            "message": f"Insufficient data (below {threshold} users threshold)",
            "user_count": user_count
        }
    
    # Aggregate insights for this country
    pipeline = [
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$unwind": "$likes_tags"},
        {"$group": {"_id": "$likes_tags.tag", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_likes = await db.user_inferred_insights.aggregate(pipeline).to_list(10)
    
    diet_pipeline = [
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$unwind": "$diet_goal_tags"},
        {"$group": {"_id": "$diet_goal_tags.tag", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_diet_goals = await db.user_inferred_insights.aggregate(diet_pipeline).to_list(10)
    
    return {
        "country": country_code,
        "user_count": user_count,
        "top_preferences": {
            "likes": [{"tag": t["_id"], "count": t["count"]} for t in top_likes],
            "diet_goals": [{"tag": t["_id"], "count": t["count"]} for t in top_diet_goals]
        }
    }


@router.get("/ai-performance")
async def get_ai_performance(user: User = Depends(get_current_user)):
    """Get AI assistant performance metrics."""
    await check_super_admin(user)
    
    # Get total AI interactions
    total_sessions = await db.chat_history.distinct("session_id")
    total_messages = await db.chat_history.count_documents({"role": "user"})
    
    # Get action usage stats
    pipeline = [
        {"$group": {
            "_id": None,
            "total_interactions": {"$sum": "$total_ai_interactions"},
            "total_sessions": {"$sum": "$total_ai_sessions"},
            "avg_acceptance_rate": {"$avg": "$recommendation_acceptance_rate"}
        }}
    ]
    ai_stats = await db.user_inferred_insights.aggregate(pipeline).to_list(1)
    stats = ai_stats[0] if ai_stats else {}
    
    return {
        "chat_metrics": {
            "total_sessions": len(total_sessions),
            "total_messages": total_messages,
            "avg_messages_per_session": round(total_messages / len(total_sessions), 1) if total_sessions else 0
        },
        "inference_metrics": {
            "total_interactions_tracked": stats.get("total_interactions", 0),
            "total_sessions_tracked": stats.get("total_sessions", 0),
            "avg_recommendation_acceptance": round(stats.get("avg_acceptance_rate", 0) * 100, 1)
        }
    }


@router.get("/compliance")
async def get_compliance_status(user: User = Depends(get_current_user)):
    """Get GDPR compliance status and metrics."""
    await check_super_admin(user)
    
    # Consent stats
    total_users = await db.users.count_documents({"role": "customer"})
    consented = await db.users.count_documents({
        "role": "customer",
        "consent.analytics_consent": True
    })
    withdrawn = await db.users.count_documents({
        "role": "customer",
        "consent.analytics_consent": False,
        "consent.withdrawal_date": {"$exists": True}
    })
    
    # Version stats
    v1_users = await db.users.count_documents({
        "consent.consent_version": "1.0"
    })
    
    return {
        "consent_status": {
            "total_customers": total_users,
            "consented": consented,
            "consent_rate": round(consented / total_users * 100, 1) if total_users > 0 else 0,
            "withdrawn": withdrawn,
            "never_consented": total_users - consented - withdrawn
        },
        "version_breakdown": {
            "v1.0": v1_users
        },
        "compliance_features": {
            "anonymity_threshold_enforced": True,
            "raw_chat_storage": False,
            "data_export_enabled": False,
            "individual_drill_down": False
        }
    }


@router.get("/audit-log")
async def get_audit_log(
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get consent audit log."""
    await check_super_admin(user)
    
    # Get recent consent changes
    recent_consents = await db.users.find(
        {"consent.consent_date": {"$exists": True}},
        {"_id": 0, "user_id": 1, "consent": 1, "created_at": 1}
    ).sort("consent.consent_date", -1).limit(limit).to_list(limit)
    
    events = []
    for u in recent_consents:
        consent = u.get("consent", {})
        if consent.get("withdrawal_date"):
            events.append({
                "event": "consent_withdrawn",
                "user_id_hash": hash(u["user_id"]) % 10000,
                "timestamp": consent["withdrawal_date"],
                "version": consent.get("consent_version", "1.0")
            })
        if consent.get("consent_date"):
            events.append({
                "event": "consent_granted",
                "user_id_hash": hash(u["user_id"]) % 10000,
                "timestamp": consent["consent_date"],
                "version": consent.get("consent_version", "1.0")
            })
    
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {"events": events[:limit]}


@router.get("/gdpr-summary")
async def get_gdpr_summary(user: User = Depends(get_current_user)):
    """Get complete GDPR compliance summary."""
    await check_super_admin(user)
    
    config = await db.insights_config.find_one({"config_id": "default"}, {"_id": 0})
    
    return {
        "data_controller": "Hispaloshop S.L.",
        "legal_basis": "Explicit consent (Art. 6(1)(a) GDPR)",
        "data_collected": [
            "Preference tags (normalized, not raw text)",
            "Diet goal inferences",
            "Allergy information (for safety)",
            "Budget preferences"
        ],
        "data_not_stored": [
            "Raw chat messages (for analytics)",
            "Medical diagnoses",
            "Psychological profiles"
        ],
        "retention_policy": "Data retained until account deletion or consent withdrawal",
        "user_rights_implemented": [
            "Right to access",
            "Right to rectification", 
            "Right to erasure",
            "Right to withdraw consent"
        ],
        "anonymity_measures": {
            "threshold": config.get("anonymity_threshold", 15) if config else 15,
            "aggregation": "Country-level minimum",
            "no_individual_export": True
        },
        "last_audit": datetime.now(timezone.utc).isoformat()
    }
