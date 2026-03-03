# Sprint 6 - Reels y Contenido Avanzado

## Resumen
Esta entrega añade la base backend/frontend API para Reels, hashtags, stories interactivas y colecciones guardadas.

## Especificaciones de video (MVP)
- Duración máxima: 90 segundos.
- Tamaño máximo: 100MB.
- Formatos aceptados: mp4, mov, avi, webm.
- Transformaciones Cloudinary: 480p, 720p y thumbnail vertical.

## Endpoints nuevos
- `POST /api/v1/reels`
- `GET /api/v1/reels`
- `POST /api/v1/reels/{reel_id}/view`
- `GET /api/v1/reels/{reel_id}`
- `GET /api/v1/hashtags/trending`
- `GET /api/v1/hashtags/search`
- `GET /api/v1/hashtags/{hashtag_name}`
- `POST /api/v1/hashtags/{hashtag_name}/follow`
- `POST /api/v1/stories`
- `GET /api/v1/stories/feed`
- `GET /api/v1/stories/{user_id}`
- `POST /api/v1/stories/{story_id}/view`
- `POST /api/v1/stories/{story_id}/reply`
- `POST /api/v1/collections`
- `GET /api/v1/collections`
- `POST /api/v1/collections/{id}/posts/{post_id}`
- `GET /api/v1/collections/{id}/posts`

## Jobs de mantenimiento
Archivo: `backend/jobs/reels_maintenance.py`
- Limpieza de `reel_views` > 30 días.
- Recalcular `viral_score`.
- Expirar stories > 24h.
- Recalcular trends de hashtags.
