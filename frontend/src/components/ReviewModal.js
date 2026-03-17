import React, { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../services/api/client';

export default function ReviewModal({ open, onClose, order }) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (!open || !order) return null;

  const items = order.line_items || [];
  const product = selectedProduct || items[0];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecciona una valoración');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/reviews/create', {
        order_id: order.order_id,
        product_id: product?.product_id || product?.id,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success('Valoración enviada');
      setRating(0);
      setComment('');
      setSelectedProduct(null);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al enviar valoración');
    } finally {
      setSubmitting(false);
    }
  };

  const displayStar = hoveredStar || rating;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-950">Valorar pedido</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Product selector (if multiple items) */}
              {items.length > 1 && (
                <div>
                  <p className="text-xs text-stone-500 mb-2">Selecciona el producto a valorar</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {items.map((item, idx) => {
                      const isSelected = (product?.product_id || product?.id) === (item.product_id || item.id);
                      return (
                        <button
                          key={idx}
                          onClick={() => { setSelectedProduct(item); setRating(0); setComment(''); }}
                          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                            isSelected
                              ? 'bg-stone-950 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {item.image && (
                            <img src={item.image} alt="" className="w-6 h-6 rounded object-cover" />
                          )}
                          <span className="truncate max-w-[120px]">{item.name || item.product_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected product */}
              {product && (
                <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                  {product.image && (
                    <img src={product.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-950 truncate">{product.name || product.product_name}</p>
                    <p className="text-xs text-stone-500">x{product.quantity}</p>
                  </div>
                </div>
              )}

              {/* Star rating */}
              <div className="text-center">
                <p className="text-sm text-stone-600 mb-2">¿Qué te ha parecido?</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setRating(star)}
                      aria-label={`Valorar ${star} estrella${star > 1 ? 's' : ''}`}
                      className="p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-stone-400 rounded-full"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= displayStar
                            ? 'fill-stone-950 text-stone-950'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs text-stone-500 mt-1">
                    {rating === 1 ? 'Malo' : rating === 2 ? 'Regular' : rating === 3 ? 'Bien' : rating === 4 ? 'Muy bien' : 'Excelente'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  Comentario <span className="text-stone-400">(opcional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-300 resize-none"
                />
                <p className="text-[10px] text-stone-400 text-right mt-0.5">{comment.length}/500</p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full py-3 bg-stone-950 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar valoración'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
