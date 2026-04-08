# PROMPTS FASE 2 — PRODUCER & INFLUENCER
## Prompts 2.1 a 2.16 (Batch)

Contexto obligatorio: `memory/hispaloshop_dna.md`, `DESIGN_SYSTEM.md`, `ROADMAP_LAUNCH.md` sección correspondiente.

---

## 2.1 Producer Onboarding & Verification
**Done:**
- [ ] Formulario: nombre, store name, descripción
- [ ] Verificación identidad: documento ID
- [ ] Verificación fiscal: VAT/Tax ID
- [ ] Verificación bancaria: cuenta Stripe Connect
- [ ] Status: pending → under_review → approved | rejected
- [ ] Email notificaciones cambio status

**Archivos:** `frontend/src/pages/producer/Onboarding.tsx`, `backend/routes/producer_verification.py`

---

## 2.2 Producer Dashboard & Overview
**Done:**
- [ ] KPIs: ventas mes, pedidos pendientes, stock bajo
- [ ] Gráfico ventas últimos 30 días
- [ ] Alertas: pedidos nuevos, reviews, stock
- [ ] Accesos rápidos: productos, pedidos, analytics

**Archivos:** `frontend/src/pages/producer/ProducerOverview.tsx`, `backend/routes/producer.py`

---

## 2.3 Product Management (CRUD)
**Done:**
- [ ] Lista productos: imagen, nombre, precio, stock, status
- [ ] Crear producto: nombre, descripción, imágenes, precio, stock
- [ ] Variantes: size, color, packs con stock por variante
- [ ] Categorías y tags
- [ ] Certificados: checkboxes auto-generan certs
- [ ] Disponibilidad por país
- [ ] Editar / Duplicar / Eliminar

**Archivos:** `frontend/src/pages/producer/ProducerProducts.tsx`, `backend/routes/products.py`

---

## 2.4 Producer Order Management
**Done:**
- [ ] Lista pedidos: cliente, items, total, status, fecha
- [ ] Filtros: status, fecha, producto
- [ ] Acciones: marcar preparado, enviado, entregado
- [ ] Ver detalle: dirección, items, notas
- [ ] Contactar cliente
- [ ] Generar albarán / factura

**Archivos:** `frontend/src/pages/producer/ProducerOrders.tsx`, `backend/routes/orders.py`

---

## 2.5 Producer Store Profile
**Done:**
- [ ] Store público: banner, avatar, nombre, bio
- [ ] Productos destacados
- [ ] Reviews store
- [ ] Contacto
- [ ] Compartir store

**Archivos:** `frontend/src/pages/StorePage.tsx`, `backend/routes/stores.py`

---

## 2.6 Producer Plan & Subscription
**Done:**
- [ ] Comparativa planes: FREE, PRO, ELITE
- [ ] Features por plan (límite productos, comisión, soporte)
- [ ] Upgrade/downgrade plan
- [ ] Billing: historial pagos, método pago
- [ ] Invoice descargable

**Archivos:** `frontend/src/pages/producer/ProducerPlan.tsx`, `backend/routes/subscriptions.py`

---

## 2.7 Producer Payouts (Manual V1)
**Done:**
- [ ] Balance disponible
- [ ] Historial transacciones
- [ ] Solicitar pago (manual, admin aprueba)
- [ ] Estado: pending → processing → completed
- [ ] Método: Revolut Business (manual V1)

**Archivos:** `frontend/src/pages/producer/ProducerPayouts.tsx`, `backend/routes/payouts.py`

---

## 2.8 Producer Analytics
**Done:**
- [ ] Ventas: total, por producto, por período
- [ ] Views: productos vistos, origen tráfico
- [ ] Conversion rate
- [ ] Reviews: rating promedio, cantidad
- [ ] Export CSV

**Archivos:** `frontend/src/pages/producer/ProducerAnalytics.tsx`, `backend/services/analytics.py`

---

## 2.9 Rebeca AI (PRO Sales Assistant)
**Done:**
- [ ] Chat flotante en dashboard productor
- [ ] Sugiere: optimizar precios, stock bajo, tendencias
- [ ] Responde sobre: analytics, pedidos, productos
- [ ] Insights: "Tus ventas subieron 20% esta semana"

**Archivos:** `frontend/src/components/ai/RebecaAI.tsx`, `backend/routes/ai.py`

---

## 2.10 Pedro AI (ELITE - Context-adapted)
**Done:**
- [ ] Para ELITE: más features que Rebeca
- [ ] Predicciones demanda
- [ ] Sugerencias pricing avanzadas
- [ ] Acceso anticipado a features

**Archivos:** `frontend/src/components/ai/PedroAI.tsx`, `backend/routes/ai.py`

---

## 2.10b AI Assistants UX (Floating System)
**Done:**
- [ ] Sistema unificado: David, Rebeca, Pedro
- [ ] Avatar distintivo por AI (colores permitidos ADN)
- [ ] Contexto: misma conversación continúa
- [ ] Minimizable, draggable

**Archivos:** `frontend/src/components/ai/AISystem.tsx`

---

## 2.11 Influencer Onboarding (Growth Partner)
**Done:**
- [ ] Aplicación: datos, audiencia, redes sociales
- [ ] Acuerdo: no vendedor, growth partner
- [ ] Verificación: análisis calidad audiencia
- [ ] Status: pending → approved
- [ ] Código de referido único generado

**Archivos:** `frontend/src/pages/influencer/Onboarding.tsx`, `backend/routes/influencer.py`

---

## 2.12 Influencer Tools (Growth Toolkit)
**Done:**
- [ ] Dashboard: clicks, conversiones, earnings
- [ ] Links: generador links trackables
- [ ] Content: templates, best practices
- [ ] Recursos: imágenes, banners de marca

**Archivos:** `frontend/src/pages/influencer/InfluencerTools.tsx`

---

## 2.13 Influencer Payouts (Fiscal Compliance)
**Done:**
- [ ] Balance comisiones
- [ ] Historial earnings
- [ ] Solicitar payout
- [ ] Formulario fiscal según país (Modelo 190 España, etc)
- [ ] Retención fiscal automática si aplica

**Archivos:** `frontend/src/pages/influencer/InfluencerPayouts.tsx`, `backend/routes/influencer_fiscal.py`

---

## 2.14 Importer Special Flow
**Done:**
- [ ] Variant producer con extras
- [ ] Documentación importación
- [ ] Tracking lotes
- [ ] Compliance aduanero

**Archivos:** `frontend/src/pages/importer/`, `backend/routes/importer.py`

---

## 2.15 Promotion System (Ads as Plan Benefit)
**Done:**
- [ ] FREE: 0 ads incluidas
- [ ] PRO: 5 ads/mes incluidas
- [ ] ELITE: ilimitadas
- [ ] Crear ad: imagen, texto, target
- [ ] Dashboard ads: impressions, clicks

**Archivos:** `frontend/src/pages/producer/AdsManager.tsx`, `backend/routes/ads.py`

---

## 2.16 Market Interest Requests (Killer Feature)
**Done:**
- [ ] Consumer: "Busco X producto, no lo encuentro"
- [ ] Formulario: qué busca, presupuesto, cantidad
- [ ] Productores ven requests relevantes a su categoría
- [ ] Productor puede "responder" ofreciendo producto
- [ ] Match: conecta consumer con productor

**Archivos:** `frontend/src/pages/InterestRequests.tsx`, `backend/routes/interest_requests.py`

---

## COMMIT MESSAGE Fase 2
```
feat(producer-influencer): fase 2 completa — onboarding, products, orders, analytics, payouts, influencer tools, ads, market requests

- Producer: onboarding verificado, dashboard, CRUD productos, orders, analytics
- Plans: FREE/PRO/ELITE comparativa, billing
- Payouts: manual V1, Revolut Business
- AIs: Rebeca PRO, Pedro ELITE, sistema floating unificado
- Influencer: onboarding, growth toolkit, fiscal compliance
- Importer: flujo especial con documentación
- Ads: sistema promoción según plan
- Market requests: killer feature demanda-oferta
- Zero emojis, stone palette ADN

Refs: 2.1-2.16
```
