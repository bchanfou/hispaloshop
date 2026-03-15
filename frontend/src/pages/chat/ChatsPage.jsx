import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, PenSquare } from 'lucide-react';
import { useChatContext } from '@/context/chat/ChatProvider';

/* ── V2 Design Tokens (inline usage) ───────────────────────── */
const T = {
  cream:      '#F7F6F2',
  black:      '#0A0A0A',
  green:      '#2E7D52',
  stone:      '#8A8881',
  border:     '#E5E2DA',
  surface:    '#F0EDE8',
  white:      '#FFFFFF',
  greenLight: '#E8F5EC',
  fontSans:   'Inter, system-ui, -apple-system, sans-serif',
  radiusMd:   12,
  radiusFull: 9999,
};

/* ── Filter definitions ────────────────────────────────────── */
const FILTERS = [
  { key: 'all',    label: 'Todos' },
  { key: 'b2c',    label: 'Tiendas' },
  { key: 'b2b',    label: 'B2B' },
  { key: 'c2c',    label: 'Personas' },
  { key: 'collab', label: 'Collab' },
];

/* ── Type badge config ─────────────────────────────────────── */
const TYPE_BADGES = {
  b2c:    { label: 'Tienda', bg: T.surface, color: T.stone },
  b2b:    { label: 'B2B',    bg: T.surface, color: T.stone },
  collab: { label: 'Collab', bg: T.greenLight, color: T.green },
  c2c:    null,
};

/* ── Helpers ───────────────────────────────────────────────── */
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

function avatarRadius(type) {
  switch (type) {
    case 'b2c':    return T.radiusMd;
    case 'b2b':    return 8;
    case 'collab':
    case 'c2c':
    default:       return T.radiusFull;
  }
}

/* ── ConversationItem ──────────────────────────────────────── */
function ConversationItem({ conversation, index, onClick }) {
  const {
    id,
    name,
    avatar_url,
    last_message,
    last_message_at,
    unread_count = 0,
    type = 'c2c',
  } = conversation;

  const isUnread = unread_count > 0;
  const badge = TYPE_BADGES[type];
  const radius = avatarRadius(type);
  const isCollab = type === 'collab';
  const isB2B = type === 'b2b';

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="w-full flex items-start gap-3"
      style={{
        padding: '14px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: T.fontSans,
      }}
    >
      {/* Avatar */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: radius,
          overflow: 'hidden',
          ...(isCollab ? {
            outline: `2px solid ${T.green}`,
            outlineOffset: 2,
          } : {}),
          ...(isB2B ? {
            border: `1px solid ${T.border}`,
          } : {}),
        }}
      >
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            style={{
              width: 48,
              height: 48,
              objectFit: 'cover',
              borderRadius: radius,
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: radius,
              backgroundColor: T.black,
              color: T.white,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: T.fontSans,
            }}
          >
            {getInitial(name)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1" style={{ minWidth: 0 }}>
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate"
            style={{
              fontSize: 15,
              fontWeight: isUnread ? 700 : 600,
              color: T.black,
              lineHeight: '20px',
            }}
          >
            {name || 'Sin nombre'}
          </span>
          <span
            className="flex-shrink-0"
            style={{
              fontSize: 12,
              color: T.stone,
              lineHeight: '16px',
            }}
          >
            {formatTimestamp(last_message_at)}
          </span>
        </div>

        {/* Type badge */}
        {badge && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              fontWeight: 500,
              lineHeight: '16px',
              padding: '0 6px',
              borderRadius: T.radiusFull,
              backgroundColor: badge.bg,
              color: badge.color,
              marginTop: 2,
            }}
          >
            {badge.label}
          </span>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2" style={{ marginTop: 2 }}>
          <span
            className="truncate"
            style={{
              fontSize: 13,
              color: isUnread ? T.black : T.stone,
              fontWeight: isUnread ? 500 : 400,
              lineHeight: '18px',
            }}
          >
            {last_message || 'Sin mensajes aun'}
          </span>

          {isUnread && (
            <span
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 18,
                height: 18,
                borderRadius: T.radiusFull,
                backgroundColor: T.black,
                color: T.white,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {unread_count > 99 ? '99+' : unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── ChatsPage ─────────────────────────────────────────────── */
export default function ChatsPage() {
  const navigate = useNavigate();
  const { conversations, reloadConversations } = useChatContext();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef(null);

  /* Load conversations on mount */
  useEffect(() => {
    reloadConversations();
  }, [reloadConversations]);

  /* Debounce search input */
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

  /* Filtered + searched conversations */
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

  const isEmpty = filteredConversations.length === 0;

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100vh',
        backgroundColor: T.cream,
        fontFamily: T.fontSans,
      }}
    >
      {/* ── TopBar ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between"
        style={{
          backgroundColor: `${T.cream}E6`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: T.black,
            margin: 0,
            lineHeight: '28px',
          }}
        >
          Mensajes
        </h1>

        <button
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: T.radiusFull,
            backgroundColor: T.black,
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Nuevo mensaje"
          onClick={() => navigate('/chat/new')}
        >
          <PenSquare size={16} color={T.white} strokeWidth={2} />
        </button>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div style={{ padding: '0 16px 8px' }}>
        <div
          className="flex items-center gap-2"
          style={{
            height: 44,
            backgroundColor: T.surface,
            borderRadius: T.radiusMd,
            padding: '0 12px',
          }}
        >
          <Search size={18} color={T.stone} strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar conversaciones..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: T.black,
              fontFamily: T.fontSans,
              lineHeight: '20px',
            }}
          />
        </div>
      </div>

      {/* ── Filter pills ───────────────────────────────────── */}
      <div
        className="flex overflow-x-auto"
        style={{
          gap: 8,
          padding: '4px 16px 12px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex-shrink-0"
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: T.radiusFull,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: T.fontSans,
                backgroundColor: isActive ? T.black : T.surface,
                color: isActive ? T.white : T.stone,
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Conversation list ──────────────────────────────── */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            /* Empty state */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center"
              style={{ paddingTop: 120, gap: 12 }}
            >
              <MessageCircle
                size={48}
                color={T.stone}
                strokeWidth={1.5}
              />
              <span
                style={{
                  fontSize: 16,
                  color: T.stone,
                  fontWeight: 500,
                }}
              >
                No tienes mensajes
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: T.stone,
                }}
              >
                Inicia una conversación
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredConversations.map((conv, i) => (
                <React.Fragment key={conv.id}>
                  <ConversationItem
                    conversation={conv}
                    index={i}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                  />
                  {/* Divider — indented past avatar */}
                  {i < filteredConversations.length - 1 && (
                    <div
                      style={{
                        height: 1,
                        backgroundColor: T.border,
                        marginLeft: 72,
                        marginRight: 16,
                      }}
                    />
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
