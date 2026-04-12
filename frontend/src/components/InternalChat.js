import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Clapperboard, FileText, Heart, Images, Loader2, MapPin, Mic, Package, PenSquare, Phone, Search, Reply, Send, ShoppingBag, ShoppingCart, Trash2, Users, UserPlus, UtensilsCrossed, Video, X, ThumbsUp, Smile, AlertCircle, Frown, Angry, Camera, Paperclip, Download } from 'lucide-react';
import SharedListPanel from './chat/SharedListPanel';
import { toast } from 'sonner';
import apiClient, { getWSUrl } from '../services/api/client';
import { getToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import ReportButton from './moderation/ReportButton';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';
import { useSwipeToReply } from '../hooks/useSwipeToReply';
import { useTranslation } from 'react-i18next';
import i18n from "../locales/i18n";
import { trackEvent } from '../utils/analytics';
import AudioRecorder from './chat/AudioRecorder';
import AudioPlayerBubble from './chat/AudioPlayerBubble';
import GroupChatPanel from './chat/GroupChatPanel';
const MAX_VISIBLE_MESSAGES = 150;

// Module-level formatter singletons
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit'
});
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short'
});
const longDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long'
});
function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
}
function formatConversationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (date.toDateString() === new Date().toDateString()) return formatTime(value);
  return shortDateFormatter.format(date);
}
function formatDayLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return longDateFormatter.format(date);
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
function ChatAvatar({
  src,
  name,
  size = 'h-11 w-11',
  alt
}) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    setHasError(false);
  }, [src]);
  if (src && !hasError) {
    return <img src={src} alt={alt || `Avatar de ${name || 'usuario'}`} loading="lazy" onError={() => setHasError(true)} className={`${size} rounded-full object-cover`} />;
  }
  return <div className={`${size} flex items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-700`}>
      {getInitial(name)}
    </div>;
}
function MessageStatus({
  message,
  isOwn
}) {
  const status = (message?.status || '').toLowerCase();
  const label = status === 'read' ? 'Leído' : status === 'delivered' ? 'Entregado' : status === 'sent' ? 'Enviado' : '';
  return <div className={`mt-1.5 flex items-center gap-2 px-1 text-[11px] ${isOwn ? 'justify-end text-stone-400' : 'text-stone-400'}`}>
      <span>{formatTime(message?.read_at || message?.delivered_at || message?.created_at)}</span>
      {isOwn && label ? <span>{label}</span> : null}
    </div>;
}
const REACTIONS = [
  { key: '❤️', icon: Heart, label: 'love' },
  { key: '😂', icon: Smile, label: 'laugh' },
  { key: '😮', icon: AlertCircle, label: 'wow' },
  { key: '😢', icon: Frown, label: 'sad' },
  { key: '😡', icon: Angry, label: 'angry' },
  { key: '👍', icon: ThumbsUp, label: 'like' },
];
const REACTION_ICON_MAP = Object.fromEntries(REACTIONS.map(r => [r.key, r]));
function ReplyPreviewInline({
  preview
}) {
  if (!preview) return null;
  return <div className="mb-0.5 flex items-center gap-2 rounded-t-[14px] border-l-[3px] border-stone-950 bg-stone-50 px-3 py-2">
      {preview.media_url ? <img src={preview.media_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" loading="lazy" /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-stone-950">{preview.sender_name}</p>
        <p className="truncate text-[12px] text-stone-500">
          {preview.media_url && !preview.content ? 'Foto' : preview.content}
        </p>
      </div>
    </div>;
}
const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwn,
  onReply,
  onReact,
  onDelete,
  currentUserId
}) {
  // CH-04: Load existing reactions from message data
  const existingReaction = useMemo(() => {
    if (!message?.reactions?.length || !currentUserId) return null;
    const mine = message.reactions.find(r => r.user_id === currentUserId);
    return mine?.emoji || null;
  }, [message?.reactions, currentUserId]);
  const allReactions = message?.reactions || [];
  const [showPicker, setShowPicker] = useState(false);
  const [showReplyBtn, setShowReplyBtn] = useState(false);
  const pressTimerRef = useRef(null);
  const {
    elRef,
    handlers: swipeHandlers
  } = useSwipeToReply(() => onReply?.(message));

  // Cleanup long-press timer on unmount
  useEffect(() => () => clearTimeout(pressTimerRef.current), []);
  const handlePointerDown = () => {
    pressTimerRef.current = setTimeout(() => {
      setShowPicker(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(6);
    }, 500);
  };
  const handlePointerUp = () => {
    clearTimeout(pressTimerRef.current);
  };

  // CH-01: Persist reaction to backend — always send emoji, backend toggles (same = remove, diff = replace)
  const handleReact = emoji => {
    onReact?.(message.message_id, emoji);
    setShowPicker(false);
  };

  // System messages (list actions, join/leave, etc.)
  if (message?.message_type === 'system') {
    return <div className="flex justify-center py-1.5">
      <span className="rounded-full bg-stone-100 px-3 py-1 text-[12px] text-stone-400">{message.content}</span>
    </div>;
  }

  // CH-02: Delete own message (within 5 min window)
  const canDelete = isOwn && message?.created_at && Date.now() - new Date(message.created_at).getTime() < 300_000;
  const hasReplyPreview = Boolean(message?.reply_to_preview);
  return <motion.div initial={{
    opacity: 0,
    y: 10
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.18,
    ease: 'easeOut'
  }} className={`relative flex ${isOwn ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setShowReplyBtn(true)} onMouseLeave={() => setShowReplyBtn(false)} {...swipeHandlers}>
      {/* Reply icon visible during swipe */}
      <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-30 ${isOwn ? 'right-1' : 'left-1'}`}>
        <Reply className="h-[18px] w-[18px] text-stone-950" />
      </div>

      {/* Desktop hover reply button */}
      <AnimatePresence>
        {showReplyBtn && !showPicker ? <motion.button type="button" initial={{
        opacity: 0,
        scale: 0.8
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.8
      }} transition={{
        duration: 0.12
      }} onClick={() => onReply?.(message)} className={`absolute top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-stone-100 bg-white shadow-sm transition-colors hover:bg-stone-50 lg:flex ${isOwn ? '-left-9' : '-right-9'}`} style={{
        width: 44,
        height: 44
      }} aria-label="Responder">
            <Reply className="h-[13px] w-[13px] text-stone-600" />
          </motion.button> : null}
      </AnimatePresence>

      <div ref={elRef} className={`relative min-w-[80px] max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Emoji picker — aparece al pulsar largo */}
        <AnimatePresence>
          {showPicker ? <>
              <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} exit={{
            opacity: 0
          }} className="fixed inset-0 z-40" onPointerDown={() => setShowPicker(false)} />
              <motion.div initial={{
            opacity: 0,
            scale: 0.85,
            y: 6
          }} animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }} exit={{
            opacity: 0,
            scale: 0.85,
            y: 6
          }} transition={{
            duration: 0.15,
            ease: [0, 0, 0.2, 1]
          }} className={`absolute bottom-full z-50 mb-2 flex items-center gap-1 rounded-full border border-stone-100 bg-white px-2 py-1.5 shadow-[0_8px_28px_rgba(15,15,15,0.15)] ${isOwn ? 'right-0' : 'left-0'}`}>
                {REACTIONS.map(r => <button key={r.key} type="button" onClick={() => handleReact(r.key)} className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-125 active:scale-110 ${existingReaction === r.key ? 'bg-stone-100' : ''}`}>
                    <r.icon size={20} className="text-stone-700" />
                  </button>)}
                {/* CH-02: Delete button in long-press menu */}
                {canDelete && <button type="button" onClick={() => {
              setShowPicker(false);
              onDelete?.(message.message_id);
            }} className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-transform hover:scale-110 hover:text-stone-700" aria-label="Eliminar mensaje">
                    <Trash2 size={16} />
                  </button>}
                {/* Section 3.5b — Report this message (only on messages from others) */}
                {!isOwn && message?.message_id && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400">
                    <ReportButton contentType="message" contentId={message.message_id} contentOwnerId={message?.sender_id} />
                  </div>
                )}
              </motion.div>
            </> : null}
        </AnimatePresence>

        {/* Group sender name — show for non-own messages in groups */}
        {!isOwn && message?.sender_name ? <p className="mb-0.5 px-1 text-[11px] font-semibold text-stone-500">{message.sender_name}</p> : null}

        {/* Reply preview — inline above the bubble */}
        {hasReplyPreview ? <ReplyPreviewInline preview={message.reply_to_preview} /> : null}

        <div onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} className="select-none">
          {message?.shared_item ? <div className="mb-1.5">
              <SharedItemCard item={message.shared_item} compact />
            </div> : null}
          {/* Story reply preview — thumbnail + caption */}
          {message?.message_type === 'story_reply' && message?.story_thumbnail_url ? <div className={`mb-1.5 overflow-hidden rounded-[18px] ${isOwn ? 'rounded-br-[4px] bg-stone-900' : 'rounded-bl-[4px] bg-stone-50'}`}>
              <div className="flex items-center gap-2.5 p-2">
                <img src={message.story_thumbnail_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <span className={`text-[11px] font-medium ${isOwn ? 'text-white/50' : 'text-stone-400'}`}>{message.story_expires_at && new Date(message.story_expires_at) < new Date() ? 'Story expirada' : 'Respondiste a su story'}</span>
                  {message.story_caption ? <p className={`mt-0.5 truncate text-[13px] ${isOwn ? 'text-white/70' : 'text-stone-600'}`}>{message.story_caption}</p> : null}
                </div>
              </div>
            </div> : null}
          {message?.image_url ? <div className={`mb-1.5 overflow-hidden rounded-[18px] ${isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}>
              <img src={message.image_url} alt={i18n.t('internal_chat.imagenCompartidaEnElChat', 'Imagen compartida en el chat')} loading="lazy" onError={e => {
            e.target.alt = i18n.t('internal_chat.noSePudoCargarLaImagen', 'No se pudo cargar la imagen');
            e.target.className = 'hidden';
          }} className="max-w-[260px] object-cover" />
            </div> : null}
          {/* Document attachment render (Bug 10 fix) */}
          {message?.file_url && !message.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
            <a href={message.file_url} target="_blank" rel="noopener noreferrer"
               className={`flex items-center gap-2 px-3 py-2.5 mb-1.5 rounded-[18px] transition-colors ${isOwn ? 'bg-stone-800 hover:bg-stone-700' : 'bg-stone-100 hover:bg-stone-200'}`}>
              <Paperclip className={`w-4 h-4 shrink-0 ${isOwn ? 'text-stone-400' : 'text-stone-500'}`} />
              <span className={`text-[13px] truncate flex-1 ${isOwn ? 'text-white' : 'text-stone-700'}`}>{message.file_name || 'Documento'}</span>
              <Download className={`w-4 h-4 shrink-0 ${isOwn ? 'text-stone-400' : 'text-stone-400'}`} />
            </a>
          )}
          {/* Audio player bubble */}
          {message?.audio_url || message?.audio_expired ? <AudioPlayerBubble audioUrl={message.audio_url} duration={message.audio_duration || 0} expiresAt={message.audio_expires_at} expired={!!message.audio_expired} isOwn={isOwn} /> : null}
          {message?.content && !message?.audio_url && !message?.audio_expired ? <div className={`px-3.5 py-2.5 text-[15px] leading-[1.4] whitespace-pre-wrap break-words ${isOwn ? `${hasReplyPreview ? 'rounded-b-[20px] rounded-br-[4px]' : 'rounded-[20px] rounded-br-[4px]'} bg-stone-950 text-white` : `${hasReplyPreview ? 'rounded-b-[20px] rounded-bl-[4px]' : 'rounded-[20px] rounded-bl-[4px]'} bg-stone-100 text-stone-950`}`} style={{
          overflowWrap: 'anywhere',
          wordBreak: 'break-word'
        }}>
              {message.content}
            </div> : null}
        </div>

        {/* Reaction pills — show all reactions from all users */}
        <AnimatePresence>
          {allReactions.length > 0 ? <motion.div initial={{
          scale: 0.5,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.5,
          opacity: 0
        }} transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20
        }} className={`mt-1 flex w-fit items-center gap-0.5 rounded-full border border-stone-100 bg-white px-1.5 py-0.5 shadow-sm ${isOwn ? 'ml-auto' : ''}`}>
              {[...new Set(allReactions.map(r => r.emoji))].map(emoji => { const mapped = REACTION_ICON_MAP[emoji]; return mapped ? <mapped.icon key={emoji} size={14} className="text-stone-600" /> : <span key={emoji} className="text-[14px]">{emoji}</span>; })}
              {allReactions.length > 1 && <span className="text-[11px] text-stone-400 ml-0.5">{allReactions.length}</span>}
            </motion.div> : null}
        </AnimatePresence>

        <MessageStatus message={message} isOwn={isOwn} />
      </div>
    </motion.div>;
});
function TypingIndicator() {
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: 8
  }} className="inline-flex items-center gap-1 rounded-[20px] rounded-bl-[4px] bg-stone-100 px-3.5 py-3">
      {[0, 1, 2].map(index => <motion.span key={index} animate={{
      y: [0, -3, 0],
      opacity: [0.35, 1, 0.35]
    }} transition={{
      duration: 0.9,
      repeat: Infinity,
      delay: index * 0.15,
      ease: 'easeInOut'
    }} className="h-1.5 w-1.5 rounded-full bg-stone-500" />)}
    </motion.div>;
}
function LoadingConversationSkeleton() {
  return <div className="space-y-4">
      {[0, 1, 2, 3].map(value => <div key={value} className={`flex ${value % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`space-y-2 ${value % 2 === 0 ? 'w-[58%]' : 'w-[48%]'}`}>
            <div className="h-12 animate-pulse rounded-[20px] bg-stone-100" />
            <div className="h-2.5 w-14 animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>)}
    </div>;
}
function EmptyState({
  title,
  description
}) {
  return <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-stone-400">
        Hispaloshop
      </div>
      <h3 className="mt-4 text-lg font-medium text-stone-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{description}</p>
    </div>;
}
function FilterChip({
  label,
  active,
  onClick
}) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 active:bg-stone-200'}`}>
      {label}
    </button>;
}
function ComposerActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  badge = null
}) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`relative flex flex-col items-center gap-1.5 rounded-[14px] px-2 py-2.5 transition-colors active:bg-stone-50 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
        <Icon className="h-[18px] w-[18px] text-stone-800" strokeWidth={1.8} />
      </div>
      <span className="text-[10px] font-medium text-stone-600">{label}</span>
      {badge ? <span className="absolute -right-1 -top-1 rounded-full bg-stone-300 px-1.5 py-px text-[9px] font-semibold text-stone-600">
          {badge}
        </span> : null}
    </button>;
}
const sharedPriceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2
});
function formatSharedPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return sharedPriceFormatter.format(amount);
}
function SharedItemCard({
  item,
  compact = false
}) {
  if (!item) return null;
  const badgeLabel = item.kind === 'product' ? 'Producto' : item.kind === 'recipe' ? 'Receta' : item.kind === 'reel' ? 'Reel' : 'Post';
  return <motion.div whileHover={{
    y: -1
  }} transition={{
    duration: 0.16,
    ease: 'easeOut'
  }} className={`overflow-hidden rounded-[18px] border border-stone-100 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${compact ? 'max-w-[300px]' : ''}`}>
      {item.image_url ? <div className={compact ? 'h-36 w-full' : 'h-44 w-full'}>
          <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        </div> : null}
      <div className="space-y-2 p-3.5">
        <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {badgeLabel}
        </div>
        <div>
          <p className="line-clamp-1 text-sm font-semibold text-stone-950">{item.title}</p>
          {item.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{item.subtitle}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs font-medium text-stone-600">{item.meta || 'Contenido compartido'}</span>
          <a href={item.href} className="inline-flex shrink-0 items-center rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800">
            Abrir
          </a>
        </div>
      </div>
    </motion.div>;
}
function ShareItemSheet({
  open,
  shareType,
  inputValue,
  onInputChange,
  onClose,
  onSubmit,
  isLoading,
  preview,
  onAttach
}) {
  if (!open) return null;
  const title = shareType === 'product' ? 'Compartir producto' : shareType === 'recipe' ? 'Compartir receta' : 'Compartir post o reel';
  const hint = shareType === 'product' ? i18n.t('internal_chat.pegaUnEnlaceDeProductoOSuId', 'Pega un enlace de producto o su ID.') : shareType === 'recipe' ? i18n.t('internal_chat.pegaUnEnlaceDeRecetaOSuId', 'Pega un enlace de receta o su ID.') : i18n.t('internal_chat.pegaUnEnlaceDePostOReelDeHispalo', 'Pega un enlace de post o reel de Hispaloshop.');
  return <AnimatePresence>
      <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="absolute inset-0 z-40 flex items-end justify-center bg-stone-950/28 p-3 backdrop-blur-sm md:items-center md:p-6">
        <motion.div initial={{
        opacity: 0,
        y: 24,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 16,
        scale: 0.98
      }} transition={{
        duration: 0.2,
        ease: 'easeOut'
      }} className="flex w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-stone-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.12)]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-[15px] font-semibold text-stone-950">{title}</span>
            <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Cerrar compartir contenido">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="border-b border-stone-100 px-4 py-3">
            <p className="mb-3 text-[12px] text-stone-400">{hint}</p>
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center rounded-full bg-stone-100 px-4 py-2.5">
                <input type="text" value={inputValue} onChange={event => onInputChange(event.target.value)} placeholder="https://hispaloshop.com/..." className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400" aria-label="Enlace del contenido a compartir" />
              </label>
              <button type="button" onClick={onSubmit} disabled={!inputValue.trim() || isLoading} className="inline-flex h-9 items-center justify-center rounded-full bg-stone-950 px-4 text-[13px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-30">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cargar'}
              </button>
            </div>
          </div>

          <div className="px-4 py-4">
            {preview ? <div className="space-y-3">
                <SharedItemCard item={preview} />
                <button type="button" onClick={onAttach} className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80">
                  Adjuntar al mensaje
                </button>
              </div> : <EmptyState title="Carga una vista previa" description={i18n.t('internal_chat.pegaUnEnlaceValidoDeHispaloshopPar', 'Pega un enlace válido de Hispaloshop para generar una tarjeta compacta.')} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>;
}
function DirectorySheet({
  open,
  onClose,
  users,
  loading,
  onStartConversation,
  onGroupCreated,
  startingConversation,
  searchValue,
  onSearchChange,
  roleFilter,
  onRoleFilterChange
}) {
  const [mode, setMode] = useState('chat'); // 'chat' | 'group'
  const [groupStep, setGroupStep] = useState(1); // 1 = select members, 2 = name
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const groupAvatarRef = useRef(null);
  const [groupAvatarFile, setGroupAvatarFile] = useState(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState(null);

  const resetGroup = () => { setMode('chat'); setGroupStep(1); setSelectedMembers([]); setGroupName(''); setGroupAvatarFile(null); setGroupAvatarPreview(null); };
  const handleClose = () => { resetGroup(); onClose(); };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return;
    setCreatingGroup(true);
    try {
      let avatar_url = null;
      if (groupAvatarFile) {
        const formData = new FormData();
        formData.append('file', groupAvatarFile);
        const uploadRes = await apiClient.post('/internal-chat/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        avatar_url = uploadRes?.data?.url || uploadRes?.url;
      }
      const res = await apiClient.post('/internal-chat/groups/private', {
        name: groupName.trim(),
        member_ids: selectedMembers,
        avatar_url,
      });
      const data = res?.data || res;
      toast.success(i18n.t('chat.group_created', 'Grupo creado'));
      handleClose();
      if (onGroupCreated) onGroupCreated(data.conversation_id || data.group_id);
    } catch {
      toast.error('Error al crear el grupo');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(i18n.t('internal_chat.laImagenNoPuedeSuperar5Mb', 'La imagen no puede superar 5 MB')); return; }
    setGroupAvatarFile(file);
    setGroupAvatarPreview(URL.createObjectURL(file));
  };

  if (!open) return null;
  return <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-end justify-center bg-stone-950/24 p-3 backdrop-blur-sm md:items-center md:p-6">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-stone-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.12)]">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-100 px-4">
            {mode === 'group' && groupStep === 2 ? <button type="button" onClick={() => setGroupStep(1)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100">
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              </button> : <span className="text-[15px] font-semibold text-stone-950">
                {mode === 'group' ? i18n.t('chat.createGroup', 'Crear grupo') : 'Nuevo mensaje'}
              </span>}
            {mode === 'group' && groupStep === 2 && <span className="text-[15px] font-semibold text-stone-950">{i18n.t('chat.groupName', 'Nombre del grupo')}</span>}
            <button type="button" onClick={handleClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Cerrar">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Mode toggle (Chat / Grupo) — only on step 1 */}
          {groupStep === 1 && <div className="flex shrink-0 border-b border-stone-100">
              <button type="button" onClick={() => { setMode('chat'); setSelectedMembers([]); }} className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors ${mode === 'chat' ? 'text-stone-950 border-b-2 border-stone-950' : 'text-stone-400'}`}>
                Chat
              </button>
              <button type="button" onClick={() => setMode('group')} className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors ${mode === 'group' ? 'text-stone-950 border-b-2 border-stone-950' : 'text-stone-400'}`}>
                {i18n.t('chat.createGroup', 'Grupo')}
              </button>
            </div>}

          {/* Step 2: Group name + avatar */}
          {mode === 'group' && groupStep === 2 ? <div className="flex flex-col items-center gap-4 px-5 py-6 flex-1">
              <button type="button" onClick={() => groupAvatarRef.current?.click()} className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 border border-dashed border-stone-200 overflow-hidden">
                {groupAvatarPreview ? <img src={groupAvatarPreview} alt="" className="h-full w-full object-cover" /> : <Camera size={24} className="text-stone-400" />}
              </button>
              <input ref={groupAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <input type="text" value={groupName} onChange={e => setGroupName(e.target.value.slice(0, 50))} maxLength={50} placeholder={i18n.t('chat.groupName', 'Nombre del grupo')} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-950 outline-none focus:border-stone-400 placeholder:text-stone-400" autoFocus />
              <span className="text-[11px] text-stone-400">{selectedMembers.length} {i18n.t('chat.membersSelected', 'seleccionados')}</span>
              <button type="button" onClick={handleCreateGroup} disabled={!groupName.trim() || creatingGroup} className="w-full rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
                {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : i18n.t('chat.createGroupButton', 'Crear grupo')}
              </button>
            </div> : <>
              {/* Search + filters */}
              <div className="shrink-0 border-b border-stone-100 px-3 py-2.5">
                <label className="flex items-center gap-2.5 rounded-full bg-stone-100 px-3.5 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
                  <input type="search" value={searchValue} onChange={event => onSearchChange(event.target.value)} placeholder="Buscar nombre o rol" className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400" aria-label="Buscar usuario en directorio" />
                </label>
                <div className="mt-2.5 flex flex-wrap gap-1.5 px-0.5">
                  <FilterChip label="Todos" active={roleFilter === 'all'} onClick={() => onRoleFilterChange('all')} />
                  <FilterChip label="Productores" active={roleFilter === 'producer'} onClick={() => onRoleFilterChange('producer')} />
                  <FilterChip label="Influencers" active={roleFilter === 'influencer'} onClick={() => onRoleFilterChange('influencer')} />
                </div>
              </div>

              {/* Selected members pills (group mode) */}
              {mode === 'group' && selectedMembers.length > 0 && <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-stone-100 px-3 py-2">
                  {selectedMembers.map(uid => {
                    const u = users.find(e => e.user_id === uid);
                    return <span key={uid} className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[12px] text-stone-700">
                        {u?.name || uid}
                        <button type="button" onClick={() => toggleMember(uid)} className="ml-0.5"><X className="h-3 w-3" /></button>
                      </span>;
                  })}
                </div>}

              {/* User list */}
              <div className="flex-1 overflow-y-auto">
                {loading ? <div className="space-y-px px-4 py-3">
                    {[0, 1, 2, 3].map(value => <div key={value} className="flex items-center gap-3 py-3">
                        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-stone-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-28 animate-pulse rounded-full bg-stone-100" />
                          <div className="h-2.5 w-16 animate-pulse rounded-full bg-stone-100" />
                        </div>
                      </div>)}
                  </div> : users.length > 0 ? <div>
                    {users.map(entry => {
                      const isSelected = selectedMembers.includes(entry.user_id);
                      return <button key={entry.user_id} type="button" onClick={() => mode === 'group' ? toggleMember(entry.user_id) : onStartConversation(entry.user_id)} disabled={mode === 'chat' && startingConversation} className="flex w-full min-h-[64px] items-center gap-3 px-4 py-3 text-left transition-colors active:bg-stone-50 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60">
                          <ChatAvatar src={entry.avatar} name={entry.name} alt={`Avatar de ${entry.name}`} size="h-11 w-11" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-stone-950">{entry.name}</p>
                            <p className="truncate text-[12px] text-stone-400">
                              {getRoleLabel(entry.role) || i18n.t('internal_chat.miembroDeLaComunidad', 'Miembro de la comunidad')}
                            </p>
                          </div>
                          {mode === 'group' ? <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${isSelected ? 'bg-stone-950 border-stone-950' : 'border-stone-300'}`}>
                              {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                            </div> : startingConversation ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-400" /> : <UserPlus className="h-4 w-4 shrink-0 text-stone-300" strokeWidth={1.8} />}
                        </button>;
                    })}
                  </div> : <div className="py-8">
                    <EmptyState title="No hay resultados" description={i18n.t('internal_chat.pruebaConOtroNombreOCambiaElFiltr', 'Prueba con otro nombre o cambia el filtro.')} />
                  </div>}
              </div>

              {/* Group mode: Next button */}
              {mode === 'group' && <div className="shrink-0 border-t border-stone-100 p-3">
                  <button type="button" onClick={() => setGroupStep(2)} disabled={selectedMembers.length < 1} className="w-full rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
                    {i18n.t('chat.selectMembers', 'Siguiente')} ({selectedMembers.length})
                  </button>
                </div>}
            </>}
        </motion.div>
      </motion.div>
    </AnimatePresence>;
}
export default function InternalChat({
  isEmbedded = false,
  onClose = null,
  initialChatUserId = null
}) {
  const {
    user
  } = useAuth();
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
    deleteConversation,
    sendingMessage,
    uploadingImage
  } = useInternalChatData();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [typingUserId, setTypingUserId] = useState(null);
  const [startingConversation, setStartingConversation] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [directorySearchValue, setDirectorySearchValue] = useState('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('all');
  const [isComposerActionsOpen, setIsComposerActionsOpen] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [inboxTab, setInboxTab] = useState('messages'); // 'messages' | 'requests'
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [isSharedListOpen, setIsSharedListOpen] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingSharedItem, setPendingSharedItem] = useState(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [shareSheetType, setShareSheetType] = useState('product');
  const [shareInputValue, setShareInputValue] = useState('');
  const [sharePreview, setSharePreview] = useState(null);
  const [loadingSharePreview, setLoadingSharePreview] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isNavigatingConversation, startConversationTransition] = useTransition();
  const wsRef = useRef(null);
  const virtuosoRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeConversationRef = useRef(null);
  const messagesCacheRef = useRef(new Map());
  const MAX_CACHED_CONVERSATIONS = 20;
  const conversationsReloadTimeoutRef = useRef(null);
  const markIncomingReadRef = useRef(null);
  const scheduleReloadRef = useRef(null);

  // CH-05: LRU eviction for message cache
  const setCacheWithEviction = useCallback((key, value) => {
    const cache = messagesCacheRef.current;
    cache.delete(key); // remove to re-insert at end (Map preserves insertion order)
    cache.set(key, value);
    while (cache.size > MAX_CACHED_CONVERSATIONS) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  }, []);
  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredDirectorySearchValue = useDeferredValue(directorySearchValue);
  const sortedConversations = useMemo(() => [...(Array.isArray(conversations) ? conversations : [])].sort((a, b) => {
    const left = new Date(b.updated_at || b.created_at || 0).getTime();
    const right = new Date(a.updated_at || a.created_at || 0).getTime();
    return left - right;
  }), [conversations]);
  const directoryUsers = useMemo(() => {
    const registry = new Map();
    [...(Array.isArray(producers) ? producers : []), ...(Array.isArray(influencers) ? influencers : [])].forEach(entry => {
      const userId = entry?.user_id || entry?.producer_id || entry?.influencer_id;
      if (!userId || userId === user?.user_id || registry.has(userId)) return;
      registry.set(userId, {
        user_id: userId,
        name: entry?.name || entry?.store_name || entry?.username || 'Usuario',
        role: entry?.role || (entry?.producer_id ? 'producer' : 'influencer'),
        avatar: entry?.profile_image || entry?.avatar_url || entry?.logo || null
      });
    });
    return Array.from(registry.values()).slice(0, 8);
  }, [influencers, producers, user?.user_id]);
  const filteredDirectoryUsers = useMemo(() => {
    const query = deferredDirectorySearchValue.trim().toLowerCase();
    return directoryUsers.filter(entry => {
      const roleMatches = directoryRoleFilter === 'all' || entry.role === directoryRoleFilter;
      if (!roleMatches) return false;
      if (!query) return true;
      const haystack = [entry.name, getRoleLabel(entry.role), entry.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredDirectorySearchValue, directoryRoleFilter, directoryUsers]);
  const requestConversations = useMemo(() => sortedConversations.filter(c => c.is_request && c.request_status === 'pending'), [sortedConversations]);
  const mainConversations = useMemo(() => sortedConversations.filter(c => !c.is_request || c.request_status === 'accepted'), [sortedConversations]);
  const activeInboxList = inboxTab === 'requests' ? requestConversations : mainConversations;
  const filteredConversations = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();
    if (!query) return activeInboxList;
    return activeInboxList.filter(conversation => {
      const haystack = [conversation?.other_user_name, conversation?.other_user_role, conversation?.last_message?.content].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearchValue, activeInboxList]);
  const activeConversation = useMemo(() => sortedConversations.find(conversation => conversation.conversation_id === selectedConversationId) || null, [selectedConversationId, sortedConversations]);
  const resolveShareReference = useCallback((rawValue, forcedType) => {
    const value = rawValue.trim();
    if (!value) return null;
    const normalized = value.startsWith('http') ? value : `${window.location.origin}/${value.replace(/^\/+/, '')}`;
    try {
      const parsed = new URL(normalized);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const [resource, identifier] = segments;
      if (resource === 'products' && identifier) {
        return {
          endpoint: `/products/${identifier}`,
          kind: 'product',
          id: identifier
        };
      }
      if (resource === 'recipes' && identifier) {
        return {
          endpoint: `/recipes/${identifier}`,
          kind: 'recipe',
          id: identifier
        };
      }
      if ((resource === 'posts' || resource === 'reels') && identifier) {
        return {
          endpoint: `/posts/${identifier}`,
          kind: resource === 'reels' ? 'reel' : 'post',
          id: identifier
        };
      }
    } catch {
      // Fall back to raw ID handling below.
    }
    if (forcedType === 'product') {
      return {
        endpoint: `/products/${value}`,
        kind: 'product',
        id: value
      };
    }
    if (forcedType === 'recipe') {
      return {
        endpoint: `/recipes/${value}`,
        kind: 'recipe',
        id: value
      };
    }
    return {
      endpoint: `/posts/${value}`,
      kind: 'post',
      id: value
    };
  }, []);
  const buildSharedItemPreview = useCallback((kind, id, payload) => {
    if (!payload) return null;
    if (kind === 'product') {
      const imageUrl = payload.image_url || payload.images?.[0] || null;
      return {
        kind: 'product',
        id,
        title: payload.name || 'Producto',
        subtitle: payload.producer_name || payload.store_name || payload.category_name || '',
        image_url: imageUrl,
        meta: formatSharedPrice(payload.price) || 'Ver producto',
        href: `/products/${id}`
      };
    }
    if (kind === 'recipe') {
      return {
        kind: 'recipe',
        id,
        title: payload.title || payload.name || 'Receta',
        subtitle: payload.description || payload.author_name || 'Inspiracion para compartir',
        image_url: payload.image_url || payload.cover_image || null,
        meta: payload.difficulty || payload.duration || payload.prep_time || 'Ver receta',
        href: `/recipes/${id}`
      };
    }
    const postKind = payload.type === 'reel' || kind === 'reel' ? 'reel' : 'post';
    const primaryMedia = payload.image_url || payload.media_url || payload.thumbnail_url || payload.media?.[0]?.thumbnail_url || payload.media?.[0]?.url || null;
    return {
      kind: postKind,
      id,
      title: payload.user_name || payload.author_name || payload.user?.name || 'Publicacion',
      subtitle: payload.caption || payload.content || 'Contenido social compartido',
      image_url: primaryMedia,
      meta: postKind === 'reel' ? 'Reel' : 'Post',
      href: `/posts/${id}`
    };
  }, []);
  const scheduleReloadConversations = useCallback(() => {
    if (conversationsReloadTimeoutRef.current) {
      window.clearTimeout(conversationsReloadTimeoutRef.current);
    }
    conversationsReloadTimeoutRef.current = window.setTimeout(() => {
      reloadConversations();
      conversationsReloadTimeoutRef.current = null;
    }, 180);
  }, [reloadConversations]);
  const markIncomingMessagesAsRead = useCallback(async (items, conversationId = selectedConversationId) => {
    if (!user?.user_id || !conversationId) return;
    const unreadIds = items.filter(message => message?.sender_id !== user.user_id && String(message?.status || '').toLowerCase() !== 'read').map(message => message.message_id).filter(Boolean);
    if (unreadIds.length === 0) return;
    await Promise.allSettled(unreadIds.map(messageId => apiClient.put(`/internal-chat/messages/${messageId}/read`, {})));
    setMessages(current => {
      const nextMessages = current.map(message => unreadIds.includes(message.message_id) ? {
        ...message,
        status: 'read',
        read_at: new Date().toISOString()
      } : message);
      setCacheWithEviction(conversationId, nextMessages);
      return nextMessages;
    });
    scheduleReloadConversations();
  }, [scheduleReloadConversations, selectedConversationId, setCacheWithEviction, user?.user_id]);
  useEffect(() => {
    activeConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Keep refs in sync — avoids WebSocket effect depending on callback identity
  useEffect(() => {
    markIncomingReadRef.current = markIncomingMessagesAsRead;
  }, [markIncomingMessagesAsRead]);
  useEffect(() => {
    scheduleReloadRef.current = scheduleReloadConversations;
  }, [scheduleReloadConversations]);
  useEffect(() => {
    if (!selectedConversationId && sortedConversations.length > 0 && !initialChatUserId) {
      setSelectedConversationId(sortedConversations[0].conversation_id);
    }
  }, [initialChatUserId, selectedConversationId, sortedConversations]);
  const loadConversation = useCallback(async conversationId => {
    if (!conversationId) return;
    const cachedMessages = messagesCacheRef.current.get(conversationId);
    startConversationTransition(() => {
      setSelectedConversationId(conversationId);
      if (cachedMessages) {
        setMessages(cachedMessages);
      }
    });
    setLoadingMessages(!cachedMessages);
    try {
      const nextMessages = await fetchMessages(conversationId);
      const normalizedMessages = Array.isArray(nextMessages) ? nextMessages : [];
      setCacheWithEviction(conversationId, normalizedMessages);
      startConversationTransition(() => {
        setMessages(normalizedMessages);
      });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_conversation',
          conversation_id: conversationId
        }));
      }
      if (normalizedMessages.length > 0) {
        await markIncomingMessagesAsRead(normalizedMessages, conversationId);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [fetchMessages, markIncomingMessagesAsRead, setCacheWithEviction]);
  const startConversationWithUser = useCallback(async targetUserId => {
    if (!targetUserId) return;
    setStartingConversation(true);
    try {
      const result = await startConversation(targetUserId);
      const conversationId = result?.conversation_id || result?.data?.conversation_id;
      await reloadConversations();
      if (conversationId) {
        await loadConversation(conversationId);
        setIsDirectoryOpen(false);
        setDirectorySearchValue('');
        setDirectoryRoleFilter('all');
      }
    } finally {
      setStartingConversation(false);
    }
  }, [loadConversation, reloadConversations, startConversation]);
  useEffect(() => {
    if (initialChatUserId) {
      const existing = sortedConversations.find(conversation => conversation.other_user_id === initialChatUserId);
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
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let intentionalClose = false;
    function connect() {
      const socket = new WebSocket(getWSUrl('/ws/chat'));
      wsRef.current = socket;
      socket.onopen = () => {
        reconnectAttempts = 0;
        socket.send(JSON.stringify({
          type: 'auth',
          token
        }));
        if (activeConversationRef.current) {
          socket.send(JSON.stringify({
            type: 'join_conversation',
            conversation_id: activeConversationRef.current
          }));
        }
      };
      socket.onmessage = async event => {
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
              setMessages(current => {
                const nextMessages = current.map(message => message.sender_id === user.user_id ? {
                  ...message,
                  status: 'read',
                  read_at: payload.read_at || new Date().toISOString()
                } : message);
                setCacheWithEviction(changedConversation, nextMessages);
                return nextMessages;
              });
            }
            scheduleReloadRef.current?.();
            return;
          }
          if (payload.type === 'new_message') {
            const incomingMessage = payload.message;
            const incomingConversation = payload.conversation_id;
            scheduleReloadRef.current?.();
            if (incomingConversation === activeConversationRef.current && incomingMessage) {
              setMessages(current => {
                if (current.some(message => message.message_id === incomingMessage.message_id)) {
                  return current;
                }
                const nextMessages = [...current, incomingMessage];
                setCacheWithEviction(incomingConversation, nextMessages);
                return nextMessages;
              });
              if (incomingMessage.sender_id !== user.user_id) {
                markIncomingReadRef.current?.([incomingMessage], incomingConversation);
              }
            }
          }
        } catch (wsErr) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[WS] Message processing error:', wsErr);
          }
        }
      };
      socket.onclose = () => {
        wsRef.current = null;
        if (!intentionalClose && reconnectAttempts < 8) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
      socket.onerror = () => {
        // onclose will fire after onerror, triggering reconnect
      };
    }
    connect();
    return () => {
      intentionalClose = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      if (conversationsReloadTimeoutRef.current) {
        window.clearTimeout(conversationsReloadTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.user_id, setCacheWithEviction]);

  // Scroll to bottom is handled by Virtuoso followOutput="smooth".
  // This explicit scroll is a fallback for typing indicator toggling.
  // visibleTimeline is a useMemo defined further down; effects run after render
  // so the value is always available at effect-execution time.
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: Math.max(0, messages.length - 1),
        behavior: 'smooth'
      });
    }
  }, [messages.length, typingUserId]);
  useEffect(() => {
    return () => {
      if (pendingImage?.previewUrl) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);
  const sendTyping = useCallback(isTyping => {
    if (!selectedConversationId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversation_id: selectedConversationId,
      is_typing: Boolean(isTyping)
    }));
  }, [selectedConversationId]);
  const handleComposerChange = event => {
    setComposerValue(event.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => sendTyping(false), 700);
  };
  const handleComposerActionUnavailable = useCallback(label => {
    toast('Disponible en la siguiente fase', {
      description: `${label} se activara cuando integremos mensajes enriquecidos y documentos reales.`
    });
  }, []);
  const clearPendingImage = useCallback(() => {
    setPendingImage(current => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }, []);
  const clearPendingSharedItem = useCallback(() => {
    setPendingSharedItem(null);
  }, []);
  const handleReply = useCallback(message => {
    setReplyingTo({
      id: message.message_id,
      content: message.content || '',
      sender_name: message.sender_name || '',
      sender_id: message.sender_id || '',
      media_url: message.image_url || null
    });
  }, []);
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // CH-01: Persist emoji reaction to backend (backend toggles: same emoji = remove, different = replace)
  const handleReactToMessage = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) return;
    try {
      const res = await apiClient.post(`/chat/messages/${messageId}/react`, {
        emoji
      });
      // Update local message with new reactions from server
      setMessages(current => {
        const next = current.map(m => m.message_id === messageId ? {
          ...m,
          reactions: res?.reactions || []
        } : m);
        if (selectedConversationId) setCacheWithEviction(selectedConversationId, next);
        return next;
      });
    } catch {
      toast.error('Error al reaccionar');
    }
  }, [selectedConversationId, setCacheWithEviction]);

  // CH-02: Delete own message
  const handleDeleteMessage = useCallback(async messageId => {
    if (!messageId || !selectedConversationId) return;
    try {
      await apiClient.delete(`/chat/messages/${messageId}`);
      setMessages(current => {
        const next = current.filter(m => m.message_id !== messageId);
        setCacheWithEviction(selectedConversationId, next);
        return next;
      });
      scheduleReloadConversations();
    } catch (err) {
      toast.error(err?.response?.data?.detail || i18n.t('internal_chat.noSePudoEliminarElMensaje', 'No se pudo eliminar el mensaje'));
    }
  }, [selectedConversationId, setCacheWithEviction, scheduleReloadConversations]);

  // CH-03: Delete entire conversation
  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversationId) return;
    if (!window.confirm('¿Eliminar esta conversación? Se perderán todos los mensajes.')) return;
    try {
      await deleteConversation(selectedConversationId);
      messagesCacheRef.current.delete(selectedConversationId);
      setSelectedConversationId(null);
      setMessages([]);
      reloadConversations();
      toast.success(i18n.t('internal_chat.conversacionEliminada', 'Conversación eliminada'));
    } catch {
      toast.error(i18n.t('internal_chat.errorAlEliminarLaConversacion', 'Error al eliminar la conversación'));
    }
  }, [selectedConversationId, deleteConversation, reloadConversations]);
  // ── Message search within conversation ──
  const messageSearchTimerRef = useRef(null);
  const handleMessageSearch = useCallback((value) => {
    setMessageSearchQuery(value);
    if (messageSearchTimerRef.current) clearTimeout(messageSearchTimerRef.current);
    if (!value.trim()) { setMessageSearchResults([]); setMessageSearchLoading(false); return; }
    setMessageSearchLoading(true);
    messageSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/internal-chat/conversations/${selectedConversationId}/messages/search`, { params: { q: value.trim(), limit: 20 } });
        const data = res?.data || res;
        setMessageSearchResults(data?.messages || []);
      } catch {
        setMessageSearchResults([]);
      } finally {
        setMessageSearchLoading(false);
      }
    }, 400);
  }, [selectedConversationId]);

  const openShareSheet = useCallback(type => {
    setShareSheetType(type);
    setShareInputValue('');
    setSharePreview(null);
    setIsShareSheetOpen(true);
    setIsComposerActionsOpen(false);
  }, []);
  const closeShareSheet = useCallback(() => {
    setIsShareSheetOpen(false);
    setShareInputValue('');
    setSharePreview(null);
    setLoadingSharePreview(false);
  }, []);
  const handleLoadSharePreview = useCallback(async () => {
    const reference = resolveShareReference(shareInputValue, shareSheetType);
    if (!reference) {
      toast.error(i18n.t('internal_chat.pegaUnEnlaceOIdValidoDeHispalosho', 'Pega un enlace o ID valido de Hispaloshop.'));
      return;
    }
    setLoadingSharePreview(true);
    try {
      const data = await apiClient.get(reference.endpoint);
      const preview = buildSharedItemPreview(reference.kind, reference.id, data);
      if (!preview) {
        throw new Error(i18n.t('internal_chat.noPudimosGenerarLaVistaPrevia', 'No pudimos generar la vista previa.'));
      }
      setSharePreview(preview);
    } catch (error) {
      setSharePreview(null);
      toast.error(error?.message || 'No pudimos cargar ese contenido.');
    } finally {
      setLoadingSharePreview(false);
    }
  }, [buildSharedItemPreview, resolveShareReference, shareInputValue, shareSheetType]);
  const attachSharedItemToComposer = useCallback(() => {
    if (!sharePreview) return;
    setPendingSharedItem(sharePreview);
    closeShareSheet();
  }, [closeShareSheet, sharePreview]);
  useEffect(() => {
    clearPendingImage();
    clearPendingSharedItem();
    setIsComposerActionsOpen(false);
    setReplyingTo(null);
  }, [clearPendingImage, clearPendingSharedItem, selectedConversationId]);

  // Cleanup typing timeout on unmount
  useEffect(() => () => {
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
  }, []);
  const handleSendMessage = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!selectedConversationId || !trimmed && !pendingImage && !pendingSharedItem) return;
    const optimisticId = `local-${Date.now()}`;
    const currentReply = replyingTo;
    const optimisticMessage = {
      message_id: optimisticId,
      conversation_id: selectedConversationId,
      sender_id: user?.user_id,
      sender_name: user?.name,
      content: trimmed,
      image_url: pendingImage?.previewUrl || '',
      shared_item: pendingSharedItem || null,
      reply_to_id: currentReply?.id || null,
      reply_to_preview: currentReply ? {
        id: currentReply.id,
        content: currentReply.content,
        sender_name: currentReply.sender_name,
        sender_id: currentReply.sender_id,
        media_url: currentReply.media_url
      } : null,
      status: 'sent',
      created_at: new Date().toISOString()
    };
    setMessages(current => {
      const nextMessages = [...current, optimisticMessage];
      setCacheWithEviction(selectedConversationId, nextMessages);
      return nextMessages;
    });
    setComposerValue('');
    setReplyingTo(null);
    sendTyping(false);
    setIsComposerActionsOpen(false);
    const imageToUpload = pendingImage;
    const sharedItemToSend = pendingSharedItem;
    setPendingImage(null);
    setPendingSharedItem(null);
    try {
      let imageUrl = '';
      if (imageToUpload?.file) {
        const upload = await uploadImage({
          file: imageToUpload.file,
          conversationId: selectedConversationId
        });
        imageUrl = upload?.image_url || upload?.data?.image_url || '';
      }
      const saved = await sendHttpMessage({
        conversation_id: selectedConversationId,
        ...(trimmed ? {
          content: trimmed
        } : {}),
        ...(imageUrl ? {
          image_url: imageUrl
        } : {}),
        ...(sharedItemToSend ? {
          shared_item: sharedItemToSend
        } : {}),
        ...(currentReply?.id ? {
          reply_to_id: currentReply.id
        } : {})
      });
      setMessages(current => {
        const nextMessages = current.map(message => message.message_id === optimisticId ? {
          ...saved,
          image_url: saved.image_url || message.image_url
        } : message);
        setCacheWithEviction(selectedConversationId, nextMessages);
        return nextMessages;
      });
      if (imageToUpload?.previewUrl) {
        URL.revokeObjectURL(imageToUpload.previewUrl);
      }
      scheduleReloadConversations();
      const msgType = imageUrl ? 'image' : sharedItemToSend ? 'product' : 'text';
      trackEvent('chat_message_sent', { type: msgType, is_group: activeConversation?.type === 'group' });
    } catch (error) {
      setMessages(current => {
        const nextMessages = current.filter(message => message.message_id !== optimisticId);
        setCacheWithEviction(selectedConversationId, nextMessages);
        return nextMessages;
      });
      if (imageToUpload?.previewUrl) {
        setPendingImage(imageToUpload);
      }
      if (sharedItemToSend) {
        setPendingSharedItem(sharedItemToSend);
      }
      toast.error(error?.message || i18n.t('internal_chat.noSePudoEnviarElMensaje', 'No se pudo enviar el mensaje.'));
    }
  }, [activeConversation?.type, composerValue, pendingImage, pendingSharedItem, replyingTo, scheduleReloadConversations, setCacheWithEviction, selectedConversationId, sendHttpMessage, sendTyping, uploadImage, user?.name, user?.user_id]);
  const handleAttachImage = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedConversationId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo puedes adjuntar imagenes por ahora.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(i18n.t('internal_chat.laImagenNoPuedeSuperar5Mb', 'La imagen no puede superar 5 MB.'));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingImage(current => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return {
        file,
        previewUrl,
        name: file.name,
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`
      };
    });
    setIsComposerActionsOpen(false);
  }, [selectedConversationId]);

  // CH-08: Document upload handler
  const handleAttachDocument = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedConversationId) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG, PNG o WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(i18n.t('internal_chat.elArchivoNoPuedeSuperar10Mb', 'El archivo no puede superar 10 MB.'));
      return;
    }
    const optimisticId = `local-doc-${Date.now()}`;
    const optimistic = {
      message_id: optimisticId,
      conversation_id: selectedConversationId,
      sender_id: user?.user_id,
      sender_name: user?.name,
      content: file.name,
      message_type: 'document',
      status: 'sent',
      created_at: new Date().toISOString()
    };
    setMessages(prev => {
      const next = [...prev, optimistic];
      setCacheWithEviction(selectedConversationId, next);
      return next;
    });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await apiClient.post(`/chat/conversations/${selectedConversationId}/upload-document`, fd, {
        timeout: 30000
      });
      const fileUrl = uploadRes?.file_url;
      if (!fileUrl) throw new Error('No file URL returned');
      const saved = await sendHttpMessage({
        conversation_id: selectedConversationId,
        content: uploadRes.file_name || file.name,
        file_url: fileUrl,
        file_name: uploadRes.file_name || file.name,
        file_type: uploadRes.file_type || file.type,
        message_type: 'document'
      });
      setMessages(prev => {
        const next = prev.map(m => m.message_id === optimisticId ? {
          ...saved
        } : m);
        setCacheWithEviction(selectedConversationId, next);
        return next;
      });
      scheduleReloadConversations();
    } catch {
      setMessages(prev => {
        const next = prev.filter(m => m.message_id !== optimisticId);
        setCacheWithEviction(selectedConversationId, next);
        return next;
      });
      toast.error(i18n.t('internal_chat.errorAlSubirElDocumento', 'Error al subir el documento.'));
    }
  }, [selectedConversationId, user?.user_id, user?.name, sendHttpMessage, setCacheWithEviction, scheduleReloadConversations]);
  const visibleMessages = useMemo(() => messages.slice(-MAX_VISIBLE_MESSAGES), [messages]);
  const visibleTimeline = useMemo(() => {
    const items = [];
    let lastDayKey = null;
    visibleMessages.forEach(message => {
      const timestamp = message?.created_at || message?.read_at || message?.delivered_at;
      const date = timestamp ? new Date(timestamp) : null;
      const dayKey = date && !Number.isNaN(date.getTime()) ? date.toDateString() : 'unknown';
      if (dayKey !== lastDayKey) {
        items.push({
          type: 'separator',
          id: `separator-${dayKey}-${message.message_id}`,
          label: formatDayLabel(timestamp)
        });
        lastDayKey = dayKey;
      }
      items.push({
        type: 'message',
        id: message.message_id,
        message
      });
    });
    return items;
  }, [visibleMessages]);
  const showBackButton = isEmbedded || Boolean(onClose);
  return <div className="relative flex h-full min-h-0 overflow-hidden rounded-[32px] bg-white text-stone-950">

      {/* ── Inbox sidebar ── */}
      <div className={`flex h-full min-h-0 flex-col border-r border-stone-100 bg-white ${activeConversation ? 'hidden lg:flex lg:w-[340px]' : 'w-full'}`}>
        {/* ── Header IG-style 48px ── */}
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-stone-100">
          {onClose ? <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Cerrar chat">
              <X className="h-5 w-5" strokeWidth={2} />
            </button> : <div className="w-9" />}
          <span className="text-[15px] font-semibold tracking-tight text-stone-950">Mensajes</span>
          <button type="button" onClick={() => setIsDirectoryOpen(true)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Nuevo mensaje">
            <PenSquare className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* ── Search bar flat pill ── */}
        <div className="px-3 py-2 shrink-0">
          <label className="flex items-center gap-2.5 rounded-full bg-stone-100 px-3.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
            <input type="search" value={searchValue} onChange={event => setSearchValue(event.target.value)} placeholder="Buscar" className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400" aria-label={i18n.t('internal_chat.buscarConversacion', 'Buscar conversación')} />
          </label>
        </div>

        {/* ── Inbox tabs: Messages | Requests ── */}
        {requestConversations.length > 0 ? <div className="flex border-b border-stone-100 px-4 shrink-0">
            <button type="button" onClick={() => setInboxTab('messages')} className={`flex-1 py-2.5 text-[13px] font-semibold text-center border-b-2 transition-colors ${inboxTab === 'messages' ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-400'}`}>
              {i18n.t('chat.tab_messages', 'Mensajes')}
            </button>
            <button type="button" onClick={() => setInboxTab('requests')} className={`flex-1 py-2.5 text-[13px] font-semibold text-center border-b-2 transition-colors ${inboxTab === 'requests' ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-400'}`}>
              {i18n.t('chat.tab_requests', 'Solicitudes')} ({requestConversations.length})
            </button>
          </div> : null}

        {/* ── Conversation list flat rows ── */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? <div>
              {filteredConversations.map(conversation => {
            const isActive = conversation.conversation_id === selectedConversationId;
            const lastMessage = conversation.last_message?.content || conversation.last_message?.shared_item?.title || 'Imagen compartida';
            const unreadCount = Number(conversation.unread_count || 0);
            const isGroup = conversation.type === 'group';
            const displayName = isGroup ? conversation.group_name : conversation.other_user_name;
            const displayAvatar = isGroup ? conversation.group_avatar : conversation.other_user_avatar;
            return <button key={conversation.conversation_id} type="button" onClick={() => loadConversation(conversation.conversation_id)} className={`flex w-full min-h-[72px] items-center gap-3 px-4 py-3 text-left transition-colors active:bg-stone-50 ${isActive ? 'bg-stone-50' : 'hover:bg-stone-50'}`}>
                    <div className="shrink-0">
                      <ChatAvatar src={displayAvatar} name={displayName} alt={`Avatar de ${displayName}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-[14px] text-stone-950 ${unreadCount > 0 ? 'font-semibold' : 'font-normal'}`}>
                          {displayName}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`text-[12px] ${unreadCount > 0 ? 'font-medium text-stone-950' : 'text-stone-400'}`}>
                            {formatConversationTime(conversation.last_message?.created_at || conversation.updated_at)}
                          </span>
                          {unreadCount > 0 ? <span className="h-2 w-2 rounded-full bg-stone-950 shrink-0" /> : null}
                        </div>
                      </div>
                      <p className={`mt-0.5 truncate text-[13px] ${unreadCount > 0 ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
                        {lastMessage}
                      </p>
                    </div>
                  </button>;
          })}
            </div> : <div className="space-y-4 px-4 py-8">
              <EmptyState title="No tienes conversaciones" description={i18n.t('internal_chat.empiezaUnChatNuevoDesdeElBotonSup', 'Empieza un chat nuevo desde el botón superior y mantendrás el inbox mucho más limpio.')} />
              <button type="button" onClick={() => setIsDirectoryOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80">
                <PenSquare className="h-4 w-4" strokeWidth={2} />
                Nuevo mensaje
              </button>
            </div>}
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col ${activeConversation ? '' : 'hidden lg:flex'}`}>
        {!activeConversation ? <EmptyState title="Tus mensajes" description={i18n.t('internal_chat.seleccionaUnaConversacionDelPanelIz', 'Selecciona una conversación del panel izquierdo o inicia una nueva.')} /> : <>
            {/* ── Conversation header IG-style 48px ── */}
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-stone-100 bg-white px-3">
              {/* Back / close */}
              {showBackButton ? <button type="button" onClick={() => setSelectedConversationId(null)} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100 lg:hidden" aria-label="Volver a conversaciones">
                  <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                </button> : null}

              {/* Avatar + name (centre) */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5 cursor-pointer" onClick={() => { if (activeConversation.type === 'group') setShowGroupPanel(true); }}>
                <ChatAvatar src={activeConversation.type === 'group' ? activeConversation.group_avatar : activeConversation.other_user_avatar} name={activeConversation.type === 'group' ? activeConversation.group_name : activeConversation.other_user_name} size="h-9 w-9" alt={`Avatar de ${activeConversation.type === 'group' ? activeConversation.group_name : activeConversation.other_user_name}`} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold leading-tight text-stone-950">
                    {activeConversation.type === 'group' ? activeConversation.group_name : activeConversation.other_user_name}
                  </p>
                  {activeConversation.type === 'group' ? <p className="text-[11px] text-stone-400">{activeConversation.participant_count || '?'} {i18n.t('chat.members', 'miembros')}</p> : typingUserId ? <p className="text-[11px] text-stone-400">Escribiendo…</p> : activeConversation.is_online ? <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-stone-950" />
                      En línea
                    </p> : activeConversation.last_seen ? <p className="text-[11px] text-stone-400">
                      Últ. vez {formatTime(activeConversation.last_seen)}
                    </p> : getRoleLabel(activeConversation.other_user_role) ? <p className="text-[11px] text-stone-400">
                      {getRoleLabel(activeConversation.other_user_role)}
                    </p> : null}
                </div>
              </div>

              {/* Action icons */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={() => toast('Llamadas de voz proximamente')} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-400 transition-colors active:bg-stone-100" aria-label={i18n.t('internal_chat.llamadaDeVozProximamente', 'Llamada de voz (próximamente)')}>
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>
                <button type="button" onClick={() => toast('Videollamadas proximamente')} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-400 transition-colors active:bg-stone-100" aria-label={i18n.t('internal_chat.videollamadaProximamente', 'Videollamada (próximamente)')}>
                  <Video className="h-[20px] w-[20px]" strokeWidth={1.8} />
                </button>
                {/* Message search */}
                <button type="button" onClick={() => { setShowMessageSearch(s => !s); setMessageSearchQuery(''); setMessageSearchResults([]); }} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-400 transition-colors active:bg-stone-100" aria-label={i18n.t('chat.searchMessages', 'Buscar mensajes')}>
                  <Search className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </button>
                {/* Shopping list */}
                <button type="button" onClick={() => setIsSharedListOpen(true)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-400 transition-colors active:bg-stone-100" aria-label={i18n.t('chat.shoppingList', 'Lista de compras')}>
                  <ShoppingCart className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </button>
                {/* CH-03: Delete conversation */}
                <button type="button" onClick={handleDeleteConversation} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-400 transition-colors active:bg-stone-100" aria-label={i18n.t('chat.eliminarConversacion', 'Eliminar conversación')}>
                  <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.8} />
                </button>
                {onClose ? <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Cerrar chat">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button> : null}
              </div>
            </div>

            {/* Message search overlay */}
            {showMessageSearch && <div className="border-b border-stone-100 bg-white px-3 py-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={messageSearchQuery}
                    onChange={(e) => handleMessageSearch(e.target.value)}
                    placeholder={i18n.t('chat.searchPlaceholder', 'Buscar en esta conversacion...')}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-8 text-sm text-stone-950 outline-none focus:border-stone-400 placeholder:text-stone-400"
                    autoFocus
                  />
                  <button type="button" onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); setMessageSearchResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-stone-400" />
                  </button>
                </div>
                {messageSearchQuery.trim() && <div className="mt-2 max-h-[240px] overflow-y-auto rounded-xl border border-stone-100 bg-white">
                    {messageSearchLoading ? <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                      </div> : messageSearchResults.length === 0 ? <p className="py-4 text-center text-sm text-stone-400">{i18n.t('chat.noMessagesFound', 'No se encontraron mensajes')}</p> : messageSearchResults.map((msg) => {
                        const idx = (msg.content || '').toLowerCase().indexOf(messageSearchQuery.toLowerCase());
                        const before = (msg.content || '').slice(Math.max(0, idx - 20), idx);
                        const match = (msg.content || '').slice(idx, idx + messageSearchQuery.length);
                        const after = (msg.content || '').slice(idx + messageSearchQuery.length, idx + messageSearchQuery.length + 30);
                        return <button key={msg.message_id} type="button" onClick={() => {
                          const el = document.getElementById(`msg-${msg.message_id}`);
                          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-stone-100'); setTimeout(() => el.classList.remove('bg-stone-100'), 2000); }
                          else toast(msg.content?.slice(0, 80), { duration: 3000 });
                        }} className="flex w-full flex-col gap-0.5 border-b border-stone-50 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 last:border-b-0">
                            <span className="text-[11px] font-medium text-stone-500">{msg.sender_name}</span>
                            <span className="text-sm text-stone-700">
                              {before}<span className="font-bold text-stone-950">{match}</span>{after}
                            </span>
                            <span className="text-[10px] text-stone-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                          </button>;
                      })}
                  </div>}
              </div>}

            {/* Request inbox banner */}
            {activeConversation?.is_request && activeConversation?.request_status === 'pending' ? <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 shrink-0">
                <p className="text-[13px] text-stone-600">{i18n.t('chat.request_banner', 'Este usuario quiere enviarte un mensaje')}</p>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={async () => {
                    try { await apiClient.post(`/chat/conversations/${activeConversation.conversation_id}/accept`); reloadConversations(); toast.success(i18n.t('chat.request_accepted', 'Mensaje aceptado')); trackEvent('chat_request_accepted'); } catch { toast.error('Error'); }
                  }} className="rounded-full bg-stone-950 px-3.5 py-1.5 text-[12px] font-semibold text-white border-none cursor-pointer">
                    {i18n.t('chat.accept', 'Aceptar')}
                  </button>
                  <button type="button" onClick={async () => {
                    try {
                      const res = await apiClient.post(`/chat/conversations/${activeConversation.conversation_id}/reject`);
                      reloadConversations();
                      setSelectedConversationId(null);
                      trackEvent('chat_request_rejected');
                      if (res.suggest_block) toast(i18n.t('chat.suggest_block', 'Este usuario ha sido rechazado varias veces. Considerar bloquear.'), { duration: 5000 });
                    } catch { toast.error('Error'); }
                  }} className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-stone-700 cursor-pointer">
                    {i18n.t('chat.reject', 'Rechazar')}
                  </button>
                  <button type="button" onClick={async () => {
                    if (!window.confirm(i18n.t('chat.block_confirm', 'Bloquear a este usuario?'))) return;
                    try { await apiClient.post(`/chat/conversations/${activeConversation.conversation_id}/block`); reloadConversations(); setSelectedConversationId(null); toast.success(i18n.t('chat.user_blocked', 'Usuario bloqueado')); } catch { toast.error('Error'); }
                  }} className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-stone-500 cursor-pointer">
                    {i18n.t('chat.block', 'Bloquear')}
                  </button>
                </div>
              </div> : null}

            <div className="relative flex-1 bg-white" role="log" aria-live="polite" aria-label={i18n.t('internal_chat.mensajesDeLaConversacion', 'Mensajes de la conversación')}>
              {loadingMessages ? <LoadingConversationSkeleton /> : visibleMessages.length > 0 ? <Virtuoso ref={virtuosoRef} data={visibleTimeline} defaultItemHeight={60} itemContent={(index, item) => <div style={{
            padding: '2px 16px'
          }}>
                      {item.type === 'separator' ? <div className="flex justify-center py-1">
                          <span className="text-[11px] font-medium text-stone-400">
                            {item.label}
                          </span>
                        </div> : <MessageBubble message={item.message} isOwn={item.message.sender_id === user?.user_id} currentUserId={user?.user_id} onReply={handleReply} onReact={handleReactToMessage} onDelete={handleDeleteMessage} />}
                    </div>} followOutput="smooth" initialTopMostItemIndex={visibleTimeline.length - 1} overscan={500} style={{
            flex: 1,
            height: '100%'
          }} components={{
            Footer: () => typingUserId ? <div style={{
              padding: '2px 16px'
            }}>
                        <AnimatePresence>
                          <TypingIndicator />
                        </AnimatePresence>
                      </div> : null
          }} /> : <EmptyState title={i18n.t('internal_chat.empiezaLaConversacion', 'Empieza la conversación')} description={i18n.t('internal_chat.escribeElPrimerMensajeYMantenLaCo', 'Escribe el primer mensaje y mantén la conversación dentro de un contexto claro.')} />}
            </div>

            {/* ── Composer IG-style ── */}
            <div className="shrink-0 border-t border-stone-100 bg-white px-3 py-2" style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)'
        }}>
              {/* Reply preview */}
              <AnimatePresence>
                {replyingTo ? <motion.div initial={{
              height: 0,
              opacity: 0
            }} animate={{
              height: 'auto',
              opacity: 1
            }} exit={{
              height: 0,
              opacity: 0
            }} transition={{
              type: 'spring',
              stiffness: 400,
              damping: 35
            }} className="overflow-hidden">
                    <div className="mb-2 flex items-center gap-2 rounded-[14px] border-l-[3px] border-stone-950 bg-stone-50 px-3 py-2">
                      {replyingTo.media_url ? <img src={replyingTo.media_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-stone-950">
                          {replyingTo.sender_id === user?.user_id ? 'Tú' : replyingTo.sender_name}
                        </p>
                        <p className="truncate text-[12px] text-stone-500">
                          {replyingTo.media_url && !replyingTo.content ? 'Foto' : replyingTo.content}
                        </p>
                      </div>
                      <button type="button" onClick={cancelReply} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300" aria-label="Cancelar respuesta">
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div> : null}
              </AnimatePresence>

              {/* Actions grid — slides in above input row */}
              <AnimatePresence>
                {isComposerActionsOpen ? <motion.div initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 6
            }} transition={{
              duration: 0.15
            }} className="mb-1 grid grid-cols-3 gap-1 border-b border-stone-100 pb-1">
                    <ComposerActionButton icon={Images} label={i18n.t('chat.attach_image', 'Imagen')} onClick={() => {
                fileInputRef.current?.click();
                setIsComposerActionsOpen(false);
              }} />
                    <ComposerActionButton icon={Mic} label={i18n.t('chat.attach_audio', 'Audio')} onClick={() => {
                setIsComposerActionsOpen(false);
                setShowAudioRecorder(true);
              }} />
                    <ComposerActionButton icon={ShoppingBag} label={i18n.t('chat.attach_product', 'Producto')} onClick={() => {
                openShareSheet('product');
                setIsComposerActionsOpen(false);
              }} />
                    <ComposerActionButton icon={MapPin} label={i18n.t('chat.attach_location', 'Ubicación')} onClick={() => {
                setIsComposerActionsOpen(false);
                toast(i18n.t('chat.location_coming_soon', 'Ubicación disponible próximamente'));
              }} />
                    <ComposerActionButton icon={ShoppingCart} label={i18n.t('chat.shoppingList', 'Lista de compras')} onClick={() => {
                setIsComposerActionsOpen(false);
                setIsSharedListOpen(true);
              }} />
                    <ComposerActionButton icon={FileText} label={i18n.t('chat.attach_document', 'Documento')} onClick={() => {
                docInputRef.current?.click();
                setIsComposerActionsOpen(false);
              }} />
                  </motion.div> : null}
              </AnimatePresence>

              {/* Pending shared item preview */}
              <AnimatePresence>
                {pendingSharedItem ? <motion.div initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 6
            }} className="mb-2 flex items-start gap-2 rounded-[16px] bg-stone-50 p-2.5">
                    <div className="min-w-0 flex-1">
                      <SharedItemCard item={pendingSharedItem} compact />
                    </div>
                    <button type="button" onClick={clearPendingSharedItem} className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300" aria-label="Quitar contenido compartido">
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </motion.div> : null}
              </AnimatePresence>

              {/* Pending image preview */}
              <AnimatePresence>
                {pendingImage ? <motion.div initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 6
            }} className="mb-2 flex items-center gap-2.5 rounded-[16px] bg-stone-50 p-2.5">
                    <img src={pendingImage.previewUrl} alt={i18n.t('internal_chat.vistaPreviaDeLaImagenAdjunta', 'Vista previa de la imagen adjunta')} className="h-12 w-12 rounded-[10px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-stone-950">{pendingImage.name}</p>
                      <p className="text-[11px] text-stone-400">{pendingImage.sizeLabel}</p>
                    </div>
                    <button type="button" onClick={clearPendingImage} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300" aria-label="Quitar imagen adjunta">
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </motion.div> : null}
              </AnimatePresence>

              {/* Audio recorder overlay */}
              {showAudioRecorder ? <AudioRecorder onSend={async (blob, dur) => {
                setShowAudioRecorder(false);
                if (!selectedConversationId) return;
                try {
                  const fd = new FormData();
                  fd.append('file', blob, `voice_${Date.now()}.webm`);
                  fd.append('duration', String(Math.round(dur)));
                  const res = await apiClient.post(`/chat/conversations/${selectedConversationId}/upload-audio`, fd);
                  await sendHttpMessage({ conversation_id: selectedConversationId, content: '', message_type: 'audio', audio_url: res.audio_url, audio_duration: dur, audio_expires_at: res.audio_expires_at });
                  toast.success(i18n.t('chat.audio_sent', 'Audio enviado'));
                  trackEvent('chat_audio_recorded', { duration_seconds: Math.round(dur) });
                  trackEvent('chat_message_sent', { type: 'audio', is_group: activeConversation?.type === 'group' });
                } catch (err) { toast.error(i18n.t('chat.audio_send_error', 'Error al enviar audio')); }
              }} onClose={() => setShowAudioRecorder(false)} /> : null}

              {/* Input row */}
              {!showAudioRecorder ? <div className="flex items-center gap-1.5">
                {/* ⊕ toggle — rotates 45° to become × */}
                <motion.button type="button" animate={{
              rotate: isComposerActionsOpen ? 45 : 0
            }} transition={{
              duration: 0.2,
              ease: 'easeInOut'
            }} onClick={() => setIsComposerActionsOpen(c => !c)} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label={i18n.t('common.moreOptions', 'Más opciones')}>
                  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </motion.button>

                {/* Pill input */}
                <label className="flex min-h-[36px] flex-1 items-center rounded-full bg-stone-100 px-4 py-2">
                  <input type="text" value={composerValue} onChange={handleComposerChange} onFocus={() => setIsComposerActionsOpen(false)} onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }} placeholder="Mensaje..." className="w-full bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400" aria-label="Escribe un mensaje" />
                </label>

                {/* Right icon: camera (idle) → filled send circle (has content) */}
                <AnimatePresence mode="wait">
                  {composerValue.trim() || pendingImage || pendingSharedItem ? <motion.button key="send" type="button" initial={{
                scale: 0.5,
                opacity: 0
              }} animate={{
                scale: 1,
                opacity: 1
              }} exit={{
                scale: 0.5,
                opacity: 0
              }} transition={{
                duration: 0.14
              }} onClick={handleSendMessage} disabled={sendingMessage || uploadingImage} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition-opacity active:opacity-75 disabled:opacity-50" aria-label="Enviar">
                      {sendingMessage || uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />}
                    </motion.button> : <motion.button key="camera" type="button" initial={{
                scale: 0.5,
                opacity: 0
              }} animate={{
                scale: 1,
                opacity: 1
              }} exit={{
                scale: 0.5,
                opacity: 0
              }} transition={{
                duration: 0.14
              }} onClick={() => fileInputRef.current?.click()} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100" aria-label="Adjuntar imagen">
                      <Images className="h-[22px] w-[22px]" strokeWidth={1.8} />
                    </motion.button>}
                </AnimatePresence>
              </div> : null}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAttachImage} />
              {/* CH-08: Document upload input */}
              <input ref={docInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleAttachDocument} />
            </div>
          </>}
      </div>

      <DirectorySheet open={isDirectoryOpen} onClose={() => setIsDirectoryOpen(false)} users={filteredDirectoryUsers} loading={loadingDirectory} onStartConversation={startConversationWithUser} onGroupCreated={async (convId) => { reloadConversations(); if (convId) { await loadConversation(convId); } }} startingConversation={startingConversation} searchValue={directorySearchValue} onSearchChange={setDirectorySearchValue} roleFilter={directoryRoleFilter} onRoleFilterChange={setDirectoryRoleFilter} />
      <ShareItemSheet open={isShareSheetOpen} shareType={shareSheetType} inputValue={shareInputValue} onInputChange={setShareInputValue} onClose={closeShareSheet} onSubmit={handleLoadSharePreview} isLoading={loadingSharePreview} preview={sharePreview} onAttach={attachSharedItemToComposer} />
      {activeConversation?.type === 'group' ? <GroupChatPanel isOpen={showGroupPanel} onClose={() => setShowGroupPanel(false)} conversation={activeConversation} currentUserId={user?.user_id} onLeave={() => { setShowGroupPanel(false); setSelectedConversationId(null); reloadConversations(); }} onMuteToggle={() => reloadConversations()} /> : null}
      <SharedListPanel isOpen={isSharedListOpen} onClose={() => setIsSharedListOpen(false)} conversationId={selectedConversationId} />
    </div>;
}