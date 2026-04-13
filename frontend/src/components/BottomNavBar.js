import React, { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Play, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import CreateContentSheet from './create/CreateContentSheet';

import { useHaptics } from '../hooks/useHaptics';

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/vender/registro', '/vender/login', '/productor/registro', '/influencers/registro', '/influencers/login',
  '/influencer/aplicar', '/influencers/aplicar',
  '/seller/login', '/seller/register', '/influencer/login', '/influencer/register',
  '/chat',
  '/messages', // conversation fullscreen
  '/reels',   // full-screen inmersivo — nav oculta
  '/create/',  // editores fullscreen
];

const HIDDEN_ON_PREFIXES = [
  '/admin',
  '/super-admin',
  '/country-admin',
  '/dashboard',
  '/producer',
  '/importer',
  '/seller',
  '/customer',
  '/influencer/dashboard',
  '/influencer/profile',
  '/influencer/tiers',
  '/influencer/discount',
  '/influencer/payouts',
  '/influencer',
  '/influencers',
  '/productor',
  '/vender',
];

export function resolveOpenChatTarget(detail) {
  const conversationId = detail?.conversationId || detail?.conversation_id;
  if (conversationId) {
    return `/messages/${conversationId}`;
  }

  const targetUserId = detail?.userId || detail?.user_id || detail?.to;
  if (targetUserId) {
    return `/messages/new?to=${encodeURIComponent(targetUserId)}`;
  }

  return '/messages';
}


export default function BottomNavBar() {
  const { user, initialized } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const [showContentSheet, setShowContentSheet] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);

  useEffect(() => {
    setProfileAvatarError(false);
  }, [user?.profile_image, user?.avatar_url, user?.name, user?.full_name, user?.username]);

  const shouldHide =
    HIDDEN_ON_PATHS.some((path) => location.pathname.startsWith(path)) ||
    HIDDEN_ON_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)) ||
    /^\/(es|en|ko)\/(productor|distribuidor|influencer|consumidor|about|landing)(\/|$)/.test(location.pathname);


  useEffect(() => {
    const handleOpenChat = (event) => {
      navigate(resolveOpenChatTarget(event?.detail));
    };

    const handleToggleChat = (event) => {
      navigate(resolveOpenChatTarget(event?.detail));
    };

    // Lanzado desde HomeHeader (botón ✏) y FeedContainer (historias)
    const handleOpenCreator = (e) => {
      if (!user) { navigate('/login'); return; }
      const mode = e?.detail?.mode;
      if (mode && ['post', 'reel', 'story'].includes(mode)) {
        navigate(`/create/${mode}`);
      } else {
        setShowContentSheet(true);
      }
    };

    window.addEventListener('open-chat-with-user', handleOpenChat);
    window.addEventListener('toggle-chat', handleToggleChat);
    window.addEventListener('open-creator', handleOpenCreator);
    return () => {
      window.removeEventListener('open-chat-with-user', handleOpenChat);
      window.removeEventListener('toggle-chat', handleToggleChat);
      window.removeEventListener('open-creator', handleOpenCreator);
    };
  }, [user, navigate]);

  // Chat message toasts are handled by ChatProvider via window.__hispaloChatToast
  // (set up by ChatToastContainer). No duplicate WebSocket needed here.

  if (shouldHide) return null;

  const handlePostButton = () => {
    if (!user) { navigate('/login'); return; }
    setShowContentSheet(true);
  };

  const handleContentTypeSelect = (type) => {
    setShowContentSheet(false);
    if (type === 'recipe') {
      navigate('/create/recipe');
    } else {
      navigate(`/create/${type}`);
    }
  };

  // Al pulsar el tab activo → scroll to top (igual que Instagram/Twitter)
  const handleNavClick = (e, isActive) => {
    trigger('light');
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const profileUsername = user?.username?.toLowerCase() || null;
  const profileUserId = user?.user_id || user?.id || null;
  const profileUrl   = profileUsername ? `/${profileUsername}` : (profileUserId ? `/profile/${profileUserId}` : '/login');
  const profileImage = user?.profile_image || user?.avatar_url || null;

  const isHome       = location.pathname === '/';
  const isExplore    = location.pathname.startsWith('/discover') || location.pathname.startsWith('/products');
  const isReels      = location.pathname === '/reels' || location.pathname.startsWith('/reels/');
  const isProfile    = profileUsername
    ? (location.pathname.toLowerCase() === `/${profileUsername}` || location.pathname.startsWith('/profile/') || location.pathname.startsWith('/settings/'))
    : (location.pathname === '/profile' || location.pathname.startsWith('/profile/') || location.pathname.startsWith('/settings/'));


  return (
    <>
      <CreateContentSheet
        isOpen={showContentSheet}
        onClose={() => setShowContentSheet(false)}
        onSelect={handleContentTypeSelect}
      />

      {/* ── Instagram-style flat bottom nav — mobile only ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white/98 backdrop-blur-xl lg:hidden"
        data-testid="bottom-nav-bar"
        aria-label="Navegación principal"
      >
        <LayoutGroup>
        <div className="grid h-[64px] grid-cols-5 items-stretch px-1">

          {/* 1 — Home */}
          <Link
            to="/"
            aria-label={t('bottomNav.home', 'Inicio')}
            data-testid="bottom-nav-home"
            onClick={(e) => handleNavClick(e, isHome)}
            className="relative flex h-full flex-col items-center justify-center gap-0 active:scale-90 transition-transform"
          >
            <Home className={`h-[24px] w-[24px] ${isHome ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            <div className="h-1 flex items-center justify-center mt-0.5">
              {isHome && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
          </Link>

          {/* 2 — Explore / Buscar */}
          <Link
            to="/discover"
            aria-label={t('bottomNav.explore', 'Explorar')}
            data-testid="bottom-nav-explore"
            onClick={(e) => handleNavClick(e, isExplore)}
            className="relative flex h-full flex-col items-center justify-center gap-0 active:scale-90 transition-transform"
          >
            <Compass className={`h-[24px] w-[24px] ${isExplore ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            <div className="h-1 flex items-center justify-center mt-0.5">
              {isExplore && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
          </Link>

          {/* 3 — Crear (+) — elevated */}
          <button
            type="button"
            onClick={handlePostButton}
            aria-label={t('bottomNav.create', 'Crear')}
            data-testid="bottom-nav-post"
            className="relative flex h-full items-center justify-center active:scale-90 transition-transform"
          >
            <div
              className="flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90 bg-stone-950 w-[46px] h-[46px] -mt-3.5"
            >
              <Plus className="h-[22px] w-[22px] text-white" strokeWidth={2.4} />
            </div>
          </button>

          {/* 4 — Reels */}
          <Link
            to="/reels"
            aria-label={t('bottomNav.reels', 'Reels')}
            data-testid="bottom-nav-reels"
            onClick={(e) => handleNavClick(e, isReels)}
            className="relative flex h-full flex-col items-center justify-center gap-0 active:scale-90 transition-transform"
          >
            <Play className={`h-[24px] w-[24px] ${isReels ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            <div className="h-1 flex items-center justify-center mt-0.5">
              {isReels && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
          </Link>

          {/* 5 — Perfil */}
          <Link
            to={profileUrl}
            aria-label={t('bottomNav.profile', 'Perfil')}
            data-testid="bottom-nav-profile"
            onClick={(e) => handleNavClick(e, isProfile)}
            className="relative flex h-full flex-col items-center justify-center gap-0 active:scale-90 transition-transform"
          >
            {!initialized ? (
              <div className="h-[24px] w-[24px] animate-pulse rounded-full bg-stone-100" />
            ) : profileImage && !profileAvatarError ? (
              <div className={`h-[24px] w-[24px] overflow-hidden rounded-full transition-all ${
                isProfile
                  ? 'ring-[2px] ring-stone-950 ring-offset-[2px] ring-offset-white'
                  : 'ring-[1.5px] ring-stone-300 ring-offset-0'
              }`}>
                <img
                  src={profileImage}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setProfileAvatarError(true)}
                />
              </div>
            ) : (
              <User className={`h-[24px] w-[24px] ${isProfile ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            )}
            <div className="h-1 flex items-center justify-center mt-0.5">
              {isProfile && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
          </Link>
        </div>
        </LayoutGroup>

        {/* Safe area para iPhones con home indicator */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>

      {/* Spacer para que el contenido no quede tapado por la nav — mobile only */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom,0px))] lg:hidden" />
    </>
  );
}
