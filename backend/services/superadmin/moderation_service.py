"""
Servicio de Moderación
Fase 5: Moderación asistida por IA
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId
import asyncio

from backend.core.database import db
from backend.schemas.superadmin.moderation import (
    ContentType, ModerationStatus, ModerationSeverity,
    ModerationQueueItem, ModerationAction, ModerationStats,
    SystemAlert, SystemAlertSeverity, SystemAlertStatus
)


class ModerationService:
    """Servicio de moderación de contenido"""
    
    async def submit_for_review(
        self,
        content_type: ContentType,
        content_id: str,
        content_preview: Optional[str] = None,
        content_url: Optional[str] = None,
        reported_by: Optional[str] = None,
        report_reason: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> str:
        """
        Enviar contenido a cola de moderación
        """
        queue_item = {
            "content_type": content_type.value,
            "content_id": content_id,
            "content_preview": content_preview,
            "content_url": content_url,
            "ai_score": None,
            "ai_flags": [],
            "ai_reviewed_at": None,
            "status": ModerationStatus.PENDING.value,
            "severity": None,
            "moderator_id": None,
            "moderator_notes": None,
            "action_taken": None,
            "reported_by": reported_by,
            "report_reason": report_reason,
            "tenant_id": tenant_id,
            "priority_score": 25 if reported_by else 0,  # Más prioridad si fue reportado
            "created_at": datetime.utcnow(),
            "reviewed_at": None
        }
        
        result = await db.moderation_queue.insert_one(queue_item)
        
        # Disparar análisis IA en background
        asyncio.create_task(self._analyze_with_ai(str(result.inserted_id), content_preview))
        
        return str(result.inserted_id)
    
    async def _analyze_with_ai(self, queue_item_id: str, content: Optional[str]):
        """
        Analizar contenido con OpenAI Moderation API
        """
        if not content:
            return
        
        try:
            import openai
            from backend.core.config import settings
            
            openai.api_key = settings.OPENAI_API_KEY
            
            response = openai.Moderation.create(input=content[:2000])
            result = response["results"][0]
            
            # Calcular score máximo
            scores = result["category_scores"]
            max_score = max(scores.values())
            
            # Flags activos
            flags = [k for k, v in result["categories"].items() if v]
            
            # Determinar severidad
            severity = None
            if max_score > 0.9:
                severity = ModerationSeverity.CRITICAL
            elif max_score > 0.7:
                severity = ModerationSeverity.HIGH
            elif max_score > 0.4:
                severity = ModerationSeverity.MEDIUM
            elif max_score > 0.2:
                severity = ModerationSeverity.LOW
            
            # Calcular prioridad
            priority_score = 25  # Base
            if severity == ModerationSeverity.CRITICAL:
                priority_score += 100
            elif severity == ModerationSeverity.HIGH:
                priority_score += 75
            elif severity == ModerationSeverity.MEDIUM:
                priority_score += 50
            
            # Actualizar en DB
            await db.moderation_queue.update_one(
                {"_id": ObjectId(queue_item_id)},
                {
                    "$set": {
                        "ai_score": max_score,
                        "ai_flags": flags,
                        "ai_reviewed_at": datetime.utcnow(),
                        "status": ModerationStatus.AI_REVIEWED.value,
                        "severity": severity.value if severity else None,
                        "priority_score": priority_score
                    }
                }
            )
            
            # Auto-escalar si es crítico
            if severity == ModerationSeverity.CRITICAL:
                await self._create_auto_alert(queue_item_id, content, max_score, flags)
        
        except Exception as e:
            print(f"AI moderation error: {e}")
    
    async def _create_auto_alert(self, queue_item_id: str, content: str, score: float, flags: List[str]):
        """Crear alerta automática para contenido crítico"""
        await self.create_system_alert(
            title=f"Contenido crítico detectado por IA",
            description=f"Score: {score:.2f}, Flags: {', '.join(flags)}",
            severity=SystemAlertSeverity.CRITICAL,
            category="security",
            source="ai_moderation",
            affected_resource_type="moderation_queue",
            affected_resource_id=queue_item_id
        )
    
    async def get_moderation_queue(
        self,
        status: Optional[ModerationStatus] = None,
        content_type: Optional[ContentType] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Obtener cola de moderación
        """
        query = {}
        if status:
            query["status"] = status.value
        if content_type:
            query["content_type"] = content_type.value
        
        total = await db.moderation_queue.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = db.moderation_queue.find(query).sort([
            ("priority_score", -1),
            ("created_at", 1)
        ]).skip(skip).limit(limit)
        
        items = await cursor.to_list(length=limit)
        for item in items:
            item["_id"] = str(item["_id"])
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": total > (page * limit)
        }
    
    async def process_moderation_action(
        self,
        action: ModerationAction,
        moderator_id: str
    ) -> bool:
        """
        Procesar acción de moderación
        """
        item = await db.moderation_queue.find_one({
            "_id": ObjectId(action.item_id)
        })
        
        if not item:
            return False
        
        # Actualizar estado
        new_status = ModerationStatus.APPROVED if action.action == "approve" else ModerationStatus.REJECTED
        if action.action == "escalate":
            new_status = ModerationStatus.ESCALATED
        
        await db.moderation_queue.update_one(
            {"_id": ObjectId(action.item_id)},
            {
                "$set": {
                    "status": new_status.value,
                    "moderator_id": moderator_id,
                    "moderator_notes": action.moderator_notes,
                    "action_taken": action.action,
                    "reviewed_at": datetime.utcnow()
                }
            }
        )
        
        # Aplicar acción al contenido
        if action.action == "reject":
            await self._reject_content(
                item["content_type"],
                item["content_id"],
                action.moderator_notes
            )
        elif action.action == "approve":
            await self._approve_content(item["content_type"], item["content_id"])
        
        # Notificar usuario si aplica
        if action.notify_user:
            await self._notify_user_action(item, action)
        
        return True
    
    async def _reject_content(self, content_type: str, content_id: str, reason: Optional[str]):
        """Rechazar contenido"""
        if content_type == ContentType.PRODUCT.value:
            await db.products.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"status": "rejected", "rejection_reason": reason}}
            )
        elif content_type == ContentType.POST.value:
            await db.posts.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"status": "rejected", "is_visible": False}}
            )
        elif content_type == ContentType.COMMENT.value:
            await db.comments.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"is_visible": False, "moderated": True}}
            )
    
    async def _approve_content(self, content_type: str, content_id: str):
        """Aprobar contenido"""
        if content_type == ContentType.PRODUCT.value:
            await db.products.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"status": "active"}}
            )
        elif content_type == ContentType.POST.value:
            await db.posts.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"status": "published", "is_visible": True}}
            )
    
    async def _notify_user_action(self, item: Dict, action: ModerationAction):
        """Notificar al usuario sobre la acción de moderación"""
        # Implementar con sistema de notificaciones
        pass
    
    async def get_moderation_stats(self) -> ModerationStats:
        """
        Estadísticas de moderación
        """
        # Pendientes
        pending = await db.moderation_queue.count_documents({
            "status": {"$in": ["pending", "ai_reviewed"]}
        })
        
        # Revisados por IA
        ai_reviewed = await db.moderation_queue.count_documents({
            "ai_reviewed_at": {"$exists": True}
        })
        
        # Revisados por humanos
        human_reviewed = await db.moderation_queue.count_documents({
            "reviewed_at": {"$exists": True}
        })
        
        # Últimas 24h
        day_ago = datetime.utcnow() - timedelta(hours=24)
        rejected_24h = await db.moderation_queue.count_documents({
            "status": "rejected",
            "reviewed_at": {"$gte": day_ago}
        })
        approved_24h = await db.moderation_queue.count_documents({
            "status": "approved",
            "reviewed_at": {"$gte": day_ago}
        })
        
        # Tiempo promedio de revisión
        pipeline = [
            {
                "$match": {
                    "reviewed_at": {"$exists": True},
                    "ai_reviewed_at": {"$exists": True}
                }
            },
            {
                "$project": {
                    "review_time": {
                        "$subtract": ["$reviewed_at", "$ai_reviewed_at"]
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_time": {"$avg": "$review_time"}
                }
            }
        ]
        avg_result = await db.moderation_queue.aggregate(pipeline).to_list(length=1)
        avg_minutes = None
        if avg_result and avg_result[0].get("avg_time"):
            avg_minutes = avg_result[0]["avg_time"] / (1000 * 60)  # Convertir ms a minutos
        
        return ModerationStats(
            pending_count=pending,
            ai_reviewed_count=ai_reviewed,
            human_reviewed_count=human_reviewed,
            rejected_count_24h=rejected_24h,
            approved_count_24h=approved_24h,
            avg_review_time_minutes=avg_minutes,
            ai_accuracy=None  # Calcular comparando IA vs humanos
        )
    
    # System Alerts
    
    async def create_system_alert(
        self,
        title: str,
        description: str,
        severity: SystemAlertSeverity,
        category: Optional[str] = None,
        source: Optional[str] = None,
        tenant_id: Optional[str] = None,
        affected_resource_type: Optional[str] = None,
        affected_resource_id: Optional[str] = None,
        triggered_value: Optional[str] = None,
        threshold_value: Optional[str] = None
    ) -> str:
        """
        Crear alerta del sistema
        """
        alert = {
            "title": title,
            "description": description,
            "severity": severity.value,
            "status": SystemAlertStatus.ACTIVE.value,
            "category": category,
            "source": source,
            "tenant_id": tenant_id,
            "affected_resource_type": affected_resource_type,
            "affected_resource_id": affected_resource_id,
            "triggered_value": triggered_value,
            "threshold_value": threshold_value,
            "notifications_sent": [],
            "created_at": datetime.utcnow()
        }
        
        result = await db.system_alerts.insert_one(alert)
        return str(result.inserted_id)
    
    async def get_system_alerts(
        self,
        status: Optional[SystemAlertStatus] = None,
        severity: Optional[SystemAlertSeverity] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Obtener alertas del sistema
        """
        query = {}
        if status:
            query["status"] = status.value
        if severity:
            query["severity"] = severity.value
        
        total = await db.system_alerts.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = db.system_alerts.find(query).sort([
            ("severity", -1),
            ("created_at", -1)
        ]).skip(skip).limit(limit)
        
        alerts = await cursor.to_list(length=limit)
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        
        return {
            "alerts": alerts,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": total > (page * limit)
        }
    
    async def update_alert_status(
        self,
        alert_id: str,
        new_status: SystemAlertStatus,
        user_id: str,
        notes: Optional[str] = None
    ) -> bool:
        """
        Actualizar estado de alerta
        """
        update = {"status": new_status.value}
        
        if new_status == SystemAlertStatus.ACKNOWLEDGED:
            update["acknowledged_by"] = user_id
            update["acknowledged_at"] = datetime.utcnow()
        elif new_status == SystemAlertStatus.RESOLVED:
            update["resolved_by"] = user_id
            update["resolved_at"] = datetime.utcnow()
            update["resolution_notes"] = notes
        
        result = await db.system_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": update}
        )
        
        return result.modified_count > 0


# Instancia global
moderation_service = ModerationService()
