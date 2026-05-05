# Hispaloshop — Runbook Operacional (Post CICLO 1)

Guía de referencia rápida para la gestión diaria de Hispaloshop tras el despliegue de CICLO 1.

---

## Referencia Rápida — Respuesta a Emergencias

| Síntoma | Sección |
|---------|---------|
| Payout de Stripe bloqueado | [Gestión de Payouts Stripe](#2-gestión-de-payouts-stripe) |
| Notificaciones FCM sin enviar | [Gestión de Push Notifications (FCM)](#4-gestión-de-push-notifications-fcm) |
| Tipos de cambio desactualizados | [Gestión de Tipos de Cambio](#3-gestión-de-tipos-de-cambio) |
| Necesito escalar el problema | [Ruta de Escalación](#8-ruta-de-escalación) |

---

## 1. Contexto — Qué implementó CICLO 1

- **Stripe transfer retry**: reintentos con backoff exponencial para transferencias fallidas.
- **Tipos de cambio dinámicos (ECB)**: obtención automática desde el Banco Central Europeo con fallback a BD y estáticos.
- **FCM HTTP v1**: migración de la API legada de Firebase con fallback automático a legacy.

---

## 2. Gestión de Payouts Stripe

### Estados posibles de un payout

```
requested → pending_transfer → paid
                             ↘ transfer_failed
```

### Consultar payouts fallidos

```http
POST /admin/payouts/failed
```

### Reintentar transferencias fallidas manualmente

```http
POST /admin/cron/retry-failed-transfers
```

### Diagnóstico

Revisar los logs filtrando por `[CRON]`. Buscar los campos:

- `attempt_count` — número de intentos realizados.
- `backoff_seconds` — tiempo de espera antes del siguiente intento.
- `error_message` — motivo del fallo.

### Errores comunes

| Error | Causa | Acción |
|-------|-------|--------|
| Network timeout | Timeout transitorio con Stripe | Ejecutar `/admin/cron/retry-failed-transfers` |
| Invalid account | `stripe_account_id` incorrecto en BD | Verificar `payout.stripe_account_id` en la colección `payouts` |
| Insufficient funds | Fondos insuficientes en cuenta Stripe | Revisar saldo de la cuenta Stripe en el dashboard |

### Cuándo escalar

Si el estado sigue siendo `transfer_failed` después de **3 intentos** → escalar a Level 2 (ver [Ruta de Escalación](#8-ruta-de-escalación)).

---

## 3. Gestión de Tipos de Cambio

### Verificar tasas actuales

```http
GET /exchange-rates
```

### Actualizar tasas manualmente (ECB)

```http
POST /admin/cron/update-exchange-rates
```

### Lógica de fallback

```
1. Fetch ECB (fuente primaria)
   ↓ falla
2. Últimas tasas conocidas en BD (colección exchange_rates)
   ↓ vacía
3. Tasas estáticas de emergencia (hardcoded en código)
```

### Consultar historial de tasas

```javascript
// Última tasa registrada
db.exchange_rates.find({}).sort({ date: -1 }).limit(1)
```

La colección `exchange_rates` está indexada por `date`.

### Cuándo investigar

Si las tasas no se han actualizado en **más de 24 horas**, ejecutar el cron manual e investigar conectividad con el endpoint ECB.

### Tasas estáticas (diagnóstico crítico)

Disponibles como último recurso si la BD no está disponible. Solo usar para diagnóstico; no reflejan el mercado actual.

---

## 4. Gestión de Push Notifications (FCM)

### Consultar notificaciones fallidas

```javascript
db.notifications.find({ "status_by_channel.push": "failed" })
```

### Reintentar notificaciones fallidas manualmente

```http
POST /admin/cron/retry-failed-push-notifications
```

### Lógica de fallback v1 → legacy

```
1. Intento FCM HTTP v1 (API moderna, OAuth2)
   ↓ falla
2. Intento FCM API legada
   ↓ falla
3. Notificación marcada como failed
```

### Validación de tokens FCM

Los tokens válidos contienen dos puntos (`:`). Formato esperado:

```
^[a-zA-Z0-9_:-]+$
```

Un token sin `:` es inválido y no se puede entregar.

### Verificar qué versión tuvo éxito

El campo `fcm_retry_version` en el documento de notificación indica si se envió con `v1` o `legacy`.

```javascript
// Últimas notificaciones con versión registrada
db.notifications.find({ fcm_retry_version: { $exists: true } }).sort({ fcm_retry_at: -1 }).limit(10)
```

### Cuándo escalar

- Token no pasa la validación de formato → revisar cómo se registró el token en `device_preferences`.
- Ambas APIs (v1 y legacy) fallan de forma consistente → escalar a Level 2.

---

## 5. Monitoreo y Alertas

### Comprobaciones diarias

| Componente | Métrica | Umbral |
|------------|---------|--------|
| Stripe transfers | Payouts en `pending_transfer` | 0 durante más de 1 hora |
| Tipos de cambio | Timestamp de última actualización en BD | Menos de 24 horas |
| FCM | Notificaciones en `failed` | 0 durante más de 7 días |

### Umbrales de alerta automática

- **3 o más payouts en `transfer_failed`** → el sistema envía email automático al super_admin.
- **FCM v1 fallando de forma continua** → revisar generación del token OAuth2 (`FCM_SERVICE_ACCOUNT_JSON`).
- **Fetch de ECB con timeout repetido** → verificar conectividad de red; considerar aumentar el timeout.

### Logs a filtrar

```
[CRON]   — operaciones de cron jobs
[FCM]    — envíos de notificaciones push
[STRIPE] — transferencias y payouts
[ECB]    — actualizaciones de tipos de cambio
```

---

## 6. Problemas Comunes y Soluciones

| Problema | Causa raíz | Solución |
|----------|-----------|----------|
| Payout bloqueado en `pending_transfer` más de 1 hora | Timeout transitorio con Stripe | Ejecutar `POST /admin/cron/retry-failed-transfers` |
| `transfer_failed` después de 3 reintentos | Cuenta Stripe inválida | Verificar `payout.stripe_account_id` en BD |
| Tipos de cambio desactualizados (fecha antigua) | Endpoint ECB caído | `POST /admin/cron/update-exchange-rates` manual |
| Sin tasas de fallback disponibles | BD vacía Y sin estáticos | Restaurar desde backup o importar manualmente |
| Notificaciones FCM fallando | Token inválido (sin `:`) | Verificar formato del token en `device_preferences` |
| v1 falla pero legacy funciona | Problema con cuenta de servicio OAuth2 | Revisar variable de entorno `FCM_SERVICE_ACCOUNT_JSON` |

---

## 7. Consultas de Base de Datos para Diagnóstico

```javascript
// Payouts fallidos
db.payouts.find({ status: "transfer_failed" }).sort({ failed_at: -1 })

// Transferencias bloqueadas en pending_transfer más de 2 horas
db.payouts.find({ status: "pending_transfer", created_at: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } })

// Tasa de cambio más reciente registrada
db.exchange_rates.find({}).sort({ date: -1 }).limit(1)

// Notificaciones push fallidas en los últimos 7 días
db.notifications.find({
  "status_by_channel.push": "failed",
  created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
})

// Últimas notificaciones con versión FCM registrada
db.notifications.find({ fcm_retry_version: { $exists: true } }).sort({ fcm_retry_at: -1 }).limit(10)
```

---

## 8. Ruta de Escalación

| Nivel | Acción | Quién |
|-------|--------|-------|
| **Level 1** | Revisar logs, ejecutar retry manual | Operador |
| **Level 2** | Sigue fallando después de 2 reintentos manuales | Contactar super_admin |
| **Level 3** | super_admin no disponible | Verificar variables de entorno: `FCM_SERVICE_ACCOUNT_JSON`, `STRIPE_SECRET_KEY` |
| **Level 4** | Se requiere backup/restore de BD | Contactar administrador de base de datos |

---

## 9. Prevención y Buenas Prácticas

### Diario
- Ejecutar los tres cron jobs:
  - `retry-failed-transfers`
  - `update-exchange-rates`
  - `retry-failed-push-notifications`
- Monitorear logs cada hora: filtrar por `[CRON]`.

### Semanal
- Verificar que no haya payouts en `pending_transfer` con más de una semana de antigüedad.
- Revisar la distribución de versiones FCM: la gran mayoría debe ser `v1`; el porcentaje de `legacy` debería ser inferior al 5%.

### Mensual
- Revisar exactitud de tipos de cambio: contrastar una muestra con una fuente externa.

---

## 10. Checklist de Despliegue (Antes de Producción)

- [ ] Las 5 PRs de CICLO 1 mergeadas (#28, #29, #30, #31, #32)
- [ ] Variables de entorno configuradas: `FCM_SERVICE_ACCOUNT_JSON`, `STRIPE_SECRET_KEY`
- [ ] Migraciones de base de datos aplicadas: campos `Payout.failed_at`, `Payout.failure_reason`
- [ ] Cron jobs configurados:
  - `retry-failed-transfers` — diario a las 08:00 UTC
  - `update-exchange-rates` — diario a las 10:00 UTC
  - `retry-failed-push-notifications` — diario (cualquier hora)
- [ ] Tests pasando:
  - `pytest tests/test_stripe_transfer_retry.py`
  - `pytest tests/test_exchange_rates.py`
  - `pytest tests/test_fcm_v1.py`
- [ ] Alertas de monitoreo configuradas: fallos de payouts, distribución de versiones FCM
- [ ] Runbook revisado por el equipo
- [ ] Super admin formado en los procedimientos de escalación
