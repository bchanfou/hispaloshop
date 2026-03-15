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
  Check,
  CheckCheck,
  Image,
  X,
  Copy,
  Reply,
  Trash2,
} from 'lucide-react';
import { useChatContext } from '@/context/chat/ChatProvider';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/services/api/client';
import CollabProposalCard from '@/components/chat/collab/CollabProposalCard';
import AffiliateLinkCard from '@/components/chat/collab/AffiliateLinkCard';
import SampleShipmentCard from '@/components/chat/collab/SampleShipmentCard';

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

/* ────────── Online status helper ────────── */
function formatOnlineStatus(lastSeen) {
  if (!lastSeen) return null;
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 2) return { text: 'En línea', online: true };
  if (diffMin < 60) return { text: `Hace ${diffMin} min`, online: false };

  const isToday = seen.toDateString() === now.toDateString();
  if (isToday)
    return {
      text: `Hoy a las ${seen.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
      online: false,
    };

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (seen.toDateString() === yesterday.toDateString())
    return { text: 'Ayer', online: false };

  return {
    text: seen.toLocaleDateString('es-ES', { weekday: 'short' }),
    online: false,
  };
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
  const status = formatOnlineStatus(conversation?.last_seen);
  const isOnline = conversation?.online || status?.online;

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
            {isOnline ? (
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
                {status?.text || ''}
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
   ReadReceiptTicks
   ================================================================ */
function ReadReceiptTicks({ message }) {
  const status = message.status || (message.read ? 'read' : 'sent');

  if (status === 'read') {
    return (
      <CheckCheck
        size={14}
        style={{ color: V.green, transition: 'color 0.3s ease' }}
      />
    );
  }
  if (status === 'delivered') {
    return (
      <CheckCheck
        size={14}
        style={{ color: V.stone, transition: 'color 0.3s ease' }}
      />
    );
  }
  return (
    <Check
      size={14}
      style={{ color: V.stone, transition: 'color 0.3s ease' }}
    />
  );
}

/* ================================================================
   MessageBubble
   ================================================================ */
function MessageBubble({
  message,
  isOwn,
  isConsecutive,
  isFirstInGroup,
  isLastInGroup,
  isMiddleInGroup,
  onImageTap,
  onContextMenu: onCtxMenu,
}) {
  const ts = new Date(message.created_at || message.timestamp);
  const touchTimerRef = useRef(null);

  const gap = isConsecutive && !isFirstInGroup ? 2 : isConsecutive ? 4 : 12;
  const showTimestamp = !isMiddleInGroup;

  /* Border radius for grouping */
  const sentRadius = isFirstInGroup
    ? '20px 20px 4px 20px'
    : isLastInGroup
      ? '20px 4px 20px 20px'
      : '20px 4px 4px 20px';

  const receivedRadius = isFirstInGroup
    ? '20px 20px 20px 4px'
    : isLastInGroup
      ? '4px 20px 20px 20px'
      : '4px 20px 20px 4px';

  const bubbleRadius = isOwn ? sentRadius : receivedRadius;

  /* Long-press / context menu handlers */
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onCtxMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      onCtxMenu(message, rect.left + rect.width / 2, rect.top);
    }
  };
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    touchTimerRef.current = setTimeout(() => {
      if (onCtxMenu) {
        onCtxMenu(message, startX, startY);
      }
    }, 500);
  };
  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const touchProps = {
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEndOrMove,
    onTouchMove: handleTouchEndOrMove,
  };

  /* System message (B2B events) */
  if (message.message_type === 'system' || message.sender_id === 'system') {
    return (
      <div
        className="flex justify-center px-4"
        style={{ marginTop: gap }}
      >
        <div
          style={{
            background: V.surface,
            border: `1px solid ${V.border}`,
            borderRadius: V.radiusFull,
            padding: '4px 12px',
            fontSize: 11,
            color: V.stone,
            fontFamily: V.fontSans,
            textAlign: 'center',
            maxWidth: '85%',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  /* Product card placeholder */
  if (message.message_type === 'product_card') {
    return (
      <div
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
        style={{ marginTop: gap }}
        {...touchProps}
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
        style={{ marginTop: gap }}
        {...touchProps}
      >
        <div style={{ maxWidth: 240 }}>
          <div
            className="overflow-hidden"
            style={{
              borderRadius: bubbleRadius,
              background: V.surface,
              cursor: message.image_url ? 'pointer' : 'default',
            }}
            onClick={() => message.image_url && onImageTap?.(message.image_url)}
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
          {showTimestamp && (
            <div
              className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <span style={{ fontSize: 11, color: V.stone }}>
                {formatTime(ts)}
              </span>
              {isOwn && <ReadReceiptTicks message={message} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Collab proposal card */
  if (message.message_type === 'collab_proposal' && message.metadata?.collab_id) {
    return (
      <CollabProposalMessage
        message={message}
        isOwn={isOwn}
        gap={gap}
        touchProps={touchProps}
      />
    );
  }

  /* Affiliate link card */
  if (message.message_type === 'collab_affiliate' && message.metadata?.collab_id) {
    return (
      <CollabAffiliateMessage
        message={message}
        isOwn={isOwn}
        gap={gap}
        touchProps={touchProps}
      />
    );
  }

  /* Sample shipment card */
  if (message.message_type === 'collab_sample' && message.metadata?.collab_id) {
    return (
      <CollabSampleMessage
        message={message}
        isOwn={isOwn}
        gap={gap}
        touchProps={touchProps}
      />
    );
  }

  /* Default text bubble */
  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      style={{ marginTop: gap }}
      {...touchProps}
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
            borderRadius: bubbleRadius,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        {showTimestamp && (
          <div
            className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <span style={{ fontSize: 11, color: V.stone }}>
              {formatTime(ts)}
            </span>
            {isOwn && <ReadReceiptTicks message={message} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Collab message wrappers (fetch real API data)
   ================================================================ */
function CollabProposalMessage({ message, isOwn, gap, touchProps }) {
  const { user } = useAuth();
  const [collab, setCollab] = useState(null);
  const [acting, setActing] = useState(false);
  const collabId = message.metadata?.collab_id;

  useEffect(() => {
    if (!collabId) return;
    apiClient.get(`/collaborations/${collabId}`).then(setCollab).catch(() => {});
  }, [collabId]);

  if (!collab) return null;

  const proposal = collab.proposal || {};
  const isReceiver = collab.influencer_id === user?.user_id;
  const status = collab.status === 'proposed' ? 'pending' : collab.status;

  const handleAccept = async () => {
    setActing(true);
    try {
      await apiClient.post(`/collaborations/${collabId}/accept`);
      const updated = await apiClient.get(`/collaborations/${collabId}`);
      setCollab(updated);
    } catch { /* handled by card */ }
    setActing(false);
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      await apiClient.post(`/collaborations/${collabId}/decline`, { reason: '' });
      const updated = await apiClient.get(`/collaborations/${collabId}`);
      setCollab(updated);
    } catch { /* handled by card */ }
    setActing(false);
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      style={{ marginTop: gap, opacity: acting ? 0.6 : 1, pointerEvents: acting ? 'none' : 'auto' }}
      {...touchProps}
    >
      <CollabProposalCard
        proposal={{
          product_name: proposal.product_name,
          product_image: proposal.product_image_url,
          commission_percent: proposal.commission_pct,
          duration_days: proposal.duration_days,
          include_sample: proposal.send_sample,
          status,
        }}
        isReceiver={isReceiver}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}

function CollabAffiliateMessage({ message, isOwn, gap, touchProps }) {
  const [collab, setCollab] = useState(null);
  const [stats, setStats] = useState(null);
  const collabId = message.metadata?.collab_id;

  useEffect(() => {
    if (!collabId) return;
    apiClient.get(`/collaborations/${collabId}`).then(setCollab).catch(() => {});
    apiClient.get(`/collaborations/${collabId}/stats`).then(setStats).catch(() => {});
  }, [collabId]);

  if (!collab?.affiliate_link?.url) return null;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      style={{ marginTop: gap }}
      {...touchProps}
    >
      <AffiliateLinkCard
        link={{ url: collab.affiliate_link.url, code: collab.affiliate_link.code }}
        stats={stats ? { clicks: stats.clicks, sales: stats.sales } : null}
      />
    </div>
  );
}

function CollabSampleMessage({ message, isOwn, gap, touchProps }) {
  const [collab, setCollab] = useState(null);
  const collabId = message.metadata?.collab_id;

  useEffect(() => {
    if (!collabId) return;
    apiClient.get(`/collaborations/${collabId}`).then(setCollab).catch(() => {});
  }, [collabId]);

  if (!collab?.sample_shipment?.tracking_number) return null;

  const shipment = collab.sample_shipment;
  const proposal = collab.proposal || {};
  const statusMap = { in_transit: 'shipped', delivered: 'delivered' };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      style={{ marginTop: gap }}
      {...touchProps}
    >
      <SampleShipmentCard
        shipment={{
          product_name: proposal.product_name,
          product_image: proposal.product_image_url,
          tracking_number: shipment.tracking_number,
          status: statusMap[shipment.status] || 'preparing',
        }}
      />
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
   MessageContextMenu
   ================================================================ */
function MessageContextMenu({ contextMenu, onClose, userId }) {
  if (!contextMenu) return null;

  const { message, x, y } = contextMenu;
  const isOwnMsg = String(message.sender_id || message.user_id) === String(userId);
  const createdAt = new Date(message.created_at || message.timestamp);
  const canDelete = isOwnMsg && (Date.now() - createdAt.getTime()) < 5 * 60 * 1000;

  const options = [
    {
      label: 'Copiar',
      icon: Copy,
      action: () => {
        navigator.clipboard?.writeText(message.content || '');
        onClose();
      },
    },
    {
      label: 'Reaccionar',
      icon: null,
      isReaction: true,
      action: () => {},
    },
    {
      label: 'Responder',
      icon: Reply,
      action: () => {
        onClose();
      },
    },
  ];

  if (canDelete) {
    options.push({
      label: 'Eliminar',
      icon: Trash2,
      danger: true,
      action: () => {
        onClose();
      },
    });
  }

  const reactions = ['\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDC4D', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDE4F'];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: 'rgba(0,0,0,0.2)',
        }}
      />
      {/* Menu */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'fixed',
          zIndex: 61,
          left: Math.min(x - 100, window.innerWidth - 220),
          top: Math.max(y - 200, 20),
          width: 200,
          background: V.white,
          borderRadius: V.radiusXl,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: 8,
          fontFamily: V.fontSans,
        }}
      >
        {options.map((opt) => {
          if (opt.isReaction) {
            return (
              <div
                key="reactions"
                className="flex items-center justify-between"
                style={{ height: 40, padding: '0 8px' }}
              >
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onClose();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer',
                      padding: 2,
                      borderRadius: '50%',
                      lineHeight: 1,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            );
          }

          const Icon = opt.icon;
          return (
            <button
              key={opt.label}
              onClick={opt.action}
              className="flex items-center w-full"
              style={{
                height: 40,
                gap: 10,
                padding: '0 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: opt.danger ? '#dc2626' : V.black,
                fontFamily: V.fontSans,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = V.surface;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              {Icon && <Icon size={16} />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

/* ================================================================
   ImageLightbox
   ================================================================ */
function ImageLightbox({ src, onClose }) {
  if (!src) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Close button */}
      <div className="flex justify-end" style={{ padding: 16 }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: V.white,
            cursor: 'pointer',
          }}
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ padding: 16, overflow: 'hidden' }}
        onClick={onClose}
      >
        <img
          src={src}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Download button */}
      <div className="flex justify-center" style={{ padding: 16 }}>
        <a
          href={src}
          download
          className="flex items-center justify-center"
          style={{
            color: V.white,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: V.fontSans,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
            padding: '8px 20px',
            borderRadius: 999,
          }}
        >
          Descargar
        </a>
      </div>
    </motion.div>
  );
}

/* ================================================================
   EmptyConversation
   ================================================================ */
const SUGGESTION_PILLS = {
  b2c: [
    '\u00BFHac\u00E9is env\u00EDos a...?',
    '\u00BFTen\u00E9is stock de...?',
    '\u00BFCu\u00E1l es el plazo de entrega?',
  ],
  b2b: [
    'Estamos interesados en...',
    '\u00BFTienen precio mayorista para...?',
    '\u00BFPueden enviar muestras?',
  ],
  c2c: [
    '\u00A1Hola!',
    '\u00BFD\u00F3nde compraste...?',
    'Te vi en el feed y...',
  ],
  collab: [
    'Hola, me gustar\u00EDa colaborar...',
    'Vi tu tienda y...',
    '\u00BFEnvi\u00E1is muestras?',
  ],
};

function EmptyConversation({ conversation, onSendSuggestion }) {
  const type = conversation?.type || 'c2c';
  const suggestions = SUGGESTION_PILLS[type] || SUGGESTION_PILLS.c2c;
  const name = conversation?.name || 'Chat';
  const initial = (name[0] || '?').toUpperCase();

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: '48px 24px', fontFamily: V.fontSans }}
    >
      {/* Avatar */}
      <div
        className="overflow-hidden flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: V.surface,
          marginBottom: 12,
        }}
      >
        {conversation?.avatar_url ? (
          <img
            src={conversation.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: V.stone,
            }}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Name + badge */}
      <p
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: V.black,
          margin: 0,
          marginBottom: 4,
        }}
      >
        {name}
      </p>
      {conversation?.role && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: V.stone,
            background: V.surface,
            padding: '2px 10px',
            borderRadius: 999,
            marginBottom: 8,
          }}
        >
          {conversation.role}
        </span>
      )}

      <p style={{ fontSize: 13, color: V.stone, margin: '8px 0 20px' }}>
        Inicia la conversaci&oacute;n
      </p>

      {/* Suggestion pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onSendSuggestion(text)}
            style={{
              background: V.surface,
              borderRadius: 999,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: V.black,
              border: 'none',
              cursor: 'pointer',
              fontFamily: V.fontSans,
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

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

  /* Virtual keyboard height tracking */
  useEffect(() => {
    if (!window.visualViewport) return;
    const handler = () => {
      const kh = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(Math.max(0, kh));
    };
    window.visualViewport.addEventListener('resize', handler);
    return () => window.visualViewport?.removeEventListener('resize', handler);
  }, []);

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

  /* Context menu handler */
  const handleContextMenu = useCallback((message, x, y) => {
    setContextMenu({ message, x, y });
  }, []);

  /* Group messages with date separators, consecutive & timing-based grouping */
  const groupedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSender = null;
    let lastTime = null;

    for (let i = 0; i < localMessages.length; i++) {
      const msg = localMessages[i];
      const msgDate = new Date(msg.created_at || msg.timestamp);

      // Date separator
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push({ type: 'date', date: msgDate, key: `date-${i}` });
        lastSender = null;
        lastTime = null;
      }

      const senderId = String(msg.sender_id || msg.user_id || '');
      const withinGroup =
        senderId === lastSender &&
        lastTime &&
        msgDate.getTime() - lastTime.getTime() < 60000;
      const isConsecutive = senderId === lastSender;

      // Look ahead for next message grouping
      const nextMsg = localMessages[i + 1];
      const nextSenderId = nextMsg
        ? String(nextMsg.sender_id || nextMsg.user_id || '')
        : null;
      const nextDate = nextMsg
        ? new Date(nextMsg.created_at || nextMsg.timestamp)
        : null;
      const nextWithinGroup =
        nextSenderId === senderId &&
        nextDate &&
        nextDate.getTime() - msgDate.getTime() < 60000 &&
        (!lastDate || isSameDay(msgDate, nextDate));

      const isFirstInGroup = !withinGroup;
      const isLastInGroup = !nextWithinGroup;
      const isMiddleInGroup = !isFirstInGroup && !isLastInGroup;

      result.push({
        type: 'message',
        message: msg,
        isOwn: String(senderId) === String(user?.id),
        isConsecutive,
        isFirstInGroup,
        isLastInGroup,
        isMiddleInGroup,
        key: msg.message_id || msg.id || `msg-${i}`,
      });

      lastDate = msgDate;
      lastSender = senderId;
      lastTime = msgDate;
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
        paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined,
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
          {/* Empty state */}
          {localMessages.length === 0 && (
            <EmptyConversation
              conversation={conversation}
              onSendSuggestion={handleSend}
            />
          )}

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
                isFirstInGroup={item.isFirstInGroup}
                isLastInGroup={item.isLastInGroup}
                isMiddleInGroup={item.isMiddleInGroup}
                onImageTap={setLightboxImage}
                onContextMenu={handleContextMenu}
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

      {/* Context menu overlay */}
      <AnimatePresence>
        {contextMenu && (
          <MessageContextMenu
            contextMenu={contextMenu}
            onClose={() => setContextMenu(null)}
            userId={user?.id}
          />
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
