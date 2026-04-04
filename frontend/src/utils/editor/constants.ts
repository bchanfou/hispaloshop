// Story filters — Instagram-style presets applied via CSS filter + swipe
export const STORY_FILTERS = [
  { key: 'natural', name: 'Natural', css: 'none' },
  { key: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { key: 'juno', name: 'Juno', css: 'saturate(1.4) brightness(1.05) sepia(0.08)' },
  { key: 'ludwig', name: 'Ludwig', css: 'saturate(0.85) contrast(1.15) brightness(1.05)' },
  { key: 'valencia', name: 'Valencia', css: 'sepia(0.15) saturate(1.2) contrast(1.05) brightness(1.1)' },
  { key: 'lark', name: 'Lark', css: 'brightness(1.1) saturate(0.9) contrast(1.1)' },
  { key: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { key: 'sierra', name: 'Sierra', css: 'sepia(0.2) contrast(0.9) brightness(1.1) saturate(0.85)' },
  { key: 'aden', name: 'Aden', css: 'sepia(0.1) saturate(1.1) brightness(1.15) hue-rotate(-15deg)' },
  { key: 'reyes', name: 'Reyes', css: 'sepia(0.2) brightness(1.15) contrast(0.85) saturate(0.75)' },
] as const;

// Post/reel filters
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

// Story background options
export const STORY_BG_OPTIONS = [
  { id: 'camera', label: '📷', type: 'action' as const },
  { id: 'gallery', label: '🖼️', type: 'action' as const },
  { id: 'black', label: '■', type: 'color' as const, value: '#000000' },
  { id: 'white', label: '□', type: 'color' as const, value: '#ffffff' },
  { id: 'crema', label: '■', type: 'color' as const, value: '#fafaf9' },
  { id: 'oscuro', label: '■', type: 'color' as const, value: '#1c1917' },
  { id: 'verde', label: '■', type: 'color' as const, value: '#44403c' },
  { id: 'terracota', label: '■', type: 'color' as const, value: '#78716c' },
];

// Story emoji categories
export const STORY_EMOJI_CATEGORIES: Record<string, string[]> = {
  Comida: ['🍕','🍔','🌮','🍣','🥗','🍝','🧁','🍰','🍩','🥐','🍎','🍊','🍋','🍇','🍓','🫐','🥑','🥕','🧀','🥚','🍯','🫒'],
  Bebidas: ['☕','🍵','🧃','🥤','🍺','🍷','🥂','🧋'],
  Utensilios: ['🍴','🥄','🔪','🫕','🥘','🍳'],
  Naturaleza: ['🌿','🌱','🌻','🌾','🌽','🫑'],
  Expresiones: ['❤️','🔥','⭐','😍','🤤','👨‍🍳','👩‍🍳','💯','✨','👏'],
  Símbolos: ['✅','❌','📦','🏷️','💰','🛒','🏪'],
};

// Story certification stickers
export const STORY_CERTIFICATIONS = [
  { emoji: '🌿', label: 'Ecológico EU' },
  { emoji: '🏆', label: 'DOP' },
  { emoji: '🥇', label: 'IGP' },
  { emoji: '☪️', label: 'Halal' },
  { emoji: '🌾', label: 'Sin gluten' },
  { emoji: '🌱', label: 'Vegano' },
];

// Story phrase stickers
export const STORY_PHRASES = [
  'Cosecha de temporada',
  'Artesanal desde siempre',
  'Sin conservantes',
  'Directo del productor',
];

// Story font map
export const STORY_FONTS_MAP: Record<string, string> = {
  Sans: 'inherit',
  Serif: 'Georgia, serif',
  Mono: 'monospace',
  Display: 'Impact, sans-serif',
};

// Story text color dots
export const STORY_COLOR_DOTS = ['#000000', '#ffffff', '#a8a29e', '#78716c', '#44403c'];

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
