# Sprint 3 - Sistema de Afiliados

## Incluye
- Router público `GET /r/{code}` para tracking + cookies de atribución.
- API de influencer (`/api/v1/influencer`) para dashboard, links, comisiones y payouts.
- Extensiones de productor para gestionar solicitudes/links de afiliados.
- Servicio de afiliados para tracking de clicks/conversiones, tiers y payouts.
- Integración con checkout/webhooks para atribución y creación de comisiones.
- Job mensual `jobs/recalculate_tiers.py`.

## Flujo rápido
1. Influencer crea link en `POST /api/v1/influencer/affiliate-links`.
2. Usuario entra por `GET /r/{code}`, se registra click y cookie.
3. Checkout toma cookie y guarda `order.affiliate_code`.
4. Webhook de Stripe crea comisiones por `order_item`.
5. Influencer revisa dashboard/comisiones y solicita payout.

## Variables de entorno nuevas
- `AFFILIATE_ATTRIBUTION_DAYS` (default `548`)
- `AFFILIATE_COOKIE_NAME` (default `hispaloshop_ref`)
- `AFFILIATE_MIN_PAYOUT_CENTS` (default `1000`)
- `TIER_RECALCULATION_DAY` (default `1`)

## Comandos
```bash
cd backend
alembic upgrade head
python jobs/recalculate_tiers.py
uvicorn main:app --reload
```
