"""
Endpoints B2B para importadores y productores.
Fase 4: B2B Importer + Fase 15: Producer B2B Requests
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import get_db
from core.auth import get_current_user
from utils.images import extract_product_image

router = APIRouter(tags=["B2B"])


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
                "created_at": datetime.now(timezone.utc)
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
    except Exception:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Actualizar match
    await db.b2b_discovery_matches.update_one(
        {"_id": ObjectId(match_id)},
        {
            "$set": {
                "status": "contacted",
                "first_contact_at": datetime.now(timezone.utc),
                "last_contact_at": datetime.now(timezone.utc),
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
        "contacted_at": datetime.now(timezone.utc)
    }
    await db.b2b_leads.insert_one(lead)
    
    # FUTURE: Notificar al productor (email/push)
    
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
        "created_at": datetime.now(timezone.utc)
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
        "updated_at": datetime.now(timezone.utc)
    }
    
    if status == "qualified":
        update["qualified_at"] = datetime.now(timezone.utc)
    elif status == "proposal_sent":
        update["proposal_sent_at"] = datetime.now(timezone.utc)
    elif status in ["won", "lost"]:
        update["closed_at"] = datetime.now(timezone.utc)
    
    await db.b2b_leads.update_one(
        {
            "_id": ObjectId(lead_id),
            "producer_id": current_user.user_id
        },
        {"$set": update}
    )

    return {"success": True}


# ── Producer B2B Request Management (Fase 15) ─────────────────────

class ConfirmB2BRequest(BaseModel):
    confirmed_unit_price: float
    notes: str = ""
    estimated_days: int = 7


class ShipB2BRequest(BaseModel):
    tracking_number: str
    tracking_url: str = ""


@router.get("/producer/requests")
async def get_producer_b2b_requests(
    status: str = "pending",
    limit: int = 30,
    current_user=Depends(get_current_user),
):
    """Get B2B requests received by the authenticated producer."""
    if current_user.role not in ["producer"]:
        raise HTTPException(status_code=403, detail="Producers only")

    db = get_db()

    query = {"producer_id": current_user.user_id}
    if status != "all":
        if status == "confirmed":
            query["status"] = "confirmed_by_producer"
        elif status == "rejected":
            query["status"] = {"$in": ["rejected_by_producer", "rejected_by_importer"]}
        elif status == "paid":
            query["status"] = {"$in": ["paid", "preparing", "shipped", "delivered"]}
        else:
            query["status"] = status

    requests = await db.b2b_orders.find(query).sort("created_at", -1).limit(limit).to_list(limit)

    pending_count = await db.b2b_orders.count_documents({
        "producer_id": current_user.user_id,
        "status": "pending",
    })

    # Enrich with product and importer info
    enriched = []
    for req in requests:
        product = None
        if req.get("product_id"):
            product = await db.products.find_one(
                {"product_id": req["product_id"]},
                {"name": 1, "images": 1, "unit": 1, "price": 1},
            )

        importer = None
        if req.get("importer_id"):
            importer = await db.users.find_one(
                {"user_id": req["importer_id"]},
                {"company_name": 1, "full_name": 1, "country": 1},
            )

        enriched.append({
            "id": str(req.get("_id", req.get("order_id", ""))),
            "order_id": req.get("order_id", str(req.get("_id", ""))),
            "status": req.get("status", "pending"),
            "product_id": req.get("product_id"),
            "product_name": (product or {}).get("name", req.get("product_name", "Producto")),
            "product_image": extract_product_image(product),
            "unit": (product or {}).get("unit", req.get("unit", "kg")),
            "quantity": req.get("quantity", 0),
            "unit_price": req.get("unit_price", 0),
            "confirmed_unit_price": req.get("confirmed_unit_price"),
            "notes": req.get("notes", ""),
            "importer_username": (importer or {}).get("company_name") or (importer or {}).get("full_name", "Importador"),
            "importer_country": (importer or {}).get("country", ""),
            "estimated_days": req.get("estimated_days"),
            "tracking_number": req.get("tracking_number"),
            "tracking_url": req.get("tracking_url"),
            "created_at": req.get("created_at"),
            "paid_at": req.get("paid_at"),
        })

    return {"requests": enriched, "pending_count": pending_count}


@router.put("/producer/requests/{request_id}/confirm")
async def confirm_b2b_request(
    request_id: str,
    body: ConfirmB2BRequest,
    current_user=Depends(get_current_user),
):
    """Producer confirms availability and price for a B2B request."""
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Producers only")
    if body.confirmed_unit_price <= 0:
        raise HTTPException(status_code=400, detail="Precio debe ser positivo")

    db = get_db()
    from bson.objectid import ObjectId

    try:
        oid = ObjectId(request_id)
    except Exception:
        oid = None

    query = {"producer_id": current_user.user_id, "status": "pending"}
    if oid:
        query["_id"] = oid
    else:
        query["order_id"] = request_id

    result = await db.b2b_orders.update_one(query, {"$set": {
        "status": "confirmed_by_producer",
        "confirmed_unit_price": body.confirmed_unit_price,
        "producer_notes": body.notes,
        "estimated_days": body.estimated_days,
        "confirmed_at": datetime.now(timezone.utc),
    }})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o ya procesada")

    # Find the order to get importer_id for notification
    order = await db.b2b_orders.find_one(query if oid is None else {"_id": oid})
    if order and order.get("importer_id"):
        from routes.notifications import notify_b2b_event
        await notify_b2b_event(
            str(order.get("_id", "")),
            "b2b_offer_received",
            order["importer_id"],
            body=f"El productor ha confirmado tu pedido a {body.confirmed_unit_price:.2f}€/ud.",
        )

    return {"success": True}


@router.put("/producer/requests/{request_id}/reject")
async def reject_b2b_request(
    request_id: str,
    current_user=Depends(get_current_user),
):
    """Producer rejects a B2B request."""
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Producers only")

    db = get_db()
    from bson.objectid import ObjectId

    try:
        oid = ObjectId(request_id)
    except Exception:
        oid = None

    query = {"producer_id": current_user.user_id, "status": "pending"}
    if oid:
        query["_id"] = oid
    else:
        query["order_id"] = request_id

    result = await db.b2b_orders.update_one(query, {"$set": {
        "status": "rejected_by_producer",
        "rejected_at": datetime.now(timezone.utc),
    }})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o ya procesada")

    # Notify importer
    order = await db.b2b_orders.find_one(query if oid is None else {"_id": oid})
    if order and order.get("importer_id"):
        from routes.notifications import create_notification
        await create_notification(
            user_id=order["importer_id"],
            title="Solicitud rechazada",
            body="El productor no puede atender tu solicitud en este momento.",
            notification_type="b2b_request_rejected",
            data={"operation_id": str(order.get("_id", ""))},
            action_url=f"/b2b/tracking/{str(order.get('_id', ''))}",
        )

    return {"success": True}


@router.put("/producer/requests/{request_id}/ship")
async def ship_b2b_request(
    request_id: str,
    body: ShipB2BRequest,
    current_user=Depends(get_current_user),
):
    """Producer marks a paid B2B order as shipped with tracking."""
    if current_user.role != "producer":
        raise HTTPException(status_code=403, detail="Producers only")

    db = get_db()
    from bson.objectid import ObjectId

    try:
        oid = ObjectId(request_id)
    except Exception:
        oid = None

    query = {"producer_id": current_user.user_id, "status": {"$in": ["paid", "preparing"]}}
    if oid:
        query["_id"] = oid
    else:
        query["order_id"] = request_id

    result = await db.b2b_orders.update_one(query, {"$set": {
        "status": "shipped",
        "tracking_number": body.tracking_number,
        "tracking_url": body.tracking_url,
        "shipped_at": datetime.now(timezone.utc),
    }})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado o no está en estado pagado")

    # Notify importer
    order = await db.b2b_orders.find_one(query if oid is None else {"_id": oid})
    if order and order.get("importer_id"):
        from routes.notifications import create_notification
        await create_notification(
            user_id=order["importer_id"],
            title="Pedido B2B enviado",
            body=f"Tracking: {body.tracking_number}",
            notification_type="order_shipped",
            data={"operation_id": str(order.get("_id", "")), "tracking_number": body.tracking_number},
            action_url=f"/b2b/tracking/{str(order.get('_id', ''))}",
        )

    return {"success": True}
