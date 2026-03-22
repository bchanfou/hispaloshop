// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Sticker, Pencil, ShoppingBag, X } from 'lucide-react';
import { EDITOR_FONTS, EDITOR_COLORS, TEXT_STYLES, STICKER_CATEGORIES } from '../../utils/editor/constants';

/* ─── Types ─── */
interface TextConfig {
  font: string;
  color: string;
  size: number;
  style: 'clean' | 'box' | 'outline';
}

interface DrawConfig {
  color: string;
  width: number;
}

interface ToolPanelProps {
  onAddText: (config: TextConfig) => void;
  onAddSticker: (emoji: string) => void;
  onDrawChange?: (config: DrawConfig | null) => void;
  onProductSearch?: (query: string) => void;
  products?: Array<{ id: string; name: string; image?: string; price?: number }>;
  onAddProductSticker?: (product: { id: string; name: string; image?: string; price?: number }) => void;
}

const TOOLS = [
  { key: 'text', icon: Type, label: 'Texto' },
  { key: 'sticker', icon: Sticker, label: 'Stickers' },
  { key: 'draw', icon: Pencil, label: 'Dibujar' },
  { key: 'product', icon: ShoppingBag, label: 'Producto' },
] as const;

type ToolKey = typeof TOOLS[number]['key'];

const panelVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

/* ─── Main Component ─── */
export default function ToolPanel({ onAddText, onAddSticker, onDrawChange, onProductSearch, products = [], onAddProductSticker }: ToolPanelProps) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  const handleToolTap = useCallback((key: ToolKey) => {
    setActiveTool((prev) => {
      const next = prev === key ? null : key;
      // If closing draw tool, notify parent
      if (prev === 'draw' && next !== 'draw') {
        onDrawChange?.(null);
      }
      return next;
    });
  }, [onDrawChange]);

  const handleClose = useCallback(() => {
    if (activeTool === 'draw') onDrawChange?.(null);
    setActiveTool(null);
  }, [activeTool, onDrawChange]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
      {/* Active tool panel */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            key={activeTool}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="pointer-events-auto bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] px-4 pt-3 pb-2 mb-0"
          >
            {/* Close button */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-stone-900">
                {TOOLS.find((t) => t.key === activeTool)?.label}
              </span>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-stone-100 transition-colors"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {activeTool === 'text' && <TextToolPanel onAddText={onAddText} />}
            {activeTool === 'sticker' && <StickerToolPanel onAddSticker={onAddSticker} />}
            {activeTool === 'draw' && <DrawToolPanel onDrawChange={onDrawChange} />}
            {activeTool === 'product' && (
              <ProductToolPanel
                onProductSearch={onProductSearch}
                products={products}
                onAddProductSticker={onAddProductSticker}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool selector bar */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border-t border-stone-100 px-4 py-2.5 flex justify-around">
        {TOOLS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleToolTap(key)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
              activeTool === key
                ? 'bg-stone-950 text-white'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Text Tool ─── */
function TextToolPanel({ onAddText }: { onAddText: (config: TextConfig) => void }) {
  const [font, setFont] = useState(EDITOR_FONTS[0].family);
  const [color, setColor] = useState(EDITOR_COLORS[0]);
  const [size, setSize] = useState(24);
  const [style, setStyle] = useState<TextConfig['style']>('clean');

  const handleAdd = () => {
    onAddText({ font, color, size, style });
  };

  return (
    <div className="space-y-4">
      {/* Font selector */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">Fuente</label>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {EDITOR_FONTS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFont(f.family)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors ${
                font === f.family
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              style={{ fontFamily: f.family }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">Color</label>
        <div className="flex gap-2.5">
          {EDITOR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === c ? 'border-stone-950 scale-110' : 'border-stone-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Size slider */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">
          Tamano <span className="text-stone-400">{size}px</span>
        </label>
        <input
          type="range"
          min={12}
          max={72}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full accent-stone-950"
        />
      </div>

      {/* Style selector */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">Estilo</label>
        <div className="flex gap-2">
          {TEXT_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-xl text-sm capitalize transition-colors ${
                style === s
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {s === 'clean' ? 'Limpio' : s === 'box' ? 'Caja' : 'Contorno'}
            </button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="w-full py-2.5 bg-stone-950 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors"
      >
        Anadir texto
      </button>
    </div>
  );
}

/* ─── Sticker Tool ─── */
function StickerToolPanel({ onAddSticker }: { onAddSticker: (emoji: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0].key);
  const category = STICKER_CATEGORIES.find((c) => c.key === activeCategory) || STICKER_CATEGORIES[0];

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-6 gap-1">
        {category.emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onAddSticker(emoji)}
            className="text-2xl p-2 rounded-xl hover:bg-stone-100 active:scale-90 transition-all"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Draw Tool ─── */
function DrawToolPanel({ onDrawChange }: { onDrawChange?: (config: DrawConfig | null) => void }) {
  const [color, setColor] = useState(EDITOR_COLORS[1]); // default black
  const [width, setWidth] = useState(3);

  useEffect(() => {
    onDrawChange?.({ color, width });
  }, [color, width, onDrawChange]);

  return (
    <div className="space-y-4">
      {/* Color picker */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">Color</label>
        <div className="flex gap-2.5">
          {EDITOR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === c ? 'border-stone-950 scale-110' : 'border-stone-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Width slider */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1.5 block">
          Grosor <span className="text-stone-400">{width}px</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={20}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="flex-1 accent-stone-950"
          />
          {/* Preview dot */}
          <div
            className="rounded-full shrink-0"
            style={{ width: `${width}px`, height: `${width}px`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Product Tool ─── */
function ProductToolPanel({
  onProductSearch,
  products = [],
  onAddProductSticker,
}: {
  onProductSearch?: (query: string) => void;
  products?: Array<{ id: string; name: string; image?: string; price?: number }>;
  onAddProductSticker?: (product: { id: string; name: string; image?: string; price?: number }) => void;
}) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => {
        onProductSearch?.(value);
      }, 300);
    }
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full px-3 py-2.5 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
        />
      </div>

      {/* Product results */}
      <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-none">
        {products.length === 0 && query.length >= 2 && (
          <p className="text-xs text-stone-400 text-center py-4">Sin resultados</p>
        )}
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddProductSticker?.(product)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-10 h-10 rounded-xl object-cover bg-stone-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                <ShoppingBag size={16} className="text-stone-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{product.name}</p>
              {product.price != null && (
                <p className="text-xs text-stone-500">{product.price.toFixed(2)} EUR</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
