# S27 API Contract Report

- Generated: 2026-03-12T13:15:45.185Z
- Frontend calls scanned: 398
- Backend routes scanned: 625
- Potential mismatches: 13

## First 50 Potential Mismatches

| Method | Endpoint | File |
|---|---|---|
| DELETE | /hi/conversations/{param} | frontend/src/features/chat/queries/useHIChatQueries.js |
| GET | /hi/insights | frontend/src/features/chat/queries/useHIChatQueries.js |
| POST | /hi/feedback | frontend/src/features/chat/queries/useHIChatQueries.js |
| GET | /categories/{param} | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/{param}/related | frontend/src/features/products/queries/useProductQueries.js |
| GET | /search/suggestions | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/b2b | frontend/src/features/products/queries/useProductQueries.js |
| GET | /products/b2b/{param}/moq | frontend/src/features/products/queries/useProductQueries.js |
| PUT | /auth/me | frontend/src/hooks/api/useAuth.js |
| POST | /auth/oauth/{param} | frontend/src/hooks/api/useAuth.js |
| POST | /auth/verify-document | frontend/src/hooks/api/useAuth.js |
| GET? | /{param}/auth/refresh | frontend/src/lib/api.js |
| GET? | /{param}{param} | frontend/src/lib/api.ts |
