// Tipos para el Editor de Contenido Hispaloshop

export type ContentType = 'post' | 'reel' | 'story';

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

export interface EditorImage {
  id: string;
  src: string;
  file: File;
  type: 'image' | 'video';
  thumbnail?: string;
}

export interface FilterSettings {
  brightness: number;      // -100 a +100
  contrast: number;        // -100 a +100
  saturate: number;        // 0 a 200 (100 = normal)
  warmth: number;          // -100 a +100
  sharpness: number;       // 0 a 100
  exposure: number;        // -100 a +100
}

export interface PredefinedFilter {
  id: string;
  name: string;
  settings: FilterSettings;
  preview?: string;
}

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;        // 12-72px
  fontFamily: FontFamily;
  color: string;
  backgroundColor?: string;
  hasBackground: boolean;
  hasOutline: boolean;
  rotation: number;
  scale: number;
}

export type FontFamily = 
  | 'sans'           // Sans moderno
  | 'serif'          // Serif elegante  
  | 'handwritten'    // Handwritten artesanal
  | 'bold'           // Bold impacto
  | 'minimal';       // Minimal

export interface StickerElement {
  id: string;
  type: StickerType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  content?: string;        // Para stickers editables (precio, texto)
}

export type StickerType =
  | 'price'           // Etiqueta precio
  | 'new'             // Badge "Nuevo"
  | 'offer'           // Flame "Oferta"
  | 'vegan'           // Icono vegano
  | 'organic'         // Icono orgánico
  | 'gluten-free'     // Icono sin gluten
  | 'local'           // Icono local
  | 'hashtag'         // Hashtag sugerido
  | 'mention'         // Mención @usuario
  | 'location'        // Ubicación 📍
  | 'link'            // Link "Desliza arriba"
  | 'product';        // Tag producto

export interface ProductTag extends StickerElement {
  type: 'product';
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface CanvasState {
  images: EditorImage[];
  currentImageIndex: number;
  filterSettings: FilterSettings;
  appliedFilter: string | null;
  textElements: TextElement[];
  stickerElements: (StickerElement | ProductTag)[];
  drawingPaths: DrawingPath[];
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  rotation: number;        // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
  zoom: number;            // 0.5 a 3.0
  pan: { x: number; y: number };
}

export interface PublishData {
  caption: string;
  hashtags: string[];
  location?: string;
  altText?: string;
  scheduledAt?: Date;
  taggedProducts: ProductTag[];
}

export interface ProductForTag {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  category?: string;
}

export const ASPECT_RATIOS: Record<ContentType, AspectRatio[]> = {
  post: ['1:1', '4:5', '16:9'],
  reel: ['9:16'],
  story: ['9:16'],
};

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

export const PREDEFINED_FILTERS: PredefinedFilter[] = [
  {
    id: 'natural',
    name: 'Natural',
    settings: { brightness: 0, contrast: 0, saturate: 100, warmth: 0, sharpness: 0, exposure: 0 }
  },
  {
    id: 'warm',
    name: 'Cálido',
    settings: { brightness: 5, contrast: 10, saturate: 110, warmth: 25, sharpness: 10, exposure: 5 }
  },
  {
    id: 'fresh',
    name: 'Fresco',
    settings: { brightness: 10, contrast: 5, saturate: 120, warmth: -15, sharpness: 15, exposure: 10 }
  },
  {
    id: 'artisan',
    name: 'Artesanal',
    settings: { brightness: -5, contrast: 20, saturate: 90, warmth: 15, sharpness: 20, exposure: 0 }
  },
  {
    id: 'soft',
    name: 'Suave',
    settings: { brightness: 15, contrast: -10, saturate: 80, warmth: 10, sharpness: 0, exposure: 10 }
  },
  {
    id: 'vivid',
    name: 'Vívido',
    settings: { brightness: 5, contrast: 15, saturate: 140, warmth: 5, sharpness: 25, exposure: 5 }
  },
  {
    id: 'night',
    name: 'Nocturno',
    settings: { brightness: -10, contrast: 25, saturate: 70, warmth: -20, sharpness: 15, exposure: -10 }
  },
  {
    id: 'classic',
    name: 'Clásico',
    settings: { brightness: 0, contrast: 30, saturate: 0, warmth: 0, sharpness: 20, exposure: 0 }
  },
];

export const FONT_OPTIONS: { id: FontFamily; name: string; className: string }[] = [
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

// Mock products para etiquetado
export const MOCK_PRODUCTS: ProductForTag[] = [
  { id: "1", name: "Aceite de Oliva Virgen Extra", price: 12.90, image: "/mock/aceite.jpg", seller: "Cortijo Andaluz", category: "aceites" },
  { id: "2", name: "Queso Manchego Curado", price: 18.50, image: "/mock/queso.jpg", seller: "La Antigua", category: "quesos" },
  { id: "3", name: "Miel de Romero Ecológica", price: 8.90, image: "/mock/miel.jpg", seller: "Apicola del Sur", category: "mieles" },
  { id: "4", name: "Jamón Ibérico de Bellota", price: 45.00, image: "/mock/jamon.jpg", seller: "Embutidos Reyes", category: "embutidos" },
  { id: "5", name: "Vino Tinto Rioja Reserva", price: 22.90, image: "/mock/vino.jpg", seller: "Bodegas Solar", category: "vinos" },
  { id: "6", name: "Pan Artesanal de Centeno", price: 4.50, image: "/mock/pan.jpg", seller: "Panadería La Flor", category: "panaderia" },
];
