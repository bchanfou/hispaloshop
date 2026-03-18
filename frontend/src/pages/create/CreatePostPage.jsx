import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Image, Check, Type, Crop, Sliders, Search, MapPin, Globe, Lock, Camera, Sparkles } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

/* ───────────────────────── constants ───────────────────────── */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per image
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const FILTERS = [
  { name: 'Natural', emoji: '✨', css: 'none' },
  { name: 'Amanecer', emoji: '🌅', css: 'sepia(0.25) saturate(1.3) brightness(1.08)' },
  { name: 'Lonja', emoji: '🌊', css: 'hue-rotate(10deg) saturate(1.15) brightness(1.05) contrast(1.05)' },
  { name: 'Huerta', emoji: '🌿', css: 'saturate(1.35) contrast(1.05) brightness(1.03)' },
  { name: 'Miel', emoji: '🍯', css: 'sepia(0.2) saturate(1.2) brightness(1.1)' },
  { name: 'Trufa', emoji: '🌑', css: 'contrast(1.25) brightness(0.88) saturate(1.1)' },
  { name: 'Mate', emoji: '🪨', css: 'saturate(0.75) brightness(1.1) contrast(0.95)' },
  { name: 'Antiguo', emoji: '📜', css: 'sepia(0.45) saturate(0.8) brightness(1.05)' },
];

const FONT_OPTIONS = [
  { label: 'Sans', value: 'var(--font-sans), sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Display', value: 'Impact, sans-serif' },
];

const COLOR_DOTS = [
  { label: 'Negro', value: '#0c0a09' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Piedra', value: '#a8a29e' },
  { label: 'Grafito', value: '#44403c' },
  { label: 'Crema', value: '#fafaf9' },
];

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '16:9', value: 16 / 9 },
];

const CROP_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '9:16', value: 9 / 16 },
  { label: 'Original', value: null },
];

/* ───────────────────────── helpers ──────────────────────────── */

function buildFilterCSS(activeFilter, filterIntensity, adjustments) {
  const parts = [];

  // core adjustments
  const br = 1 + adjustments.brightness / 100;
  const co = 1 + adjustments.contrast / 100;
  const sa = 1 + adjustments.saturation / 100;
  parts.push(`brightness(${br})`);
  parts.push(`contrast(${co})`);
  parts.push(`saturate(${sa})`);

  // warmth via sepia + hue-rotate
  if (adjustments.warmth > 0) {
    parts.push(`sepia(${(adjustments.warmth / 200).toFixed(3)})`);
  } else if (adjustments.warmth < 0) {
    parts.push(`hue-rotate(${Math.round(adjustments.warmth * 0.2)}deg)`);
  }

  // named filter blended by intensity (scale individual filter values)
  if (activeFilter.css !== 'none' && filterIntensity > 0) {
    const ratio = filterIntensity / 100;
    const scaled = activeFilter.css.replace(
      /(\w+)\(([^)]+)\)/g,
      (_, fn, val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return `${fn}(${val})`;
        const identity = fn === 'sepia' || fn === 'hue-rotate' ? 0 : 1;
        const blended = identity + (num - identity) * ratio;
        const unit = val.includes('deg') ? 'deg' : '';
        return `${fn}(${blended.toFixed(3)}${unit})`;
      }
    );
    parts.push(scaled);
  }

  return parts.join(' ');
}

function buildVignetteStyle(vignette) {
  if (!vignette) return {};
  const strength = vignette / 100;
  return {
    boxShadow: `inset 0 0 ${60 + strength * 80}px ${10 + strength * 30}px rgba(0,0,0,${(strength * 0.6).toFixed(2)})`,
    pointerEvents: 'none',
  };
}

/* ───────────────────────── component ───────────────────────── */

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* --- shared state --- */
  const [step, setStep] = useState(1);

  /* --- step 1 state --- */
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  /* --- step 2 state --- */
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0, warmth: 0, shadows: 0, highlights: 0, sharpness: 0, vignette: 0 });
  const [textOverlays, setTextOverlays] = useState([]);
  const [textStyle, setTextStyle] = useState('clean');
  const [activeTab, setActiveTab] = useState('filtros');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);

  /* --- step 3 state --- */
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('public'); // 'public' | 'followers'

  /* --- upload progress --- */
  const [uploadProgress, setUploadProgress] = useState(0);

  /* --- filter swipe state --- */
  const filterSwipeRef = useRef({ startX: 0 });
  const [showFilterName, setShowFilterName] = useState(false);

  /* --- dragging text state --- */
  const dragRef = useRef(null);

  /* ── file handling ── */
  const handleFiles = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate each file
    const valid = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es un formato válido. Usa JPG, PNG o WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" supera los 20 MB permitidos.`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, 10);
      if (merged.length >= 10 && valid.length > merged.length - prev.length) {
        toast('Máximo 10 imágenes por publicación', { duration: 3000 });
      }
      return merged;
    });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  useEffect(() => {
    // build object URLs
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    if (selectedFiles.length && previewIndex >= selectedFiles.length) {
      setPreviewIndex(0);
    }
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles]);

  /* ── product search ── */
  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await apiClient.get(`/products/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res?.results || res?.data?.results || res?.data || (Array.isArray(res) ? res : []));
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    if (!showProductSearch) return;
    const t = setTimeout(() => searchProducts(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, showProductSearch, searchProducts]);

  /* ── filter name overlay ── */
  useEffect(() => {
    setShowFilterName(true);
    const t = setTimeout(() => setShowFilterName(false), 1200);
    return () => clearTimeout(t);
  }, [activeFilter]);

  /* ── publish ── */
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handlePublish = async () => {
    if (publishing || !selectedFiles.length) return;
    setPublishing(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      selectedFiles.forEach((f) => fd.append('files', f));
      fd.append('caption', caption);
      if (taggedProducts.length) fd.append('tagged_products_json', JSON.stringify(taggedProducts.map((p) => ({ product_id: p.id }))));
      if (selectedFiles.length > 1) fd.append('post_type', 'carousel');
      if (location.trim()) fd.append('location', location.trim());
      if (audience) fd.append('audience', audience);

      // Upload with progress tracking
      const res = await apiClient.post('/posts', fd, {
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setUploadProgress(100);
      const postId = res?.id || res?.post?.id || res?.data?.id;

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);

      // Show success animation before redirecting
      setPublishSuccess(true);
      setTimeout(() => {
        toast.success('Publicación creada', {
          action: postId ? { label: 'Ver en el feed', onClick: () => navigate(`/posts/${postId}`) } : undefined,
          duration: 4000,
        });
        navigate(postId ? `/posts/${postId}` : '/');
      }, 800);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Error al publicar. Comprueba tu conexión e inténtalo de nuevo.';
      toast.error(msg, { duration: 5000 });
      setPublishing(false);
      setUploadProgress(0);
    }
  };

  /* ── text overlay helpers ── */
  const addTextOverlay = () => {
    if (textOverlays.length >= 3) return;
    setTextOverlays((prev) => [
      ...prev,
      { id: Date.now(), text: 'Texto', x: 50, y: 50, font: FONT_OPTIONS[0].value, color: '#ffffff', size: 24, style: textStyle },
    ]);
  };

  const updateOverlay = (id, patch) => {
    setTextOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  /* ── drag text (perf: direct DOM during drag, state sync on end) ── */
  const rafRef = useRef(null);

  /* ── cleanup on unmount ── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      dragRef.current = null;
    };
  }, []);

  const handleDragStart = (e, overlay) => {
    e.preventDefault();
    const el = e.currentTarget;
    const container = el.parentElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id: overlay.id, el, startX: clientX, startY: clientY, origX: overlay.x, origY: overlay.y, w: rect.width, h: rect.height, lastX: overlay.x, lastY: overlay.y };
    el.style.willChange = 'left, top';

    const move = (ev) => {
      if (!dragRef.current) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const nx = Math.min(95, Math.max(5, dragRef.current.origX + ((cx - dragRef.current.startX) / dragRef.current.w) * 100));
      const ny = Math.min(95, Math.max(5, dragRef.current.origY + ((cy - dragRef.current.startY) / dragRef.current.h) * 100));
      dragRef.current.lastX = nx;
      dragRef.current.lastY = ny;
      // Direct DOM update — no React re-render
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (dragRef.current?.el) {
          dragRef.current.el.style.left = nx + '%';
          dragRef.current.el.style.top = ny + '%';
        }
      });
    };
    const up = () => {
      cancelAnimationFrame(rafRef.current);
      if (dragRef.current) {
        const { id, lastX, lastY, el: dragEl } = dragRef.current;
        dragEl.style.willChange = '';
        updateOverlay(id, { x: lastX, y: lastY }); // single state sync
      }
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
  };

  /* ── computed filter string ── */
  const filterCSS = buildFilterCSS(activeFilter, filterIntensity, adjustments);

  /* ══════════════════════ STEP 1 ══════════════════════ */
  if (step === 1) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
        {/* top bar */}
        <div style={{ background: 'rgba(0,0,0,0.8)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => {
            if (selectedFiles.length > 0 || caption.trim()) {
              if (!window.confirm('¿Salir sin publicar? Se perderá el contenido.')) return;
            }
            navigate(-1);
          }} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={22} color="#fff" />
          </button>
          <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: 500 }}>Nueva publicación</span>
          <button
            disabled={!selectedFiles.length}
            onClick={() => setStep(2)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-white)', opacity: selectedFiles.length ? 1 : 0.4 }}
          >
            Siguiente →
          </button>
        </div>

        {/* preview */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', aspectRatio: '1/1', maxHeight: '45vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
        >
          {previewUrls[previewIndex] ? (
            <img src={previewUrls[previewIndex]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Image size={48} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Toca para añadir foto</span>
            </div>
          )}
        </div>

        {/* gallery bar */}
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
            {selectedFiles.length > 0 ? `${selectedFiles.length} seleccionada${selectedFiles.length > 1 ? 's' : ''}` : 'Recientes'} ▼
          </span>
          <button onClick={() => cameraInputRef.current?.click()} aria-label="Abrir cámara" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Camera size={18} className="text-white" /></button>
        </div>

        {/* Reorder strip — shows selected images as draggable thumbnails */}
        {selectedFiles.length > 1 && (
          <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px 16px 8px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {previewUrls.map((url, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                  if (isNaN(from) || from === i) return;
                  setSelectedFiles((prev) => {
                    const arr = [...prev];
                    const [moved] = arr.splice(from, 1);
                    arr.splice(i, 0, moved);
                    return arr;
                  });
                  setPreviewIndex(i);
                }}
                onClick={() => setPreviewIndex(i)}
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'grab',
                  border: previewIndex === i ? '2px solid #fff' : '2px solid transparent',
                }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#0c0a09',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                    if (previewIndex >= selectedFiles.length - 1) setPreviewIndex(Math.max(0, selectedFiles.length - 2));
                  }}
                  aria-label={`Quitar imagen ${i + 1}`}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    fontSize: 10,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* gallery grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {previewUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                style={{ position: 'relative', aspectRatio: '1/1', cursor: 'pointer', overflow: 'hidden' }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === previewIndex && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={22} color="var(--color-white)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* hidden inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} style={{ display: 'none' }} />
      </div>
    );
  }

  /* ══════════════════════ STEP 2 ══════════════════════ */
  if (step === 2) {
    const tabs = [
      { key: 'filtros', label: 'Filtros', icon: Sliders },
      { key: 'ajustes', label: 'Ajustes', icon: Sliders },
      { key: 'texto', label: 'Texto', icon: Type },
      { key: 'recorte', label: 'Recorte', icon: Crop },
    ];

    const previewAspect = aspectRatio.value || 'auto';

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
        {/* top bar */}
        <div style={{ background: 'rgba(0,0,0,0.8)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={18} /> Volver
          </button>
          <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: 500 }}>Editar</span>
          <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-white)' }}>
            Siguiente →
          </button>
        </div>

        {/* preview area */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', flexShrink: 0, maxHeight: '50%', overflow: 'hidden' }}>
          <div
            style={{ position: 'relative', width: '100%', aspectRatio: previewAspect, maxHeight: '100%', overflow: 'hidden' }}
            onTouchStart={(e) => { filterSwipeRef.current.startX = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - filterSwipeRef.current.startX;
              if (Math.abs(dx) < 40) return;
              const currentIdx = FILTERS.findIndex(f => f.name === activeFilter.name);
              if (dx < 0 && currentIdx < FILTERS.length - 1) {
                setActiveFilter(FILTERS[currentIdx + 1]);
              } else if (dx > 0 && currentIdx > 0) {
                setActiveFilter(FILTERS[currentIdx - 1]);
              }
            }}
          >
            <img
              src={previewUrls[previewIndex]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: filterCSS, transition: 'filter 0.2s' }}
            />
            {/* filter name overlay */}
            {showFilterName && activeFilter.name !== 'Natural' && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, pointerEvents: 'none', zIndex: 3 }}>
                {activeFilter.emoji} {activeFilter.name}
              </div>
            )}
            {/* vignette overlay */}
            {adjustments.vignette > 0 && (
              <div style={{ position: 'absolute', inset: 0, ...buildVignetteStyle(adjustments.vignette) }} />
            )}
            {/* text overlays */}
            {textOverlays.map((o) => (
              <div
                key={o.id}
                onMouseDown={(e) => handleDragStart(e, o)}
                onTouchStart={(e) => handleDragStart(e, o)}
                style={{
                  position: 'absolute',
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  transform: 'translate(-50%,-50%)',
                  fontFamily: o.font,
                  fontSize: o.size,
                  color: o.style === 'outline' ? 'transparent' : o.color,
                  cursor: 'grab',
                  userSelect: 'none',
                  textShadow: o.style === 'box' || o.style === 'outline' ? 'none' : '0 1px 4px rgba(0,0,0,0.6)',
                  fontWeight: 600,
                  ...(o.style === 'box' ? { background: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: 6 } : {}),
                  ...(o.style === 'outline' ? { WebkitTextStroke: `2px ${o.color}` } : {}),
                }}
              >
                {o.text}
              </div>
            ))}

            {/* aspect ratio pills */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.label}
                  onClick={() => setAspectRatio(ar)}
                  style={{
                    background: aspectRatio.label === ar.label ? '#fff' : 'rgba(0,0,0,0.5)',
                    color: aspectRatio.label === ar.label ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.key ? '2px solid #fff' : '2px solid transparent',
                color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.5)',
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {/* ─── Filtros ─── */}
          {activeTab === 'filtros' && (
            <div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12 }}>
                {FILTERS.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => { setActiveFilter(f); if (navigator.vibrate) navigator.vibrate(10); }}
                    style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: activeFilter.name === f.name ? '2px solid var(--color-white)' : '2px solid transparent',
                        transition: 'border-color 0.15s, transform 0.15s',
                        transform: activeFilter.name === f.name ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {previewUrls[previewIndex] && (
                        <img src={previewUrls[previewIndex]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css === 'none' ? 'none' : f.css }} loading="lazy" />
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4, display: 'block' }}>{f.emoji} {f.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', minWidth: 60 }}>Intensidad</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#0c0a09' }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>{filterIntensity}</span>
              </div>
            </div>
          )}

          {/* ─── Ajustes ─── */}
          {activeTab === 'ajustes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'brightness', label: 'Brillo', min: -100, max: 100 },
                { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
                { key: 'saturation', label: 'Saturación', min: -100, max: 100 },
                { key: 'warmth', label: 'Temperatura', min: -100, max: 100 },
                { key: 'shadows', label: 'Sombras', min: -100, max: 100 },
                { key: 'highlights', label: 'Altas luces', min: -100, max: 100 },
                { key: 'sharpness', label: 'Nitidez', min: 0, max: 100 },
                { key: 'vignette', label: 'Viñeteado', min: 0, max: 100 },
              ].map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', minWidth: 72 }}>{s.label}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={adjustments[s.key]}
                    onChange={(e) => setAdjustments((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                    onDoubleClick={() => setAdjustments((p) => ({ ...p, [s.key]: 0 }))}
                    title="Doble clic para resetear"
                    style={{ flex: 1, accentColor: '#0c0a09' }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>{adjustments[s.key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* ─── Texto ─── */}
          {activeTab === 'texto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {textOverlays.length < 3 && (
                <button
                  onClick={addTextOverlay}
                  style={{
                    alignSelf: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px dashed rgba(255,255,255,0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    padding: '10px 20px',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Type size={14} /> + Añadir texto
                </button>
              )}

              {textOverlays.map((o) => (
                <div key={o.id} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={o.text}
                      onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                      style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', padding: '4px 8px', fontSize: 13, outline: 'none' }}
                    />
                    <button onClick={() => removeOverlay(o.id)} aria-label="Eliminar texto" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} color="rgba(255,255,255,0.5)" />
                    </button>
                  </div>
                  {/* fonts */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => updateOverlay(o.id, { font: f.value })}
                        style={{
                          background: o.font === f.value ? '#fff' : 'rgba(255,255,255,0.15)',
                          color: o.font === f.value ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: f.value,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {/* colors */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {COLOR_DOTS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateOverlay(o.id, { color: c.value })}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: c.value,
                          border: o.color === c.value ? '2px solid var(--color-white)' : '2px solid rgba(255,255,255,0.3)',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  {/* text style */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { key: 'clean', label: 'Limpio' },
                      { key: 'box', label: 'Caja' },
                      { key: 'outline', label: 'Contorno' },
                    ].map((s) => (
                      <button
                        key={s.key}
                        onClick={() => updateOverlay(o.id, { style: s.key })}
                        aria-pressed={o.style === s.key}
                        style={{
                          flex: 1,
                          background: o.style === s.key ? '#fff' : 'rgba(255,255,255,0.15)',
                          color: o.style === s.key ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px 0',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        <span style={s.key === 'outline' ? { WebkitTextStroke: '1px currentColor', color: 'transparent' } : s.key === 'box' ? { background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: 3 } : {}}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* size */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Tamaño</span>
                    <input
                      type="range"
                      min={14}
                      max={48}
                      value={o.size}
                      onChange={(e) => updateOverlay(o.id, { size: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: '#0c0a09' }}
                    />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{o.size}px</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Recorte ─── */}
          {activeTab === 'recorte' && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {CROP_RATIOS.map((cr) => (
                <button
                  key={cr.label}
                  onClick={() => {
                    if (cr.value) setAspectRatio(cr);
                    else setAspectRatio({ label: 'Original', value: null });
                  }}
                  style={{
                    background: aspectRatio.label === cr.label ? '#fff' : 'rgba(255,255,255,0.12)',
                    color: aspectRatio.label === cr.label ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {cr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════ STEP 3 ══════════════════════ */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--color-white)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
      {/* top bar */}
      <div style={{ background: 'var(--color-white)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-black)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={18} /> Volver
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: 'var(--color-black)', fontSize: 15, fontWeight: 500 }}>Nueva publicación</span>
        <div style={{ width: 60 }} />
      </div>

      {/* scroll content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 100 }}>
        {/* thumbnail row */}
        {selectedFiles.length > 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
            {previewUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: previewIndex === i ? '2px solid var(--color-black)' : '2px solid transparent',
                }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* caption with hashtag/mention highlighting */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          {/* Highlight backdrop — mirrors textarea text with colored tokens */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: 12,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              color: 'transparent',
              pointerEvents: 'none',
              boxSizing: 'border-box',
              border: '1.5px solid transparent',
            }}
          >
            {caption.split(/(#\w+|@\w+)/g).map((part, i) =>
              part.startsWith('#') ? (
                <span key={i} style={{ color: '#78716c', fontWeight: 600 }}>{part}</span>
              ) : part.startsWith('@') ? (
                <span key={i} style={{ color: '#57534e', fontWeight: 600 }}>{part}</span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>
          <textarea
            value={caption}
            onChange={(e) => {
              const v = e.target.value.slice(0, 2200);
              setCaption(v);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            aria-label="Descripción de la publicación"
            placeholder="Escribe una descripción..."
            style={{
              width: '100%',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              resize: 'none',
              minHeight: 80,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              lineHeight: '1.5',
              outline: 'none',
              boxSizing: 'border-box',
              overflow: 'hidden',
              background: 'transparent',
              position: 'relative',
              caretColor: '#0c0a09',
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: caption.length > 2000 ? '#0c0a09' : 'var(--color-stone)', fontWeight: caption.length > 2000 ? 600 : 400 }}>
            {caption.length} / 2200
          </span>
        </div>

        {/* AI suggest */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-surface-alt, #f5f5f4)',
            color: 'var(--color-black)',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 'var(--radius-full)',
            padding: '8px 16px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <Sparkles size={14} style={{ marginRight: 6, flexShrink: 0 }} /> Sugerir con David AI
        </button>

        {/* tag products */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowProductSearch(true)}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-black)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            🏷️ Etiquetar producto
          </button>

          {/* tagged chips */}
          {taggedProducts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {taggedProducts.map((p) => (
                <span
                  key={p.id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 10px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {p.name}
                  <button
                    onClick={() => setTaggedProducts((prev) => prev.filter((x) => x.id !== p.id))}
                    aria-label={`Quitar ${p.name}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* location */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
            <MapPin size={16} color="var(--color-stone)" style={{ flexShrink: 0 }} />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Añadir ubicación... (ej. Galicia, Costa Brava)"
              aria-label="Ubicación"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font-sans)', background: 'transparent' }}
            />
          </div>
        </div>

        {/* audience toggle */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setAudience('public')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 0',
                borderRadius: 'var(--radius-full)',
                border: audience === 'public' ? '2px solid var(--color-black)' : '1.5px solid var(--color-border)',
                background: audience === 'public' ? 'var(--color-black)' : 'transparent',
                color: audience === 'public' ? '#fff' : 'var(--color-black)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Globe size={14} /> Público
            </button>
            <button
              onClick={() => setAudience('followers')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 0',
                borderRadius: 'var(--radius-full)',
                border: audience === 'followers' ? '2px solid var(--color-black)' : '1.5px solid var(--color-border)',
                background: audience === 'followers' ? 'var(--color-black)' : 'transparent',
                color: audience === 'followers' ? '#fff' : 'var(--color-black)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Lock size={14} /> Solo seguidores
            </button>
          </div>
        </div>
      </div>

      {/* product search modal */}
      {showProductSearch && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-white)', width: '100%', maxHeight: '70vh', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', gap: 8 }}>
              <Search size={18} color="var(--color-stone)" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                aria-label="Buscar producto para etiquetar"
                autoFocus
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-sans)' }}
              />
              <button onClick={() => { setShowProductSearch(false); setSearchQuery(''); setSearchResults([]); }} aria-label="Cerrar búsqueda" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (taggedProducts.length < 5 && !taggedProducts.find((t) => t.id === p.id)) {
                      setTaggedProducts((prev) => [...prev, { id: p.id, name: p.name || p.title }]);
                    }
                    setShowProductSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 8px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                  }}
                >
                  {p.image && <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />}
                  <span>{p.name || p.title}</span>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-stone)', fontSize: 13, padding: 20 }}>Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish success overlay */}
      {publishSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'var(--color-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <Check size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)' }}>¡Publicado!</span>
        </div>
      )}

      {/* fixed publish button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
        {/* Upload progress bar */}
        {publishing && uploadProgress > 0 && uploadProgress < 100 && (
          <div style={{ width: '100%', height: 3, background: '#e7e5e4', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#0c0a09', borderRadius: 2, width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
          </div>
        )}
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%',
            background: 'var(--color-black)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            padding: 14,
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: publishing ? 'default' : 'pointer',
            opacity: publishing ? 0.8 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => { if (!publishing) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { if (!publishing) e.currentTarget.style.opacity = '1'; }}
        >
          {publishing && (
            <span
              style={{
                width: 18,
                height: 18,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          )}
          {publishing
            ? uploadProgress < 100
              ? `Subiendo... ${uploadProgress}%`
              : 'Procesando...'
            : 'Publicar ahora'}
        </button>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>
    </div>
  );
}
