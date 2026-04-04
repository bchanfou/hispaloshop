# MEGA-PLAN — HispaloShop Platform Audit Fix

> Generado: 2026-04-04
> Decisiones tomadas en 25 preguntas de auditoría con el fundador.

---

## RESUMEN DE DECISIONES

| # | Tema | Decisión | Prioridad |
|---|---|---|---|
| 1 | Mock Stripe transfers | B — `pending_transfer` + retry 3x + alerta admin | CRÍTICO |
| 2 | Tipos de cambio | A — Cron diario ECB → BD, ledger lee de BD | CRÍTICO |
| 3 | FCM legacy API | A — Migrar a FCM HTTP v1 | CRÍTICO |
| 4 | Feed duplicado | C — Unificar en FeedAlgorithm con `mode` param | URGENTE |
| 5 | Preferencias feed | A — Escribir en `consumer_data.preferences` (donde el algo lee) | URGENTE |
| 6 | Reverse charge IVA | A — Integrar API VIES para validar VAT ID | URGENTE |
| 7 | GDPR analytics | C — No cargar scripts sin consent + guard en función | URGENTE |
| 8 | CommissionHistory roto | C — Buscar en git history, decidir | URGENTE |
| 9 | Búsqueda sin relevancia | B — MongoDB `$text` index + `textScore` | ALTO |
| 10 | SMS no-op | C — Marcar `not_implemented`, no `success` | ALTO |
| 11 | Descuento influencer | B — Cupón configurable que el influencer crea desde dashboard | ALTO |
| 12 | Follows duplicados | B — Unificar en `db.user_follows`, deprecar `db.follows` | URGENTE |
| 13 | Preferencia onboarding | A — Conectar al FeedAlgorithm como mode inicial | ALTO |
| 14 | Cron código muerto | A — Eliminar líneas 83-168 | ALTO |
| 15 | Dynamic commission muerta | B — Eliminar función | ALTO |
| 16 | Frontend huérfano (~30 items) | B — Eliminar por grupos en commits separados | MEDIO |
| 17 | backend/app/ (5130 líneas) | A — Eliminar directorio entero | MEDIO |
| 18 | Notificaciones productor | B — Solo `new_order` + `payment_confirmed` | ALTO |
| 19 | Verificación global | C+ — IA + formato/checksum por país + admin local revisa dudas | ALTO |
| 20 | Gamificación timezone | B — Fix timezone + objetivo semanal por país | MEDIO |
| 21 | Upload progress | A — XMLHttpRequest solo para uploads | MEDIO |
| 22 | IAs — limpieza | C — Limpiar muertos ahora, restructura completa en chat aparte | MEDIO |
| 23 | A/B testing | B — Eliminar backend, usar PostHog | MEDIO |
| 24 | Plan context fallback | C — Cache localStorage + retry background | ALTO |
| 25 | Comisiones centralizadas | C — Endpoint `/config/plans` como fuente única | ALTO |

### Nueva estructura de comisiones

```
FREE:  seller 80% | plataforma 20%
PRO:   seller 82% | plataforma 18%
ELITE: seller 83% | plataforma 17%  (antes 15%, sube a 17%)

Influencer (sobre parte plataforma):
  Hercules: 3%  |  Atenea: 5%  |  Zeus: 7%

Primera compra con código influencer: -10% al consumidor
  → Seller cobra sobre precio ORIGINAL (no sobre lo pagado)
  → Plataforma absorbe el descuento
  → Código influencer NO stackable con otros cupones

Atribución influencer: 18 meses
```

### Country Admin — Fix completo (Decisión 19b)

```
- admin sin assigned_country = acceso DENEGADO (no global)
- Country-scope TODAS las secciones: verificación, discount codes, influencers, fiscal, moderación
- UI para activar países y asignar admin (super_admin)
- Fix inconsistencia campo: unificar en assigned_country
- country_configs.admin_user_id se escribe al asignar admin
- Verificación: IA + formato/checksum → admin local si hay dudas
```

---

## CICLO 1 — CRÍTICOS (Dinero + Push)

> Objetivos: que el dinero se mueva correctamente y las notificaciones push sigan funcionando.

### 1.1 — Mock Stripe → pending_transfer con retry
**Archivos:** `backend/services/affiliate_service.py`
- Eliminar fallback `mock_transfer_{id}`
- Estado `pending_transfer` si Stripe falla
- Retry 3x con exponential backoff (1s, 4s, 16s)
- Si falla 3x → estado `transfer_failed` + notificación admin
- Nunca marcar como `paid` sin `stripe_transfer_id` real

### 1.2 — Tipos de cambio dinámicos
**Archivos:** `backend/services/ledger.py`, `backend/routes/cron.py`, nuevo `backend/services/exchange_rates.py`
- Crear servicio `exchange_rates.py`:
  - Fetch diario del ECB (XML gratuito)
  - Guardar en colección `exchange_rates` con fecha
  - Fallback a rates estáticos SOLO si no hay datos en BD (primer arranque)
- Cron endpoint `POST /admin/cron/update-exchange-rates`
- `ledger.py` lee rates de BD en vez de constantes
- Los rates estáticos se mantienen como fallback de emergencia, con log warning

### 1.3 — FCM HTTP v1
**Archivos:** `backend/services/notifications/dispatcher_service.py`
- Cambiar endpoint de `fcm.googleapis.com/fcm/send` a `fcm.googleapis.com/v1/projects/{project_id}/messages:send`
- Auth: server key → service account OAuth2 (google-auth library)
- Payload: `{ to, notification }` → `{ message: { token, notification } }`
- Variable de entorno: `FCM_SERVICE_ACCOUNT_JSON` o `GOOGLE_APPLICATION_CREDENTIALS`
- Test con push real antes de merge

---

## CICLO 2 — COMISIONES & MONETIZACIÓN

> Objetivo: nueva estructura de comisiones implementada y centralizada.

### 2.1 — Endpoint centralizado `/config/plans`
**Archivos:** nuevo endpoint en `backend/routes/config.py`, `backend/core/constants.py`
- `GET /config/plans` → devuelve:
  ```json
  {
    "seller_plans": {
      "FREE":  { "commission_rate": 0.20, "price_monthly_eur": 0, "shipping_base": 5.90, "shipping_free_threshold": null },
      "PRO":   { "commission_rate": 0.18, "price_monthly_eur": 79, "shipping_base": 3.90, "shipping_free_threshold": 30 },
      "ELITE": { "commission_rate": 0.17, "price_monthly_eur": 249, "shipping_base": 2.90, "shipping_free_threshold": 20 }
    },
    "influencer_tiers": {
      "hercules": { "commission_rate": 0.03 },
      "atenea":   { "commission_rate": 0.05 },
      "zeus":     { "commission_rate": 0.07 }
    },
    "first_purchase_discount_pct": 10,
    "attribution_months": 18,
    "influencer_coupon_stackable": false
  }
  ```
- Público (no auth), cacheable 1h
- Frontend: React Query hook `usePlanConfig()` con staleTime 1h

### 2.2 — Actualizar cálculo de comisiones
**Archivos:** `backend/core/monetization.py`, `backend/services/commission_service.py`
- `calculate_order_split()` lee rates de `/config/plans` (o BD)
- ELITE: 15% → 17%
- Seller siempre cobra sobre precio original (no sobre precio con descuento)
- Si hay influencer + primera compra: plataforma absorbe el 10%
- Código influencer NO stackable: `apply_coupon()` rechaza si ya hay coupon de influencer

### 2.3 — Cupón configurable de influencer
**Archivos:** `backend/routes/influencer.py`, `frontend/src/pages/influencer/InfluencerDashboard.tsx`
- Influencer puede crear/editar su código con % personalizado (máximo = su tier rate)
- `apply_coupon()` detecta tipo `influencer_code` → aplica descuento + atribución
- Validación: no stackable con otros cupones (error claro al consumidor)

### 2.4 — Eliminar código muerto de comisiones
**Archivos:** `backend/services/subscriptions.py`, `backend/routes/cron.py`
- Eliminar `calculate_dynamic_commission()` (línea 206+)
- Eliminar líneas 83-168 de `cron.py` (payout body inalcanzable)
- Eliminar `INFLUENCER_DISCOUNT_PCT = 10` (reemplazado por config centralizado)

### 2.5 — Frontend: actualizar todas las referencias a comisiones
**Archivos:** `ProducerPlanPage.tsx`, landing pages, pricing
- Todas las páginas que muestran "15%" → leer de `usePlanConfig()`
- Eliminar hardcoded commission rates del frontend

---

## CICLO 3 — FEED & DESCUBRIMIENTO

> Objetivo: un solo motor de feed, preferencias conectadas, búsqueda con relevancia.

### 3.1 — Unificar FeedAlgorithm con modo fast/full
**Archivos:** `backend/services/feed_algorithm.py`, `backend/routes/feed.py`
- `FeedAlgorithm.score(mode="fast"|"full")`
  - `fast`: recency + engagement + following boost (para `/feed/foryou`)
  - `full`: todas las señales incluyendo category affinity, dwell time, creator affinity (para `/discovery/feed`)
- Eliminar scoring inline de `feed.py`
- Ambos endpoints llaman a `FeedAlgorithm`

### 3.2 — Conectar preferencias del feed
**Archivos:** `backend/services/feed_preferences.py`
- `update_preferences()` escribe en `db.users` → `consumer_data.preferences.categories` (el campo que el algoritmo ya lee)
- Eliminar escrituras a `db.user_feed_preferences`
- Script de migración one-time: copiar datos existentes de `user_feed_preferences` → `users.consumer_data.preferences`
- Drop collection `user_feed_preferences` después de verificar

### 3.3 — Conectar preferencia de onboarding al feed
**Archivos:** `backend/routes/onboarding.py`, `backend/services/feed_algorithm.py`
- `discoveryMethod` de onboarding se guarda en `users.consumer_data.feed_mode`
- FeedAlgorithm lee este campo para ajustar pesos iniciales:
  - `personalized` → default (status quo)
  - `popular` → engagement weight 0.50
  - `local` → country multiplier ×2.0
  - `rated` → engagement weight 0.40 + quality signal
- Los pesos se diluyen después de 20+ interacciones

### 3.4 — Unificar colecciones de follows
**Archivos:** `backend/services/trending_service.py`
- Cambiar `db.follows` → `db.user_follows` en trending_service
- Verificar schema compatibility entre ambas colecciones
- Migrar datos si hay follows en `db.follows` que no están en `db.user_follows`
- Drop `db.follows` después de verificar

### 3.5 — Búsqueda con $text index
**Archivos:** `backend/routes/search.py`, migration script
- Crear text index compuesto: `{ name: "text", description: "text", tags: "text", category: "text" }`
- Weights: `{ name: 10, tags: 5, category: 3, description: 1 }`
- Reemplazar `$regex` query por `$text` con `$meta: { textScore: 1 }` como sort para "relevancia"
- Mantener `$regex` como fallback solo para autocompletado (prefix matching)
- Facets: mantener los filtros existentes (price, certifications, etc.) como `$match` stages

---

## CICLO 4 — LEGAL & FISCAL

> Objetivo: GDPR compliance, VAT correcto, verificación global.

### 4.1 — GDPR: consent-gated analytics
**Archivos:** `frontend/src/utils/analytics.ts`, `frontend/src/index.html` (o donde se cargan scripts)
- Capa 1: NO cargar scripts gtag/fbq/posthog hasta consent aceptado
- Capa 2: guard en `trackMarketingEvent()` → `if (!hasAnalyticsConsent()) return`
- `hasAnalyticsConsent()` lee del estado de `ConsentLayers`

### 4.2 — VIES VAT ID validation
**Archivos:** nuevo `backend/services/vies_service.py`, `backend/services/ledger.py`
- Llamar API VIES (SOAP → REST wrapper o librería `vies-check`)
- Flujo en checkout B2B: importador introduce VAT ID → validar en tiempo real → si válido: reverse charge → si inválido: cobrar IVA del país
- Cache resultado VIES 24h (los VAT IDs no cambian a diario)
- Guardar `vat_id_verified: true/false` en el perfil del importador

### 4.3 — Verificación global de vendedores
**Archivos:** `backend/services/producer_verification.py`, nuevo `backend/services/document_formats.py`
- `document_formats.py`: validación de formato/checksum por país
  - España: NIF/CIF (dígito de control)
  - USA: EIN (formato XX-XXXXXXX)
  - Francia: SIRET (algoritmo Luhn)
  - Corea: 사업자등록번호 (checksum mod 10)
  - etc. — empezar con los 6 países activos
- Flujo:
  1. Seller sube documento oficial de su país
  2. Validación algorítmica formato/checksum
  3. Claude Haiku vision review
  4. Alta confianza → auto-approve
  5. Dudas → escalar a admin local del país
- Notificaciones de verificación pasan por `notification_dispatcher` (no directo)

### 4.4 — SMS: marcar como not_implemented
**Archivos:** `backend/services/notifications/dispatcher_service.py`
- `_send_sms()`: cambiar `pass` por status `not_available` en el resultado
- `_send_with_retry()` no debe contar `not_available` como éxito
- Log warning cuando se intente enviar SMS

---

## CICLO 5 — COUNTRY ADMIN

> Objetivo: sistema de admin local completo y seguro.

### 5.1 — Admin sin país = acceso denegado
**Archivos:** `backend/routes/admin_dashboard.py`
- `_get_admin_country_scope()`: si `role == "admin"` y `assigned_country` es None → raise 403
- Solo `super_admin` puede tener scope global (None)

### 5.2 — Unificar campo de país
**Archivos:** `backend/routes/support.py`, `backend/core/models.py`
- Support: cambiar `users.country` → `users.assigned_country` en `_country_query_for_admin()`
- `AdminStatusUpdate` model: añadir `assigned_country: Optional[str]` al schema Pydantic

### 5.3 — Country-scope todas las secciones admin
**Archivos:** `backend/routes/admin_verification.py`, `backend/routes/admin_dashboard.py`, rutas de influencers, discount codes, fiscal
- Verification queue: añadir filtro `country` basado en `_get_admin_country_scope()`
- Discount codes: filtrar por país del admin
- Influencer management: filtrar por país del influencer
- Fiscal/tax: filtrar por país
- Moderación: filtrar por país del contenido

### 5.4 — UI activación de países + asignación de admin
**Archivos:** `frontend/src/pages/super-admin/MarketCoverage.tsx`, nuevo `CountryAdminManager.tsx`
- MarketCoverage: toggles funcionales que llaman `POST /superadmin/countries/{code}/activate|deactivate`
- Asignar admin: dropdown de usuarios con rol `admin` → `PUT /superadmin/countries/{code}/admin`
- Backend: escribir `admin_user_id` en `country_configs` al asignar
- Mostrar estado: país activo/inactivo, admin asignado, nº productos, nº sellers

### 5.5 — country_configs sync
**Archivos:** `backend/core/database.py`
- Seed expandido: todos los países de `SUPPORTED_COUNTRIES` (no solo 6)
- `is_active` default `false` para nuevos
- Endpoint `GET /superadmin/countries` ya existe → conectar al frontend

---

## CICLO 6 — LIMPIEZA DE CÓDIGO MUERTO

> Objetivo: eliminar todo el dead code identificado en la auditoría.

### 6.1 — Commit: eliminar hooks huérfanos
- `useCountUp.ts`, `useScrollReveal.ts`, `useScrollDirection.ts`, `useStores.js`, `useRecommendations.ts`
- `useInfluencerDashboard.ts` (SWR legacy)
- `hooks/api/useInfluencer.js` hooks muertos
- `hooks/api/useHIChat.js` (deprecated wrapper)

### 6.2 — Commit: eliminar contextos huérfanos
- `context/PostEditorContext.tsx`
- `context/ReelEditorContext.tsx`

### 6.3 — Commit: eliminar componentes huérfanos
- `components/onboarding/` (directorio entero, 8-9 files)
- `components/auth/AuthDiagnostic.jsx`
- `components/auth/AuthTestPanel.jsx`
- `components/b2b/BrandCard.js`
- `components/RolePills.js`

### 6.4 — Commit: eliminar cart hooks muertos
- `useCartQueries.js`: eliminar `useAddToCart`, `useUpdateCartItem`, `useRemoveFromCart`, `useSyncCart`, `useCheckout`, `useConfirmPayment`
- `useInternalChatQueries.js`: eliminar 3 hooks marcados DEAD CODE

### 6.5 — Commit: eliminar backend muerto
- `backend/app/` (directorio entero ~5,130 líneas)
- `routes/experiments.py` (A/B testing sin frontend)
- `jobs/calculate_post_scores.py` (apunta a PostgreSQL, DB activa es MongoDB)

### 6.6 — Commit: fix CommissionHistory export roto
- `git log` para buscar historial del archivo
- Si existió con lógica → recuperar
- Si era stub → eliminar export de `components/affiliate/index.js`

### 6.7 — Commit: limpiar IAs muertas (preparación para chat de IAs)
- `AIAssistant.js` — no montado, dead code (pero NO eliminar — migrar lógica a David activo en el chat de IAs)
- Marcar como `// DEPRECATED — logic to be merged into HispalAI.js`
- Eliminar endpoint huérfano `/api/ai/influencer-assistant` (no tiene frontend)
- Fix bug idioma influencer: eliminar línea 1741 "Responde siempre en español"

---

## CICLO 7 — UX & RESILENCIA

> Objetivo: mejorar experiencia del usuario en edge cases.

### 7.1 — Upload progress real con XHR
**Archivos:** nuevo `frontend/src/utils/uploadWithProgress.js`, `frontend/src/context/UploadQueueContext.tsx`
- Crear utility `uploadWithProgress(url, formData, onProgress)` usando XMLHttpRequest
- `UploadQueueContext` usa esta utility en vez de `apiClient.post` para uploads
- Progress real de 0-100% en la barra de subida

### 7.2 — Plan context con cache + retry
**Archivos:** `frontend/src/context/ProducerPlanContext.tsx`
- Al recibir plan del server → guardar en `localStorage` key `hsp_plan_cache`
- Al montar: leer cache inmediato → mostrar plan cached
- Background: fetch server → si difiere del cache, actualizar + toast sutil
- Si server falla: mantener cache, banner "verificando plan..."
- Si no hay cache Y server falla: ENTONCES sí fallback a FREE (primer uso sin red)

### 7.3 — Notificaciones al productor
**Archivos:** `backend/routes/notifications.py`, `backend/services/notifications/dispatcher_service.py`
- Añadir `new_order` → notificación al productor cuando se confirma un pedido
- Añadir `payment_confirmed` → notificación al productor para que prepare el envío
- Ambas pasan por `notification_dispatcher` (respeta quiet hours + push)

### 7.4 — Gamificación: timezone + objetivo por país
**Archivos:** `backend/services/gamification.py`
- Reemplazar `datetime.utcnow()` → `datetime.now(timezone.utc)` (3 ocurrencias)
- `DEFAULT_WEEKLY_GOAL_CENTS` → leer de `country_configs` collection
- Super_admin / country_admin puede configurar el objetivo por país
- Fallback: €20 equivalente en moneda local si no configurado

### 7.5 — Feature gate en IAs
**Archivos:** `frontend/src/App.js`
- Rutas de IA comercial: proteger con redirect a `/pricing` si no ELITE
- Componente: envolver con `FeatureGate` como fallback visual
- Backend ya valida (triple capa)

---

## CICLO 8 — CACHE DE RATES EN RECOMENDACIONES

> Fixes menores de performance y consistencia.

### 8.1 — Fix case-sensitivity en cache de recomendaciones
**Archivos:** `backend/services/recommendations.py`
- Comparar plan con `.upper()` antes de decidir TTL (Pro → PRO)

### 8.2 — Fix N+1 en collaborative filtering
**Archivos:** `backend/services/recommendations.py`
- Reemplazar loop de `find_one()` por un solo `find({ _id: { $in: [...] } })`

### 8.3 — Fix N+1 en David AI cart
**Archivos:** `backend/services/hispal_ai_tools.py`
- `add_to_cart_db()`: reemplazar loop de fetch por query batch

### 8.4 — Shipping: free_shipping coupon verificación
**Archivos:** `backend/routes/cart.py`, checkout flow
- Verificar que checkout lee el cupón `free_shipping` del cart y aplica el descuento
- Si no lo hace: implementar la lógica

---

## POST-PLAN: Chat dedicado para IAs

Después de completar los 8 ciclos, iniciar chat separado para:
- Fusionar David legacy (memoria, smart cart) → David activo (widget)
- Crear Rebeca AI (PRO, ventas nacionales)
- Reestructurar Pedro AI (ELITE, ventas internacionales)
- Eliminar HI Multi-role duplicado
- Prompt generado al final de este plan

---

## ORDEN DE EJECUCIÓN

```
Ciclo 1 (CRÍTICO)     → Dinero + Push           → ~3h
Ciclo 2 (COMISIONES)   → Nueva estructura        → ~4h
Ciclo 3 (FEED)         → Motor unificado         → ~3h
Ciclo 4 (LEGAL)        → GDPR + VAT + Verif.     → ~4h
Ciclo 5 (COUNTRY ADMIN)→ Admin local completo    → ~4h
Ciclo 6 (LIMPIEZA)     → Dead code elimination   → ~2h
Ciclo 7 (UX)           → Resilencia + features   → ~3h
Ciclo 8 (PERF)         → N+1 fixes + cache       → ~1h
```

**Total: ~24h de implementación, 8 ciclos**
