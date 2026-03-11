# Sweep 04

1. Sweep number
   Sweep 04 - Feed / Posts / Reels / Stories
2. Areas reviewed
   Feed-adjacent overlays and content-linking patterns around product/post surfaces, including stories and discovery cards.
3. Bugs found
   Story product tags and discovery-related product cards still assumed `product.id`, which breaks navigation when feed/discovery APIs return `product_id`.
4. Bugs fixed
   Normalized product routing in `HispaloStories`, `RelatedProducts`, and the featured products block in `DiscoverPage`.
5. Files modified
   `frontend/src/components/HispaloStories.js`
   `frontend/src/components/discovery/RelatedProducts.js`
   `frontend/src/pages/DiscoverPage.js`
6. Potential regressions introduced
   Low risk.
7. Remaining issues still visible
   Story/reel gesture behavior and overlay stacking still need interactive browser QA.
8. Build status
   Covered by final consolidated build: success.
