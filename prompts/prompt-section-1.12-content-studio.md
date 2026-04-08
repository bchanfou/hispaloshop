# PROMPT DE TRANSFERENCIA — Sección 1.12
## Content Studio: Editor de Posts, Stories y Reels

**Prioridad:** CRÍTICA (Top 5 — editor de reels, stories, posts)  
**Estado:** DESCONOCIDO — Requiere verificación  
**Objetivo:** Studio unificado para crear posts, stories y reels con tools profesionales

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`
3. `ROADMAP_LAUNCH.md` sección 1.12
4. `frontend/src/pages/creator/` o similar existente
5. `backend/routes/posts.py` — CRUD posts
6. `backend/routes/reels.py` o `backend/routes/content.py`

---

## REQUERIMIENTOS

### 1. Editor de Posts (Feed)
**Features:**
- Upload múltiple imágenes (max 10)
- Caption con hashtags (# autosuggest)
- Tag products (búsqueda de productos para taggear)
- Location tag
- Alt text para accesibilidad
- Preview mobile/desktop
- Draft autosave

**ADN:**
- Grid preview 3 columnas (como Instagram)
- Caption input expandible
- Hashtag highlight en azul stone-700 (único color permitido)
- Zero emojis en UI (solo Lucide icons)

### 2. Editor de Stories
**Features:**
- Upload imagen/video (9:16 ratio)
- Text overlays (fuentes sistema, colores stone)
- Stickers: poll, question, countdown, link
- Drawing tool (simple brush)
- Background color picker (stone palette only)
- Duration: 5-15s configurables

**ADN:**
- Canvas 9:16 fullscreen
- Toolbar minimalista flotante
- Preview exacto como se verá

### 3. Editor de Reels
**Features:**
- Upload video (max 90s)
- Trim/cut clips
- Add music (library o upload)
- Text overlays con timing
- Speed control (0.5x, 1x, 2x)
- Cover frame selector
- Caption y hashtags

**ADN:**
- Timeline scrubber horizontal
- Preview 9:16 centrado
- Tools en toolbar inferior
- Export con indicador de progreso

### 4. Features Comunes
- Autosave cada 10 segundos
- Drafts guardados localmente + backend
- Validación: al menos 1 media para publicar
- Schedule post (opcional, fecha futura)
- Cross-post: publicar en feed + story simultáneamente

---

## ARCHIVOS A MODIFICAR/CREAR

### Backend
- `backend/routes/posts.py` — CRUD posts, upload media
- `backend/routes/stories.py` — CRUD stories, expiración 24h
- `backend/routes/reels.py` — CRUD reels, metadata video
- `backend/routes/media.py` — Upload procesamiento media
- `backend/services/media_processor.py` — Compress, resize, generate thumbnails

### Frontend
- `frontend/src/pages/creator/CreatePost.tsx` — Editor posts
- `frontend/src/pages/creator/CreateStory.tsx` — Editor stories
- `frontend/src/pages/creator/CreateReel.tsx` — Editor reels
- `frontend/src/components/creator/MediaUploader.tsx` — Upload drag&drop
- `frontend/src/components/creator/TagProduct.tsx` — Buscar y taggear productos
- `frontend/src/components/creator/TextOverlay.tsx` — Texto en stories/reels
- `frontend/src/components/creator/VideoTrimmer.tsx` — Trim videos reels
- `frontend/src/components/creator/PreviewMobile.tsx` — Preview 9:16

---

## CHECKLIST DONE

Posts:
- [ ] Upload múltiple imágenes
- [ ] Caption con hashtag autosuggest
- [ ] Tag products (máx 5 por post)
- [ ] Preview responsive
- [ ] Draft autosave

Stories:
- [ ] Canvas 9:16 fullscreen
- [ ] Text overlays
- [ ] Stickers básicos (poll, question)
- [ ] Background stone palette
- [ ] Preview exacto

Reels:
- [ ] Upload video max 90s
- [ ] Trim/cut clips
- [ ] Add music
- [ ] Text overlays con timing
- [ ] Speed control
- [ ] Cover frame selector

Común:
- [ ] Zero emojis en UI
- [ ] Stone palette exclusivo
- [ ] Autosave funcionando
- [ ] Validación antes de publicar

---

## COMMIT MESSAGE
```
feat(content-studio): editor unificado posts + stories + reels

- CreatePost: upload multi-imagen, tag products, hashtag autosuggest
- CreateStory: canvas 9:16, text overlays, stickers, stone palette
- CreateReel: trim, music, text timing, speed control, cover selector
- Media processor: compress, thumbnails
- Draft autosave cada 10s
- Zero emojis, stone palette ADN

Refs: 1.12
```
