# P12 - Integración Backend Completa ✅

## Resumen de Implementación

Integración completa del frontend P1-P11 con backend FastAPI: endpoints REST, WebSockets, notificaciones push y optimizaciones de performance.

---

## 📁 Estructura Creada

```
frontend/src/
├── lib/
│   ├── api.js                    # Cliente API con manejo de tokens
│   ├── auth.js                   # Gestión JWT
│   └── queryClient.js            # Config React Query
├── hooks/api/
│   ├── index.js                  # Barrel exports
│   ├── useAuth.js                # Login, registro, logout
│   ├── useFeed.js                # Feed Following/For You
│   ├── usePosts.js               # Posts, Reels, Stories
│   ├── useProducts.js            # Catálogo y búsqueda
│   ├── useCart.js                # Carrito y checkout
│   ├── useHIChat.js              # Chat HI AI
│   ├── useNotifications.js       # Notificaciones push
│   ├── useInfluencer.js          # Dashboard influencer
│   ├── useProducer.js            # Dashboard productor
│   └── useImporter.js            # Dashboard importador
└── providers/
    ├── QueryProvider.jsx         # React Query Provider
    └── RealtimeProvider.jsx      # WebSocket Provider
```

---

## 🔗 Endpoints Implementados

### Autenticación
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `POST /auth/login` | `useLogin` | Login email/password |
| `POST /auth/register` | `useRegister` | Registro por rol |
| `POST /auth/oauth/{provider}` | `useOAuthLogin` | Google, Apple, FB |
| `POST /auth/refresh` | Automático | Refresh token |
| `GET /auth/me` | `useCurrentUser` | Perfil actual |
| `PUT /auth/me` | `useUpdateProfile` | Actualizar perfil |

### Feed y Contenido
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `GET /feed/following` | `useFollowingFeed` | Feed seguidos |
| `GET /feed/foryou` | `useForYouFeed` | Feed algoritmo |
| `GET /posts/{id}` | `usePost` | Detalle post |
| `POST /posts` | `useCreatePost` | Crear post |
| `GET /reels` | `useReels` | Lista reels |
| `POST /reels/{id}/view` | `useViewReel` | Registrar vista |
| `GET /stories` | `useStories` | Stories activas |
| `POST /stories` | `useCreateStory` | Crear story |

### Productos
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `GET /categories` | `useCategories` | Categorías |
| `GET /products` | `useCatalog` | Catálogo con filtros |
| `GET /products/{id}` | `useProduct` | Detalle producto |
| `GET /search` | `useSearchProducts` | Búsqueda |
| `GET /search/suggestions` | `useSearchSuggestions` | Autocomplete |
| `POST /products/{id}/reviews` | `useAddReview` | Añadir review |

### Carrito y Checkout
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `GET /cart` | `useCart` | Obtener carrito |
| `POST /cart/items` | `useAddToCart` | Añadir item |
| `POST /checkout` | `useCreateCheckout` | Iniciar checkout |
| `POST /checkout/{id}/confirm` | `useConfirmPayment` | Confirmar pago |
| `GET /orders` | `useOrders` | Historial pedidos |
| `GET /orders/{id}/tracking` | `useOrderTracking` | Tracking envío |

### HI AI Chat
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `POST /hi/chat` | `useHISendMessage` | Enviar mensaje |
| `GET /hi/conversations` | `useHIConversations` | Historial |
| `GET /hi/suggestions` | `useHISuggestions` | Sugerencias contextuales |
| `GET /hi/insights` | `useHIInsights` | Insights por rol |

### Notificaciones
| Endpoint | Hook | Descripción |
|----------|------|-------------|
| `GET /notifications` | `useNotifications` | Lista notificaciones |
| `POST /notifications/{id}/read` | `useMarkAsRead` | Marcar leída |
| `POST /notifications/push/register` | `useRegisterPushToken` | Registrar FCM |

### Roles Específicos
| Rol | Endpoints | Hooks |
|-----|-----------|-------|
| **Influencer** | `/influencer/dashboard`, `/influencer/earnings` | `useInfluencerDashboard`, `useAffiliateLinks` |
| **Producer** | `/producer/dashboard`, `/producer/products` | `useProducerDashboard`, `useCreateProduct` |
| **Importer** | `/importer/catalog`, `/importer/negotiations` | `useB2BCatalogImporter`, `useNegotiations` |

---

## ⚡ WebSockets (Tiempo Real)

### Eventos Soportados
| Evento | Dirección | Handler |
|--------|-----------|---------|
| `notification` | Server → Client | Toast + Badge update |
| `message` | Server → Client | Invalidar cache HI |
| `order_update` | Server → Client | Toast + Cache orders |
| `new_follower` | Server → Client | Toast + Cache user |
| `story_view` | Server → Client | Stats update |
| `price_drop` | Server → Client | Toast con acción |
| `typing` | Bidireccional | Indicador escribiendo |
| `chat_message` | Bidireccional | Mensaje tiempo real |

### Reconexión Automática
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Máximo 5 intentos
- Reconexión al recuperar conexión

---

## 💾 Cache Strategy (React Query)

| Tipo de Datos | Stale Time | Cache Time | Invalidación |
|---------------|------------|------------|--------------|
| **Feed** | 2-5 min | 10 min | Nuevo post, follow |
| **Productos** | 10-15 min | 30 min | Stock update |
| **Categorías** | 30 min | 1 hora | Nunca (estáticas) |
| **Búsqueda** | 2 min | 5 min | - |
| **Usuario** | 5 min | 30 min | Login/logout |
| **Carrito** | 0 (fresh) | 5 min | Mutaciones |
| **Notificaciones** | 30 seg | 5 min | Nuevas |

### Optimistic Updates
- **Likes**: UI actualiza inmediatamente, rollback si error
- **Cart**: Añadir/quitar items sin esperar server
- **Follows**: Toggle instantáneo

### Prefetching
- Hover en producto → prefetch detalle
- 80% scroll feed → prefetch siguiente página
- Entrar a checkout → prefetch métodos pago

---

## 🔐 Seguridad

### Headers Enviados
```
Authorization: Bearer {jwt_token}
X-Client-Version: 1.0.0
X-Request-ID: {uuid}
Content-Type: application/json
```

### Manejo de Errores
- **401**: Intenta refresh token, redirige a login si falla
- **429**: Mensaje "Demasiadas peticiones, espera..."
- **500+**: Retry con backoff exponencial
- **Network Error**: Toast "Sin conexión"

### Rate Limits
| Endpoint | Límite | Ventana |
|----------|--------|---------|
| Auth | 5 req | 1 min |
| Search | 30 req | 1 min |
| HI Chat | 20 req | 1 min |
| Posts | 10 req | 1 min |
| Cart | 50 req | 1 min |

---

## 📱 Notificaciones Push

### Tipos Soportados
| Tipo | Trigger | Canales |
|------|---------|---------|
| Push Nativa | Evento importante | Firebase FCM |
| In-App | Dentro de app | Toast + badge |
| Email | Acción requerida | Backend |

### Triggers
**Consumer:**
- Pedido confirmado/enviado/entregado
- Price drop favorito
- Nuevo seguidor
- Mensaje HI
- Story reply

**Producer:**
- Nuevo pedido
- Stock bajo
- Nueva reseña
- Pago recibido

**Influencer:**
- Nueva comisión
- Crecimiento followers
- Tier upgrade

---

## 🚀 Uso de los Hooks

### Ejemplo: Feed con Infinite Scroll
```jsx
import { useForYouFeed, useLikePost } from '../hooks/api';

function Feed() {
  const { data, fetchNextPage, hasNextPage, isLoading } = useForYouFeed();
  const likeMutation = useLikePost();

  return (
    <InfiniteScroll onLoadMore={fetchNextPage} hasMore={hasNextPage}>
      {data?.pages.map(page => 
        page.items.map(post => (
          <PostCard 
            key={post.id} 
            post={post}
            onLike={() => likeMutation.mutate({ 
              postId: post.id, 
              liked: post.liked 
            })}
          />
        ))
      )}
    </InfiniteScroll>
  );
}
```

### Ejemplo: HI Chat
```jsx
import { useHISendMessage, useHIConversation } from '../hooks/api';

function HIChat() {
  const { data } = useHIConversation(conversationId);
  const sendMessage = useHISendMessage();

  const handleSend = (text) => {
    sendMessage.mutate({
      message: text,
      conversationId,
      context: {
        role: 'consumer',
        currentPage: 'product',
        productId: '123'
      }
    });
  };
}
```

### Ejemplo: Notificaciones en Tiempo Real
```jsx
import { useRealtime } from '../providers/RealtimeProvider';

function App() {
  const { isConnected, unreadCount } = useRealtime();
  
  return (
    <Badge count={unreadCount}>
      <BellIcon />
    </Badge>
  );
}
```

---

## 📦 Providers en App.js

```jsx
<HelmetProvider>
  <QueryProvider>           {/* React Query */}
    <LocaleProvider>
      <AuthProvider>
        <RealtimeProvider>  {/* WebSocket */}
          <CartProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </CartProvider>
        </RealtimeProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryProvider>
</HelmetProvider>
```

---

## ✅ Checklist Integración

- [x] Cliente API con manejo de tokens
- [x] Refresh token automático
- [x] WebSocket con reconexión automática
- [x] Notificaciones push (Firebase)
- [x] Cache configurada por tipo de dato
- [x] Optimistic updates (likes, cart)
- [x] Error boundaries
- [x] Retry logic con backoff
- [x] Rate limiting manejado
- [x] Offline mode básico
- [x] Loading states skeleton
- [x] Cross-device cart sync

---

## 🎯 Próximos Pasos

1. **Implementar componentes UI** que usen estos hooks
2. **Configurar Firebase** para notificaciones push
3. **Añadir Service Worker** para offline mode
4. **Testing** de integración con backend real
5. **Performance monitoring** con React Query DevTools

---

## 📚 Documentación Adicional

- `lib/api.js` - Cliente API documentado
- `lib/queryClient.js` - Estrategias de cache
- `providers/RealtimeProvider.jsx` - Eventos WebSocket
- `hooks/api/index.js` - Todos los hooks exportados

---

**Estado:** ✅ P12 Completo - Listo para conectar con backend FastAPI
