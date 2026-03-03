# Sprint 2 - Motor Financiero

## Variables de entorno

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=https://hispaloshop.com
```

## Backend

```bash
cd backend
alembic upgrade head
uvicorn main:app --reload
```

## Stripe Webhooks

```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

Eventos necesarios:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `charge.refunded`
- `account.updated`

## Flujo de checkout

1. `POST /api/v1/cart/items`
2. `GET /api/v1/cart`
3. `POST /api/v1/checkout/session`
4. Stripe Checkout
5. Webhooks marcan orden pagada y generan transacciones
