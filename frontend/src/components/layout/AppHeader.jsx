import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ShoppingCart, Menu, Search, MessageCircle } from 'lucide-react';
import HamburgerMenu from './HamburgerMenu';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';
import { useChatContext } from '../../context/chat/ChatProvider';
import Logo from '../brand/Logo';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  // Only fetch notifications when authenticated — prevents 401 spam
  const { data: unreadData } = useUnreadNotifications({ enabled: !!user });
  const { notifUnreadCount: wsCount } = useChatContext();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthenticated = !!user;

  // WS count is real-time; polled count is fallback
  const unreadCount = isAuthenticated
    ? (wsCount > 0 ? wsCount : (unreadData?.count ?? 0))
    : 0;
  const totalCartItems = isAuthenticated ? getTotalItems() : 0;

  // Scroll-aware border + shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b transition-all duration-200 pt-[env(safe-area-inset-top)] ${
        scrolled ? 'border-stone-200 shadow-nav' : 'border-stone-100'
      }`}
    >
      {/* Hamburger Menu drawer */}
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Mobile Header ── */}
      <div className="flex h-[52px] items-center justify-between px-4">
        {/* Logo + brand name */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1.5 no-underline">
            <Logo variant="icon" theme="light" size={28} />
            <span className="hidden min-[360px]:inline text-xl font-extrabold text-stone-950 tracking-tight lowercase">
              hispaloshop
            </span>
          </Link>
        </div>

        {/* Right icons: search + notif + cart + hamburger */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => navigate('/search')}
            aria-label="Buscar"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-transparent border-none cursor-pointer p-2 text-stone-950"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          {/* Messages */}
          <Link
            to="/messages"
            aria-label="Mensajes"
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full no-underline"
          >
            <MessageCircle size={20} className="text-stone-950" strokeWidth={1.8} />
          </Link>

          {/* Notification bell */}
          <Link
            to="/notifications"
            aria-label="Notificaciones"
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full no-underline"
          >
            <Bell size={20} className="text-stone-950" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-stone-950 text-white text-[9px] font-extrabold px-1 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            aria-label="Carrito"
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full no-underline"
          >
            <ShoppingCart size={20} className="text-stone-950" strokeWidth={1.8} />
            {totalCartItems > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-stone-950 text-white text-[9px] font-extrabold px-1 leading-none">
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </Link>

          {/* Hamburger — last icon on the right */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-transparent border-none cursor-pointer"
          >
            <Menu size={22} className="text-stone-950" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
