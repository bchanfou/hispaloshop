import BackButton from '../components/BackButton';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Search, CalendarClock, Loader2, Clapperboard, Image as ImageIcon } from 'lucide-react';
import { Input } from '../components/ui/input';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { API } from '../utils/api';
import { sanitizeImageUrl } from '../utils/helpers';

function toDateValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizePost(post) {
  const mediaType = post.media_type || (post.is_reel ? 'video' : 'image');
  const mediaUrl = sanitizeImageUrl(post.video_url || post.image_url || post.thumbnail_url || post.media_url);
  return {
    id: post.post_id || post.id,
    type: post.is_reel || mediaType === 'video' ? 'reel' : 'post',
    created_at: post.created_at,
    user_id: post.user_id,
    user_name: post.user_name || 'Usuario',
    user_profile_image: sanitizeImageUrl(post.user_profile_image),
    caption: post.caption || '',
    media_url: mediaUrl,
    likes_count: post.likes_count || 0,
    comments_count: post.comments_count || 0,
  };
}

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);

  const rawTab = searchParams.get('tab') || 'all';
  const tab = rawTab === 'reels' ? 'reel' : rawTab;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [feedRes, reelsRes] = await Promise.allSettled([
          axios.get(`${API}/feed?skip=0&limit=120`, { withCredentials: true }),
          axios.get(`${API}/reels?limit=120`, { withCredentials: true }),
        ]);

        const feedPosts = feedRes.status === 'fulfilled' ? (feedRes.value.data?.posts || []) : [];
        const reels = reelsRes.status === 'fulfilled' ? (reelsRes.value.data?.items || reelsRes.value.data || []) : [];

        const merged = [
          ...feedPosts.map(normalizePost),
          ...reels.map((reel) =>
            normalizePost({
              ...reel,
              post_id: reel.post_id || reel.id,
              is_reel: true,
              video_url: reel.video_url || reel.media?.[0]?.url,
              thumbnail_url: reel.thumbnail_url || reel.media?.[0]?.thumbnail_url,
              user_name: reel.user_name || reel.user?.full_name,
              user_profile_image: reel.user_profile_image || reel.user?.avatar_url,
              caption: reel.caption || reel.content || '',
            })
          ),
        ];

        const uniqueMap = new Map();
        merged.forEach((item) => {
          if (!item.id) return;
          if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
        });

        const sorted = Array.from(uniqueMap.values()).sort((a, b) => toDateValue(b.created_at) - toDateValue(a.created_at));
        setItems(sorted);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const tabMatch = tab === 'all' || item.type === tab;
      if (!tabMatch) return false;
      if (!normalizedQuery) return true;
      return (
        item.user_name?.toLowerCase().includes(normalizedQuery) ||
        item.caption?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [items, tab, query]);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
        <BackButton />

        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-2xl font-semibold text-[#1C1C1C]">Explorar</h1>
          <span className="text-xs text-[#7A7A7A] inline-flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Ordenado por fecha de subida
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 rounded-full border-2 border-stone-200 focus:border-[#2D5A27] text-sm"
          />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { key: 'all', label: 'Todo' },
            { key: 'reel', label: 'Reels' },
            { key: 'post', label: 'Posts' },
          ].map((f) => {
            const active = (f.key === 'all' && tab === 'all') || (f.key !== 'all' && tab === f.key);
            return (
              <button
                key={f.key}
                onClick={() => setSearchParams(f.key === 'all' ? {} : { tab: f.key === 'reel' ? 'reels' : f.key })}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active ? 'bg-[#1C1C1C] text-white' : 'bg-white border border-stone-200 text-text-secondary'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7A7A7A]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-[#1C1C1C] mb-2">No hay contenido para mostrar</h3>
            <p className="text-[#7A7A7A]">Prueba con otro filtro o búsqueda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <Link
                key={item.id}
                to={`/user/${item.user_id}`}
                className="block bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                    {item.user_profile_image ? (
                      <img src={item.user_profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm font-bold">
                        {(item.user_name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1C] truncate">{item.user_name}</p>
                    <p className="text-xs text-[#7A7A7A]">{new Date(item.created_at).toLocaleString('es-ES')}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${item.type === 'reel' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {item.type === 'reel' ? 'REEL' : 'POST'}
                  </span>
                </div>

                {item.media_url ? (
                  <div className="aspect-video bg-stone-100">
                    {item.type === 'reel' ? (
                      <video src={item.media_url} muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs text-[#666] flex items-center gap-2">
                      {item.type === 'reel' ? <Clapperboard className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      Publicación sin media
                    </div>
                  </div>
                )}

                {item.caption && <p className="px-4 py-3 text-sm text-[#333] line-clamp-2">{item.caption}</p>}

                <div className="px-4 pb-4 text-xs text-[#7A7A7A]">
                  {item.likes_count} me gusta · {item.comments_count} comentarios
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
