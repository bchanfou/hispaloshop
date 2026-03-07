"""
Servicio de Auditoría
Fase 5: Compliance SOX/GDPR - Logging inmutable
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from bson import ObjectId

from backend.core.database import db
from backend.schemas.superadmin.audit import (
    AuditActionType, AuditLogEntry, AuditLogFilter, AuditStats
)


class AuditService:
    """Servicio de auditoría para trazabilidad completa"""
    
    async def log_action(
        self,
        admin_id: str,
        admin_email: str,
        admin_role: str,
        action: AuditActionType,
        resource_type: str,
        resource_id: Optional[str] = None,
        previous_state: Optional[Dict] = None,
        new_state: Optional[Dict] = None,
        change_summary: Optional[str] = None,
        tenant_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> str:
        """
        Registrar acción administrativa
        """
        log_entry = {
            "admin_id": admin_id,
            "admin_email": admin_email,
            "admin_role": admin_role,
            "admin_ip": ip_address or "unknown",
            "admin_user_agent": user_agent,
            "action": action.value,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "resource_description": self._extract_resource_description(
                resource_type, new_state or previous_state
            ),
            "previous_state": previous_state,
            "new_state": new_state,
            "change_summary": change_summary or self._generate_change_summary(
                action, resource_type, previous_state, new_state
            ),
            "tenant_id": tenant_id,
            "session_id": session_id,
            "request_id": request_id,
            "created_at": datetime.utcnow()
        }
        
        result = await db.admin_audit_log.insert_one(log_entry)
        return str(result.inserted_id)
    
    async def get_audit_logs(
        self,
        filters: AuditLogFilter,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Obtener logs de auditoría con filtros
        """
        query = {}
        
        if filters.admin_id:
            query["admin_id"] = filters.admin_id
        if filters.action:
            query["action"] = filters.action.value
        if filters.resource_type:
            query["resource_type"] = filters.resource_type
        if filters.resource_id:
            query["resource_id"] = filters.resource_id
        if filters.tenant_id:
            query["tenant_id"] = filters.tenant_id
        if filters.ip_address:
            query["admin_ip"] = filters.ip_address
        if filters.date_from or filters.date_to:
            query["created_at"] = {}
            if filters.date_from:
                query["created_at"]["$gte"] = filters.date_from
            if filters.date_to:
                query["created_at"]["$lte"] = filters.date_to
        
        # Contar total
        total = await db.admin_audit_log.count_documents(query)
        
        # Obtener registros
        skip = (page - 1) * limit
        cursor = db.admin_audit_log.find(query).sort("created_at", -1).skip(skip).limit(limit)
        entries = await cursor.to_list(length=limit)
        
        # Convertir _id a string
        for entry in entries:
            entry["_id"] = str(entry["_id"])
        
        return {
            "entries": entries,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": total > (page * limit)
        }
    
    async def get_audit_stats(self, days: int = 7) -> AuditStats:
        """
        Estadísticas de auditoría
        """
        cutoff = datetime.utcnow() - __import__('datetime').timedelta(days=days)
        
        # Total acciones últimas 24h
        day_cutoff = datetime.utcnow() - __import__('datetime').timedelta(hours=24)
        total_24h = await db.admin_audit_log.count_documents({
            "created_at": {"$gte": day_cutoff}
        })
        
        # Acciones por tipo
        pipeline_types = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}}
        ]
        types_result = await db.admin_audit_log.aggregate(pipeline_types).to_list(length=None)
        actions_by_type = {r["_id"]: r["count"] for r in types_result}
        
        # Top admins
        pipeline_admins = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": "$admin_id",
                "email": {"$first": "$admin_email"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_admins = await db.admin_audit_log.aggregate(pipeline_admins).to_list(length=None)
        
        # IPs sospechosas (múltiples admins desde misma IP)
        pipeline_ips = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": "$admin_ip",
                "unique_admins": {"$addToSet": "$admin_id"},
                "count": {"$sum": 1}
            }},
            {"$match": {"$expr": {"$gt": [{"$size": "$unique_admins"}, 1]}}},
            {"$sort": {"count": -1}}
        ]
        suspicious_ips = await db.admin_audit_log.aggregate(pipeline_ips).to_list(length=None)
        
        return AuditStats(
            total_actions_24h=total_24h,
            actions_by_type=actions_by_type,
            top_admins=[{
                "admin_id": a["_id"],
                "email": a["email"],
                "actions": a["count"]
            } for a in top_admins],
            suspicious_ips=[{
                "ip": s["_id"],
                "admin_count": len(s["unique_admins"]),
                "action_count": s["count"]
            } for s in suspicious_ips]
        )
    
    async def get_resource_history(
        self,
        resource_type: str,
        resource_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """
        Historial completo de un recurso específico
        """
        cursor = db.admin_audit_log.find({
            "resource_type": resource_type,
            "resource_id": resource_id
        }).sort("created_at", -1).limit(limit)
        
        entries = await cursor.to_list(length=limit)
        for entry in entries:
            entry["_id"] = str(entry["_id"])
        
        return entries
    
    def _extract_resource_description(
        self,
        resource_type: str,
        state: Optional[Dict]
    ) -> Dict[str, Any]:
        """Extraer descripción resumida del recurso"""
        if not state:
            return {}
        
        if resource_type == "user":
            return {
                "email": state.get("email"),
                "display_name": state.get("display_name"),
                "role": state.get("role"),
                "status": state.get("status")
            }
        elif resource_type == "order":
            return {
                "order_number": state.get("order_number"),
                "total_amount": state.get("total_amount"),
                "status": state.get("status"),
                "user_id": state.get("user_id")
            }
        elif resource_type == "product":
            return {
                "name": state.get("name"),
                "category": state.get("category"),
                "price": state.get("price"),
                "status": state.get("status")
            }
        elif resource_type == "tenant":
            return {
                "name": state.get("name"),
                "operational_status": state.get("operational_status"),
                "feature_flags": state.get("feature_flags")
            }
        
        return {"id": state.get("_id") or state.get("id")}
    
    def _generate_change_summary(
        self,
        action: AuditActionType,
        resource_type: str,
        previous: Optional[Dict],
        new: Optional[Dict]
    ) -> str:
        """Generar resumen de cambios"""
        if action == AuditActionType.CREATE:
            return f"Created new {resource_type}"
        elif action == AuditActionType.DELETE:
            return f"Deleted {resource_type}"
        elif action == AuditActionType.VIEW:
            return f"Viewed {resource_type}"
        elif action == AuditActionType.LOGIN:
            return "Admin login"
        elif action == AuditActionType.LOGOUT:
            return "Admin logout"
        elif action == AuditActionType.IMPERSONATE:
            return f"Started impersonating user"
        
        # Para updates, detectar campos cambiados
        if previous and new:
            changed_fields = []
            for key in new:
                if key in previous and previous[key] != new[key]:
                    changed_fields.append(key)
            
            if changed_fields:
                return f"Updated {resource_type}: changed {', '.join(changed_fields[:5])}"
        
        return f"Modified {resource_type}"
    
    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Exportar todos los datos de un usuario (GDPR)
        """
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        # Eliminar campos sensibles de la exportación
        user.pop("password_hash", None)
        user.pop("stripe_customer_id", None)
        
        # Órdenes
        orders = await db.orders.find({"user_id": user_id}).to_list(length=None)
        
        # Comisiones (si es influencer)
        commissions = await db.commission_records.find({
            "influencer_id": user_id
        }).to_list(length=None)
        
        # Direcciones
        addresses = await db.addresses.find({"user_id": user_id}).to_list(length=None)
        
        # Posts (si tiene)
        posts = await db.posts.find({"author_id": user_id}).to_list(length=None)
        
        return {
            "user": user,
            "orders": orders,
            "commissions": commissions,
            "addresses": addresses,
            "posts": posts,
            "exported_at": datetime.utcnow().isoformat()
        }


# Instancia global
audit_service = AuditService()
