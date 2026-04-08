# PROMPTS FASE 5 — LAUNCH
## Prompts 5.1 a 5.5 (Batch)

Contexto obligatorio: `memory/hispaloshop_dna.md`, `DESIGN_SYSTEM.md`, `ROADMAP_LAUNCH.md`

---

## 5.1 Content Seeding
**Done:**
- [ ] Seed cuentas de productores reales (con permiso)
- [ ] Seed productos reales con fotos profesionales
- [ ] Seed 10-20 posts de ejemplo
- [ ] Seed 5-10 recetas completas
- [ ] Seed 2-3 influencers activos
- [ ] Configurar datos demo en producción (flaggeados)

**Archivos:** `backend/scripts/seed_production.py`

---

## 5.2 Documentation & Runbooks
**Done:**
- [ ] README principal actualizado
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Runbook: deploy procedure
- [ ] Runbook: rollback procedure
- [ ] Runbook: incident response
- [ ] Onboarding nuevo developer

**Archivos:** `docs/`, `README.md`, `DEPLOYMENT.md`, `DISASTER_RECOVERY.md`

---

## 5.3 Legal Assets Finalization
**Done:**
- [ ] Términos y Condiciones revisados por abogado
- [ ] Política de Privacidad revisada
- [ ] Política de Cookies revisada
- [ ] Acuerdo Productor
- [ ] Acuerdo Influencer
- [ ] DMCA/Copyright policy

**Archivos:** `frontend/src/pages/legal/`, versionado en git

---

## 5.4 Launch Day Checklist
**Done:**
- [ ] SSL certificates configurados
- [ ] Dominios: hispaloshop.com + www redirect
- [ ] Stripe modo LIVE
- [ ] MongoDB producción (no shared cluster)
- [ ] Backups automáticos verificados
- [ ] Monitoreo: Sentry, logs, alerts
- [ ] Comunicación: email a lista espera
- [ ] Social media: posts preparados
- [ ] Equipo soporte listo
- [ ] Hotfix procedure documentado

**Archivos:** `LAUNCH_CHECKLIST.md`

---

## 5.5 Post-Launch Monitoring
**Done:**
- [ ] Dashboard métricas clave (DAU, conversiones, errores)
- [ ] Alertas: error rate >1%, latency >500ms
- [ ] Weekly review: bugs reportados, features solicitadas
- [ ] Monthly review: métricas negocio
- [ ] Plan iteración V1.1

**Archivos:** `docs/monitoring/`, dashboards analytics

---

## COMMIT MESSAGE Fase 5
```
feat(launch): fase 5 completa — content seeding, docs, legal, launch checklist, monitoring

- Content: productores, productos, posts, recetas seedeados
- Docs: API docs, runbooks deploy/rollback/incident
- Legal: TyC, Privacidad, Cookies revisados
- Launch: SSL, dominios, Stripe live, backups, monitoreo
- Monitoring: dashboard métricas, alertas automáticas
- Zero emojis, stone palette ADN

Refs: 5.1-5.5
```

---

# 🚀 LAUNCH DAY

```
MAIN LAUNCH COMPLETE

HispaloShop V1 está LIVE

Fases completadas:
- 0: Fundamentos
- 1: Consumer Experience
- 2: Producer & Influencer
- 3: Admin & Operations
- 4: Compliance & Polish
- 5: Launch

Total secciones: 50+
Tests passing: 31/31 commission + smoke tests
ADN: Zero emojis, stone palette, Apple minimalist

Gracias por construir con calidad.
```
