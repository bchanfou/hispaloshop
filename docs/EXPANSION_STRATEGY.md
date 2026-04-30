# HispaloShop — Estrategia de Expansión Multi-País e IA

> Fuente de verdad: `MEGA_PLAN.md` y `ROADMAP_LAUNCH.md`
> Actualizado: 2026-04-30

---

## Visión

HispaloShop es una red social de comercio local (B2C) y un puente entre mercados (B2B) que conecta productores, importadores/distribuidores, influencers y consumidores alrededor de alimentos reales. La plataforma se lanza simultáneamente en tres países con un modelo que respeta la autonomía local de cada mercado.

---

## Modelo de mercado (corregido)

### Estructura en cada país

Cada país opera como un mercado local independiente con su propia red de participantes:

```
Productores locales
       ↓  venden a
Consumidores locales del mismo país

Importadores/Distribuidores locales
       ↓  venden a
Consumidores locales del mismo país

Importadores/Distribuidores locales
       ↕  compran B2B de
Productores de OTROS países
```

La plataforma no gestiona ni intermedia el envío físico: cada vendedor gestiona su propia logística.

### El rol Importador/Distribuidor

Los distribuidores tienen un papel dual:

1. **Venta local B2C**: venden productos a consumidores de su mismo país
2. **Importación B2B**: compran de productores en otros países y revenden en el suyo
3. **Conexión de mercados**: usan la plataforma para encontrar proveedores internacionales sin intermediarios

---

## Mercados de lanzamiento

### ES — España (origen)

- Productores locales españoles: alimentos artesanales, productos de proximidad
- Distribuidores locales españoles (también importadores B2B)
- Consumidores finales españoles
- Admin local: verificación de NIF/CIF, soporte en español
- Moneda: EUR
- Idioma principal: ES — Español

### KR — Corea (primera expansión)

- Productores locales coreanos: alimentos tradicionales, productos gastronómicos
- Distribuidores locales coreanos (también importadores B2B)
- Consumidores finales coreanos
- Admin local: verificación de 사업자등록번호, soporte en coreano
- Moneda: KRW
- Idioma principal: KR — Coreano

### US — Estados Unidos (segunda expansión)

- Productores locales USA: artesanos, pequeños productores regionales
- Distribuidores locales USA (también importadores B2B)
- Consumidores finales USA
- Admin local: verificación de EIN, soporte en inglés
- Moneda: USD
- Idioma principal: EN — Inglés

---

## Estrategia de envíos

Cada vendedor decide independientemente su política de envío. La plataforma no fija costes ni gestiona logística:

| Opción | Descripción | Ventaja para el vendedor |
|---|---|---|
| Envío gratuito | El vendedor absorbe el coste completo | Convierte mejor, ideal para productos de margen alto |
| Envío con coste fijo | El vendedor define el importe | Recupera costes logísticos sin perder ventas |
| Gratis a partir de X | Umbral definido por el vendedor | Incentiva pedidos de mayor valor medio |

**Beneficios del modelo descentralizado**:
- Sin complejidad operativa para la plataforma
- Competencia entre vendedores por ofrecer la mejor propuesta
- Flexibilidad total para adaptar la estrategia por producto y temporada

---

## Estrategia de IA

Los agentes de IA están activos desde el día del lanzamiento, diferenciados por plan.

### David AI — Plan FREE (todos los usuarios)

- **Rol**: nutricionista personal y asistente de compra para consumidores
- **Disponible para**: todos los usuarios registrados, sin coste adicional
- **Funcionalidades**: recomendaciones de productos según preferencias dietéticas, ayuda a encontrar alternativas, información nutricional
- **Volumen**: alto volumen, modelo ligero (Claude Haiku), coste optimizado
- **Valor para la plataforma**: aumenta conversión y engagement de consumidores

### Rebeca AI — Plan PRO

- **Rol**: agente comercial nacional para vendedores (productores e importadores)
- **Disponible para**: usuarios con plan PRO activo
- **Acceso super_admin**: puede previsualizar con el mismo UI que un usuario PRO
- **Funcionalidades**: optimización de fichas de producto, estrategia de precios, análisis de competencia local, marketing de contenidos
- **Acceso**: botón en dashboard del vendedor + widget de chat
- **Valor para la plataforma**: diferencia el plan PRO, aumenta ventas de vendedores

### Pedro AI — Plan ELITE

- **Rol**: consultor de importación/exportación B2B internacional
- **Disponible para**: usuarios con plan ELITE activo
- **Acceso super_admin**: puede previsualizar con el mismo UI que un usuario ELITE
- **Funcionalidades**: identificación de oportunidades de importación, análisis de mercados internacionales, contacto con potenciales distribuidores, estrategia de entrada a nuevos mercados
- **Valor para la plataforma**: diferencia el plan ELITE, activa el flujo B2B cross-border que conecta los tres países

### Iris — Plataforma (interno)

- **Rol**: seguridad, moderación y detección de fraude
- **No visible para usuarios**: opera en segundo plano
- **Funcionalidades**: moderación de contenido, detección de documentos manipulados en verificación, alertas de comportamiento anómalo

---

## Infraestructura técnica multi-país

| Componente | Solución | Justificación |
|---|---|---|
| CDN | Cloudflare | Cobertura en las 3 regiones, caché de assets estáticos |
| Base de datos | MongoDB Atlas | Replicación regional, backups automáticos |
| Autenticación | JWT stateless | Funciona desde cualquier región sin sincronización |
| Pagos | Stripe | Multi-moneda nativo (EUR, KRW, USD) |
| Tipos de cambio | ECB diario | Gratuito, fiable, audit trail histórico |
| Impuestos B2B | VIES | Validación IVA europeo para reverse charge |
| Admin por país | Country-scope queries | Datos aislados por `assigned_country` |
| Verificación vendedores | Algoritmo + admin local | Automático para casos claros, humano para dudas |
| Notificaciones | FCM HTTP v1 | Push en iOS, Android y web en los 3 países |
| i18n | i18next | ES, KR, EN activos en V1; FR, PT en V2 |

---

## Simultaneidad del lanzamiento

### Agosto 2026: ES — España + KR — Corea

- Lanzamiento web y app móvil (iOS + Android) en ambos países
- Campaña de marketing coordinada
- Soporte en tiempo real (equipo Spain + equipo Korea)
- Monitorización de métricas por país desde hora 0

### Septiembre 2026: US — Estados Unidos

- Lanzamiento web y app móvil
- Soporte en inglés
- Adaptación fiscal: impuestos USA, EIN verification

### Coordinación operativa

| País | Zona horaria | Horario soporte lanzamiento |
|---|---|---|
| ES — España | CET (UTC+1/+2) | 08:00 - 22:00 hora local |
| KR — Corea | KST (UTC+9) | 08:00 - 22:00 hora local |
| US — Estados Unidos | EST/PST (UTC-5/-8) | 08:00 - 22:00 hora local (Este) |

---

## Crecimiento de vendedores por país

### Estrategia de captación (V1)

1. **Onboarding manual inicial**: equipo contacta directamente a productores locales en cada país
2. **Verificación prioritaria**: proceso rápido para primeros vendedores (admin local dedicado)
3. **Incentivo de lanzamiento**: primeros 30 días sin comisión de plataforma (a definir por país)

### Crecimiento orgánico

- Influencers locales como primer canal de adquisición de consumidores
- Productores activos atraen a su red de clientes existente
- Feed social como canal de descubrimiento (no solo marketplace)

---

## Métricas de éxito por país

### Mes 1 (post-lanzamiento)
- Registros de vendedores verificados
- Listados de productos activos
- Registros de consumidores
- Primeros pedidos completados

### Mes 2
- Tasa de recompra de consumidores
- Porcentaje de vendedores con 5+ pedidos
- Engagement en chat (mensajes por usuario activo)
- Adopción de agentes IA por plan

### Mes 3 en adelante
- LTV por país (diferencia entre mercados)
- CAC por canal (influencer vs orgánico)
- Retención de vendedores (activos a mes 3)
- Tasa de adopción de planes PRO y ELITE
- Volumen B2B cross-border (indicador de Pedro AI)

---

## Expansión futura (V2+)

Mercados candidatos para expansión post-lanzamiento:

| País | Prioridad | Justificación |
|---|---|---|
| FR — Francia | Alta | Mercado gastronómico similar a ES, VIES ya implementado |
| PT — Portugal | Alta | Idioma preparado en i18next, proximidad a ES |
| JP — Japón | Media | Alta afinidad cultural con KR, mercado premium |
| DE — Alemania | Media | Mercado grande, fuerte interés en productos artesanales |
| GB — Reino Unido | Media | Mercado anglófono, post-Brexit documentación diferente |

Los países se activan desde el dashboard de super_admin: toggle de activación + asignación de admin local.
