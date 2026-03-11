# Phase 21 Report — Core Consumer Browsing
**Date:** 2026-03-11
**Status after this phase:** READY FOR REVIEW

---

## 1. Summary of Changes Made

Phase 21 focused on the three highest-traffic consumer browsing surfaces:

- `ProductsPage.js`
- `ProductDetailPage.js`
- `StorePage.js`

Changes implemented:

- rebuilt `ProductsPage` as a cleaner stone-based catalog shell on top of the existing `useCatalog()` TanStack Query hook
- rebuilt `StorePage` from the older local `axios` + `useEffect` flow into a query-driven store surface using TanStack Query and the shared store follow hook
- normalized `ProductCard` so catalog and store listings now share the same black/white CTA hierarchy, stone badges, real add-to-cart behavior, and corrected Spanish copy
- cleaned `ProductDetailPage` in place so the product view now matches the same stone design system more closely, with black primary actions, corrected review copy, and removal of remaining legacy token leakage from the visible purchase surface
- removed the remaining consumer-page mojibake from the touched files and verified that no `Ã` / `Â` artifacts remain in these four files

---

## 2. Files Modified

- `frontend/src/pages/ProductsPage.js`
- `frontend/src/pages/StorePage.js`
- `frontend/src/components/ProductCard.js`
- `frontend/src/pages/ProductDetailPage.js`

---

## 3. Files Created

- `architecture-reports/phase-21-report.md`

---

## 4. Files Deleted

- none

---

## 5. Problems Detected

- `ProductsPage` had already been partially moved to `useCatalog`, but still carried encoding issues and a broken `Label` reference inside the mobile filter panel
- `StorePage` still depended on local `axios` calls, multiple `useEffect` chains, legacy token classes, and several `console.error` paths
- `ProductCard` still used old product tokens (`primary`, `ds-primary`, `text-text-*`) and would have visually undermined both the catalog and store refresh even if the pages themselves were cleaned
- `ProductDetailPage` already had the correct TanStack Query hook layer, but the visible UI still leaked older green/amber accents and mixed copy quality

---

## 6. Technical Decisions Taken

- kept `ProductsPage` on the existing `useCatalog()` hook rather than adding another product data path
- rebuilt `StorePage` directly with `useQuery()` calls against the existing endpoints instead of preserving the older imperative `axios` flow
- preserved the existing product detail data architecture (`useProductDetail`, `useProductPurchaseOptions`, `useProductReviews`, `useStoreFollow`) and treated the page as a UI cleanup rather than a data rewrite
- normalized the shared `ProductCard` first so both products and store grids benefit from the same DS cleanup and action behavior

---

## 7. Possible Regressions

- `StorePage` is now structurally simpler than the previous version, so any very niche store-only fields that were previously rendered but rarely populated should be browser-checked against a real producer and a real importer store
- `ProductDetailPage` still contains a large amount of behavior in one file, so manual QA should specifically cover variants, packs, wishlist, review submission, and follow-store actions together
- `ProductsPage` filter behavior is still intentionally lightweight and query-param driven; browser QA should confirm the mobile filter drawer still closes and applies state as expected

---

## 8. Architecture Changes

- catalog and store browsing are now more consistent around TanStack Query
- `StorePage` no longer uses page-local fetch effects as its primary data source
- shared product listing UI no longer depends on the older mixed token system

No route changes were introduced.

---

## 9. Suggested Manual Tests

- `ProductsPage`
  - verify search updates results and URL params together
  - verify category changes still filter the loaded catalog correctly
  - verify desktop and mobile filters remain readable and close correctly
  - verify load-more pagination still appends products

- `ProductCard`
  - verify add-to-cart works from both catalog and store grids
  - verify buy-now routes to cart correctly
  - verify logged-out add/buy actions show auth feedback instead of failing silently
  - verify out-of-stock and low-stock badges still render correctly

- `StorePage`
  - verify store hero, follow action, and contact links render for a real store
  - verify products / certificates / reviews tabs switch correctly
  - verify product sorting still updates the store product grid
  - verify importer stores and producer stores both render sensible role labels

- `ProductDetailPage`
  - verify variant selection updates price and ingredient/nutrition blocks
  - verify pack selection updates total price
  - verify buy-now and add-to-cart still pass selected variant/pack IDs correctly
  - verify wishlist and follow-store actions still behave correctly when logged in and logged out
  - verify review submission still works when `canReview` is true

---

## 10. Pending Files for Next Phase

- likely next consumer surfaces:
  - `frontend/src/pages/RecipesPage.js`
  - `frontend/src/pages/RecipeDetailPage.js`
- likely follow-up after recipes:
  - chat UI surfaces
  - HI AI assistant surfaces

---

## 11. DESIGN / UX NOTES

- visually improved:
  - catalog, store, and product listing cards now share the same calmer black/white purchase language
  - the store page no longer mixes multiple color systems and social-style gradients
  - product detail purchase areas now read more clearly with stone surfaces and black CTAs

- still inconsistent:
  - `ProductDetailPage` is cleaner but still dense; a future pass could simplify some section spacing and reduce the amount of stacked information on mobile

- Claude should specifically review:
  - whether the simplified `StorePage` keeps enough producer-story richness for the store surface, or whether a later narrative enhancement should add back one or two trust sections more intentionally
  - whether `ProductDetailPage` should get a dedicated spacing/interaction pass later once recipes and chat are complete

---

## 12. STORY / COPY NOTES

- rewritten copy:
  - corrected multiple product/store UI strings to cleaner Spanish
  - removed English review submission strings from `ProductDetailPage`
  - normalized catalog/store CTA and badge labels

- first-person narrative introduced:
  - none; this was a utility browsing phase, not a founder-storytelling phase

- tone notes:
  - copy was kept direct and functional, with emphasis on trust and clarity rather than storytelling

- remaining awkward or AI-sounding areas:
  - none identified in the four touched files after cleanup

---

## Verification

- code review confirmed `ProductsPage`, `StorePage`, `ProductCard`, and `ProductDetailPage` no longer contain legacy DS token leakage in the form of `text-text-*`, `border-border-*`, `bg-ds-primary`, `bg-background`, or mixed accent utility classes
- code review confirmed no `Ã` / `Â` mojibake artifacts remain in the four touched files
- production build succeeded with:
  - `npm --prefix frontend run build` using `BUILD_PATH=build-phase21`
- no browser QA was possible from this CLI environment
