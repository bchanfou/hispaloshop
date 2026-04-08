# PROMPT DE TRANSFERENCIA — Sección 1.20
## Universal Search (Buscador Híbrido Global + Contextual)

**Prioridad:** CRÍTICA (Top 5)  
**Estado:** DESCONOCIDO — Requiere verificación  
**Objetivo:** Búsqueda unificada: productos + productores + recetas + posts + influencers

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`
3. `ROADMAP_LAUNCH.md` sección 1.20
4. `frontend/src/components/SearchBar.tsx` o similar existente
5. `backend/routes/search.py` o equivalente

---

## REQUERIMIENTOS

### 1. Búsqueda Híbrida
**Input:** Query de texto + filtros opcionales  
**Output:** Resultados agregados por tipo con tabs/pills

**Tipos indexados:**
- Products (nombre, descripción, tags, categoría)
- Producers (nombre, store name, descripción, especialidad)
- Recipes (título, ingredientes, descripción)
- Posts (contenido, autor, hashtags)
- Influencers (nombre, bio, especialidad)

### 2. Filtros Contextuales
- Por país del usuario (priorizar resultados locales)
- Por categoría
- Por rango de precio (productos)
- Por tipo de contenido (tabs: Todo | Productos | Productores | Recetas | Posts)

### 3. UX ADN
- Search bar flotante o en header
- Autocomplete con sugerencias (debounce 300ms)
- Resultados en grid tipo Pinterest (cards verticales)
- Zero emojis — usar Lucide icons
- Skeleton loaders mientras carga
- Empty state ilustrado (ilustración Lottie o SVG simple)

### 4. Backend Search
- MongoDB text index en products, users (producers), recipes, posts
- Endpoint: GET /search?q={query}&type={type}&filters={json}
- Ranking: relevancia + proximidad geográfica + popularidad
- Pagination: cursor-based (no offset)

---

## ARCHIVOS A MODIFICAR/CREAR

### Backend
- `backend/routes/search.py` — Nuevo endpoint híbrido
- `backend/core/database.py` — Asegurar text indexes existen
- `backend/services/search_service.py` — Lógica de búsqueda y ranking

### Frontend
- `frontend/src/components/search/UniversalSearch.tsx` — Componente principal
- `frontend/src/components/search/SearchResults.tsx` — Grid de resultados
- `frontend/src/components/search/SearchFilters.tsx` — Filtros laterales/bottom sheet
- `frontend/src/components/search/SearchSuggestion.tsx` — Autocomplete
- `frontend/src/hooks/useSearch.ts` — Hook de búsqueda con debounce

---

## CHECKLIST DONE

- [ ] MongoDB text indexes en collections relevantes
- [ ] Endpoint /search funcional con filtros
- [ ] Autocomplete con sugerencias
- [ ] Grid de resultados responsive
- [ ] Tabs por tipo de contenido
- [ ] Filtros por país/categoría/precio
- [ ] Pagination cursor-based
- [ ] Loading skeletons
- [ ] Empty state ilustrado
- [ ] Zero emojis, stone palette

---

## COMMIT MESSAGE
```
feat(search): universal search híbrido global + contextual

- Búsqueda unificada: productos, productores, recetas, posts, influencers
- MongoDB text indexes + ranking por relevancia/proximidad
- Autocomplete con debounce 300ms
- Grid resultados tipo Pinterest
- Filtros por tipo/país/categoría/precio
- Pagination cursor-based
- Zero emojis, stone palette ADN

Refs: 1.20
```
