# Release Checklist - Fase 1 (Hotfixes Criticos)

Checklist operativo para despliegue a produccion de los fixes de:

- webhooks de pagos/reembolsos
- proteccion de stock/concurrencia
- tiers de influencers (5 niveles)
- comision ELITE al 17%
- compatibilidad de rutas `/api` y `/api/v1`

## 1) Pre-deploy (tecnico)

- [ ] `git status` limpio en branch de release.
- [ ] Variables de entorno validadas en target:
  - [ ] `DATABASE_URL`
  - [ ] `MONGO_URL`
  - [ ] `DB_NAME`
  - [ ] `JWT_SECRET`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] Migraciones listas en artifact:
  - [ ] `20260416_0013_unify_influencer_tiers_5_levels.py` incluida
  - [ ] secuencia alembic consistente
- [ ] Backup DB previo:
  - [ ] Postgres snapshot
  - [ ] Mongo backup (si aplica)
- [ ] Smoke local pre-release:
  - [ ] `test_webhook_hotfixes.py`
  - [ ] `test_phase1_hotfixes_prompt2.py`
  - [ ] `test_influencer_tiers_unification.py`
  - [ ] `test_review_fixes.py`
  - [ ] `test_iteration_76_phase2_subscriptions.py`
  - [ ] `test_iteration_81_feature_locking_recipes.py`

## 2) Deploy

- [ ] Aplicar migraciones:
  - [ ] `alembic upgrade head`
- [ ] Desplegar backend.
- [ ] Desplegar frontend.
- [ ] Verificar health:
  - [ ] `GET /health = 200`
  - [ ] `GET /api/health = 200`

## 3) Post-deploy inmediato (5-15 min)

- [ ] Rutas criticas vivas:
  - [ ] `/api/sellers/plans`
  - [ ] `/api/influencers/tiers`
  - [ ] `/api/admin/cron/grace-period-check` (auth esperado)
  - [ ] `/api/recipes` (200, aunque vacio)
- [ ] Verificacion de contrato frontend:
  - [ ] cliente resuelve `/api/v1` y fallback `/api` correctamente
- [ ] Validar contenido publico:
  - [ ] landings y SEO muestran ELITE `17%`
  - [ ] tiers visibles: `Perseo, Aquiles, Hercules, Apolo, Zeus`

## 4) Verificacion funcional negocio (post-deploy)

- [ ] Flujo pago exitoso:
  - [ ] crea comision influencer sin `MissingGreenlet`
- [ ] Flujo reembolso parcial x2:
  - [ ] segundo webhook procesa delta, no acumulado
- [ ] Idempotencia webhook:
  - [ ] mismo evento no duplica efecto
- [ ] Checkout concurrencia stock:
  - [ ] no hay overselling/stock negativo en carrera

## 5) Monitoreo primeras 24h

- [ ] Dashboard de errores (API):
  - [ ] 404 en `/api/*` sin incremento anomalo
  - [ ] 5xx en webhooks sin incremento
- [ ] Stripe webhook logs:
  - [ ] sin duplicados procesados
  - [ ] sin errores de parseo/evento
- [ ] Datos de comisiones:
  - [ ] ELITE aplicando 17%
  - [ ] tiers y comisiones en rango esperado

## 6) Rollback plan (si hay incidente P1)

- [ ] Criterio de rollback definido (error rate / pagos / checkout).
- [ ] Rollback de app version listo.
- [ ] Rollback de DB solo si es estrictamente necesario (preferir fix-forward).
- [ ] Comunicacion interna (producto/ops/soporte) preparada.

## 7) Cierre de release

- [ ] Evidencia guardada (tests + health + logs).
- [ ] Documento de incidentes/no-regresion actualizado.
- [ ] Tag de release creado.

