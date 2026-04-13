"""
B2B Chat Events — sends system messages to conversations for B2B operation milestones.

Section 4.7c — Unified into the global chat collections (internal_conversations /
internal_messages). System messages render centered with no bubble in the
unified InternalChat UI.
"""
import logging
import uuid
from datetime import datetime, timezone
from core.database import get_db

logger = logging.getLogger(__name__)


# Plain-text templates (no emojis — UI renders system-message styling).
MESSAGE_TEMPLATES = {
    "offer_sent": "{sender_name} ha enviado la Oferta v{version}",
    "offer_accepted": "Oferta v{version} aceptada por ambas partes",
    "contract_generated": "Contrato listo para firmar",
    "contract_signed": "Contrato firmado por ambas partes - Hash: {hash_short}",
    "payment_received": "Pago de {amount} recibido",
    "shipment_confirmed": "Envio confirmado - {carrier} {tracking}",
    "ai_alert": "David AI: {alert_text}",
    "conversation_started": "Conversacion iniciada por {sender_name}",
}


async def send_b2b_system_message(conversation_id: str, event_type: str, data: dict = None):
    """Insert a system message into the unified chat conversation for a B2B event.

    Writes to ``internal_messages`` and updates ``internal_conversations`` so the
    same message renders inside the global InternalChat UI. Falls back to the
    legacy ``messages`` / ``conversations`` collections if the conversation_id
    only exists there (during migration window).
    """
    if not conversation_id:
        logger.warning("No conversation_id provided for B2B event %s", event_type)
        return

    db = get_db()
    data = data or {}

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
    now_iso = now.isoformat()

    # Resolve which collection the conversation lives in.
    target_collection = "internal_messages"
    target_conv_collection = "internal_conversations"
    conv_doc = await db.internal_conversations.find_one({"conversation_id": conversation_id})
    if not conv_doc:
        # Legacy fallback (chat_b2b.py used "chat_conversations")
        legacy = await db.chat_conversations.find_one({"conversation_id": conversation_id})
        if legacy:
            target_collection = "chat_messages"
            target_conv_collection = "chat_conversations"
        else:
            # Default to unified anyway — ensures system messages aren't lost
            logger.info("B2B event %s for unknown conversation %s — writing to unified collections", event_type, conversation_id)

    message_doc = {
        "message_id": f"sys_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "sender_id": "system",
        "sender_name": "Sistema",
        "sender_role": "system",
        "content": text,
        "message_type": "system",
        "event_type": event_type,
        "event_data": data,
        "status": "sent",
        "created_at": now_iso if target_collection == "internal_messages" else now,
        "read_by": [],
    }

    try:
        await db[target_collection].insert_one(message_doc)
        await db[target_conv_collection].update_one(
            {"conversation_id": conversation_id},
            {"$set": {
                "last_message": text,
                "last_message_at": now_iso if target_conv_collection == "internal_conversations" else now,
                "updated_at": now_iso if target_conv_collection == "internal_conversations" else now,
            }},
        )
        logger.info("B2B system message sent: %s for conversation %s (collection=%s)", event_type, conversation_id, target_collection)
    except Exception as exc:
        logger.error("Failed to send B2B system message: %s", exc)
