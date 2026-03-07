"""
Schemas para Sistema de Moderación
Fase 5: Moderación asistida por IA
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    PRODUCT = "product"
    POST = "post"
    COMMENT = "comment"
    REVIEW = "review"
    PROFILE_IMAGE = "profile_image"
    CHAT_MESSAGE = "chat_message"


class ModerationStatus(str, Enum):
    PENDING = "pending"
    AI_REVIEWED = "ai_reviewed"
    HUMAN_REVIEWED = "human_reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


class ModerationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ModerationQueueItem(BaseModel):
    """Item en cola de moderación"""
    id: str = Field(..., alias="_id")
    content_type: ContentType
    content_id: str
    content_preview: Optional[str] = None
    content_url: Optional[str] = None
    
    # Análisis IA
    ai_score: Optional[float] = Field(None, ge=0, le=1)
    ai_flags: List[str] = Field(default_factory=list)
    ai_reviewed_at: Optional[datetime] = None
    
    # Decisión humana
    status: ModerationStatus = ModerationStatus.PENDING
    severity: Optional[ModerationSeverity] = None
    moderator_id: Optional[str] = None
    moderator_notes: Optional[str] = None
    action_taken: Optional[str] = None
    
    # Contexto
    reported_by: Optional[str] = None
    report_reason: Optional[str] = None
    tenant_id: Optional[str] = None
    
    priority_score: int = 0
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class ModerationAction(BaseModel):
    """Acción de moderación"""
    item_id: str
    action: str  # approve, reject, escalate, warn_user, ban_user
    moderator_notes: Optional[str] = None
    notify_user: bool = True


class ModerationStats(BaseModel):
    """Estadísticas de moderación"""
    pending_count: int
    ai_reviewed_count: int
    human_reviewed_count: int
    rejected_count_24h: int
    approved_count_24h: int
    avg_review_time_minutes: Optional[float]
    ai_accuracy: Optional[float]  # Comparación AI vs human


class SystemAlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class SystemAlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class SystemAlert(BaseModel):
    """Alerta operacional del sistema"""
    id: str = Field(..., alias="_id")
    title: str
    description: str
    severity: SystemAlertSeverity
    status: SystemAlertStatus = SystemAlertStatus.ACTIVE
    
    category: Optional[str] = None  # 'payment', 'security', 'performance', 'business'
    source: Optional[str] = None
    
    tenant_id: Optional[str] = None
    affected_resource_type: Optional[str] = None
    affected_resource_id: Optional[str] = None
    
    triggered_value: Optional[str] = None
    threshold_value: Optional[str] = None
    
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    notifications_sent: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    
    class Config:
        populate_by_name = True


class AlertAction(BaseModel):
    """Acción sobre una alerta"""
    alert_id: str
    action: str  # acknowledge, resolve, ignore
    notes: Optional[str] = None
