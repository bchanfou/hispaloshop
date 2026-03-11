import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check, Loader2, Plus, Minus, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

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

  // Check if product is already in cart
  const existingItem = cartItems.find(item => item.product_id === product.id);
  const inCartQuantity = existingItem?.quantity || 0;

  const handleAdd = async () => {
    if (state === 'loading') return;
    
    setState('loading');
    
    try {
      await addToCart(product.id, quantity);
      setState('success');
      
      if (onAdd) onAdd(product);
      
      // Reset after animation
      setTimeout(() => {
        setState('idle');
        setQuantity(1);
      }, 2000);
    } catch (error) {
      setState('idle');
    }
  };

  const handleBuyNow = async () => {
    await handleAdd();
    navigate('/cart');
  };

  const variants = {
    'default': {
      button: 'flex-1 py-3 px-4 bg-accent text-white rounded-xl font-medium',
      icon: 'w-5 h-5',
      text: inCartQuantity > 0 ? `${inCartQuantity} en cesta` : 'Añadir al carrito'
    },
    'small': {
      button: 'p-2 bg-accent text-white rounded-lg',
      icon: 'w-4 h-4',
      text: ''
    },
    'quick': {
      button: 'w-full py-2 bg-accent text-white rounded-lg text-sm font-medium',
      icon: 'w-4 h-4',
      text: inCartQuantity > 0 ? `+${inCartQuantity}` : 'Añadir'
    },
    'buy-now': {
      button: 'w-full py-3 bg-state-amber text-white rounded-xl font-semibold',
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
        disabled={state === 'loading'}
        className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-70`}
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
        <div className="flex items-center bg-gray-100 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-stone-200 rounded-l-lg transition-colors"
            disabled={state === 'loading'}
          >
            <Minus className="w-4 h-4 text-stone-950" />
          </button>
          <span className="w-10 text-center font-medium text-stone-950">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 hover:bg-stone-200 rounded-r-lg transition-colors"
            disabled={state === 'loading'}
          >
            <Plus className="w-4 h-4 text-stone-950" />
          </button>
        </div>
      )}
      
      <motion.button
        onClick={handleAdd}
        disabled={state === 'loading'}
        className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${
          state === 'success' ? 'bg-state-success' : ''
        } ${inCartQuantity > 0 && state === 'idle' ? 'bg-state-amber' : ''}`}
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
