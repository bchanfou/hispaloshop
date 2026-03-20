"""
Algoritmo de feed social de Hispaloshop.
Objetivo: Maximizar tiempo en plataforma y conversion a compra.
Fase 3: Social Feed — Enhanced with category affinity, cold-start,
content-type diversity scoring, and stricter diversity enforcement.
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from core.database import get_db


class FeedAlgorithm:
    """
    Score = (Recency x W_r) + (Engagement x W_e) + (Personalizacion x W_p) + (Serendipia x W_s)

    Weights adapt based on user maturity (cold-start vs established).
    """

    DEFAULT_WEIGHTS = {
        'recency': 0.25,
        'engagement': 0.30,
        'personalization': 0.35,
        'serendipity': 0.10,
    }

    COLD_START_WEIGHTS = {
        'recency': 0.25,
        'engagement': 0.30,
        'personalization': 0.05,
        'serendipity': 0.40,
    }

    COLD_START_THRESHOLD = 5  # interactions (likes + comments + saves)

    def __init__(self):
        self.weights = dict(self.DEFAULT_WEIGHTS)

    async def generate_feed(
        self,
        user_id: str,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        feed_type: str = "for_you"
    ) -> List[Dict]:
        """Genera feed personalizado para el usuario"""
        db = get_db()

        # Obtener usuarios que sigue
        following = await db.follows.find({
            "follower_id": user_id,
            "tenant_id": tenant_id
        }).to_list(length=1000)
        following_ids = [f["following_id"] for f in following]

        # Construir query base
        base_query = {
            "tenant_id": tenant_id,
            "status": "published",
            "is_story": False
        }

        if feed_type == "following":
            base_query["author_id"] = {"$in": following_ids}
        elif feed_type == "trending":
            base_query["is_viral"] = True
            base_query["published_at"] = {
                "$gte": datetime.now(timezone.utc) - timedelta(hours=48)
            }

        # Obtener candidatos
        from bson.objectid import ObjectId
        candidates = await db.posts.find(base_query)\
            .sort("published_at", -1)\
            .limit(limit * 3)\
            .to_list(length=limit * 3)

        # Get user's country and preferences for local boost
        user_doc_full = await db.users.find_one({"user_id": user_id}, {"_id": 0, "country": 1, "consumer_data": 1})
        user_country = (user_doc_full or {}).get("country") or "ES"

        # Check if country has enough local producers to apply boost
        local_producer_count = await db.users.count_documents({
            "role": {"$in": ["producer", "importer"]},
            "country": user_country,
            "approved": True,
        })
        apply_country_boost = local_producer_count >= 10

        # --- Cold-start detection ---
        total_interactions = await db.feed_interactions.count_documents({
            "user_id": user_id,
            "action_type": {"$in": ["like_post", "save_post", "comment_post"]},
        })
        is_cold_start = total_interactions < self.COLD_START_THRESHOLD
        active_weights = self.COLD_START_WEIGHTS if is_cold_start else self.DEFAULT_WEIGHTS

        # --- Category affinity from purchase history ---
        category_scores = await self._build_category_affinity(user_id, db)

        # --- Batch fetch to eliminate N+1 queries ---
        # Batch fetch all unique author docs
        author_ids = list({str(c.get("author_id", "")) for c in candidates if c.get("author_id")})
        author_docs = await db.users.find({"user_id": {"$in": author_ids}}, {"_id": 0, "user_id": 1, "country": 1}).to_list(200)
        author_cache = {a.get("user_id", ""): a for a in author_docs}

        # Batch fetch all unique product categories from tagged_products
        all_tagged_pids = []
        for c in candidates:
            for tp in c.get("tagged_products", []):
                if tp.get("product_id"):
                    all_tagged_pids.append(tp["product_id"])
        product_category_cache = {}
        if all_tagged_pids:
            prod_docs = await db.products.find({"_id": {"$in": list(set(all_tagged_pids))}}, {"_id": 1, "category_id": 1}).to_list(500)
            product_category_cache = {str(p["_id"]): p.get("category_id") for p in prod_docs}

        # --- Track recent content types for diversity scoring ---
        recent_types = await self._get_recent_shown_types(user_id, db)

        # Scorear cada post
        scored_posts = []
        for post in candidates:
            score = await self._calculate_score(
                post, user_id, following_ids, tenant_id,
                user_country=user_country if apply_country_boost else None,
                user_doc_full=user_doc_full,
                author_cache=author_cache,
                product_category_cache=product_category_cache,
                active_weights=active_weights,
                category_scores=category_scores,
                recent_types=recent_types,
            )
            scored_posts.append({
                "post": post,
                "score": score,
                "reason": score.get("reason", "Personalizado")
            })

        # Ordenar por score
        scored_posts.sort(key=lambda x: x["score"]["total"], reverse=True)

        # Diversificar — enhanced: producer, content type, and category diversity
        diversified = self._diversify_feed(scored_posts, max_same_author=2)

        # Paginar
        start = (page - 1) * limit
        end = start + limit

        return diversified[start:end]

    async def _build_category_affinity(self, user_id: str, db) -> Dict[str, float]:
        """
        Build category affinity scores from purchase history.
        Returns dict {category_id: weight} where weight is proportional
        to number of items purchased in that category.
        """
        category_scores: Dict[str, float] = {}
        try:
            orders = await db.orders.find(
                {"user_id": user_id, "status": {"$in": ["paid", "completed", "shipped", "delivered"]}},
                {"items": 1}
            ).to_list(length=50)

            cat_counts: Dict[str, int] = {}
            total = 0
            for order in orders:
                for item in order.get("items", []):
                    cat_id = item.get("category_id")
                    if cat_id:
                        cat_counts[cat_id] = cat_counts.get(cat_id, 0) + 1
                        total += 1

            if total > 0:
                for cat_id, count in cat_counts.items():
                    category_scores[cat_id] = count / total
        except Exception:
            pass

        return category_scores

    async def _get_recent_shown_types(self, user_id: str, db) -> List[str]:
        """
        Get last 5 content types shown to the user for diversity scoring.
        Returns list like ['post', 'post', 'reel', 'post', 'product'].
        """
        try:
            recent = await db.feed_interactions.find(
                {"user_id": user_id, "action_type": {"$in": ["view_post", "view_reel", "view_product"]}},
                {"action_type": 1}
            ).sort("created_at", -1).limit(5).to_list(length=5)

            type_map = {"view_post": "post", "view_reel": "reel", "view_product": "product"}
            return [type_map.get(r.get("action_type", ""), "post") for r in recent]
        except Exception:
            return []

    async def _calculate_score(
        self,
        post: Dict,
        user_id: str,
        following_ids: List[str],
        tenant_id: str,
        user_country: str = None,
        user_doc_full: Dict = None,
        author_cache: Dict = None,
        product_category_cache: Dict = None,
        active_weights: Dict = None,
        category_scores: Dict = None,
        recent_types: List = None,
    ) -> Dict:
        """Calcula score multidimensional de un post"""
        db = get_db()
        scores = {}
        weights = active_weights or self.DEFAULT_WEIGHTS
        if category_scores is None:
            category_scores = {}
        if recent_types is None:
            recent_types = []

        # 1. RECENCY (0-100)
        published_at = post.get("published_at", datetime.now(timezone.utc))
        if isinstance(published_at, str):
            try:
                published_at = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            except Exception:
                published_at = datetime.now(timezone.utc)

        age_hours = (datetime.now(timezone.utc) - published_at).total_seconds() / 3600
        if age_hours < 1:
            scores['recency'] = 100
        elif age_hours < 24:
            scores['recency'] = 80 - (age_hours * 2)
        elif age_hours < 72:
            scores['recency'] = 50 - (age_hours * 0.5)
        else:
            scores['recency'] = max(10, 30 - age_hours * 0.1)

        # 2. ENGAGEMENT (0-100)
        engagement_score = min(100, (
            post.get("likes_count", 0) +
            post.get("comments_count", 0) * 2 +
            post.get("shares_count", 0) * 3 +
            post.get("saves_count", 0) * 2
        ) / 10)

        if post.get("is_viral"):
            engagement_score = min(100, engagement_score * 1.3)

        scores['engagement'] = engagement_score

        # 3. PERSONALIZACION (0-100)
        personalization_score = 50

        # Si sigue al autor
        author_id = str(post.get("author_id"))
        if author_id in following_ids:
            personalization_score += 30

        # Interacciones previas con productos similares
        tagged_product_ids = [tp.get("product_id") for tp in post.get("tagged_products", []) if tp.get("product_id")]
        if tagged_product_ids:
            similar_interactions = await db.feed_interactions.count_documents({
                "user_id": user_id,
                "action_type": {"$in": ["like_post", "save_post", "quick_buy_from_post"]},
                "product_id": {"$in": tagged_product_ids}
            })
            personalization_score += min(20, similar_interactions * 5)

        # Categorias preferidas (use cached user doc)
        post_categories = []
        if user_doc_full:
            preferred_categories = user_doc_full.get("consumer_data", {}).get("preferences", {}).get("categories", [])
            for tp in post.get("tagged_products", []):
                pid = tp.get("product_id")
                if pid and product_category_cache is not None:
                    cat = product_category_cache.get(str(pid))
                    if cat:
                        post_categories.append(cat)

            category_match = len(set(preferred_categories) & set(post_categories))
            personalization_score += category_match * 10

        # Category affinity boost — from purchase history
        if category_scores and post_categories:
            best_affinity = max((category_scores.get(cat, 0) for cat in post_categories), default=0)
            # Up to +15 points for strong category affinity
            personalization_score += best_affinity * 15

        # Country boost: prioritize local producers' content (use cached author doc)
        if user_country:
            author_doc = (author_cache or {}).get(str(post.get("author_id")))
            if author_doc and author_doc.get("country") == user_country:
                personalization_score *= 1.5

        scores['personalization'] = min(100, personalization_score)

        # 4. SERENDIPIA (0-100)
        serendipity_score = random.uniform(20, 80)
        if author_id not in following_ids:
            serendipity_score += 20

        # Content type diversity bonus — if recent feed was dominated by one type,
        # boost different types for variety
        content_type = post.get("content_type", "post")
        if recent_types and len(recent_types) >= 3:
            last_3 = recent_types[:3]
            if all(t == last_3[0] for t in last_3) and content_type != last_3[0]:
                serendipity_score += 15

        scores['serendipity'] = min(100, serendipity_score)

        # Total ponderado
        total = (
            scores['recency'] * weights['recency'] +
            scores['engagement'] * weights['engagement'] +
            scores['personalization'] * weights['personalization'] +
            scores['serendipity'] * weights['serendipity']
        )

        # Razon principal
        max_score = max(scores, key=scores.get)
        reason_map = {
            'recency': 'Reciente',
            'engagement': 'Popular',
            'personalization': 'Para ti',
            'serendipity': 'Descubre'
        }

        return {
            'total': total,
            'breakdown': scores,
            'reason': reason_map.get(max_score, 'Personalizado')
        }

    def _diversify_feed(self, scored_posts: List[Dict], max_same_author: int = 2) -> List[Dict]:
        """
        Evita monotonia — enforces multiple diversity rules:
        1. Max 2 consecutive from same producer/author
        2. No more than 3 of the same content type in a row
        3. No more than 3 from the same category in a row
        """
        if not scored_posts:
            return []

        result = []
        deferred = []
        author_counts = {}

        for item in scored_posts:
            author = str(item["post"].get("author_id", ""))
            author_counts[author] = author_counts.get(author, 0) + 1

            if author_counts[author] <= max_same_author:
                result.append(item)
            else:
                deferred.append(item)

        # Second pass: enforce content type and category rotation
        final = []
        remaining = list(result) + list(deferred)

        for item in remaining:
            if self._would_violate_diversity(final, item):
                # Try to find a better position later
                deferred.append(item)
                continue
            final.append(item)

        # Append anything deferred (better to show than to drop)
        seen_ids = {id(i) for i in final}
        for item in deferred:
            if id(item) not in seen_ids:
                final.append(item)
                seen_ids.add(id(item))

        return final

    def _would_violate_diversity(self, current_feed: List[Dict], candidate: Dict) -> bool:
        """
        Check if adding candidate would violate diversity constraints:
        - Max 2 consecutive same author
        - Max 3 consecutive same content_type
        - Max 3 consecutive same category
        """
        if len(current_feed) < 2:
            return False

        post = candidate["post"]

        # Check consecutive author (max 2)
        author = str(post.get("author_id", ""))
        if len(current_feed) >= 2:
            last_authors = [str(current_feed[-i]["post"].get("author_id", "")) for i in range(1, min(3, len(current_feed) + 1))]
            if len(last_authors) >= 2 and all(a == author for a in last_authors[:2]):
                return True

        # Check consecutive content type (max 3)
        content_type = post.get("content_type", "post")
        if len(current_feed) >= 3:
            last_types = [current_feed[-i]["post"].get("content_type", "post") for i in range(1, 4)]
            if all(t == content_type for t in last_types):
                return True

        # Check consecutive category (max 3)
        post_cats = set()
        for tp in post.get("tagged_products", []):
            cat = tp.get("category_id")
            if cat:
                post_cats.add(cat)

        if post_cats and len(current_feed) >= 3:
            consecutive_cat_match = 0
            for i in range(1, min(4, len(current_feed) + 1)):
                prev_cats = set()
                for tp in current_feed[-i]["post"].get("tagged_products", []):
                    cat = tp.get("category_id")
                    if cat:
                        prev_cats.add(cat)
                if prev_cats & post_cats:
                    consecutive_cat_match += 1
                else:
                    break
            if consecutive_cat_match >= 3:
                return True

        return False

    async def mark_viral_posts(self, tenant_id: str):
        """Job periodico: marca posts como virales"""
        db = get_db()
        VIRAL_THRESHOLD = 100

        posts = await db.posts.find({
            "tenant_id": tenant_id,
            "is_viral": False,
            "status": "published",
            "published_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
        }).to_list(length=1000)

        viral_count = 0
        for post in posts:
            engagement_score = (
                post.get("likes_count", 0) +
                post.get("comments_count", 0) * 2 +
                post.get("shares_count", 0) * 3
            )

            if engagement_score >= VIRAL_THRESHOLD:
                from bson.objectid import ObjectId
                try:
                    await db.posts.update_one(
                        {"_id": ObjectId(post.get("_id")) if not isinstance(post.get("_id"), ObjectId) else post.get("_id")},
                        {"$set": {"is_viral": True}}
                    )
                    viral_count += 1
                except Exception:
                    pass

        return {"marked_viral": viral_count}

    async def log_interaction(
        self,
        user_id: str,
        tenant_id: str,
        action_type: str,
        post_id: Optional[str] = None,
        product_id: Optional[str] = None,
        dwell_time: Optional[float] = None,
        session_id: Optional[str] = None
    ):
        """Loguea interaccion para entrenar algoritmo"""
        db = get_db()

        await db.feed_interactions.insert_one({
            "tenant_id": tenant_id,
            "user_id": user_id,
            "action_type": action_type,
            "post_id": post_id,
            "product_id": product_id,
            "dwell_time_seconds": dwell_time,
            "session_id": session_id or str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc)
        })

        # Actualizar last_engagement_at en post
        if post_id:
            from bson.objectid import ObjectId
            try:
                await db.posts.update_one(
                    {"_id": ObjectId(post_id) if isinstance(post_id, str) else post_id},
                    {"$set": {"last_engagement_at": datetime.now(timezone.utc)}}
                )
            except Exception:
                pass


# Instancia global
feed_algorithm = FeedAlgorithm()
