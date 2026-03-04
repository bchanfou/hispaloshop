# Fase 1 - Stabilization Runbook (2026-03-04)

Este documento resume el estado de los fixes críticos aplicados y cómo validar localmente.

## 1) Estado funcional cerrado

- Webhooks de pago/reembolso estabilizados:
  - eager loading de `order.items` en rutas críticas de webhook
  - cálculo de delta en reembolsos acumulativos
  - cobertura de tests de hotfixes
- Checkout/planes/tiers alineados en contrato actual:
  - compatibilidad `/api/v1` + `/api` en frontend
  - endpoints legacy críticos montados en backend (`cron`, `recipes_reviews`, etc.)
  - healthcheck disponible en `/health` y `/api/health`
- Tiers de influencers unificados a 5 niveles:
  - `perseo`, `aquiles`, `hercules`, `apolo`, `zeus`
- Comisión ELITE alineada a negocio:
  - `17%` en backend, frontend y contenido público

## 2) Robustez de arranque (dev/CI)

El backend ya no depende de hacks manuales para iniciar:

- OpenAI opcional en import-time:
  - no rompe si `OPENAI_API_KEY` está vacío
- Mongo con defaults de desarrollo:
  - `MONGO_URL=mongodb://localhost:27017`
  - `DB_NAME=hispaloshop`
- Carpeta estática `uploads/` creada automáticamente al iniciar

## 3) Configuración base

Usar:

- `backend/.env.example`

Variables mínimas para levantar:

- `DATABASE_URL`
- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`

`OPENAI_API_KEY` puede quedar vacío en local.

## 4) Validación rápida recomendada

Desde la raíz del repo:

```powershell
cd c:\Users\bilal\OneDrive\Documentos\GitHub\hispaloshop
$env:PYTHONPATH='backend'
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

En otra terminal:

```powershell
cd c:\Users\bilal\OneDrive\Documentos\GitHub\hispaloshop\backend
$env:REACT_APP_BACKEND_URL='http://127.0.0.1:8000'
python -m pytest tests/test_webhook_hotfixes.py -q
python -m pytest tests/test_iteration_76_phase2_subscriptions.py -q
python -m pytest tests/test_iteration_81_feature_locking_recipes.py -q
```

Resultado esperado:

- `test_webhook_hotfixes.py`: `4 passed`
- `test_iteration_76_phase2_subscriptions.py`: `8 passed, 9 skipped`
- `test_iteration_81_feature_locking_recipes.py`: `9 passed, 5 skipped`

## 5) Nota de CI/Warns

- Se añadió `backend/pytest.ini` para filtrar un warning externo de Starlette (`python_multipart`).
- Warnings de terceros no bloquean suites críticas actuales.

