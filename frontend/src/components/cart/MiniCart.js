import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Plus, Minus, Trash2, ShoppingBag, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

// Currency-aware formatters (no longer hardcoded EUR)
const makeFmt = (currencyCode) => {
  const cur = currencyCode || 'EUR';
  return {
    fmt: (cents) => ((cents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: cur }),
    fmtUnit: (eur) => (eur || 0).toLocaleString(undefined, { style: 'currency', currency: cur }),
  };
};

const MiniCart = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getShippingPreview, loading, appliedDiscount } = useCart();
  const { currency } = useLocale();
  const { t } = useTranslation();
  const { fmt, fmtUnit } = useMemo(() => makeFmt(currency), [currency]);
  const [shippingData, setShippingData] = useState(null);
  const prevCountRef = useRef(cartItems.length);

  const subtotal = cartItems.reduce((sum, item) => {
    const unitPrice = (item.unit_price_cents || 0) / 100;
    return sum + unitPrice * item.quantity;
  }, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch real shipping estimate
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      getShippingPreview().then(setShippingData).catch(() => setShippingData(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cartItems.length]);

  const [imgErrors, setImgErrors] = useState({});
  // Track when new items are added for slide-in animation
  const [newItemKeys, setNewItemKeys] = useState(new Set());
  useEffect(() => {
    if (cartItems.length > prevCountRef.current) {
      // Identify new items by building a set of current keys vs what we had
      const allKeys = cartItems.map(
        (item) => `${item.product_id}-${item.variant_id || ''}-${item.pack_id || ''}`,
      );
      // Mark the last N new items (difference in count)
      const newCount = cartItems.length - prevCountRef.current;
      const newest = new Set(allKeys.slice(-newCount));
      setNewItemKeys(newest);
      // Clear after animation
      const timer = setTimeout(() => setNewItemKeys(new Set()), 500);
      prevCountRef.current = cartItems.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartItems.length;
  }, [cartItems]);

  const shippingKnown = shippingData?.total_shipping_cents != null;
  const shippingCents = shippingData?.total_shipping_cents ?? 0;
  const shipping = shippingCents / 100;
  const stores = shippingData?.stores || [];
  const hasMultipleStores = stores.length > 1;
  // Use minimum threshold across all stores
  const freeShippingThreshold = stores.length > 0
    ? Math.min(...stores.map(s => (s.free_threshold_cents || s.threshold_cents || 3000))) / 100
    : 30;
  const discountEur = appliedDiscount?.discount_cents ? appliedDiscount.discount_cents / 100 : 0;
  // Include shipping in total when available, otherwise show subtotal only
  const total = Math.max(0, subtotal + (shippingKnown ? shipping : 0) - discountEur);

  // Group items by producer
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const producerName = item.seller_name || item.producer || item.product?.producer?.name || 'Tienda';
      if (!groups[producerName]) groups[producerName] = [];
      groups[producerName].push(item);
    });
    return groups;
  }, [cartItems]);

  const handleDirectCheckout = () => {
    onClose?.();
    navigate('/checkout');
  };

  const handleViewCart = () => {
    onClose?.();
    navigate('/cart');
  };

  const handleUpdateQuantity = async (item, newQuantity) => {
    await updateQuantity(item.product_id, newQuantity, item.variant_id || null, item.pack_id || null);
  };

  const handleRemove = async (item) => {
    await removeFromCart(item.product_id, item.variant_id || null, item.pack_id || null);
  };

  const getItemKey = (item) =>
    `${item.product_id}-${item.variant_id || ''}-${item.pack_id || ''}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
            aria-hidden="true"
          />

          {/* Drawer */}
          <FocusTrap focusTrapOptions={{ escapeDeactivates: true, onDeactivate: onClose, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="minicart-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <div>
                <h2 id="minicart-title" className="text-lg font-bold text-stone-950">{t('cart.title', 'Tu cesta')}</h2>
                <p className="text-sm text-stone-500">{totalItems > 0 ? `${totalItems} ${t('common.items', 'items')}` : t('cart.empty', 'Sin artículos')}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5 text-stone-950" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-stone-950 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-10 h-10 text-stone-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-stone-950 mb-2">
                    {t('cart.empty', 'Tu cesta está vacía')}
                  </h3>
                  <p className="text-stone-500 mb-6">
                    ¿Buscas algo en particular?
                  </p>
                  <button
                    onClick={() => { onClose(); navigate('/discover'); }}
                    className="px-6 py-3 bg-stone-950 text-white rounded-full font-medium"
                  >
                    Explorar productos
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {Object.entries(groupedItems).map(([producerName, items]) => (
                    <div key={producerName}>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{producerName}</p>
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                        {items.map((item) => {
                          const key = getItemKey(item);
                          const isNew = newItemKeys.has(key);
                          return (
                            <motion.div
                              key={key}
                              layout
                              initial={isNew ? { x: 100, opacity: 0 } : { opacity: 0, y: 20 }}
                              animate={{ x: 0, y: 0, opacity: 1 }}
                              exit={{ opacity: 0, x: -100 }}
                              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                              className="flex gap-3 bg-stone-50 rounded-2xl p-3"
                            >
                              <div className="w-20 h-20 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {(item.product_image || item.image || item.product?.image) && !imgErrors[`${item.product_id}-${item.variant_id||''}-${item.pack_id||''}`] ? (
                                  <img
                                    src={item.product_image || item.image || item.product?.image}
                                    alt={item.product_name || item.name || item.product?.name || ''}
                                    className="w-full h-full object-cover"
                                    onError={() => { const k = `${item.product_id}-${item.variant_id||''}-${item.pack_id||''}`; setImgErrors(prev => ({ ...prev, [k]: true })); }}
                                  />
                                ) : (
                                  <ShoppingBag className="w-6 h-6 text-stone-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-stone-950 text-sm line-clamp-2">
                                    {item.product_name || item.name || item.product?.name}
                                  </h4>
                                  <button
                                    onClick={() => handleRemove(item)}
                                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-200 rounded-full transition-colors"
                                    aria-label={`Eliminar ${item.product_name || item.name || item.product?.name}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-stone-400 hover:text-stone-950 transition-colors" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <motion.button
                                      whileTap={item.quantity > 1 ? { scale: 0.88 } : undefined}
                                      onClick={() => item.quantity > 1 ? handleUpdateQuantity(item, item.quantity - 1) : removeFromCart(item.product_id, item.variant_id || null, item.pack_id || null)}
                                      className={`w-11 h-11 flex items-center justify-center rounded-full border transition-colors ${item.quantity <= 1 ? 'border-stone-100 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'}`}
                                      aria-label={item.quantity <= 1 ? `Eliminar ${item.product_name || item.name || ''}` : `Disminuir cantidad de ${item.product_name || item.name || ''}`}
                                    >
                                      {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-stone-400" /> : <Minus className="w-3.5 h-3.5 text-stone-950" />}
                                    </motion.button>
                                    <span className="w-6 text-center text-sm font-semibold text-stone-950" aria-live="polite" aria-label={`Cantidad: ${item.quantity}`}>
                                      {item.quantity}
                                    </span>
                                    <motion.button
                                      whileTap={{ scale: 0.88 }}
                                      onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                      disabled={item.stock != null && item.quantity >= item.stock}
                                      className={`w-11 h-11 flex items-center justify-center rounded-full border transition-colors ${item.stock != null && item.quantity >= item.stock ? 'border-stone-100 bg-stone-50 opacity-40' : 'border-stone-200 hover:bg-stone-50'}`}
                                      aria-label={`Aumentar cantidad de ${item.product_name || item.name || ''}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-stone-950" />
                                    </motion.button>
                                  </div>
                                  <span className="font-semibold text-stone-950">
                                    {fmt((item.unit_price_cents || 0) * item.quantity)}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && cartItems.length > 0 && (
              <div className="border-t border-stone-200 p-4 space-y-4">
                {/* Shipping progress */}
                {hasMultipleStores ? (
                  <div className="bg-stone-100 rounded-2xl p-3 text-sm">
                    <p className="text-stone-950 font-medium">Envío calculado por tienda</p>
                    <p className="text-stone-500 text-xs mt-0.5">Revisa el detalle en el carrito</p>
                  </div>
                ) : subtotal < freeShippingThreshold ? (
                  <div className="bg-stone-100 rounded-2xl p-3 text-sm">
                    <p className="text-stone-950">
                      Añade <span className="font-semibold text-stone-950">{fmtUnit(freeShippingThreshold - subtotal)}</span> más para envío gratis
                    </p>
                    <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-950 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Summary with shipping estimate */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal</span>
                    <span>{fmtUnit(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Envío
                    </span>
                    <span className="text-stone-400 text-xs">Calculado en el carrito</span>
                  </div>
                  {discountEur > 0 && (
                    <div className="flex justify-between text-stone-500">
                      <span>Descuento</span>
                      <span>-{fmtUnit(discountEur)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-stone-950 pt-2 border-t border-stone-200">
                    <div className="flex flex-col">
                      <span>Subtotal</span>
                      <span className="text-[11px] text-stone-400 font-normal">Sin envío · Ver carrito para total</span>
                    </div>
                    <span>{fmtUnit(total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={handleDirectCheckout}
                  className="w-full h-11 bg-stone-950 text-white rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                >
                  Pagar ahora
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={handleViewCart}
                  className="w-full py-3 border-2 border-stone-200 text-stone-950 rounded-full font-medium hover:border-stone-950 hover:text-stone-950 transition-colors text-sm"
                >
                  {t('cart.viewCart', 'Ver carrito')}
                </button>
              </div>
            )}
          </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
};

export default MiniCart;
