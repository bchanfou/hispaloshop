// Section 3.6.2b — ImporterLayoutResponsive
// Dedicated dashboard chrome for users with role === 'importer'. Mirrors the
// structure of ProducerLayoutResponsive (light theme, 260px sidebar desktop,
// horizontal scrolling tabs mobile, BottomSheet "more" menu) but the
// navigation items are B2B-first: dashboard / catalog / operations / orders /
// certificates / opportunities / Pedro AI. The B2C section is conditionally
// rendered when user.has_b2c_store === true.

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Briefcase, Package, ShieldCheck, TrendingUp,
  Sparkles, Building2, FileText, CreditCard, Settings,
  ShoppingBag, Receipt, Store,
  ArrowLeft, LogOut, AlertTriangle, Crown, Bell, X, MessageCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import InternalChat from '../InternalChat';
import BottomSheet from './BottomSheet';
import { ProducerPlanProvider, useProducerPlan } from '../../context/ProducerPlanContext';
import { useDashboardLogout } from '../../features/dashboard/queries';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';

function PlanFooterCard() {
  const { plan } = useProducerPlan() || {};
  const { t } = useTranslation();
  const tier = String(plan || 'FREE').toUpperCase();
  const isElite = tier === 'ELITE';

  if (isElite) {
    return (
      <div className="mx-4 mb-3 p-3 rounded-2xl bg-stone-950 text-white">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" strokeWidth={1.8} />
          <p className="text-xs font-bold tracking-wide">
            {t('importer.layout.planFooter.elite', 'Plan ELITE activo')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to="/producer/plan"
      className="mx-4 mb-3 p-3 rounded-2xl bg-stone-100 hover:bg-stone-200 transition-colors block"
    >
      <p className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
        {t('importer.layout.planFooter.currentPlan', 'Plan actual')} · {tier}
      </p>
      <p className="text-xs font-bold text-stone-950 mt-0.5">
        {t('importer.layout.planFooter.upgradeCta', 'Mejorar a ELITE')}
      </p>
    </NavLink>
  );
}

function ImporterLayoutInner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const logoutMutation = useDashboardLogout();
  const { data: notifData } = useUnreadNotifications();
  const unreadNotifs = user ? (notifData?.unread_count ?? 0) : 0;

  const planTier = String(
    user?.subscription?.plan || user?.plan || 'FREE',
  ).toUpperCase();
  const isElite = planTier === 'ELITE';
  const hasB2cStore = Boolean(user?.has_b2c_store);

  // Primary navigation — B2B-first ordering. Items 1-7 are the importer's core
  // workflow; items 8-11 are account/admin. The B2C block (12-14) only appears
  // when the user has explicitly opted in via Settings → Roles & Features.
  const primaryNavItems = [
    {
      to: '/importer/dashboard',
      icon: LayoutDashboard,
      label: t('importer.layout.sidebar.dashboard', 'Panel'),
      shortLabel: t('importer.layout.sidebar.dashboardShort', 'Panel'),
      end: true,
    },
    {
      to: '/importer/catalog',
      icon: Search,
      label: t('importer.layout.sidebar.catalog', 'Catálogo Sourcing'),
      shortLabel: t('importer.layout.sidebar.catalogShort', 'Catálogo'),
    },
    {
      to: '/b2b/operations',
      icon: Briefcase,
      label: t('importer.layout.sidebar.operations', 'Operaciones B2B'),
      shortLabel: t('importer.layout.sidebar.operationsShort', 'Operaciones'),
    },
    {
      to: '/importer/orders',
      icon: Package,
      label: t('importer.layout.sidebar.orders', 'Mis Pedidos'),
      shortLabel: t('importer.layout.sidebar.ordersShort', 'Pedidos'),
    },
    {
      to: '/importer/certificates',
      icon: ShieldCheck,
      label: t('importer.layout.sidebar.certificates', 'Certificados'),
      shortLabel: t('importer.layout.sidebar.certificatesShort', 'Certs'),
    },
    {
      to: '/importer/opportunities',
      icon: TrendingUp,
      label: t('importer.layout.sidebar.opportunities', 'Oportunidades de mercado'),
      shortLabel: t('importer.layout.sidebar.opportunitiesShort', 'Oportunidades'),
      eliteLock: !isElite,
    },
    {
      to: '/importer/commercial-ai',
      icon: Sparkles,
      label: t('importer.layout.sidebar.commercialAi', 'Pedro AI'),
      shortLabel: t('importer.layout.sidebar.commercialAiShort', 'Pedro'),
      eliteLock: !isElite,
    },
  ];

  const accountNavItems = [
    {
      to: '/producer/profile',
      icon: Building2,
      label: t('importer.layout.sidebar.profile', 'Mi Empresa'),
      shortLabel: t('importer.layout.sidebar.profileShort', 'Empresa'),
    },
    {
      to: '/documents',
      icon: FileText,
      label: t('importer.layout.sidebar.documents', 'Documentos'),
      shortLabel: t('importer.layout.sidebar.documentsShort', 'Docs'),
    },
    {
      to: '/producer/plan',
      icon: CreditCard,
      label: t('importer.layout.sidebar.plan', 'Plan'),
      shortLabel: t('importer.layout.sidebar.planShort', 'Plan'),
    },
    {
      to: '/settings',
      icon: Settings,
      label: t('importer.layout.sidebar.settings', 'Configuración'),
      shortLabel: t('importer.layout.sidebar.settingsShort', 'Config'),
    },
  ];

  const b2cNavItems = hasB2cStore ? [
    {
      to: '/producer/products',
      icon: ShoppingBag,
      label: t('importer.layout.sidebar.b2cProducts', 'Mis Productos'),
      shortLabel: t('importer.layout.sidebar.b2cProductsShort', 'Productos'),
    },
    {
      to: '/producer/orders',
      icon: Receipt,
      label: t('importer.layout.sidebar.b2cOrders', 'Pedidos B2C'),
      shortLabel: t('importer.layout.sidebar.b2cOrdersShort', 'B2C'),
    },
    {
      to: '/producer/store',
      icon: Store,
      label: t('importer.layout.sidebar.b2cStore', 'Mi Tienda'),
      shortLabel: t('importer.layout.sidebar.b2cStoreShort', 'Tienda'),
    },
  ] : [];

  // Mobile horizontal tab strip — show first 5 items + "More" bottom sheet.
  const mobileNavItems = primaryNavItems.slice(0, 5);
  const moreMenuItems = [
    ...primaryNavItems.slice(5),
    ...accountNavItems,
    ...b2cNavItems,
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/login');
      window.location.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-stone-950 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'importer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-stone-700" />
          </div>
          <p className="text-stone-600 mb-4">
            {t('importer.layout.accessDenied', 'Acceso denegado. Se requiere cuenta de importador.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-stone-950 hover:underline font-medium"
          >
            {t('common.goToLogin', 'Ir a Login')}
          </button>
        </div>
      </div>
    );
  }

  const isPending = !user.approved;
  const companyName = user.company_name || user.name || '';
  const flagEmoji = (user.country || '').toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 text-sm ${
          isActive
            ? 'bg-stone-100 text-stone-950 font-medium'
            : 'text-stone-600 hover:bg-stone-100'
        }`
      }
      data-testid={`importer-nav-${item.shortLabel.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-3">
        <item.icon className="w-5 h-5" strokeWidth={1.5} />
        <span>{item.label}</span>
      </div>
      {item.eliteLock && (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-stone-950 text-white">
          ELITE
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-stone-500 hover:text-stone-950 transition-colors"
          aria-label={t('common.back', 'Volver')}
          data-testid="importer-mobile-back"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <h1 className="text-base font-semibold text-stone-950 truncate max-w-[60%]">
          {companyName || t('importer.layout.header.title', 'Panel Importador')}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-stone-500 hover:text-stone-950 transition-colors"
            aria-label={t('common.notifications', 'Notificaciones')}
          >
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-stone-950 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>
          <LanguageSwitcher variant="minimal" />
        </div>
      </header>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex desktop-sidebar">
        {/* Header */}
        <div className="p-5 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-950 transition-colors text-sm"
              data-testid="importer-desktop-back"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>{t('common.back', 'Volver')}</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative p-1.5 text-stone-500 hover:text-stone-950 transition-colors"
                aria-label={t('common.notifications', 'Notificaciones')}
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-stone-950 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              <LanguageSwitcher variant="minimal" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold text-stone-950 tracking-editorial truncate">
              {companyName || t('importer.layout.header.title', 'Panel Importador')}
            </h1>
            {flagEmoji && <span className="text-base leading-none">{flagEmoji}</span>}
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
              {t('importer.layout.header.roleBadge', 'Importador')}
            </span>
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isElite ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {planTier}
            </span>
          </div>
        </div>

        {/* Pending Warning */}
        {isPending && (
          <div className="mx-4 mt-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-stone-600 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-stone-950">
                  {t('influencer_dashboard.pendienteDeAprobacion', 'Pendiente de aprobación')}
                </p>
                <p className="text-xs text-stone-700">
                  {t('producer_layout_responsive.tuCuentaEstaEnRevision', 'Tu cuenta está en revisión.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {primaryNavItems.map(renderNavItem)}

          <div className="pt-3 mt-3 border-t border-stone-100" aria-hidden="true" />
          {accountNavItems.map(renderNavItem)}

          {hasB2cStore && (
            <>
              <div className="pt-3 mt-3 border-t border-stone-100" aria-hidden="true" />
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {t('importer.layout.sidebar.b2cMode', 'Modo vendedor B2C')}
              </p>
              {b2cNavItems.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* Plan footer card */}
        <PlanFooterCard />

        {/* User Footer */}
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-950 truncate">
                {user.name}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-stone-500 hover:text-stone-700 transition-colors"
              aria-label={t('common.logout', 'Cerrar sesión')}
              title={t('common.logout', 'Cerrar sesión')}
              data-testid="importer-desktop-logout"
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
            {isPending && (
              <div className="md:hidden mb-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
                  <p className="text-sm text-stone-950">
                    {t('common.accountPending', 'Cuenta pendiente de aprobación')}
                  </p>
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
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  isActive ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'
                }`
              }
              data-testid={`importer-mobile-nav-${item.shortLabel.toLowerCase()}`}
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.shortLabel}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreMenuOpen(true)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0"
            data-testid="importer-mobile-nav-more"
          >
            <span>{t('common.more', 'Más')}</span>
          </button>
        </div>
      </div>

      {/* ===== MORE MENU BOTTOM SHEET ===== */}
      <BottomSheet
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title={t('common.moreOptions', 'Más opciones')}
      >
        <div className="p-4 space-y-2">
          {moreMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  isActive ? 'bg-stone-100 text-stone-950' : 'hover:bg-stone-100'
                }`
              }
            >
              <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-stone-950">{item.label}</p>
              </div>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-stone-100 w-full text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-medium text-stone-700">{t('common.logout', 'Cerrar sesión')}</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* ===== CHAT BUTTON (Floating) ===== */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label={t('importer.layout.openChat', 'Abrir chat')}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* ===== INTERNAL CHAT MODAL ===== */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200"
              aria-label={t('common.close', 'Cerrar')}
            >
              <X className="h-5 w-5" />
            </button>
            <InternalChat
              userType="importer"
              isEmbedded
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImporterLayout() {
  return (
    <ProducerPlanProvider>
      <ImporterLayoutInner />
    </ProducerPlanProvider>
  );
}
