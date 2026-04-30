# HispaloShop — Arquitectura Técnica

> Fuente de verdad: `MEGA_PLAN.md` y `ROADMAP_LAUNCH.md`
> Actualizado: 2026-04-30

---

## Visión general

HispaloShop es una plataforma de comercio local y red social para productores, importadores/distribuidores, influencers y consumidores. La arquitectura está diseñada para soportar lanzamiento simultáneo en tres países (ES — España, KR — Corea, US — Estados Unidos) con capacidad de escalado horizontal.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Backend API | FastAPI (Python) | REST + WebSocket |
| Base de datos principal | MongoDB Atlas | Usuarios, productos, pedidos, chat, feed |
| Base de datos futura | PostgreSQL | Operaciones financieras (ACID) |
| Pagos | Stripe | Cobros, webhooks, transferencias |
| Push notifications | Firebase Cloud Messaging v1 | Notificaciones móvil/web |
| IA | Anthropic Claude API | Agentes David, Rebeca, Pedro, Iris |
| Tipos de cambio | ECB (Banco Central Europeo) | Fetch diario gratuito |
| Frontend web | React 19 | SPA multi-idioma |
| Estilos | TailwindCSS + Radix UI | Utilidad + accesibilidad |
| Estado servidor | React Query | Cache + sincronización |
| Internacionalización | i18next | ES, KR, EN, FR, PT |
| Control de versiones | GitHub | CI/CD |
| Hosting frontend | Vercel | Deploy automático |
| Hosting backend | Railway | Servidor Python |

---

## Componentes backend

### API FastAPI

- **Patrón**: Monolito con capa de servicios desacoplada, listo para microservicios en el futuro.
- **Estructura de rutas**: 66+ endpoints organizados por dominio.
- **Autenticación**: JWT (access token + refresh token), sin sesiones en servidor.
- **WebSocket**: Chat en tiempo real gestionado por el mismo proceso FastAPI.

#### Dominios de endpoints

| Dominio | Descripción |
|---|---|
| `/auth` | Login, registro, refresh, logout |
| `/products` | CRUD productos, búsqueda, categorías |
| `/cart` | Gestión carrito, cupones, envío |
| `/orders` | Creación pedidos, tracking, historial |
| `/payments` | Stripe checkout, webhooks, transferencias |
| `/chat` | Mensajes 1-a-1, grupos, comunidades |
| `/feed` | Feed principal, feed de descubrimiento |
| `/notifications` | Preferencias, historial, FCM dispatch |
| `/admin` | Dashboard admin por país |
| `/superadmin` | Gestión global, países, planes |
| `/influencer` | Dashboard, cupones, estadísticas |
| `/config` | Planes, comisiones, configuración global |

### Capa de servicios

| Servicio | Responsabilidad |
|---|---|
| `affiliate_service.py` | Comisiones, transferencias Stripe, retry |
| `ledger.py` | Contabilidad de transacciones, tipos de cambio |
| `feed_algorithm.py` | Scoring del feed (modo fast / full) |
| `recommendations.py` | Motor de recomendaciones personalizado |
| `notifications/dispatcher_service.py` | FCM v1, fallback, retry |
| `exchange_rates.py` | Fetch diario ECB, almacenamiento MongoDB |
| `commission_service.py` | Cálculo splits vendedor/plataforma |
| `producer_verification.py` | Verificación documentos por país |
| `gamification.py` | Objetivos semanales, hitos |
| `vies_service.py` | Validación IVA europeo (VIES) |

### Base de datos — MongoDB Atlas

Colecciones principales:

| Colección | Contenido |
|---|---|
| `users` | Perfil, roles, preferencias, `consumer_data` |
| `products` | Catálogo, precios, stock, texto indexado |
| `orders` | Pedidos, estados, historial |
| `transactions` | Registro contable de cada movimiento |
| `conversations` | Chat 1-a-1 y grupos |
| `messages` | Mensajes individuales |
| `notifications` | Historial de notificaciones |
| `exchange_rates` | Historial de tipos de cambio ECB |
| `country_configs` | Configuración por país (activo, admin) |
| `user_follows` | Seguimientos entre usuarios |
| `communities` | Comunidades de productores y abiertas |

---

## Componentes frontend

### Estructura del proyecto React

```
frontend/src/
├── pages/          # Páginas por dominio (consumer, producer, admin…)
├── components/     # Componentes reutilizables
├── hooks/          # Hooks personalizados (React Query, contexto)
├── context/        # Proveedores de contexto global
├── utils/          # Utilidades (analytics, upload, formateo)
└── locales/        # Traducciones i18next (es, ko, en, fr, pt)
```

### Gestión de estado

| Tipo de estado | Solución |
|---|---|
| Estado del servidor (API) | React Query (staleTime, cache, retry) |
| Estado global UI | Context API |
| Estado de formularios | Estado local + React Hook Form |
| Plan del vendedor | `ProducerPlanContext` con cache localStorage |

### Internacionalización

- Idiomas soportados en V1: ES — Español, KR — Coreano, EN — Inglés
- Idiomas preparados para V2: FR — Francés, PT — Portugués
- Los países se muestran como texto + código: `ES — España`, `KR — Corea`, `US — Estados Unidos`

---

## Flujos de datos clave

### 1. Autenticación

```
Usuario introduce credenciales
  → POST /auth/login
  → Backend valida, genera access_token (15 min) + refresh_token (30 días)
  → Frontend almacena en memoria (access) y httpOnly cookie (refresh)
  → Peticiones autenticadas: Bearer token en Authorization header
  → Expirado: refresh automático en background
```

### 2. Descubrimiento de productos (Feed)

```
Usuario abre home o discover
  → GET /feed/foryou (modo fast) o GET /discovery/feed (modo full)
  → FeedAlgorithm.score(mode, user_preferences, country)
  → Scores: recency + engagement + following boost + category affinity
  → Resultado paginado con cursor
  → React Query cachea 5 minutos, refresca en background
```

### 3. Flujo de compra

```
Producto → "Añadir al carrito"
  → POST /cart/items (multi-productor soportado)
  → Carrito persiste en BD (no localStorage)
  → POST /cart/checkout → valida stock, calcula envío, aplica cupones
  → POST /payments/create-intent → Stripe Payment Intent
  → Frontend: Stripe Elements (tarjeta)
  → Webhook Stripe → POST /payments/webhook (firma verificada)
  → Estado pedido: pending → confirmed → paid
  → Notificación al comprador y al vendedor
  → Transferencia al vendedor: pending_transfer → retry 3x → paid / transfer_failed
```

### 4. Chat en tiempo real

```
Usuario abre conversación
  → WebSocket connect: ws://api/chat/ws/{conversation_id}
  → Mensajes enviados por WebSocket
  → Backend publica en room, distribuye a participantes conectados
  → Mensajes persistidos en MongoDB (conversations + messages)
  → Usuarios desconectados: notificación push FCM
```

### 5. Notificaciones push

```
Evento (nuevo pedido, mensaje, etc.)
  → dispatcher_service.dispatch(user_id, event_type, payload)
  → Verifica quiet hours del usuario
  → FCM HTTP v1: POST /v1/projects/{id}/messages:send
  → Auth: service account OAuth2 (google-auth)
  → Fallo FCM → retry 3x con backoff
  → Fallo total → registrar en historial como failed
```

### 6. Tipos de cambio

```
Cron diario (Railway scheduler)
  → POST /admin/cron/update-exchange-rates
  → exchange_rates.py fetch ECB XML
  → Guardar en MongoDB colección exchange_rates con fecha
  → ledger.py lee siempre de BD (no constantes hardcoded)
  → Si fetch falla: usar último registro en BD
  → Si BD vacía: fallback a constantes de emergencia (log warning)
```

---

## Agentes de IA

| Agente | Plan requerido | Rol |
|---|---|---|
| David AI | FREE (todos) | Nutricionista personal, ayuda al consumidor |
| Rebeca AI | PRO | Agente comercial nacional para vendedores |
| Pedro AI | ELITE | Consultor de importación/exportación B2B |
| Iris | Interno (plataforma) | Moderación, seguridad, detección de fraude |

- Motor: Anthropic Claude API (prohibido OpenAI)
- Arquitectura: tool calling, context window extendido, acceso a datos del usuario según rol
- Acceso Rebeca: super_admin puede previsualizarla con el mismo UI que un usuario PRO

---

## Infraestructura multi-país

| Componente | Solución |
|---|---|
| CDN | Cloudflare (3 regiones) |
| Base de datos | MongoDB Atlas con backup regional |
| Autenticación | JWT stateless (funciona globalmente) |
| Pagos | Stripe (multi-moneda, métodos locales en V2) |
| Impuestos | VIES para validación IVA B2B (Europa) |
| Admin por país | Queries con filtro `country_scope` |
| Verificación vendedores | NIF/EIN/SIRET/사업자등록번호 + revisión admin local |

---

## Arquitectura de seguridad

- **Autenticación**: JWT con rotación de tokens
- **Autorización**: RBAC — roles: consumer, producer, importador/distribuidor, influencer, admin, super_admin
- **Admin sin país asignado**: acceso denegado (solo super_admin tiene scope global)
- **Pagos**: Stripe webhooks con firma verificada (no confiar en payload sin validar)
- **GDPR**: scripts de analytics solo se cargan con consentimiento explícito
- **Uploads**: validación de tipo y tamaño en backend
- **Rate limiting**: Redis (implementado en capa de middleware)
