import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';

/**
 * HomeHeader v2 — cream bg, logo text, bell + cart
 */
export default function HomeHeader({ activeTab, onTabChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems ? getTotalItems() : 0;

  const { data: notifData } = useUnreadNotifications();
  const unreadNotifs = user ? (notifData?.count ?? 0) : 0;

  const tabs = [
    { id: 'foryou', label: 'Para ti' },
    { id: 'following', label: 'Siguiendo' },
  ];

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: 'var(--color-cream)' }}
      data-testid="home-header"
    >
      <div className="flex h-[52px] items-center px-4">

        {/* Logo text */}
        <span
          className="shrink-0 select-none"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: 'var(--color-black)',
          }}
        >
          hispaloshop
        </span>

        {/* Center: pill toggle */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className="flex items-center p-[3px]"
            style={{ borderRadius: 'var(--radius-full)', background: 'var(--color-surface)' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className="transition-all duration-200"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  background: activeTab === tab.id ? 'var(--color-white)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-black)' : 'var(--color-stone)',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: bell + cart */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Notifications */}
          <button
            type="button"
            onClick={() => navigate(user ? '/notifications' : '/login')}
            className="relative flex h-10 w-10 items-center justify-center"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-black)' }}
            aria-label="Notificaciones"
          >
            <Bell size={22} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span
                className="absolute"
                style={{
                  top: 6, right: 6,
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: 'var(--color-green)',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>

          {/* Cart */}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative flex h-10 w-10 items-center justify-center"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-black)' }}
              aria-label={`Carrito (${cartCount})`}
            >
              <ShoppingBag size={22} strokeWidth={1.8} />
              <span
                className="absolute"
                style={{
                  top: 4, right: 2,
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: 'var(--color-green)',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 600,
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
      </div>
    </header>
  );
}
