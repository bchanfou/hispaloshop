# PROMPTS FASE 4 — COMPLIANCE & POLISH
## Prompts 4.2 a 4.9 (Batch)

Contexto obligatorio: `memory/hispaloshop_dna.md`, `DESIGN_SYSTEM.md`, `ROADMAP_LAUNCH.md`

---

## 4.1 GDPR & Privacy — YA CREADO
Ver `prompt-section-4.1-gdpr-privacy.md`

---

## 4.2 Fiscal Compliance (Spain + Korea + USA)
**Done:**
- [ ] España: Modelo 190 para influencers (retención IRPF)
- [ ] Korea: PIPA compliance, registros procesamiento
- [ ] USA: Sales tax collection según estado
- [ ] Facturas con tax breakdown
- [ ] Export datos fiscales anual

**Archivos:** `backend/services/fiscal_*.py`, `frontend/src/pages/fiscal/`

---

## 4.3 i18n & Localization
**Done:**
- [ ] Idiomas: ES, EN, KO (completo)
- [ ] Monedas: EUR, USD, KRW con símbolos correctos
- [ ] Fechas: formato según locale
- [ ] RTL support (para futuro árabe)
- [ ] Traducción HispaloTranslate funcional

**Archivos:** `frontend/src/locales/`, `frontend/src/i18n/`

---

## 4.4 SEO & Marketing
**Done:**
- [ ] Meta tags dinámicos por página
- [ ] Open Graph para productos/posts
- [ ] Sitemap XML generado
- [ ] robots.txt
- [ ] Structured data (JSON-LD) para productos
- [ ] URL amigables: /product/{slug}

**Archivos:** `frontend/public/`, `frontend/src/seo/`

---

## 4.5 Performance & Core Web Vitals
**Done:**
- [ ] Lighthouse score >90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Lazy loading imágenes
- [ ] Code splitting por ruta
- [ ] CDN para assets estáticos

**Archivos:** `frontend/src/performance/`, optimizaciones en components

---

## 4.6 Accessibility (WCAG 2.1 AA)
**Done:**
- [ ] Alt text en todas las imágenes
- [ ] ARIA labels en componentes interactivos
- [ ] Keyboard navigation completo
- [ ] Focus indicators visibles
- [ ] Contraste color 4.5:1 mínimo
- [ ] Screen reader compatible

**Archivos:** Todos los componentes UI

---

## 4.7 Error Handling & Edge Cases
**Done:**
- [ ] 404 page custom
- [ ] 500 page custom
- [ ] Error boundaries React
- [ ] API error handling: retries, timeouts
- [ ] Offline mode: cache básico
- [ ] Graceful degradation

**Archivos:** `frontend/src/pages/Error404.tsx`, `frontend/src/pages/Error500.tsx`, `frontend/src/error-boundaries/`

---

## 4.8 Desktop Adaptation Global
**Done:**
- [ ] Layout responsive: mobile-first, desktop enhancement
- [ ] Sidebar en desktop para navegación rápida
- [ ] Max-width containers (1280px)
- [ ] Hover states en desktop
- [ ] Atajos teclado

**Archivos:** `frontend/src/layouts/`, `frontend/src/components/responsive/`

---

## 4.9 Legacy Code Cleanup
**Done:**
- [ ] Eliminar código muerto (unused imports, functions)
- [ ] Consolidar duplicados
- [ ] Actualizar dependencias críticas
- [ ] Eliminar console.logs
- [ ] Comentarios TODO resueltos o eliminados
- [ ] README actualizado

**Archivos:** Todo el codebase

---

## COMMIT MESSAGE Fase 4
```
feat(compliance-polish): fase 4 completa — GDPR, fiscal, i18n, SEO, performance, accessibility, error handling

- Fiscal: Modelo 190 ES, PIPA KR, sales tax US
- i18n: ES/EN/KO completo, EUR/USD/KRW
- SEO: meta tags, OG, sitemap, structured data
- Performance: Lighthouse 90+, lazy loading, code splitting
- Accessibility: WCAG 2.1 AA, keyboard nav, screen readers
- Errors: 404/500 pages, error boundaries, offline cache
- Desktop: responsive enhancement, sidebar, shortcuts
- Cleanup: dead code removed, deps updated
- Zero emojis, stone palette ADN

Refs: 4.1-4.9
```
