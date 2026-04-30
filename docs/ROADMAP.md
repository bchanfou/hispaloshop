# HispaloShop — Roadmap de Lanzamiento

> Fuente de verdad: `MEGA_PLAN.md` y `ROADMAP_LAUNCH.md`
> Lanzamiento: ES — España + KR — Corea + US — Estados Unidos
> Actualizado: 2026-04-30

---

## Modelo de negocio (resumen operativo)

### Participantes del marketplace

| Rol | Descripción |
|---|---|
| Productor | Vende productos locales a consumidores de su mismo país |
| Importador/Distribuidor | Vende productos locales y puede comprar B2B de productores en otros países para revender |
| Consumidor | Compra productos dentro de su país |
| Influencer | Promociona productos con código de descuento atribuido (18 meses) |
| Admin (país) | Gestiona verificación de vendedores y soporte en su país |
| Super Admin | Acceso global, activa países, asigna admins |

### Modelo de envíos

Cada vendedor decide independientemente su estrategia de envío:

- **Opción A**: Envío gratuito (el vendedor absorbe el coste)
- **Opción B**: Envío con coste fijo (el vendedor define el importe)
- **Opción C**: Envío gratuito a partir de X importe (el vendedor define el umbral)

La plataforma no fija ni gestiona costes de envío: cada vendedor compite con su propia propuesta.

### Comisiones por venta

| Plan | Seller | Plataforma | Precio mensual |
|---|---|---|---|
| FREE | 80% | 20% | 0 |
| PRO | 82% | 18% | 79 EUR/mes |
| ELITE | 83% | 17% | 249 EUR/mes |

### Comisiones de influencers (sobre la parte de la plataforma)

| Tier | Comisión |
|---|---|
| HERCULES | 3% |
| ATENEA | 5% |
| ZEUS | 7% |

### Primera compra con código influencer

- Consumidor: -10% de descuento
- Vendedor: cobra sobre precio original (no sobre precio con descuento)
- Plataforma: absorbe el 10%
- Código influencer no acumulable con otros cupones
- Atribución: 18 meses

### Agentes de IA

| Agente | Plan | Descripción |
|---|---|---|
| David AI | FREE (todos) | Nutricionista personal, ayuda al consumidor |
| Rebeca AI | PRO | Agente comercial nacional para vendedores |
| Pedro AI | ELITE | Consultor de importación/exportación B2B |

Super_admin puede previsualizar Rebeca (PRO) y Pedro (ELITE) con el mismo UI que los usuarios de cada plan.

---

## Fase 1 — Mayo: Fundamentos y correcciones críticas

### Semana 1-2: Ciclo 1 — Dinero y notificaciones

Objetivo: que el dinero se mueva correctamente y las notificaciones push sigan funcionando.

- Stripe transfer retry: estado `pending_transfer` + 3 reintentos (1s, 4s, 16s) + alerta admin si falla
- Nunca marcar como `paid` sin `stripe_transfer_id` real
- Migración FCM a HTTP v1: service account OAuth2, nuevo payload
- Tipos de cambio dinámicos: cron diario ECB, almacenamiento en MongoDB, fallback a último registro

### Semana 3-4: Ciclo 2 — Comisiones centralizadas

Objetivo: nueva estructura de comisiones implementada y centralizada.

- Endpoint `GET /config/plans` como fuente única de comisiones y configuración
- Hook `usePlanConfig()` en frontend con staleTime 1h
- Actualizar ELITE de 15% a 17%
- Cupón configurable para influencers desde su dashboard
- Eliminar código muerto: `calculate_dynamic_commission()`, líneas inalcanzables en `cron.py`

---

## Fase 2 — Junio: Pulido de plataforma y feed

### Semana 1-2: Ciclo 3 — Feed unificado

Objetivo: un solo motor de feed, preferencias conectadas, búsqueda con relevancia.

- `FeedAlgorithm` con `mode=fast` (home) y `mode=full` (discover)
- Preferencias del usuario conectadas al algoritmo (`consumer_data.preferences`)
- Text index MongoDB en productos: `name (10)`, `tags (5)`, `category (3)`, `description (1)`
- Unificar colecciones `db.follows` → `db.user_follows`

### Semana 3-4: App móvil React Native — inicio

- Estructura del proyecto React Native
- Auth flow: login, registro, JWT
- Navegación principal y browsing de productos
- Carrito básico

---

## Fase 3 — Julio: Legal, fiscal e infraestructura de admin

### Semana 1-2: Ciclo 4 — Legal

Objetivo: cumplimiento GDPR, IVA correcto, verificación de vendedores por país.

- GDPR: no cargar scripts de analytics sin consentimiento explícito
- Validación VIES para VAT ID en checkout B2B (importadores)
- Verificación de documentos por país: NIF/CIF (ES), EIN (US), SIRET (FR), 사업자등록번호 (KR)
- Flujo: validación algorítmica → Claude Haiku vision review → admin local si hay dudas

### Semana 3-4: Ciclo 5 — Country admin completo

Objetivo: sistema de admin local completo y seguro.

- Admin sin `assigned_country` → acceso denegado (solo super_admin tiene scope global)
- Country-scope en todas las secciones: verificación, cupones, influencers, fiscal, moderación
- UI super_admin: activación de países + asignación de admins locales
- Sincronización `country_configs` con todos los países soportados

---

## Fase 4 — Agosto: Lanzamiento de app móvil

### Semana 1-2: App móvil feature complete (~85%)

- Catálogo completo de productos con búsqueda y filtros
- Carrito + checkout completo con Stripe
- Tracking de pedidos
- Chat en tiempo real
- Notificaciones push

### Semana 3: Beta testing

- Testing interno (equipo + usuarios seleccionados)
- Corrección de crashes y optimización de rendimiento
- Accesibilidad y rendimiento en dispositivos de gama media

### Semana 4: Lanzamiento oficial

- ES — España: web + app móvil (iOS + Android)
- KR — Corea: web + app móvil (iOS + Android)
- Monitorización 24/7 primera semana
- Soporte en tiempo real

---

## Fase 5 — Septiembre: Crecimiento e iteración

### Semana 1-2: Monitorización post-lanzamiento

- Monitorizar errores, feedback de usuarios
- Corrección de bugs críticos
- Optimización de funnels de conversión (registro, primera compra)

### Semana 3-4: Preparación US — Estados Unidos

- Verificación de vendedores USA: EIN, documentos fiscales
- Localización: USD, EN, impuestos USA
- Asignación de admin local USA
- Pruebas de carga en infraestructura

---

## Fase 6 — Octubre: Lanzamiento USA y IA a producción completa

### Semana 1: Lanzamiento USA

- US — Estados Unidos: web + app móvil
- Lanzamiento coordinado con monitorización en los 3 países
- Soporte 24/7 across timezones

### Semana 2-3: IA a producción completa

- David (FREE): totalmente optimizado, en todos los países
- Rebeca (PRO): habilitada para planes PRO, super_admin puede previsualizar
- Pedro (ELITE): habilitado para planes ELITE, super_admin puede previsualizar
- A/B testing con PostHog para optimizar conversión de planes

### Semana 4: Análisis de métricas y planificación Q1 2027

- LTV, CAC, tasa de conversión por país
- Retención de vendedores y tasa de recompra de consumidores
- Feature requests de usuarios reales
- Planificación próximos 3 meses (roadmap Q1 2027)

---

## Métricas clave a seguir

### Día de lanzamiento
- Registros de nuevos usuarios
- Vistas de productos
- Tasa de añadido al carrito

### Primera semana
- Pedidos completados
- Tasa de conversión (visita → compra)
- Tasa de éxito en pagos
- Tiempo de respuesta API (p95 < 300ms)

### Primer mes
- LTV (Lifetime Value) por usuario
- CAC (Coste de Adquisición de Cliente)
- Retención de vendedores (activos al mes 2)
- Usuarios activos mensuales por país

### Métricas continuas
- Engagement en chat
- Adopción de agentes IA por plan
- Tasa de reembolsos
- Tasa de verificación de vendedores aprobada automáticamente

---

## Dependencias críticas antes del lanzamiento

| Dependencia | Responsable | Estado |
|---|---|---|
| App Store Connect (Apple) aprobada | Equipo | Pendiente |
| Google Play Console aprobada | Equipo | Pendiente |
| Stripe cuenta verificada ES/KR/US | Equipo | Pendiente |
| FCM service account configurado | Dev | Pendiente |
| Admin local KR asignado | Owner | Pendiente |
| Admin local ES asignado | Owner | Pendiente |
| Admin local US asignado | Owner | Pendiente |
| Legal: términos y condiciones ES/KR/US | Legal | Pendiente |
| Privacy policy GDPR + CCPA | Legal | Pendiente |
