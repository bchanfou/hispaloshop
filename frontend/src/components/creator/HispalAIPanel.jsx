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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
              background: '#ffffff',
              borderRadius: '20px 20px 0 0',
              padding: '16px 20px 32px',
              fontFamily: 'inherit',
              maxHeight: '60vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#0c0a09" />
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09' }}>David AI</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#78716c" />
              </button>
            </div>

            {!suggestion && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: '#0c0a09', color: '#fff',
                  border: 'none', borderRadius: '12px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Generando...' : 'Generar sugerencia'}
              </button>
            )}

            {suggestion && (
              <div>
                <p style={{ fontSize: 14, color: '#0c0a09', lineHeight: 1.6, marginBottom: 12 }}>
                  {suggestion.caption}
                </p>
                {suggestion.hashtags?.length > 0 && (
                  <p style={{ fontSize: 13, color: '#0c0a09', marginBottom: 16 }}>
                    {suggestion.hashtags.map((h) => `#${h}`).join(' ')}
                  </p>
                )}
                <button
                  onClick={() => { onApply?.(suggestion); onClose(); }}
                  style={{
                    width: '100%', padding: '12px',
                    background: '#0c0a09', color: '#fff',
                    border: 'none', borderRadius: '12px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
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
