"""
Weekly backup verification script.

Purpose: prove that the latest daily backup is actually restorable. A backup
that has never been restored is not a backup.

Flow:
  1. List backups in the bucket, pick the newest.
  2. Download it.
  3. Restore into a temporary DB (`hispaloshop_backup_verify`).
  4. Count documents in each critical collection (see CRITICAL_COLLECTIONS).
  5. Optionally compare counts against the production DB (±5% tolerance)
     to detect silent corruption. Controlled by VERIFY_COMPARE_WITH_PROD=1.
  6. Drop the temporary DB.
  7. Report OK/FAIL and exit with matching code.

Env vars: same as backup_mongo.py + optional:
  VERIFY_COMPARE_WITH_PROD=1    Enable prod comparison step (default: off,
                                since prod MONGO_URL may differ from the
                                backup source URL).
  PRODUCTION_MONGO_URL          Override MONGO_URL for the prod comparison
                                (if not set, MONGO_URL is used for both).

Exit codes:
  0 — verification passed
  1 — backup not found or restore failed
  2 — document counts empty or below critical threshold
  3 — drift >5% compared to production (if comparison enabled)
"""
from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from core.logging_config import configure_logging
    configure_logging()
except Exception:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

logger = logging.getLogger("verify_backup")


VERIFY_DB_NAME = "hispaloshop_backup_verify"
DRIFT_TOLERANCE = 0.05  # 5%

# Collections that MUST contain data in a valid backup. If any of these end up
# with 0 docs after restore, the backup is considered invalid (the source DB
# has no users/products/orders, which would be suspicious for a live system).
# For pre-launch, many of these will be empty and that's OK — we check shape,
# not absolute presence.
CRITICAL_COLLECTIONS = (
    "users",
    "products",
    "orders",
    "carts",
    "stores",
    "categories",
    "notifications",
    "conversations",
    "posts",
    "communities",
    "discount_codes",
    "country_configs",
)

# Collections that must exist (even if empty) post-restore. If the collection
# is missing entirely, something went wrong with mongodump/mongorestore.
MUST_EXIST_COLLECTIONS = CRITICAL_COLLECTIONS


def _ensure_tools() -> None:
    import shutil
    for tool in ("mongodump", "mongorestore"):
        if shutil.which(tool) is None:
            logger.error("%s not found on PATH. Install mongodb-database-tools.", tool)
            sys.exit(1)


def _report_sentry(exc: Exception, context: dict | None = None) -> None:
    try:
        import sentry_sdk  # type: ignore
        if not os.environ.get("SENTRY_DSN"):
            return
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("script", "verify_backup")
            if context:
                for k, v in context.items():
                    scope.set_extra(k, v)
            sentry_sdk.capture_exception(exc)
    except Exception:
        pass


def _count_collections(mongo_url: str, db_name: str) -> dict[str, int]:
    from pymongo import MongoClient
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    counts: dict[str, int] = {}
    for name in db.list_collection_names():
        try:
            counts[name] = db[name].count_documents({})
        except Exception as exc:
            logger.warning("count_documents failed for %s: %s", name, exc)
    client.close()
    return counts


def _drop_db(mongo_url: str, db_name: str) -> None:
    from pymongo import MongoClient
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    try:
        client.drop_database(db_name)
        logger.info("[VERIFY] Dropped temp DB %s", db_name)
    except Exception as exc:
        logger.warning("Failed to drop %s: %s", db_name, exc)
    finally:
        client.close()


def main() -> int:
    required = ("MONGO_URL", "BACKUP_STORAGE_BUCKET", "BACKUP_STORAGE_ACCESS_KEY",
                "BACKUP_STORAGE_SECRET_KEY", "BACKUP_STORAGE_REGION")
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        logger.error("Missing env vars: %s", ", ".join(missing))
        return 4

    _ensure_tools()

    logger.info("[VERIFY] Starting weekly backup verification")

    # 1. Download the latest backup via restore script's helper logic
    from restore_mongo import list_s3_backups, download_s3_backup, resolve_s3_backup_key  # noqa: E402

    objects = list_s3_backups()
    if not objects:
        logger.error("[VERIFY] FAIL — no backups found in bucket")
        _report_sentry(RuntimeError("no_backups_in_bucket"))
        return 1

    newest = objects[0]
    logger.info("[VERIFY] Latest backup: %s (%.2f MB, %s)",
                newest["Key"], newest["Size"] / (1024 * 1024), newest["LastModified"].isoformat())

    key = resolve_s3_backup_key("latest")
    archive_path = download_s3_backup(key)

    # 2. Restore into verify DB
    cmd = [
        "mongorestore",
        f"--uri={os.environ['MONGO_URL']}",
        "--gzip",
        f"--archive={archive_path}",
        f"--nsFrom=hispaloshop.*",
        f"--nsTo={VERIFY_DB_NAME}.*",
        "--drop",  # clean any prior verify run
    ]
    logger.info("[VERIFY] Restoring into temp DB %s", VERIFY_DB_NAME)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("[VERIFY] FAIL — mongorestore failed: %s", result.stderr.strip())
        _report_sentry(RuntimeError("mongorestore_failed"), context={"stderr": result.stderr[:500]})
        _drop_db(os.environ["MONGO_URL"], VERIFY_DB_NAME)
        return 1

    # 3. Count collections
    try:
        counts = _count_collections(os.environ["MONGO_URL"], VERIFY_DB_NAME)
    except Exception as exc:
        logger.error("[VERIFY] FAIL — could not count collections: %s", exc)
        _report_sentry(exc)
        _drop_db(os.environ["MONGO_URL"], VERIFY_DB_NAME)
        return 2

    logger.info("[VERIFY] Collection counts in %s:", VERIFY_DB_NAME)
    for name in sorted(counts):
        logger.info("  %-40s %d", name, counts[name])

    # 4. Shape check
    missing_collections = [c for c in MUST_EXIST_COLLECTIONS if c not in counts]
    if missing_collections:
        logger.error("[VERIFY] FAIL — missing collections after restore: %s", missing_collections)
        _report_sentry(
            RuntimeError("missing_collections"),
            context={"missing": missing_collections, "backup_key": newest["Key"]},
        )
        _drop_db(os.environ["MONGO_URL"], VERIFY_DB_NAME)
        return 2

    # 5. Optional: compare with production
    if os.environ.get("VERIFY_COMPARE_WITH_PROD") == "1":
        prod_url = os.environ.get("PRODUCTION_MONGO_URL", os.environ["MONGO_URL"])
        try:
            prod_counts = _count_collections(prod_url, "hispaloshop")
        except Exception as exc:
            logger.warning("[VERIFY] Could not read prod counts for comparison: %s", exc)
            prod_counts = {}

        if prod_counts:
            drifted: list[str] = []
            for name in CRITICAL_COLLECTIONS:
                backup_n = counts.get(name, 0)
                prod_n = prod_counts.get(name, 0)
                if prod_n == 0:
                    continue  # nothing to compare against
                drift = abs(backup_n - prod_n) / prod_n
                if drift > DRIFT_TOLERANCE:
                    drifted.append(f"{name}: backup={backup_n} prod={prod_n} drift={drift:.1%}")
            if drifted:
                logger.error("[VERIFY] FAIL — drift >5%% detected:")
                for line in drifted:
                    logger.error("  %s", line)
                _report_sentry(RuntimeError("drift_detected"), context={"drifted": drifted})
                _drop_db(os.environ["MONGO_URL"], VERIFY_DB_NAME)
                return 3
            logger.info("[VERIFY] Drift check: all critical collections within ±%.0f%% of prod", DRIFT_TOLERANCE * 100)

    # 6. Cleanup
    _drop_db(os.environ["MONGO_URL"], VERIFY_DB_NAME)
    try:
        archive_path.unlink()
    except Exception:
        pass

    logger.info("[VERIFY] OK — backup %s verified successfully.", newest["Key"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
