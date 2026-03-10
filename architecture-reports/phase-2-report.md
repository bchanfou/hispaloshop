# Phase 2 Report

## 1. Summary of changes made

Phase 2 started with `frontend/src/pages/ProductDetailPage.js`.

- Extracted product-domain hooks under `frontend/src/features/products/hooks`.
- Extended `frontend/src/features/products/queries/useProductQueries.js` so the page can fetch product detail, certificate, review eligibility, store follow state, and wishlist state through the React Query layer.
- Refactored `ProductDetailPage.js` to remove page-level `axios` usage and delegate data fetching/mutations to hooks.
- Kept the JSX structure intact. No visual component split was introduced in this phase.
- Review follow-up fixes:
  - renamed the `useStoreFollow` argument contract from `storeId` to `storeSlug`
  - corrected review form default/reset rating from `8` to `5`
  - documented `useRelatedProducts` as intentionally pending because the current page JSX does not render a related-products section

## 2. Modified files

- `frontend/src/hooks/api/useAuth.js`
- `frontend/src/lib/queryClient.js`
- `frontend/src/features/products/queries/useProductQueries.js`
- `frontend/src/pages/ProductDetailPage.js`
- `architecture-reports/phase-1-report.md`

## 3. Created files

- `frontend/src/features/products/hooks/index.js`
- `frontend/src/features/products/hooks/useProductDetail.js`
- `frontend/src/features/products/hooks/useProductReviews.js`
- `frontend/src/features/products/hooks/useRelatedProducts.js`
- `frontend/src/features/products/hooks/useProductPurchaseOptions.js`
- `frontend/src/features/products/hooks/useStoreFollow.js`

## 4. Deleted files

- None.

## 5. Problems detected

- `ProductDetailPage.js` is still large because only data logic was extracted in this phase; JSX remains monolithic by design.
- The page still performs imperative navigation with `window.location.href` for login/cart transitions. This was kept to avoid visible behavior changes in phase 2.
- There is no browser automation or interactive browser session available in this environment, so runtime interaction testing remains limited to build-time and code-path validation.
- `useRelatedProducts` is not wired in `ProductDetailPage.js` because the current JSX has no related-products block to consume it. This is now an explicit backlog item, not accidental dead code.

## 6. Technical decisions taken

- Kept `addToCart` on `CartContext` to preserve existing cart behavior while removing fetch logic from the page.
- Used the new hooks layer as an orchestration boundary:
  - `useProductDetail(productId)`
  - `useProductReviews(productId)`
  - `useRelatedProducts(productId)`
  - `useProductPurchaseOptions(productId)`
  - `useStoreFollow(storeSlug)`
- Kept review form state (`showReviewForm`, `reviewRating`, `reviewComment`) in the page because it is UI-local state, not remote data state.
- Aligned `useProductPurchaseOptions` with the localized product query so product detail and purchase-option state share the same React Query cache key.

## 7. Hooks created

- `frontend/src/features/products/hooks/useProductDetail.js`
- `frontend/src/features/products/hooks/useProductReviews.js`
- `frontend/src/features/products/hooks/useRelatedProducts.js`
- `frontend/src/features/products/hooks/useProductPurchaseOptions.js`
- `frontend/src/features/products/hooks/useStoreFollow.js`

`useRelatedProducts.js` remains available for Phase 3. It is not currently consumed because `ProductDetailPage.js` does not render a related-products section in its present JSX.

## 8. Axios calls removed from `ProductDetailPage.js`

- Product detail fetch
- Certificate fetch
- Reviews fetch
- Review eligibility fetch
- Wishlist status fetch
- Wishlist toggle mutation
- Store lookup fetch
- Store follow status fetch
- Store follow/unfollow mutation
- Product variants/flavor fetch
- Review submit mutation

`frontend/src/pages/ProductDetailPage.js` no longer imports `axios` or `API`.

## 9. Remaining logic still in page

- Quantity UI state binding
- Add-to-cart flow via `CartContext`
- Buy-now flow and redirect to `/cart`
- Toast copy and user-facing success/error messaging
- Review form presentation and local field state
- Full JSX layout/rendering
- Related-products UI, if reintroduced later

## 10. Possible regressions

- Store follower counts now depend on query invalidation/refetch instead of local optimistic state mutation inside the page.
- Product detail is now driven by shared hooks and query keys, so any mismatch in backend payload shape will surface through the hooks instead of inline page code.
- The page still assumes current endpoints return the same shapes used before the refactor.
- Wishlist and follow-store still do not use optimistic updates. That remains backlog for the next UI-focused phase.

## 11. Verification

- `npm --prefix frontend run build` completed successfully after the refactor.
- Code-path validation confirmed:
  - `frontend/src/pages/ProductDetailPage.js` no longer imports `axios`
  - `frontend/src/pages/ProductDetailPage.js` no longer imports `API`
- Browser/manual validation not executable in this CLI-only environment:
  - product loads
  - variants load
  - reviews load
  - follow store works
  - add-to-cart still works through `CartContext`
  - related products render, if that section is added back to the page

## 12. Pending file list for next phase

- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/components/InternalChat.js`
