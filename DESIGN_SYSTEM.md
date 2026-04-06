# HispaloShop — Design System

> Ground truth para tokens, tipografía, spacing, copy y componentes base.
> Cualquier archivo del frontend debe consumir de aquí. Si encuentras algo
> en el código que no está en este documento, o lo añades aquí, o lo eliminas.

**Última actualización:** sección 0.1 del roadmap de lanzamiento.
**Mantiene:** el fundador + Claude en sesiones de roadmap.

---

## 1. Principios

1. **Palette B&W stone — zero color accents.** No verdes, no rojos, no azules. Los estados semánticos (error, success, warning) se expresan con tipografía, borde y copy, no con color.
2. **Apple minimalist.** Generoso whitespace, tipografía limpia, silencio visual. Inspiración directa: apple.com, aesop.com, notion.so.
3. **Mobile + desktop ready.** Los tokens funcionan en ambos viewports. Los breakpoints siguen Tailwind defaults + `xs: 320px`.
4. **Un solo lenguaje visual.** Un botón se ve igual en el feed que en el checkout que en el dashboard del admin. Sin variantes regionales o contextuales de marca.
5. **Copy cercano por defecto, profesional cuando importa.** Tuteo y calidez en consumer/feed/discover. Directo y minimalista en B2B, admin, fiscal, billing.

---

## 2. Palette (stone B&W)

Todo el color de la plataforma vive en la escala `stone-*` de Tailwind. Tailwind ya provee esta escala por defecto: **no se redefine en `tailwind.config.js`**.

| Token | Hex | Uso recomendado |
|---|---|---|
| `stone-50`  | `#fafaf9` | Fondo app, superficies muy sutiles |
| `stone-100` | `#f5f5f4` | Cards, backgrounds de sección, hover de ítems |
| `stone-200` | `#e7e5e4` | Bordes, separadores, dashed inputs |
| `stone-300` | `#d6d3d1` | Bordes enfatizados, skeleton shadows |
| `stone-400` | `#a8a29e` | Text tertiary, placeholders, icons pasivos |
| `stone-500` | `#78716c` | Text secondary, labels, metadata |
| `stone-600` | `#57534e` | Text secondary enfatizado |
| `stone-700` | `#44403c` | Text primary sobre fondos claros (alt) |
| `stone-800` | `#292524` | Hover del botón primario |
| `stone-900` | `#1c1917` | Gradientes oscuros |
| `stone-950` | `#0c0a09` | **Color principal de marca.** Botones primarios, text primary, iconos activos, CTA, focus ring |

**Regla de oro**: `stone-950` es negro de marca. `stone-50` es blanco de marca. Todo lo demás son matices.

### CSS variables equivalentes (`src/styles/tokens.css`)
```
--color-stone-50 … --color-stone-950   /* palette directa */
--color-bg                              /* = stone-50 */
--color-surface                         /* = #ffffff */
--color-text-primary                    /* = stone-950 */
--color-text-secondary                  /* = stone-500 */
--color-text-tertiary                   /* = stone-400 */
--color-border                          /* = stone-200 */
```

---

## 3. Excepciones oficiales al palette

Las **únicas** excepciones permitidas en toda la plataforma. Si un color no está en esta lista, no es una excepción válida.

### 3.1 AI brand colors (identidad de producto)
| IA | Color | Dónde vive | Quién lo ve |
|---|---|---|---|
| **David** | `stone-950` (`#0c0a09`) | Botón flotante + panel | Todos los usuarios |
| **Rebeca** | `#0a3d2e` (verde premium profundo) | Botón flotante + panel | PRO + ELITE (producer/importer) |
| **Pedro** | `#b45309 → #78350f` gradient (dorado) | Botón flotante + panel | ELITE only |

Estos colores **solo** aparecen en el botón flotante de la IA correspondiente y su panel interno. No se usan en ningún otro sitio de la app.

### 3.2 Brand illustrations
`frontend/src/components/informativas/svg/*.tsx` — Las ilustraciones SVG editoriales (HeroBanner, landing pages) usan paleta completa intencionalmente. Tienen licencia artística. **No modificar sin aprobación del fundador.**

### 3.3 Tema alterno
`frontend/src/styles/theme-superadmin.css` — Tema oscuro exclusivo del dashboard `super_admin` (data-heavy). No es parte del design system principal. Si en el futuro se quiere unificar, será una sección específica del roadmap.

### 3.4 Social login logos (brand guidelines de terceros)
Google y Facebook exigen colores exactos para sus botones de login (no podemos modificar sus logos). Los hex aparecen **únicamente** dentro de los SVG paths de los botones de OAuth:
- Google: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` — en `components/auth/SocialButtons.js`, `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`.
- Facebook: `#1877F2` — en `components/auth/SocialButtons.js`.

No usar estos colores en ningún otro contexto.

### 3.5 Semantic states (sin color, con emphasis)
- **Error:** `text-stone-950` + `font-semibold` + borde enfatizado (`border-stone-950`). **NO** `text-red-*`.
- **Success:** `text-stone-950` + icono Check + pill `bg-stone-100`. **NO** `text-green-*`.
- **Warning:** `text-stone-950` + icono AlertTriangle + pill `bg-stone-100 border-stone-200`. **NO** `text-amber-*`.
- **Info:** igual que success, sin icono especial.

---

## 4. Typography

### Familias

| Token | Stack | Uso |
|---|---|---|
| `font-sans` (default) | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica Neue, sans-serif` | Todo el UI por defecto |
| `font-apple` (Tailwind extend) | igual que sans | Legacy: páginas chat, auth, layouts. Alias para enfatizar look Apple |
| `font-mono` (CSS var) | `'SF Mono', 'Fira Code', monospace` | Code blocks, IDs técnicos |

No hay serifs, no hay display fonts custom, no hay Google Fonts. La tipografía es Apple system por diseño.

### Escala

| Token CSS | Mobile | Desktop (lg+) | Uso |
|---|---|---|---|
| `--text-xs` | 12px | 11px | Metadata, labels |
| `--text-sm` | 14px | 12px | Secondary text |
| `--text-base` | 16px | 14px | Body |
| `--text-md` | 16px | 15px | Body enfatizado |
| `--text-lg` | 18px | 17px | Subtitles |
| `--text-xl` | 20px | 19px | Section headings |
| `--text-2xl` | 24px | 22px | H3 |
| `--text-3xl` | 30px | 28px | H2 |
| `--text-4xl` | 36px | 36px | H1 |
| `--text-5xl` | 48px | 48px | Display (landing) |

### Pesos
| Token | Valor |
|---|---|
| `--font-regular` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

---

## 5. Spacing

Escala en múltiplos de 4px. Usa Tailwind (`p-1`, `p-2`, `gap-4`…) o las CSS vars.

| Token | px |
|---|---|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |
| `--space-16` | 64 |
| `--space-20` | 80 |
| `--space-24` | 96 |

---

## 6. Radius

| Token CSS | Tailwind | px | Cuándo usar |
|---|---|---|---|
| `--radius-sm` | `rounded-lg` | 8 | Inputs pequeños, tags |
| `--radius-md` | `rounded-xl` | 12 | Inputs, cards pequeñas, hover states |
| `--radius-lg` | `rounded-2xl` | 16 | Cards grandes, botones icon-only |
| `--radius-xl` | `rounded-2xl` | 20 | Hero cards, modales contenidos |
| `--radius-2xl` | `rounded-[28px]` | 28 | Modales full, sheets, bottom sheets |
| `--radius-full` | `rounded-full` | 9999 | Pills, avatars, botones principales |

**Regla**: botones principales (CTA) → `rounded-full`. Cards y containers → `rounded-2xl`. Inputs → `rounded-xl`.

---

## 7. Shadows

Sombras **neutrales**, sin tintes de color. Se usan con moderación — el look Apple es plano con sombras sutiles.

| Token CSS | Tailwind | Uso |
|---|---|---|
| `--shadow-xs` | — | Bordes flotantes sutilísimos |
| `--shadow-sm` | `shadow-sm` | Cards en reposo |
| `--shadow-md` | `shadow-md` | Dropdowns, popovers |
| `--shadow-lg` | `shadow-lg` | Modales pequeños |
| `--shadow-xl` | `shadow-xl` | — |
| (Tailwind extend) | `shadow-modal` | Modales y bottom sheets grandes |
| (Tailwind extend) | `shadow-nav` | Header sticky cuando scroll |

---

## 8. Breakpoints

Seguimos Tailwind defaults + `xs` para pantallas muy pequeñas. Definidos en `tailwind.config.js`.

| Token | Min-width | Uso |
|---|---|---|
| `xs` | 320px | Móviles muy estrechos (raro) |
| `sm` | 640px | Móviles grandes / tablets pequeñas |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop base |
| `xl` | 1440px | Desktop wide |
| `2xl` | 1536px | Desktop ultra-wide |

**Regla**: mobile-first. Todo se diseña en mobile primero y se adapta a desktop con `lg:` / `xl:`.

---

## 9. Motion

Framer Motion para casi todo. Las CSS animations son para estados sin estado JS (pull-to-refresh, story rings, heart burst).

### Duraciones estándar
| Token CSS | Valor | Uso |
|---|---|---|
| `--duration-fast` | 150ms | Hover, press, taps |
| `--duration-normal` | 250ms | Transiciones de estado |
| `--duration-slow` | 400ms | Modales, sheets, page transitions |

### Easings estándar
| Token CSS | Valor | Cuándo |
|---|---|---|
| `--ease-smooth` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Default — casi todo |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Press feedback, pop-ins |

**Framer Motion**: usa `transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}` como default. Respeta `prefers-reduced-motion` (ya cubierto en CSS global).

---

## 10. Icons & Iconography

### Proveedor: Lucide React (exclusivo)
**Lucide React** con stroke 2. No mezclar con otras librerías de iconos.

| Tamaño | Clase | Uso |
|---|---|---|
| `w-4 h-4` (16px) | — | Inline con texto, badges, labels de sección |
| `w-5 h-5` (20px) | — | Botones, metadata |
| `w-6 h-6` (24px) | — | Headers, action bars |
| `w-8 h-8` (32px) | — | Empty states, hero icons |

### 🚫 REGLA: ZERO EMOJIS en la UI visible

**Los emojis estándar (🌱🍳🔥🏘️⚠️✅ etc.) están PROHIBIDOS** en cualquier
superficie visible de la plataforma. Razones:
- Inconsistentes entre dispositivos (Android vs iOS vs Windows)
- Colores chillones que rompen el palette stone B&W
- Aspecto vulgar que destruye el feel premium
- No escalan ni se tematizan

**Todo se reemplaza por Lucide Icons** en `text-stone-400` (sutil, Apple-like).

### Opacidad de icons

| Contexto | Color | Ejemplo |
|---|---|---|
| Icons de sección, labels, badges, metadata | `text-stone-400` | `<Leaf className="w-4 h-4 text-stone-400" />` |
| Icons de acción (botones, CTAs, nav activa) | `text-stone-950` | `<ShoppingCart className="w-5 h-5 text-stone-950" />` |
| Icons de estado pasivo (disabled, placeholder) | `text-stone-300` | `<Lock className="w-4 h-4 text-stone-300" />` |

**Principio**: el icon es un acompañante sutil del texto, no el protagonista.
El texto manda, el icon da reconocimiento visual rápido.

### Mapeo de emojis → Lucide icons

| Uso | ~~Emoji~~ | Lucide Icon | Import |
|---|---|---|---|
| Orgánico | ~~🌱~~ | `<Leaf />` | `lucide-react` |
| km0 / Local | ~~📍~~ | `<MapPin />` | `lucide-react` |
| Vegano | ~~🥬~~ | `<Sprout />` | `lucide-react` |
| Halal | ~~☪️~~ | `<Shield />` | `lucide-react` |
| Sin gluten | ~~🚫~~ | `<WheatOff />` | `lucide-react` |
| Nuevo | ~~🆕~~ | `<Sparkles />` | `lucide-react` |
| Popular / Trending | ~~🔥~~ | `<TrendingUp />` | `lucide-react` |
| Verificado | ~~✅~~ | `<BadgeCheck />` | `lucide-react` |
| Carrito | ~~🛒~~ | `<ShoppingCart />` | `lucide-react` |
| Guardar | ~~♡~~ | `<Heart />` | `lucide-react` |
| Compartir | ~~↗️~~ | `<Share2 />` | `lucide-react` |
| Recetas | ~~🍳~~ | `<ChefHat />` | `lucide-react` |
| Comunidades | ~~🏘️~~ | `<Users />` | `lucide-react` |
| Nuevos usuarios | ~~✨~~ | `<UserPlus />` | `lucide-react` |
| Mapa | ~~🗺️~~ | `<Map />` | `lucide-react` |
| Alérgeno / Warning | ~~⚠️~~ | `<AlertTriangle />` | `lucide-react` |
| Temporada | ~~🌱~~ | `<Sun />` (verano) / `<Snowflake />` (invierno) / `<Flower2 />` (primavera) / `<Leaf />` (otoño) | `lucide-react` |
| Cerca de ti | ~~📍~~ | `<MapPin />` | `lucide-react` |
| Para ti | ~~💡~~ | `<Lightbulb />` | `lucide-react` |
| Creators | ~~🔥~~ | `<Star />` | `lucide-react` |

### Badges de certificación: icon + texto

Los badges de producto usan **Lucide icon (stone-400) + texto (stone-700)**:

```jsx
// ✅ Correcto — icon lineal + texto, premium feel
<span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700
                  text-xs px-2.5 py-1 rounded-full">
  <Leaf className="w-3.5 h-3.5 text-stone-400" />
  Orgánico
</span>

// ❌ Incorrecto — emoji con color
<span>🌱 Orgánico</span>

// ❌ Incorrecto — icon demasiado prominente
<span><Leaf className="w-4 h-4 text-stone-950" /> Orgánico</span>
```

### Section headers en Discover / páginas curadas

```jsx
// ✅ Correcto — icon sutil + texto prominente, Apple-like
<div className="flex items-center gap-2">
  <MapPin className="w-4 h-4 text-stone-400" />
  <h2 className="text-lg font-semibold text-stone-950">Cerca de ti</h2>
</div>

// ❌ Incorrecto — emoji protagonista
<h2>📍 Cerca de ti</h2>
```

### Única excepción: banderas de países

Las **banderas de países** (🇪🇸 🇰🇷 🇺🇸 🇫🇷) son la **única excepción** aceptada.
Razón: no existe alternativa visual aceptable en Lucide, y son universalmente
reconocibles. Apple, Google, y Airbnb todas usan flag emojis.

```jsx
// ✅ OK — flag emoji para países
<span>🇪🇸 España</span>

// ❌ NO — flag emoji para otros usos
<span>🇪🇸 ¡Producto español!</span>  // Usar texto, no flag como decoración
```

### Dónde aplicar (checklist de migración)

Cuando se encuentre un emoji en la UI visible:
1. Buscar el Lucide icon equivalente en la tabla de arriba
2. Usar `w-3.5 h-3.5 text-stone-400` para inline con texto
3. Usar `w-4 h-4 text-stone-400` para headers de sección
4. Si no hay equivalente en Lucide, buscar el más cercano semánticamente
5. Si no hay equivalente posible, usar solo texto (sin icon ni emoji)

---

## 11. Copy guidelines

### Tono por defecto — cercano, tuteo, toca la fibra
Consumer-facing: feed, discover, product detail, cart, checkout, profile, stories, recipes, communities.

**Ejemplos DO:**
- "Descubre a quién alimenta tu mesa"
- "Tu productor está preparando tu pedido"
- "Conecta directamente con productores locales"
- "Guarda este producto para volver a él"
- "Aún no hay productos aquí. Explora otros productores"
- "Estás al día" (empty notifications)
- "Comparte tu perfil" (empty followers)

**Ejemplos DON'T:**
- ~~"Nosotros en HispaloShop nos enorgullecemos de..."~~ → corporativo frío
- ~~"Usted puede añadir productos a su carrito"~~ → usted, tercera persona
- ~~"¡¡Increíble selección de productos!!"~~ → exclamaciones, exageración
- ~~"😊 ¡Bienvenido! 🎉"~~ → emojis decorativos
- ~~"Nuestra plataforma ofrece..."~~ → plural mayestático

### Tono profesional — directo, minimalista, sin adjetivos
B2B marketplace, admin dashboards, fiscal, billing, ajustes técnicos, certificaciones, payouts.

**Ejemplos DO:**
- "Cantidad mínima: 100 uds"
- "Incoterm DAP Barcelona"
- "Retención 15% aplicada"
- "Aprobar seleccionados"
- "Saldo disponible: 1.240 €"
- "Solicitar cobro"
- "Próximo cobro: 2026-04-15"

**Ejemplos DON'T:**
- ~~"¡Aprueba a tus proveedores de forma increíble!"~~ → tono consumer en admin
- ~~"Tu saldo está creciendo genial, ¡sigue así!"~~ → motivacional en fiscal
- ~~"Oferta enviada con éxito al productor 🚀"~~ → emoji en B2B

### Reglas universales
1. **Sin emojis decorativos.** Solo emojis funcionales (ej: categoría de receta: 🌅 desayuno). Nunca en headers, errores, confirmaciones.
2. **Sin exclamaciones múltiples.** Máximo una por frase, y solo en momentos genuinos (success de pedido, welcome onboarding).
3. **Sin adjetivos vacíos.** "increíble", "fantástico", "genial", "premium", "único" — fuera. Describe lo que hace, no lo califiques.
4. **Verbo + objeto directo.** "Añadir al carrito", no "Añadir este producto a tu carrito ahora".
5. **Mayúsculas naturales.** No title case agresivo. "Añadir al carrito", no "Añadir Al Carrito".
6. **Cifras con formato local.** 1.240 € en ES, ₩1,240,000 en KR, $1,240 en US.

### Dónde viven las frases reutilizables
`frontend/src/styles/copy.ts` — constantes tipo `COPY.emptyStates.noProducts`, `COPY.errors.generic`, `COPY.cta.addToCart`, `COPY.pro.moq`. Si una frase aparece en 2+ sitios, muévela ahí.

---

## 12. Catálogo de componentes base

Estado actual del frontend. Las variantes listadas son las que **existen** en el código, no las ideales. Futuras secciones del roadmap pueden unificar componentes duplicados.

### 12.1 Button
**Patrón actual**: Tailwind directo en lugar de componentes abstraídos. Ejemplos:
```jsx
// Primary
<button className="bg-stone-950 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-stone-800">

// Secondary (ghost)
<button className="bg-white text-stone-950 border border-stone-200 rounded-full px-4 py-2 text-sm font-medium">

// Link / text button
<button className="text-stone-950 underline underline-offset-2 text-sm font-medium">

// Icon button
<button className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
```

**Legacy CSS classes** (en `src/styles/components.css`): `.btn .btn-primary`, `.btn .btn-ghost`, `.btn-sm`, `.btn-lg`. Funcionales, alineadas a stone. Se usan en LoyaltyPage y auth pages. Migrar progresivamente a Tailwind directo.

**Shadcn library** (`src/components/ui/button.jsx`): presente pero **no debe usarse en código nuevo**. Solo existe por dependencias históricas.

### 12.2 Card
**Patrón actual**: Tailwind directo.
```jsx
// Base card
<div className="bg-white rounded-2xl border border-stone-200 p-4">

// Elevated card
<div className="bg-white rounded-2xl shadow-sm p-4">

// Pressable card (feed)
<div className="bg-white rounded-2xl overflow-hidden active:scale-[0.99] transition-transform">
```

### 12.3 Input / Textarea
```jsx
<input className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-950 bg-white placeholder:text-stone-400 focus:outline-none focus:border-stone-950" />
```

**Legacy**: `.input` class en `components.css` (stone-950). `.hs-input` en `compat.css` (auth pages).

### 12.4 Modal / Bottom Sheet / Dialog
**Patrón actual**: Framer Motion con variants definidas inline. Shadow `shadow-modal`. Overlay `bg-black/50`.
```jsx
<motion.div className="fixed inset-0 bg-black/50 z-50" />
<motion.div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-modal p-6 z-50">
```

**Shadcn** (`Dialog`, `AlertDialog`, `Sheet`, `Drawer`): no usar en código nuevo.

### 12.5 Toast
**Librería**: [Sonner](https://sonner.emilkowal.ski/). Configurado en `src/components/ui/sonner.jsx`. Colores alineados a stone via `compat.css`.
```js
import { toast } from 'sonner';
toast.success('Pedido confirmado');
toast.error('Algo no salió bien');
```

### 12.6 Badge / Pill
```jsx
// Primary pill
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-950 text-white text-xs font-semibold">

// Neutral pill
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-950 text-xs font-medium">

// Outlined
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-stone-200 text-stone-700 text-xs">
```

### 12.7 Avatar
`src/components/ui/InitialsAvatar.jsx` — para fallback sin imagen. Usa stone palette.
```jsx
<img className="w-10 h-10 rounded-full object-cover bg-stone-100" />
```

### 12.8 Skeleton
`src/components/Skeleton.tsx` — componentes tipados: `Skeleton`, `SkeletonText`, `ProductGridSkeleton`. Animación shimmer en `index.css` + `compat.css` via `.skeleton` class.

### 12.9 Divider
```jsx
<div className="h-px bg-stone-200" />
```
O CSS class `.divider` en `components.css`.

### 12.10 Spinner / Loader
`src/components/ui/Spinner.jsx`. Tamaños `sm`, `md`, `lg`. Color stone-950.

---

## 13. Archivos del design system

Ground truth files. Edita aquí, no en los componentes.

| Archivo | Responsabilidad |
|---|---|
| `DESIGN_SYSTEM.md` (este) | Documento maestro |
| `frontend/tailwind.config.js` | Tokens Tailwind (extends) |
| `frontend/src/styles/tokens.css` | CSS variables (palette, type, spacing, radius, shadow, motion, z, layout) |
| `frontend/src/styles/base.css` | Reset global, focus-visible, scrollbar, reduced-motion |
| `frontend/src/styles/typography.css` | Clases `.info-*`, `.reveal-*`, `.hero-animate-*` para landings |
| `frontend/src/styles/components.css` | Clases legacy `.btn-*`, `.input`, `.badge-*`, story-ring, divider, overlay |
| `frontend/src/styles/compat.css` | Clases de compatibilidad: `.hs-btn-*`, `.skeleton`, `.bottom-sheet`, `.mobile-header`, Sonner overrides |
| `frontend/src/styles/theme-superadmin.css` | **Tema alterno** (fuera del DS principal) |
| `frontend/src/styles/copy.ts` | Constantes de copy reutilizable |
| `frontend/src/index.css` | Orquestador: importa los 6 archivos de `styles/` + shadcn HSL vars |

---

## 14. Qué no hacer

- No añadir colores nuevos a `tailwind.config.js` excepto para los casos cubiertos en "Excepciones oficiales" (y esos viven en sus propios componentes, no en el config).
- No importar shadcn components en código nuevo. Solo existen por dependencias históricas y el roadmap los irá migrando.
- No crear un design system paralelo dentro de una feature. Si necesitas algo que no está aquí, primero actualiza este documento y los tokens.
- No usar fonts de Google. El stack es Apple system, punto.
- No usar `!important` en tokens. Si necesitas `!important`, algo está mal.
- No hardcodear hex en JSX/TSX. Usa clases Tailwind (`bg-stone-950`) o CSS vars (`var(--color-stone-950)`). Las únicas excepciones son las documentadas en sección 3.
- No mezclar Lucide con otras librerías de iconos.
- No añadir emojis decorativos al copy.

---

## 15. Cómo evolucionar el design system

1. Cualquier cambio requiere actualizar este archivo primero.
2. Cambios en tokens → actualizar `tokens.css` + `tailwind.config.js` en el mismo commit.
3. Nuevas excepciones al palette → pasan por aprobación del fundador.
4. Si un componente legacy de `components.css` o `compat.css` se migra a Tailwind directo y queda con 0 usos, borrarlo.
5. Si una frase de copy aparece en 2+ sitios, moverla a `copy.ts`.
