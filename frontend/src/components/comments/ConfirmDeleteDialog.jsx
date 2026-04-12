// Section 3.6.6 — F-01 / F-07
// Reusable confirm-delete dialog. Generalises the StoryDeleteConfirm pattern
// so comments, reviews, posts, reels and stories can all share the same
// modal chrome. Stone palette, no emojis, Lucide icons.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function ConfirmDeleteDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cdd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onCancel}
            className="fixed inset-0 z-[110] bg-black/50"
          />
          <motion.div
            key="cdd-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] bg-white rounded-2xl p-5 shadow-xl w-[calc(100vw-32px)] max-w-[340px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <p className="mb-1 text-center text-[15px] font-semibold text-stone-950">
              {title || t('comments.confirmDelete.title', '¿Eliminar?')}
            </p>
            <p className="mb-5 text-center text-sm text-stone-500">
              {message || t('comments.confirmDelete.message', 'Esta acción no se puede deshacer.')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950 cursor-pointer border-none disabled:opacity-50"
              >
                {cancelLabel || t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-full bg-stone-950 py-3 text-sm font-semibold text-white cursor-pointer border-none disabled:opacity-50"
              >
                {confirmLabel || t('common.delete', 'Eliminar')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
