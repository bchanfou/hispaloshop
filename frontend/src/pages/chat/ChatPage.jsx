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

/* ────────── Date helpers ────────── */
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateSeparator(date) {
  const now = new Date();
  if (isSameDay(date, now)) return 'Hoy';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatOnlineStatus(lastSeen) {
  if (!lastSeen) return null;
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMin = Math.floor((now - seen) / 60000);
  if (diffMin < 2) return { text: 'En línea', online: true };
  if (diffMin < 60) return { text: `Hace ${diffMin} min`, online: false };
  if (seen.toDateString() === now.toDateString())
    return { text: `Hoy a las ${seen.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, online: false };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (seen.toDateString() === yesterday.toDateString()) return { text: 'Ayer', online: false };
  return { text: seen.toLocaleDateString('es-ES', { weekday: 'short' }), online: false };
}

/* ================================================================
   ChatHeader
   ================================================================ */
function ChatHeader({ conversation, navigate }) {
  const status = formatOnlineStatus(conversation?.last_seen);
  const isOnline = conversation?.online || status?.online;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-stone-50/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] font-apple backdrop-blur-xl">
      <button
        onClick={() => navigate(-1)}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-transparent text-stone-950 active:bg-stone-100"
        aria-label="Volver"
      >
        <ArrowLeft size={22} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {conversation?.avatar_url ? (
            <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-stone-500">
              {(conversation?.name || '?')[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-5 text-stone-950">
            {conversation?.name || 'Chat'}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            {isOnline ? (
              <>
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-stone-950" />
                <span className="text-xs font-medium text-stone-950">En línea</span>
              </>
            ) : (
              <span className="text-xs text-stone-500">{status?.text || ''}</span>
            )}
          </div>
        </div>
      </div>

      <button
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-500 active:bg-stone-100"
        aria-label="Llamar"
      >
        <Phone size={20} />
      </button>
      <button
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-500 active:bg-stone-100"
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
      className="flex h-11 w-full items-center gap-3 border-b border-stone-200 bg-stone-100 px-4 font-apple"
    >
      <Package size={16} className="shrink-0 text-stone-500" />
      <span className="flex-1 truncate text-left text-[13px] font-medium text-stone-950">
        Pedido #{String(orderId).slice(-8).toUpperCase()}
      </span>
      <ChevronRight size={16} className="shrink-0 text-stone-500" />
    </button>
  );
}

/* ================================================================
   DateSeparator
   ================================================================ */
function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="h-px flex-1 bg-stone-200" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {formatDateSeparator(date)}
      </span>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

/* ================================================================
   ReadReceiptTicks
   ================================================================ */
function ReadReceiptTicks({ message }) {
  const status = message.status || (message.read ? 'read' : 'sent');
  if (status === 'read') return <CheckCheck size={14} className="text-stone-950 transition-colors duration-300" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-stone-500 transition-colors duration-300" />;
  return <Check size={14} className="text-stone-500 transition-colors duration-300" />;
}

/* ================================================================
   MessageBubble
   ================================================================ */
function MessageBubble({ message, isOwn, isConsecutive, isFirstInGroup, isLastInGroup, isMiddleInGroup, onImageTap, onContextMenu: onCtxMenu }) {
  const ts = new Date(message.created_at || message.timestamp);
  const touchTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(touchTimerRef.current), []);

  const gap = isConsecutive && !isFirstInGroup ? 2 : isConsecutive ? 4 : 12;
  const showTimestamp = !isMiddleInGroup;

  const sentRadius = isFirstInGroup ? '20px 20px 4px 20px' : isLastInGroup ? '20px 4px 20px 20px' : '20px 4px 4px 20px';
  const receivedRadius = isFirstInGroup ? '20px 20px 20px 4px' : isLastInGroup ? '4px 20px 20px 20px' : '4px 20px 20px 4px';
  const bubbleRadius = isOwn ? sentRadius : receivedRadius;

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onCtxMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      onCtxMenu(message, rect.left + rect.width / 2, rect.top);
    }
  };
  const handleTouchStart = (e) => {
    const { clientX, clientY } = e.touches[0];
    touchTimerRef.current = setTimeout(() => onCtxMenu?.(message, clientX, clientY), 500);
  };
  const handleTouchEndOrMove = () => clearTimeout(touchTimerRef.current);

  const touchProps = {
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEndOrMove,
    onTouchMove: handleTouchEndOrMove,
  };

  /* System message */
  if (message.message_type === 'system' || message.sender_id === 'system') {
    return (
      <div className="flex justify-center px-4" style={{ marginTop: gap }}>
        <div className="max-w-[85%] rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-center text-[11px] text-stone-500">
          {message.content}
        </div>
      </div>
    );
  }

  /* Product card placeholder */
  if (message.message_type === 'product_card') {
    return (
      <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
        <div className="max-w-[75%] rounded-xl bg-stone-100 p-3">Producto compartido</div>
      </div>
    );
  }

  /* Image message */
  if (message.message_type === 'image') {
    return (
      <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
        <div className="max-w-[240px]">
          <div
            className="overflow-hidden bg-stone-100"
            style={{ borderRadius: bubbleRadius, cursor: message.image_url ? 'pointer' : 'default' }}
            onClick={() => message.image_url && onImageTap?.(message.image_url)}
          >
            {message.image_url ? (
              <img src={message.image_url} alt="" className="block h-auto w-full" loading="lazy" />
            ) : (
              <div className="flex h-[180px] w-[240px] items-center justify-center text-stone-500">
                <Image size={32} />
              </div>
            )}
          </div>
          {showTimestamp && (
            <div className={`mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[11px] text-stone-500">{formatTime(ts)}</span>
              {isOwn && <ReadReceiptTicks message={message} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Collab cards */
  if (message.message_type === 'collab_proposal' && message.metadata?.collab_id)
    return <CollabProposalMessage message={message} isOwn={isOwn} gap={gap} touchProps={touchProps} />;
  if (message.message_type === 'collab_affiliate' && message.metadata?.collab_id)
    return <CollabAffiliateMessage message={message} isOwn={isOwn} gap={gap} touchProps={touchProps} />;
  if (message.message_type === 'collab_sample' && message.metadata?.collab_id)
    return <CollabSampleMessage message={message} isOwn={isOwn} gap={gap} touchProps={touchProps} />;

  /* Default text bubble */
  return (
    <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
      <div className="max-w-[75%]">
        <div
          className={`break-words px-3.5 py-2.5 text-[15px] leading-[21px] font-apple ${
            isOwn ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-950'
          }`}
          style={{ borderRadius: bubbleRadius }}
        >
          {message.content}
        </div>
        {showTimestamp && (
          <div className={`mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[11px] text-stone-500">{formatTime(ts)}</span>
            {isOwn && <ReadReceiptTicks message={message} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Collab message wrappers
   ================================================================ */
function CollabProposalMessage({ message, isOwn, gap, touchProps }) {
  const { user } = useAuth();
  const [collab, setCollab] = useState(null);
  const [acting, setActing] = useState(false);
  const collabId = message.metadata?.collab_id;

  useEffect(() => {
    if (!collabId) return;
    let active = true;
    apiClient.get(`/collaborations/${collabId}`).then(d => { if (active) setCollab(d); }).catch(() => {});
    return () => { active = false; };
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
      className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'} ${acting ? 'pointer-events-none opacity-60' : ''}`}
      style={{ marginTop: gap }}
      {...touchProps}
    >
      <CollabProposalCard
        proposal={{ product_name: proposal.product_name, product_image: proposal.product_image_url, commission_percent: proposal.commission_pct, duration_days: proposal.duration_days, include_sample: proposal.send_sample, status }}
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
    let active = true;
    apiClient.get(`/collaborations/${collabId}`).then(d => { if (active) setCollab(d); }).catch(() => {});
    apiClient.get(`/collaborations/${collabId}/stats`).then(d => { if (active) setStats(d); }).catch(() => {});
    return () => { active = false; };
  }, [collabId]);

  if (!collab?.affiliate_link?.url) return null;

  return (
    <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
      <AffiliateLinkCard link={{ url: collab.affiliate_link.url, code: collab.affiliate_link.code }} stats={stats ? { clicks: stats.clicks, sales: stats.sales } : null} />
    </div>
  );
}

function CollabSampleMessage({ message, isOwn, gap, touchProps }) {
  const [collab, setCollab] = useState(null);
  const collabId = message.metadata?.collab_id;

  useEffect(() => {
    if (!collabId) return;
    let active = true;
    apiClient.get(`/collaborations/${collabId}`).then(d => { if (active) setCollab(d); }).catch(() => {});
    return () => { active = false; };
  }, [collabId]);

  if (!collab?.sample_shipment?.tracking_number) return null;

  const shipment = collab.sample_shipment;
  const proposal = collab.proposal || {};
  const statusMap = { in_transit: 'shipped', delivered: 'delivered' };

  return (
    <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
      <SampleShipmentCard shipment={{ product_name: proposal.product_name, product_image: proposal.product_image_url, tracking_number: shipment.tracking_number, status: statusMap[shipment.status] || 'preparing' }} />
    </div>
  );
}

/* ================================================================
   TypingIndicator
   ================================================================ */
function TypingIndicator() {
  return (
    <div className="mt-3 flex justify-start px-4">
      <div className="flex items-center gap-1 rounded-[20px] rounded-bl-[4px] border border-stone-200 bg-white px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-[7px] w-[7px] rounded-full bg-stone-500"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
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
      className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-stone-950 px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
    >
      <span className="text-[15px]">↓</span> Nuevos mensajes
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
    { label: 'Copiar', icon: Copy, action: () => { navigator.clipboard?.writeText(message.content || ''); onClose(); } },
    { label: 'Reaccionar', icon: null, isReaction: true, action: () => {} },
    { label: 'Responder', icon: Reply, action: () => onClose() },
  ];
  if (canDelete) options.push({ label: 'Eliminar', icon: Trash2, danger: true, action: () => onClose() });

  const reactions = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-black/20" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="fixed z-[61] w-[200px] rounded-[20px] bg-white p-2 shadow-[0_8px_32px_rgba(0,0,0,0.15)] font-apple"
        style={{ left: Math.min(x - 100, window.innerWidth - 220), top: Math.max(y - 200, 20) }}
      >
        {options.map((opt) => {
          if (opt.isReaction) {
            return (
              <div key="reactions" className="flex h-10 items-center justify-between px-2">
                {reactions.map((emoji) => (
                  <button key={emoji} onClick={onClose} className="rounded-full bg-transparent p-0.5 text-xl leading-none hover:bg-stone-100">
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
              className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium transition-colors hover:bg-stone-50 ${
                opt.danger ? 'text-red-600' : 'text-stone-950'
              }`}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex justify-end p-4">
        <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white" aria-label="Cerrar">
          <X size={24} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4" onClick={onClose}>
        <img src={src} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
      <div className="flex justify-center p-4">
        <a href={src} download className="rounded-full px-5 py-2 text-sm font-medium text-white">
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
  b2c: ['¿Hacéis envíos a...?', '¿Tenéis stock de...?', '¿Cuál es el plazo de entrega?'],
  b2b: ['Estamos interesados en...', '¿Tienen precio mayorista para...?', '¿Pueden enviar muestras?'],
  c2c: ['¡Hola!', '¿Dónde compraste...?', 'Te vi en el feed y...'],
  collab: ['Hola, me gustaría colaborar...', 'Vi tu tienda y...', '¿Enviáis muestras?'],
};

function EmptyConversation({ conversation, onSendSuggestion }) {
  const type = conversation?.type || 'c2c';
  const suggestions = SUGGESTION_PILLS[type] || SUGGESTION_PILLS.c2c;
  const name = conversation?.name || 'Chat';

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 font-apple">
      <div className="mb-3 h-16 w-16 overflow-hidden rounded-full bg-stone-100">
        {conversation?.avatar_url ? (
          <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-stone-500">
            {(name[0] || '?').toUpperCase()}
          </div>
        )}
      </div>

      <p className="text-lg font-semibold text-stone-950">{name}</p>
      {conversation?.role && (
        <span className="mb-2 mt-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
          {conversation.role}
        </span>
      )}
      <p className="mt-2 text-[13px] text-stone-500">Inicia la conversación</p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onSendSuggestion(text)}
            className="rounded-full bg-stone-100 px-4 py-2 text-[13px] font-medium text-stone-950 active:bg-stone-200"
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

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  const handleChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
  }, [text, onSend, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      className="flex shrink-0 items-end gap-2 border-t border-stone-200 bg-stone-50 px-3 pt-2 font-apple"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={onAttach}
        className="mb-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200"
        aria-label="Adjuntar"
      >
        <Plus size={20} />
      </button>

      <div className="min-h-[44px] flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Mensaje..."
          rows={1}
          className="w-full min-h-[44px] max-h-[120px] resize-none rounded-3xl bg-stone-100 px-4 py-2.5 text-[15px] leading-[22px] text-stone-950 outline-none placeholder:text-stone-400"
        />
      </div>

      <AnimatePresence>
        {hasText && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleSend}
            className="mb-0.5 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-950 text-white active:opacity-75"
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
  const { messages, loadMessages, sendMessage, sendTyping, markAsRead, typingUsers, conversations } = useChatContext();

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

  const conversation = useMemo(
    () => conversations.find((c) => String(c.id) === String(conversationId)),
    [conversations, conversationId],
  );

  const isTyping = useMemo(() => !!typingUsers[conversationId], [typingUsers, conversationId]);

  useEffect(() => { if (conversationId) loadMessages(conversationId); }, [conversationId, loadMessages]);
  useEffect(() => { setLocalMessages(messages); }, [messages]);

  useEffect(() => {
    if (localMessages.length === 0) return;
    if (localMessages.length > prevMsgCountRef.current) {
      if (isNearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      else setShowNewPill(true);
    }
    prevMsgCountRef.current = localMessages.length;
  }, [localMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'auto' }); }, [conversationId]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handler = () => setKeyboardHeight(Math.max(0, window.innerHeight - window.visualViewport.height));
    window.visualViewport.addEventListener('resize', handler);
    return () => window.visualViewport?.removeEventListener('resize', handler);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottomRef.current) setShowNewPill(false);
  }, []);

  useEffect(() => {
    if (!user || !conversationId) return;
    const unread = localMessages
      .filter((m) => !m.read && String(m.sender_id || m.user_id) !== String(user.id))
      .map((m) => m.message_id || m.id);
    if (unread.length > 0) markAsRead(conversationId, unread);
  }, [localMessages, user, conversationId, markAsRead]);

  const handleSend = useCallback((content) => {
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
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, [conversationId, sendMessage, user]);

  const handleTyping = useCallback((typing) => sendTyping(conversationId, typing), [conversationId, sendTyping]);
  const scrollToBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowNewPill(false); }, []);
  const handleContextMenu = useCallback((message, x, y) => setContextMenu({ message, x, y }), []);

  const groupedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSender = null;
    let lastTime = null;

    for (let i = 0; i < localMessages.length; i++) {
      const msg = localMessages[i];
      const msgDate = new Date(msg.created_at || msg.timestamp);

      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push({ type: 'date', date: msgDate, key: `date-${i}` });
        lastSender = null;
        lastTime = null;
      }

      const senderId = String(msg.sender_id || msg.user_id || '');
      const withinGroup = senderId === lastSender && lastTime && msgDate.getTime() - lastTime.getTime() < 60000;

      const nextMsg = localMessages[i + 1];
      const nextSenderId = nextMsg ? String(nextMsg.sender_id || nextMsg.user_id || '') : null;
      const nextDate = nextMsg ? new Date(nextMsg.created_at || nextMsg.timestamp) : null;
      const nextWithinGroup = nextSenderId === senderId && nextDate && nextDate.getTime() - msgDate.getTime() < 60000 && (!lastDate || isSameDay(msgDate, nextDate));

      result.push({
        type: 'message',
        message: msg,
        isOwn: senderId === String(user?.id),
        isConsecutive: senderId === lastSender,
        isFirstInGroup: !withinGroup,
        isLastInGroup: !nextWithinGroup,
        isMiddleInGroup: withinGroup && nextWithinGroup,
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
      className="fixed inset-0 z-40 flex flex-col bg-stone-50 font-apple"
      style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined }}
    >
      <ChatHeader conversation={conversation} navigate={navigate} />
      <ContextBanner orderId={conversation?.order_id} navigate={navigate} />

      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto overscroll-none bg-stone-50">
        <div className="pb-4 pt-2">
          {localMessages.length === 0 && (
            <EmptyConversation conversation={conversation} onSendSuggestion={handleSend} />
          )}

          {groupedMessages.map((item) =>
            item.type === 'date'
              ? <DateSeparator key={item.key} date={item.date} />
              : <MessageBubble key={item.key} message={item.message} isOwn={item.isOwn} isConsecutive={item.isConsecutive} isFirstInGroup={item.isFirstInGroup} isLastInGroup={item.isLastInGroup} isMiddleInGroup={item.isMiddleInGroup} onImageTap={setLightboxImage} onContextMenu={handleContextMenu} />
          )}

          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showNewPill && <NewMessagesPill onClick={scrollToBottom} />}
        </AnimatePresence>
      </div>

      <MessageInput onSend={handleSend} onTyping={handleTyping} onAttach={() => setShowAttachSheet(true)} />

      <AnimatePresence>
        {contextMenu && <MessageContextMenu contextMenu={contextMenu} onClose={() => setContextMenu(null)} userId={user?.id} />}
      </AnimatePresence>
      <AnimatePresence>
        {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </AnimatePresence>
    </div>
  );
}
