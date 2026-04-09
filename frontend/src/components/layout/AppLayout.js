import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppHeader from './AppHeader';
import SideNav from './SideNav';
import PageTransition from '../motion/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { trackPageVisit } from '../../utils/analytics';
import VerifyEmailWall from '../auth/VerifyEmailWall';
import { useNavigationDirection } from '../../hooks/useNavigationDirection';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import OfflineBanner from './OfflineBanner';

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
  '/certificate', '/certificado',
];

function normalizePathname(pathname = '') {
  const match = pathname.match(/^\/(es|en|ko)(\/|$)/);
  if (!match) return pathname;
  const stripped = pathname.replace(/^\/(es|en|ko)/, '');
  return stripped || '/';
}

function shouldHideChrome(pathname) {
  const normalizedPath = normalizePathname(pathname);
  return NO_CHROME_PATHS.some((p) =>
    normalizedPath === p || normalizedPath.startsWith(`${p}/`)
  );
}

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const hideChrome = useMemo(() => shouldHideChrome(location.pathname), [location.pathname]);
  const prevPathRef = useRef(location.pathname);
  const direction = useNavigationDirection();
  const { bind: swipeBind, swipeProgress } = useSwipeBack();

  // Global keyboard shortcuts for desktop navigation
  useEffect(() => {
    const handleKey = (e) => {
      // Ignore when typing in form fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === 'Escape') {
        // Close any open modal/sheet
        document.dispatchEvent(new CustomEvent('close-modals'));
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Focus search input if present, otherwise navigate to search page
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate('/search');
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [navigate]);

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

  // Block access until email is verified (full-screen wall)
  // Must run BEFORE hideChrome check so it catches all routes including /onboarding, /producer, etc.
  // Exceptions: public pages (login, register, verify-email, landing pages) where user is not logged in
  const isPublicPage = ['/login', '/register', '/signup', '/verify-email', '/forgot-password', '/reset-password',
    '/terms', '/privacy', '/about', '/pricing', '/productor', '/influencer/aplicar', '/importador',
    '/que-es', '/que-es-hispaloshop', '/contacto', '/help', '/blog', '/press', '/careers', '/contact',
    '/certificate', '/certificado'].some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));

  // Strict check: only blocks users explicitly marked as unverified.
  // Legacy users without email_verified field are NOT blocked.
  if (user && user.email_verified === false && !isPublicPage) {
    return (
      <VerifyEmailWall
        email={user.email}
        onVerified={() => refreshUser()}
        onLogout={logout}
      />
    );
  }

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Offline detection banner */}
      <OfflineBanner />

      {/* Desktop: SideNav (lg+) */}
      <SideNav />

      {/* Mobile: AppHeader */}
      <div className="lg:hidden">
        <AppHeader />
      </div>

      {/* Content area — shifts right on desktop to clear SideNav */}
      <main
        {...swipeBind()}
        className="min-h-screen lg:ml-[220px] pb-[calc(50px+env(safe-area-inset-bottom,0px))] lg:pb-0 relative"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Swipe-back edge shadow indicator */}
        {swipeProgress > 0 && (
          <div
            className="fixed inset-y-0 left-0 z-[9990] pointer-events-none"
            style={{
              width: `${Math.round(swipeProgress * 40)}px`,
              background: `linear-gradient(to right, rgba(12,10,9,${swipeProgress * 0.08}), transparent)`,
              transition: swipeProgress === 0 ? 'opacity 0.15s ease' : 'none',
            }}
          />
        )}
        <div className="mx-auto max-w-[935px]">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} direction={direction}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
