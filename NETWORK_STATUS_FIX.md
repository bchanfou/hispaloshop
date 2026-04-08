# Sistema de Estado de Red - Hispaloshop

## Problemas Resueltos

1. ✅ **Detector real de conectividad** - Ya no depende solo de `navigator.onLine`
2. ✅ **Indicador visual en header** - Muestra estado offline con icono y refresh
3. ✅ **Botón "Reintentar"** - En pantallas de error y header
4. ✅ **Caché local básico** - Guarda últimos posts vistos

---

## Archivos Creados/Modificados

### Nuevos Archivos

#### `frontend/src/hooks/useNetworkStatus.ts`
Hook robusto de detección de red:
- Ping real al backend (`/health`) cada 30 segundos
- Detección de cambios en conexión del navegador
- Verificación al volver a primer plano
- Estados: `isOnline`, `isChecking`, `wasOffline`, `connectionType`

```typescript
const { isOnline, isChecking, checkConnectivity } = useNetworkStatus();
```

#### `frontend/src/components/ui/OfflineIndicator.tsx`
Indicador visual de estado de red:
- **Variante `header`**: Icono compacto con botón de refresh
- **Variante `banner`**: Banner completo en top de pantalla
- **Variante `minimal`**: Solo icono
- Muestra toast cuando se restaura la conexión

```typescript
<OfflineIndicator variant="header" />
<OfflineIndicator variant="banner" />
```

#### `frontend/src/lib/offlineCache.ts`
Sistema de caché para contenido offline:
- Guarda feed en localStorage
- Límite de 100 items, 24h de validez
- API simple: `set()`, `get()`, `cacheFeed()`, `getCachedFeed()`

```typescript
import { offlineCache } from '../lib/offlineCache';

// Guardar feed
offlineCache.cacheFeed('forYou', posts);

// Recuperar
const cached = offlineCache.getCachedFeed('forYou');
```

#### `frontend/src/components/ui/NetworkErrorState.tsx`
Componente de error mejorado:
- Detecta tipo de error (sin conexión, timeout, etc.)
- Botón de retry con contador de intentos
- Muestra contenido cacheado si existe
- Iconos y colores según el tipo de error

---

### Archivos Modificados

#### `frontend/src/components/feed/ForYouFeed.js`
- Integración con `useNetworkStatus`
- Guarda posts en cache al cargar exitosamente
- Muestra posts cacheados cuando está offline
- Banner de "Sin conexión" sticky
- Mejor manejo de errores con `NetworkErrorState`

#### `frontend/src/components/Header.js`
- Agregado `OfflineIndicator` en el header
- Import del componente

#### `frontend/src/components/feed/FeedContainer.js`
- Agregado banner de offline

---

## Flujo de Funcionamiento

### 1. Detección de Red
```
Usuario abre app
    ↓
useNetworkStatus verifica /health
    ↓
Si falla: isOnline = false, muestra indicador
Si éxito: isOnline = true, normal
    ↓
Re-verifica cada 30 segundos
```

### 2. Caché de Feed
```
Feed carga exitosamente
    ↓
Guarda en localStorage (máx 20 posts)
    ↓
Usuario va offline
    ↓
Muestra posts cacheados con indicador visual
```

### 3. Retry de Conexión
```
Usuario presiona "Reintentar"
    ↓
Ping a /health
    ↓
Si éxito: Refetch datos + toast "Conexión restaurada"
Si falla: Incrementa contador de intentos
```

---

## UI/UX Implementado

### Header (Cuando está offline)
```
[🔴 Sin conexión] [🔄] [Search] [Cart] [Menu]
```

### Banner (Opcional)
```
┌─────────────────────────────────────────┐
│  📡 Sin conexión a internet             │
│  [Reintentar]                           │
└─────────────────────────────────────────┘
```

### Feed Offline
```
┌─────────────────────────────────────────┐
│  ⚠️ Sin conexión. Mostrando guardado.   │
├─────────────────────────────────────────┤
│  [Post 1 - Opacidad reducida]          │
│  [Post 2 - Opacidad reducida]          │
│  ...                                   │
└─────────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────────┐
│           [⚠️ Icono]                    │
│         Sin conexión                    │
│  No se pudo conectar con el servidor   │
│                                         │
│       [🔄 Reintentar]                   │
│                                         │
│   💾 Hay contenido guardado             │
│   [Posts cacheados...]                  │
└─────────────────────────────────────────┘
```

---

## Testing

### Verificar Funcionamiento

1. **Simular offline:**
```javascript
// En DevTools Console
window.dispatchEvent(new Event('offline'));
```

2. **Verificar caché:**
```javascript
// Ver contenido guardado
JSON.parse(localStorage.getItem('hispaloshop_v1_...'))
```

3. **Verificar estado:**
```javascript
// El hook loguea en desarrollo
[useNetworkStatus] Online status: false
[ForYouFeed] State: {isOnline: false, ...}
```

### Escenarios de Prueba

| Escenario | Resultado Esperado |
|-----------|-------------------|
| App abierta con WiFi | Feed carga normal |
| Cortar WiFi durante uso | Muestra indicador + carga cache |
| Restaurar WiFi | Toast "Conexión restaurada" + refresh |
| Abrir app sin conexión | Muestra cache con indicador offline |
| Botón Reintentar | Ping a backend + refresh si éxito |

---

## Deployment

### Build
```bash
cd frontend
npm run build
```

### Verificar en Producción
1. Abrir DevTools → Network → Offline
2. Verificar que aparece indicador
3. Verificar que carga contenido cacheado
4. Restaurar conexión y verificar refresh

---

## Mejoras Futuras

1. **IndexedDB**: Reemplazar localStorage por IndexedDB para más capacidad
2. **Service Worker**: Cacheo con SW para experiencia true offline
3. **Sync Background**: Guardar acciones pendientes y sincronizar
4. **Optimistic UI**: Actualizaciones locales inmediatas

---

## Notas

- El caché tiene límite de 24 horas
- Se guardan máximo 20 posts por feed
- El ping se hace cada 30 segundos
- Se verifica conexión al volver a primer plano
- Los posts cacheados se muestran con opacidad reducida (60%)
