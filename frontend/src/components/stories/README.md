# P11 - Sistema Stories 24h

Sistema de historias tipo Instagram para Hispaloshop con creación, visualización, filtros, y auto-eliminación.

## Componentes

### StoriesCarousel
Carrusel horizontal de avatares de historias en el feed principal.

**Props:**
- `onCreateStory`: Callback al crear nueva historia
- `onViewStory`: Callback al ver una historia

**Features:**
- Anillo degradado para historias no vistas (gradiente #E6A532 → #2D5A3D → #16A34A)
- Indicador LIVE para transmisiones en directo
- Avatar "Tu historia" con botón + para crear
- Snap scroll horizontal

### StoryViewer
Visualizador a pantalla completa de historias con controles de navegación.

**Features:**
- Progreso visual con barras múltiples (una por slide)
- Navegación tap izquierda/derecha
- Pausa al mantener presionado
- Pase automático entre slides
- Tags de productos interactivos
- Respuesta rápida con input
- Like y share

### StoryCreator
Editor de historias con filtros, texto y stickers.

**Features:**
- 8 filtros estilo Instagram (Normal, Vivid, Warm, Cool, B&W, Vintage, Clarendon, Gingham)
- Texto arrastrable con múltiples tamaños y colores
- Stickers de productos (🔥❤️🌟🛒🎉🌿🍯🧀)
- Preview en tiempo real del filtro
- Publicación directa a "Tu historia"

## Estructura de Datos

```typescript
interface Story {
  id: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  slides: StorySlide[];
  views: number;
  likes: number;
  createdAt: Date;
  expiresAt: Date; // 24h después de createdAt
}

interface StorySlide {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number; // ms
  productTag?: {
    id: string;
    name: string;
    price: number;
    x: number;
    y: number;
  };
  poll?: {
    question: string;
    yes: number;
    no: number;
  };
}
```

## Rutas

- `/stories` - Visualizador de historias
- `/stories/create` - Creador/editor de historias

## Integración con Feed

El `StoriesCarousel` está integrado en `FeedContainer` justo debajo de las `CategoryPills`:

```jsx
<StoriesCarousel
  onCreateStory={handleCreateStory}
  onViewStory={handleViewStory}
/>
```

## Expiración Automática

Las historias expiran automáticamente después de 24h. En una implementación real:

1. Backend: Job diario para eliminar historias expiradas
2. Frontend: Filtrar historias del usuario donde `expiresAt > now()`
3. Archivo: Historias expiradas pueden moverse a "Archive" del usuario

## Colores y Estilo

- Anillo no visto: degradado de marca (#E6A532 → #2D5A3D → #16A34A)
- Anillo visto: gris (#E5E7EB)
- Anillo LIVE: degradado arcoíris (rojo → morado → azul)
- Fondo viewer: negro (#000000)
- Progreso: blanco (#FFFFFF)

## Próximas Mejoras

1. Backend API para CRUD de historias
2. Videos de 15s con trim
3. Música de fondo desde librería
4. Encuestas y quizzes interactivos
5. Highlights (destacados permanentes)
6. Contador de vistas en tiempo real
7. Analytics por historia
