import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import i18n from '../../../locales/i18n';

interface StoryDeleteConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function StoryDeleteConfirm({
  open,
  onCancel,
  onConfirm,
}: StoryDeleteConfirmProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="del-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 z-[110] bg-black/50"
          />
          <motion.div
            key="del-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-[111] bg-white rounded-2xl p-4 shadow-xl mx-auto max-w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-center text-[15px] font-semibold text-stone-950">
              ¿Eliminar esta historia?
            </p>
            <p className="mb-4 text-center text-sm text-stone-500">
              {i18n.t(
                'contentManagement.deleteModal.warning',
                'Esta acción no se puede deshacer.',
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950 cursor-pointer border-none"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white cursor-pointer border-none"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
