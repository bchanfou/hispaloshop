# Changelog

All notable changes to Hispaloshop are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [CICLO 1.0] — 2026-05-05

### Infrastructure & Financial Systems

#### Added
- **Stripe Transfer Retry System** (PR #28)
  - Exponential backoff: 1s, 4s, 16s between attempts
  - Three new payout states: `pending_transfer`, `transfer_failed`, plus existing `paid`
  - Admin dashboard: `/admin/payouts/failed` lists all stuck/failed payouts
  - Cron job: `/admin/cron/retry-failed-transfers` retries daily
  - Email alerts: super_admin notified when transfers fail 3x
  - Database: `Payout.failed_at`, `Payout.failure_reason` fields added

- **Dynamic Exchange Rates from ECB** (PR #29)
  - Service: `services/exchange_rates.py` fetches daily from ECB XML
  - Storage: MongoDB `exchange_rates` collection with indexes
  - Fallback: Last-known rates from DB, static rates as final fallback
  - Integration: `ledger.py` reads from DB instead of hardcoded constants
  - Cron: `/admin/cron/update-exchange-rates` (daily recommended)

- **ECB Cron Endpoint Hardening** (PR #31)
  - Graceful failure handling: ECB timeout returns last-known rates instead of 500
  - Response schema: `{updated: bool, message: str, rates: dict}`
  - Logging: Server-side exception detail, generic client message (security)

- **FCM HTTP v1 Migration** (PR #30)
  - Service: `services/fcm_service.py` implements Google FCM HTTP v1 API
  - Auth: OAuth2 with service account JSON, token caching & refresh
  - Fallback: Automatic legacy FCM API if v1 fails
  - Cron: `/admin/cron/retry-failed-push-notifications` retries failed notifications
  - Logging: Records which version (v1/legacy) succeeded for audit

- **FCM Token Validation Fix** (PR #32)
  - Regex fix: Accept colons in real Firebase tokens (`^[a-zA-Z0-9_:-]+$`)
  - Token testing: Validate before HTTP call to prevent 400s
  - OAuth2 tests: Token caching, expiry, refresh cycle

### Documentation
- Created `docs/RUNBOOK.md` — Operational guide (10 sections)
  - Quick reference for emergencies
  - Stripe, FX rates, FCM troubleshooting
  - Database diagnostic queries
  - Escalation procedures
  - Deployment checklist
- Updated `docs/MAPA.md` with Mermaid diagrams
- Updated `docs/ai/MEGA_PLAN.md` with implementation notes

### Tests
- `tests/test_stripe_transfer_retry.py` — 10 tests covering retry logic, backoff, failures
- `tests/test_exchange_rates.py` — 14 tests covering fetch, storage, fallback, caching
- `tests/test_fcm_v1.py` — 21 tests covering OAuth2, token validation, v1/legacy routing

### Database
- Migration: `20260429_0017_payout_transfer_audit_fields.py`
  - Added `failed_at: DateTime(nullable)`
  - Added `failure_reason: Text(nullable)`
- Indexes: Exchange rates collection optimized for date/base currency queries

### Monitoring
- Alert thresholds documented in RUNBOOK
- Metrics to track: Payout failure rate, FX rate staleness, FCM version distribution

### Breaking Changes
- None — All changes are additive with fallbacks

### Migration Path
- Pre-deployment: Apply database migration
- Deploy: Merge CICLO 1 PRs (#28-#32)
- Post-deploy: Configure cron jobs, set env vars (FCM_SERVICE_ACCOUNT_JSON, STRIPE_SECRET_KEY)
- Verify: Run test suite, check RUNBOOK pre-deployment checklist

### Known Issues
- None reported

---

## [Unreleased]

(Placeholder for CICLO 2)
