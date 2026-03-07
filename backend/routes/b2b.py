"""
Endpoints B2B para importadores y productores.
Fase 4: B2B Importer
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException

from core.database import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/b2b", tags=["B2B"])


@router.get("/catalog")
async def get_b2b_catalog(
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    moq_max: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    """
    Catálogo B2B con precios mayoristas.
    Solo para usuarios con rol importer o validados.
    """
    db = get_db()
    
    # Verificar que es importador o tiene acceso B2B
    if current_user.role not in ["importer", "admin", "superadmin"]:
        # Verificar si tiene perfil B2B
        b2b_profile = await db.b2b_profiles.find_one({"user_id": current_user.user_id})
        if not b2b_profile:
            raise HTTPException(status_code=403, detail="B2B access required")
    
    tenant_id = getattr(current_user, 'country', None) or "ES"
    
    # Construir query
    query = {
        "tenant_id": tenant_id,
        "status": {"$in": ["active", "approved"]},
        "b2b_enabled": True  # Producto disponible para B2B
    }
    
    if category:
        query["category_id"] = category
    
    # Obtener productos con precios B2B
    products = await db.products.find(query)\
        .skip((page - 1) * limit)\
        .limit(limit)\
        .to_list(length=limit)
    
    # Enriquecer con precios B2B
    enriched = []
    for product in products:
        product["id"] = str(product.pop("_id", ""))
        
        # Obtener precios B2B
        b2b_prices = await db.b2b_catalog_prices.find({
            "product_id": product["id"],
            "is_active": True
        }).sort("min_quantity", 1).to_list(length=5)
        
        product["b2b_prices"] = [{
            "min_quantity": p["min_quantity"],
            "unit_price_cents": p["unit_price_cents"],
            "max_quantity": p.get("max_quantity")
        } for p in b2b_prices]
        
        # MOQ mínimo
        product["moq"] = b2b_prices[0]["min_quantity"] if b2b_prices else 1
        
        # Filtrar por precio/MOQ si se especificó
        if moq_max and product["moq"] > moq_max:
            continue
        
        enriched.append(product)
    
    total = await db.products.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "products": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/producers")
async def discover_producers(
    category: Optional[str] = None,
    country: Optional[str] = None,
    verified_only: bool = False,
    page: int = 1,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    """
    Descubrimiento de productores para importadores.
    """
    db = get_db()
    
    if current_user.role not in ["importer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Importers only")
    
    tenant_id = getattr(current_user, 'country', None) or "ES"
    
    query = {
        "role": {"$in": ["producer", "importer"]},
        "status": "active",
        "tenant_id": tenant_id
    }
    
    if country:
        query["country"] = country
    
    if verified_only:
        query["verified_producer"] = True
    
    # Si se especifica categoría, buscar productores que tengan productos en esa categoría
    if category:
        # Encontrar productores con productos en esa categoría
        producers_with_category = await db.products.distinct("seller_id", {
            "category_id": category,
            "status": "active"
        })
        query["user_id"] = {"$in": producers_with_category}
    
    producers = await db.users.find(query)\
        .skip((page - 1) * limit)\
        .limit(limit)\
        .to_list(length=limit)
    
    # Enriquecer datos
    enriched = []
    for producer in producers:
        producer["id"] = str(producer.pop("_id", ""))
        
        # Contar productos
        product_count = await db.products.count_documents({
            "seller_id": producer.get("user_id"),
            "status": "active"
        })
        producer["product_count"] = product_count
        
        # Categorías principales
        categories = await db.products.distinct("category_id", {
            "seller_id": producer.get("user_id"),
            "status": "active"
        })
        producer["main_categories"] = categories[:5]
        
        enriched.append(producer)
    
    total = await db.users.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "producers": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/producers/{producer_id}")
async def get_producer_detail(
    producer_id: str,
    current_user = Depends(get_current_user)
):
    """Perfil detallado de un productor para importadores"""
    db = get_db()
    
    if current_user.role not in ["importer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Importers only")
    
    producer = await db.users.find_one({
        "user_id": producer_id,
        "role": {"$in": ["producer", "importer"]},
        "status": "active"
    })
    
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")
    
    producer["id"] = str(producer.pop("_id", ""))
    
    # Productos del productor
    products = await db.products.find({
        "seller_id": producer_id,
        "status": "active"
    }).limit(20).to_list(length=20)
    
    for p in products:
        p["id"] = str(p.pop("_id", ""))
    
    producer["products"] = products
    
    # Stats
    producer["total_products"] = await db.products.count_documents({
        "seller_id": producer_id,
        "status": "active"
    })
    
    return {"success": True, "data": producer}


@router.get("/matches")
async def get_discovery_matches(
    current_user = Depends(get_current_user)
):
    """
    Matches sugeridos entre importador y productores.
    Basado en: categorías de interés, países, volumen.
    """
    db = get_db()
    
    if current_user.role != "importer":
        raise HTTPException(status_code=403, detail="Importers only")
    
    # Obtener perfil B2B del importador
    profile = await db.b2b_profiles.find_one({"user_id": current_user.user_id})
    
    if not profile:
        # Crear matches básicos
        await _generate_basic_matches(current_user.user_id, current_user.country or "ES")
    
    # Obtener matches
    matches = await db.b2b_discovery_matches.find({
        "importer_id": current_user.user_id
    }).sort("match_score", -1).limit(20).to_list(length=20)
    
    # Enriquecer con datos de productor
    enriched = []
    for match in matches:
        match["id"] = str(match.pop("_id", ""))
        
        producer = await db.users.find_one({"user_id": match["producer_id"]})
        if producer:
            match["producer"] = {
                "name": producer.get("full_name"),
                "company": producer.get("company_name"),
                "avatar": producer.get("picture"),
                "country": producer.get("country")
            }
        
        enriched.append(match)
    
    return {"success": True, "data": enriched}


@router.post("/discovery/refresh")
async def refresh_discovery_matches(
    current_user = Depends(get_current_user)
):
    """Refrescar matches con algoritmo mejorado"""
    db = get_db()
    
    if current_user.role != "importer":
        raise HTTPException(status_code=403, detail="Importers only")
    
    # Regenerar matches
    count = await _generate_basic_matches(
        current_user.user_id,
        getattr(current_user, 'country', None) or "ES"
    )
    
    return {
        "success": True,
        "data": {"matches_generated": count}
    }


async def _generate_basic_matches(importer_id: str, tenant_id: str) -> int:
    """Generar matches básicos basados en coincidencias"""
    db = get_db()
    
    # Obtener perfil del importador
    profile = await db.b2b_profiles.find_one({"user_id": importer_id})
    
    if not profile:
        return 0
    
    interested_categories = profile.get("categories_of_interest", [])
    import_countries = profile.get("import_countries", [])
    
    # Buscar productores
    producers = await db.users.find({
        "role": {"$in": ["producer", "importer"]},
        "status": "active",
        "tenant_id": tenant_id
    }).to_list(length=100)
    
    matches_created = 0
    
    for producer in producers:
        producer_id = producer.get("user_id")
        
        # Verificar si ya existe match
        existing = await db.b2b_discovery_matches.find_one({
            "importer_id": importer_id,
            "producer_id": producer_id
        })
        
        if existing:
            continue
        
        # Calcular score
        score = 0.0
        reasons = []
        
        # Categorías coincidentes
        producer_categories = await db.products.distinct("category_id", {
            "seller_id": producer_id,
            "status": "active"
        })
        
        category_matches = len(set(interested_categories) & set(producer_categories))
        if category_matches > 0:
            score += min(0.4, category_matches * 0.1)
            reasons.append("category_match")
        
        # País coincidente
        if producer.get("country") in import_countries:
            score += 0.3
            reasons.append("country_match")
        
        # Volumen (placeholder - en v2 usar embeddings)
        if profile.get("annual_volume_estimate") == "large":
            score += 0.1
            reasons.append("volume_potential")
        
        if score > 0.2:  # Umbral mínimo
            await db.b2b_discovery_matches.insert_one({
                "importer_id": importer_id,
                "producer_id": producer_id,
                "tenant_id": tenant_id,
                "match_score": round(score, 2),
                "match_reasons": reasons,
                "status": "suggested",
                "created_at": datetime.utcnow()
            })
            matches_created += 1
    
    return matches_created


@router.post("/matches/{match_id}/contact")
async def contact_producer(
    match_id: str,
    message: str,
    current_user = Depends(get_current_user)
):
    """Iniciar contacto con un productor"""
    db = get_db()
    from bson.objectid import ObjectId
    
    if current_user.role != "importer":
        raise HTTPException(status_code=403, detail="Importers only")
    
    try:
        match = await db.b2b_discovery_matches.find_one({
            "_id": ObjectId(match_id),
            "importer_id": current_user.user_id
        })
    except:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Actualizar match
    await db.b2b_discovery_matches.update_one(
        {"_id": ObjectId(match_id)},
        {
            "$set": {
                "status": "contacted",
                "first_contact_at": datetime.utcnow(),
                "last_contact_at": datetime.utcnow(),
                "importer_notes": message[:500]
            },
            "$inc": {"contact_count": 1}
        }
    )
    
    # Crear lead
    lead = {
        "match_id": match_id,
        "importer_id": current_user.user_id,
        "producer_id": match["producer_id"],
        "initial_message": message,
        "status": "new",
        "priority": "medium",
        "contacted_at": datetime.utcnow()
    }
    await db.b2b_leads.insert_one(lead)
    
    # TODO: Notificar al productor (email/push)
    
    return {"success": True, "message": "Contact initiated"}


# Endpoints para productores
@router.post("/products/{product_id}/b2b-prices")
async def add_b2b_price(
    product_id: str,
    min_quantity: int,
    unit_price_cents: int,
    max_quantity: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """Productor: Añadir precio mayorista a producto"""
    db = get_db()
    
    if current_user.role not in ["producer", "importer", "admin"]:
        raise HTTPException(status_code=403, detail="Producers only")
    
    # Verificar que el producto pertenece al usuario
    product = await db.products.find_one({
        "_id": __import__('bson').ObjectId(product_id),
        "seller_id": current_user.user_id
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    price_doc = {
        "product_id": product_id,
        "seller_id": current_user.user_id,
        "tenant_id": getattr(current_user, 'country', None) or "ES",
        "min_quantity": min_quantity,
        "unit_price_cents": unit_price_cents,
        "max_quantity": max_quantity,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    await db.b2b_catalog_prices.insert_one(price_doc)
    
    # Marcar producto como B2B enabled
    await db.products.update_one(
        {"_id": __import__('bson').ObjectId(product_id)},
        {"$set": {"b2b_enabled": True}}
    )
    
    return {"success": True, "data": price_doc}


@router.get("/leads")
async def get_b2b_leads(
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Productor: Ver leads de importadores interesados"""
    db = get_db()
    
    if current_user.role not in ["producer", "importer", "admin"]:
        raise HTTPException(status_code=403, detail="Producers only")
    
    query = {"producer_id": current_user.user_id}
    if status:
        query["status"] = status
    
    leads = await db.b2b_leads.find(query).sort("contacted_at", -1).to_list(length=50)
    
    # Enriquecer con datos del importador
    enriched = []
    for lead in leads:
        lead["id"] = str(lead.pop("_id", ""))
        
        importer = await db.users.find_one({"user_id": lead["importer_id"]})
        if importer:
            lead["importer"] = {
                "name": importer.get("full_name"),
                "company": importer.get("company_name"),
                "country": importer.get("country")
            }
        
        enriched.append(lead)
    
    return {"success": True, "data": enriched}


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status: str,
    current_user = Depends(get_current_user)
):
    """Productor: Actualizar estado de lead"""
    db = get_db()
    from bson.objectid import ObjectId
    
    if current_user.role not in ["producer", "importer"]:
        raise HTTPException(status_code=403, detail="Producers only")
    
    update = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    if status == "qualified":
        update["qualified_at"] = datetime.utcnow()
    elif status == "proposal_sent":
        update["proposal_sent_at"] = datetime.utcnow()
    elif status in ["won", "lost"]:
        update["closed_at"] = datetime.utcnow()
    
    await db.b2b_leads.update_one(
        {
            "_id": ObjectId(lead_id),
            "producer_id": current_user.user_id
        },
        {"$set": update}
    )
    
    return {"success": True}
