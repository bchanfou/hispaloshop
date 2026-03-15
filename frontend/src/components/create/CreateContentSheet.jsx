import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { Camera, Film, Circle, Layers, AlignLeft } from 'lucide-react';

const OPTIONS_TOP = [
  { type: 'post',  icon: Camera,   label: 'Post',   subtitle: 'Foto o carrusel',  green: false },
  { type: 'reel',  icon: Film,     label: 'Reel',   subtitle: 'Vídeo 60 seg.',    green: false },
  { type: 'story', icon: Circle,   label: 'Story',  subtitle: '24 horas',         green: false },
];

const OPTIONS_BOTTOM = [
  { type: 'recipe', icon: Layers,    label: 'Receta', subtitle: 'Con ingredientes', green: true  },
  { type: 'text',   icon: AlignLeft, label: 'Texto',  subtitle: 'Con fondo color',  green: false },
];

function OptionCard({ type, icon: Icon, label, subtitle, green, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 8px',
        cursor: 'pointer',
      }}
      className="flex flex-col items-center"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: green ? 'var(--color-green)' : 'var(--color-black)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color="white" strokeWidth={2} />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-black)',
          marginTop: 8,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--color-stone)',
          marginTop: 2,
        }}
      >
        {subtitle}
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
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(10,10,10,0.5)' }}
          />

          {/* Sheet */}
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <motion.div
              key="create-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[61]"
              style={{
                background: 'var(--color-white)',
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              }}
            >
              {/* Handle bar */}
              <div className="flex justify-center" style={{ paddingTop: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--color-border)',
                    marginBottom: 16,
                  }}
                />
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-black)',
                  marginBottom: 14,
                  paddingLeft: 16,
                }}
              >
                Crear contenido
              </div>

              {/* Top row — 3 columns */}
              <div
                className="grid grid-cols-3"
                style={{ gap: 8, padding: '0 16px' }}
              >
                {OPTIONS_TOP.map((opt) => (
                  <OptionCard key={opt.type} {...opt} onSelect={onSelect} />
                ))}
              </div>

              {/* Bottom row — 2 columns */}
              <div
                className="grid grid-cols-2"
                style={{ gap: 8, padding: '0 16px', marginTop: 8, paddingBottom: 8 }}
              >
                {OPTIONS_BOTTOM.map((opt) => (
                  <OptionCard key={opt.type} {...opt} onSelect={onSelect} />
                ))}
              </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
}
