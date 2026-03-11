import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Package, FileCheck, ShoppingBag,
  LayoutDashboard, ArrowLeft, LogOut, Tag, Star,
  UserCheck, Menu, X, MoreHorizontal, Settings, ShieldAlert, FolderOpen
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';
import {
  useAdminDashboardStats,
  useDashboardLogout,
} from '../../features/dashboard/queries';

export default function AdminLayoutResponsive() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { data: stats } = useAdminDashboardStats(Boolean(user) && user?.role === 'admin');
  const logoutMutation = useDashboardLogout();
  const badges = {
    producers: stats?.pending_producers || 0,
    products: stats?.pending_products || 0,
    certificates: stats?.pending_certificates || 0,
  };

  // All navigation items
  const allNavItems = [
    { to: '/admin', icon: LayoutDashboard, label: t('admin.overview', 'Panel'), shortLabel: 'Inicio', end: true },
    { to: '/admin/producers', icon: Users, label: t('admin.producers', 'Productores'), shortLabel: 'Productores', badge: badges.producers },
    { to: '/admin/products', icon: Package, label: t('admin.products', 'Productos'), shortLabel: 'Productos', badge: badges.products },
    { to: '/admin/orders', icon: ShoppingBag, label: t('admin.ordersPayments', 'Pedidos'), shortLabel: 'Pedidos' },
    { to: '/admin/certificates', icon: FileCheck, label: t('admin.certificates', 'Certificados'), shortLabel: 'Cert.', badge: badges.certificates },
    { to: '/admin/discount-codes', icon: Tag, label: t('admin.discountCodes', 'Descuentos'), shortLabel: 'Descuentos' },
    { to: '/admin/influencers', icon: UserCheck, label: t('admin.influencers', 'Influencers'), shortLabel: 'Influencers' },
    { to: '/admin/reviews', icon: Star, label: t('admin.reviews', 'Reseñas'), shortLabel: 'Reseñas' },
    { to: '/admin/categories', icon: FolderOpen, label: t('admin.categories', 'Categorías'), shortLabel: 'Categ.' },
    { to: '/admin/escalation', icon: ShieldAlert, label: 'Escalar a SA', shortLabel: 'Escalar' },
  ];

  // Mobile bottom nav - first 4 + more menu
  const mobileNavItems = [
    ...allNavItems.slice(0, 4),
    { to: '#more', icon: MoreHorizontal, label: 'More', shortLabel: 'Más', onClick: () => setMoreMenuOpen(true) }
  ];

  // Items for "More" bottom sheet
  const moreMenuItems = allNavItems.slice(4);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/login');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-ds-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect super_admin to their dedicated dashboard
  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  // Access denied
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Acceso denegado. Se requieren privilegios de administrador.</p>
          <button 
            onClick={() => navigate('/login')} 
            className="text-stone-950 hover:underline font-medium"
          >
            Ir a Login
          </button>
        </div>
      </div>
    );
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
          Admin Panel
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
              <span>{t('common.back')}</span>
            </button>
            <LanguageSwitcher variant="minimal" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-text-primary tracking-editorial">
            {t('admin.dashboard')}
          </h1>
          <p className="text-xs text-text-muted mt-1">Hispaloshop Management</p>
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
                    ? 'bg-stone-100 text-stone-950 font-medium'
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
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border-default">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-muted">Administrador</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-600 transition-colors"
              aria-label="Cerrar sesión"
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
        {/* Mobile padding for header and bottom nav */}
        <div className="pt-[100px] pb-[76px] md:pt-0 md:pb-0">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ===== MOBILE HORIZONTAL TAB NAVIGATION ===== */}
      <div className="md:hidden fixed top-[56px] left-0 right-0 z-30 bg-white border-b border-stone-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {mobileNavItems.map((item) => {
            if (item.to === '#more') {
              return (
                <button
                  key="more"
                  onClick={() => setMoreMenuOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0"
                  data-testid="mobile-nav-more"
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  isActive ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'
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
            );
          })}
        </div>
      </div>

      {/* ===== MORE MENU BOTTOM SHEET ===== */}
      <BottomSheet
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title={t('common.moreOptions')}
      >
        <div className="p-4 space-y-2">
          {moreMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  isActive ? 'bg-stone-100 text-stone-950' : 'hover:bg-stone-100'
                }`
              }
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text-primary">{item.label}</p>
              </div>
              {item.badge > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
          
          {/* Logout option */}
          <button
            onClick={() => {
              setMoreMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-4 p-4 rounded-lg hover:bg-red-50 w-full text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-medium text-red-600">{t('common.logout')}</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
