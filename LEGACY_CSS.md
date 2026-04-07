# HispaloShop — Legacy CSS Mapping

> **FASE 0 — Documento de transición CSS**
> 
> Este documento mapea las clases CSS legacy a sus equivalentes Tailwind.
> **Regla de oro:** Código nuevo usa Tailwind directo. Código legacy se migra gradualmente cuando se toca.

---

## Estado de la migración

| Capa | Archivo | Estado | Uso actual |
|------|---------|--------|------------|
| Compat | `src/styles/compat.css` | ✅ Mantenido | Auth pages, skeletons, health score |
| Components | `src/styles/components.css` | ⚠️ Legacy | Loyalty page, componentes antiguos |
| Tokens | `src/styles/tokens.css` | ✅ Activo | Variables CSS usadas por todas las capas |

---

## Mapeo de clases legacy → Tailwind

### Botones

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.btn` | `inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-97` | Base button |
| `.btn-primary` | `bg-stone-950 text-white hover:bg-stone-800 active:bg-stone-900` | Primary CTA |
| `.btn-ghost` | `bg-transparent border border-stone-200 hover:bg-stone-50` | Secondary |
| `.btn-sm` | `px-4 py-2.5 text-sm` | Small size |
| `.btn-lg` | `px-8 py-4 text-lg` | Large size |
| `.hs-btn-primary` | `btn-primary` (alias) | Auth pages compat |
| `.hs-btn-secondary` | `btn-ghost` (alias) | Auth pages compat |

### Inputs

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.input` | `w-full px-4 py-3.5 border border-stone-200 rounded-lg focus:border-stone-950 focus:ring-1 focus:ring-stone-950` | Text input |
| `.hs-input` | Similar a `.input` | Auth pages compat |

### Layout helpers

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.scrollbar-hide` | `scrollbar-hide` (plugin) | Hide scrollbars |
| `.hide-scrollbar` | `scrollbar-hide` (plugin) | Legacy alias |
| `.pb-safe` | `pb-[calc(4rem+env(safe-area-inset-bottom))]` | Bottom safe area |
| `.pt-safe` | `pt-[calc(4rem+env(safe-area-inset-top))]` | Top safe area |

### Skeleton loading

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.skeleton` | `animate-pulse bg-stone-100` | Basic skeleton |
| `.hs-skeleton` | `animate-pulse bg-stone-100` | Legacy alias |

### Health Score (Producer Dashboard)

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.health-score-hero` | `bg-gradient-to-br from-stone-950 to-stone-900 rounded-2xl p-6 text-white relative overflow-hidden` | Card container |
| `.health-score-value` | `text-6xl font-bold leading-none` | Score number |
| `.health-score-label` | `text-sm font-medium opacity-90 uppercase tracking-wider` | Label |

### Navigation

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.mobile-bottom-nav` | `fixed bottom-0 left-0 right-0 h-16 pb-safe bg-white/95 backdrop-blur border-t border-stone-200 flex justify-around items-center z-50` | Mobile tab bar |
| `.mobile-header` | `fixed top-0 left-0 right-0 h-14 pt-safe bg-white/95 backdrop-blur border-b border-stone-200 flex items-center justify-between px-4 z-50` | Mobile header |
| `.desktop-sidebar` | `fixed top-0 left-0 h-screen w-64 bg-white border-r border-stone-200 hidden md:flex flex-col z-40` | Desktop sidebar |

### UI Components

| Clase Legacy | Equivalente Tailwind | Notas |
|--------------|---------------------|-------|
| `.quick-action-item` | `flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 min-h-12 transition active:scale-[0.98]` | Action cards |
| `.loading-spinner` | `inline-block w-4 h-4 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin` | Loading indicator |
| `.bottom-sheet` | `fixed bottom-0 left-0 right-0 max-h-[92vh] bg-white rounded-t-[28px] z-50` | Mobile modal |
| `.bottom-sheet-overlay` | `fixed inset-0 bg-black/55 backdrop-blur-sm z-40` | Modal backdrop |

---

## Variables CSS (tokens.css) → Tailwind

Las variables CSS en `tokens.css` están alineadas con Tailwind:

| Variable CSS | Token Tailwind | Valor |
|--------------|----------------|-------|
| `--color-stone-50` | `bg-stone-50` | `#fafaf9` |
| `--color-stone-100` | `bg-stone-100` | `#f5f5f4` |
| `--color-stone-200` | `bg-stone-200` | `#e7e5e4` |
| `--color-stone-300` | `bg-stone-300` | `#d6d3d1` |
| `--color-stone-400` | `bg-stone-400` | `#a8a29e` |
| `--color-stone-500` | `bg-stone-500` | `#78716c` |
| `--color-stone-600` | `bg-stone-600` | `#57534e` |
| `--color-stone-700` | `bg-stone-700` | `#44403c` |
| `--color-stone-800` | `bg-stone-800` | `#292524` |
| `--color-stone-900` | `bg-stone-900` | `#1c1917` |
| `--color-stone-950` | `bg-stone-950` | `#0c0a09` |

---

## Reglas para código nuevo

### ✅ DO
```tsx
// Usar Tailwind directo
<button className="bg-stone-950 text-white px-6 py-2.5 rounded-full hover:bg-stone-800 transition-colors">
  Enviar
</button>

// Componetizar patrones repetidos
import { Button } from '@/components/ui/Button';
<Button variant="primary">Enviar</Button>
```

### ❌ DON'T
```tsx
// No usar clases legacy en código nuevo
<button className="btn btn-primary">Enviar</button>

// No hardcodear colores fuera del palette stone
<button className="bg-green-500">Enviar</button>
```

---

## Plan de migración gradual

| Sprint | Objetivo | Archivos objetivo |
|--------|----------|-------------------|
| FASE 0 | Documentar y estabilizar | Este documento ✅ |
| FASE 1 | Migrar auth pages | `LoginPage.tsx`, `RegisterPage.tsx` |
| FASE 2 | Migrar consumer pages | `LoyaltyPage.tsx`, `CartPage.tsx` |
| FASE 3 | Migrar dashboards | `ProducerOverview.tsx`, `Admin*.tsx` |
| FASE 4 | Eliminar `components.css` | Cuando todo esté en Tailwind |

---

## Notas técnicas

1. **¿Por qué mantener `compat.css`?**
   - Auth pages lo usan extensivamente
   - Skeleton animation custom no existe en Tailwind
   - Bottom sheet y mobile header tienen comportamientos específicos

2. **¿Por qué no migrar todo ahora?**
   - Riesgo de regresiones visuales
   - Tiempo mejor invertido en features
   - Migración gradual = testing incremental

3. **¿Cuándo sí migrar?**
   - Cuando se toca un archivo para fix o feature
   - Cuando se crea un componente nuevo
   - Durante refactoring programado

---

**Actualizado:** FASE 0 - $(date +%Y-%m-%d)
