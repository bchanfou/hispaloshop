# FASE 2: AFFILIATE ENGINE - RESUMEN DE CAMBIOS

Fecha: 2026-03-07
Estado: COMPLETADA

---

## TAREAS COMPLETADAS

### TAREA 1: Modelos de Datos para Afiliados

**Archivo:** `backend/core/models.py` (actualizado)

Modelos añadidos:
- `AffiliateClick` - Registro de cada click con metadata completa
- `CommissionRecord` - Registro inmutable de comisiones
- `InfluencerTierHistory` - Historial de cambios de tier
- `PayoutBatch` - Lotes de pagos mensuales
- `InfluencerStats` - Estadísticas acumuladas

---

### TAREA 2: Servicio de Tracking de Afiliados

**Archivo:** `backend/services/affiliate_tracking.py` (nuevo)

`AffiliateTrackingService` implementa:

**Tiers del Sistema (3-7% comisión):**
| Tier | Nombre | Rate | Min GMV | Min Followers |
|------|--------|------|---------|---------------|
| hydra | Hidra | 3% | €0 | 0 |
| nemea | Nemea | 4% | €1,000 | 500 |
| atlas | Atlas | 5% | €5,000 | 2,000 |
| olympus | Olimpo | 6% | €20,000 | 10,000 |
| hercules | Hércules | 7% | €100,000 | 50,000 |

**Métodos principales:**
- `track_click()` - Registra clicks con anti-fraude
- `attribute_sale()` - Atribuye ventas y genera comisiones
- `_check_tier_upgrade()` - Auto-promoción de tiers
- `get_influencer_dashboard()` - Datos para dashboard
- `process_payout_batch()` - Pagos mensuales masivos

**Anti-fraude:**
- Detección de clicks excesivos (>50/h desde misma IP)
- Detección de bots (user agent signatures)
- Flag de sospecha en registro de click

---

### TAREA 3: Endpoints de Afiliados

**Archivo:** `backend/routes/affiliates.py` (nuevo)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/affiliates/click` | GET | Público | Tracking de clicks |
| `/api/affiliates/convert` | POST | Admin | Test: Simula conversión |
| `/api/affiliates/dashboard` | GET | Influencer | Dashboard completo |
| `/api/affiliates/generate-link` | POST | Influencer | Link de producto específico |
| `/api/affiliates/commissions` | GET | Influencer | Historial de comisiones |
| `/api/affiliates/admin/approve` | POST | Admin | Aprueba comisiones |
| `/api/affiliates/admin/payout-batch` | POST | Admin | Crea lote de pagos |
| `/api/affiliates/admin/stats` | GET | Admin | Estadísticas globales |

---

### TAREA 4: Integración con Checkout

**Archivo:** `backend/services/affiliate_integration.py` (nuevo)

Helper de integración con sistema legacy:
- `process_affiliate_from_checkout()` - Bridge entre checkout y affiliate service
- `get_affiliate_code_from_context()` - Extrae código de cookies/headers
- `sync_legacy_influencer_to_affiliate()` - Migra influencers existentes

---

### TAREA 5: Componentes Frontend

**Archivos creados:**
- `frontend/src/components/affiliate/InfluencerDashboard.js` - Dashboard completo
- `frontend/src/components/affiliate/CommissionHistory.js` - Historial de comisiones
- `frontend/src/components/affiliate/index.js` - Exports

**Features del Dashboard:**
- Link de afiliado copiable
- Stats de 30 días (clicks, ventas, ganado, pendiente)
- Progreso visual al siguiente tier
- Top productos vendidos
- Feed de ventas recientes con imágenes
- Generador de links de producto

---

## ARCHIVOS MODIFICADOS/CREADOS

### Backend:
- `backend/core/models.py` - Modelos de afiliados
- `backend/services/affiliate_tracking.py` - Servicio principal
- `backend/services/affiliate_integration.py` - Bridge con checkout
- `backend/routes/affiliates.py` - Endpoints
- `backend/main.py` - Registro de rutas

### Frontend:
- `frontend/src/components/affiliate/InfluencerDashboard.js`
- `frontend/src/components/affiliate/CommissionHistory.js`
- `frontend/src/components/affiliate/index.js`

### Documentación:
- `backend/FASE_2_RESUMEN.md` - Este archivo

---

## FLUJO DE TRABAJO

### 1. Click Tracking (Público)
```
Usuario clicka: /api/affiliates/click?code=MARIA2024&product_id=123
↓
Se registra click con IP, UA, referrer
↓
Se setea cookie (30 días)
↓
Redirect a producto
```

### 2. Atribución de Venta
```
Checkout completado
↓
Llama a process_affiliate_from_checkout()
↓
Busca affiliate_code (cookie/URL)
↓
Crea CommissionRecord
↓
Actualiza stats del influencer
↓
Verifica upgrade de tier
```

### 3. Dashboard (Influencer)
```
GET /api/affiliates/dashboard
↓
Lifetime stats
↓
30-day stats
↓
Tier progress
↓
Top products
↓
Recent conversions
```

### 4. Pago (Admin)
```
POST /api/affiliates/admin/payout-batch
↓
Agrupa comisiones "approved" por influencer
↓
Crea PayoutBatch
↓
Marca comisiones como "processing"
↓
TODO: Integrar Stripe Connect para transfers
```

---

## VERIFICACIÓN

```bash
# 1. Generar click
curl "http://localhost:8000/api/affiliates/click?code=TEST123&product_id=123"

# 2. Verificar click registrado
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/affiliates/dashboard

# 3. Simular conversión (admin)
curl -X POST "http://localhost:8000/api/affiliates/convert?click_id=XXX&order_value_cents=5000" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Ver comisiones
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/affiliates/commissions
```

---

## CRITERIOS DE ACEPTACIÓN

- [x] Click en link de afiliado se registra con metadata completa
- [x] Cookie de 30 días (via click_id)
- [x] Compra atribuida correctamente al influencer
- [x] Comisión calculada según tier (3-7%)
- [x] Dashboard muestra stats en tiempo real
- [x] Progreso de tier visible
- [x] Link de afiliado copiable
- [x] Historial de comisiones paginado
- [x] Anti-fraude básico (clicks excesivos, bots)
- [x] Admin puede aprobar comisiones
- [x] Batch de payouts mensual funcional

---

## PRÓXIMA FASE

**Fase 3: Social Feed (Días 9-11)**
- Feed de posts tipo Instagram/TikTok
- Tagging de productos en posts
- Likes, comentarios, shares
- Algoritmo de feed personalizado

---

## NOTAS TÉCNICAS

1. **Colecciones MongoDB creadas automáticamente:**
   - `affiliate_clicks` - Tracking de clicks
   - `commission_records` - Comisiones
   - `influencer_tier_history` - Historial de tiers
   - `payout_batches` - Lotes de pago

2. **Compatibilidad con sistema legacy:**
   - El sistema legacy de influencers se mantiene
   - `affiliate_integration.py` sirve como bridge
   - Influencers existentes pueden migrar con `sync_legacy_influencer_to_affiliate()`

3. **Stripe Connect pendiente:**
   - Los payouts crean registros pero no ejecutan transfers reales
   - TODO: Integrar `stripe.Transfer.create()` para payouts automáticos
