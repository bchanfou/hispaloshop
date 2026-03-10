import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Package, FileCheck, ShoppingBag, CreditCard,
  LayoutDashboard, ArrowLeft, LogOut, AlertTriangle,
  User, Store, Menu, X, MoreHorizontal, Settings, BookOpen, Award
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import SellerAIAssistant from '../SellerAIAssistant';
import InternalChat from '../InternalChat';
import MobileBottomNav from './MobileBottomNav';
import BottomSheet from './BottomSheet';

import { API } from '../../utils/api';
import { ProducerPlanProvider, useProducerPlan } from '../../context/ProducerPlanContext';

function PlanGatedAIAssistant() {
  const { hasAccess } = useProducerPlan();
  if (!hasAccess('PRO')) return null;
  return <SellerAIAssistant producerData={{ store: null, products: [] }} />;
}

export default function ProducerLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [badges, setBadges] = useState({ pending_products: 0 });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'producer' || user?.role === 'importer') {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API}/producer/stats`, { withCredentials: true });
      setBadges({ pending_products: response.data.pending_products || 0 });
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  // All navigation items
  const allNavItems = [
    { to: '/producer', icon: LayoutDashboard, label: 'Overview', shortLabel: 'Inicio', end: true },
    { to: '/producer/products', icon: Package, label: t('producer.myProducts', 'Productos'), shortLabel: 'Productos', badge: badges.pending_products },
    { to: '/producer/orders', icon: ShoppingBag, label: t('producer.orders', 'Pedidos'), shortLabel: 'Pedidos' },
    { to: '/producer/payments', icon: CreditCard, label: 'Ganancias', shortLabel: 'Ganancias' },
    { to: '/producer/store', icon: Store, label: 'Mi Tienda', shortLabel: 'Tienda' },
    { to: '/recipes/create', icon: BookOpen, label: 'Crear Receta', shortLabel: 'Receta' },
    ...(user?.role === 'importer' ? [{ to: '/importer/certificates', icon: Award, label: 'Certificados', shortLabel: 'Certs' }] : [
      { to: '/producer/certificates', icon: Award, label: 'Certificados', shortLabel: 'Certs' },
    ]),
  ];

  // Mobile bottom nav - all 5 fit
  const mobileNavItems = allNavItems;

  // Items for "More" bottom sheet
  const moreMenuItems = allNavItems.slice(4);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-ds-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || !['producer', 'importer'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-text-secondary mb-4">Acceso denegado. Se requiere cuenta de productor o importador.</p>
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

  const isPending = !user.approved;

  return (
    <ProducerPlanProvider>
    <div className="min-h-screen bg-background">
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Volver al inicio"
          data-testid="mobile-back-button"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <h1 className="font-heading text-base font-semibold text-text-primary">
          Panel Productor
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
            {t('producer.myProducts')}
          </h1>
          <p className="text-xs text-text-muted mt-1">{t('producer.manageStock')}</p>
        </div>

        {/* Pending Warning */}
        {isPending && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-amber-900">Pendiente de aprobación</p>
                <p className="text-xs text-amber-700">Tu cuenta está en revisión.</p>
              </div>
            </div>
          </div>
        )}

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
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border-default">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user.company_name || user.name}
              </p>
              <p className="text-xs text-text-muted">
                {user.role === 'importer' ? 'Importador' : 'Productor'}
              </p>
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
            {/* Mobile pending warning */}
            {isPending && (
              <div className="md:hidden mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                  <p className="text-sm text-amber-900">{t('common.accountPending')}</p>
                </div>
              </div>
            )}
            
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
                  isActive ? 'bg-ds-accent/10 text-ds-accent' : 'hover:bg-stone-100'
                }`
              }
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-text-primary">{item.label}</p>
              </div>
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
    </ProducerPlanProvider>
  );
}
