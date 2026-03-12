# S27 API Contract Report

- Generated: 2026-03-12T12:40:46.779Z
- Frontend calls scanned: 398
- Backend routes scanned: 614
- Potential mismatches: 31

## First 50 Potential Mismatches

| Method | Endpoint | File |
|---|---|---|
| PUT | /cart/items/{param} | frontend/src/features/cart/queries/useCartQueries.js |
| POST | /cart/sync | frontend/src/features/cart/queries/useCartQueries.js |
| GET | /checkout/{param} | frontend/src/features/cart/queries/useCartQueries.js |
| POST | /checkout/{param}/confirm | frontend/src/features/cart/queries/useCartQueries.js |
| GET | /orders/{param}/tracking | frontend/src/features/cart/queries/useCartQueries.js |
| POST | /orders/{param}/cancel | frontend/src/features/cart/queries/useCartQueries.js |
| POST | /orders/{param}/reorder | frontend/src/features/cart/queries/useCartQueries.js |
| GET | /hi/conversations | frontend/src/features/chat/queries/useHIChatQueries.js |
| GET | /hi/conversations/{param} | frontend/src/features/chat/queries/useHIChatQueries.js |
| POST | /hi/chat | frontend/src/features/chat/queries/useHIChatQueries.js |
| DELETE | /hi/conversations/{param} | frontend/src/features/chat/queries/useHIChatQueries.js |
| GET | /hi/suggestions | frontend/src/features/chat/queries/useHIChatQueries.js |
| GET | /hi/insights | frontend/src/features/chat/queries/useHIChatQueries.js |
| POST | /hi/feedback | frontend/src/features/chat/queries/useHIChatQueries.js |
| POST | /hi/conversations | frontend/src/features/chat/queries/useHIChatQueries.js |
| POST | /posts/{param}/${liked  | frontend/src/features/feed/queries/useFeedQueries.js |
| POST | /posts/{param}/${saved  | frontend/src/features/feed/queries/useFeedQueries.js |
| POST | /users/{param}/${following  | frontend/src/features/feed/queries/useFeedQueries.js |
| POST | /user/onboarding | frontend/src/features/onboarding/queries/useOnboardingQueries.js |
| GET | /categories/{param} | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/{param}/related | frontend/src/features/products/queries/useProductQueries.js |
| GET | /search/suggestions | frontend/src/features/products/queries/useProductQueries.js |
| POST | /products/{param}/reviews | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/b2b | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/b2b/{param}/moq | frontend/src/features/products/queries/useProductQueries.js |
| GET | /users/{param}/posts{param} | frontend/src/features/user/queries/useUserQueries.js |
| PUT | /auth/me | frontend/src/hooks/api/useAuth.js |
| POST | /auth/oauth/{param} | frontend/src/hooks/api/useAuth.js |
| POST | /auth/verify-document | frontend/src/hooks/api/useAuth.js |
| GET? | /{param}/auth/refresh | frontend/src/lib/api.js |
| GET? | /{param}{param} | frontend/src/lib/api.ts |
