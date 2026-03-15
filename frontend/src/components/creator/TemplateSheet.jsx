import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TEMPLATES = {
  post: [
    { id: 'new-product',  name: 'Producto nuevo',          color: '#0A0A0A' },
    { id: 'harvest',      name: 'Cosecha de temporada',    color: '#6B4226' },
    { id: 'behind',       name: 'Detrás de las cámaras',   color: '#F7F6F2' },
    { id: 'cert',         name: 'Certificación DOP/ECO',   color: '#2E7D52' },
  ],
  reel: [
    { id: 'unboxing',     name: 'Unboxing artesanal',      color: '#0A0A0A' },
    { id: 'farm-to-table',name: 'Del campo al plato',      color: '#6B4226' },
    { id: 'tasting',      name: 'Cata en directo',         color: '#3A3530' },
    { id: 'tutorial',     name: 'Tutorial rápido 60s',     color: '#1F4030' },
  ],
  story: [
    { id: 'launch',       name: 'Lanzamiento de producto', color: '#0A0A0A' },
    { id: 'deal',         name: 'Oferta del día',          color: '#6B4226' },
    { id: 'poll',         name: '¿Cuál prefieres?',        color: '#1F4030' },
    { id: 'ask',          name: 'Pregúntame sobre...',     color: '#3A3530' },
  ],
};

/**
 * TemplateSheet — bottom sheet showing template options.
 * Shown on first open of each editor type (localStorage).
 * Accessible via a "Plantillas" button in editors.
 */
export default function TemplateSheet({ isOpen, onClose, contentType = 'post', onSelectBlank, onSelectTemplate }) {
  const [showGrid, setShowGrid] = useState(false);
  const templates = TEMPLATES[contentType] || TEMPLATES.post;

  const handleBlank = () => {
    markShown(contentType);
    onSelectBlank?.();
    onClose();
  };

  const handleTemplate = (template) => {
    markShown(contentType);
    onSelectTemplate?.(template);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="template-overlay"
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

          {/* Sheet */}
          <motion.div
            key="template-sheet"
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
              padding: '12px 20px 32px',
              paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '75vh',
              overflowY: 'auto',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36,
              height: 4,
              background: 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              margin: '0 auto 20px',
            }} />

            {/* Title */}
            <p style={{
              fontSize: 'var(--text-md)',
              fontWeight: 500,
              color: 'var(--color-black)',
              margin: '0 0 20px',
            }}>
              Empezar desde...
            </p>

            {!showGrid ? (
              /* Main 2-option view */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Blank */}
                <button
                  type="button"
                  onClick={handleBlank}
                  style={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 24,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-white)'; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>
                    En blanco
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>
                    Empieza desde cero
                  </p>
                </button>

                {/* Templates */}
                <button
                  type="button"
                  onClick={() => setShowGrid(true)}
                  style={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 24,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-white)'; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>
                    Plantillas
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>
                    Elige un punto de partida
                  </p>
                </button>
              </div>
            ) : (
              /* Template grid */
              <>
                <button
                  type="button"
                  onClick={() => setShowGrid(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--color-stone)',
                    padding: 0,
                    marginBottom: 16,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  ← Volver
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplate(tmpl)}
                      style={{
                        background: 'var(--color-white)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 0,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textAlign: 'left',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-stone)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      <div style={{
                        width: '100%',
                        height: 80,
                        background: tmpl.color,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                      }} />
                      <p style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        color: 'var(--color-black)',
                        padding: '10px 12px',
                        margin: 0,
                      }}>
                        {tmpl.name}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Check if template sheet was already shown for this type */
export function shouldShowTemplate(contentType) {
  return !localStorage.getItem(`template_shown_${contentType}`);
}

function markShown(contentType) {
  localStorage.setItem(`template_shown_${contentType}`, '1');
}
