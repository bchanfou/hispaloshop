# Plan Maestro de Auditoria y Correccion

## Objetivo

Dejar Hispaloshop funcional de extremo a extremo:

1. Sin paginas que rompan en render.
2. Sin botones o enlaces que no lleven a un destino real.
3. Sin rutas visibles que terminen en 404 o redirect vacio.
4. Sin componentes criticos conectados a endpoints equivocados o a mocks.
5. Con una ruta clara de correccion por olas, empezando por lo que rompe conversion y navegacion.

---

## Estado Actual

### Ya corregido en la primera pasada

1. Se habilito detalle real de posts desde el feed.
2. Se corrigio la base de stories del home para usar el flujo activo.
3. Se elimino la ruta duplicada de `/chat`.
4. Se ajusto el cliente JS para enviar cookies de sesion.
5. Se anadieron redirects defensivos para varias rutas muertas de dashboards.

Esto estabiliza parte de la navegacion, pero no significa que el producto este auditado ni operativo al 100%.

### Ya corregido en la segunda pasada

1. `/productor` y `/info/productor` ya no usan la landing rota en runtime.
2. El footer de landings deja de apuntar a rutas inexistentes para blog, prensa, carreras y contacto.
3. Ya existen paginas reales para `/blog`, `/press`, `/careers` y `/contact`.
4. La compilacion del frontend pasa con esta navegacion publica cerrada.

### Corregido en codigo durante la tercera pasada

1. La base de API del frontend queda unificada y deja de mezclar `hispaloshop.com`, rutas relativas y `api.hispaloshop.com` sin `/api`.
2. `auth`, `locale`, `exchange-rates`, `track/visit` y el feed ya apuntan a una estrategia de backend coherente.
3. El backend acepta los headers `X-Client-Version` y `X-Request-ID`, que estaban provocando preflight innecesario con CORS.
4. El backend amplia automaticamente CORS entre `https://hispaloshop.com` y `https://www.hispaloshop.com`.
5. El tracking de visitas deja de insistir indefinidamente si el endpoint responde 404.

### Corregido en codigo durante la cuarta pasada

1. Los entrypoints `dashboard/new` por rol dejan de exponer paneles placeholder.
2. `/dashboard/consumer` ahora deriva al dashboard operativo de cliente.
3. `/dashboard/producer/new` ahora deriva al panel operativo de productor.
4. `/dashboard/influencer/new` ahora deriva al panel operativo de influencer.
5. `/dashboard/importer/new` ahora deriva al panel de importador.
6. `/importer/dashboard` deja de redirigir al panel de productor y monta su dashboard propio.
7. `Customer Dashboard` deja de depender de aliases legacy y pasa a rutas reales de `/dashboard/*`.
8. `Importer Dashboard` deja de enlazar a `/store` y `/producer/store-profile`, y pasa a una superficie real de tienda.
9. `Importer Dashboard` deja de enviar a aliases de importador que solo redirigian y apunta directamente a productos y pedidos operativos.
10. `Influencer Dashboard` ya no muestra un boton de retirada sin accion: el CTA lleva a la seccion real de retiros.
11. `ProducerOverviewResponsive` ya no colapsa entero si falla una sola fuente de datos; ahora degrada por bloques y avisa.
12. `ImporterDashboardPage` ya no cae a pantalla de error total si fallan metricas; muestra estado vacio temporal con aviso explicito.
13. `ProducerDashboard` deja de mandar a detalles inexistentes de pedidos y productos, y redirige sus CTAs a superficies operativas.
14. `ProducerDashboard` ya no usa quick actions que rebotan en redirects cosmeticos a `analytics`, `promotions` o `products/new`.
15. `ProducerDashboard` ahora avisa cuando faltan metricas o stock, en vez de degradar en silencio.
16. La ruta publica `/profile/:userId` deja de usar el perfil mock y pasa a `UserProfilePage`, que si consume datos reales de usuario, posts y productos.
17. Las rutas publicas legacy de `/reels` y `/stories/*` dejan de exponer viewers mock y ahora redirigen a superficies reales del producto.
18. `/checkout` deja de exponer el checkout mock mobile y redirige al flujo real de `/cart`, que si usa carrito, direcciones y checkout Stripe del backend.
19. Ya existe una ruta real `/pending-approval`, evitando que los redirects automáticos de cuenta pendiente acaben en destino inexistente.

---

## Hallazgos Confirmados

### Criticos

1. El home feed sigue siendo una zona de alto riesgo.
   - Archivos:
     - `frontend/src/components/feed/ForYouFeed.js`
     - `frontend/src/components/feed/FollowingFeed.js`
     - `frontend/src/lib/api.js`
     - `frontend/src/lib/api.ts`
   - Causa: coexistencia de capa social nueva, endpoints legacy y diferentes formas de respuesta.
   - Impacto: la seccion principal de la home puede quedar vacia, lanzar error o renderizar datos inconsistentes.

2. Existen superficies visibles que siguen dependiendo de mocks.
   - Archivos:
      - `frontend/src/components/stories/StoryViewer.js`
      - `frontend/src/components/reels/ReelsContainer.js`
      - `frontend/src/components/reels/ReelComments.js`
   - Impacto: partes del producto parecen listas pero no estan conectadas con backend real.
   - Estado actual:
     - la ruta publica de perfil ya no expone el perfil mock antiguo
     - `StoryViewer` y `ReelsContainer` ya no quedan expuestos por rutas publicas directas
     - sigue pendiente decidir si `reels` se integra de verdad con backend o se elimina tambien del resto de entrypoints
     - sigue pendiente cerrar `ReelComments` y el stack de reels si el backend final no existe

3. Errores reales de produccion ya observados en consola.
   - `Access to fetch at 'https://api.hispaloshop.com/feed?scope=following' ... blocked by CORS`
   - `404` en `/api/auth/me`, `/api/auth/google/url`, `/api/config/locale`, `/api/exchange-rates`, `/api/track/visit`
   - `404` en `/api/stories`
   - `Uncaught SyntaxError: Unexpected token 'export'`
   - Impacto: feed sin cargar, login Google roto, locale sin config, tracking fallando y evidencia de una incompatibilidad JS pendiente de localizar.
   - Estado actual:
     - revisado `frontend/public/index.html` sin scripts `type="module"` problematicos
     - revisado `frontend/public/sw-push.js` sin sintaxis ESM
     - hipotesis de trabajo: el error viene de un asset o script servido fuera del bundle principal o de una integracion de terceros en despliegue

### Altos

3. Existen varias landings para la misma intencion con implementaciones divergentes.
   - Archivos:
     - `frontend/src/pages/ProductorLandingPage.js`
     - `frontend/src/pages/SellerLandingPage.js`
     - `frontend/src/pages/landings/ProductorLanding.js`
   - Impacto: copy, diseño, CTA y calidad funcional diferentes para “ser productor”.

4. Dashboards nuevos siguen apoyandose en rutas placeholder o incompletas.
   - Archivos:
     - `frontend/src/pages/dashboard/consumer/ConsumerDashboard.js`
     - `frontend/src/pages/dashboard/producer/ProducerDashboard.js`
     - `frontend/src/pages/dashboard/influencer/InfluencerDashboard.js`
     - `frontend/src/pages/dashboard/importer/ImporterDashboard.js`
   - Impacto: varios quick actions y CTAs siguen sin funcionalidad final real.
   - Hallazgos concretos ya confirmados:
     - `ConsumerDashboard` usa `api.getMyOrders({ limit: '5' })`, pero la firma tipada actual solo contempla `status` y `page`.
     - `ConsumerDashboard` navega a `/dashboard/orders/:id`, que hoy redirige de forma defensiva a la lista y no a un detalle real.
     - `ProducerDashboard` ya fue corregido para dejar de usar `products/new`, `analytics`, `promotions` y detalles placeholder; queda pendiente validar si sus metricas proceden del backend final esperado.
     - `InfluencerDashboard` usa `/influencer/opportunities`, `/influencer/links`, `/influencer/earnings` y `/influencer/perks`, todas redirigidas hoy al dashboard principal.
     - `ImporterDashboard` usa `/importer/orders`, `/importer/orders/:id`, `/importer/products/new`, `/importer/analytics` y `/b2b/producers`, varias de ellas resueltas con redirects temporales.
     - `ProducerDashboard` y `ImporterDashboard` llaman a `/producer/stats`, `/importer/stats`, `/importer/orders` y `/importer/products`, que deben contrastarse con el backend publicado antes de considerar cerrada la ola.

5. Hay inconsistencia estructural en la capa API del frontend.
   - Conviven:
     - `frontend/src/lib/api.js`
     - `frontend/src/lib/api.ts`
     - `frontend/src/lib/authApi.js`
     - `frontend/src/lib/axiosConfig.js`
     - `fetch()` y `axios` directos
   - Impacto: auth, cookies, base URL y manejo de errores no son uniformes.

### Medios

6. `FeedContainer` conserva estado y props muertos.
   - Archivo: `frontend/src/components/feed/FeedContainer.js`
   - Impacto: deuda tecnica y señales de integracion parcial.

7. Algunas landings usan navegacion directa con `window.location.href`.
   - Archivo: `frontend/src/pages/landings/ProductorLanding.js`
   - Impacto: comportamiento inconsistente con React Router.

10. Hay componentes con mensajes de “endpoint not available” y fallbacks silenciosos.
   - Esto no siempre rompe la UI, pero oculta falta de integracion real.

---

## Riesgos por Area

### A. Home y Conversion

Superficie:

- Home
- Header
- Feed
- Stories
- CTA HI AI
- Footer

Riesgo:

- Si el home no carga feed o stories, se cae la pagina mas importante del producto.

### B. Landings y Captacion

Superficie:

- `/productor`
- `/vender`
- `/influencer`
- `/importador`
- `/que-es`

Riesgo:

- Si la pagina rompe o los CTAs llevan a paginas muertas, se pierde captacion.

### C. Navegacion Global

Superficie:

- links de footer
- links de landings
- botones de dashboard
- alias de rutas

Riesgo:

- Experiencia rota aunque la pagina principal cargue.
- Estado actual:
  - corregido tambien el destino automatico `/pending-approval`, que antes podia romper por falta de ruta

### D. Social

Superficie:

- feed
- posts
- comments
- stories
- reels
- chat

Riesgo:

- Gran parte del storytelling y engagement no esta unificada con backend real.

### E. Operativa por Rol

Superficie:

- customer dashboard
- producer dashboard
- influencer dashboard
- importer dashboard

Riesgo:

- El usuario entra a su panel y encuentra botones que no terminan en una accion real.

---

## Plan de Accion

### Ola 1: Recuperar superficies rotas visibles

Objetivo:

Quitar fallos visibles al usuario final en home y landings.

Tareas:

1. Corregir `/productor`.
   - O bien completar `ProductorLandingPage.js` con los bloques faltantes.
   - O bien sustituirla por una landing estable ya existente.
   - Decision recomendada: reutilizar la implementacion estable y eliminar duplicidad.

2. Verificar feed home contra backend activo.
   - Confirmar forma exacta de respuesta de `/api/feed`.
   - Confirmar que `ForYouFeed` y `FollowingFeed` consumen correctamente los campos reales.
   - Revisar like, comment y share.

3. Auditar todos los botones del home.
   - Header
   - Landing pills
   - Stories
   - Post cards
   - Footer principal

4. Auditar todos los botones visibles de landings principales.
   - Productor
   - Influencer
   - Importador
   - Que es

Entrega de la ola:

- Home y landings sin error boundary.
- Sin CTA principal roto.

### Ola 2: Eliminar rutas colgantes y destinos vacios

Objetivo:

Quitar todo enlace visible que no tenga pagina final o redirect intencional valido.

Tareas:

1. Inventario de rutas referenciadas desde botones y links.
2. Cruce contra rutas definidas en `frontend/src/App.js`.
3. Clasificacion por estado:
   - existe
   - existe pero rota
   - no existe
   - solo redirect temporal

4. Resolver especialmente:
   - `/blog`
   - `/press`
   - `/careers`
   - `/contact`
   - rutas internas de dashboards

Entrega de la ola:

- Ningun link visible del sitio apunta a una ruta inexistente.
- Estado actual: cerrada para la navegacion publica principal y el footer de landings.

### Ola 3: Unificar social real

Objetivo:

Dejar feed, posts, stories y reels conectados al backend activo, no a mocks.

Tareas:

1. Consolidar una sola capa API social.
2. Unificar shape de posts.
3. Revisar `PostViewer`, `PostCard`, feed cards y detalles.
4. Sustituir mocks en stories y reels por endpoints reales o esconder la funcionalidad si no existe backend.

Entrega de la ola:

- Social visible 100% conectado o explícitamente desactivado donde no exista soporte real.
- Estado actual:
  - Base URL y CORS corregidos en codigo.
  - Pendiente validar en despliegue que `api.hispaloshop.com` sirva realmente `/api/auth/me`, `/api/auth/google/url`, `/api/config/locale`, `/api/exchange-rates`, `/api/track/visit`, `/api/feed` y `/api/stories`.
  - Pendiente localizar el origen exacto del `Unexpected token 'export'` con repro y archivo/script concreto.

### Ola 4: Dashboards por rol

Objetivo:

Quitar CTAs muertos y dejar paneles operativos.

Tareas:

1. Auditar `ConsumerDashboard`.
   - Validar KPIs y fuentes de datos.
   - Corregir acceso a wishlist y pedidos.
   - Sustituir accesos a detalle inexistente por lista real o detalle real.

2. Auditar `ProducerDashboard`.
   - Sustituir acciones a `products/new`, `analytics` y `promotions` por superficies reales.
   - Corregir alertas de stock bajo que hoy intentan abrir rutas placeholder.
   - Confirmar si `/producer/stats` y `/producer/products` responden en el backend activo.

3. Auditar `InfluencerDashboard`.
   - Revisar `getInfluencerDashboard`, `getCommissions` y `getAffiliateLinks`.
   - Eliminar o materializar quick actions que hoy solo vuelven al mismo dashboard.
   - Definir una superficie real minima para links, ganancias y oportunidades.

4. Auditar `ImporterDashboard`.
   - Confirmar soporte real de `/importer/stats`, `/importer/orders` y `/importer/products`.
   - Sustituir redirects por destinos operativos o quitar botones.
   - Reconciliar quick actions con `B2BMarketplacePage` y panel productor reutilizado.

5. Cruce final dashboard -> rutas -> endpoint.
   - Cada KPI debe tener una fuente de datos valida.
   - Cada quick action debe abrir una pantalla funcional.
   - Cada item de actividad debe llevar a detalle real o quedarse en lista real.
   - Cada sugerencia HI debe ejecutar una accion util y no un redirect cosmetico.

Entrega de la ola:

- Cada boton visible en un dashboard hace algo real.
- Criterio de cierre:
  - cero redirects temporales visibles desde dashboards
  - cero CTA que devuelvan al mismo panel sin cambio de contexto
  - cero cards apoyadas en endpoints inexistentes o silenciosamente degradados
- Estado actual:
  - cerrada para los entrypoints de dashboards "new"
  - corregidos enlaces muertos obvios en `Customer Dashboard` e `Importer Dashboard`
  - corregidos CTA internos visibles en `Influencer Dashboard`
  - corregidos CTA muertos y degradacion silenciosa en `ProducerDashboard`
  - iniciada la depuracion profunda de KPIs, fuentes de datos y degradaciones silenciosas en paneles legacy y responsive
  - pendiente continuar el mismo criterio en el resto de paneles operativos y en metricas que siguen siendo aproximadas o mockeadas

### Ola 7: Cierre operativo de todo lo que esta a medias

Objetivo:

Convertir el producto desde "funciona a ratos" a "todas las funciones visibles tienen destino real, datos honestos y criterio de error claro".

Bloques:

1. Superficies visibles con backend confirmado.
   - Feed home
   - Stories
   - Locale
   - Google auth
   - Track/visit
   - Criterio de cierre:
     - cada endpoint responde en despliegue real
     - cero 404 en consola para superficies publicas
     - cero errores CORS en origin `hispaloshop.com`

2. Navegacion sin puntos muertos.
   - inventario automatico de `to=`, `navigate()`, `href=`
   - cruce contra `App.js`
   - resolucion de:
     - ruta real
     - redirect valido y util
     - boton eliminado
   - Criterio de cierre:
     - ningun CTA visible apunta a placeholder o a redirect al mismo contexto

3. Social real vs mock.
   - Posts
   - Stories
   - Reels
   - Perfil social
   - Comentarios
   - Criterio de cierre:
     - lo que no tenga backend se oculta
     - lo que quede visible usa endpoints reales

4. Ecommerce base extremo a extremo.
   - listado
   - detalle
   - carrito
   - checkout
   - pedido
   - wishlist
   - perfil cliente
   - Criterio de cierre:
     - browse -> PDP -> cart -> checkout -> order sin rutas muertas ni estados imposibles

5. Paneles por rol.
   - productor
   - importador
   - influencer
   - cliente
   - admin
   - superadmin
   - Criterio de cierre:
     - cada KPI tiene fuente valida
     - cada boton hace una accion real
     - cada error se muestra como warning o empty state, no como silencio

6. Observabilidad y prevencion.
   - smoke tests de rutas
   - smoke tests de flujos principales
   - test automatizado de integridad de enlaces
   - Criterio de cierre:
     - build estable
     - smoke tests verdes
     - regresiones visibles detectadas antes del despliegue

### Plan de ejecucion recomendado

Fase 1. Produccion publica.
- validar en despliegue `feed`, `stories`, `auth/me`, `google/url`, `config/locale`, `exchange-rates`, `track/visit`
- localizar el `Unexpected token 'export'`
- dejar consola limpia en home, login y registro

Fase 2. Navegacion global.
- barrer todos los enlaces visibles y quick actions
- resolver redirects circulares
- quitar cualquier CTA sin pantalla final

Fase 3. Social.
- unificar feed/post/story/reel/profile
- ocultar componentes mock mientras no tengan backend real

Fase 4. Ecommerce.
- cerrar productos, checkout, pedidos, wishlist y perfil
- validar estados vacios, errores y sesiones expiradas

Fase 5. Backoffice.
- rematar paneles de productor, importador, influencer, admin y superadmin
- sustituir "coming soon" por pantallas reales o retirar accesos

Fase 6. Blindaje.
- test de integridad de rutas
- smoke tests por rol
- checklist de despliegue

### Ola 5: Catalogo, compra y cuenta

Objetivo:

Validar ecommerce base.

Tareas:

1. Products
2. Product detail
3. Stores
4. Cart
5. Checkout
6. Orders
7. Wishlist
8. Profile

Entrega de la ola:

- Flujo browse -> product -> cart -> checkout -> order sin rutas muertas.
- Estado actual:
  - `/checkout` ya no deriva a una pantalla mock separada
  - el siguiente pendiente es validar de extremo a extremo `cart -> create-checkout -> stripe -> /checkout/success`

### Ola 6: Admin y superadmin

Objetivo:

Validar paneles internos y guardas.

Tareas:

1. Roles
2. Rutas
3. CRUDs
4. Metricas
5. Estados de error

---

## Metodologia de Auditoria

Cada bloque se cerrara con:

1. Inventario de botones.
2. Inventario de enlaces.
3. Rutas llamadas.
4. Endpoints consumidos.
5. Bugs confirmados.
6. Fix propuesto.
7. Verificacion de build.

---

## Tests a Crear

1. Test de integridad de rutas.
   - Detectar `navigate('/x')`, `to="/x"` y `href="/x"` sin correspondencia en `App.js`.

2. Smoke test de home.
   - Header
   - Feed
   - Stories
   - Footer
   - CTA principal

3. Smoke test de landings.
   - `/productor`
   - `/vender`
   - `/influencer`
   - `/importador`
   - `/que-es`

4. Smoke test de dashboards por rol.

5. Tests de endpoints criticos.
   - `/api/feed`
   - `/api/posts/:id`
   - `/api/posts/:id/comments`
   - `/api/stories`
   - auth endpoints

---

## Prioridad Real

1. Home feed
2. Landing `/productor`
3. Links visibles a rutas inexistentes
4. Landings principales
5. Dashboards por rol
6. Social mock vs real
7. Compra y cuenta
8. Admin y superadmin

---

## Siguiente Paso Recomendado

Ejecutar ahora mismo un bloque completo sobre:

1. reparar `/productor`,
2. validar el home feed contra respuesta real del backend,
3. listar y corregir los links visibles inexistentes de landings y footer,
4. dejar el primer informe de auditoria funcional cerrado.
