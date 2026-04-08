# PROMPT DE TRANSFERENCIA — Sección 3.2
## Country Admin Dashboard

**Prioridad:** ALTA  
**Estado:** DESCONOCIDO  
**Objetivo:** Dashboard para administradores de país gestionar su mercado

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`
3. `ROADMAP_LAUNCH.md` sección 3.2
4. `frontend/src/pages/admin/` existente
5. `backend/routes/admin.py`

---

## REQUERIMIENTOS

### 1. Overview del País
- Total usuarios, productores, pedidos del mes
- GMV mensual (Gross Merchandise Value)
- Tendencias: gráfico de pedidos últimos 30 días
- Alertas: productores pendientes de verificación, disputas abiertas

### 2. Gestión de Productores
- Lista de productores con filtros (pendiente/aprobado/rechazado)
- Acciones: verificar, suspender, contactar
- Documentación: ver documentos subidos, aprobar/rechazar con comentario

### 3. Gestión de Productos
- Lista productos pendientes de aprobación
- Aprobar/rechazar productos
- Reportes de productos (usuarios reportando)

### 4. Gestión de Pedidos
- Lista pedidos del país
- Filtros por estado, fecha, productor
- Ver detalle de pedido
- Soporte: marcar como disputa, reembolso manual

### 5. Gestión de Influencers
- Lista influencers del país
- Ver métricas: alcance, conversiones, comisiones
- Aprobar solicitudes de influencer

### 6. Configuración del País
- Festivos (días sin entrega)
- Métodos de pago disponibles
- Tarifas de envío estándar
- Impuestos: VAT rate si aplica

---

## ARCHIVOS

### Backend
- `backend/routes/admin.py` — Endpoints country-admin (scoped por país)
- `backend/routes/admin_verification.py` — Verificación productores
- `backend/services/country_stats.py` — Métricas por país

### Frontend
- `frontend/src/pages/admin/CountryDashboard.tsx`
- `frontend/src/pages/admin/ProducersManagement.tsx`
- `frontend/src/pages/admin/ProductsApproval.tsx`
- `frontend/src/pages/admin/OrdersManagement.tsx`
- `frontend/src/pages/admin/InfluencersManagement.tsx`
- `frontend/src/pages/admin/CountrySettings.tsx`

---

## CHECKLIST DONE

- [ ] Overview con métricas clave
- [ ] Gráfico tendencias pedidos
- [ ] Lista productores con acciones
- [ ] Aprobación documentación productores
- [ ] Lista productos pendientes
- [ ] Lista pedidos con filtros
- [ ] Lista influencers con métricas
- [ ] Configuración país (festivos, VAT)
- [ ] Zero emojis, stone palette

---

## COMMIT MESSAGE
```
feat(admin-country): dashboard completo gestión país

- Overview: usuarios, GMV, tendencias 30 días
- Productores: verificación, suspensión, documentos
- Productos: aprobación, reportes
- Pedidos: filtros, disputas, reembolsos
- Influencers: métricas, aprobaciones
- Settings: festivos, VAT, métodos pago
- Zero emojis, stone palette ADN

Refs: 3.2
```
