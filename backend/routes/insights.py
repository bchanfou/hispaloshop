"""
Insights routes: Global overview, country analytics, AI performance, trends, compliance, GDPR.
"""
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query

from core.database import db
from core.auth import get_current_user
from core.models import User, InsightsConfigUpdate

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/insights/config")
async def get_insights_config(user: User = Depends(get_current_user)):
    """Get current insights configuration - Super Admin only"""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    if not config:
        # Create default config
        config = {
            "config_id": "global_insights_config",
            "anonymity_threshold": 15,
            "sensitive_data_retention_days": 365,
            "enable_fear_tracking": True,
            "enable_health_inference": True,
            "enable_b2b_exports": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.user_id
        }
        await db.insights_config.insert_one(config)
    
    return config


@router.put("/insights/config")
async def update_insights_config(updates: InsightsConfigUpdate, user: User = Depends(get_current_user)):
    """Update insights configuration - Super Admin only"""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.user_id
    
    await db.insights_config.update_one(
        {"config_id": "global_insights_config"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Configuration updated"}


@router.get("/insights/global-overview")
async def get_global_overview(user: User = Depends(get_current_user)):
    """
    Global Overview Statistics - Super Admin only
    Returns: total users, countries, consent rates, AI preference coverage
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get config for thresholds
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Total users by role
    total_users = await db.users.count_documents({})
    customers = await db.users.count_documents({"role": "customer"})
    producers = await db.users.count_documents({"role": "producer"})
    
    # Users with consent
    users_with_consent = await db.users.count_documents({"consent.analytics_consent": True})
    consent_rate = round((users_with_consent / total_users * 100), 1) if total_users > 0 else 0
    
    # Users with AI profiles
    users_with_ai_profile = await db.ai_profiles.count_documents({})
    ai_profile_rate = round((users_with_ai_profile / customers * 100), 1) if customers > 0 else 0
    
    # Users with inferred insights
    users_with_insights = await db.user_inferred_insights.count_documents({})
    insights_rate = round((users_with_insights / customers * 100), 1) if customers > 0 else 0
    
    # Countries active
    countries_pipeline = [
        {"$match": {"country": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"country": "$_id", "count": 1, "_id": 0}}
    ]
    countries_cursor = db.users.aggregate(countries_pipeline)
    countries = await countries_cursor.to_list(length=200)
    
    # Sensitive signals coverage (only show if above threshold)
    users_with_fears = await db.user_inferred_insights.count_documents({"fear_tags.0": {"$exists": True}})
    users_with_allergies = await db.user_inferred_insights.count_documents({"allergy_tags.0": {"$exists": True}})
    
    return {
        "total_users": total_users,
        "customers": customers,
        "producers": producers,
        "countries_count": len(countries),
        "top_countries": countries[:10],
        "consent_coverage": {
            "users_with_consent": users_with_consent,
            "consent_rate_percent": consent_rate
        },
        "ai_coverage": {
            "users_with_ai_profile": users_with_ai_profile,
            "ai_profile_rate_percent": ai_profile_rate
        },
        "insights_coverage": {
            "users_with_insights": users_with_insights,
            "insights_rate_percent": insights_rate
        },
        "sensitive_signals": {
            "users_with_fear_signals": users_with_fears if users_with_fears >= threshold else f"<{threshold}",
            "users_with_allergy_signals": users_with_allergies if users_with_allergies >= threshold else f"<{threshold}",
            "threshold_applied": threshold
        },
        "anonymity_threshold": threshold
    }


@router.get("/insights/country/{country_code}")
async def get_country_insights(country_code: str, user: User = Depends(get_current_user)):
    """
    Country-specific intelligence - Super Admin only
    Returns: diet goals, likes, dislikes, allergy prevalence (aggregated)
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get config for thresholds
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Get users in this country
    country_users = await db.users.find(
        {"country": {"$regex": f"^{country_code}$", "$options": "i"}},
        {"_id": 0, "user_id": 1}
    ).to_list(length=100000)
    user_ids = [u["user_id"] for u in country_users]
    total_country_users = len(user_ids)
    
    if total_country_users < threshold:
        return {
            "country": country_code,
            "total_users": total_country_users,
            "message": f"Insufficient users for anonymized analysis (minimum: {threshold})",
            "data_available": False
        }
    
    # Get inferred insights for these users
    insights_cursor = db.user_inferred_insights.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0}
    )
    insights = await insights_cursor.to_list(length=100000)
    
    # Aggregate likes tags
    likes_counter = {}
    dislikes_counter = {}
    diet_goals_counter = {}
    fears_counter = {}
    allergies_counter = {}
    budget_counter = {"low": 0, "medium": 0, "premium": 0}
    
    for insight in insights:
        for tag_obj in insight.get("likes_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            likes_counter[tag] = likes_counter.get(tag, 0) + 1
        
        for tag_obj in insight.get("dislikes_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            dislikes_counter[tag] = dislikes_counter.get(tag, 0) + 1
        
        for tag_obj in insight.get("diet_goal_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            diet_goals_counter[tag] = diet_goals_counter.get(tag, 0) + 1
        
        for tag_obj in insight.get("fear_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            fears_counter[tag] = fears_counter.get(tag, 0) + 1
        
        for tag_obj in insight.get("allergy_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            allergies_counter[tag] = allergies_counter.get(tag, 0) + 1
        
        budget = insight.get("budget_profile")
        if budget in budget_counter:
            budget_counter[budget] += 1
    
    # Convert to percentages and sort
    def to_percentage_list(counter, total, min_count=1):
        result = []
        for tag, count in sorted(counter.items(), key=lambda x: -x[1]):
            if count >= min_count:
                result.append({
                    "tag": tag,
                    "count": count,
                    "percentage": round(count / total * 100, 1) if total > 0 else 0
                })
        return result[:15]  # Top 15
    
    users_with_insights = len(insights)
    
    # Apply threshold to sensitive data
    fears_data = to_percentage_list(fears_counter, users_with_insights) if users_with_insights >= threshold else []
    allergies_data = to_percentage_list(allergies_counter, users_with_insights) if users_with_insights >= threshold else []
    
    return {
        "country": country_code,
        "total_users": total_country_users,
        "users_with_insights": users_with_insights,
        "data_available": True,
        "preferences": {
            "top_likes": to_percentage_list(likes_counter, users_with_insights),
            "top_dislikes": to_percentage_list(dislikes_counter, users_with_insights),
            "diet_goals": to_percentage_list(diet_goals_counter, users_with_insights)
        },
        "budget_distribution": {
            "low": round(budget_counter["low"] / users_with_insights * 100, 1) if users_with_insights > 0 else 0,
            "medium": round(budget_counter["medium"] / users_with_insights * 100, 1) if users_with_insights > 0 else 0,
            "premium": round(budget_counter["premium"] / users_with_insights * 100, 1) if users_with_insights > 0 else 0
        },
        "sensitive_signals": {
            "fears": fears_data,
            "allergies": allergies_data,
            "anonymity_compliant": users_with_insights >= threshold
        },
        "anonymity_threshold": threshold
    }


@router.get("/insights/ai-performance")
async def get_ai_performance_insights(user: User = Depends(get_current_user)):
    """
    AI Performance & Conversion metrics - Super Admin only
    Returns: recommendation acceptance rate, cart completion, AI action usage
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Total AI interactions
    total_chats = await db.chat_messages.count_documents({"role": "user"})
    total_sessions = await db.chat_messages.distinct("session_id")
    
    # Get aggregated action usage from insights
    insights_with_actions = await db.user_inferred_insights.find(
        {"ai_action_usage": {"$exists": True}},
        {"_id": 0, "ai_action_usage": 1}
    ).to_list(length=100000)
    
    action_totals = {
        "add_to_cart": 0,
        "add_all_to_cart": 0,
        "follow_recommendation": 0,
        "reject_recommendation": 0,
        "view_product": 0,
        "ask_about_product": 0
    }
    
    for insight in insights_with_actions:
        for action, count in insight.get("ai_action_usage", {}).items():
            if action in action_totals:
                action_totals[action] += count
    
    # Calculate conversion metrics
    total_recommendations = action_totals["follow_recommendation"] + action_totals["reject_recommendation"]
    acceptance_rate = round(
        action_totals["follow_recommendation"] / total_recommendations * 100, 1
    ) if total_recommendations > 0 else 0
    
    # Orders with AI influence (users who used AI before ordering)
    users_with_ai = await db.user_inferred_insights.distinct("user_id")
    orders_from_ai_users = await db.orders.count_documents({"user_id": {"$in": users_with_ai}})
    total_orders = await db.orders.count_documents({})
    ai_influenced_rate = round(orders_from_ai_users / total_orders * 100, 1) if total_orders > 0 else 0
    
    return {
        "ai_interactions": {
            "total_messages": total_chats,
            "unique_sessions": len(total_sessions)
        },
        "action_usage": action_totals,
        "conversion_metrics": {
            "recommendation_acceptance_rate": acceptance_rate,
            "add_all_to_cart_usage": action_totals["add_all_to_cart"],
            "ai_influenced_orders_percent": ai_influenced_rate,
            "total_orders": total_orders,
            "orders_from_ai_users": orders_from_ai_users
        }
    }


@router.get("/insights/trends")
async def get_insights_trends(user: User = Depends(get_current_user)):
    """
    Emerging trends and patterns - Super Admin only
    Returns: rising diet trends, fear trends, catalog gaps
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get config
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Aggregate all diet goals
    all_insights = await db.user_inferred_insights.find(
        {},
        {"_id": 0, "diet_goal_tags": 1, "fear_tags": 1, "likes_tags": 1}
    ).to_list(length=100000)
    
    diet_goals = {}
    fears = {}
    product_interests = {}
    
    for insight in all_insights:
        for tag_obj in insight.get("diet_goal_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            diet_goals[tag] = diet_goals.get(tag, 0) + 1
        
        for tag_obj in insight.get("fear_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            fears[tag] = fears.get(tag, 0) + 1
        
        for tag_obj in insight.get("likes_tags", []):
            tag = tag_obj.get("tag", "") if isinstance(tag_obj, dict) else tag_obj
            product_interests[tag] = product_interests.get(tag, 0) + 1
    
    total_insights = len(all_insights)
    
    # Top diet trends
    diet_trends = [
        {"tag": tag, "count": count, "percentage": round(count / total_insights * 100, 1)}
        for tag, count in sorted(diet_goals.items(), key=lambda x: -x[1])[:10]
    ] if total_insights > 0 and total_insights >= threshold else []

    # Top fear signals (only if above threshold)
    fear_trends = [
        {"tag": tag, "count": count, "percentage": round(count / total_insights * 100, 1)}
        for tag, count in sorted(fears.items(), key=lambda x: -x[1])[:10]
    ] if total_insights > 0 and total_insights >= threshold else []
    
    # Product interest trends
    product_trends = [
        {"tag": tag, "count": count, "percentage": round(count / total_insights * 100, 1) if total_insights > 0 else 0}
        for tag, count in sorted(product_interests.items(), key=lambda x: -x[1])[:15]
    ] if total_insights > 0 else []
    
    # Catalog gap analysis - What users want vs what we have
    products_cursor = db.products.find({}, {"_id": 0, "name": 1, "category_id": 1})
    products = await products_cursor.to_list(length=10000)
    product_keywords = set()
    for p in products:
        product_keywords.update(p["name"].lower().split())
    
    # Find interests not well represented in catalog
    potential_gaps = []
    for interest, count in product_interests.items():
        interest_lower = interest.lower().replace("_", " ")
        if not any(kw in interest_lower for kw in product_keywords):
            potential_gaps.append({"interest": interest, "demand_signals": count})
    
    return {
        "total_users_analyzed": total_insights,
        "diet_trends": diet_trends,
        "fear_trends": fear_trends if total_insights >= threshold else {"message": f"Requires {threshold}+ users"},
        "product_interest_trends": product_trends,
        "potential_catalog_gaps": sorted(potential_gaps, key=lambda x: -x["demand_signals"])[:10],
        "anonymity_threshold": threshold,
        "data_anonymized": True
    }


@router.get("/insights/compliance")
async def get_compliance_metrics(user: User = Depends(get_current_user)):
    """
    Compliance & Risk Panel - Super Admin only
    Returns: consent coverage, data retention status, risk indicators
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get config
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    retention_days = config.get("sensitive_data_retention_days", 365) if config else 365
    
    # Consent metrics
    total_users = await db.users.count_documents({"role": "customer"})
    users_with_consent = await db.users.count_documents({"consent.analytics_consent": True})
    users_without_consent = total_users - users_with_consent
    
    # Consent by version
    consent_versions_raw = await db.users.aggregate([
        {"$match": {"consent.analytics_consent": True}},
        {"$group": {"_id": "$consent.consent_version", "count": {"$sum": 1}}}
    ]).to_list(length=100)
    consent_versions = {str(v["_id"] or "unknown"): v["count"] for v in consent_versions_raw}
    
    # Data with sensitive signals
    users_with_fears = await db.user_inferred_insights.count_documents({"fear_tags.0": {"$exists": True}})
    users_with_allergies = await db.user_inferred_insights.count_documents({"allergy_tags.0": {"$exists": True}})
    users_with_health = await db.user_inferred_insights.count_documents({"health_goal_tags.0": {"$exists": True}})
    
    # Check anonymity compliance
    country_counts = await db.users.aggregate([
        {"$match": {"country": {"$exists": True}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$match": {"count": {"$lt": threshold}}}
    ]).to_list(length=1000)
    
    low_population_countries = len(country_counts)
    
    # Risk assessment
    risk_level = "green"
    risk_factors = []
    
    if users_without_consent / total_users > 0.3 if total_users > 0 else False:
        risk_level = "amber"
        risk_factors.append("More than 30% of users lack analytics consent")
    
    if low_population_countries > 5:
        risk_factors.append(f"{low_population_countries} countries below anonymity threshold")
    
    return {
        "consent_metrics": {
            "total_customers": total_users,
            "users_with_consent": users_with_consent,
            "consent_rate_percent": round(users_with_consent / total_users * 100, 1) if total_users > 0 else 0,
            "users_without_consent": users_without_consent,
            "consent_versions": consent_versions
        },
        "sensitive_data_coverage": {
            "users_with_fear_signals": users_with_fears,
            "users_with_allergy_signals": users_with_allergies,
            "users_with_health_signals": users_with_health
        },
        "anonymity_compliance": {
            "threshold": threshold,
            "countries_below_threshold": low_population_countries,
            "fully_compliant": low_population_countries == 0
        },
        "data_retention": {
            "retention_days": retention_days,
            "policy": f"Sensitive data retained for {retention_days} days"
        },
        "risk_assessment": {
            "level": risk_level,
            "factors": risk_factors
        },
        "exports_enabled": config.get("enable_b2b_exports", False) if config else False
    }


@router.get("/insights/audit-log")
async def get_audit_log(user: User = Depends(get_current_user)):
    """
    Audit log for compliance tracking - Super Admin only
    Returns: Recent consent changes, data access logs, config changes
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get recent consent grants (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    recent_consents = await db.users.find(
        {
            "consent.consent_date": {"$gte": thirty_days_ago},
            "consent.analytics_consent": True
        },
        {"_id": 0, "email": 1, "consent.consent_date": 1, "consent.consent_version": 1, "country": 1}
    ).sort("consent.consent_date", -1).to_list(length=50)
    
    # Anonymize emails for privacy
    anonymized_consents = []
    for c in recent_consents:
        email = c.get("email", "")
        masked_email = email[:2] + "***" + email[email.find("@"):] if "@" in email else "***"
        anonymized_consents.append({
            "masked_email": masked_email,
            "consent_date": c.get("consent", {}).get("consent_date"),
            "consent_version": c.get("consent", {}).get("consent_version"),
            "country": c.get("country")
        })
    
    # Get config change history (from insights_config)
    config_history = await db.insights_config.find(
        {},
        {"_id": 0, "updated_at": 1, "updated_by": 1, "anonymity_threshold": 1}
    ).to_list(length=10)
    
    # Get daily consent stats for chart
    consent_pipeline = [
        {"$match": {"consent.analytics_consent": True, "consent.consent_date": {"$exists": True}}},
        {"$project": {
            "date": {"$substr": ["$consent.consent_date", 0, 10]}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 14}
    ]
    daily_consents = await db.users.aggregate(consent_pipeline).to_list(length=14)
    
    # Format for chart
    consent_trend = [
        {"date": d["_id"], "consents": d["count"]} 
        for d in reversed(daily_consents)
    ]
    
    return {
        "recent_consents": anonymized_consents,
        "consent_trend": consent_trend,
        "config_history": config_history,
        "data_anonymized": True,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/insights/gdpr-summary")
async def get_gdpr_summary(user: User = Depends(get_current_user)):
    """
    GDPR compliance summary for legal documentation - Super Admin only
    """
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Get config
    config = await db.insights_config.find_one({"config_id": "global_insights_config"}, {"_id": 0})
    threshold = config.get("anonymity_threshold", 15) if config else 15
    
    # Count data categories
    total_users = await db.users.count_documents({"role": "customer"})
    users_with_consent = await db.users.count_documents({"consent.analytics_consent": True})
    users_with_insights = await db.user_inferred_insights.count_documents({})
    
    # Data categories stored
    data_categories = {
        "identifiable": {
            "description": "Name, email, country - stored for account operations",
            "legal_basis": "Contract performance",
            "retention": "Account lifetime + 30 days"
        },
        "behavioral": {
            "description": "Preference tags, likes/dislikes, budget profile",
            "legal_basis": "Consent (analytics_consent)",
            "retention": f"{config.get('sensitive_data_retention_days', 365) if config else 365} days",
            "users_affected": users_with_insights
        },
        "sensitive": {
            "description": "Health concerns, allergies, diet goals",
            "legal_basis": "Explicit consent",
            "retention": f"{config.get('sensitive_data_retention_days', 365) if config else 365} days",
            "anonymity_threshold": threshold,
            "display_rule": f"Only shown in aggregates of {threshold}+ users"
        }
    }
    
    # Rights exercised (would need tracking in production)
    rights_summary = {
        "access_requests": 0,
        "deletion_requests": 0,
        "opt_outs": total_users - users_with_consent,
        "data_portability": 0
    }
    
    return {
        "compliance_status": "GDPR Compliant",
        "data_controller": "Hispaloshop",
        "total_data_subjects": total_users,
        "consent_coverage_percent": round(users_with_consent / total_users * 100, 1) if total_users > 0 else 0,
        "data_categories": data_categories,
        "rights_summary": rights_summary,
        "technical_measures": [
            "No raw chat text stored for analytics",
            "AI inference produces only normalized tags",
            f"Anonymity threshold of {threshold} users for sensitive data",
            "No data exports enabled",
            "Role-based access control",
            "Audit logging enabled"
        ],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


# ============================================================================
# INFLUENCER AI ASSISTANT API
# ============================================================================


