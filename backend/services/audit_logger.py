"""
Unified audit logging for admin and sensitive operations.
Consolidates admin_activity, audit_log, and certificate_logs into one helper.
"""
import uuid
import logging
from datetime import datetime, timezone
from core.database import db

logger = logging.getLogger(__name__)


async def log_admin_action(
    *,
    admin_id: str,
    admin_role: str,
    action: str,
    target_type: str,
    target_id: str,
    details: str = "",
    severity: str = "info",
    extra: dict = None,
):
    """Log an admin action to the audit_log collection.

    Args:
        admin_id: user_id of the admin performing the action
        admin_role: role of the admin (admin, super_admin)
        action: action performed (e.g., "user_suspended", "product_deleted")
        target_type: type of target (e.g., "user", "product", "order")
        target_id: ID of the target resource
        details: human-readable description
        severity: "info", "warning", "critical"
        extra: additional metadata dict
    """
    doc = {
        "log_id": f"audit_{uuid.uuid4().hex[:16]}",
        "admin_id": admin_id,
        "admin_role": admin_role,
        "action": action,
        "target_type": target_type,
        "target_id": str(target_id),
        "details": details,
        "severity": severity,
        "extra": extra or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.audit_log.insert_one(doc)
    except Exception as e:
        logger.error("Failed to write audit log: %s — %s", action, e)
