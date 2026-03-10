# Phase 4 Report

## 1. Resumen de cambios realizados

Se refactorizo `frontend/src/pages/UserProfilePage.js` para extraer la logica remota a `features/user` y dejar la pagina centrada en UI, tabs y estado efimero.

Cambios principales:

- se eliminaron `axios` y `API` directos de `UserProfilePage.js`
- se crearon queries oficiales en `frontend/src/features/user/queries`
- se crearon hooks de dominio en `frontend/src/features/user/hooks`
- follow, avatar, posts, badges y productos del vendedor ahora pasan por hooks
- `CreatePostModal` dejo de hacer HTTP directo y usa la mutacion oficial de `features/user`
- `AuthContext` no se modifico

## 2. Archivos modificados

- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/features/user/queries/useUserQueries.js`

## 3. Archivos creados

- `frontend/src/features/user/queries/index.js`
- `frontend/src/features/user/queries/useUserQueries.js`
- `frontend/src/features/user/hooks/index.js`
- `frontend/src/features/user/hooks/useUserProfile.js`
- `frontend/src/features/user/hooks/useUserPosts.js`
- `frontend/src/features/user/hooks/useUserProducts.js`
- `frontend/src/features/user/hooks/useUserBadges.js`
- `frontend/src/features/user/hooks/useUserFollow.js`
- `frontend/src/features/user/hooks/useUserAvatar.js`
- `architecture-reports/phase-4-report.md`

## 4. Archivos eliminados

- ninguno

## 5. Problemas detectados

- `UserProfilePage` sigue siendo un componente grande; esta fase solo movio data fetching y mutaciones, no dividio la presentacion en subcomponentes
- las tabs `liked` y `saved` siguen sin contenido renderizado en la UI actual; la refactorizacion mantuvo ese comportamiento existente
- no fue posible validar en navegador los flujos de follow, upload de avatar y creacion de post desde este entorno CLI

## 6. Decisiones tecnicas tomadas

- se definio `userKeys` propios bajo `features/user/queries` para evitar colision con `cartKeys`
- no se toco `AuthContext`; el contexto solo sigue aportando identidad del usuario actual y permisos de UI
- no se reutilizo `useOrders` porque `UserProfilePage` actual no consume pedidos en su UI
- la mutacion de follow actualiza la cache del perfil para mantener el contador y el estado `is_following` sincronizados sin recargar la pagina
- la mutacion de crear post inserta el nuevo post en la cache y actualiza `posts_count` del perfil
- la query de perfil convierte 404 en un fallback controlado para mantener el comportamiento previo de la pantalla

## 7. Posibles regresiones

- la mutacion de follow depende de la forma actual de `profile.is_following` y `followers_count`; si el backend cambia esos nombres, el optimismo de cache se rompe
- el chequeo automatico de badges invalida la query despues del mount del perfil propio; conviene verificar en navegador que no introduce flashes perceptibles
- la subida de avatar actualiza solo la cache de perfil de esta pagina; si otras vistas dependen de otra fuente de verdad del avatar, pueden quedar desincronizadas temporalmente

## 8. Cambios en arquitectura

- se introdujo la feature `frontend/src/features/user`
- `UserProfilePage` ya no contiene llamadas HTTP directas
- las responsabilidades quedaron separadas asi:
  - `features/user/queries`: acceso remoto y query keys
  - `features/user/hooks`: composicion por dominio
  - `UserProfilePage`: tabs, modales, navegacion y render

## 9. Tests manuales sugeridos

- abrir perfil propio y confirmar carga de perfil, posts y badges
- abrir perfil ajeno y confirmar follow / unfollow
- abrir perfil de seller y confirmar carga de productos en tab `PRODUCTOS`
- subir avatar desde perfil propio
- crear una publicacion desde `CreatePostModal`
- abrir `PostViewer` desde una miniatura y navegar entre posts
- comprobar que el badge grid compacto y completo sigue renderizando
- validar que el boton de mensaje sigue disparando `open-chat-with-user`

## 10. Lista de archivos pendientes para siguiente fase

- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/components/InternalChat.js`
- `frontend/src/context/AuthContext.js`

## Verificacion

- `npm --prefix frontend run build` paso correctamente el 2026-03-11
