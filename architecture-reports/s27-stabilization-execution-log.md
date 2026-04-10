# S27 Stabilization Execution Log

Date: 2026-03-12
Scope: Perfil, feed, uploads, producto/tienda/certificado, locale, panel admin/super-admin.

## Phase 0-1: Started

### Completed in this run
- Added legacy and Spanish route aliases to prevent navigation dead-ends in `frontend/src/App.js`:
  - `/perfil` -> role-based profile redirect
  - `/feed` -> discover feed
  - `/producto/:productId` -> product detail page
  - `/tienda/:storeSlug` -> store page
  - `/certificado/:productId` -> certificate page
  - `/configuracion/{idioma|pais|moneda}` -> locale settings
  - `/admin/{usuarios|administradores|finanzas|mercados|contenido|estadisticas|analitica|escalaciones}` -> `/super-admin/*`
- Hardened feed query fallback in `frontend/src/features/feed/queries/useFeedQueries.js`:
  - If all feed endpoints fail, return an empty normalized page instead of throwing a hard UI error.
- Hardened tagged product links in `frontend/src/components/feed/PostCard.js`:
  - Do not render product-tag CTA when product ID is missing (avoids `/products/undefined`).
- Added backend role-alias normalization in `backend/core/auth.py`:
  - `superadmin` -> `super_admin`, `consumer` -> `customer`, `seller` -> `producer` in authorization guards.
- Added additional route aliases in `frontend/src/App.js`:
  - `/tiendas`, `/tiendas/:storeSlug`, `/certificados`.
- Improved product-query compatibility in `frontend/src/features/products/queries/useProductQueries.js`:
  - Category fallback via `/categories` list when `/categories/:slug` is absent.
  - Related products fallback to `[]` when endpoint is absent.
  - Search suggestions fallback from `/search/suggestions` to `/search`.
  - Review creation aligned to existing endpoint `/reviews/create`.
  - B2B catalog/info now fail safely (`[]` / `null`) if endpoints are missing.
- Improved API contract analyzer in `scripts/analyze-api-contract.mjs`:
  - Handles backend `APIRouter(prefix=...)` to compute effective full paths.
  - Better normalization for `${API}`-style templates and dynamic URL segments.

### Validation
- Frontend build passed (`npm run build`).
- Contract mismatch audit improved:
  - from 52 potential mismatches -> 31 -> 30 -> 29 after fixes.

## Next steps (in progress)
1. Contract audit artifact generation (frontend calls vs backend routes) with robust extraction script.
2. Endpoint-by-endpoint verification for the user-reported flows with evidence matrix.
3. Implement direct fixes on any confirmed mismatch found in phase-2 audit.

## Acceptance checklist (open)
- [ ] Perfil opens correctly for all roles
- [ ] Feed loads without blocking error
- [ ] Upload photo/video works end-to-end
- [ ] Product/detail links always resolve
- [ ] Certificate links always resolve
- [ ] Store profile links always resolve
- [ ] Country/language/currency change persists and does not break cart
- [ ] Super-admin sections open and load data
- [ ] No blocking console/runtime errors in critical paths

## Phase 2: Contract Closure (2026-04-10)

### Objective
- Close P1-04 frontend/backend API contract drift and enforce non-regression at CI gate level.

### Work completed
- Frontend endpoint realignment and dead/unsupported call cleanup in:
  - `frontend/src/components/chat/GroupChatPanel.tsx`
  - `frontend/src/hooks/api/useNotifications.js`
  - `frontend/src/pages/customer/CustomerProfile.tsx`
  - `frontend/src/pages/CertificatePage.tsx`
  - `frontend/src/pages/importer/ImporterCertificatesPage.tsx`
  - `frontend/src/pages/SavedPage.tsx`
  - `frontend/src/pages/super-admin/GDPRPage.tsx`
- Analyzer hardening in `scripts/analyze-api-contract.mjs`:
  - preserve leading route params when parsing backend decorators (avoids false positives for `/{id}/...` routes),
  - keep mounted prefix expansion from `backend/main.py`.

### Validation evidence
- `npm run lint:frontend` => pass
- `npm run build:frontend` => pass
- `npm run verify` => pass
- `npm run verify:full` => pass (`251 passed, 1103 skipped, 2 xfailed`)
- `npm run api:contract:report` => `potential_mismatches=0`
- `npm run api:contract:check` => pass with enforced baseline

### Gate status
- Updated `architecture-reports/api-contract-baseline.json`:
  - `max_allowed_mismatches: 0`
- Current contract state:
  - `frontend_calls=751`
  - `backend_routes=850`
  - `potential_mismatches=0`

## Phase 2.1: Saved Collections UX Hardening (2026-04-10)

### Objective
- Avoid dead-end UX in Saved page while collections API is not available in active backend runtime.

### Work completed
- Updated `frontend/src/pages/SavedPage.tsx`:
  - disabled the `collections` tab,
  - added "Pronto" badge,
  - added info toast on attempted access.

### Validation evidence
- `npm --prefix frontend run lint -- --max-warnings=0` => pass
- `npm --prefix frontend run build` => pass
- `npm run verify:full` => pass (`251 passed, 1103 skipped, 2 xfailed`)
- `npm run api:contract:check` => pass (`api_contract_current=0`, `api_contract_allowed=0`)

## Phase 2.2: GDPR UX Hardening (2026-04-10)

### Objective
- Prevent repeated failed user actions in GDPR page when GDPR backend flow is unavailable.

### Work completed
- Updated `frontend/src/pages/super-admin/GDPRPage.tsx`:
  - detect GDPR backend availability from fallback stats request,
  - show unavailable message in empty state when flow is absent,
  - disable RGPD export tool and show "Pronto" badge,
  - guard export action with informative toast when temporarily unavailable.

### Validation evidence
- `npm --prefix frontend run lint -- --max-warnings=0` => pass
- `npm --prefix frontend run build` => pass
- `npm run api:contract:check` => pass (`api_contract_current=0`, `api_contract_allowed=0`)

## Phase 2.3: Market Coverage UX Hardening (2026-04-10)

### Objective
- Avoid user-facing failed actions when country configuration backend is unavailable.

### Work completed
- Updated `frontend/src/pages/super-admin/MarketCoverage.tsx`:
  - added backend availability state for `/superadmin/countries`,
  - disabled admin assignment and weekly goal actions when unavailable,
  - added informative toasts and "Pronto" badge in unavailable state.

### Validation evidence
- `npm --prefix frontend run lint -- --max-warnings=0` => pass
- `npm --prefix frontend run build` => pass
- `npm run api:contract:check` => pass (`api_contract_current=0`, `api_contract_allowed=0`)

## Phase 2.4: Plans Config UX Hardening (2026-04-10)

### Objective
- Prevent failed edit/save actions in plans configuration when plans backend endpoint is unavailable.

### Work completed
- Updated `frontend/src/pages/super-admin/PlansConfigPage.tsx`:
  - added availability detection for `/superadmin/plans`,
  - disabled tier/plan inputs and save action when endpoint is unavailable,
  - added "Pronto" badge and informative unavailable messaging,
  - blocked confirm modal path with info toast when unavailable.

### Validation evidence
- `npm --prefix frontend run lint -- --max-warnings=0` => pass
- `npm --prefix frontend run build` => pass
- `npm run api:contract:check` => pass (`api_contract_current=0`, `api_contract_allowed=0`)
