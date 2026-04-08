# PROMPTS FASE 0 — FUNDAMENTOS
## Prompts 0.1 a 0.5 (Batch)

---

## 0.1 Brand DNA & Design System Consolidation

**Contexto:** Lee `memory/hispaloshop_dna.md`, `DESIGN_SYSTEM.md`, `frontend/tailwind.config.js`

**Done:**
- [ ] Design tokens documentados en DESIGN_SYSTEM.md
- [ ] Tailwind config limpio (solo valores tokenizados)
- [ ] Guía copy: tono, do/don't, emojis prohibidos
- [ ] Componentes base: Button, Card, Input, Modal, Toast, Badge, Avatar
- [ ] Zero colores fuera de palette stone-50 a stone-950
- [ ] Typography: Inter + system fonts

**Archivos:** `frontend/tailwind.config.js`, `frontend/src/index.css`, `DESIGN_SYSTEM.md`

---

## 0.2 Infrastructure & Environment

**Contexto:** Lee `.env.example`, `railway.json`, `backend/main.py`

**Done:**
- [ ] .env.example con todas variables documentadas (60+)
- [ ] Startup checks fallan si faltan vars críticas
- [ ] Sentry backend + frontend con source maps
- [ ] Railway deploy automático desde main
- [ ] Staging environment independiente
- [ ] GitHub Actions CI funcionando
- [ ] Logs estructurados (no print, todo logger)

**Archivos:** `.env.example`, `railway.json`, `.github/workflows/`, `backend/main.py`

---

## 0.3 Testing Strategy & Smoke Tests

**Contexto:** Lee `backend/tests/`, `frontend/src/__tests__/`, ROADMAP 0.3

**Done:**
- [ ] Playwright E2E: 5 flujos consumer críticos
- [ ] Pytest: 10 endpoints backend críticos
- [ ] CI ejecuta tests en cada PR
- [ ] Coverage mínimo 40% en routes/ y services/
- [ ] npm run test y pytest arrancan sin errores

**Archivos:** `backend/tests/`, `playwright/`, `.github/workflows/ci.yml`

---

## 0.4 Backups & Disaster Recovery

**Contexto:** Lee `DISASTER_RECOVERY.md` si existe

**Done:**
- [ ] Backup automático diario MongoDB a S3
- [ ] Script restore verificado (staging desde backup real)
- [ ] Runbook en DISASTER_RECOVERY.md
- [ ] Stripe webhook idempotente verificado

**Archivos:** `scripts/backup.py`, `DISASTER_RECOVERY.md`

---

## 0.5 Navigation Audit

**Contexto:** Lee `frontend/src/components/BottomNavBar.js`, header components, hamburger menu

**Done:**
- [ ] Tab bar: iconos, orden, estados activos, safe-area-inset
- [ ] Header: logo, search, notificaciones, avatar — consistencia
- [ ] Hamburger menu: estructura agrupada por jerarquía
- [ ] Routing guards: qué requiere login, qué es público
- [ ] Deep linking: URL compartible por sección

**Archivos:** `frontend/src/components/BottomNavBar.js`, `components/HamburgerMenu*`, `App.js` (routes)

---

## COMMIT MESSAGE Fase 0
```
feat(fundamentos): fase 0 completa — DNA, infra, tests, backups, nav

- Design system: tokens stone palette, tailwind clean
- Infra: env vars, sentry, railway CI/CD, staging
- Tests: playwright 5 flujos, pytest 10 endpoints, 40% coverage
- Backups: diario S3, restore verificado, runbook
- Navigation: tab bar, header, hamburger auditados
- Zero emojis, stone palette ADN

Refs: 0.1, 0.2, 0.3, 0.4, 0.5
```
