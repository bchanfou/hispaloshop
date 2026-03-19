import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Video, Circle, ChefHat } from 'lucide-react';

const CONTENT_TYPES = [
  // Row 1 — 3 columns
  { type: 'post',  icon: <Camera size={22} />, label: 'Post',   primary: false },
  { type: 'reel',  icon: <Video size={22} />, label: 'Reel',   primary: false },
  { type: 'story', icon: <Circle size={22} />, label: 'Story',  primary: false },
  // Row 2 — receta centrada
  { type: 'recipe', icon: <ChefHat size={22} />, label: 'Receta', primary: true },
];

function ContentTypeButton({ icon, label, primary, isText, onSelect }) {
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
        background: primary ? 'var(--color-black)' : 'var(--color-surface)',
        color: primary ? '#fff' : 'var(--color-black)',
      }}>
        {isText ? 'Aa' : icon}
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

            {/* Row 2 — receta centrada */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 8,
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
