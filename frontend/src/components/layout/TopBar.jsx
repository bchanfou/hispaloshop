import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function TopBar({
  title,
  backButton = false,
  rightContent,
  style,
}) {
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems ? getTotalItems() : 0;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--color-cream)',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        transition: 'box-shadow var(--transition-base)',
        ...style,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 40 }}>
        {backButton && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              color: 'var(--color-black)',
            }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>

      {/* Center — title */}
      {title && (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-black)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '60%',
          }}
        >
          {title}
        </span>
      )}

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 40, justifyContent: 'flex-end' }}>
        {rightContent}
        {cartCount > 0 && (
          <button
            onClick={() => navigate('/cart')}
            aria-label={`Carrito (${cartCount})`}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              color: 'var(--color-black)',
            }}
          >
            <ShoppingBag size={22} />
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -4,
                background: 'var(--color-black)',
                color: '#fff',
                fontSize: 8,
                fontWeight: 600,
                width: 14,
                height: 14,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
