import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Search, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { resolveUserImage } from '../../features/user/queries';

export default function ProductSearchModal({ isOpen, onClose, onSelect }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setSelectedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = { search: debouncedQuery.trim(), limit: 20 };
        if (user?.role === 'producer' || user?.role === 'seller') {
          params.seller_id = user.user_id;
        }
        const data = await apiClient.get('/products', { params });
        if (!cancelled) {
          const list = data?.products || data || [];
          setResults(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [debouncedQuery, user]);

  const handleSelect = useCallback((product) => {
    setSelectedId(product.product_id);
    onSelect(product);
    setTimeout(() => onClose(), 150);
  }, [onSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true, initialFocus: false }}>
          <div className="fixed inset-0 z-[60]">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-stone-950/50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-sm bg-stone-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-2 pb-3">
                <span className="text-[15px] font-semibold text-stone-950">
                  Etiquetar producto
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full border-none bg-stone-100 flex items-center justify-center cursor-pointer text-stone-950"
                  aria-label="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3 relative">
                <Search
                  size={15}
                  className="absolute left-7 top-[11px] text-stone-500 pointer-events-none"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-xl py-2.5 pr-3 pl-9 text-[13px] text-stone-950 outline-none box-border"
                />
              </div>

              {/* Results */}
              <div className="overflow-y-auto flex-1">
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-stone-500" />
                  </div>
                )}

                {!loading && debouncedQuery.trim() && results.length === 0 && (
                  <p className="text-center py-8 px-4 text-[13px] text-stone-500">
                    No se encontraron productos
                  </p>
                )}

                {!loading && results.map((product, idx) => {
                  const thumb = product.images?.[0] || product.image;
                  const isSelected = selectedId === product.product_id;

                  return (
                    <button
                      key={product.product_id}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className={`flex items-center gap-3 w-full px-4 py-3 bg-transparent border-none cursor-pointer text-left ${
                        idx < results.length - 1 ? 'border-b border-stone-200' : ''
                      }`}
                      style={idx < results.length - 1 ? { borderBottom: '1px solid #e7e5e4' } : {}}
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                        {thumb ? (
                          <img
                            src={resolveUserImage(thumb)}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-stone-950 overflow-hidden text-ellipsis whitespace-nowrap m-0">
                          {product.name}
                        </p>
                        {product.price != null && (
                          <p className="text-xs text-stone-500 mt-0.5 mb-0">
                            {Number(product.price).toFixed(2)} &euro;
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-[22px] h-[22px] rounded-full bg-stone-950 flex items-center justify-center shrink-0">
                          <Check size={13} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
