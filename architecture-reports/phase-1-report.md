# Phase 1 Report

## 1. Summary of changes made

Phase 1 introduced the first official React Query data layer without removing the legacy runtime.

- Mounted `QueryProvider` in the app root.
- Mounted `RealtimeProvider` inside the React Query tree so it can invalidate query caches safely.
- Created a canonical HTTP client at `frontend/src/services/api/client.js`.
- Migrated `frontend/src/hooks/api/useAuth.js` to the canonical HTTP client while keeping websocket connect/disconnect on the legacy realtime singleton.
- Reconfigured the shared `QueryClient` defaults in `frontend/src/lib/queryClient.js` with explicit global `staleTime`, `gcTime`, `retry`, and `refetchOnWindowFocus`.
- Created official query modules by domain under:
  - `frontend/src/features/cart/queries`
  - `frontend/src/features/products/queries`
  - `frontend/src/features/feed/queries`
  - `frontend/src/features/chat/queries`
- Converted `frontend/src/hooks/api/*` query modules into compatibility shims that re-export the new feature query modules.
- Marked the legacy SWR/local hooks as deprecated in place.
- Left `CartContext` active and documented it as legacy runtime state to avoid breaking the current app.

## 2. Modified files

- `frontend/src/App.js`
- `frontend/src/context/CartContext.js`
- `frontend/src/hooks/api/useAuth.js`
- `frontend/src/hooks/api/useCart.js`
- `frontend/src/hooks/api/useFeed.js`
- `frontend/src/hooks/api/useHIChat.js`
- `frontend/src/hooks/api/useProducts.js`
- `frontend/src/hooks/useCart.js`
- `frontend/src/hooks/useCart.ts`
- `frontend/src/hooks/useFeed.js`
- `frontend/src/hooks/useFeed.ts`
- `frontend/src/hooks/useProducts.js`
- `frontend/src/hooks/useProducts.ts`
- `frontend/src/lib/queryClient.js`

## 3. Created files

- `frontend/src/services/api/client.js`
- `frontend/src/features/cart/queries/index.js`
- `frontend/src/features/cart/queries/useCartQueries.js`
- `frontend/src/features/products/queries/index.js`
- `frontend/src/features/products/queries/useProductQueries.js`
- `frontend/src/features/feed/queries/index.js`
- `frontend/src/features/feed/queries/useFeedQueries.js`
- `frontend/src/features/chat/queries/index.js`
- `frontend/src/features/chat/queries/useHIChatQueries.js`

## 4. Deleted files

- None.

## 5. Problems detected

- The main runtime still depends on legacy stateful layers:
  - `frontend/src/context/CartContext.js`
  - `frontend/src/context/chat/ChatProvider.js`
  - many pages/components still call `axios` directly
- Multiple API layers still coexist:
  - `frontend/src/services/api/client.js`
  - `frontend/src/lib/api.js`
  - `frontend/src/lib/api.ts`
  - `frontend/src/utils/api.js`
  - `frontend/src/config/api.js`
- `RealtimeProvider` now mounts correctly, but realtime transport is still tied to `frontend/src/lib/api.js` and not to the new service layer.
- The new feature query modules are ready, but most of the app is not consuming them yet. The current UI is still largely legacy-first.
- Legacy screen verification is still limited in this environment because there is no interactive browser session or e2e harness in the repo.

## 6. Technical decisions taken

- Kept the migration incremental by preserving current runtime providers and route behavior.
- Made `frontend/src/services/api/client.js` the canonical phase-1 HTTP client for new work.
- Repointed `frontend/src/hooks/api/useAuth.js` to `services/api/client.js` so auth and query hooks now share token storage and refresh behavior.
- Added axios request/response handling for:
  - `withCredentials`
  - bearer token injection when available
  - request IDs
  - one retry path after token refresh on `401`
- Used `frontend/src/hooks/api/*` as a backward-compatible facade instead of deleting those modules.
- Marked `frontend/src/hooks/useCart*`, `frontend/src/hooks/useProducts*`, and `frontend/src/hooks/useFeed*` as deprecated rather than removing them.
- Left `CartContext` active because the app shell and cart UI still depend on it.
- Mounted `RealtimeProvider` under `QueryProvider` so `useQueryClient()` has a valid provider and cache invalidation works.

## 7. Possible regressions

- Any screen importing `frontend/src/hooks/api/useCart.js`, `useProducts.js`, `useFeed.js`, or `useHIChat.js` now executes the new feature query modules instead of the previous in-file implementations.
- If backend auth refresh behavior differs from the assumptions in `frontend/src/services/api/client.js`, new query consumers may surface auth failures differently from `frontend/src/lib/api.js`.
- `RealtimeProvider` is now mounted globally, so websocket-driven cache invalidation will start happening whenever existing auth flows connect the shared websocket client.
- Manual runtime validation of legacy cart/product/chat screens is still pending a browser session.

## 8. Architecture changes

- App bootstrap now contains an actual React Query root.
- The app now has one shared `QueryClient` instance with explicit defaults:
  - `staleTime: 30s`
  - `gcTime: 10m`
  - `retry: 1`
  - `refetchOnWindowFocus: false`
- The official phase-1 data path is now:
  - `services/api/client.js`
  - `features/*/queries`
- The legacy compatibility path is now:
  - `hooks/api/*` -> re-export shims to `features/*/queries`
- Old SWR/local hooks are explicitly marked as deprecated.
- The app is now prepared for phase 2 extraction work because new domain hooks can move out of monolithic pages without introducing a third fetching pattern.

## 9. Suggested manual tests / verification status

- Login and logout flow, including page refresh after login.
- Cart basics:
  - add item
  - update quantity
  - remove item
  - apply/remove coupon
- B2B pages that already consume React Query hooks:
  - `frontend/src/pages/b2b/B2BMarketplacePage.js`
  - `frontend/src/pages/b2b/B2BQuotesHistoryPage.js`
  - `frontend/src/pages/b2b/B2BChatPage.js`
- Any HI/chat UI that imports `hooks/api/useHIChat.js`.
- Verify no provider crash occurs on first app load for anonymous users.
- Verify websocket/realtime notifications still do not throw runtime errors after authentication.
- Executed in this environment:
  - `npm --prefix frontend run build`
  - code-path verification that `hooks/api/*` resolve to `features/*/queries`
  - code-path verification that `ProductDetailPage.js` no longer imports `axios` or `API`
- Not executable in this environment:
  - browser-driven manual interaction for cart/product/chat flows

## 10. Pending file list for next phase

- `frontend/src/components/InternalChat.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/context/chat/ChatProvider.js`
- `frontend/src/lib/api.js`
- `frontend/src/lib/api.ts`

## Verification

- Production build completed successfully with `npm --prefix frontend run build`.
- No files were removed in this phase.
