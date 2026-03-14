import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Film,
  Plus,
  User,
  ShoppingCart,
  Bell,
  Search,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTranslation } from 'react-i18next';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';

const NAV_ITEMS = [
  { key: 'home',     to: '/',          icon: Home,      labelKey: 'nav.home',     fallback: 'Inicio' },
  { key: 'search',   to: '/search',    icon: Search,    labelKey: 'nav.search',   fallback: 'Buscar' },
  { key: 'explore',  to: '/discover',  icon: Compass,   labelKey: 'nav.explore',  fallback: 'Explorar' },
  { key: 'reels',    to: '/reels',     icon: Film,      labelKey: 'nav.reels',    fallback: 'Reels' },
  { key: 'messages', to: '/chat',      icon: MessageCircle, labelKey: 'nav.messages', fallback: 'Mensajes' },
  { key: 'notifications', to: '/notifications', icon: Bell, labelKey: 'nav.notifications', fallback: 'Notificaciones' },
];

export default function SideNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { getTotalItems } = useCart();
  const { data: unreadData } = useUnreadNotifications();
  const unreadCount = user ? (unreadData?.count ?? 0) : 0;
  const totalCartItems = getTotalItems();

  const profileUserId = user?.user_id || user?.id || null;
  const profileUrl = profileUserId ? `/user/${profileUserId}` : (user ? '/profile' : '/login');
  const profileImage = user?.profile_image || user?.avatar_url || null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden lg:flex w-[var(--hs-sidebar-w)] flex-col border-r bg-white"
      style={{ borderColor: 'var(--hs-border)' }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50">
          <img src="/logo.png" alt="Hispaloshop" className="h-6 w-6 object-contain" loading="lazy" />
        </div>
        <span className="text-base font-semibold tracking-tight text-stone-950">Hispaloshop</span>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-stone-100 font-semibold text-stone-950'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? 'text-stone-950' : 'text-stone-500 group-hover:text-stone-700'}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.key === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-950 px-0.5 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span>{t(item.labelKey, item.fallback)}</span>
            </Link>
          );
        })}

        {/* Create button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-creator'))}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-950"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md border border-stone-300">
            <Plus className="h-3.5 w-3.5 text-stone-700" strokeWidth={2.2} />
          </div>
          <span>{t('nav.create', 'Crear')}</span>
        </button>

        {/* Cart */}
        <Link
          to="/cart"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            isActive('/cart')
              ? 'bg-stone-100 font-semibold text-stone-950'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" strokeWidth={isActive('/cart') ? 2.2 : 1.8} />
            {totalCartItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-950 px-0.5 text-[9px] font-bold text-white">
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </div>
          <span>{t('nav.cart', 'Cesta')}</span>
        </Link>
      </nav>

      {/* Profile footer */}
      <div className="border-t px-3 py-3" style={{ borderColor: 'var(--hs-border)' }}>
        <Link
          to={profileUrl}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            isActive(profileUrl)
              ? 'bg-stone-100 font-semibold text-stone-950'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
          }`}
        >
          {profileImage ? (
            <img src={profileImage} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-stone-200" />
          ) : (
            <User className="h-5 w-5 text-stone-500" strokeWidth={1.8} />
          )}
          <span className="truncate">
            {user?.name || user?.full_name || user?.username || t('nav.profile', 'Perfil')}
          </span>
        </Link>
      </div>
    </aside>
  );
}
