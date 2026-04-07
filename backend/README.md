# HispaloShop Backend

> FastAPI + MongoDB backend for HispaloShop marketplace.

## 🏗️ Arquitectura

```
backend/
├── main.py              # Entry point, startup checks
├── core/                # Config, auth, models, database
│   ├── auth.py         # JWT validation
│   ├── models.py       # Pydantic models
│   └── database.py     # MongoDB connection
├── routes/             # API endpoints (66 routers)
│   ├── auth.py
│   ├── cart.py
│   ├── orders.py
│   ├── payments.py
│   ├── products.py
│   └── ...
├── services/           # Business logic
│   ├── notifications/
│   ├── shipping_service.py
│   └── feedback_service.py
└── tests/              # Smoke tests
```

## 🚀 Development

```bash
# Setup
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run
cp .env.example .env
# Edit .env
uvicorn main:app --reload

# Test
pytest tests/smoke/ -v
```

## 📡 API Structure

| Prefix | Description |
|--------|-------------|
| `/api/auth/*` | Authentication |
| `/api/cart/*` | Shopping cart |
| `/api/orders/*` | Orders & checkout |
| `/api/products/*` | Product catalog |
| `/api/payments/*` | Stripe integration |
| `/api/chat/*` | Messages & conversations |
| `/api/notifications/*` | Push & in-app |
| `/api/feedback/*` | User feedback |
| `/api/admin/*` | Admin operations |
| `/ws/chat` | WebSocket chat |

## 🔐 Auth

- JWT tokens (access + refresh)
- Role-based: consumer, producer, influencer, importer, admin, super_admin
- Country-scoped for admin users

## 🗄️ Database

**MongoDB Atlas** (production)

Key collections:
- `users` - All user types
- `products` - Product catalog
- `orders` - Purchase orders
- `carts` - Active carts
- `conversations` - Chat
- `notifications` - User notifications
- `feedback` - Feature requests

## 📊 Monitoring

- **Sentry**: Error tracking
- **Railway**: Metrics & logs
- **Health**: `GET /health`

## 🧪 Smoke Tests

```bash
pytest tests/smoke/test_critical_flows.py -v
```

Tests cover:
- Health endpoint
- Auth flows
- Cart operations
- Order creation
- Payment webhooks

## 📝 Environment Variables

See `.env.example` for complete list.

**Critical:**
```bash
ENV=production
JWT_SECRET=<random-32-char-string>
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
FCM_SERVICE_ACCOUNT_JSON={...}
```

## 🚨 Production Checklist

- [ ] All env vars set in Railway
- [ ] Stripe in live mode
- [ ] MongoDB IP whitelist updated
- [ ] Sentry DSN configured
- [ ] Health check passes
- [ ] Smoke tests pass

## 📚 More Docs

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide
- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) - Recovery runbooks
