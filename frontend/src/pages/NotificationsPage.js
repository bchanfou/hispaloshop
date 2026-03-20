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
import apiClient from '../services/api/client';

// ── Icon map by notification type ────────────────────────────────
const TYPE_META = {
  // Social
  like:            { icon: Heart,          category: 'social' },
  post_liked:      { icon: Heart,          category: 'social' },
  comment:         { icon: MessageCircle,  category: 'social' },
  post_commented:  { icon: MessageCircle,  category: 'social' },
  follow:          { icon: UserPlus,       category: 'social' },
  new_follower:    { icon: UserPlus,       category: 'social' },
  mentioned:       { icon: User,           category: 'social' },
  review:          { icon: Star,           category: 'social' },
  // Pedidos
  order_update:          { icon: Package,      category: 'pedidos' },
  order_confirmed:       { icon: Package,      category: 'pedidos' },
  order_preparing:       { icon: Package,      category: 'pedidos' },
  order_shipped:         { icon: Package,      category: 'pedidos' },
  order_delivered:       { icon: Package,      category: 'pedidos' },
  new_order:             { icon: ShoppingBag,  category: 'pedidos' },
  order_received:        { icon: ShoppingBag,  category: 'pedidos' },
  order_review_request:  { icon: Star,         category: 'pedidos' },
  purchase:              { icon: ShoppingBag,  category: 'pedidos' },
  // Ofertas / Influencer / B2B
  offer:               { icon: Tag,  category: 'ofertas' },
  commission_earned:   { icon: Tag,  category: 'ofertas' },
  tier_upgraded:       { icon: Star, category: 'ofertas' },
  payout_sent:         { icon: Tag,  category: 'ofertas' },
  b2b_offer_received:  { icon: Tag,  category: 'ofertas' },
  b2b_offer_accepted:  { icon: Tag,  category: 'ofertas' },
  b2b_contract_ready:  { icon: Tag,  category: 'ofertas' },
  b2b_contract_signed: { icon: Tag,  category: 'ofertas' },
  b2b_payment_received:{ icon: Tag,  category: 'ofertas' },
  b2b_request_rejected:{ icon: Tag,  category: 'ofertas' },
  // Sistema
  support_reply:         { icon: Headphones, category: 'sistema' },
  system:                { icon: Info,       category: 'sistema' },
  verification_approved: { icon: Info,       category: 'sistema' },
  verification_rejected: { icon: Info,       category: 'sistema' },
  certificate_expiring:  { icon: Info,       category: 'sistema' },
  moderation_hidden:     { icon: Info,       category: 'sistema' },
  moderation_restored:   { icon: Info,       category: 'sistema' },
  fiscal_certificate_ok: { icon: Info,       category: 'sistema' },
};

// Icon circle styles by category
const CATEGORY_ICON_STYLE = {
  pedidos: { bg: '#f5f5f4', color: '#0c0a09', Icon: ShoppingBag },
  social:  { bg: '#f5f5f4', color: '#0c0a09', Icon: User },
  ofertas: { bg: '#f5f5f4', color: '#0c0a09', Icon: Tag },
  sistema: { bg: '#f5f5f4', color: '#78716c', Icon: Info },
};

// ── Tab definitions ──────────────────────────────────────────────
const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'interactions', label: 'Interacciones' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'following', label: 'Siguiendo' },
];

const INTERACTION_TYPES = new Set(['like', 'comment', 'mention', 'save', 'post_liked', 'post_commented', 'mentioned', 'review']);
const ORDER_TYPES = new Set(['order_confirmed', 'order_shipped', 'order_delivered', 'order_update', 'order_preparing', 'order_received', 'new_order', 'purchase', 'order_review_request']);
const FOLLOWING_TYPES = new Set(['follow', 'follow_request', 'new_follower']);

function filterByTab(notifs, tab) {
  if (tab === 'all') return notifs;
  if (tab === 'interactions') return notifs.filter(n => INTERACTION_TYPES.has(n.type));
  if (tab === 'orders') return notifs.filter(n => ORDER_TYPES.has(n.type));
  if (tab === 'following') return notifs.filter(n => FOLLOWING_TYPES.has(n.type));
  return notifs;
}

// ── Grouping logic ───────────────────────────────────────────────
const GROUPABLE_TYPES = new Set(['like', 'post_liked', 'follow', 'new_follower']);
const WITHIN_24H = 24 * 60 * 60 * 1000;

function groupNotifications(notifs) {
  const now = Date.now();
  const buckets = {};
  const order = [];

  for (const n of notifs) {
    const age = now - new Date(n.created_at).getTime();
    const isRecent = age < WITHIN_24H;
    const entityId = n.entity_id || n.data?.entity_id || n.data?.post_id || null;

    if (isRecent && GROUPABLE_TYPES.has(n.type) && entityId) {
      const bucketKey = `${n.type}::${entityId}`;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
        order.push({ kind: 'group', key: bucketKey });
      }
      buckets[bucketKey].push(n);
    } else {
      order.push({ kind: 'single', notif: n });
    }
  }

  const result = [];
  for (const entry of order) {
    if (entry.kind === 'single') {
      result.push({ grouped: false, notif: entry.notif });
    } else {
      const members = buckets[entry.key];
      if (members.length === 1) {
        result.push({ grouped: false, notif: members[0] });
      } else {
        result.push({ grouped: true, members, type: members[0].type, entity_id: members[0].entity_id });
      }
    }
  }
  return result;
}

// ── Relative time helper ─────────────────────────────────────────
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
  if (diff < 30)  return 'Este mes';
  return 'Anterior';
}

// ── Grouped notification row (simplified: 1 avatar + count text) ─
function GroupedNotifRow({ group, onRead }) {
  const navigate = useNavigate();
  const { members, type } = group;
  const first = members[0];
  const count = members.length;
  const isLike   = type === 'like' || type === 'post_liked';
  const isFollow = type === 'follow' || type === 'new_follower';

  const firstName = first.actor_username || first.data?.actor_username || 'Alguien';
  const others = count - 1;

  let text = '';
  if (isLike) {
    text = others > 0
      ? `${firstName} y otras ${others} personas les gustó tu publicación`
      : `${firstName} les gustó tu publicación`;
  } else if (isFollow) {
    text = others > 0
      ? `${firstName} y ${others} más han empezado a seguirte`
      : `${firstName} ha empezado a seguirte`;
  } else {
    text = first.title || `${count} nuevas notificaciones`;
  }

  const allRead = members.every(n => !!n.read_at);

  const handleClick = () => {
    if (!allRead) {
      members.forEach(n => {
        if (!n.read_at) onRead(n.notification_id || n._id);
      });
    }
    const url = first.action_url || first.data?.action_url;
    if (url) navigate(url);
  };

  // First actor avatar
  const avatar = first.actor_avatar || first.data?.actor_avatar || first.sender_avatar;
  const avatarName = first.actor_username || first.data?.actor_username || '';

  // Thumbnail from first member
  const thumb = first.entity_thumbnail || first.thumbnail || first.image;
  const hasThumb = ['post', 'product', 'reel'].includes(first.entity_type) && thumb;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex items-center gap-3 cursor-pointer"
      style={{
        padding: '12px 16px',
        borderLeft: !allRead ? '3px solid #0c0a09' : '3px solid transparent',
        background: !allRead ? '#f5f5f4' : '#ffffff',
        transition: 'background 0.15s',
      }}
      onClick={handleClick}
    >
      {/* Single avatar (first actor only) */}
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#f5f5f4' }}>
        {avatar
          ? <img loading="lazy" src={avatar} alt={avatarName} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 14, fontWeight: 600, color: '#78716c' }}>{avatarName[0]?.toUpperCase() || '?'}</div>
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p style={{
          fontSize: 12, lineHeight: 1.4,
          color: '#0c0a09',
          fontWeight: allRead ? 400 : 500,
          fontFamily: 'inherit',
        }}>
          {text}
        </p>
        <p style={{ fontSize: 10, color: '#78716c', marginTop: 2 }}>
          {relativeTime(first.created_at)}
        </p>
      </div>

      {/* Thumbnail */}
      {hasThumb ? (
        <img
          src={thumb}
          alt=""
          className="w-11 h-11 rounded-2xl object-cover flex-shrink-0"
        />
      ) : (
        ['post', 'product', 'reel'].includes(first.entity_type) && (
          <div className="w-11 h-11 rounded-2xl flex-shrink-0" style={{ background: '#f5f5f4' }} />
        )
      )}
    </motion.div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{ background: '#f5f5f4' }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-3 rounded-full w-3/4"
          style={{ background: '#f5f5f4' }}
        />
        <div
          className="h-2.5 rounded-full w-1/2"
          style={{ background: '#e7e5e4' }}
        />
      </div>
      <div
        className="h-2.5 rounded-full w-8 flex-shrink-0"
        style={{ background: '#e7e5e4' }}
      />
    </div>
  );
}

// ── Single notification row ───────────────────────────────────────
function NotifRow({ notif, onRead, onDelete, followedIds, setFollowedIds }) {
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  const category = meta?.category || 'sistema';
  const catStyle = CATEGORY_ICON_STYLE[category] || CATEGORY_ICON_STYLE.sistema;
  const Icon = meta?.icon || catStyle.Icon;
  const isRead = !!notif.read_at;

  const navigate = useNavigate();

  // Follow-back state
  const isFollowType = notif.type === 'follow' || notif.type === 'new_follower';
  const actorId = notif.actor_id || notif.data?.actor_id || notif.sender_id;
  const notifKey = notif.notification_id || notif._id;
  const isFollowing = followedIds.has(notifKey);
  const [followLoading, setFollowLoading] = useState(false);

  // Avatar
  const avatar = notif.actor_avatar || notif.data?.actor_avatar || notif.sender_avatar;
  const avatarName = notif.actor_username || notif.data?.actor_username || '';

  const handleFollowBack = async (e) => {
    e.stopPropagation();
    if (!actorId || followLoading) return;
    setFollowLoading(true);
    try {
      await apiClient.post(`/users/${actorId}/follow`);
      setFollowedIds(prev => new Set([...prev, notifKey]));
    } catch {
      // silently fail — user can retry
    } finally {
      setFollowLoading(false);
    }
  };

  const handleClick = () => {
    if (!isRead) onRead(notif.notification_id || notif._id);
    const url = notif.action_url || notif.data?.action_url;
    if (url) navigate(url);
  };

  // Thumbnail
  const thumb = notif.entity_thumbnail || notif.thumbnail || notif.image;
  const hasThumb = ['post', 'product', 'reel'].includes(notif.entity_type) && thumb;
  const showThumbPlaceholder = ['post', 'product', 'reel'].includes(notif.entity_type) && !thumb;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex items-center gap-3 cursor-pointer"
      style={{
        padding: '10px 16px',
        borderLeft: !isRead ? '3px solid #0c0a09' : '3px solid transparent',
        background: !isRead ? '#f5f5f4' : '#ffffff',
        transition: 'background 0.15s',
      }}
      onClick={handleClick}
    >
      {/* Avatar (40px) with icon badge */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: '#f5f5f4' }}>
          {avatar
            ? <img loading="lazy" src={avatar} alt={avatarName} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 14, fontWeight: 600, color: '#78716c' }}>{avatarName[0]?.toUpperCase() || '?'}</div>
          }
        </div>
        {/* Category icon badge */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
          style={{ background: catStyle.bg }}
        >
          <Icon style={{ width: 10, height: 10, color: catStyle.color }} strokeWidth={2} />
        </div>
      </div>

      {/* Content + timestamp */}
      <div className="flex-1 min-w-0">
        <p style={{
          fontSize: 13,
          lineHeight: 1.4,
          color: '#0c0a09',
          fontWeight: isRead ? 400 : 500,
          fontFamily: 'inherit',
        }}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="mt-0.5 line-clamp-2" style={{
            fontSize: 12,
            color: '#78716c',
            lineHeight: 1.4,
          }}>
            {notif.body}
          </p>
        )}
        <span style={{ fontSize: 11, color: '#a8a29e', marginTop: 2, display: 'inline-block' }}>
          {relativeTime(notif.created_at)}
        </span>
      </div>

      {/* Follow-back button */}
      {isFollowType && actorId && (
        <button
          onClick={handleFollowBack}
          disabled={followLoading}
          className="rounded-full text-[11px] font-semibold cursor-pointer flex-shrink-0"
          style={{
            padding: '6px 16px',
            border: isFollowing ? '1px solid #e7e5e4' : 'none',
            background: isFollowing ? '#ffffff' : '#0c0a09',
            color: isFollowing ? '#78716c' : '#ffffff',
            fontFamily: 'inherit',
            opacity: followLoading ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
          aria-label={isFollowing ? 'Ya sigues a este usuario' : 'Seguir a este usuario'}
        >
          {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      )}

      {/* Thumbnail */}
      {hasThumb ? (
        <img
          src={thumb}
          alt=""
          className="w-11 h-11 rounded-2xl object-cover flex-shrink-0"
        />
      ) : showThumbPlaceholder ? (
        <div className="w-11 h-11 rounded-2xl flex-shrink-0" style={{ background: '#f5f5f4' }} />
      ) : null}

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif.notification_id || notif._id); }}
        className="p-1 flex items-center justify-center flex-shrink-0"
        style={{ color: '#78716c', background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Eliminar notificación"
      >
        <Trash2 className="text-stone-400 hover:text-stone-600" style={{ width: 14, height: 14 }} />
      </button>
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
      <Bell size={48} className="text-stone-300" strokeWidth={1.5} />
      <h3 className="mt-4 text-lg font-semibold text-stone-950">
        Todo al día
      </h3>
      <p className="mt-1 text-sm text-stone-500" style={{ maxWidth: 280 }}>
        Aquí verás likes, comentarios, actualizaciones de pedidos y más.
      </p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate  = useNavigate();
  const loaderRef = useRef(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // Follow state (Set of notification ids that have been followed)
  const [followedIds, setFollowedIds] = useState(new Set());

  const {
    data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
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

  // Apply tab filter
  const tabFiltered = filterByTab(notifications, activeTab);

  // Group notifications
  const groupedItems = groupNotifications(tabFiltered);

  // "Limpiar todo" handler
  const handleClearAll = async () => {
    try {
      // TODO: replace with DELETE /notifications/all when endpoint is available
      await apiClient.delete('/notifications/all');
      refetch();
    } catch {
      // Fallback: mark all as read
      markAll();
    }
  };

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

  // Group by date label
  const byDate = groupedItems.reduce((acc, item) => {
    const dateStr = item.grouped ? item.members[0].created_at : item.notif.created_at;
    const label = dateGroup(dateStr);
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  const GROUP_ORDER = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anterior'];

  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-20" style={{ background: '#fafaf9' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e7e5e4',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: back arrow */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="p-2 -ml-2 rounded-full transition-opacity"
            style={{ color: '#0c0a09' }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>

          {/* Center: title */}
          <h1 style={{
            fontWeight: 600,
            color: '#0c0a09',
            fontFamily: 'inherit',
            fontSize: 16,
          }}>
            Notificaciones
          </h1>

          {/* Right: Limpiar | Leído */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearAll}
              className="text-xs px-2 py-1 transition-colors"
              style={{
                color: '#78716c',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              aria-label="Limpiar todas las notificaciones"
            >
              Limpiar
            </button>
            <span style={{ color: '#e7e5e4', fontSize: 12 }}>|</span>
            <button
              onClick={() => markAll()}
              className="text-xs px-2 py-1 transition-colors"
              style={{
                color: '#78716c',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              aria-label="Marcar todo como leído"
            >
              Leído
            </button>
          </div>
        </div>

        {/* Horizontal tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: '#e7e5e4' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 transition-colors"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#0c0a09' : '#78716c',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #0c0a09' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => <NotifSkeleton key={i} />)}
        </div>
      ) : groupedItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <AnimatePresence>
            {GROUP_ORDER.map((label) => {
              const items = byDate[label];
              if (!items?.length) return null;

              return (
                <div key={label}>
                  {/* Group header */}
                  <div style={{ padding: '10px 16px 6px' }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0c0a09',
                      fontFamily: 'inherit',
                    }}>
                      {label}
                    </span>
                  </div>

                  {items.map((item, i) => (
                    <React.Fragment key={
                      item.grouped
                        ? `group-${item.type}-${item.entity_id}-${i}`
                        : (item.notif.notification_id || item.notif._id || i)
                    }>
                      {item.grouped ? (
                        <GroupedNotifRow group={item} onRead={markRead} />
                      ) : (
                        <NotifRow
                          notif={item.notif}
                          onRead={markRead}
                          onDelete={deleteNotif}
                          followedIds={followedIds}
                          setFollowedIds={setFollowedIds}
                        />
                      )}
                      {i < items.length - 1 && (
                        <div className="ml-[68px] mr-4" style={{ borderBottom: '1px solid #f5f5f4' }} />
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
                      background: '#78716c',
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
