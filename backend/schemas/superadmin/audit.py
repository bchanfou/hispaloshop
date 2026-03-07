"""
Schemas para Sistema de Auditoría
Fase 5: Compliance SOX/GDPR
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AuditActionType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    EXPORT = "export"
    LOGIN = "login"
    LOGOUT = "logout"
    IMPERSONATE = "impersonate"
    PAYOUT_PROCESS = "payout_process"
    MODERATION_ACTION = "moderation_action"
    SYSTEM_CONFIG = "system_config"


class AuditLogEntry(BaseModel):
    """Entrada de log de auditoría"""
    id: str = Field(..., alias="_id")
    admin_id: str
    admin_email: str
    admin_role: str
    admin_ip: str
    admin_user_agent: Optional[str] = None
    
    action: AuditActionType
    resource_type: str  # 'user', 'tenant', 'order', 'payout', etc.
    resource_id: Optional[str] = None
    resource_description: Optional[Dict[str, Any]] = None
    
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    change_summary: Optional[str] = None
    
    tenant_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    
    created_at: datetime
    
    class Config:
        populate_by_name = True


class AuditLogFilter(BaseModel):
    """Filtros para consulta de logs de auditoría"""
    admin_id: Optional[str] = None
    action: Optional[AuditActionType] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    tenant_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    ip_address: Optional[str] = None


class AuditLogListResponse(BaseModel):
    """Respuesta paginada de logs de auditoría"""
    entries: List[AuditLogEntry]
    total: int
    page: int
    limit: int
    has_more: bool


class AuditStats(BaseModel):
    """Estadísticas de auditoría"""
    total_actions_24h: int
    actions_by_type: Dict[str, int]
    top_admins: List[Dict[str, Any]]
    suspicious_ips: List[Dict[str, Any]]


class DataExportRequest(BaseModel):
    """Solicitud de exportación de datos (GDPR)"""
    user_id: str
    reason: Optional[str] = None
    include_related: bool = True  # Incluir datos relacionados (órdenes, etc.)


class DataExportResponse(BaseModel):
    """Respuesta de exportación de datos"""
    export_id: str
    status: str  # queued, processing, completed, failed
    user_id: str
    requested_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None
