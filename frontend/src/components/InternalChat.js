import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Clapperboard,
  FileText,
  Images,
  Loader2,
  Package,
  PenSquare,
  Phone,
  Search,
  Reply,
  Send,
  UserPlus,
  UtensilsCrossed,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient, { getWSUrl } from '../services/api/client';
import { getToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useInternalChatData } from '../features/chat/hooks/useInternalChatData';
import { useSwipeToReply } from '../hooks/useSwipeToReply';

const MAX_VISIBLE_MESSAGES = 150;

// Module-level formatter singletons
const timeFormatter = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
const longDateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

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
  const label =
    status === 'read' ? 'Leído'
      : status === 'delivered' ? 'Entregado'
        : status === 'sent' ? 'Enviado'
          : '';

  return (
    <div
      className={`mt-1.5 flex items-center gap-2 px-1 text-[11px] ${
        isOwn ? 'justify-end text-stone-400' : 'text-stone-400'
      }`}
    >
      <span>{formatTime(message?.read_at || message?.delivered_at || message?.created_at)}</span>
      {isOwn && label ? <span>{label}</span> : null}
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function ReplyPreviewInline({ preview }) {
  if (!preview) return null;
  return (
    <div className="mb-0.5 flex items-center gap-2 rounded-t-[14px] border-l-[3px] border-stone-950 bg-stone-50 px-3 py-2">
      {preview.media_url ? (
        <img
          src={preview.media_url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-stone-950">{preview.sender_name}</p>
        <p className="truncate text-[12px] text-stone-500">
          {preview.media_url && !preview.content ? '📷 Foto' : preview.content}
        </p>
      </div>
    </div>
  );
}

const MessageBubble = React.memo(function MessageBubble({ message, isOwn, onReply }) {
  const [reaction, setReaction]       = useState(null);
  const [showPicker, setShowPicker]   = useState(false);
  const [showReplyBtn, setShowReplyBtn] = useState(false);
  const pressTimerRef                 = useRef(null);
  const { elRef, handlers: swipeHandlers } = useSwipeToReply(() => onReply?.(message));

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

  const handleReact = (emoji) => {
    setReaction((prev) => (prev === emoji ? null : emoji));
    setShowPicker(false);
  };

  const hasReplyPreview = Boolean(message?.reply_to_preview);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`relative flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowReplyBtn(true)}
      onMouseLeave={() => setShowReplyBtn(false)}
      {...swipeHandlers}
    >
      {/* Reply icon visible during swipe */}
      <div
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-30 ${isOwn ? 'right-1' : 'left-1'}`}
      >
        <Reply className="h-[18px] w-[18px] text-stone-950" />
      </div>

      {/* Desktop hover reply button */}
      <AnimatePresence>
        {showReplyBtn && !showPicker ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            onClick={() => onReply?.(message)}
            className={`absolute top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-stone-100 bg-white shadow-sm transition-colors hover:bg-stone-50 md:flex ${
              isOwn ? '-left-9' : '-right-9'
            }`}
            style={{ width: 28, height: 28 }}
            aria-label="Responder"
          >
            <Reply className="h-[13px] w-[13px] text-stone-600" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div ref={elRef} className={`relative min-w-0 max-w-[78%] sm:max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Emoji picker — aparece al pulsar largo */}
        <AnimatePresence>
          {showPicker ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onPointerDown={() => setShowPicker(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 6 }}
                transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
                className={`absolute bottom-full z-50 mb-2 flex items-center gap-1 rounded-full border border-stone-100 bg-white px-2 py-1.5 shadow-[0_8px_28px_rgba(15,15,15,0.15)] ${
                  isOwn ? 'right-0' : 'left-0'
                }`}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[20px] transition-transform hover:scale-125 active:scale-110 ${
                      reaction === emoji ? 'bg-stone-100' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        {/* Reply preview — inline above the bubble */}
        {hasReplyPreview ? <ReplyPreviewInline preview={message.reply_to_preview} /> : null}

        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="select-none"
        >
          {message?.shared_item ? (
            <div className="mb-1.5">
              <SharedItemCard item={message.shared_item} compact />
            </div>
          ) : null}
          {message?.image_url ? (
            <div className={`mb-1.5 overflow-hidden rounded-[18px] ${isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}>
              <img
                src={message.image_url}
                alt="Imagen compartida en el chat"
                loading="lazy"
                onError={(e) => { e.target.alt = 'No se pudo cargar la imagen'; e.target.className = 'hidden'; }}
                className="max-w-[260px] object-cover"
              />
            </div>
          ) : null}
          {message?.content ? (
            <div
              className={`px-3.5 py-2.5 text-[15px] leading-[1.4] whitespace-pre-wrap break-words ${
                isOwn
                  ? `${hasReplyPreview ? 'rounded-b-[20px] rounded-br-[4px]' : 'rounded-[20px] rounded-br-[4px]'} bg-stone-950 text-white`
                  : `${hasReplyPreview ? 'rounded-b-[20px] rounded-bl-[4px]' : 'rounded-[20px] rounded-bl-[4px]'} bg-stone-100 text-stone-950`
              }`}
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              {message.content}
            </div>
          ) : null}
        </div>

        {/* Reaction pill */}
        <AnimatePresence>
          {reaction ? (
            <motion.button
              key={reaction}
              type="button"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setReaction(null)}
              className={`mt-1 flex w-fit items-center gap-1 rounded-full border border-stone-100 bg-white px-2 py-0.5 text-[14px] shadow-sm ${
                isOwn ? 'ml-auto' : ''
              }`}
            >
              {reaction}
            </motion.button>
          ) : null}
        </AnimatePresence>

        <MessageStatus message={message} isOwn={isOwn} />
      </div>
    </motion.div>
  );
});

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="inline-flex items-center gap-1 rounded-[20px] rounded-bl-[4px] bg-stone-100 px-3.5 py-3"
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.15, ease: 'easeInOut' }}
          className="h-1.5 w-1.5 rounded-full bg-stone-500"
        />
      ))}
    </motion.div>
  );
}

function LoadingConversationSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((value) => (
        <div key={value} className={`flex ${value % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`space-y-2 ${value % 2 === 0 ? 'w-[58%]' : 'w-[48%]'}`}>
            <div className="h-12 animate-pulse rounded-[20px] bg-stone-100" />
            <div className="h-2.5 w-14 animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-stone-400">
        Hispaloshop
      </div>
      <h3 className="mt-4 text-lg font-medium text-stone-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{description}</p>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-stone-950 text-white'
          : 'bg-stone-100 text-stone-600 active:bg-stone-200'
      }`}
    >
      {label}
    </button>
  );
}

function ComposerActionButton({ icon: Icon, label, onClick, disabled = false, badge = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1.5 rounded-[14px] px-2 py-2.5 transition-colors active:bg-stone-50 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
        <Icon className="h-[18px] w-[18px] text-stone-800" strokeWidth={1.8} />
      </div>
      <span className="text-[10px] font-medium text-stone-600">{label}</span>
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-stone-300 px-1.5 py-px text-[9px] font-semibold text-stone-600">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

const sharedPriceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

function formatSharedPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return sharedPriceFormatter.format(amount);
}

function SharedItemCard({ item, compact = false }) {
  if (!item) return null;

  const badgeLabel =
    item.kind === 'product'
      ? 'Producto'
      : item.kind === 'recipe'
        ? 'Receta'
        : item.kind === 'reel'
          ? 'Reel'
          : 'Post';

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={`overflow-hidden rounded-[18px] border border-stone-100 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${
        compact ? 'max-w-[300px]' : ''
      }`}
    >
      {item.image_url ? (
        <div className={compact ? 'h-36 w-full' : 'h-44 w-full'}>
          <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
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
          <a
            href={item.href}
            className="inline-flex shrink-0 items-center rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800"
          >
            Abrir
          </a>
        </div>
      </div>
    </motion.div>
  );
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
  onAttach,
}) {
  if (!open) return null;

  const title =
    shareType === 'product'
      ? 'Compartir producto'
      : shareType === 'recipe'
        ? 'Compartir receta'
        : 'Compartir post o reel';

  const hint =
    shareType === 'product'
      ? 'Pega un enlace de producto o su ID.'
      : shareType === 'recipe'
        ? 'Pega un enlace de receta o su ID.'
        : 'Pega un enlace de post o reel de Hispaloshop.';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 flex items-end justify-center bg-stone-950/28 p-3 backdrop-blur-sm md:items-center md:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-stone-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.12)]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-[15px] font-semibold text-stone-950">{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
              aria-label="Cerrar compartir contenido"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="border-b border-stone-100 px-4 py-3">
            <p className="mb-3 text-[12px] text-stone-400">{hint}</p>
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center rounded-full bg-stone-100 px-4 py-2.5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  placeholder="https://hispaloshop.com/..."
                  className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400"
                  aria-label="Enlace del contenido a compartir"
                />
              </label>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!inputValue.trim() || isLoading}
                className="inline-flex h-9 items-center justify-center rounded-full bg-stone-950 px-4 text-[13px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-30"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cargar'}
              </button>
            </div>
          </div>

          <div className="px-4 py-4">
            {preview ? (
              <div className="space-y-3">
                <SharedItemCard item={preview} />
                <button
                  type="button"
                  onClick={onAttach}
                  className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80"
                >
                  Adjuntar al mensaje
                </button>
              </div>
            ) : (
              <EmptyState
                title="Carga una vista previa"
                description="Pega un enlace válido de Hispaloshop para generar una tarjeta compacta."
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DirectorySheet({
  open,
  onClose,
  users,
  loading,
  onStartConversation,
  startingConversation,
  searchValue,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 flex items-end justify-center bg-stone-950/24 p-3 backdrop-blur-sm md:items-center md:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-stone-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.12)]"
        >
          {/* Compact header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-[15px] font-semibold text-stone-950">Nuevo mensaje</span>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
              aria-label="Cerrar nuevo mensaje"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Search + filters */}
          <div className="shrink-0 border-b border-stone-100 px-3 py-2.5">
            <label className="flex items-center gap-2.5 rounded-full bg-stone-100 px-3.5 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar nombre o rol"
                className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400"
                aria-label="Buscar usuario en directorio"
              />
            </label>
            <div className="mt-2.5 flex flex-wrap gap-1.5 px-0.5">
              <FilterChip label="Todos" active={roleFilter === 'all'} onClick={() => onRoleFilterChange('all')} />
              <FilterChip label="Productores" active={roleFilter === 'producer'} onClick={() => onRoleFilterChange('producer')} />
              <FilterChip label="Influencers" active={roleFilter === 'influencer'} onClick={() => onRoleFilterChange('influencer')} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-px px-4 py-3">
                {[0, 1, 2, 3].map((value) => (
                  <div key={value} className="flex items-center gap-3 py-3">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-stone-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 animate-pulse rounded-full bg-stone-100" />
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length > 0 ? (
              <div>
                {users.map((entry) => (
                  <button
                    key={entry.user_id}
                    type="button"
                    onClick={() => onStartConversation(entry.user_id)}
                    disabled={startingConversation}
                    className="flex w-full min-h-[64px] items-center gap-3 px-4 py-3 text-left transition-colors active:bg-stone-50 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <ChatAvatar
                      src={entry.avatar}
                      name={entry.name}
                      alt={`Avatar de ${entry.name}`}
                      size="h-11 w-11"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-stone-950">{entry.name}</p>
                      <p className="truncate text-[12px] text-stone-400">
                        {getRoleLabel(entry.role) || 'Miembro de la comunidad'}
                      </p>
                    </div>
                    {startingConversation ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-400" />
                    ) : (
                      <UserPlus className="h-4 w-4 shrink-0 text-stone-300" strokeWidth={1.8} />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8">
                <EmptyState
                  title="No hay resultados"
                  description="Prueba con otro nombre o cambia el filtro."
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [directorySearchValue, setDirectorySearchValue] = useState('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('all');
  const [isComposerActionsOpen, setIsComposerActionsOpen] = useState(false);
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
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeConversationRef = useRef(null);
  const messagesCacheRef = useRef(new Map());
  const conversationsReloadTimeoutRef = useRef(null);
  const markIncomingReadRef = useRef(null);
  const scheduleReloadRef = useRef(null);

  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredDirectorySearchValue = useDeferredValue(directorySearchValue);

  const sortedConversations = useMemo(
    () =>
      [...(Array.isArray(conversations) ? conversations : [])].sort((a, b) => {
        const left = new Date(b.updated_at || b.created_at || 0).getTime();
        const right = new Date(a.updated_at || a.created_at || 0).getTime();
        return left - right;
      }),
    [conversations]
  );

  const directoryUsers = useMemo(() => {
    const registry = new Map();
    [...(Array.isArray(producers) ? producers : []), ...(Array.isArray(influencers) ? influencers : [])].forEach((entry) => {
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

  const filteredDirectoryUsers = useMemo(() => {
    const query = deferredDirectorySearchValue.trim().toLowerCase();

    return directoryUsers.filter((entry) => {
      const roleMatches = directoryRoleFilter === 'all' || entry.role === directoryRoleFilter;
      if (!roleMatches) return false;

      if (!query) return true;

      const haystack = [entry.name, getRoleLabel(entry.role), entry.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredDirectorySearchValue, directoryRoleFilter, directoryUsers]);

  const filteredConversations = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();
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
  }, [deferredSearchValue, sortedConversations]);

  const activeConversation = useMemo(
    () =>
      sortedConversations.find((conversation) => conversation.conversation_id === selectedConversationId) || null,
    [selectedConversationId, sortedConversations]
  );

  const resolveShareReference = useCallback((rawValue, forcedType) => {
    const value = rawValue.trim();
    if (!value) return null;

    const normalized = value.startsWith('http') ? value : `https://hispaloshop.local/${value.replace(/^\/+/, '')}`;

    try {
      const parsed = new URL(normalized);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const [resource, identifier] = segments;

      if (resource === 'products' && identifier) {
        return { endpoint: `/products/${identifier}`, kind: 'product', id: identifier };
      }

      if (resource === 'recipes' && identifier) {
        return { endpoint: `/recipes/${identifier}`, kind: 'recipe', id: identifier };
      }

      if ((resource === 'posts' || resource === 'reels') && identifier) {
        return { endpoint: `/posts/${identifier}`, kind: resource === 'reels' ? 'reel' : 'post', id: identifier };
      }
    } catch {
      // Fall back to raw ID handling below.
    }

    if (forcedType === 'product') {
      return { endpoint: `/products/${value}`, kind: 'product', id: value };
    }

    if (forcedType === 'recipe') {
      return { endpoint: `/recipes/${value}`, kind: 'recipe', id: value };
    }

    return { endpoint: `/posts/${value}`, kind: 'post', id: value };
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
        href: `/products/${id}`,
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
        href: `/recipes/${id}`,
      };
    }

    const postKind = payload.type === 'reel' || kind === 'reel' ? 'reel' : 'post';
    const primaryMedia =
      payload.image_url ||
      payload.media_url ||
      payload.thumbnail_url ||
      payload.media?.[0]?.thumbnail_url ||
      payload.media?.[0]?.url ||
      null;

    return {
      kind: postKind,
      id,
      title: payload.user_name || payload.author_name || payload.user?.name || 'Publicacion',
      subtitle: payload.caption || payload.content || 'Contenido social compartido',
      image_url: primaryMedia,
      meta: postKind === 'reel' ? 'Reel' : 'Post',
      href: `/posts/${id}`,
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

      setMessages((current) => {
        const nextMessages = current.map((message) =>
          unreadIds.includes(message.message_id)
            ? { ...message, status: 'read', read_at: new Date().toISOString() }
            : message
        );
        messagesCacheRef.current.set(conversationId, nextMessages);
        return nextMessages;
      });
      scheduleReloadConversations();
    },
    [scheduleReloadConversations, selectedConversationId, user?.user_id]
  );

  useEffect(() => {
    activeConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Keep refs in sync — avoids WebSocket effect depending on callback identity
  useEffect(() => { markIncomingReadRef.current = markIncomingMessagesAsRead; }, [markIncomingMessagesAsRead]);
  useEffect(() => { scheduleReloadRef.current = scheduleReloadConversations; }, [scheduleReloadConversations]);

  useEffect(() => {
    if (!selectedConversationId && sortedConversations.length > 0 && !initialChatUserId) {
      setSelectedConversationId(sortedConversations[0].conversation_id);
    }
  }, [initialChatUserId, selectedConversationId, sortedConversations]);

  const loadConversation = useCallback(
    async (conversationId) => {
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
        messagesCacheRef.current.set(conversationId, normalizedMessages);
        startConversationTransition(() => {
          setMessages(normalizedMessages);
        });

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'join_conversation', conversation_id: conversationId }));
        }

        if (normalizedMessages.length > 0) {
          await markIncomingMessagesAsRead(normalizedMessages, conversationId);
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
          setIsDirectoryOpen(false);
          setDirectorySearchValue('');
          setDirectoryRoleFilter('all');
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

    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let intentionalClose = false;

    function connect() {
      const socket = new WebSocket(getWSUrl('/ws/chat'));
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        socket.send(JSON.stringify({ type: 'auth', token }));
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
              setMessages((current) => {
                const nextMessages = current.map((message) =>
                  message.sender_id === user.user_id
                    ? { ...message, status: 'read', read_at: payload.read_at || new Date().toISOString() }
                    : message
                );
                messagesCacheRef.current.set(changedConversation, nextMessages);
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
              setMessages((current) => {
                if (current.some((message) => message.message_id === incomingMessage.message_id)) {
                  return current;
                }
                const nextMessages = [...current, incomingMessage];
                messagesCacheRef.current.set(incomingConversation, nextMessages);
                return nextMessages;
              });

              if (incomingMessage.sender_id !== user.user_id) {
                markIncomingReadRef.current?.([incomingMessage], incomingConversation);
              }
            }
          }
        } catch {
          // WebSocket message processing error — silently ignored in production
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
  }, [user?.user_id]);

  // Scroll to bottom is handled by Virtuoso followOutput="smooth".
  // This explicit scroll is a fallback for typing indicator toggling.
  // visibleTimeline is a useMemo defined further down; effects run after render
  // so the value is always available at effect-execution time.
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: Math.max(0, messages.length - 1),
        behavior: 'smooth',
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

  const handleComposerActionUnavailable = useCallback((label) => {
    toast('Disponible en la siguiente fase', {
      description: `${label} se activara cuando integremos mensajes enriquecidos y documentos reales.`,
    });
  }, []);

  const clearPendingImage = useCallback(() => {
    setPendingImage((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }, []);

  const clearPendingSharedItem = useCallback(() => {
    setPendingSharedItem(null);
  }, []);

  const handleReply = useCallback((message) => {
    setReplyingTo({
      id: message.message_id,
      content: message.content || '',
      sender_name: message.sender_name || '',
      sender_id: message.sender_id || '',
      media_url: message.image_url || null,
    });
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const openShareSheet = useCallback((type) => {
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
      toast.error('Pega un enlace o ID valido de Hispaloshop.');
      return;
    }

    setLoadingSharePreview(true);
    try {
      const data = await apiClient.get(reference.endpoint);
      const preview = buildSharedItemPreview(reference.kind, reference.id, data);
      if (!preview) {
        throw new Error('No pudimos generar la vista previa.');
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
    if (!selectedConversationId || (!trimmed && !pendingImage && !pendingSharedItem)) return;

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
        media_url: currentReply.media_url,
      } : null,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    setMessages((current) => {
      const nextMessages = [...current, optimisticMessage];
      messagesCacheRef.current.set(selectedConversationId, nextMessages);
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
        const upload = await uploadImage({ file: imageToUpload.file, conversationId: selectedConversationId });
        imageUrl = upload?.image_url || upload?.data?.image_url || '';
      }

      const saved = await sendHttpMessage({
        conversation_id: selectedConversationId,
        ...(trimmed ? { content: trimmed } : {}),
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(sharedItemToSend ? { shared_item: sharedItemToSend } : {}),
        ...(currentReply?.id ? { reply_to_id: currentReply.id } : {}),
      });
      setMessages((current) => {
        const nextMessages = current.map((message) => (message.message_id === optimisticId ? { ...saved } : message));
        messagesCacheRef.current.set(selectedConversationId, nextMessages);
        return nextMessages;
      });
      if (imageToUpload?.previewUrl) {
        URL.revokeObjectURL(imageToUpload.previewUrl);
      }
      scheduleReloadConversations();
    } catch (error) {
      setMessages((current) => {
        const nextMessages = current.filter((message) => message.message_id !== optimisticId);
        messagesCacheRef.current.set(selectedConversationId, nextMessages);
        return nextMessages;
      });
      if (imageToUpload?.previewUrl) {
        setPendingImage(imageToUpload);
      }
      if (sharedItemToSend) {
        setPendingSharedItem(sharedItemToSend);
      }
      toast.error(error?.message || 'No se pudo enviar el mensaje.');
    }
  }, [
    composerValue,
    pendingImage,
    pendingSharedItem,
    replyingTo,
    scheduleReloadConversations,
    selectedConversationId,
    sendHttpMessage,
    sendTyping,
    uploadImage,
    user?.name,
    user?.user_id,
  ]);

  const handleAttachImage = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !selectedConversationId) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Solo puedes adjuntar imagenes por ahora.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar 5 MB.');
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      setPendingImage((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return {
          file,
          previewUrl,
          name: file.name,
          sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        };
      });

      setIsComposerActionsOpen(false);
    },
    [selectedConversationId]
  );

  const visibleMessages = useMemo(() => messages.slice(-MAX_VISIBLE_MESSAGES), [messages]);
  const visibleTimeline = useMemo(() => {
    const items = [];
    let lastDayKey = null;

    visibleMessages.forEach((message) => {
      const timestamp = message?.created_at || message?.read_at || message?.delivered_at;
      const date = timestamp ? new Date(timestamp) : null;
      const dayKey = date && !Number.isNaN(date.getTime()) ? date.toDateString() : 'unknown';

      if (dayKey !== lastDayKey) {
        items.push({
          type: 'separator',
          id: `separator-${dayKey}-${message.message_id}`,
          label: formatDayLabel(timestamp),
        });
        lastDayKey = dayKey;
      }

      items.push({
        type: 'message',
        id: message.message_id,
        message,
      });
    });

    return items;
  }, [visibleMessages]);
  const showBackButton = isEmbedded || Boolean(onClose);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-[32px] bg-white text-stone-950">

      {/* ── Inbox sidebar ── */}
      <div
        className={`flex h-full min-h-0 w-full flex-col border-r border-stone-100 bg-white ${
          activeConversation ? 'max-md:hidden md:w-[340px]' : ''
        }`}
      >
        {/* ── Header IG-style 48px ── */}
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-stone-100">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
              aria-label="Cerrar chat"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <span className="text-[15px] font-semibold tracking-tight text-stone-950">Mensajes</span>
          <button
            type="button"
            onClick={() => setIsDirectoryOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
            aria-label="Nuevo mensaje"
          >
            <PenSquare className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* ── Search bar flat pill ── */}
        <div className="px-3 py-2 shrink-0">
          <label className="flex items-center gap-2.5 rounded-full bg-stone-100 px-3.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar"
              className="w-full bg-transparent text-[13px] text-stone-950 outline-none placeholder:text-stone-400"
              aria-label="Buscar conversación"
            />
          </label>
        </div>

        {/* ── Conversation list flat rows ── */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            <div>
              {filteredConversations.map((conversation) => {
                const isActive = conversation.conversation_id === selectedConversationId;
                const lastMessage =
                  conversation.last_message?.content ||
                  conversation.last_message?.shared_item?.title ||
                  'Imagen compartida';
                const unreadCount = Number(conversation.unread_count || 0);

                return (
                  <button
                    key={conversation.conversation_id}
                    type="button"
                    onClick={() => loadConversation(conversation.conversation_id)}
                    className={`flex w-full min-h-[72px] items-center gap-3 px-4 py-3 text-left transition-colors active:bg-stone-50 ${
                      isActive ? 'bg-stone-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="shrink-0">
                      <ChatAvatar
                        src={conversation.other_user_avatar}
                        name={conversation.other_user_name}
                        alt={`Avatar de ${conversation.other_user_name}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-[14px] text-stone-950 ${
                            unreadCount > 0 ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {conversation.other_user_name}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`text-[12px] ${unreadCount > 0 ? 'font-medium text-stone-950' : 'text-stone-400'}`}>
                            {formatConversationTime(conversation.last_message?.created_at || conversation.updated_at)}
                          </span>
                          {unreadCount > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-stone-950 shrink-0" />
                          ) : null}
                        </div>
                      </div>
                      <p className={`mt-0.5 truncate text-[13px] ${unreadCount > 0 ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
                        {lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 px-4 py-8">
              <EmptyState
                title="No tienes conversaciones"
                description="Empieza un chat nuevo desde el botón superior y mantendrás el inbox mucho más limpio."
              />
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80"
              >
                <PenSquare className="h-4 w-4" strokeWidth={2} />
                Nuevo mensaje
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col ${activeConversation ? '' : 'max-md:hidden'}`}>
        {activeConversation ? (
          <>
            {/* ── Conversation header IG-style 48px ── */}
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-stone-100 bg-white px-3">
              {/* Back / close */}
              {showBackButton ? (
                <button
                  type="button"
                  onClick={() => setSelectedConversationId(null)}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100 md:hidden"
                  aria-label="Volver a conversaciones"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                </button>
              ) : null}

              {/* Avatar + name (centre) */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <ChatAvatar
                  src={activeConversation.other_user_avatar}
                  name={activeConversation.other_user_name}
                  size="h-9 w-9"
                  alt={`Avatar de ${activeConversation.other_user_name}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold leading-tight text-stone-950">
                    {activeConversation.other_user_name}
                  </p>
                  {typingUserId ? (
                    <p className="text-[11px] text-stone-400">Escribiendo…</p>
                  ) : getRoleLabel(activeConversation.other_user_role) ? (
                    <p className="text-[11px] text-stone-400">
                      {getRoleLabel(activeConversation.other_user_role)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Action icons */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
                  aria-label="Llamada de voz"
                >
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
                  aria-label="Videollamada"
                >
                  <Video className="h-[20px] w-[20px]" strokeWidth={1.8} />
                </button>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
                    aria-label="Cerrar chat"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative flex-1 bg-white" role="log" aria-live="polite" aria-label="Mensajes de la conversación">
              {loadingMessages ? (
                <LoadingConversationSkeleton />
              ) : visibleMessages.length > 0 ? (
                <Virtuoso
                  ref={virtuosoRef}
                  data={visibleTimeline}
                  estimatedItemSize={60}
                  itemContent={(index, item) => (
                    <div style={{ padding: '2px 16px' }}>
                      {item.type === 'separator' ? (
                        <div className="flex justify-center py-1">
                          <span className="text-[11px] font-medium text-stone-400">
                            {item.label}
                          </span>
                        </div>
                      ) : (
                        <MessageBubble
                          message={item.message}
                          isOwn={item.message.sender_id === user?.user_id}
                          onReply={handleReply}
                        />
                      )}
                    </div>
                  )}
                  followOutput="smooth"
                  initialTopMostItemIndex={visibleTimeline.length - 1}
                  overscan={500}
                  style={{ flex: 1, height: '100%' }}
                  components={{
                    Footer: () => typingUserId ? (
                      <div style={{ padding: '2px 16px' }}>
                        <AnimatePresence>
                          <TypingIndicator />
                        </AnimatePresence>
                      </div>
                    ) : null,
                  }}
                />
              ) : (
                <EmptyState
                  title="Empieza la conversación"
                  description="Escribe el primer mensaje y mantén la conversación dentro de un contexto claro."
                />
              )}
            </div>

            {/* ── Composer IG-style ── */}
            <div
              className="shrink-0 border-t border-stone-100 bg-white px-3 py-2"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
            >
              {/* Reply preview */}
              <AnimatePresence>
                {replyingTo ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-2 flex items-center gap-2 rounded-[14px] border-l-[3px] border-stone-950 bg-stone-50 px-3 py-2">
                      {replyingTo.media_url ? (
                        <img
                          src={replyingTo.media_url}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-stone-950">
                          {replyingTo.sender_id === user?.user_id ? 'Tú' : replyingTo.sender_name}
                        </p>
                        <p className="truncate text-[12px] text-stone-500">
                          {replyingTo.media_url && !replyingTo.content ? '📷 Foto' : replyingTo.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelReply}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300"
                        aria-label="Cancelar respuesta"
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Actions grid — slides in above input row */}
              <AnimatePresence>
                {isComposerActionsOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="mb-1 grid grid-cols-5 border-b border-stone-100 pb-1"
                  >
                    <ComposerActionButton
                      icon={Images}
                      label="Imagen"
                      onClick={() => { fileInputRef.current?.click(); setIsComposerActionsOpen(false); }}
                    />
                    <ComposerActionButton
                      icon={FileText}
                      label="Documento"
                      badge="Soon"
                      disabled
                      onClick={() => handleComposerActionUnavailable('Documento')}
                    />
                    <ComposerActionButton
                      icon={Package}
                      label="Producto"
                      onClick={() => { openShareSheet('product'); setIsComposerActionsOpen(false); }}
                    />
                    <ComposerActionButton
                      icon={Clapperboard}
                      label="Post"
                      onClick={() => { openShareSheet('post'); setIsComposerActionsOpen(false); }}
                    />
                    <ComposerActionButton
                      icon={UtensilsCrossed}
                      label="Receta"
                      onClick={() => { openShareSheet('recipe'); setIsComposerActionsOpen(false); }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Pending shared item preview */}
              <AnimatePresence>
                {pendingSharedItem ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mb-2 flex items-start gap-2 rounded-[16px] bg-stone-50 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <SharedItemCard item={pendingSharedItem} compact />
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingSharedItem}
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300"
                      aria-label="Quitar contenido compartido"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Pending image preview */}
              <AnimatePresence>
                {pendingImage ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mb-2 flex items-center gap-2.5 rounded-[16px] bg-stone-50 p-2.5"
                  >
                    <img
                      src={pendingImage.previewUrl}
                      alt="Vista previa de la imagen adjunta"
                      className="h-12 w-12 rounded-[10px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-stone-950">{pendingImage.name}</p>
                      <p className="text-[11px] text-stone-400">{pendingImage.sizeLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingImage}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors active:bg-stone-300"
                      aria-label="Quitar imagen adjunta"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Input row */}
              <div className="flex items-center gap-1.5">
                {/* ⊕ toggle — rotates 45° to become × */}
                <motion.button
                  type="button"
                  animate={{ rotate: isComposerActionsOpen ? 45 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  onClick={() => setIsComposerActionsOpen((c) => !c)}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
                  aria-label="Más opciones"
                >
                  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </motion.button>

                {/* Pill input */}
                <label className="flex min-h-[36px] flex-1 items-center rounded-full bg-stone-100 px-4 py-2">
                  <input
                    type="text"
                    value={composerValue}
                    onChange={handleComposerChange}
                    onFocus={() => setIsComposerActionsOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Mensaje..."
                    className="w-full bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                    aria-label="Escribe un mensaje"
                  />
                </label>

                {/* Right icon: camera (idle) → filled send circle (has content) */}
                <AnimatePresence mode="wait">
                  {composerValue.trim() || pendingImage || pendingSharedItem ? (
                    <motion.button
                      key="send"
                      type="button"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      onClick={handleSendMessage}
                      disabled={sendingMessage || uploadingImage}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition-opacity active:opacity-75 disabled:opacity-50"
                      aria-label="Enviar"
                    >
                      {sendingMessage || uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" strokeWidth={2} />
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      key="camera"
                      type="button"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-stone-800 transition-colors active:bg-stone-100"
                      aria-label="Adjuntar imagen"
                    >
                      <Images className="h-[22px] w-[22px]" strokeWidth={1.8} />
                    </motion.button>
                  )}
                </AnimatePresence>
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
            title="Selecciona una conversación"
            description="Abre un chat existente o pulsa ✏ para empezar una conversación nueva."
          />
        )}
      </div>

      <DirectorySheet
        open={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        users={filteredDirectoryUsers}
        loading={loadingDirectory}
        onStartConversation={startConversationWithUser}
        startingConversation={startingConversation}
        searchValue={directorySearchValue}
        onSearchChange={setDirectorySearchValue}
        roleFilter={directoryRoleFilter}
        onRoleFilterChange={setDirectoryRoleFilter}
      />
      <ShareItemSheet
        open={isShareSheetOpen}
        shareType={shareSheetType}
        inputValue={shareInputValue}
        onInputChange={setShareInputValue}
        onClose={closeShareSheet}
        onSubmit={handleLoadSharePreview}
        isLoading={loadingSharePreview}
        preview={sharePreview}
        onAttach={attachSharedItemToComposer}
      />
    </div>
  );
}

