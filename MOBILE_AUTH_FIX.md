# Fix Sistema de Autenticación Móvil - Hispaloshop

## Resumen de Cambios

### Problemas Identificados
1. **Sesión expira inmediatamente** - Problema de refresh token en móvil
2. **Login con email/contraseña falla** - Error de servidor
3. **OAuth no responde** - Botones Google y Apple no funcionaban en apps híbridas
4. **No hay soporte para InAppBrowser** - Redirecciones recargan la app

---

## Archivos Modificados

### 1. Frontend

#### `frontend/src/lib/mobileAuth.js` (NUEVO)
Utilidad para manejar OAuth en apps móviles híbridas:
- Detecta Capacitor/Cordova
- Abre OAuth en InAppBrowser en lugar de redirección
- Maneja deep links para retorno de autenticación
- Soporta Apple Sign-In nativo en iOS

#### `frontend/src/pages/LoginPage.tsx`
- Integra `mobileAuth.js`
- Agrega soporte real para Apple Sign-In
- Muestra estado de carga en botones OAuth
- Maneja deep links para callbacks

### 2. Backend

#### `backend/core/config.py`
Agregadas variables para Apple Sign-In:
```
APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
```

#### `backend/routes/auth_apple.py` (NUEVO)
Endpoints para Apple Sign-In:
- `GET /api/auth/apple/url` - URL de autorización
- `POST /api/auth/apple/callback` - Callback web
- `POST /api/auth/apple/verify` - Verificación nativa iOS

#### `backend/main.py`
- Import del router de Apple auth
- Registro del router en la app

#### `backend/.env.example`
- Documentación de variables Apple Sign-In

---

## Configuración Requerida

### 1. Variables de Entorno (Railway)

```bash
# Apple Sign In (opcional, pero recomendado para iOS)
APPLE_CLIENT_ID=com.hispaloshop.app
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=DEF123GHIJ
APPLE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIB...contenido de la clave..."
```

**Nota**: Para Apple Sign-In necesitas:
1. Apple Developer Program ($99/año)
2. Configurar "Sign in with Apple" en el identifier
3. Generar una private key en Keys

### 2. Deep Links (App Móvil)

#### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.hispaloshop.auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>hispaloshop</string>
    </array>
  </dict>
</array>
```

#### Android (AndroidManifest.xml)
```xml
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="hispaloshop" android:host="auth" />
  </intent-filter>
</activity>
```

---

## Deployment

### 1. Redeploy Backend
```bash
# En Railway Dashboard
# 1. Ir al proyecto backend
# 2. Click en "Deploy" (redeploy)

# O con Railway CLI
railway up
```

### 2. Rebuild Frontend
```bash
cd frontend
npm run build
# Deploy a Vercel/Railway según corresponda
```

---

## Testing

### Diagnóstico
```bash
python diagnose_auth_system.py
```

### Flujos a probar

1. **Login Email/Password**
   - Abrir app móvil
   - Ingresar credenciales
   - Verificar redirección correcta

2. **Google OAuth**
   - Click en "Continuar con Google"
   - Verificar que abre popup/InAppBrowser
   - Completar auth
   - Verificar retorno a app

3. **Apple Sign-In**
   - Click en "Continuar con Apple"
   - (Si está configurado) Completar auth
   - Verificar retorno a app

4. **Deep Links**
   - Abrir URL: `hispaloshop://auth/callback?token=test`
   - Verificar que la app maneja el link

---

## Troubleshooting

### "Sesión expirada" inmediatamente
**Causa**: Token no se guarda correctamente o refresh falla
**Solución**: Verificar que `setToken` se llama después del login

### OAuth no abre
**Causa**: `window.location.href` en app híbrida recarga la app
**Solución**: Implementado en `mobileAuth.js` - usar InAppBrowser

### Apple Sign-In no funciona
**Causa**: No configurado en backend
**Solución**: Configurar variables APPLE_* en Railway

### Error CORS
**Causa**: Backend no acepta origen `capacitor://localhost`
**Solución**: Ya incluido en `main.py` - hacer redeploy

---

## Próximos Pasos

1. [ ] Redeploy backend en Railway
2. [ ] Configurar Apple Developer (si se desea Apple Sign-In)
3. [ ] Configurar deep links en app móvil
4. [ ] Test en dispositivo físico iOS/Android
5. [ ] Publicar actualización a stores
