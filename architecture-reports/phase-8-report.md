# Phase 8 Report

## 1. Resumen de cambios realizados

Se realizo una limpieza de infraestructura sobre los layouts de dashboard para retirar HTTP directo y consolidar estadisticas de shell y logout sobre el cliente API oficial.

Cambios principales:

- se creo una capa compartida `features/dashboard/queries` para estadisticas de shell y logout
- `CustomerLayoutResponsive`, `ProducerLayoutResponsive`, `InfluencerLayoutResponsive` y `AdminLayoutResponsive` dejaron de importar `axios` y `API`
- las estadisticas de badges de customer, producer y admin ahora usan React Query
- el logout de layouts ahora pasa por `services/api/client.js`
- `CustomerLayoutResponsive` dejo de navegar durante render y paso a redireccion declarativa con `Navigate`

## 2. Archivos modificados

- `frontend/src/components/dashboard/CustomerLayoutResponsive.js`
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js`
- `frontend/src/components/dashboard/InfluencerLayoutResponsive.js`
- `frontend/src/components/dashboard/AdminLayoutResponsive.js`

## 3. Archivos creados

- `frontend/src/features/dashboard/queries/useDashboardShellQueries.js`
- `frontend/src/features/dashboard/queries/index.js`
- `architecture-reports/phase-8-report.md`

## 4. Archivos eliminados

- ninguno

## 5. Problemas detectados

- `frontend/src/lib/api.js` y `frontend/src/lib/api.ts` siguen teniendo multiples consumidores fuera de estos layouts; no se eliminaron en esta fase para no romper rutas legacy, B2B ni hooks TS antiguos
- `frontend/src/hooks/api/*` sigue siendo consumido por superficies B2B; tampoco se retiro todavia
- los layouts siguen mezclando responsabilidades de shell con widgets pesados como `InternalChat` o asistentes IA; esta fase solo corto el HTTP directo
- el logout sigue forzando `window.location.reload()` tras navegar a login; no se cambio aqui para evitar alterar el comportamiento visible antes de la fase de limpieza final
- no fue posible validar manualmente en navegador badges, logout y redirects desde este entorno CLI

## 6. Decisiones tecnicas tomadas

- se definio `dashboardShellKeys` separado de `cartKeys`, `userKeys`, `producerKeys`, `influencerKeys` e `internalChatKeys`
- se centralizaron solo las operaciones compartidas y estables de layout: stats y logout
- no se toco `AuthContext`; el usuario autenticado sigue viniendo del contexto existente
- se mantuvo `window.location.reload()` en logout para preservar el reset completo de estado legacy
- se sustituyo la redireccion imperativa en render de `CustomerLayoutResponsive` por `Navigate` para eliminar side effects durante render

## 7. Posibles regresiones

- los badges de dashboard ahora dependen del cache de React Query; conviene validar que refrescan correctamente tras acciones administrativas o de productor
- el logout usa el cliente API oficial con refresh/token handling; conviene validar que no deja residuos de sesion en superficies legacy
- la redireccion declarativa de customer por rol debe probarse con cuentas `producer`, `influencer`, `admin` y `super_admin`

## 8. Cambios en arquitectura

- se introdujo una capa transversal `frontend/src/features/dashboard/queries` para infraestructura de shells
- los layouts revisados ya no contienen llamadas HTTP directas
- la arquitectura de layout queda mas alineada con el objetivo de mover datos a features y dejar el shell centrado en navegacion, permisos y composicion

## 9. Tests manuales sugeridos

- abrir dashboard customer y confirmar badge de pedidos pendientes
- abrir dashboard producer/importer y confirmar badge de productos pendientes
- abrir dashboard admin y confirmar badges de productores, productos y certificados
- cerrar sesion desde customer, producer, influencer y admin
- validar redireccion de customer cuando inicia sesion un usuario de otro rol
- comprobar que chat y asistentes siguen montando igual dentro de los layouts existentes

## 10. Lista de archivos pendientes para siguiente fase

- `frontend/src/lib/api.js`
- `frontend/src/lib/api.ts`
- `frontend/src/hooks/api/useB2BChat.js`
- `frontend/src/hooks/api/useImporter.js`
- `frontend/src/pages/b2b/B2BChatPage.js`
- `frontend/src/pages/b2b/B2BMarketplacePage.js`
- `frontend/src/pages/b2b/B2BQuotesHistoryPage.js`
- `frontend/src/components/b2b/QuoteBuilder.js`
- `frontend/src/App.js`

## Verificacion

- se confirmo que no existen multiples instancias de `new QueryClient(...)` en `frontend/src`; la unica instancia compartida sigue en `frontend/src/lib/queryClient.js`
- `npm --prefix frontend run build` paso correctamente el 2026-03-11
