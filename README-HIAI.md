# HI AI - Configuración Sprint 4

## Variables de entorno

Añade en Railway o `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... # opcional
```

## PgVector

```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
alembic upgrade head
```

## Generación de embeddings

```bash
cd backend
python jobs/generate_embeddings.py --all
```

## Endpoints incluidos

- `GET /api/v1/recommendations/personalized`
- `GET /api/v1/recommendations/similar/{product_id}`
- `GET /api/v1/recommendations/trending`
- `POST /api/v1/chat/sessions`
- `POST /api/v1/chat/sessions/{session_id}/messages`
- `GET /api/v1/chat/sessions/{session_id}/messages`
- `POST /api/v1/chat/sessions/{session_id}/close`
- `GET /api/v1/matching/producer/suggestions`
- `POST /api/v1/matching/contact`
- `GET /api/v1/matching/influencer/opportunities`

## Fallbacks implementados

- Sin API key de OpenAI, embeddings y respuestas de chat se generan en modo fallback.
- Recomendaciones personalizadas caen a productos destacados y recientes.
