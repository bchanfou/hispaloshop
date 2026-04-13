"""
Backfill conv_type for legacy internal_conversations.

Idempotent: only updates conversations where conv_type is null/missing/'internal'.

Usage:
    python -m backend.scripts.backfill_conversation_types --dry-run
    python -m backend.scripts.backfill_conversation_types
"""
import asyncio
import argparse
import os
import sys

# Add parent directory to path so we can import core.* / routes.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import db  # noqa: E402
from routes.internal_chat import infer_conversation_type  # noqa: E402


async def backfill(dry_run: bool = False) -> dict:
    """Walk every conversation missing a real conv_type, infer & update."""
    counts = {"b2b": 0, "collab": 0, "store": 0, "personal": 0, "skipped_group": 0, "skipped_no_users": 0}

    query = {
        "$or": [
            {"conv_type": {"$exists": False}},
            {"conv_type": None},
            {"conv_type": ""},
            {"conv_type": "internal"},
        ]
    }
    cursor = db.internal_conversations.find(query)
    total = 0
    async for conv in cursor:
        total += 1
        # Skip groups — conv_type only relevant for 1:1
        if conv.get("type") == "group":
            counts["skipped_group"] += 1
            continue
        participants = conv.get("participants") or []
        if len(participants) < 2:
            counts["skipped_no_users"] += 1
            continue

        # Roles may already be embedded; otherwise look up users collection
        roles = []
        for p in participants[:2]:
            role = (p or {}).get("role")
            if not role:
                user_doc = await db.users.find_one({"user_id": (p or {}).get("user_id")}, {"role": 1})
                role = (user_doc or {}).get("role")
            roles.append(role)

        inferred = infer_conversation_type(roles[0], roles[1])
        counts[inferred] = counts.get(inferred, 0) + 1

        if not dry_run:
            await db.internal_conversations.update_one(
                {"conversation_id": conv.get("conversation_id")},
                {"$set": {"conv_type": inferred}},
            )

    counts["total_scanned"] = total
    counts["dry_run"] = dry_run
    return counts


async def main():
    parser = argparse.ArgumentParser(description="Backfill conv_type for legacy internal conversations")
    parser.add_argument("--dry-run", action="store_true", help="Print counts but do not write")
    args = parser.parse_args()

    print(f"[backfill_conversation_types] dry_run={args.dry_run}")
    result = await backfill(dry_run=args.dry_run)
    print("[backfill_conversation_types] result:")
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
