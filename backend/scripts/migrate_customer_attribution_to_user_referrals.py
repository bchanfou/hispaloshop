from __future__ import annotations

import os
from datetime import datetime, timezone

from pymongo import MongoClient


def main() -> None:
    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URL")
        or os.environ.get("MONGODB_URI")
        or "mongodb://localhost:27017/hispaloshop"
    )
    db_name = os.environ.get("MONGO_DB_NAME", "hispaloshop")

    client = MongoClient(mongo_url)
    db = client[db_name]

    migrated = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for attribution in db.customer_influencer_attribution.find({"is_active": True}):
        customer_id = attribution.get("customer_id")
        influencer_id = attribution.get("influencer_id")
        expiry = attribution.get("attribution_expiry_date")
        if not customer_id or not influencer_id or not expiry:
            skipped += 1
            continue

        try:
            expiry_dt = datetime.fromisoformat(str(expiry).replace("Z", "+00:00"))
        except ValueError:
            skipped += 1
            continue

        if expiry_dt <= now:
            skipped += 1
            continue

        result = db.users.update_one(
            {
                "user_id": customer_id,
                "$or": [{"referred_by": {"$exists": False}}, {"referred_by": None}],
            },
            {
                "$set": {
                    "referred_by": influencer_id,
                    "referral_code": attribution.get("code_used"),
                    "referral_expires_at": expiry_dt.isoformat(),
                }
            },
        )
        if result.modified_count:
            migrated += 1
        else:
            skipped += 1

    print(f"migrated={migrated} skipped={skipped}")


if __name__ == "__main__":
    main()
