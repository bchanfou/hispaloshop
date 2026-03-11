"""
Trust & Safety — Moderation Service (S24)
Risk scoring, food safety checks, review fraud detection, reputation & trust scoring.
All functions are lightweight and synchronous for fast pre-publish checks,
except async helpers that query MongoDB.
"""
import re
from datetime import datetime, timezone, timedelta
from typing import Tuple, List

from core.database import db

# ── Patterns that increase risk score ────────────────────────────────

_SPAM_PATTERNS = [
    r"(https?://\S+){3,}",          # 3+ URLs in text
    r"(.)\1{6,}",                    # character repetition aaaaaa
    r"[A-Z]{20,}",                   # long ALL-CAPS sequences
    r"\b(gana|dinero fácil|gratis|click aquí|winner|bitcoin|crypto|oferta urgente)\b",
]

_HIGH_RISK_KEYWORDS_ES = [
    "hack", "fraude", "estafa", "ilegal", "falsificado",
    "droga", "arma", "armas", "explosivo", "tóxico",
]
_HIGH_RISK_KEYWORDS_EN = [
    "hack", "fraud", "scam", "illegal", "counterfeit",
    "drug", "weapon", "explosive", "poison",
]
_ALL_HIGH_RISK = set(_HIGH_RISK_KEYWORDS_ES + _HIGH_RISK_KEYWORDS_EN)

# Required fields every food product must declare
_FOOD_REQUIRED_FIELDS = ["ingredients", "allergens", "origin"]


# ── Content risk scoring ──────────────────────────────────────────────

def score_text_content(text: str) -> Tuple[int, List[str]]:
    """
    Return (risk_score 0–100, flags list) for a piece of text.
    Runs synchronously — safe to call on the hot publish path.
    """
    if not text:
        return 0, []

    score = 0
    flags: List[str] = []
    text_lower = text.lower()

    # Spam patterns
    for pattern in _SPAM_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            score += 15
            if "spam_pattern" not in flags:
                flags.append("spam_pattern")

    # High-risk keywords
    found = [kw for kw in _ALL_HIGH_RISK if kw in text_lower]
    if found:
        score += min(len(found) * 20, 40)
        flags.append("high_risk_keywords")

    # Too short to be meaningful (likely spam filler)
    if len(text.strip()) < 4:
        score += 10
        flags.append("too_short")

    # Excessive special characters
    special = len(re.findall(r"[!?$€£%*#@]", text))
    if len(text) > 0 and special / len(text) > 0.12:
        score += 10
        flags.append("excessive_special_chars")

    return min(score, 100), flags


# ── Food safety ───────────────────────────────────────────────────────

async def check_food_safety(product_data: dict) -> List[str]:
    """
    Return list of missing required food safety fields.
    An empty list means the product passes basic safety checks.
    """
    missing = []
    for field in _FOOD_REQUIRED_FIELDS:
        value = product_data.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return missing


# ── Review fraud detection ────────────────────────────────────────────

async def detect_review_fraud(review: dict) -> Tuple[int, List[str]]:
    """
    Analyse a review dict for fraud signals.
    Returns (risk_score 0–100, flags list).
    """
    score = 0
    flags: List[str] = []

    user_id = review.get("user_id") or review.get("reviewer_id")
    product_id = review.get("product_id")
    review_text = str(review.get("content") or review.get("text") or "").strip()

    if not user_id:
        return 0, []

    now = datetime.now(timezone.utc)

    # 1. Duplicate review for same product
    if product_id:
        dupes = await db.reviews.count_documents({"user_id": user_id, "product_id": product_id})
        if dupes > 1:
            score += 30
            flags.append("duplicate_review")

    # 2. Review burst — many reviews in last 24 h
    recent = await db.reviews.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": now - timedelta(hours=24)},
    })
    if recent > 5:
        score += 25
        flags.append("review_burst")

    # 3. New account (< 7 days old)
    user_doc = await db.users.find_one({"user_id": user_id}, {"created_at": 1}) or {}
    created = user_doc.get("created_at")
    if created:
        age_days = (now - created).days
        if age_days < 7:
            score += 20
            flags.append("new_account")

    # 4. Identical text as an existing review on the same product
    if review_text and len(review_text) > 10 and product_id:
        identical = await db.reviews.count_documents({
            "content": review_text,
            "product_id": product_id,
        })
        if identical > 0:
            score += 40
            flags.append("identical_text")

    # 5. Text risk score (weighted lower — content alone isn't decisive)
    text_score, text_flags = score_text_content(review_text)
    score += text_score // 3
    flags.extend(text_flags)

    return min(score, 100), list(set(flags))


# ── User reputation ───────────────────────────────────────────────────

async def calculate_user_reputation(user_id: str) -> dict:
    """
    Compute a reputation score (0–100) for a user based on platform signals.
    Higher score = more trusted = fewer friction checks.
    """
    now = datetime.now(timezone.utc)
    user_doc = await db.users.find_one({"user_id": user_id}, {"created_at": 1, "verified": 1}) or {}

    score = 50  # neutral baseline

    # Account age (+1 per month, capped at +20)
    created = user_doc.get("created_at", now)
    age_days = max((now - created).days, 0) if created else 0
    score += min(age_days // 30, 20)

    # Verified purchases (+2 per delivered order, capped at +15)
    delivered = await db.orders.count_documents({"user_id": user_id, "status": "delivered"})
    score += min(delivered * 2, 15)

    # Dispute history (−10 per dispute, capped at −30)
    disputes = await db.support_cases.count_documents({"user_id": user_id, "issue_type": "dispute"})
    score -= min(disputes * 10, 30)

    # Confirmed reports received (−15 each, capped at −40)
    confirmed_reports = await db.reports.count_documents({
        "content_owner_id": user_id,
        "status": "confirmed",
    })
    score -= min(confirmed_reports * 15, 40)

    # Verified badge bonus
    if user_doc.get("verified"):
        score += 10

    final = max(0, min(100, score))
    return {
        "user_id": user_id,
        "reputation_score": final,
        "tier": _reputation_tier(final),
        "factors": {
            "account_age_days": age_days,
            "verified_purchases": delivered,
            "disputes": disputes,
            "confirmed_reports": confirmed_reports,
        },
    }


# ── Seller trust score ────────────────────────────────────────────────

async def calculate_seller_trust(seller_id: str) -> dict:
    """
    Compute a trust score (0–100) for a producer/importer.
    Used to calibrate moderation scrutiny on their listings.
    """
    total_orders = await db.orders.count_documents({"seller_id": seller_id})
    fulfilled = await db.orders.count_documents({"seller_id": seller_id, "status": "delivered"})
    fulfillment_rate = (fulfilled / total_orders * 100) if total_orders > 0 else 50.0

    disputes = await db.support_cases.count_documents({"seller_id": seller_id})
    dispute_rate = (disputes / total_orders * 100) if total_orders > 0 else 0.0

    pipeline = [
        {"$match": {"seller_id": seller_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    avg_rating = float((result[0]["avg"] if result else None) or 3.0)

    fraud_reports = await db.reports.count_documents({
        "content_owner_id": seller_id,
        "reason": "fraud",
        "status": "confirmed",
    })

    score = 50.0
    score += (fulfillment_rate - 50) * 0.3      # fulfillment contribution (±15)
    score += (avg_rating - 3.0) * 10            # rating contribution (±20)
    score -= dispute_rate * 2                    # dispute penalty
    score -= fraud_reports * 15                  # fraud report penalty

    final = max(0, min(100, round(score)))
    return {
        "seller_id": seller_id,
        "trust_score": final,
        "tier": _trust_tier(final),
        "factors": {
            "total_orders": total_orders,
            "fulfillment_rate": round(fulfillment_rate, 1),
            "dispute_rate": round(dispute_rate, 1),
            "avg_rating": round(avg_rating, 2),
            "fraud_reports": fraud_reports,
        },
    }


# ── Tier labels ───────────────────────────────────────────────────────

def _reputation_tier(score: int) -> str:
    if score >= 80:
        return "confiable"
    if score >= 50:
        return "estándar"
    if score >= 20:
        return "bajo"
    return "restringido"


def _trust_tier(score: int) -> str:
    if score >= 80:
        return "verificado"
    if score >= 60:
        return "bueno"
    if score >= 40:
        return "estándar"
    if score >= 20:
        return "bajo"
    return "en revisión"
