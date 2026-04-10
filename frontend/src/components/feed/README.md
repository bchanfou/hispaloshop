# Feed Principal Hispaloshop - P2

Feed social completo con toggle Siguiendo/Para ti, Stories 24h y grid mixto de Posts/Reels.

## 🎨 Estructura del Feed

```
┌─────────────────────────────────────────┐
│ Header (Logo, Buscar, Carrito, Menú)   │  ← Sticky top
├─────────────────────────────────────────┤
│ [ SIGUIENDO ] [   PARA TI   ]          │  ← Toggle tabs + swipe
├─────────────────────────────────────────┤
│ [Para ti][Aceites][Quesos]...          │  ← Categorías scroll
├─────────────────────────────────────────┤
│ [+ Tu historia] [Ana] [Carlos]...      │  ← Stories carousel
├─────────────────────────────────────────┤
│                                         │
│         F E E D   C O N T E N T         │
│                                         │
│  • Posts (imagen + info)               │
│  • Reels (grid 2x2)                    │
│  • Sugerencias perfiles                │
│                                         │
├─────────────────────────────────────────┤
│           🤖 HI AI                      │  ← Botón flotante
├─────────────────────────────────────────┤
│ [🏠][🔍][➕][💬][👤]                   │  ← Bottom nav
└─────────────────────────────────────────┘
```

## 📁 Componentes

### FeedContainer
Componente principal que integra todos los elementos del feed.

```javascript
<FeedContainer />
```

### TabToggle
Toggle entre "Siguiendo" y "Para ti" con indicador animado.
- Persiste preferencia en localStorage
- Soporta swipe horizontal para cambiar

### CategoryPills
Categorías express scroll horizontal con 12 categorías:
- Para ti, Aceites, Conservas, Quesos, Embutidos
- Panadería, Bebidas, Bebés, Mascotas
- Snacks, Orgánico, Sin gluten

### StoriesCarousel
Carrusel de stories con anillos de estado:
- **Verde**: Historia activa no vista
- **Amarillo/Naranja**: Live ahora
- **Gris**: Ya vista
- **Tu historia**: Botón para crear

### FollowingFeed
Feed cronológico de cuentas seguidas.
- Scroll infinito
- Mezcla de posts y reels
- Skeleton loaders

### ForYouFeed
Feed de descubrimiento algorítmico:
- 70% Reels (grid 2x2)
- 20% Posts trending
- 10% Sugerencias de perfiles

### PostCard
Tarjeta de post tipo Instagram:
- Header con avatar y nombre
- Carrusel de imágenes (swipe)
- Like, comentar, compartir, guardar
- Doble tap para like con animación
- Producto etiquetado
- Timestamp relativo

### ReelCard
Preview de reel en grid o reproductor full-screen:
- Auto-play cuando es visible
- Mute por defecto
- Controles tap-to-show
- Sidebar con acciones
- Producto etiquetado

### HIFloatingButton
Botón flotante HI AI:
- Pulse sutil cada 5s
- Badge si hay mensajes nuevos
- Navega a /chat

## 🎨 Paleta de Colores

```css
--primary: #2D5A3D;        /* Verde aceite */
--secondary: #F5F1E8;      /* Crema/beige */
--accent: #E6A532;         /* Amarillo mostaza */
--text-primary: #1A1A1A;   /* Negro suave */
--text-muted: #6B7280;     /* Gris */
--bg: #FAFAFA;             /* Fondo */
```

## 🚀 Interacciones

### Gestos
- **Swipe horizontal**: Cambiar entre tabs
- **Pull down**: Refresh (placeholder)
- **Doble tap en imagen**: Like con animación corazón
- **Swipe en carrusel**: Navegar imágenes

### Estados
- **Like**: Corazón rojo + contador animado
- **Save**: Bookmark relleno
- **Loading**: Skeleton pulsing
- **Empty**: Ilustración + CTA

## 📱 Responsive

- **Mobile**: Full width, todo vertical
- **Desktop**: Max-w-md centrado, sidebar opcional

## 🔧 Mock Data

Los datos están en cada componente para desarrollo:
- `MOCK_STORIES`: 6 stories de ejemplo
- `MOCK_POSTS`: Posts con imágenes Unsplash
- `MOCK_REELS`: Videos con thumbnails

## 📝 TODO

- [ ] Conectar con API real
- [x] Implementar visor de stories (P3)
- [ ] Reproductor reels full-screen vertical
- [ ] Infinite scroll real con cursor
- [ ] Pull-to-refresh nativo
- [ ] Lazy loading de imágenes
- [ ] Optimización LCP
