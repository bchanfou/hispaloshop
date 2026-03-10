# AUDITORÍA TÉCNICA DE COMPONENTES REACT — HISPALOSHOP

Fecha: 2026-03-10

## 0. Alcance y método

Esta auditoría se ha realizado sobre `frontend/src` con foco exclusivo en arquitectura React:

- organización de componentes
- tamaño y responsabilidad
- separación entre UI, lógica y datos
- gestión de estado
- hooks y efectos
- rendimiento
- routing SPA
- estructura de carpetas
- adopción del design system
- acoplamientos entre módulos

Base revisada:

- `frontend/src/App.js`
- `frontend/src/components/**/*`
- `frontend/src/pages/**/*`
- `frontend/src/hooks/**/*`
- `frontend/src/services/**/*`
- `frontend/src/utils/**/*`
- `frontend/src/config/**/*`
- `frontend/src/context/**/*`
- `frontend/src/providers/**/*`

Componentes con atención especial:

- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/components/InternalChat.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/pages/UserProfilePage.js`

Limitación metodológica:

- Es una auditoría de código, no de sesión ejecutada en navegador ni de profiling con React DevTools.
- Aun así, la evidencia actual es suficiente para definir un plan de refactor serio y ejecutable.

## 1. Diagnóstico general

El frontend React de Hispaloshop ya no tiene un problema de funcionalidad puntual. Tiene un problema de forma arquitectónica.

La app ha crecido por agregación:

- nuevas rutas encima de rutas antiguas
- nuevos hooks sin retirar los anteriores
- nuevas capas de datos sin conectar el runtime principal
- nuevas pantallas por rol sin consolidarlas dentro de una arquitectura común

El resultado es una SPA que funciona como suma de subsistemas:

1. app pública y marketing
2. shell social/feed
3. marketplace
4. dashboards por rol
5. chat interno
6. IA/asistente
7. admin y super-admin

Eso no es un problema en sí mismo. El problema es que esos subsistemas comparten demasiada poca infraestructura y demasiadas responsabilidades viven directamente en componentes de página.

### Veredicto

Estado actual: funcional, pero arquitectónicamente irregular y costoso de mantener.

Si no se refactoriza, cada nueva feature aumentará:

- complejidad accidental
- deuda de routing
- duplicación de lógica
- dificultad de onboarding para nuevos desarrolladores
- riesgo de regresiones

## 2. Métricas objetivas del frontend React

Inventario base:

- `frontend/src` contiene `299` archivos `.js`, `77` `.jsx`, `23` `.ts` y `4` `.tsx`.
- La mezcla JS/TS existe, pero el tipado sigue siendo claramente minoritario.
- `frontend/src/App.js` contiene `151` rutas y `68` nodos `<Navigate>`.
- `81` archivos de `components` y `pages` usan `axios` directamente.
- `frontend/src/components/ui` ya contiene `48` primitives/base components.
- Aun así, hay al menos `130` bloques `style={{...}}` y `359` colores hex hardcodeados en `components` y `pages`.
- Existen `94` usos de `text-[8px]`, `text-[9px]` o `text-[10px]` en `components` y `pages`.

Lectura técnica:

- sí existe una base de design system
- sí existe un intento de capa moderna de datos
- no existe una consolidación real del runtime

## 3. Hallazgos críticos P0

## 3.1 El router es un monolito y además arrastra deuda histórica

Evidencia:

- `frontend/src/App.js` tiene `472` líneas y centraliza prácticamente toda la navegación de la SPA.
- `frontend/src/App.js:245` y `frontend/src/App.js:459` mapean tanto `/user/:userId` como `/profile/:userId` al mismo `UserProfilePage`.
- `frontend/src/App.js:469` redirige `/checkout` a `/cart`, mientras `frontend/src/pages/checkout/CheckoutPage.js` sigue existiendo con `494` líneas de lógica propia.
- `frontend/src/App.js:302-304` y `frontend/src/App.js:465-468` redirigen varias rutas de importador a rutas de productor.
- `frontend/src/App.js:400` y `frontend/src/App.js:418` mantienen shells paralelos para `/dashboard` y `/customer`.

Diagnóstico:

- el router compensa inconsistencias estructurales con aliases y redirecciones
- la arquitectura real no está modelada en rutas limpias, sino en compatibilidad acumulada
- `App.js` es hoy un cuello de botella para cualquier cambio transversal

Conclusión:

Hay que pasar de un registro único gigante a route modules por dominio y reducir el árbol a un máximo de `40` rutas reales.

## 3.2 La capa de datos está duplicada y la migración a React Query quedó a medias

Evidencia:

- `frontend/src/App.js:32-33` importa `QueryProvider` y `RealtimeProvider`.
- `frontend/src/App.js:486-502` monta `HelmetProvider`, `BrowserRouter`, `AuthProvider`, `LocaleProvider`, `CartProvider` y `ChatProvider`, pero no monta `QueryProvider` ni `RealtimeProvider`.
- `frontend/src/providers/QueryProvider.jsx` y `frontend/src/providers/RealtimeProvider.jsx` existen y contienen infraestructura válida.
- Solo unos pocos archivos B2B importan `hooks/api/*`:
  - `frontend/src/pages/b2b/B2BQuotesHistoryPage.js`
  - `frontend/src/pages/b2b/B2BMarketplacePage.js`
  - `frontend/src/pages/b2b/B2BChatPage.js`
  - `frontend/src/components/b2b/QuoteBuilder.js`
- Conviven múltiples clientes/capas:
  - `frontend/src/utils/api.js`
  - `frontend/src/config/api.js`
  - `frontend/src/lib/api.js`
  - `frontend/src/lib/api.ts`

Duplicación especialmente grave:

- carrito:
  - `frontend/src/context/CartContext.js`
  - `frontend/src/hooks/useCart.js`
  - `frontend/src/hooks/useCart.ts`
  - `frontend/src/hooks/api/useCart.js`
- catálogo:
  - `frontend/src/hooks/useProducts.js`
  - `frontend/src/hooks/useProducts.ts`
  - `frontend/src/hooks/api/useProducts.js`
- feed:
  - `frontend/src/hooks/useFeed.js`
  - `frontend/src/hooks/useFeed.ts`
  - `frontend/src/hooks/api/useFeed.js`
- HI/chat:
  - `frontend/src/components/chat/useHIChat.js`
  - `frontend/src/hooks/api/useHIChat.js`

Diagnóstico:

- el proyecto tiene varias arquitecturas compitiendo entre sí
- la app principal sigue acoplada a `axios` + context + efectos locales
- React Query no es todavía la fuente de verdad

Conclusión:

Antes de extraer más UI, hace falta elegir una sola estrategia de datos y retirar explícitamente las capas viejas.

## 3.3 Los layouts de dashboard actúan como "god shells"

Evidencia:

- `frontend/src/components/dashboard/CustomerLayoutResponsive.js:92-104` hace `navigate(...)` durante render para redirigir por rol.
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js:18` depende de `ProducerPlanProvider`.
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js:12-13` importa `SellerAIAssistant` e `InternalChat`.
- `frontend/src/components/dashboard/InfluencerLayoutResponsive.js:11-12` importa `InfluencerAIAssistant` e `InternalChat`.
- `frontend/src/components/dashboard/InfluencerLayoutResponsive.js:153` y `:161` usan `document.getElementById(...).scrollIntoView(...)`.
- `frontend/src/components/dashboard/InfluencerLayoutResponsive.js:180-183` monta directamente IA y chat dentro del layout.

Diagnóstico:

- los layouts no solo resuelven estructura visual
- también contienen autorización, navegación, widgets pesados, providers, side effects y features completas

Impacto:

- reutilizar o mover un panel es caro
- la meta de llevar paneles profesionales dentro de `Perfil` choca con shells por rol demasiado rígidos

Conclusión:

Los layouts deben quedarse en:

- shell
- navegación local
- guardado de permisos
- slots

Y no en:

- lógica de dominio
- fetches
- asistentes
- chat embebido
- redirecciones imperativas dentro del render

## 3.4 Los componentes críticos mezclan demasiadas responsabilidades

Tabla de complejidad observada:

| Archivo | Líneas | useState | useEffect | useCallback | axios | Diagnóstico |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `frontend/src/components/InternalChat.js` | 1302 | 21 | 5 | 2 | 11 | god component |
| `frontend/src/pages/producer/ProducerProducts.js` | 1218 | 16 | 1 | 0 | 6 | CRUD + editor + stock + uploads |
| `frontend/src/pages/ProductDetailPage.js` | 1044 | 22 | 5 | 0 | 14 | detalle + reviews + follow + variants + store |
| `frontend/src/pages/influencer/InfluencerDashboard.js` | 834 | 14 | 2 | 0 | 9 | payouts + analytics + codes + verificación |
| `frontend/src/pages/CartPage.js` | 778 | 13 | 2 | 0 | 9 | carrito + checkout + direcciones + descuentos |
| `frontend/src/pages/UserProfilePage.js` | 718 | 17 | 3 | 0 | 10 | perfil + follow + posts + productos + guardados |
| `frontend/src/App.js` | 472 | 2 | 2 | 0 | 0 | router monolítico |

Diagnóstico:

- el problema no es solo de tamaño
- el problema es mezcla de responsabilidades, orquestación de datos, UI y navegación en el mismo archivo

Regla de severidad usada:

- `300+` líneas: sospechoso
- `500+` líneas: problemático
- `800+` líneas: monolito crítico

## 3.5 El codebase evita props drilling sacrificando modularidad

Diagnóstico:

- no hay un patrón dominante de props drilling extremo
- pero eso no es una fortaleza
- en muchos casos la razón es que las responsabilidades nunca se extrajeron del archivo original

Ejemplos:

- `frontend/src/pages/producer/ProducerProducts.js:20` define `ImageUploader` dentro del mismo archivo
- `frontend/src/pages/producer/ProducerProducts.js:181` define `StockEditor` dentro del mismo archivo
- `frontend/src/pages/influencer/InfluencerDashboard.js:18` define `WithdrawalCard` dentro del mismo archivo
- `frontend/src/components/InternalChat.js` define utilidades, tabs, cards de directorio, notificaciones y lógica de conversación en un mismo módulo

Conclusión:

Antes de hablar de props drilling, hace falta extraer contratos de componente claros. Hoy el mayor problema es que los contratos casi no existen.

## 4. Lista de componentes críticos mayores de 500 líneas

## 4.1 Monolitos críticos mayores de 800 líneas

- `frontend/src/components/InternalChat.js` (`1302`)
- `frontend/src/pages/producer/ProducerProducts.js` (`1218`)
- `frontend/src/pages/ProductDetailPage.js` (`1044`)
- `frontend/src/pages/super-admin/InsightsDashboard.js` (`1053`)
- `frontend/src/components/AIAssistant.js` (`860`)
- `frontend/src/components/SocialFeed.js` (`841`)
- `frontend/src/pages/customer/CustomerProfile.js` (`840`)
- `frontend/src/pages/influencer/InfluencerDashboard.js` (`834`)
- `frontend/src/components/importer/OnboardingModal.jsx` (`829`)

## 4.2 Problemáticos entre 500 y 800 líneas

- `frontend/src/pages/CartPage.js` (`778`)
- `frontend/src/pages/UserProfilePage.js` (`718`)
- `frontend/src/pages/StorePage.js` (`685`)
- `frontend/src/pages/producer/ProducerCertificates.js` (`666`)
- `frontend/src/pages/RegisterPage.js` (`611`)
- `frontend/src/pages/StoresListPage.js` (`609`)
- `frontend/src/pages/landings/QueEsPage.js` (`555`)
- `frontend/src/pages/admin/AdminCertificates.js` (`560`)
- `frontend/src/pages/admin/AdminDiscountCodes.js` (`538`)
- `frontend/src/pages/influencer/Landing.jsx` (`506`)

Lectura técnica:

- no todos requieren el mismo nivel de prioridad
- sí comparten el mismo síntoma: demasiada superficie por archivo y límites de responsabilidad difusos

## 5. Componentes duplicados o redundantes

Duplicación de pantallas:

- `frontend/src/pages/profile/ProfilePage.js`
- `frontend/src/pages/customer/ProfilePage.js`
- `frontend/src/pages/UserProfilePage.js`

Duplicación de onboarding:

- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/onboarding/OnboardingPage.jsx`

Duplicación de éxito de checkout:

- `frontend/src/pages/checkout/CheckoutSuccess.js`
- `frontend/src/pages/CheckoutSuccessPage.js`

Duplicación de dashboard influencer:

- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/dashboard/influencer/InfluencerDashboard.js`
- `frontend/src/components/affiliate/InfluencerDashboard.js`

Duplicación de cards/componentes de producto o feed:

- `frontend/src/components/ProductCard.js`
- `frontend/src/components/profile/ProductCard.js`
- `frontend/src/components/feed/PostCard.js`
- `frontend/src/components/social/PostCard.js`

Duplicación de progreso por tier:

- `frontend/src/components/TierProgress.js`
- `frontend/src/components/dashboard/shared/TierProgress.js`

Diagnóstico:

- el problema no es solo repetición visual
- también hay riesgo de divergencia funcional, de copy y de fixes que no llegan a todas las variantes

## 6. Auditoría de componentes clave

## 6.1 `ProductDetailPage.js`

Problemas:

- concentra fetch de producto, reviews, certificados, variantes, seguimiento de tienda y wishlist
- usa `14` llamadas `axios` directas
- acumula `22` estados locales
- los efectos disparan múltiples llamadas dependientes entre sí
- la lógica de negocio convive con JSX y toasts

Refactor objetivo:

- `features/products/product-detail/ProductDetailPageContainer`
- `useProductDetail(productId)`
- `useProductReviews(productId)`
- `useProductPurchaseOptions(productId)`
- `useStoreFollow(storeId)`
- `ProductHero`
- `ProductMeta`
- `ProductPurchasePanel`
- `ProductReviewsSection`
- `RelatedProductsSection`

## 6.2 `CartPage.js`

Problemas:

- mezcla carrito, verificación, direcciones, descuentos y arranque de checkout
- existe además un `CheckoutPage` paralelo que ya no es ruta primaria
- `window.location.href` se usa para saltar a Stripe
- la responsabilidad "checkout" está repartida entre dos páginas

Refactor objetivo:

- separar `features/cart` de `features/checkout`
- dejar `CartPage` solo para revisión de carrito
- mover pago y dirección a `CheckoutPage` real o eliminar `CheckoutPage` si se decide flujo unificado
- crear:
  - `useCartSummary`
  - `useCartDiscounts`
  - `useCustomerAddresses`
  - `useCheckoutFlow`

## 6.3 `InternalChat.js`

Problemas:

- directorio, lista de conversaciones, hilo, perfiles, uploads, notificaciones y WebSocket viven juntos
- incluye utilidades no visuales como `requestNotificationPermission`, `showNotification`, `formatTime`, `formatFollowers`
- construye URL WebSocket dentro del componente
- contiene demasiados cambios de modo: embed, fullscreen, user type, directory mode

Refactor objetivo:

- `features/chat/components/ChatLayout`
- `features/chat/components/ConversationList`
- `features/chat/components/ThreadView`
- `features/chat/components/MessageComposer`
- `features/chat/components/DirectoryPanel`
- `features/chat/components/ProfilePreviewPanel`
- `features/chat/hooks/useConversations`
- `features/chat/hooks/useMessages`
- `features/chat/hooks/useChatDirectory`
- `features/chat/hooks/useChatNotifications`
- `features/chat/hooks/useChatAttachments`
- `features/chat/services/chatApi`
- `features/chat/services/chatSocket`

## 6.4 `InfluencerDashboard.js`

Problemas:

- payouts, Stripe Connect, códigos, analytics, banners y asistente conviven en un único archivo
- define subcomponentes internos como `WithdrawalCard`
- sigue haciendo fetch directo con `axios`
- existe más de una implementación del dashboard influencer

Refactor objetivo:

- moverlo a `features/influencer/dashboard`
- consolidar una sola variante de dashboard
- crear:
  - `useInfluencerDashboard`
  - `useInfluencerPayouts`
  - `useInfluencerCodes`
  - `useStripeConnectStatus`

## 6.5 `ProducerProducts.js`

Problemas:

- es a la vez lista, editor, uploader, gestor de stock y orquestador de categorías
- define `ImageUploader` y `StockEditor` dentro del mismo archivo
- mezcla formularios complejos con rendering de catálogo

Refactor objetivo:

- `features/producer/products/pages/ProducerProductsPage`
- `features/producer/products/components/ProductTable`
- `features/producer/products/components/ProductEditorSheet`
- `features/producer/products/components/ImageUploader`
- `features/producer/products/components/StockEditor`
- `features/producer/products/hooks/useProducerProducts`
- `features/producer/products/hooks/useProducerProductForm`

## 6.6 `UserProfilePage.js`

Problemas:

- mezcla perfil público, follow/unfollow, upload de avatar, posts, productos y guardados
- convive con otras implementaciones de perfil
- `10` llamadas `axios` directas y `17` estados locales

Refactor objetivo:

- separar `features/profile/public-profile`
- separar `features/profile/private-profile`
- construir tabs internas coherentes con la meta de llevar paneles profesionales a `Perfil`
- crear:
  - `useUserProfile`
  - `useProfileFeed`
  - `useProfileProducts`
  - `useProfileFollowState`

## 7. Hooks que deberían existir o consolidarse

Hooks de dominio recomendados:

- `useProductDetail`
- `useProductReviews`
- `useProductPurchaseOptions`
- `useRelatedProducts`
- `useFeedTimeline`
- `useFeedPreferences`
- `useDiscoverResults`
- `useCartSummary`
- `useCheckoutFlow`
- `useCustomerAddresses`
- `useInternalChatConversations`
- `useInternalChatMessages`
- `useInternalChatDirectory`
- `useChatNotifications`
- `useInfluencerDashboard`
- `useProducerProducts`
- `useProducerProductForm`
- `useUserProfile`
- `useRoleRedirect`

Hooks existentes que deben consolidarse:

- `useCart`
- `useFeed`
- `useProducts`
- `useHIChat`

Regla:

- un dominio, una familia de hooks, una sola fuente de verdad

## 8. Problemas de estado y efectos

## 8.1 Demasiado estado local en páginas contenedor

Síntomas:

- `ProductDetailPage.js` con `22` `useState`
- `InternalChat.js` con `21`
- `UserProfilePage.js` con `17`
- `ProducerProducts.js` con `16`
- `InfluencerDashboard.js` con `14`

Diagnóstico:

- buena parte de ese estado no es UI efímera
- es estado remoto, de workflow o derivado

Dirección:

- remoto a query cache
- workflow a reducer o custom hook de feature
- derivado a selectores o funciones puras

## 8.2 `useEffect` como pegamento entre capas

Problemas detectados:

- fetches encadenados por efectos
- sincronización manual entre local state y backend
- persistencia en `localStorage` repartida entre componentes

Ejemplo claro:

- `frontend/src/components/feed/FeedContainer.js:13` lee `feedTab` desde `localStorage`
- `frontend/src/components/feed/FeedContainer.js:20` vuelve a persistir `feedTab`
- `frontend/src/components/feed/TabToggle.js:10` también persiste `feedTab`

Diagnóstico:

- la misma responsabilidad vive en dos componentes distintos

## 8.3 Side effects imperativos fuera del lugar correcto

Evidencia:

- `frontend/src/components/dashboard/CustomerLayoutResponsive.js:92-104` navega durante render
- `frontend/src/pages/ProductDetailPage.js:347` usa `window.location.href = '/cart'`
- `frontend/src/pages/CartPage.js:288` usa `window.location.href` para checkout
- `frontend/src/components/ProductCard.js:47`, `:83` y `:100` hace redirecciones imperativas
- `frontend/src/components/BottomNavBar.js:281` usa `window.location.reload()`

Diagnóstico:

- se fuerzan recargas o redirecciones donde debería haber navegación declarativa y mutaciones controladas

## 9. Problemas de rendimiento

## 9.1 No hay una estrategia consistente de rendering eficiente

Hallazgos:

- en los componentes críticos auditados, `useMemo` es `0` en todos los casos
- `useCallback` apenas aparece en `InternalChat.js`

Lectura correcta:

- no significa que haya que llenar el proyecto de memoización
- significa que primero hay que reducir responsabilidad, extraer estado y dejar de recalcular tantas ramas dentro del mismo archivo

## 9.2 Keys inestables en listas

Evidencia:

- `frontend/src/pages/ProductDetailPage.js:443`, `:535`, `:633`, `:1018`
- `frontend/src/pages/DiscoverPage.js:235`, `:264`, `:320`, `:387`
- `frontend/src/pages/producer/ProducerOrders.js:425`
- `frontend/src/components/ProductCard.js:253`
- `frontend/src/components/social/PostCard.js:112`

Diagnóstico:

- hay varios `key={index}`, `key={idx}` o `key={i}`
- algunos están en skeletons y son aceptables
- otros están en contenido real y aumentan riesgo de rerenders incorrectos o bugs de identidad

## 9.3 Recargas completas y navegación dura en una SPA

Evidencia:

- `window.location.reload()` aparece en vistas de feed, error boundaries y navegación inferior
- `window.location.href` aparece en login social, checkout, plan managers, productos y dashboards

Diagnóstico:

- parte del estado se resetea por fuerza bruta
- esto oculta problemas de sincronización en vez de resolverlos

## 10. Problemas de arquitectura

## 10.1 La app no está organizada por features

Estructura actual:

- `components/`
- `pages/`
- `hooks/`
- `context/`
- `providers/`
- `utils/`

Problema:

- esta separación por tipo técnico funcionó en una fase pequeña
- ya no escala para dominios como feed, cart, chat, profile o producer

Síntomas:

- duplicación de componentes con el mismo nombre en carpetas distintas
- lógica de dominio dispersa entre `pages`, `components`, `hooks` y `context`
- difícil localizar "la implementación oficial" de cada feature

## 10.2 La meta de producto y la arquitectura React no están alineadas

Meta producto:

- navegación principal: `Home / Explorar / Crear / Chats / Perfil`
- paneles profesionales dentro de `Perfil`

Arquitectura React actual:

- dashboards separados por rol
- layouts específicos por rol
- rutas alias que saltan entre shells
- features globales como IA y chat embebidas en layouts de dashboard

Conclusión:

La refactorización de componentes debe acompañar la consolidación de navegación. No son dos trabajos separados.

## 10.3 El código de marketing, app y backoffice comparte demasiado poco

Evidencia indirecta:

- landings con mucha personalización visual
- admin y super-admin con sus propias decisiones UI
- app principal con otro lenguaje estructural

Diagnóstico:

- faltan boundaries explícitos entre:
  - marketing site
  - product app
  - backoffice

Recomendación:

- tres shells claros
- primitives compartidas
- features separadas
- routing por área

## 11. Design system y deuda de presentación

Lo positivo:

- `frontend/src/components/ui` ya incluye `button`, `input`, `card`, `dialog`, `drawer`, `tabs`, `badge`, `avatar`, `toast`, `sheet`, `table` y más

Lo problemático:

- su adopción es inconsistente
- hay `130` bloques inline `style={{...}}`
- hay `359` colores hex hardcodeados
- hay `94` tokens de texto diminuto `text-[8px|9px|10px]`

Diagnóstico:

- el problema no es ausencia de base UI
- el problema es bypass del design system

Dirección:

- prohibir nuevos hex inline en features
- mover decisiones visuales a tokens y variants
- dejar que las pantallas compongan primitives en vez de redefinirlas

## 12. Mapa de dependencias y acoplamientos

Acoplamientos fuertes detectados:

- `App.js` depende de demasiados dominios a la vez
- `InternalChat.js` depende de auth, notificaciones, WebSocket, directory data, uploads y UI
- `ProductDetailPage.js` depende de cart, wishlist, reviews, follow state, store y navegación
- `UserProfilePage.js` depende de social graph, posts, productos, avatar y store data
- `ProducerLayoutResponsive.js` e `InfluencerLayoutResponsive.js` dependen de asistentes, chat y lógica de panel

God components claros:

- `frontend/src/components/InternalChat.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/UserProfilePage.js`

## 13. Propuesta de estructura moderna por features

Objetivo:

- reducir ambigüedad
- localizar cada dominio en un solo sitio
- facilitar ownership técnico

Estructura recomendada:

```text
frontend/src/
  app/
    router/
    providers/
    guards/
    layouts/
  design-system/
    components/
    tokens/
    patterns/
  features/
    auth/
    feed/
    discover/
    products/
    cart/
    checkout/
    chat/
    profile/
    producer/
    importer/
    influencer/
    recipes/
    admin/
  services/
    api/
    realtime/
  hooks/
    shared/
  lib/
  utils/
  config/
```

Reglas de organización:

- cada feature contiene `components`, `hooks`, `services`, `queries`, `types` y `pages` si aplica
- `pages` deja de ser un contenedor global gigantesco
- `components/ui` migra a `design-system/components`
- `context` se reduce a auth, locale y casos realmente globales
- estado remoto migra a query hooks por feature

## 14. Propuesta de routing objetivo

Meta:

- máximo `40` rutas reales
- aliases solo temporales y con fecha de eliminación

Estructura objetivo:

- `app shell`
  - `/`
  - `/explorar`
  - `/crear`
  - `/chats`
  - `/perfil`
- `perfil`
  - `/perfil/pedidos`
  - `/perfil/guardados`
  - `/perfil/tienda`
  - `/perfil/catalogo`
  - `/perfil/colaboraciones`
  - `/perfil/comisiones`
  - `/perfil/pagos`
  - `/perfil/ajustes`
- `commerce`
  - `/productos/:slug`
  - `/tiendas/:slug`
  - `/carrito`
  - `/checkout`
- `auth/onboarding`
  - `/login`
  - `/registro`
  - `/onboarding`
- `marketing`
  - `/que-es`
  - `/productores`
  - `/importadores`
  - `/influencers`
- `backoffice`
  - `/admin/*`
  - `/super-admin/*`

Regla clave:

- el rol cambia contenido y permisos dentro de `Perfil`
- no la arquitectura principal

## 15. Plan de refactorización por fases

## Fase 1 — Consolidar datos y cortar deuda más cara

Objetivo:

- elegir la arquitectura oficial de data fetching
- montar `QueryProvider`
- decidir qué se elimina entre context/SWR/React Query duplicados

Acciones:

- conectar `QueryProvider` y, si aplica, `RealtimeProvider`
- declarar deprecados:
  - `hooks/useCart.js`
  - `hooks/useCart.ts`
  - `context/CartContext.js`
  - variantes antiguas de `useFeed`, `useProducts`, `useHIChat`
- crear un cliente API único
- dejar `axios` encapsulado en servicios, no en páginas

## Fase 2 — Romper monolitos críticos

Prioridad exacta:

1. `InternalChat.js`
2. `ProductDetailPage.js`
3. `ProducerProducts.js`
4. `CartPage.js`
5. `UserProfilePage.js`
6. `InfluencerDashboard.js`

Regla:

- primero extraer hooks y servicios
- después dividir presentación
- después sustituir rutas o shells

## Fase 3 — Reorganizar por features

Acciones:

- mover dominios a `features/*`
- convertir `pages/*` en entrypoints finos
- desacoplar layouts de features pesadas
- consolidar `Perfil` como contenedor de roles

## Fase 4 — Consolidar design system

Acciones:

- migrar primitives a `design-system`
- reducir hex hardcodeados
- eliminar estilos inline salvo casos justificados
- unificar variantes de `Button`, `Card`, `Badge`, `Tabs`, `Sheet`, `Dialog`

## Fase 5 — Rendimiento y limpieza final

Acciones:

- estabilizar keys de listas
- eliminar `window.location.reload()`
- reemplazar `window.location.href` por navegación declarativa o helpers de redirección de pago
- revisar estados derivados
- cerrar aliases de routing y pantallas duplicadas

## 16. Orden de ejecución recomendado para otro modelo

Si otro agente va a ejecutar la refactorización, este es el orden menos ambiguo:

1. Inventariar y eliminar duplicados de capa de datos.
2. Montar `QueryProvider` y normalizar servicios HTTP.
3. Extraer hooks de `ProductDetailPage`, `CartPage`, `InternalChat`, `ProducerProducts`, `UserProfilePage` e `InfluencerDashboard`.
4. Reubicar cada dominio bajo `features/*`.
5. Reducir `App.js` a route modules.
6. Unificar `Perfil` como shell de paneles profesionales.
7. Consolidar design system y limpiar estilos hardcodeados.
8. Eliminar pantallas, hooks y rutas obsoletas.

## 17. Conclusión

El frontend React de Hispaloshop no necesita una ronda de "cleanup". Necesita una consolidación arquitectónica.

Los problemas principales no son estéticos. Son estructurales:

- demasiadas rutas reales y demasiados aliases
- demasiadas capas de datos coexistiendo
- demasiada lógica de negocio dentro de páginas
- demasiados componentes que ya son sistemas enteros
- demasiado poco ownership por feature

La buena noticia es que la base funcional existe y la dirección correcta está clara:

- una sola arquitectura de datos
- una sola organización por dominio
- una sola navegación principal
- paneles profesionales dentro de `Perfil`
- componentes más pequeños, hooks más explícitos y servicios más previsibles

Si el refactor se hace en ese orden, Hispaloshop puede pasar de SPA acumulativa a frontend React modular, escalable y legible para cualquier desarrollador nuevo en el proyecto.
