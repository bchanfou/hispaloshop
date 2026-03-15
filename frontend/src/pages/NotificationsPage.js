import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, Heart, MessageCircle, UserPlus,
  Package, Headphones, Star, ShoppingBag, CheckCheck, Trash2,
  Tag, User, Info
} from 'lucide-react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useUnreadNotifications,
} from '../hooks/api/useNotifications';

// ── Category mapping for filter pills ────────────────────────────
const TYPE_TO_CATEGORY = {
  like: 'social',
  comment: 'social',
  follow: 'social',
  order_update: 'pedidos',
  purchase: 'pedidos',
  support_reply: 'sistema',
  review: 'social',
  system: 'sistema',
  offer: 'ofertas',
};

// ── Icon map by notification type (v2 tokens) ────────────────────
const TYPE_META = {
  like:          { icon: Heart,          category: 'social' },
  comment:       { icon: MessageCircle,  category: 'social' },
  follow:        { icon: UserPlus,       category: 'social' },
  order_update:  { icon: Package,        category: 'pedidos' },
  support_reply: { icon: Headphones,     category: 'sistema' },
  review:        { icon: Star,           category: 'social' },
  purchase:      { icon: ShoppingBag,    category: 'pedidos' },
  system:        { icon: Info,           category: 'sistema' },
  offer:         { icon: Tag,            category: 'ofertas' },
};

// Icon circle styles by category
const CATEGORY_ICON_STYLE = {
  pedidos: { bg: 'var(--color-green-light)', color: 'var(--color-green)', Icon: ShoppingBag },
  social:  { bg: '#E8F0FE', color: '#1a73e8', Icon: User },
  ofertas: { bg: 'var(--color-amber-light)', color: 'var(--color-amber)', Icon: Tag },
  sistema: { bg: 'var(--color-surface)', color: 'var(--color-stone)', Icon: Info },
};

// ── Filter pills ────────────────────────────────────────────────
const FILTERS = [
  { key: 'todo', label: 'Todo' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'social', label: 'Social' },
  { key: 'ofertas', label: 'Ofertas' },
  { key: 'sistema', label: 'Sistema' },
];

// ── Relative time helper ──────────────────────────────────────────
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'ahora';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  < 7)  return `${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── Date group label ─────────────────────────────────────────────
function dateGroup(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const diff  = Math.floor((today - d) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff <  7)  return 'Esta semana';
  return 'Anterior';
}

// ── Skeleton ─────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div
        className="w-6 h-6 rounded-full flex-shrink-0"
        style={{ background: 'var(--color-surface)' }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-3 rounded-full w-3/4"
          style={{ background: 'var(--color-surface)' }}
        />
        <div
          className="h-2.5 rounded-full w-1/2"
          style={{ background: 'var(--color-border)' }}
        />
      </div>
      <div
        className="h-2.5 rounded-full w-8 flex-shrink-0"
        style={{ background: 'var(--color-border)' }}
      />
    </div>
  );
}

// ── Single notification row ───────────────────────────────────────
function NotifRow({ notif, onRead, onDelete }) {
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  const category = meta.category || 'sistema';
  const catStyle = CATEGORY_ICON_STYLE[category] || CATEGORY_ICON_STYLE.sistema;
  const Icon = meta.icon || catStyle.Icon;
  const isRead = !!notif.read_at;

  const handleClick = () => {
    if (!isRead) onRead(notif.notification_id || notif._id);
    if (notif.action_url) window.location.href = notif.action_url;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex items-start gap-3 cursor-pointer group"
      style={{
        padding: '12px 16px',
        borderLeft: !isRead ? '3px solid var(--color-green)' : '3px solid transparent',
        background: !isRead ? 'var(--color-surface)' : 'var(--color-white)',
        transition: 'background 0.15s',
      }}
      onClick={handleClick}
    >
      {/* Icon circle */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: catStyle.bg }}
      >
        <Icon style={{ width: 14, height: 14, color: catStyle.color }} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p style={{
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--color-black)',
          fontWeight: isRead ? 400 : 500,
          fontFamily: 'var(--font-sans)',
        }}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="mt-0.5 line-clamp-2" style={{
            fontSize: 11,
            color: 'var(--color-stone)',
            lineHeight: 1.5,
          }}>
            {notif.body}
          </p>
        )}
      </div>

      {/* Right column: time + delete */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span style={{ fontSize: 10, color: 'var(--color-stone)' }}>
          {relativeTime(notif.created_at)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif.notification_id || notif._id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
          style={{ color: 'var(--color-stone)' }}
          aria-label="Eliminar notificación"
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-8 text-center"
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--color-black)',
        fontFamily: 'var(--font-sans)',
        marginBottom: 8,
      }}>
        Todo al día
      </h3>
      <p style={{
        fontSize: 14,
        color: 'var(--color-stone)',
        lineHeight: 1.6,
        maxWidth: 280,
      }}>
        Aquí verás likes, comentarios, actualizaciones de pedidos y más.
      </p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate  = useNavigate();
  const loaderRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('todo');

  const {
    data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage,
  } = useNotifications();

  const { data: unreadData } = useUnreadNotifications();
  const { mutate: markRead }    = useMarkAsRead();
  const { mutate: markAll }     = useMarkAllAsRead();
  const { mutate: deleteNotif } = useDeleteNotification();

  const unreadCount = unreadData?.count ?? 0;

  // Flatten pages
  const notifications = data?.pages?.flatMap(
    (p) => p.notifications ?? p.items ?? p ?? []
  ) ?? [];

  // Filter notifications by active pill
  const filteredNotifications = activeFilter === 'todo'
    ? notifications
    : notifications.filter((n) => (TYPE_TO_CATEGORY[n.type] || 'sistema') === activeFilter);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Group notifications by date label
  const grouped = filteredNotifications.reduce((acc, notif) => {
    const label = dateGroup(notif.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(notif);
    return acc;
  }, {});

  const GROUP_ORDER = ['Hoy', 'Ayer', 'Esta semana', 'Anterior'];

  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-20" style={{ background: 'var(--color-cream)' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="p-2 -ml-2 rounded-full transition-opacity"
              style={{ color: 'var(--color-black)' }}
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
            <div>
              <h1 style={{
                fontWeight: 600,
                color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)',
                fontSize: 16,
              }}>
                Notificaciones
              </h1>
              {unreadCount > 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-stone)' }}>
                  {unreadCount} sin leer
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAll()}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-opacity"
              style={{
                fontSize: 12,
                color: 'var(--color-stone)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <CheckCheck style={{ width: 14, height: 14 }} />
              Marcar todo como leído
            </button>
          )}
        </div>
      </div>

      {/* ── Filter pills ──────────────────────────────────────── */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex-shrink-0 px-4 py-1.5 transition-colors"
              style={{
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                background: isActive ? 'var(--color-black)' : 'var(--color-white)',
                color: isActive ? '#fff' : 'var(--color-black)',
                border: isActive ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => <NotifSkeleton key={i} />)}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <AnimatePresence>
            {GROUP_ORDER.map((label) => {
              const items = grouped[label];
              if (!items?.length) return null;

              return (
                <div key={label}>
                  {/* Group header */}
                  <div style={{ padding: '8px 16px' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--color-stone)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-sans)',
                    }}>
                      {label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{ borderBottom: '1px solid var(--color-border)' }} />

                  {items.map((notif, i) => (
                    <React.Fragment key={notif.notification_id || notif._id || i}>
                      <NotifRow
                        notif={notif}
                        onRead={markRead}
                        onDelete={deleteNotif}
                      />
                      {i < items.length - 1 && (
                        <div className="mx-4" style={{ borderBottom: '1px solid var(--color-border)' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}
          </AnimatePresence>

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="py-6 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: 'var(--color-stone)',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
