import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import apiClient from '../services/api/client';
import { getToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';

const MAX_VISIBLE_MESSAGES = 150;

function formatTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatConversationTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return formatTime(value);
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function getRoleLabel(role) {
  switch ((role || '').toLowerCase()) {
    case 'producer':
    case 'productor':
      return 'Productor';
    case 'influencer':
      return 'Influencer';
    case 'importer':
    case 'importador':
      return 'Importador';
    case 'consumer':
    case 'customer':
    case 'consumidor':
      return 'Consumidor';
    default:
      return '';
  }
}

function getInitial(value) {
  return (value || 'U').trim().charAt(0).toUpperCase();
}

function ChatAvatar({ src, name, size = 'h-11 w-11', alt }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt || `Avatar de ${name || 'usuario'}`}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-700`}
    >
      {getInitial(name)}
    </div>
  );
}

function MessageStatus({ message, isOwn }) {
  const status = (message?.status || '').toLowerCase();
  const label = status === 'read' ? 'Leido' : 'No leido';

  return (
    <div
      className={`mt-1.5 flex items-center gap-2 px-1 text-[11px] ${
        isOwn ? 'justify-end text-stone-400' : 'text-stone-400'
      }`}
    >
      <span>{formatTime(message?.read_at || message?.delivered_at || message?.created_at)}</span>
      {isOwn ? <span>{label}</span> : null}
    </div>
  );
}

function MessageBubble({ message, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {message?.image_url ? (
          <div
            className={`mb-2 overflow-hidden rounded-[24px] border shadow-[0_12px_32px_rgba(15,23,42,0.08)] ${
              isOwn ? 'border-stone-900/10' : 'border-white/80'
            }`}
          >
            <img
              src={message.image_url}
              alt="Imagen compartida en el chat"
              loading="lazy"
              className="max-w-[280px] object-cover"
            />
          </div>
        ) : null}
        {message?.content ? (
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              isOwn
                ? 'rounded-br-md bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)]'
                : 'rounded-bl-md border border-white/80 bg-white/90 text-stone-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm'
            }`}
          >
            {message.content}
          </div>
        ) : null}
        <MessageStatus message={message} isOwn={isOwn} />
      </div>
    </motion.div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-stone-500 shadow-sm backdrop-blur-sm">
        Hispaloshop
      </div>
      <h3 className="mt-4 text-lg font-medium text-stone-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{description}</p>
    </div>
  );
}

export default function InternalChat({
  isEmbedded = false,
  onClose = null,
  initialChatUserId = null,
}) {
  const { user } = useAuth();
  const {
    conversations,
    influencers,
    producers,
    loadingDirectory,
    reloadConversations,
    fetchMessages,
    uploadImage,
    sendHttpMessage,
    startConversation,
    sendingMessage,
    uploadingImage,
  } = useInternalChatData();

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [typingUserId, setTypingUserId] = useState(null);
  const [startingConversation, setStartingConversation] = useState(false);

  const wsRef = useRef(null);
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeConversationRef = useRef(null);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const left = new Date(b.updated_at || b.created_at || 0).getTime();
        const right = new Date(a.updated_at || a.created_at || 0).getTime();
        return left - right;
      }),
    [conversations]
  );

  const directoryUsers = useMemo(() => {
    const registry = new Map();
    [...producers, ...influencers].forEach((entry) => {
      const userId = entry?.user_id || entry?.producer_id || entry?.influencer_id;
      if (!userId || userId === user?.user_id || registry.has(userId)) return;

      registry.set(userId, {
        user_id: userId,
        name: entry?.name || entry?.store_name || entry?.username || 'Usuario',
        role: entry?.role || (entry?.producer_id ? 'producer' : 'influencer'),
        avatar: entry?.profile_image || entry?.avatar_url || entry?.logo || null,
      });
    });
    return Array.from(registry.values()).slice(0, 8);
  }, [influencers, producers, user?.user_id]);

  const filteredConversations = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return sortedConversations;

    return sortedConversations.filter((conversation) => {
      const haystack = [
        conversation?.other_user_name,
        conversation?.other_user_role,
        conversation?.last_message?.content,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchValue, sortedConversations]);

  const activeConversation = useMemo(
    () =>
      sortedConversations.find((conversation) => conversation.conversation_id === selectedConversationId) || null,
    [selectedConversationId, sortedConversations]
  );

  useEffect(() => {
    activeConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId && sortedConversations.length > 0 && !initialChatUserId) {
      setSelectedConversationId(sortedConversations[0].conversation_id);
    }
  }, [initialChatUserId, selectedConversationId, sortedConversations]);

  const markIncomingMessagesAsRead = useCallback(
    async (items, conversationId = selectedConversationId) => {
      if (!user?.user_id || !conversationId) return;

      const unreadIds = items
        .filter(
          (message) =>
            message?.sender_id !== user.user_id && String(message?.status || '').toLowerCase() !== 'read'
        )
        .map((message) => message.message_id)
        .filter(Boolean);

      if (unreadIds.length === 0) return;

      await Promise.allSettled(
        unreadIds.map((messageId) => apiClient.put(`/internal-chat/messages/${messageId}/read`, {}))
      );

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.message_id)
            ? { ...message, status: 'read', read_at: new Date().toISOString() }
            : message
        )
      );

      reloadConversations();
    },
    [reloadConversations, selectedConversationId, user?.user_id]
  );

  const loadConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      setSelectedConversationId(conversationId);
      setLoadingMessages(true);

      try {
        const nextMessages = await fetchMessages(conversationId);
        setMessages(Array.isArray(nextMessages) ? nextMessages : []);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'join_conversation', conversation_id: conversationId }));
        }

        if (Array.isArray(nextMessages) && nextMessages.length > 0) {
          await markIncomingMessagesAsRead(nextMessages, conversationId);
        }
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchMessages, markIncomingMessagesAsRead]
  );

  const startConversationWithUser = useCallback(
    async (targetUserId) => {
      if (!targetUserId) return;
      setStartingConversation(true);
      try {
        const result = await startConversation(targetUserId);
        const conversationId = result?.conversation_id || result?.data?.conversation_id;
        await reloadConversations();
        if (conversationId) {
          await loadConversation(conversationId);
        }
      } finally {
        setStartingConversation(false);
      }
    },
    [loadConversation, reloadConversations, startConversation]
  );

  useEffect(() => {
    if (initialChatUserId) {
      const existing = sortedConversations.find((conversation) => conversation.other_user_id === initialChatUserId);
      if (existing) {
        loadConversation(existing.conversation_id);
      } else {
        startConversationWithUser(initialChatUserId);
      }
    }
  }, [initialChatUserId, loadConversation, sortedConversations, startConversationWithUser]);

  useEffect(() => {
    const token = getToken();
    if (!user?.user_id || !token || typeof window === 'undefined') return undefined;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat?token=${token}`);
    wsRef.current = socket;

    socket.onopen = () => {
      if (activeConversationRef.current) {
        socket.send(JSON.stringify({ type: 'join_conversation', conversation_id: activeConversationRef.current }));
      }
    };

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'typing') {
          if (payload.conversation_id === activeConversationRef.current && payload.user_id !== user.user_id) {
            setTypingUserId(payload.is_typing ? payload.user_id : null);
            if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
            if (payload.is_typing) {
              typingClearRef.current = window.setTimeout(() => setTypingUserId(null), 3000);
            }
          }
          return;
        }

        if (payload.type === 'message_read' || payload.type === 'read_receipt') {
          const changedConversation = payload.conversation_id;
          if (changedConversation === activeConversationRef.current) {
            setMessages((current) =>
              current.map((message) =>
                message.sender_id === user.user_id
                  ? { ...message, status: 'read', read_at: payload.read_at || new Date().toISOString() }
                  : message
              )
            );
          }
          reloadConversations();
          return;
        }

        if (payload.type === 'new_message') {
          const incomingMessage = payload.message;
          const incomingConversation = payload.conversation_id;

          reloadConversations();

          if (incomingConversation === activeConversationRef.current && incomingMessage) {
            setMessages((current) => {
              if (current.some((message) => message.message_id === incomingMessage.message_id)) {
                return current;
              }
              return [...current, incomingMessage];
            });

            if (incomingMessage.sender_id !== user.user_id) {
              await markIncomingMessagesAsRead([incomingMessage], incomingConversation);
            }
          }
        }
      } catch (error) {
        console.error('[InternalChat] Error procesando WebSocket', error);
      }
    };

    return () => {
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      socket.close();
      wsRef.current = null;
    };
  }, [markIncomingMessagesAsRead, reloadConversations, user?.user_id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typingUserId]);

  const sendTyping = useCallback(
    (isTyping) => {
      if (!selectedConversationId || wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          conversation_id: selectedConversationId,
          is_typing: Boolean(isTyping),
        })
      );
    },
    [selectedConversationId]
  );

  const handleComposerChange = (event) => {
    setComposerValue(event.target.value);
    sendTyping(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => sendTyping(false), 700);
  };

  const handleSendMessage = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!selectedConversationId || !trimmed) return;

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage = {
      message_id: optimisticId,
      conversation_id: selectedConversationId,
      sender_id: user?.user_id,
      sender_name: user?.name,
      content: trimmed,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setComposerValue('');
    sendTyping(false);

    try {
      const saved = await sendHttpMessage({ conversation_id: selectedConversationId, content: trimmed });
      setMessages((current) =>
        current.map((message) => (message.message_id === optimisticId ? { ...saved } : message))
      );
      reloadConversations();
    } catch (error) {
      setMessages((current) => current.filter((message) => message.message_id !== optimisticId));
    }
  }, [
    composerValue,
    reloadConversations,
    selectedConversationId,
    sendHttpMessage,
    sendTyping,
    user?.name,
    user?.user_id,
  ]);

  const handleAttachImage = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !selectedConversationId) return;

      try {
        const upload = await uploadImage({ file, conversationId: selectedConversationId });
        const imageUrl = upload?.image_url || upload?.data?.image_url;
        if (!imageUrl) return;
        const saved = await sendHttpMessage({
          conversation_id: selectedConversationId,
          image_url: imageUrl,
          content: '',
        });
        setMessages((current) => [...current, saved]);
        reloadConversations();
      } catch (error) {
        console.error('[InternalChat] Error enviando imagen', error);
      }
    },
    [reloadConversations, selectedConversationId, sendHttpMessage, uploadImage]
  );

  const visibleMessages = useMemo(() => messages.slice(-MAX_VISIBLE_MESSAGES), [messages]);
  const showBackButton = isEmbedded || Boolean(onClose);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#fcfcfb_0%,#f5f3ef_100%)] text-stone-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-12%] h-56 w-56 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-4%] h-64 w-64 rounded-full bg-stone-200/70 blur-3xl" />
      </div>

      <div
        className={`relative z-10 flex h-full min-h-0 w-full flex-col border-r border-stone-200/70 bg-white/78 backdrop-blur-xl ${
          activeConversation ? 'max-md:hidden md:w-[340px]' : ''
        }`}
      >
        <div className="border-b border-stone-200/70 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-stone-200 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500 shadow-sm">
                Inbox
              </div>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-stone-950">Mensajes</h2>
              <p className="mt-1 text-sm text-stone-500">Conversaciones directas dentro de Hispaloshop</p>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/85 text-stone-500 shadow-sm transition-colors hover:bg-stone-100 hover:text-stone-950"
                aria-label="Cerrar chat"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-full border border-stone-200/80 bg-stone-50/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors focus-within:border-stone-400 focus-within:bg-white">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar conversacion"
              className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
              aria-label="Buscar conversacion"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {filteredConversations.length > 0 ? (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const isActive = conversation.conversation_id === selectedConversationId;
                const lastMessage = conversation.last_message?.content || 'Imagen compartida';
                const unreadCount = Number(conversation.unread_count || 0);

                return (
                  <button
                    key={conversation.conversation_id}
                    type="button"
                    onClick={() => loadConversation(conversation.conversation_id)}
                    className={`relative flex w-full items-center gap-3 rounded-[24px] border px-3 py-3.5 text-left transition-all duration-200 ease-out ${
                      isActive
                        ? 'border-stone-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                        : 'border-transparent bg-white/50 hover:border-stone-200/80 hover:bg-white/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <ChatAvatar
                        src={conversation.other_user_avatar}
                        name={conversation.other_user_name}
                        alt={`Avatar de ${conversation.other_user_name}`}
                      />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm text-stone-950 ${
                              unreadCount > 0 ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {conversation.other_user_name}
                          </p>
                          <p className="mt-1 truncate text-sm text-stone-500">{lastMessage}</p>
                        </div>
                        <span className="shrink-0 text-xs text-stone-400">
                          {formatConversationTime(conversation.last_message?.created_at || conversation.updated_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                title="No tienes conversaciones"
                description="Usa Directorio para iniciar un chat con productores, importadores o influencers."
              />
            </div>
          )}

          <div className="mt-6 border-t border-stone-200/70 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Directorio</h3>
              {startingConversation ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : null}
            </div>
            {loadingDirectory ? (
              <div className="space-y-2">
                {[0, 1, 2].map((value) => (
                  <div key={value} className="h-14 animate-pulse rounded-2xl bg-stone-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {directoryUsers.map((entry) => (
                  <button
                    key={entry.user_id}
                    type="button"
                    onClick={() => startConversationWithUser(entry.user_id)}
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/80 bg-white/80 px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-colors hover:bg-white"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ChatAvatar
                        src={entry.avatar}
                        name={entry.name}
                        alt={`Avatar de ${entry.name}`}
                        size="h-10 w-10"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-950">{entry.name}</p>
                        <p className="truncate text-xs text-stone-500">
                          {getRoleLabel(entry.role) || 'Miembro de la comunidad'}
                        </p>
                      </div>
                    </div>
                    <UserPlus className="h-4 w-4 text-stone-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${activeConversation ? '' : 'max-md:hidden'}`}>
        {activeConversation ? (
          <>
            <div className="border-b border-white/60 bg-white/75 px-5 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {showBackButton ? (
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 md:hidden"
                      aria-label="Volver a conversaciones"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  <ChatAvatar
                    src={activeConversation.other_user_avatar}
                    name={activeConversation.other_user_name}
                    size="h-10 w-10"
                    alt={`Avatar de ${activeConversation.other_user_name}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">
                      {activeConversation.other_user_name}
                    </p>
                    {getRoleLabel(activeConversation.other_user_role) ? (
                      <span className="mt-1 inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                        {getRoleLabel(activeConversation.other_user_role)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
                    aria-label="Cerrar chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(245,243,239,0.9)_100%)] px-5 py-5">
              <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(120,113,108,0.08)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
              {loadingMessages ? (
                <div className="relative z-10 flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                </div>
              ) : visibleMessages.length > 0 ? (
                <div className="relative z-10 space-y-4">
                  {visibleMessages.map((message) => (
                    <MessageBubble
                      key={message.message_id}
                      message={message}
                      isOwn={message.sender_id === user?.user_id}
                    />
                  ))}
                  <AnimatePresence>
                    {typingUserId ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="inline-flex rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-xs text-stone-500 shadow-sm backdrop-blur-sm"
                      >
                        Esta escribiendo...
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <div ref={listEndRef} />
                </div>
              ) : (
                <EmptyState
                  title="Empieza la conversacion"
                  description="Escribe el primer mensaje y manten la conversacion dentro de un contexto claro."
                />
              )}
            </div>

            <div className="border-t border-white/70 bg-white/80 px-5 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 rounded-[28px] border border-stone-200/80 bg-white/90 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-950"
                  aria-label="Adjuntar imagen"
                  disabled={uploadingImage}
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </button>
                <label className="flex min-w-0 flex-1 items-center rounded-full bg-transparent px-2 py-2">
                  <input
                    type="text"
                    value={composerValue}
                    onChange={handleComposerChange}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                    aria-label="Escribe un mensaje"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!composerValue.trim() || sendingMessage}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)] transition-all duration-150 ease-out hover:bg-stone-800 disabled:bg-stone-300"
                  aria-label="Enviar mensaje"
                >
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAttachImage}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="Selecciona una conversacion"
            description="Abre un chat existente o inicia uno nuevo desde el directorio."
          />
        )}
      </div>
    </div>
  );
}
