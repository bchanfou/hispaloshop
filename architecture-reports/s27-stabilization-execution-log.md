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
