import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Search, MessageCircle, PenSquare, Trash2, ArrowLeft } from 'lucide-react';
import { useChatContext } from '../../context/chat/ChatProvider';

const SWIPE_HINT_KEY = 'chat_swipe_hint_shown';

const FILTERS = [
  { key: 'all',    label: 'Todos' },
  { key: 'b2c',    label: 'Tiendas' },
  { key: 'b2b',    label: 'B2B' },
  { key: 'c2c',    label: 'Personas' },
  { key: 'collab', label: 'Collab' },
];

const TYPE_BADGES = {
  b2c:    { label: 'Tienda', classes: 'bg-stone-100 text-stone-500' },
  b2b:    { label: 'B2B',    classes: 'bg-stone-100 text-stone-500' },
  collab: { label: 'Collab', classes: 'bg-stone-100 text-stone-950' },
  c2c:    null,
};

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    return d.toLocaleDateString('es-ES', { weekday: 'short' });
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function ConversationItem({ conversation, index, onClick, onDelete, isTyping }) {
  const {
    name,
    avatar_url,
    last_message,
    last_message_at,
    unread_count = 0,
    type = 'c2c',
    online,
  } = conversation;

  const isUnread = unread_count > 0;
  const badge = TYPE_BADGES[type];
  const isStore = type === 'b2c' || type === 'b2b';

  const dragX = useMotionValue(0);
  const deleteOpacity = useTransform(dragX, [-120, -60], [1, 0]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete backdrop */}
      <motion.div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 size={18} className="text-white" />
      </motion.div>

      <motion.button
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.3, right: 0 }}
        dragSnapToOrigin
        style={{ x: dragX }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80 && onDelete) onDelete();
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
        onClick={onClick}
        className="flex w-full items-start gap-3 border-none bg-white px-4 py-3.5 text-left font-apple active:bg-stone-50"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className={`h-14 w-14 object-cover ${isStore ? 'rounded-2xl' : 'rounded-full'}`}
            />
          ) : (
            <div className={`flex h-14 w-14 items-center justify-center bg-stone-950 text-lg font-semibold text-white ${isStore ? 'rounded-2xl' : 'rounded-full'}`}>
              {getInitial(name)}
            </div>
          )}
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-stone-950" />
          )}
        </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-[15px] leading-5 text-stone-950 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
            {name || 'Sin nombre'}
          </span>
          <span className="shrink-0 text-xs text-stone-500">
            {formatTimestamp(last_message_at)}
          </span>
        </div>

        {badge && (
          <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${badge.classes}`}>
            {badge.label}
          </span>
        )}

        <div className="mt-0.5 flex items-center justify-between gap-2">
          {isTyping ? (
            <span className="text-stone-950 italic text-xs font-medium flex items-center gap-1">
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-stone-950 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
              Escribiendo
            </span>
          ) : (
            <span className={`truncate text-[13px] leading-[18px] ${isUnread ? 'font-medium text-stone-950' : 'text-stone-500'}`}>
              {last_message || 'Sin mensajes aún'}
            </span>
          )}

          {isUnread && (
            <span className="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-stone-950 px-1 text-[11px] font-semibold leading-none text-white">
              {unread_count > 99 ? '99+' : unread_count}
            </span>
          )}
        </div>
      </div>
      </motion.button>
    </div>
  );
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const { conversations, reloadConversations, deleteConversation, typingUsers } = useChatContext();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    reloadConversations();
  }, [reloadConversations]);

  // Show swipe hint once per device
  useEffect(() => {
    if (!localStorage.getItem(SWIPE_HINT_KEY)) {
      setShowSwipeHint(true);
      localStorage.setItem(SWIPE_HINT_KEY, '1');
      const t = setTimeout(() => setShowSwipeHint(false), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filteredConversations = useMemo(() => {
    let result = conversations || [];

    if (activeFilter !== 'all') {
      result = result.filter((c) => c.type === activeFilter);
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      result = result.filter((c) =>
        (c.name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [conversations, activeFilter, debouncedQuery]);

  const onlineConversations = useMemo(() =>
    (conversations || []).filter((c) => c.online),
  [conversations]);

  const isEmpty = filteredConversations.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-white font-apple">
      {/* TopBar — Instagram style */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-100 bg-white/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-950 active:bg-stone-100"
          aria-label="Volver"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-[22px] font-bold text-stone-950">Mensajes</h1>

        <button
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-950 active:bg-stone-100"
          aria-label="Nuevo mensaje"
          onClick={() => navigate('/messages/new')}
        >
          <PenSquare size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-2 pt-2">
        <label className="flex h-[36px] items-center gap-2 rounded-[10px] bg-stone-100 px-3">
          <Search size={16} className="text-stone-400" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar"
            className="flex-1 bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
          />
        </label>
      </div>

      {/* Active Now row — Instagram-style online contacts */}
      {onlineConversations.length > 0 && (
        <div className="border-b border-stone-100 pb-3 pt-1">
          <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4">
            {onlineConversations.map((conv) => {
              const isStore = conv.type === 'b2c' || conv.type === 'b2b';
              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  className="flex w-[58px] shrink-0 flex-col items-center gap-1"
                >
                  <div className="relative">
                    {conv.avatar_url ? (
                      <img
                        src={conv.avatar_url}
                        alt={conv.name}
                        className={`h-14 w-14 object-cover ${isStore ? 'rounded-2xl' : 'rounded-full'}`}
                      />
                    ) : (
                      <div className={`flex h-14 w-14 items-center justify-center bg-stone-950 text-lg font-semibold text-white ${isStore ? 'rounded-2xl' : 'rounded-full'}`}>
                        {getInitial(conv.name)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-[12px] w-[12px] rounded-full border-2 border-white bg-stone-950" />
                  </div>
                  <span className="w-full truncate text-center text-[11px] text-stone-500">{(conv.name || '').split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Swipe hint — shown once */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-stone-400 text-center py-1"
          >
            ← Desliza para eliminar conversaciones
          </motion.p>
        )}
      </AnimatePresence>

      {/* Filter pills */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-500 active:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Conversation list */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center gap-3 pt-28 px-6"
            >
              <MessageCircle size={48} className="text-stone-300" strokeWidth={1.5} />
              <span className="text-base font-semibold text-stone-950">Aún no tienes mensajes</span>
              <span className="text-[13px] text-stone-500 text-center">Empieza una conversación con productores, influencers y más</span>
              <button
                onClick={() => navigate('/messages/new')}
                className="mt-2 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white active:opacity-80"
              >
                Nueva conversación
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {filteredConversations.map((conv, i) => (
                <React.Fragment key={conv.id}>
                  <ConversationItem
                    conversation={conv}
                    index={i}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    onDelete={() => deleteConversation(conv.id)}
                    isTyping={!!typingUsers[conv.id]}
                  />
                  {i < filteredConversations.length - 1 && (
                    <div className="ml-[84px] mr-4 h-px bg-stone-100/80" />
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
