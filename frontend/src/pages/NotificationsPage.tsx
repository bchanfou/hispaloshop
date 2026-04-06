// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Package, Headphones, Star, ShoppingBag, CheckCheck, Trash2, Tag, User, Info } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkBatchAsRead, useMarkAllAsRead, useDeleteNotification, useUnreadNotifications } from '../hooks/api/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

// ── Icon map by notification type ────────────────────────────────
import i18n from "../locales/i18n";
const TYPE_META = {
  // Social
  like: {
    icon: Heart,
    category: 'social'
  },
  post_liked: {
    icon: Heart,
    category: 'social'
  },
  new_like: {
    icon: Heart,
    category: 'social'
  },
  comment: {
    icon: MessageCircle,
    category: 'social'
  },
  post_commented: {
    icon: MessageCircle,
    category: 'social'
  },
  new_comment: {
    icon: MessageCircle,
    category: 'social'
  },
  follow: {
    icon: UserPlus,
    category: 'social'
  },
  new_follower: {
    icon: UserPlus,
    category: 'social'
  },
  new_follow_request: {
    icon: UserPlus,
    category: 'social'
  },
  follow_request_accepted: {
    icon: UserPlus,
    category: 'social'
  },
  story_like: {
    icon: Heart,
    category: 'social'
  },
  story_reply: {
    icon: MessageCircle,
    category: 'social'
  },
  mentioned: {
    icon: User,
    category: 'social'
  },
  review: {
    icon: Star,
    category: 'social'
  },
  // Pedidos
  order_update: {
    icon: Package,
    category: 'pedidos'
  },
  order_confirmed: {
    icon: Package,
    category: 'pedidos'
  },
  order_preparing: {
    icon: Package,
    category: 'pedidos'
  },
  order_shipped: {
    icon: Package,
    category: 'pedidos'
  },
  order_delivered: {
    icon: Package,
    category: 'pedidos'
  },
  new_order: {
    icon: ShoppingBag,
    category: 'pedidos'
  },
  order_received: {
    icon: ShoppingBag,
    category: 'pedidos'
  },
  order_review_request: {
    icon: Star,
    category: 'pedidos'
  },
  purchase: {
    icon: ShoppingBag,
    category: 'pedidos'
  },
  order_payment_failed: {
    icon: Package,
    category: 'pedidos'
  },
  new_product: {
    icon: ShoppingBag,
    category: 'pedidos'
  },
  // Ofertas / Influencer / B2B
  offer: {
    icon: Tag,
    category: 'ofertas'
  },
  commission_earned: {
    icon: Tag,
    category: 'ofertas'
  },
  tier_upgraded: {
    icon: Star,
    category: 'ofertas'
  },
  payout_sent: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_offer_received: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_offer_accepted: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_contract_ready: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_contract_signed: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_payment_received: {
    icon: Tag,
    category: 'ofertas'
  },
  b2b_request_rejected: {
    icon: Tag,
    category: 'ofertas'
  },
  // Sistema
  support_reply: {
    icon: Headphones,
    category: 'sistema'
  },
  system: {
    icon: Info,
    category: 'sistema'
  },
  verification_approved: {
    icon: Info,
    category: 'sistema'
  },
  verification_rejected: {
    icon: Info,
    category: 'sistema'
  },
  certificate_expiring: {
    icon: Info,
    category: 'sistema'
  },
  moderation_hidden: {
    icon: Info,
    category: 'sistema'
  },
  moderation_restored: {
    icon: Info,
    category: 'sistema'
  },
  fiscal_certificate_ok: {
    icon: Info,
    category: 'sistema'
  },
  level_up: {
    icon: Star,
    category: 'sistema'
  },
  predict_overdue: {
    icon: Info,
    category: 'sistema'
  }
};

// Icon circle styles by category
const CATEGORY_ICON_STYLE = {
  pedidos: {
    bg: 'bg-stone-100',
    color: 'text-stone-950',
    Icon: ShoppingBag
  },
  social: {
    bg: 'bg-stone-100',
    color: 'text-stone-950',
    Icon: User
  },
  ofertas: {
    bg: 'bg-stone-100',
    color: 'text-stone-950',
    Icon: Tag
  },
  sistema: {
    bg: 'bg-stone-100',
    color: 'text-stone-500',
    Icon: Info
  }
};

// ── Category-based tab definitions ──────────────────────────────
// Maps each TYPE_META category to a tab. Tabs are dynamic — only shown if the user has notifs of that category.
const CATEGORY_TABS = [
  { key: 'all', labelKey: 'notif_center.tab_all', fallback: 'Todo' },
  { key: 'social', labelKey: 'notif_center.tab_social', fallback: 'Social' },
  { key: 'pedidos', labelKey: 'notif_center.tab_orders', fallback: 'Pedidos' },
  { key: 'ofertas', labelKey: 'notif_center.tab_earnings', fallback: 'Ganancias' },
  { key: 'sistema', labelKey: 'notif_center.tab_system', fallback: 'Sistema' },
];

function getNotifCategory(n) {
  return TYPE_META[n.type]?.category || 'sistema';
}

function filterByTab(notifs, tab) {
  if (tab === 'all') return notifs;
  return notifs.filter(n => getNotifCategory(n) === tab);
}

// ── Grouping logic ───────────────────────────────────────────────
const GROUPABLE_TYPES = new Set(['like', 'post_liked', 'new_like', 'follow', 'new_follower']);
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
        order.push({
          kind: 'group',
          key: bucketKey
        });
      }
      buckets[bucketKey].push(n);
    } else {
      order.push({
        kind: 'single',
        notif: n
      });
    }
  }
  const result = [];
  for (const entry of order) {
    if (entry.kind === 'single') {
      result.push({
        grouped: false,
        notif: entry.notif
      });
    } else {
      const members = buckets[entry.key];
      if (members.length === 1) {
        result.push({
          grouped: false,
          notif: members[0]
        });
      } else {
        result.push({
          grouped: true,
          members,
          type: members[0].type,
          entity_id: members[0].entity_id
        });
      }
    }
  }
  return result;
}

// ── Relative time helper ─────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

// ── Date group label ─────────────────────────────────────────────
function dateGroup(dateStr) {
  if (!dateStr) return 'Anterior';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Anterior';
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff < 0) return 'Hoy';
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return 'Esta semana';
  if (diff < 30) return 'Este mes';
  return 'Anterior';
}

// ── Grouped notification row (simplified: 1 avatar + count text) ─
function GroupedNotifRow({
  group,
  onBatchRead
}) {
  const navigate = useNavigate();
  const {
    members,
    type
  } = group;
  const first = members[0];
  const count = members.length;
  const isLike = type === 'like' || type === 'post_liked' || type === 'new_like';
  const isFollow = type === 'follow' || type === 'new_follower' || type === 'follow_request_accepted';
  const firstName = first.actor_username || first.data?.actor_username || 'Alguien';
  const others = count - 1;
  let text = '';
  if (isLike) {
    text = others > 0 ? `A ${firstName} y otras ${others} personas les gustó tu publicación` : `A ${firstName} le gustó tu publicación`;
  } else if (isFollow) {
    text = others > 0 ? `${firstName} y ${others} más han empezado a seguirte` : `${firstName} ha empezado a seguirte`;
  } else {
    text = first.title || `${count} nuevas notificaciones`;
  }
  const allRead = members.every(n => !!n.read_at);
  const handleClick = () => {
    if (!allRead) {
      const unreadIds = members.filter(n => !n.read_at).map(n => n.notification_id || n._id);
      if (unreadIds.length > 0) onBatchRead(unreadIds);
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
  return <motion.div layout initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    x: -40
  }} className={`flex items-center gap-3 cursor-pointer px-4 py-3 transition-colors duration-150 ${!allRead ? 'border-l-[3px] border-stone-950 bg-stone-100' : 'border-l-[3px] border-transparent bg-white'}`} onClick={handleClick}>
      {/* Single avatar (first actor only) */}
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-stone-100">
        {avatar ? <img loading="lazy" src={avatar} alt={avatarName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-stone-500">{avatarName[0]?.toUpperCase() || '?'}</div>}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-[1.4] text-stone-950 ${allRead ? 'font-normal' : 'font-medium'}`}>
          {text}
        </p>
        <p className="text-[10px] text-stone-500 mt-0.5">
          {relativeTime(first.created_at)}
        </p>
      </div>

      {/* Thumbnail */}
      {hasThumb ? <img src={thumb} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0" /> : ['post', 'product', 'reel'].includes(first.entity_type) && <div className="w-11 h-11 rounded-2xl shrink-0 bg-stone-100" />}
    </motion.div>;
}

// ── Skeleton ─────────────────────────────────────────────────────
function NotifSkeleton() {
  return <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div className="w-10 h-10 rounded-full shrink-0 bg-stone-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full w-3/4 bg-stone-100" />
        <div className="h-2.5 rounded-full w-1/2 bg-stone-200" />
      </div>
      <div className="h-2.5 rounded-full w-8 shrink-0 bg-stone-200" />
    </div>;
}

// ── Single notification row (swipe-to-delete) ────────────────────
function NotifRow({
  notif,
  onRead,
  onDelete,
  followedIds,
  setFollowedIds
}) {
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  const category = meta?.category || 'sistema';
  const catStyle = CATEGORY_ICON_STYLE[category] || CATEGORY_ICON_STYLE.sistema;
  const Icon = meta?.icon || catStyle.Icon;
  const isRead = !!notif.read_at;
  const navigate = useNavigate();
  const notifKey = notif.notification_id || notif._id;

  // N-05: Auto mark-as-read when notification enters viewport
  const rowRef = useRef(null);
  const markedRef = useRef(isRead);
  useEffect(() => {
    if (markedRef.current || isRead) return;
    const el = rowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !markedRef.current) {
        markedRef.current = true;
        onRead(notifKey);
      }
    }, {
      threshold: 0.5
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isRead, notifKey, onRead]);

  // Swipe-to-delete state
  const [showDelete, setShowDelete] = useState(false);
  const SWIPE_THRESHOLD = -60;

  // Long-press state
  const longPressTimer = useRef(null);
  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => setShowDelete(true), 500);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Follow-back state
  const isFollowType = notif.type === 'follow' || notif.type === 'new_follower' || notif.type === 'new_follow_request' || notif.type === 'follow_request_accepted';
  const actorId = notif.actor_id || notif.data?.actor_id || notif.sender_id;
  const isFollowing = actorId ? followedIds.has(actorId) : false;
  const [followLoading, setFollowLoading] = useState(false);

  // Avatar
  const avatar = notif.actor_avatar || notif.data?.actor_avatar || notif.sender_avatar;
  const avatarName = notif.actor_username || notif.data?.actor_username || '';
  const handleFollowBack = async e => {
    e.stopPropagation();
    if (!actorId || followLoading) return;
    setFollowLoading(true);
    try {
      await apiClient.post(`/users/${actorId}/follow`);
      setFollowedIds(prev => new Set([...prev, actorId]));
    } catch (err) {
      setFollowedIds(prev => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });
      toast.error('Error al seguir al usuario');
    } finally {
      setFollowLoading(false);
    }
  };
  const handleClick = () => {
    if (showDelete) {
      setShowDelete(false);
      return;
    }
    if (!isRead) onRead(notifKey);
    const url = notif.action_url || notif.data?.action_url;
    trackEvent('notification_clicked', { type: notif.type, action_url: url || '' });
    if (url) navigate(url);
  };

  // Thumbnail
  const thumb = notif.entity_thumbnail || notif.thumbnail || notif.image;
  const hasThumb = ['post', 'product', 'reel'].includes(notif.entity_type) && thumb;
  const showThumbPlaceholder = ['post', 'product', 'reel'].includes(notif.entity_type) && !thumb;
  return <div ref={rowRef} className="relative overflow-hidden">
      {/* Delete zone (revealed on swipe) */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center w-[72px] bg-stone-800">
        <button onClick={e => {
        e.stopPropagation();
        trackEvent('notification_deleted', { type: notif.type });
        onDelete(notifKey);
      }} className="flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer" aria-label={i18n.t('notif_center.delete', 'Eliminar notificacion')}>
          <Trash2 className="w-[18px] h-[18px] text-white" strokeWidth={1.8} />
          <span className="text-[10px] text-white font-medium">Eliminar</span>
        </button>
      </div>

      {/* Swipeable foreground row */}
      <motion.div layout initial={{
      opacity: 0,
      y: 8
    }} animate={{
      opacity: 1,
      y: 0,
      x: showDelete ? -72 : 0
    }} exit={{
      opacity: 0,
      x: -300
    }} drag="x" dragDirectionLock dragConstraints={{
      left: -72,
      right: 0
    }} dragElastic={0.1} onDragEnd={(_e, info) => {
      if (info.offset.x < SWIPE_THRESHOLD) {
        setShowDelete(true);
      } else {
        setShowDelete(false);
      }
    }} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className={`flex items-center gap-3 cursor-pointer relative z-[1] px-4 py-2.5 ${!isRead ? 'border-l-[3px] border-stone-950 bg-stone-100' : 'border-l-[3px] border-transparent bg-white'}`} style={{
      transition: showDelete ? 'none' : 'background 0.15s'
    }} onClick={handleClick}>
        {/* Avatar (40px) with icon badge */}
        <div className="relative w-10 h-10 shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100">
            {avatar ? <img loading="lazy" src={avatar} alt={avatarName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-stone-500">{avatarName[0]?.toUpperCase() || '?'}</div>}
          </div>
          {/* Category icon badge */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${catStyle.bg}`}>
            <Icon className={`w-[10px] h-[10px] ${catStyle.color}`} strokeWidth={2} />
          </div>
        </div>

        {/* Content + timestamp */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] leading-[1.4] text-stone-950 ${isRead ? 'font-normal' : 'font-medium'}`}>
            {notif.title}
          </p>
          {notif.body && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500 leading-[1.4]">
              {notif.body}
            </p>}
          <span className="text-[11px] text-stone-400 mt-0.5 inline-block">
            {relativeTime(notif.created_at)}
          </span>
        </div>

        {/* Follow-back button */}
        {isFollowType && actorId && <button onClick={handleFollowBack} disabled={followLoading} className={`rounded-full text-[11px] font-semibold cursor-pointer shrink-0 px-4 py-2 min-h-[44px] transition-all duration-150 ${isFollowing ? 'border border-stone-200 bg-white text-stone-500' : 'border-none bg-stone-950 text-white'}`} style={{
        opacity: followLoading ? 0.6 : 1
      }} aria-label={isFollowing ? 'Ya sigues a este usuario' : 'Seguir a este usuario'}>
            {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>}

        {/* Thumbnail */}
        {hasThumb ? <img src={thumb} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0" /> : showThumbPlaceholder ? <div className="w-11 h-11 rounded-2xl shrink-0 bg-stone-100" /> : null}
      </motion.div>
    </div>;
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyState() {
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <Bell size={48} className="text-stone-300" strokeWidth={1.5} />
      <h3 className="mt-4 text-lg font-semibold text-stone-950">
        {i18n.t('notif_center.empty_title', 'Estas al dia')}
      </h3>
      <p className="mt-1 text-sm text-stone-500 max-w-[280px]">
        {i18n.t('notif_center.empty_body', 'No hay nada nuevo. Aqui veras likes, pedidos y mas.')}
      </p>
    </motion.div>;
}

// ── Main page ─────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate = useNavigate();
  const loaderRef = useRef(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Analytics: track page view
  useEffect(() => {
    trackEvent('notifications_viewed', { unread_count: 0 });
  }, []);

  // Refresh badge count when page opens
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ['notifications', 'unread']
    });
  }, [queryClient]);

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // Follow state — initialize from notification data (is_following field)
  const [followedIds, setFollowedIds] = useState(new Set());
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  } = useNotifications();
  const {
    data: unreadData
  } = useUnreadNotifications();
  const {
    mutate: markRead
  } = useMarkAsRead();
  const {
    mutate: markBatch
  } = useMarkBatchAsRead();
  const {
    mutate: markAll
  } = useMarkAllAsRead();
  const {
    mutate: deleteNotif
  } = useDeleteNotification();
  const unreadCount = unreadData?.unread_count ?? 0;

  // N-06: Seed followedIds from notification data on load
  useEffect(() => {
    if (!data?.pages) return;
    const alreadyFollowing = new Set();
    data.pages.forEach(p => {
      (p.notifications ?? p.items ?? []).forEach(n => {
        const aid = n.actor_id || n.data?.actor_id || n.sender_id;
        if (aid && (n.is_following || n.data?.is_following)) alreadyFollowing.add(aid);
      });
    });
    if (alreadyFollowing.size > 0) {
      setFollowedIds(prev => {
        const merged = new Set(prev);
        alreadyFollowing.forEach(id => merged.add(id));
        return merged;
      });
    }
  }, [data]);

  // Flatten pages
  const notifications = data?.pages?.flatMap(p => p.notifications ?? p.items ?? p ?? []) ?? [];

  // Unread count per category tab
  const unreadByTab = useMemo(() => {
    const counts = { all: 0, social: 0, pedidos: 0, ofertas: 0, sistema: 0 };
    notifications.forEach(n => {
      if (n.read_at) return;
      counts.all++;
      const cat = getNotifCategory(n);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [notifications]);

  // Only show tabs that have at least 1 notification (total, not just unread)
  const visibleTabs = useMemo(() => {
    const catCounts = { social: 0, pedidos: 0, ofertas: 0, sistema: 0 };
    notifications.forEach(n => {
      const cat = getNotifCategory(n);
      if (catCounts[cat] !== undefined) catCounts[cat]++;
    });
    return CATEGORY_TABS.filter(tab => tab.key === 'all' || catCounts[tab.key] > 0);
  }, [notifications]);

  // Apply tab filter
  const tabFiltered = filterByTab(notifications, activeTab);

  // Group notifications
  const groupedItems = groupNotifications(tabFiltered);

  // Delete all notifications
  const handleClearAll = async () => {
    try {
      await apiClient.delete('/notifications/all');
      await refetch();
      await queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread']
      });
      toast.success('Notificaciones eliminadas');
    } catch {
      toast.error(i18n.t('notifications.noSePudieronEliminarLasNotificacion', 'No se pudieron eliminar las notificaciones'));
    }
  };

  // Infinite scroll observer
  const handleObserver = useCallback(entries => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '0px 0px 200px 0px'
    });
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
  return <div className="min-h-screen max-w-[600px] mx-auto pb-20 bg-stone-50">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="sticky top-[52px] lg:top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: back arrow */}
          <button onClick={() => navigate(-1)} aria-label="Volver" className="p-2 -ml-2 rounded-full transition-opacity text-stone-950 min-w-[44px] min-h-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Center: title */}
          <h1 className="font-semibold text-stone-950 text-base">
            {t('notif_center.title', 'Notificaciones')}
          </h1>

          {/* Right: Limpiar | Leído */}
          <div className="flex items-center gap-1">
            <button onClick={handleClearAll} className="text-xs px-2 py-1 transition-colors text-stone-500 bg-transparent border-none cursor-pointer" aria-label={t('notif_center.clear_all', 'Limpiar')}>
              {t('notif_center.clear', 'Limpiar')}
            </button>
            <span className="text-stone-200 text-xs">|</span>
            <button onClick={() => { markAll(); trackEvent('notifications_mark_all_read', { count: unreadCount }); }} className="text-xs px-2 py-1 transition-colors text-stone-500 bg-transparent border-none cursor-pointer" aria-label={t('notif_center.mark_all_read', 'Marcar todo como leido')}>
              {t('notif_center.read', 'Leido')}
            </button>
          </div>
        </div>

        {/* Category tabs (dynamic) */}
        <div className="flex border-b border-stone-200 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(tab => {
          const isActive = activeTab === tab.key;
          const tabUnread = unreadByTab[tab.key] || 0;
          return <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative flex-1 py-3 min-h-[44px] transition-colors text-[13px] bg-transparent border-none border-b-2 cursor-pointer whitespace-nowrap px-3 ${isActive ? 'font-semibold text-stone-950 border-stone-950' : 'font-normal text-stone-500 border-transparent'}`}>
                {t(tab.labelKey, tab.fallback)}
                {tabUnread > 0 && !isActive && <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-stone-950 text-white text-[10px] font-bold px-1">
                    {tabUnread > 99 ? '99+' : tabUnread}
                  </span>}
              </button>;
        })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {isLoading ? <div>
          {Array.from({
        length: 6
      }).map((_, i) => <NotifSkeleton key={i} />)}
        </div> : groupedItems.length === 0 ? <EmptyState /> : <div>
          <AnimatePresence>
            {GROUP_ORDER.map(label => {
          const items = byDate[label];
          if (!items?.length) return null;
          return <div key={label}>
                  {/* Group header */}
                  <div className="px-4 pt-2.5 pb-1.5">
                    <span className="text-[13px] font-semibold text-stone-950">
                      {label}
                    </span>
                  </div>

                  {items.map((item, i) => <React.Fragment key={item.grouped ? `group-${item.type}-${item.entity_id}-${i}` : item.notif.notification_id || item.notif._id || i}>
                      {item.grouped ? <GroupedNotifRow group={item} onBatchRead={markBatch} /> : <NotifRow notif={item.notif} onRead={markRead} onDelete={deleteNotif} followedIds={followedIds} setFollowedIds={setFollowedIds} />}
                      {i < items.length - 1 && <div className="ml-[68px] mr-4 border-b border-stone-100" />}
                    </React.Fragment>)}
                </div>;
        })}
          </AnimatePresence>

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="py-6 flex justify-center">
            {isFetchingNextPage && <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-500" style={{
            animationDelay: `${i * 0.15}s`
          }} />)}
              </div>}
          </div>
        </div>}
    </div>;
}