# Chat HI AI - P4

Asistente inteligente personalizado por rol para Hispaloshop.

## 🎨 Roles Disponibles

| Rol | Nombre | Avatar | Color | Caso de uso |
|-----|--------|--------|-------|-------------|
| Consumer | HI Nutrición | 🍎 | #2D5A3D | Nutricionista personal, planes de comidas |
| Producer | HI Ventas | 📈 | #E6A532 | Análisis de ventas, optimización de precios |
| Importer | HI Import | 🌍 | #2563EB | Búsqueda de productores, análisis de márgenes |
| Influencer | HI Creator | ✨ | #9333EA | Generación de contenido, captions, analytics |

## 📱 Estructura

```
ChatContainer
├── Header (avatar, nombre, cambio de rol)
├── MessageList
│   └── MessageBubble (user | assistant)
├── SuggestionChips
├── ChatInput
│   ├── Voice input
│   ├── Text input
│   └── Quick actions
└── RoleSelector (modal)
```

## 🚀 Uso

```jsx
import { ChatContainer } from './components/chat';

// Ruta: /chat
<ChatContainer />
```

## 💬 Flujo de Conversación

1. Usuario entra al chat
2. HI detecta rol del usuario (o usa último seleccionado)
3. Muestra mensaje de bienvenida personalizado
4. Muestra sugerencias rápidas según rol
5. Usuario envía mensaje o usa sugerencia
6. HI responde con markdown, acciones, etc.

## 🎯 Features

- **Detección automática de rol**: Basado en `user.role`
- **Cambio manual**: Botón "Cambiar modo" en header
- **Persistencia**: Historial por rol en localStorage
- **Sugerencias contextuales**: 4 sugerencias específicas por rol
- **Respuestas markdown**: Formato enriquecido
- **Input de voz**: Simulado (Web Speech API)
- **Acciones rápidas**: Adjuntar, foto, producto, guardar

## 📝 Mock Responses

Cada rol tiene respuestas mock predefinidas:
- Consumer: meal_plan, analyze_cart, find_products, recipe
- Producer: sales_analysis, pricing, content_calendar, stock
- Importer: find_producers, margins, trends, b2b
- Influencer: caption, reel_ideas, analytics, promote_products

## 🔧 API Integration (futuro)

```typescript
POST /api/hi/chat
{
  message: string,
  role: 'consumer' | 'producer' | 'importer' | 'influencer',
  context: {
    userId: string,
    history: Message[],
    cartItems?: Product[],
    orders?: Order[],
  }
}
```

## 🎨 Personalización

El color del tema cambia según el rol activo:
- Header background: `roleColor + '08'`
- Botones: `roleColor`
- Avatars: `roleColor + '20'`
