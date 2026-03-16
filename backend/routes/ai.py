"""
Endpoints de IA para recomendaciones personalizadas y asistente nutricional.
Fase 1: AI Recommendations
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta

from services.recommendations import recommendation_engine
from services.ai_embeddings import embedding_service
from core.auth import get_current_user, get_optional_user
from core.database import get_db, db
from core.models import User

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/recommendations/feed")
async def get_feed_recommendations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    refresh: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene feed personalizado de productos y posts.
    Cache hibrida: 1h FREE, 15min PRO.
    """
    try:
        # Detectar suscripcion del usuario
        subscription = "free"
        if current_user.role == "consumer":
            # Consumer no tiene subscription field, asumir free
            subscription = "free"
        elif hasattr(current_user, 'producer_data'):
            subscription = current_user.producer_data.get("subscription", {}).get("tier", "free")
        
        result = await recommendation_engine.get_recommendations(
            user_id=current_user.user_id,
            tenant_id=current_user.country or "ES",
            page=page,
            limit=limit,
            refresh=refresh,
            user_subscription=subscription
        )
        
        return {
            "success": True,
            "data": {
                "products": result["products"],
                "posts": result["posts"],
                "meta": {
                    "page": page,
                    "limit": limit,
                    "used_cached": result["used_cached"],
                    "confidence_score": result["confidence_score"],
                    "refresh_available_at": result["refresh_available_at"]
                },
                "reasons": result["reasons"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando recomendaciones: {str(e)}")


@router.post("/recommendations/refresh")
async def refresh_recommendations(
    current_user: User = Depends(get_current_user)
):
    """
    Fuerza regeneracion de recomendaciones (ignora cache).
    FREE: 1 vez al dia. PRO: ilimitado.
    """
    # FUTURE: Implementar rate limiting por suscripcion
    
    result = await recommendation_engine.get_recommendations(
        user_id=current_user.user_id,
        tenant_id=current_user.country or "ES",
        refresh=True,
        user_subscription="pro"  # Forzar refresh
    )
    
    return {
        "success": True,
        "data": result,
        "message": "Recomendaciones actualizadas"
    }


@router.get("/ask")
async def ask_ai(
    q: str = Query(..., min_length=3, max_length=200),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Asistente de IA para preguntas nutricionales y de productos.
    Ej: "¿Que puedo comer en dieta keto?"
    """
    try:
        tenant_id = current_user.country if current_user else "ES"
        
        # Buscar productos similares semanticamente
        products = await db.products.find({
            "tenant_id": tenant_id,
            "status": {"$in": ["active", "approved"]}
        }).limit(100).to_list(length=100)
        
        # Scoring semantico simplificado (sin embeddings para velocidad)
        scored = []
        query_lower = q.lower()
        
        for p in products:
            score = 0
            name_lower = p.get("name", "").lower()
            desc_lower = p.get("description", "").lower()
            tags = [t.lower() for t in p.get("tags", [])]
            ingredients = [i.lower() for i in p.get("ingredients", [])]
            
            # Matching basico
            query_words = query_lower.split()
            for word in query_words:
                if len(word) > 2:  # Ignorar palabras cortas
                    if word in name_lower:
                        score += 15
                    if word in desc_lower:
                        score += 8
                    if any(word in tag for tag in tags):
                        score += 12
                    if any(word in ing for ing in ingredients):
                        score += 5
            
            # Matching de dieta/objetivos
            diet_keywords = {
                "keto": ["keto", "low carb", "high fat", "cetogenica", "sin carbohidratos"],
                "vegan": ["vegan", "plant based", "sin animal", "vegetal", "vegano"],
                "protein": ["protein", "high protein", "proteina", "rico en proteina"],
                "gluten": ["gluten free", "sin gluten", "libre de gluten"],
                "low_sugar": ["sin azucar", "low sugar", "0% azucar"],
                "organic": ["organic", "organico", "bio", "ecologico"]
            }
            
            for diet, keywords in diet_keywords.items():
                if any(k in query_lower for k in keywords):
                    product_text = f"{name_lower} {desc_lower} {' '.join(tags)}"
                    if any(k in product_text for k in keywords):
                        score += 25
            
            if score > 0:
                scored.append({**p, "match_score": score, "id": str(p.get("_id"))})
        
        scored.sort(key=lambda x: x["match_score"], reverse=True)
        top_products = scored[:8]
        
        # Generar respuesta interpretativa
        interpretation = f"Basado en tu busqueda '{q}', encontré estos productos:"
        
        if "keto" in query_lower or "cetogenica" in query_lower:
            interpretation = "Para dieta keto, busca productos bajos en carbohidratos y altos en grasas saludables:"
        elif "vegan" in query_lower or "vegano" in query_lower:
            interpretation = "Opciones 100% vegetales sin ingredientes de origen animal:"
        elif "proteina" in query_lower or "protein" in query_lower:
            interpretation = "Productos ricos en proteina para tus objetivos:"
        elif "gluten" in query_lower:
            interpretation = "Alternativas sin gluten seguras:"
        elif "organico" in query_lower or "bio" in query_lower:
            interpretation = "Productos certificados orgánicos:"
        elif "regalo" in query_lower or "gift" in query_lower:
            interpretation = "Opciones perfectas para regalar:"
        elif "desayuno" in query_lower or "breakfast" in query_lower:
            interpretation = "Ideas para un desayuno saludable:"
        elif "snack" in query_lower:
            interpretation = "Snacks saludables para cualquier momento:"
        
        return {
            "success": True,
            "data": {
                "query": q,
                "interpretation": interpretation,
                "recommended_products": top_products,
                "total_matches": len(scored)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando consulta: {str(e)}")


@router.get("/producer/market-insights")
async def get_market_insights(
    current_user: User = Depends(get_current_user)
):
    """
    Insights de mercado para productores (PRO/ELITE).
    """
    if current_user.role not in ["producer", "importer"]:
        raise HTTPException(status_code=403, detail="Solo para vendedores")
    
    tenant_id = current_user.country or "ES"
    
    # Analisis simple de tendencias
    # Categorias trending (mas ventas ultimos 30 dias)
    trending_categories_pipeline = [
        {"$match": {
            "tenant_id": tenant_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
        }},
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "products",
            "localField": "items.product_id",
            "foreignField": "_id",
            "as": "product"
        }},
        {"$unwind": "$product"},
        {"$group": {
            "_id": "$product.category_id",
            "total_sales": {"$sum": "$items.quantity"},
            "revenue": {"$sum": "$items.total_price_cents"}
        }},
        {"$sort": {"total_sales": -1}},
        {"$limit": 5}
    ]
    
    trending_categories = await db.orders.aggregate(trending_categories_pipeline).to_list(length=5)
    
    # Benchmark de precios (categorias del productor)
    from bson.objectid import ObjectId
    producer_products = await db.products.find({
        "seller_id": current_user.user_id
    }).to_list(length=50)
    
    categories = list(set([p.get("category_id") for p in producer_products if p.get("category_id")]))
    
    price_benchmarks = []
    for cat_id in categories[:3]:  # Top 3 categorias
        cat_products = await db.products.find({
            "category_id": cat_id,
            "status": {"$in": ["active", "approved"]}
        }).to_list(length=100)
        
        if cat_products:
            prices = []
            for p in cat_products:
                price = p.get("price_cents", 0)
                if price == 0:
                    price = int(p.get("price", 0) * 100)
                prices.append(price)
            
            if prices:
                avg_price = sum(prices) / len(prices)
                
                producer_prices = []
                for p in producer_products:
                    if p.get("category_id") == cat_id:
                        price = p.get("price_cents", 0)
                        if price == 0:
                            price = int(p.get("price", 0) * 100)
                        producer_prices.append(price)
                
                producer_avg = sum(producer_prices) / len(producer_prices) if producer_prices else 0
                
                position = "average"
                if producer_avg > avg_price * 1.1:
                    position = "above"
                elif producer_avg < avg_price * 0.9:
                    position = "below"
                
                price_benchmarks.append({
                    "category_id": str(cat_id) if isinstance(cat_id, ObjectId) else cat_id,
                    "market_average": avg_price / 100,  # Convertir a euros
                    "your_average": producer_avg / 100,
                    "position": position
                })
    
    # Sugerencias personalizadas
    suggestions = []
    if len(producer_products) < 5:
        suggestions = [
            "Añade mas fotos a tus productos para +23% conversion",
            "Los productos con descripcion detallada venden 2x mas"
        ]
    else:
        suggestions = [
            "Considera subir precios 5% en tu categoria top",
            "Los productos con certificacion organic tienen mejor margen"
        ]
    
    return {
        "success": True,
        "data": {
            "trending_categories": trending_categories,
            "price_benchmarks": price_benchmarks,
            "suggestions": suggestions
        }
    }


@router.get("/semantic-search")
async def semantic_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Busqueda semantica usando embeddings.
    Encuentra productos semanticamente similares a la query.
    """
    try:
        tenant_id = current_user.country if current_user else "ES"
        
        # Generar embedding de la query
        query_embedding = await embedding_service.generate_query_embedding(q)
        
        # Obtener embeddings de productos
        product_embeddings = await db.product_embeddings.find({
            "tenant_id": tenant_id
        }).to_list(length=500)
        
        if not product_embeddings:
            # Fallback a busqueda normal
            return await ask_ai(q=q, current_user=current_user)
        
        # Calcular similitudes
        scored = []
        for pe in product_embeddings:
            similarity = embedding_service.cosine_similarity(
                query_embedding, pe.get("embedding", [])
            )
            if similarity > 0.7:  # Umbral de relevancia
                scored.append({
                    "product_id": pe.get("product_id"),
                    "similarity": similarity
                })
        
        # Ordenar por similitud
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        top_ids = [s["product_id"] for s in scored[:limit]]
        
        if not top_ids:
            return {
                "success": True,
                "data": {
                    "query": q,
                    "results": [],
                    "total": 0,
                    "message": "No se encontraron productos similares"
                }
            }
        
        # Obtener datos de productos
        from bson.objectid import ObjectId
        obj_ids = []
        for pid in top_ids:
            try:
                obj_ids.append(ObjectId(pid))
            except Exception:
                pass
        
        products = await db.products.find({
            "_id": {"$in": obj_ids},
            "status": {"$in": ["active", "approved"]}
        }).to_list(length=limit)
        
        # Combinar con scores
        results = []
        for p in products:
            pid = str(p.get("_id"))
            score_data = next((s for s in scored if s["product_id"] == pid), None)
            results.append({
                **p,
                "id": pid,
                "semantic_score": score_data["similarity"] if score_data else 0
            })
        
        # Ordenar por score semantico
        results.sort(key=lambda x: x["semantic_score"], reverse=True)
        
        return {
            "success": True,
            "data": {
                "query": q,
                "results": results,
                "total": len(results)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en busqueda semantica: {str(e)}")
