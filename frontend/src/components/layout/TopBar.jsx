import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function TopBar({
  title,
  backButton = false,
  rightContent,
  className = '',
}) {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  // Calculate cart count reactively from cartItems
  const cartCount = useMemo(() => {
    return cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  }, [cartItems]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-[52px] flex items-center justify-between px-4 bg-stone-50 transition-all duration-200 ${
        scrolled ? 'shadow-sm' : ''
      } ${className}`}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-[40px]">
        {backButton && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="bg-transparent border-none cursor-pointer p-1 flex text-stone-950"
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>

      {/* Center — title */}
      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-stone-950 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
          {title}
        </span>
      )}

      {/* Right */}
      <div className="flex items-center gap-3 min-w-[40px] justify-end">
        {rightContent}
        {cartCount > 0 && (
          <button
            onClick={() => navigate('/cart')}
            aria-label={`Carrito (${cartCount})`}
            className="relative bg-transparent border-none cursor-pointer p-1 flex text-stone-950"
          >
            <ShoppingBag size={22} />
            <span className="absolute -top-0.5 -right-1 bg-stone-950 text-white text-[8px] font-semibold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
