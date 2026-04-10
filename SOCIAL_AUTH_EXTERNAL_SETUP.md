# Social Auth External Setup

Fecha: 2026-04-11

Este documento resume que configuraciones externas (fuera del codigo) necesitas para activar login con Apple, Naver y KakaoTalk.

## Estado actual en el codigo

- Google: implementado y con estado de disponibilidad (`/api/auth/google/status`).
- Apple: implementado en backend/frontend y con estado de disponibilidad (`/api/auth/apple/status`).
- Naver: no implementado aun en backend/frontend.
- KakaoTalk (Kakao Login): no implementado aun en backend/frontend.

## Apple Sign-In: que debes hacer fuera

Debes configurar estos elementos en Apple Developer:

1. Cuenta Apple Developer activa (pago anual).
2. Identificadores:
- App ID (si vas con app nativa iOS).
- Service ID (si vas con web OAuth).
3. Sign in with Apple habilitado en el Identifier.
4. Key de Sign in with Apple creada y descargada (.p8):
- Key ID.
- Team ID.
- Private key (contenido PEM).
5. Dominios y Redirect URLs autorizadas (Service ID web):
- Produccion backend callback: `https://api.hispaloshop.com/api/auth/apple/callback`
- Si usas staging, agrega tambien callback de staging.
6. (Opcional recomendado) Configurar correo relay de Apple si usas emails enmascarados.

Variables backend necesarias:
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

Validacion rapida:
- `GET /api/auth/apple/status` debe devolver `configured: true`.
- En login, boton Apple habilitado.

## Naver Login: que debes hacer fuera

Naver no esta implementado en el codigo actual. Para activarlo necesitas:

1. Crear app en Naver Developers.
2. Configurar OAuth client:
- Client ID
- Client Secret
3. Definir callback URL backend (cuando se implemente), por ejemplo:
- `https://api.hispaloshop.com/api/auth/naver/callback`
4. Configurar scopes/permisos (email, profile).
5. Asegurar cumplimiento de politicas de Naver para uso comercial y manejo de datos.

Variables sugeridas (futuras):
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

## KakaoTalk Login (Kakao Login): que debes hacer fuera

Kakao no esta implementado en el codigo actual. Para activarlo necesitas:

1. Crear app en Kakao Developers.
2. Activar Kakao Login en la app.
3. Configurar plataforma web y Redirect URI backend (cuando se implemente), por ejemplo:
- `https://api.hispaloshop.com/api/auth/kakao/callback`
4. Configurar consent items (email, profile) segun necesidad.
5. Revisar requisitos regionales/politicas de Kakao para produccion.

Variables sugeridas (futuras):
- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET` (si aplica en tu configuracion)

## Recomendaciones de despliegue

1. Configura credenciales en secretos del entorno (no en repositorio).
2. Habilita staging y valida callback end-to-end antes de produccion.
3. Verifica cookies/session con dominio correcto y HTTPS.
4. Agrega pruebas de humo por proveedor cuando implementes Naver/Kakao.
