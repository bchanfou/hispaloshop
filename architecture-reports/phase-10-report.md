# Phase 10 Report

## 1. Resumen de cambios realizados

Se migro otra capa relevante de consumidores legacy de `lib/api*` hacia la arquitectura oficial basada en `services/api/client.js` y features por dominio.

Cambios principales:

- `ForYouFeed` y `FollowingFeed` dejaron de depender de `lib/api` y pasaron a `features/feed/queries`
- tras auditoria, ambos feeds eliminaron el shadow state `allPosts` y ahora derivan su lista con `useMemo` desde `useInfiniteQuery`
- tras auditoria, ambos feeds delegan el optimistic update de likes exclusivamente a `useLikePost`
- `OnboardingPage` dejo de hacer POST directo con `lib/api` y ahora usa una mutacion oficial de onboarding
- los dashboards legacy de consumer, producer e importer dejaron de consumir `lib/api`
- el dashboard legacy de influencer dejo de depender de `lib/api` y reutiliza la capa ya creada en `features/influencer`
- `SuperAdminLayoutResponsive` alineo su logout con `useDashboardLogout`, incluyendo invalidacion de sesion en backend y recarga completa
- se creo una capa minima de queries para dashboards legacy y onboarding sin cambiar la estructura visual de esas pantallas

## 2. Archivos modificados

- `frontend/src/components/feed/ForYouFeed.js`
- `frontend/src/components/feed/FollowingFeed.js`
- `frontend/src/pages/onboarding/OnboardingPage.jsx`
- `frontend/src/pages/dashboard/consumer/ConsumerDashboard.js`
- `frontend/src/pages/dashboard/producer/ProducerDashboard.js`
- `frontend/src/pages/dashboard/importer/ImporterDashboard.js`
- `frontend/src/pages/dashboard/influencer/InfluencerDashboard.js`
- `frontend/src/components/dashboard/SuperAdminLayoutResponsive.js`
- `frontend/src/features/dashboard/queries/index.js`

## 3. Archivos creados

- `frontend/src/features/dashboard/queries/useLegacyDashboardQueries.js`
- `frontend/src/features/onboarding/queries/useOnboardingQueries.js`
- `frontend/src/features/onboarding/queries/index.js`
- `architecture-reports/phase-10-report.md`

## 4. Archivos eliminados

- ninguno

## 5. Problemas detectados

- `frontend/src/lib/api.js` y `frontend/src/lib/api.ts` siguen vivos por consumidores relevantes fuera de esta fase, especialmente `RealtimeProvider.jsx`, `DiscoverPage.js`, `PostDetailPage.js`, varios hooks TS y otros entrypoints legacy
- en `ForYouFeed` y `FollowingFeed` se mantiene estado local acumulado para preservar el comportamiento visual actual, aunque la fuente remota ya es React Query
- los dashboards legacy siguen siendo componentes grandes; esta fase solo movio acceso a datos, no fragmento UI
- `useLikePost` fue diseñado originalmente sobre `feedKeys.forYou`; en `FollowingFeed` la UI sigue teniendo update local inmediata, pero conviene revisar luego una invalidacion mas amplia del cache de feed
- no fue posible validar manualmente en navegador likes, onboarding y dashboards desde este entorno CLI

## 6. Decisiones tecnicas tomadas

- se creo `useLegacyDashboardQueries` en `features/dashboard/queries` para evitar acoplar mas paginas a `lib/api`
- se creo una mutacion minima `useSaveOnboardingMutation` en `features/onboarding/queries` sin tocar `AuthContext`
- `ForYouFeed` y `FollowingFeed` pasaron de hooks SWR legacy a `useInfiniteQuery` desde `features/feed/queries`
- el dashboard legacy de influencer no duplico endpoints de comisiones/enlaces; reutiliza `useInfluencerProfile` ya consolidado en fases anteriores
- `SuperAdminLayoutResponsive` se alineo con el mismo flujo de logout que customer, producer, influencer y admin para reducir inconsistencia de runtime

## 7. Posibles regresiones

- `ForYouFeed` y `FollowingFeed` ahora dependen de `fetchNextPage()` en vez de cursor local; conviene validar scroll infinito en navegador
- los likes del feed combinan mutacion de React Query con ajuste local inmediato del componente; conviene validar que no aparezcan dobles incrementos visuales
- `OnboardingPage` ahora usa una mutacion React Query; conviene validar guardado al terminar el paso 3 y actualizacion del usuario local
- los dashboards legacy ahora resuelven datos con queries agregadas; conviene validar estados vacios y degradacion cuando endpoints opcionales fallan
- `SuperAdminLayoutResponsive` cambia el destino de logout de `/` a `/login` y fuerza `window.location.reload()`; es intencional, pero debe validarse en navegador

## 8. Cambios en arquitectura

- se amplio `frontend/src/features/dashboard/queries` con una capa dedicada a dashboards legacy
- se introdujo `frontend/src/features/onboarding/queries`
- la arquitectura resultante queda mas consistente:
  - `features/feed/queries`: feed principal
  - `features/influencer/*`: dashboard influencer oficial y reutilizado
  - `features/dashboard/queries`: stats de shells y dashboards legacy
  - `features/onboarding/queries`: guardado de onboarding
- estas superficies ya no dependen de `lib/api*` en el runtime principal auditado de esta fase

## 9. Tests manuales sugeridos

- abrir feed For You y validar scroll infinito
- abrir feed Following y validar empty state, scroll infinito y like
- hacer like/unlike en ambos feeds y comprobar contador visual
- completar onboarding y confirmar persistencia de intereses, ubicacion y follows
- abrir dashboard consumer y validar pedidos recientes / wishlist
- abrir dashboard producer y validar alertas de stock bajo
- abrir dashboard importer y validar KPIs / pedidos recientes
- abrir dashboard influencer legacy y validar metricas
- cerrar sesion desde super-admin y confirmar invalidacion completa de sesion

## 10. Lista de archivos pendientes para siguiente fase

- `frontend/src/lib/api.js`
- `frontend/src/lib/api.ts`
- `frontend/src/providers/RealtimeProvider.jsx`
- `frontend/src/pages/DiscoverPage.js`
- `frontend/src/pages/PostDetailPage.js`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/useAffiliateLinks.ts`
- `frontend/src/hooks/useAffiliateRequests.ts`
- `frontend/src/hooks/useCart.ts`
- `frontend/src/hooks/useChat.ts`
- `frontend/src/hooks/useCommissions.ts`
- `frontend/src/hooks/useFeed.ts`
- `frontend/src/hooks/useFollows.ts`
- `frontend/src/hooks/useInfluencerDashboard.ts`
- `frontend/src/hooks/useInteractions.ts`
- `frontend/src/hooks/useMatching.ts`
- `frontend/src/hooks/useOrders.ts`
- `frontend/src/hooks/usePost.ts`
- `frontend/src/hooks/useProducerOrders.ts`
- `frontend/src/hooks/useProducts.ts`
- `frontend/src/hooks/useProfile.ts`
- `frontend/src/hooks/useRecommendations.ts`
- `frontend/src/hooks/useStores.ts`
- `frontend/src/hooks/useUser.ts`

## Verificacion

- se confirmo que los archivos objetivo de esta fase ya no importan `lib/api*`
- se confirmo que `ForYouFeed.js` y `FollowingFeed.js` ya no usan `allPosts` como `useState` ni llaman `setAllPosts(...)` en `handleLike`
- `npm --prefix frontend run build` paso correctamente el 2026-03-11
