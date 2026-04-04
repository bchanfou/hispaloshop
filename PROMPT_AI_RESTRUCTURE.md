# Prompt para chat dedicado: Reestructuración de IAs de HispaloShop

> Copia y pega esto como primer mensaje en un nuevo chat de Claude Code.

---

Quiero reestructurar todas las IAs de HispaloShop. Tengo un caos de 6 implementaciones y necesito consolidar en 4 IAs claras. Lee el archivo `MEGA_PLAN.md` en la raíz del proyecto para contexto completo del plan.

## Estado actual (auditado)

Existen 6 implementaciones de IA en el proyecto:

### 1. David AI ACTIVO (widget flotante global)
- **Backend:** `backend/routes/hispal_ai.py` → `POST /api/v1/hispal-ai/chat`
- **Frontend:** `frontend/src/components/ai/HispalAI.js` (montado global en App.js)
- **Model:** claude-haiku-4-5, 5 tools, 3 rounds, 20 RPM
- **Acceso:** Todos (incluso guests en backend, auth required en frontend)
- **Problema:** No tiene memoria persistente, no tiene smart cart, no tiene detección de preferencias

### 2. David AI LEGACY (MUERTO — no montado)
- **Backend:** `backend/routes/ai_chat.py` → `POST /api/chat/message`
- **Frontend:** `frontend/src/components/AIAssistant.js` (NO importado en App.js)
- **Es la MEJOR implementación:** memoria en BD (`db.ai_profiles`), detección automática de dieta/alergias, smart cart (optimizar precio/salud/calidad), persistencia en `db.chat_messages`, 12 idiomas
- **Problema:** No se usa. Tiene la lógica que el David activo necesita.

### 3. Pedro AI ELITE (página completa, agentic)
- **Backend:** `backend/routes/commercial_ai.py` → `POST /api/v1/commercial-ai/chat`
- **Frontend:** `frontend/src/pages/producer/CommercialAIPage.tsx`
- **Model:** claude-sonnet-4-6, 5 tools (search_importers, analyze_market, predict_demand, generate_contract, check_producer_plan), 5 rounds, 10 RPM
- **Acceso:** ELITE only (403 si no)
- **Problemas:** Datos de mercado estáticos hardcoded, PDF de contrato no descargable en frontend, opportunity cards con % hardcoded

### 4. Pedro AI PRO (flotante en dashboard, simple)
- **Backend:** `backend/routes/ai_chat.py` → `POST /api/ai/seller-assistant`
- **Frontend:** `frontend/src/components/SellerAIAssistant.js` (en ProducerLayoutResponsive)
- **Model:** claude-haiku-4-5, SIN tools (context injection), 20 RPM
- **Acceso:** PRO+ (gated en layout)
- **Problema:** Sin multi-turn history, contexto stateless por mensaje

### 5. HI Multi-role (página /ai/chat)
- **Backend:** `backend/routes/ai_chat.py` → `POST /api/ai/chat`
- **Frontend:** `frontend/src/components/chat/ChatContainer.js`
- **Duplica David y Pedro** con prompts más simples. Tiene selector de rol.
- **Problema:** Redundante con David y Pedro dedicados.

### 6. Influencer AI (solo backend, sin frontend)
- **Backend:** `backend/routes/ai_chat.py` → `POST /api/ai/influencer-assistant`
- **Frontend:** NINGUNO (huérfano)
- **Bug:** Línea 1741 fuerza español siempre, contradice detección de idioma

### 7. Content Suggester (menor, funcional)
- **Backend:** `backend/routes/ai.py` → `POST /api/ai/suggest-content`
- **Frontend:** `frontend/src/components/creator/HispalAIPanel.jsx` (en CreateRecipePage)

## Arquitectura target (4 IAs)

### David AI — Consumidores (TODOS)
- Widget flotante global (como ahora)
- FUSIONAR la lógica del legacy: memoria persistente en BD, detección de preferencias (vegan, keto, halal, alergias), smart cart, persistencia de conversaciones
- 5 tools actuales + smart cart tools del legacy
- Detecta idioma del usuario, responde en ese idioma
- Personalidad: nutricionista/chef personal empático (ver `memory/ai_assistants_personality.md`)

### Pedro AI — Ventas internacionales, ELITE only
- Página dedicada `/producer/commercial-ai` (como ahora)
- Sonnet, 5 tools, 5 rounds
- Fix: PDF descargable, datos de mercado documentados como heurística
- Personalidad: closer B2B neutral profesional (ver `memory/ai_assistants_personality.md`)

### Rebeca AI — NUEVA, ventas nacionales, PRO only
- Reemplaza el SellerAIAssistant actual (flotante en dashboard)
- Haiku con tools propios para mercado local:
  - `search_local_trends` — tendencias de su categoría en su país
  - `analyze_my_sales` — análisis de sus ventas/productos
  - `suggest_pricing` — sugerencias de precio basadas en competencia local
  - `get_my_reviews` — resumen de reseñas y áreas de mejora
- Multi-turn con history (no stateless)
- Personalidad: asesora comercial cercana, datos locales, enfocada en el día a día del productor
- Detecta idioma, responde en ese idioma

### Content Suggester — Mantener como está
- Micro-IA para sugerir captions y hashtags en creación de contenido
- No cambios necesarios

## Qué ELIMINAR
- `AIAssistant.js` — DESPUÉS de migrar su lógica a David activo
- `ChatContainer.js` + `useHIChat.js` + ruta `/ai/chat` — HI Multi-role redundante
- `POST /api/ai/chat` endpoint
- `POST /api/ai/influencer-assistant` endpoint (huérfano)
- Las 3 hooks muertas de `useInternalChatQueries.js`
- Fix bug línea 1741 de ai_chat.py (español forzado)

## Qué NO tocar
- El backend de Pedro ELITE (`commercial_ai.py`) funciona bien, solo fix PDF
- El Content Suggester está bien
- La personalidad de David y Pedro ya está definida en `memory/ai_assistants_personality.md`

## Orden sugerido
1. Fusionar David (legacy → activo): migrar memoria, smart cart, preferencias
2. Crear Rebeca AI (backend + frontend)
3. Fix Pedro (PDF descargable)
4. Eliminar código muerto (HI Multi-role, influencer endpoint, AIAssistant.js)
5. Tests y verificación

Empieza auditando los archivos clave para verificar que lo que describo sigue siendo correcto, y luego proponme un plan detallado antes de escribir código.
