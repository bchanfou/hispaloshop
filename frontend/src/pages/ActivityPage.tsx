// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, MessageCircle, UserPlus, Bookmark,
  AlertTriangle, Clock, RefreshCw, Flame,
} from 'lucide-react';
import apiClient from '../services/api/client';

/* ── Filter config ── */

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'follows', label: 'Follows' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/* ── Activity type → filter mapping ── */

const ACTIVITY_TYPES: Record<string, FilterKey> = {
  like: 'likes',
  post_liked: 'likes',
  story_like: 'likes',
  comment: 'comments',
  post_commented: 'comments',
  story_reply: 'comments',
  follow: 'follows',
  new_follower: 'follows',
};

const SOCIAL_TYPES = new Set(Object.keys(ACTIVITY_TYPES));

/* ── Icon map ── */

const TYPE_ICON: Record<string, React.ElementType> = {
  like: Heart,
  post_liked: Heart,
  story_like: Flame,
  comment: MessageCircle,
  post_commented: MessageCircle,
  story_reply: MessageCircle,
  follow: UserPlus,
  new_follower: UserPlus,
};

/* ── Date grouping ── */

interface ActivityItem {
  _id?: string;
  id?: string;
  type: string;
  message?: string;
  title?: string;
  created_at: string;
  thumbnail?: string;
  image?: string;
  sender_avatar?: string;
}

function groupByDate(items: ActivityItem[]): [string, ActivityItem[]][] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, ActivityItem[]> = {
    'Hoy': [],
    'Ayer': [],
    'Esta semana': [],
    'Anterior': [],
  };

  items.forEach((item) => {
    const d = new Date(item.created_at);
    if (d >= today) groups['Hoy'].push(item);
    else if (d >= yesterday) groups['Ayer'].push(item);
    else if (d >= weekAgo) groups['Esta semana'].push(item);
    else groups['Anterior'].push(item);
  });

  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

/* ── Relative time ── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  const weeks = Math.floor(days / 7);
  return `${weeks} sem`;
}

/* ── Skeleton ── */

function ActivitySkeleton() {
  return (
    <div className="space-y-6 px-4 pt-4">
      {[0, 1, 2].map((g) => (
        <div key={g}>
          <div className="h-3 w-24 bg-stone-200 rounded-full mb-3 animate-pulse" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-stone-200 rounded-full animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-stone-100 rounded-full animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-100 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ── */

export default function ActivityPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', 'all', { page: 1 }],
    queryFn: () => apiClient.get('/notifications', { params: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  });

  // Extract notification items from paginated or flat response
  const rawItems: ActivityItem[] = useMemo(() => {
    if (!data) return [];
    // Infinite query shape: { pages: [...] }
    if (data.pages) {
      return data.pages.flatMap((p: any) => p.notifications || p.items || p.data || []);
    }
    // Flat response
    return data.notifications || data.items || data.data || (Array.isArray(data) ? data : []);
  }, [data]);

  // Filter to social/activity types only
  const activityItems = useMemo(() => {
    const social = rawItems.filter((item) => SOCIAL_TYPES.has(item.type));
    if (filter === 'all') return social;
    return social.filter((item) => ACTIVITY_TYPES[item.type] === filter);
  }, [rawItems, filter]);

  const grouped = useMemo(() => groupByDate(activityItems), [activityItems]);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200">
        <div className="max-w-[600px] mx-auto flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer hover:bg-stone-100 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={20} className="text-stone-950" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-bold text-stone-950 m-0">
            Tu actividad
          </h1>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto">
        {/* ── Filter pills ── */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Loading ── */}
        {isLoading && <ActivitySkeleton />}

        {/* ── Error ── */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-stone-400" />
            </div>
            <p className="text-[15px] font-semibold text-stone-950 mb-1">
              No se pudo cargar la actividad
            </p>
            <p className="text-[13px] text-stone-500 mb-4">
              Comprueba tu conexión e inténtalo de nuevo
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-950 text-white text-[13px] font-semibold border-none cursor-pointer hover:bg-stone-800 transition-colors"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && !isError && activityItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Clock size={24} className="text-stone-400" />
            </div>
            <p className="text-[15px] font-semibold text-stone-950 mb-1">
              Sin actividad reciente
            </p>
            <p className="text-[13px] text-stone-500">
              Tu actividad aparecerá aquí
            </p>
          </div>
        )}

        {/* ── Timeline ── */}
        {!isLoading && !isError && grouped.length > 0 && (
          <div className="px-4 pb-24 space-y-6">
            {grouped.map(([label, items]) => (
              <section key={label}>
                <h2 className="text-[12px] font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  {label}
                </h2>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = TYPE_ICON[item.type] || Heart;
                    const thumb = item.thumbnail || item.image || null;
                    const key = item._id || item.id || item.created_at;

                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 py-3 rounded-xl hover:bg-stone-50 transition-colors px-2 -mx-2"
                      >
                        {/* Type icon */}
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-stone-600" />
                        </div>

                        {/* Description + time */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-stone-950 m-0 leading-snug line-clamp-2">
                            {item.message || item.title || item.type}
                          </p>
                          <p className="text-[12px] text-stone-400 mt-0.5 mb-0">
                            {timeAgo(item.created_at)}
                          </p>
                        </div>

                        {/* Thumbnail */}
                        {thumb && (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover shrink-0 bg-stone-100"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
