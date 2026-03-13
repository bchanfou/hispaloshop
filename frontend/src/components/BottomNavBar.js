import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Film, Plus, User, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';
import InternalChat from './InternalChat';
import CreatorEntry from './creator/CreatorEntry';
import AdvancedEditor from './creator/editor/AdvancedEditor';
import { publishSocialContent } from './creator/publishContent';
import MessageToast from './notifications/MessageToast';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';
import { getToken } from '../lib/auth';
import { useUnreadNotifications } from '../hooks/api/useNotifications';

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/vender/registro', '/vender/login', '/productor/registro', '/influencers/registro', '/influencers/login',
  '/influencer/aplicar', '/influencers/aplicar',
  '/seller/login', '/seller/register', '/influencer/login', '/influencer/register',
  '/chat',
  '/reels',   // full-screen inmersivo — nav oculta
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
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations, reloadConversations } = useInternalChatData();
  const [activePanel, setActivePanel] = useState(null);
  const [initialChatUserId, setInitialChatUserId] = useState(null);
  const [messageToast, setMessageToast] = useState(null);
  const [showCreatorEntry,      setShowCreatorEntry]      = useState(false);
  const [selectedContentType,   setSelectedContentType]   = useState(null);
  const [selectedFiles,         setSelectedFiles]         = useState([]);
  const [showAdvancedEditor,    setShowAdvancedEditor]    = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const toastTimeoutRef = useRef(null);
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
    const handleOpenCreator = () => {
      if (!user) { navigate('/login'); return; }
      setShowCreatorEntry(true);
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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat?token=${token}`);

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

        if (toastTimeoutRef.current) {
          window.clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = window.setTimeout(() => {
          setMessageToast(null);
          toastTimeoutRef.current = null;
        }, 4000);
      } catch (error) {
        console.error('[BottomNavBar] Error procesando notificacion de chat', error);
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
    if (activePanel === 'post') { closePanel(); return; }
    setShowCreatorEntry(true);
  };

  // Called by CreatorEntry when user taps "Siguiente"
  const handleCreatorProceed = ({ contentType, files }) => {
    setSelectedContentType(contentType);
    setSelectedFiles(files);
    setShowCreatorEntry(false);
    setShowAdvancedEditor(true);
  };

  const handleEditorClose = () => {
    setShowAdvancedEditor(false);
    setShowCreatorEntry(false);
    setSelectedContentType(null);
    setSelectedFiles([]);
    closePanel();
  };

  const handlePublish = async (publishData) => {
    try {
      await publishSocialContent({
        apiBase: API,
        publishData,
        onProgress: publishData.onProgress,
        signal: publishData.signal,
      });

      toast.success(t('social.published', 'Publicado'));
      handleEditorClose();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        toast('Cancelado');
        return;
      }
      toast.error(error.message || 'Error');
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
  const isCreating   = showAdvancedEditor || showCreatorEntry;

  return (
    <>
      <MessageToast notification={messageToast} onClose={dismissMessageToast} onOpen={openMessageToast} />

      <AnimatePresence>
        {showCreatorEntry && (
          <CreatorEntry
            onClose={() => {
              setShowCreatorEntry(false);
              setSelectedFiles([]);
            }}
            onProceed={handleCreatorProceed}
          />
        )}
      </AnimatePresence>

      {showAdvancedEditor && selectedContentType ? (
        <AdvancedEditor
          contentType={selectedContentType}
          files={selectedFiles}
          onClose={handleEditorClose}
          onPublish={handlePublish}
        />
      ) : null}

      {activePanel === 'chat' ? (
        <div className="fixed inset-0 z-50 md:inset-auto md:bottom-[70px] md:right-4" data-testid="chat-panel">
          <div className="flex h-full flex-col bg-white shadow-2xl md:h-[550px] md:w-[380px] md:rounded-2xl md:border md:border-stone-200">
            <InternalChat isEmbedded={true} onClose={closePanel} initialChatUserId={initialChatUserId} />
          </div>
        </div>
      ) : null}

      {/* ── Instagram-style flat bottom nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white/98 backdrop-blur-xl"
        data-testid="bottom-nav-bar"
      >
        <div className="grid h-[50px] grid-cols-5 items-center px-1">

          {/* 1 — Home */}
          <Link
            to="/"
            aria-label={t('bottomNav.home', 'Inicio')}
            data-testid="bottom-nav-home"
            className="flex items-center justify-center active:opacity-60"
          >
            {isHome ? (
              /* Filled house — active */
              <svg viewBox="0 0 24 24" className="h-[26px] w-[26px] fill-stone-950 text-stone-950" aria-hidden="true">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            ) : (
              <Home className="h-[26px] w-[26px] text-stone-400" strokeWidth={1.8} />
            )}
          </Link>

          {/* 2 — Explore / Buscar */}
          <Link
            to="/discover"
            aria-label={t('bottomNav.explore', 'Explorar')}
            data-testid="bottom-nav-explore"
            className="flex items-center justify-center active:opacity-60"
          >
            {isExplore ? (
              /* Filled search — active */
              <svg viewBox="0 0 24 24" className="h-[26px] w-[26px] fill-stone-950 text-stone-950" aria-hidden="true">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            ) : (
              <Compass className="h-[26px] w-[26px] text-stone-400" strokeWidth={1.8} />
            )}
          </Link>

          {/* 3 — Crear (+) */}
          <button
            type="button"
            onClick={handlePostButton}
            aria-label={t('bottomNav.create', 'Crear')}
            data-testid="bottom-nav-post"
            className="flex items-center justify-center active:opacity-60"
          >
            <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border transition-all active:scale-95 ${
              isCreating
                ? 'border-stone-400 bg-stone-200'
                : 'border-stone-300 bg-white'
            }`}>
              {isCreating ? (
                <X className="h-5 w-5 text-stone-700" strokeWidth={2} />
              ) : (
                <Plus className="h-5 w-5 text-stone-800" strokeWidth={2} />
              )}
            </div>
          </button>

          {/* 4 — Reels */}
          <Link
            to="/reels"
            aria-label={t('bottomNav.reels', 'Reels')}
            data-testid="bottom-nav-reels"
            className="flex items-center justify-center active:opacity-60"
          >
            {isReels ? (
              /* Filled clapperboard — active */
              <svg viewBox="0 0 24 24" className="h-[26px] w-[26px] fill-stone-950 text-stone-950" aria-hidden="true">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
              </svg>
            ) : (
              <Film className="h-[26px] w-[26px] text-stone-400" strokeWidth={1.8} />
            )}
          </Link>

          {/* 5 — Perfil */}
          <Link
            to={profileUrl}
            aria-label={t('bottomNav.profile', 'Perfil')}
            data-testid="bottom-nav-profile"
            className="flex items-center justify-center active:opacity-60"
          >
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
              isProfile ? (
                <svg viewBox="0 0 24 24" className="h-[26px] w-[26px] fill-stone-950 text-stone-950" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              ) : (
                <User className="h-[26px] w-[26px] text-stone-400" strokeWidth={1.8} />
              )
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
