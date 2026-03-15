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
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10,10,10,0.5)',
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--color-white)',
                borderRadius: '20px 20px 0 0',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>
                  Etiquetar producto
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-black)',
                  }}
                  aria-label="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '0 16px 12px', position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 28,
                    top: 11,
                    color: 'var(--color-stone)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  style={{
                    width: '100%',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px 10px 36px',
                    fontSize: 13,
                    color: 'var(--color-black)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Results */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-stone)' }} />
                  </div>
                )}

                {!loading && debouncedQuery.trim() && results.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '32px 16px', fontSize: 13, color: 'var(--color-stone)' }}>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: idx < results.length - 1 ? '1px solid var(--color-border)' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: 'var(--color-surface)',
                          flexShrink: 0,
                        }}
                      >
                        {thumb ? (
                          <img
                            src={resolveUserImage(thumb)}
                            alt={product.name}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-black)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }}>
                          {product.name}
                        </p>
                        {product.price != null && (
                          <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0' }}>
                            {Number(product.price).toFixed(2)} &euro;
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'var(--color-green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={13} style={{ color: '#fff' }} />
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
