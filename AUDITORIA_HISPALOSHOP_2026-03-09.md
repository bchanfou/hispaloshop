# Auditoria Hispaloshop - 2026-03-09

## Alcance y criterio

Esta auditoria se ha hecho sobre el codigo existente del repositorio en su estado actual. Para evitar asumir comportamientos no visibles, el criterio usado ha sido:

- Tomar como stack activo el que arranca en `backend/main.py`.
- Revisar tambien modulos duplicados o alternativos cuando estan montados en runtime o cuando crean contradicciones de arquitectura.
- Considerar como evidencia principal el codigo fuente y los tests existentes.

Observacion base: el stack declarado en negocio no coincide con el stack real del repo. El frontend activo no es Next.js sino React + `react-scripts`/CRACO (`frontend/package.json:61-73`), y no hay evidencia de un backend Node.js/Express operativo en el runtime actual.

## ACTUALIZACION 2026-03-10 - Estado posterior a la ejecucion del MVP fix

Esta seccion documenta el estado real del repositorio despues de ejecutar las Fases 1-4 del plan correctivo. El resto del documento se conserva como baseline de auditoria del 2026-03-09 y no se ha reescrito linea por linea.

### Resumen ejecutivo de la actualizacion

- `Auth` ya no esta duplicado en el runtime activo: el flujo se concentra en `frontend/src/context/AuthContext.js`, se eliminaron `frontend/src/providers/AuthProvider.jsx` y `frontend/src/hooks/useAuthRedirect.js`, y el onboarding activo usa `onboarding_completed` de forma consistente.
- `Checkout` y monetizacion quedaron consolidados alrededor de `backend/core/monetization.py` y `backend/routes/orders.py`; `backend/routes/checkout.py` fue retirado del runtime y el split activo ya no descuenta al influencer del payout del seller.
- El sistema activo de influencers se simplifico al modelo MVP de `hercules/atenea/zeus` en `backend/config.py`, con atribucion principal por `referred_by` y retiro del router legacy `backend/routes/affiliates.py` y del servicio `backend/services/affiliate_tracking.py`.
- Se activo geobloqueo por mercados con `target_markets` en `backend/services/markets.py`, se retiraron los endpoints HI Coins del runtime en `backend/routes/subscriptions.py` y se anadio RFQ B2B simple en `backend/routes/rfq.py`.
- Siguen abiertos gaps importantes fuera del alcance del MVP fix: pricing oficial `79/149 EUR + IVA`, soporte de planes para `importer`, normalizacion de entidades, Hispalopoints reales, robustez del certificado digital y limpieza arquitectonica completa.

### Estado actual por frente

| Frente | Estado actual | Evidencia principal | Lectura frente al baseline |
|---|---|---|---|
| Auth y onboarding | Cerrado para MVP | `frontend/src/context/AuthContext.js`, `backend/routes/auth.py`, `backend/routes/onboarding.py` | Corrige G-17 en runtime activo |
| Monetizacion y checkout | Cerrado para MVP operativo | `backend/core/monetization.py`, `backend/routes/orders.py`, `backend/routes/producer.py`, `backend/tests/test_monetization_engine.py` | Corrige G-01, G-02, G-03 y G-04; reduce G-05 |
| Influencers | Parcial y simplificado | `backend/config.py`, `backend/services/referrals.py`, `backend/routes/orders.py` | Cierra duplicidad operativa, pero sustituye el ladder original de 5 tiers por un MVP de 3 tiers |
| Geobloqueo | Cerrado para MVP | `backend/services/markets.py`, `backend/routes/products.py`, `backend/routes/cart.py`, `backend/routes/orders.py` | Nuevo control no presente en el baseline |
| HI Coins / Hispalopoints | HI Coins retirado; Hispalopoints sigue ausente | `backend/routes/subscriptions.py`, `backend/scripts/delete_hi_coins_collections.py` | Se elimina deuda del runtime, pero G-15 sigue abierto respecto al negocio completo |
| B2B | RFQ simple operativo | `backend/routes/rfq.py`, `frontend/src/hooks/api/useImporter.js`, `frontend/src/components/b2b/QuoteBuilder.js` | Sustituye alcance B2B complejo por flujo minimo viable |

### Clasificacion actualizada de gaps del baseline

#### Cerrados o mitigados en runtime

- `G-01`, `G-02`, `G-03`, `G-04`: corregidos en el flujo activo de checkout, payouts y dashboard financiero.
- `G-12`: backend y frontend admin convergen en `active/suspended`.
- `G-17`: eliminada la duplicidad activa de auth y unificado `onboarding_completed`.

#### Parciales o cerrados solo para el MVP simplificado

- `G-05`: ya no gobiernan el runtime `backend/routes/checkout.py` ni `backend/routes/affiliates.py`, pero sigue existiendo codigo legado fuera del flujo principal.
- `G-06`: existe ya una base canonica para monetizacion, pero no hay una unica fuente de verdad completa para pricing, planes, tiers, frontend y tests.
- `G-09`, `G-10`: el runtime ya no usa el ladder antiguo; ahora usa `hercules/atenea/zeus`. Esto resuelve la fragmentacion operativa, pero no implementa el modelo completo de 5 tiers del documento de negocio.
- `G-11`: backend admin normaliza tier y comision a la escalera activa, pero la UI admin todavia conserva campos legacy de descuento y necesita limpieza funcional.
- `G-19`: el catalogo ya expone mejor `target_markets`, pero el modelo transaccional sigue muy acoplado a `producer_id`.

#### Abiertos

- `G-07`: el catalogo de planes sigue en `54/108 USD` en `backend/routes/subscriptions.py`.
- `G-08`: `/sellers/me/plan` sigue restringido a `producer`.
- `G-13`: la suite de tests legacy no se ha reescrito de forma integral.
- `G-14`: no se introdujeron entidades normalizadas de `Subscription`, `Commission` o perfiles separados.
- `G-15`: HI Coins se retiro del runtime, pero Hispalopoints reales no existen.
- `G-16`: el certificado digital sigue sin passport robusto ni trazabilidad fuerte.
- `G-18`: la arquitectura declarada sigue sin coincidir plenamente con la real.
- `G-20`: `manual_commission_rate` sigue presente y sin gobierno canonico claro.

### Validacion ejecutada en esta etapa

- `frontend`: `npm --prefix frontend run build` compila correctamente tras las Fases 1-4.
- `backend`: no se pudo ejecutar una validacion Python fiable en este entorno; por tanto, el estado backend esta validado por inspeccion de codigo, wiring de rutas y ausencia de referencias activas a modulos retirados.

### Conclusion de la actualizacion

El repo ya no esta en el estado auditado el 2026-03-09. El bloqueo principal de autenticacion, el problema critico del split economico, la duplicidad activa de checkout/afiliacion y la deuda operativa de HI Coins quedaron corregidos o retirados del runtime. Aun asi, la hoja de ruta original no esta cerrada: quedan pendientes de negocio y arquitectura que no eran necesarias para sacar el MVP fix, especialmente pricing oficial, planes para importadores, normalizacion de datos, Hispalopoints y el modelo completo de certificados.

---

## FASE 1 - Auditoria

### 1.1 Revision del modelo economico

#### Pregunta: ¿Esta implementado correctamente el calculo de comisiones (20/18/17%)?

Respuesta: **Parcial y no consistente**.

Evidencia:

- La unica implementacion alineada con planes `FREE/PRO/ELITE` esta en `backend/services/subscriptions.py:296-345`, funcion `calculate_order_commissions`, donde:
  - lee el plan del seller,
  - calcula `platform_gross` con 20/18/17,
  - calcula `influencer_cut` desde la comision de plataforma,
  - deja `seller_payout` intacto.
- El checkout principal sigue hardcodeando 20% en `backend/routes/orders.py:771-779`.
- El flujo `buy-now` tambien hardcodea 20% en `backend/routes/orders.py:1025-1032`.
- El dashboard de pagos del seller usa 20% fijo en `backend/routes/producer.py:184-246`.

Conclusion: la regla 20/18/17 existe, pero no gobierna de forma canonica el flujo real de compra ni los paneles.

#### Pregunta: ¿El sistema diferencia correctamente si hay influencer o no en la venta?

Respuesta: **Parcial**.

Evidencia:

- En `backend/services/subscriptions.py:324-339` si existe logica explicita para influenciar el split solo cuando `influencer_id` esta presente.
- En `backend/routes/orders.py` se crean registros de atribucion y comision de influencer, pero el calculo del checkout no reutiliza de forma uniforme la misma funcion canonica.
- El flujo paralelo de checkout en `backend/routes/checkout.py:185-210` calcula influencer por un motor diferente y con reglas distintas.

Conclusion: el sistema detecta presencia de influencer, pero usa motores de calculo distintos y por tanto no garantiza el mismo resultado en todos los caminos.

#### Pregunta: ¿El reparto vendedor/plataforma/influencer es correcto a nivel de codigo?

Respuesta: **No**.

Evidencia:

- Regla de negocio requerida: la comision del influencer sale siempre de la comision de plataforma.
- Incumplimiento claro en `backend/routes/checkout.py:204-210`:
  - `affiliate_fee_cents = int(total_cents * rate)`
  - `platform_fee_cents = int(total_cents * 0.20)`
  - `producer_payout_cents = total_cents - platform_fee_cents - affiliate_fee_cents`
- Ese flujo resta la comision del influencer del payout del seller, lo cual viola la regla.
- `backend/routes/orders.py:169-226`, funcion `schedule_influencer_payout`, calcula el pago del influencer sobre `order.total_amount`, no sobre el techo de comision de plataforma.

Conclusion: el reparto no esta correctamente garantizado en runtime.

#### Pregunta: ¿Los planes de suscripcion afectan correctamente la comision en el flujo de pago?

Respuesta: **No de forma confiable**.

Evidencia:

- El plan se guarda en `users.subscription` y `get_seller_commission_rate` existe en `backend/services/subscriptions.py:283-285`.
- Pero el checkout activo no consume ese dato en `backend/routes/orders.py:771-779` y `backend/routes/orders.py:1025-1032`.
- `backend/routes/subscriptions.py:167-174` expone `/sellers/me/plan` solo para `producer`, no para `importer`.
- `frontend/src/context/ProducerPlanContext.js:14-24` intenta cargar plan tanto para `producer` como para `importer`, y si falla hace fallback silencioso a `FREE`.

Conclusion: el plan existe a nivel de cuenta, pero no gobierna de forma consistente el cobro ni los dashboards.

### 1.2 Revision del sistema de influencers

#### Pregunta: ¿Existe el sistema de tiers (Perseo, Artemisa, Hercules, Atenea, Zeus)?

Respuesta: **Existe un sistema de tiers, pero no coincide con el negocio pedido**.

Evidencia:

- Configuracion canonica actual: `backend/config.py:66-73`
  - `perseo`
  - `aquiles`
  - `hercules`
  - `apolo`
  - `zeus`
- El negocio solicitado pide:
  - `Perseo`
  - `Artemisa`
  - `Hercules`
  - `Atenea`
  - `Zeus`
- El codigo trata `atenea` como alias legado de `hercules` en `backend/config.py:77-89`, no como tier propio.

Conclusion: hay ladder de 5 niveles, pero con taxonomia distinta a la requerida.

#### Pregunta: ¿Los tiers se calculan en base a GMV mensual + seguidores?

Respuesta: **No**.

Evidencia:

- `backend/routes/auth.py:104-123` guarda `followers` al registrar influencer.
- `backend/services/subscriptions.py:421-480`, funcion `recalculate_influencer_tier`, recalcula por GMV de ultimos 90 dias y clientes repetidos.
- `backend/routes/subscriptions.py:392-423` expone progreso a siguiente tier usando solo GMV.
- No hay uso activo de seguidores en la promocion de tier del stack Mongo.

Conclusion: el sistema actual usa GMV de 90 dias, no GMV mensual + seguidores.

#### Pregunta: ¿Las comisiones de influencer escalan correctamente entre 3% y 7%?

Respuesta: **Parcial y con inconsistencias graves**.

Evidencia:

- Configuracion base 3%-7% si existe en `backend/config.py:66-70`.
- `backend/services/subscriptions.py:288-291` usa esa escala correctamente.
- Pero el alta administrativa crea influencers con `commission_rate` por defecto 15% en `backend/routes/admin.py:212-216`.
- El frontend admin inicia el formulario con `commission_value: 10` en `frontend/src/pages/admin/AdminInfluencers.js:14-24`.
- El dashboard del influencer expone `commission_value` con default 3 en `backend/routes/influencer.py:134-146`.

Conclusion: la escalera 3%-7% existe, pero el flujo admin permite salirse de ella.

#### Pregunta: ¿El sistema de atribucion de ventas a influencers funciona correctamente?

Respuesta: **Parcial y de alto riesgo**.

Evidencia:

- Hay un sistema activo en `orders.py` + `subscriptions.py` con `customer_influencer_attribution`, `scheduled_payouts` e `influencer_commissions`.
- Tambien hay otro sistema activo montado en runtime por `backend/main.py:56` y `backend/main.py:182` usando `backend/routes/affiliates.py`.
- Ese sistema usa otra taxonomia y otra logica en `backend/services/affiliate_tracking.py:18-49`:
  - `hydra`
  - `nemea`
  - `atlas`
  - `olympus`
  - `hercules`
- Existe un tercer modelo adicional en `backend/services/affiliate_service.py` apoyado en SQLAlchemy y `_future_postgres`.

Conclusion: la atribucion existe, pero esta fragmentada en al menos tres motores incompatibles.

### 1.3 Revision de entidades y base de datos

#### Estado de entidades

| Entidad | Estado | Evidencia |
|---|---|---|
| Usuario | Si | `backend/core/models.py:12` define `User`; en runtime existe `db.users` |
| Productor | Parcial | No hay modelo separado en stack activo; se representa por `user.role == "producer"` |
| Importador | Parcial | Igual que productor en stack activo; modelo separado solo en `backend/_future_postgres/models.py:333-357` |
| Influencer | Si | `backend/core/models.py:615`, `db.influencers`, y alta en `backend/routes/auth.py:104-123` |
| Consumidor | Parcial | No hay entidad separada; se representa por `user.role == "customer"` |
| Producto | Si | `backend/core/models.py:261-347` |
| Pedido | Si | `backend/core/models.py:522-568` y orden alternativa en `backend/core/models.py:1200+` |
| Comision | Parcial | Hay `InfluencerCommission`, `CommissionRecord`, `scheduled_payouts`; entidad normalizada solo en `_future_postgres/models.py:649` |
| Suscripcion | Parcial | En stack activo es un subdocumento `users.subscription`; entidad separada solo en `_future_postgres/models.py:201` |
| HispaloPoints | No | No existe modelo ni coleccion con ese nombre |
| Certificado Digital de Producto | Si, parcial | `backend/core/models.py:383`, `db.certificates`, `backend/routes/certificates.py` |

#### Pregunta: ¿El esquema refleja la distincion entre venta directa productor→consumidor e importador→consumidor?

Respuesta: **Parcial**.

Evidencia:

- El producto si guarda `seller_type` en `backend/core/models.py:263-287`.
- Al crear producto se setea `seller_type` y `origin_country` en `backend/routes/products.py:350-401`.
- Pero la transaccion sigue anclada a `producer_id` incluso para importadores:
  - `backend/core/models.py:263`
  - `backend/routes/orders.py:727-779`
  - `backend/routes/importer.py:27-93`
- El dashboard de importador filtra pedidos por `line_items[].producer_id == user.user_id`, no por entidad de importador propia.

Conclusion: la distincion existe en catalogo, no en el modelo transaccional de forma limpia.

#### Pregunta: ¿Existe el modelo de Certificado Digital de Producto?

Respuesta: **Si, pero incompleto respecto al objetivo de trazabilidad**.

Evidencia:

- Rutas activas en `backend/routes/certificates.py`.
- Autogeneracion al crear producto en `backend/routes/products.py:369-402`.
- Modelo Pydantic `Certificate` en `backend/core/models.py:383`.
- Modelo relacional futuro `ProductCertificate` en `backend/_future_postgres/models.py:189-198`.

Gap funcional:

- No hay cadena de trazabilidad/versionado/issuer verification robusta.
- `qr_url` es inconsistente:
  - `backend/routes/certificates.py:97` usa `https://app.hispaloshop.com/...`
  - `backend/routes/certificates.py:147` usa `https://www.hispaloshop.com/...`
  - `backend/routes/products.py:381` usa `https://www.hispaloshop.com/...`

### 1.4 Revision del sistema de Hispalopoints

#### Pregunta: ¿Esta implementada la logica de acumulacion de puntos?

Respuesta: **No con el producto definido; solo existe un sistema distinto de HI Coins**.

Evidencia:

- Endpoints existentes:
  - `backend/routes/subscriptions.py:455-472` `/hi-coins/spend`
  - `backend/routes/subscriptions.py:472-475` `/hi-coins/balance`
  - `backend/routes/subscriptions.py:479-500` `/hi-coins/convert`
  - `backend/routes/subscriptions.py:508-529` `/hi-coins/earn-cashback`
- Persistencia en:
  - `backend/services/subscriptions.py:189-232`
  - colecciones `hi_coin_balances` y `hi_coin_transactions`
- No hay modelo `HispaloPoints`.

#### Pregunta: ¿Los triggers estan correctamente definidos: compra, contenido, referido, interaccion?

Respuesta: **No**.

Evidencia:

- No se han encontrado integraciones automaticas desde:
  - cierre de pedido,
  - publicacion de contenido,
  - referidos,
  - interacciones sociales.
- El endpoint de cashback de HI Coins es manual y acepta `order_total` por request en `backend/routes/subscriptions.py:508-529`.

#### Pregunta: ¿Existe la logica de canje de puntos?

Respuesta: **Parcial solo para HI Coins, no para Hispalopoints**.

Evidencia:

- Si existe gasto manual de HI Coins (`/hi-coins/spend`) y conversion a EUR (`/hi-coins/convert`).
- No existe canje integrado al checkout, ni reglas de expiracion, ni ledger de puntos del programa solicitado.

### 1.5 Revision de la arquitectura general

#### Pregunta: ¿El stack Next.js + FastAPI/Django + Node.js tiene separacion de responsabilidades clara?

Respuesta: **No**.

Evidencia:

- Frontend real: React CRA/CRACO en `frontend/package.json:61-73`; no hay `next.config.*`.
- Backend real: FastAPI en `backend/main.py:68`.
- `backend/app/__init__.py:11` define otra app FastAPI modular distinta.
- `backend/server.py:1-4` define otra app FastAPI minima.
- `_future_postgres` introduce otro stack de datos aun no integrado.
- No se ve backend Node.js/Express operativo en runtime.

#### Pregunta: ¿Hay inconsistencias o duplicidades entre los backends?

Respuesta: **Si, varias y relevantes**.

Evidencia:

- `backend/main.py:189-190` monta `/api/checkout`, mientras `backend/routes/orders.py:464` expone otro checkout `/payments/create-checkout`.
- `backend/main.py:182` monta `/api/affiliates` con motor distinto al usado por `orders.py`.
- Hay dos proveedores de autenticacion frontend:
  - `frontend/src/context/AuthContext.js`
  - `frontend/src/providers/AuthProvider.jsx`
- La app usa el contexto legado en `frontend/src/App.js:23` y `frontend/src/App.js:405-417`.

#### Pregunta: ¿Existe autenticacion y autorizacion diferenciada por tipo de usuario?

Respuesta: **Si en backend, parcial en frontend**.

Evidencia backend:

- `require_role` y aprobaciones por rol se usan en rutas como `backend/routes/subscriptions.py:167`, `backend/routes/admin.py`, `backend/routes/auth.py:297+`.

Evidencia frontend:

- `ProtectedRoute` valida roles en `frontend/src/components/auth/ProtectedRoute.jsx:37-43`.
- Pero hay mismatch de onboarding:
  - `frontend/src/components/auth/ProtectedRoute.jsx:34` usa `user.onboardingCompleted`
  - `frontend/src/context/AuthContext.js:128` y `frontend/src/hooks/useAuthRedirect.js:23` usan `user.onboarding_completed`

Conclusion: la autorizacion existe, pero el frontend tiene riesgo de comportamiento divergente.

### Resumen ejecutivo - Fase 1

El problema principal no es ausencia total de logica, sino **fragmentacion**. Hispaloshop ya tiene piezas para suscripciones, comisiones, checkout, afiliacion, certificados y dashboards, pero conviven motores distintos que implementan reglas incompatibles. En la practica, el sistema economico actual **no garantiza** que el vendedor mantenga su 80/82/83% cuando hay influencer, ni que el plan contratado gobierne el checkout real. Tambien existe una brecha clara entre el negocio declarado y el stack implementado: no hay Next.js ni Node/Express operando, y el sistema de tiers/puntos no coincide con el modelo objetivo.

---

## FASE 2 - Identificacion de gaps y errores

| ID | Categoria | Componente | Tipo | Descripcion | Impacto | Evidencia principal |
|---|---|---|---|---|---|---|
| G-01 | CRITICO | Checkout seller split | Bug | El checkout principal calcula siempre 20% de comision y no usa el plan real del seller. | Alto | `backend/routes/orders.py:771-779`, `backend/routes/orders.py:1025-1032` |
| G-02 | CRITICO | Checkout influencer split | Bug | El flujo `/api/checkout` resta la comision del influencer del payout del seller. | Alto | `backend/routes/checkout.py:204-210` |
| G-03 | CRITICO | Payout influencer | Bug | El payout del influencer se calcula sobre `order.total_amount`, no sobre la comision de plataforma disponible. | Alto | `backend/routes/orders.py:169-226` |
| G-04 | CRITICO | Dashboard financiero seller | Bug | Los paneles de pagos del seller usan 20% fijo y reportan mal ganancias de PRO/ELITE. | Alto | `backend/routes/producer.py:184-246` |
| G-05 | CRITICO | Motores economicos duplicados | Gap | Conviven al menos dos checkouts activos y tres motores de afiliacion/comisiones. | Alto | `backend/main.py:182`, `backend/main.py:189-190`, `backend/routes/orders.py:464`, `backend/routes/affiliates.py`, `backend/services/affiliate_service.py` |
| G-06 | CRITICO | Gobernanza de reglas | Gap | No existe un modulo canonico compartido para precios, tiers, comisiones y nomenclatura entre backend, frontend y tests. | Alto | Divergencia entre `backend/config.py`, `backend/routes/subscriptions.py`, landings y tests |
| G-07 | IMPORTANTE | Catalogo de planes | Bug | El backend publico factura/expone PRO=54 USD y ELITE=108 USD, mientras el negocio y landings usan 79/149 EUR + IVA. | Alto | `backend/routes/subscriptions.py:114-147`, `backend/services/subscriptions.py:22-24`, `frontend/src/pages/PricingPage.js:101-102`, `frontend/src/pages/ProductorLandingPage.js:14-16`, `frontend/src/pages/ImporterLandingPage.js:16` |
| G-08 | IMPORTANTE | Planes para importadores | Bug | El backend solo permite `/sellers/me/plan` a `producer`, mientras el frontend lo usa tambien para `importer` y hace fallback silencioso a FREE. | Alto | `backend/routes/subscriptions.py:167-174`, `frontend/src/context/ProducerPlanContext.js:14-24` |
| G-09 | IMPORTANTE | Tiers de influencer | Gap | Los tiers actuales son Perseo/Aquiles/Hercules/Apolo/Zeus y no Perseo/Artemisa/Hercules/Atenea/Zeus. | Medio | `backend/config.py:66-73` |
| G-10 | IMPORTANTE | Recalculo de tiers | Gap | El tier se calcula con GMV de 90 dias; no usa GMV mensual ni seguidores. | Alto | `backend/services/subscriptions.py:421-480`, `backend/routes/subscriptions.py:392-423`, `backend/routes/auth.py:118` |
| G-11 | IMPORTANTE | Comision de influencer admin | Bug | El alta admin permite 15% por defecto y la UI sugiere 10%, fuera del marco 3%-7%. | Alto | `backend/routes/admin.py:212-216`, `frontend/src/pages/admin/AdminInfluencers.js:14-24` |
| G-12 | IMPORTANTE | Estados de influencer | Bug | Frontend usa `paused/banned` pero backend solo acepta `suspended/terminated`. | Medio | `frontend/src/pages/admin/AdminInfluencers.js:75-82`, `backend/routes/admin.py:250-256` |
| G-13 | IMPORTANTE | Tests desalineados | Gap | Los tests consolidan reglas legacy (54/108 USD, Aquiles/Apolo), lo que bloqueara una correccion al modelo de negocio objetivo. | Alto | `backend/tests/test_iteration_76_phase2_subscriptions.py:121-128`, `backend/tests/test_influencer_tiers_unification.py:28-44` |
| G-14 | IMPORTANTE | Modelo de datos activo | Gap | En Mongo no hay entidades normalizadas de `Subscription`, `Commission` ni perfiles separados de productor/importador/consumidor. | Alto | `backend/core/models.py`, `backend/_future_postgres/models.py:201`, `backend/_future_postgres/models.py:649` |
| G-15 | IMPORTANTE | HispaloPoints | Gap | El producto pedido no esta implementado; solo hay HI Coins manuales sin triggers de compra/contenido/referido/interaccion. | Alto | `backend/routes/subscriptions.py:455-529`, `backend/services/subscriptions.py:189-232` |
| G-16 | IMPORTANTE | Certificado digital | Gap | El certificado existe pero no cubre un passport robusto de trazabilidad ni usa un dominio QR consistente. | Medio | `backend/routes/certificates.py:97`, `backend/routes/certificates.py:147`, `backend/routes/products.py:381` |
| G-17 | IMPORTANTE | Autenticacion frontend | Bug | Hay dos providers de auth y un mismatch de `onboardingCompleted` vs `onboarding_completed`. | Medio | `frontend/src/App.js:23`, `frontend/src/App.js:405-417`, `frontend/src/components/auth/ProtectedRoute.jsx:34`, `frontend/src/context/AuthContext.js:128` |
| G-18 | MEJORA | Arquitectura declarada vs real | Gap | El stack real no coincide con el declarado; eso complica roadmap, staffing y adopcion. | Medio | `frontend/package.json:61-73`, `backend/main.py:68`, ausencia de Next/Express en runtime |
| G-19 | MEJORA | Distincion productor/importador | Gap | Catalogo y B2B reconocen importador, pero el flujo B2C y payouts siguen modelando casi todo como `producer_id`. | Medio | `backend/core/models.py:263-287`, `backend/routes/orders.py`, `backend/routes/importer.py:27-93` |
| G-20 | MEJORA | Override manual de comision | Bug | Se guarda `subscription.manual_commission_rate` pero la logica canonica no la consume. | Bajo | `backend/routes/subscriptions.py:536-549`, `backend/services/subscriptions.py:283-285` |

### Resumen ejecutivo - Fase 2

Los gaps criticos se concentran en tres frentes: **flujo economico**, **motores duplicados** y **falta de una fuente unica de verdad**. Los gaps importantes se concentran en alineacion negocio-producto: pricing, tiers, puntos, certificados y entidades. El riesgo operativo mas serio es que una misma venta puede producir resultados distintos segun el endpoint usado, el rol del seller o el motor de atribucion que intervenga.

---

## FASE 3 - Plan de implementacion y correccion

### Principio rector

Antes de añadir nuevas features, el equipo debe consolidar una **capa canonica de reglas de negocio** y hacer que checkout, dashboards, payouts, tests y frontend lean de esa misma fuente.

| Tarea | Gaps | Descripcion | Archivos o modulos afectados | Complejidad | Dependencias |
|---|---|---|---|---|---|
| T-01 | G-01, G-04, G-06 | Crear un modulo canonico de monetizacion y migrar todos los calculos de split para que usen plan real del seller y snapshots por pedido. | `backend/services/subscriptions.py`, nuevo `backend/services/monetization.py`, `backend/routes/orders.py`, `backend/routes/producer.py` | L | Ninguna |
| T-02 | G-02, G-03, G-06 | Corregir la regla de influencer: siempre descontar su parte de la comision de plataforma y bloquear cualquier payout superior al `platform_gross` por seller. | `backend/routes/checkout.py`, `backend/routes/orders.py`, `backend/services/subscriptions.py` | L | T-01 |
| T-03 | G-05 | Elegir un solo flujo de checkout B2C y desactivar/deprecar el duplicado. Mantener un unico contrato API para frontend. | `backend/main.py`, `backend/routes/orders.py`, `backend/routes/checkout.py`, `frontend/src/pages/CartPage.js`, `frontend/src/App.js` | M | T-01, T-02 |
| T-04 | G-07, G-06, G-13 | Unificar catalogo de planes, moneda y nomenclatura en backend, frontend y tests. Definir si el sistema factura en EUR + IVA y reflejarlo en APIs. | `backend/routes/subscriptions.py`, `backend/services/subscriptions.py`, `frontend/src/pages/PricingPage.js`, `frontend/src/pages/ProductorLandingPage.js`, `frontend/src/pages/ImporterLandingPage.js`, tests | M | T-01 |
| T-05 | G-08, G-19 | Extender la logica de plan y monetizacion a importadores sin fallback silencioso. | `backend/routes/subscriptions.py`, `frontend/src/context/ProducerPlanContext.js`, `backend/routes/importer.py` | M | T-04 |
| T-06 | G-09, G-10, G-13 | Redefinir el ladder de influencers al modelo pedido: Perseo/Artemisa/Hercules/Atenea/Zeus, con reglas de GMV mensual + seguidores y migracion de datos/tests. | `backend/config.py`, `backend/services/subscriptions.py`, `backend/routes/subscriptions.py`, `backend/routes/auth.py`, tests y scripts de migracion | L | T-04 |
| T-07 | G-11, G-12 | Corregir CRUD admin de influencers: defaults, validaciones de rango, estados compatibles y guardrails para comisiones. | `backend/routes/admin.py`, `frontend/src/pages/admin/AdminInfluencers.js`, `backend/routes/influencer.py` | M | T-06 |
| T-08 | G-05, G-14 | Consolidar atribucion y comisiones en un solo motor; decidir si el stack activo sigue en Mongo o si parte del affiliate engine migra al modelo futuro PostgreSQL. | `backend/routes/affiliates.py`, `backend/services/affiliate_tracking.py`, `backend/routes/orders.py`, `backend/services/affiliate_service.py`, `backend/main.py` | XL | T-01, T-02, T-06 |
| T-09 | G-14, G-19 | Introducir entidades normalizadas minimas para `Subscription`, `Commission`, `SellerProfile`/`ImporterProfile` y snapshots transaccionales. | `backend/core/models.py`, colecciones Mongo o migracion a `_future_postgres`, scripts de migracion | XL | T-01, T-05, T-08 |
| T-10 | G-15 | Implementar Hispalopoints reales con ledger, reglas de earning, expiracion y redemption integrado. | nuevo `backend/services/points.py`, nuevas rutas/repo, hooks desde orders/posts/referrals/interactions, frontend de usuario | L | T-09 |
| T-11 | G-16 | Evolucionar certificados hacia passport digital: trazabilidad, certificaciones, issuer, versionado y QR canonico. | `backend/routes/certificates.py`, `backend/routes/products.py`, `backend/core/models.py`, frontend certificados | L | T-09 |
| T-12 | G-17 | Simplificar auth frontend a un solo provider y corregir el contrato de onboarding. | `frontend/src/App.js`, `frontend/src/context/AuthContext.js`, `frontend/src/providers/AuthProvider.jsx`, `frontend/src/components/auth/ProtectedRoute.jsx`, `frontend/src/hooks/useAuthRedirect.js` | M | Ninguna |
| T-13 | G-18 | Formalizar arquitectura objetivo y retirar codigo muerto o ambiguo (`backend/server.py`, app duplicada, rutas legacy no canonicas). | `backend/main.py`, `backend/app/*`, `backend/server.py`, ADR/README | M | T-03, T-08, T-12 |
| T-14 | G-13, G-20 | Reescribir la suite de tests critica para que valide reglas del negocio actual y eliminar features muertas o no usadas como `manual_commission_rate` si no van a mantenerse. | `backend/tests/*`, `backend/routes/subscriptions.py`, `backend/services/subscriptions.py` | M | T-01 a T-07 |

### Orden recomendado de ejecucion

1. T-01
2. T-02
3. T-03
4. T-04
5. T-05
6. T-06
7. T-07
8. T-14
9. T-08
10. T-09
11. T-10
12. T-11
13. T-12
14. T-13

### Decisiones de arquitectura que conviene tomar antes de implementar

1. Si el backend de referencia va a seguir siendo FastAPI + Mongo para B2C en 2026 o si la hoja de ruta real es migrar partes a PostgreSQL.
2. Si el modelo de pricing oficial es EUR + IVA y si la API debe devolver importes finales o base imponible.
3. Si el programa de influencers debe coexistir con el affiliate engine legacy o reemplazarlo completamente.
4. Si `HispaloPoints` reemplaza `HI Coins` o si ambos conviviran con semanticas distintas.

### Resumen ejecutivo - Fase 3

El plan debe empezar por **corregir el dinero**, no por añadir features. La primera oleada es consolidar una fuente unica para comisiones, planes y payouts. La segunda oleada es normalizar influencers, entidades y tests. Solo despues tiene sentido invertir en Hispalopoints, passport digital y limpieza arquitectonica. Si se hace al reves, el equipo construira nuevas features sobre una base economica inconsistente.

---

## FASE 4 - Plan de adopcion

### Sprint 1 (1 semana) - Congelar reglas economicas y contratos

Objetivo:

- Acordar la fuente unica de verdad para planes, comisiones y nomenclatura.
- Corregir el split economico del checkout canonico.

Entregables:

- T-01 iniciado y T-02 iniciado.
- ADR corta con reglas economicas oficiales.
- Matriz de test de comisiones por plan y por influencer.

Criterios de validacion:

- Una venta con plan FREE sin influencer deja 80% seller / 20% plataforma.
- Una venta PRO con influencer deja 82% seller / 15% plataforma / 3% influencer.
- Una venta ELITE con influencer nunca paga al influencer por encima del 17% de comision total de plataforma.
- Multi-seller order produce snapshots correctos por seller.

Tests minimos:

- Unit tests de calculo para `FREE`, `PRO`, `ELITE`.
- Regression test de rounding.
- Test de order con y sin influencer.
- Test multi-seller.

### Sprint 2 (1-2 semanas) - Unificar checkout, suscripciones y pricing

Objetivo:

- Dejar un solo flujo de checkout B2C.
- Alinear backend, frontend y tests con el pricing oficial.
- Extender el plan a importadores.

Entregables:

- T-03, T-04, T-05.

Criterios de validacion:

- El frontend solo llama a un endpoint de checkout.
- `/sellers/plans` refleja el catalogo oficial.
- Productores e importadores obtienen su plan correcto sin fallback silencioso.

Tests minimos:

- Contract test de `/sellers/plans`.
- Integration test de `/sellers/me/plan` para `producer` e `importer`.
- Test frontend del flujo `/cart -> checkout`.

### Sprint 3 (1-2 semanas) - Rehacer el programa de influencers

Objetivo:

- Unificar ladder, criterios de tier y operaciones admin.
- Eliminar estados, rangos y defaults fuera del negocio.

Entregables:

- T-06, T-07, T-14 parcial.

Criterios de validacion:

- Los tiers visibles y persistidos son exactamente los definidos por negocio.
- El recalculo usa GMV mensual + seguidores.
- El admin no puede crear influencers fuera del rango permitido.
- Los estados usados por UI y API coinciden.

Tests minimos:

- Unit tests de promotion/demotion por tier.
- Test de followers como condicion de ascenso.
- Test de endpoint admin create/update/status.
- Test de payout por tier.

### Sprint 4 (2 semanas) - Consolidar atribucion y modelo de datos

Objetivo:

- Reducir a un solo motor de atribucion.
- Introducir entidades normalizadas y snapshots utiles para auditoria.

Entregables:

- T-08 y T-09.

Criterios de validacion:

- Una venta atribuida genera un solo registro canonico de comision.
- Se puede reconstruir por pedido: seller, plan snapshot, influencer snapshot, gross/net.
- La distincion productor/importador ya no depende solo de `producer_id`.

Tests minimos:

- Test end-to-end click/atribucion/conversion.
- Test de idempotencia de comisiones.
- Test de migracion de datos.

### Sprint 5 (1-2 semanas) - Hispalopoints y certificado digital

Objetivo:

- Implementar la capa de engagement y trazabilidad pedida por negocio.

Entregables:

- T-10 y T-11.

Criterios de validacion:

- Se generan puntos automaticamente por compra, contenido, referido e interaccion.
- Existe canje controlado con ledger y reglas.
- El certificado usa un QR canonico y muestra trazabilidad suficiente.

Tests minimos:

- Test de earning por trigger.
- Test de redemption y expiracion.
- Test de generacion/lectura de QR.
- Test de versionado o actualizacion controlada del certificado.

### Sprint 6 (1 semana) - Limpieza final y preparacion de adopcion

Objetivo:

- Eliminar ambiguedad arquitectonica y cerrar deuda operativa.

Entregables:

- T-12, T-13, T-14 final.
- Documentacion de arquitectura objetivo.
- Checklist de release y rollback.

Criterios de validacion:

- Solo existe un provider de auth en frontend.
- El onboarding usa un solo nombre de campo.
- El runtime no monta rutas legacy no aprobadas.
- README y docs reflejan el stack real.

Tests minimos:

- Smoke test de login por rol.
- Smoke test de rutas protegidas.
- Smoke test de checkout y dashboards principales.

### Riesgos principales y mitigacion

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Cambiar la logica de comisiones rompe pedidos o conciliacion historica | Alto | Versionar snapshots por pedido y desplegar con feature flag |
| Tests actuales bloquean la correccion porque validan reglas legacy | Alto | Reescribir primero la suite critica y separar tests legacy de contratos oficiales |
| Coexistencia de motores de checkout/afiliacion produce dobles registros | Alto | Apagar rutas duplicadas por config y añadir idempotencia por `order_id`/`order_item_id` |
| Mongo tiene documentos heterogeneos y sin migraciones fuertes | Alto | Scripts de backfill, validadores y rollout por lotes |
| Frontend hace fallback silencioso a FREE y oculta errores reales | Medio | Convertir fallos de plan en estados visibles y telemetry |
| El equipo sigue planificando sobre un stack declarado pero no real | Medio | Publicar ADR y actualizar README/arquitectura antes del siguiente sprint de negocio |

### Tests minimos por modulo critico

- Monetizacion:
  - matriz de planes x influencer x multi-seller x rounding
  - webhook/confirmacion de pago idempotente
- Suscripciones:
  - alta, cambio, downgrade, webhook Stripe y acceso por rol
- Influencers:
  - atribucion, expiracion de cookie/regla de atribucion, payout, tiering
- Auth:
  - login, aprobacion, onboarding, rutas protegidas por rol
- Points:
  - earn, spend, redeem, expiry, antifraude basico
- Certificados:
  - generacion, lectura, traduccion, QR, consistencia de dominio

### Resumen ejecutivo - Fase 4

La adopcion debe hacerse en seis sprints cortos, empezando por el dinero y terminando en limpieza y growth features. El criterio de exito no es solo "que compile", sino poder demostrar con tests y snapshots que cada pedido reparte correctamente el dinero, que cada influencer cobra dentro del margen de plataforma y que la arquitectura deja de depender de rutas y modelos duplicados.

---

## Conclusión general

Hispaloshop tiene una base funcional amplia, pero hoy mezcla tres estados del producto:

1. Un marketplace B2C operativo en FastAPI/Mongo.
2. Un conjunto de features SaaS/social/affiliate añadidas por capas y no siempre consolidadas.
3. Un futuro modelo mas limpio en PostgreSQL que todavia no gobierna el runtime.

La prioridad no es añadir mas superficie funcional, sino **cerrar la brecha entre negocio y runtime**. Si el equipo corrige primero la capa economica y reduce el numero de fuentes de verdad, el resto del roadmap pasa de ser una reescritura caotica a una evolucion controlada.
