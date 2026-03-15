import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import apiClient from '../../services/api/client';

/**
 * HispalAIPanel — bottom sheet with AI-powered suggestions
 * for caption, hashtags, and best posting time.
 * Used across all 5 content editors.
 */
export default function HispalAIPanel({
  isOpen,
  onClose,
  contentType = 'post',
  currentText = '',
  productIds = [],
  imageUrls = [],
  onUseCaption,
  onAddHashtags,
  onSchedule,
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [selectedHashtags, setSelectedHashtags] = useState(new Set());

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.post('/ai/suggest-content', {
        content_type: contentType,
        text: currentText,
        products: productIds,
        image_urls: imageUrls,
      });
      setSuggestion(data);
      setSelectedHashtags(new Set());
    } catch {
      // Fallback suggestions if API unavailable
      setSuggestion({
        caption: 'Descubre lo mejor de nuestros productores artesanales. Cada producto cuenta una historia de dedicación y calidad. 🌿',
        hashtags: ['hispaloshop', 'artesanal', 'productolocal', 'sinconservantes', 'delcampoalamesa'],
        best_time: 'entre 19:00–21:00',
      });
      setSelectedHashtags(new Set());
    } finally {
      setLoading(false);
    }
  }, [contentType, currentText, productIds, imageUrls]);

  useEffect(() => {
    if (isOpen && !suggestion && !loading) {
      fetchSuggestions();
    }
  }, [isOpen, suggestion, loading, fetchSuggestions]);

  const toggleHashtag = (tag) => {
    setSelectedHashtags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleAddHashtags = () => {
    const tags = [...selectedHashtags].map(t => `#${t}`).join(' ');
    onAddHashtags?.(tags);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="ai-panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,10,10,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 'calc(var(--z-modal) - 1)',
            }}
          />

          {/* Panel */}
          <motion.div
            key="ai-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'tween',
              duration: 0.3,
              ease: [0.32, 0.72, 0, 1],
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 'var(--z-modal)',
              background: 'var(--color-white)',
              borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
              padding: '16px 20px',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '80vh',
              overflowY: 'auto',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--color-black)' }}>
                ✨ Hispal AI sugiere
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--color-stone)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: 'var(--color-stone)' }}>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ fontSize: 'var(--text-sm)' }}>Generando sugerencias...</span>
              </div>
            ) : suggestion ? (
              <>
                {/* Caption section */}
                <div style={{ marginBottom: 24 }}>
                  <span className="uppercase-label" style={{ display: 'block', marginBottom: 8 }}>CAPTION</span>
                  <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    <p style={{
                      fontSize: 'var(--text-base)',
                      color: 'var(--color-black)',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                      margin: 0,
                    }}>
                      {suggestion.caption}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onUseCaption?.(suggestion.caption)}
                      style={{
                        height: 34,
                        padding: '0 16px',
                        background: 'var(--color-black)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Usar este
                    </button>
                    <button
                      type="button"
                      onClick={fetchSuggestions}
                      style={{
                        height: 34,
                        padding: '0 16px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-black)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                {/* Hashtags section */}
                {suggestion.hashtags?.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <span className="uppercase-label" style={{ display: 'block', marginBottom: 8 }}>HASHTAGS</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {suggestion.hashtags.map(tag => {
                        const isSelected = selectedHashtags.has(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleHashtag(tag)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              border: 'none',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                              transition: 'var(--transition-fast)',
                              background: isSelected ? 'var(--color-black)' : 'var(--color-surface)',
                              color: isSelected ? '#fff' : 'var(--color-black)',
                            }}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                    {selectedHashtags.size > 0 && (
                      <button
                        type="button"
                        onClick={handleAddHashtags}
                        style={{
                          height: 34,
                          padding: '0 16px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-black)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Añadir seleccionados
                      </button>
                    )}
                  </div>
                )}

                {/* Best time section */}
                {suggestion.best_time && (
                  <div>
                    <span className="uppercase-label" style={{ display: 'block', marginBottom: 8 }}>MEJOR MOMENTO</span>
                    <div style={{
                      background: 'var(--color-green-light)',
                      border: '1px solid var(--color-green-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      marginBottom: 12,
                    }}>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-black)', margin: 0, lineHeight: 1.5 }}>
                        📊 La IA recomienda publicar hoy {suggestion.best_time}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => onSchedule?.('19:30')}
                        style={{
                          height: 34,
                          padding: '0 16px',
                          background: 'var(--color-green)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Programar para las 19:30
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        style={{
                          height: 34,
                          padding: '0 16px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-black)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Publicar ahora
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
