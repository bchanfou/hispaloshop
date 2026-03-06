# Auditoría de Datos Mock (demoData.js)

Fecha: 2026-03-07

## Resumen Ejecutivo

Se encontraron **8 archivos** que importan y usan datos mock de `demoData.js`.

## Archivos con Imports de demoData

| # | Archivo | Línea | Variables Importadas | Endpoint API Equivalente |
|---|---------|-------|---------------------|--------------------------|
| 1 | SocialFeed.js | 18 | demoPosts | GET /api/feed |
| 2 | DiscoverPage.js | 9 | demoPosts, demoReels, demoUsers | GET /api/feed, GET /api/reels, GET /api/users |
| 3 | HomePage.js | 10 | demoProducts, demoPosts | GET /api/products, GET /api/feed |
| 4 | ProductorLandingPage.js | 26 | demoStores, demoUsers | GET /api/stores, GET /api/users |
| 5 | ProductsPage.js | 19 | demoProducts | GET /api/products |
| 6 | StorePage.js | 20 | demoStores, demoProducts, demoReviews, demoCertificates | GET /api/store/{slug}, GET /api/products, GET /api/reviews, GET /api/certificates |
| 7 | StoresListPage.js | 12 | demoStores | GET /api/stores |
| 8 | UserProfilePage.js | 20 | demoUsers, demoPosts, demoProducts | GET /api/users/{id}, GET /api/users/{id}/posts, GET /api/products |

## Usos Detallados por Variable

### demoProducts
- **HomePage.js**: Línea 10, 315, 317 - Productos destacados en homepage
- **ProductsPage.js**: Línea 19, 99, 403 - Listado de productos
- **StorePage.js**: Línea 20, 178, 184, 222, 228 - Productos de una tienda
- **UserProfilePage.js**: Línea 20, 152, 156 - Productos del vendedor

### demoPosts
- **SocialFeed.js**: Línea 18, 824, 834 - Feed social
- **DiscoverPage.js**: Línea 9, 139, 140, 157, 167, 168 - Descubrir contenido
- **HomePage.js**: Línea 10, 208, 230 - Posts en homepage
- **UserProfilePage.js**: Línea 20, 180, 198 - Posts del usuario

### demoUsers
- **DiscoverPage.js**: Línea 9, 93, 157 - Perfiles a descubrir
- **ProductorLandingPage.js**: Línea 26, 67 - Productores destacados
- **UserProfilePage.js**: Línea 20, 193 - Perfil de usuario

### demoStores
- **ProductorLandingPage.js**: Línea 26, 68 - Tiendas de productores
- **StorePage.js**: Línea 20, 134, 139 - Información de tienda
- **StoresListPage.js**: Línea 12, 209, 213, 219, 220 - Listado de tiendas

### demoReels
- **DiscoverPage.js**: Línea 9, 140, 168 - Reels a descubrir

### demoReviews
- **StorePage.js**: Línea 20, 199, 207 - Reviews de tienda

### demoCertificates
- **StorePage.js**: Línea 20, 224, 228, 230 - Certificados de productos

## Plan de Migración

### Prioridad P0 (Bloqueador MVP)
1. ✅ ProductsPage.js - useProducts hook
2. ✅ HomePage.js - useProducts para destacados
3. ✅ StorePage.js - useStore, useStoreProducts hooks
4. ✅ UserProfilePage.js - useUser, useUserPosts hooks

### Prioridad P1 (Importante)
5. SocialFeed.js - useFeed hook
6. DiscoverPage.js - useDiscover hook
7. StoresListPage.js - useStores hook
8. ProductorLandingPage.js - useStores hook

### Prioridad P2 (Post-MVP si es necesario)
- Reviews en StorePage
- Certificates en StorePage
- Reels en DiscoverPage

## Archivos a Crear

### Hooks
- `src/hooks/useApi.ts` - Cliente API base
- `src/hooks/useProducts.ts` - Productos
- `src/hooks/useAuth.ts` - Autenticación
- `src/hooks/useCart.ts` - Carrito
- `src/hooks/useOrders.ts` - Órdenes
- `src/hooks/useStores.ts` - Tiendas
- `src/hooks/useUser.ts` - Usuarios
- `src/hooks/useFeed.ts` - Feed social

### Componentes de Estado
- `src/components/LoadingState.tsx` - Skeletons
- `src/components/ErrorState.tsx` - Errores
- `src/components/EmptyState.tsx` - Estados vacíos

## Configuración

### Feature Flag
Archivo: `src/lib/config.ts`
```typescript
export const USE_MOCK_DATA = false; // Nunca true en producción
```

### Variables de Entorno
Archivo: `.env.production`
```
REACT_APP_USE_MOCK=false
REACT_APP_API_URL=https://api.hispaloshop.com/api
```

## Verificación Final

Comando para verificar que no quedan mocks:
```bash
grep -r "from.*demoData" src/ --include="*.tsx" --include="*.ts"
# Debe retornar vacío
```
