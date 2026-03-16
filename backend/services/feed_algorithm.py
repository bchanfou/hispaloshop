"""
Algoritmo de feed social de Hispaloshop.
Objetivo: Maximizar tiempo en plataforma y conversion a compra.
Fase 3: Social Feed
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from core.database import get_db


class FeedAlgorithm:
    """
    Score = (Recency x 0.25) + (Engagement x 0.30) + (Personalizacion x 0.35) + (Serendipia x 0.10)
    """
    
    def __init__(self):
        self.weights = {
            'recency': 0.25,
            'engagement': 0.30,
            'personalization': 0.35,
            'serendipity': 0.10
        }
    
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

        # --- Batch fetch to eliminate N+1 queries ---
        # Batch fetch all unique author docs
        author_ids = list({str(c.get("author_id", "")) for c in candidates if c.get("author_id")})
        author_docs = await db.users.find({"user_id": {"$in": author_ids}}, {"_id": 0, "user_id": 1, "country": 1}).to_list(200)
        author_cache = {a["user_id"]: a for a in author_docs}

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

        # Scorear cada post
        scored_posts = []
        for post in candidates:
            score = await self._calculate_score(
                post, user_id, following_ids, tenant_id,
                user_country=user_country if apply_country_boost else None,
                user_doc_full=user_doc_full,
                author_cache=author_cache,
                product_category_cache=product_category_cache,
            )
            scored_posts.append({
                "post": post,
                "score": score,
                "reason": score.get("reason", "Personalizado")
            })
        
        # Ordenar por score
        scored_posts.sort(key=lambda x: x["score"]["total"], reverse=True)
        
        # Diversificar
        diversified = self._diversify_feed(scored_posts, max_same_author=2)
        
        # Paginar
        start = (page - 1) * limit
        end = start + limit
        
        return diversified[start:end]
    
    async def _calculate_score(
        self,
        post: Dict,
        user_id: str,
        following_ids: List[str],
        tenant_id: str,
        user_country: str = None,
        user_doc_full: Dict = None,
        author_cache: Dict = None,
        product_category_cache: Dict = None
    ) -> Dict:
        """Calcula score multidimensional de un post"""
        db = get_db()
        scores = {}

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
        if user_doc_full:
            preferred_categories = user_doc_full.get("consumer_data", {}).get("preferences", {}).get("categories", [])
            post_categories = []
            for tp in post.get("tagged_products", []):
                pid = tp.get("product_id")
                if pid and product_category_cache is not None:
                    cat = product_category_cache.get(str(pid))
                    if cat:
                        post_categories.append(cat)

            category_match = len(set(preferred_categories) & set(post_categories))
            personalization_score += category_match * 10

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
        
        scores['serendipity'] = min(100, serendipity_score)
        
        # Total ponderado
        total = (
            scores['recency'] * self.weights['recency'] +
            scores['engagement'] * self.weights['engagement'] +
            scores['personalization'] * self.weights['personalization'] +
            scores['serendipity'] * self.weights['serendipity']
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
        """Evita monotonia"""
        result = []
        author_counts = {}
        
        for item in scored_posts:
            author = str(item["post"].get("author_id"))
            author_counts[author] = author_counts.get(author, 0) + 1
            
            if author_counts[author] <= max_same_author:
                result.append(item)
        
        # Rellenar huecos
        if len(result) < len(scored_posts):
            for item in scored_posts:
                if item not in result:
                    result.append(item)
        
        return result
    
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
