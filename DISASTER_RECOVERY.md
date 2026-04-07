# HispaloShop — Disaster Recovery Runbook

> When something is on fire at 3am, read this document. Every playbook is a
> copy-paste checklist. No philosophy, no prose, just steps.

**Last updated**: Section 0.4 of the launch roadmap.

---

## 0. Overview

### MongoDB Atlas Backups (Estrategia Principal - FASE 0)

**MongoDB Atlas** (nuestro proveedor de MongoDB) incluye backups automáticos:

| Plan Atlas | Backup incluido | Retención | RPO |
|---|---|---|---|
| M0 (Sandbox) | ❌ No tiene backups automáticos | N/A | N/A |
| M2/M5 | ✅ Snapshots diarios | 7 días | 24h |
| M10+ | ✅ Continuous backups | 7-30 días | ~6 minutos |

**Para producción (recomendado):**
1. Usar **M10 o superior** para tener continuous backups
2. Configurar retención de 30 días
3. Atlas permite restore point-in-time (a cualquier momento)

**Cómo hacer restore desde Atlas:**
1. Atlas dashboard → Cluster → Backup tab
2. Seleccionar el snapshot deseado (o "Point in Time" para momento específico)
3. Elegir destino: "Restore to a different cluster" o "Download"
4. Seguir el wizard de Atlas

**Documentación oficial:** https://www.mongodb.com/docs/atlas/backup-restore-cluster/

---

### What this system protects

| Asset | Primary protection | Secondary | RPO | RTO |
|---|---|---|---|---|
| **MongoDB data** | Atlas continuous backups (M10+) | Daily mongodump → Cloudflare R2 | ~6min (M10+) / 24h (script) | 2h |
| **Code** | GitHub (origin) + Railway/Vercel deploys | Local clones on dev machines | 0 | 15m (rollback) |
| **Secrets** | Railway env vars + Vercel env vars + GitHub Actions secrets | `.env.example` documents what's needed | N/A | 1h (rotate + redeploy) |
| **Media uploads** | Cloudinary (their own redundancy) + 30-day trash | N/A | See §3 | varies |
| **Stripe data** | Stripe itself (authoritative source of truth for all payments) | Our `orders` mirror | 0 | 30m (via API replay) |

### What this system does NOT protect

- **In-flight requests** when the backend dies: lost, users will need to retry.
- **Active WebSocket chat sessions**: reconnect required, messages in transit are lost.
- **Unsaved drafts** in the creator UI (posts, reels, stories): `localStorage` only, lost if the browser is cleared.
- **Cloudinary media older than 30 days of trash retention**: if irrecoverably deleted, the metadata rows in MongoDB will reference dead URLs.
- **Data written to MongoDB in the last 24 hours**: this is the 24h RPO. A catastrophic failure between daily backups will lose up to 24h of writes.

### Targets

- **RTO (Recovery Time Objective)**: 2 hours. Measured from "incident declared" to "service restored to working state, possibly with 24h-stale data".
- **RPO (Recovery Point Objective)**: 24 hours. We accept losing up to one day of writes. (Atlas M10+ continuous backups can reduce this to ~5 minutes — see §7 if ever upgraded.)

### If you are the founder reading this during an incident

1. **Breathe.** Nothing here is unrecoverable in <2h.
2. Go to the playbook that matches the symptom (§1–§6 below).
3. Every command in this document is designed to be copy-pasted.
4. If a command asks you to confirm by typing a phrase, read it carefully. There are no "are you sure Y/N" prompts — you type the full phrase because careless enters should not nuke production.
5. After the incident is resolved, update the "last incident" section in this doc with lessons learned.

---

## 1. Playbook — MongoDB is down or corrupted

### Symptom detection
- Backend `/health` returns `"db": "unreachable"` or `"status": "degraded"`
- Railway logs show `MongoDB connection failed` or `ServerSelectionTimeoutError`
- Sentry alerts flooding in with pymongo errors
- Users report "something went wrong" on every page

### Step-by-step

**1.1. Confirm it is actually Mongo and not the network.**
```bash
# From your laptop — against the same connection string Railway uses
curl -v https://api.hispaloshop.com/health
# If this returns "db": "unreachable", continue.

# Check MongoDB Atlas status page
open https://status.mongodb.com
```

**1.2. Check Atlas dashboard.**
- Login to https://cloud.mongodb.com
- Project → Cluster → Metrics tab
- Look for: connection count, disk usage, CPU, memory
- If cluster is in `PAUSED` state: click Resume.
- If cluster shows `OUTAGE`: wait, this is Atlas's problem, not yours. Continue to step 1.3 in parallel.

**1.3. If Atlas is confirmed healthy but data is corrupted** (bad delete, bad migration, bad deploy):

```bash
# Clone the repo on any machine with MongoDB tools installed
git clone <repo>
cd hispaloshop/backend

# Install backup requirements
pip install boto3 pymongo

# Install mongodb-database-tools (one-time)
# Ubuntu:  sudo apt install mongodb-database-tools
# macOS:   brew tap mongodb/brew && brew install mongodb-database-tools

# Set the env vars for the R2 bucket (same as GitHub Actions secrets)
export MONGO_URL='mongodb+srv://<prod-user>:<prod-pass>@<cluster>.mongodb.net/hispaloshop'
export BACKUP_STORAGE_BUCKET='hispaloshop-backups'
export BACKUP_STORAGE_ACCESS_KEY='<r2 access key>'
export BACKUP_STORAGE_SECRET_KEY='<r2 secret key>'
export BACKUP_STORAGE_REGION='auto'
export BACKUP_STORAGE_ENDPOINT='https://<account-id>.r2.cloudflarestorage.com'

# First: list available backups and pick one
python scripts/restore_mongo.py --list

# Verify safely by restoring into a TEST DB (the default)
python scripts/restore_mongo.py --backup-id latest
# → restores into hispaloshop_restore_test. Verify document counts.

# Connect to that test DB and spot-check
mongosh "$MONGO_URL" --eval "db.getSiblingDB('hispaloshop_restore_test').orders.find().limit(3)"

# If it looks right, restore over production:
python scripts/restore_mongo.py --backup-id latest --target-db hispaloshop --force-production
# You will be prompted to type:
#   1. The DB name: hispaloshop
#   2. The phrase: YES I UNDERSTAND
# This is intentional — there is no non-interactive override.
```

**1.4. Post-restore checklist:**
- [ ] `curl https://api.hispaloshop.com/health` → `{"status":"ok","db":"connected"}`
- [ ] Log in with a known admin account → dashboard loads
- [ ] Spot-check a recent order in admin panel (existed before the incident?)
- [ ] Spot-check influencer commissions for the past week
- [ ] Spot-check a product detail page (images load, price correct)
- [ ] Push a test notification via `POST /api/notifications/push/test`
- [ ] Monitor Sentry for 30 min to catch any post-restore anomalies
- [ ] Post incident summary in `DISASTER_RECOVERY.md` §8

**⚠️ Data loss warning**: The backup is up to 24h old. Any orders, posts, signups, commissions, or messages that happened AFTER the backup was taken and BEFORE the incident are LOST. Communicate this to affected users proactively — do not let them discover it themselves.

---

## 2. Playbook — Stripe webhook lost or duplicated

### Symptom detection
- Order paid in Stripe dashboard but `status: pending` in our DB
- Commission missing for a recent order
- Duplicate commission records for a single order (rare, race condition)
- Sentry alert: `[WEBHOOK] Signature verification failed`

### 2.1. Find orphan payments (paid in Stripe, missing in our DB)

```bash
# Requires Stripe CLI or manual dashboard work
stripe events list --type=checkout.session.completed --limit=50

# For each event_id, check if we processed it
mongosh "$MONGO_URL" --eval \
  "db.processed_webhook_events.find({event_id: 'evt_XXXXXXXX'}).pretty()"

# If the event is NOT in processed_webhook_events, it was never received
# (Stripe-side delivery failed — network issue, our endpoint was down, etc.)
```

### 2.2. Replay a missed webhook

```bash
# Option A — Stripe CLI (easiest)
stripe events resend evt_XXXXXXXX

# Option B — From the Stripe dashboard
# Developers → Events → find the event → click "Resend webhook"

# Our webhook handler is now idempotent (post-section-0.4):
# - Resending a processed event → returns 200 "already_processed", no side-effects
# - Resending a missed event → processes normally
```

### 2.3. Stuck webhooks (crashed mid-processing)

Our webhook handlers write `status: "processing"` to `processed_webhook_events`
before executing, and update to `status: "completed"` at the end. A webhook
that crashed mid-processing will be stuck in `processing` forever.

```javascript
// Find stuck webhooks (running >5 minutes)
db.processed_webhook_events.find({
  status: "processing",
  processed_at: { $lt: new Date(Date.now() - 5*60*1000) }
})

// To unstick: manually update the status and replay via Stripe CLI
db.processed_webhook_events.updateOne(
  { event_id: "evt_XXXXXXXX" },
  { $set: { status: "stuck_manual_review" } }
)
// Then resend via Stripe CLI:
// stripe events resend evt_XXXXXXXX
// The new attempt will insert a new row or fail idempotency check.
```

### 2.4. Duplicate commissions (narrow race)

Since section 0.4, the insert-first idempotency pattern makes this
extremely unlikely. But if it somehow happens:

```javascript
// Detect duplicates
db.influencer_commissions.aggregate([
  { $group: { _id: "$order_id", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
])

// Delete the younger duplicate manually after review
db.influencer_commissions.deleteOne({ _id: ObjectId("...") })
```

---

## 3. Playbook — Cloudinary media lost

### Symptom detection
- Product images return 404
- Post images show broken placeholders
- User avatars default to initials everywhere

### 3.1. Check Cloudinary trash (30-day retention)

1. Login to https://cloudinary.com/console
2. Media Library → (top right) → Recycle Bin
3. Select deleted assets → Restore
4. This is free and reversible up to 30 days after deletion.

### 3.2. If permanently deleted

Cloudinary has NO backup beyond the 30-day trash. Media that has passed the
trash window is irrecoverable unless we have it in another system (backend
uploads to Cloudinary directly — we do NOT keep a local copy).

```javascript
// Identify affected posts/products
db.products.find({ images: { $regex: /res.cloudinary.com/ } }).forEach(p => {
  // Check if the URL still resolves (manual or scripted)
})
```

**Communication strategy for affected content:**
- For producer products: contact the producer, ask for a fresh upload.
- For user-generated posts: the post is marked as "media unavailable" in the UI.
- For avatars: automatic fallback to initials (already implemented in `InitialsAvatar.jsx`).

### 3.3. Prevention (V2 consideration)

The V1 architecture relies entirely on Cloudinary's redundancy. For V2, consider:
- Weekly Cloudinary → R2 mirror of the full asset catalog (extra storage cost)
- Signed URL policy that lets us re-upload from originals kept on producer devices

---

## 4. Playbook — Secrets compromised

### 4.1. Stripe keys leaked

**Time to act: IMMEDIATELY.**

1. https://dashboard.stripe.com/apikeys → click "Roll" on the compromised key
2. Copy the new key
3. Railway dashboard → Project → Variables → update `STRIPE_SECRET_KEY`
4. Railway → Deployments → Redeploy
5. Verify health: `curl https://api.hispaloshop.com/health`
6. Test purchase with card `4242 4242 4242 4242` end-to-end
7. Monitor Stripe dashboard for 1 hour — look for any transaction on the old key

### 4.2. MongoDB URL compromised

1. Atlas dashboard → Database Access → find the compromised user
2. Delete that user OR rotate password
3. Create a new user (or keep the old one with a new password)
4. Copy the new connection string
5. Railway → update `MONGO_URL`
6. Redeploy
7. Verify `/health`
8. Scan Atlas audit logs for anomalous queries from the old credentials (24–48h window)

### 4.3. JWT_SECRET compromised

**Warning**: rotating `JWT_SECRET` invalidates **ALL active sessions**.
Every user will be logged out and needs to log in again.

1. Generate a new secret: `openssl rand -hex 32`
2. Railway → update `JWT_SECRET`
3. Redeploy
4. Proactive communication: send an email to all users explaining that
   they were logged out due to a security rotation
5. Monitor login error rate for the next hour

### 4.4. Anthropic API key compromised

1. https://console.anthropic.com/settings/keys → delete compromised key
2. Generate new key
3. Railway → update `ANTHROPIC_API_KEY`
4. Redeploy
5. Smoke-test David AI (send a message from the frontend)

### 4.5. FCM service account compromised

1. https://console.firebase.google.com → Project Settings → Service Accounts
2. Delete the compromised key
3. Generate new private key (downloads a JSON file)
4. Copy the entire JSON content
5. Railway → update `FCM_SERVICE_ACCOUNT_JSON` (paste the full JSON as a single-line value)
6. Redeploy
7. **Run the FCM post-deploy smoke test** (see `TESTING.md §10.1`)

### 4.6. Backup storage keys (R2) compromised

1. Cloudflare dashboard → R2 → Manage API Tokens → revoke the compromised token
2. Create a new token with the same bucket scope
3. GitHub → Settings → Secrets and variables → Actions → update `BACKUP_STORAGE_ACCESS_KEY` + `BACKUP_STORAGE_SECRET_KEY`
4. Trigger `backup-daily.yml` manually via `workflow_dispatch` to verify the new credentials work
5. Audit the R2 bucket: did the attacker download any backups? If yes, treat those backups as a data breach of the entire DB snapshot.

---

## 5. Playbook — Deploy rollback

### 5.1. Backend on Railway

**Symptom**: backend returns 500 everywhere, health check fails, Sentry flooded.

```bash
# Option A — Railway dashboard (fastest)
# 1. Railway → Project → Deployments
# 2. Find the last known-good deploy (green checkmark)
# 3. Click "..." → Redeploy
# 4. Wait ~90s for rollout

# Option B — Git revert + push
git log --oneline -10                    # find the bad commit
git revert <bad-sha>
git push origin main
# Railway auto-deploys the revert
```

### 5.2. Frontend on Vercel

```bash
# Vercel dashboard (fastest)
# 1. Vercel → Project → Deployments
# 2. Find the last known-good deploy
# 3. "..." → Promote to Production
```

### 5.3. Identify the culprit commit via bisect

```bash
git bisect start
git bisect bad main
git bisect good <sha-that-worked>
# Deploy each bisect commit and check /health + core flows
# git bisect good OR git bisect bad after each test
# When done: git bisect reset
```

### 5.4. Post-rollback

- [ ] `/health` returns ok
- [ ] Smoke test the 3 critical flows: login, add to cart, checkout
- [ ] Re-open the bad PR as a draft — do NOT delete the branch
- [ ] Add a postmortem note to the bad PR with root cause
- [ ] Do NOT re-merge until the fix is verified in staging

---

## 6. Playbook — Payment processing broken

### 6.1. Triage

```bash
# 1. Check Stripe dashboard for recent payment attempts
# https://dashboard.stripe.com/payments

# 2. Check our /health endpoint
curl https://api.hispaloshop.com/health

# 3. Check webhook deliveries in Stripe dashboard
# Developers → Webhooks → find our endpoint → Recent deliveries

# 4. Check Sentry for [WEBHOOK] or [STRIPE] errors
```

### 6.2. Decision tree

| Stripe sees payments | Webhooks delivered | Our DB updated | Diagnosis |
|---|---|---|---|
| Yes | Yes | Yes | Not broken — user error? |
| Yes | Yes | No | Webhook handler crashing → check Sentry, fix, replay |
| Yes | No | No | Our webhook endpoint is down or unreachable → check Railway |
| No | N/A | N/A | Frontend can't create sessions → check `STRIPE_SECRET_KEY` |

### 6.3. Webhook idempotency sanity check

```javascript
// How many events were processed in the last 24h?
db.processed_webhook_events.countDocuments({
  processed_at: { $gt: new Date(Date.now() - 24*60*60*1000) }
})

// How many are stuck in "processing"?
db.processed_webhook_events.countDocuments({
  status: "processing",
  processed_at: { $lt: new Date(Date.now() - 5*60*1000) }
})
// > 0 means handlers are crashing mid-execution — check Sentry.

// Source breakdown of recent webhooks (orders, billing, b2b)
db.processed_webhook_events.aggregate([
  { $match: { processed_at: { $gt: new Date(Date.now() - 24*60*60*1000) } } },
  { $group: { _id: { source: "$source", status: "$status" }, count: { $sum: 1 } } }
])
```

### 6.4. Replaying the last 50 payments

```bash
# If webhooks were missed entirely (our endpoint was down)
stripe events list --type=checkout.session.completed --limit=50 \
  | jq -r '.data[].id' \
  | while read event_id; do
      stripe events resend "$event_id"
      sleep 1  # rate limit respect
    done
```

---

## 7. Regular drills

| Frequency | Drill | Owner | How |
|---|---|---|---|
| Daily (auto) | `backup-daily.yml` runs at 03:00 UTC | CI | GitHub Actions |
| Weekly (auto) | `backup-verify-weekly.yml` restores latest backup, counts collections, drops | CI | GitHub Actions — Mondays 04:00 UTC |
| Monthly (manual) | Full restore drill on a non-prod DB | Founder | Run `restore_mongo.py --backup-id latest` locally, verify data, time the restore |
| Quarterly (manual) | Full disaster simulation: pretend prod is dead, follow §1 end-to-end on a staging DB | Founder | Document the total elapsed time |

**If any drill fails, the backup system is considered UNVERIFIED until investigated.** Do not wait for a real incident to debug.

---

## 8. Contacts & escalation

| Role | Name | Contact |
|---|---|---|
| Founder | _[placeholder]_ | _[email / phone]_ |
| On-call | N/A in V1 (founder only) | — |
| Lawyer | _[placeholder]_ | _[email]_ |

**Service status pages (bookmark these):**
- MongoDB Atlas — https://status.mongodb.com
- Stripe — https://status.stripe.com
- Railway — https://status.railway.app
- Vercel — https://www.vercel-status.com
- Cloudflare — https://www.cloudflarestatus.com
- Cloudinary — https://status.cloudinary.com
- Anthropic — https://status.anthropic.com
- Firebase — https://status.firebase.google.com

---

## 9. First-run setup (one-time, when the founder configures R2)

⚠️ **FIRST RUN REQUIREMENT**: Before trusting the daily backup cron, the founder MUST execute this drill once manually.

### 9.1. Create the Cloudflare R2 bucket

1. Go to Cloudflare dashboard → R2
2. Click "Create bucket"
3. Name: `hispaloshop-backups`
4. Location: Automatic (cheapest option)
5. Click Create

### 9.2. Create an API token with scoped write access

1. R2 dashboard → "Manage R2 API Tokens"
2. Create API token
3. Permissions: `Object Read & Write`
4. Specify bucket: `hispaloshop-backups` (NOT all buckets — principle of least privilege)
5. TTL: no expiry (rotate manually every 6 months)
6. Copy the `Access Key ID` and `Secret Access Key` (you will NEVER see them again)
7. Note the endpoint: `https://<account-id>.r2.cloudflarestorage.com`

### 9.3. Configure GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions → New repository secret. Add ALL of these:

| Secret | Example value |
|---|---|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/hispaloshop` |
| `BACKUP_STORAGE_BUCKET` | `hispaloshop-backups` |
| `BACKUP_STORAGE_ACCESS_KEY` | (from R2) |
| `BACKUP_STORAGE_SECRET_KEY` | (from R2) |
| `BACKUP_STORAGE_REGION` | `auto` |
| `BACKUP_STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `SENTRY_DSN` | (backend Sentry DSN, same as 0.2) |

### 9.4. First backup manual trigger

1. GitHub → Actions → "Backup · daily MongoDB" workflow → "Run workflow"
2. Wait for completion (2–5 minutes for a small DB)
3. Check Cloudflare R2 dashboard → `hispaloshop-backups` bucket → an object named `hispaloshop_backup_YYYY-MM-DD_HH-MM-SS.gz` should be present
4. Note the object size — should be reasonable for your DB (MB range, not GB)

### 9.5. First verification manual trigger

1. GitHub → Actions → "Backup · weekly verification" workflow → "Run workflow"
2. Wait for completion (5–10 minutes)
3. The workflow summary should show "✅ Weekly backup verification PASSED"
4. If it fails, the backup is invalid — investigate before trusting the automation

### 9.6. Document the first-run timing

In this very file, update §10 below with:
- Timestamp of first successful backup
- Object key
- Size
- Total run time (backup + verify)

After all 6 steps are green, the backup system is considered verified and
production-ready.

---

## 10. Incident log (post-mortems)

### First real drill
- **Date**: _pending_
- **Type**: _First-run drill (§9)_
- **Outcome**: _pending_
- **Time to complete**: _pending_
- **Lessons**: _pending_

_Add new entries at the top as incidents happen. Keep them brief: what happened, what we did, what to change next time._

---

## 11. Appendix — Future considerations

### 11.1. Atlas M10+ native backups

If the founder upgrades MongoDB Atlas to M10 or higher, the cluster gains:
- **Continuous backups** (every ~6 minutes instead of 24h)
- **Point-in-Time Recovery** (restore to any moment in the last 72 hours)
- **Snapshots** (weekly retention included, longer retention via paid add-on)

**Recommendation**: even with M10+, KEEP the custom script running. Reasons:
1. **Multi-vendor redundancy**: if Atlas has an incident that also affects their backup system, we still have R2.
2. **Portability**: if we ever migrate off Atlas, the R2 snapshots are vendor-neutral.
3. **Cost**: R2 for daily dumps of a small DB is <$1/month. Cheap insurance.

**To enable Atlas native backups** (one-time setup on M10+):
1. Atlas dashboard → Cluster → Backup tab → Enable continuous backups
2. Configure retention policy (recommend: 7 days continuous, 30 days snapshots)
3. Document the restore procedure: https://www.mongodb.com/docs/atlas/backup-restore-cluster/

### 11.2. GPG client-side encryption

Current implementation uses server-side AES256 encryption (`ServerSideEncryption=AES256` on S3/R2 uploads). This protects against bucket breaches but not against R2 itself reading the content.

If legal/compliance ever requires client-side encryption (ISO 27001, specific B2B contract with a DPA, etc.):
- ~1 day of work to add GPG encryption before upload
- Requires HSM or secure key storage for the GPG private key
- Requires recovery procedure documented (what if the GPG key is lost? → permanent backup loss)
- Adds ~10-20% encryption time per backup

**Status**: deferred until a concrete legal requirement materializes.

### 11.3. Per-collection granular backups

Currently we dump the entire DB as one archive. For granular restores (e.g., "restore only the `orders` collection from 3 days ago"), `mongorestore` supports `--nsInclude`:

```bash
mongorestore --uri=... --gzip --archive=backup.gz \
  --nsInclude='hispaloshop.orders' \
  --nsFrom='hispaloshop.*' \
  --nsTo='hispaloshop_partial.*'
```

No changes to the backup script are needed — this is a restore-side capability. Document as a runbook step in §1 when the need arises.
