# Sweep 02

1. Sweep number
   Sweep 02 - Buttons & Links
2. Areas reviewed
   `frontend/src/components/cart/AddToCartButton.js`, `frontend/src/pages/customer/WishlistPage.js`, `frontend/src/components/chat/ProductCardMessage.jsx`, cart CTA wiring, product links and quick-add variants.
3. Bugs found
   The reusable add-to-cart button only used `product.id`, so products returned as `product_id` silently failed cart detection and add actions. Wishlist cards also linked to a non-existent `/product/:id` route, and chat product cards depended on `product.id` plus full-page anchor navigation.
4. Bugs fixed
   Added resilient product ID resolution and normalized cart-item comparison. Fixed wishlist links to `/products/:id` and converted chat product cards to router-aware links with `id` / `product_id` fallback.
5. Files modified
   `frontend/src/components/cart/AddToCartButton.js`
   `frontend/src/pages/customer/WishlistPage.js`
   `frontend/src/components/chat/ProductCardMessage.jsx`
6. Potential regressions introduced
   Low risk: components passing malformed products without any ID now no-op instead of calling cart mutations with `undefined`.
7. Remaining issues still visible
   Other CTA surfaces still need full interactive manual QA in browser.
8. Build status
   Covered by final consolidated build: success.
