// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Image, Check, Type, Crop, Sliders, Search, MapPin, Globe, Lock, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

/* ───────────────────────── constants ───────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per image (must match backend limit)
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
  const [publishError, setPublishError] = useState(false);
  const abortControllerRef = useRef(null);
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
        toast.error(`"${file.name}" supera los 10 MB permitidos.`);
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
      const res = await apiClient.get(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(Array.isArray(res) ? res : res?.products || []);
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

  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPublishing(false);
    setUploadProgress(0);
    toast('Subida cancelada');
  }, []);

  const handlePublish = async () => {
    if (publishing) return;
    if (!selectedFiles.length && !caption.trim()) {
      toast.error('Añade al menos una imagen o escribe algo');
      return;
    }
    if (caption.length > 2200) {
      toast.error('La descripción es demasiado larga');
      return;
    }
    if (!selectedFiles.length) return;
    setPublishing(true);
    setPublishError(false);
    setUploadProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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

      // Upload with progress tracking + abort signal
      const res = await apiClient.post('/posts', fd, {
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setUploadProgress(100);
      abortControllerRef.current = null;
      const postId = res?.id || res?.post?.id || res?.data?.id;

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);

      // Clear draft on successful publish
      try { localStorage.removeItem('post_draft'); } catch { /* ignore */ }

      // Show success animation before redirecting
      setPublishing(false);
      setPublishSuccess(true);
      setTimeout(() => {
        toast.success('Publicación creada', {
          action: postId ? { label: 'Ver en el feed', onClick: () => navigate(`/posts/${postId}`) } : undefined,
          duration: 4000,
        });
        navigate(postId ? `/posts/${postId}` : '/');
      }, 800);
    } catch (err) {
      abortControllerRef.current = null;
      // If user cancelled, don't show error
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Error al publicar. Comprueba tu conexión e inténtalo de nuevo.';
      toast.error(msg, { duration: 5000 });
      setPublishing(false);
      setPublishError(true);
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
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
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  /* ── computed filter string (memoized) ── */
  const filterCSS = useMemo(() => buildFilterCSS(activeFilter, filterIntensity, adjustments), [activeFilter, filterIntensity, adjustments]);

  /* ══════════════════════ RENDER ══════════════════════ */
  const hasFiles = selectedFiles.length > 0;

  const renderStep1 = () => (
      <div className="bg-black flex flex-col w-full h-full" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 shrink-0 h-[52px]">
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
            <div className="relative flex-1 flex items-center justify-center bg-[#111] overflow-hidden shrink-0 max-h-[52vh]">
              <img src={previewUrls[previewIndex]} alt={`Imagen ${previewIndex + 1} de ${selectedFiles.length}`} className="w-full h-full object-cover" />
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
                    className="relative shrink-0 cursor-grab overflow-hidden rounded-xl transition-transform w-11 h-11"
                    style={{ border: previewIndex === i ? '2px solid #fff' : '2px solid transparent' }}
                  >
                    <img src={url} alt={`Imagen ${i + 1} de ${selectedFiles.length}`} className="w-full h-full object-cover" />
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-stone-950 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); const removeIdx = i; setSelectedFiles((prev) => prev.filter((_, idx) => idx !== removeIdx)); setPreviewIndex((prev) => { const newLen = selectedFiles.length - 1; if (newLen <= 0) return 0; if (removeIdx < prev) return prev - 1; if (prev >= newLen) return newLen - 1; return prev; }); }}
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
      <div className="w-full h-full bg-black flex flex-col">
        {/* top bar */}
        <div className="bg-black/80 h-[52px] flex items-center px-4 shrink-0">
          <button onClick={() => goToStep(1)} className="bg-transparent border-none cursor-pointer text-white text-[13px] font-medium flex items-center gap-1">
            <ChevronLeft size={18} /> Volver
          </button>
          <span className="flex-1 text-center text-white text-[15px] font-medium">Editar</span>
          <button onClick={() => goToStep(3)} className="bg-transparent border-none cursor-pointer text-[13px] font-semibold text-white">
            Siguiente →
          </button>
        </div>

        {/* preview area */}
        <div className="relative w-full flex justify-center items-center bg-[#111] shrink-0 max-h-[50%] overflow-hidden">
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: previewAspect, maxHeight: '100%' }}
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
                className="w-full h-full"
              >
                <img
                  src={previewUrls[previewIndex]}
                  alt={`Vista previa con filtro ${activeFilter.name}`}
                  className="w-full h-full object-cover"
                  style={{ filter: filterCSS }}
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
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white px-4 py-1.5 rounded-full text-[13px] font-semibold pointer-events-none z-[3]"
                >
                  {activeFilter.emoji} {activeFilter.name}
                </motion.div>
              )}
            </AnimatePresence>
            {/* vignette overlay */}
            {adjustments.vignette > 0 && (
              <div className="absolute inset-0" style={buildVignetteStyle(adjustments.vignette)} />
            )}
            {/* text overlays — dynamic positions require inline style */}
            {textOverlays.map((o) => (
              <div
                key={o.id}
                onMouseDown={(e) => handleDragStart(e, o)}
                onTouchStart={(e) => handleDragStart(e, o)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none font-semibold touch-none"
                style={{
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  fontFamily: o.font,
                  fontSize: o.size,
                  color: o.style === 'outline' ? 'transparent' : o.color,
                  textShadow: o.style === 'box' || o.style === 'outline' ? 'none' : '0 1px 4px rgba(0,0,0,0.6)',
                  ...(o.style === 'box' ? { background: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: 6 } : {}),
                  ...(o.style === 'outline' ? { WebkitTextStroke: `2px ${o.color}` } : {}),
                }}
              >
                {o.text}
              </div>
            ))}

            {/* aspect ratio pills */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.label}
                  onClick={() => setAspectRatio(ar)}
                  className={`border-none rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    aspectRatio.label === ar.label
                      ? 'bg-white text-black'
                      : 'bg-black/50 text-white'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* carousel image selector */}
        {selectedFiles.length > 1 && (
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto bg-black/60 shrink-0">
            {previewUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                className="w-11 h-11 rounded-[10px] overflow-hidden shrink-0 cursor-pointer transition-all duration-150"
                style={{
                  border: previewIndex === i ? '2px solid #fff' : '2px solid transparent',
                  opacity: previewIndex === i ? 1 : 0.55,
                }}
              >
                <img src={url} alt={`Imagen ${i + 1} de ${selectedFiles.length}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* tabs */}
        <div className="flex border-b border-white/15 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 bg-transparent border-none py-2.5 text-xs font-medium cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === t.key
                  ? 'text-white border-b-2 border-b-white'
                  : 'text-white/50 border-b-2 border-b-transparent'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* ─── Filtros ─── */}
          {activeTab === 'filtros' && (
            <div>
              <div className="flex gap-2.5 overflow-x-auto pb-3">
                {FILTERS.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => { setActiveFilter(f); if (navigator.vibrate) navigator.vibrate(10); }}
                    className="shrink-0 cursor-pointer text-center"
                  >
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden transition-all duration-150"
                      style={{
                        border: activeFilter.name === f.name ? '2px solid #ffffff' : '2px solid transparent',
                        transform: activeFilter.name === f.name ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {previewUrls[previewIndex] && (
                        <img src={previewUrls[previewIndex]} alt={f.name} className="w-full h-full object-cover" style={{ filter: f.css === 'none' ? 'none' : f.css }} loading="lazy" />
                      )}
                    </div>
                    <span className="text-[10px] text-white/70 mt-1 block">{f.emoji} {f.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5 py-1">
                <span className="text-xs text-white/60 min-w-[60px]">Intensidad</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(Number(e.target.value))}
                  className="flex-1 accent-stone-950"
                />
                <span className="text-xs text-white/50 min-w-[28px] text-right">{filterIntensity}</span>
              </div>
            </div>
          )}

          {/* ─── Ajustes ─── */}
          {activeTab === 'ajustes' && (
            <div className="flex flex-col gap-3.5">
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
                <div key={s.key} className="flex items-center gap-2.5">
                  <span className="text-xs text-white/70 min-w-[72px]">{s.label}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={adjustments[s.key]}
                    onChange={(e) => setAdjustments((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                    onDoubleClick={() => setAdjustments((p) => ({ ...p, [s.key]: 0 }))}
                    title="Doble clic para resetear"
                    className="flex-1 accent-stone-950"
                  />
                  <span className="text-xs text-white/50 min-w-[28px] text-right">{adjustments[s.key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* ─── Texto ─── */}
          {activeTab === 'texto' && (
            <div className="flex flex-col gap-3.5">
              {textOverlays.length < 10 && (
                <button
                  onClick={addTextOverlay}
                  className="self-center bg-white/10 border border-dashed border-white/30 rounded-xl text-white px-5 py-2.5 text-[13px] cursor-pointer flex items-center gap-1.5"
                >
                  <Type size={14} /> + Añadir texto
                </button>
              )}

              {textOverlays.map((o) => (
                <div key={o.id} className="bg-white/[0.08] rounded-xl p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={o.text}
                      onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                      className="flex-1 bg-transparent border border-white/20 rounded text-white px-2 py-1 text-[13px] outline-none"
                    />
                    <button onClick={() => removeOverlay(o.id)} aria-label="Eliminar texto" className="bg-transparent border-none cursor-pointer">
                      <X size={16} className="text-white/50" />
                    </button>
                  </div>
                  {/* fonts */}
                  <div className="flex gap-1.5">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => updateOverlay(o.id, { font: f.value })}
                        className={`border-none rounded px-2 py-0.5 text-[11px] cursor-pointer ${
                          o.font === f.value
                            ? 'bg-white text-black'
                            : 'bg-white/15 text-white'
                        }`}
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {/* colors */}
                  <div className="flex gap-2">
                    {COLOR_DOTS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateOverlay(o.id, { color: c.value })}
                        className="w-[22px] h-[22px] rounded-full cursor-pointer p-0"
                        style={{
                          background: c.value,
                          border: o.color === c.value ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </div>
                  {/* text style */}
                  <div className="flex gap-1.5">
                    {[
                      { key: 'clean', label: 'Limpio' },
                      { key: 'box', label: 'Caja' },
                      { key: 'outline', label: 'Contorno' },
                    ].map((s) => (
                      <button
                        key={s.key}
                        onClick={() => updateOverlay(o.id, { style: s.key })}
                        aria-pressed={o.style === s.key}
                        className={`flex-1 border-none rounded-full py-1.5 text-[11px] font-semibold cursor-pointer transition-colors duration-150 ${
                          o.style === s.key
                            ? 'bg-white text-black'
                            : 'bg-white/15 text-white'
                        }`}
                      >
                        <span style={s.key === 'outline' ? { WebkitTextStroke: '1px currentColor', color: 'transparent' } : s.key === 'box' ? { background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: 3 } : {}}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* size */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/60">Tamaño</span>
                    <input
                      type="range"
                      min={14}
                      max={48}
                      value={o.size}
                      onChange={(e) => updateOverlay(o.id, { size: Number(e.target.value) })}
                      className="flex-1 accent-stone-950"
                    />
                    <span className="text-[11px] text-white/50">{o.size}px</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Recorte ─── */}
          {activeTab === 'recorte' && (
            <div className="flex gap-2 justify-center flex-wrap">
              {CROP_RATIOS.map((cr) => (
                <button
                  key={cr.label}
                  onClick={() => {
                    if (cr.value) setAspectRatio(cr);
                    else setAspectRatio({ label: 'Original', value: null });
                  }}
                  className={`border-none rounded-full px-[18px] py-2 text-[13px] font-medium cursor-pointer ${
                    aspectRatio.label === cr.label
                      ? 'bg-white text-black'
                      : 'bg-white/[0.12] text-white'
                  }`}
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
    <div className="w-full h-full bg-white flex flex-col">
      {/* top bar */}
      <div className="bg-white h-[52px] flex items-center px-4 border-b border-stone-200 shrink-0">
        <button onClick={() => goToStep(2)} className="bg-transparent border-none cursor-pointer text-stone-950 text-[13px] font-medium flex items-center gap-1">
          <ChevronLeft size={18} /> Volver
        </button>
        <span className="flex-1 text-center text-stone-950 text-[15px] font-medium">Nueva publicación</span>
        <div className="w-[60px]" />
      </div>

      {/* scroll content */}
      <div className="flex-1 overflow-y-auto p-4 pb-[100px]">
        {/* thumbnail row */}
        {selectedFiles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto mb-4">
            {previewUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                className="w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0 cursor-pointer"
                style={{ border: previewIndex === i ? '2px solid #0c0a09' : '2px solid transparent' }}
              >
                <img src={url} alt={`Imagen ${i + 1} de ${selectedFiles.length}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* draft banner */}
        {draftBanner && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 mb-3 bg-stone-100 rounded-[14px] border border-stone-200">
            <span className="text-[13px] text-stone-950 font-medium">
              Tienes un borrador guardado
            </span>
            <div className="flex gap-2 shrink-0">
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
                className="text-[13px] font-semibold text-stone-950 bg-transparent border-none cursor-pointer p-0"
              >
                Restaurar
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem('post_draft'); } catch { /* ignore */ }
                  setDraftBanner(false);
                }}
                className="text-[13px] text-stone-500 bg-transparent border-none cursor-pointer p-0"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* caption with hashtag/mention highlighting */}
        <div className="relative mb-3">
          {/* Highlight backdrop — mirrors textarea text with colored tokens */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-transparent pointer-events-none box-border border-[1.5px] border-transparent"
          >
            {caption.split(/(#[\w\u00C0-\u024F\u1E00-\u1EFF]+|@[\w\u00C0-\u024F\u1E00-\u1EFF]+)/g).map((part, i) =>
              part.startsWith('#') ? (
                <span key={i} className="text-stone-500 font-semibold">{part}</span>
              ) : part.startsWith('@') ? (
                <span key={i} className="text-stone-600 font-semibold">{part}</span>
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
            maxLength={2200}
            aria-label="Descripción de la publicación"
            placeholder="Escribe tu pie de foto... Usa # para hashtags y @ para menciones"
            className="w-full border-[1.5px] border-stone-200 rounded-xl p-3 resize-none min-h-[80px] text-sm leading-relaxed outline-none box-border overflow-hidden bg-transparent relative caret-stone-950"
          />
          <span className={`absolute bottom-2 right-3 text-[11px] ${caption.length > 2200 ? 'text-stone-950 font-semibold' : caption.length > 2000 ? 'text-stone-700 font-semibold' : 'text-stone-500'}`}>
            {caption.length}/2200
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
          className="flex items-center bg-stone-100 text-stone-950 text-[13px] font-medium rounded-full px-4 py-2 border-none mb-4 transition-opacity"
          style={{ cursor: aiLoading ? 'wait' : 'pointer', opacity: aiLoading ? 0.6 : 1 }}
        >
          <Sparkles size={14} className="mr-1.5 shrink-0" /> {aiLoading ? 'Generando...' : 'Sugerir con David AI'}
        </button>

        {/* tag products */}
        <div className="mb-4">
          <button
            onClick={() => setShowProductSearch(true)}
            className="bg-stone-100 text-stone-950 border border-stone-200 rounded-xl px-4 py-2.5 text-[13px] cursor-pointer w-full text-left"
          >
            🏷️ Etiquetar producto
          </button>

          {/* tagged chips */}
          {taggedProducts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {taggedProducts.map((p) => (
                <span
                  key={p.id}
                  className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1 text-xs flex items-center gap-1"
                >
                  {p.name}
                  <button
                    onClick={() => setTaggedProducts((prev) => prev.filter((x) => x.id !== p.id))}
                    aria-label={`Quitar ${p.name}`}
                    className="bg-transparent border-none cursor-pointer p-0 leading-none"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* location */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5">
            <MapPin size={16} className="text-stone-500 shrink-0" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Añadir ubicación... (ej. Galicia, Costa Brava)"
              aria-label="Ubicación"
              className="flex-1 border-none outline-none text-[13px] bg-transparent"
            />
          </div>
        </div>

        {/* audience toggle */}
        <div className="mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAudience('public')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                audience === 'public'
                  ? 'border-2 border-stone-950 bg-stone-950 text-white'
                  : 'border-[1.5px] border-stone-200 bg-transparent text-stone-950'
              }`}
            >
              <Globe size={14} /> Público
            </button>
            <button
              onClick={() => setAudience('followers')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                audience === 'followers'
                  ? 'border-2 border-stone-950 bg-stone-950 text-white'
                  : 'border-[1.5px] border-stone-200 bg-transparent text-stone-950'
              }`}
            >
              <Lock size={14} /> Solo seguidores
            </button>
          </div>
        </div>

        {/* advanced settings */}
        <div className="mb-4 flex flex-col gap-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] text-stone-950">Ocultar recuento de «Me gusta»</span>
            <input
              type="checkbox"
              checked={hideLikes}
              onChange={(e) => setHideLikes(e.target.checked)}
              className="accent-stone-950 w-[18px] h-[18px]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] text-stone-950">Desactivar comentarios</span>
            <input
              type="checkbox"
              checked={disableComments}
              onChange={(e) => setDisableComments(e.target.checked)}
              className="accent-stone-950 w-[18px] h-[18px]"
            />
          </label>
        </div>
      </div>

      {/* product search modal */}
      {showProductSearch && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-h-[70vh] rounded-t-2xl flex flex-col overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-stone-200 gap-2">
              <Search size={18} className="text-stone-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                aria-label="Buscar producto para etiquetar"
                autoFocus
                className="flex-1 border-none outline-none text-sm bg-transparent"
              />
              <button onClick={() => { setShowProductSearch(false); setSearchQuery(''); setSearchResults([]); }} aria-label="Cerrar búsqueda" className="bg-transparent border-none cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searchResults.map((p) => {
                const pid = p.product_id || p.id || p._id;
                return (
                <button
                  key={pid}
                  onClick={() => {
                    if (taggedProducts.length < 5 && !taggedProducts.find((t) => t.id === pid)) {
                      setTaggedProducts((prev) => [...prev, { id: pid, name: p.name || p.title }]);
                    }
                    setShowProductSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex items-center gap-2.5 w-full px-2 py-2.5 bg-transparent border-none border-b border-stone-200 cursor-pointer text-left text-[13px]"
                >
                  {(p.image || p.images?.[0]) && <img src={p.image || p.images?.[0]} alt={p.name || p.title || 'Producto'} className="w-9 h-9 rounded-xl object-cover" />}
                  <span>{p.name || p.title}</span>
                </button>
                );
              })}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-stone-500 text-[13px] py-5">Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish success overlay */}
      {publishSuccess && (
        <div className="absolute inset-0 z-[70] bg-white flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.3s_ease]">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <Check size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-stone-950">¡Publicado!</span>
        </div>
      )}

      {/* Top progress bar — visible during upload */}
      {publishing && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="absolute top-0 left-0 right-0 z-[80] h-1 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-950 rounded-full transition-[width] duration-300 ease-in-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* fixed publish button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Error + Retry */}
        {publishError && !publishing && (
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[13px] text-stone-950 font-medium">Error al publicar</span>
            <button
              onClick={handlePublish}
              className="text-[13px] font-semibold text-stone-950 bg-transparent border-none cursor-pointer underline"
            >
              Reintentar
            </button>
          </div>
        )}
        {publishing ? (
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled
              className="flex-1 bg-stone-950 text-white text-[15px] font-semibold py-3.5 rounded-full border-none flex items-center justify-center gap-2 min-h-[48px] opacity-80"
            >
              <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
              {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Procesando...'}
            </button>
            <button
              onClick={handleCancelUpload}
              className="bg-stone-100 text-stone-950 text-[13px] font-semibold py-3.5 px-5 rounded-full border-none cursor-pointer hover:bg-stone-200 transition-colors min-h-[48px]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={handlePublish}
            className="w-full bg-stone-950 text-white text-[15px] font-semibold py-3.5 rounded-full border-none flex items-center justify-center gap-2 transition-all duration-150 hover:bg-stone-800 cursor-pointer min-h-[48px]"
          >
            {publishError ? 'Reintentar publicación' : 'Publicar ahora'}
          </button>
        )}
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
        className="fixed inset-0 z-50 lg:max-w-[480px] lg:mx-auto"
      >
        {steps[step]()}
      </motion.div>
    </AnimatePresence>
  );
}
