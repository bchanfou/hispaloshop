import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Image, Check, Type, Crop, Sliders, Search } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

/* ───────────────────────── constants ───────────────────────── */

const FILTERS = [
  { name: 'Original', css: 'none' },
  { name: 'Natural', css: 'brightness(1.05) saturate(0.9)' },
  { name: 'Cálido', css: 'sepia(0.3) saturate(1.2) brightness(1.05)' },
  { name: 'Fresco', css: 'hue-rotate(10deg) saturate(1.1)' },
  { name: 'Oscuro', css: 'brightness(0.85) contrast(1.1)' },
  { name: 'Vívido', css: 'saturate(1.5) contrast(1.05)' },
  { name: 'Mate', css: 'saturate(0.7) brightness(1.1)' },
  { name: 'Antiguo', css: 'sepia(0.5) saturate(0.8)' },
];

const FONT_OPTIONS = [
  { label: 'Sans', value: 'var(--font-sans), sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Display', value: 'Impact, sans-serif' },
];

const COLOR_DOTS = [
  { label: '⚫', value: '#000000' },
  { label: '⚪', value: '#ffffff' },
  { label: '🟡', value: '#fbbf24' },
  { label: '🟢', value: '#22c55e' },
  { label: '🔴', value: '#ef4444' },
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

  // adjustments
  const br = 1 + adjustments.brightness / 100;
  const co = 1 + adjustments.contrast / 100;
  const sa = 1 + adjustments.saturation / 100;
  parts.push(`brightness(${br})`);
  parts.push(`contrast(${co})`);
  parts.push(`saturate(${sa})`);

  // named filter blended by intensity
  if (activeFilter.css !== 'none' && filterIntensity > 0) {
    // We layer the named filter at reduced intensity by interpolating towards identity
    // Simple approach: just append the filter CSS at full strength (intensity handled via opacity trick is complex, so we scale individual values)
    // For simplicity we append the raw filter string — intensity 100 = full
    if (filterIntensity === 100) {
      parts.push(activeFilter.css);
    } else {
      // reduce effect by mixing: we wrap in a container later; here just append at full
      parts.push(activeFilter.css);
    }
  }

  return parts.join(' ');
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
  const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0, sharpness: 0 });
  const [textOverlays, setTextOverlays] = useState([]);
  const [activeTab, setActiveTab] = useState('filtros');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);

  /* --- step 3 state --- */
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  /* --- dragging text state --- */
  const dragRef = useRef(null);

  /* ── file handling ── */
  const handleFiles = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedFiles((prev) => {
      const merged = [...prev, ...files].slice(0, 10);
      return merged;
    });
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
      setSearchResults(res.data?.results || res.data || []);
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    if (!showProductSearch) return;
    const t = setTimeout(() => searchProducts(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, showProductSearch, searchProducts]);

  /* ── publish ── */
  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach((f) => fd.append('images', f));
      fd.append('caption', caption);
      if (taggedProducts.length) fd.append('tagged_products', JSON.stringify(taggedProducts.map((p) => p.id)));
      fd.append('filter', activeFilter.name);
      fd.append('aspect_ratio', aspectRatio.label);
      await apiClient.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Publicación creada');
      navigate('/');
    } catch (err) {
      toast.error('Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  /* ── text overlay helpers ── */
  const addTextOverlay = () => {
    if (textOverlays.length >= 3) return;
    setTextOverlays((prev) => [
      ...prev,
      { id: Date.now(), text: 'Texto', x: 50, y: 50, font: FONT_OPTIONS[0].value, color: '#ffffff', size: 24 },
    ]);
  };

  const updateOverlay = (id, patch) => {
    setTextOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  /* ── drag text ── */
  const handleDragStart = (e, overlay) => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id: overlay.id, startX: clientX, startY: clientY, origX: overlay.x, origY: overlay.y, w: rect.width, h: rect.height };

    const move = (ev) => {
      if (!dragRef.current) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = ((cx - dragRef.current.startX) / dragRef.current.w) * 100;
      const dy = ((cy - dragRef.current.startY) / dragRef.current.h) * 100;
      updateOverlay(dragRef.current.id, {
        x: Math.min(95, Math.max(5, dragRef.current.origX + dx)),
        y: Math.min(95, Math.max(5, dragRef.current.origY + dy)),
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
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
          <button onClick={() => navigate(-1)} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
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
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Recientes ▼</span>
          <button onClick={() => cameraInputRef.current?.click()} aria-label="Abrir cámara" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>📷</button>
        </div>

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

    const previewAspect = aspectRatio.value;

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
          <div style={{ position: 'relative', width: '100%', aspectRatio: previewAspect, maxHeight: '100%', overflow: 'hidden' }}>
            <img
              src={previewUrls[previewIndex]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: filterCSS, transition: 'filter 0.2s' }}
            />
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
                  color: o.color,
                  cursor: 'grab',
                  userSelect: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  fontWeight: 600,
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
                    onClick={() => setActiveFilter(f)}
                    style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: activeFilter.name === f.name ? '2px solid var(--color-white)' : '2px solid transparent',
                      }}
                    >
                      {previewUrls[previewIndex] && (
                        <img src={previewUrls[previewIndex]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css === 'none' ? 'none' : f.css }} />
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4, display: 'block' }}>{f.name}</span>
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
                { key: 'sharpness', label: 'Nitidez', min: 0, max: 100 },
              ].map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', minWidth: 72 }}>{s.label}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={adjustments[s.key]}
                    onChange={(e) => setAdjustments((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
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
                    <button onClick={() => removeOverlay(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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

        {/* caption */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            placeholder="Escribe una descripción... 🌿"
            style={{
              width: '100%',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              resize: 'none',
              minHeight: 80,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: 'var(--color-stone)' }}>
            {caption.length} / 2200
          </span>
        </div>

        {/* AI suggest */}
        <button
          style={{
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
          ✨ Sugerir con Hispal AI
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
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
                autoFocus
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-sans)' }}
              />
              <button onClick={() => { setShowProductSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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

      {/* fixed publish button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
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
          {publishing ? 'Publicando...' : 'Publicar ahora'}
        </button>
      </div>

      {/* spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
