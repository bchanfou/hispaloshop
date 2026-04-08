# PROMPTS FASE 1 — CONSUMER EXPERIENCE
## Prompts 1.1 a 1.21 (Batch)

Contexto obligatorio para cada prompt: `memory/hispaloshop_dna.md`, `DESIGN_SYSTEM.md`, `ROADMAP_LAUNCH.md` sección correspondiente.

---

## 1.1 Onboarding & Registration
**Done:**
- [ ] Registro email + password con validación
- [ ] Verificación email (código 6 dígitos)
- [ ] Onboarding: país, idioma, moneda, intereses
- [ ] Social login: Google, Apple (opcional V1)
- [ ] Terms & Privacy checkbox separados
- [ ] Redirect post-login basado en role

**Archivos:** `frontend/src/pages/auth/`, `backend/routes/auth.py`

---

## 1.2 Discover Page (REBUILD)
**Done:**
- [ ] Hero seasonal (cambia por mes/época)
- [ ] Sección "Near you" (productos cercanos)
- [ ] Sección "Communities" (comunidades populares)
- [ ] Sección "Creators" (influencers destacados)
- [ ] Sección "Recipes" (recetas trending)
- [ ] Mapa interactivo de productores
- [ ] Sin tira de categorías fijas
- [ ] Cada sección es horizontal scroll

**Archivos:** `frontend/src/pages/DiscoverPage.tsx`, `backend/routes/discover.py`

---

## 1.3 Search & Filters
**Done:**
- [ ] Search bar en header
- [ ] Búsqueda por texto en productos
- [ ] Filtros: categoría, precio, país, rating
- [ ] Sort: relevancia, precio, novedad
- [ ] Resultados grid
- [ ] Empty state

**Archivos:** `frontend/src/pages/SearchPage.tsx`, `backend/routes/search.py`

---

## 1.4 Product Detail Page
**Done:**
- [ ] Galería imágenes (zoom, fullscreen)
- [ ] Info: nombre, precio, descripción, stock
- [ ] Variantes: selector size/color/pack
- [ ] Productor: avatar, nombre, link a store
- [ ] Certificados: badges clickeables
- [ ] Reviews: lista + formulario si comprado
- [ ] Add to cart / Buy now
- [ ] Share: copiar link, redes sociales
- [ ] Wishlist: toggle heart

**Archivos:** `frontend/src/pages/ProductDetailPage.tsx`, `backend/routes/products.py`

---

## 1.5 Cart & Multi-Producer Handling
**Done:**
- [ ] Carrito agrupado por productor
- [ ] Items: imagen, nombre, variante, cantidad, precio
- [ ] Cambiar cantidad, eliminar item
- [ ] Subtotal por productor
- [ ] Nota: "Múltiples envíos desde X productores"
- [ ] Guardar para después (wishlist)
- [ ] Promo code input

**Archivos:** `frontend/src/pages/CartPage.tsx`, `backend/routes/cart.py`

---

## 1.6 Checkout Flow
**Done:**
- [ ] Dirección de envío (guardar múltiples)
- [ ] Método de pago (Stripe Cards)
- [ ] Review: items, dirección, total
- [ ] Aplicar descuento/código
- [ ] Place order → Stripe checkout session
- [ ] Confirmación post-pago
- [ ] Email confirmación

**Archivos:** `frontend/src/pages/CheckoutPage.tsx`, `backend/routes/orders.py`

---

## 1.7 Order Tracking & History
**Done:**
- [ ] Lista pedidos: imagen, estado, fecha, total
- [ ] Filtros: estado, fecha
- [ ] Detalle pedido: items, tracking, factura
- [ ] Timeline: pedido → preparación → envío → entrega
- [ ] Reordenar (add items al cart)
- [ ] Contactar productor

**Archivos:** `frontend/src/pages/OrdersPage.tsx`, `backend/routes/orders.py`

---

## 1.8 Reviews & Ratings
**Done:**
- [ ] Review solo si producto comprado y entregado
- [ ] Rating 1-5 estrellas
- [ ] Texto review (opcional)
- [ ] Fotos review (opcional, max 3)
- [ ] Reviews visibles en producto
- [ ] Sort reviews: útil, reciente
- [ ] Marcar review como útil

**Archivos:** `frontend/src/components/reviews/`, `backend/routes/reviews.py`

---

## 1.9 User Profile & Settings
**Done:**
- [ ] Ver perfil público/privado
- [ ] Editar: foto, nombre, bio
- [ ] Settings: email, password, notificaciones
- [ ] Preferencias: idioma, moneda, país
- [ ] Direcciones: añadir, editar, eliminar
- [ ] Métodos de pago: gestionar tarjetas
- [ ] Delete account

**Archivos:** `frontend/src/pages/profile/`, `backend/routes/users.py`

---

## 1.10 Notifications Center
**Done:**
- [ ] Lista notificaciones: pedido, mensaje, sistema
- [ ] Marcar como leída
- [ ] Eliminar notificación
- [ ] Settings: qué notificar (push/email/in-app)
- [ ] Badge en tab bar con count no leídas

**Archivos:** `frontend/src/pages/NotificationsPage.tsx`, `backend/routes/notifications.py`

---

## 1.11 Home Feed (Social - Instagram-like)
**Done:**
- [ ] Stories bar horizontal (top)
- [ ] Posts feed vertical infinito
- [ ] Post: autor, contenido, media, likes, comments
- [ ] Acciones: like, comment, share, save
- [ ] Double tap para like
- [ ] Infinite scroll
- [ ] Pull to refresh

**Archivos:** `frontend/src/pages/FeedPage.tsx`, `backend/routes/feed.py`, `backend/routes/posts.py`

---

## 1.12 Content Creation (Studio) — YA CREADO SEPARADO
Ver `prompt-section-1.12-content-studio.md`

---

## 1.13 Chat / DMs + Groups + Audio
**Done:**
- [ ] Lista conversaciones
- [ ] Chat 1-a-1: textos, imágenes, audio
- [ ] Audio: grabar, enviar, reproducir (max 2 min)
- [ ] DM desconocidos: request inbox
- [ ] Grupos privados (max 20)
- [ ] Grupos comunidad (max 500)
- [ ] Reacciones a mensajes
- [ ] Typing indicator

**Archivos:** `frontend/src/pages/chat/`, `backend/routes/chat.py`, `backend/routes/messages.py`

---

## 1.14 David AI (Consumer Assistant)
**Done:**
- [ ] Chat flotante bottom-right
- [ ] Responde sobre: productos, pedidos, navegación
- [ ] Sugiere productos basado en preferencias
- [ ] Contexto: historial navegación usuario
- [ ] Tone: amigable, útil, no intrusivo

**Archivos:** `frontend/src/components/ai/DavidAI.tsx`, `backend/routes/ai.py`

---

## 1.15 Communities
**Done:**
- [ ] Dos tipos: productor (auto) + abiertas (usuario)
- [ ] Usuario puede unirse a máx 3 comunidades
- [ ] Chat comunidad: opt-in, límite 500 miembros
- [ ] Posts comunidad: feed propio
- [ ] Moderación: reportes

**Archivos:** `frontend/src/pages/communities/`, `backend/routes/communities.py`

---

## 1.16 Recipes (con ingredientes comprables)
**Done:**
- [ ] Ver receta: título, imagen, descripción, pasos
- [ ] Ingredientes listados con cantidades
- [ ] Cada ingrediente link a producto
- [ ] Botón "Comprar todos los ingredientes"
- [ ] Añade productos de múltiples productores al cart
- [ ] Crear receta: título, foto, ingredientes (tag products), pasos

**Archivos:** `frontend/src/pages/recipes/`, `backend/routes/recipes.py`

---

## 1.17 Wishlists Compartibles
**Done:**
- [ ] Guardar productos a wishlist
- [ ] Perfil tab "Guardados"
- [ ] Compartir wishlist: link público
- [ ] Wishlist colaborativa (opcional V1)

**Archivos:** `frontend/src/pages/WishlistPage.tsx`, `backend/routes/wishlists.py`

---

## 1.18 Ambassadors Public Section
**Done:**
- [ ] Página pública /ambassadors
- [ ] Grid influencers activos
- [ ] Perfil influencer: foto, bio, stats, posts
- [ ] Código de referido visible

**Archivos:** `frontend/src/pages/AmbassadorsPage.tsx`, `backend/routes/influencer.py`

---

## 1.19 Blog Editorial Light
**Done:**
- [ ] 5-10 landing pages storytelling
- [ ] Productores destacados
- [ ] SEO optimizado
- [ ] Compartible en redes

**Archivos:** `frontend/src/pages/blog/`, `backend/routes/blog.py`

---

## 1.20 Universal Search — YA CREADO SEPARADO
Ver `prompt-section-1.20-universal-search.md`

---

## 1.21 Hashtag System
**Done:**
- [ ] Posts con hashtags #categoría
- [ ] Click hashtag → búsqueda filtrada
- [ ] Trending hashtags
- [ ] Autosuggest hashtags al crear post

**Archivos:** `frontend/src/components/hashtag/`, `backend/routes/hashtags.py`

---

## COMMIT MESSAGE Fase 1
```
feat(consumer): fase 1 completa — onboarding, discover, search, product, cart, checkout, orders, feed, chat, communities, recipes, wishlist

- Onboarding: registro, verificación email, preferencias
- Discover: seasonal, near you, creators, recipes, map
- Search: filtros, sort, resultados grid
- Product: galería, variantes, reviews, certificates
- Cart: multi-producer, promo codes
- Checkout: Stripe, direcciones, confirmación
- Orders: tracking, timeline, factura
- Feed: stories, posts, likes, comments
- Chat: DMs, audio, grupos
- Communities: 2 tipos, chat opt-in
- Recipes: ingredientes comprables
- Wishlist: compartible
- Zero emojis, stone palette ADN

Refs: 1.1-1.21
```
