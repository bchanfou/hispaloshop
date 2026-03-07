# Editor de Contenido Hispaloshop - P1

Editor de contenido Instagram-style unificado para Posts, Reels y Stories.

## 🎨 Características

### Tipos de Contenido
- **Post**: Ratio 1:1, 4:5, 16:9. Hasta 10 imágenes/videos.
- **Reel**: Ratio 9:16 obligatorio. Video 3-90s.
- **Story**: Ratio 9:16 obligatorio. Hasta 5 slides, 15s cada uno.

### Herramientas de Edición

#### 1. Filtros Predefinidos (8)
- Natural, Cálido, Fresco, Artesanal, Suave, Vívido, Nocturno, Clásico

#### 2. Ajustes Manuales
- Brillo (-100 a +100)
- Contraste (-100 a +100)
- Saturación (0 a 200)
- Temperatura (-100 a +100)
- Nitidez (0 a 100)
- Exposición (-100 a +100)

#### 3. Transformación
- Rotar 90°
- Voltear horizontal/vertical
- Zoom (0.5x a 3x)
- Pan (arrastrar imagen)
- Cambio de ratio de aspecto

#### 4. Texto
- 5 fuentes: Moderno, Elegante, Artesanal, Impacto, Minimal
- Tamaño 12-72px
- Color picker
- Fondo opcional
- Sombra/outline
- Posición libre (drag)

#### 5. Stickers (10+)
- Precio (editable)
- Nuevo, Oferta
- Vegano, Orgánico, Sin Gluten, Local
- Hashtag, Mención, Ubicación

#### 6. Dibujo
- 4 tamaños de pincel
- 6 colores
- Múltiples trazos
- Limpiar todo

#### 7. Etiquetado de Productos ⭐
- Búsqueda de productos del catálogo
- Preview con imagen, nombre y precio
- Máximo 5 tags por publicación
- Posicionamiento libre

### Otros Features
- **Undo/Redo**: Historial de 10 pasos
- **Auto-guardado**: Cada 10s en localStorage
- **Previsualización**: Vista final exacta
- **Metadatos**: Caption, ubicación, alt text

## 📁 Estructura

```
frontend/src/components/creator/
├── ContentTypeSelector.js      # Selector Post/Reel/Story
├── index.js                     # Exports
├── types/
│   └── editor.types.ts          # Tipos TypeScript
├── hooks/
│   └── useImageEditor.js        # Hook principal del editor
└── editor/
    ├── AdvancedEditor.js        # Editor completo
    ├── CanvasEditor.js          # Canvas con preview
    ├── FilterPanel.js           # Panel de filtros
    ├── TextTool.js              # Herramienta de texto
    ├── StickerTool.js           # Herramienta de stickers
    ├── DrawTool.js              # Herramienta de dibujo
    └── ProductTagTool.js        # Etiquetado de productos
```

## 🚀 Uso

### Flujo de Publicación

1. Usuario hace clic en "+" del BottomNav
2. Selecciona tipo de contenido (Post/Reel/Story)
3. Selecciona archivos del dispositivo
4. Abre el editor avanzado
5. Aplica filtros, ajustes, textos, stickers, tags
6. Vista previa final con caption
7. Publica al backend

### Integración

```javascript
import { ContentTypeSelector, AdvancedEditor } from './components/creator';

// En BottomNavBar.js:
const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

// Al hacer clic en "+":
setShowContentTypeSelector(true);

// Seleccionar tipo:
<ContentTypeSelector
  isOpen={showContentTypeSelector}
  onClose={() => setShowContentTypeSelector(false)}
  onSelect={(type) => {
    setSelectedContentType(type.id);
    setShowAdvancedEditor(true);
  }}
/>

// Editor:
<AdvancedEditor
  contentType="post"
  files={[file1, file2]}
  onClose={handleClose}
  onPublish={handlePublish}
/>
```

## 🎨 Paleta de Colores

- Primario: `#2D5A3D` (verde aceite)
- Secundario: `#F5F1E8` (crema)
- Acento: `#E6A532` (amarillo mostaza)

## 🔧 API Integration

El editor espera:
- `POST /api/posts` - Para posts con imagen
- `POST /api/reels` - Para videos

Datos enviados:
- `caption`: string
- `file`: File (imagen procesada)
- `video`: File (para reels)

## 📱 Responsive

- **Mobile**: Editor full screen, panel de herramientas inferior
- **Desktop**: Canvas a la izquierda, panel derecho fijo

## 📝 TODO / Futuras Mejoras

- [ ] Subida real a Cloudinary con progreso
- [ ] Programación de publicaciones
- [ ] Hashtags sugeridos por IA
- [ ] Geolocalización real
- [ ] Alt text automático
- [ ] Stories con múltiples slides
- [ ] Reels con recorte de video
- [ ] Más stickers animados
- [ ] Filtros personalizados
