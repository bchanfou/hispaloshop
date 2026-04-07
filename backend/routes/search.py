"""
Search API — Endpoints de búsqueda universal.

Endpoints:
- GET /api/search/universal?q=X — Búsqueda agrupada por tipo
- GET /api/search/suggestions?q=X — Autocomplete
- GET /api/search/trending — Queries trending por país
- GET /api/search/history — Historial del usuario
- POST /api/search/history — Guardar búsqueda
- DELETE /api/search/history — Limpiar historial
- DELETE /api/search/history/:query — Eliminar una búsqueda
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from core.auth import get_current_user, get_optional_user
from services.search_service import search_service
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/universal")
async def search_universal(
    q: str = Query(..., min_length=2, description="Query de búsqueda"),
    country: str = Query("ES", description="País del usuario"),
    language: str = Query("es", description="Idioma"),
    limit: int = Query(20, ge=1, le=50),
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Búsqueda universal que retorna resultados agrupados por tipo.
    
    Response:
    {
        "users": [...],
        "stores": [...],
        "products": [...],
        "recipes": [...],
        "hashtags": [...],
        "posts": [...]
    }
    """
    try:
        results = await search_service.search_universal(q, country, language, limit)
        
        # Guardar en historial si hay usuario
        if user:
            await search_service.save_search(user["_id"], q, country, language)
        
        return {
            "query": q,
            "country": country,
            "results": results,
            "total_count": sum(len(v) for v in results.values())
        }
        
    except Exception as e:
        logger.error(f"[Search] Error en búsqueda universal: {e}")
        raise HTTPException(status_code=500, detail="Error en búsqueda")


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Query parcial"),
    country: str = Query("ES"),
    limit: int = Query(8, ge=1, le=20)
):
    """
    Retorna sugerencias de autocompletado para un query parcial.
    Usado en el search input mientras el usuario escribe.
    """
    try:
        suggestions = await search_service.get_suggestions(q, country, limit)
        return {
            "query": q,
            "suggestions": suggestions
        }
    except Exception as e:
        logger.error(f"[Search] Error en suggestions: {e}")
        return {"query": q, "suggestions": []}


@router.get("/trending")
async def get_trending(
    country: str = Query("ES", description="País"),
    limit: int = Query(10, ge=1, le=20)
):
    """
    Retorna los queries más buscados en los últimos 7 días.
    """
    try:
        trending = await search_service.get_trending_queries(country, limit)
        return {
            "country": country,
            "trending": trending
        }
    except Exception as e:
        logger.error(f"[Search] Error obteniendo trending: {e}")
        return {"country": country, "trending": []}


@router.get("/history")
async def get_search_history(
    user: dict = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=20)
):
    """
    Retorna el historial de búsquedas recientes del usuario.
    """
    try:
        history = await search_service.get_recent_searches(user["_id"], limit)
        return {
            "history": history
        }
    except Exception as e:
        logger.error(f"[Search] Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo historial")


@router.post("/history")
async def save_search(
    query: str = Query(..., min_length=2),
    country: str = Query("ES"),
    language: str = Query("es"),
    user: dict = Depends(get_current_user)
):
    """
    Guarda una búsqueda en el historial del usuario.
    """
    try:
        await search_service.save_search(user["_id"], query, country, language)
        return {"success": True}
    except Exception as e:
        logger.error(f"[Search] Error guardando búsqueda: {e}")
        raise HTTPException(status_code=500, detail="Error guardando búsqueda")


@router.delete("/history")
async def clear_search_history(
    user: dict = Depends(get_current_user)
):
    """
    Limpia todo el historial de búsquedas del usuario.
    """
    try:
        await search_service.clear_recent_searches(user["_id"])
        return {"success": True, "message": "Historial eliminado"}
    except Exception as e:
        logger.error(f"[Search] Error limpiando historial: {e}")
        raise HTTPException(status_code=500, detail="Error limpiando historial")


@router.delete("/history/{query}")
async def delete_search_history_item(
    query: str,
    user: dict = Depends(get_current_user)
):
    """
    Elimina una búsqueda específica del historial.
    """
    try:
        await search_service.delete_recent_search(user["_id"], query)
        return {"success": True}
    except Exception as e:
        logger.error(f"[Search] Error eliminando búsqueda: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando búsqueda")


@router.get("/did-you-mean")
async def did_you_mean(
    q: str = Query(..., min_length=2),
    country: str = Query("ES")
):
    """
    Sugiere corrección si no hay resultados (¿Querías decir...?).
    """
    try:
        suggestion = await search_service.get_did_you_mean(q, country)
        return {
            "query": q,
            "suggestion": suggestion,
            "has_suggestion": suggestion is not None
        }
    except Exception as e:
        logger.error(f"[Search] Error en did-you-mean: {e}")
        return {"query": q, "suggestion": None, "has_suggestion": False}


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS CONTEXTUALES (búsqueda por entidad específica)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
async def search_users(
    q: str = Query(..., min_length=2),
    country: str = Query("ES"),
    limit: int = Query(20, ge=1, le=50)
):
    """Búsqueda específica de usuarios."""
    results = await search_service._search_users(q.lower(), country, limit)
    return {"users": results}


@router.get("/stores")
async def search_stores(
    q: str = Query(..., min_length=2),
    country: str = Query("ES"),
    limit: int = Query(20, ge=1, le=50)
):
    """Búsqueda específica de tiendas."""
    results = await search_service._search_stores(q.lower(), country, limit)
    return {"stores": results}


@router.get("/products")
async def search_products(
    q: str = Query(..., min_length=2),
    country: str = Query("ES"),
    limit: int = Query(20, ge=1, le=50)
):
    """Búsqueda específica de productos."""
    results = await search_service._search_products(q.lower(), country, limit)
    return {"products": results}


@router.get("/recipes")
async def search_recipes(
    q: str = Query(..., min_length=2),
    language: str = Query("es"),
    limit: int = Query(20, ge=1, le=50)
):
    """Búsqueda específica de recetas."""
    results = await search_service._search_recipes(q.lower(), language, limit)
    return {"recipes": results}


@router.get("/hashtags")
async def search_hashtags(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Búsqueda específica de hashtags."""
    results = await search_service._search_hashtags(q.lower().lstrip("#"), limit)
    return {"hashtags": results}
