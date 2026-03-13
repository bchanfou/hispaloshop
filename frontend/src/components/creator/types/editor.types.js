// Tipos para el Editor de Contenido Hispaloshop

export const ContentType = {
  POST: 'post',
  REEL: 'reel',
  STORY: 'story',
};

export const AspectRatio = {
  RATIO_1_1: '1:1',
  RATIO_4_5: '4:5',
  RATIO_9_16: '9:16',
  RATIO_16_9: '16:9',
};

export const ASPECT_RATIOS = {
  post: ['1:1', '4:5', '16:9'],
  reel: ['9:16'],
  story: ['9:16'],
};

export const ASPECT_RATIO_DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

export const PREDEFINED_FILTERS = [
  {
    id: 'natural',
    name: 'Normal',
    settings: { brightness: 0, contrast: 0, saturate: 100, warmth: 0, sharpness: 0, exposure: 0, fade: 0, highlights: 0, shadows: 0, vignette: 0, tint: 0 }
  },
  {
    id: 'warm',
    name: 'Cálido',
    settings: { brightness: 5, contrast: 10, saturate: 110, warmth: 25, sharpness: 10, exposure: 5, fade: 0, highlights: 0, shadows: 0, vignette: 0, tint: 0 }
  },
  {
    id: 'fresh',
    name: 'Frío',
    settings: { brightness: 10, contrast: 5, saturate: 120, warmth: -15, sharpness: 15, exposure: 10, fade: 0, highlights: 0, shadows: 0, vignette: 0, tint: -10 }
  },
  {
    id: 'artisan',
    name: 'Artisan',
    settings: { brightness: -5, contrast: 20, saturate: 90, warmth: 15, sharpness: 20, exposure: 0, fade: 0, highlights: 0, shadows: -10, vignette: 20, tint: 0 }
  },
  {
    id: 'soft',
    name: 'Fade',
    settings: { brightness: 15, contrast: -10, saturate: 80, warmth: 10, sharpness: 0, exposure: 10, fade: 30, highlights: 10, shadows: 0, vignette: 0, tint: 0 }
  },
  {
    id: 'vivid',
    name: 'Clarendon',
    settings: { brightness: 5, contrast: 15, saturate: 140, warmth: 5, sharpness: 25, exposure: 5, fade: 0, highlights: 15, shadows: -15, vignette: 10, tint: 0 }
  },
  {
    id: 'night',
    name: 'Noche',
    settings: { brightness: -10, contrast: 25, saturate: 70, warmth: -20, sharpness: 15, exposure: -10, fade: 0, highlights: 0, shadows: -20, vignette: 30, tint: 0 }
  },
  {
    id: 'classic',
    name: 'B&N',
    settings: { brightness: 0, contrast: 30, saturate: 0, warmth: 0, sharpness: 20, exposure: 0, fade: 0, highlights: 0, shadows: 0, vignette: 10, tint: 0 }
  },
];

export const FONT_OPTIONS = [
  { id: 'sans', name: 'Moderno', className: 'font-sans' },
  { id: 'serif', name: 'Elegante', className: 'font-serif' },
  { id: 'handwritten', name: 'Artesanal', className: 'font-handwritten' },
  { id: 'bold', name: 'Impacto', className: 'font-bold' },
  { id: 'minimal', name: 'Minimal', className: 'font-light' },
];

export const HISPALO_COLORS = {
  primary: '#2D5A3D',
  secondary: '#F5F1E8',
  accent: '#E6A532',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  background: '#FFFFFF',
  backgroundAlt: '#F9FAFB',
  error: '#DC2626',
  success: '#16A34A',
};

export const MOCK_PRODUCTS = [
  { id: "1", name: "Aceite de Oliva Virgen Extra", price: 12.90, image: "/mock/aceite.jpg", seller: "Cortijo Andaluz", category: "aceites" },
  { id: "2", name: "Queso Manchego Curado", price: 18.50, image: "/mock/queso.jpg", seller: "La Antigua", category: "quesos" },
  { id: "3", name: "Miel de Romero Ecológica", price: 8.90, image: "/mock/miel.jpg", seller: "Apicola del Sur", category: "mieles" },
  { id: "4", name: "Jamón Ibérico de Bellota", price: 45.00, image: "/mock/jamon.jpg", seller: "Embutidos Reyes", category: "embutidos" },
  { id: "5", name: "Vino Tinto Rioja Reserva", price: 22.90, image: "/mock/vino.jpg", seller: "Bodegas Solar", category: "vinos" },
  { id: "6", name: "Pan Artesanal de Centeno", price: 4.50, image: "/mock/pan.jpg", seller: "Panadería La Flor", category: "panadería" },
];

// Type definitions (for JSDoc)
/**
 * @typedef {Object} EditorImage
 * @property {string} id
 * @property {string} src
 * @property {File} file
 * @property {'image'|'video'} type
 * @property {string} [thumbnail]
 */

/**
 * @typedef {Object} FilterSettings
 * @property {number} brightness
 * @property {number} contrast
 * @property {number} saturate
 * @property {number} warmth
 * @property {number} sharpness
 * @property {number} exposure
 */

/**
 * @typedef {Object} TextElement
 * @property {string} id
 * @property {string} text
 * @property {number} x
 * @property {number} y
 * @property {number} fontSize
 * @property {string} fontFamily
 * @property {string} color
 * @property {string} [backgroundColor]
 * @property {boolean} hasBackground
 * @property {boolean} hasOutline
 * @property {number} rotation
 * @property {number} scale
 */

/**
 * @typedef {Object} ProductTag
 * @property {string} id
 * @property {'product'} type
 * @property {string} productId
 * @property {string} productName
 * @property {number} productPrice
 * @property {string} productImage
 * @property {number} x
 * @property {number} y
 * @property {number} scale
 * @property {number} rotation
 */

/**
 * @typedef {Object} DrawingPath
 * @property {string} id
 * @property {Array<{x:number,y:number}>} points
 * @property {string} color
 * @property {number} size
 */
