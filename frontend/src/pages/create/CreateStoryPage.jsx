import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Type, Smile, ShoppingBag, Palette, Loader2, Timer, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

/* ─── V2 Design Tokens (inline) ──────────────────────────────── */
const V2 = {
  cream:   'var(--color-cream, #F7F6F2)',
  black:   'var(--color-black, #0A0A0A)',
  green:   'var(--color-green, #2E7D52)',
  stone:   'var(--color-stone, #8A8881)',
  border:  'var(--color-border, #E5E2DA)',
  surface: 'var(--color-surface, #F0EDE8)',
  white:   'var(--color-white, #FFFFFF)',
  radiusMd:   'var(--radius-md, 12px)',
  radiusFull: 'var(--radius-full, 9999px)',
  radiusLg:   'var(--radius-lg, 16px)',
  fontSans:   'var(--font-sans, system-ui, -apple-system, sans-serif)',
};

/* ─── Background Palettes ────────────────────────────────────── */
const BG_COLORS = [
  { id: 'black', color: '#0A0A0A' },
  { id: 'green', color: '#1a3a2a' },
  { id: 'earth', color: '#3d2b1f' },
  { id: 'cream', color: '#F7F6F2' },
  { id: 'white', color: '#FFFFFF' },
];

const BG_GRADIENTS = [
  { id: 'green-grad', from: '#0A0A0A', to: '#2E7D52' },
  { id: 'amber-grad', from: '#3d2b1f', to: '#d4a574' },
  { id: 'stone-grad', from: '#0A0A0A', to: '#8A8881' },
];

const TEXT_COLORS = [
  { id: 'white', color: '#FFFFFF' },
  { id: 'black', color: '#0A0A0A' },
  { id: 'green', color: '#2E7D52' },
  { id: 'amber', color: '#d4a574' },
  { id: 'red', color: '#b91c1c' },
];

const TEXT_SIZES = [
  { id: 'small', size: 18, label: 'S' },
  { id: 'medium', size: 28, label: 'M' },
  { id: 'large', size: 42, label: 'L' },
];

const CULINARY_STICKERS = ['🌿', '🫒', '🧀', '🍯', '🥘', '🌶️', '🍷', '👨‍🍳', '🍕', '🥑', '🍓', '😋'];

const CERT_STICKERS = [
  { emoji: '🌿', label: 'Ecológico EU' },
  { emoji: '🏆', label: 'DOP' },
  { emoji: '🥇', label: 'IGP' },
  { emoji: '☪️', label: 'Halal' },
  { emoji: '🌾', label: 'Sin gluten' },
  { emoji: '🌱', label: 'Vegano' },
];

/* ─── Product Search Modal (inline) ──────────────────────────── */
function ProductSearchModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setResults(data?.products ?? data ?? []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 350);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg"
        style={{
          background: V2.cream,
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          fontFamily: V2.fontSans,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>Etiquetar producto</span>
            <button onClick={onClose}><X size={20} style={{ color: V2.stone }} /></button>
          </div>
          <input
            value={query}
            onChange={handleChange}
            placeholder="Buscar productos…"
            className="w-full px-3 py-2 outline-none"
            style={{
              border: `1px solid ${V2.border}`,
              borderRadius: V2.radiusMd,
              fontSize: 14,
              background: V2.surface,
              color: V2.black,
              fontFamily: V2.fontSans,
            }}
          />
        </div>
        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: '50vh' }}>
          {loading && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: V2.stone }} /></div>}
          {results.map((p) => (
            <button
              key={p.id ?? p._id}
              onClick={() => { onSelect(p); onClose(); }}
              className="flex items-center gap-3 w-full py-2 px-2 text-left"
              style={{ borderBottom: `1px solid ${V2.border}` }}
            >
              {p.image_url && (
                <img src={p.image_url} alt="" className="w-10 h-10 object-cover" style={{ borderRadius: V2.radiusMd }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: V2.black }}>{p.name ?? p.title}</div>
                {p.price != null && <div style={{ fontSize: 12, color: V2.stone }}>{Number(p.price).toFixed(2)} €</div>}
              </div>
            </button>
          ))}
          {!loading && query && results.length === 0 && (
            <p className="text-center py-6" style={{ fontSize: 13, color: V2.stone }}>Sin resultados</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Helper: get background CSS ─────────────────────────────── */
function getCanvasBg(bgType, bgValue) {
  if (bgType === 'media') return '#000';
  if (bgType === 'gradient') {
    const grad = BG_GRADIENTS.find((g) => g.id === bgValue);
    return grad ? `linear-gradient(135deg, ${grad.from}, ${grad.to})` : '#0A0A0A';
  }
  const col = BG_COLORS.find((c) => c.id === bgValue);
  return col ? col.color : '#0A0A0A';
}

function isLightBg(bgType, bgValue) {
  if (bgType === 'color' && ['cream', 'white'].includes(bgValue)) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CREATE STORY PAGE                                             */
/* ═══════════════════════════════════════════════════════════════ */
export default function CreateStoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  /* ── state ─────────────────────────────────────────────────── */
  const [bgType, setBgType] = useState('color');              // color | gradient | media
  const [bgValue, setBgValue] = useState('black');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [texts, setTexts] = useState([]);                     // { id, text, x, y, size, color }
  const [stickers, setStickers] = useState([]);               // { id, emoji, x, y }
  const [taggedProduct, setTaggedProduct] = useState(null);
  const [activeTool, setActiveTool] = useState(null);         // null | text | stickers | product | bg | countdown | poll
  const [publishing, setPublishing] = useState(false);
  const [countdowns, setCountdowns] = useState([]);           // { id, title, date }
  const [polls, setPolls] = useState([]);                     // { id, question, optionA, optionB }
  const [stickerTab, setStickerTab] = useState('culinary');    // culinary | certs | phrases

  /* text tool state */
  const [textInput, setTextInput] = useState('');
  const [textSize, setTextSize] = useState('medium');
  const [textColor, setTextColor] = useState('white');

  /* countdown tool state */
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');

  /* poll tool state */
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionA, setPollOptionA] = useState('Sí 👍');
  const [pollOptionB, setPollOptionB] = useState('No 👎');

  /* ── handlers ──────────────────────────────────────────────── */
  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaUrl(URL.createObjectURL(file));
    setBgType('media');
    setActiveTool(null);
  };

  const toggleTool = (tool) => {
    if (tool === 'product') {
      setActiveTool('product');
      return;
    }
    setActiveTool((prev) => (prev === tool ? null : tool));
  };

  const addText = () => {
    if (!textInput.trim()) return;
    const sizeObj = TEXT_SIZES.find((s) => s.id === textSize);
    const colorObj = TEXT_COLORS.find((c) => c.id === textColor);
    setTexts((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: textInput,
        x: 50,
        y: 50,
        size: sizeObj?.size ?? 28,
        color: colorObj?.color ?? '#FFFFFF',
      },
    ]);
    setTextInput('');
    setActiveTool(null);
  };

  const addSticker = (emoji) => {
    setStickers((prev) => [
      ...prev,
      {
        id: Date.now(),
        emoji,
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 40,
      },
    ]);
  };

  const selectBgColor = (id) => {
    setBgType('color');
    setBgValue(id);
  };

  const selectBgGradient = (id) => {
    setBgType('gradient');
    setBgValue(id);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const fd = new FormData();
      if (mediaFile) fd.append('media', mediaFile);
      fd.append('bgType', bgType);
      fd.append('bgValue', bgValue);
      fd.append('texts', JSON.stringify(texts));
      fd.append('stickers', JSON.stringify(stickers));
      if (taggedProduct) fd.append('taggedProduct', JSON.stringify(taggedProduct.id ?? taggedProduct._id));
      await apiClient.post('/stories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Story publicada');
      navigate(-1);
    } catch (err) {
      toast.error('Error al publicar la story');
    }
    setPublishing(false);
  };

  const light = isLightBg(bgType, bgValue);
  const iconColor = light ? '#0A0A0A' : '#fff';
  const labelColor = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';

  /* ── render ────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ fontFamily: V2.fontSans }}
    >
      {/* ── progress bar ──────────────────────────────────────── */}
      <div
        className="absolute top-[env(safe-area-inset-top,0px)] left-0 right-0 z-20 mx-2 mt-1"
        style={{ height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }}
      >
        <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 1 }} />
      </div>

      {/* ── canvas background ─────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: getCanvasBg(bgType, bgValue) }}
      >
        {bgType === 'media' && mediaUrl && (
          mediaFile?.type?.startsWith('video/')
            ? <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            : <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* ── rendered texts ────────────────────────────────────── */}
      {texts.map((t) => (
        <div
          key={t.id}
          className="absolute z-10 select-none pointer-events-none"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: t.size,
            fontWeight: 700,
            color: t.color,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontFamily: V2.fontSans,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {t.text}
        </div>
      ))}

      {/* ── rendered stickers ─────────────────────────────────── */}
      {stickers.map((s) => (
        <div
          key={s.id}
          className="absolute z-10 select-none pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: 40,
          }}
        >
          {s.emoji}
        </div>
      ))}

      {/* ── rendered countdowns ─────────────────────────────── */}
      {countdowns.map(cd => (
        <div
          key={cd.id}
          className="absolute z-10 left-1/2 -translate-x-1/2"
          style={{
            top: '35%',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: V2.radiusMd,
            padding: '12px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>{cd.title}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'var(--font-mono, monospace)', letterSpacing: 2 }}>
            ⏱️ Countdown
          </p>
        </div>
      ))}

      {/* ── rendered polls ────────────────────────────────────── */}
      {polls.map(p => (
        <div
          key={p.id}
          className="absolute z-10 left-1/2 -translate-x-1/2"
          style={{
            top: '40%',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 20px',
            width: '80%',
            maxWidth: 280,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 12px' }}>{p.question}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '10px 0', borderRadius: V2.radiusFull, background: '#F0EDE8', fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>
              {p.optionA}
            </div>
            <div style={{ flex: 1, padding: '10px 0', borderRadius: V2.radiusFull, background: '#F0EDE8', fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>
              {p.optionB}
            </div>
          </div>
        </div>
      ))}

      {/* ── tagged product badge ──────────────────────────────── */}
      {taggedProduct && (
        <div
          className="absolute z-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5"
          style={{
            bottom: 140,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            borderRadius: V2.radiusFull,
          }}
        >
          <ShoppingBag size={14} color="#fff" />
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{taggedProduct.name ?? taggedProduct.title}</span>
          <button onClick={() => setTaggedProduct(null)}>
            <X size={12} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
      )}

      {/* ── top bar ───────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)]" style={{ height: 56, marginTop: 8 }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}
        >
          <X size={20} color={iconColor} />
        </button>

        <span style={{ fontSize: 11, color: labelColor, fontWeight: 500, letterSpacing: 0.5 }}>
          Tu story &middot; 24h
        </span>

        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-1.5 px-4 py-2"
          style={{
            background: '#fff',
            color: '#000',
            borderRadius: V2.radiusFull,
            fontSize: 13,
            fontWeight: 600,
            opacity: publishing ? 0.7 : 1,
          }}
        >
          {publishing && <Loader2 size={14} className="animate-spin" />}
          Publicar
        </button>
      </div>

      {/* ── text tool overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'text' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <input
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe algo…"
              className="bg-transparent text-center outline-none w-4/5"
              style={{
                fontSize: TEXT_SIZES.find((s) => s.id === textSize)?.size ?? 28,
                fontWeight: 700,
                color: TEXT_COLORS.find((c) => c.id === textColor)?.color ?? '#fff',
                fontFamily: V2.fontSans,
                caretColor: '#fff',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') addText(); }}
            />

            {/* size selector */}
            <div className="flex gap-3 mt-8">
              {TEXT_SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTextSize(s.id)}
                  className="flex items-center justify-center"
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: textSize === s.id ? '#fff' : 'rgba(255,255,255,0.2)',
                    color: textSize === s.id ? '#000' : '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* color selector */}
            <div className="flex gap-3 mt-4">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setTextColor(c.id)}
                  className="flex items-center justify-center"
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: c.color,
                    border: textColor === c.id ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                    boxShadow: textColor === c.id ? '0 0 0 2px rgba(255,255,255,0.4)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* confirm / cancel */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => { setTextInput(''); setActiveTool(null); }}
                className="px-4 py-2"
                style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={addText}
                className="px-5 py-2"
                style={{
                  background: '#fff', color: '#000',
                  borderRadius: V2.radiusFull,
                  fontSize: 14, fontWeight: 600,
                }}
              >
                Listo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── sticker panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'stickers' && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30"
            style={{
              background: V2.cream,
              borderRadius: '16px 16px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>Stickers</span>
              <button onClick={() => setActiveTool(null)}>
                <X size={20} style={{ color: V2.stone }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 mb-3">
              {[
                { id: 'culinary', label: 'Culinarios' },
                { id: 'certs', label: 'Certificaciones' },
                { id: 'phrases', label: 'Frases' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStickerTab(tab.id)}
                  style={{
                    padding: '5px 12px', borderRadius: V2.radiusFull, border: 'none',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: stickerTab === tab.id ? V2.black : V2.surface,
                    color: stickerTab === tab.id ? '#fff' : V2.black,
                    fontFamily: V2.fontSans,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {stickerTab === 'culinary' && (
              <div className="grid grid-cols-6 gap-2 px-4 pb-4">
                {CULINARY_STICKERS.map((emoji) => (
                  <button key={emoji} onClick={() => addSticker(emoji)}
                    className="flex items-center justify-center py-3"
                    style={{ fontSize: 28, background: V2.surface, borderRadius: V2.radiusMd }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {stickerTab === 'certs' && (
              <div className="flex flex-col gap-2 px-4 pb-4">
                {CERT_STICKERS.map(s => (
                  <button key={s.label} onClick={() => addSticker(s.emoji + ' ' + s.label)}
                    className="flex items-center gap-3 py-2 px-3"
                    style={{ background: V2.surface, borderRadius: V2.radiusMd, fontSize: 14, fontWeight: 500, color: V2.black, fontFamily: V2.fontSans, border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 20 }}>{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {stickerTab === 'phrases' && (
              <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                {['Cosecha de temporada', 'Artesanal desde...', 'Sin conservantes', 'Directo del productor'].map(phrase => (
                  <button key={phrase} onClick={() => {
                    setTexts(prev => [...prev, { id: Date.now(), text: phrase, x: 50, y: 45, size: 20, color: '#FFFFFF' }]);
                    setActiveTool(null);
                  }}
                    style={{ padding: '12px 8px', background: V2.surface, borderRadius: V2.radiusMd, fontSize: 12, fontWeight: 500, color: V2.black, fontFamily: V2.fontSans, border: 'none', cursor: 'pointer' }}
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── countdown modal ──────────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'countdown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-30 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setActiveTool(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: V2.white, borderRadius: 'var(--radius-xl)', padding: 24, width: '85%', maxWidth: 340, fontFamily: V2.fontSans,
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: V2.black, margin: '0 0 16px' }}>Countdown timer</p>
              <input
                value={countdownTitle} onChange={e => setCountdownTitle(e.target.value)}
                placeholder="Ej: Nueva cosecha 2026"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, fontSize: 14, fontFamily: V2.fontSans, marginBottom: 12, outline: 'none' }}
              />
              <input
                type="datetime-local"
                value={countdownDate} onChange={e => setCountdownDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, fontSize: 14, fontFamily: V2.fontSans, marginBottom: 16, outline: 'none' }}
              />
              <button
                onClick={() => {
                  if (!countdownTitle || !countdownDate) return;
                  setCountdowns(prev => [...prev, { id: Date.now(), title: countdownTitle, date: countdownDate }]);
                  setCountdownTitle(''); setCountdownDate(''); setActiveTool(null);
                }}
                style={{
                  width: '100%', height: 44, background: V2.black, color: '#fff',
                  borderRadius: V2.radiusFull, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: V2.fontSans,
                }}
              >
                Añadir countdown
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── poll modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'poll' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-30 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setActiveTool(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: V2.white, borderRadius: 'var(--radius-xl)', padding: 24, width: '85%', maxWidth: 340, fontFamily: V2.fontSans,
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: V2.black, margin: '0 0 16px' }}>Encuesta</p>
              <input
                value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Pregunta..."
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, fontSize: 14, fontFamily: V2.fontSans, marginBottom: 8, outline: 'none' }}
              />
              <input
                value={pollOptionA} onChange={e => setPollOptionA(e.target.value)}
                placeholder="Opción A"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, fontSize: 14, fontFamily: V2.fontSans, marginBottom: 8, outline: 'none' }}
              />
              <input
                value={pollOptionB} onChange={e => setPollOptionB(e.target.value)}
                placeholder="Opción B"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, fontSize: 14, fontFamily: V2.fontSans, marginBottom: 16, outline: 'none' }}
              />
              <button
                onClick={() => {
                  if (!pollQuestion) return;
                  setPolls(prev => [...prev, { id: Date.now(), question: pollQuestion, optionA: pollOptionA, optionB: pollOptionB }]);
                  setPollQuestion(''); setPollOptionA('Sí 👍'); setPollOptionB('No 👎'); setActiveTool(null);
                }}
                style={{
                  width: '100%', height: 44, background: V2.black, color: '#fff',
                  borderRadius: V2.radiusFull, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: V2.fontSans,
                }}
              >
                Añadir encuesta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── bg palette panel ──────────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'bg' && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30"
            style={{
              background: V2.cream,
              borderRadius: '16px 16px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>Fondo</span>
              <button onClick={() => setActiveTool(null)}>
                <X size={20} style={{ color: V2.stone }} />
              </button>
            </div>

            {/* solid colors */}
            <div className="px-4 mb-3">
              <span style={{ fontSize: 12, color: V2.stone, fontWeight: 500 }}>Sólidos</span>
              <div className="flex gap-3 mt-2">
                {BG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectBgColor(c.id)}
                    style={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      background: c.color,
                      border: bgType === 'color' && bgValue === c.id
                        ? '3px solid #2E7D52'
                        : `2px solid ${V2.border}`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* gradients */}
            <div className="px-4 mb-3">
              <span style={{ fontSize: 12, color: V2.stone, fontWeight: 500 }}>Degradados</span>
              <div className="flex gap-3 mt-2">
                {BG_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => selectBgGradient(g.id)}
                    style={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                      border: bgType === 'gradient' && bgValue === g.id
                        ? '3px solid #2E7D52'
                        : `2px solid ${V2.border}`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* photo/video */}
            <div className="px-4 pb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 flex items-center justify-center gap-2"
                style={{
                  border: `1px dashed ${V2.border}`,
                  borderRadius: V2.radiusMd,
                  fontSize: 13,
                  color: V2.stone,
                  fontWeight: 500,
                }}
              >
                Subir foto / vídeo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── product search modal ──────────────────────────────── */}
      <AnimatePresence>
        <ProductSearchModal
          open={activeTool === 'product'}
          onClose={() => setActiveTool(null)}
          onSelect={(p) => {
            setTaggedProduct(p);
            toast.success(`${p.name ?? p.title} etiquetado`);
          }}
        />
      </AnimatePresence>

      {/* ── floating toolbar (bottom) ─────────────────────────── */}
      {!activeTool && (
        <div
          className="absolute z-20 left-0 right-0 flex justify-center gap-4 overflow-x-auto pb-[env(safe-area-inset-bottom,16px)]"
          style={{ bottom: 16, scrollbarWidth: 'none', padding: '0 16px' }}
        >
          {[
            { id: 'text', icon: Type, label: 'Texto' },
            { id: 'stickers', icon: Smile, label: 'Stickers' },
            { id: 'product', icon: ShoppingBag, label: 'Producto' },
            { id: 'countdown', icon: Timer, label: 'Countdown' },
            { id: 'poll', icon: BarChart2, label: 'Encuesta' },
            { id: 'bg', icon: Palette, label: 'Fondo' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => toggleTool(tool.id)}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)',
                }}
              >
                <tool.icon size={20} color="#fff" />
              </div>
              <span style={{ fontSize: 10, color: labelColor }}>{tool.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* hidden file input for media */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelect}
      />
    </div>
  );
}
