// Filters
export const EDITOR_FILTERS = [
  { key: 'natural', name: 'Natural', css: 'none' },
  { key: 'amanecer', name: 'Amanecer', css: 'saturate(1.3) brightness(1.05) sepia(0.15)' },
  { key: 'lonja', name: 'Lonja', css: 'contrast(1.15) saturate(0.9) brightness(0.95)' },
  { key: 'huerta', name: 'Huerta', css: 'saturate(1.2) hue-rotate(15deg) brightness(1.05)' },
  { key: 'miel', name: 'Miel', css: 'sepia(0.25) saturate(1.1) brightness(1.08)' },
  { key: 'trufa', name: 'Trufa', css: 'grayscale(0.4) contrast(1.1) brightness(0.95)' },
  { key: 'mate', name: 'Mate', css: 'saturate(0.7) contrast(1.05) brightness(1.02)' },
  { key: 'antiguo', name: 'Antiguo', css: 'sepia(0.4) contrast(1.1) saturate(0.8)' },
];

// Fonts
export const EDITOR_FONTS = [
  { key: 'sans', label: 'Sans', family: 'system-ui, -apple-system, sans-serif' },
  { key: 'serif', label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { key: 'mono', label: 'Mono', family: '"SF Mono", "Fira Code", monospace' },
  { key: 'display', label: 'Display', family: '"Playfair Display", Georgia, serif' },
];

// Colors for text/draw
export const EDITOR_COLORS = ['#ffffff', '#0c0a09', '#78716c', '#dc2626', '#2563eb'];

// Text styles
export const TEXT_STYLES = ['clean', 'box', 'outline'] as const;

// Sticker categories
export const STICKER_CATEGORIES = [
  { key: 'comida', label: 'Comida', emojis: ['🍕','🍔','🌮','🥗','🍣','🍰','🧁','🍪','🥖','🧀','🫒','🥩'] },
  { key: 'bebidas', label: 'Bebidas', emojis: ['☕','🍷','🍺','🧃','🥤','🍵','🫖','🧋'] },
  { key: 'utensilios', label: 'Utensilios', emojis: ['🍴','🔪','🥄','🍳','🫕','🥘'] },
  { key: 'naturaleza', label: 'Naturaleza', emojis: ['🌿','🌾','🌻','🍃','🌱','🫑','🍋','🍊'] },
  { key: 'expresiones', label: 'Expresiones', emojis: ['😋','🤤','😍','🔥','👨‍🍳','👩‍🍳','💪','👌'] },
  { key: 'simbolos', label: 'Simbolos', emojis: ['⭐','❤️','✅','🏷️','📦','🛒','🏪','💰'] },
];

// Speed presets for reels
export const SPEED_PRESETS = [0.3, 0.5, 1, 2, 3];

// Aspect ratios for crop
export const ASPECT_RATIOS = [
  { key: '1:1', label: '1:1', value: 1 },
  { key: '4:5', label: '4:5', value: 4/5 },
  { key: '9:16', label: '9:16', value: 9/16 },
  { key: 'original', label: 'Original', value: null },
];

// Build CSS filter string from filter + adjustments
export function buildFilterCSS(filter: typeof EDITOR_FILTERS[0], adjustments: Record<string, number>, intensity = 100) {
  const base = filter.css === 'none' ? '' : filter.css;
  const adj = [
    adjustments.brightness !== 0 ? `brightness(${1 + adjustments.brightness / 100})` : '',
    adjustments.contrast !== 0 ? `contrast(${1 + adjustments.contrast / 100})` : '',
    adjustments.saturate !== 0 ? `saturate(${1 + adjustments.saturate / 100})` : '',
  ].filter(Boolean).join(' ');

  if (intensity < 100 && base) {
    // Mix filter with original using opacity trick
    return `${base} ${adj}`.trim() || 'none';
  }
  return `${base} ${adj}`.trim() || 'none';
}
