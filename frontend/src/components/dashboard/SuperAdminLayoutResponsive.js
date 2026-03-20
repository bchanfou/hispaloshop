import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield, ArrowLeft, LogOut, Users, BarChart3,
  TrendingUp, Globe, Package, MoreHorizontal, Wallet, ShieldAlert,
  Zap, Lock, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';
import { useDashboardLogout } from '../../features/dashboard/queries';

export default function SuperAdminLayoutResponsive() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const logoutMutation = useDashboardLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/login');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const allNavItems = [
    { to: '/super-admin', icon: Shield, label: 'Global', shortLabel: 'Global', end: true },
    { to: '/super-admin/markets', icon: Globe, label: 'Países', shortLabel: 'Países' },
    { to: '/super-admin/admins', icon: Users, label: 'Admins', shortLabel: 'Admins' },
    { to: '/super-admin/finance', icon: Wallet, label: 'Finanzas', shortLabel: 'Finanzas' },
    { to: '/super-admin/plans', icon: Zap, label: 'Planes', shortLabel: 'Planes' },
    { to: '/super-admin/users', icon: Users, label: 'Usuarios', shortLabel: 'Usuarios' },
    { to: '/super-admin/content', icon: Package, label: 'Contenido', shortLabel: 'Contenido' },
    { to: '/super-admin/gdpr', icon: Lock, label: 'GDPR', shortLabel: 'GDPR' },
    { to: '/super-admin/infrastructure', icon: Settings, label: 'Infraestructura', shortLabel: 'Infra' },
    { to: '/super-admin/insights', icon: BarChart3, label: 'Estadísticas', shortLabel: 'Stats' },
    { to: '/super-admin/escalation', icon: ShieldAlert, label: 'Escalaciones', shortLabel: 'Escalar' },
  ];

  const mobileNavItems = [
    ...allNavItems.slice(0, 4),
    { to: '#more', icon: MoreHorizontal, label: 'More', shortLabel: 'Más' }
  ];

  const moreMenuItems = allNavItems.slice(4);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/40">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white/60" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Acceso Denegado</h1>
          <p className="text-white/40 mb-4">Solo Super Admins pueden acceder</p>
          <button onClick={() => navigate('/')} className="text-[#ffffff] hover:underline font-medium">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-theme min-h-screen bg-[#0c0a09]">
      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1c1917] border-b border-white/[0.08] px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#ffffff] text-white px-2 py-0.5 rounded">
            SUPERADMIN
          </span>
        </div>
        <div className="w-9" />
      </header>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] z-40 bg-[#1c1917] border-r border-white/[0.08] flex-col">
        {/* Logo */}
        <div className="p-4 pb-6">
          <p className="text-[17px] font-extrabold tracking-tight text-white">hispaloshop</p>
          <div className="mt-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#ffffff] text-white px-2 py-0.5 rounded">
              SUPERADMIN
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-2xl transition-all text-sm ${
                  isActive
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-white/45 hover:text-white/70 hover:bg-white/[0.05]'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.08] p-3">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-2.5 py-2 text-xs text-white/30 hover:text-white/50 transition-colors w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Panel de admin
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-2 text-xs text-white/30 hover:text-white/50 transition-colors w-full mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="md:ml-[220px] min-h-screen">
        <div className="pt-[100px] pb-[76px] md:pt-0 md:pb-0">
          <div className="p-4 md:p-7">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ===== MOBILE HORIZONTAL TAB NAVIGATION ===== */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-[#1c1917] border-b border-white/[0.08]">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {mobileNavItems.map((item) => {
            if (item.to === '#more') {
              return (
                <button
                  key="more"
                  onClick={() => setMoreMenuOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-white/40 shrink-0"
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
                    isActive ? 'border-[#ffffff] text-white' : 'border-transparent text-white/40'
                  }`
                }
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
        title="Más opciones"
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
              <p className="font-medium text-stone-950">{item.label}</p>
            </NavLink>
          ))}
          <button
            onClick={() => { setMoreMenuOpen(false); handleLogout(); }}
            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-stone-100 w-full text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
            </div>
            <p className="font-medium text-stone-700">Cerrar sesión</p>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
