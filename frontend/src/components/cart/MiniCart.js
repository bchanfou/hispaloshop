import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Plus, Minus, Trash2, ShoppingBag, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const MiniCart = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, loading } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 4.90;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    onClose();
    navigate('/cart');
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    const current = cartItems.find(i => i.product_id === productId);
    if (!current) return;
    if (newQuantity > current.quantity) {
      await addToCart(productId, 1);
    } else {
      await removeFromCart(productId);
      if (newQuantity > 0) await addToCart(productId, newQuantity);
    }
  };

  const handleRemove = async (productId) => {
    await removeFromCart(productId);
  };

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
          />
          
          {/* Drawer */}
          <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="minicart-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <div>
                <h2 id="minicart-title" className="text-lg font-bold text-stone-950">Tu cesta</h2>
                <p className="text-sm text-stone-500">{totalItems} artículos</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
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
                    Tu cesta está vacía
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
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.product_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="flex gap-3 bg-stone-50 rounded-xl p-3"
                    >
                      <img
                        src={item.image || item.product?.image}
                        alt={item.name || item.product?.name}
                        className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-stone-950 text-sm line-clamp-2">
                              {item.name || item.product?.name}
                            </h4>
                            <p className="text-xs text-stone-500">
                              {item.producer || item.product?.producer?.name}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(item.product_id)}
                            className="p-1 hover:bg-stone-200 rounded-full transition-colors"
                            aria-label={`Eliminar ${item.name || item.product?.name}`}
                          >
                            <Trash2 className="w-4 h-4 text-stone-500" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-white rounded-xl">
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              className="p-1.5 hover:bg-stone-100 rounded-l-xl"
                              aria-label={`Disminuir cantidad de ${item.name || item.product?.name}`}
                            >
                              <Minus className="w-4 h-4 text-stone-950" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium" aria-live="polite" aria-label={`Cantidad: ${item.quantity}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              className="p-1.5 hover:bg-stone-100 rounded-r-xl"
                              aria-label={`Aumentar cantidad de ${item.name || item.product?.name}`}
                            >
                              <Plus className="w-4 h-4 text-stone-950" />
                            </button>
                          </div>
                          <span className="font-semibold text-stone-950">
                            €{((item.price || item.product?.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && cartItems.length > 0 && (
              <div className="border-t border-stone-200 p-4 space-y-4">
                {/* Shipping progress */}
                {subtotal < 50 && (
                  <div className="bg-stone-100 rounded-xl p-3 text-sm">
                    <p className="text-stone-950">
                      Añade <span className="font-semibold text-stone-950">€{(50 - subtotal).toFixed(2)}</span> más para envío gratis
                    </p>
                    <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-stone-950 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (subtotal / 50) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Envío
                    </span>
                    <span>{shipping === 0 ? 'GRATIS' : `€${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-stone-950 pt-2 border-t">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full py-3 bg-stone-950 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-stone-950/90 transition-colors disabled:opacity-70"
                >
                  Pagar ahora
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 border-2 border-stone-200 text-stone-950 rounded-xl font-medium hover:border-stone-950 hover:text-stone-950 transition-colors"
                >
                  Seguir comprando
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
