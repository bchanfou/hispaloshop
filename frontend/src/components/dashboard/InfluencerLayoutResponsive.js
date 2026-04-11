// Section 3.6.3b — InfluencerLayoutResponsive
// Dedicated dashboard chrome for users with role === 'influencer'. Mirrors
// the ImporterLayoutResponsive pattern from 3.6.2b: 260px sidebar on desktop,
// mobile top header + horizontal tab strip + BottomSheet "more" menu. All
// nav items route to REAL existing pages only — items without a target page
// are auto-eliminated (see 3.6.3b pre-decisions).

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Link as LinkIcon, BarChart3, Wallet, Receipt,
  UserCircle, Settings, ArrowLeft, LogOut, AlertTriangle, Bell, X,
  MessageCircle, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import InternalChat from '../InternalChat';
import BottomSheet from './BottomSheet';
import TierBadge from '../influencer/TierBadge';
import { useDashboardLogout } from '../../features/dashboard/queries';
import { useInfluencerProfile } from '../../features/influencer/hooks';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';

export default function InfluencerLayoutResponsive() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const logoutMutation = useDashboardLogout();
  const { data: notifData } = useUnreadNotifications();
  const unreadNotifs = user ? (notifData?.unread_count ?? 0) : 0;

  // Dashboard metrics — used for the sidebar "This month" earnings card and
  // the tier badge. Non-blocking: layout renders even if this is loading.
  const { dashboard } = useInfluencerProfile();

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

  // Primary nav — only routes that correspond to real page files. Dropped
  // in 3.6.3b: commissions (no page), discount-code (no page), ai-assistant
  // (no page), education (no page). "Mi perfil público" is conditional on
  // user.username.
  const primaryNavItems = [
    {
      to: '/influencer/dashboard',
      icon: LayoutDashboard,
      label: t('influencer.layout.sidebar.dashboard', 'Dashboard'),
      shortLabel: t('influencer.layout.sidebar.dashboard', 'Dashboard'),
      end: true,
    },
    {
      to: '/influencer/links',
      icon: LinkIcon,
      label: t('influencer.layout.sidebar.links', 'Mis Links'),
      shortLabel: t('influencer.layout.sidebar.links', 'Links'),
    },
    {
      to: '/influencer/insights',
      icon: BarChart3,
      label: t('influencer.layout.sidebar.insights', 'Insights'),
      shortLabel: t('influencer.layout.sidebar.insights', 'Insights'),
    },
    {
      to: '/influencer/payouts',
      icon: Wallet,
      label: t('influencer.layout.sidebar.payouts', 'Cobros'),
      shortLabel: t('influencer.layout.sidebar.payouts', 'Cobros'),
    },
  ];

  const accountNavItems = [
    {
      to: '/influencer/fiscal-setup',
      icon: Receipt,
      label: t('influencer.layout.sidebar.fiscalSetup', 'Datos fiscales'),
      shortLabel: t('influencer.layout.sidebar.fiscalSetup', 'Fiscal'),
    },
    {
      to: '/settings',
      icon: Settings,
      label: t('influencer.layout.sidebar.settings', 'Configuración'),
      shortLabel: t('influencer.layout.sidebar.settings', 'Config'),
    },
  ];

  // Conditional public profile link — only when the influencer actually has
  // a username to route to (avoids broken /ambassadors/undefined links until
  // 4.4 ships the public profile page).
  const publicProfileItem = user?.username ? {
    to: `/ambassadors/${user.username}`,
    icon: UserCircle,
    label: t('influencer.layout.sidebar.publicProfile', 'Mi perfil público'),
    shortLabel: t('influencer.layout.sidebar.publicProfile', 'Perfil'),
    external: true,
  } : null;

  // Mobile horizontal tab strip — show first 4 items + "More" bottom sheet.
  const mobileNavItems = primaryNavItems.slice(0, 4);
  const moreMenuItems = [
    ...(publicProfileItem ? [publicProfileItem] : []),
    ...accountNavItems,
  ];

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

  if (!user || user.role !== 'influencer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-stone-700" />
          </div>
          <p className="text-stone-600 mb-4">
            {t('influencer.layout.accessDenied', 'Acceso denegado. Se requiere cuenta de influencer.')}
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

  const isPending = user.approved === false;
  const displayName = user.full_name || user.name || user.email || '';
  const flagEmoji = (user.country_code || user.country || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2)
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  // Tier + earnings data from dashboard. Null-safe: if the endpoint hasn't
  // returned yet, everything renders as a placeholder and doesn't block.
  const tier = String(dashboard?.current_tier || '').toLowerCase();
  const monthEarnings = Number(dashboard?.month_earnings ?? dashboard?.total_earned ?? 0);
  const prevMonthEarnings = Number(dashboard?.prev_month_earnings ?? 0);
  const hasComparison = prevMonthEarnings > 0;
  const earningsDelta = hasComparison
    ? ((monthEarnings - prevMonthEarnings) / prevMonthEarnings) * 100
    : null;
  const nextTierSalesNeeded = Number(dashboard?.next_tier_sales_needed ?? 0);
  const nextTierName = dashboard?.next_tier || null;

  const formatMoney = (amount) => {
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(amount || 0);
    } catch (e) {
      return `€${Math.round(amount || 0)}`;
    }
  };

  const renderNavItem = (item) => {
    const className = ({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm ${
        isActive
          ? 'bg-stone-100 text-stone-950 font-medium'
          : 'text-stone-600 hover:bg-stone-50'
      }`;

    const content = (
      <>
        <item.icon className="w-5 h-5" strokeWidth={1.5} />
        <span>{item.label}</span>
      </>
    );

    if (item.external) {
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-stone-600 hover:bg-stone-50 transition-all duration-200"
          data-testid={`influencer-nav-${item.shortLabel.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {content}
        </a>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={className}
        data-testid={`influencer-nav-${item.shortLabel.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {content}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-stone-500 hover:text-stone-950 transition-colors"
          aria-label={t('common.back', 'Volver')}
          data-testid="influencer-mobile-back"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold text-stone-950 truncate max-w-[140px]">
            {displayName || t('influencer.layout.header.title', 'Panel Influencer')}
          </h1>
          {flagEmoji && <span className="text-sm leading-none">{flagEmoji}</span>}
          {tier && <TierBadge tier={tier} size="sm" />}
        </div>

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
              data-testid="influencer-desktop-back"
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

          <div className="flex items-center gap-2 mb-2">
            {user.profile_image || user.avatar_url ? (
              <img
                src={user.profile_image || user.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-stone-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-stone-500" strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-stone-950 truncate">
                  {displayName || t('influencer.layout.header.title', 'Panel Influencer')}
                </h1>
                {flagEmoji && <span className="text-sm leading-none">{flagEmoji}</span>}
              </div>
              {user.username && (
                <p className="text-xs text-stone-500 truncate">@{user.username}</p>
              )}
            </div>
          </div>

          {tier && (
            <div className="mb-2">
              <TierBadge tier={tier} size="md" />
            </div>
          )}

          {/* Earnings card — click → commissions history (route doesn't
              exist yet, falls back to dashboard). */}
          <NavLink
            to="/influencer/payouts"
            className="block mt-3 p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-100"
            data-testid="influencer-earnings-card"
          >
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              {t('influencer.layout.header.thisMonth', 'Este mes')}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-lg font-bold text-stone-950">
                {formatMoney(monthEarnings)}
              </p>
              {earningsDelta !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                    earningsDelta >= 0 ? 'text-stone-700' : 'text-stone-500'
                  }`}
                >
                  {earningsDelta >= 0 ? (
                    <ArrowUp className="w-3 h-3" strokeWidth={2} />
                  ) : (
                    <ArrowDown className="w-3 h-3" strokeWidth={2} />
                  )}
                  {Math.abs(earningsDelta).toFixed(0)}%
                </span>
              )}
            </div>
          </NavLink>
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
          {publicProfileItem && renderNavItem(publicProfileItem)}
          {accountNavItems.map(renderNavItem)}
        </nav>

        {/* Tier progress footer — only render if data available */}
        {nextTierSalesNeeded > 0 && nextTierName && (
          <div className="mx-4 mb-3 p-3 rounded-2xl bg-stone-100">
            <p className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              {t('influencer.layout.tier.progressLabel', 'Siguiente nivel')}
            </p>
            <p className="text-xs font-bold text-stone-950 mt-0.5">
              {t('influencer.layout.tier.nextLevel', {
                n: nextTierSalesNeeded,
                tier: nextTierName,
                defaultValue: `${nextTierSalesNeeded} ventas más para ${nextTierName}`,
              })}
            </p>
          </div>
        )}

        {/* User Footer */}
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-950 truncate">
                {user.name || displayName}
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
              data-testid="influencer-desktop-logout"
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
                `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 min-h-[44px] ${
                  isActive ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'
                }`
              }
              data-testid={`influencer-mobile-nav-${item.shortLabel.toLowerCase()}`}
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.shortLabel}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreMenuOpen(true)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0 min-h-[44px]"
            data-testid="influencer-mobile-nav-more"
          >
            <span>{t('influencer.layout.mobile.more', 'Más')}</span>
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
          {moreMenuItems.map((item) => {
            if (item.external) {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-stone-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-stone-950">{item.label}</p>
                  </div>
                </a>
              );
            }
            return (
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
            );
          })}

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
              <p className="font-medium text-stone-700">
                {t('influencer.layout.header.logout', 'Cerrar sesión')}
              </p>
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
          aria-label={t('influencer.layout.openChat', 'Abrir chat')}
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
              userType="influencer"
              isEmbedded
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
