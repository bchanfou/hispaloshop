"""
Superadmin Dashboard Endpoints
Fase 5: Analytics y KPIs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from schemas.superadmin.dashboard import DashboardSummaryResponse
from services.superadmin.analytics_service import analytics_service
from routes.auth import get_current_user

router = APIRouter(prefix="/superadmin/dashboard", tags=["superadmin-dashboard"])


async def require_superadmin(current_user: dict = Depends(get_current_user)):
    """Verificar que el usuario es superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    tenant_id: Optional[str] = Query(None, description="Filtrar por tenant específico"),
    force_refresh: bool = Query(False, description="Forzar recálculo sin cache"),
    current_user: dict = Depends(require_superadmin)
):
    """
    Obtener resumen completo del dashboard con KPIs en tiempo real
    """
    return await analytics_service.get_dashboard_summary(
        tenant_id=tenant_id,
        force_refresh=force_refresh
    )


@router.get("/top-products")
async def get_top_products(
    tenant_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_superadmin)
):
    """
    Productos más vendidos
    """
    return await analytics_service.get_top_products(
        tenant_id=tenant_id,
        limit=limit,
        days=days
    )


@router.get("/top-influencers")
async def get_top_influencers(
    tenant_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_superadmin)
):
    """
    Influencers top por GMV generado
    """
    return await analytics_service.get_top_influencers(
        tenant_id=tenant_id,
        limit=limit,
        days=days
    )
