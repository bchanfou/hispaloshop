import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Film, ChevronRight, Music, Sparkles, ShoppingBag,
  Play, Pause, Loader2, Hash, Tag, Image as ImageIcon,
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

/* ─── Product Search Modal (inline) ──────────────────────────── */
function ProductSearchModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setResults(data?.products ?? data ?? []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

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
            onChange={(e) => setQuery(e.target.value)}
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

/* ─── Duration Pills ─────────────────────────────────────────── */
const DURATIONS = [15, 30, 60];

function DurationPills({ value, onChange }) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
      {DURATIONS.map((d) => {
        const active = value === d;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 36,
              borderRadius: V2.radiusFull,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: V2.fontSans,
              background: active ? '#fff' : 'rgba(255,255,255,0.25)',
              color: active ? '#000' : '#fff',
              transition: 'all 0.2s',
            }}
          >
            {d}s
          </button>
        );
      })}
    </div>
  );
}

/* ─── Right Toolbar (edit step) ──────────────────────────────── */
function EditToolbar({ onProductTag }) {
  const tools = [
    { icon: Music, label: 'Música', action: () => toast('Música — próximamente') },
    { icon: Sparkles, label: 'Efectos', action: () => toast('Efectos — próximamente') },
    { icon: ShoppingBag, label: 'Producto', action: onProductTag },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-10">
      {tools.map((t) => (
        <button
          key={t.label}
          onClick={t.action}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
            }}
          >
            <t.icon size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CREATE REEL PAGE                                              */
/* ═══════════════════════════════════════════════════════════════ */
export default function CreateReelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /* ── state ─────────────────────────────────────────────────── */
  const [step, setStep] = useState('upload');         // upload | edit | details
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [coverThumb, setCoverThumb] = useState(null);

  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  /* ── helpers ───────────────────────────────────────────────── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Selecciona un archivo de vídeo');
      return;
    }
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('edit');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  /* generate cover thumbnail from first frame */
  const generateCover = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    setCoverThumb(canvas.toDataURL('image/jpeg', 0.8));
  }, []);

  useEffect(() => {
    if (step === 'edit' && videoRef.current) {
      const v = videoRef.current;
      const onLoaded = () => { generateCover(); };
      v.addEventListener('loadeddata', onLoaded);
      return () => v.removeEventListener('loadeddata', onLoaded);
    }
  }, [step, generateCover]);

  const goToDetails = () => {
    if (!videoFile) return;
    generateCover();
    setStep('details');
  };

  const handlePublish = async () => {
    if (!videoFile) return;
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      fd.append('caption', caption);
      fd.append('duration', duration);
      fd.append('taggedProducts', JSON.stringify(taggedProducts.map((p) => p.id ?? p._id)));
      await apiClient.post('/reels', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Reel publicado');
      navigate(-1);
    } catch (err) {
      toast.error('Error al publicar el reel');
    }
    setPublishing(false);
  };

  const removeProduct = (id) => {
    setTaggedProducts((prev) => prev.filter((p) => (p.id ?? p._id) !== id));
  };

  /* ── UPLOAD STEP ───────────────────────────────────────────── */
  if (step === 'upload') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: V2.black, fontFamily: V2.fontSans }}
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)]" style={{ height: 56 }}>
          <button onClick={() => navigate(-1)}>
            <X size={24} color="#fff" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Nuevo reel</span>
          <div style={{ width: 24 }} />
        </div>

        {/* drop zone */}
        <div className="flex-1 flex items-center justify-center relative px-4">
          <DurationPills value={duration} onChange={setDuration} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4"
            style={{
              width: '70%',
              aspectRatio: '9/16',
              maxHeight: '60vh',
              border: '2px dashed rgba(255,255,255,0.3)',
              borderRadius: V2.radiusLg,
            }}
          >
            <Film size={48} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5, padding: '0 16px' }}>
              Arrastra un vídeo o toca para seleccionar
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* camera hint */}
        {hasMediaRecorder && (
          <div className="pb-6 flex justify-center">
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Grabación de cámara próximamente
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ── EDIT STEP ─────────────────────────────────────────────── */
  if (step === 'edit') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: V2.black, fontFamily: V2.fontSans }}
      >
        {/* video preview */}
        <div className="absolute inset-0" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            playsInline
            loop
          />
          <canvas ref={canvasRef} className="hidden" />
          <AnimatePresence>
            {!playing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.45)' }}
                >
                  <Play size={28} color="#fff" fill="#fff" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)]" style={{ height: 56 }}>
          <button
            onClick={() => { setStep('upload'); setVideoFile(null); setVideoUrl(null); setPlaying(false); }}
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}
          >
            <X size={20} color="#fff" />
          </button>
          <button
            onClick={goToDetails}
            className="flex items-center gap-1 px-4 py-2"
            style={{
              background: '#fff',
              color: '#000',
              borderRadius: V2.radiusFull,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>

        {/* right toolbar */}
        <EditToolbar onProductTag={() => setProductModalOpen(true)} />

        {/* product search modal */}
        <AnimatePresence>
          <ProductSearchModal
            open={productModalOpen}
            onClose={() => setProductModalOpen(false)}
            onSelect={(p) => {
              if (!taggedProducts.find((t) => (t.id ?? t._id) === (p.id ?? p._id))) {
                setTaggedProducts((prev) => [...prev, p]);
              }
              toast.success(`${p.name ?? p.title} etiquetado`);
            }}
          />
        </AnimatePresence>
      </div>
    );
  }

  /* ── DETAILS STEP ──────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: V2.cream, fontFamily: V2.fontSans }}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)]" style={{ height: 56 }}>
        <button onClick={() => setStep('edit')}>
          <X size={24} style={{ color: V2.black }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>Detalles del reel</span>
        <div style={{ width: 24 }} />
      </div>

      <div className="flex-1 px-4 pb-8">
        {/* cover thumbnail */}
        <div className="flex gap-4 mb-6">
          <div
            className="relative shrink-0 overflow-hidden"
            style={{ width: 100, height: 160, borderRadius: V2.radiusMd, background: V2.surface }}
          >
            {coverThumb ? (
              <img src={coverThumb} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={24} style={{ color: V2.stone }} />
              </div>
            )}
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5"
              style={{ background: 'rgba(0,0,0,0.6)', borderRadius: V2.radiusFull, fontSize: 10, color: '#fff' }}
            >
              Portada
            </div>
          </div>

          {/* caption */}
          <div className="flex-1">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribe un pie de foto… #hashtags"
              rows={6}
              className="w-full resize-none outline-none p-3"
              style={{
                border: `1px solid ${V2.border}`,
                borderRadius: V2.radiusMd,
                fontSize: 14,
                background: V2.white,
                color: V2.black,
                fontFamily: V2.fontSans,
              }}
            />
          </div>
        </div>

        {/* duration badge */}
        <div className="mb-4 flex items-center gap-2">
          <span style={{ fontSize: 13, color: V2.stone }}>Duración seleccionada:</span>
          <span
            className="px-3 py-1"
            style={{
              background: V2.surface,
              borderRadius: V2.radiusFull,
              fontSize: 13,
              fontWeight: 600,
              color: V2.black,
            }}
          >
            {duration}s
          </span>
        </div>

        {/* tagged products */}
        {taggedProducts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} style={{ color: V2.stone }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: V2.black }}>Productos etiquetados</span>
            </div>
            <div className="flex flex-col gap-2">
              {taggedProducts.map((p) => (
                <div
                  key={p.id ?? p._id}
                  className="flex items-center gap-3 px-3 py-2"
                  style={{ border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, background: V2.white }}
                >
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="w-8 h-8 object-cover" style={{ borderRadius: 8 }} />
                  )}
                  <span className="flex-1 truncate" style={{ fontSize: 13, color: V2.black }}>{p.name ?? p.title}</span>
                  <button onClick={() => removeProduct(p.id ?? p._id)}>
                    <X size={16} style={{ color: V2.stone }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* publish button */}
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 py-3.5"
          style={{
            background: publishing ? V2.stone : V2.black,
            color: V2.white,
            borderRadius: V2.radiusFull,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: V2.fontSans,
            opacity: publishing ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {publishing ? <Loader2 size={18} className="animate-spin" /> : null}
          {publishing ? 'Publicando…' : 'Publicar reel'}
        </button>
      </div>
    </div>
  );
}
