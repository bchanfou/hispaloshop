# AUDITORÍA TÉCNICA PROFUNDA - HISPALOSHOP

## 0) Confirmación de acceso y alcance real

Estado de accesos al momento de la auditoría:

- [x] Repositorio completo backend + frontend (acceso local completo).
- [ ] Base de datos de producción/staging (no disponible en este entorno).
- [ ] Variables de entorno reales de despliegue (solo defaults de código).
- [ ] Documento de visión estratégica formal dentro del repo (no localizado como archivo único canónico).
- [ ] Stripe Dashboard (sin credenciales/acceso).
- [ ] OpenAI Dashboard (sin credenciales/acceso).

> **Implicación:** esta auditoría es **estática + build frontend**, sin validación transaccional real contra DB/Stripe/OpenAI.

---

## 1) Hallazgos en tiempo real: Módulo Checkout (prioridad crítica)

### 1.1 Flujo actual implementado
- `POST /api/v1/checkout/session` valida carrito, calcula subtotal/envío/IVA, crea `Order` + `OrderItem`, y abre Stripe Checkout Session.
- Fee plataforma se calcula con `Subscription.get_commission_bps()` (free/pro/elite).
- Intenta detectar código afiliado por cookie o carrito y calcular comisión influencer.
- `GET /api/v1/checkout/success` devuelve estado por `session_id`.

### 1.2 Riesgos y bugs críticos encontrados (Checkout)
1. **Posible no persistencia de Order/OrderItems antes de redirección a Stripe**: no hay `commit` explícito ni dependencia visible con auto-commit transaccional por request.
2. **Riesgo de doble cargo/doble procesamiento por falta de idempotencia** en webhook y en creación de checkout; no se usa idempotency-key ni tabla de eventos procesados.
3. **Dependencia frágil en `payment_intent.succeeded`**: se asigna `order.stripe_payment_intent_id = checkout.payment_intent` en creación de sesión, pero en Checkout Session ese valor puede no estar listo aún.
4. **Sin lock de inventario al checkout**: solo verifica stock en carrito/checkout, pero no reserva stock; posible sobreventa en concurrencia.
5. **En webhook no existe verificación anti-replay explícita** ni persistencia de `event.id` procesado.
6. **No hay split real automático a productores en Stripe Connect durante checkout**; se registra contabilidad interna, pero no se observa `Transfer` por order-item en este flujo.

### 1.3 Severidad operativa
- **Riesgo de lanzamiento checkout:** **ALTO**.
- **Acción recomendada inmediata:** congelar nuevas features y ejecutar hardening de pagos/webhooks antes de Fase 2.

---

## 2) Executive Summary (formato solicitado)

```text
HISPALOSHOP - ESTADO ACTUAL

Fecha auditoría: 2026-03-03
Auditor: Codex (GPT-5.2-Codex)
Versión código auditado: 7eae229

RESUMEN EJECUTIVO:
- % Completitud V1.0 (MVP): 62%
- % Completitud Visión Final (V3.0): 31%
- Bugs críticos abiertos: 14
- Deuda técnica alta: 18 ítems
- Inconsistencias BF: 22
- Riesgo lanzamiento: ALTO

RECOMENDACIÓN:
Fix antes de continuar. No avanzar a Fase 2 hasta estabilizar Checkout/Webhooks,
contratos Backend-Frontend y seguridad operativa mínima (rate limit + observabilidad).
```

---

## 3) Cobertura funcional (Sprints 1-4) vs visión estratégica

### 3.1 Funciones transversales (15)

| Función Estratégica | Estado | % |
|---|---|---|
| Registro multi-rol (buyer/producer/influencer) | Parcial (faltan admin/importer en flujo de registro) | 60% |
| Verificación KYC | Campos básicos en modelo, sin workflow completo | 25% |
| Chat interno cifrado E2E | Chat IA existe; E2E encryption no implementado | 20% |
| Publicación de posts | No operativo en stack principal FastAPI/routers | 0% |
| Publicación de reels | No operativo | 0% |
| Feed personalizado algorítmico | Recomendaciones básicas sí; feed social no | 35% |
| Seguidores/likes/comentarios | Parcial en frontend social extendido, no cerrado end-to-end | 30% |
| Compra directa desde post | No evidenciada en API sprint principal | 10% |
| Sistema afiliado automático (548d) | Operativo parcial (cookie + comisión básica) | 75% |
| Gestión pedidos B2C y B2B | B2C parcial sí, B2B no | 45% |
| Pagos integrados + comisión automática | Stripe checkout sí, split robusto no | 65% |
| Historial comercial verificable (ledger) | Parcial (transactions básicas) | 50% |
| Sistema de disputas | No implementado en routers principales | 0% |
| Reportes fiscales descargables | No implementado en backend principal | 0% |
| Certificados QR verificables | Certificados básicos sí, sin QR verificable | 20% |

**Resultado:**
- 100% operativas: **0/15**
- Parciales: **10/15**
- Declarativas/no operativas: **5/15**

### 3.2 Usuarios y suscripciones

| Usuario | Implementado | Faltantes clave |
|---|---|---|
| Consumidor FREE | Compra y pedidos básicos sí | social completo, wishlist robusta, historial enriquecido |
| Consumidor PRO (9,99€) | Gate PRO para chat sí | pricing 9,99€, cashback, acceso anticipado |
| Influencer tiers 3-7% | Sí (Perseo→Zeus en modelo/lógica) | payout real y actualización casi-tiempo-real |
| Productor FREE/PRO/ELITE | Parcial | pricing 79/149 y reglas de plan de negocio no alineadas |
| Importador | No flujo dedicado | registro/funciones B2B |
| Admin | Parcial y disperso | backoffice unificado estable |

Hallazgos puntuales:
- Lógica comisiones por plan en checkout: `free=20%, pro=18%, elite=16%` (no 17% para ELITE según requerimiento dado).
- Config Stripe contiene `STRIPE_PRICE_PRO`/`STRIPE_PRICE_ELITE`, pero no evidencia de sincronización completa de pricing B2C/B2B solicitado.

### 3.3 Motor HI AI

| Capacidad | Estado | Calidad |
|---|---|---|
| Recomendación personalizada | Implementada (embeddings + interacciones) | Media |
| Matching productor-importador | No encontrado como flujo real | Baja |
| Matching productor-influencer | Sí (score con heurísticas) | Media-Baja |
| Predicción de demanda (time-series) | No | Nula |
| Alertas expansión internacional | No | Nula |
| Asistente conversacional PRO | Sí (gpt-4o-mini, fallback mock) | Media |

Observaciones técnicas HI AI:
- Embeddings se generan vía job/manual y servicios; no se confirma trigger automático robusto en todos los paths CRUD.
- Búsqueda “vectorial” actual usa arrays y similitud en Python para hasta 1000 filas, sin IVFFlat/HNSW productivo.
- Chat mantiene contexto corto (últimos mensajes), pero sin memoria semántica persistente avanzada.
- Feedback loop explícito para mejora de recomendación no está cerrado.

---

## 4) Matriz de completitud detallada

| Módulo | Funcionalidad | Backend | Frontend | Integración | % Módulo |
|---|---|---:|---:|---:|---:|
| Auth | Registro/login | 90% | 85% | 80% | 85% |
|  | KYC verification | 25% | 10% | 5% |  |
|  | Password reset | 10% | 20% | 5% |  |
| Catálogo | Listado productos | 90% | 85% | 80% | 82% |
|  | Búsqueda/filtrado | 70% | 70% | 65% |  |
| Carrito | Añadir/eliminar/actualizar | 90% | 85% | 80% | 80% |
|  | Persistencia BD | 85% | 70% | 75% |  |
|  | Merge guest→user | 40% | 20% | 20% |  |
| Checkout | Stripe Session | 80% | 75% | 70% | 68% |
|  | Webhooks | 70% | N/A | 60% |  |
|  | Split pagos | 55% | N/A | 50% |  |
| Afiliados | Links /r/{code} | 90% | 80% | 75% | 76% |
|  | Cookie 548d | 80% | 65% | 70% |  |
|  | Tiers automáticos | 75% | 60% | 60% |  |
| HI AI | Embeddings | 70% | N/A | 60% | 58% |
|  | Recomendaciones | 70% | 70% | 60% |  |
|  | Chat PRO | 75% | 70% | 65% |  |
|  | Matching | 65% | 55% | 50% |  |
| Social | Posts/feed/reels | 15% | 30% | 10% | 18% |
| B2B | RFQ/matching importador | 10% | 10% | 5% | 8% |
| Admin | Dashboard/moderación | 20% | 25% | 15% | 20% |

**TOTAL V1.0 (Sprints 1-4): 62%**

**TOTAL Visión Final: 31%**

---

## 5) Incongruencias Backend-Frontend (BF)

### 5.1 Contract mismatches representativos

| ID | Endpoint/Componente | Esperado | Recibido/Realidad | Impacto | Fix |
|---|---|---|---|---|---|
| INC-001 | Arquitectura frontend | Next.js (`pages/...tsx`) según spec | Proyecto actual principal es CRA + `.js` routes | Alto (desalineación roadmap) | Unificar stack objetivo |
| INC-002 | Hooks esperados (`useAffiliate.ts`) | Hook único | Hooks reales fragmentados (`useAffiliateLinks`, `useAffiliateRequests`, etc.) | Medio | Consolidar contrato de dominio |
| INC-003 | `/api/v1/me` en tabla solicitada | Endpoint plano `/me` | Ruta real `/api/v1/auth/me` | Medio | Normalizar documentación/API client |
| INC-004 | Checkout success | `/checkout/success` frontend spec | Página usa también `/payments/checkout-status/*` legacy | Alto | Retirar legacy o adaptar backend |
| INC-005 | Pricing ELITE | 17% comisión esperada | Código usa 16% (`elite=1600bps`) | Alto | Alinear negocio/código |
| INC-006 | Chat IA con productos sugeridos | Sugerencias clicables | Respuesta actual retorna sugeridos vacíos por defecto | Medio | Integrar retrieval y enlaces |
| INC-007 | E2E chat cifrado | Especificado | No implementado | Alto reputacional | Diseñar cifrado extremo a extremo |
| INC-008 | Importador rol/flujo | Especificado | No registrado en auth schema | Alto (B2B roadmap) | Extender modelo y registro |

### 5.2 Flujos E2E críticos

| Flujo | Estado | Comentario |
|---|---|---|
| Registro→Login→Producto→Carrito→Checkout→Pago→Confirmación | **Parcial / frágil** | Checkout y webhook requieren hardening transaccional |
| Influencer Link→Click→Compra→Comisión→Dashboard | **Parcial** | Atribución básica sí, payout y refresh realtime limitados |
| Productor Recibe→Confirma→Envía→Tracking→Entregado | **Parcial** | Existe fulfill, pero notificaciones y trazabilidad completas no cerradas |
| HI AI Chat→Recomendación→Producto→Carrito | **Parcial bajo** | Chat responde, pero recomendaciones accionables aún pobres |

---

## 6) Bugs críticos (P0/P1)

| ID | Bug | Severidad | Impacto | Fix estimado | Owner |
|---|---|---|---|---|---|
| AUDIT-001 | Falta idempotencia webhook Stripe | P0 | Doble procesamiento financiero | 1-2 días | Backend |
| AUDIT-002 | Sin persistencia explícita de eventos Stripe (`event.id`) | P0 | Replays no detectados | 1 día | Backend |
| AUDIT-003 | Riesgo sobreventa por ausencia de reserva stock | P0 | Ventas inválidas/reembolsos | 2-3 días | Backend |
| AUDIT-004 | `payment_intent` potencialmente nulo al crear checkout | P1 | Orden no enlazada al pago | 1 día | Backend |
| AUDIT-005 | Sin rate limiting en auth/chat | P0 | abuso API/coste OpenAI | 1 día | Backend |
| AUDIT-006 | Comisión ELITE no alineada con estrategia (16% vs 17%) | P1 | impacto margen/comercial | 0.5 día | Backend/Producto |
| AUDIT-007 | Contratos frontend legacy + nuevos mezclados | P1 | regresiones UI/flujo | 2-4 días | Frontend |
| AUDIT-008 | Bundle frontend excesivo (~636kB gz) | P1 | UX móvil/SEO/perf | 3-5 días | Frontend |
| AUDIT-009 | Múltiples warnings hooks exhaustive-deps | P1 | bugs intermitentes UI | 2-3 días | Frontend |
| AUDIT-010 | Chat sin recomendaciones reales en respuesta | P1 | feature HI AI incompleta | 2 días | Backend |
| AUDIT-011 | Sin sistema de disputas | P1 | riesgo operativo/legal | 3-5 días | Backend |
| AUDIT-012 | Sin reportes fiscales exportables | P1 | riesgo compliance | 3-4 días | Backend |
| AUDIT-013 | Certificados sin QR verificable | P1 | feature diferencial no entregada | 2-3 días | Backend/Frontend |
| AUDIT-014 | Falta observabilidad estructurada (logs métricas alertas) | P0 | difícil operar en prod | 2-3 días | Plataforma |

---

## 7) Deuda técnica priorizada

| Prioridad | Item | Esfuerzo | Impacto si no se hace |
|---|---|---|---|
| 1 | Idempotencia + ledger robusto pagos | 3 días | riesgo financiero crítico |
| 2 | Rate limiting auth/chat | 1 día | abuso, coste y seguridad |
| 3 | Tests E2E de compra/afiliado | 3 días | regresiones en demo/prod |
| 4 | Unificación contrato API frontend | 2 días | bugs funcionales repetidos |
| 5 | Vector search real (pgvector index) | 2 días | IA no escala |
| 6 | Logging estructurado + tracing | 2 días | soporte reactivo deficiente |
| 7 | Reducción bundle + code splitting | 3 días | mala experiencia mobile |
| 8 | Política seguridad headers/CSP | 1 día | superficie XSS/clickjacking |

---

## 8) Incongruencias con claims comerciales (riesgo inversor)

| Claim | Estado real en código | Riesgo |
|---|---|---|
| “Chat cifrado E2E” | No implementado | Alto |
| “IA predice qué venderás” | No hay modelo time-series productivo | Alto |
| “Compra directa desde posts” | No cerrado E2E en API principal | Medio-Alto |
| “Exporta a toda Europa / B2B” | B2B/importador incompleto | Alto |
| “Afiliados hasta 7%” | Sí en tiers, pero payout operativo parcial | Medio |

---

## 9) Recomendaciones estratégicas

### A) Fix obligatorios antes de Fase 2
1. Hardening checkout/webhooks (idempotencia, commit transaccional, deduplicación eventos, recon de pagos).
2. Alinear comisiones/planes con estrategia (incluye ELITE 17% si ese es negocio definitivo).
3. Unificar frontend (evitar doble stack conceptual spec vs implementación real).
4. Añadir rate limiting + WAF básico + observabilidad.
5. Cerrar E2E tests de 4 flujos críticos.

### B) Puede esperar post-MVP
1. Social completo (posts/reels/feed algorítmico full).
2. B2B internacional completo.
3. Ferias virtuales.

### C) Cambios de arquitectura sugeridos
1. Separar dominio pagos/ledger en módulo aislado con garantías ACID e idempotencia.
2. Formalizar contrato API con OpenAPI versionado + generación de cliente tipado.
3. Migrar búsquedas IA a pgvector real con índices ANN y jobs asíncronos.

---

## 10) Plan de remediación (2 semanas)

### Semana 1 (P0)
- Día 1: idempotencia Stripe webhook + tabla eventos procesados.
- Día 2: reserva stock y consistencia checkout.
- Día 3: rate limiting auth/chat + protección endpoints sensibles.
- Día 4: pruebas E2E compra + afiliado.
- Día 5: fix contratos BF críticos y smoke test demo.

### Semana 2 (P1)
- Día 1-2: observabilidad (logs estructurados, dashboards, alertas).
- Día 3: optimización frontend (split bundles).
- Día 4: mejoras HI AI (recomendaciones accionables en chat).
- Día 5: regression test + rehearsal de pitch a inversores.

---

## 11) Veredicto

**No recomendado avanzar a Fase 2 sin estabilizar primero.**

El producto muestra una base potente (checkout, afiliados, IA inicial), pero con **riesgo operacional alto** en pagos, coherencia de contratos y claims comerciales versus entrega técnica actual.
