import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Clapperboard,
  FileText,
  Images,
  Loader2,
  Package,
  Paperclip,
  PenSquare,
  Search,
  Send,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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

function formatDayLabel(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
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
        {message?.shared_item ? (
          <div className="mb-2">
            <SharedItemCard item={message.shared_item} compact />
          </div>
        ) : null}
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

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.12, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-stone-500"
          />
        ))}
      </div>
      <span>Escribiendo...</span>
    </motion.div>
  );
}

function LoadingConversationSkeleton() {
  return (
    <div className="relative z-10 space-y-4">
      {[0, 1, 2, 3].map((value) => (
        <div key={value} className={`flex ${value % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`space-y-2 ${value % 2 === 0 ? 'w-[58%]' : 'w-[48%]'}`}>
            <div className="h-20 animate-pulse rounded-[24px] bg-white/70 shadow-sm" />
            <div className="h-3 w-16 animate-pulse rounded-full bg-white/60" />
          </div>
        </div>
      ))}
    </div>
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

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-stone-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)]'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
      className={`flex min-w-[92px] items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${
        disabled
          ? 'cursor-not-allowed border-stone-200/70 bg-stone-100/80 text-stone-400'
          : 'border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function formatSharedPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
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
      className={`overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
        compact ? 'max-w-[320px]' : ''
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
          className="flex w-full max-w-lg flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,247,244,0.98)_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="border-b border-stone-200/70 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Compartir
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-stone-950">{title}</h3>
                <p className="mt-1 text-sm text-stone-500">{hint}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                aria-label="Cerrar compartir contenido"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center rounded-full border border-stone-200 bg-white px-4 py-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  placeholder="https://hispaloshop.com/..."
                  className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                  aria-label="Enlace del contenido a compartir"
                />
              </label>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!inputValue.trim() || isLoading}
                className="inline-flex h-11 items-center justify-center rounded-full bg-stone-950 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:bg-stone-300"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cargar'}
              </button>
            </div>
          </div>

          <div className="px-5 py-5">
            {preview ? (
              <div className="space-y-4">
                <SharedItemCard item={preview} />
                <button
                  type="button"
                  onClick={onAttach}
                  className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800"
                >
                  Adjuntar al mensaje
                </button>
              </div>
            ) : (
              <EmptyState
                title="Carga una vista previa"
                description="Al pegar un enlace valido de Hispaloshop generaremos una tarjeta compacta dentro del chat."
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
          className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,247,244,0.98)_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="border-b border-stone-200/70 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Nuevo mensaje
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-stone-950">
                  Elige a quien escribir
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Busca perfiles y empieza una conversación limpia, sin salir del chat.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                aria-label="Cerrar nuevo mensaje"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-full border border-stone-200/80 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors focus-within:border-stone-400">
              <Search className="h-4 w-4 text-stone-400" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar nombre o rol"
                className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                aria-label="Buscar usuario en directorio"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <FilterChip label="Todos" active={roleFilter === 'all'} onClick={() => onRoleFilterChange('all')} />
              <FilterChip
                label="Productores"
                active={roleFilter === 'producer'}
                onClick={() => onRoleFilterChange('producer')}
              />
              <FilterChip
                label="Influencers"
                active={roleFilter === 'influencer'}
                onClick={() => onRoleFilterChange('influencer')}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((value) => (
                  <div key={value} className="h-16 animate-pulse rounded-[24px] bg-stone-100" />
                ))}
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-2">
                {users.map((entry) => (
                  <button
                    key={entry.user_id}
                    type="button"
                    onClick={() => onStartConversation(entry.user_id)}
                    disabled={startingConversation}
                    className="flex w-full items-center justify-between rounded-[24px] border border-white/80 bg-white/90 px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ChatAvatar
                        src={entry.avatar}
                        name={entry.name}
                        alt={`Avatar de ${entry.name}`}
                        size="h-11 w-11"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-950">{entry.name}</p>
                        <p className="truncate text-xs text-stone-500">
                          {getRoleLabel(entry.role) || 'Miembro de la comunidad'}
                        </p>
                      </div>
                    </div>
                    {startingConversation ? (
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-stone-400" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No hay resultados"
                description="Prueba con otro nombre o cambia el filtro para encontrar a quien quieres escribir."
              />
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
  const [isNavigatingConversation, startConversationTransition] = useTransition();

  const wsRef = useRef(null);
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeConversationRef = useRef(null);
  const messagesCacheRef = useRef(new Map());
  const conversationsReloadTimeoutRef = useRef(null);

  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredDirectorySearchValue = useDeferredValue(directorySearchValue);

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

  useEffect(() => {
    activeConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId && sortedConversations.length > 0 && !initialChatUserId) {
      setSelectedConversationId(sortedConversations[0].conversation_id);
    }
  }, [initialChatUserId, selectedConversationId, sortedConversations]);

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
          scheduleReloadConversations();
          return;
        }

        if (payload.type === 'new_message') {
          const incomingMessage = payload.message;
          const incomingConversation = payload.conversation_id;

          scheduleReloadConversations();

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
      if (conversationsReloadTimeoutRef.current) {
        window.clearTimeout(conversationsReloadTimeoutRef.current);
      }
      socket.close();
      wsRef.current = null;
    };
  }, [markIncomingMessagesAsRead, scheduleReloadConversations, user?.user_id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typingUserId]);

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
  }, [clearPendingImage, clearPendingSharedItem, selectedConversationId]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!selectedConversationId || (!trimmed && !pendingImage && !pendingSharedItem)) return;

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage = {
      message_id: optimisticId,
      conversation_id: selectedConversationId,
      sender_id: user?.user_id,
      sender_name: user?.name,
      content: trimmed,
      image_url: pendingImage?.previewUrl || '',
      shared_item: pendingSharedItem || null,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    setMessages((current) => {
      const nextMessages = [...current, optimisticMessage];
      messagesCacheRef.current.set(selectedConversationId, nextMessages);
      return nextMessages;
    });
    setComposerValue('');
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200/80 bg-white/85 px-4 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-white hover:text-stone-950"
              >
                <PenSquare className="h-4 w-4" />
                <span className="hidden md:inline">Nuevo</span>
              </button>
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
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-full border border-stone-200/80 bg-stone-50/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors focus-within:border-stone-400 focus-within:bg-white">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar conversación"
              className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
              aria-label="Buscar conversación"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {filteredConversations.length > 0 ? (
            <div className="space-y-2">
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
                    className={`relative flex w-full items-center gap-3 rounded-[24px] border px-3 py-3.5 text-left transition-all duration-200 ease-out active:scale-[0.985] ${
                      isActive
                        ? 'border-stone-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                        : 'border-transparent bg-white/50 hover:-translate-y-[1px] hover:border-stone-200/80 hover:bg-white/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <ChatAvatar
                        src={conversation.other_user_avatar}
                        name={conversation.other_user_name}
                        alt={`Avatar de ${conversation.other_user_name}`}
                      />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white shadow-[0_8px_18px_rgba(239,68,68,0.35)]">
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
                description="Empieza un chat nuevo desde el botón superior y mantendrás el inbox mucho más limpio."
              />
              <div className="px-3">
                <button
                  type="button"
                  onClick={() => setIsDirectoryOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-stone-50"
                >
                  <PenSquare className="h-4 w-4" />
                  Nuevo mensaje
                </button>
              </div>
            </div>
          )}
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
                    {typingUserId ? (
                      <p className="mt-1 text-[11px] font-medium text-stone-400">Escribiendo ahora</p>
                    ) : null}
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
                <LoadingConversationSkeleton />
              ) : visibleMessages.length > 0 ? (
                <div className="relative z-10 space-y-4">
                  {visibleTimeline.map((item) =>
                    item.type === 'separator' ? (
                      <div key={item.id} className="flex justify-center py-1">
                        <div className="rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-medium text-stone-400 shadow-sm backdrop-blur-sm">
                          {item.label}
                        </div>
                      </div>
                    ) : (
                      <MessageBubble
                        key={item.id}
                        message={item.message}
                        isOwn={item.message.sender_id === user?.user_id}
                      />
                    )
                  )}
                  <AnimatePresence>
                    {typingUserId ? <TypingIndicator /> : null}
                  </AnimatePresence>
                  <div ref={listEndRef} />
                </div>
              ) : (
                <EmptyState
                  title="Empieza la conversación"
                  description="Escribe el primer mensaje y mantén la conversación dentro de un contexto claro."
                />
              )}
            </div>

            <div className="border-t border-white/70 bg-white/80 px-5 py-4 backdrop-blur-xl">
              <div className="space-y-3 rounded-[30px] border border-stone-200/80 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <AnimatePresence>
                  {isComposerActionsOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="grid grid-cols-2 gap-2 md:grid-cols-5"
                    >
                      <ComposerActionButton
                        icon={Images}
                        label="Imagen"
                        onClick={() => fileInputRef.current?.click()}
                      />
                      <ComposerActionButton
                        icon={FileText}
                        label="Documento"
                        badge="Soon"
                        onClick={() => handleComposerActionUnavailable('Documento')}
                      />
                      <ComposerActionButton
                        icon={Package}
                        label="Producto"
                        onClick={() => openShareSheet('product')}
                      />
                      <ComposerActionButton
                        icon={Clapperboard}
                        label="Post o reel"
                        onClick={() => openShareSheet('post')}
                      />
                      <ComposerActionButton
                        icon={UtensilsCrossed}
                        label="Receta"
                        onClick={() => openShareSheet('recipe')}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {pendingSharedItem ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <SharedItemCard item={pendingSharedItem} compact />
                        <button
                          type="button"
                          onClick={clearPendingSharedItem}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                          aria-label="Quitar contenido compartido"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {pendingImage ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="flex items-center gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3"
                    >
                      <img
                        src={pendingImage.previewUrl}
                        alt="Vista previa de la imagen adjunta"
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-950">{pendingImage.name}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          Se enviara junto al mensaje. {pendingImage.sizeLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearPendingImage}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                        aria-label="Quitar imagen adjunta"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerActionsOpen((current) => !current)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isComposerActionsOpen
                        ? 'bg-stone-950 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-950'
                    }`}
                    aria-label="Abrir acciones del mensaje"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <label className="flex min-h-[52px] min-w-0 flex-1 items-center rounded-[24px] bg-transparent px-2 py-2">
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
                      placeholder="Escribe un mensaje o adjunta algo..."
                      className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                      aria-label="Escribe un mensaje"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={(!composerValue.trim() && !pendingImage && !pendingSharedItem) || sendingMessage || uploadingImage}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)] transition-all duration-150 ease-out ${
                      (!composerValue.trim() && !pendingImage && !pendingSharedItem) || sendingMessage || uploadingImage
                        ? 'bg-stone-300'
                        : 'bg-stone-950 hover:scale-[1.03] hover:bg-stone-800 active:scale-[0.97]'
                    }`}
                    aria-label="Enviar mensaje"
                  >
                    {sendingMessage || uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
                description="Abre un chat existente o usa el botÃ³n Nuevo para empezar una conversaciÃ³n."
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

