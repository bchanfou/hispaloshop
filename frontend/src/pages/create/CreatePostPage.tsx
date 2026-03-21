// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Image, Check, Type, Crop, Sliders, Search, MapPin, Globe, Lock, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { label: 'Sans', value: 'inherit, sans-serif' },
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

const DEFAULT_ADJUSTMENTS = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, shadows: 0, highlights: 0, sharpness: 0, vignette: 0 };

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
  const [stepDirection, setStepDirection] = useState(1); // 1 = forward, -1 = backward
  const goToStep = (target) => {
    setStepDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const stepVariants = {
    enter: (dir) => ({ x: dir > 0 ? '30%' : '-30%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-30%' : '30%', opacity: 0 }),
  };
  const stepTransition = { type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] };

  /* --- step 1 state --- */
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploadTab, setUploadTab] = useState('foto');

  /* --- step 2 state --- */
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);

  /* --- per-image filter settings (carousel) --- */
  const [perImageFilters, setPerImageFilters] = useState({});
  const prevPreviewIndexRef = useRef(0);

  // Save current image's filter settings when switching images
  useEffect(() => {
    const prevIdx = prevPreviewIndexRef.current;
    if (prevIdx !== previewIndex && selectedFiles.length > 1) {
      setPerImageFilters((prev) => ({
        ...prev,
        [prevIdx]: { activeFilter, filterIntensity, adjustments },
      }));
      // Load new image's settings (or defaults)
      const saved = perImageFilters[previewIndex];
      if (saved) {
        setActiveFilter(saved.activeFilter);
        setFilterIntensity(saved.filterIntensity);
        setAdjustments(saved.adjustments);
      } else {
        setActiveFilter(FILTERS[0]);
        setFilterIntensity(100);
        setAdjustments(DEFAULT_ADJUSTMENTS);
      }
    }
    prevPreviewIndexRef.current = previewIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewIndex]);
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
  const [hideLikes, setHideLikes] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  /* --- auto-save draft --- */
  const [draftBanner, setDraftBanner] = useState(false);
  const draftDebounceRef = useRef(null);

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

  /* ── draft: check on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('post_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      const age = Date.now() - (draft.savedAt || 0);
      if (age < 24 * 60 * 60 * 1000 && draft.caption) {
        setDraftBanner(true);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── draft: auto-save on caption / file changes ── */
  useEffect(() => {
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      try {
        if (caption || selectedFiles.length) {
          localStorage.setItem('post_draft', JSON.stringify({
            caption,
            fileCount: selectedFiles.length,
            savedAt: Date.now(),
          }));
        }
      } catch { /* quota exceeded or private mode */ }
    }, 2000);
    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [caption, selectedFiles]);

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
      if (hideLikes) fd.append('hide_likes', 'true');
      if (disableComments) fd.append('disable_comments', 'true');

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

      // Clear draft on successful publish
      try { localStorage.removeItem('post_draft'); } catch { /* ignore */ }

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
    if (textOverlays.length >= 10) return;
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

  /* ══════════════════════ RENDER ══════════════════════ */
  const hasFiles = selectedFiles.length > 0;

  const renderStep1 = () => (
      <div className="bg-black flex flex-col" style={{ fontFamily: 'inherit', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', width: '100%', height: '100%' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 52 }}>
          <button
            onClick={() => {
              if (hasFiles && !window.confirm('¿Salir sin publicar? Se perderá el contenido.')) return;
              navigate(-1);
            }}
            className="bg-transparent border-none cursor-pointer p-1"
            aria-label="Cerrar"
          >
            <X size={22} className="text-white" />
          </button>
          <span className="text-white text-[15px] font-medium tracking-tight">Nueva publicación</span>
          <button
            disabled={!hasFiles}
            onClick={() => goToStep(2)}
            className="bg-transparent border-none cursor-pointer text-[13px] font-semibold text-white transition-opacity"
            style={{ opacity: hasFiles ? 1 : 0.35 }}
          >
            Siguiente →
          </button>
        </div>

        {hasFiles ? (
          <>
            {/* Preview image */}
            <div className="relative flex-1 flex items-center justify-center bg-[#111] overflow-hidden shrink-0" style={{ maxHeight: '52vh' }}>
              <img src={previewUrls[previewIndex]} alt="" className="w-full h-full object-cover" />
              {selectedFiles.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {previewIndex + 1} / {selectedFiles.length}
                </div>
              )}
            </div>

            {/* Reorder strip */}
            {selectedFiles.length > 1 && (
              <div className="bg-black/80 px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0">
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
                      setSelectedFiles((prev) => { const arr = [...prev]; const [moved] = arr.splice(from, 1); arr.splice(i, 0, moved); return arr; });
                      setPreviewIndex(i);
                    }}
                    onClick={() => setPreviewIndex(i)}
                    className="relative shrink-0 cursor-grab overflow-hidden rounded-lg transition-transform"
                    style={{ width: 44, height: 44, border: previewIndex === i ? '2px solid #fff' : '2px solid transparent' }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-stone-950 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i)); if (previewIndex >= selectedFiles.length - 1) setPreviewIndex(Math.max(0, selectedFiles.length - 2)); }}
                      aria-label={`Quitar imagen ${i + 1}`}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] border-none cursor-pointer flex items-center justify-center p-0"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom action bar — add more media */}
            <div className="bg-black/80 px-4 py-3 flex items-center justify-between shrink-0">
              <span className="text-white/40 text-xs font-medium">{selectedFiles.length} / 10</span>
              <div className="flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-none text-[12px] font-medium py-2 px-3.5 rounded-full cursor-pointer transition-colors min-h-[40px]"
                >
                  <Camera size={15} /> Foto
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-none text-[12px] font-medium py-2 px-3.5 rounded-full cursor-pointer transition-colors min-h-[40px]"
                >
                  <Image size={15} /> Galería
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Tabs — Foto / Galería */}
            <div className="flex gap-2 justify-center px-4 pb-4 pt-2">
              {['foto', 'galeria'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUploadTab(tab)}
                  className={`border-none rounded-full px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors min-h-[44px] ${
                    uploadTab === tab ? 'bg-white text-black' : 'bg-transparent text-white/60'
                  }`}
                >
                  {tab === 'foto' ? 'Foto' : 'Galería'}
                </button>
              ))}
            </div>

            {/* Center content */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              {uploadTab === 'foto'
                ? <Camera size={48} className="text-white/25" />
                : <Image size={48} className="text-white/25" />
              }
              <span className="text-base text-white font-medium">
                {uploadTab === 'foto' ? 'Toma una foto' : 'Selecciona imágenes'}
              </span>
              <span className="text-xs text-white/40 text-center">
                {uploadTab === 'foto' ? 'Captura directamente desde tu cámara' : 'Hasta 10 imágenes · JPG, PNG o WebP'}
              </span>
              <button
                onClick={() =>
                  uploadTab === 'foto' ? cameraInputRef.current?.click() : fileInputRef.current?.click()
                }
                className="bg-white text-black border-none text-sm font-semibold py-3 px-7 rounded-full cursor-pointer mt-2 transition-all hover:bg-white/90 active:scale-95 min-h-[44px]"
                aria-label={uploadTab === 'foto' ? 'Abrir cámara para tomar foto' : 'Elegir imágenes de la galería'}
              >
                {uploadTab === 'foto' ? 'Abrir cámara' : 'Elegir de la galería'}
              </button>
            </div>
          </>
        )}

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
      </div>
  );

  const renderStep2 = () => {
    const tabs = [
      { key: 'filtros', label: 'Filtros', icon: Sliders },
      { key: 'ajustes', label: 'Ajustes', icon: Sliders },
      { key: 'texto', label: 'Texto', icon: Type },
      { key: 'recorte', label: 'Recorte', icon: Crop },
    ];

    const previewAspect = aspectRatio.value || 'auto';

    return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
        {/* top bar */}
        <div style={{ background: 'rgba(0,0,0,0.8)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <button onClick={() => goToStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={18} /> Volver
          </button>
          <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: 500 }}>Editar</span>
          <button onClick={() => goToStep(3)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter.name}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ width: '100%', height: '100%' }}
              >
                <img
                  src={previewUrls[previewIndex]}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: filterCSS }}
                />
              </motion.div>
            </AnimatePresence>
            {/* filter name overlay */}
            <AnimatePresence>
              {showFilterName && activeFilter.name !== 'Natural' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 16px', borderRadius: '9999px', fontSize: 13, fontWeight: 600, pointerEvents: 'none', zIndex: 3 }}
                >
                  {activeFilter.emoji} {activeFilter.name}
                </motion.div>
              )}
            </AnimatePresence>
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
                    borderRadius: '9999px',
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

        {/* carousel image selector */}
        {selectedFiles.length > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', background: 'rgba(0,0,0,0.6)', flexShrink: 0 }}>
            {previewUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: previewIndex === i ? '2px solid #fff' : '2px solid transparent',
                  opacity: previewIndex === i ? 1 : 0.55,
                  transition: 'all 0.15s ease',
                }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

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
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: activeFilter.name === f.name ? '2px solid #ffffff' : '2px solid transparent',
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
              {textOverlays.length < 10 && (
                <button
                  onClick={addTextOverlay}
                  style={{
                    alignSelf: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px dashed rgba(255,255,255,0.3)',
                    borderRadius: '12px',
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
                <div key={o.id} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                          border: o.color === c.value ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.3)',
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
                          borderRadius: '9999px',
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
                    borderRadius: '9999px',
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
  };

  const renderStep3 = () => (
    <div style={{ width: '100%', height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* top bar */}
      <div style={{ background: '#ffffff', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #e7e5e4', flexShrink: 0 }}>
        <button onClick={() => goToStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0c0a09', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={18} /> Volver
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#0c0a09', fontSize: 15, fontWeight: 500 }}>Nueva publicación</span>
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
                  borderRadius: '12px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: previewIndex === i ? '2px solid #0c0a09' : '2px solid transparent',
                }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* draft banner */}
        {draftBanner && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '10px 14px',
            marginBottom: 12,
            background: '#f5f5f4',
            borderRadius: '14px',
            border: '1px solid #e7e5e4',
            fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 13, color: '#0c0a09', fontWeight: 500 }}>
              Tienes un borrador guardado
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    const raw = localStorage.getItem('post_draft');
                    if (raw) {
                      const draft = JSON.parse(raw);
                      if (draft.caption) setCaption(draft.caption);
                    }
                  } catch { /* ignore */ }
                  setDraftBanner(false);
                }}
                style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Restaurar
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem('post_draft'); } catch { /* ignore */ }
                  setDraftBanner(false);
                }}
                style={{ fontSize: 13, color: '#78716c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Descartar
              </button>
            </div>
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
              fontFamily: 'inherit',
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
            placeholder="Escribe tu pie de foto... Usa # para hashtags y @ para menciones"
            style={{
              width: '100%',
              border: '1.5px solid #e7e5e4',
              borderRadius: '12px',
              padding: 12,
              resize: 'none',
              minHeight: 80,
              fontSize: 14,
              fontFamily: 'inherit',
              lineHeight: '1.5',
              outline: 'none',
              boxSizing: 'border-box',
              overflow: 'hidden',
              background: 'transparent',
              position: 'relative',
              caretColor: '#0c0a09',
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: caption.length > 2000 ? '#0c0a09' : '#78716c', fontWeight: caption.length > 2000 ? 600 : 400 }}>
            {caption.length} / 2200
          </span>
        </div>

        {/* AI suggest */}
        <button
          onClick={async () => {
            if (aiLoading) return;
            setAiLoading(true);
            try {
              const res = await apiClient.post('/ai/suggest-content', {
                context: caption || 'publicación de producto gourmet',
                type: 'caption',
              });
              const suggestion = res?.suggestion || res?.data?.suggestion || res?.text || res?.data?.text;
              if (suggestion) {
                setCaption((prev) => prev ? `${prev}\n\n${suggestion}` : suggestion);
                toast.success('Sugerencia añadida');
              } else {
                toast.error('No se pudo generar una sugerencia');
              }
            } catch {
              toast.error('Error al conectar con David AI');
            } finally {
              setAiLoading(false);
            }
          }}
          disabled={aiLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f5f5f4',
            color: '#0c0a09',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: '9999px',
            padding: '8px 16px',
            border: 'none',
            cursor: aiLoading ? 'wait' : 'pointer',
            marginBottom: 16,
            opacity: aiLoading ? 0.6 : 1,
          }}
        >
          <Sparkles size={14} style={{ marginRight: 6, flexShrink: 0 }} /> {aiLoading ? 'Generando...' : 'Sugerir con David AI'}
        </button>

        {/* tag products */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowProductSearch(true)}
            style={{
              background: '#f5f5f4',
              color: '#0c0a09',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
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
                    background: '#f5f5f4',
                    border: '1px solid #e7e5e4',
                    borderRadius: '9999px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '10px 12px' }}>
            <MapPin size={16} color="#78716c" style={{ flexShrink: 0 }} />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Añadir ubicación... (ej. Galicia, Costa Brava)"
              aria-label="Ubicación"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent' }}
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
                borderRadius: '9999px',
                border: audience === 'public' ? '2px solid #0c0a09' : '1.5px solid #e7e5e4',
                background: audience === 'public' ? '#0c0a09' : 'transparent',
                color: audience === 'public' ? '#fff' : '#0c0a09',
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
                borderRadius: '9999px',
                border: audience === 'followers' ? '2px solid #0c0a09' : '1.5px solid #e7e5e4',
                background: audience === 'followers' ? '#0c0a09' : 'transparent',
                color: audience === 'followers' ? '#fff' : '#0c0a09',
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

        {/* advanced settings */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#0c0a09' }}>Ocultar recuento de «Me gusta»</span>
            <input
              type="checkbox"
              checked={hideLikes}
              onChange={(e) => setHideLikes(e.target.checked)}
              style={{ accentColor: '#0c0a09', width: 18, height: 18 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#0c0a09' }}>Desactivar comentarios</span>
            <input
              type="checkbox"
              checked={disableComments}
              onChange={(e) => setDisableComments(e.target.checked)}
              style={{ accentColor: '#0c0a09', width: 18, height: 18 }}
            />
          </label>
        </div>
      </div>

      {/* product search modal */}
      {showProductSearch && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', width: '100%', maxHeight: '70vh', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e7e5e4', gap: 8 }}>
              <Search size={18} color="#78716c" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                aria-label="Buscar producto para etiquetar"
                autoFocus
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
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
                    borderBottom: '1px solid #e7e5e4',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                  }}
                >
                  {p.image && <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: '12px', objectFit: 'cover' }} />}
                  <span>{p.name || p.title}</span>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p style={{ textAlign: 'center', color: '#78716c', fontSize: 13, padding: 20 }}>Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish success overlay */}
      {publishSuccess && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0c0a09', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <Check size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#0c0a09' }}>¡Publicado!</span>
        </div>
      )}

      {/* fixed publish button */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
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
            background: '#0c0a09',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            padding: 14,
            borderRadius: '9999px',
            border: 'none',
            cursor: publishing ? 'default' : 'pointer',
            opacity: publishing ? 0.8 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!publishing) e.currentTarget.style.background = '#292524'; }}
          onMouseLeave={(e) => { if (!publishing) e.currentTarget.style.background = '#0c0a09'; }}
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

  const steps = { 1: renderStep1, 2: renderStep2, 3: renderStep3 };

  return (
    <AnimatePresence mode="wait" custom={stepDirection}>
      <motion.div
        key={step}
        custom={stepDirection}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={stepTransition}
        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        className="lg:max-w-[480px] lg:mx-auto"
      >
        {steps[step]()}
      </motion.div>
    </AnimatePresence>
  );
}
