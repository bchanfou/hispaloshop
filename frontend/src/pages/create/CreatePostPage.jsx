import React, { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import ProductSearchModal from '../../components/create/ProductSearchModal';

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
          onClick={() => navigate(-1)}
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
          <ArrowLeft size={20} style={{ color: 'var(--color-black)' }} />
        </button>

        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-black)',
          }}
        >
          Nuevo post
        </span>

        <button
          type="button"
          disabled={!canPublish}
          onClick={handlePublish}
          style={{
            fontSize: 13,
            fontWeight: 600,
            background: canPublish ? 'var(--color-black)' : 'var(--color-stone)',
            color: '#fff',
            borderRadius: 'var(--radius-full)',
            padding: '6px 16px',
            border: 'none',
            cursor: canPublish ? 'pointer' : 'default',
            opacity: canPublish ? 1 : 0.5,
          }}
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : 'Publicar'}
        </button>
      </div>

      {/* ── image preview (1:1) ── */}
      <div
        style={{
          margin: '0 13px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          aspectRatio: '1 / 1',
          background: 'var(--color-surface)',
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
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              gap: 8,
            }}
          >
            <ImageIcon size={32} style={{ color: 'var(--color-stone)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-stone)' }}>
              Añadir foto
            </span>
          </button>
        ) : (
          <>
            <img
              src={objectUrl(images[activeImageIndex])}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* dot indicators */}
            {images.length > 1 && (
              <div
                className="flex items-center justify-center"
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  right: 0,
                  gap: 5,
                }}
              >
                {images.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === activeImageIndex ? 7 : 5,
                      height: i === activeImageIndex ? 7 : 5,
                      borderRadius: '50%',
                      background: i === activeImageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* overlay add-photo button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 8,
                border: 'none',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-black)',
              }}
            >
              <Plus size={14} />
              Añadir foto
            </button>
          </>
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

      {/* ── carousel thumbnails ── */}
      {images.length > 0 && (
        <div
          className="flex items-center overflow-x-auto"
          style={{ gap: 6, padding: '8px 13px' }}
        >
          {images.map((file, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActiveImageIndex(i)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border:
                    i === activeImageIndex
                      ? '2px solid var(--color-black)'
                      : '2px solid transparent',
                  padding: 0,
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                <img
                  src={objectUrl(file)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--color-black)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={10} color="#fff" />
              </button>
            </div>
          ))}

          {/* add placeholder cell */}
          {images.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                border: '1.5px dashed var(--color-border)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plus size={18} style={{ color: 'var(--color-stone)' }} />
            </button>
          )}
        </div>
      )}

      {/* ── caption ── */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          margin: '12px 13px',
        }}
      >
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
          placeholder="Escribe una descripción... #hashtags"
          rows={4}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'inherit',
            resize: 'none',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--color-black)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <div
          style={{
            fontSize: 10,
            color: 'var(--color-stone)',
            textAlign: 'right',
          }}
        >
          {caption.length} / 2200
        </div>
      </div>

      {/* ── tagged products ── */}
      <div style={{ margin: '0 13px 12px' }}>
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

      {/* ── additional options ── */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          margin: '0 13px 24px',
          overflow: 'hidden',
        }}
      >
        {/* Ubicación */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 12,
            borderBottom: '0.5px solid var(--color-border)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <MapPin size={16} style={{ color: 'var(--color-black)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)' }}>
              Ubicación
            </span>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Añadir ubicación"
            style={{
              fontSize: 12,
              color: 'var(--color-stone)',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              textAlign: 'right',
              width: 140,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {/* Audiencia */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 12,
            borderBottom: '0.5px solid var(--color-border)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <Users size={16} style={{ color: 'var(--color-black)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)' }}>
              Audiencia
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setAudience((prev) => (prev === 'all' ? 'followers' : 'all'))
            }
            style={{
              fontSize: 12,
              color: 'var(--color-stone)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {audience === 'all' ? 'Todos' : 'Solo seguidores'}
          </button>
        </div>

        {/* Comunidad */}
        <div
          className="flex items-center justify-between"
          style={{ padding: 12 }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <MessageSquare size={16} style={{ color: 'var(--color-black)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)' }}>
              Comunidad
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-stone)' }}>
            —
          </span>
        </div>
      </div>

      {/* ── bottom publish button ── */}
      <div style={{ padding: '0 13px 24px', marginTop: 'auto' }}>
        <button
          type="button"
          disabled={!canPublish}
          onClick={handlePublish}
          className="flex items-center justify-center"
          style={{
            width: '100%',
            height: 44,
            borderRadius: 'var(--radius-full)',
            background: canPublish ? 'var(--color-black)' : 'var(--color-stone)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: canPublish ? 'pointer' : 'default',
            opacity: canPublish ? 1 : 0.5,
            gap: 6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {publishing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            'Publicar ahora'
          )}
        </button>
      </div>

      {/* ── product search modal ── */}
      {showProductSearch && (
        <ProductSearchModal
          onSelect={handleTagProduct}
          onClose={() => setShowProductSearch(false)}
        />
      )}
    </div>
  );
}
