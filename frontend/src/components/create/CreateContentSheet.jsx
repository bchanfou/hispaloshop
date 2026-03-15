import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CONTENT_TYPES = [
  // Row 1 — 3 columns
  { type: 'post',  emoji: '📸', label: 'Post',   green: false },
  { type: 'reel',  emoji: '🎬', label: 'Reel',   green: false },
  { type: 'story', emoji: '⭕', label: 'Story',  green: false },
  // Row 2 — 2 columns (centrado)
  { type: 'recipe', emoji: '🍳', label: 'Receta', green: true },
  { type: 'text',   emoji: 'Aa', label: 'Texto',  green: false, isText: true },
];

function ContentTypeButton({ emoji, label, green, isText, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 8px',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        background: 'transparent',
        border: 'none',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      onTouchStart={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
      onTouchEnd={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isText ? 22 : 26,
        fontWeight: isText ? 700 : 400,
        background: green ? 'var(--color-green)' : 'var(--color-surface)',
        color: green ? '#fff' : 'var(--color-black)',
      }}>
        {emoji}
      </div>
      <span style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        color: 'var(--color-black)',
      }}>
        {label}
      </span>
    </button>
  );
}

export default function CreateContentSheet({ isOpen, onClose, onSelect }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="create-sheet-overlay"
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
            key="create-sheet"
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
              margin: '0 0 24px',
            }}>
              Crear contenido
            </p>

            {/* Row 1 — 3 columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}>
              {CONTENT_TYPES.slice(0, 3).map(opt => (
                <ContentTypeButton
                  key={opt.type}
                  {...opt}
                  onSelect={() => onSelect(opt.type)}
                />
              ))}
            </div>

            {/* Row 2 — 2 columns centrado */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginTop: 8,
              maxWidth: '66.6%',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {CONTENT_TYPES.slice(3).map(opt => (
                <ContentTypeButton
                  key={opt.type}
                  {...opt}
                  onSelect={() => onSelect(opt.type)}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
