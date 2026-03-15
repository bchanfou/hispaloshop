import React, { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Check, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLocale } from '../../context/LocaleContext';

const getProductId = (product) => product?.product_id || product?.id || null;

function ProductDrawer({ isOpen, onClose, product }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { convertAndFormatPrice } = useLocale();
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) return null;

  const productId = getProductId(product);
  const displayPrice = convertAndFormatPrice(product.price, 'EUR');

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Inicia sesión para añadir productos', {
        action: { label: 'Entrar', onClick: () => { window.location.href = '/login'; } },
      });
      return;
    }
    if (!productId) return;
    const success = await addToCart(productId, 1);
    if (success) {
      setAddedToCart(true);
      toast.success('Añadido al carrito');
      setTimeout(() => setAddedToCart(false), 2000);
    } else {
      toast.error('Error al añadir');
    }
  };

  const handleViewProduct = () => {
    onClose();
    if (productId) navigate(`/products/${productId}`);
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
            className="fixed inset-0 z-50 bg-black/60"
          />

          <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto"
            style={{
              borderRadius: '20px 20px 0 0',
              background: 'var(--color-white, #fff)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <div style={{ width: 40, height: 4, borderRadius: 'var(--radius-full)', background: 'var(--color-border)' }} />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Cerrar producto"
              style={{
                position: 'absolute', right: 16, top: 16,
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--color-surface)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} strokeWidth={2} color="var(--color-stone)" />
            </button>

            {/* Image */}
            <div style={{ height: 220, background: 'var(--color-surface)', overflow: 'hidden' }}>
              {product.image ? (
                <img src={product.image} alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>

            {/* Info */}
            <div style={{ padding: '16px 16px 0' }}>
              <h2 style={{
                fontSize: 18, fontWeight: 600, color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)', lineHeight: 1.3,
              }}>
                {product.name}
              </h2>
              <p style={{
                fontSize: 20, fontWeight: 600, color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)', marginTop: 4,
              }}>
                {displayPrice}
              </p>

              {product.description && (
                <p style={{
                  fontSize: 13, color: 'var(--color-stone)', lineHeight: 1.5,
                  fontFamily: 'var(--font-sans)', marginTop: 12,
                }}>
                  {product.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{
              padding: 16,
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {/* Green buy button */}
              <button
                onClick={handleAddToCart}
                style={{
                  width: '100%', height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: addedToCart ? 'var(--color-black)' : 'var(--color-green)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  transition: 'var(--transition-fast)',
                }}
              >
                {addedToCart ? (
                  <><Check size={20} strokeWidth={2.5} /> Añadido</>
                ) : (
                  <><ShoppingCart size={20} strokeWidth={2} /> Añadir al carrito · {displayPrice}</>
                )}
              </button>

              {/* View product link */}
              <button
                onClick={handleViewProduct}
                style={{
                  width: '100%', height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-black)', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)',
                }}
              >
                Ver ficha completa
              </button>
            </div>
          </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
}

export default ProductDrawer;
