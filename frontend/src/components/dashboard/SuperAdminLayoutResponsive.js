import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield, ArrowLeft, LogOut, Users, BarChart3,
  TrendingUp, Globe, Package, MoreHorizontal, Wallet, ShieldAlert
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import GlobalSearch from '../GlobalSearch';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';

export default function SuperAdminLayoutResponsive() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // All navigation items
  const allNavItems = [
    { to: '/super-admin', icon: Shield, label: 'Overview', shortLabel: 'Overview', end: true },
    { to: '/super-admin/admins', icon: Users, label: t('superAdmin.manageAdmins', 'Admins'), shortLabel: 'Admins' },
    { to: '/super-admin/users', icon: Globe, label: t('admin.userManagement', 'Users'), shortLabel: 'Usuarios' },
    { to: '/super-admin/finance', icon: Wallet, label: 'Contabilidad', shortLabel: 'Finanzas' },
    { to: '/super-admin/markets', icon: Globe, label: 'Mercados', shortLabel: 'Mercados' },
    { to: '/super-admin/content', icon: Package, label: t('contentManagement.title', 'Content'), shortLabel: 'Contenido' },
    { to: '/super-admin/insights', icon: BarChart3, label: t('superAdmin.customerInsights', 'Insights'), shortLabel: 'Insights' },
    { to: '/super-admin/analytics', icon: TrendingUp, label: t('superAdmin.analytics', 'Analytics'), shortLabel: 'Analytics' },
    { to: '/super-admin/escalation', icon: ShieldAlert, label: 'Escalaciones', shortLabel: 'Escalar' },
  ];

  // Mobile bottom nav - first 4 + more
  const mobileNavItems = [
    ...allNavItems.slice(0, 4),
    { to: '#more', icon: MoreHorizontal, label: 'More', shortLabel: 'Más' }
  ];

  // Items for "More" bottom sheet
  const moreMenuItems = allNavItems.slice(4);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-heading text-xl font-semibold text-text-primary mb-2">
            {t('common.accessDenied', 'Acceso Denegado')}
          </h1>
          <p className="text-text-muted mb-4">{t('superAdmin.onlySuperAdmin', 'Solo Super Admins pueden acceder')}</p>
          <button
            onClick={() => navigate('/')}
            className="text-ds-accent hover:underline font-medium"
          >
            {t('common.back', 'Volver')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalSearch />
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
          data-testid="mobile-back-button"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          <h1 className="font-heading text-base font-semibold text-text-primary">
            Super Admin
          </h1>
        </div>
        
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold text-text-primary tracking-editorial">
                {t('superAdmin.title', 'Super Admin')}
              </h1>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-red-50 text-red-700 font-medium border border-red-200'
                    : 'text-text-secondary hover:bg-stone-100'
                }`
              }
              data-testid={`desktop-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border-default">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full transition-all"
            data-testid="desktop-logout-button"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            {t('auth.logout', 'Cerrar sesión')}
          </button>
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
                    isActive ? 'border-primary text-primary' : 'border-transparent text-stone-500'
                  }`
                }
                data-testid={`mobile-nav-${item.shortLabel.toLowerCase()}`}
              >
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
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
                  isActive ? 'bg-red-50 text-red-700' : 'hover:bg-stone-100'
                }`
              }
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="font-medium text-text-primary">{item.label}</p>
            </NavLink>
          ))}
          
          {/* Logout */}
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
            <p className="font-medium text-red-600">Cerrar sesión</p>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
