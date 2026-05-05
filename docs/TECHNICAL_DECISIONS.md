# HispaloShop — Decisiones Técnicas

> Fuente de verdad: `MEGA_PLAN.md`
> Actualizado: 2026-04-30

Cada decisión tecnológica de HispaloShop fue tomada con criterios concretos. Este documento explica el **por qué** de cada elección para que cualquier desarrollador o IA entienda el razonamiento antes de proponer cambios.

---

## Base de datos

### MongoDB Atlas — Base de datos principal

**Decisión**: MongoDB para usuarios, productos, pedidos, chat, feed y configuración.

**Razones**:
- Schema flexible: un producto puede tener campos distintos según categoría y país sin migrations costosas.
- Escalado horizontal nativo: sharding cuando el volumen crezca.
- Queries de array y documentos anidados: ideal para `consumer_data.preferences`, etiquetas de producto, ingredientes de receta.
- Atlas gestiona replicación, backups y alertas sin operaciones manuales.
- Text index con pesos: búsqueda full-text sin Elasticsearch para V1 (`name: 10`, `tags: 5`, `category: 3`, `description: 1`).

### PostgreSQL — Base de datos futura (operaciones financieras)

**Decisión**: PostgreSQL se añade en V2 para datos financieros que requieren ACID estricto.

**Razones**:
- Transacciones ACID garantizadas: sin riesgo de pagos parcialmente registrados.
- Relaciones complejas entre órdenes, líneas, impuestos y comisiones.
- Auditoría con logs inmutables (append-only tables).
- MongoDB es suficiente para V1 con el modelo de transacción actual (Stripe como fuente de verdad).

### Por qué el split MongoDB + PostgreSQL

- MongoDB gestiona entidades de marketplace (catálogo, usuarios, feed, chat): cambios frecuentes de schema, queries flexibles.
- PostgreSQL gestionará el libro mayor financiero: estructura fija, consistencia total, no acepta schema drift.
- La separación permite escalar cada sistema según su patrón de carga.

---

## Arquitectura del backend

### Monolito con capa de servicios

**Decisión**: Un solo proceso FastAPI con servicios desacoplados internamente.

**Razones**:
- Simplicidad de despliegue en lanzamiento: un Railway service, una variable de entorno, un proceso.
- Menos latencia que microservicios (sin red entre servicios internos).
- La capa de servicios (`services/`) está desacoplada de las rutas: migrar a microservicios es posible sin reescribir la lógica.
- Escalar horizontalmente: múltiples instancias del mismo monolito detrás de load balancer (stateless).

### FastAPI stateless

**Decisión**: Sin sesiones en servidor, sin sticky sessions.

**Razones**:
- Cualquier instancia puede atender cualquier petición (horizontal scaling trivial).
- JWT en cliente: no hay estado de sesión que sincronizar entre instancias.
- WebSocket es la única excepción: una conexión pertenece a un proceso. Solución en V2: Redis pub/sub para distribuir mensajes entre instancias.

### 66+ rutas organizadas por dominio

**Decisión**: Un archivo de router por dominio (`auth.py`, `products.py`, `cart.py`…).

**Razones**:
- Localizar bugs y añadir features sin leer miles de líneas.
- Permisos claros por router: autenticación, autorización y rate limiting aplicados a nivel de router.
- Facilita onboarding: un desarrollador nuevo sabe exactamente dónde buscar.

---

## API Design

### REST + WebSocket híbrido

**Decisión**: REST para operaciones CRUD, WebSocket para chat en tiempo real.

**Razones**:
- REST es stateless, cacheable y bien soportado en todos los clientes.
- WebSocket es necesario solo para chat: latencia de polling (HTTP polling) sería inaceptable para mensajes.
- Mantener WebSocket en el mismo proceso FastAPI simplifica la arquitectura en V1.

### JWT (JSON Web Tokens)

**Decisión**: Access token (15 min) + refresh token (30 días), sin sesiones en servidor.

**Razones**:
- Stateless: cualquier instancia del backend puede verificar el token sin consultar BD.
- Mobile-friendly: funciona en React Native, web y potencialmente otras plataformas.
- Refresh transparente: el usuario no nota la renovación del token.
- Revocación: el refresh token se puede invalidar en BD si hay sospecha de compromiso.

---

## Frontend

### React 19

**Decisión**: React como framework de UI web.

**Razones**:
- Ecosistema maduro: librerías para cualquier necesidad (React Query, React Hook Form, Radix UI…).
- Rendimiento: Concurrent Mode, Suspense y automatic batching.
- Familiaridad: pool de desarrolladores amplio para contratar.
- Reutilización de lógica con React Native para la futura app móvil.

### React Query (TanStack Query)

**Decisión**: React Query para gestión del estado del servidor, en lugar de Redux.

**Razones**:
- Diseñado específicamente para sincronizar estado del servidor: cache, staleTime, refetch, retry.
- Menos boilerplate que Redux para el caso de uso principal (fetch + cache + mutate).
- Optimistic updates integrados para UX fluida (añadir al carrito, dar like).
- DevTools integrados para depuración.
- Redux añadiría complejidad sin beneficio para un marketplace donde el estado es principalmente servidor.

### TailwindCSS

**Decisión**: Utility-first CSS framework.

**Razones**:
- Responsive por defecto: breakpoints como clases (`md:`, `lg:`).
- Bundle size pequeño en producción: PurgeCSS elimina clases no usadas.
- Consistencia visual: el design system se implementa como clases reutilizables.
- No hay conflictos de especificidad CSS ni naming conventions que mantener.

### Radix UI

**Decisión**: Componentes primitivos sin estilos para UI compleja.

**Razones**:
- Accesibilidad integrada: ARIA, gestión de foco, navegación por teclado — sin trabajo extra.
- Sin estilos propios: se estiliza con Tailwind siguiendo el design system.
- Componentes complejos resueltos: diálogos, dropdowns, tooltips, tabs, acordeones.
- Alternativa a Material UI / Chakra que impondrían estilos difíciles de sobrescribir.

---

## Pagos

### Stripe

**Decisión**: Stripe como único proveedor de pagos en V1.

**Razones**:
- Multi-moneda nativo: EUR, KRW, USD sin configuración especial.
- Webhooks fiables con firma verificada: el backend no confía en el payload sin validar la firma.
- Cumplimiento fuerte: PCI DSS nivel 1, SCA (Strong Customer Authentication) para Europa.
- Soporte en los 3 países de lanzamiento (ES, KR, US).
- Métodos de pago locales en V2: Bizum, Toss/PortOne se añaden sin cambiar la arquitectura.

### Sistema de retry para transferencias

**Decisión**: `pending_transfer` → retry 3x con exponential backoff → `paid` o `transfer_failed`.

**Razones**:
- Stripe puede fallar temporalmente: red, rate limits, errores transitorios.
- Nunca marcar como `paid` sin `stripe_transfer_id` real: evita pagar a vendedores sin cobrar al comprador.
- Exponential backoff: 1s, 4s, 16s — no inunda Stripe con reintentos inmediatos.
- `transfer_failed` + alerta admin: el equipo puede intervenir manualmente si los 3 reintentos fallan.
- Audit trail completo: cada cambio de estado queda registrado con timestamp.

---

## IA (Agentes)

### Anthropic Claude API

**Decisión**: Claude como motor de todos los agentes de IA. OpenAI está prohibido.

**Razones**:
- Razonamiento superior en tareas complejas: análisis de productos, consultoría de importación.
- Tool calling nativo: los agentes pueden llamar a funciones del backend (buscar productos, consultar pedidos).
- Context window extendido: permite mantener contexto de conversación larga.
- Haiku para tareas rápidas (moderación, verificación de documentos): coste bajo, latencia baja.
- Sonnet/Opus para consultoría B2B (Pedro): mayor capacidad de razonamiento.

### Tres tiers de IA

**Decisión**: David (FREE), Rebeca (PRO), Pedro (ELITE).

**Razones**:
- Diferenciación de planes: los agentes de IA justifican la suscripción PRO y ELITE.
- Coste proporcional al valor: David es ligero (alto volumen); Pedro usa modelos más caros (bajo volumen, alto margen).
- Rebeca disponible en PRO: accesible para vendedores en crecimiento, no solo los grandes.
- Super_admin puede previsualizar Rebeca y Pedro con el mismo UI que los usuarios de cada plan.

---

## Notificaciones

### FCM HTTP v1

**Decisión**: Migrar de FCM Legacy API a FCM HTTP v1.

**Razones**:
- Google deprecó la API Legacy: dejará de funcionar, migración obligatoria.
- HTTP v1 usa service account OAuth2 en lugar de server key: más seguro, menos riesgo de key leakage.
- Payload estructurado con `{ message: { token, notification } }` — más explícito.
- Variable de entorno: `FCM_SERVICE_ACCOUNT_JSON` — rotación sin redeploy.

### Dispatch con retry y fallback

**Decisión**: Retry 3x con backoff exponencial, log de fallos.

**Razones**:
- FCM puede fallar temporalmente: no perder notificaciones críticas (confirmación de pedido, mensaje nuevo).
- Quiet hours: no enviar push en horarios de silencio del usuario.
- Historial de notificaciones: el usuario puede revisar notificaciones perdidas en la app.

---

## Tipos de cambio

### ECB (Banco Central Europeo) — Fetch diario

**Decisión**: Cron diario que descarga los tipos del ECB y los guarda en MongoDB.

**Razones**:
- Gratuito y fiable: el ECB publica tipos oficiales diariamente en XML.
- Cubre las monedas principales: EUR, KRW, USD y otras.
- MongoDB como almacén: audit trail de tipos históricos para reconciliar transacciones pasadas.
- Fallback a último tipo conocido: si el fetch falla un día, se usa el tipo del día anterior.
- Fallback a constantes de emergencia: solo si MongoDB está vacío (primer arranque sin red).

---

## Búsqueda

### MongoDB Text Index

**Decisión**: Text index con pesos en MongoDB para búsqueda de productos.

**Razones**:
- No requiere Elasticsearch ni Algolia en V1: menos infraestructura, menos coste.
- Pesos configurados: `name: 10`, `tags: 5`, `category: 3`, `description: 1` — resultados por relevancia.
- `textScore` como criterio de ordenación: el resultado más relevante primero.
- Fallback `$regex`: para autocompletado de prefijos (campo de búsqueda mientras el usuario escribe).
- Migración a Elasticsearch en V2 si el volumen lo justifica: la capa de servicio abstrae la implementación.

---

## Feed y Recomendaciones

### FeedAlgorithm con modo fast/full

**Decisión**: Un único `FeedAlgorithm` con parámetro `mode`.

**Razones**:
- Evitar duplicidad: antes había dos implementaciones de scoring desincronizadas.
- `fast`: solo señales rápidas (recency, engagement, following boost) — para el home feed, latencia baja.
- `full`: todas las señales (category affinity, dwell time, creator affinity) — para discover, más caro pero más preciso.
- Las preferencias del usuario (`consumer_data.preferences`) son el único input de personalización: no hay tabla separada.

---

## Legal y Fiscal

### GDPR — Consent-gated analytics

**Decisión**: No cargar ningún script de analytics hasta consentimiento explícito.

**Razones**:
- Obligatorio en Europa (ES): multas de hasta 4% del volumen global.
- Aplicable también en KR y US por usuarios europeos que viajan o usan VPN.
- Implementación: guard en `trackMarketingEvent()` + no cargar gtag/fbq/PostHog hasta `hasAnalyticsConsent()`.

### VIES — Validación de IVA B2B

**Decisión**: Integrar API VIES para validar VAT ID en checkout B2B.

**Razones**:
- Reverse charge: importadores B2B con VAT ID válido no pagan IVA (lo declaran ellos).
- Sin validación: riesgo fiscal para HispaloShop si se aplica reverse charge sin verificar.
- Cache 24h: los VAT IDs no cambian a diario, evita llamadas redundantes.

### Verificación de vendedores por país

**Decisión**: Validación algorítmica de formato/checksum + revisión admin local si hay dudas.

**Razones**:
- Cada país tiene formato de documento distinto: NIF/CIF (ES), EIN (US), SIRET (FR), 사업자등록번호 (KR).
- Validación automática filtra el 90% de casos triviales: dígito de control, algoritmo Luhn.
- Claude Haiku vision review: detecta documentos manipulados con bajo coste.
- Admin local como árbitro final: entiende el contexto legal de su país.
