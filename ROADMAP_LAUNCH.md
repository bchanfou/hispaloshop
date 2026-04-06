# HispaloShop — Roadmap Completo hasta Launch

> Generado: 2026-04-05
> Actualizado: 2026-04-06 (scope final cerrado)
> Launch scope: ES + KR + US, todos los roles, calidad > velocidad (3+ meses)
> Filosofía: **consumer-first**. Cada fase pule primero lo que el usuario final toca.
> Brand DNA: ver `memory/hispaloshop_dna.md`

---

## Scope final V1 (cerrado 2026-04-06)

### ✅ Incluido en V1
- **Home feed**: Puramente social estilo Instagram (stories + posts + reels + ads). Sin widgets, sin injections, sin weekly summaries.
- **Discover**: Rebuild completo, curado con seasonal / near you / communities / creators / recipes / map. Sin tira de categorías fijas.
- **Tab bar + header**: Se mantienen como están (auditar en 0.5).
- **Hamburger menu**: Reestructura agrupada por jerarquía.
- **Multi-producer cart + checkout**: Solo Stripe, 3 países (ES+KR+US).
- **Payouts manuales V1**: Admin transfiere desde Revolut Business.
- **Roles**: consumer, producer, influencer, importer (variante producer), admin, super_admin.
- **Influencer + Creator**: Mismo usuario puede ser ambos. Influencer tagea productos en posts sin cambiar comisión.
- **Sección "Embajadores" pública**: Para visibilizar influencers.
- **Preferencias independientes**: Moneda, idioma, país pueden ser distintos por usuario.
- **Communities**: Solo 2 tipos — productor (auto) + abiertas (usuario, máx 3/user). Chat de comunidad opt-in con límite 500 miembros. Moderación por reports.
- **Chat 1-a-1**: pulir burbuja auto-expand, reacciones a stories con preview, menú de archivos completo (imagen, audio, producto, ubicación, wishlist, documento). DM desconocidos → request inbox.
- **Chat groups**: Privados (máx 20) + asociados a comunidad (500 opt-in).
- **Audio messages**: Max 2 min, auto-delete 30 días + purga agresiva de audios largos.
- **Wishlist compartible**: Perfil tab "Guardados" ampliado + hamburger + share desde chat/product.
- **Recipes con ingredientes comprables**: Implementación completa — cada ingrediente vinculado a product_id, botón "Comprar todos los ingredientes" multi-producer.
- **AIs**: David (consumer), Rebeca (PRO), Pedro (ELITE), Content Suggester.
- **Blog editorial light**: 5-10 landing pages de storytelling (productores destacados).
- **Legal**: GDPR, VIES, Modelo 190, i18n ES/EN/KO.

### ❌ Excluido de V1 (→ V2)
- Video calls / audio calls B2B (Daily.co / LiveKit cuando haya demanda real)
- Live streaming para influencers (producto completo por sí mismo)
- Referral consumer-to-consumer (invita un amigo)
- Loyalty program / HispaloPoints
- Colaboraciones comerciales productor↔influencer (pago directo por post)
- Eventos físicos (ferias, catas, ticketing)
- "Productor del mes" destacado en home (filosofía: home solo social)
- Native mobile apps (iOS/Android)
- Live streaming commerce
- Pinned messages, polls en grupos, call de grupo
- Firma digital cualificada (eIDAS) en contratos B2B
- Stripe Connect multi-país automatizado (payouts manuales V1)
- Métodos de pago locales (Bizum, Toss, PortOne, PIX)
- Integración con carriers (Seur, Correos, DHL API)
- Forums públicos (comunidades cumplen esa necesidad)
- WhatsApp/Intercom live chat (ticketing in-app es suficiente)

---

## Cómo usar este roadmap

- **5 fases** ordenadas por impacto al usuario final
- **~50 secciones** auditables independientemente
- Cada sección tiene: **objetivo**, **archivos clave**, **criterios de done**, **estimación**, **dependencias**
- **Los prompts se generan bajo demanda** — pides "genera el prompt para sección 1.3" y recibes un prompt completo listo para ejecutar en un chat dedicado
- **Cada prompt incluye**: contexto del DNA, alcance específico, archivos a leer, qué auditar, qué fixar, qué entregar
- **Cada sección termina con un git commit** — historial limpio y reversible
- **Criterio de "done" verificable** — no es opinión, es checklist

---

# FASE 0 — FUNDAMENTOS (semana 1-2)

> Antes de tocar features, asegurar que los cimientos son sólidos.

## 0.1 — Brand DNA & Design System consolidation
**Objetivo:** Un solo archivo de verdad para tokens de diseño, spacing, typography, copy guidelines. Todo el frontend debe consumir de ahí.

**Archivos clave:** `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/src/styles/`, brand docs (crear)

**Done cuando:**
- Design tokens documentados en `DESIGN_SYSTEM.md`
- Tailwind config limpio sin valores custom sueltos
- Guía de copy (tono, do/don't phrases, emojis prohibidos)
- Lista de componentes base con variantes (Button, Card, Input, Modal, Toast, Badge, Avatar, etc.)
- Zero referencias a colores fuera del palette stone

**Dependencias:** Ninguna
**Estimación:** 2-3 días

---

## 0.2 — Infrastructure & Environment
**Objetivo:** Railway + GitHub Actions + secrets + monitoring listos para producción.

**Archivos clave:** `.env.example`, `railway.json`, `.github/workflows/`, `backend/main.py` (startup checks)

**Done cuando:**
- `.env.example` con todas las variables documentadas (60+ vars)
- Startup checks en `main.py` fallan si faltan vars críticas (STRIPE_KEY, MONGO_URL, ANTHROPIC_API_KEY, FCM_SERVICE_ACCOUNT_JSON, FRONTEND_URL, BACKEND_URL)
- Sentry configurado backend + frontend con source maps
- Railway deploy automático desde `main` branch
- Staging environment independiente (dominio staging.hispaloshop.com)
- GitHub Actions cron funcionando (ya tienes los YAML)
- Logs estructurados (no print(), todo por logger)

**Dependencias:** 0.1
**Estimación:** 2 días

---

## 0.3 — Testing strategy & smoke tests
**Objetivo:** Al menos smoke tests automáticos de los 10 flujos críticos.

**Archivos clave:** `backend/tests/`, `frontend/src/__tests__/`, `playwright/`

**Done cuando:**
- Playwright E2E para los 5 flujos consumer críticos (registro, login, buscar, añadir al carrito, checkout con Stripe test card)
- Pytest para 10 endpoints backend críticos (health, login, create order, apply coupon, commission split)
- CI ejecuta tests en cada PR
- Coverage mínimo del 40% en routes/ y services/
- `npm run test` y `pytest` arrancan sin errores

**Dependencias:** 0.2
**Estimación:** 3-4 días

---

## 0.4 — Backups & disaster recovery
**Objetivo:** Si MongoDB explota mañana, sobrevivimos.

**Archivos clave:** script de backup, Railway config

**Done cuando:**
- Backup automático diario de MongoDB a S3 o equivalente
- Script de restore verificado (restore a staging desde backup real)
- Runbook en `DISASTER_RECOVERY.md`
- Stripe webhook endpoint idempotente (ya existe, verificar)

**Dependencias:** 0.2
**Estimación:** 1-2 días

---

## 0.5 — Navigation audit (tab bar, header, hamburger menu)
**Objetivo:** Auditar la arquitectura de navegación actual antes de tocar secciones de features.

**Archivos clave:** `frontend/src/components/BottomNavBar.js`, `components/dashboard/*Layout*`, `components/HamburgerMenu*`, header components

**Auditar:**
- Tab bar inferior: iconos, orden, estados activos, responsive, safe-area-inset
- Header: logo, search icon, notifications bell, profile avatar — consistencia entre páginas
- Hamburger menu: estructura actual vs. propuesta (agrupada por jerarquía)
- Entry points entre páginas (breadcrumbs, back buttons)
- Routing guards: ¿qué páginas requieren login? ¿cuáles son públicas?
- Deep linking: URL compartible de cada sección

**Done cuando:**
- Documento `NAVIGATION_MAP.md` con todas las rutas, entry points, y permisos
- Tab bar confirmado (user dijo "está óptimo" — validar y no cambiar sin razón)
- Hamburger menu reestructurado con la propuesta:
  - MI CUENTA: Pedidos, Guardados y listas, Tu actividad, Mensajes, Notificaciones
  - EXPLORAR: Productos, Tiendas, Comunidades, Recetas, Certificaciones
  - PARA VENDEDORES (contextual): Dashboard, Productos, Ventas
  - PARA INFLUENCERS (contextual): Dashboard, Códigos, Comisiones
  - ¿ERES VENDEDOR? (contextual si no lo es): Soy productor, Soy importador, Soy influencer
  - PREFERENCIAS: País, Idioma, Divisa (independientes)
  - AYUDA: ¿Qué es HispaloShop?, Centro de ayuda, Términos, Privacidad
  - Footer: Configuración, Cerrar sesión
- Todos los items traducibles ES/EN/KO
- Menú acepta configuración reactiva (si usuario cambia rol, el menú se adapta)

**Dependencias:** 0.1
**Estimación:** 2 días

---

# FASE 1 — CONSUMER (semana 3-7)

> El usuario final debe sentir HispaloShop impecable. Cada click debe ser intencional.

## 1.1 — Onboarding & Registration (consumer)
**Objetivo:** Primera impresión. 60 segundos desde landing hasta feed personalizado.

**Archivos clave:**
- Backend: `routes/auth.py`, `routes/onboarding.py`
- Frontend: `pages/register/consumer/*`, `pages/OnboardingPage.tsx`, `components/ConsentLayers.tsx`

**Done cuando:**
- Flow completo: landing → registro (email o OAuth Google/Apple) → verificación email → onboarding (nombre, avatar, país auto-detectado por IP, intereses, feed mode) → primer feed
- Consent GDPR explícito antes de tracking
- OAuth funciona para Google + Apple
- Tradución ES/EN/KO 100%
- Validación de email con código de 6 dígitos (no link) — más seguro y fácil
- Smooth animations, zero jank
- Mobile-first design testeado en iPhone SE hasta iPad
- Skip onboarding accesible pero no estimulado

**Dependencias:** 0.1, 0.2
**Estimación:** 4-5 días

---

## 1.2 — Discover page (REBUILD completo)
**Objetivo:** Rebuild desde cero. Página dedicada al descubrimiento curado. Separada del Home feed social.

**Filosofía**: Discover NO es el feed de stories/posts/reels. Discover es Pinterest + Airbnb para HispaloShop.

**Archivos clave:**
- Backend: `routes/discovery.py` (nuevo endpoint bundle), `services/feed_algorithm.py`
- Frontend: `pages/DiscoverPage.tsx` (rewrite completo), `components/discover/*` (nuevos componentes)
- Eliminar: componentes antiguos de DiscoverPage que no se reutilicen

**Estructura nueva:**
```
[Search bar prominente y siempre visible al top]
[Chips filter: Todo | Productos | Tiendas | Comunidades | Recetas | Creators]

🌱 Temporada ahora → carrusel horizontal (seasonal + país)
📍 Cerca de ti → carrusel horizontal (productores del país)
💡 Para ti → grid 2 cols (algoritmo + interests)
🏘️ Comunidades trending → carrusel de cards
✨ Nuevos productores → carrusel de avatares grandes (últimos 7 días)
🍳 Recetas de la semana → carrusel
🔥 Trending creators → avatars con follow button
🗺️ Mapa de productores → preview tap para full-screen
```

**Eliminar del actual:**
- Tira de categorías fijas estáticas (usuario puede buscar categoría)
- Widget "Elite stores" auto-advance (lo movemos a "Productores destacados")
- Cualquier inyección que no esté en la nueva estructura

**Done cuando:**
- Rewrite completo de `DiscoverPage.tsx`
- Endpoint `GET /discover/bundle?country=ES&lang=es` que devuelve TODAS las secciones en una sola llamada (reduce waterfall)
- Cada sección es **dismissible** ("no me interesa") y el algoritmo aprende
- Seasonal automático por hemisferio (España primavera, KR otoño en marzo)
- Skeleton states bonitos
- Empty states con CTAs ("Aún no hay productos en tu zona, descubre de otros países")
- Infinite scroll en la sección "Para ti"
- Pull-to-refresh en mobile
- Mapa con productores visibles (preview + full-screen) — Airbnb-style
- Code muerto del Discover antiguo eliminado
- Performance: Lighthouse >85 en mobile

**Dependencias:** 1.1
**Estimación:** 5-6 días

---

## 1.3 — Search & Filters
**Objetivo:** Buscar lo que quieres en 2 segundos. Autocomplete + historial + filtros potentes.

**Archivos clave:**
- Backend: `routes/search.py`, `routes/discovery.py` (trending)
- Frontend: `pages/SearchPage.tsx`, `components/search/*`

**Done cuando:**
- Autocomplete <200ms (MongoDB `$text` index ya creado)
- Filtros: categoría, precio (slider), certificaciones (orgánico, vegan, halal, gluten-free, km0), país de origen, stock, envío gratis
- Sort: relevance, precio asc/desc, newest, mejor valorados
- Tabs: Todos / Productos / Tiendas / Creators / Recetas
- Historial de búsqueda persistente
- Trending queries reales (no hardcoded)
- "Búsqueda sin resultados" muestra alternativas
- Filtros aplicados se ven claramente, 1-tap para limpiar

**Dependencias:** 1.2
**Estimación:** 3 días

---

## 1.4 — Product detail page
**Objetivo:** La página donde se decide la compra. Storytelling + confianza + CTA claro.

**Archivos clave:**
- Backend: `routes/products.py`
- Frontend: `pages/ProductDetailPage.js`, `components/product/*`

**Done cuando:**
- Hero: galería de imágenes (swipe), video si existe, badges (km0, orgánico, nuevo)
- Título + precio + stock + selector de variante/pack
- Productor card: avatar + nombre + ubicación + CTA "Ver tienda" + seguir
- Descripción con secciones (descripción, ingredientes, alérgenos EU 14, info nutricional, cómo se usa)
- Reviews + rating promedio visible
- "Otros productos de este productor" carrusel
- "Productos relacionados" sección
- Sticky bottom bar con precio + botón "Añadir al carrito"
- Share button (WhatsApp, IG, link copy)
- Social proof: "X personas compraron esto esta semana"
- Traducción de descripción on-demand si está en otro idioma (usando Claude)

**Dependencias:** 1.3
**Estimación:** 4-5 días

---

## 1.4b — Digital Certificate & HispaloTranslate (product translation engine)
**Objetivo:** Cada producto genera automáticamente un certificado digital multi-idioma con QR descargable. HispaloTranslate es el motor de traducción propio con cache que aprende con el uso — traduce contenido del vendedor una vez y reutiliza fragmentos para futuros productos.

**Por qué es killer feature:** Un turista coreano en un supermercado de Madrid escanea el QR del aceite → ve toda la info en coreano → botón "Comprar online" → HispaloShop gana un usuario. Canal de acquisition orgánico desde cada producto físico en el mundo.

**Archivos clave:**
- Backend:
  - Nuevo `services/hispalo_translate.py` — motor de traducción con cache MongoDB
  - Nuevo `routes/certificates_public.py` — página pública `/c/{product_id}` sin auth
  - Nuevo `services/certificate_generator.py` — generación de QR + certificado
  - Extender `routes/products.py` — trigger traducción auto al publicar/aprobar
  - Colecciones: `translation_cache`, `certificate_scans`
- Frontend:
  - Nuevo `pages/CertificatePage.tsx` — vista pública del certificado (compacta, mobile-first)
  - Extender `pages/producer/ProducerProducts.tsx` — botón descargar QR por producto
  - Nuevo widget analytics de escaneos en producer dashboard

**HispaloTranslate — motor de traducción:**
- Colección `translation_cache`: source_text + source_lang + translations map + category + confidence + usage_count
- Flujo: tokenizar texto → buscar fragmentos en cache → solo traducir con Claude lo que falta → guardar nuevos fragmentos
- Pre-seed al lanzar: 14 alérgenos EU + 20 labels nutricionales + 16 categorías + 10 certificaciones + 135 países (en ES/EN/KO)
- Cache hit rate esperado: 30% mes 1 → 90% mes 6
- Coste estimado: ~$5/mes cayendo a ~$0.50/mes con escala

**Contenido traducido auto al publicar:**
- Nombre producto, descripción, ingredientes, valores nutricionales (labels), alérgenos, certificaciones, bio/historia productor, nombre tienda, recetas (título + ingredientes)

**Contenido traducido on-demand (botón "Traducir"):**
- Posts del feed, reviews, bio larga de tienda

**NO traducir:** Chat messages (privado, cada quien habla su idioma)

**Página del certificado digital (`/c/{product_id}`):**
- Auto-detecta idioma del dispositivo (Accept-Language header)
- Diseño compacto (cabe en pantalla móvil sin scroll excesivo)
- Contenido: foto + nombre + ingredientes + valores nutricionales + alérgenos + certificaciones + sobre el productor
- 2 CTAs al fondo: "Comprar online" (→ ProductDetailPage) + "Ver tienda" (→ StorePage)
- Buscador integrado para encontrar productos si accedes a la sección general `/certificates`
- Analytics: registra cada escaneo con idioma + país + timestamp

**QR descargable para productores:**
- Dashboard del productor → por producto → botón "Descargar QR"
- Formatos: PNG (300x300), SVG (vectorial para imprimir), PDF (con marco para pegar)
- QR apunta a `hispaloshop.com/c/{product_id}`

**Analytics de escaneos (V1):**
- Colección `certificate_scans` con: product_id, language, country (del IP), timestamp
- Dashboard productor → sección certificados:
  - Total escaneos por producto
  - Top idiomas (pie chart)
  - Top países (lista)
  - Gráfica por día (últimos 30 días)

**Super admin → HispaloTranslate dashboard:**
- Total fragmentos en cache
- Idiomas cubiertos con %
- Cache hit rate semanal
- Coste Claude semanal estimado
- Fragmentos con confidence=low (necesitan revisión)

**Done cuando:**
- HispaloTranslate servicio funcional con cache + pre-seed
- Traducción auto al publicar producto funcional (name + desc + ingredients + nutrition + allergens + certs + bio)
- Página pública `/c/{product_id}` renderiza en idioma del dispositivo
- QR code generado y descargable por producto
- Analytics de escaneos registrando idioma + país
- Botón "Traducir" on-demand para posts/reviews
- Pre-seed de ~200 fragmentos estándar alimentarios
- Tests: verificar traducción de producto nuevo, verificar cache hit en segundo producto similar
- Responsive mobile + desktop

**Dependencias:** 1.4 (Product detail page), 2.3 (Product management)
**Estimación:** 5-6 días

---

## 1.5 — Cart & multi-producer handling
**Objetivo:** Carrito claro cuando compras de 3 productores distintos (shipping separado, estimación clara).

**Archivos clave:**
- Backend: `routes/cart.py`
- Frontend: `pages/CartPage.js`, `context/CartContext.js`, `components/MiniCart.js`

**Done cuando:**
- Items agrupados visualmente por productor (como Amazon)
- Shipping calculado por productor, total visible
- Sumatorio claro: subtotal, envío, descuentos aplicados, total
- Aplicar/quitar cupón con feedback inmediato
- Guest cart persistente en localStorage
- Merge guest+logged cart en login
- Actualización optimista de cantidades
- Stock validation en tiempo real (toast si algo se agota)
- Empty state con "Descubre" CTA
- Cross-sell: "Añade 5€ más y envío gratis del productor X"

**Dependencias:** 1.4
**Estimación:** 3 días

---

## 1.6 — Checkout flow
**Objetivo:** 2-3 taps desde carrito a confirmación. Zero fricción.

**Archivos clave:**
- Backend: `routes/orders.py` (checkout creation, payment intent)
- Frontend: `pages/checkout/CheckoutPage.jsx`, `pages/checkout/CheckoutSuccess.js`

**Done cuando:**
- Step 1: Dirección (autocomplete Google Places o equivalente, guardada para futuro)
- Step 2: Método de envío por productor (si hay opciones)
- Step 3: Pago (Stripe Checkout — tarjeta, Apple Pay, Google Pay, SEPA)
- Orden creada antes del pago con status `pending_payment`
- Webhook Stripe actualiza a `paid` y dispara notificaciones
- Success page con order ID + tracking esperado + "Conoce al productor"
- Error handling: 3DS failed, insufficient funds, card declined → mensajes claros con retry
- Email de confirmación enviado automáticamente
- Push notification al consumer + productor
- Contabilidad: split commissions correctamente (20/18/17 seller + 3/5/7 influencer + 10% primera compra)

**Dependencias:** 1.5, payments (3.1)
**Estimación:** 5-6 días

---

## 1.7 — Order tracking & history
**Objetivo:** Después de comprar, el consumer quiere saber exactamente dónde está su pedido.

**Archivos clave:**
- Backend: `routes/orders.py` (tracking endpoints)
- Frontend: `pages/OrderHistoryPage.tsx`, `pages/OrderDetailPage.tsx`

**Done cuando:**
- Lista de pedidos con thumbnail, estado, fecha
- Detalle: timeline visual (paid → preparing → shipped → delivered)
- Tracking URL del productor (si lo añadió)
- CTA: "Contactar al productor" (abre chat interno)
- CTA: "Reportar problema" → crea support ticket
- CTA: "Reordenar" (1-tap)
- CTA: "Dejar reseña" cuando `status=delivered`
- Mostrar desglose de precios + comisión visible (transparencia radical)
- PDF de factura descargable

**Dependencias:** 1.6
**Estimación:** 3 días

---

## 1.8 — Reviews & Ratings
**Objetivo:** Sistema de reseñas honesto que afecta al feed algorithm y a la confianza.

**Archivos clave:**
- Backend: `routes/recipes_reviews.py` (o crear `routes/reviews.py`), `services/feed_algorithm.py`
- Frontend: `components/reviews/*`, `pages/ReviewCreatePage.tsx`

**Done cuando:**
- Solo consumidores con `status=delivered` pueden reseñar
- 1-5 estrellas + texto + hasta 3 fotos
- Rating promedio visible en product detail y tienda
- Reviews ordenables: recientes / más útiles / destacadas
- Productor puede responder una vez
- Moderación: IA filtra spam, profanity, fake reviews
- Review afecta al feed: productos con >4.5 stars boost, <3 stars penalization
- "Verified purchase" badge automático

**Dependencias:** 1.7
**Estimación:** 3 días

---

## 1.9 — User profile & settings
**Objetivo:** El consumer puede editar todo lo suyo sin contactar soporte.

**Archivos clave:**
- Backend: `routes/customer.py`, `routes/config.py`
- Frontend: `pages/settings/*`, `pages/customer/CustomerProfile.tsx`

**Done cuando:**
- Editar: nombre, avatar, bio, email, password, phone
- Preferencias: idioma, moneda, país de envío, tema (siempre light por ahora)
- Direcciones guardadas (CRUD)
- Métodos de pago (Stripe Customer portal embedded)
- Privacidad: ver consent, retirar consent, descargar mis datos (GDPR), eliminar cuenta
- Notificaciones: on/off por canal (push, email, in-app) y por tipo
- Quiet hours configurables
- Gamification: nivel XP + streak + weekly goal progress
- Mis listas (wishlist, comprados, guardados)

**Dependencias:** 1.1
**Estimación:** 3-4 días

---

## 1.10 — Notifications center
**Objetivo:** Todas las notificaciones en un solo sitio, categorizadas, accionables.

**Archivos clave:**
- Backend: `routes/notifications.py`, `services/notifications/dispatcher_service.py`
- Frontend: `pages/NotificationsPage.tsx`, `components/NotificationBell.js`

**Done cuando:**
- Inbox agrupado por categoría (pedidos, social, promociones, sistema)
- Mark as read individual + batch
- Click → navegación al contexto (orden, post, perfil)
- Push notifications via FCM v1 (ya implementado)
- Email notifications con plantilla B&W stone consistent
- Quiet hours respetadas (no push en horario de sueño)
- Unsubscribe link en emails de marketing
- Badge count real-time (websocket o polling)

**Dependencias:** 1.1, 1.9
**Estimación:** 2-3 días

---

## 1.11 — Home feed (PURAMENTE SOCIAL — Instagram-like)
**Objetivo:** Home feed limpio estilo Instagram. Solo stories, posts y reels. Nada de widgets, injections o recommendations inline.

**Filosofía**: Cuando el consumer abre la app, ve contenido social — nada más. Todo lo curado (seasonal, communities, recipes, etc.) vive en Discover. Home es donde quieres scrollear relajado.

**Archivos clave:**
- Backend: `routes/social.py`, `routes/feed.py`, `services/feed_algorithm.py`
- Frontend: `pages/FeedPage.tsx`, `components/feed/ForYouFeed.js`, `components/feed/FollowingFeed.js`, `pages/create/*`

**Estructura del Home:**
```
┌─────────────────────────────────┐
│ [Stories strip top]             │  ← carrusel horizontal 1:1 cuadrado
│ ⓘ Tu story · María · Pedro...   │
├─────────────────────────────────┤
│ [Tabs: Siguiendo | Para ti]     │
├─────────────────────────────────┤
│ Post card (carousel imagenes)   │
│ Reel card (video 9:16)          │
│ Post card                       │
│ Reel card                       │
│ [Ad sutil cada ~20 items]       │
│ Post card                       │
│ ...infinite scroll              │
└─────────────────────────────────┘
```

**ELIMINAR del código actual:**
- `WeeklySummaryCard` en ForYouFeed.js (línea 249-263)
- `SuggestedUsersCard` injection cada 10 posts
- `SponsoredProductCard` inline (se convertirá en "ad sutil" cada 20 posts, no producto inline)
- `FeedRecipeCard` cada 15 posts (recetas viven en Discover + detail page)
- `nextReelUrlByIndex` prefetch complejo (mantener pero simplificar)
- Cualquier otro widget que no sea story/post/reel/ad sutil

**Done cuando:**
- 2 feeds: Following / For You (Category elimina del Home, se accede desde Discover)
- Posts (carousel de imágenes con filtros), Reels (video vertical 9:16), Stories (cuadrado 1:1, caducan 24h)
- Like, comment, save, share funcionales
- Tag products en posts/reels (shoppable content)
- Following feed solo muestra quien sigues (vacío → CTA "Sigue a tu primer productor en Discover")
- For You usa FeedAlgorithm con todas las señales (signals ya implementados)
- Infinite scroll con prefetch de siguiente reel (optimizado)
- Dwell time tracking para mejorar personalización
- Mute, report, block
- Sonido on/off (reels con audio, stories silenciadas por defecto)
- Hashtags + mentions navegables
- Ads sutiles cada 20 posts (diseño como Instagram ads, no intrusivos)
- Zero widgets/injections que no sean content social

**Dependencias:** 1.2 (Discover ya existe antes de limpiar Home)
**Estimación:** 4-5 días (limpieza + pulir, el código base ya existe)

---

## 1.12 — Content creation (creator studio)
**Objetivo:** El consumer/creator puede publicar posts, reels, stories de forma pulida.

**Archivos clave:**
- Backend: `routes/social.py` (upload endpoints), `services/video_service.py`
- Frontend: `pages/CreatePostPage.tsx`, `pages/CreateReelPage.tsx`, `pages/CreateStoryPage.tsx`, `components/creator/*`

**Done cuando:**
- Upload de 1-10 imágenes (carousel), trimmer de video, captura de story
- Filtros CSS predefinidos (Natural, Amanecer, Lonja, Huerta, Miel, Trufa, Mate, Antiguo)
- Ajustes (brillo, contraste, saturación, warmth, shadows, highlights, sharpness, vignette)
- Aspect ratios (1:1, 4:5, 16:9, original)
- Texto, stickers, productos taggeados, ubicación, música (por ahora solo copyright-free)
- Upload queue con progress real
- Drafts
- Publicación programada (opcional V1)
- Moderación automática con IA antes de publicar

**Dependencias:** 1.11
**Estimación:** 5-6 días (ya hay trabajo previo)

---

## 1.13 — Chat / DMs + Groups + Audio messages (polish completo)
**Objetivo:** Chat profesional y pulido. Fix los 3 bugs identificados + añadir groups + audio messages efímeros.

**Archivos clave:**
- Backend: `routes/conversations.py`, `services/chat/*`, `routes/social.py` (message endpoints), nuevo `routes/chat_groups.py`
- Frontend: `components/InternalChat.js` (rewrite del bubble), `components/chat/*`, nuevos `components/chat/audio/*`, `components/chat/groups/*`

**FIX bugs identificados:**
1. **Burbuja del chat no se ajusta al texto** (crítico)
   - Problema actual: burbuja tiene width fijo o mal configurado
   - Fix: `inline-block` + `max-width: 75%` + `word-break: break-word` + `white-space: pre-wrap`
   - Test: mensaje corto 3 chars → burbuja pequeña. Mensaje largo multi-línea → crece hasta max-width y wrappea.
2. **Reacciones a stories no muestran a qué story** (crítico)
   - Problema: cuando reaccionas a una story de otro usuario, en su chat aparece "reaccionó con ❤️" pero no ves a cuál.
   - Fix: Al enviar reacción, incluir `story_thumbnail_url` + `story_text` (primeros 40 chars si tiene caption) + `story_expires_at` en el mensaje.
   - En la burbuja de reacción, mostrar thumbnail pequeño + emoji grande. Tap abre la story si aún no ha expirado.
3. **Menú de adjuntar solo muestra "Imagen"**
   - Problema: Botón "+" solo permite imagen, usuario se confunde pensando que no hay más.
   - Fix: Menú con grid de opciones claras: **📷 Imagen, 🎙️ Audio, 🛒 Producto, 📍 Ubicación, 💝 Wishlist, 📄 Documento**
   - Cada opción con icon + label + action

**NUEVAS features:**

### Audio messages
- **Recorder**: push-to-talk (hold) o tap-to-record (toggle). Max duration 2 minutos (hard cap con countdown visible).
- **Cancel gesture**: swipe left para cancelar durante recording.
- **Waveform preview** antes de enviar + botón delete/send.
- **Player**: WaveSurfer.js con play/pause/scrub, duración visible.
- **Auto-delete**:
  - Audios >2 min rejected en upload (client + server validation)
  - Cron diario: elimina audios >30 días
  - Cron diario: también elimina audios >1min que tengan >7 días (purga agresiva de largos)
  - Al eliminar, el mensaje se mantiene pero muestra "🎙️ Audio expirado" en su lugar
- **Permisos**: prompt claro "HispaloShop necesita acceso al micrófono para enviar audios"
- **Subida**: a Cloudinary con `resource_type: video` (Cloudinary trata audios como video)
- **Indicador al enviar**: "Este audio se elimina en 30 días"

### Chat groups
- **Tipo 1: Grupos privados** (creados por usuario)
  - Max 20 miembros
  - Creador = admin inicial
  - Admin puede: cambiar nombre/avatar, añadir/remove miembros, dejar el grupo (si deja, hay que designar nuevo admin antes)
  - Members pueden: dejar, silenciar
- **Tipo 2: Grupos de comunidad** (asociados a una community)
  - Auto-creado al crear la comunidad
  - **Opt-in** para join (al unirte a la comunidad NO entras en el chat por defecto)
  - Max 500 miembros
  - Admin = owner de la comunidad
  - Invitación desde community page: "Activar chat de esta comunidad"
- **Features comunes a ambos**:
  - Nombre, avatar, descripción
  - Mensajes: texto, emojis, imágenes, audio efímero, productos, wishlists, ubicación, documentos
  - Menciones @usuario (solo miembros)
  - Read receipts (checkmark doble visto por N usuarios)
  - Typing indicators
  - Mute notifications del grupo
  - Leave group
  - Report group (al admin de plataforma)

### Flujos adicionales
- **Request inbox separado** (desconocidos): mensajes de usuarios que no siguen mutuamente van a carpeta "Solicitudes". Usuario acepta/rechaza. Si rechaza 3 veces del mismo, block auto-sugerido.
- **DM behavior**: 
  - Si sigues al usuario O él te sigue O son amigos → mensaje va directo a inbox principal
  - Si ninguno → va a Request Inbox

**Done cuando:**
- Bubble renderiza correctamente con texto de cualquier longitud
- Reacciones a stories muestran thumbnail del post al que reaccionaste
- Menú de archivos con 6 opciones claras
- Audio recorder funciona con cap 2 min + cancel gesture
- Audio player con waveform
- Auto-delete cron configurado y testeado
- Grupos privados hasta 20 miembros funcional (CRUD, invite, leave, admin)
- Grupos de comunidad opt-in hasta 500 miembros funcional
- Request inbox separa desconocidos de followed
- Read receipts, typing indicators, push notifications
- Search dentro de chats
- Archivar, silenciar, reportar, bloquear
- Online/offline respeta privacy settings
- Tests E2E de los flows principales

**Dependencias:** 1.9
**Estimación:** 7-8 días (era 4-5, pero ahora incluye audio + groups)

---

## 1.14 — David AI (consumer assistant)
**Objetivo:** Nutricionista/chef personal disponible 24/7 como widget flotante. Personalidad definida.

**Archivos clave:**
- Backend: `routes/hispal_ai.py`, `services/hispal_ai_tools.py`
- Frontend: `components/ai/HispalAI.js`

**Done cuando:**
- Widget flotante global, accesible desde cualquier página post-login
- Personalidad David: nutricionista/chef/vendedor empático, cercano, tuteo
- 5 tools funcionales: search_products, add_to_cart, get_user_profile, get_cart_summary, get_product_detail
- Memoria persistente en `db.ai_profiles` (dieta, alergias, objetivos, presupuesto, restricciones)
- Auto-detección de preferencias desde conversación natural
- Smart cart commands: "añade todo lo necesario para una paella para 4"
- Multi-idioma automático (detecta idioma del usuario)
- Streaming de respuestas (UX moderna)
- Historial de conversaciones persistente
- Rate limiting: 20 RPM per user

**Dependencias:** 1.4, 1.5
**Estimación:** 3-4 días

---

## 1.15 — Communities (audit + polish + 2 tipos)
**Objetivo:** Auditar el código existente de comunidades (ya hiciste 8 ciclos de redesign) y pulir lo que falta. Confirmar los 2 tipos finales.

**Archivos clave:**
- Backend: `routes/communities.py`, modelos de Community, CommunityPost, CommunityMember
- Frontend: `pages/communities/*`, `components/community/*`

**2 tipos de comunidades V1:**
1. **Comunidad de productor/vendedor** (auto-creada)
   - Se crea automáticamente cuando un productor completa onboarding
   - Owner = el productor, modera
   - Clientes que siguen al productor pueden unirse
   - Productor publica: ofertas, historias del producto, novedades, detrás de cámaras
   - Badge: "Oficial del productor"
2. **Comunidades abiertas** (creadas por cualquier usuario)
   - Cualquier usuario crea, modera
   - Máx **3 comunidades por usuario** (anti-spam)
   - Activa al momento, ban por reports (sin review previo)
   - Ejemplo: "Recetas sin gluten", "Padres foodies de Madrid", "Amantes del queso manchego"

**HispaloShop NO crea comunidades oficiales** (decisión de producto).

**Done cuando:**
- Audit completo del código existente de comunidades
- Schema confirmado con los 2 tipos (`type: "producer" | "open"`)
- Owner/mods/members roles funcionales
- CRUD de comunidad: crear, editar cover/bio, cambiar moderators, archivar
- Posts dentro de comunidad: texto, imágenes, productos taggeados, recipes
- Miembros: join, leave, list, kick (admin)
- Reports de comunidad → admin local del país revisa → ban si aplica
- Límite 3 comunidades abiertas por usuario (backend valida)
- Chat de comunidad opt-in con max 500 miembros (ver 1.13)
- Descubrimiento: en Discover page sección "Comunidades trending"
- Notificaciones opt-in por comunidad (no spam default)
- Analytics para owner: miembros, posts, engagement

**Dependencias:** 1.2, 1.13
**Estimación:** 4-5 días (polish + additions sobre código existente)

---

## 1.16 — Recipes con ingredientes comprables (KILLER feature)
**Objetivo:** Implementación completa de recetas con ingredientes vinculados a productos reales. Cada ingrediente es comprable.

**Filosofía**: Es el feature diferenciador de HispaloShop. Alineado al mission "comer mejor y saber quién está detrás". Ninguna plataforma lo hace bien.

**Archivos clave:**
- Backend: `routes/recipes.py` (nuevo o renombrar desde `recipes_reviews.py`), `models/Recipe`, endpoints CRUD + search
- Frontend: 
  - `pages/CreateRecipePage.tsx` (rewrite o crear con product picker)
  - `pages/RecipeDetailPage.tsx` (rewrite con ingredients-buy section)
  - `pages/RecipesListPage.tsx`
  - `components/recipe/*` (IngredientRow, IngredientProductPicker, RecipeCard)

**Modelo de datos:**
```python
Recipe {
  recipe_id, slug, title, description, cover_image, author_id,
  servings: int,
  prep_time_minutes: int,
  cook_time_minutes: int,
  difficulty: "easy|medium|hard",
  category: "main|dessert|breakfast|snack|drink",
  tags: [string],  # vegan, gluten-free, keto, halal, etc.
  language: "es|en|ko",

  ingredients: [
    {
      name: "Aceite de oliva virgen extra",
      quantity: "100",
      unit: "ml",
      # Vinculación a producto(s)
      product_id: "prod_abc123",  # principal elegido por el creator
      alternative_product_ids: ["prod_def456"],  # opciones
      # Si no hay producto vinculado (ingredientes genéricos como "sal")
      is_generic: bool,
      is_optional: bool,
      search_tags: ["aceite", "oliva", "virgen extra"],  # para auto-suggest
    }
  ],

  instructions: [
    { step: 1, text: "...", image_url: "..." },
  ],

  nutrition: {...},  # opcional
  ratings: { avg: 4.5, count: 23 },
  views_count, likes_count, saves_count,
  created_at, updated_at, published_at,
}
```

**Recipe viewer UI:**
```
[Hero image + título + autor + servings + tiempo + dificultad]
[Tabs: Ingredientes | Preparación | Reseñas]

INGREDIENTES
☑️ 1kg tomates maduros
   └─ [foto] Tomates de Andalucía — Pedro J. — €3.50/kg
      [+ Añadir] [Ver 2 alternativas]
☑️ 100ml aceite de oliva virgen
   └─ [foto] AOVE Finca Las Peñas — €8/500ml
      [+ Añadir]
☑️ 1 pizca de sal (ingrediente básico, no vinculado)
...

[AÑADIR TODOS LOS INGREDIENTES AL CARRITO]
Total: €24.50 · 6 items de 4 productores
```

**Creator flow:**
1. Usuario crea receta: título, descripción, servings, tiempo, cover image
2. Añade ingredientes uno por uno. Para cada uno:
   - Escribe nombre + cantidad + unidad
   - Botón "Vincular producto" abre search modal
   - Search modal permite buscar por nombre o usar **"Auto-sugerir con IA"** (Claude busca productos candidatos basados en el texto del ingrediente)
   - Creator elige producto principal + alternativas (opcional)
   - O marca como "ingrediente genérico" (sal, agua, pimienta) sin vincular
3. Añade instrucciones paso a paso (texto + imagen opcional por paso)
4. Selecciona categoría, tags dietéticos, idioma
5. Preview antes de publicar
6. Publicar → moderación IA → activo

**Quién puede crear recetas:**
- Consumers (cualquiera)
- Productores (recetas que usan sus productos — marketing)
- Influencers (recetas curadas)
- Staff HispaloShop (recetas editoriales)

**Casos especiales:**
- Ingrediente sin producto vinculado → muestra texto plano sin CTA (ej: "sal")
- Stock agotado del producto → tachado con alternativa sugerida
- Producto no disponible en el país del viewer → sugiere alternativa local automáticamente
- Receta en otro idioma → opción "Traducir con IA" (Claude) bajo demanda

**Done cuando:**
- Audit del código actual de recetas (puede existir algo, hay que verificar)
- Schema implementado con ingredients estructurados
- Backend endpoints: CRUD recipe, search recipes, get recipe with products populated, add all ingredients to cart, auto-suggest products for ingredient
- Frontend creator con IngredientProductPicker funcional + botón Autosuggest
- Frontend viewer con botón "Añadir al carrito" por ingrediente + bulk "Añadir todos"
- Bulk add handle multi-producer cart correctamente
- Seasonal + categoría + language filters en la lista de recetas
- Integración con Discover page (carrusel "Recetas de la semana")
- Rating + reviews sobre recetas
- Save recipe a wishlist/guardados
- Share recipe (link + WhatsApp + IG)
- Moderación IA antes de publicar
- Traducción on-demand con Claude (optional)

**Dependencias:** 1.4, 1.5, 1.12 (creator studio para multimedia)
**Estimación:** 8-9 días

---

## 1.17 — Wishlists compartibles
**Objetivo:** Listas de productos que el usuario crea, guarda y comparte.

**Archivos clave:**
- Backend: `routes/wishlists.py` (nuevo), `models/Wishlist`
- Frontend: 
  - `pages/WishlistsPage.tsx` (lista de mis wishlists)
  - `pages/WishlistDetailPage.tsx` (detalle editable)
  - `pages/WishlistSharedPage.tsx` (vista pública con slug)
  - `components/wishlist/AddToWishlistModal.tsx`
- Integration en `pages/customer/CustomerProfile.tsx` (tab "Guardados" amplía)
- Integration en hamburger menu

**Ubicación final (decisión del fundador — Opción 1 + Opción 3 combinadas):**
1. **Entry principal**: Perfil del usuario → tab "Guardados" (amplía el existente para incluir listas)
2. **Entry secundario**: Hamburger menu → "Guardados y listas"
3. **Add to wishlist desde**: Product detail page (botón abre modal con sus listas + crear nueva)
4. **Share desde**: Chat (enviar wishlist como mensaje con preview), Social (share link), QR code

**Modelo de datos:**
```python
Wishlist {
  wishlist_id, slug,  # slug auto-generado para URL shareable
  owner_id,
  title, description, cover_image (optional),
  is_public: bool,  # si es público, shareable link funciona
  collaborative: bool,  # si otros pueden añadir items (V1 = false, V2 = true)
  items: [
    {
      product_id,
      added_at,
      note (optional, texto libre),
      marked_as_purchased: bool,  # para wedding registry-style
      marked_by: user_id (si alguien compró el item),
    }
  ],
  created_at, updated_at,
}
```

**Features V1:**
- CRUD básico: crear, editar, eliminar wishlist
- Añadir/quitar productos
- Marcar item como comprado (evita duplicados)
- Shareable link público (`hispaloshop.com/w/{slug}`)
- View pública no requiere login (ver), requiere login para comprar
- Share via: copy link, WhatsApp, Instagram, QR code
- Send wishlist por chat a un amigo
- "Comprar todos los items disponibles" (añade al carrito masivo)
- Límite: 20 wishlists por usuario, 200 items por wishlist (anti-spam)

**NO en V1 (V2):**
- Collaborative wishlists (varios usuarios editan)
- Reservations (para boda: amigos reservan items para no comprar duplicados)
- Wishlists por categoría con templates

**Done cuando:**
- `models/Wishlist` creado
- Backend CRUD + share endpoints
- Frontend pages: lista, detalle, vista pública
- Integration en profile tab "Guardados" (amplía existente)
- Hamburger menu actualizado
- Modal "Añadir a lista" en product detail
- Share functionality (link, QR, chat)
- "Comprar todos" funcional con multi-producer cart
- SEO: wishlists públicas indexables con meta tags
- Tests E2E: crear wishlist, añadir item, compartir, comprar

**Dependencias:** 1.4, 1.5, 1.9, 1.13
**Estimación:** 4 días

---

## 1.18 — Ambassadors public section (Influencers visibility)
**Objetivo:** Sección pública donde los consumers ven a los influencers de HispaloShop. Humaniza la plataforma, alinea con el DNA "personal".

**Archivos clave:**
- Backend: `routes/directory.py` (ya existe, extender con endpoint de ambassadors)
- Frontend: nueva `pages/AmbassadorsPage.tsx`, link desde Discover

**Estructura:**
```
[Header: "Embajadores HispaloShop"]
[Copy: "Personas que te ayudan a descubrir productos reales"]

[Filtros: Todos | Por país | Por categoría/nicho | Tier]

[Grid de cards de ambassadors]
  ┌─────────────────┐
  │ [avatar grande] │
  │ María García    │
  │ @maria_foodie   │
  │ 📍 Madrid        │
  │ 12K ventas · ⭐ Zeus │
  │ [Seguir]         │
  └─────────────────┘

[Featured ambassador del mes]
[Testimonios de cómo vives de esto en HispaloShop]
```

**Perfil público del ambassador:**
- Avatar grande, bio, ubicación
- Tier actual visible (Hercules/Atenea/Zeus)
- Código de descuento personal
- Productos que ha destacado en sus posts (últimos 10)
- Recetas que ha creado
- Stories/Reels/Posts recientes dentro de HispaloShop
- Botón "Seguir" + botón "Usar mi código"

**Done cuando:**
- Backend endpoint `GET /ambassadors?country=&tier=&limit=`
- Frontend page con filtros funcionales
- Public profile route `/@username` muestra ambassador view si el user tiene rol influencer
- Featured ambassador lógica (admin selecciona uno por país mensualmente)
- SEO optimized (indexable, schema Person)
- Link a la sección desde Discover page

**Dependencias:** 2.11, 2.12
**Estimación:** 2-3 días

---

## 1.20 — Universal Search (híbrido global + contextual)
**Objetivo:** Un solo buscador universal en el header (global) + buscadores contextuales dentro de cada sección. El usuario encuentra usuarios, tiendas, comunidades, hashtags, productos, recetas, posts en <200ms.

**Arquitectura (decisión cerrada — Opción C híbrida):**
- **Search global**: ícono 🔍 en el header de todas las páginas (desktop + mobile) → abre overlay de búsqueda universal
- **Search contextual**: dentro de Stores page, el buscador solo filtra tiendas. Dentro de Communities, solo comunidades. Cada entidad tiene su propio search.

**Archivos clave:**
- Backend: `routes/search.py` (ya existe, extender), nuevos endpoints universales
- Frontend:
  - `components/search/GlobalSearchModal.tsx` (overlay universal accesible desde header)
  - `components/search/ContextualSearch.tsx` (componente reutilizable dentro de secciones)
  - `pages/SearchPage.tsx` (rewrite para usar el nuevo universal)

**Entidades buscables:**
- **Usuarios** (por `@username` público únicamente — decisión cerrada)
- **Tiendas** (por nombre)
- **Comunidades** (por nombre)
- **Hashtags** (por `#tag`)
- **Productos** (por nombre)
- **Recetas** (por título)
- **Posts/Reels** (por caption + hashtags)

**NO buscable V1** (decisión cerrada):
- Bios de usuarios (full-text)
- Descripciones de tiendas o comunidades (full-text)
- Contenido completo de posts
- User_id técnico (solo admins desde admin panel)

**UI del search overlay global:**
```
┌─────────────────────────────────┐
│ 🔍 [Buscar...]            [Esc]│
├─────────────────────────────────┤
│ TABS: Todo|Usuarios|Tiendas|    │
│       Comunidades|Hashtags|     │
│       Productos|Recetas         │
├─────────────────────────────────┤
│ [Tab Todo muestra grouped]      │
│                                 │
│ USUARIOS (3)                    │
│ @maria_foodie  [seguir]         │
│ @pedro_olives  [seguir]         │
│                                 │
│ TIENDAS (5)                     │
│ Finca Las Peñas                 │
│ ...                             │
│                                 │
│ HASHTAGS (4)                    │
│ #kmcero (1.2K posts)            │
│ ...                             │
├─────────────────────────────────┤
│ BÚSQUEDAS RECIENTES             │
│ [chip] [chip] [chip]            │
├─────────────────────────────────┤
│ TRENDING EN ESPAÑA 🇪🇸          │
│ [chip] [chip] [chip]            │
└─────────────────────────────────┘
```

**Features:**
- Autocomplete con debounce de 200ms
- Tabs para filtrar tipo de entidad
- Resultados agrupados en tab "Todo"
- **Recent searches** persistentes en localStorage (últimas 10)
- **Trending searches del país** del usuario (real, no hardcoded) — lee de analytics collection
- Keyboard shortcuts desktop: `Ctrl+K` abre search, `Esc` cierra, ↑↓ navega, Enter selecciona
- Voice search: **NO V1** (decisión cerrada)
- Search history: tap en una recent search la re-ejecuta
- Clear history
- "Sin resultados" muestra alternativas ("¿Querías decir...")

**Backend endpoints nuevos:**
- `GET /search/universal?q=X&lang=es&country=ES&limit=20` — devuelve resultados agrupados por tipo
- `GET /search/trending?country=ES` — devuelve trending queries del país
- `POST /search/history` — registra búsqueda del usuario (para personalización)
- `DELETE /search/history` — limpia historial

**Índices Mongo:**
- Text index compuesto sobre products (ya creado en database.py)
- Índice sobre `users.username`
- Índice sobre `stores.name`
- Índice sobre `communities.name`
- Índice sobre `recipes.title` y `recipes.tags`
- Nueva colección `search_history` con TTL de 90 días

**Done cuando:**
- `GlobalSearchModal` accesible desde header en todas las páginas (desktop sidebar + mobile hamburger)
- `Ctrl+K` abre el modal en desktop
- 7 tipos de entidades buscables con resultados agrupados
- Recent searches persistentes
- Trending real del país (no fallback hardcoded)
- Contextual search integrado en Stores, Communities, Recipes, Creators pages
- Responsive desktop + mobile
- Sin resultados muestra sugerencias
- Performance: <200ms p95 response time
- Test E2E: buscar @username, tap resultado, navega al profile

**Dependencias:** 1.2, 1.11
**Estimación:** 4-5 días

---

## 1.21 — Hashtag system completo
**Objetivo:** Los hashtags son ciudadanos de primera clase. Click en #kmcero te lleva a su página con feed de contenido, stats, trending.

**Archivos clave:**
- Backend: nuevo `routes/hashtags.py`, modelo `Hashtag` con counter
- Frontend: `pages/HashtagPage.tsx` (existe parcialmente, rewrite), componentes de hashtag linking

**Features del sistema completo (decisión cerrada — Opción A completa):**

### a) Search por hashtag
- Ya cubierto en 1.20 como una de las 7 entidades buscables

### b) Página dedicada del hashtag
- URL: `hispaloshop.com/tag/{slug}`
- Hero: nombre del hashtag, stats (total posts, stats últimos 7 días)
- Tabs: Top | Recientes | Productos taggeados | Recetas con este tag
- Feed de contenido con ese hashtag
- Botón "Seguir hashtag" (si sigues, aparece contenido de este tag en tu feed For You)
- Share button

### c) Trending hashtags
- Visibles en Discover page (sección "Hashtags trending")
- Cálculo: velocity score (posts con hashtag en últimas 24h / baseline 7 días)
- Top 10 por país
- Cache de 30 min

### d) Autocompletion al crear posts
- Al escribir `#` en un post/reel/story, dropdown con sugerencias
- Muestra hashtags populares + count de posts
- Creator selecciona o sigue escribiendo para crear uno nuevo
- Límite: 30 hashtags por post

### e) Click en hashtag dentro de post
- Cualquier hashtag renderizado en texto es clickable
- Navega a la página del hashtag

**Modelo de datos:**
```python
Hashtag {
  tag: "kmcero",  # lowercase, unique
  slug: "kmcero",
  posts_count: 1247,
  velocity_score: 3.2,
  last_used_at: ts,
  trending_rank: 5,  # por país
  trending_country: "ES",
  created_at: ts,
}
```

**Extracción automática de hashtags:**
- Al publicar post/reel/story, backend extrae hashtags del texto con regex `#[a-zA-Z0-9_]+`
- Normaliza a lowercase
- Incrementa `posts_count` del hashtag
- Crea el hashtag si no existe

**Done cuando:**
- `HashtagPage.tsx` con tabs funcionales
- Autocompletion en creator
- Trending hashtags por país calculado con cron job (cada hora)
- Click en hashtag en posts navega correctamente
- Follow hashtag → aparece en For You del usuario
- Search incluye hashtags (integrado con 1.20)
- Responsive desktop + mobile

**Dependencias:** 1.11 (creator studio), 1.20 (search)
**Estimación:** 3-4 días

---

## 1.19 — Blog editorial light (5-10 landing pages storytelling)
**Objetivo:** 5-10 páginas estáticas de storytelling para SEO + brand narrative. No un CMS completo.

**Archivos clave:**
- Frontend: `pages/blog/*` (páginas estáticas)
- Content: textos redactados (fundador o colaborador) + fotos profesionales

**Contenido tipo:**
- "Pedro Jiménez: el productor de aceite que cambia la economía de un pueblo"
- "De Seúl a Sevilla: cómo un consumidor coreano encontró productos únicos"
- "Qué significa km0 en HispaloShop (y por qué importa)"
- "Conoce los 10 alimentos con historia más pedidos en 2026"
- "Receta del mes: Gazpacho de Carmen, tercera generación"
- "Por qué pagamos a los productores antes que a nosotros mismos"

**Done cuando:**
- 5-10 páginas editoriales creadas con plantilla consistente
- Sistema simple: archivo MDX o JSON por página, Router en `/blog/[slug]`
- SEO optimizado (meta tags, schema Article, OG images)
- Links desde footer + Discover page (sección "Historias")
- Traducciones ES/EN/KO de los artículos principales (mínimo 3 en los 3 idiomas)

**Dependencias:** 0.1
**Estimación:** 3 días (excluyendo tiempo de redacción del fundador)

---

# FASE 2 — SELLERS (semana 8-11)

> Producer, Influencer, Importer. Cada rol con su flujo completo.

## 2.1 — Producer onboarding & verification
**Objetivo:** Un productor se registra, sube documentos, es verificado en <24h (automático + admin local).

**Archivos clave:**
- Backend: `routes/auth.py`, `routes/producer.py`, `services/producer_verification.py`, `services/document_formats.py`
- Frontend: `pages/register/producer/*`, `pages/producer/ProducerVerification.tsx`

**Done cuando:**
- Registro con rol producer, email verification
- Upload de: documento oficial de empresa (por país), foto de instalación, certificados opcionales
- Validación algorítmica por país (NIF/CIF ES, EIN US, SIRET FR, 사업자등록번호 KR) — ya existe
- IA revisa documentos (Claude Haiku vision) — ya existe
- Alta confianza → auto-approved
- Confianza media → cola de admin local del país
- Notificación al productor cuando aprobado/rechazado
- Estado pendiente muestra UI clara: "Tu verificación está en revisión"
- Bloqueado de publicar productos hasta verificado

**Dependencias:** 1.1
**Estimación:** 3-4 días

---

## 2.2 — Producer dashboard & overview
**Objetivo:** Primera pantalla al entrar como productor. KPIs + acciones rápidas.

**Archivos clave:**
- Frontend: `pages/producer/ProducerOverview.tsx`, `components/dashboard/ProducerLayoutResponsive.js`

**Done cuando:**
- H1 con nombre de la empresa
- KPIs: ventas del mes, pedidos pendientes, score de salud, plan actual
- Quick actions: "Subir producto", "Ver pedidos", "Responder reseñas"
- Gráfica de ventas últimos 30 días
- Alertas: productos con stock bajo, certificados por expirar, reseñas sin responder
- "Demanda señalada": productos que los consumidores piden y no están en catálogo
- Notification de Rebeca AI con insight del día

**Dependencias:** 2.1
**Estimación:** 2 días

---

## 2.3 — Product management (CRUD)
**Objetivo:** Crear, editar, publicar, pausar productos. Con variantes, packs, stock por país.

**Archivos clave:**
- Backend: `routes/producer.py`, `routes/products.py`
- Frontend: `pages/producer/ProducerProducts.tsx`, `components/producer/ProductForm.tsx`

**Done cuando:**
- Lista de productos con estado (draft, pending, active, paused, rejected)
- Formulario de producto: imágenes (drag-drop), título, descripción rica, categoría, precio, variantes, packs
- Alérgenos EU 14 mandatorios (checkboxes)
- Información nutricional opcional
- Certificaciones (selección de las que tiene el productor)
- Stock por país (`inventory_by_country`)
- Precio por país (opcional, default uno solo)
- Target markets (países donde aparece el producto)
- SEO metadata automático (slug, meta title, meta description)
- Preview antes de publicar
- Bulk actions: duplicar, pausar, activar

**Dependencias:** 2.2
**Estimación:** 4-5 días

---

## 2.4 — Producer order management
**Objetivo:** El productor gestiona sus pedidos con claridad. Prepare → ship → delivered.

**Archivos clave:**
- Backend: `routes/producer.py` (orders endpoints)
- Frontend: `pages/producer/ProducerOrders.tsx`

**Done cuando:**
- Lista de pedidos filtrable (estado, fecha, cliente)
- Detalle: cliente, items, total, su share, comisión de la plataforma, shipping address
- Acciones: "Aceptar", "Marcar como preparando", "Marcar como enviado" (con tracking URL opcional), "Marcar como entregado"
- Notificación automática al cliente en cada cambio de estado
- Imprimir packing slip (PDF)
- Exportar a CSV
- Chat directo con el cliente si tiene dudas

**Dependencias:** 2.3, 1.6
**Estimación:** 3 días

---

## 2.5 — Producer store profile & public view
**Objetivo:** La tienda del productor es su "Airbnb host profile" — historia, fotos, ubicación, productos.

**Archivos clave:**
- Backend: `routes/stores.py`
- Frontend: `pages/producer/ProducerStoreProfile.js` (editor), `pages/StorePage.tsx` (público)

**Done cuando:**
- Editor: cover image, logo, historia larga, foto de instalación, ubicación (mapa embed), redes sociales
- Categorías de productos propios
- Certificaciones visibles con badges
- Horario de atención (opcional)
- Video de presentación (opcional)
- Public view: hero + historia + productos + reviews + "Sigue a esta tienda"
- SEO optimizado (store slug en URL)
- Share button

**Dependencias:** 2.3
**Estimación:** 3 días

---

## 2.6 — Producer plan & subscription
**Objetivo:** Productor elige FREE/PRO/ELITE, paga con Stripe, ve su plan activo.

**Archivos clave:**
- Backend: `routes/subscriptions.py`, `services/subscriptions.py`
- Frontend: `pages/producer/ProducerPlanPage.tsx`, `context/ProducerPlanContext.tsx`

**Done cuando:**
- Pricing page con 3 cards (FREE 0€/20%, PRO 79€/18%, ELITE 249€/17%)
- Features claras por plan leídas de `/config/plans`
- Upgrade: Stripe Checkout → webhook → plan activo inmediato
- Downgrade: al final del periodo actual
- Grace period de 3 días si falla el pago
- Billing history
- Invoice PDF descargable
- Cancel subscription con razón opcional
- Plan cache funciona correctamente (ya fixado)

**Dependencias:** 2.2
**Estimación:** 3 días

---

## 2.7 — Producer payouts (manual V1)
**Objetivo:** En V1 los payouts son manuales. El productor ve saldo disponible y puede solicitar retiro.

**Archivos clave:**
- Backend: `routes/producer.py` (payout endpoints), `services/commission_service.py`
- Frontend: `pages/producer/ProducerPayments.tsx`, `pages/producer/WithdrawalPage.tsx`

**Done cuando:**
- Dashboard de earnings: total acumulado, disponible, pending (últimos 15 días), pagado
- Breakdown por pedido + comisión plataforma visible
- Formulario de retiro: IBAN/SWIFT + cantidad
- Min €20
- Historial de retiros con estado (pending, transferred, failed)
- Admin aprueba/rechaza manualmente
- Email de confirmación cuando admin transfiere desde Revolut
- CSV export para contabilidad

**Dependencias:** 2.4
**Estimación:** 3 días

---

## 2.8 — Producer analytics & insights
**Objetivo:** El productor ve qué funciona, qué no, y qué optimizar.

**Archivos clave:**
- Backend: `routes/producer.py` (analytics), `services/analytics_service.py`
- Frontend: `pages/producer/ProducerAnalytics.tsx`, `pages/producer/ProducerInsights.tsx`

**Done cuando:**
- Métricas: visitas a tienda, clicks en productos, conversion rate, avg order value, repeat customers %
- Gráfica de ventas temporales (7/30/90/365 días)
- Top productos por ventas
- Geografía de clientes (mapa)
- Fuentes de tráfico (orgánico, social, influencer code, etc.)
- Comparativa con periodo anterior (arrows up/down)
- Health score (0-100) con factores
- Sugerencias accionables ("Añade descripción a 3 productos sin texto")

**Dependencias:** 2.3, 2.4
**Estimación:** 3-4 días

---

## 2.9 — Rebeca AI (PRO sales assistant)
**Objetivo:** Asistente comercial nacional para productores PRO. Conoce sus datos, sugiere, responde.

**Archivos clave:**
- Backend: `routes/rebeca_ai.py`, `services/rebeca_ai_tools.py`
- Frontend: `components/ai/RebecaAI.tsx`, montada en `ProducerLayoutResponsive.js`

**Done cuando:**
- Flotante en dashboard producer/importer con plan PRO
- Personalidad: asesora comercial cercana, datos locales, enfocada en día a día
- 4 tools: search_local_trends, analyze_my_sales, suggest_pricing, get_my_reviews
- Multi-turn con history persistente
- Briefing diario/semanal opcional
- Metas configurables ("vender 500€ esta semana")
- Alertas proactivas (stock bajo, competencia baja precios, trending query relacionado)
- Gate: plan FREE no tiene acceso (upgrade banner)

**Dependencias:** 2.2, 2.8
**Estimación:** 3-4 días

---

## 2.10 — Pedro AI (ELITE international sales)
**Objetivo:** Agente comercial agentic para productores ELITE. Mercados internacionales, contratos B2B.

**Archivos clave:**
- Backend: `routes/commercial_ai.py`, `services/commercial_ai_tools.py`
- Frontend: `pages/producer/CommercialAIPage.tsx`

**Done cuando:**
- Página dedicada `/producer/commercial-ai` (triple gate: ruta + componente + backend)
- Personalidad: closer B2B neutral profesional
- Claude Sonnet + 5 tools: search_importers, analyze_market, predict_demand, generate_contract, check_producer_plan
- 9 países con datos de mercado (aunque sean estáticos)
- PDF de contrato descargable (fix el bug actual)
- Opportunity cards con datos reales (no hardcoded %)
- Historial de conversaciones y contratos generados

**Dependencias:** 2.9
**Estimación:** 3 días

---

## 2.10b — AI Assistants UX & Configuration (floating system unificado)
**Objetivo:** Sistema unificado de 3 AIs flotantes con acumulación vertical, colores diferenciados por plan, settings panel completo. Reutilizable y consistente.

**Filosofía:** Las 3 AIs (David, Rebeca, Pedro) comparten la misma base UX (arrastrable, retracted strip, badge unread) pero con identidad visual distinta.

**Archivos clave:**
- Backend: endpoints existentes (hispal_ai.py, rebeca_ai.py, commercial_ai.py)
- Frontend:
  - `components/ai/FloatingAIAssistant.tsx` (NUEVO componente base abstracto)
  - `components/ai/AIAssistantManager.tsx` (NUEVO — gestiona stack de botones)
  - `components/ai/HispalAI.js` (refactor para usar FloatingAIAssistant)
  - `components/ai/RebecaAI.tsx` (refactor)
  - `components/ai/PedroAI.tsx` (NUEVO o refactor)
  - `pages/settings/AIAssistantsSettings.tsx` (NUEVO panel de configuración)

**Sistema visual cerrado (decisión final):**

| AI | Color | Hex | Icon | Acceso | Badge unread |
|---|---|---|---|---|---|
| **David** | Negro premium | `#0c0a09` (stone-950) | `Sparkles` | Todos los usuarios logueados | Rojo |
| **Rebeca** | Verde premium profundo | `#0a3d2e` (custom) | `TrendingUp` | Producer/Importer PRO + ELITE | Rojo |
| **Pedro** | Dorado | `#b45309` → `#78350f` gradient | `Crown` | Producer/Importer ELITE only | Rojo |

**Stack vertical (acumulación):**
```
                            ┌────┐
                            │ 👑 │ ← Pedro (solo ELITE)
                            └────┘
                            ┌────┐
                            │ 🌱 │ ← Rebeca (PRO+) [3 rojo]
                            └────┘
                            ┌────┐
                            │ ✨ │ ← David (siempre)
                            └────┘
```

**Reglas de acumulación:**
- Max 3 botones visibles simultáneamente
- Stack vertical en el lado elegido por el usuario (derecho por defecto)
- Espaciado 12px entre botones
- Cada botón arrastrable independientemente (pero se alinean al stack tras soltar)
- **Retracted strip compartido**: cuando todos se retraen por inactividad, una sola tira con puntitos de colores indicando cuántas IAs hay activas
- Tap en tira retraída → expande todos los botones disponibles
- Badge rojo independiente por IA con contador de mensajes no leídos
- Click en botón → abre SU chat (los otros botones desaparecen temporalmente hasta cerrar)
- Al cerrar chat, contador rojo se resetea a 0
- Si el usuario no tiene acceso a una IA (ej: FREE), su botón no aparece

**Settings panel completo:**
```
Settings → IA Assistants
│
├── David AI (siempre activo)
│   ├── ✓ Sugerencias proactivas
│   ├── ✓ Flotante visible (on/off)
│   ├── Idioma preferido: [auto|es|en|ko]
│   ├── Personalidad: [nutricionista|chef|ambos]
│   └── [Borrar historial de conversación]
│
├── Rebeca AI (PRO+)  [Upgrade banner si FREE]
│   ├── ✓ Flotante visible (on/off)
│   ├── ✓ Briefings diarios (hora: 09:00)
│   ├── ✓ Alertas de stock bajo
│   ├── ✓ Alertas de reviews nuevas
│   ├── ✓ Alertas de solicitudes de importación
│   ├── Idioma preferido: [auto|es|en|ko]
│   └── [Borrar historial]
│
├── Pedro AI (ELITE only)  [Upgrade banner si PRO]
│   ├── ✓ Flotante visible (on/off)
│   ├── ✓ Alertas de oportunidades de mercado
│   ├── ✓ Alertas de contratos en borrador
│   ├── Mercados objetivo: [checkbox 9 países]
│   ├── Industria foco: [dropdown]
│   └── [Borrar historial]
│
└── Privacidad
    ├── ✓ Usar mis datos para personalización
    ├── [Descargar mis conversaciones con IAs]
    └── [Opt-out completo de IAs]
```

**Features unificadas:**
- **Draggable**: arrastrable con persistencia de posición en localStorage
- **Retracted strip**: se oculta a un lado tras 30s sin interacción
- **Pulse animation**: cuando hay mensaje proactivo
- **Focus trap**: cuando chat abierto, teclado navega solo dentro
- **Streaming responses**: respuestas aparecen palabra por palabra
- **Historial persistente**: conversaciones guardadas por IA
- **Multi-idioma automático**: detecta idioma del usuario

**Done cuando:**
- Componente base `FloatingAIAssistant` abstracto y reutilizable
- `AIAssistantManager` gestiona el stack y reglas de acumulación
- David migrado al nuevo componente base (refactor no-breaking)
- Rebeca con color verde oscuro funcionando
- Pedro con color dorado + gradient funcionando
- Badge de unread con contador rojo
- Settings panel completo con todas las opciones
- Triple gate respetado (Rebeca PRO+, Pedro ELITE+)
- Opt-out completo funcional
- Eliminar historial funcional
- Retracted strip compartida cuando hay múltiples IAs
- Tests E2E: producer ELITE ve los 3 botones, consumer ve solo David
- Responsive desktop + mobile

**Dependencias:** 1.14 (David), 2.9 (Rebeca), 2.10 (Pedro)
**Estimación:** 4-5 días

---

## 2.11 — Influencer onboarding & activation (Growth Partner, no vendedor)
**Objetivo:** Influencer = **growth partner**, no vendedor. Su misión es traer tráfico a la plataforma y evangelizar la misión. En 5 minutos desde signup hasta activo.

**Filosofía** (clarificada en scope cerrado):
- NO promociona productos específicos por comisión por producto
- SÍ atrae tráfico general a HispaloShop con su código personal
- Gana 3/5/7% sobre TODAS las compras del consumer atraído (18 meses)
- PUEDE ser creator también (ambos roles coexisten en mismo usuario)
- PUEDE tagear productos en sus posts sin que cambie la comisión

**Archivos clave:**
- Backend: `routes/influencer.py`
- Frontend: `pages/register/influencer/*`, `pages/influencer/InfluencerDashboard.tsx`

**Messaging del onboarding:**
> "Tu misión: llevar tráfico a HispaloShop. Gana cada vez que alguien usa tu código, para siempre (18 meses por consumer)."
> NO: "Promociona productos y gana comisión."

**Done cuando:**
- Registro simple (no verificación compleja en V1)
- Conectar redes sociales (IG, TikTok) para mostrar followers
- Generar código personalizado (10% off primera compra, ya forzado a value=10 + first_purchase_only=true en backend)
- Dashboard enfocado en **atracción de tráfico**:
  - Tier actual (Hercules/Atenea/Zeus) + barra de progreso al siguiente tier
  - Consumers atraídos totales (NO "ventas")
  - Comisiones ganadas (lifetime + este mes)
  - Conversion rate de clicks en tu código
  - Gráfica de nuevos consumers atraídos (últimos 30 días)
- Guía educativa "Cómo empezar": cómo compartir en IG stories, TikTok, WhatsApp
- Badge de verificación opcional

**Dependencias:** 1.1
**Estimación:** 3-4 días

---

## 2.12 — Influencer tools (growth toolkit)
**Objetivo:** Todas las herramientas para que el influencer evangelice HispaloShop efectivamente. No herramientas de "promocionar productos", sino de "llevar tráfico".

**Archivos clave:**
- Backend: `routes/influencer.py` (analytics, links)
- Frontend: `pages/influencer/*`

**Toolkit:**

### Landing page personal
- URL propia: `hispaloshop.com/@maria_foodie`
- Página con: foto grande, bio, código de descuento 10% visible, CTA "Únete con María", productos que ha taggeado, recetas/posts recientes
- Share nativo para IG bio, TikTok, Twitter
- QR code descargable de la landing

### Link de afiliado genérico
- Formato: `hispaloshop.com/r/{codigo}` — redirige a landing de HispaloShop con el código auto-aplicado
- Tracking automático: cookie + URL param
- Funciona sin necesidad de clicar explícitamente el código (attribution por referrer)

### Biblioteca de assets de HispaloShop
- Logos en múltiples formatos (PNG, SVG, dark/light)
- Banners para Instagram stories (9:16)
- Gráficos para TikTok
- Videos del brand (filosofía, productores, etc.)
- Iconos y stickers descargables
- Guidelines de uso del brand ("do / don't")

### Plantillas de posts
- "Comparte esta historia en tus stories" con imágenes predefinidas listas para publicar
- Ejemplos: "Conoce a María, la productora de quesos manchegos del mes"
- Copy sugerido en múltiples idiomas
- El influencer solo tiene que añadir su código y publicar

### Educación
- "Cómo hablar de HispaloShop en tus redes" (guía de tono)
- Do: storytelling, personal, auténtico
- Don't: hard sell, spam, mentir

### Analytics: InfluencerInsights
- Impresiones del link personal
- Clicks únicos
- Conversions (consumers nuevos atraídos)
- Earnings lifetime + este mes
- Top productos comprados por consumers atraídos (visibilidad curiosa, no afecta comisión)
- Mapa geográfico de de dónde vienen los clicks
- Comparativa vs periodo anterior

### Gamification del tier
- Barra de progreso visible "Te faltan X ventas para subir a Atenea"
- Beneficios del siguiente tier explicados
- Celebración al subir tier (notificación, badge nuevo)

### Commission history
- Lista de todas las comisiones generadas
- Estado: pending (<D+15), available (>=€20), paid
- Detalle: cuándo se pagará, fecha esperada

### Fiscal setup
- Detalles bancarios (IBAN/SWIFT)
- País fiscal (ES = retención 15% automática, otros = 0% si certificado)
- Upload certificado de residencia fiscal
- Wizard de 4 pasos

**Done cuando:**
- Landing page `/@username` con estructura limpia
- Generic affiliate link funcional con tracking
- Asset library con al menos 20 recursos descargables
- 5 plantillas de posts listas para compartir
- Guía educativa redactada
- InfluencerInsights dashboard con todas las métricas
- Tier progress bar + celebración
- Commission history con estados
- Fiscal wizard completo

**NO incluye** (decisión explícita):
- "Productos destacados" en el toolkit (no es su trabajo destacar productos específicos)
- "Sugerencias de productos a promocionar" (mantener el enfoque en tráfico, no en ventas por producto)

**Dependencias:** 2.11
**Estimación:** 4 días

---

## 2.13 — Influencer payouts (fiscal compliance)
**Objetivo:** Payouts automáticos con retención fiscal correcta (Modelo 190 en España).

**Archivos clave:**
- Backend: `routes/influencer.py` (payouts), `services/modelo190_service.py`, `services/fiscal_verification.py`
- Frontend: `pages/influencer/WithdrawalPage.tsx`, `pages/influencer/PayoutsPage.tsx`

**Done cuando:**
- Balance: available (>D+15), pending (<D+15), paid
- Min €20 para retirar
- Payouts manuales en V1 (admin transfiere desde Revolut)
- Retención automática 15% IRPF para influencers ES
- Certificado de residencia fiscal para no-ES (retención 0%)
- Modelo 190 quarterly report generable desde admin
- Email con detalles de retención al influencer
- Historial con PDF de cada recibo

**Dependencias:** 2.12
**Estimación:** 3-4 días

---

## 2.15 — Promotion System (ads como beneficio del plan)
**Objetivo:** Sistema de promoción NATIVO de HispaloShop. Los ads NO se venden separados — son un beneficio del plan de suscripción.

**Filosofía única:** Convierte el plan de suscripción en valor visible. Los productores PRO ven sus productos promocionados nacionalmente sin coste adicional. Los ELITE internacionalmente. Genera upgrade path natural.

**Archivos clave:**
- Backend: nuevo `routes/promotion.py`, `services/promotion_service.py`, colección `promoted_products`
- Frontend:
  - `pages/producer/PromotedProductsPage.tsx` (gestión de qué productos destacar)
  - `components/feed/PromotedPostCard.js` (ad card en feed)
  - `components/stories/PromotedStory.tsx` (story ad)
  - Integración en `ForYouFeed.js` y stories strip

**Reglas del sistema (decisión cerrada):**

### Beneficios por plan
| Plan | Slots de promoción | Alcance | Coste adicional |
|---|---|---|---|
| **FREE** | 0 | Solo orgánico | — |
| **PRO** | 5 productos destacados simultáneos | **Nacional** (mismo país) | ✅ Incluido en 79€/mes |
| **ELITE** | 10 productos destacados simultáneos | **Nacional + Internacional** (países elegidos) | ✅ Incluido en 249€/mes |

### Selección de productos (Opción B3 — híbrido)
- **Default automático**: el sistema promociona automáticamente los productos mejor vendidos / mejor valorados del seller
- **Override manual**: el seller puede ir a dashboard → "Productos destacados" y marcar manualmente qué productos promocionar (hasta el límite del plan)
- Si tiene menos productos que slots (ej: producer PRO con 3 productos), todos se promocionan
- Si tiene más, elige los 5/10 mejores (automático) o marca manualmente

### Targeting países ELITE (Opción C1)
- ELITE puede targetear los 3 países V1: **ES + KR + US**
- Checkbox en el panel: "¿Dónde quieres que se vea tu producto?"
- Por defecto: el país del seller (nacional)
- Expandible a otros países con 1 click cada uno
- Cuando se añadan países nuevos al lanzamiento, aparecen automáticamente como opción

### Placement en feed
**Posts/Reels feed** (decisión cerrada — Opción A frecuencia):
- 1 ad cada 10 posts orgánicos
- Etiqueta pequeña "Promocionado" en esquina (estilo Instagram)
- Diseño idéntico al post orgánico (indistinguible + label)
- Click lleva al producto o tienda del productor
- Rotación: el sistema alterna entre productos promocionados de diferentes productores para evitar saturación

**Stories ads** (decisión cerrada):
- 1 story ad cada 5 perfiles de stories (separado con badge "Promocionado")
- Duración variable: imagen 10s, video hasta 30s
- El seller promociona una story orgánica existente ("Promocionar esta story") — no crea una específica
- Tap en story ad navega al producto/tienda

### Algoritmo de selección (qué ad muestra a qué usuario)
- **Targeting**: país del usuario debe coincidir con targeting del ad
- **Intereses**: usuarios con señal de interés en la categoría del producto tienen prioridad
- **Exclusiones**: no mostrar el mismo ad al mismo usuario más de 3 veces al día
- **Anti-saturación**: máximo 3 ads diferentes por sesión de scroll

### Dashboard de promoción para sellers
**Panel simple V1** en `/producer/promotion`:
- Lista de productos destacados actualmente (editable drag-drop ordenar prioridad)
- Métricas básicas por producto: impresiones, clicks, CTR
- Países donde se muestra (solo ELITE)
- Toggle on/off por producto
- Última ejecución: "Tus productos se promocionaron 2,400 veces esta semana"
- Sin panel complejo con CPM/CPC (no hay pricing variable, es incluido)

### Moderación (G1 — IA + admin local si dudas)
- Al activar un producto para promoción, IA revisa:
  - Imagen: profanity, nudity, violencia
  - Descripción: claims médicos falsos, spam, contenido prohibido
- Alta confianza → auto-activa
- Dudas → cola de admin local del país
- Ya aprobado → se promociona automáticamente sin re-review cada vez

### NO en V1
- Ads pagados por CPM/CPC/CPA (todo es flat-incluido-en-plan)
- Ads en comunidades (respeta el feeling íntimo de comunidad)
- Influencer boost de productores (V2)
- Ads en recetas, landing pages del blog

**Done cuando:**
- Backend: modelo `promoted_products`, endpoints CRUD, algoritmo de selección
- Frontend: `PromotedProductsPage.tsx` con selección auto/manual
- Feed integration: 1 ad cada 10 posts con label "Promocionado"
- Stories integration: 1 ad cada 5 perfiles
- Targeting países ELITE funcional (ES+KR+US)
- Métricas básicas por producto
- IA moderation + admin review flow
- Rotation algorithm anti-saturación
- Cron job: recalcula top productos automáticos diariamente
- Test E2E: productor PRO marca producto → aparece en feed nacional, productor ELITE targetea KR → aparece en KR feed

**Dependencias:** 2.3, 2.6, 1.11
**Estimación:** 6-7 días

---

## 2.16 — Market Interest Requests (killer feature)
**Objetivo:** Cuando un consumer ve un producto promocionado de un país donde no está disponible, puede votar "Tráelo a mi país". Esto genera leads de mercado para productores e importers.

**Por qué es el killer feature:** Convierte demanda latente en inteligencia de mercado accionable. Ninguna plataforma hace esto. Crea un loop viral:
- Consumer vota → se siente escuchado
- Productor/Importer recibe leads verificados → incentivo para expandir
- Cuando el producto llega al país → consumer es notificado → vuelve a la app → compra

**Archivos clave:**
- Backend: `routes/market_requests.py` (nuevo), colección `market_interest_requests`
- Frontend:
  - `components/product/RequestInMyCountryButton.tsx`
  - `pages/importer/MarketOpportunitiesPage.tsx` (dashboard de importers)
  - `components/producer/MarketRequestsWidget.tsx` (widget en producer dashboard)
  - Integración en product detail y ad cards

**Flow del consumer:**
1. Consumer en Corea ve un ad de AOVE español (promoción ELITE)
2. Tap en el producto → va al product detail
3. Si el producto NO tiene `inventory_by_country` para KR:
   - En vez de "Añadir al carrito" (bloqueado), muestra botón **"Tráelo a Corea"**
4. Tap → modal con:
   - Breve texto: "Otros 47 coreanos ya lo han pedido. Cuando llegue, te avisaremos."
   - Campo opcional de notas: "¿Por qué lo quieres?" (texto libre, max 200 chars)
   - Botón "Enviar solicitud"
5. Confirmación: "Gracias. Has añadido tu voz a 48 personas."

### Modelo de datos
```python
MarketInterestRequest {
  request_id,
  product_id,
  producer_id,  # owner del producto
  consumer_id,  # quien solicita
  consumer_country,  # país del consumer
  notes: str,  # opcional, max 200 chars
  created_at,
  status: "pending" | "fulfilled" | "rejected",  # fulfilled cuando el producto llega al país
  fulfilled_at: ts | null,
  fulfilled_by_importer_id: user_id | null,  # qué importer trajo el producto
}
```

### Lógica de agregación (D2 — Opción C: contador siempre visible + hitos)
- Contador de solicitudes por `(product_id, country)` siempre visible en:
  - Dashboard del productor (widget "Demanda internacional")
  - Dashboard del importer (página "Oportunidades de mercado")
  - Pedro AI knowledge base (para insights)
- **Notificaciones en hitos**:
  - 10 solicitudes: notificación suave al productor
  - 50 solicitudes: notificación destacada al productor + notificación a importers del país
  - 100, 500, 1000: milestone celebration + Pedro AI genera insight
- Cron diario calcula `trending_requests` por país

### Consumer side — "Solicitudes populares" (decisión E1 — sí visible)
- Nueva sección en Discover: **"Productos que tu comunidad está pidiendo"**
- Lista de productos con más solicitudes en el país del usuario
- Card muestra: producto, país de origen, nº de solicitudes, botón "Yo también lo quiero"
- Genera FOMO positivo + viralidad
- Filtros: mi país / todos los países

### Importer side — Dashboard "Oportunidades de mercado" (D4 — B + C)
**Para todos los importers:**
- Lista de productos solicitados en su país, ordenados por nº solicitudes
- Card con: producto, productor origen, cantidad de solicitudes, notas de consumers (anonimizadas)
- Botón "Contactar productor" → inicia chat B2B

**Para importers ELITE** (C — prioridad):
- **Ventana de primer contacto de 72h**: los importers ELITE ven las oportunidades 72h antes que los importers PRO
- **Notificación instantánea** cuando hay una nueva oportunidad (>50 solicitudes)
- Estadísticas avanzadas: trending, velocidad de crecimiento del interés

### Notificación al consumer cuando el producto llega (D3 — sí fuerte)
Cuando un producto pasa de "no disponible en KR" a "disponible en KR" (porque un importer lo trajo):
- Push notification al consumer solicitante: "¡El aceite español que pediste ya está en Corea!"
- Email con CTA "Comprar ahora"
- El request se marca como `fulfilled`
- Métricas: tiempo promedio desde solicitud hasta cumplimiento

### Pedro AI integration
Pedro AI usa esta data como tool:
- `get_market_requests(country)` — ver qué productos son más solicitados en un mercado
- `analyze_opportunity(product_id, country)` — insights de si vale la pena expandir
- Notifica proactivamente: "50 coreanos quieren tu AOVE. ¿Exploramos el mercado KR?"

**Done cuando:**
- Modelo `MarketInterestRequest` + endpoints CRUD
- Botón "Tráelo a mi país" en product detail para productos no disponibles localmente
- Modal con input de notas opcionales
- Contador visible en dashboards de productor e importer
- Widget en producer dashboard con top 5 solicitudes internacionales
- Página `MarketOpportunitiesPage.tsx` para importers con 72h ELITE advantage
- Notificaciones en hitos (10, 50, 100, 500, 1000)
- Notificación al consumer cuando producto llega
- Sección Discover "Productos que tu comunidad pide"
- Pedro AI tools integrados
- Cron diario: trending calculation
- Test E2E: consumer solicita → productor recibe notif → importer ve oportunidad → producto llega → consumer notificado

**Dependencias:** 2.3, 2.15 (promotion), 2.10 (Pedro AI)
**Estimación:** 5-6 días

---

## 2.14 — Importer special flow (Producer variant)
**Objetivo:** El importer es tratado como producer con campo `origin_country` y badge "Importado".

**Archivos clave:**
- Backend: `routes/importer.py`, `core/models.py` (Product)
- Frontend: `pages/register/importer/*`, `pages/importer/*`, `components/product/ImportedBadge.tsx`

**Done cuando:**
- Registro como importer requiere: documento de empresa local + certificado de importación/acuerdo de distribución
- Verificación: IA + admin local
- Al crear producto, `origin_country` es mandatorio (diferente al país del importer)
- Badge "Importado desde 🇪🇸" visible en product cards, detail, tienda
- Filtro en search: "Productos locales" vs "Importados"
- Mismo flow de plan FREE/PRO/ELITE
- Mismo dashboard que producer (reutiliza componentes)
- POST /importer/verify-vat activa reverse charge si cross-border EU (ya existe)

**Dependencias:** 2.1, 2.3
**Estimación:** 3 días

---

# FASE 3 — ADMIN & OPERATIONS (semana 12-13)

## 3.1 — Payments, Stripe Connect, exchange rates
**Objetivo:** El core financiero funciona impecable en los 3 países.

**Archivos clave:**
- Backend: `routes/orders.py`, `services/stripe_connect.py`, `services/commission_service.py`, `services/exchange_rates.py`, `services/ledger.py`
- Frontend: checkout + webhooks

**Done cuando:**
- Stripe Checkout funciona en ES, KR, US
- Webhook handler idempotente y stress-tested
- Commission split exacto al céntimo (20/18/17 + 3/5/7 + 10%)
- First-purchase discount absorbido correctamente por plataforma
- Ledger entries correctos con VAT, reverse charge si aplica
- Exchange rates ECB via cron diario (GH Actions configurado)
- Refunds totales y parciales funcionan con rollback de comisiones
- Test manual con $1, $100, $1000 en cada país
- Dashboard admin muestra health de pagos (errores, volumen, revenue)

**Dependencias:** 1.6
**Estimación:** 5-6 días

---

## 3.2 — Country admin dashboard
**Objetivo:** El admin local de Corea ve solo datos coreanos. Todo country-scoped.

**Archivos clave:**
- Backend: `routes/admin_dashboard.py`, `routes/admin.py`, `routes/admin_verification.py`, `routes/support.py`
- Frontend: `pages/admin/*`

**Done cuando:**
- Admin sin country = 403 (ya hecho)
- Verification queue country-scoped (ya hecho)
- Producers, products, orders, refunds, certificates — todos country-scoped (ya hecho)
- Growth analytics country-scoped (ya hecho)
- Commission audit country-scoped (ya hecho)
- Market coverage super_admin only (ya hecho)
- UI clara mostrando al admin "Eres admin de España" (evita confusión)
- Actions log auditado
- Admin puede crear cupones, responder support, aprobar/rechazar productos de su país

**Dependencias:** 2.x
**Estimación:** 3 días

---

## 3.3 — Super admin global view
**Objetivo:** Fundador ve todo: métricas globales, activación de países, asignación de admins, plans config.

**Archivos clave:**
- Backend: `routes/admin_dashboard.py`, `routes/superadmin/*`
- Frontend: `pages/super-admin/*`

**Done cuando:**
- SuperAdminOverview: KPIs globales (GMV total en USD, active users, orders/day por país)
- MarketCoverage (ya existe): activar/desactivar países, asignar admin, setear weekly goal
- PlansConfig: editar rates FREE/PRO/ELITE, ver histórico de cambios
- Global user search
- Audit log de acciones destructivas (delete user, suspend producer, refund manual)
- Fiscal: Modelo 190 export, retenciones YTD
- Broadcast: enviar notificación global a todos los users (con filtros por rol/país)
- Health dashboard: errores recientes, endpoints lentos, DB connections

**Dependencias:** 3.2
**Estimación:** 4-5 días

---

## 3.4 — Support & ticketing
**Objetivo:** Usuario abre ticket, admin del país lo atiende, resolución en <48h.

**Archivos clave:**
- Backend: `routes/support.py`
- Frontend: `pages/support/*`, `pages/admin/AdminSupport.tsx`

**Done cuando:**
- Usuario puede abrir ticket con: categoría, asunto, descripción, adjuntar imágenes
- Categorías: "Problema con pedido", "Problema con pago", "Reportar usuario", "Sugerencia", "Otro"
- Admin local ve su cola, asigna prioridad, responde
- Status: open → in_progress → resolved → closed
- Notificaciones en cada update
- SLA tracking (tiempo de primera respuesta, tiempo de resolución)
- Escalación a super_admin si el admin no responde en 24h
- Help Center integrado (FAQ estático) ANTES de abrir ticket (reduce volumen)

**Dependencias:** 1.9
**Estimación:** 3 días

---

## 3.6 — Dashboard audit & optimization (5 roles)
**Objetivo:** Auditar los 5 dashboards (producer, importer, influencer, admin, super_admin), decidir pulir vs reescribir cada uno, y entregar dashboards consistentes, rápidos y fáciles de navegar.

**Decisión cerrada**: 5 dashboards (consumer NO tiene dashboard separado, se cubre con profile + settings + hamburger menu).

**Estrategia**: Audit first, decide after. Algunos dashboards tienen sprints previos (producer), otros pueden necesitar rework completo.

**Archivos clave:**
- Frontend: `pages/producer/*`, `pages/importer/*`, `pages/influencer/*`, `pages/admin/*`, `pages/super-admin/*`
- Layouts: `components/dashboard/*`

**Principios de UX comunes (decisión cerrada):**
1. H1 con nombre/identidad del usuario al top
2. KPIs principales en cards al top (máximo 4, los que importan hoy)
3. Quick actions en grid (4-6 CTAs principales)
4. Widgets secundarios scrolleables abajo (gráficas, alertas, insights)
5. Sidebar izquierda en desktop con navegación de secciones del dashboard
6. Bottom nav en mobile para 4 secciones clave del rol
7. Consistencia visual entre los 5 dashboards
8. Empty states bonitos con CTAs
9. Skeleton states mientras carga
10. Accesibilidad: keyboard nav, contrast, focus visible

**Responsive strategy (decisión cerrada):**
- **Desktop-first**: producer, importer, admin, super_admin (se usan sentados al ordenador)
- **Mobile-first**: influencer (lo revisan entre posts en el móvil)
- Todos deben ser usables en ambos viewports (decisión de desktop adaptation global)

---

### 3.6.1 — Producer dashboard
**Estado actual:** Tiene sprints previos (S13 Páginas Producer — COMPLETE en memoria). Probablemente bien.

**Audit:**
- Layout actual
- KPIs relevantes vs irrelevantes
- Quick actions más usadas
- Performance (queries, loading states)
- Rebeca AI flotante integrada (cuadra con sección 2.10b)

**Decisión**: Pulir (basado en estado actual asumido bueno)

**Secciones del dashboard:**
- Overview (home): KPIs, alertas, quick actions, Rebeca daily briefing
- Productos: CRUD, variantes, packs, stock por país
- Pedidos: lista + detalle + actions
- Tienda: store profile editor
- Envíos: shipping rules
- Análisis: métricas + insights
- Promoción: productos destacados (nuevo desde 2.15)
- Solicitudes de mercado: demanda internacional (nuevo desde 2.16)
- Comunidad: gestión de la comunidad del productor
- Pagos: earnings + withdrawals
- Plan: subscription + billing
- Configuración: perfil, verificación, notificaciones

**Done cuando:**
- Layout coherente con principios de UX comunes
- Sidebar navegación funcional (desktop)
- Bottom nav en mobile con las 4 secciones clave
- Rebeca AI flotante integrada
- Métricas en tiempo real
- Responsive desktop + mobile

**Estimación:** 3 días (pulir)

---

### 3.6.2 — Importer dashboard (variante producer)
**Estado actual:** Es una variante del producer. Compartir código al máximo.

**Audit:**
- Qué es común con producer → reutilizar componentes
- Qué es específico (origin_country, certificados de importación, solicitudes de mercado coma importer)
- Página `MarketOpportunitiesPage.tsx` (nueva desde 2.16)

**Decisión**: Pulir usando componentes compartidos con producer

**Secciones específicas del importer:**
- Todo lo del producer + badge "Importador"
- Productos: con field `origin_country` obligatorio
- Verificación: documento de importación/distribución
- Oportunidades de mercado: página dedicada (nueva)
- Certificados: de importación + del productor original

**Done cuando:**
- Componentes compartidos con producer (no duplicar)
- Página MarketOpportunities con 72h ELITE advantage
- Product form con origin_country
- Verification flow adaptado
- Responsive desktop + mobile

**Estimación:** 2 días

---

### 3.6.3 — Influencer dashboard (mobile-first rework)
**Estado actual:** Existe pero enfocado en "vendedor" — necesita rework para "growth partner".

**Audit + Rework:**
- Eliminar "productos a promocionar" (no es su trabajo)
- Añadir foco en atracción de tráfico + códigos
- Métricas reenfocadas: visitas a su landing, clicks en código, consumers atraídos
- Mobile-first design (tab bar sticky con 4 secciones)

**Decisión**: Pulir con rework del enfoque (2.11, 2.12 ya lo redefinen)

**Secciones del dashboard:**
- Overview: KPIs (atraídos, clicks, earnings lifetime + este mes, tier progress)
- Landing personal: editor de su `@username` page
- Código y links: gestión del código + generate links + QR
- Assets library: logos, banners, plantillas descargables
- Contenido: posts/reels/stories creados dentro de HispaloShop
- Insights: analytics detallados
- Comisiones: historial + payouts
- Configuración: fiscal, notificaciones, profile

**Done cuando:**
- Rework con enfoque "growth partner"
- Tab bar mobile con 4 secciones (Overview, Códigos, Insights, Perfil)
- Landing page editor funcional
- Insights con mapa geográfico
- Tier progress visible
- Responsive mobile-first + desktop usable

**Estimación:** 3-4 días (rework)

---

### 3.6.4 — Country Admin dashboard
**Estado actual:** Existe con country scoping ya aplicado (ciclos previos del audit). Posiblemente necesita polish de navegación.

**Audit:**
- Secciones country-scoped funcionan bien
- UI clara mostrando "Eres admin de España"
- Quick actions (approve producer, respond ticket)
- Performance (queries scopeadas)

**Decisión**: Pulir

**Secciones del dashboard:**
- Overview: KPIs de su país, alertas, quick actions
- Verificaciones: cola de producers pending
- Productos: aprobar/rechazar
- Pedidos: monitoreo
- Refunds: procesar
- Soporte: tickets del país
- Discount codes: CRUD scopeados al país
- Influencers: gestionar
- Fiscal: (solo ES para Modelo 190)
- Analytics: métricas del país
- Moderación: cola de contenido del país

**Done cuando:**
- Todas las secciones country-scoped
- "Eres admin de [país]" visible siempre
- Quick actions claras
- Audit log de acciones del admin
- Desktop-first (layout con sidebar rico)

**Estimación:** 3 días

---

### 3.6.5 — Super Admin dashboard
**Estado actual:** Algunas páginas existen (MarketCoverage, PlansConfig). Falta un overview unificado.

**Audit + Decisión**: Probablemente reescribir overview. Secciones individuales pulir.

**Secciones del dashboard:**
- Overview: KPIs globales (GMV USD, users active, orders/day por país)
- Countries: MarketCoverage con activate/deactivate + assign admin + weekly goal
- Plans: PlansConfig editor
- Users: global user search
- Orders: global orders view
- Fiscal: Modelo 190 global + exports por país
- Audit log: todas las acciones destructivas
- Broadcasts: notificación global a todos los users con filtros
- Health: errors, DB connections, endpoints lentos
- Revenue: gráficas de ingresos por plan, país, periodo
- Ambassadors management: approve featured ambassador del mes

**Done cuando:**
- Overview con KPIs globales en USD consolidated
- Todas las sub-páginas funcionales
- Health dashboard con alertas en tiempo real
- Audit log de acciones
- Desktop-first (data-heavy, necesita viewport amplio)

**Estimación:** 4 días

---

### Resumen sección 3.6
**Total estimado:** 15-17 días para auditar, pulir o reescribir los 5 dashboards con consistencia visual y UX unificada.

**Dependencias:** 2.9b (AI UX), 2.15 (promotion system), 2.16 (market requests), todas las secciones de Fase 2

---

## 3.7 — User Feedback System (público con votos)
**Objetivo:** Cualquier usuario puede reportar bugs, proponer mejoras, y votar las ideas de otros. El fundador ve qué quiere la comunidad, priorizado por votos reales.

**Archivos clave:**
- Backend: nuevo `routes/feedback.py`, colección `user_feedback`
- Frontend: nuevo `pages/FeedbackPage.tsx`, `pages/FeedbackDetailPage.tsx`
- Admin: nuevo widget en super admin dashboard

**Features:**
- Página `/feedback` accesible desde footer + hamburger menu
- Crear feedback: título + descripción + categoría (bug/feature/mejora/otro) + screenshot opcional
- Votar: botón "Yo también" (upvote) — 1 voto por usuario por feedback
- Ordenar: más votados / más recientes / por categoría / por status
- Admin puede: responder, cambiar status (recibido → planeado → en progreso → hecho → descartado), ocultar spam
- Status tags visibles: "Recibido", "Planeado", "En progreso", "Hecho"
- Cuando admin marca "Hecho" → notificación a todos los que votaron: "Tu sugerencia fue implementada"
- Moderación: admin puede ocultar feedback inapropiado (no borrar, ocultar)
- i18n: ES/EN/KO

**Done cuando:**
- CRUD de feedback funcional
- Votación funcional (1 user = 1 vote)
- Admin panel de gestión de feedback
- Notificación "Hecho" a votantes
- Responsive mobile + desktop
- Tests smoke
- Commit

**Dependencias:** 1.9 (profile/settings para link), 3.4 (support — comparten patrón UI)
**Estimación:** 3-4 días

---

## 3.5 — Moderation & content safety
**Objetivo:** Contenido inapropiado se detecta, se modera, se elimina.

**Archivos clave:**
- Backend: `routes/moderation.py`, `services/content_moderation.py`
- Frontend: `pages/admin/AdminModerationPage.tsx`

**Done cuando:**
- Report button en cada post, reel, story, comment, review, message, user, product
- Razones predefinidas: spam, hate, nudity, scam, fake product, copyright
- IA revisa cada upload antes de publicar (Claude vision)
- Cola de moderación para admin (country-scoped cuando moderation_service lo soporte)
- Actions: aprobar, eliminar, suspender usuario, ban
- Apelaciones
- Estado para el reporter: "Gracias por tu reporte, lo hemos revisado"

**Dependencias:** 1.11
**Estimación:** 3 días

---

# FASE 4 — LEGAL, FISCAL & POLISH (semana 14-15)

## 4.1 — GDPR & Privacy
**Objetivo:** Full compliance EU. Sin riesgo legal.

**Archivos clave:**
- Backend: `routes/customer.py` (data export, delete account), `services/audit_logger.py`
- Frontend: `components/ConsentBanner.js`, `components/ConsentLayers.tsx`, `utils/analytics.ts`, privacy policy pages

**Done cuando:**
- Cookie banner explícito al entrar (ya existe)
- Analytics bloqueado hasta consent (ya fixado)
- "Exportar mis datos" → ZIP con JSON de todo lo del usuario
- "Eliminar mi cuenta" → soft delete + anonimización después de 30 días
- Privacy policy redactada por abogado, traducida ES/EN/KO
- Terms of service redactados por abogado
- Cookie policy detallada
- Data Processing Agreement template para B2B importers
- Menores: edad mínima 18 en signup

**Dependencias:** 1.9, 1.1
**Estimación:** 2-3 días código + review legal externa

---

## 4.2 — Fiscal compliance (España + Corea + USA)
**Objetivo:** Cada país cumple sus reglas fiscales.

**Archivos clave:**
- Backend: `services/ledger.py`, `services/modelo190_service.py`, `services/fiscal_verification.py`
- Frontend: `pages/influencer/FiscalSetupPage.tsx`, `pages/admin/AdminFiscalPage.tsx`

**Done cuando:**
- España: IVA 21% calculado correctamente, Modelo 190 generable quarterly, reverse charge intracomunitario via VIES
- USA: sales tax por estado (CA 7.25%, NY 8%, etc.) aplicado según shipping address
- Corea: KR_VAT 10% aplicado en todas las transacciones
- Invoices con NIF/CIF visible + sellos fiscales
- Fiscal residence certificates upload para no-ES influencers
- Export contable mensual para cada país
- Validación formato de tax ID por país (ya existe)

**Dependencias:** 3.1
**Estimación:** 4-5 días

---

## 4.3 — i18n & localization
**Objetivo:** ES, EN, KO al 100%. Sin texto hardcodeado. Fechas, moneda, formatos locales.

**Archivos clave:**
- Frontend: `locales/es.json`, `locales/en.json`, `locales/ko.json`, `locales/i18n.ts`
- Backend: mensajes de error, emails

**Done cuando:**
- 3 idiomas 100% traducidos (2500+ keys cada uno)
- Auto-detección de idioma por browser + override manual en settings
- Fechas: `Intl.DateTimeFormat` con locale correcto
- Moneda: `Intl.NumberFormat` con currency correcto
- Pluralización correcta (1 producto / 2 productos)
- RTL no es necesario para V1 (pero el layout debe ser RTL-ready para V2)
- Emails multi-idioma con plantillas separadas
- Notificaciones push en el idioma del usuario
- Error messages del backend devuelven keys de i18n, no texto

**Dependencias:** Todas las fases 1-3
**Estimación:** 4-5 días

---

## 4.4 — SEO & marketing
**Objetivo:** Google encuentra HispaloShop. Productos rankean. Landing pages convierten.

**Archivos clave:**
- Backend: `routes/sitemap.py`
- Frontend: `pages/informativas/*`, `public/robots.txt`, meta tags

**Done cuando:**
- Sitemap XML dinámico con productos, tiendas, recipes, hashtags, landing pages
- `robots.txt` correcto
- Meta tags dinámicos (OG image, Twitter card) en cada página pública
- Landing pages: home, Soy productor, Soy influencer, Soy importador, Pricing, About, Contact
- Schema.org markup (Product, Store, Review, BreadcrumbList, Organization)
- `hreflang` tags para multi-language
- Canonical URLs
- Google Analytics (con consent), Google Search Console
- Sitelinks optimizados

**Dependencias:** 4.1 (consent para GA)
**Estimación:** 3-4 días

---

## 4.5 — Performance & Core Web Vitals
**Objetivo:** Lighthouse score >90. LCP <2.5s. CLS <0.1. INP <200ms.

**Archivos clave:**
- Frontend: `vite.config.js`, `App.js` (lazy loading), image optimization
- Backend: query optimization, caching

**Done cuando:**
- Code splitting agresivo (lazy load por ruta)
- Images: WebP + srcset + lazy loading + blur placeholder
- Critical CSS inline
- Fonts preloaded
- Service worker para caching
- React Query cache tuning
- Backend: indices Mongo correctos, N+1 queries eliminadas (ya hecho)
- CDN (Cloudflare) delante del frontend
- Lighthouse CI en pipeline
- Bundle size <300KB gzipped initial

**Dependencias:** Fases 1-3
**Estimación:** 3-4 días

---

## 4.6 — Accessibility (WCAG 2.1 AA)
**Objetivo:** Usable por personas con discapacidad visual, motora, cognitiva.

**Archivos clave:** Todo el frontend

**Done cuando:**
- Alt text en todas las imágenes
- Contrast ratio >4.5:1 en texto (el palette stone lo cumple)
- Keyboard navigation completa (Tab, Enter, Esc, arrows)
- Focus visible en todos los interactive elements
- ARIA labels en buttons sin texto (iconos)
- Form errors anunciados para screen readers
- Skip to content link
- Headings jerárquicos correctos (h1 > h2 > h3)
- Videos con captions
- No contenido que se mueva sin parar
- Audit con axe DevTools o similar

**Dependencias:** Fases 1-3
**Estimación:** 3 días

---

## 4.7 — Error handling & edge cases
**Objetivo:** Cada error se muestra claro, cada edge case se maneja.

**Archivos clave:** Todo el frontend + backend

**Done cuando:**
- Error boundaries en React (no pantalla blanca)
- 404 page con CTA
- 500 page con "Contactar soporte"
- Offline detection (mostrar banner)
- Network errors con retry button
- Timeout errors con mensaje claro
- Backend: cada endpoint valida input, devuelve errores estructurados
- Sentry captura errores no manejados
- Mensaje de error nunca expone stack traces al usuario

**Dependencias:** 0.2 (Sentry)
**Estimación:** 3 días

---

## 4.8 — Desktop adaptation global (Opción C layout)
**Objetivo:** Paridad total mobile ↔ desktop. El usuario puede hacer TODO desde móvil Y TODO desde PC sin fricción. Layout Opción C (sidebar izq + content central + sidebar der contextual).

**Filosofía (decisión cerrada):** La plataforma se construyó mobile-first, pero ahora cada página debe verse impecable en desktop con el layout Opción C. El content central tiene `max-width` limitado para que reels, productos e imágenes no se estiren feo.

**Archivos clave:**
- Frontend: prácticamente todas las páginas + layouts
- Nuevos componentes:
  - `components/layout/DesktopLayout.tsx` (sidebar izq + content + sidebar der contextual)
  - `components/layout/DesktopSidebarLeft.tsx` (nav principal con iconos+labels)
  - `components/layout/DesktopSidebarRight.tsx` (contextual por página)
  - `components/layout/MobileLayout.tsx` (tab bar + hamburger — ya existe mayormente)
  - Responsive wrapper que decide qué layout usar según viewport

**Layout Opción C en desktop:**
```
┌──────┬──────────────────────┬────────────┐
│ Logo │   [Top header bar]   │            │
│      ├──────────────────────┤            │
│ 🏠   │                      │  Contexts  │
│ 🔍   │                      │  dinámicos │
│ ➕   │   Content central    │            │
│ 💬   │   max-w-[680px] feed │  (cambia   │
│ 👤   │   max-w-[1000px]     │   por      │
│      │   otras              │   página)  │
│ ⚙️   │                      │            │
└──────┴──────────────────────┴────────────┘
```

**Sidebar izquierda (desktop):**
- Siempre visible
- Logo HispaloShop top
- Nav principal con iconos + labels:
  - Home (icon)
  - Discover (icon)
  - Crear (+)
  - Mensajes (icon con badge)
  - Perfil (icon con avatar)
- Separator
- Secciones contextuales según rol:
  - Vendedores: "Mi tienda", "Productos", "Pedidos"
  - Influencers: "Mi código", "Comisiones"
  - Admins: "Panel admin"
- Bottom: Configuración, Cerrar sesión
- Collapse a solo iconos en tablets (768-1024px)

**Sidebar derecha (dinámico por página):**
| Página | Contenido sidebar derecho |
|---|---|
| Home feed | Trending hashtags + Suggested creators + "Cerca de ti" |
| Discover | Mapa fijo + filtros avanzados |
| Product detail | Otros productos del productor + reviews summary + related |
| Store page | Stats de tienda + productos destacados |
| Chat | Lista de conversaciones (sidebar izq se fusiona o oculta) |
| Recipe detail | **Ingredientes comprables** con botón "Añadir todo al carrito" |
| Profile | Stats, badges, gamification |
| Producer dashboard | KPIs + alertas en tiempo real + Rebeca AI insights |
| Search results | Filtros avanzados (lado izq) |
| Notifications | Preview del notification seleccionado |
| Communities | Sobre esta comunidad + miembros + últimos posts |

**Sin sidebar derecha (content full):**
- Settings (sidebar propio de settings)
- Checkout (focus en flujo)
- Onboarding

**Content central — max-widths:**
- Feed posts/reels: `max-w-[680px]` (vertical aspect ratio friendly)
- Discover grid: `max-w-[1000px]`
- Product detail: `max-w-[1200px]` con split 2-col interno
- Recipe detail: `max-w-[900px]` + sidebar ingredientes
- Profile: `max-w-[935px]` (Instagram-like)
- Dashboards: `max-w-[1400px]`
- Admin: `max-w-[1600px]` (data-heavy)

**Breakpoints:**
- **Mobile**: `<768px` → tab bar inferior + hamburger + layout 1 col
- **Tablet**: `768-1024px` → sidebar izq compacto (solo iconos) + content + NO sidebar derecho
- **Desktop**: `1024-1440px` → sidebar izq completo + content + sidebar derecho opcional
- **Wide**: `>1440px` → layout Opción C completo los 3 columnas

**Principios de desktop:**
1. **Max-width responsable** — nada se estira feo en pantallas anchas
2. **Hover states** en botones, cards, links
3. **Keyboard shortcuts**: `Ctrl+K` search, `Esc` cerrar, `/` focus search
4. **Tooltips** en iconos sin label
5. **Multi-column grids** donde tiene sentido
6. **Sticky** headers y sidebars
7. **Drag & drop** para reordenar (product dashboard, wishlist)
8. **Right-click menus** donde aplique (no crítico V1)

**Proceso de implementación:**
- **Cada sección del roadmap de Fase 1-3** ya incluye "responsive paridad mobile + desktop" en su criterio de DONE (no pasa a la siguiente sin ello)
- **Esta sección 4.8 es QA global + consistencia** al final — una pasada completa verificando que cada página es idéntica en calidad entre mobile y desktop

**Checklist página por página (QA global):**
- [ ] Home feed — layout 3-col con sidebar trending
- [ ] Discover — mapa sidebar fijo
- [ ] Product detail — 2 col gallery + info
- [ ] Store page — hero + tabs
- [ ] Cart — sidebar resumen + items
- [ ] Checkout — split form + summary sticky
- [ ] Search results — filtros sidebar
- [ ] Profile (público) — bento grid Instagram-style
- [ ] Settings — sidebar nav interno
- [ ] Notifications — list + preview split
- [ ] Chat — lista + chat activo
- [ ] Wishlists — grid
- [ ] Recipe detail — **ingredientes sidebar comprable**
- [ ] Communities — feed con side info
- [ ] Create post/reel/story — editor con preview
- [ ] Producer dashboard — widgets grid
- [ ] Importer dashboard
- [ ] Influencer dashboard (mobile-first pero desktop también)
- [ ] Admin dashboard — data tables
- [ ] Super admin — ya desktop-first
- [ ] Ambassadors page — grid
- [ ] Blog editorial — articles
- [ ] Onboarding — centered modal
- [ ] Landing pages públicas — hero grandes

**Done cuando:**
- `DesktopLayout.tsx` y `MobileLayout.tsx` abstraídos
- Sidebar izquierda funcional en desktop con nav contextual por rol
- Sidebar derecha contextual implementada para cada página
- Todas las páginas del checklist verificadas con viewport 1024, 1280, 1440, 1920
- Keyboard shortcuts principales funcionales
- Hover states en interactive elements
- Max-widths respetados (no content estirado en wide screens)
- Tests visuales (Percy o similar) pasan en 3 viewports
- Lighthouse desktop >85 en páginas críticas

**Dependencias:** Todas las de Fase 1-3 (aunque cada sección ya incluye responsive, esto es QA global)
**Estimación:** 6-8 días (pasada global + fixes acumulados)

---

## 4.9 — Legacy code cleanup (housekeeping tech debt)
**Objetivo:** Limpiar deuda técnica detectada durante Fase 0-3 que no bloquea launch pero debería resolverse antes de invitar a primeros devs o escalar el equipo.

**Origen:** Issues documentados fuera de scope en secciones previas (principalmente 0.2 Infrastructure).

**Archivos clave:**
- `backend/config.py` (legacy duplicado)
- `backend/core/config.py` (activo)
- `backend/routes/auth.py` (naming OAuth inconsistente)
- `backend/DEPLOYMENT.md` (legacy duplicado)
- `backend/scripts/*.py` (~1758 prints)
- `frontend/src/components/feed/README.md`, `frontend/src/components/chat/README.md` (docs desactualizadas)
- Componentes legacy `.hs-btn-*`, `.btn-*`, `.info-*`, `.reveal-*`, `.health-score-*`, `.quick-action-*`

**Tareas:**
1. Consolidar `backend/config.py` + `backend/core/config.py` → un solo archivo canónico
2. Unificar naming OAuth: elegir `GOOGLE_CLIENT_ID` (o el que tenga mejor fit) y eliminar aliases
3. Eliminar `backend/DEPLOYMENT.md` legacy (la raíz ya tiene la versión autoritativa)
4. Migrar `print()` de scripts CLI a `logger` (opcional, baja prioridad — funcionan)
5. Actualizar READMEs desactualizados con paleta actual stone B&W
6. Migrar clases CSS legacy `.hs-btn-*` etc a componentes Tailwind directos donde se usen
7. Deduplicar hooks/componentes con múltiples implementaciones identificadas en audits previos

**Done cuando:**
- Un solo `config.py` en el backend
- Naming OAuth consistente
- READMEs actualizados
- Tests pasan después del cleanup
- Zero regresiones en funcionalidad

**Dependencias:** Todas las fases previas
**Estimación:** 2-3 días

---

# FASE 5 — LAUNCH PREP (semana 16)

## 5.1 — Content seeding
**Objetivo:** Lanzar con contenido real, no con placeholders.

**Done cuando:**
- 30+ productores seed reales en España (contactos del fundador + friends)
- 10+ productores en Corea
- 5+ productores en USA
- 100+ productos totales con fotos profesionales, descripciones completas
- 10+ posts sociales iniciales por el equipo
- 5+ recipes creados
- 20+ influencers early-access (microinfluencers amigos del fundador)
- 5+ landing pages de case studies / productores destacados

**Dependencias:** Fases 1-3
**Estimación:** Ongoing, 2-3 semanas en paralelo

---

## 5.2 — Documentation & runbooks
**Objetivo:** Si el fundador desaparece 2 semanas, alguien puede operar el sistema.

**Done cuando:**
- `README.md` principal con setup
- `backend/README.md` con arquitectura
- `frontend/README.md` con estructura
- `DEPLOYMENT.md` con pasos de deploy + rollback
- `DISASTER_RECOVERY.md`
- `HELP_CENTER/` — FAQs editables
- `PLAYBOOK.md` — cómo onboard a un nuevo admin, cómo responder support común, cómo procesar refund
- Architecture decision records (ADR) en `docs/`

**Dependencias:** Todas
**Estimación:** 3 días

---

## 5.3 — Legal assets finalization
**Objetivo:** Todo lo que dice "ley" está revisado y aprobado.

**Done cuando:**
- Terms of Service (revisado por abogado)
- Privacy Policy (revisado por abogado)
- Cookie Policy
- Seller Agreement
- Influencer Agreement
- Refund Policy
- DMCA policy
- Acceptable Use Policy
- Todos en ES/EN/KO

**Dependencias:** 4.1
**Estimación:** 2 días de gestión + 1-2 semanas de abogado

---

## 5.4 — Launch day checklist
**Objetivo:** Día D. Todo listo. Cero sorpresas.

**Done cuando:**
- Staging idéntico a producción, testeado E2E
- Backup pre-launch
- Monitoring alertas configuradas (Sentry, Railway alerts, Stripe dashboard)
- Landing page con countdown si hay waiting list
- Email de "Estamos live" a la lista pre-registro
- Social media posts programados
- PR pitch para medios (opcional)
- On-call schedule definido (quién atiende bugs día 1)
- Feature flags para desactivar features si algo va mal
- Rollback plan documentado

**Dependencias:** Todas las anteriores
**Estimación:** 2 días

---

## 5.5 — Post-launch monitoring & iteration
**Objetivo:** Semana 1-4 post-launch = estabilización.

**Done cuando:**
- Dashboard de métricas real-time (usuarios, pedidos, revenue, errores)
- Daily standup con equipo (o solo el fundador)
- Hotfix process definido (deploy en <1h si crítico)
- User feedback loop (encuesta al día 7 post-registro)
- NPS tracking
- Churn analysis
- Lista de fixes P0/P1/P2 priorizada

**Dependencias:** 5.4
**Estimación:** Ongoing

---

# Resumen de esfuerzo (scope final cerrado 2026-04-06)

| Fase | Secciones | Días estimados |
|---|---|---|
| Fase 0 — Fundamentos (incluye Navigation audit) | 5 | 10-13 |
| Fase 1 — Consumer (incluye Communities, Recipes, Wishlists, Ambassadors, Blog, Search, Hashtags) | 21 | 70-85 |
| Fase 2 — Sellers (incluye AI UX, Promotion, Market Requests) | 17 | 55-65 |
| Fase 3 — Admin & Ops (incluye Dashboard audits 5 roles) | 6 | 33-39 |
| Fase 4 — Legal/Fiscal/Polish (incluye Desktop adaptation global) | 8 | 28-35 |
| Fase 5 — Launch Prep | 5 | 10-13 + seeding ongoing |
| **Total** | **~62 secciones** | **~206-250 días** ≈ **7-8 meses a tiempo completo** |

> **Nota realista**: Trabajando solo tiempo completo ≈ 7-8 meses. Con Claude ayudando intensivamente en paralelo ≈ 4-5 meses. Trabajando part-time ≈ 10-12 meses.

> **Secciones clave diferenciadoras (killer features)**:
> - 1.16 Recipes con ingredientes comprables (feature único)
> - 2.15 Promotion system como beneficio del plan (no ads tradicionales)
> - 2.16 Market Interest Requests (solicitudes de introducción al mercado) — nadie más hace esto
> - 2.10b AI Assistants unificados con colores por plan (experiencia premium)

---

# Cómo pedir un prompt

Cuando quieras empezar una sección, di: **"Genera el prompt para sección X.Y"**

Recibirás un prompt completo listo para pegar en un chat dedicado (o ejecutar conmigo), con:
- Contexto del Brand DNA
- Alcance exacto
- Archivos a leer primero
- Checklist de auditoría
- Criterios de done verificables
- Qué entregar al final (commit message, tests pasando, etc.)

**Recomendación de orden:**
1. Empezar por **Fase 0 completa** (no saltártela)
2. Luego **Fase 1 en orden** (consumer-first es la filosofía)
3. Fase 2 secciones 2.1 → 2.14
4. Fase 3, 4, 5 en orden

Puedes saltarte secciones si ya están bien, pero pide primero que yo las audite (genero un prompt de "auditoría de sección X.Y ya existente" para confirmar).
