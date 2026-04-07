"""
Search Service — Búsqueda universal multi-entidad.

Features:
- Búsqueda agrupada por tipo (Todo | Usuarios | Tiendas | Productos | Recetas | Hashtags)
- Autocomplete < 200ms
- Historial de búsquedas persistente
- Trending queries por país
- Suggestions "¿Querías decir...?"
"""
import re
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from core.database import db

logger = logging.getLogger(__name__)


class SearchService:
    """Servicio de búsqueda universal."""
    
    # Límites
    MAX_RESULTS_PER_TYPE = 20
    MAX_RECENT_SEARCHES = 10
    TRENDING_WINDOW_DAYS = 7
    
    async def search_universal(
        self,
        query: str,
        country: str = "ES",
        language: str = "es",
        limit: int = 20
    ) -> Dict[str, List[Dict]]:
        """
        Búsqueda universal que retorna resultados agrupados por tipo.
        
        Returns:
            Dict con keys: users, stores, products, recipes, hashtags, posts
        """
        if not query or len(query.strip()) < 2:
            return {k: [] for k in ["users", "stores", "products", "recipes", "hashtags", "posts"]}
        
        query_clean = query.strip().lower()
        
        # Ejecutar búsquedas en paralelo (simulado con awaits secuenciales por ahora)
        results = {
            "users": await self._search_users(query_clean, country, limit),
            "stores": await self._search_stores(query_clean, country, limit),
            "products": await self._search_products(query_clean, country, limit),
            "recipes": await self._search_recipes(query_clean, language, limit),
            "hashtags": await self._search_hashtags(query_clean, limit),
            "posts": await self._search_posts(query_clean, country, limit)
        }
        
        return results
    
    async def _search_users(
        self,
        query: str,
        country: str,
        limit: int
    ) -> List[Dict]:
        """Busca usuarios por username o nombre."""
        # Búsqueda por username (exacto o parcial)
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": f"^{query}", "$options": "i"}},
                {"username": {"$regex": query, "$options": "i"}},
                {"name": {"$regex": query, "$options": "i"}}
            ],
            "role": {"$ne": "admin"}  # Excluir admins de búsqueda pública
        }).limit(limit).to_list(length=limit)
        
        return [{
            "id": u["_id"],
            "type": "user",
            "username": u.get("username"),
            "name": u.get("name") or u.get("username"),
            "avatar": u.get("profile_image") or u.get("avatar_url"),
            "role": u.get("role"),
            "is_verified": u.get("is_verified", False),
            "followers_count": u.get("followers_count", 0)
        } for u in users]
    
    async def _search_stores(
        self,
        query: str,
        country: str,
        limit: int
    ) -> List[Dict]:
        """Busca tiendas por nombre o slug."""
        stores = await db.stores.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"slug": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ],
            "is_active": True
        }).limit(limit).to_list(length=limit)
        
        return [{
            "id": s["_id"],
            "type": "store",
            "name": s["name"],
            "slug": s["slug"],
            "logo": s.get("logo"),
            "description": s.get("description", "")[:100],
            "location": s.get("location"),
            "product_count": s.get("product_count", 0)
        } for s in stores]
    
    async def _search_products(
        self,
        query: str,
        country: str,
        limit: int
    ) -> List[Dict]:
        """Busca productos por nombre, descripción o tags."""
        # Usar índice de texto si existe, fallback a regex
        try:
            products = await db.products.find(
                {"status": "active"},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(length=limit)
        except:
            # Fallback a regex
            products = await db.products.find({
                "status": "active",
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                    {"tags": {"$in": [query]}},
                    {"category": {"$regex": query, "$options": "i"}}
                ]
            }).limit(limit).to_list(length=limit)
        
        return [{
            "id": p["_id"],
            "type": "product",
            "name": p["name"],
            "slug": p.get("slug"),
            "image": p.get("images", [None])[0],
            "price": p.get("price"),
            "currency": p.get("currency", "EUR"),
            "store_id": p.get("store_id"),
            "origin_country": p.get("origin_country"),
            "certifications": p.get("certifications", [])[:3]
        } for p in products]
    
    async def _search_recipes(
        self,
        query: str,
        language: str,
        limit: int
    ) -> List[Dict]:
        """Busca recetas por título, descripción o ingredientes."""
        recipes = await db.recipes.find({
            "status": "published",
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"tags": {"$in": [query]}},
                {"ingredients.name": {"$regex": query, "$options": "i"}}
            ]
        }).sort("ratings.avg", -1).limit(limit).to_list(length=limit)
        
        return [{
            "id": r["_id"],
            "type": "recipe",
            "title": r["title"],
            "slug": r["slug"],
            "cover_image": r["cover_image"],
            "author_name": r.get("author", {}).get("name") if isinstance(r.get("author"), dict) else None,
            "difficulty": r["difficulty"],
            "total_time": r.get("prep_time_minutes", 0) + r.get("cook_time_minutes", 0),
            "rating": r.get("ratings", {}).get("avg", 0)
        } for r in recipes]
    
    async def _search_hashtags(
        self,
        query: str,
        limit: int
    ) -> List[Dict]:
        """Busca hashtags por nombre."""
        # Si el query no empieza con #, buscar igual
        hashtag_query = query.lstrip("#")
        
        hashtags = await db.hashtags.find({
            "tag": {"$regex": f"^{hashtag_query}", "$options": "i"}
        }).sort("posts_count", -1).limit(limit).to_list(length=limit)
        
        return [{
            "id": h["_id"],
            "type": "hashtag",
            "tag": h["tag"],
            "posts_count": h.get("posts_count", 0),
            "is_trending": h.get("trending_rank", 0) > 0
        } for h in hashtags]
    
    async def _search_posts(
        self,
        query: str,
        country: str,
        limit: int
    ) -> List[Dict]:
        """Busca posts por caption o hashtags."""
        posts = await db.posts.find({
            "status": "published",
            "$or": [
                {"caption": {"$regex": query, "$options": "i"}},
                {"hashtags": {"$in": [query]}}
            ]
        }).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return [{
            "id": p["_id"],
            "type": "post",
            "caption": (p.get("caption", "") or "")[:100],
            "image": p.get("image_url") or (p.get("media", [{}])[0].get("url")),
            "author_username": p.get("username") or p.get("author_username"),
            "likes_count": p.get("likes_count", 0),
            "is_reel": bool(p.get("video_url"))
        } for p in posts]
    
    # ═══════════════════════════════════════════════════════════════════════════
    # HISTORIAL DE BÚSQUEDAS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def save_search(
        self,
        user_id: str,
        query: str,
        country: str,
        language: str
    ):
        """Guarda una búsqueda en el historial del usuario."""
        if not query or len(query.strip()) < 2:
            return
        
        query_clean = query.strip().lower()
        
        await db.search_history.update_one(
            {
                "user_id": user_id,
                "query": query_clean
            },
            {
                "$set": {
                    "country": country,
                    "language": language,
                    "searched_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        # También guardar en colección de trending (anonimizado)
        await db.search_trending.update_one(
            {
                "query": query_clean,
                "country": country,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
            },
            {
                "$inc": {"count": 1}
            },
            upsert=True
        )
    
    async def get_recent_searches(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Obtiene búsquedas recientes del usuario."""
        searches = await db.search_history.find({
            "user_id": user_id
        }).sort("searched_at", -1).limit(limit).to_list(length=limit)
        
        return [{
            "query": s["query"],
            "searched_at": s["searched_at"]
        } for s in searches]
    
    async def clear_recent_searches(self, user_id: str):
        """Limpia el historial de búsquedas del usuario."""
        await db.search_history.delete_many({"user_id": user_id})
    
    async def delete_recent_search(self, user_id: str, query: str):
        """Elimina una búsqueda específica del historial."""
        await db.search_history.delete_one({
            "user_id": user_id,
            "query": query.lower()
        })
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TRENDING QUERIES
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_trending_queries(
        self,
        country: str,
        limit: int = 10
    ) -> List[Dict]:
        """Obtiene queries trending en un país (últimos 7 días)."""
        from_date = datetime.now(timezone.utc) - timedelta(days=self.TRENDING_WINDOW_DAYS)
        
        trending = await db.search_trending.aggregate([
            {
                "$match": {
                    "country": country,
                    "date": {"$gte": from_date.strftime("%Y-%m-%d")}
                }
            },
            {
                "$group": {
                    "_id": "$query",
                    "total_count": {"$sum": "$count"}
                }
            },
            {"$sort": {"total_count": -1}},
            {"$limit": limit}
        ]).to_list(length=limit)
        
        return [{
            "query": t["_id"],
            "count": t["total_count"]
        } for t in trending]
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SUGERENCIAS Y AUTOCOMPLETE
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_suggestions(
        self,
        query: str,
        country: str,
        limit: int = 8
    ) -> List[str]:
        """
        Retorna sugerencias de autocompletado para un query parcial.
        Combina: trending queries, historial del usuario, nombres de productos/tiendas.
        """
        if not query or len(query) < 2:
            return []
        
        query_clean = query.lower()
        suggestions = set()
        
        # 1. Trending queries que empiecen con el query
        trending = await self.get_trending_queries(country, limit=20)
        for t in trending:
            if t["query"].startswith(query_clean):
                suggestions.add(t["query"])
        
        # 2. Productos que empiecen con el query
        products = await db.products.find({
            "status": "active",
            "name": {"$regex": f"^{query_clean}", "$options": "i"}
        }).limit(5).to_list(length=5)
        
        for p in products:
            suggestions.add(p["name"].lower())
        
        # 3. Tiendas
        stores = await db.stores.find({
            "is_active": True,
            "name": {"$regex": f"^{query_clean}", "$options": "i"}
        }).limit(3).to_list(length=3)
        
        for s in stores:
            suggestions.add(s["name"].lower())
        
        # 4. Hashtags populares
        hashtags = await db.hashtags.find({
            "tag": {"$regex": f"^{query_clean}", "$options": "i"}
        }).sort("posts_count", -1).limit(5).to_list(length=5)
        
        for h in hashtags:
            suggestions.add(f"#{h['tag']}")
        
        return list(suggestions)[:limit]
    
    async def get_did_you_mean(
        self,
        query: str,
        country: str
    ) -> Optional[str]:
        """
        Sugiere corrección si no hay resultados (¿Querías decir...?).
        Simple: busca queries similares en trending.
        """
        query_clean = query.lower()
        
        # Buscar queries similares (mismo prefijo o similar longitud)
        similar = await db.search_trending.find({
            "country": country,
            "query": {
                "$regex": f"^{query_clean[:3]}",
                "$options": "i"
            }
        }).sort("count", -1).limit(1).to_list(length=1)
        
        if similar and similar[0]["query"] != query_clean:
            return similar[0]["query"]
        
        return None


# Singleton
search_service = SearchService()
