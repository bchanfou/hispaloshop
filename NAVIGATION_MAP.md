# HispaloShop — Navigation Map

> Mapa completo de rutas, entry points y permisos. Generado en FASE 0.

---

## Leyenda

| Icono | Significado |
|-------|-------------|
| 🌐 | Pública (no requiere login) |
| 🔒 | Requiere autenticación |
| 👤 | Requiere rol específico |
| 📱 | Mobile-first (responsive) |
| 💻 | Desktop-first (data-heavy) |

---

## Tab Bar Inferior (Mobile)

| Icono | Label | Ruta | Estado | Notas |
|-------|-------|------|--------|-------|
| 🏠 | Inicio | `/` | ✅ Activo | Feed principal |
| 🧭 | Explorar | `/discover` | ✅ Activo | Discover page |
| ➕ | Crear | (sheet) | ✅ Activo | Abre CreateContentSheet |
| ▶️ | Reels | `/reels` | ✅ Activo | Feed de reels |
| 👤 | Perfil | `/:username` | ✅ Activo | Perfil del usuario |

**Hidden on:** `/login`, `/register`, `/chat`, `/messages`, `/reels/*`, `/admin/*`, `/dashboard/*`, `/producer/*`, `/importer/*`, `/influencer/*`

---

## Hamburger Menu (Drawer Derecho)

### MI CUENTA
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Perfil | `/:username` | 🔒 | Info del usuario logueado |
| Pedidos | `/orders` | 🔒 | Historial de compras |
| Guardados y listas | `/saved` | 🔒 | Wishlist |
| Tu actividad | `/activity` | 🔒 | Actividad social |
| Mensajes | `/messages` | 🔒 | Chat/Conversations |
| Notificaciones | `/notifications` | 🔒 | Centro de notificaciones |

### EXPLORAR
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Descubrir | `/discover` | 🌐 | Discover page principal |
| Productos | `/products` | 🌐 | Catálogo de productos |
| Tiendas | `/stores` | 🌐 | Directorio de tiendas |
| Comunidades | `/communities` | 🌐 | Lista de comunidades |
| Recetas | `/recipes` | 🌐 | Recetas con ingredientes |
| Certificaciones | `/certifications` | 🌐 | Certificados de productos |

### PARA VENDEDORES (contextual: `role === 'producer' || role === 'importer'`)
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Dashboard | `/producer` | 👤 | Producer overview |
| Productos | `/producer/products` | 👤 | Gestión de productos |
| Ventas | `/producer/orders` | 👤 | Órdenes del vendedor |
| Importador | `/importer` | 👤 | Solo si `role === 'importer'` |

### PARA INFLUENCERS (contextual: `role === 'influencer'`)
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Dashboard | `/influencer/dashboard` | 👤 | Influencer overview |
| Códigos | `/influencer/codes` | 👤 | Códigos de descuento |
| Comisiones | `/influencer/payouts` | 👤 | Ganancias y retiros |

### ¿ERES VENDEDOR? (contextual: `user && !isSeller`)
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Soy productor | `/informativas/soy-productor` | 🔒 | Landing productor |
| Soy importador | `/informativas/soy-importador` | 🔒 | Landing importador |
| Soy influencer | `/influencer/aplicar` | 🔒 | Aplicar a influencer |

### PREFERENCIAS
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| País | (accordion) | 🔒 | Selector de país |
| Idioma | (accordion) | 🔒 | ES / EN / KO |
| Divisa | (accordion) | 🔒 | EUR / USD / KRW |

### AYUDA
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| ¿Qué es HispaloShop? | `/que-es` | 🌐 | Landing explicativa |
| Centro de ayuda | `/help` | 🌐 | FAQ y soporte |
| Términos | `/terms` | 🌐 | Términos de servicio |
| Privacidad | `/privacy` | 🌐 | Política de privacidad |

### FOOTER
| Item | Ruta | Auth | Notas |
|------|------|------|-------|
| Configuración | `/settings` | 🔒 | Settings del usuario |
| Cerrar sesión | (action) | 🔒 | Logout + redirect `/` |

---

## Rutas Principales por Categoría

### Auth (Públicas)
| Ruta | Descripción |
|------|-------------|
| `/login` | Login de usuarios |
| `/register` | Registro de consumers |
| `/forgot-password` | Recuperar contraseña |
| `/reset-password` | Reset de contraseña |
| `/verify-email` | Verificación de email |

### Onboarding (Auth requerido)
| Ruta | Descripción |
|------|-------------|
| `/onboarding` | Flujo de onboarding post-registro |
| `/onboarding/consumer` | Onboarding específico consumer |
| `/onboarding/producer` | Onboarding específico producer |

### Consumer (Auth requerido)
| Ruta | Descripción |
|------|-------------|
| `/cart` | Carrito de compras |
| `/checkout` | Checkout flow |
| `/checkout/success` | Confirmación de compra |
| `/orders/:id` | Detalle de orden |
| `/wishlists` | Listas de deseos |
| `/wishlists/:slug` | Wishlist pública |

### Producer/Importer (Rol requerido)
| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/producer` | Dashboard overview | producer, importer |
| `/producer/products` | Lista de productos | producer, importer |
| `/producer/products/new` | Crear producto | producer, importer |
| `/producer/orders` | Gestión de órdenes | producer, importer |
| `/producer/store-profile` | Perfil de tienda | producer, importer |
| `/producer/analytics` | Análisis de ventas | producer, importer |
| `/producer/payments` | Pagos y retiros | producer, importer |
| `/producer/plan` | Suscripción y plan | producer, importer |
| `/importer` | Dashboard importador | importer |
| `/importer/opportunities` | Oportunidades de mercado | importer |

### Influencer (Rol requerido)
| Ruta | Descripción |
|------|-------------|
| `/influencer/dashboard` | Dashboard overview |
| `/influencer/insights` | Analytics y métricas |
| `/influencer/payouts` | Historial de pagos |
| `/influencer/fiscal` | Configuración fiscal |

### Admin (Rol requerido)
| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/admin` | Admin overview | admin, super_admin |
| `/admin/verification` | Cola de verificación | admin, super_admin |
| `/admin/products` | Moderación de productos | admin, super_admin |
| `/admin/orders` | Gestión de órdenes | admin, super_admin |
| `/admin/users` | Gestión de usuarios | admin, super_admin |
| `/admin/support` | Tickets de soporte | admin, super_admin |

### Super Admin (Rol requerido)
| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/super-admin` | Superadmin overview | super_admin |
| `/super-admin/markets` | Coverage de países | super_admin |
| `/super-admin/plans` | Configuración de planes | super_admin |
| `/super-admin/users` | Búsqueda global de users | super_admin |

---

## Deep Links

### Productos
```
/products/:id                    → Detalle de producto
/products/:id?variant=:variantId → Producto con variante seleccionada
/store/:slug                     → Tienda del vendedor
/store/:slug?tab=products        → Tienda, tab productos
/store/:slug?tab=reviews         → Tienda, tab reviews
```

### Social
```
/p/:postId                       → Post detalle
/reels/:reelId                   → Reel detalle (fullscreen)
/@:username                      → Perfil público
/stories/:userId                 → Stories de usuario
/tag/:hashtag                    → Página de hashtag
```

### Checkout
```
/checkout?product=:productId     → Buy now (un solo producto)
/checkout?code=:discountCode     → Checkout con código aplicado
```

### Afiliados
```
/r/:code                         → Link de referido
/@:username?code=:code           → Perfil con código aplicado
```

---

## Routing Guards

```typescript
// Pseudocódigo de guards
const guards = {
  public: [/* no auth required */],
  auth: [/* requires login */],
  producer: [/* requires role === 'producer' || 'importer' */],
  importer: [/* requires role === 'importer' */],
  influencer: [/* requires role === 'influencer' */],
  admin: [/* requires role === 'admin' || 'super_admin' */],
  superAdmin: [/* requires role === 'super_admin' */],
};
```

### Comportamiento de Guards

| Guard | No auth | Auth wrong role | Auth correct role |
|-------|---------|-----------------|-------------------|
| `public` | ✅ Ver | ✅ Ver | ✅ Ver |
| `auth` | → `/login` | ✅ Ver | ✅ Ver |
| `producer` | → `/login` | → `/` (home) | ✅ Ver |
| `importer` | → `/login` | → `/` (home) | ✅ Ver |
| `influencer` | → `/login` | → `/` (home) | ✅ Ver |
| `admin` | → `/login` | → `/` (home) | ✅ Ver |
| `superAdmin` | → `/login` | → `/` (home) | ✅ Ver |

---

## Responsive Breakpoints

| Breakpoint | Layout | Navegación |
|------------|--------|------------|
| `< 768px` | Mobile | Tab bar bottom + Hamburger menu |
| `768px - 1024px` | Tablet | Sidebar compacto (iconos) + Hamburger menu |
| `> 1024px` | Desktop | Sidebar left completo + Header search |

---

## Estado de Implementación

| Sección | Estado | Commit |
|---------|--------|--------|
| Tab bar bottom | ✅ Completo | baseline |
| Hamburger menu | ✅ Reestructurado | FASE 0 |
| Routing guards | ✅ Funcional | baseline |
| Deep links | ⚠️ Parcial | Algunos params no implementados |
| Desktop sidebar | ⚠️ Parcial | Layout existe, contenido en progreso |

---

**Actualizado:** FASE 0 - Navigation audit complete
