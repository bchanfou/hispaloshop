import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import apiClient from '../../services/api/client';

export default function HispalAIPanel({ isOpen, onClose, contentType, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post('/ai/suggest-content', { content_type: contentType });
      setSuggestion(data);
    } catch {
      setSuggestion({ caption: 'No se pudo generar sugerencia.', hashtags: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[9998]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-2xl px-5 pt-4 pb-8 max-h-[60vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-stone-950" />
                <span className="text-[15px] font-semibold text-stone-950">David AI</span>
              </div>
              <button onClick={onClose} className="bg-transparent border-none cursor-pointer">
                <X size={20} className="text-stone-500" />
              </button>
            </div>

            {!suggestion && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-3 bg-stone-950 text-white border-none rounded-xl text-sm font-semibold cursor-pointer ${
                  loading ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {loading ? 'Generando...' : 'Generar sugerencia'}
              </button>
            )}

            {suggestion && (
              <div>
                <p className="text-sm text-stone-950 leading-relaxed mb-3">
                  {suggestion.caption}
                </p>
                {suggestion.hashtags?.length > 0 && (
                  <p className="text-[13px] text-stone-950 mb-4">
                    {suggestion.hashtags.map((h) => `#${h}`).join(' ')}
                  </p>
                )}
                <button
                  onClick={() => { onApply?.(suggestion); onClose(); }}
                  className="w-full py-3 bg-stone-950 text-white border-none rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
