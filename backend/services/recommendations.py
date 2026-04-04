"""
Motor de recomendaciones de Hispaloshop.
Combina: embeddings semanticos, filtrado colaborativo, trending, y reglas de negocio.
Fase 1: AI Recommendations
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple
from core.database import get_db

logger = logging.getLogger(__name__)
from core.models import AIRecommendationCache
from services.ai_embeddings import embedding_service, extract_ai_tags_from_product, calculate_trending_score
import random


class RecommendationEngine:
    """
    Engine hibrido de recomendaciones:
    - 40%: Similitud semantica (embeddings)
    - 30%: Filtrado colaborativo (usuarios similares)
    - 20%: Trending/Tendencias
    - 10%: Diversificacion/descubrimiento
    """
    
    CACHE_TTL_FREE_MINUTES = 60
    CACHE_TTL_PRO_MINUTES = 15
    
    async def get_recommendations(
        self,
        user_id: str,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        refresh: bool = False,
        user_subscription: str = "free"
    ) -> Dict:
        """
        Obtiene recomendaciones personalizadas para el feed del usuario.
        Implementa cache hibrida: usa cache si es valida, sino regenera.
        """
        db = get_db()
        
        # 1. Verificar cache
        if not refresh:
            cached = await self._get_valid_cache(user_id, tenant_id, user_subscription)
            if cached:
                return {
                    "products": await self._fetch_products(cached["product_ids"]),
                    "posts": await self._fetch_posts(cached["post_ids"]),
                    "reasons": cached["reasons"],
                    "confidence_score": cached["confidence_score"],
                    "used_cached": True,
                    "refresh_available_at": cached["expires_at"]
                }
        
        # 2. Generar recomendaciones fresh
        recommendations = await self._generate_fresh_recommendations(
            user_id, tenant_id, limit * 2  # Generar mas para filtrar
        )
        
        # 3. Guardar en cache
        await self._save_cache(
            user_id, tenant_id, recommendations, user_subscription
        )
        
        # 4. Retornar paginado
        start = (page - 1) * limit
        end = start + limit
        
        return {
            "products": recommendations["products"][start:end],
            "posts": recommendations["posts"][start:end//2],  # Menos posts que products
            "reasons": recommendations["reasons"],
            "confidence_score": recommendations["confidence_score"],
            "used_cached": False,
            "refresh_available_at": self._calculate_cache_expiry(user_subscription)
        }
    
    async def _get_valid_cache(
        self, 
        user_id: str, 
        tenant_id: str,
        subscription: str
    ) -> Optional[Dict]:
        """Obtiene cache valida si existe y no expiro"""
        db = get_db()
        
        cache = await db.ai_recommendation_caches.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id
        })
        
        if not cache:
            return None
        
        # Calcular TTL segun suscripcion
        ttl_minutes = (
            self.CACHE_TTL_PRO_MINUTES 
            if (subscription or "").upper() in ["PRO", "ELITE"] 
            else self.CACHE_TTL_FREE_MINUTES
        )
        
        generated_at = cache.get("generated_at", datetime.now(timezone.utc))
        if isinstance(generated_at, str):
            try:
                generated_at = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
            except Exception:
                generated_at = datetime.now(timezone.utc)
        
        expiry = generated_at + timedelta(minutes=ttl_minutes)
        
        if datetime.now(timezone.utc) > expiry:
            return None  # Expiro
        
        return {
            "product_ids": cache.get("product_ids", []),
            "post_ids": cache.get("post_ids", []),
            "reasons": cache.get("reasons", {}),
            "confidence_score": cache.get("confidence_score", 0),
            "expires_at": expiry.isoformat()
        }
    
    async def _generate_fresh_recommendations(
        self,
        user_id: str,
        tenant_id: str,
        limit: int
    ) -> Dict:
        """Genera recomendaciones desde cero usando multiples senales"""
        db = get_db()
        
        # Obtener perfil de usuario
        user = await db.users.find_one({"_id": user_id})
        if not user:
            # Usuario no encontrado, devolver trending
            return await self._get_trending_only(tenant_id, limit)
        
        # Obtener embedding del usuario (o generar si no existe)
        user_embedding = await self._get_or_create_user_embedding(user_id, tenant_id, user)
        
        # 1. Recomendaciones por similitud semantica (40%)
        semantic_products = await self._get_semantic_recommendations(
            user_embedding.get("embedding", []) if user_embedding else [],
            tenant_id, 
            limit // 2
        )
        
        # 2. Filtrado colaborativo (30%)
        collaborative_products = await self._get_collaborative_recommendations(
            user_id, tenant_id, limit // 3
        )
        
        # 3. Trending (20%)
        trending_products = await self._get_trending_recommendations(
            tenant_id, limit // 4, 
            exclude_ids=[str(p.get("_id", p.get("id"))) for p in semantic_products if p.get("_id") or p.get("id")]
        )
        
        # 4. Diversificacion (10%)
        consumer_data = user.get("consumer_data", {})
        discovery_products = await self._get_discovery_recommendations(
            tenant_id, limit // 5, 
            user_preferences=consumer_data.get("preferences", {})
        )
        
        # Merge y ranking
        all_products = self._merge_and_rank(
            semantic_products, collaborative_products, 
            trending_products, discovery_products
        )
        
        # Generar explicaciones ("por que")
        reasons = self._generate_reasons(all_products[:limit], user)
        
        # Calcular score de confianza
        confidence = self._calculate_confidence(
            len(semantic_products), len(collaborative_products), user
        )
        
        # Obtener posts relacionados con productos top
        posts = await self._get_related_posts(
            [str(p.get("_id", p.get("id"))) for p in all_products[:limit//2] if p.get("_id") or p.get("id")], 
            tenant_id
        )
        
        return {
            "products": all_products[:limit],
            "posts": posts,
            "reasons": reasons,
            "confidence_score": confidence
        }
    
    async def _get_semantic_recommendations(
        self,
        user_embedding: List[float],
        tenant_id: str,
        limit: int
    ) -> List[Dict]:
        """Encuentra productos semanticamente similares al perfil del usuario"""
        db = get_db()
        
        if not user_embedding or all(v == 0 for v in user_embedding):
            # Sin embedding, devolver trending
            return await self._get_trending_recommendations(tenant_id, limit)
        
        # Obtener embeddings de productos activos
        product_embeddings = await db.product_embeddings.find({
            "tenant_id": tenant_id
        }).to_list(length=1000)
        
        # Calcular similitud con cada producto
        scored_products = []
        for pe in product_embeddings:
            similarity = embedding_service.cosine_similarity(
                user_embedding, pe.get("embedding", [])
            )
            scored_products.append({
                "product_id": pe.get("product_id"),
                "similarity": similarity,
                "ai_tags": pe.get("ai_tags", [])
            })
        
        # Ordenar por similitud
        scored_products.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Obtener datos completos de productos top
        top_ids = [p.get("product_id", "") for p in scored_products[:limit]]
        if not top_ids:
            return []
        
        from bson.objectid import ObjectId
        object_ids = []
        for pid in top_ids:
            try:
                object_ids.append(ObjectId(pid))
            except Exception:
                pass
        
        products = await db.products.find({
            "_id": {"$in": object_ids},
            "status": {"$in": ["active", "approved"]},
            "$or": [
                {"stock_quantity": {"$gt": 0}},
                {"stock": {"$gt": 0}}
            ]
        }).to_list(length=limit)
        
        # Anadir score de similitud
        for p in products:
            pid = str(p.get("_id"))
            pe = next((x for x in scored_products if x["product_id"] == pid), None)
            p["similarity_score"] = pe["similarity"] if pe else 0
            p["id"] = pid
        
        return products
    
    async def _get_collaborative_recommendations(
        self,
        user_id: str,
        tenant_id: str,
        limit: int
    ) -> List[Dict]:
        """
        Filtrado colaborativo simple:
        Usuarios con compras similares -> que mas compraron
        """
        db = get_db()
        
        # Obtener categorias de compras del usuario
        user_orders = await db.orders.find({
            "customer_id": user_id
        }).to_list(length=50)
        
        user_product_ids = set()
        for order in user_orders:
            for item in order.get("items", []):
                pid = item.get("product_id")
                if pid:
                    user_product_ids.add(pid)

        # Batch fetch categories for all purchased products (replaces N+1 find_one loop)
        user_categories = set()
        if user_product_ids:
            products = await db.products.find(
                {"_id": {"$in": list(user_product_ids)}},
                {"category_id": 1},
            ).to_list(len(user_product_ids))
            for p in products:
                if p.get("category_id"):
                    user_categories.add(p["category_id"])

        if not user_categories:
            return []  # Sin historial, no hay colaborativo
        
        # Encontrar usuarios que compraron en mismas categorias
        similar_users_pipeline = [
            {"$match": {
                "customer_id": {"$ne": user_id},
                "tenant_id": tenant_id,
            }},
            {"$unwind": "$items"},
            {"$lookup": {
                "from": "products",
                "localField": "items.product_id",
                "foreignField": "_id",
                "as": "product"
            }},
            {"$unwind": "$product"},
            {"$match": {"product.category_id": {"$in": list(user_categories)}}},
            {"$group": {"_id": "$customer_id", "common_purchases": {"$sum": 1}}},
            {"$match": {"common_purchases": {"$gte": 2}}},
            {"$sort": {"common_purchases": -1}},
            {"$limit": 10}
        ]
        
        similar_users = await db.orders.aggregate(similar_users_pipeline).to_list(length=10)
        
        if not similar_users:
            return []
        
        # Que compraron estos usuarios que el usuario actual no ha comprado
        similar_user_ids = [u["_id"] for u in similar_users]
        
        recommended_pipeline = [
            {"$match": {
                "customer_id": {"$in": similar_user_ids},
                "tenant_id": tenant_id
            }},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.product_id",
                "purchase_count": {"$sum": 1}
            }},
            {"$sort": {"purchase_count": -1}},
            {"$limit": limit * 2}
        ]
        
        recommended_products = await db.orders.aggregate(recommended_pipeline).to_list(length=limit * 2)
        
        # Excluir productos que el usuario ya compro
        new_recommendations = [
            r for r in recommended_products 
            if r["_id"] not in user_product_ids
        ]
        
        # Obtener datos completos
        from bson.objectid import ObjectId
        rec_ids = []
        for r in new_recommendations[:limit]:
            try:
                rec_ids.append(ObjectId(r["_id"]))
            except Exception:
                pass
        
        if not rec_ids:
            return []
        
        products = await db.products.find({
            "_id": {"$in": rec_ids},
            "status": {"$in": ["active", "approved"]}
        }).to_list(length=limit)
        
        for p in products:
            p["id"] = str(p.get("_id"))
            rec = next((r for r in new_recommendations if r["_id"] == str(p.get("_id"))), None)
            p["purchase_count"] = rec["purchase_count"] if rec else 0
        
        return products
    
    async def _get_trending_recommendations(
        self,
        tenant_id: str,
        limit: int,
        exclude_ids: List[str] = None
    ) -> List[Dict]:
        """Productos trending en el tenant"""
        db = get_db()
        
        query = {
            "tenant_id": tenant_id,
            "status": {"$in": ["active", "approved"]}
        }
        
        if exclude_ids:
            from bson.objectid import ObjectId
            exclude_obj_ids = []
            for eid in exclude_ids:
                try:
                    exclude_obj_ids.append(ObjectId(eid))
                except Exception:
                    pass
            if exclude_obj_ids:
                query["_id"] = {"$nin": exclude_obj_ids}
        
        # Ordenar por trending_score y ventas recientes
        products = await db.products.find(query).sort([
            ("stats.trending_score", -1),
            ("stats.orders_count", -1),
            ("created_at", -1)
        ]).limit(limit).to_list(length=limit)
        
        for p in products:
            p["id"] = str(p.get("_id"))
        
        return products
    
    async def _get_discovery_recommendations(
        self,
        tenant_id: str,
        limit: int,
        user_preferences: Dict
    ) -> List[Dict]:
        """
        Diversificacion: productos fuera del perfil habitual
        para descubrimiento y reducir filter bubble
        """
        db = get_db()
        
        # Categorias que el usuario NUNCA ha explorado
        all_categories = await db.categories.find({"tenant_id": tenant_id}).distinct("_id")
        user_categories = user_preferences.get("explored_categories", [])
        
        unexplored = [c for c in all_categories if c not in user_categories]
        
        if not unexplored:
            # Fallback: categorias menos populares
            unexplored = all_categories
        
        # Productos bien valorados en categorias no exploradas
        products = await db.products.find({
            "tenant_id": tenant_id,
            "category_id": {"$in": unexplored[:3]},
            "status": {"$in": ["active", "approved"]},
            "$or": [
                {"stats.avg_rating": {"$gte": 4.5}},
                {"rating": {"$gte": 4.5}}
            ]
        }).sort([("stats.avg_rating", -1), ("rating", -1)]).limit(limit).to_list(length=limit)
        
        for p in products:
            p["id"] = str(p.get("_id"))
        
        return products
    
    def _merge_and_rank(
        self,
        semantic: List[Dict],
        collaborative: List[Dict],
        trending: List[Dict],
        discovery: List[Dict]
    ) -> List[Dict]:
        """Merge de multiples fuentes con deduplicacion y ranking"""
        
        seen_ids = set()
        ranked = []
        
        # Intercalar fuentes con pesos
        sources = [
            (semantic, 0.40),
            (collaborative, 0.30),
            (trending, 0.20),
            (discovery, 0.10)
        ]
        
        max_len = max(len(s) for s, _ in sources) if sources else 0
        
        for i in range(max_len):
            for source, weight in sources:
                if i < len(source):
                    product = source[i]
                    pid = str(product.get("_id") or product.get("id"))
                    
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        product["recommendation_weight"] = weight
                        product["recommendation_source"] = self._get_source_name(source)
                        ranked.append(product)
        
        return ranked
    
    def _get_source_name(self, source_list: List[Dict]) -> str:
        """Identifica la fuente de recomendacion"""
        if not source_list:
            return "unknown"
        
        first = source_list[0]
        if "similarity_score" in first:
            return "semantic"
        if "purchase_count" in first:
            return "collaborative"
        return "trending"
    
    def _generate_reasons(self, products: List[Dict], user: Dict) -> Dict[str, str]:
        """Genera explicaciones personalizadas para cada recomendacion"""
        reasons = {}
        user_prefs = user.get("consumer_data", {}).get("preferences", {})
        
        for p in products:
            pid = str(p.get("_id") or p.get("id"))
            source = p.get("recommendation_source", "trending")
            
            if source == "semantic":
                diet_match = any(
                    d in p.get("tags", []) 
                    for d in user_prefs.get("diet", [])
                )
                if diet_match:
                    reasons[pid] = f"Coincide con tu preferencia por {user_prefs['diet'][0]}"
                else:
                    reasons[pid] = "Similar a productos que te gustan"
            
            elif source == "collaborative":
                reasons[pid] = "Personas como tu compraron esto"
            
            elif source == "trending":
                reasons[pid] = "Tendencia ahora en tu zona"
            
            else:  # discovery
                reasons[pid] = "Descubre algo nuevo"
        
        return reasons
    
    def _calculate_confidence(
        self,
        semantic_count: int,
        collaborative_count: int,
        user: Dict
    ) -> float:
        """Calcula score de confianza general (0-100)"""
        base = 50
        
        # Mas datos = mas confianza
        if semantic_count > 10:
            base += 20
        if collaborative_count > 5:
            base += 15
        
        # Preferencias completas
        prefs = user.get("consumer_data", {}).get("preferences", {})
        if prefs.get("diet") and prefs.get("allergies"):
            base += 15
        
        return min(100, base)
    
    async def _get_or_create_user_embedding(
        self,
        user_id: str,
        tenant_id: str,
        user: Dict
    ) -> Optional[Dict]:
        """Obtiene embedding existente o genera nuevo"""
        db = get_db()
        
        existing = await db.user_embeddings.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id
        })
        
        if existing:
            # Verificar si es reciente (< 7 dias)
            updated_at = existing.get("updated_at", datetime.now(timezone.utc))
            if isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                except Exception:
                    updated_at = datetime.now(timezone.utc)
            
            age = datetime.now(timezone.utc) - updated_at
            if age.days < 7:
                return existing
        
        # Generar nuevo embedding
        consumer_data = user.get("consumer_data", {})
        
        # Obtener historial de compras
        orders = await db.orders.find({
            "customer_id": user_id
        }).sort("created_at", -1).limit(10).to_list(length=10)
        
        # Batch fetch all purchased products (replaces N+1 find_one loop)
        all_pids = []
        for order in orders:
            for item in order.get("items", []):
                pid = item.get("product_id")
                if pid:
                    all_pids.append(pid)
        purchased_products = await db.products.find(
            {"_id": {"$in": list(set(all_pids))}},
        ).to_list(len(all_pids)) if all_pids else []
        
        # Obtener favoritos
        saved_ids = consumer_data.get("saved_products", [])
        from bson.objectid import ObjectId
        saved_obj_ids = []
        for sid in saved_ids:
            try:
                saved_obj_ids.append(ObjectId(sid))
            except Exception:
                pass
        
        saved_products = []
        if saved_obj_ids:
            saved_products = await db.products.find({
                "_id": {"$in": saved_obj_ids}
            }).to_list(length=10)
        
        # Generar embedding
        try:
            embedding = await embedding_service.generate_user_preference_embedding(
                preferences=consumer_data.get("preferences", {}),
                purchase_history=purchased_products,
                liked_products=saved_products
            )
        except Exception as e:
            logger.error("Generando user embedding: %s", e)
            return existing
        
        # Guardar/actualizar
        doc = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "embedding": embedding,
            "diet_preferences": consumer_data.get("preferences", {}).get("diet", []),
            "allergy_restrictions": consumer_data.get("preferences", {}).get("allergies", []),
            "health_goals": consumer_data.get("preferences", {}).get("goals", []),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.user_embeddings.update_one(
            {"user_id": user_id, "tenant_id": tenant_id},
            {"$set": doc},
            upsert=True
        )
        
        return doc
    
    async def _save_cache(
        self,
        user_id: str,
        tenant_id: str,
        recommendations: Dict,
        subscription: str
    ):
        """Guarda recomendaciones en cache"""
        db = get_db()
        
        ttl = (
            self.CACHE_TTL_PRO_MINUTES 
            if (subscription or "").upper() in ["PRO", "ELITE"] 
            else self.CACHE_TTL_FREE_MINUTES
        )
        
        def extract_id(p):
            return str(p.get("_id") or p.get("id"))
        
        doc = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "product_ids": [extract_id(p) for p in recommendations["products"]],
            "post_ids": [extract_id(p) for p in recommendations["posts"]],
            "reasons": recommendations["reasons"],
            "confidence_score": recommendations["confidence_score"],
            "generated_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=ttl),
            "used_cached": False,
            "cache_version": 1
        }
        
        await db.ai_recommendation_caches.update_one(
            {"user_id": user_id, "tenant_id": tenant_id},
            {"$set": doc},
            upsert=True
        )
    
    async def _fetch_products(self, product_ids: List[str]) -> List[Dict]:
        """Obtiene productos por IDs preservando orden"""
        db = get_db()
        if not product_ids:
            return []
        
        from bson.objectid import ObjectId
        obj_ids = []
        for pid in product_ids:
            try:
                obj_ids.append(ObjectId(pid))
            except Exception:
                pass
        
        if not obj_ids:
            return []
        
        products = await db.products.find({
            "_id": {"$in": obj_ids},
            "status": {"$in": ["active", "approved"]}
        }).to_list(length=len(obj_ids))
        
        # Preservar orden de recomendacion
        product_map = {str(p["_id"]): p for p in products}
        result = []
        for pid in product_ids:
            if pid in product_map:
                product_map[pid]["id"] = pid
                result.append(product_map[pid])
        return result
    
    async def _fetch_posts(self, post_ids: List[str]) -> List[Dict]:
        """Obtiene posts por IDs"""
        db = get_db()
        if not post_ids:
            return []
        
        from bson.objectid import ObjectId
        obj_ids = []
        for pid in post_ids:
            try:
                obj_ids.append(ObjectId(pid))
            except Exception:
                pass
        
        if not obj_ids:
            return []
        
        posts = await db.posts.find({
            "_id": {"$in": obj_ids}
        }).to_list(length=len(obj_ids))
        
        for p in posts:
            p["id"] = str(p.get("_id"))
        
        post_map = {str(p["_id"]): p for p in posts}
        return [post_map.get(pid) for pid in post_ids if post_map.get(pid)]
    
    async def _get_related_posts(
        self,
        product_ids: List[str],
        tenant_id: str
    ) -> List[Dict]:
        """Obtiene posts que taggean productos recomendados"""
        db = get_db()
        
        posts = await db.posts.find({
            "tenant_id": tenant_id,
            "tagged_products.product_id": {"$in": product_ids},
            "status": "active"
        }).sort("feed_priority_score", -1).limit(10).to_list(length=10)
        
        for p in posts:
            p["id"] = str(p.get("_id"))
        
        return posts
    
    def _calculate_cache_expiry(self, subscription: str) -> str:
        """Calcula cuando expira la cache"""
        ttl = (
            self.CACHE_TTL_PRO_MINUTES 
            if (subscription or "").upper() in ["PRO", "ELITE"] 
            else self.CACHE_TTL_FREE_MINUTES
        )
        return (datetime.now(timezone.utc) + timedelta(minutes=ttl)).isoformat()
    
    async def _get_trending_only(self, tenant_id: str, limit: int) -> Dict:
        """Fallback cuando no hay datos de usuario"""
        db = get_db()
        
        products = await db.products.find({
            "tenant_id": tenant_id,
            "status": {"$in": ["active", "approved"]}
        }).sort([("stats.trending_score", -1), ("created_at", -1)]).limit(limit).to_list(length=limit)
        
        for p in products:
            p["id"] = str(p.get("_id"))
        
        return {
            "products": products,
            "posts": [],
            "reasons": {str(p.get("_id")): "Popular ahora" for p in products},
            "confidence_score": 30,  # Bajo porque no es personalizado
            "used_cached": False
        }


# Instancia global
recommendation_engine = RecommendationEngine()
