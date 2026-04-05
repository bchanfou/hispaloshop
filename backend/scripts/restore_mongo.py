"""
MongoDB restore script.

Flow:
  1. Resolve --backup-id (latest from bucket, specific key, or local file path)
  2. Download (if remote) and verify archive
  3. mongorestore into --target-db (default: hispaloshop_restore_test)
  4. Report collection document counts

Safety:
  - By default restores into `hispaloshop_restore_test`, NEVER production.
  - To restore over production requires BOTH:
      a) --force-production flag
      b) Interactive confirmation (type the DB name + "YES I UNDERSTAND")
    Batch/unattended production restores are intentionally NOT supported —
    a real disaster recovery operator should always confirm interactively.

Examples:
  # List backups in the bucket
  python scripts/restore_mongo.py --list

  # Restore the latest backup into the default test DB
  python scripts/restore_mongo.py --backup-id latest

  # Restore from a local archive (drill mode)
  python scripts/restore_mongo.py --source local --backup-id ./backups/hispaloshop_backup_2026-04-06_03-00-00.gz

  # Emergency: restore over production (requires double confirmation)
  python scripts/restore_mongo.py --backup-id latest --target-db hispaloshop --force-production
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from core.logging_config import configure_logging
    configure_logging()
except Exception:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

logger = logging.getLogger("restore_mongo")


BACKUP_FILE_PREFIX = "hispaloshop_backup"
DEFAULT_TARGET_DB = "hispaloshop_restore_test"
PRODUCTION_DB_NAME_DEFAULT = "hispaloshop"
REQUIRED_CONFIRMATION_PHRASE = "YES I UNDERSTAND"


# ───────────────────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────────────────
def _extract_db_name_from_uri(mongo_url: str) -> str:
    """Extract the DB name from a mongo URI. Returns empty string if not present."""
    try:
        path = urlparse(mongo_url).path or ""
        return path.lstrip("/").split("?")[0]
    except Exception:
        return ""


def _s3_client():
    import boto3
    endpoint = os.environ.get("BACKUP_STORAGE_ENDPOINT") or None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["BACKUP_STORAGE_ACCESS_KEY"],
        aws_secret_access_key=os.environ["BACKUP_STORAGE_SECRET_KEY"],
        region_name=os.environ["BACKUP_STORAGE_REGION"],
    )


def list_s3_backups() -> list[dict]:
    """Return list of backups sorted newest-first."""
    bucket = os.environ["BACKUP_STORAGE_BUCKET"]
    client = _s3_client()
    response = client.list_objects_v2(Bucket=bucket, Prefix=BACKUP_FILE_PREFIX)
    objects = response.get("Contents", [])
    objects.sort(key=lambda o: o["LastModified"], reverse=True)
    return objects


def resolve_s3_backup_key(backup_id: str) -> str:
    """Resolve 'latest' to the newest key, or return backup_id verbatim."""
    if backup_id != "latest":
        return backup_id
    objects = list_s3_backups()
    if not objects:
        logger.error("No backups found in bucket %s", os.environ["BACKUP_STORAGE_BUCKET"])
        sys.exit(1)
    return objects[0]["Key"]


def download_s3_backup(key: str) -> Path:
    bucket = os.environ["BACKUP_STORAGE_BUCKET"]
    client = _s3_client()
    download_dir = Path("/tmp/hispaloshop_backups")
    download_dir.mkdir(parents=True, exist_ok=True)
    target = download_dir / key
    logger.info("[RESTORE] Downloading s3://%s/%s → %s", bucket, key, target)
    client.download_file(Bucket=bucket, Key=key, Filename=str(target))
    size_mb = target.stat().st_size / (1024 * 1024)
    logger.info("[RESTORE] Download OK — %.2f MB", size_mb)
    return target


# ───────────────────────────────────────────────────────────────────────────
# Production safety
# ───────────────────────────────────────────────────────────────────────────
def confirm_production_restore(target_db: str) -> None:
    """
    Two-step interactive confirmation for production restores.
    Aborts if either step fails. There is no non-interactive override.
    """
    logger.warning("=" * 70)
    logger.warning("⚠️  PRODUCTION RESTORE REQUESTED")
    logger.warning("  Target DB: %s", target_db)
    logger.warning("  This will OVERWRITE production data.")
    logger.warning("=" * 70)

    try:
        typed_db = input(f"Type the target DB name ({target_db}) to confirm: ").strip()
    except EOFError:
        logger.error("Cannot read confirmation from stdin (non-interactive session). Aborting.")
        sys.exit(1)

    if typed_db != target_db:
        logger.error("DB name mismatch. Got %r, expected %r. Aborting.", typed_db, target_db)
        sys.exit(1)

    try:
        typed_phrase = input(f"Type exactly '{REQUIRED_CONFIRMATION_PHRASE}' to proceed: ").strip()
    except EOFError:
        logger.error("Cannot read confirmation from stdin. Aborting.")
        sys.exit(1)

    if typed_phrase != REQUIRED_CONFIRMATION_PHRASE:
        logger.error("Confirmation phrase mismatch. Aborting.")
        sys.exit(1)

    logger.warning("Production restore confirmed. Proceeding...")


def is_production_target(target_db: str) -> bool:
    """Detect whether the target DB is the production DB."""
    prod_name = PRODUCTION_DB_NAME_DEFAULT
    mongo_url = os.environ.get("MONGO_URL", "")
    uri_db = _extract_db_name_from_uri(mongo_url)
    if uri_db:
        prod_name = uri_db
    # A target is "production" if it matches the DB name embedded in MONGO_URL
    # OR if it matches the well-known name "hispaloshop"
    return target_db in (prod_name, PRODUCTION_DB_NAME_DEFAULT)


# ───────────────────────────────────────────────────────────────────────────
# Restore
# ───────────────────────────────────────────────────────────────────────────
def run_mongorestore(mongo_url: str, archive_path: Path, target_db: str, source_db: str) -> None:
    """Invoke mongorestore with nsFrom/nsTo to remap the DB name."""
    cmd = [
        "mongorestore",
        f"--uri={mongo_url}",
        "--gzip",
        f"--archive={archive_path}",
        f"--nsFrom={source_db}.*",
        f"--nsTo={target_db}.*",
        "--drop",  # drop target collections before restoring (clean restore)
    ]
    logger.info("[RESTORE] Running mongorestore → target=%s", target_db)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("mongorestore failed (exit=%d)", result.returncode)
        logger.error("stderr: %s", result.stderr.strip())
        sys.exit(1)
    logger.info("[RESTORE] mongorestore OK")
    if result.stderr:
        # mongorestore writes progress to stderr by default — log it as info
        for line in result.stderr.splitlines():
            logger.info("  %s", line)


def count_collections(mongo_url: str, db_name: str) -> dict[str, int]:
    """Report document counts per collection after restore."""
    try:
        from pymongo import MongoClient
    except ImportError:
        logger.warning("pymongo not installed; skipping document count")
        return {}
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    counts = {}
    for name in db.list_collection_names():
        try:
            counts[name] = db[name].count_documents({})
        except Exception as exc:
            logger.warning("count_documents failed for %s: %s", name, exc)
    client.close()
    return counts


def check_mongorestore_installed() -> None:
    import shutil as _shutil
    if _shutil.which("mongorestore") is None:
        logger.error("mongorestore not found on PATH. Install mongodb-database-tools.")
        sys.exit(1)


# ───────────────────────────────────────────────────────────────────────────
# Entrypoint
# ───────────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Restore MongoDB from backup archive.")
    parser.add_argument("--backup-id", help="'latest', an S3 object key, or a local file path (with --source local)")
    parser.add_argument("--target-db", default=DEFAULT_TARGET_DB, help=f"Target DB name (default: {DEFAULT_TARGET_DB})")
    parser.add_argument("--source", choices=["s3", "local"], default="s3", help="Where to get the archive from")
    parser.add_argument("--source-db", default=PRODUCTION_DB_NAME_DEFAULT, help="Source DB name inside the archive")
    parser.add_argument("--force-production", action="store_true", help="Allow restoring over production (requires interactive confirmation)")
    parser.add_argument("--list", action="store_true", help="List available backups in the bucket and exit")
    parser.add_argument("--skip-verify", action="store_true", help="Skip document count report (faster)")
    args = parser.parse_args()

    # --list mode: just print and exit
    if args.list:
        for var in ("BACKUP_STORAGE_BUCKET", "BACKUP_STORAGE_ACCESS_KEY", "BACKUP_STORAGE_SECRET_KEY", "BACKUP_STORAGE_REGION"):
            if not os.environ.get(var):
                logger.error("Missing env var: %s", var)
                return 4
        objects = list_s3_backups()
        if not objects:
            logger.info("No backups found in bucket.")
            return 0
        logger.info("Available backups (newest first):")
        for o in objects[:30]:
            size_mb = o["Size"] / (1024 * 1024)
            logger.info("  %s  (%.2f MB)  %s", o["LastModified"].isoformat(), size_mb, o["Key"])
        return 0

    if not args.backup_id:
        logger.error("--backup-id is required (use --list to see available backups)")
        return 4

    # Require MONGO_URL always
    if not os.environ.get("MONGO_URL"):
        logger.error("Missing env var: MONGO_URL")
        return 4

    check_mongorestore_installed()

    # Production safety
    if is_production_target(args.target_db):
        if not args.force_production:
            logger.error(
                "Target DB '%s' looks like production. Refusing to restore without --force-production.",
                args.target_db,
            )
            return 1
        confirm_production_restore(args.target_db)
    else:
        logger.info("[RESTORE] Target is a non-production DB (%s) — skipping confirmation.", args.target_db)

    # Resolve + fetch the archive
    if args.source == "local":
        archive_path = Path(args.backup_id)
        if not archive_path.exists():
            logger.error("Local archive not found: %s", archive_path)
            return 1
        logger.info("[RESTORE] Using local archive: %s", archive_path)
    else:
        for var in ("BACKUP_STORAGE_BUCKET", "BACKUP_STORAGE_ACCESS_KEY", "BACKUP_STORAGE_SECRET_KEY", "BACKUP_STORAGE_REGION"):
            if not os.environ.get(var):
                logger.error("Missing env var: %s", var)
                return 4
        key = resolve_s3_backup_key(args.backup_id)
        archive_path = download_s3_backup(key)

    # Restore
    run_mongorestore(os.environ["MONGO_URL"], archive_path, args.target_db, args.source_db)

    # Report
    if not args.skip_verify:
        counts = count_collections(os.environ["MONGO_URL"], args.target_db)
        if counts:
            logger.info("[RESTORE] Document counts in %s:", args.target_db)
            total = 0
            for name, count in sorted(counts.items()):
                logger.info("  %-40s %d", name, count)
                total += count
            logger.info("  %-40s %d", "TOTAL", total)

    logger.info("[RESTORE] Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
