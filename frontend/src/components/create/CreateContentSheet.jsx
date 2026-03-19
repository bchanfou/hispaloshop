import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Video, Layers, ChefHat } from 'lucide-react';

const CONTENT_TYPES = [
  {
    type: 'post',
    label: 'Post',
    icon: <ImagePlus size={22} color="white" />,
    iconBg: 'bg-stone-950',
  },
  {
    type: 'reel',
    label: 'Reel',
    icon: <Video size={22} color="white" />,
    iconBg: 'bg-stone-800',
  },
  {
    type: 'story',
    label: 'Story',
    icon: <Layers size={22} color="white" />,
    iconBg: 'bg-stone-700',
  },
  {
    type: 'recipe',
    label: 'Receta',
    icon: <ChefHat size={22} color="white" />,
    iconBg: 'bg-stone-600',
  },
];

function ContentTypeButton({ label, icon, iconBg, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 transition-all"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-stone-700">{label}</span>
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
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 max-h-72"
            style={{
              zIndex: 'var(--z-modal)',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Drag handle */}
            <div className="w-9 h-1 bg-stone-200 rounded-full mx-auto mb-4" />

            {/* Title */}
            <p className="text-base font-semibold text-stone-950 mb-4">Crear</p>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((opt) => (
                <ContentTypeButton
                  key={opt.type}
                  label={opt.label}
                  icon={opt.icon}
                  iconBg={opt.iconBg}
                  onSelect={() => {
                    onClose();
                    onSelect(opt.type);
                  }}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
