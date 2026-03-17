"""
Superadmin Moderation Endpoints
Fase 5: Moderación asistida por IA
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from schemas.superadmin.moderation import (
    ContentType, ModerationStatus, ModerationAction,
    ModerationStats, SystemAlertStatus, SystemAlertSeverity
)
from services.superadmin.moderation_service import moderation_service
from routes.auth import get_current_user

router = APIRouter(prefix="/superadmin/moderation", tags=["superadmin-moderation"])


async def require_superadmin(current_user: dict = Depends(get_current_user)):
    """Verificar que el usuario es superadmin o moderator"""
    role = current_user.get("role", "")
    if role not in ["superadmin", "admin", "moderator"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Moderator access required")
    return current_user


@router.get("/queue")
async def get_moderation_queue(
    status: Optional[ModerationStatus] = Query(None),
    content_type: Optional[ContentType] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_superadmin)
):
    """
    Obtener cola de moderación ordenada por prioridad
    """
    return await moderation_service.get_moderation_queue(
        status=status,
        content_type=content_type,
        page=page,
        limit=limit
    )


@router.post("/action")
async def process_moderation_action(
    action: ModerationAction,
    current_user: dict = Depends(require_superadmin)
):
    """
    Procesar acción de moderación (approve/reject/escalate)
    """
    success = await moderation_service.process_moderation_action(
        action=action,
        moderator_id=current_user.user_id
    )
    
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    return {"status": "success", "action": action.action}


@router.get("/stats")
async def get_moderation_stats(
    current_user: dict = Depends(require_superadmin)
):
    """
    Estadísticas de moderación
    """
    return await moderation_service.get_moderation_stats()


@router.post("/submit")
async def submit_content(
    content_type: ContentType,
    content_id: str,
    content_preview: Optional[str] = None,
    content_url: Optional[str] = None,
    report_reason: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """
    Enviar contenido a cola de moderación
    """
    queue_id = await moderation_service.submit_for_review(
        content_type=content_type,
        content_id=content_id,
        content_preview=content_preview,
        content_url=content_url,
        reported_by=current_user.user_id,
        report_reason=report_reason
    )
    
    return {"queue_id": queue_id, "status": "submitted"}


# System Alerts Endpoints

@router.get("/alerts")
async def get_system_alerts(
    status: Optional[SystemAlertStatus] = Query(None),
    severity: Optional[SystemAlertSeverity] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_superadmin)
):
    """
    Obtener alertas del sistema
    """
    return await moderation_service.get_system_alerts(
        status=status,
        severity=severity,
        page=page,
        limit=limit
    )


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """
    Reconocer alerta del sistema
    """
    success = await moderation_service.update_alert_status(
        alert_id=alert_id,
        new_status=SystemAlertStatus.ACKNOWLEDGED,
        user_id=current_user.user_id,
        notes=notes
    )
    
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "acknowledged"}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """
    Resolver alerta del sistema
    """
    success = await moderation_service.update_alert_status(
        alert_id=alert_id,
        new_status=SystemAlertStatus.RESOLVED,
        user_id=current_user.user_id,
        notes=notes
    )
    
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "resolved"}
