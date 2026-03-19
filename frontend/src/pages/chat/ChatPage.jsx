import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  ChevronRight,
  ArrowUp,
  Check,
  CheckCheck,
  Image,
  X,
  Copy,
  Reply,
  Trash2,
  Search,
  Mic,
  Clock,
  Pause,
  Play,
  Download,
  MoreVertical,
} from 'lucide-react';
import { useChatContext } from '@/context/chat/ChatProvider';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/services/api/client';
import CollabProposalCard from '@/components/chat/collab/CollabProposalCard';
import AffiliateLinkCard from '@/components/chat/collab/AffiliateLinkCard';
import ProductCardMessage from '@/components/chat/ProductCardMessage';
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
  if (!date || Number.isNaN(date.getTime())) return '';
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
function ChatHeader({ conversation, navigate, showSearch, onToggleSearch, searchQuery, onSearchChange, onDeleteConversation }) {
  const status = formatOnlineStatus(conversation?.last_seen);
  const isOnline = conversation?.online || status?.online;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-100 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] font-apple backdrop-blur-md">
      <div className="flex items-center gap-2">
        {/* Left: back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-transparent text-stone-950 active:bg-stone-100"
          aria-label="Volver"
        >
          <ArrowLeft size={22} />
        </button>

        {/* Center: avatar + name */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            {conversation?.avatar_url ? (
              <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-stone-500">
                {(conversation?.name || '?')[0]?.toUpperCase()}
              </div>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-2 border-white bg-[#2E7D52]" />
            )}
          </div>

          <div className="min-w-0" onClick={() => { const uid = conversation?.other_user_id || conversation?.user2_id; if (uid) navigate(`/${uid}`); }} role="button" tabIndex={0}>
            <p className="truncate text-base font-semibold leading-5 text-stone-950">
              {conversation?.name || 'Chat'}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              {isOnline ? (
                <span className="text-xs font-medium text-[#2E7D52]">En línea</span>
              ) : (
                <span className="text-xs text-stone-500">{status?.text || ''}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: search + more */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onToggleSearch}
            className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full active:bg-stone-100 ${showSearch ? 'text-stone-950' : 'text-stone-500'}`}
            aria-label="Buscar"
          >
            <Search size={20} />
          </button>

          <button
            onClick={() => setShowMenu((s) => !s)}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-950 active:bg-stone-100"
            aria-label="Más opciones"
          >
            <MoreVertical size={20} />
          </button>
        </div>

        {/* More options dropdown */}
        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMenu(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-4 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] font-apple"
              >
                <button
                  onClick={() => { setShowMenu(false); onDeleteConversation?.(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-stone-500 active:bg-stone-50"
                >
                  <Trash2 size={16} />
                  Eliminar conversación
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-stone-100 px-3 py-2">
              <Search size={16} className="shrink-0 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar en la conversación..."
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="text-stone-500">
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-stone-100/80 px-3 py-1 text-[12px] font-medium text-stone-500">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}

/* ================================================================
   ReadReceiptTicks
   ================================================================ */
function ReadReceiptTicks({ message }) {
  const status = message.status || (message.read ? 'read' : 'sent');
  if (status === 'sending') return <Clock size={14} className="text-stone-400 transition-colors duration-300" />;
  if (status === 'read') return <CheckCheck size={14} className="text-stone-950 transition-colors duration-300" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-stone-500 transition-colors duration-300" />;
  return <Check size={14} className="text-stone-500 transition-colors duration-300" />;
}

/* ================================================================
   MessageBubble
   ================================================================ */
/* ================================================================
   ReactionBar — renders compact emoji chips below a bubble
   ================================================================ */
function ReactionBar({ reactions }) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = {};
  for (const r of reactions) {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  }
  return (
    <div className="mt-0.5 flex gap-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <span key={emoji} className="flex items-center gap-0.5 rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] shadow-sm">
          {emoji}{count > 1 && <span className="text-stone-500">{count}</span>}
        </span>
      ))}
    </div>
  );
}

/* ================================================================
   AudioPlayer — mini player for voice messages
   ================================================================ */
const SPEED_OPTIONS = [1, 1.5, 2];

const AudioPlayer = React.memo(function AudioPlayer({ url, duration, isOwn }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => { setPlaying(false); setProgress(0); };
    const onTime = () => { if (a.duration) setProgress(a.currentTime / a.duration); };
    a.addEventListener('ended', onEnd);
    a.addEventListener('timeupdate', onTime);
    return () => { a.removeEventListener('ended', onEnd); a.removeEventListener('timeupdate', onTime); };
  }, []);

  const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOwn ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full ${isOwn ? 'bg-white/30' : 'bg-stone-200'}`}>
          <div className={`h-1 rounded-full transition-[width] ${isOwn ? 'bg-white' : 'bg-stone-950'}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className={`text-[11px] ${isOwn ? 'text-white/70' : 'text-stone-500'}`}>{fmt(duration || 0)}</span>
      {playing && (
        <button onClick={cycleSpeed} className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isOwn ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
          {speed}x
        </button>
      )}
    </div>
  );
});

/* ================================================================
   MessageBubble — with reactions, reply preview, swipe-to-reply,
   audio messages, and sending state
   ================================================================ */
const MessageBubble = React.memo(function MessageBubble({ message, isOwn, isConsecutive, isFirstInGroup, isLastInGroup, isMiddleInGroup, onImageTap, onContextMenu: onCtxMenu, onReply, onReact, searchHighlight }) {
  const rawTs = message?.created_at || message?.timestamp;
  const ts = rawTs ? new Date(rawTs) : new Date();
  const touchTimerRef = useRef(null);
  const lastTapRef = useRef(0);
  const dragX = useMotionValue(0);
  const replyIconOpacity = useTransform(dragX, [0, 60], [0, 1]);

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

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onReact?.(message, '❤️');
    }
    lastTapRef.current = now;
  };

  const touchProps = {
    onClick: handleDoubleTap,
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEndOrMove,
    onTouchMove: handleTouchEndOrMove,
  };

  // Highlight search text
  const highlightText = (text) => {
    if (!searchHighlight || !text) return text;
    const idx = text.toLowerCase().indexOf(searchHighlight.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-stone-200 px-0.5">{text.slice(idx, idx + searchHighlight.length)}</mark>
        {text.slice(idx + searchHighlight.length)}
      </>
    );
  };

  // Reply preview snippet
  const replyPreview = message.reply_to_preview;

  /* System message */
  if (message.message_type === 'system' || message.sender_id === 'system') {
    return (
      <div className="flex justify-center px-4" style={{ marginTop: gap }}>
        <div className="max-w-[85%] rounded-full bg-stone-100 px-3 py-1 text-center text-[11px] text-stone-500">
          {message.content}
        </div>
      </div>
    );
  }

  /* Product card */
  if (message.message_type === 'product_card') {
    return (
      <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
        <div className="max-w-[75%]">
          <ProductCardMessage product={message.metadata?.product || message.product || { name: message.content || 'Producto compartido' }} />
          <ReactionBar reactions={message.reactions} />
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
              <img src={message.image_url} alt="Imagen en chat" className="block h-auto w-full" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="flex h-[180px] w-[240px] items-center justify-center text-stone-500">
                <Image size={32} />
              </div>
            )}
          </div>
          <ReactionBar reactions={message.reactions} />
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

  /* Audio/voice message */
  if (message.message_type === 'audio' && message.audio_url) {
    return (
      <div className={`flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }} {...touchProps}>
        <div className="max-w-[75%]">
          <div
            className={`min-w-[200px] px-3.5 py-2.5 font-apple ${
              isOwn ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-950'
            }`}
            style={{ borderRadius: bubbleRadius }}
          >
            <AudioPlayer url={message.audio_url} duration={message.audio_duration || 0} isOwn={isOwn} />
          </div>
          <ReactionBar reactions={message.reactions} />
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

  /* Default text bubble — with swipe-to-reply */
  const bubbleContent = (
    <div className="max-w-[75%]">
      <div
        className={`break-words px-3.5 py-2.5 text-[15px] leading-[21px] font-apple ${
          isOwn ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-950'
        }`}
        style={{ borderRadius: bubbleRadius }}
      >
        {/* Reply reference */}
        {replyPreview && (
          <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-[12px] leading-[16px] ${
          isOwn ? 'bg-white/15 text-white/80' : 'bg-stone-200/60 text-stone-600'
          }`}>
            <span className="block truncate font-semibold text-[11px]">{replyPreview.sender_name || ''}</span>
            <span className="block truncate">{replyPreview.content || ''}</span>
          </div>
        )}
        {highlightText(message.content || '')}
      </div>
      <ReactionBar reactions={message.reactions} />
      {showTimestamp && (
        <div className={`mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] text-stone-500">{formatTime(ts)}</span>
          {isOwn && <ReadReceiptTicks message={message} />}
        </div>
      )}
    </div>
  );

  return (
    <div className={`relative flex px-4 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: gap }}>
      {/* Reply hint icon appears behind during swipe */}
      <motion.div
        className="absolute left-2 top-1/2 -translate-y-1/2"
        style={{ opacity: replyIconOpacity }}
      >
        <Reply size={18} className="text-stone-400" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        dragSnapToOrigin
        style={{ x: dragX }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 25 && onReply) onReply(message);
        }}
        {...touchProps}
      >
        {bubbleContent}
      </motion.div>
    </div>
  );
}, (prev, next) => {
  return prev.message === next.message
    && prev.isOwn === next.isOwn
    && prev.isConsecutive === next.isConsecutive
    && prev.isFirstInGroup === next.isFirstInGroup
    && prev.isLastInGroup === next.isLastInGroup
    && prev.isMiddleInGroup === next.isMiddleInGroup
    && prev.searchHighlight === next.searchHighlight;
});

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
    <div className="mt-3 flex justify-start px-4" aria-live="polite" aria-label="Escribiendo">
      <div className="flex items-center gap-1 rounded-[20px] rounded-bl-[4px] border border-stone-100 bg-stone-50 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-[7px] w-[7px] rounded-full bg-stone-400"
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
      className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-stone-950 px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(12,10,9,0.25)]"
    >
      <span className="text-[15px]">↓</span> Nuevos mensajes
    </motion.button>
  );
}

/* ================================================================
   MessageContextMenu
   ================================================================ */
function MessageContextMenu({ contextMenu, onClose, userId, onReact, onReply, onDelete }) {
  if (!contextMenu) return null;
  const { message, x, y } = contextMenu;
  const isOwnMsg = String(message.sender_id || message.user_id) === String(userId);
  const createdAt = new Date(message.created_at || message.timestamp);
  const canDelete = isOwnMsg && (Date.now() - createdAt.getTime()) < 5 * 60 * 1000;

  const options = [
    { label: 'Copiar', icon: Copy, action: () => { navigator.clipboard?.writeText(message.content || ''); onClose(); } },
    { label: 'Reaccionar', icon: null, isReaction: true, action: () => {} },
    { label: 'Responder', icon: Reply, action: () => { onReply?.(message); onClose(); } },
  ];
  if (canDelete) options.push({ label: 'Eliminar', icon: Trash2, danger: true, action: () => { onDelete?.(message); onClose(); } });

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
                  <button key={emoji} onClick={() => { onReact?.(message, emoji); onClose(); }} className="rounded-full bg-transparent p-0.5 text-xl leading-none hover:bg-stone-100">
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
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-[13px] font-medium transition-colors hover:bg-stone-50 ${
                opt.danger ? 'text-stone-500' : 'text-stone-950'
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
      <div className="mb-3 h-16 w-16 overflow-hidden rounded-full bg-stone-200">
        {conversation?.avatar_url ? (
          <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-stone-600">
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
   MessageInput — with reply preview bar, voice recording, image pick
   ================================================================ */
function MessageInput({ onSend, onTyping, onAttachImage, replyTo, onCancelReply, onVoiceSend }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingSecsRef = useRef(0);

  // Auto-focus the input when the component mounts
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => () => { clearTimeout(typingTimeoutRef.current); clearInterval(timerRef.current); }, []);

  const handleChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; }
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

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setRecordingSecs(0);
      recordingSecsRef.current = 0;
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) onVoiceSend?.(blob, recordingSecsRef.current);
        setIsRecording(false);
        setRecordingSecs(0);
        recordingSecsRef.current = 0;
        clearInterval(timerRef.current);
      };
      mr.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        recordingSecsRef.current += 1;
        setRecordingSecs(recordingSecsRef.current);
      }, 1000);
    } catch {
      // Mic not available
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSecs(0);
    clearInterval(timerRef.current);
  };

  const handleImagePick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onAttachImage?.(file);
    e.target.value = '';
  };

  const hasText = text.trim().length > 0;
  const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="sticky bottom-0 shrink-0 border-t border-stone-100 bg-white font-apple" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {/* Reply preview bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-stone-100 bg-stone-50"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <Reply size={14} className="shrink-0 text-stone-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-stone-700">{replyTo.sender_name || ''}</p>
                <p className="truncate text-[12px] text-stone-500">{replyTo.content || ''}</p>
              </div>
              <button onClick={onCancelReply} className="shrink-0 text-stone-400"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {isRecording ? (
        <div className="flex items-center gap-3 px-3 pt-2">
          <button onClick={cancelRecording} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-500 active:bg-stone-50" aria-label="Cancelar">
            <X size={20} />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <motion.span animate={{ opacity: [1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }} className="h-2.5 w-2.5 rounded-full bg-stone-950" />
            <span className="text-sm font-medium text-stone-950">{fmtSecs(recordingSecs)}</span>
          </div>
          <button onClick={stopRecording} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-stone-950 text-white active:opacity-75" aria-label="Enviar nota de voz">
            <ArrowUp size={20} />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 px-3 pt-2">
          {/* Camera/Attach — Instagram style */}
          <button onClick={handleImagePick} className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white active:opacity-75" aria-label="Adjuntar imagen">
            <Image size={20} />
          </button>

          {/* Input container — rounded pill with embedded mic/gallery */}
          <div className="flex min-h-[44px] flex-1 items-end rounded-full border border-stone-200 bg-white">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Mensaje..."
              rows={1}
              className="min-h-[44px] max-h-[120px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-stone-950 outline-none placeholder:text-stone-400"
            />
            {!hasText && (
              <button
                onClick={startRecording}
                className="mb-1 mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 active:bg-stone-50"
                aria-label="Nota de voz"
              >
                <Mic size={18} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {hasText ? (
              <motion.button
                key="send"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={handleSend}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white active:opacity-75"
                aria-label="Enviar"
              >
                <ArrowUp size={20} />
              </motion.button>
            ) : (
              <motion.button
                key="heart"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => onSend('❤️')}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-950 active:scale-125 active:opacity-75"
                aria-label="Enviar corazón"
              >
                <span className="text-[22px] leading-none">❤️</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
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
    messages, loadMessages, sendMessage, sendTyping, markAsRead,
    typingUsers, conversations, sendReaction,
    loadOlderMessages, hasMoreMessages, loadingMore,
    deleteConversation,
  } = useChatContext();

  const [localMessages, setLocalMessages] = useState([]);
  const [showNewPill, setShowNewPill] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(0);
  const prevScrollHeightRef = useRef(0);

  const conversation = useMemo(
    () => conversations.find((c) => String(c.id || c.conversation_id) === String(conversationId)),
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

  // Restore scroll position after loading older messages (Q10)
  useEffect(() => {
    if (!loadingMore && prevScrollHeightRef.current > 0 && scrollRef.current) {
      const diff = scrollRef.current.scrollHeight - prevScrollHeightRef.current;
      if (diff > 0) scrollRef.current.scrollTop += diff;
      prevScrollHeightRef.current = 0;
    }
  }, [loadingMore, localMessages]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handler = () => setKeyboardHeight(Math.max(0, window.innerHeight - window.visualViewport.height));
    window.visualViewport.addEventListener('resize', handler);
    return () => window.visualViewport?.removeEventListener('resize', handler);
  }, []);

  // Scroll handler — load older messages when near top (Q10)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottomRef.current) setShowNewPill(false);

    // Pagination: load older messages when scrolled near top
    if (el.scrollTop < 80 && hasMoreMessages && !loadingMore && conversationId) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages(conversationId);
    }
  }, [hasMoreMessages, loadingMore, conversationId, loadOlderMessages]);

  // Mark messages as read
  useEffect(() => {
    if (!user || !conversationId) return;
    const unread = localMessages
      .filter((m) => !m.read && String(m.sender_id || m.user_id) !== String(user.id))
      .map((m) => m.message_id || m.id);
    if (unread.length > 0) markAsRead(conversationId, unread);
  }, [localMessages, user, conversationId, markAsRead]);

  // Send text message (Q2 reply, Q7 sending state)
  const handleSend = useCallback((content) => {
    const tempId = `temp-${Date.now()}`;
    const extra = {};
    if (replyTo) {
      extra.reply_to_id = replyTo.message_id || replyTo.id;
      extra.reply_to_preview = {
        id: replyTo.message_id || replyTo.id,
        content: (replyTo.content || '').slice(0, 100),
        sender_name: replyTo.sender_name || '',
        sender_id: replyTo.sender_id || '',
      };
    }
    const optimistic = {
      id: tempId,
      message_id: tempId,
      sender_id: user?.id,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read: false,
      status: 'sending',
      reply_to_preview: extra.reply_to_preview || null,
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    sendMessage(conversationId, content, { ...extra, temp_id: tempId });
    setReplyTo(null);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, [conversationId, sendMessage, user, replyTo]);

  // Handle image upload (Q3)
  const handleAttachImage = useCallback(async (file) => {
    if (!conversationId || !file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post(`/chat/conversations/${conversationId}/upload-image`, formData);
      if (data?.image_url) {
        const tempId = `temp-img-${Date.now()}`;
        const optimistic = {
          id: tempId, message_id: tempId, sender_id: user?.id,
          content: '', message_type: 'image', image_url: data.image_url,
          created_at: new Date().toISOString(), read: false, status: 'sending',
        };
        setLocalMessages((prev) => [...prev, optimistic]);
        sendMessage(conversationId, '', { message_type: 'image', image_url: data.image_url, temp_id: tempId });
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
    } catch {
      // Upload failed
    }
  }, [conversationId, sendMessage, user]);

  // Handle voice send (Q9)
  const handleVoiceSend = useCallback(async (blob, duration) => {
    if (!conversationId || !blob) return;
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice.webm');
      formData.append('duration', String(duration));
      const data = await apiClient.post(`/chat/conversations/${conversationId}/upload-audio`, formData);
      if (data?.audio_url) {
        const tempId = `temp-audio-${Date.now()}`;
        const optimistic = {
          id: tempId, message_id: tempId, sender_id: user?.id,
          content: '', message_type: 'audio', audio_url: data.audio_url,
          audio_duration: duration,
          created_at: new Date().toISOString(), read: false, status: 'sending',
        };
        setLocalMessages((prev) => [...prev, optimistic]);
        sendMessage(conversationId, '', { message_type: 'audio', audio_url: data.audio_url, audio_duration: duration, temp_id: tempId });
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
    } catch {
      // Upload failed
    }
  }, [conversationId, sendMessage, user]);

  // Handle reaction (Q1)
  const handleReact = useCallback((message, emoji) => {
    sendReaction(conversationId, message.message_id || message.id, emoji);
    // Optimistic update
    setLocalMessages((prev) => prev.map(m => {
      if ((m.message_id || m.id) !== (message.message_id || message.id)) return m;
      const reactions = (m.reactions || []).filter(r => r.user_id !== user?.id);
      const alreadyHas = (m.reactions || []).some(r => r.user_id === user?.id && r.emoji === emoji);
      if (!alreadyHas) reactions.push({ user_id: user?.id, emoji, name: user?.name || '' });
      return { ...m, reactions };
    }));
  }, [conversationId, sendReaction, user]);

  // Handle reply (Q2 + Q4)
  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  const handleTyping = useCallback((typing) => sendTyping(conversationId, typing), [conversationId, sendTyping]);
  const scrollToBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowNewPill(false); }, []);
  const handleContextMenu = useCallback((message, x, y) => setContextMenu({ message, x, y }), []);

  // Handle delete entire conversation
  const handleDeleteConversation = useCallback(async () => {
    if (!conversationId) return;
    await deleteConversation(conversationId);
    navigate('/messages', { replace: true });
  }, [conversationId, deleteConversation, navigate]);

  // Handle message delete (optimistic + API)
  const handleDeleteMessage = useCallback(async (message) => {
    const msgId = message.message_id || message.id;
    setLocalMessages((prev) => prev.filter((m) => (m.message_id || m.id) !== msgId));
    try {
      await apiClient.delete(`/chat/messages/${msgId}`);
    } catch {
      // Re-add on failure
      setLocalMessages((prev) => [...prev, message].sort((a, b) =>
        new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp)
      ));
    }
  }, []);

  const groupedMessages = useMemo(() => {
    const source = localMessages;
    const result = [];
    let lastDate = null;
    let lastSender = null;
    let lastTime = null;

    for (let i = 0; i < source.length; i++) {
      const msg = source[i];
      const msgDate = new Date(msg.created_at || msg.timestamp);

      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push({ type: 'date', date: msgDate, key: `date-${i}` });
        lastSender = null;
        lastTime = null;
      }

      const senderId = String(msg.sender_id || msg.user_id || '');
      const withinGroup = senderId === lastSender && lastTime && msgDate.getTime() - lastTime.getTime() < 60000;

      const nextMsg = source[i + 1];
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
      className="fixed inset-0 z-40 flex flex-col bg-white font-apple"
      style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined }}
    >
      <ChatHeader
        conversation={conversation}
        navigate={navigate}
        showSearch={showSearch}
        onToggleSearch={() => { setShowSearch(s => !s); if (showSearch) setSearchQuery(''); }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDeleteConversation={handleDeleteConversation}
      />
      <ContextBanner orderId={conversation?.order_id} navigate={navigate} />

      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto overscroll-none bg-white" role="log" aria-live="polite" aria-label="Mensajes">
        <div className="pb-4 pt-2">
          {/* Pagination spinner (Q10) */}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
            </div>
          )}

          {localMessages.length === 0 && !loadingMore && (
            <EmptyConversation conversation={conversation} onSendSuggestion={handleSend} />
          )}

          {groupedMessages.map((item) =>
            item.type === 'date'
              ? <DateSeparator key={item.key} date={item.date} />
              : <MessageBubble
                  key={item.key}
                  message={item.message}
                  isOwn={item.isOwn}
                  isConsecutive={item.isConsecutive}
                  isFirstInGroup={item.isFirstInGroup}
                  isLastInGroup={item.isLastInGroup}
                  isMiddleInGroup={item.isMiddleInGroup}
                  onImageTap={setLightboxImage}
                  onContextMenu={handleContextMenu}
                  onReply={handleReply}
                  onReact={handleReact}
                  searchHighlight={searchQuery.trim() || null}
                />
          )}

          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showNewPill && <NewMessagesPill onClick={scrollToBottom} />}
        </AnimatePresence>
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onAttachImage={handleAttachImage}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onVoiceSend={handleVoiceSend}
      />

      <AnimatePresence>
        {contextMenu && (
          <MessageContextMenu
            contextMenu={contextMenu}
            onClose={() => setContextMenu(null)}
            userId={user?.id}
            onReact={handleReact}
            onReply={handleReply}
            onDelete={handleDeleteMessage}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </AnimatePresence>
    </div>
  );
}
