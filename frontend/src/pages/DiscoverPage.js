import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Flame, Loader2, Clapperboard, Newspaper, Heart, Play, UserRound } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { API } from '../utils/api';
import { sanitizeImageUrl } from '../utils/helpers';


function toDateValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizePost(post) {
  return {
    id: post.post_id || post.id,
    type: 'feed',
    created_at: post.created_at,
    user_id: post.user_id,
    user_name: post.user_name || post.user?.full_name || 'Usuario',
    user_profile_image: sanitizeImageUrl(post.user_profile_image || post.user?.avatar_url),
    caption: post.caption || post.content || '',
    media_url: sanitizeImageUrl(post.image_url || post.media_url || post.media?.[0]?.url),
    likes_count: post.likes_count || post.engagement?.likes_count || 0,
    comments_count: post.comments_count || post.engagement?.comments_count || 0,
    views_count: 0,
  };
}

function normalizeReel(reel) {
  return {
    id: reel.id || reel.post_id,
    type: 'reel',
    created_at: reel.created_at,
    user_id: reel.user_id || reel.user?.id,
    user_name: reel.user_name || reel.user?.full_name || 'Usuario',
    user_profile_image: sanitizeImageUrl(reel.user_profile_image || reel.user?.avatar_url),
    caption: reel.caption || reel.content || '',
    media_url: sanitizeImageUrl(reel.video_url || reel.media?.[0]?.url),
    thumbnail_url: sanitizeImageUrl(reel.thumbnail_url || reel.media?.[0]?.thumbnail_url || reel.media?.[0]?.url),
    likes_count: reel.likes_count || reel.engagement?.likes_count || 0,
    comments_count: reel.comments_count || reel.engagement?.comments_count || 0,
    views_count: reel.views_unique || reel.views_count_unique || reel.views_count || 0,
  };
}

function getList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export default function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'reels' ? 'reels' : 'feeds';
  const discoverScope = searchParams.get('scope') || '';
  const searchQuery = (searchParams.get('search') || '').trim();
  const profileSearchMode = discoverScope === 'profiles' && searchQuery.length > 0;
  const textSearchMode = !profileSearchMode && searchQuery.length > 0;

  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [reels, setReels] = useState([]);
  const [trending, setTrending] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    // Keep search params intact while using profile/text search.
    if (profileSearchMode || textSearchMode) return;
    setSearchParams(tab === 'reels' ? { tab: 'reels' } : {});
  }, [tab, setSearchParams, profileSearchMode, textSearchMode]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (profileSearchMode) {
          const res = await axios.get(
            `${API}/discover/profiles?search=${encodeURIComponent(searchQuery)}&limit=24`,
            { withCredentials: true }
          );
          const remoteProfiles = res.data?.profiles || [];
          if (remoteProfiles.length > 0) {
            setProfiles(remoteProfiles);
          } else {
            const needle = searchQuery.toLowerCase();
            setProfiles(
              []
                .filter((u) => `${u.name || ''} ${u.username || ''}`.toLowerCase().includes(needle))
                .map((u) => ({
                  user_id: u.user_id,
                  name: u.name,
                  role: u.role,
                  profile_image: u.profile_image,
                }))
            );
          }
          setFeeds([]);
          setReels([]);
          setTrending([]);
          return;
        }

        const [feedRes, postsRes, reelsRes, trendingRes] = await Promise.allSettled([
          axios.get(`${API}/feed?skip=0&limit=180&scope=global`, { withCredentials: true }),
          axios.get(`${API}/posts?skip=0&limit=180`, { withCredentials: true }),
          axios.get(`${API}/reels?limit=180`, { withCredentials: true }),
          axios.get(`${API}/feed/trending?limit=16`, { withCredentials: true }),
        ]);

        const feedItems = feedRes.status === 'fulfilled' ? getList(feedRes.value.data).map(normalizePost) : [];
        const directPostItems = postsRes.status === 'fulfilled' ? getList(postsRes.value.data).map(normalizePost) : [];
        const reelItems = reelsRes.status === 'fulfilled' ? getList(reelsRes.value.data).map(normalizeReel) : [];
        const trendingPostItems = trendingRes.status === 'fulfilled' ? getList(trendingRes.value.data).map(normalizePost) : [];

        const feedMap = new Map();
        [...feedItems, ...directPostItems].forEach((item) => {
          if (!item.id) return;
          if (!feedMap.has(item.id)) feedMap.set(item.id, item);
        });
        const mergedFeeds = Array.from(feedMap.values()).sort((a, b) => toDateValue(b.created_at) - toDateValue(a.created_at));

        const trendingMap = new Map();
        [...trendingPostItems, ...reelItems].forEach((item) => {
          if (!item.id) return;
          const key = `${item.type}:${item.id}`;
          if (!trendingMap.has(key)) trendingMap.set(key, item);
        });

        const globalTrending = Array.from(trendingMap.values())
          .sort((a, b) => ((b.likes_count + b.views_count * 2 + b.comments_count) - (a.likes_count + a.views_count * 2 + a.comments_count)))
          .slice(0, 16);

        const demoFeed = [];
        const demoReel = [];
        const safeFeeds = mergedFeeds.length > 0 ? mergedFeeds : demoFeed;
        const safeReels = reelItems.length > 0 ? reelItems : demoReel;
        const safeTrending = globalTrending.length > 0
          ? globalTrending
          : [...demoFeed, ...demoReel]
              .sort((a, b) => ((b.likes_count + b.views_count * 2 + b.comments_count) - (a.likes_count + a.views_count * 2 + a.comments_count)))
              .slice(0, 16);

        setFeeds(safeFeeds);
        setReels(safeReels.sort((a, b) => toDateValue(b.created_at) - toDateValue(a.created_at)));
        setTrending(safeTrending);
        setProfiles([]);
      } catch (error) {
        if (profileSearchMode) {
          const needle = searchQuery.toLowerCase();
          setProfiles(
            []
              .filter((u) => `${u.name || ''} ${u.username || ''}`.toLowerCase().includes(needle))
              .map((u) => ({
                user_id: u.user_id,
                name: u.name,
                role: u.role,
                profile_image: u.profile_image,
              }))
          );
        } else {
          const demoFeed = [];
          const demoReel = [];
          setFeeds(demoFeed);
          setReels(demoReel.sort((a, b) => toDateValue(b.created_at) - toDateValue(a.created_at)));
          setTrending([...demoFeed, ...demoReel].slice(0, 16));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileSearchMode, searchQuery]);

  const filteredFeeds = useMemo(() => {
    if (!textSearchMode) return feeds;
    const needle = searchQuery.toLowerCase();
    return feeds.filter((item) => {
      const text = `${item.caption || ''} ${item.user_name || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [feeds, textSearchMode, searchQuery]);

  const filteredReels = useMemo(() => {
    if (!textSearchMode) return reels;
    const needle = searchQuery.toLowerCase();
    return reels.filter((item) => {
      const text = `${item.caption || ''} ${item.user_name || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [reels, textSearchMode, searchQuery]);

  const activeItems = useMemo(
    () => (tab === 'reels' ? filteredReels : filteredFeeds),
    [tab, filteredReels, filteredFeeds]
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-20">
        {!profileSearchMode && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-[#1C1C1C]">
                {textSearchMode ? `Resultados para "${searchQuery}"` : 'Trending global'}
              </h2>
            </div>
            {!textSearchMode && <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {trending.map((item) => (
                <Link
                  key={`${item.type}:${item.id}`}
                  to={item.user_id ? `/user/${item.user_id}` : '/discover'}
                  className="shrink-0 w-28"
                >
                  <div className="w-28 h-40 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 relative">
                    {item.type === 'reel' ? (
                      item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.user_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400"><Clapperboard className="w-5 h-5" /></div>
                      )
                    ) : item.media_url ? (
                      <img src={item.media_url} alt={item.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400"><Newspaper className="w-5 h-5" /></div>
                    )}
                    <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-black/65 text-white">
                      {item.type === 'reel' ? 'REEL' : 'FEED'}
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-white">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60">
                        <Heart className="w-3 h-3" /> {item.likes_count}
                      </span>
                      {item.views_count > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60">
                          <Play className="w-3 h-3" /> {item.views_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-stone-600 truncate">{item.user_name}</div>
                </Link>
              ))}
            </div>}
          </div>
        )}

        {!profileSearchMode && (
          <div className="sticky top-[56px] md:top-[64px] z-20 bg-[#FAF7F2]/95 backdrop-blur pb-3 pt-1">
            <div className="inline-flex p-1 rounded-full bg-white border border-stone-200">
              <button
                onClick={() => setTab('feeds')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'feeds' ? 'bg-[#1C1C1C] text-white' : 'text-stone-600'}`}
              >
                Feeds
              </button>
              <button
                onClick={() => setTab('reels')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'reels' ? 'bg-[#1C1C1C] text-white' : 'text-stone-600'}`}
              >
                Reels
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-stone-500" /></div>
        ) : profileSearchMode ? (
          profiles.length === 0 ? (
            <div className="py-20 text-center text-stone-500 text-sm">Sin perfiles para "{searchQuery}"</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {profiles.map((profile) => (
                <Link
                  key={profile.user_id}
                  to={`/user/${profile.user_id}`}
                  className="bg-white rounded-2xl border border-stone-200 p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 mb-2">
                    {profile.profile_image ? (
                      <img src={profile.profile_image} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <UserRound className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#1C1C1C] truncate">{profile.name || 'Usuario'}</p>
                  <p className="text-xs text-stone-500 mt-0.5 capitalize">
                    {profile.role === 'producer' ? 'Productor' : profile.role === 'importer' ? 'Importador' : profile.role}
                  </p>
                </Link>
              ))}
            </div>
          )
        ) : activeItems.length === 0 ? (
          <div className="py-20 text-center text-stone-500 text-sm">Sin contenido</div>
        ) : tab === 'reels' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeItems.map((item) => {
              const profileHref = item.user_id ? `/user/${item.user_id}` : '/discover';
              return (
                <div key={item.id} className="block">
                  <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[9/14] relative">
                    {item.media_url ? (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400"><Clapperboard className="w-5 h-5" /></div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 text-[10px] text-white px-1.5 py-0.5 rounded-full bg-black/60">
                      <Play className="w-3 h-3" /> {item.views_count || 0}
                    </div>
                  </div>
                  <Link to={profileHref} className="mt-1 block text-[11px] text-stone-600 truncate hover:text-stone-800">
                    {item.user_name}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeItems.map((item) => (
              <Link key={item.id} to={item.user_id ? `/user/${item.user_id}` : '/discover'} className="block bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-sm transition-shadow">
                {item.media_url ? (
                  <div className="aspect-video bg-stone-100">
                    <img src={item.media_url} alt={item.user_name} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                {item.caption ? <p className="px-3 py-2 text-sm text-stone-800 line-clamp-2">{item.caption}</p> : null}
                <div className="px-3 pb-2 text-xs text-stone-500 inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {item.likes_count}</span>
                  <span>{item.comments_count} 💬</span>
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
