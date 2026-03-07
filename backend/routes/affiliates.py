"""
Endpoints de sistema de afiliados.
Fase 2: Affiliate Engine
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Optional, List
from core.database import get_db
from core.auth import get_current_user, get_optional_user
from services.affiliate_tracking import affiliate_service

router = APIRouter(prefix="/affiliates", tags=["Affiliates"])


@router.get("/click")
async def track_affiliate_click(
    request: Request,
    code: str,
    product_id: Optional[str] = None,
    post_id: Optional[str] = None
):
    """
    Endpoint publico para tracking de clicks en links de afiliado.
    No requiere autenticacion (es el primer touchpoint).
    
    URL tipica: /api/affiliates/click?code=MARIA2024&product_id=123
    """
    # Extraer metadata del request
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    referrer = request.headers.get("referer")
    
    # Geolocalizacion basica
    country = None
    city = None
    
    result = await affiliate_service.track_click(
        affiliate_code=code,
        product_id=product_id,
        post_id=post_id,
        ip_address=ip,
        user_agent=user_agent,
        referrer=referrer,
        country=country,
        city=city
    )
    
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid request"))
    
    return {
        "success": True,
        "click_id": result["click_id"],
        "cookie_duration_days": result["cookie_duration_days"],
        "redirect_to": f"/products/{product_id}" if product_id else "/",
        "influencer": result.get("influencer"),
        "is_suspicious": result.get("is_suspicious", False)
    }


@router.post("/convert")
async def manual_conversion_test(
    click_id: str,
    order_value_cents: int,
    current_user = Depends(get_current_user)
):
    """
    TEST ONLY: Simula una conversion manualmente.
    En produccion, esto se llama automaticamente desde webhook de Stripe.
    """
    # Solo admin o superadmin
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    db = get_db()
    
    # Obtener click
    click = await db.affiliate_clicks.find_one({"click_id": click_id})
    if not click:
        raise HTTPException(status_code=404, detail="Click not found")
    
    # Simular atribucion
    commissions = await affiliate_service.attribute_sale(
        order_id=f"test_order_{click_id}",
        order_number=f"HSP-TEST-{click_id[:8]}",
        customer_id="test_customer",
        items=[{
            "product_id": click.get("product_id") or "test_product",
            "product_name": "Test Product",
            "seller_id": "test_seller",
            "total_price_cents": order_value_cents
        }],
        affiliate_code_from_cookie=click["affiliate_code"]
    )
    
    return {
        "success": True,
        "commissions_created": len(commissions),
        "commissions": commissions
    }


@router.get("/dashboard")
async def get_influencer_dashboard(
    current_user = Depends(get_current_user)
):
    """Dashboard completo para influencers."""
    if current_user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencers only")
    
    dashboard = await affiliate_service.get_influencer_dashboard(
        influencer_id=current_user.user_id,
        tenant_id=getattr(current_user, 'country', None) or "ES"
    )
    
    if "error" in dashboard:
        raise HTTPException(status_code=404, detail=dashboard["error"])
    
    return {
        "success": True,
        "data": dashboard
    }


@router.post("/generate-link")
async def generate_product_affiliate_link(
    product_id: str,
    current_user = Depends(get_current_user)
):
    """Genera link de afiliado especifico para un producto."""
    if current_user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencers only")
    
    # Obtener codigo de afiliado del usuario
    db = get_db()
    user = await db.users.find_one({"user_id": current_user.user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    affiliate_code = user.get("influencer_data", {}).get("affiliate_code")
    if not affiliate_code:
        raise HTTPException(status_code=400, detail="No affiliate code assigned")
    
    link = f"https://hispaloshop.com/r/{affiliate_code}/p/{product_id}"
    
    return {
        "success": True,
        "data": {
            "product_id": product_id,
            "affiliate_link": link,
            "short_link": link  # TODO: Integrar acortador
        }
    }


@router.get("/commissions")
async def get_commission_history(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Historial de comisiones del influencer."""
    if current_user.role != "influencer":
        raise HTTPException(status_code=403, detail="Influencers only")
    
    db = get_db()
    
    query = {"influencer_id": current_user.user_id}
    if status and status != "all":
        query["status"] = status
    
    total = await db.commission_records.count_documents(query)
    
    commissions = await db.commission_records.find(query)\
        .sort("created_at", -1)\
        .skip((page - 1) * limit)\
        .limit(limit)\
        .to_list(length=limit)
    
    # Convertir ObjectId a string
    for c in commissions:
        c["id"] = str(c.pop("_id"))
    
    return {
        "success": True,
        "data": {
            "commissions": commissions,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


# Admin endpoints
@router.post("/admin/approve")
async def approve_commissions(
    commission_ids: List[str],
    current_user = Depends(get_current_user)
):
    """Admin: Aprueba comisiones pendientes (anti-fraude)."""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admins only")
    
    result = await affiliate_service.approve_commissions(
        commission_ids=commission_ids,
        approved_by=current_user.user_id
    )
    
    return {
        "success": True,
        "data": result
    }


@router.post("/admin/payout-batch")
async def create_payout_batch(
    year: int,
    month: int,
    current_user = Depends(get_current_user)
):
    """Admin: Crea lote de pagos mensual."""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admins only")
    
    result = await affiliate_service.process_payout_batch(
        tenant_id=getattr(current_user, 'country', None) or "ES",
        year=year,
        month=month,
        processed_by=current_user.user_id
    )
    
    return {
        "success": True,
        "data": result
    }


@router.get("/admin/stats")
async def get_affiliate_admin_stats(
    tenant_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Admin: Estadisticas globales de afiliados."""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admins only")
    
    db = get_db()
    tenant = tenant_id or getattr(current_user, 'country', None) or "ES"
    
    # Contar influencers activos
    total_influencers = await db.users.count_documents({
        "role": "influencer",
        "status": "active",
        "tenant_id": tenant
    })
    
    # Clicks hoy
    today = datetime.utcnow().replace(hour=0, minute=0, second=0)
    clicks_today = await db.affiliate_clicks.count_documents({
        "created_at": {"$gte": today}
    })
    
    # Comisiones pendientes de aprobacion
    pending_commissions = await db.commission_records.count_documents({
        "tenant_id": tenant,
        "status": "pending"
    })
    
    pending_amount = await db.commission_records.aggregate([
        {"$match": {"tenant_id": tenant, "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_cents"}}}
    ]).to_list(length=1)
    
    return {
        "success": True,
        "data": {
            "tenant_id": tenant,
            "total_influencers": total_influencers,
            "clicks_today": clicks_today,
            "pending_commissions": pending_commissions,
            "pending_amount_cents": pending_amount[0]["total"] if pending_amount else 0
        }
    }
