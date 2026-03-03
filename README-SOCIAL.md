# Sprint 5 - Motor Social

Este documento resume la implementación del núcleo social de Hispaloshop.

## Backend
- Nuevos modelos sociales en `backend/models.py`:
  - `Post`, `PostLike`, `PostComment`, `CommentLike`, `PostSave`, `Follow`, `FeedCache`, `Story`.
  - Extensiones a `User`: `username`, `is_verified`, contadores sociales y links.
- Migración Alembic: `backend/alembic/versions/20260324_0007_social_motor_sprint5.py`.
- Servicio de feed: `backend/services/feed_service.py`.
- Servicio de publicación: `backend/services/post_service.py`.
- Routers:
  - `backend/routers/posts.py`
  - `backend/routers/interactions.py`
  - `backend/routers/follows.py`
- Job periódico:
  - `backend/jobs/calculate_post_scores.py`

## Frontend
- API social agregada en `frontend/src/lib/api.ts`.
- Hooks:
  - `frontend/src/hooks/useFeed.ts`
  - `frontend/src/hooks/usePost.ts`
  - `frontend/src/hooks/useInteractions.ts`
  - `frontend/src/hooks/useFollows.ts`
  - `frontend/src/hooks/useProfile.ts`

## Endpoints principales
- `POST /api/v1/posts`
- `GET /api/v1/posts`
- `POST /api/v1/posts/{post_id}/like`
- `POST /api/v1/posts/{post_id}/comments`
- `POST /api/v1/posts/{post_id}/save`
- `POST /api/v1/follows/{user_id}`
- `GET /api/v1/profiles/{username}`

## Notas
- El ranking usa mezcla de recencia, engagement, social y conversión.
- El feed cacheado se refresca cada 30 minutos.
- Stories está preparado como estructura de datos para Sprint 6.
