"""
Superadmin Audit Endpoints
Fase 5: Logs de auditoría compliance
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime

from backend.schemas.superadmin.audit import (
    AuditActionType, AuditLogFilter, AuditLogListResponse, AuditStats
)
from backend.services.superadmin.audit_service import audit_service
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/superadmin/audit", tags=["superadmin-audit"])


async def require_superadmin(current_user: dict = Depends(get_current_user)):
    """Verificar que el usuario es superadmin"""
    if current_user.get("role") != "superadmin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    admin_id: Optional[str] = Query(None),
    action: Optional[AuditActionType] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_superadmin)
):
    """
    Consultar logs de auditoría con filtros avanzados
    """
    filters = AuditLogFilter(
        admin_id=admin_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        tenant_id=tenant_id,
        ip_address=ip_address,
        date_from=date_from,
        date_to=date_to
    )
    
    result = await audit_service.get_audit_logs(filters, page=page, limit=limit)
    
    return AuditLogListResponse(
        entries=result["entries"],
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
        has_more=result["has_more"]
    )


@router.get("/stats", response_model=AuditStats)
async def get_audit_stats(
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(require_superadmin)
):
    """
    Estadísticas de auditoría
    """
    return await audit_service.get_audit_stats(days=days)


@router.get("/resource/{resource_type}/{resource_id}/history")
async def get_resource_history(
    resource_type: str,
    resource_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_superadmin)
):
    """
    Historial completo de un recurso específico
    """
    return await audit_service.get_resource_history(resource_type, resource_id, limit)


@router.get("/export-user/{user_id}")
async def export_user_data(
    user_id: str,
    current_user: dict = Depends(require_superadmin)
):
    """
    Exportar todos los datos de un usuario (GDPR compliance)
    """
    return await audit_service.export_user_data(user_id)


# Helper para logging automático
@router.post("/log-action")
async def manual_log_action(
    action: AuditActionType,
    resource_type: str,
    resource_id: Optional[str] = None,
    change_summary: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """
    Log manual de acción (para casos especiales)
    """
    log_id = await audit_service.log_action(
        admin_id=str(current_user["_id"]),
        admin_email=current_user.get("email", ""),
        admin_role=current_user.get("role", ""),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        change_summary=change_summary
    )
    return {"log_id": log_id, "status": "logged"}
