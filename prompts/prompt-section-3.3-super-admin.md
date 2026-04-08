# PROMPT DE TRANSFERENCIA — Sección 3.3
## Super Admin Global View

**Prioridad:** ALTA  
**Estado:** DESCONOCIDO  
**Objetivo:** Vista global para super administradores gestionar toda la plataforma

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`
3. `ROADMAP_LAUNCH.md` sección 3.3
4. `frontend/src/pages/super-admin/` existente
5. `backend/routes/admin.py` (endpoints super admin)

---

## REQUERIMIENTOS

### 1. Dashboard Global
- Usuarios totales, crecimiento día/semana/mes
- GMV global por país (gráfico)
- Pedidos por estado (gráfico circular)
- Top países por volumen
- Alertas sistema: errores, webhooks fallidos, backups

### 2. Gestión de Países
- Lista países con métricas
- Activar/desactivar país
- Configurar admin por país
- Ver estadísticas por país

### 3. Gestión de Usuarios
- Búsqueda global de usuarios
- Ver perfil completo (todos los roles)
- Suspender/activar usuario
- Impersonate login (acceder como usuario)

### 4. Gestión de Transacciones
- Lista todas las transacciones
- Filtros por país, productor, rango fecha
- Reembolsos manuales
- Export CSV

### 5. Configuración Global
- Feature flags (activar/desactivar features)
- Comisiones por plan (FREE/PRO/ELITE)
- Tarifas influencer por tier
- Variables de entorno críticas (solo lectura)

### 6. System Health
- Status servicios: MongoDB, Stripe, Cloudinary, FCM
- Logs recientes (últimos 100)
- Webhooks recibidos (últimos 50)
- Tareas cron última ejecución

---

## ARCHIVOS

### Backend
- `backend/routes/admin.py` — Endpoints super admin
- `backend/services/analytics.py` — Métricas globales
- `backend/services/health_check.py` — Health checks

### Frontend
- `frontend/src/pages/super-admin/SuperDashboard.tsx`
- `frontend/src/pages/super-admin/CountriesManagement.tsx`
- `frontend/src/pages/super-admin/UsersManagement.tsx`
- `frontend/src/pages/super-admin/TransactionsGlobal.tsx`
- `frontend/src/pages/super-admin/GlobalSettings.tsx`
- `frontend/src/pages/super-admin/SystemHealth.tsx`

---

## CHECKLIST DONE

- [ ] Dashboard global con métricas clave
- [ ] Gráfico GMV por país
- [ ] Lista países gestionables
- [ ] Búsqueda global usuarios
- [ ] Impersonate login
- [ ] Lista transacciones global
- [ ] Feature flags UI
- [ ] System health status
- [ ] Logs y webhooks recientes
- [ ] Zero emojis, stone palette

---

## COMMIT MESSAGE
```
feat(super-admin): vista global gestión plataforma

- Dashboard: usuarios, GMV global, top países
- Gestión países: activar/desactivar, asignar admins
- Gestión usuarios: búsqueda global, impersonate
- Transacciones: lista global, export CSV
- Settings: feature flags, comisiones, tarifas
- System health: status servicios, logs, webhooks
- Zero emojis, stone palette ADN

Refs: 3.3
```
