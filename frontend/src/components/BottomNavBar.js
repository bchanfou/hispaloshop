import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Clapperboard, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import CreateContentSheet from './create/CreateContentSheet';
import MessageToast from './notifications/MessageToast';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';
import { getToken } from '../lib/auth';
import { getWSUrl } from '../services/api/client';

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


export default function BottomNavBar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations, reloadConversations } = useInternalChatData();
  const [messageToast, setMessageToast] = useState(null);
  const [showContentSheet, setShowContentSheet] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const toastTimeoutRef = useRef(null);
  const conversationsRef = useRef(conversations);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    setProfileAvatarError(false);
  }, [user?.profile_image, user?.avatar_url, user?.name, user?.full_name, user?.username]);

  const shouldHide =
    HIDDEN_ON_PATHS.some((path) => location.pathname.startsWith(path)) ||
    HIDDEN_ON_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  const dismissMessageToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setMessageToast(null);
  }, []);

  const openMessageToast = useCallback(() => {
    if (!messageToast?.senderId) return;
    dismissMessageToast();
    navigate('/messages');
  }, [dismissMessageToast, messageToast, navigate]);

  useEffect(() => {
    const handleOpenChat = () => {
      navigate('/messages');
    };

    const handleToggleChat = () => {
      navigate('/messages');
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

  useEffect(() => {
    const token = getToken();
    if (!user?.user_id || !token || typeof window === 'undefined') return undefined;

    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(getWSUrl('/ws/chat'));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'auth', token }));
        // Reset backoff on successful connection
        reconnectAttemptsRef.current = 0;
      });

      socket.onerror = () => {
        try { socket.close(); } catch { /* already closed */ }
      };

      socket.onclose = () => {
        if (disposed) return;
        // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type !== 'new_message') return;

          const incomingMessage = payload.message;
          const currentConversation = conversationsRef.current.find(
            (conversation) => conversation.conversation_id === payload.conversation_id
          );
          const chatOpen = location.pathname === '/messages' || location.pathname.startsWith('/messages/');

          reloadConversations();

          if (!incomingMessage || incomingMessage.sender_id === user.user_id || chatOpen) {
            return;
          }

          setMessageToast({
            conversationId: payload.conversation_id,
            senderId: currentConversation?.other_user_id || incomingMessage.sender_id,
            senderName: currentConversation?.other_user_name || incomingMessage.sender_name || 'Nuevo mensaje',
            avatar: currentConversation?.other_user_avatar || null,
            preview: incomingMessage.content || 'Te ha enviado una imagen',
          });

          // Enhanced toast system (ChatToastContainer)
          if (window.__hispaloChatToast) {
            window.__hispaloChatToast({
              senderId: currentConversation?.other_user_id || incomingMessage.sender_id,
              senderName: currentConversation?.other_user_name || incomingMessage.sender_name || 'Nuevo mensaje',
              avatar: currentConversation?.other_user_avatar || null,
              preview: incomingMessage.content || 'Te ha enviado una imagen',
              conversationId: payload.conversation_id,
              type: currentConversation?.conv_type || 'c2c',
            });
          }

          if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current);
          }

          toastTimeoutRef.current = window.setTimeout(() => {
            setMessageToast(null);
            toastTimeoutRef.current = null;
          }, 4000);
        } catch {
          // silently handled
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      socketRef.current = null;
      reconnectAttemptsRef.current = 0;
    };
    // Only re-create socket when user changes — NOT on route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

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
      <MessageToast notification={messageToast} onClose={dismissMessageToast} onOpen={openMessageToast} />

      <CreateContentSheet
        isOpen={showContentSheet}
        onClose={() => setShowContentSheet(false)}
        onSelect={handleContentTypeSelect}
      />

      {/* ── Instagram-style flat bottom nav — always visible ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white/98 backdrop-blur-xl"
        data-testid="bottom-nav-bar"
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
            <Clapperboard className={`h-[24px] w-[24px] ${isReels ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
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
            {profileImage && !profileAvatarError ? (
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

      {/* Spacer para que el contenido no quede tapado por la nav */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom,0px))]" />
    </>
  );
}
