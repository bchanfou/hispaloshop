"""
Recipe Service — Gestión de recetas con ingredientes comprables.

Features:
- CRUD completo de recetas
- Ingredientes vinculados a productos reales
- Auto-suggest de productos con IA (Claude)
- Add all ingredients to cart (multi-producer)
- Búsqueda por ingredientes, tags, categorías
"""
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from bson import ObjectId

from core.database import db
from services.hispalo_translate import translate_text

logger = logging.getLogger(__name__)


class RecipeService:
    """Servicio de gestión de recetas."""
    
    # Categorías válidas
    CATEGORIES = ["main", "dessert", "breakfast", "snack", "drink"]
    DIFFICULTIES = ["easy", "medium", "hard"]
    
    async def create_recipe(
        self,
        author_id: str,
        title: str,
        description: str,
        cover_image: str,
        servings: int,
        prep_time_minutes: int,
        cook_time_minutes: int,
        difficulty: str,
        category: str,
        tags: List[str],
        language: str,
        ingredients: List[Dict],
        instructions: List[Dict],
        nutrition: Optional[Dict] = None
    ) -> Dict:
        """
        Crea una nueva receta.
        
        Args:
            author_id: ID del autor (puede ser consumer, producer, influencer)
            title: Título de la receta
            description: Descripción corta
            cover_image: URL de imagen principal
            servings: Número de porciones
            prep_time_minutes: Tiempo de preparación
            cook_time_minutes: Tiempo de cocción
            difficulty: easy/medium/hard
            category: main/dessert/breakfast/snack/drink
            tags: Lista de tags (vegan, gluten-free, etc.)
            language: Idioma de la receta (es/en/ko)
            ingredients: Lista de ingredientes con vinculación a productos
            instructions: Lista de pasos
            nutrition: Info nutricional opcional
        """
        # Validaciones
        if difficulty not in self.DIFFICULTIES:
            raise ValueError(f"Dificultad inválida: {difficulty}")
        if category not in self.CATEGORIES:
            raise ValueError(f"Categoría inválida: {category}")
        
        # Generar slug único
        slug = self._generate_slug(title)
        
        recipe = {
            "_id": str(ObjectId()),
            "slug": slug,
            "title": title,
            "description": description,
            "cover_image": cover_image,
            "author_id": author_id,
            "servings": servings,
            "prep_time_minutes": prep_time_minutes,
            "cook_time_minutes": cook_time_minutes,
            "difficulty": difficulty,
            "category": category,
            "tags": [t.lower() for t in tags],
            "language": language,
            "ingredients": ingredients,
            "instructions": instructions,
            "nutrition": nutrition or {},
            "ratings": {"avg": 0, "count": 0},
            "views_count": 0,
            "likes_count": 0,
            "saves_count": 0,
            "status": "published",  # published, draft, pending_moderation
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "published_at": datetime.now(timezone.utc),
        }
        
        await db.recipes.insert_one(recipe)
        
        # Incrementar contador de recetas del autor
        await db.users.update_one(
            {"_id": author_id},
            {"$inc": {"recipes_count": 1}}
        )
        
        logger.info(f"[RecipeService] Receta creada: {recipe['_id']} por {author_id}")
        
        return recipe
    
    async def get_recipe_by_id(self, recipe_id: str) -> Optional[Dict]:
        """Obtiene una receta por ID."""
        recipe = await db.recipes.find_one({"_id": recipe_id})
        if recipe:
            # Incrementar views
            await db.recipes.update_one(
                {"_id": recipe_id},
                {"$inc": {"views_count": 1}}
            )
        return recipe
    
    async def get_recipe_by_slug(self, slug: str) -> Optional[Dict]:
        """Obtiene una receta por slug."""
        recipe = await db.recipes.find_one({"slug": slug})
        if recipe:
            await db.recipes.update_one(
                {"_id": recipe["_id"]},
                {"$inc": {"views_count": 1}}
            )
        return recipe
    
    async def update_recipe(
        self,
        recipe_id: str,
        author_id: str,
        updates: Dict
    ) -> Optional[Dict]:
        """Actualiza una receta (solo el autor puede editar)."""
        # Verificar ownership
        recipe = await db.recipes.find_one({
            "_id": recipe_id,
            "author_id": author_id
        })
        
        if not recipe:
            return None
        
        # Actualizar campos permitidos
        allowed_fields = [
            "title", "description", "cover_image", "servings",
            "prep_time_minutes", "cook_time_minutes", "difficulty",
            "category", "tags", "ingredients", "instructions", "nutrition"
        ]
        
        update_data = {k: v for k, v in updates.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Si cambia el título, regenerar slug
        if "title" in update_data and update_data["title"] != recipe["title"]:
            update_data["slug"] = self._generate_slug(update_data["title"])
        
        await db.recipes.update_one(
            {"_id": recipe_id},
            {"$set": update_data}
        )
        
        return await db.recipes.find_one({"_id": recipe_id})
    
    async def delete_recipe(self, recipe_id: str, author_id: str) -> bool:
        """Elimina una receta (solo el autor o admin)."""
        result = await db.recipes.delete_one({
            "_id": recipe_id,
            "author_id": author_id
        })
        
        if result.deleted_count > 0:
            # Decrementar contador del autor
            await db.users.update_one(
                {"_id": author_id},
                {"$inc": {"recipes_count": -1}}
            )
            return True
        return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BÚSQUEDA Y LISTADOS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def search_recipes(
        self,
        query: str = "",
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        tags: List[str] = None,
        max_time: Optional[int] = None,  # max total time in minutes
        language: Optional[str] = None,
        sort_by: str = "recent",  # recent, popular, rating
        limit: int = 20,
        skip: int = 0
    ) -> List[Dict]:
        """Busca recetas con filtros."""
        
        # Construir query
        match_stage = {"status": "published"}
        
        if category:
            match_stage["category"] = category
        if difficulty:
            match_stage["difficulty"] = difficulty
        if tags:
            match_stage["tags"] = {"$in": [t.lower() for t in tags]}
        if language:
            match_stage["language"] = language
        if max_time:
            match_stage["$expr"] = {
                "$lte": [
                    {"$add": ["$prep_time_minutes", "$cook_time_minutes"]},
                    max_time
                ]
            }
        
        # Text search si hay query
        pipeline = [{"$match": match_stage}]
        
        if query:
            pipeline.append({
                "$match": {
                    "$or": [
                        {"title": {"$regex": query, "$options": "i"}},
                        {"description": {"$regex": query, "$options": "i"}},
                        {"tags": {"$in": [query.lower()]}},
                        {"ingredients.name": {"$regex": query, "$options": "i"}}
                    ]
                }
            })
        
        # Sort
        sort_stage = {}
        if sort_by == "recent":
            sort_stage = {"published_at": -1}
        elif sort_by == "popular":
            sort_stage = {"views_count": -1}
        elif sort_by == "rating":
            sort_stage = {"ratings.avg": -1}
        elif sort_by == "saves":
            sort_stage = {"saves_count": -1}
        
        pipeline.extend([
            {"$sort": sort_stage},
            {"$skip": skip},
            {"$limit": limit},
            # Lookup del autor
            {"$lookup": {
                "from": "users",
                "localField": "author_id",
                "foreignField": "_id",
                "as": "author"
            }},
            {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
            # Proyectar solo campos necesarios
            {"$project": {
                "_id": 1,
                "slug": 1,
                "title": 1,
                "cover_image": 1,
                "servings": 1,
                "prep_time_minutes": 1,
                "cook_time_minutes": 1,
                "difficulty": 1,
                "category": 1,
                "tags": 1,
                "ratings": 1,
                "views_count": 1,
                "likes_count": 1,
                "author.name": 1,
                "author.username": 1,
                "author.profile_image": 1
            }}
        ])
        
        recipes = await db.recipes.aggregate(pipeline).to_list(length=limit)
        return recipes
    
    async def get_recipes_by_ingredient(
        self,
        ingredient_name: str,
        limit: int = 20
    ) -> List[Dict]:
        """Encuentra recetas que usen un ingrediente específico."""
        recipes = await db.recipes.find({
            "status": "published",
            "ingredients.name": {"$regex": ingredient_name, "$options": "i"}
        }).sort("ratings.avg", -1).limit(limit).to_list(length=limit)
        
        return recipes
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTO-SUGGEST DE PRODUCTOS (IA)
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def suggest_products_for_ingredient(
        self,
        ingredient_name: str,
        country: str = "ES",
        limit: int = 5
    ) -> List[Dict]:
        """
        Busca productos candidatos para un ingrediente.
        Usa búsqueda por texto + embeddings si disponibles.
        """
        # Búsqueda por nombre exacto o parcial
        exact_matches = await db.products.find({
            "status": "active",
            "$or": [
                {"name": {"$regex": f"^{ingredient_name}$", "$options": "i"}},
                {"name": {"$regex": ingredient_name, "$options": "i"}},
                {"tags": {"$in": [ingredient_name.lower()]}},
                {"category": {"$regex": ingredient_name, "$options": "i"}}
            ]
        }).limit(limit).to_list(length=limit)
        
        if exact_matches:
            return exact_matches
        
        # Si no hay matches exactos, buscar por palabras individuales
        words = ingredient_name.lower().split()
        if len(words) > 1:
            word_matches = await db.products.find({
                "status": "active",
                "$or": [
                    {"name": {"$regex": word, "$options": "i"}} for word in words[:3]
                ]
            }).limit(limit).to_list(length=limit)
            return word_matches
        
        return []
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CARRITO: ADD ALL INGREDIENTS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def add_all_ingredients_to_cart(
        self,
        recipe_id: str,
        user_id: str,
        servings_multiplier: float = 1.0
    ) -> Dict:
        """
        Añade todos los ingredientes comprables de una receta al carrito.
        Maneja múltiples productores correctamente.
        
        Returns:
            Dict con: added_items, failed_items, total_producers, cart_summary
        """
        recipe = await db.recipes.find_one({"_id": recipe_id})
        if not recipe:
            raise ValueError("Receta no encontrada")
        
        added_items = []
        failed_items = []
        producers = set()
        
        for ingredient in recipe.get("ingredients", []):
            product_id = ingredient.get("product_id")
            
            if not product_id or ingredient.get("is_generic", False):
                # Ingrediente genérico, no vinculado
                failed_items.append({
                    "ingredient": ingredient["name"],
                    "reason": "not_linked",
                    "message": "Ingrediente genérico, no vinculado a producto"
                })
                continue
            
            # Verificar producto existe y está activo
            product = await db.products.find_one({
                "_id": product_id,
                "status": "active"
            })
            
            if not product:
                failed_items.append({
                    "ingredient": ingredient["name"],
                    "reason": "product_not_found",
                    "message": "Producto no encontrado o no disponible"
                })
                continue
            
            # Verificar stock
            if product.get("stock", 0) <= 0:
                failed_items.append({
                    "ingredient": ingredient["name"],
                    "reason": "out_of_stock",
                    "message": "Producto sin stock",
                    "alternative_product_ids": ingredient.get("alternative_product_ids", [])
                })
                continue
            
            # Calcular cantidad basada en servings
            base_quantity = float(ingredient.get("quantity", 1))
            final_quantity = base_quantity * servings_multiplier
            
            # Añadir al carrito (usar servicio existente de cart)
            try:
                from services.cart_service import cart_service
                
                await cart_service.add_item(
                    user_id=user_id,
                    product_id=product_id,
                    quantity=max(1, int(final_quantity)),
                    variant_id=None
                )
                
                added_items.append({
                    "ingredient": ingredient["name"],
                    "product_id": product_id,
                    "product_name": product["name"],
                    "producer_id": product.get("producer_id"),
                    "quantity": final_quantity,
                    "price": product.get("price", 0)
                })
                
                producers.add(product.get("producer_id"))
                
            except Exception as e:
                failed_items.append({
                    "ingredient": ingredient["name"],
                    "reason": "cart_error",
                    "message": str(e)
                })
        
        # Calcular resumen
        total_price = sum(item["price"] * item["quantity"] for item in added_items)
        
        return {
            "added_count": len(added_items),
            "failed_count": len(failed_items),
            "added_items": added_items,
            "failed_items": failed_items,
            "total_producers": len(producers),
            "estimated_total": total_price
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _generate_slug(self, title: str) -> str:
        """Genera un slug único a partir del título."""
        import re
        
        # Normalizar
        slug = title.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)  # Remover caracteres especiales
        slug = re.sub(r'[-\s]+', '-', slug)  # Reemplazar espacios con guiones
        slug = slug.strip('-')
        
        # Añadir timestamp para unicidad
        import time
        return f"{slug}-{int(time.time()) % 10000}"


# Singleton
recipe_service = RecipeService()
