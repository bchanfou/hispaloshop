import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  ShoppingBag, User, LayoutDashboard, ArrowLeft, LogOut, 
  Store, Sparkles, Heart, MoreHorizontal, Zap, Bookmark
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';

import { API } from '../../utils/api';

export default function CustomerLayoutResponsive() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [badges, setBadges] = useState({ pending_orders: 0 });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API}/customer/stats`, { withCredentials: true });
      setBadges({ pending_orders: response.data.pending_orders || 0 });
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  // All navigation items
  const allNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('customer.overview', 'Resumen'), shortLabel: 'Inicio', end: true },
    { to: '/dashboard/orders', icon: ShoppingBag, label: t('customer.myOrders', 'Pedidos'), shortLabel: 'Pedidos', badge: badges.pending_orders },
    { to: '/dashboard/followed-stores', icon: Heart, label: t('customer.followedStores', 'Seguidas'), shortLabel: 'Tiendas' },
    { to: '/dashboard/wishlist', icon: Bookmark, label: t('wishlist.title', 'Lista de deseos'), shortLabel: 'Deseos' },
    { to: '/dashboard/profile', icon: User, label: t('customer.profile', 'Perfil'), shortLabel: 'Perfil' },
    { to: '/dashboard/ai-preferences', icon: Sparkles, label: t('customer.aiPreferences', 'Hispalo AI'), shortLabel: 'AI' },
    { to: '/dashboard/predictions', icon: Zap, label: t('customer.predictions', 'Predict'), shortLabel: 'Predict' },
  ];

  // Mobile bottom nav - all 5 items fit
  const mobileNavItems = allNavItems;

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-ds-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Inicia sesión para acceder a tu cuenta.</p>
          <button 
            onClick={() => navigate('/login')} 
            className="text-ds-accent hover:underline font-medium"
          >
            Ir a Login
          </button>
        </div>
      </div>
    );
  }

  // Redirect non-customers to their appropriate dashboards
  if (user.role === 'producer' || user.role === 'importer') {
    navigate('/producer', { replace: true });
    return null;
  }
  if (user.role === 'admin') {
    navigate('/admin', { replace: true });
    return null;
  }
  if (user.role === 'super_admin') {
    navigate('/super-admin', { replace: true });
    return null;
  }
  if (user.role === 'influencer') {
    navigate('/influencer/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
          data-testid="mobile-back-button"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <h1 className="font-heading text-base font-semibold text-text-primary">
          {t('customer.myAccount', 'Mi Cuenta')}
        </h1>
        
        <LanguageSwitcher variant="minimal" />
      </header>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex desktop-sidebar">
        {/* Header */}
        <div className="p-5 border-b border-border-default">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm"
              data-testid="desktop-back-button"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>{t('common.back', 'Volver')}</span>
            </button>
            <LanguageSwitcher variant="minimal" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-text-primary tracking-editorial">
            {t('customer.myAccount', 'Mi Cuenta')}
          </h1>
          <p className="text-xs text-text-muted mt-1">{t('customer.manageAccount', 'Gestiona tu cuenta')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-ds-accent/10 text-ds-accent font-medium'
                    : 'text-text-secondary hover:bg-stone-100'
                }`
              }
              data-testid={`desktop-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
          
          {/* Shop Link */}
          <NavLink
            to="/products"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-stone-100 mt-4 border-t border-border-default pt-4 text-sm"
          >
            <Store className="w-5 h-5" strokeWidth={1.5} />
            <span>{t('customer.continueShopping', 'Seguir Comprando')}</span>
          </NavLink>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border-default">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-600 transition-colors"
              title="Cerrar sesión"
              data-testid="desktop-logout-button"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="md:ml-64">
        <div className="pt-[100px] pb-[76px] md:pt-0 md:pb-0">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ===== MOBILE HORIZONTAL TAB NAVIGATION ===== */}
      <div className="md:hidden fixed top-[56px] left-0 right-0 z-30 bg-white border-b border-stone-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  isActive ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-stone-500'
                }`
              }
              data-testid={`mobile-nav-${item.shortLabel.toLowerCase()}`}
            >
              <div className="relative">
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
