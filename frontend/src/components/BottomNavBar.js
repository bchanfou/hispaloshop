import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageCircle, Plus, User, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';
import InternalChat from './InternalChat';
import ContentTypeSelector from './creator/ContentTypeSelector';
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
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const galleryRef = useRef(null);
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

    window.addEventListener('open-chat-with-user', handleOpenChat);
    window.addEventListener('toggle-chat', handleToggleChat);
    return () => {
      window.removeEventListener('open-chat-with-user', handleOpenChat);
      window.removeEventListener('toggle-chat', handleToggleChat);
    };
  }, []);

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

  const handleGallerySelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      toast.error('Solo se permiten imagenes o videos');
      return;
    }

    setSelectedFiles(files);
    setShowContentTypeSelector(true);
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const getFilesForContentType = (contentTypeId, files) => {
    if (contentTypeId === 'reel') {
      const firstVideo = files.find((file) => file.type.startsWith('video/'));
      return firstVideo ? [firstVideo] : [];
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (contentTypeId === 'story') {
      return imageFiles.slice(0, 1);
    }
    return imageFiles.slice(0, 10);
  };

  const handlePostButton = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (activePanel === 'post') {
      closePanel();
      return;
    }

    setShowContentTypeSelector(true);
  };

  const handleContentTypeSelect = (contentType) => {
    const normalizedFiles = getFilesForContentType(contentType.id, selectedFiles);

    if (selectedFiles.length > 0 && normalizedFiles.length === 0) {
      toast.error(
        contentType.id === 'reel'
          ? 'Elige un video'
          : contentType.id === 'story'
            ? 'Elige una imagen'
            : 'Elige al menos una imagen'
      );
      return;
    }

    setSelectedContentType(contentType.id);
    setSelectedFiles(normalizedFiles);
    setShowContentTypeSelector(false);
    setShowAdvancedEditor(true);
  };

  const handleEditorClose = () => {
    setShowAdvancedEditor(false);
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
      toast.error(error.response?.data?.detail || 'Error');
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
  const profileUrl = profileUserId ? `/user/${profileUserId}` : '/login';
  const profileImage = user?.profile_image || user?.avatar_url || null;

  const navItems = [
    { id: 'home', icon: Home, label: t('bottomNav.home', 'Inicio'), link: '/' },
    { id: 'explore', icon: Compass, label: t('bottomNav.explore', 'Explorar'), link: '/discover' },
    { id: 'chat', icon: MessageCircle, label: t('bottomNav.chat', 'Chat'), action: () => (user ? togglePanel('chat') : navigate('/login')) },
    { id: 'profile', icon: User, label: t('bottomNav.profile', 'Perfil'), link: profileUrl, isProfile: true },
  ];

  return (
    <>
      <MessageToast notification={messageToast} onClose={dismissMessageToast} onOpen={openMessageToast} />

      <ContentTypeSelector
        isOpen={showContentTypeSelector}
        onClose={() => {
          setShowContentTypeSelector(false);
          setSelectedContentType(null);
          setSelectedFiles([]);
        }}
        onSelect={handleContentTypeSelect}
      />

      {showAdvancedEditor && selectedContentType ? (
        <AdvancedEditor
          contentType={selectedContentType}
          files={selectedFiles}
          onClose={handleEditorClose}
          onPublish={handlePublish}
        />
      ) : null}

      {activePanel === 'chat' ? (
        <div className="fixed inset-0 z-50 md:inset-auto md:bottom-[82px] md:right-4" data-testid="chat-panel">
          <div className="flex h-full flex-col bg-white shadow-2xl md:h-[550px] md:w-[380px] md:rounded-2xl md:border md:border-stone-200">
            <InternalChat isEmbedded={true} onClose={closePanel} initialChatUserId={initialChatUserId} />
          </div>
        </div>
      ) : null}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleGallerySelect}
        data-testid="gallery-file-input"
      />

      <nav className="pointer-events-none fixed bottom-2 left-0 right-0 z-40 md:bottom-5" data-testid="bottom-nav-bar">
        <div className="pointer-events-auto mx-auto max-w-xl px-2 sm:px-3">
          <div className="grid h-[76px] grid-cols-[1fr_1fr_auto_1fr_1fr] items-center rounded-[28px] border border-stone-200/90 bg-white/96 px-2 shadow-[0_16px_40px_rgba(15,15,15,0.12)] backdrop-blur-xl">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = item.match ? item.match(location) : location.pathname === item.link;

              return item.link ? (
                <Link
                  key={item.id}
                  to={item.link}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                  }`}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                  }`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>
                  <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={item.action}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                  }`}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                  }`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>
                  <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={handlePostButton}
              aria-label={t('bottomNav.create', 'Crear')}
              className="mx-1.5 flex flex-col items-center justify-center gap-1"
              data-testid="bottom-nav-post"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_10px_25px_rgba(15,15,15,0.2)] transition-all active:scale-95 ${
                activePanel === 'post' || showAdvancedEditor || showContentTypeSelector ? 'bg-stone-700' : 'bg-stone-950 hover:bg-stone-800'
              }`}>
                {activePanel === 'post' || showAdvancedEditor || showContentTypeSelector ? (
                  <X className="h-5 w-5 text-white" strokeWidth={2.2} />
                ) : (
                  <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
                )}
              </div>
              <span className="text-[11px] font-medium text-stone-600">{t('bottomNav.create', 'Crear')}</span>
            </button>

            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              const isPathActive = item.match ? item.match(location) : item.link ? location.pathname.startsWith(item.link) : false;
              const isActive = item.id === 'chat' ? activePanel === 'chat' : isPathActive;

              if (item.isProfile) {
                const isProfileActive = item.link && location.pathname === item.link;

                return (
                  <div
                    key={item.id}
                    className="flex min-w-0 flex-col items-center justify-center gap-1 py-2"
                    data-testid={`bottom-nav-${item.id}`}
                  >
                    <Link to={item.link} className="relative flex items-center justify-center" aria-label={item.label}>
                      {profileImage && !profileAvatarError ? (
                        <div className={`h-9 w-9 overflow-hidden rounded-full border-2 ${
                          isProfileActive ? 'border-stone-950' : 'border-stone-200'
                        }`}>
                          <img
                            src={profileImage}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={() => setProfileAvatarError(true)}
                          />
                        </div>
                      ) : (
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                          isProfileActive ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-500'
                        }`}>
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                        </div>
                      )}
                      {unreadCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-bold leading-none text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                    <span className="max-w-full truncate text-[11px] font-medium text-stone-600">{item.label}</span>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                  }`}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                  }`}>
                    {isActive ? <X className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  </div>
                  <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="h-[78px] md:hidden" />
    </>
  );
}
