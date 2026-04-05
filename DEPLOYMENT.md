# HispaloShop — Deployment Guide

> Source of truth for deploying HispaloShop to production and staging.
> Backend-specific legacy notes live in `backend/DEPLOYMENT.md`.

**Stack:**
- **Backend**: FastAPI + MongoDB, hosted on **Railway**.
- **Frontend**: React (CRA + Craco), hosted on **Vercel**.
- **Monitoring**: Sentry (backend + frontend, separate projects).
- **Crons**: GitHub Actions (no Railway cron).
- **Push**: Firebase Cloud Messaging (FCM HTTP v1 API).
- **Payments**: Stripe (Checkout + webhooks + Connect for payouts V2).
- **Email**: Resend.
- **Images**: Cloudinary.

---

## 1. First-time deploy checklist

Before the very first production deploy, verify every item in order:

- [ ] MongoDB Atlas cluster created (M10+ recommended for prod), connection URL ready
- [ ] Railway project created, linked to GitHub repo
- [ ] Vercel project created, linked to GitHub repo
- [ ] Domain DNS: `hispaloshop.com` → Vercel, `api.hispaloshop.com` → Railway
- [ ] Stripe account activated, Connect enabled, webhook endpoints created
- [ ] Firebase project + FCM enabled, service account JSON generated
- [ ] Cloudinary account + upload preset created
- [ ] Resend account + domain verified
- [ ] Anthropic API key with sufficient quota
- [ ] Sentry org + 2 projects created (backend, frontend)
- [ ] GitHub Actions secrets configured (see §6)
- [ ] Legal: T&Cs, Privacy Policy, Cookie Policy reviewed by lawyer
- [ ] All env vars set in Railway + Vercel (see §3, §4)
- [ ] Health check `GET /health` returns `{"status":"ok","db":"connected"}`
- [ ] Smoke test: login + add to cart + checkout with `4242 4242 4242 4242`

---

## 2. Environment policy

There are **three environments**:

| Environment | Purpose | Domain (backend) | Domain (frontend) | `ENV` var |
|---|---|---|---|---|
| `development` | Local laptops | `http://localhost:8000` | `http://localhost:3000` | `development` |
| `staging` | Pre-prod testing | `api.staging.hispaloshop.com` | `staging.hispaloshop.com` | `staging` |
| `production` | Live | `api.hispaloshop.com` | `www.hispaloshop.com` | `production` |

**Critical rule**: In `staging` and `production`, the backend **refuses to start** if any of these env vars are missing (see `backend/core/env_validation.py`):

- `JWT_SECRET`, `MONGO_URL` (always — pydantic)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `FCM_SERVICE_ACCOUNT_JSON`
- `FRONTEND_URL`, `BACKEND_URL` (or legacy `AUTH_BACKEND_URL`)

In `development` the same vars missing only log warnings and boot in degraded mode.

---

## 3. Backend on Railway

### 3.1 Initial setup

1. Railway → New Project → Deploy from GitHub → select `hispaloshop` repo
2. `railway.json` at repo root already defines:
   - `rootDirectory: "backend"`
   - `startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT`
   - `healthcheckPath: /health`
   - `healthcheckTimeout: 300`
3. Railway auto-detects Python via NIXPACKS and runs `pip install -r requirements.txt`

### 3.2 Environment variables (Railway dashboard → Variables)

Copy every variable from `backend/.env.example` and set in Railway. Priority order:

**Required (backend won't start without these in production):**
```
ENV=production
JWT_SECRET=<openssl rand -hex 32>
MONGO_URL=mongodb+srv://...
FRONTEND_URL=https://www.hispaloshop.com
BACKEND_URL=https://api.hispaloshop.com
ALLOWED_ORIGINS=https://www.hispaloshop.com,https://hispaloshop.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
ANTHROPIC_API_KEY=sk-ant-api03-...
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

**Strongly recommended:**
```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=re_...
SENTRY_DSN=https://...@sentry.io/...
SENTRY_RELEASE=${{ RAILWAY_GIT_COMMIT_SHA }}
CHAT_ENCRYPTION_KEY=<openssl rand -hex 32>
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
LOG_LEVEL=INFO
```

**Railway-specific**: `RAILWAY_GIT_COMMIT_SHA` is injected automatically — the Sentry init reads it as a fallback for `SENTRY_RELEASE`, so error reports are linked to the exact deploy commit.

### 3.3 Domain & TLS

- Railway dashboard → Settings → Networking → Custom domain → `api.hispaloshop.com`
- Add CNAME in DNS pointing to the value Railway shows
- Railway provisions TLS automatically (Let's Encrypt)

### 3.4 Deploy

Automatic deploys from `main` branch are on by default. To deploy manually:
```bash
git push origin main
# Railway picks up the push and builds
```

### 3.5 Logs & monitoring

- Railway dashboard → Deployments → Logs (streams JSON-formatted logs)
- Sentry dashboard → Issues (errors captured automatically)
- Health probe: `curl https://api.hispaloshop.com/health`

### 3.6 Staging environment

To create staging as a second Railway service:
1. Railway dashboard → New → Deploy from GitHub → same repo
2. Name the service `hispaloshop-backend-staging`
3. Variables → set `ENV=staging` + all other vars with **test** Stripe keys (`sk_test_...`)
4. Settings → Networking → custom domain `api.staging.hispaloshop.com`
5. Trigger deploy from `staging` branch or `main`

---

## 4. Frontend on Vercel

### 4.1 Initial setup

1. Vercel → New Project → import `hispaloshop` repo
2. Root directory: `frontend`
3. Framework: `Create React App` (auto-detected)
4. Build command: `yarn build` (from `vercel.json`)
5. Output directory: `build`
6. Install command: `yarn install`

### 4.2 Environment variables (Vercel dashboard → Settings → Environment Variables)

Every variable from `frontend/.env.example`. Critical:

```
REACT_APP_API_URL=https://api.hispaloshop.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
REACT_APP_CLOUDINARY_CLOUD=...
REACT_APP_VAPID_PUBLIC_KEY=...
REACT_APP_GIPHY_API_KEY=...
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_SENTRY_DSN=https://...@sentry.io/...
REACT_APP_SENTRY_RELEASE=${VERCEL_GIT_COMMIT_SHA}
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

- `VERCEL_GIT_COMMIT_SHA` is injected by Vercel automatically. The Sentry init reads `REACT_APP_SENTRY_RELEASE` first, then falls back to `REACT_APP_VERSION`.
- **`GENERATE_SOURCEMAP=false`**: Source maps are **NOT** shipped in production. They're generated locally and uploaded to Sentry separately — see §8.

### 4.3 Domain & TLS

- Vercel dashboard → Settings → Domains → add `www.hispaloshop.com` and `hispaloshop.com`
- Vercel provisions TLS automatically
- `vercel.json` has an `/api/:path*` rewrite to `api.hispaloshop.com` — so same-origin API calls work in production

---

## 5. Firebase FCM (push notifications)

Already set up by the founder. Reference in case of rotation:

1. Firebase Console → Project Settings → Service Accounts → Generate new private key
2. Download the JSON file
3. **Paste the entire JSON content** as a single-line value in Railway env var `FCM_SERVICE_ACCOUNT_JSON`
4. The backend service `services/notifications/dispatcher_service.py` reads it via `settings.FCM_SERVICE_ACCOUNT_JSON`, exchanges it for an OAuth2 access token, and calls FCM HTTP v1 API
5. Test:
   ```
   POST /api/notifications/push/test
   ```

**Never** commit the service account JSON to git.

---

## 6. GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Used by | How to obtain |
|---|---|---|
| `BACKEND_URL` | `cron-daily.yml`, `cron-weekly.yml` | `https://api.hispaloshop.com` |
| `CRON_ADMIN_TOKEN` | `cron-daily.yml`, `cron-weekly.yml` | Long-lived admin JWT — generate via `POST /api/auth/login` with an admin account, copy the access token (or create a service account admin with extended token expiry) |
| `JWT_SECRET` | `ci.yml` (backend tests) | Any 32-char random string (CI-only, not prod) |
| `SENTRY_AUTH_TOKEN` | Optional — source map upload CI step | Sentry → Account → API → Auth Tokens → create with `project:releases` scope |
| `SENTRY_ORG` | Optional — source map upload | Sentry org slug |
| `SENTRY_PROJECT_BACKEND` | Optional | e.g. `hispaloshop-backend` |
| `SENTRY_PROJECT_FRONTEND` | Optional | e.g. `hispaloshop-frontend` |

### 6.1 Cron workflows

Two workflows already exist and are verified against real backend endpoints:

- `.github/workflows/cron-daily.yml` — runs at 06:00 UTC daily:
  - `POST /api/admin/cron/update-exchange-rates` (ECB rates → DB)
  - `POST /api/admin/cron/grace-period-check` (subscription downgrades)
  - `POST /api/admin/cron/influencer-auto-payouts` (D+15, ≥20€)
  - `POST /api/admin/cron/attribution-expiry` (18-month attribution cleanup)
- `.github/workflows/cron-weekly.yml` — runs Mondays 07:00 UTC:
  - `POST /api/admin/cron/influencer-tier-sweep` (tier recalculation)

Each endpoint is protected by `require_role(["admin", "super_admin"])`. The workflows pass `Authorization: Bearer $CRON_ADMIN_TOKEN`.

Manual trigger: GitHub → Actions → (workflow) → Run workflow.

---

## 7. Stripe webhooks

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://api.hispaloshop.com/api/stripe/webhook`
3. Events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created` / `.updated` / `.deleted`
   - `invoice.payment_succeeded` / `.payment_failed`
4. Copy the signing secret into Railway env var `STRIPE_WEBHOOK_SECRET`
5. (Optional) Create a second endpoint for billing-only events → `STRIPE_BILLING_WEBHOOK_SECRET`
6. Test with Stripe CLI locally: `stripe listen --forward-to localhost:8000/api/stripe/webhook`

---

## 8. Sentry — setup and source map upload

### 8.1 Initial setup

1. Sentry → Create org `hispaloshop`
2. Create 2 projects: `hispaloshop-backend` (Python / FastAPI) and `hispaloshop-frontend` (React)
3. Copy the DSN of each into env vars:
   - Backend: `SENTRY_DSN` in Railway
   - Frontend: `REACT_APP_SENTRY_DSN` in Vercel
4. The backend init is in `backend/middleware/sentry_init.py` (conditional on DSN presence, filters 401/403/404/422/429)
5. The frontend init is in `frontend/src/lib/sentry.js` (conditional, filters network noise and expected 4xx)

### 8.2 Release tracking

Both backend and frontend read `SENTRY_RELEASE` (or `REACT_APP_SENTRY_RELEASE`) as the canonical release identifier. Set it to the git SHA:

- **Railway**: set `SENTRY_RELEASE=${{ RAILWAY_GIT_COMMIT_SHA }}`
- **Vercel**: set `REACT_APP_SENTRY_RELEASE=${VERCEL_GIT_COMMIT_SHA}` (Vercel injects this)
- **GitHub Actions crons**: already set via `env.SENTRY_RELEASE=${{ github.sha }}` in workflows (add when enabling source map upload)

### 8.3 Source map upload (frontend)

The frontend build has `GENERATE_SOURCEMAP=false`, so maps are not shipped in the production bundle. To get readable Sentry stack traces:

1. Install Sentry CLI locally or in CI: `npm install -g @sentry/cli`
2. Build with source maps locally, just before upload:
   ```bash
   cd frontend
   GENERATE_SOURCEMAP=true yarn build
   ```
3. Create a release and upload maps:
   ```bash
   export SENTRY_AUTH_TOKEN=...
   export SENTRY_ORG=hispaloshop
   export SENTRY_PROJECT=hispaloshop-frontend
   sentry-cli releases new "$VERCEL_GIT_COMMIT_SHA"
   sentry-cli releases files "$VERCEL_GIT_COMMIT_SHA" upload-sourcemaps ./build/static/js \
     --url-prefix '~/static/js' \
     --rewrite
   sentry-cli releases finalize "$VERCEL_GIT_COMMIT_SHA"
   ```
4. **Important**: delete the `.map` files from the build output before deploy (already handled by `GENERATE_SOURCEMAP=false` in the deploy path)

This can be automated in a GitHub Actions job that runs post-deploy.

---

## 9. Health checks and monitoring

### 9.1 Backend health endpoint

```
GET /health
GET /api/health
```

Both endpoints (no auth required) return:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "db": "connected",
  "db_latency_ms": 12.34,
  "timestamp": "2026-04-06T14:30:00+00:00"
}
```

If MongoDB is unreachable, `status: "degraded"` and `db: "unreachable"` — Railway's healthcheck (timeout 300s) will retry.

### 9.2 External monitors

Recommended (not configured yet — future section of roadmap):
- UptimeRobot or BetterStack on `/health` every 1 min
- Alert on 2 consecutive failures → PagerDuty / email to founder

---

## 9.5. Backups & disaster recovery

**Full runbook**: see [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) at repo root.

**Summary**:
- Daily MongoDB backup to Cloudflare R2 via `.github/workflows/backup-daily.yml` (03:00 UTC)
- Weekly verification drill via `.github/workflows/backup-verify-weekly.yml` (Mondays 04:00 UTC)
- Retention: last 30 daily backups + first-of-month for 12 months, with a safety guard that refuses to prune if fewer than 7 backups exist
- RTO 2h / RPO 24h (V1 targets — can be reduced with Atlas M10+ continuous backups)
- Scripts: `backend/scripts/backup_mongo.py`, `backend/scripts/restore_mongo.py`, `backend/scripts/verify_backup.py`

**First-run setup** (one-time, by founder): see [`DISASTER_RECOVERY.md §9`](DISASTER_RECOVERY.md#9-first-run-setup-one-time-when-the-founder-configures-r2).

**GitHub Actions secrets required** (add via Settings → Secrets and variables → Actions):
- `MONGO_URL` (if not already set from CI)
- `BACKUP_STORAGE_BUCKET`
- `BACKUP_STORAGE_ACCESS_KEY`
- `BACKUP_STORAGE_SECRET_KEY`
- `BACKUP_STORAGE_REGION` (`auto` for R2)
- `BACKUP_STORAGE_ENDPOINT` (R2 endpoint URL, leave empty for AWS S3)

See `backend/.env.example` for full variable descriptions.

---

## 10. Rollback procedure

### 10.1 Backend (Railway)

1. Railway dashboard → Deployments → find the last known-good deploy
2. Click ••• → **Redeploy**
3. Or: `git revert <bad-sha>` and push → auto-redeploys

### 10.2 Frontend (Vercel)

1. Vercel dashboard → Deployments → find the last known-good deploy
2. Click ••• → **Promote to Production**
3. Or: `git revert <bad-sha>` and push

### 10.3 Database migrations

There are no heavyweight migrations in V1 (MongoDB schemaless + indexes created on startup in `core/database.py::_create_indexes`). If an index is causing issues:
1. Railway → exec into running container
2. Connect to MongoDB via `mongosh`
3. `db.<collection>.dropIndex("<name>")`
4. Restart backend → indexes rebuild idempotently

### 10.4 When things are really broken

Runbook:
1. **Freeze deploys**: Railway dashboard → disable auto-deploy from `main`
2. **Check Sentry**: most recent issues, volume spike? → identify root cause
3. **Check logs**: `railway logs` or Railway dashboard → Logs stream
4. **Check health**: `curl -v https://api.hispaloshop.com/health` → DB status
5. **Check Mongo Atlas**: dashboard → cluster → metrics
6. **Rollback** (§10.1)
7. **Post-incident**: write up in a `POSTMORTEM.md` after the fix

---

## 11. Common incidents — runbook

| Symptom | Likely cause | Action |
|---|---|---|
| 500 errors spike | Missing env var after deploy | Check Sentry, check Railway env vars match `.env.example` |
| `/health` returns `degraded` | MongoDB Atlas network issue or pool exhausted | Atlas dashboard → check cluster status + connections metric |
| Push notifications silent | FCM service account expired or rotated | Regenerate in Firebase, update `FCM_SERVICE_ACCOUNT_JSON` in Railway |
| Stripe webhooks fail signature | Webhook secret rotated in Stripe dashboard | Copy new secret into Railway `STRIPE_WEBHOOK_SECRET` |
| CORS errors in browser | `FRONTEND_URL` / `ALLOWED_ORIGINS` drift after domain change | Update env vars in Railway, restart |
| Cron endpoints 401 | `CRON_ADMIN_TOKEN` JWT expired | Generate new admin JWT, update GH Actions secret |
| Frontend blank page | Bundle chunk 404 (CDN cache mismatch) | Vercel → Redeploy; or purge CDN cache |
| Slow requests >2s logged | DB index missing or query not covered | Check Atlas profiler, add index in `core/database.py::_create_indexes` |

---

## 12. Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set JWT_SECRET (openssl rand -hex 32) and MONGO_URL
#   (for local Mongo: mongodb://localhost:27017)
uvicorn main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
yarn install
cp .env.example .env.local
# Leave REACT_APP_API_URL blank — craco dev proxy handles localhost:8000
yarn start
```

Visit `http://localhost:3000`.

Verify backend setup (optional):
```bash
cd backend
python scripts/verify_setup.py
```

Smoke-test backend import (no network calls, just validates config):
```bash
cd backend
ENV=development JWT_SECRET=$(openssl rand -hex 32) \
  MONGO_URL=mongodb://localhost:27017 python -c "import main"
```

---

## 13. Secrets hygiene

- **Never** commit `.env`, `.env.local`, `.env.production`, service account JSONs, or any file containing `sk_live_`, `sk_test_`, or private keys
- `.gitignore` already excludes `.env` and `backend/.env`
- Rotate `JWT_SECRET` on any security incident — this invalidates all existing sessions (users will need to log in again)
- Rotate `STRIPE_WEBHOOK_SECRET` quarterly as good hygiene
- Rotate Stripe keys in the dashboard if ever leaked; update Railway immediately

Pre-commit check (manual, until 0.3 adds automated tests):
```bash
git diff --cached | grep -E 'sk_live_|sk_test_[A-Za-z0-9]{20,}|AKIA|BEGIN (RSA |)PRIVATE KEY'
# Should return nothing. If it does, unstage and scrub before committing.
```

---

## 14. References

- Backend env vars full list → `backend/.env.example`
- Frontend env vars full list → `frontend/.env.example`
- Legacy backend deploy notes → `backend/DEPLOYMENT.md`
- Design system → `DESIGN_SYSTEM.md`
- Roadmap → `ROADMAP_LAUNCH.md`
