# Mapa Visual del Repositorio HispaloShop

## Descripción

`docs/MAP.html` es un mapa interactivo del repositorio estilo Apple/Google Maps (blanco y negro elegante) que permite a cualquier persona — desde desarrolladores hasta personas sin experiencia técnica — entender la estructura del proyecto y navegar por ella de forma intuitiva.

## Cómo abrirlo

Abre el archivo directamente en tu navegador:

```
docs/MAP.html
```

O accede desde GitHub Pages si está habilitado:

```
https://bchanfou.github.io/hispaloshop/docs/MAP.html
```

## Funcionalidades

### Mapa interactivo

- **Zoom**: Rueda del ratón (scroll) o los botones + / - de la esquina inferior derecha
- **Pan (mover)**: Mantén pulsado y arrastra el mapa
- **Restablecer vista**: Botón con el símbolo de recarga (esquina inferior derecha)
- **Pinch to zoom**: En dispositivos móviles, usa dos dedos para hacer zoom

### Búsqueda

El campo de búsqueda en la cabecera permite buscar cualquier archivo, carpeta o función por nombre o descripción. Los resultados tienen autocompletado y al hacer clic te llevan directamente al elemento en el mapa.

### Filtros por categoría

Los botones de la barra de herramientas filtran el mapa por tipo de contenido:

| Filtro | Que muestra |
|--------|-------------|
| Todo | Todo el repositorio |
| Docs | Documentación (docs/ai/, README, MEGA_PLAN, etc.) |
| Código | Frontend (React) y Backend (FastAPI) |
| Config | GitHub Actions, .claude, .gitignore, etc. |
| Tests | Tests unitarios, E2E y de integracion |
| Dependencias | package.json, requirements.txt, yarn.lock |
| Especial | Guias técnicas, auditorias, despliegue |

### Rutas rápidas ("Ir a")

Botones de navegación directa para casos de uso comunes:

- **Leer documentación** — Centra el mapa en la región de documentación
- **Ver el código** — Centra el mapa en el frontend
- **Configuración** — Centra el mapa en la región de configuración
- **Empezar aqui** — Abre la ficha de `AI_READ_FIRST.md` (la puerta de entrada)
- **Quiero contribuir** — Focaliza en los workflows de automatización

### Panel de información

Al hacer clic en cualquier nodo del mapa se abre un panel lateral con:

- Nombre y ruta del archivo o carpeta
- Descripción técnica
- Explicación en lenguaje sencillo (apto para cualquier persona)
- Roles que usan ese archivo
- Enlace directo a GitHub

## Regiónes del mapa

```
+------------------+----------+--------------------+
|                  |          |    CONFIGURACION   |
|  DOCUMENTACIÓN   | ESPECIAL |    (fondo oscuro)  |
|                  |          +--------------------+
+------------------+----------+--------------------+
|                  |          |                    |
|  FRONTEND        | BACKEND  |    TESTS           |
|  (React)         | (FastAPI)|                    |
|                  |          +--------------------+
|                  |          |    DEPENDENCIAS    |
+------------------+----------+--------------------+
```

### Marcadores especiales

Los nodos mas importantes tienen una etiqueta destacada:

| Etiqueta | Archivo | Significado |
|----------|---------|-------------|
| START HERE | AI_READ_FIRST.md | Primera lectura obligatoria |
| READ ME | docs/ai/00_AI_MAP.md | Mapa de reglas maestro |
| AUTOMATION | .github/workflows/ | CI/CD automatizado |
| IMPORTANTE | .claude/README.md | Checklist del asistente IA |

## Sección de Roles

Debajo del mapa hay una sección con los seis roles del proyecto, cada uno con:

- Explicación en lenguaje simple
- Una historia (como un cuento) que explica su función
- Lista de archivos clave para ese rol
- Acceso directo a cada archivo desde el panel del mapa

### Roles disponibles

1. Manager / Product Owner — El capitan del barco
2. Desarrollador — El constructor de código
3. Designer / UI — El artista del proyecto
4. QA / Tester — El inspector de calidad
5. IA / Copilot — El asistente inteligente
6. Principiante / Nuevo — El que acaba de llegar

## Sección de Funciónes

Una sección adicional explica con metáforas sencillas (como para niños de 8 años) que hace cada parte del proyecto:

- AI_READ_FIRST.md: "Como el letrero de LEE ESTO ANTES DE ABRIR"
- docs/ai/00_AI_MAP.md: "Como el mapa de un parque de atracciones"
- frontend/src/: "Como la vitrina de una tienda"
- backend/main.py: "Como la cocina de un restaurante"
- .github/workflows/: "Como un robot guardia de seguridad"
- Y mas...

## Detalles técnicos

- **Tecnología**: HTML + CSS + JavaScript vanilla (sin dependencias externas)
- **Funcióna offline**: No requiere conexión a internet
- **Responsive**: Adaptado para escritorio, tablet y móvil
- **Accesible**: WCAG compatible, navegable por teclado, roles ARIA
- **Rendimiento**: Ligero, carga instantanea
- **Diseño**: Blanco y negro elegante (sistema de diseño HispaloShop)

## Archivos relacionados

| Archivo | Descripción |
|---------|-------------|
| `docs/MAP.html` | El mapa interactivo (este archivo) |
| `docs/VISUAL_MAP.md` | Esta documentación |
| `docs/ROLES_GUIDE.md` | Guía de roles detallada en texto |
| `.github/README_MAP.md` | Enlace rápido al mapa |
| `AI_READ_FIRST.md` | Incluye referencia al mapa |
