import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ShoppingCart, Menu } from 'lucide-react';
import HamburgerMenu from './HamburgerMenu';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';
import Logo from '../brand/Logo';

export default function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  // Only fetch notifications when authenticated — prevents 401 spam
  const { data: unreadData } = useUnreadNotifications({ enabled: !!user });

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isAuthenticated = !!user;

  const unreadCount = isAuthenticated ? (unreadData?.count ?? 0) : 0;
  const totalCartItems = isAuthenticated ? getTotalItems() : 0;

  // Scroll-aware border + shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className=""
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky, 40)',
        background: '#ffffff',
        borderBottom: scrolled ? '1px solid #f5f5f4' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Hamburger Menu drawer */}
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Mobile Header ── */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
      }}>
        {/* Logo + brand name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 6 }}>
            <Logo variant="icon" theme="light" size={28} />
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#0c0a09',
              letterSpacing: '-0.02em',
              textTransform: 'lowercase',
              fontFamily: 'var(--font-sans)',
            }}>
              hispaloshop
            </span>
          </Link>
        </div>

        {/* Right icons: notif + cart + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Notification bell */}
          <Link to="/notifications" style={{ position: 'relative', ...iconButtonStyle }}>
            <Bell size={20} color="var(--color-black)" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span style={redBadgeStyle}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <Link to="/cart" style={{ position: 'relative', ...iconButtonStyle }}>
            <ShoppingCart size={20} color="var(--color-black)" strokeWidth={1.8} />
            {totalCartItems > 0 && (
              <span style={blackBadgeStyle}>
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </Link>

          {/* Hamburger — last icon on the right */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: '50%',
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <Menu size={22} color="var(--color-black)" strokeWidth={1.8} />
          </button>
        </div>
      </div>

    </header>
  );
}

/* ── Shared styles ── */
const iconButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: '50%',
  textDecoration: 'none',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
};

const redBadgeStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-full)',
  background: '#FF3040',
  color: '#ffffff',
  fontSize: 9,
  fontWeight: 800,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'var(--font-sans)',
};

const blackBadgeStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-black)',
  color: 'var(--color-white)',
  fontSize: 9,
  fontWeight: 800,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'var(--font-sans)',
};
