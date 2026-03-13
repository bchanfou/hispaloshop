import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, Heart, MessageCircle, UserPlus,
  Package, Headphones, Star, ShoppingBag, CheckCheck, Trash2
} from 'lucide-react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useUnreadNotifications,
} from '../hooks/api/useNotifications';

// ── Icon map by notification type ────────────────────────────────
const TYPE_META = {
  like:          { icon: Heart,          bg: 'bg-stone-100', text: 'text-stone-700' },
  comment:       { icon: MessageCircle,  bg: 'bg-stone-100', text: 'text-stone-700' },
  follow:        { icon: UserPlus,       bg: 'bg-stone-100', text: 'text-stone-700' },
  order_update:  { icon: Package,        bg: 'bg-stone-100', text: 'text-stone-700' },
  support_reply: { icon: Headphones,     bg: 'bg-stone-100', text: 'text-stone-700' },
  review:        { icon: Star,           bg: 'bg-stone-100', text: 'text-stone-700' },
  purchase:      { icon: ShoppingBag,    bg: 'bg-stone-100', text: 'text-stone-700' },
  system:        { icon: Bell,           bg: 'bg-stone-100', text: 'text-stone-700' },
};

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
    <div className="flex items-start gap-3 px-4 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-stone-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-stone-200 rounded-full w-3/4" />
        <div className="h-3 bg-stone-100 rounded-full w-1/2" />
      </div>
      <div className="h-3 bg-stone-100 rounded-full w-8 flex-shrink-0" />
    </div>
  );
}

// ── Single notification row ───────────────────────────────────────
function NotifRow({ notif, onRead, onDelete }) {
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  const Icon = meta.icon;
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
      className={`flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors group ${
        isRead ? 'bg-white' : 'bg-stone-50'
      }`}
      onClick={handleClick}
    >
      {/* Icon circle */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
        <Icon className={`w-5 h-5 ${meta.text}`} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isRead ? 'text-stone-600' : 'text-stone-950 font-medium'}`}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notif.body}
          </p>
        )}
      </div>

      {/* Right column: time + unread dot + delete */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[11px] text-stone-400">
          {relativeTime(notif.created_at)}
        </span>
        <div className="flex items-center gap-1.5">
          {!isRead && (
            <span className="w-2 h-2 rounded-full bg-stone-950 flex-shrink-0" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notif.notification_id || notif._id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-stone-400 hover:text-stone-700"
            aria-label="Eliminar notificación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-5">
        <Bell className="w-7 h-7 text-stone-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-stone-950 mb-2">Todo al día</h3>
      <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
        Aquí verás likes, comentarios, actualizaciones de pedidos y más.
      </p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate  = useNavigate();
  const loaderRef = useRef(null);

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
  const grouped = notifications.reduce((acc, notif) => {
    const label = dateGroup(notif.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(notif);
    return acc;
  }, {});

  const GROUP_ORDER = ['Hoy', 'Ayer', 'Esta semana', 'Anterior'];

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto pb-20">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-stone-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700" />
            </button>
            <div>
              <h1 className="font-semibold text-stone-950">Notificaciones</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-stone-500">{unreadCount} sin leer</p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAll()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded-full transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas
            </button>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => <NotifSkeleton key={i} />)}
        </div>
      ) : notifications.length === 0 ? (
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
                  <div className="px-4 pt-5 pb-2">
                    <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                      {label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-stone-100" />

                  {items.map((notif, i) => (
                    <React.Fragment key={notif.notification_id || notif._id || i}>
                      <NotifRow
                        notif={notif}
                        onRead={markRead}
                        onDelete={deleteNotif}
                      />
                      {i < items.length - 1 && (
                        <div className="border-b border-stone-50 mx-4" />
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
                    className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
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
