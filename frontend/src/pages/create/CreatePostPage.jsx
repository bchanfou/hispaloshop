import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  X,
  MapPin,
  Users,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import ProductSearchModal from '../../components/create/ProductSearchModal';
import HispalAIPanel from '../../components/creator/HispalAIPanel';
import TemplateSheet, { shouldShowTemplate } from '../../components/creator/TemplateSheet';

/* ─── helpers ─────────────────────────────────────────── */

function objectUrl(file) {
  return URL.createObjectURL(file);
}

/* ─── component ───────────────────────────────────────── */

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  /* state */
  const [images, setImages] = useState([]);           // File[]
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('all');     // 'all' | 'followers'
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTemplateSheet, setShowTemplateSheet] = useState(() => shouldShowTemplate('post'));
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [step, setStep] = useState(1); // 1=media, 2=edit, 3=details
  const [activeFilter, setActiveFilter] = useState('original');

  const FILTERS = [
    { id: 'original', name: 'Original', css: 'none' },
    { id: 'natural',  name: 'Natural',  css: 'brightness(1.05) saturate(0.9)' },
    { id: 'warm',     name: 'Cálido',   css: 'sepia(0.3) saturate(1.2) brightness(1.05)' },
    { id: 'fresh',    name: 'Fresco',   css: 'hue-rotate(10deg) saturate(1.1) brightness(1.08)' },
    { id: 'dark',     name: 'Oscuro',   css: 'brightness(0.85) contrast(1.1)' },
    { id: 'vivid',    name: 'Vívido',   css: 'saturate(1.5) contrast(1.05)' },
    { id: 'matte',    name: 'Mate',     css: 'saturate(0.7) brightness(1.1) contrast(0.95)' },
    { id: 'vintage',  name: 'Antiguo',  css: 'sepia(0.5) saturate(0.8) contrast(0.9) brightness(0.95)' },
  ];

  const currentFilter = FILTERS.find(f => f.id === activeFilter) || FILTERS[0];

  /* ── image handling ── */

  const handleAddImages = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setImages((prev) => {
        const next = [...prev, ...files].slice(0, 10);
        if (prev.length === 0) setActiveImageIndex(0);
        return next;
      });
      // reset so the same file can be picked again
      e.target.value = '';
    },
    [],
  );

  const removeImage = useCallback(
    (idx) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        if (activeImageIndex >= next.length) {
          setActiveImageIndex(Math.max(0, next.length - 1));
        }
        return next;
      });
    },
    [activeImageIndex],
  );

  /* ── product tags ── */

  const handleTagProduct = useCallback((product) => {
    setTaggedProducts((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    setShowProductSearch(false);
  }, []);

  const removeTaggedProduct = useCallback((id) => {
    setTaggedProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ── publish ── */

  const handlePublish = useCallback(async () => {
    if (images.length === 0) {
      toast.error('Añade al menos una imagen');
      return;
    }
    setPublishing(true);
    try {
      const formData = new FormData();
      images.forEach((file) => formData.append('images', file));
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('audience', audience);
      if (taggedProducts.length) {
        formData.append(
          'taggedProducts',
          JSON.stringify(taggedProducts.map((p) => p.id)),
        );
      }

      await apiClient.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Post publicado');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Error al publicar. Inténtalo de nuevo.');
    } finally {
      setPublishing(false);
    }
  }, [images, caption, location, audience, taggedProducts, navigate]);

  /* ── derived ── */

  const canPublish = images.length > 0 && !publishing;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  /*                       RENDER                        */
  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}
    >
      {/* ── top bar ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between"
        style={{
          padding: '10px 13px',
          background: 'var(--color-cream)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else if (images.length > 0 && !window.confirm('¿Descartar cambios?')) return;
            else navigate(-1);
          }}
          className="flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-full)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {step > 1 ? <ArrowLeft size={20} style={{ color: 'var(--color-black)' }} /> : <X size={20} style={{ color: 'var(--color-black)' }} />}
        </button>

        {/* Stepper dots */}
        <div className="flex items-center" style={{ gap: 6 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: s <= step ? 'var(--color-black)' : 'var(--color-border)',
              transition: 'var(--transition-fast)',
            }} />
          ))}
        </div>

        {step < 3 ? (
          <button
            type="button"
            disabled={images.length === 0}
            onClick={() => setStep(step + 1)}
            style={{
              fontSize: 13, fontWeight: 600,
              color: images.length > 0 ? 'var(--color-black)' : 'var(--color-stone)',
              background: 'transparent', border: 'none',
              cursor: images.length > 0 ? 'pointer' : 'default',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            disabled={!canPublish}
            onClick={handlePublish}
            style={{
              fontSize: 13, fontWeight: 600,
              background: canPublish ? 'var(--color-black)' : 'var(--color-stone)',
              color: '#fff', borderRadius: 'var(--radius-full)',
              padding: '6px 16px', border: 'none',
              cursor: canPublish ? 'pointer' : 'default',
              opacity: canPublish ? 1 : 0.5,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : 'Publicar'}
          </button>
        )}
      </div>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddImages}
        style={{ display: 'none' }}
      />

      {/* ═══ STEP 1: MEDIA SELECTION ═══ */}
      {step === 1 && (
        <>
          <div
            style={{
              margin: '0 13px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              aspectRatio: '1 / 1',
              background: '#1A1A1A',
              position: 'relative',
              marginTop: 12,
            }}
          >
            {images.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center"
                style={{
                  width: '100%', height: '100%',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', gap: 8,
                }}
              >
                <ImageIcon size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>
                  Toca para añadir foto
                </span>
              </button>
            ) : (
              <>
                <img
                  src={objectUrl(images[activeImageIndex])}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {images.length > 1 && (
                  <div className="flex items-center justify-center" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, gap: 5 }}>
                    {images.map((_, i) => (
                      <div key={i} style={{
                        width: i === activeImageIndex ? 7 : 5,
                        height: i === activeImageIndex ? 7 : 5,
                        borderRadius: '50%',
                        background: i === activeImageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.2s',
                      }} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Gallery controls bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 13px', background: 'rgba(10,10,10,0.8)',
            margin: '0 13px', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: 'var(--text-sm)', color: '#fff' }}>Álbum reciente</span>
            {images.length > 1 && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)' }}>
                {activeImageIndex + 1} / {images.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: 'var(--text-sm)', color: '#fff',
                background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              📷 Cámara
            </button>
          </div>

          {/* Thumbnail strip */}
          {images.length > 0 && (
            <div className="flex items-center overflow-x-auto" style={{ gap: 6, padding: '8px 13px' }}>
              {images.map((file, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <button type="button" onClick={() => setActiveImageIndex(i)}
                    style={{
                      width: 52, height: 52, borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer', background: 'transparent',
                      border: i === activeImageIndex ? '2px solid var(--color-black)' : '2px solid transparent',
                    }}
                  >
                    <img src={objectUrl(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Order number */}
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--color-black)', color: '#fff',
                      fontSize: 9, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i + 1}
                    </span>
                  </button>
                  <button type="button" onClick={() => removeImage(i)}
                    style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--color-black)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 52, height: 52, borderRadius: 8,
                    border: '1.5px dashed var(--color-border)',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Plus size={18} style={{ color: 'var(--color-stone)' }} />
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ STEP 2: EDIT IMAGE ═══ */}
      {step === 2 && images.length > 0 && (
        <>
          {/* Preview with filter */}
          <div style={{
            margin: '12px 13px 0',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            aspectRatio: '1 / 1',
            background: 'var(--color-surface)',
            position: 'relative',
          }}>
            <img
              src={objectUrl(images[activeImageIndex])}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: currentFilter.css,
                transition: 'filter 0.2s ease',
              }}
            />
          </div>

          {/* Filter strip */}
          <div className="flex overflow-x-auto" style={{ gap: 12, padding: '12px 13px', scrollbarWidth: 'none' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                  border: activeFilter === f.id ? '2px solid var(--color-green)' : '2px solid transparent',
                }}>
                  <img
                    src={objectUrl(images[activeImageIndex])}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }}
                  />
                </div>
                <span style={{
                  fontSize: 'var(--text-xs)', textAlign: 'center',
                  color: activeFilter === f.id ? 'var(--color-black)' : 'var(--color-stone)',
                  fontWeight: activeFilter === f.id ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ═══ STEP 3: DETAILS & PUBLISH ═══ */}
      {step === 3 && (
        <>
      {/* Carousel mini thumbnails */}
      {images.length > 0 && (
        <div className="flex items-center overflow-x-auto" style={{ gap: 6, padding: '12px 13px' }}>
          {images.map((file, i) => (
            <div key={i} style={{
              width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              border: i === activeImageIndex ? '2px solid var(--color-black)' : '2px solid transparent',
            }}>
              <img src={objectUrl(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: currentFilter.css }} />
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          margin: '0 13px 8px',
        }}
      >
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
          placeholder={'Escribe una descripción...\n#hashtags 🌿'}
          rows={4}
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'inherit', resize: 'none',
            fontSize: 'var(--text-base)', lineHeight: 1.5,
            color: 'var(--color-black)', fontFamily: 'var(--font-sans)',
            minHeight: 80, maxHeight: 200,
          }}
        />
        <div style={{
          fontSize: 10, textAlign: 'right',
          color: caption.length > 2100 ? 'var(--color-red)' : caption.length > 1800 ? 'var(--color-amber)' : 'var(--color-stone)',
        }}>
          {caption.length} / 2200
        </div>
      </div>

      {/* Hispal AI suggest button */}
      <div style={{ margin: '0 13px 12px' }}>
        <button
          type="button"
          onClick={() => setShowAIPanel(true)}
          style={{
            background: 'var(--color-green-light)',
            color: 'var(--color-green)',
            border: '1px solid var(--color-green-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-sm)', fontWeight: 500,
            padding: '6px 14px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          ✨ Sugerir con Hispal AI
        </button>
      </div>

      {/* ── tagged products ── */}
      <div style={{ margin: '0 13px 12px' }}>
        <span className="uppercase-label" style={{ display: 'block', marginBottom: 8 }}>PRODUCTOS</span>
        <AnimatePresence>
          {taggedProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center"
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 10px',
                marginBottom: 6,
                gap: 8,
              }}
            >
              {product.image && (
                <img
                  src={product.image}
                  alt=""
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    objectFit: 'cover',
                  }}
                />
              )}
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-black)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.name}
                </div>
                {product.price != null && (
                  <span style={{ fontSize: 11, color: 'var(--color-stone)' }}>
                    {product.price.toFixed(2)} &euro;
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--color-green)',
                  background: 'rgba(46,125,82,0.08)',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                etiquetado
              </span>
              <button
                type="button"
                onClick={() => removeTaggedProduct(product.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <X size={14} style={{ color: 'var(--color-stone)' }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowProductSearch(true)}
          className="flex items-center"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-green)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            gap: 4,
            padding: '4px 0',
          }}
        >
          <Tag size={13} />
          + Etiquetar producto
        </button>
      </div>

      {/* (options moved into step 3 accordion) */}

      {/* ── additional options (accordion) ── */}
      <div style={{ margin: '0 13px 12px' }}>
        <button
          type="button"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-stone)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Más opciones <ChevronDown size={14} style={{ transform: showMoreOptions ? 'rotate(180deg)' : 'none', transition: 'var(--transition-fast)' }} />
        </button>
      </div>

      {showMoreOptions && (
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            margin: '0 13px 24px',
            overflow: 'hidden',
          }}
        >
          <div className="flex items-center justify-between" style={{ padding: 12, borderBottom: '0.5px solid var(--color-border)' }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <MapPin size={16} style={{ color: 'var(--color-black)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)' }}>Ubicación</span>
            </div>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Añadir ubicación"
              style={{ fontSize: 12, color: 'var(--color-stone)', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', width: 140, fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div className="flex items-center justify-between" style={{ padding: 12 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <Users size={16} style={{ color: 'var(--color-black)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)' }}>Audiencia</span>
            </div>
            <button type="button" onClick={() => setAudience(prev => prev === 'all' ? 'followers' : 'all')}
              style={{ fontSize: 12, color: 'var(--color-stone)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {audience === 'all' ? 'Todos' : 'Solo seguidores'}
            </button>
          </div>
        </div>
      )}

      {/* ── bottom publish button ── */}
      <div style={{ padding: '0 13px 24px', marginTop: 'auto' }}>
        <button
          type="button"
          disabled={!canPublish}
          onClick={handlePublish}
          className="flex items-center justify-center"
          style={{
            width: '100%', height: 52,
            borderRadius: 'var(--radius-full)',
            background: canPublish ? 'var(--color-black)' : 'var(--color-stone)',
            color: '#fff', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: canPublish ? 'pointer' : 'default',
            opacity: canPublish ? 1 : 0.5, gap: 6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : 'Publicar ahora'}
        </button>
      </div>
        </>
      )}

      {/* ── modals ── */}
      {showProductSearch && (
        <ProductSearchModal
          onSelect={handleTagProduct}
          onClose={() => setShowProductSearch(false)}
        />
      )}

      <HispalAIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        contentType="post"
        currentText={caption}
        productIds={taggedProducts.map(p => p.id)}
        onUseCaption={(text) => { setCaption(text); setShowAIPanel(false); }}
        onAddHashtags={(tags) => { setCaption(prev => prev + ' ' + tags); setShowAIPanel(false); }}
      />

      <TemplateSheet
        isOpen={showTemplateSheet}
        onClose={() => setShowTemplateSheet(false)}
        contentType="post"
        onSelectBlank={() => {}}
        onSelectTemplate={() => {}}
      />
    </div>
  );
}
