import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

function Avatar({ src, name }) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  if (src) {
    return <img src={src} alt={`Avatar de ${name || 'usuario'}`} loading="lazy" className="h-9 w-9 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-700">
      {initial}
    </div>
  );
}

export default function MessageToast({ notification, onClose, onOpen }) {
  return (
    <AnimatePresence>
      {notification ? (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 80) {
              onClose();
            }
          }}
          className="pointer-events-auto fixed left-1/2 top-4 z-[80] w-[min(92vw,440px)] -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-2 shadow-lg">
            <button
              type="button"
              onClick={onOpen}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label={`Abrir chat con ${notification.senderName}`}
            >
              <Avatar src={notification.avatar} name={notification.senderName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-950">{notification.senderName}</p>
                <p className="truncate text-xs text-stone-500">"{notification.preview}"</p>
              </div>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label="Cerrar notificación de mensaje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
