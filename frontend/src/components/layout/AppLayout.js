import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '../Header';
import SideNav from './SideNav';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

/**
 * AppLayout — responsive shell
 * Mobile:  Header (top) + content + BottomNavBar (rendered in App.js)
 * Desktop: SideNav (left) + content (no Header, no BottomNav)
 */

const NO_CHROME_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/onboarding',
  '/admin', '/super-admin',
  '/producer', '/importer',
  '/dashboard', '/customer',
  '/influencer/dashboard', '/influencer/insights', '/influencer/profile',
  '/influencer/stripe-connect',
  '/reels',
];

function shouldHideChrome(pathname) {
  return NO_CHROME_PATHS.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );
}

function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);

  const resend = useCallback(async () => {
    setSending(true);
    try {
      await apiClient.post('/auth/resend-verification');
      toast.success('Email de verificación enviado');
    } catch {
      toast.error('Error al enviar el email');
    } finally {
      setSending(false);
    }
  }, []);

  return (
    <div style={{
      background: 'var(--hs-orange-bg)',
      borderBottom: '0.5px solid var(--hs-orange)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
      fontSize: 13,
    }}>
      <span style={{ color: '#7a4510' }}>
        Verifica tu email para activar todas las funciones
      </span>
      <button
        onClick={resend}
        disabled={sending}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', fontWeight: 600,
          color: '#7a4510',
          fontSize: 13, whiteSpace: 'nowrap',
          opacity: sending ? 0.5 : 1,
        }}
      >
        {sending ? 'Enviando...' : 'Reenviar →'}
      </button>
    </div>
  );
}

export default function AppLayout({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const hideChrome = shouldHideChrome(location.pathname);

  if (hideChrome) {
    return <>{children}</>;
  }

  const showVerificationBanner = user && user.email_verified === false;

  return (
    <>
      {/* Email verification banner */}
      {showVerificationBanner && <EmailVerificationBanner />}

      {/* Mobile: TopBar */}
      <div className="lg:hidden">
        <Header />
      </div>

      {/* Desktop: SideNav */}
      <SideNav />

      {/* Content area — offset on desktop for sidebar */}
      <main
        className="min-h-screen lg:pl-[var(--hs-sidebar-w)]"
        style={{
          paddingBottom: 'calc(50px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>
    </>
  );
}
