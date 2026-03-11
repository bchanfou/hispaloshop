import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CartButton = ({ className = '', onClick }) => {
  const { cartItems, loading } = useCart();
  
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-stone-100 transition-colors ${className}`}
      aria-label="Abrir carrito"
    >
      <ShoppingBag className="w-6 h-6 text-stone-950" />
      
      <AnimatePresence>
        {totalItems > 0 && !loading && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-state-error text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {totalItems > 9 ? '9+' : totalItems}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default CartButton;
