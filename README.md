# Proyecto

---

### **CICLO 1 — Core Financial & Messaging Infrastructure (✅ COMPLETE)**

**May 2026 — Production Ready**

Implemented 5 critical systems:
- ✅ **Stripe Transfer Retry System** (PR #28) — Exponential backoff, audit trail, admin notifications
- ✅ **Dynamic Exchange Rates** (PR #29) — ECB integration with fallback, indexed for performance
- ✅ **ECB Graceful Fallback** (PR #31) — Resilient rate fetching, correct response schema
- ✅ **FCM HTTP v1 Migration** (PR #30) — OAuth2 auth, legacy automatic fallback
- ✅ **FCM Token Validation** (PR #32) — Support colons in real Firebase tokens

**Key Features:**
- Payout states: `requested` → `pending_transfer` → `paid` (or `transfer_failed`)
- Exchange rates cached daily from ECB, static fallback if unavailable
- Push notifications attempt v1 first, automatic legacy fallback
- All with monitoring, alerts, and operational runbook

**Documentation:**
- See `docs/MAPA.md` for architecture diagrams
- See `docs/RUNBOOK.md` for day-to-day operations
- See `docs/ai/MEGA_PLAN.md` for original requirements

---

## Quick Start

Instrucciones para comenzar rápidamente.

## Estructura del Proyecto

Descripción de la estructura.

## Features Principales

Características del proyecto.

## Stack Tecnológico

Tecnologías utilizadas.

## Fases Completadas

Descripción de las fases completadas.

## Testing

Instrucciones sobre pruebas.

## Documentación

Detalles sobre la documentación.

## Variables de Entorno Críticas

Variables necesarias para la configuración.

## Licencia

Información sobre la licencia.