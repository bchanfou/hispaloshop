# Reproductor Reels Hispaloshop - P3

Reproductor de reels vertical 9:16 inmersivo tipo TikTok/Instagram Reels.

## 🎨 Estructura

```
ReelsContainer (contenedor principal con scroll snap)
├── ReelPlayer (cada reel individual)
│   ├── ReelVideo (componente video optimizado)
│   ├── ReelOverlay (info top/bottom)
│   ├── ReelSidebar (botones interacción derecha)
│   ├── ReelComments (modal comentarios)
│   ├── ProductDrawer (drawer producto)
│   └── LikeAnimation (animación corazón)
```

## 📱 Navegación

- **Swipe up**: Siguiente reel
- **Swipe down**: Reel anterior
- **Tap**: Play/Pause
- **Doble tap**: Like con animación
- **Mantener**: Pausa temporal

## 🎯 Features

### Video Optimization
- Auto-play cuando es visible >50%
- Preload: solo carga metadata inicial
- Mute por defecto (persiste en localStorage)
- Fade in volumen al desmutear
- Intersection Observer para play/pause

### Interacciones
- **Like**: Doble tap o botón sidebar
- **Guardar**: Bookmark
- **Compartir**: Web Share API
- **Comentar**: Modal slide up
- **Producto**: Drawer expandible

### Performance
- Virtualización: solo renderiza reels visibles
- Cleanup: pausa y libera videos al desmontar
- RAF para animaciones
- Lazy loading de thumbnails

## 🚀 Uso

```jsx
// Desde el feed
import { ReelCard } from './components/feed';

<ReelCard 
  reel={reelData}
  isInFeed={true}
  onOpenFullscreen={(reel) => navigate(`/reels?id=${reel.id}`)}
/>

// Reproductor full-screen
import { ReelsContainer } from './components/reels';

// Ruta: /reels?id=r1
<ReelsContainer />
```

## 🎨 Mock Data

```javascript
const reel = {
  id: 'r1',
  videoUrl: '...',
  thumbnail: '...',
  user: {
    id: 'u1',
    username: 'queserialaantigua',
    avatar: '...',
    verified: true,
    isFollowing: false,
  },
  description: '...',
  hashtags: ['quesomanchego', 'artesano'],
  audio: { name: 'Sonido original', author: '...', original: true },
  productTag: {
    id: 'p1',
    name: 'Queso Manchego',
    price: 18.50,
    image: '...',
  },
  stats: { likes: 1245, comments: 67, shares: 134 },
};
```

## 📱 Responsive

- Mobile: Full screen, todos los gestos
- Desktop: Max-width 480px centrado, controles click

## 🔧 Props

### ReelPlayer
| Prop | Tipo | Descripción |
|------|------|-------------|
| reel | object | Datos del reel |
| isActive | boolean | Si es el reel actual visible |
| onNext | function | Callback ir al siguiente |
| onPrev | function | Callback ir al anterior |

## 📝 TODO

- [ ] API integration real
- [ ] Infinite scroll con cursor
- [ ] Lazy loading progresivo videos
- [ ] Ajuste calidad según conexión
- [ ] Gestos personalizables
- [ ] Analytics tracking
