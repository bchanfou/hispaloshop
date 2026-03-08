# PLAN DE ACCIÓN EXTENDIDO - HISPALOSHOP

## 🎯 OBJETIVO FINAL
Sistema 100% funcional con datos reales, sin páginas en blanco, listo para producción.

**Fecha de inicio:** 8 de Marzo 2026  
**Duración estimada:** 10-12 días  
**Equipo:** 1 desarrollador full-stack

---

## 📋 FASE 1: FIX CRÍTICOS (Días 1-2)

### Día 1: Diagnóstico y Fixes de Supervivencia

#### Tarea 1.1: Revisar todas las páginas principales (2 horas)
```
Páginas a verificar:
- [ ] / (Home)
- [ ] /login
- [ ] /register
- [ ] /onboarding
- [ ] /dashboard
- [ ] /products
- [ ] /products/:id
- [ ] /store/:slug
- [ ] /discover
- [ ] /profile/:userId
- [ ] /cart
- [ ] /checkout
```

**Proceso:**
1. Abrir cada página en navegador
2. Verificar que carga sin errores en consola
3. Si está en blanco, identificar el error
4. Documentar en log de errores

#### Tarea 1.2: Fix errores de imports (2 horas)
```javascript
// Errores comunes a buscar:
- Cannot find module '@/hooks/useFeed'
- Cannot read property of undefined
- useSWR is not defined
- api is not defined
```

**Fixes:**
- Verificar que todos los imports de `@/` resuelven correctamente
- Asegurar que `useFeed.js` existe (no solo .ts)
- Verificar que `api.ts` exporta correctamente

#### Tarea 1.3: Agregar Error Boundaries (2 horas)
```javascript
// Crear SimpleErrorBoundary.jsx
// Wrapper para todas las páginas principales
// Mostrar mensaje amigable cuando algo falla
```

**Archivos a modificar:**
- `App.js` - Agregar ErrorBoundary global
- `pages/HomePage.js` - Wrap FeedContainer
- `pages/Dashboard` - Wrap cada dashboard

#### Tarea 1.4: Loading States (2 horas)
```javascript
// Asegurar que todas las páginas con fetch tengan:
- Skeleton loading
- Spinner de carga
- Mensaje si está vacío
- Mensaje si hay error
```

**Páginas prioritarias:**
- ForYouFeed
- FollowingFeed
- ProductsPage
- StorePage
- Dashboards

---

### Día 2: Endpoints Backend y API

#### Tarea 2.1: Listar todos los endpoints usados (2 horas)
```bash
# Buscar todos los llamados a API en frontend
grep -r "api\." frontend/src --include="*.js" --include="*.jsx" | grep -v "node_modules"
```

**Documentar:**
- Endpoint
- Componente que lo usa
- Si existe en backend
- Si funciona correctamente

#### Tarea 2.2: Verificar endpoints críticos (3 horas)
```
Endpoints a testear:
✅ POST /api/auth/login
✅ POST /api/auth/register
✅ GET /api/auth/me
✅ GET /api/products
✅ GET /api/products/:id
✅ GET /api/posts
✅ GET /api/store/:slug
✅ GET /api/orders
⚠️ GET /api/producer/stats
⚠️ GET /api/importer/stats
⚠️ GET /api/influencer/dashboard
⚠️ GET /api/wishlist
```

**Proceso:**
1. Hacer request con curl/Postman
2. Verificar respuesta 200
3. Verificar estructura de datos
4. Documentar inconsistencias

#### Tarea 2.3: Crear endpoints faltantes (3 horas)
```python
# Si faltan, crear:
- GET /api/producer/stats - KPIs para dashboard
- GET /api/importer/stats - KPIs para dashboard  
- GET /api/wishlist - Lista de favoritos
- GET /api/notifications - Notificaciones del usuario
```

---

## 📋 FASE 2: REEMPLAZAR DATOS MOCK (Días 3-5)

### Día 3: DiscoverPage y Navegación

#### Tarea 3.1: DiscoverPage - Datos Reales (4 horas)
```javascript
// Reemplazar en DiscoverPage.js:

// ANTES (MOCK):
const TRENDING_HASHTAGS = [...] // Mock
const FEATURED_PRODUCERS = [...] // Mock
const RECENT_PRODUCTS = [...] // Mock

// DESPUÉS (API):
const { data: trendingData } = useSWR('/api/trending/hashtags', fetcher)
const { data: producersData } = useSWR('/api/producers/featured', fetcher)
const { data: productsData } = useSWR('/api/products/recent', fetcher)
```

**Endpoints necesarios:**
- `GET /api/trending/hashtags`
- `GET /api/producers/featured`
- `GET /api/products/recent`
- `GET /api/recipes/featured`

#### Tarea 3.2: Implementar búsqueda real (2 horas)
```javascript
// Conectar search con API
const handleSearch = async (query) => {
  const results = await api.get('/api/search?q=' + query)
  // Mostrar resultados
}
```

**Endpoint:**
- `GET /api/search?q={query}&type={products|stores|recipes}`

#### Tarea 3.3: CategoryPage filtros (2 horas)
```javascript
// Asegurar que filtros funcionan:
- Precio (min/max)
- Ubicación
- Certificaciones
- Valoración
```

---

### Día 4: UserProfile y Social

#### Tarea 4.1: UserProfilePage (4 horas)
```javascript
// Verificar que carga:
- Datos del usuario (nombre, bio, avatar)
- Posts del usuario
- Seguidores/Siguiendo
- Botón seguir/dejar de seguir
- Estadísticas
```

**Endpoints a verificar:**
- `GET /api/users/:id`
- `GET /api/users/:id/posts`
- `POST /api/follows/:id`
- `GET /api/users/:id/followers`
- `GET /api/users/:id/following`

#### Tarea 4.2: Stories (2 horas)
```javascript
// Verificar StoriesCarousel.js
- Carga stories reales?
- Se pueden crear stories?
- Se ven correctamente?
```

**Endpoints:**
- `GET /api/stories/feed`
- `POST /api/stories`

#### Tarea 4.3: Reels (2 horas)
```javascript
// Verificar ReelsContainer.js
- Carga reels reales?
- Funciona el scroll?
- Like/comment/share funcionan?
```

---

### Día 5: Stores y Productos

#### Tarea 5.1: StoresListPage (3 horas)
```javascript
// Actualizar StoresListPage.js
const { stores } = useStores({ type: filter, page: currentPage })
// Implementar filtros por ubicación
// Implementar ordenamiento
// Implementar búsqueda
```

#### Tarea 5.2: ProductDetailPage (3 horas)
```javascript
// Verificar:
- Carga producto real
- Muestra imágenes
- Botón "Añadir al carrito" funciona
- Reviews se cargan
- Productos relacionados
```

#### Tarea 5.3: StorePage (2 horas)
```javascript
// Verificar:
- Perfil de tienda carga
- Productos de la tienda se muestran
- Información de contacto
- Reviews de la tienda
```

---

## 📋 FASE 3: FUNCIONALIDADES AVANZADAS (Días 6-8)

### Día 6: Chat y Mensajes

#### Tarea 6.1: Chat HI AI (3 horas)
```javascript
// Verificar AIAssistant.js
- Conecta con backend?
- Respuestas coherentes?
- Historial se guarda?
```

**Endpoints:**
- `POST /api/ai/chat`
- `GET /api/ai/chat/:sessionId/history`

#### Tarea 6.2: Chat entre usuarios (3 horas)
```javascript
// Verificar InternalChat.js
- Lista de conversaciones
- Envío de mensajes
- Notificaciones de mensaje nuevo
```

**Endpoints:**
- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `POST /api/chat/conversations/:id/messages`
- WebSocket para tiempo real

#### Tarea 6.3: WebSocket (2 horas)
```javascript
// Verificar conexión WS
// Reconexión automática
// Heartbeat
```

---

### Día 7: Checkout y Pagos

#### Tarea 7.1: Carrito (3 horas)
```javascript
// Verificar CartPage.js
- Añadir producto
- Modificar cantidad
- Eliminar producto
- Calcular totales
- Guardar en backend (persistencia)
```

#### Tarea 7.2: Checkout Flow (3 horas)
```javascript
// Verificar CheckoutPage.js
- Dirección de envío
- Método de pago
- Stripe integration
- Confirmación de orden
```

#### Tarea 7.3: Webhooks Stripe (2 horas)
```python
# Backend:
# Crear endpoint para webhooks
@router.post("/webhooks/stripe")
async def stripe_webhook(request):
    # Manejar pagos confirmados
    # Actualizar orden
    # Notificar usuario
```

---

### Día 8: Notificaciones

#### Tarea 8.1: Notificaciones In-App (4 horas)
```javascript
// Crear NotificationCenter.jsx
// Mostrar notificaciones en tiempo real
// Marcar como leídas
// Diferentes tipos (pedido, mensaje, seguidor)
```

**Endpoints:**
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `GET /api/notifications/unread-count`

#### Tarea 8.2: Push Notifications (4 horas)
```javascript
// Configurar service worker
// Suscribirse a notificaciones
// Enviar desde backend
```

---

## 📋 FASE 4: OPTIMIZACIÓN Y TESTING (Días 9-10)

### Día 9: Performance y UX

#### Tarea 9.1: Lazy Loading (2 horas)
```javascript
// Implementar code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

#### Tarea 9.2: Optimización de imágenes (2 horas)
```javascript
// Implementar lazy loading de imágenes
// Usar placeholder mientras carga
// Optimizar formatos
```

#### Tarea 9.3: Mejorar estados vacíos (2 horas)
```javascript
// Crear EmptyState component
// Mensajes amigables cuando no hay datos
// Calls to action claros
```

#### Tarea 9.4: Responsive fixes (2 horas)
```css
/* Revisar en móvil: */
- Navegación
- Cards de productos
- Formularios
- Tablas
```

---

### Día 10: Testing y QA

#### Tarea 10.1: Test E2E críticos (4 horas)
```javascript
// Tests a implementar:
1. Login → Dashboard → Logout
2. Registro → Onboarding → Ver productos
3. Añadir al carrito → Checkout
4. Crear post → Ver en feed
5. Seguir usuario → Ver en following
```

#### Tarea 10.2: Test en móviles (2 horas)
```
- Probar en iOS Safari
- Probar en Android Chrome
- Verificar touch gestures
- Verificar responsive
```

#### Tarea 10.3: Security audit (2 horas)
```
- Verificar CORS configurado
- Verificar headers de seguridad
- Revisar tokens y auth
- Sanitizar inputs
```

---

## 📋 FASE 5: DEPLOY (Día 11)

### Día 11: Deploy a Producción

#### Tarea 11.1: Preparación (2 horas)
```bash
# Verificar variables de entorno
REACT_APP_API_URL=https://api.hispaloshop.com
REACT_APP_STRIPE_KEY=pk_live_xxx
REACT_APP_ENV=production

# Backend
ENV=production
ALLOWED_ORIGINS=https://hispaloshop.com
```

#### Tarea 11.2: Build y Test en Staging (3 horas)
```bash
# Frontend
npm run build
# Verificar build sin errores

# Deploy a staging
# Test todas las funcionalidades críticas
```

#### Tarea 11.3: Deploy a Producción (3 horas)
```bash
# Backend
# Backup de base de datos
# Deploy nuevo código
# Run migraciones si hay

# Frontend
# Deploy a CDN/Railway
# Verificar HTTPS
# Verificar dominio
```

---

## 🎯 CRITERIOS DE ÉXITO

Para considerar el sistema **100% COMPLETADO**, debe cumplir:

### Funcionalidad
- [ ] 100% de páginas cargan sin errores
- [ ] 0 datos mock en producción
- [ ] Todas las funcionalidades críticas funcionan
- [ ] Flujo de compra end-to-end funciona

### Performance
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s

### Calidad
- [ ] 0 errores en consola
- [ ] 0 memory leaks
- [ ] Responsive en todos los dispositivos
- [ ] Accesible (WCAG 2.1 AA)

### Seguridad
- [ ] HTTPS completo
- [ ] Auth segura
- [ ] Datos sensibles protegidos
- [ ] Rate limiting activo

---

## 📊 CHECKLIST DIARIO

### Al inicio del día:
- [ ] Revisar tareas pendientes del día anterior
- [ ] Actualizar rama de trabajo
- [ ] Hacer pull de cambios

### Durante el día:
- [ ] Commit frecuentes con mensajes claros
- [ ] Probar cada cambio localmente
- [ ] Documentar decisiones importantes

### Al final del día:
- [ ] Push de cambios
- [ ] Deploy a staging si es estable
- [ ] Actualizar este documento con progreso
- [ ] Planear tareas para mañana

---

## 🚨 PROTOCOLO DE EMERGENCIA

Si algo se rompe críticamente:

1. **NO HACER PANIC**
2. Revertir al último commit estable
3. Deploy versión estable a producción
4. Debug el problema en local/staging
5. Fix y deploy nuevo

---

## 📈 MÉTRICAS DE PROGRESO

| Día | Objetivo | Estado |
|-----|----------|--------|
| 1 | Fixes críticos | ⬜ |
| 2 | Endpoints backend | ⬜ |
| 3 | DiscoverPage real | ⬜ |
| 4 | UserProfile real | ⬜ |
| 5 | Stores/Productos | ⬜ |
| 6 | Chat system | ⬜ |
| 7 | Checkout | ⬜ |
| 8 | Notificaciones | ⬜ |
| 9 | Performance | ⬜ |
| 10 | Testing | ⬜ |
| 11 | Deploy | ⬜ |

---

**Última actualización:** 8 de Marzo 2026  
**Responsable:** [Desarrollador]  
**Estado:** En progreso
