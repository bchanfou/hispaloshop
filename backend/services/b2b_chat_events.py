"""
B2B Chat Events — sends system messages to conversations for B2B operation milestones.
"""
import logging
from datetime import datetime, timezone
from core.database import get_db

logger = logging.getLogger(__name__)


async def send_b2b_system_message(conversation_id: str, event_type: str, data: dict = None):
    """Insert a system message into the chat conversation for a B2B event."""
    if not conversation_id:
        logger.warning("No conversation_id provided for B2B event %s", event_type)
        return

    db = get_db()
    data = data or {}

    MESSAGE_TEMPLATES = {
        "offer_sent": "\ud83d\udcc4 {sender_name} ha enviado la Oferta v{version}",
        "offer_accepted": "\u2705 Oferta v{version} aceptada por ambas partes",
        "contract_generated": "\ud83d\udccb Contrato listo para firmar",
        "contract_signed": "\ud83d\udd12 Contrato firmado por ambas partes \u00b7 Hash: {hash_short}",
        "payment_received": "\ud83d\udcb3 Pago de {amount} recibido",
        "shipment_confirmed": "\ud83d\udce6 Env\u00edo confirmado \u00b7 {carrier} {tracking}",
        "ai_alert": "\u26a0\ufe0f Hispal AI: {alert_text}",
    }

    template = MESSAGE_TEMPLATES.get(event_type)
    if not template:
        logger.warning("Unknown B2B event type: %s", event_type)
        return

    try:
        text = template.format(**data)
    except KeyError as e:
        logger.error("Missing key %s for event %s template", e, event_type)
        text = template  # fallback with raw template

    now = datetime.now(timezone.utc)

    message_doc = {
        "conversation_id": conversation_id,
        "sender_id": "system",
        "content": text,
        "message_type": "system",
        "event_type": event_type,
        "event_data": data,
        "created_at": now,
        "read_by": [],
    }

    try:
        await db.messages.insert_one(message_doc)
        # Update conversation's last_message
        await db.conversations.update_one(
            {"_id": conversation_id} if isinstance(conversation_id, str) else {"conversation_id": conversation_id},
            {"$set": {
                "last_message": text,
                "last_message_at": now,
                "updated_at": now,
            }},
        )
        logger.info("B2B system message sent: %s for conversation %s", event_type, conversation_id)
    except Exception as exc:
        logger.error("Failed to send B2B system message: %s", exc)
