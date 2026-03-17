import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageCircle, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import InternalChat from './InternalChat';
import CreateContentSheet from './create/CreateContentSheet';
import MessageToast from './notifications/MessageToast';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';
import { getToken } from '../lib/auth';
import { getWSUrl } from '../services/api/client';
import { useUnreadNotifications } from '../hooks/api/useNotifications';

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/vender/registro', '/vender/login', '/productor/registro', '/influencers/registro', '/influencers/login',
  '/influencer/aplicar', '/influencers/aplicar',
  '/seller/login', '/seller/register', '/influencer/login', '/influencer/register',
  '/chat',
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
  const [activePanel, setActivePanel] = useState(null);
  const [initialChatUserId, setInitialChatUserId] = useState(null);
  const [messageToast, setMessageToast] = useState(null);
  const [showContentSheet,      setShowContentSheet]      = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const toastTimeoutRef = useRef(null);
  const chatDragControls = useDragControls();
  const activePanelRef = useRef(null);
  const conversationsRef = useRef(conversations);

  const { data: unreadData } = useUnreadNotifications();
  const unreadCount = user ? (unreadData?.count ?? 0) : 0;

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

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
    setInitialChatUserId(messageToast.senderId);
    setActivePanel('chat');
    dismissMessageToast();
  }, [dismissMessageToast, messageToast]);

  useEffect(() => {
    const handleOpenChat = (event) => {
      setInitialChatUserId(event.detail?.userId || null);
      setActivePanel('chat');
    };

    const handleToggleChat = () => {
      setActivePanel((prev) => (prev === 'chat' ? null : 'chat'));
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
  }, [user]);

  useEffect(() => {
    const token = getToken();
    if (!user?.user_id || !token || typeof window === 'undefined') return undefined;

    const socket = new WebSocket(getWSUrl('/ws/chat'));
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'auth', token }));
    });

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'new_message') return;

        const incomingMessage = payload.message;
        const currentConversation = conversationsRef.current.find(
          (conversation) => conversation.conversation_id === payload.conversation_id
        );
        const chatOpen = activePanelRef.current === 'chat' || location.pathname === '/chat';

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

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      socket.close();
    };
  }, [location.pathname, reloadConversations, user?.user_id]);

  if (shouldHide) return null;

  const closePanel = () => {
    setActivePanel(null);
    setInitialChatUserId(null);
  };

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

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      closePanel();
    } else {
      setInitialChatUserId(null);
      setActivePanel(panel);
    }
  };

  // Al pulsar el tab activo → scroll to top (igual que Instagram/Twitter)
  const handleNavClick = (e, isActive) => {
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const profileUserId = user?.user_id || user?.id || null;
  const profileUrl   = profileUserId ? `/user/${profileUserId}` : (user ? '/profile' : '/login');
  const profileImage = user?.profile_image || user?.avatar_url || null;

  const isHome       = location.pathname === '/';
  const isExplore    = location.pathname.startsWith('/discover') || location.pathname.startsWith('/products');
  const isReels      = location.pathname.startsWith('/reels');
  const isChatActive = activePanel === 'chat';
  const isProfile    = profileUserId
    ? location.pathname === `/user/${profileUserId}`
    : location.pathname === '/profile';


  return (
    <>
      <MessageToast notification={messageToast} onClose={dismissMessageToast} onOpen={openMessageToast} />

      <AnimatePresence>
        {activePanel === 'chat' ? (
          <>
            {/* Backdrop mobile */}
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/30 md:hidden"
              onClick={closePanel}
            />

            {/* Panel */}
            <motion.div
              key="chat-panel"
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 34, stiffness: 300, mass: 0.8 }}
              drag="y"
              dragControls={chatDragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 450) closePanel();
              }}
              className="fixed bottom-0 left-0 right-0 z-[51] flex flex-col rounded-t-[28px] bg-white shadow-2xl md:inset-auto md:bottom-[70px] md:right-4 md:h-[550px] md:w-[380px] md:rounded-2xl md:border md:border-stone-200"
              data-testid="chat-panel"
            >
              {/* Drag handle — solo mobile */}
              <div
                onPointerDown={(e) => chatDragControls.start(e)}
                className="flex cursor-grab touch-none items-center justify-center py-2.5 active:cursor-grabbing md:hidden"
                aria-hidden="true"
              >
                <div className="h-[5px] w-10 rounded-full bg-stone-200" />
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <InternalChat isEmbedded={true} onClose={closePanel} initialChatUserId={initialChatUserId} />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

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
        <div className="grid h-[50px] grid-cols-5 items-stretch px-1">

          {/* 1 — Home */}
          <Link
            to="/"
            aria-label={t('bottomNav.home', 'Inicio')}
            data-testid="bottom-nav-home"
            onClick={(e) => handleNavClick(e, isHome)}
            className="relative flex h-full items-center justify-center active:opacity-60"
          >
            <div
              className="absolute top-0 left-1/2 h-[2px] w-4 rounded-full bg-stone-950 transition-transform duration-200 origin-center"
              style={{ transform: `translateX(-50%) scaleX(${isHome ? 1 : 0})` }}
            />
            <Home className={`h-[26px] w-[26px] ${isHome ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
          </Link>

          {/* 2 — Explore / Buscar */}
          <Link
            to="/discover"
            aria-label={t('bottomNav.explore', 'Explorar')}
            data-testid="bottom-nav-explore"
            onClick={(e) => handleNavClick(e, isExplore)}
            className="relative flex h-full items-center justify-center active:opacity-60"
          >
            <div
              className="absolute top-0 left-1/2 h-[2px] w-4 rounded-full bg-stone-950 transition-transform duration-200 origin-center"
              style={{ transform: `translateX(-50%) scaleX(${isExplore ? 1 : 0})` }}
            />
            <Compass className={`h-[26px] w-[26px] ${isExplore ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
          </Link>

          {/* 3 — Crear (+) — elevated */}
          <button
            type="button"
            onClick={handlePostButton}
            aria-label={t('bottomNav.create', 'Crear')}
            data-testid="bottom-nav-post"
            className="relative flex h-full items-center justify-center active:opacity-60"
          >
            <div
              className="flex items-center justify-center rounded-full shadow-md transition-all active:scale-90 bg-stone-950"
              style={{ width: 42, height: 42, marginTop: -12 }}
            >
              <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
          </button>

          {/* 4 — Chats */}
          <button
            type="button"
            onClick={() => { if (!user) { navigate('/login'); return; } togglePanel('chat'); }}
            aria-label={t('bottomNav.chats', 'Chats')}
            data-testid="bottom-nav-chats"
            className="relative flex h-full items-center justify-center active:opacity-60"
          >
            <div
              className="absolute top-0 left-1/2 h-[2px] w-4 rounded-full bg-stone-950 transition-transform duration-200 origin-center"
              style={{ transform: `translateX(-50%) scaleX(${isChatActive ? 1 : 0})` }}
            />
            <MessageCircle className={`h-[26px] w-[26px] ${isChatActive ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-0.5"
                style={{ fontSize: 8, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-sans)', background: 'var(--color-red)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* 5 — Perfil */}
          <Link
            to={profileUrl}
            aria-label={t('bottomNav.profile', 'Perfil')}
            data-testid="bottom-nav-profile"
            onClick={(e) => handleNavClick(e, isProfile)}
            className="relative flex h-full items-center justify-center active:opacity-60"
          >
            <div
              className="absolute top-0 left-1/2 h-[2px] w-4 rounded-full bg-stone-950 transition-transform duration-200 origin-center"
              style={{ transform: `translateX(-50%) scaleX(${isProfile ? 1 : 0})` }}
            />
            {profileImage && !profileAvatarError ? (
              <div className={`h-[26px] w-[26px] overflow-hidden rounded-full transition-all ${
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
              <User className={`h-[26px] w-[26px] ${isProfile ? 'text-stone-950' : 'text-stone-400'}`} strokeWidth={1.8} />
            )}
          </Link>
        </div>

        {/* Safe area para iPhones con home indicator */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>

      {/* Spacer para que el contenido no quede tapado por la nav */}
      <div className="h-[calc(50px+env(safe-area-inset-bottom,0px))]" />
    </>
  );
}
