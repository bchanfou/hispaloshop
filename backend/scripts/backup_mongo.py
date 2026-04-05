"""
MongoDB daily backup script.

Flow:
  1. mongodump --uri=$MONGO_URL --gzip --archive=<timestamped.gz>
  2. Upload to S3-compatible bucket (AWS S3 / Cloudflare R2 / Backblaze B2)
     with server-side encryption (AES256)
  3. Safety prune of old backups (keep last 30 daily + 12 monthly)
  4. Report to Sentry on failure

Modes:
  --dry-run      Run mongodump + prepare upload payload, but DO NOT upload
                 and DO NOT prune. Use for CI smoke tests and first-run drill.
  --local-only   Dump to ./backups/<timestamped.gz> without uploading to S3.
                 No env vars required beyond MONGO_URL. Use for local drills.

Environment variables (required unless --local-only):
  MONGO_URL                    Source MongoDB URI (test or prod)
  BACKUP_STORAGE_BUCKET        S3/R2 bucket name (e.g. hispaloshop-backups)
  BACKUP_STORAGE_ACCESS_KEY    Access key for the bucket
  BACKUP_STORAGE_SECRET_KEY    Secret key for the bucket
  BACKUP_STORAGE_REGION        Region (e.g. auto for R2, eu-west-1 for AWS)
  BACKUP_STORAGE_ENDPOINT      (Optional) Custom endpoint URL for R2/B2/MinIO.
                               Leave empty for AWS S3.

Exit codes:
  0 — success
  1 — mongodump failed
  2 — upload failed
  3 — prune failed (backup itself succeeded)
  4 — missing required env vars

First-run drill (manual, by founder after configuring R2):
  Via GitHub Actions: trigger workflow_dispatch on backup-daily.yml
  Locally (requires mongodb-database-tools):
    cd backend && python scripts/backup_mongo.py --local-only
"""
from __future__ import annotations

import argparse
import gzip  # noqa: F401 — imported for type signatures / future use
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Import logging_config from sibling core/ if available, otherwise basic setup
_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from core.logging_config import configure_logging
    configure_logging()
except Exception:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

logger = logging.getLogger("backup_mongo")


# ───────────────────────────────────────────────────────────────────────────
# Configuration
# ───────────────────────────────────────────────────────────────────────────
REQUIRED_ENV_VARS_FOR_S3 = (
    "MONGO_URL",
    "BACKUP_STORAGE_BUCKET",
    "BACKUP_STORAGE_ACCESS_KEY",
    "BACKUP_STORAGE_SECRET_KEY",
    "BACKUP_STORAGE_REGION",
)
# BACKUP_STORAGE_ENDPOINT is optional (only for non-AWS)

DEFAULT_LOCAL_DIR = Path(__file__).resolve().parents[1] / "backups"
BACKUP_FILE_PREFIX = "hispaloshop_backup"


# ───────────────────────────────────────────────────────────────────────────
# Core steps
# ───────────────────────────────────────────────────────────────────────────
def check_env_vars(local_only: bool) -> None:
    """Fail fast if required env vars are missing."""
    missing: list[str] = []
    if not os.environ.get("MONGO_URL"):
        missing.append("MONGO_URL")
    if not local_only:
        for var in REQUIRED_ENV_VARS_FOR_S3:
            if not os.environ.get(var):
                missing.append(var)
    if missing:
        logger.error("Missing required env vars: %s", ", ".join(missing))
        logger.error("See backend/.env.example for descriptions.")
        sys.exit(4)


def check_mongodump_installed() -> None:
    """Verify mongodump is on PATH before attempting to use it."""
    if shutil.which("mongodump") is None:
        logger.error(
            "mongodump not found on PATH. Install with:\n"
            "  Ubuntu: sudo apt install mongodb-database-tools\n"
            "  macOS:  brew tap mongodb/brew && brew install mongodb-database-tools\n"
            "  Windows: https://www.mongodb.com/try/download/database-tools"
        )
        sys.exit(1)


def build_backup_path(output_dir: Path) -> Path:
    """Generate the timestamped archive path."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    return output_dir / f"{BACKUP_FILE_PREFIX}_{timestamp}.gz"


def run_mongodump(mongo_url: str, archive_path: Path) -> None:
    """Invoke mongodump with gzip + archive mode. Raises SystemExit on failure."""
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "mongodump",
        f"--uri={mongo_url}",
        "--gzip",
        f"--archive={archive_path}",
    ]
    logger.info("[BACKUP] Running mongodump → %s", archive_path.name)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("mongodump failed (exit=%d)", result.returncode)
        logger.error("stderr: %s", result.stderr.strip())
        sys.exit(1)

    if not archive_path.exists() or archive_path.stat().st_size == 0:
        logger.error("mongodump completed but archive is missing or empty: %s", archive_path)
        sys.exit(1)

    size_mb = archive_path.stat().st_size / (1024 * 1024)
    logger.info("[BACKUP] mongodump OK — %.2f MB", size_mb)


def _s3_client():
    """Build a boto3 S3 client configured for AWS or an S3-compatible endpoint."""
    import boto3  # lazy import — not needed for --local-only

    endpoint = os.environ.get("BACKUP_STORAGE_ENDPOINT") or None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["BACKUP_STORAGE_ACCESS_KEY"],
        aws_secret_access_key=os.environ["BACKUP_STORAGE_SECRET_KEY"],
        region_name=os.environ["BACKUP_STORAGE_REGION"],
    )


def upload_to_s3(archive_path: Path) -> str:
    """Upload the archive to the configured bucket with AES256 SSE. Returns object key."""
    bucket = os.environ["BACKUP_STORAGE_BUCKET"]
    object_key = archive_path.name
    client = _s3_client()

    logger.info("[BACKUP] Uploading %s to bucket=%s key=%s", archive_path.name, bucket, object_key)
    try:
        client.upload_file(
            Filename=str(archive_path),
            Bucket=bucket,
            Key=object_key,
            ExtraArgs={
                "ServerSideEncryption": "AES256",
                "Metadata": {
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "source": "backup_mongo.py",
                },
            },
        )
    except Exception as exc:
        logger.error("Upload failed: %s", exc)
        _report_sentry(exc, context={"phase": "upload", "key": object_key})
        sys.exit(2)

    logger.info("[BACKUP] Upload OK — s3://%s/%s", bucket, object_key)
    return object_key


def prune_old_backups() -> None:
    """
    Delete backups older than 30 days, EXCEPT keep the first-of-each-month
    for 12 months.

    SAFETY: refuses to prune if fewer than 7 backups exist in the bucket.
    This prevents a bug in the rotation logic from wiping history.
    """
    bucket = os.environ["BACKUP_STORAGE_BUCKET"]
    client = _s3_client()

    try:
        response = client.list_objects_v2(Bucket=bucket, Prefix=BACKUP_FILE_PREFIX)
    except Exception as exc:
        logger.error("list_objects_v2 failed: %s", exc)
        _report_sentry(exc, context={"phase": "prune_list"})
        sys.exit(3)

    objects = response.get("Contents", [])
    if len(objects) < 7:
        logger.warning(
            "[PRUNE] Only %d backups in bucket — skipping prune for safety "
            "(need at least 7 to allow deletion).",
            len(objects),
        )
        return

    # Sort newest first
    objects.sort(key=lambda o: o["LastModified"], reverse=True)

    now = datetime.now(timezone.utc)
    keepers: set[str] = set()

    # Keep last 30 daily backups
    for obj in objects[:30]:
        keepers.add(obj["Key"])

    # Keep first-of-month for last 12 months (one per month)
    seen_months: set[str] = set()
    for obj in objects:
        month_key = obj["LastModified"].strftime("%Y-%m")
        if month_key not in seen_months:
            seen_months.add(month_key)
            keepers.add(obj["Key"])
        if len(seen_months) >= 12:
            break

    to_delete: list[dict] = [{"Key": o["Key"]} for o in objects if o["Key"] not in keepers]

    # SAFETY GUARD: never delete more than half the bucket in one run
    if len(to_delete) > len(objects) // 2:
        logger.warning(
            "[PRUNE] Would delete %d of %d backups — exceeds safety threshold. "
            "Skipping prune. Investigate manually.",
            len(to_delete), len(objects),
        )
        return

    if not to_delete:
        logger.info("[PRUNE] Nothing to delete (all %d backups within retention).", len(objects))
        return

    logger.info("[PRUNE] Deleting %d backups older than retention window", len(to_delete))
    try:
        client.delete_objects(Bucket=bucket, Delete={"Objects": to_delete})
    except Exception as exc:
        logger.error("delete_objects failed: %s", exc)
        _report_sentry(exc, context={"phase": "prune_delete", "count": len(to_delete)})
        sys.exit(3)

    logger.info("[PRUNE] OK — %d deleted, %d retained", len(to_delete), len(keepers))


def _report_sentry(exc: Exception, context: dict | None = None) -> None:
    """Best-effort Sentry report. No-op if SENTRY_DSN not set."""
    try:
        import sentry_sdk  # type: ignore

        if not os.environ.get("SENTRY_DSN"):
            return
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("script", "backup_mongo")
            if context:
                for k, v in context.items():
                    scope.set_extra(k, v)
            sentry_sdk.capture_exception(exc)
    except Exception:
        pass


# ───────────────────────────────────────────────────────────────────────────
# Entrypoint
# ───────────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Backup MongoDB to S3-compatible storage.")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Run mongodump locally but do not upload to S3 or prune. For CI smoke tests.",
    )
    parser.add_argument(
        "--local-only", action="store_true",
        help="Dump to ./backups/ without uploading to S3. For local drills.",
    )
    parser.add_argument(
        "--skip-prune", action="store_true",
        help="Skip the rotation step (useful during first runs).",
    )
    args = parser.parse_args()

    logger.info("[BACKUP] Starting backup_mongo.py (dry_run=%s, local_only=%s)", args.dry_run, args.local_only)

    check_env_vars(local_only=args.local_only or args.dry_run)
    check_mongodump_installed()

    # 1. mongodump
    output_dir = DEFAULT_LOCAL_DIR if (args.local_only or args.dry_run) else Path("/tmp/hispaloshop_backups")
    archive_path = build_backup_path(output_dir)
    run_mongodump(os.environ["MONGO_URL"], archive_path)

    if args.dry_run:
        logger.info("[BACKUP] --dry-run complete. Archive left at: %s", archive_path)
        logger.info("[BACKUP] Skipping upload + prune.")
        return 0

    if args.local_only:
        logger.info("[BACKUP] --local-only complete. Archive at: %s", archive_path)
        return 0

    # 2. upload
    upload_to_s3(archive_path)

    # 3. prune
    if not args.skip_prune:
        prune_old_backups()

    # 4. cleanup local temp file (only after successful upload)
    try:
        archive_path.unlink()
    except Exception as exc:
        logger.warning("Failed to clean up local temp file %s: %s", archive_path, exc)

    logger.info("[BACKUP] Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
