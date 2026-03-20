import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader from './AppHeader';
// SideNav disabled — mobile-first layout
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { trackPageVisit } from '../../utils/analytics';

/**
 * AppLayout — responsive shell for authenticated app pages
 * Mobile:  AppHeader (top) + content + BottomNavBar (rendered in App.js)
 * Desktop: SideNav (left) + content
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
  // Info/landing pages — use InfoLayout instead
  '/about', '/pricing', '/productor', '/influencer/aplicar',
  '/influencer', '/influencers', '/blog', '/press', '/careers', '/contact',
  '/help', '/terms', '/privacy', '/que-es', '/que-es-hispaloshop',
  '/importador', '/contacto',
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
      background: '#f5f5f4',
      borderBottom: '1px solid #e7e5e4',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
      fontSize: 13,
    }}>
      <span style={{ color: '#0c0a09' }}>
        Verifica tu email para activar todas las funciones
      </span>
      <button
        onClick={resend}
        disabled={sending}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', fontWeight: 600,
          color: '#0c0a09',
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
  const hideChrome = useMemo(() => shouldHideChrome(location.pathname), [location.pathname]);
  const prevPathRef = useRef(location.pathname);

  // Track page visits for analytics
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      trackPageVisit(location.pathname, user?.country);
    }
  }, [location.pathname, user?.country]);

  // Scroll restoration on route change
  useEffect(() => {
    // Don't scroll on hash-only changes (e.g. /profile#posts)
    if (location.hash !== '') return;

    // Save scroll position for previous route so back navigation can restore it
    const prevKey = prevPathRef.current;
    if (prevKey) {
      sessionStorage.setItem(`scroll:${prevKey}`, String(window.scrollY));
    }

    // Try to restore saved position for this route (back navigation)
    const saved = sessionStorage.getItem(`scroll:${location.key}`);
    if (saved !== null) {
      window.scrollTo(0, parseInt(saved, 10));
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash, location.key]);

  if (hideChrome) {
    return <>{children}</>;
  }

  const showVerificationBanner = user && user.email_verified === false;

  return (
    <>
      {/* Email verification banner */}
      {showVerificationBanner && <EmailVerificationBanner />}

      {/* Mobile: AppHeader */}
      <div className="lg:hidden">
        <AppHeader />
      </div>

      {/* Content area */}
      <main
        className="min-h-screen"
        style={{
          paddingBottom: 'calc(50px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>
    </>
  );
}
