import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, RotateCcw, Loader2 } from 'lucide-react';
import { useUploadQueue } from '../../context/UploadQueueContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import i18n from '../../locales/i18n';

/**
 * Global banner that shows upload progress for content published via
 * UploadQueueContext. Renders at the top of AppLayout.
 */
export default function UploadProgressBanner() {
  const { queue, retry, dismiss } = useUploadQueue();
  const navigate = useNavigate();
  const notifiedRef = useRef<Set<string>>(new Set());

  // Toast on completion or error
  useEffect(() => {
    for (const entry of queue) {
      if (notifiedRef.current.has(entry.id)) continue;
      if (entry.status === 'done') {
        notifiedRef.current.add(entry.id);
        const typeLabel = entry.contentType === 'reel' ? 'Reel' : entry.contentType === 'story' ? 'Story' : i18n.t('create_post.publicacionCreada', 'Publicación creada');
        toast.success(typeLabel, { duration: 4000 });
        // Auto-dismiss after a short delay
        setTimeout(() => dismiss(entry.id), 3000);
      } else if (entry.status === 'error') {
        notifiedRef.current.add(entry.id);
        toast.error(entry.error || i18n.t('create_post.errorAlPublicarCompruebaTuConexion', 'Error al publicar'));
      }
    }
  }, [queue, dismiss]);

  const active = queue.filter(e => e.status === 'uploading' || e.status === 'pending' || e.status === 'error');
  if (active.length === 0) return null;

  return (
    <div className="fixed top-[env(safe-area-inset-top)] left-0 right-0 z-[9990] px-4 pt-2 pointer-events-none">
      <AnimatePresence>
        {active.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="pointer-events-auto mb-2 flex items-center gap-3 rounded-2xl bg-white border border-stone-200 shadow-md px-4 py-3"
          >
            {entry.status === 'uploading' && (
              <Loader2 size={18} className="text-stone-500 animate-spin shrink-0" />
            )}
            {entry.status === 'error' && (
              <AlertCircle size={18} className="text-stone-950 shrink-0" />
            )}
            {entry.status === 'pending' && (
              <Loader2 size={18} className="text-stone-400 shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-stone-950 truncate">
                {entry.status === 'error'
                  ? (entry.error || 'Error al publicar')
                  : entry.status === 'uploading'
                    ? `Subiendo ${entry.contentType || 'contenido'}... ${entry.progress}%`
                    : 'En cola...'}
              </p>
              {entry.status === 'uploading' && (
                <div className="mt-1.5 h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-950 rounded-full transition-all duration-300"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              )}
            </div>

            {entry.status === 'error' && (
              <button
                onClick={() => {
                  notifiedRef.current.delete(entry.id);
                  retry(entry.id);
                }}
                className="bg-stone-950 text-white border-none rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer shrink-0"
              >
                <RotateCcw size={13} className="inline mr-1" />
                Reintentar
              </button>
            )}

            <button
              onClick={() => dismiss(entry.id)}
              className="bg-transparent border-none cursor-pointer p-1 shrink-0"
              aria-label="Cerrar"
            >
              <X size={16} className="text-stone-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
