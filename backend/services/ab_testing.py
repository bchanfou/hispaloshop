"""
A/B Testing Service — Hispaloshop.
Deterministic hash-based user allocation with exposure logging.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class ABTestingService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_user_variant(self, user_id: str, test_id: str) -> str:
        """
        Deterministic hash-based allocation.
        Returns the variant name for this user in the given test.
        Falls back to "control" if the test is not found or inactive.
        """
        test = await self.db.ab_tests.find_one({"test_id": test_id, "active": True})
        if not test:
            return "control"

        hash_input = f"{user_id}:{test_id}".encode()
        hash_val = int(hashlib.md5(hash_input).hexdigest(), 16)
        bucket = hash_val % 100

        cumulative = 0
        for variant_name, weight in test.get("variants", {}).items():
            cumulative += weight
            if bucket < cumulative:
                return variant_name

        return "control"

    async def log_exposure(self, user_id: str, test_id: str, variant: str):
        """Record that a user was exposed to a particular variant."""
        try:
            await self.db.ab_exposures.insert_one({
                "user_id": user_id,
                "test_id": test_id,
                "variant": variant,
                "timestamp": datetime.now(timezone.utc),
            })
        except Exception as e:
            logger.error("[AB] Failed to log exposure for %s/%s: %s", user_id, test_id, e)

    async def create_experiment(
        self,
        test_id: str,
        name: str,
        description: str,
        variants: Dict[str, int],
    ) -> Dict:
        """
        Create a new A/B experiment.
        variants: {"control": 50, "variant_a": 50} — weights must sum to 100.
        """
        total_weight = sum(variants.values())
        if total_weight != 100:
            raise ValueError(f"Variant weights must sum to 100, got {total_weight}")

        doc = {
            "test_id": test_id,
            "name": name,
            "description": description,
            "variants": variants,
            "active": True,
            "created_at": datetime.now(timezone.utc),
        }
        await self.db.ab_tests.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def list_experiments(self, active_only: bool = True) -> List[Dict]:
        """List experiments, optionally only active ones."""
        query = {"active": True} if active_only else {}
        experiments = await self.db.ab_tests.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
        return experiments

    async def stop_experiment(self, test_id: str) -> Optional[Dict]:
        """Deactivate an experiment."""
        result = await self.db.ab_tests.find_one_and_update(
            {"test_id": test_id},
            {"$set": {"active": False, "stopped_at": datetime.now(timezone.utc)}},
            return_document=True,
        )
        if result:
            result.pop("_id", None)
        return result

    async def get_experiment_stats(self, test_id: str) -> Dict:
        """Get exposure counts per variant for an experiment."""
        pipeline = [
            {"$match": {"test_id": test_id}},
            {"$group": {"_id": "$variant", "count": {"$sum": 1}}},
        ]
        stats_raw = await self.db.ab_exposures.aggregate(pipeline).to_list(length=20)
        return {s["_id"]: s["count"] for s in stats_raw}
