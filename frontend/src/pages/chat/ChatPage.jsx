import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Package,
  ChevronRight,
  ArrowUp,
  Plus,
  CheckCheck,
  Image,
} from 'lucide-react';
import { useChatContext } from '@/context/chat/ChatProvider';
import { useAuth } from '@/context/AuthContext';

/* ────────────────────────────────────────────
   Design-system V2 CSS variables (inline)
   ──────────────────────────────────────────── */
const V = {
  cream: '#F7F6F2',
  black: '#0A0A0A',
  green: '#2E7D52',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#FFFFFF',
  greenLight: '#e8f5ee',
  greenBorder: '#b6dcc6',
  fontSans: "'Inter', sans-serif",
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
};

/* ────────── Date helpers ────────── */
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateSeparator(date) {
  const now = new Date();
  if (isSameDay(date, now)) return 'Hoy';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ────────── Avatar shape by type ────────── */
function avatarRadius(type) {
  if (type === 'group') return '30%';
  if (type === 'support') return '8px';
  return '50%';
}

/* ================================================================
   ChatHeader
   ================================================================ */
function ChatHeader({ conversation, navigate }) {
  const statusOnline = conversation?.online;

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4"
      style={{
        background: `${V.cream}ee`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${V.border}`,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 12,
        fontFamily: V.fontSans,
      }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          color: V.black,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Volver"
      >
        <ArrowLeft size={22} />
      </button>

      {/* Avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: 40,
            height: 40,
            borderRadius: avatarRadius(conversation?.type),
            background: V.surface,
          }}
        >
          {conversation?.avatar_url ? (
            <img
              src={conversation.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="flex items-center justify-center w-full h-full"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: V.stone,
              }}
            >
              {(conversation?.name || '?')[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p
            className="truncate"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: V.black,
              lineHeight: '20px',
              margin: 0,
            }}
          >
            {conversation?.name || 'Chat'}
          </p>
          <div className="flex items-center gap-1" style={{ marginTop: 2 }}>
            {statusOnline ? (
              <>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: V.green,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: V.green,
                    fontWeight: 500,
                  }}
                >
                  En línea
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: V.stone }}>
                Hace 5 min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right actions */}
      <button
        className="flex items-center justify-center shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          color: V.stone,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Llamar"
      >
        <Phone size={20} />
      </button>
      <button
        className="flex items-center justify-center shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          color: V.stone,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Más opciones"
      >
        <MoreVertical size={20} />
      </button>
    </header>
  );
}

/* ================================================================
   ContextBanner
   ================================================================ */
function ContextBanner({ orderId, navigate }) {
  if (!orderId) return null;

  return (
    <button
      onClick={() => navigate(`/orders/${orderId}`)}
      className="flex items-center gap-3 w-full"
      style={{
        height: 44,
        padding: '0 16px',
        background: V.surface,
        border: 'none',
        borderBottom: `1px solid ${V.border}`,
        cursor: 'pointer',
        fontFamily: V.fontSans,
      }}
    >
      <Package size={16} style={{ color: V.stone, flexShrink: 0 }} />
      <span
        className="flex-1 text-left truncate"
        style={{ fontSize: 13, fontWeight: 500, color: V.black }}
      >
        Pedido #{String(orderId).slice(-8).toUpperCase()}
      </span>
      <ChevronRight size={16} style={{ color: V.stone, flexShrink: 0 }} />
    </button>
  );
}

/* ================================================================
   DateSeparator
   ================================================================ */
function DateSeparator({ date }) {
  const label = formatDateSeparator(date);
  return (
    <div className="flex items-center gap-3 py-4 px-6">
      <div className="flex-1" style={{ height: 1, background: V.border }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: V.stone,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <div className="flex-1" style={{ height: 1, background: V.border }} />
    </div>
  );
}

/* ================================================================
   MessageBubble
   ================================================================ */
function MessageBubble({ message, isOwn, isConsecutive }) {
  const ts = new Date(message.created_at || message.timestamp);

  /* Product card placeholder */
  if (message.message_type === 'product_card') {
    return (
      <div
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
        style={{ marginTop: isConsecutive ? 4 : 12 }}
      >
        <div
          style={{
            padding: 12,
            background: V.surface,
            borderRadius: V.radiusMd,
            maxWidth: '75%',
          }}
        >
          Producto compartido
        </div>
      </div>
    );
  }

  /* Image message */
  if (message.message_type === 'image') {
    return (
      <div
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
        style={{ marginTop: isConsecutive ? 4 : 12 }}
      >
        <div style={{ maxWidth: 240 }}>
          <div
            className="overflow-hidden"
            style={{ borderRadius: V.radiusXl, background: V.surface }}
          >
            {message.image_url ? (
              <img
                src={message.image_url}
                alt=""
                className="w-full h-auto block"
                loading="lazy"
              />
            ) : (
              <div
                className="flex items-center justify-center"
                style={{
                  width: 240,
                  height: 180,
                  color: V.stone,
                }}
              >
                <Image size={32} />
              </div>
            )}
          </div>
          <div
            className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <span style={{ fontSize: 11, color: V.stone }}>
              {formatTime(ts)}
            </span>
            {isOwn && (
              <CheckCheck
                size={14}
                style={{ color: message.read ? V.green : V.stone }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  /* Default text bubble */
  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      style={{ marginTop: isConsecutive ? 4 : 12 }}
    >
      <div style={{ maxWidth: '75%' }}>
        <div
          style={{
            padding: '10px 14px',
            fontSize: 15,
            lineHeight: '21px',
            fontFamily: V.fontSans,
            background: isOwn ? V.black : V.white,
            color: isOwn ? V.white : V.black,
            border: isOwn ? 'none' : `1px solid ${V.border}`,
            borderRadius: isOwn
              ? '20px 20px 4px 20px'
              : '20px 20px 20px 4px',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        <div
          className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
          <span style={{ fontSize: 11, color: V.stone }}>
            {formatTime(ts)}
          </span>
          {isOwn && (
            <CheckCheck
              size={14}
              style={{ color: message.read ? V.green : V.stone }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TypingIndicator
   ================================================================ */
function TypingIndicator() {
  return (
    <div className="flex justify-start px-4" style={{ marginTop: 12 }}>
      <div
        className="flex items-center gap-1"
        style={{
          padding: '12px 16px',
          background: V.white,
          border: `1px solid ${V.border}`,
          borderRadius: '20px 20px 20px 4px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: V.stone,
              display: 'block',
            }}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   NewMessagesPill
   ================================================================ */
function NewMessagesPill({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onClick={onClick}
      className="absolute left-1/2 z-20"
      style={{
        transform: 'translateX(-50%)',
        bottom: 80,
        height: 32,
        padding: '0 16px',
        borderRadius: 999,
        background: V.black,
        color: V.white,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: V.fontSans,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: 15 }}>↓</span> Nuevos mensajes
    </motion.button>
  );
}

/* ================================================================
   MessageInput
   ================================================================ */
function MessageInput({ onSend, onTyping, onAttach }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);

    // Auto-grow
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }

    // Typing indicator
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
  }, [text, onSend, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const hasText = text.trim().length > 0;

  return (
    <div
      className="flex items-end gap-2 px-3 shrink-0"
      style={{
        background: V.cream,
        borderTop: `1px solid ${V.border}`,
        paddingTop: 8,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        fontFamily: V.fontSans,
      }}
    >
      {/* Attach button */}
      <button
        onClick={onAttach}
        className="flex items-center justify-center shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: V.surface,
          color: V.stone,
          border: 'none',
          cursor: 'pointer',
          marginBottom: 4,
        }}
        aria-label="Adjuntar"
      >
        <Plus size={20} />
      </button>

      {/* Textarea */}
      <div className="flex-1 relative" style={{ minHeight: 44 }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Mensaje..."
          rows={1}
          className="w-full resize-none outline-none"
          style={{
            background: V.surface,
            borderRadius: 24,
            border: 'none',
            padding: '10px 16px',
            fontSize: 15,
            lineHeight: '22px',
            fontFamily: V.fontSans,
            color: V.black,
            minHeight: 44,
            maxHeight: 120,
          }}
        />
      </div>

      {/* Send button */}
      <AnimatePresence>
        {hasText && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleSend}
            className="flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: V.black,
              color: V.white,
              border: 'none',
              cursor: 'pointer',
              marginBottom: 2,
            }}
            aria-label="Enviar"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   ChatPage (main)
   ================================================================ */
export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    messages,
    loadMessages,
    sendMessage,
    sendTyping,
    markAsRead,
    typingUsers,
    conversations,
  } = useChatContext();

  const [localMessages, setLocalMessages] = useState([]);
  const [showNewPill, setShowNewPill] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  /* Current conversation object */
  const conversation = useMemo(
    () => conversations.find((c) => String(c.id) === String(conversationId)),
    [conversations, conversationId],
  );

  /* Typing state for this conversation */
  const isTyping = useMemo(
    () => !!typingUsers[conversationId],
    [typingUsers, conversationId],
  );

  /* Load messages on mount / conversation change */
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);

  /* Sync context messages to local state */
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  /* Auto-scroll to bottom on new messages (or show pill) */
  useEffect(() => {
    if (localMessages.length === 0) return;

    if (localMessages.length > prevMsgCountRef.current) {
      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setShowNewPill(true);
      }
    }
    prevMsgCountRef.current = localMessages.length;
  }, [localMessages]);

  /* Initial scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversationId]);

  /* Scroll listener for "near bottom" detection */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottomRef.current) setShowNewPill(false);
  }, []);

  /* Mark unread messages as read */
  useEffect(() => {
    if (!user || !conversationId) return;
    const unread = localMessages
      .filter(
        (m) =>
          !m.read &&
          String(m.sender_id || m.user_id) !== String(user.id),
      )
      .map((m) => m.message_id || m.id);

    if (unread.length > 0) {
      markAsRead(conversationId, unread);
    }
  }, [localMessages, user, conversationId, markAsRead]);

  /* Send handler (optimistic) */
  const handleSend = useCallback(
    (content) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        message_id: `temp-${Date.now()}`,
        sender_id: user?.id,
        content,
        message_type: 'text',
        created_at: new Date().toISOString(),
        read: false,
      };
      setLocalMessages((prev) => [...prev, optimistic]);
      sendMessage(conversationId, content);

      // Scroll to bottom after sending
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    },
    [conversationId, sendMessage, user],
  );

  /* Typing handler */
  const handleTyping = useCallback(
    (isTyping) => {
      sendTyping(conversationId, isTyping);
    },
    [conversationId, sendTyping],
  );

  /* Scroll-to-bottom from pill */
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewPill(false);
  }, []);

  /* Group messages with date separators & consecutive detection */
  const groupedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSender = null;

    for (let i = 0; i < localMessages.length; i++) {
      const msg = localMessages[i];
      const msgDate = new Date(msg.created_at || msg.timestamp);

      // Date separator
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push({ type: 'date', date: msgDate, key: `date-${i}` });
        lastSender = null;
      }

      const senderId = String(msg.sender_id || msg.user_id || '');
      const isConsecutive = senderId === lastSender;

      result.push({
        type: 'message',
        message: msg,
        isOwn: String(senderId) === String(user?.id),
        isConsecutive,
        key: msg.message_id || msg.id || `msg-${i}`,
      });

      lastDate = msgDate;
      lastSender = senderId;
    }

    return result;
  }, [localMessages, user]);

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        background: V.cream,
        fontFamily: V.fontSans,
        position: 'fixed',
        inset: 0,
        zIndex: 40,
      }}
    >
      {/* Header */}
      <ChatHeader conversation={conversation} navigate={navigate} />

      {/* Context banner */}
      <ContextBanner orderId={conversation?.order_id} navigate={navigate} />

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
        style={{ background: V.cream, WebkitOverflowScrolling: 'touch' }}
      >
        <div className="pb-4 pt-2">
          {groupedMessages.map((item) => {
            if (item.type === 'date') {
              return <DateSeparator key={item.key} date={item.date} />;
            }
            return (
              <MessageBubble
                key={item.key}
                message={item.message}
                isOwn={item.isOwn}
                isConsecutive={item.isConsecutive}
              />
            );
          })}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* New messages pill */}
        <AnimatePresence>
          {showNewPill && <NewMessagesPill onClick={scrollToBottom} />}
        </AnimatePresence>
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onAttach={() => setShowAttachSheet(true)}
      />
    </div>
  );
}
