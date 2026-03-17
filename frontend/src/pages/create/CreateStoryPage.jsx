import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Type, Tag, Check, Search, ShoppingBag } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const BG_OPTIONS = [
  { id: 'camera', label: '📷', type: 'action' },
  { id: 'gallery', label: '🖼️', type: 'action' },
  { id: 'black', label: '■', type: 'color', value: '#000000' },
  { id: 'white', label: '□', type: 'color', value: '#ffffff' },
  { id: 'crema', label: '■', type: 'color', value: '#fafaf9' },
  { id: 'oscuro', label: '■', type: 'color', value: '#1c1917' },
  { id: 'grad-stone', label: '∇', type: 'gradient', value: 'linear-gradient(135deg, #1c1917, #57534e)' },
  { id: 'grad-tierra', label: '∇', type: 'gradient', value: 'linear-gradient(135deg, #78716c, #d6d3d1)' },
];

const EMOJIS_CULINARIOS = ['🫒', '🍯', '🧀', '🥘', '🌿', '🍅', '👨‍🍳', '🥩', '🫙', '🍋', '🧅', '🫚'];

const CERTIFICACIONES = [
  '🌿 Ecológico EU',
  '🏆 DOP',
  '🥇 IGP',
  '☪️ Halal',
  '🌾 Sin gluten',
  '🌱 Vegano',
];

const FRASES = [
  'Cosecha de temporada',
  'Artesanal desde siempre',
  'Sin conservantes',
  'Directo del productor',
];

const FONTS_MAP = {
  Sans: 'var(--font-sans)',
  Serif: 'Georgia, serif',
  Mono: 'monospace',
  Display: 'Impact, sans-serif',
};

const COLOR_DOTS = ['#000000', '#ffffff', '#a8a29e', '#78716c', '#44403c'];

export default function CreateStoryPage() {
  const navigate = useNavigate();

  const [background, setBackground] = useState('black');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickerOverlays, setStickerOverlays] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [textDraft, setTextDraft] = useState('');
  const [selectedFont, setSelectedFont] = useState('Sans');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [stickerTab, setStickerTab] = useState('culinarios');
  const [publishing, setPublishing] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef({ type: null, id: null, active: false });

  // Cleanup object URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const selectedBg = BG_OPTIONS.find((b) => b.id === background);

  const getCanvasBg = () => {
    if (imagePreviewUrl) return { backgroundImage: `url(${imagePreviewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (selectedBg?.type === 'gradient') return { background: selectedBg.value };
    if (selectedBg?.type === 'color') return { background: selectedBg.value };
    return { background: '#000' };
  };

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }, []);

  const handleBgSelect = useCallback((bg) => {
    if (bg.id === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    if (bg.id === 'gallery') {
      fileInputRef.current?.click();
      return;
    }
    setBackground(bg.id);
    setImageFile(null);
    setImagePreviewUrl(null);
  }, []);

  const addTextOverlay = useCallback(() => {
    if (!textDraft.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: textDraft,
        font: selectedFont,
        color: selectedColor,
        size: textSize,
        x: 50,
        y: 50,
      },
    ]);
    setTextDraft('');
    setActivePanel(null);
  }, [textDraft, selectedFont, selectedColor, textSize]);

  const addSticker = useCallback((content, type) => {
    setStickerOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        content,
        type,
        x: 50,
        y: 50,
      },
    ]);
  }, []);

  const handleOverlayDrag = useCallback((setCollection, id, e) => {
    const touch = e.touches?.[0] || e;
    const canvas = canvasRef.current || e.currentTarget?.closest('[data-canvas]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setCollection((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : item
      )
    );
  }, []);

  // Global mouse listeners for drag so it works even when cursor leaves the element
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!dragRef.current.active) return;
      const { type, id } = dragRef.current;
      const setFn = type === 'text' ? setTextOverlays : setStickerOverlays;
      handleOverlayDrag(setFn, id, e);
    };
    const handleGlobalMouseUp = () => {
      dragRef.current = { type: null, id: null, active: false };
    };
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleOverlayDrag]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('type', 'story');
      if (imageFile) {
        fd.append('media', imageFile);
      }
      fd.append(
        'metadata',
        JSON.stringify({
          background,
          textOverlays,
          stickerOverlays,
        })
      );
      await apiClient.post('/posts', fd);
      toast.success('Historia publicada');
      navigate('/');
    } catch (err) {
      toast.error('Error al publicar la historia');
    } finally {
      setPublishing(false);
    }
  }, [imageFile, background, textOverlays, stickerOverlays, navigate]);

  return (
    <div className="fixed inset-0 z-50 bg-black font-sans flex flex-col">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* TopBar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Cerrar editor de historia"
          className="w-11 h-11 bg-transparent border-none cursor-pointer flex items-center justify-center"
        >
          <X size={22} className="text-white" />
        </button>
        <span className="text-[13px] text-white/50">Story · 24h</span>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className={`bg-stone-950 text-white border-none text-[13px] font-semibold px-4 py-2 rounded-full transition-opacity ${
            publishing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-stone-800'
          }`}
        >
          {publishing ? '...' : 'Publicar'}
        </button>
      </div>

      {/* Background selector */}
      <div className="absolute top-[52px] left-0 right-0 z-10 flex gap-2 overflow-x-auto px-4 py-2 bg-black/60 backdrop-blur-lg">
        {BG_OPTIONS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleBgSelect(bg)}
            aria-label={`Fondo: ${bg.id}`}
            className={`w-11 h-11 rounded-hs-sm shrink-0 flex items-center justify-center p-0 cursor-pointer border-2 ${
              background === bg.id ? 'border-white' : 'border-transparent'
            } ${bg.type === 'action' ? 'text-xl' : 'text-base'} ${
              bg.id === 'white' || bg.id === 'crema' ? 'text-black' : 'text-white'
            }`}
            style={{
              background:
                bg.type === 'color' || bg.type === 'gradient'
                  ? bg.value
                  : 'rgba(255,255,255,0.1)',
            }}
          >
            {bg.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center pt-[104px] px-4 pb-4">
        <div
          data-canvas
          ref={canvasRef}
          className="relative aspect-[9/16] max-h-[80vh] w-auto h-full rounded-hs-xl overflow-hidden"
          style={getCanvasBg()}
        >
          {/* Text overlays — positions must be inline (dynamic %) */}
          {textOverlays.map((t) => (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-bold cursor-grab select-none whitespace-nowrap z-[5]"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                fontSize: t.size,
                color: t.color,
                fontFamily: FONTS_MAP[t.font] || 'var(--font-sans)',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
              onTouchMove={(e) => handleOverlayDrag(setTextOverlays, t.id, e)}
              onMouseDown={() => {
                dragRef.current = { type: 'text', id: t.id, active: true };
              }}
            >
              {t.text}
            </div>
          ))}

          {/* Sticker overlays — positions must be inline (dynamic %) */}
          {stickerOverlays.map((s) => (
            <div
              key={s.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none whitespace-nowrap z-[5] font-medium ${
                s.type !== 'emoji'
                  ? 'bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm'
                  : 'text-4xl'
              }`}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
              }}
              onTouchMove={(e) => handleOverlayDrag(setStickerOverlays, s.id, e)}
              onMouseDown={() => {
                dragRef.current = { type: 'sticker', id: s.id, active: true };
              }}
            >
              {s.content}
            </div>
          ))}

          {/* Empty state */}
          {!imagePreviewUrl && textOverlays.length === 0 && stickerOverlays.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/20 text-sm">
                Añade contenido a tu historia
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right toolbar */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
        {[
          { key: 'text', icon: <Type size={20} className="text-white" />, label: 'Añadir texto' },
          { key: 'sticker', icon: <span className="text-xl">🌿</span>, label: 'Añadir sticker' },
          { key: 'product', icon: <Tag size={20} className="text-white" />, label: 'Etiquetar producto' },
        ].map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActivePanel(activePanel === tool.key ? null : tool.key)}
            aria-label={tool.label}
            aria-pressed={activePanel === tool.key}
            className={`w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center ${
              activePanel === tool.key ? 'bg-white/30' : 'bg-black/40'
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Text panel */}
      {activePanel === 'text' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 rounded-t-hs-xl z-20 flex flex-col gap-3">
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Escribe aquí..."
            rows={2}
            aria-label="Texto para la historia"
            className="bg-transparent text-white border-none text-lg outline-none resize-none font-sans w-full placeholder:text-white/30"
            autoFocus
          />

          {/* Font pills */}
          <div className="flex gap-1.5">
            {Object.keys(FONTS_MAP).map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFont(f)}
                aria-label={`Fuente ${f}`}
                aria-pressed={selectedFont === f}
                className={`border-none rounded-full px-3.5 py-2.5 text-xs font-medium cursor-pointer min-h-[44px] ${
                  selectedFont === f ? 'bg-white text-black' : 'bg-white/15 text-white'
                }`}
                style={{ fontFamily: FONTS_MAP[f] }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Color dots — background must be inline (dynamic hex) */}
          <div className="flex gap-1 items-center">
            {COLOR_DOTS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                aria-label={`Color ${c}`}
                className="w-11 h-11 rounded-full cursor-pointer p-0 shrink-0 flex items-center justify-center bg-transparent border-none"
              >
                <span
                  className={`w-7 h-7 rounded-full shrink-0 ${
                    selectedColor === c ? 'ring-[3px] ring-white ring-offset-2 ring-offset-black' : 'border-2 border-white/30'
                  }`}
                  style={{ background: c }}
                />
              </button>
            ))}
          </div>

          {/* Size slider */}
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-[11px]">A</span>
            <input
              type="range"
              min={14}
              max={48}
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="text-white text-base font-bold">A</span>
          </div>

          {/* Confirm button */}
          <button
            onClick={addTextOverlay}
            className="bg-white text-black border-none rounded-full py-3 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={16} />
            Confirmar
          </button>
        </div>
      )}

      {/* Sticker panel */}
      {activePanel === 'sticker' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 rounded-t-hs-xl z-20 flex flex-col gap-3 max-h-[50vh] overflow-auto">
          {/* Tabs */}
          <div className="flex border-b border-white/15" role="tablist" aria-label="Tipo de sticker">
            {[
              { key: 'culinarios', label: 'Culinarios' },
              { key: 'certificaciones', label: 'Certificaciones' },
              { key: 'frases', label: 'Frases' },
            ].map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={stickerTab === tab.key}
                onClick={() => setStickerTab(tab.key)}
                className={`bg-transparent border-none text-[13px] px-3.5 py-2 cursor-pointer border-b-2 ${
                  stickerTab === tab.key
                    ? 'text-white font-semibold border-white'
                    : 'text-white/40 font-normal border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Culinarios grid */}
          {stickerTab === 'culinarios' && (
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS_CULINARIOS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji, 'emoji')}
                  className="bg-white/[0.08] border-none rounded-hs-md py-2.5 text-[28px] cursor-pointer transition-colors hover:bg-white/15"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Certificaciones pills */}
          {stickerTab === 'certificaciones' && (
            <div className="flex flex-wrap gap-2">
              {CERTIFICACIONES.map((cert) => (
                <button
                  key={cert}
                  onClick={() => addSticker(cert, 'badge')}
                  className="bg-white/[0.12] text-white border border-white/20 rounded-full px-3.5 py-2 text-[13px] cursor-pointer whitespace-nowrap transition-colors hover:bg-white/20"
                >
                  {cert}
                </button>
              ))}
            </div>
          )}

          {/* Frases list */}
          {stickerTab === 'frases' && (
            <div className="flex flex-col gap-1.5">
              {FRASES.map((frase) => (
                <button
                  key={frase}
                  onClick={() => addSticker(frase, 'phrase')}
                  className="bg-white/[0.08] text-white border-none rounded-hs-md px-3.5 py-3 text-sm text-left cursor-pointer transition-colors hover:bg-white/15"
                >
                  "{frase}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product panel (placeholder) */}
      {activePanel === 'product' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 rounded-t-hs-xl z-20 flex flex-col items-center gap-3">
          <Tag size={32} className="text-white/40" />
          <span className="text-white/50 text-sm">
            Etiqueta un producto de tu tienda
          </span>
          <span className="text-white/30 text-xs">
            Próximamente
          </span>
        </div>
      )}
    </div>
  );
}
