import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check, Loader2, Plus, Minus, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const getProductId = (product) => product?.product_id || product?.id || null;

const AddToCartButton = ({ 
  product, 
  variant = 'default', // 'default', 'small', 'quick', 'buy-now'
  showQuantity = false,
  onAdd,
  className = ''
}) => {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const [state, setState] = useState('idle'); // idle, loading, success
  const [quantity, setQuantity] = useState(1);
  const mountedRef = useRef(true);
  const addingRef = useRef(false); // Debounce guard against double-adds
  useEffect(() => () => { mountedRef.current = false; }, []);
  const productId = getProductId(product);

  // Check if product is already in cart (match by product + variant + pack)
  const variantId = product?.selectedVariantId || product?.variant_id || null;
  const packId = product?.selectedPackId || product?.pack_id || null;
  const existingItem = cartItems.find((item) => {
    if (String(item.product_id) !== String(productId)) return false;
    if (variantId && String(item.variant_id || '') !== String(variantId)) return false;
    if (packId && String(item.pack_id || '') !== String(packId)) return false;
    return true;
  });
  const inCartQuantity = existingItem?.quantity || 0;

  const handleAdd = async () => {
    if (state === 'loading' || addingRef.current || !productId) return false;

    addingRef.current = true;
    setState('loading');

    try {
      await addToCart(productId, quantity, variantId, packId);
      setState('success');
      if (onAdd) onAdd(product);
      setTimeout(() => {
        if (mountedRef.current) {
          setState('idle');
          setQuantity(1);
        }
        addingRef.current = false;
      }, 2000);
      return true;
    } catch (error) {
      if (mountedRef.current) setState('idle');
      addingRef.current = false;
      toast.error('Error al añadir el producto al carrito');
      return false;
    }
  };

  const handleBuyNow = async () => {
    const success = await handleAdd();
    if (success) navigate('/cart');
  };

  const variants = {
    'default': {
      button: 'flex-1 py-3 px-4 bg-stone-950 text-white rounded-xl font-medium',
      icon: 'w-5 h-5',
      text: inCartQuantity > 0 ? `${inCartQuantity} en cesta` : 'Añadir al carrito'
    },
    'small': {
      button: 'p-2 bg-stone-950 text-white rounded-xl',
      icon: 'w-4 h-4',
      text: ''
    },
    'quick': {
      button: 'w-full py-2 bg-stone-950 text-white rounded-xl text-sm font-medium',
      icon: 'w-4 h-4',
      text: inCartQuantity > 0 ? `+${inCartQuantity}` : 'Añadir'
    },
    'buy-now': {
      button: 'w-full py-3 bg-stone-950 text-white rounded-xl font-semibold hover:bg-stone-800',
      icon: 'w-5 h-5',
      text: 'Comprar ahora'
    }
  };

  const style = variants[variant];

  // Buy Now variant
  if (variant === 'buy-now') {
    return (
      <motion.button
        onClick={handleBuyNow}
        disabled={state === 'loading' || !productId}
        aria-label="Comprar ahora"
        className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
        whileTap={{ scale: 0.98 }}
      >
        <Zap className={style.icon} />
        <span>Comprar ahora</span>
      </motion.button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showQuantity && (
        <div className="flex items-center bg-stone-100 rounded-xl">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-200 rounded-l-xl transition-colors"
            disabled={state === 'loading'}
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-4 h-4 text-stone-950" />
          </button>
          <span className="w-10 text-center font-medium text-stone-950" aria-live="polite">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-200 rounded-r-xl transition-colors"
            disabled={state === 'loading'}
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-4 h-4 text-stone-950" />
          </button>
        </div>
      )}
      
      <motion.button
        onClick={handleAdd}
        disabled={state === 'loading' || !productId}
        aria-label={state === 'success' ? 'Producto añadido' : state === 'loading' ? 'Añadiendo al carrito' : 'Añadir al carrito'}
        className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          state === 'success' ? 'bg-stone-700' : ''
        } ${inCartQuantity > 0 && state === 'idle' ? 'bg-stone-700' : ''}`}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {state === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className={`${style.icon} animate-spin`} />
            </motion.div>
          ) : state === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Check className={style.icon} />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ShoppingBag className={style.icon} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {style.text && (
          <span>
            {state === 'loading' ? 'Añadiendo...' : 
             state === 'success' ? '¡Añadido!' : 
             style.text}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default AddToCartButton;
