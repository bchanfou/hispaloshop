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
     - `frontend/src/components/profile/PostsGrid.js`
     - `frontend/src/components/profile/StoreView.js`
   - Impacto: partes del producto parecen listas pero no estan conectadas con backend real.

3. Errores reales de produccion ya observados en consola.
   - `Access to fetch at 'https://api.hispaloshop.com/feed?scope=following' ... blocked by CORS`
   - `404` en `/api/auth/me`, `/api/auth/google/url`, `/api/config/locale`, `/api/exchange-rates`, `/api/track/visit`
   - `404` en `/api/stories`
   - `Uncaught SyntaxError: Unexpected token 'export'`
   - Impacto: feed sin cargar, login Google roto, locale sin config, tracking fallando y evidencia de una incompatibilidad JS pendiente de localizar.

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

1. Auditar cada KPI card.
2. Auditar quick actions.
3. Auditar listas de actividad y sugerencias.
4. Reemplazar redirects temporales por rutas reales o eliminar acciones hasta que existan.

Entrega de la ola:

- Cada boton visible en un dashboard hace algo real.

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
