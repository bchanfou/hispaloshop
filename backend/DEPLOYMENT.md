# Hispaloshop — Deployment Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB 6+)
- Railway account (backend hosting)
- Vercel account (frontend hosting)
- Stripe account with Connect enabled
- Cloudinary account (image storage)
- Anthropic API key (AI features: moderation, contracts, recommendations)
- Resend account (transactional email)

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Min 32 chars. No example values in production. |
| `MONGO_URL` | Yes | MongoDB connection string (mongodb:// or mongodb+srv://) |
| `DB_NAME` | No | Database name. Default: `hispaloshop` |
| `ENV` | No | `development` or `production`. Default: `development` |
| `DEBUG` | No | `true`/`false`. Default: `false` |
| `PORT` | No | Server port. Default: `8000` |
| `STRIPE_SECRET_KEY` | Yes* | Starts with `sk_live_` in production |
| `STRIPE_WEBHOOK_SECRET` | Yes* | From Stripe webhook dashboard |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Yes* | For subscription billing webhooks |
| `STRIPE_PUBLISHABLE_KEY` | No | Public key for client-side |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins. No wildcards in prod. |
| `FRONTEND_URL` | Yes | `https://www.hispaloshop.com` in production |
| `AUTH_BACKEND_URL` | Yes | Backend URL for email links |
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes* | Google OAuth client secret |
| `RESEND_API_KEY` | Yes* | Resend email API key |
| `EMAIL_FROM` | No | Sender address. Default: `Hispaloshop <onboarding@resend.dev>` |
| `ANTHROPIC_API_KEY` | Yes* | For AI moderation, contract generation, recommendations |
| `OPENAI_API_KEY` | No | For embeddings (optional) |
| `REDIS_URL` | No | Redis for rate limiting (optional, in-memory fallback) |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

*Required for full functionality; app starts without them.

### Frontend (Vercel)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL (e.g., `https://api.hispaloshop.com`) |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...`) |
| `REACT_APP_CLOUDINARY_CLOUD` | Cloudinary cloud name |
| `REACT_APP_GIPHY_API_KEY` | GIPHY API key for sticker tool |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `REACT_APP_SENTRY_DSN` | Sentry DSN for frontend error tracking |

## Local Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Create .env with required variables (see above)
cp .env.example .env  # Edit with your values

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "REACT_APP_API_URL=http://localhost:8000" > .env.local

npm start
```

### Build for Production

```bash
# Backend: no build step (Python)

# Frontend:
cd frontend
npx craco build   # NOT react-scripts build
```

## Deploy to Production

### Railway (Backend)

1. Connect GitHub repo to Railway
2. Set root directory to `backend/`
3. Railway auto-detects Python via `runtime.txt` (Python 3.11)
4. Set all environment variables in Railway dashboard
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Custom domain: `api.hispaloshop.com`

### Vercel (Frontend)

1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Build command: `npx craco build`
4. Output directory: `build`
5. Set environment variables in Vercel dashboard
6. Custom domain: `www.hispaloshop.com`

## Superadmin Creation

The superadmin account must be created directly in MongoDB (never via UI):

```javascript
// Connect to MongoDB Atlas
// mongosh "mongodb+srv://..."

db.users.insertOne({
  user_id: "superadmin_001",
  email: "admin@hispaloshop.com",
  name: "Superadmin",
  role: "superadmin",
  approved: true,
  email_verified: true,
  hashed_password: "<bcrypt hash of chosen password>",
  created_at: new Date(),
  verification_status: { is_verified: true }
})
```

Generate bcrypt hash: `python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"`

## Cron Jobs

Configure these as scheduled tasks in Railway (or external scheduler calling POST endpoints):

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `POST /api/admin/cron/grace-period-check` | Daily 00:00 | Check subscription grace periods |
| `POST /api/admin/cron/influencer-payouts` | Daily 06:00 | Process due influencer payouts |
| `POST /api/admin/cron/influencer-auto-payouts` | Daily 07:00 | Auto-payouts for eligible influencers |
| `POST /api/admin/cron/tier-recalculation` | Weekly Mon 03:00 | Recalculate influencer tiers |
| `POST /api/admin/cron/attribution-expiry` | Daily 02:00 | Clean expired attributions (18 months) |
| `POST /api/admin/cron/influencer-tier-sweep` | Daily 04:00 | Sweep tier downgrades |
| `POST /api/admin/cron/predict-notifications` | Daily 09:00 | Send AI-predicted notifications |
| `POST /api/admin/cron/b2b-scheduled-payments` | Daily 10:00 | Process B2B scheduled payments |
| `POST /api/admin/cron/certificate-expiry-alerts` | Daily 08:00 | Alert on expiring certificates |
| `POST /api/admin/cron/review-request-notifications` | Daily 11:00 | Send review request emails |
| `POST /api/admin/cron/generate-quarterly-tax-report` | Quarterly | Generate Modelo 190 tax report |

## Project Structure

```
hispaloshop/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── core/
│   │   ├── config.py           # Pydantic settings (env validation)
│   │   ├── database.py         # MongoDB connection + indexes
│   │   ├── auth.py             # JWT authentication
│   │   ├── models.py           # Pydantic data models
│   │   └── sanitize.py         # Input sanitization utilities
│   ├── routes/                 # API route handlers (58 routers)
│   │   ├── auth.py             # Login, register, OAuth
│   │   ├── products.py         # Product CRUD + moderation
│   │   ├── orders.py           # Order management
│   │   ├── b2b_operations.py   # B2B offers, contracts, signatures
│   │   ├── b2b_payments.py     # B2B Stripe payments
│   │   ├── collaborations.py   # Influencer collaborations
│   │   ├── documents.py        # Digital signature + document verification
│   │   ├── cron.py             # Scheduled tasks
│   │   └── ...                 # 50+ more route files
│   ├── services/               # Business logic
│   │   ├── b2b_contract_service.py   # PDF contract generation
│   │   ├── content_moderation.py     # AI content moderation
│   │   ├── fiscal_verification.py    # Tax certificate verification
│   │   ├── commission_service.py     # Influencer commissions
│   │   └── ...
│   ├── middleware/             # Security middleware
│   │   ├── security.py         # Headers, rate limiting, logging
│   │   ├── csrf.py             # CSRF double-submit cookie
│   │   ├── rate_limit.py       # Redis-backed rate limiter
│   │   └── sentry_init.py      # Sentry error tracking
│   └── tests/                  # Pytest test suite (100+ files)
├── frontend/
│   ├── src/
│   │   ├── App.js              # Routes + lazy loading
│   │   ├── pages/              # Page components (120+)
│   │   ├── components/         # Reusable components (90+)
│   │   ├── context/            # React contexts (Auth, Cart, Theme)
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API client
│   │   └── styles/             # CSS design tokens
│   └── public/                 # Static assets
└── .env                        # Environment variables (not committed)
```

## External Services Checklist

- [ ] Stripe: Webhook endpoint created and active
- [ ] Stripe Connect: Activated for producer payouts
- [ ] Stripe Products: PRO and ELITE subscription products created
- [ ] Google OAuth: Application set to "In production" mode
- [ ] MongoDB Atlas: IP whitelist updated for Railway IPs
- [ ] Cloudinary: Upload preset configured
- [ ] Resend: Domain verified for transactional email
- [ ] Anthropic: API key with sufficient credits
- [ ] Sentry: Projects created for backend + frontend
