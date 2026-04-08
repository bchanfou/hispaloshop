"""
Recipes API — Endpoints para recetas con ingredientes comprables.

Endpoints:
- GET /api/recipes — Listar/buscar recetas
- POST /api/recipes — Crear receta
- GET /api/recipes/{id} — Detalle de receta
- PUT /api/recipes/{id} — Actualizar receta
- DELETE /api/recipes/{id} — Eliminar receta
- POST /api/recipes/{id}/add-to-cart — Añadir ingredientes al carrito
- GET /api/recipes/suggest-products — Auto-suggest productos para ingrediente
- POST /api/recipes/{id}/rate — Valorar receta
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, Field
import logging

from core.auth import get_current_user, get_optional_user
from services.recipe_service import recipe_service
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class IngredientInput(BaseModel):
    name: str
    quantity: str
    unit: str
    product_id: Optional[str] = None
    alternative_product_ids: List[str] = Field(default_factory=list)
    is_generic: bool = False
    is_optional: bool = False


class InstructionInput(BaseModel):
    step: int
    text: str
    image_url: Optional[str] = None


class RecipeCreateInput(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., max_length=2000)
    cover_image: str
    servings: int = Field(..., ge=1, le=100)
    prep_time_minutes: int = Field(..., ge=0, le=1440)
    cook_time_minutes: int = Field(..., ge=0, le=1440)
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    category: str = Field(..., pattern="^(main|dessert|breakfast|snack|drink)$")
    tags: List[str] = Field(default_factory=list)
    language: str = "es"
    ingredients: List[IngredientInput]
    instructions: List[InstructionInput]
    nutrition: Optional[dict] = None


class RecipeUpdateInput(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    cover_image: Optional[str] = None
    servings: Optional[int] = Field(None, ge=1, le=100)
    prep_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    cook_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    ingredients: Optional[List[IngredientInput]] = None
    instructions: Optional[List[InstructionInput]] = None
    nutrition: Optional[dict] = None


class AddToCartInput(BaseModel):
    servings_multiplier: float = Field(1.0, ge=0.5, le=10)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def list_recipes(
    q: Optional[str] = Query(None, description="Texto de búsqueda"),
    category: Optional[str] = Query(None, description="Categoría: main/dessert/breakfast/snack/drink"),
    difficulty: Optional[str] = Query(None, description="Dificultad: easy/medium/hard"),
    tags: Optional[str] = Query(None, description="Tags separados por coma"),
    max_time: Optional[int] = Query(None, description="Tiempo máximo total (min)"),
    language: Optional[str] = Query(None, description="Idioma: es/en/ko"),
    sort_by: str = Query("recent", description="Orden: recent/popular/rating/saves"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[dict] = Depends(get_optional_user)
):
    """Lista y busca recetas con filtros."""
    tag_list = tags.split(",") if tags else []
    
    recipes = await recipe_service.search_recipes(
        query=q or "",
        category=category,
        difficulty=difficulty,
        tags=tag_list,
        max_time=max_time,
        language=language,
        sort_by=sort_by,
        limit=limit,
        skip=skip
    )
    
    return {
        "recipes": recipes,
        "total": len(recipes),  # Simplified, ideally count all matching
        "limit": limit,
        "skip": skip
    }


@router.post("")
async def create_recipe(
    data: RecipeCreateInput,
    user: dict = Depends(get_current_user)
):
    """Crea una nueva receta. Requiere autenticación."""
    try:
        recipe = await recipe_service.create_recipe(
            author_id=user["_id"],
            title=data.title,
            description=data.description,
            cover_image=data.cover_image,
            servings=data.servings,
            prep_time_minutes=data.prep_time_minutes,
            cook_time_minutes=data.cook_time_minutes,
            difficulty=data.difficulty,
            category=data.category,
            tags=data.tags,
            language=data.language,
            ingredients=[ing.dict() for ing in data.ingredients],
            instructions=[inst.dict() for inst in data.instructions],
            nutrition=data.nutrition
        )
        
        return {
            "success": True,
            "recipe": recipe
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{recipe_id}")
async def get_recipe(
    recipe_id: str,
    user: Optional[dict] = Depends(get_optional_user)
):
    """Obtiene el detalle de una receta."""
    recipe = await recipe_service.get_recipe_by_id(recipe_id)
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    
    # Enriquecer con datos del autor
    author = await db.users.find_one({"_id": recipe["author_id"]})
    if author:
        recipe["author"] = {
            "id": author["_id"],
            "name": author.get("name") or author.get("username"),
            "username": author.get("username"),
            "profile_image": author.get("profile_image") or author.get("avatar_url"),
            "role": author.get("role")
        }
    
    # Enriquecer ingredientes con datos de productos
    enriched_ingredients = []
    for ing in recipe.get("ingredients", []):
        enriched = {**ing}
        
        if ing.get("product_id"):
            product = await db.products.find_one({"_id": ing["product_id"]})
            if product:
                enriched["product"] = {
                    "id": product["_id"],
                    "name": product["name"],
                    "price": product.get("price"),
                    "currency": product.get("currency", "EUR"),
                    "unit": product.get("unit"),
                    "image": product.get("images", [None])[0],
                    "stock": product.get("stock", 0),
                    "producer_id": product.get("producer_id"),
                    "slug": product.get("slug")
                }
        
        # Alternativas
        if ing.get("alternative_product_ids"):
            alternatives = []
            for alt_id in ing["alternative_product_ids"]:
                alt = await db.products.find_one({"_id": alt_id})
                if alt:
                    alternatives.append({
                        "id": alt["_id"],
                        "name": alt["name"],
                        "price": alt.get("price"),
                        "image": alt.get("images", [None])[0]
                    })
            enriched["alternatives"] = alternatives
        
        enriched_ingredients.append(enriched)
    
    recipe["ingredients"] = enriched_ingredients
    
    # Verificar si el usuario la ha guardado
    if user:
        saved = await db.saved_recipes.find_one({
            "user_id": user["_id"],
            "recipe_id": recipe_id
        })
        recipe["is_saved"] = saved is not None
    
    return recipe


@router.put("/{recipe_id}")
async def update_recipe(
    recipe_id: str,
    data: RecipeUpdateInput,
    user: dict = Depends(get_current_user)
):
    """Actualiza una receta. Solo el autor puede editar."""
    updates = {k: v for k, v in data.dict().items() if v is not None}
    
    if "ingredients" in updates:
        updates["ingredients"] = [ing.dict() for ing in data.ingredients]
    if "instructions" in updates:
        updates["instructions"] = [inst.dict() for inst in data.instructions]
    
    recipe = await recipe_service.update_recipe(recipe_id, user["_id"], updates)
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada o no tienes permiso")
    
    return {"success": True, "recipe": recipe}


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    user: dict = Depends(get_current_user)
):
    """Elimina una receta. Solo el autor puede eliminar."""
    deleted = await recipe_service.delete_recipe(recipe_id, user["_id"])
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Receta no encontrada o no tienes permiso")
    
    return {"success": True, "message": "Receta eliminada"}


@router.post("/{recipe_id}/add-to-cart")
async def add_recipe_to_cart(
    recipe_id: str,
    data: AddToCartInput,
    user: dict = Depends(get_current_user)
):
    """
    Añade todos los ingredientes comprables de una receta al carrito.
    Maneja múltiples productores automáticamente.
    """
    try:
        result = await recipe_service.add_all_ingredients_to_cart(
            recipe_id=recipe_id,
            user_id=user["_id"],
            servings_multiplier=data.servings_multiplier
        )
        
        return {
            "success": True,
            "message": f"{result['added_count']} ingredientes añadidos al carrito",
            **result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[Recipes] Error añadiendo al carrito: {e}")
        raise HTTPException(status_code=500, detail="Error añadiendo ingredientes al carrito")


@router.get("/suggest/products")
async def suggest_products(
    ingredient: str = Query(..., description="Nombre del ingrediente"),
    country: str = Query("ES", description="País para filtrar productos"),
    limit: int = Query(5, ge=1, le=20),
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Sugiere productos candidatos para un ingrediente.
    Usado en el creador de recetas.
    """
    products = await recipe_service.suggest_products_for_ingredient(
        ingredient_name=ingredient,
        country=country,
        limit=limit
    )
    
    # Formatear respuesta
    formatted = []
    for p in products:
        formatted.append({
            "id": p["_id"],
            "name": p["name"],
            "price": p.get("price"),
            "currency": p.get("currency", "EUR"),
            "unit": p.get("unit"),
            "image": p.get("images", [None])[0],
            "producer_id": p.get("producer_id"),
            "store_id": p.get("store_id"),
            "origin_country": p.get("origin_country"),
            "certifications": p.get("certifications", []),
            "stock": p.get("stock", 0)
        })
    
    return {
        "ingredient": ingredient,
        "suggestions": formatted
    }


@router.post("/{recipe_id}/save")
async def save_recipe(
    recipe_id: str,
    user: dict = Depends(get_current_user)
):
    """Guarda una receta en favoritos del usuario."""
    # Verificar que existe
    recipe = await db.recipes.find_one({"_id": recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    
    # Upsert
    await db.saved_recipes.update_one(
        {"user_id": user["_id"], "recipe_id": recipe_id},
        {"$set": {"saved_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)}},
        upsert=True
    )
    
    # Incrementar contador
    await db.recipes.update_one(
        {"_id": recipe_id},
        {"$inc": {"saves_count": 1}}
    )
    
    return {"success": True, "saved": True}


@router.delete("/{recipe_id}/save")
async def unsave_recipe(
    recipe_id: str,
    user: dict = Depends(get_current_user)
):
    """Elimina una receta de favoritos."""
    result = await db.saved_recipes.delete_one({
        "user_id": user["_id"],
        "recipe_id": recipe_id
    })
    
    if result.deleted_count > 0:
        await db.recipes.update_one(
            {"_id": recipe_id},
            {"$inc": {"saves_count": -1}}
        )
    
    return {"success": True, "saved": False}


@router.post("/{recipe_id}/rate")
async def rate_recipe(
    recipe_id: str,
    rating: int = Query(..., ge=1, le=5),
    user: dict = Depends(get_current_user)
):
    """Valora una receta (1-5 estrellas)."""
    # Verificar que existe
    recipe = await db.recipes.find_one({"_id": recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    
    # Guardar rating
    await db.recipe_ratings.update_one(
        {"user_id": user["_id"], "recipe_id": recipe_id},
        {"$set": {
            "rating": rating,
            "rated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        }},
        upsert=True
    )
    
    # Recalcular promedio
    pipeline = [
        {"$match": {"recipe_id": recipe_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    
    result = await db.recipe_ratings.aggregate(pipeline).to_list(length=1)
    if result:
        await db.recipes.update_one(
            {"_id": recipe_id},
            {"$set": {"ratings": {"avg": round(result[0]["avg"], 2), "count": result[0]["count"]}}}
        )
    
    return {"success": True, "rating": rating}


@router.get("/by/ingredient/{ingredient_name}")
async def get_recipes_by_ingredient(
    ingredient_name: str,
    limit: int = Query(20, ge=1, le=50)
):
    """Encuentra recetas que usen un ingrediente específico."""
    recipes = await recipe_service.get_recipes_by_ingredient(ingredient_name, limit)
    return {"recipes": recipes}
