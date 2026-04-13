"""
Section 4.7c — Migrate legacy B2B chat collections into the unified internal-chat schema.

Reads ``chat_conversations`` + ``chat_messages`` (the legacy B2B chat) and copies
them into ``internal_conversations`` + ``internal_messages`` with:
  - conversation_type='b2b'
  - b2b_context populated from the legacy doc
  - legacy_b2b_conversation_id set (idempotency key)

Idempotent: skips conversations whose ``legacy_b2b_conversation_id`` already
exists in ``internal_conversations``. Does NOT delete legacy collections.

Usage:
    python -m backend.scripts.migrate_b2b_chat_to_unified --dry-run
    python -m backend.scripts.migrate_b2b_chat_to_unified
"""
import argparse
import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone

# Allow running both as module and script
try:
    from core.database import db, get_db  # type: ignore
except Exception:  # pragma: no cover
    sys.path.insert(0, str(__file__).rsplit("backend", 1)[0] + "backend")
    from core.database import db, get_db  # type: ignore


logger = logging.getLogger("migrate_b2b_chat")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def _to_iso(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


async def _resolve_user(user_id):
    if not user_id or user_id == "system":
        return None
    return await db.users.find_one({"user_id": user_id})


async def migrate(dry_run: bool = False):
    summary = {
        "legacy_conversations": 0,
        "already_migrated": 0,
        "conversations_migrated": 0,
        "messages_migrated": 0,
        "skipped_no_participants": 0,
        "errors": 0,
    }

    legacy_convs = db.chat_conversations.find({})
    async for conv in legacy_convs:
        summary["legacy_conversations"] += 1
        legacy_id = conv.get("conversation_id") or str(conv.get("_id"))
        if not legacy_id:
            summary["skipped_no_participants"] += 1
            continue

        # Idempotency check
        existing = await db.internal_conversations.find_one({"legacy_b2b_conversation_id": legacy_id})
        if existing:
            summary["already_migrated"] += 1
            continue

        importer_id = conv.get("importer_id")
        producer_id = conv.get("producer_id")
        if not importer_id or not producer_id:
            summary["skipped_no_participants"] += 1
            continue

        importer = await _resolve_user(importer_id) or {}
        producer = await _resolve_user(producer_id) or {}

        new_conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        new_conv = {
            "conversation_id": new_conversation_id,
            "legacy_b2b_conversation_id": legacy_id,
            "conversation_type": "b2b",
            "b2b_context": {
                "importer_id": importer_id,
                "producer_id": producer_id,
                "rfq_id": conv.get("related_lead_id"),
                "operation_id": conv.get("b2b_operation_id") or conv.get("operation_id"),
                "contract_id": conv.get("contract_id"),
                "shipment_id": conv.get("shipment_id"),
                "product_id": conv.get("related_product_id"),
            },
            "participants": [
                {
                    "user_id": importer_id,
                    "name": importer.get("full_name") or importer.get("name") or "Importador",
                    "role": importer.get("role") or "importer",
                    "avatar": importer.get("picture") or importer.get("profile_image"),
                },
                {
                    "user_id": producer_id,
                    "name": producer.get("full_name") or producer.get("name") or "Productor",
                    "role": producer.get("role") or "producer",
                    "avatar": producer.get("picture") or producer.get("profile_image"),
                },
            ],
            "status": conv.get("status") or "active",
            "last_message": conv.get("last_message_preview"),
            "last_message_at": _to_iso(conv.get("last_message_at")),
            "created_at": _to_iso(conv.get("created_at")) or now,
            "updated_at": _to_iso(conv.get("updated_at")) or now,
        }

        if dry_run:
            summary["conversations_migrated"] += 1
        else:
            try:
                await db.internal_conversations.insert_one(new_conv)
                summary["conversations_migrated"] += 1
            except Exception as exc:
                logger.error("Failed inserting conversation %s: %s", legacy_id, exc)
                summary["errors"] += 1
                continue

        # Migrate messages
        legacy_messages = db.chat_messages.find({"conversation_id": legacy_id}).sort("created_at", 1)
        async for msg in legacy_messages:
            new_msg = {
                "message_id": msg.get("message_id") or f"msg_{uuid.uuid4().hex[:12]}",
                "conversation_id": new_conversation_id,
                "sender_id": msg.get("sender_id"),
                "sender_name": msg.get("sender_name") or "Usuario",
                "sender_role": msg.get("sender_type") or msg.get("sender_role") or "",
                "content": msg.get("content") or "",
                "message_type": "system" if msg.get("is_system_message") else (msg.get("message_type") or "text"),
                "event_type": msg.get("system_message_type"),
                "status": "read",  # legacy → assume read so unread badges aren't inflated
                "created_at": _to_iso(msg.get("created_at")) or now,
                "legacy_b2b_message": True,
            }
            if dry_run:
                summary["messages_migrated"] += 1
            else:
                try:
                    await db.internal_messages.insert_one(new_msg)
                    summary["messages_migrated"] += 1
                except Exception as exc:
                    logger.error("Failed inserting message in %s: %s", legacy_id, exc)
                    summary["errors"] += 1

    return summary


def main():
    parser = argparse.ArgumentParser(description="Migrate legacy B2B chat to unified internal-chat schema")
    parser.add_argument("--dry-run", action="store_true", help="Print counts only — do not write")
    args = parser.parse_args()

    summary = asyncio.run(migrate(dry_run=args.dry_run))
    print("\n=== Migration summary ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print(f"\nMode: {'DRY-RUN' if args.dry_run else 'WRITE'}")


if __name__ == "__main__":
    main()
