import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, LogOut, LayoutDashboard, Sparkles, 
  BarChart3, CreditCard, Settings
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';

import InternalChat from '../InternalChat';
import { useDashboardLogout } from '../../features/dashboard/queries';

export default function InfluencerLayoutResponsive({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const logoutMutation = useDashboardLogout();

  // Navigation items for influencer - simple layout since it's mainly one page
  const navItems = [
    { to: '/influencer/dashboard', icon: LayoutDashboard, label: 'Mi Código', shortLabel: 'Código', end: true },
    { to: '/influencer/dashboard#analytics', icon: BarChart3, label: 'Mis Ventas', shortLabel: 'Ventas' },
    { to: '/influencer/dashboard#payments', icon: CreditCard, label: 'Mis Ganancias', shortLabel: 'Ganancias' },
    { to: '/influencer/insights', icon: Sparkles, label: 'Insights', shortLabel: 'Insights' },
  ];

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-stone-950 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-stone-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || user.role !== 'influencer') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-stone-700" />
          </div>
          <p className="text-stone-600 mb-4">Acceso denegado. Se requiere cuenta de influencer.</p>
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
    <div className="min-h-screen bg-white">
      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header md:hidden">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-stone-500 hover:text-stone-950 transition-colors"
          data-testid="mobile-back-button"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-stone-700" />
          <h1 className="text-base font-semibold text-stone-950">
            Influencer
          </h1>
        </div>
        
        <LanguageSwitcher variant="minimal" />
      </header>

      {/* ===== DESKTOP HEADER (no sidebar for influencer) ===== */}
      <header className="hidden md:block border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-950 transition-colors text-sm"
                data-testid="desktop-back-button"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                <span>{t('common.back', 'Volver')}</span>
              </button>
              <div className="h-6 w-px bg-stone-200" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-stone-700" />
                <span className="text-lg font-semibold text-stone-950">
                  {t('influencer.dashboard', 'Panel Influencer')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="minimal" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                data-testid="desktop-logout-button"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main>
        <div className="pt-[100px] pb-[76px] md:pt-0 md:pb-0">
          {children}
        </div>
      </main>

      {/* ===== MOBILE HORIZONTAL TAB NAVIGATION ===== */}
      <div className="md:hidden fixed top-[56px] left-0 right-0 z-30 bg-white border-b border-stone-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          <NavLink
            to="/influencer/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                isActive ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'
              }`
            }
            data-testid="mobile-nav-inicio"
          >
            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
            <span>Inicio</span>
          </NavLink>
          <button
            onClick={() => document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0"
            data-testid="mobile-nav-analytics"
          >
            <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => document.getElementById('payments-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0"
            data-testid="mobile-nav-pagos"
          >
            <CreditCard className="w-4 h-4" strokeWidth={1.5} />
            <span>Pagos</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-stone-500 shrink-0"
            data-testid="mobile-nav-salir"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>Salir</span>
          </button>
        </div>
      </div>

      
      {/* ===== INTERNAL CHAT ===== */}
      <InternalChat userType="influencer" />
    </div>
  );
}
