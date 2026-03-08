# Plan Maestro de Auditoria y Correccion

## Objetivo

Auditar toda la aplicacion de forma secuencial, empezando por la pagina principal y continuando por cada pagina, subpagina, boton, enlace y funcion visible, para:

1. Detectar rutas rotas, botones sin destino o con destino inexistente.
2. Detectar llamadas API inconsistentes entre frontend y backend activo.
3. Detectar flujos incompletos o divergentes entre implementaciones nuevas y legacy.
4. Priorizar correcciones por impacto real sobre navegacion, conversion y operativa.

---

## Hallazgos Iniciales Confirmados

### Criticos

1. Navegacion a detalle de post sin ruta frontend.
   - `frontend/src/components/feed/ForYouFeed.js`
   - `frontend/src/components/feed/FollowingFeed.js`
   - Ambos usan `navigate('/posts/${postId}')`.
   - En `frontend/src/App.js` no existe ruta `"/posts/:postId"`.
   - Impacto: botones de comentario/share del feed llevan a una URL no resuelta.

2. Stories del home conectadas a un endpoint no montado en el backend activo.
   - `frontend/src/components/stories/StoriesCarousel.js` hace `fetch('/stories/feed')`.
   - El endpoint encontrado existe solo en `backend/_future_postgres/routers/stories.py`.
   - `backend/main.py` no monta ese router.
   - Impacto: carrusel de historias con alta probabilidad de fallo en home.

3. Destinos mock en sugerencias del home.
   - `frontend/src/components/feed/ForYouFeed.js`
   - `SuggestedProfiles` navega a `/profile/s1`, `/profile/s2`, etc.
   - Esos ids son mock y no corresponden a usuarios reales.
   - Impacto: CTA visible en portada conduce a perfiles probablemente rotos.

### Altos

4. Ruta duplicada para `"/chat"` en `frontend/src/App.js`.
   - Hay una definicion con `ChatContainer` y otra con `Navigate to="/"`.
   - Impacto: comportamiento ambiguo y deuda estructural en una ruta principal.

5. Dashboards nuevos apuntan a rutas no declaradas.
   - `frontend/src/pages/dashboard/consumer/ConsumerDashboard.js`
   - `frontend/src/pages/dashboard/producer/ProducerDashboard.js`
   - `frontend/src/pages/dashboard/influencer/InfluencerDashboard.js`
   - `frontend/src/pages/dashboard/importer/ImporterDashboard.js`
   - Ejemplos: `/dashboard/orders/:id`, `/producer/products/new`, `/producer/analytics`, `/influencer/earnings`, `/b2b/producers`, `/importer/analytics`.
   - Impacto: botones visibles en paneles pueden romper navegacion o redirigir a 404.

6. Inconsistencia de clientes API en frontend.
   - Conviven `frontend/src/lib/api.js`, `frontend/src/lib/authApi.js`, `frontend/src/lib/axiosConfig.js` y varios `fetch()` directos.
   - Impacto: cookies, auth, base URL y errores no se gestionan de forma uniforme.

### Medios

7. `FeedContainer` conserva codigo no conectado.
   - Importa `CategoryPills` pero no se usa.
   - Tiene `selectedCategory` y `handleRefresh` sin efecto real visible.
   - Pasa props a `StoriesCarousel` que el componente no consume.
   - Impacto: deuda tecnica y señales de integracion incompleta.

---

## Estrategia de Auditoria

La auditoria no se ejecutara "por archivos", sino por superficie funcional visible al usuario.

Orden obligatorio:

1. Home y sus subfunciones.
2. Auth y onboarding.
3. Catalogo, discovery y contenido publico.
4. Compra: carrito, checkout, pedidos.
5. Social: feed, posts, stories, reels, chat.
6. Dashboards por rol.
7. Admin y superadmin.
8. Configuracion transversal y regresion automatizada.

Cada bloque debe cerrar con:

1. Inventario de botones/enlaces.
2. Mapa de rutas involucradas.
3. Endpoints consumidos.
4. Bugs confirmados.
5. Fixes propuestos.
6. Tests de regresion a crear.

---

## Fase 1: Home

### Superficie a auditar

- `frontend/src/pages/HomePage.js`
- `frontend/src/components/Header.js`
- `frontend/src/components/feed/FeedContainer.js`
- `frontend/src/components/feed/TabToggle.js`
- `frontend/src/components/feed/LandingNavPills.js`
- `frontend/src/components/feed/ForYouFeed.js`
- `frontend/src/components/feed/FollowingFeed.js`
- `frontend/src/components/stories/StoriesCarousel.js`
- `frontend/src/components/feed/HIFloatingButton.js`
- `frontend/src/components/Footer.js`

### Checklist funcional

1. Header
   - Logo
   - Busqueda por scope: todo, productos, perfiles, tiendas
   - Cart button
   - Login / registro
   - Logout
   - Menu hamburguesa
   - Selector de idioma

2. Home feed
   - Cambio entre "Siguiendo" y "Para ti"
   - Navegacion a landings
   - Carga de stories
   - Scroll del feed
   - Like
   - Comentario
   - Share
   - Estado vacio
   - Estado de error

3. CTA flotante HI AI
   - Usuario autenticado
   - Usuario anonimo

4. Footer
   - Enlaces institucionales
   - Enlaces de navegacion
   - Enlaces externos
   - Selector de idioma mobile

### Entregable de la fase

- Matriz completa de botones de la portada.
- Lista de rutas validas e invalidas de la portada.
- Lista de endpoints realmente usados por la portada.
- PR de correccion de bugs criticos de portada.

---

## Fase 2: Auth y Onboarding

### Superficie

- Login
- Registro por rol
- Google login
- Verify email
- Forgot/reset password
- Auth callback
- Onboarding

### Riesgos a validar

1. Rutas alias duplicadas o inconsistentes.
2. Redirecciones post-login segun rol.
3. Google auth en local y en despliegue.
4. Reglas de aprobacion para producer/importer/influencer.
5. Flujos con cookies vs token local.

---

## Fase 3: Publico y Descubrimiento

### Superficie

- `ProductsPage`
- `ProductDetailPage`
- `StoresListPage`
- `StorePage`
- `DiscoverPage`
- `CategoryPage`
- `RecipesPage`
- `RecipeDetailPage`
- landings publicas

### Validaciones

1. Filtros, busqueda y query params.
2. Navegacion producto -> tienda -> categoria.
3. Enlaces cruzados desde landing a registro y ayuda.
4. Estados vacios y fallos de carga.

---

## Fase 4: Compra y Cuenta Cliente

### Superficie

- Cart
- MiniCart
- Checkout
- Checkout success
- Dashboard cliente
- Orders
- Wishlist
- Profile

### Validaciones

1. Add to cart desde todas las superficies.
2. Persistencia de carrito.
3. Checkout con usuario anonimo y autenticado.
4. Ordenes y detalle de orden.
5. Direcciones, perfil y favoritos.
6. Rutas internas del dashboard cliente.

---

## Fase 5: Social, Posts, Stories, Reels y Chat

### Superficie

- Feed home
- Social feed legado
- Post viewer / detalle de post
- Stories viewer / creator
- Reels
- Chat

### Riesgos ya detectados

1. Home usa social nuevo pero con rutas incompletas.
2. Stories dependen de endpoint no montado.
3. Existen implementaciones paralelas de feed social.
4. Chat tiene ruta duplicada en `App.js`.

### Validaciones

1. Like, save, comment, share.
2. Viewer de post.
3. Historias: feed, create, view.
4. Reels: producto, user, hashtags.
5. Chat: acceso, rutas y auth.

---

## Fase 6: Dashboards por Rol

### Superficie

- Dashboard cliente nuevo
- Dashboard productor nuevo
- Dashboard importador nuevo
- Dashboard influencer nuevo
- Layouts responsive asociados

### Prioridad

Muy alta, porque ya hay evidencia de botones con rutas no montadas.

### Validaciones

1. Cada card KPI.
2. Cada quick action.
3. Cada CTA de actividad reciente.
4. Cada sugerencia HI.
5. Coherencia entre dashboards "nuevos" y rutas realmente disponibles en `App.js`.

---

## Fase 7: Admin y Superadmin

### Superficie

- `/admin/*`
- `/super-admin/*`
- tablas, acciones, filtros, moderacion, dashboards

### Validaciones

1. Guardas de rol.
2. Enlaces internos.
3. Operaciones CRUD.
4. Carga de metricas.
5. Estados de error.

---

## Fase 8: Capa Transversal y Automatizacion

### Objetivos

1. Unificar estrategia API del frontend.
2. Detectar rutas frontend inexistentes desde botones antes de llegar a produccion.
3. Crear smoke tests de navegacion.
4. Crear contract tests minimos para endpoints usados por UI.

### Tests a crear

1. Test de integridad de rutas:
   - detectar `navigate('/x')` y `to="/x"` que no existan en `App.js`.

2. Test de integridad home:
   - header
   - footer
   - feed
   - stories
   - CTA HI AI

3. Test de dashboards por rol:
   - render
   - cards
   - quick actions
   - redireccion correcta

4. Test de endpoints criticos:
   - `/api/feed`
   - `/api/posts/:id`
   - `/api/posts/:id/comments`
   - `/api/posts/:id/like`
   - auth endpoints

---

## Priorizacion de Correccion

### Ola 1

- Home rota o parcialmente rota
- Auth
- Stories
- Rutas inexistentes desde botones visibles

### Ola 2

- Dashboards con CTAs muertos
- Cart, checkout, orders
- Discovery y catalogo

### Ola 3

- Admin / superadmin
- Deuda tecnica de clientes API y duplicados legacy/nuevo

---

## Siguiente Paso Operativo

Empezar por una auditoria exhaustiva de la portada y dejar:

1. inventario completo de botones y funciones del home,
2. bugs confirmados con archivo y causa,
3. lista de correcciones exactas,
4. set inicial de tests de regresion para portada.

Ese sera el primer bloque de ejecucion antes de pasar a auth y al resto del producto.
