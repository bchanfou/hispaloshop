import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ShieldCheck, Package, Users, HeadphonesIcon,
  BookOpen, ScrollText, Settings, ArrowLeft, LogOut, Menu, X
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import CountryAdminOnboardingModal from '../country-admin/CountryAdminOnboardingModal';
import IrisAssistant from '../country-admin/IrisAssistant';

const COUNTRY_FLAGS = {
  ES: '🇪🇸', KR: '🇰🇷', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', PT: '🇵🇹',
  MX: '🇲🇽', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', BR: '🇧🇷', JP: '🇯🇵',
  GB: '🇬🇧', NL: '🇳🇱', BE: '🇧🇪',
};

export default function CountryAdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get('/country-admin/overview');
        if (!cancelled) setOverview(data);
      } catch {
        /* user may not be country admin yet — ProtectedRoute handles it */
      }
      try {
        const status = await apiClient.get('/country-admin/onboarding');
        if (!cancelled && status && !status.onboarded) setShowOnboarding(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { /* ignore */ }
    navigate('/login');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Country admins are normalized as `admin` with assigned_country, OR `country_admin` role.
  const isCountryAdmin = (
    (user.role === 'country_admin' || user.role === 'admin') && user.assigned_country
  ) || user.role === 'super_admin';

  if (!isCountryAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <p className="text-stone-600 mb-4">{t('countryAdmin.accessDenied', 'Acceso denegado. Esta área es para administradores de país.')}</p>
          <button onClick={() => navigate('/login')} className="text-stone-950 hover:underline font-medium">
            {t('common.goLogin', 'Ir a Login')}
          </button>
        </div>
      </div>
    );
  }

  const countryCode = (user.assigned_country || overview?.country_code || '').toUpperCase();
  const flag = COUNTRY_FLAGS[countryCode] || '';
  const countryName = overview?.country_code === 'GLOBAL' ? t('countryAdmin.globalScope', 'Vista global') : countryCode;

  const navItems = [
    { to: '/country-admin/overview', icon: LayoutDashboard, label: t('countryAdmin.nav.overview', 'Inicio') },
    { to: '/country-admin/verifications', icon: ShieldCheck, label: t('countryAdmin.nav.verifications', 'Verificaciones'), badge: overview?.kpis?.pending_verifications },
    { to: '/country-admin/products', icon: Package, label: t('countryAdmin.nav.products', 'Productos') },
    { to: '/country-admin/users', icon: Users, label: t('countryAdmin.nav.users', 'Usuarios') },
    { to: '/country-admin/moderation', icon: ShieldCheck, label: t('countryAdmin.nav.moderation', 'Moderación') },
    { to: '/country-admin/support', icon: HeadphonesIcon, label: t('countryAdmin.nav.support', 'Soporte') },
    { to: '/country-admin/knowledge-base', icon: BookOpen, label: t('countryAdmin.nav.knowledgeBase', 'Centro de Ayuda') },
    { to: '/country-admin/audit', icon: ScrollText, label: t('countryAdmin.nav.audit', 'Auditoría') },
    { to: '/country-admin/settings', icon: Settings, label: t('countryAdmin.nav.settings', 'Configuración') },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-stone-200 h-14 flex items-center justify-between px-4">
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2 text-stone-700 hover:text-stone-950">
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-stone-950">
          <span>{flag}</span>
          <span>{countryName}</span>
        </div>
        <LanguageSwitcher variant="minimal" />
      </header>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl flex flex-col">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-stone-950 font-semibold">
                  <span className="text-2xl">{flag}</span>
                  <span>{countryName}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">{t('countryAdmin.title', 'Panel de país')}</p>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-2 text-stone-500 hover:text-stone-950">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'text-stone-700 hover:bg-stone-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-stone-200 text-stone-950 text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-stone-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-stone-600 hover:text-stone-950 text-sm rounded-2xl hover:bg-stone-100"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
                <span>{t('common.logout', 'Cerrar sesión')}</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-stone-200 flex-col">
        <div className="p-5 border-b border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-950 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>{t('common.back', 'Volver')}</span>
            </button>
            <LanguageSwitcher variant="minimal" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{flag}</span>
            <div>
              <h1 className="text-base font-semibold text-stone-950">{countryName}</h1>
              <p className="text-xs text-stone-500">{t('countryAdmin.title', 'Panel de país')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-colors ${
                  isActive ? 'bg-stone-950 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-stone-200 text-stone-950 text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-950 truncate">{user.name}</p>
              <p className="text-xs text-stone-500">{t('countryAdmin.role', 'Country admin')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-500 hover:text-stone-950 transition-colors"
              aria-label={t('common.logout', 'Cerrar sesión')}
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet context={{ overview, countryCode, refreshOverview: async () => {
            try {
              const data = await apiClient.get('/country-admin/overview');
              setOverview(data);
            } catch { /* ignore */ }
          }}} />
        </div>
      </main>

      <IrisAssistant overview={overview} countryCode={countryCode} />

      {showOnboarding && (
        <CountryAdminOnboardingModal
          countryCode={countryCode}
          countryName={countryName}
          onClose={async () => {
            try {
              await apiClient.patch('/country-admin/onboarding');
            } catch { /* ignore */ }
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
