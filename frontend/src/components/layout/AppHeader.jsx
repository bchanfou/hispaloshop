import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const { cartItems } = useCart();
  // Only fetch notifications when authenticated — prevents 401 spam
  const { data: unreadData } = useUnreadNotifications({ enabled: !!user });
  const { unreadTotal: chatUnreadTotal } = useChatContext();

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const lastScrollY = useRef(0);

  const isAuthenticated = !!user;

  // Polled count is source of truth; WS events invalidate the cache for instant refresh
  const unreadCount = isAuthenticated ? (unreadData?.unread_count ?? 0) : 0;
  
  // Calculate total items from cartItems directly (reactive)
  const totalCartItems = useMemo(() => {
    if (!isAuthenticated) return 0;
    return cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  }, [cartItems, isAuthenticated]);

  // Scroll-aware border + shadow + hide-on-scroll-down
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      if (currentY > lastScrollY.current && currentY > 80) {
        setHidden(true);
      } else if (currentY < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cart bounce animation on add-to-cart
  useEffect(() => {
    const handleCartAdded = () => {
      setCartBounce(true);
      if (navigator.vibrate) navigator.vibrate([5, 30, 5]);
      setTimeout(() => setCartBounce(false), 500);
    };
    window.addEventListener('cart-added', handleCartAdded);
    return () => window.removeEventListener('cart-added', handleCartAdded);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b transition-all duration-300 pt-[env(safe-area-inset-top)] ${
        scrolled ? 'border-stone-200 shadow-nav' : 'border-stone-100'
      } ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
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
            onClick={() => window.dispatchEvent(new Event('open-global-search'))}
            aria-label="Buscar"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-transparent border-none cursor-pointer p-2 text-stone-950"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          {/* Messages */}
          <Link
            to={isAuthenticated ? '/messages' : '/login'}
            aria-label="Mensajes"
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full no-underline"
          >
            <MessageCircle size={20} className="text-stone-950" strokeWidth={1.8} />
            {chatUnreadTotal > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-stone-950 text-white text-[9px] font-extrabold px-1 leading-none">
                {chatUnreadTotal > 9 ? '9+' : chatUnreadTotal}
              </span>
            )}
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
              <span className={`absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-stone-950 text-white text-[9px] font-extrabold px-1 leading-none cart-badge ${cartBounce ? 'bouncing' : ''}`}>
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </Link>

          {/* Hamburger — last icon on the right */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-stone-100 border border-stone-200 cursor-pointer active:bg-stone-200"
          >
            <Menu size={22} className="text-stone-950" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
