// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Hash, AlertTriangle, Image, Play, ChefHat, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'reels', label: 'Reels' },
  { id: 'recipes', label: 'Recetas' },
];

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const decodedTag = decodeURIComponent(tag || '');
  const [activeTab, setActiveTab] = useState('posts');

  // ── Posts query ──
  const postsQuery = useInfiniteQuery({
    queryKey: ['hashtag-posts', decodedTag],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get(`/posts?hashtag=${encodeURIComponent(decodedTag)}&skip=${pageParam}&limit=21`);
      const posts = res?.posts || res || [];
      return { posts, nextSkip: posts.length === 21 ? pageParam + 21 : undefined };
    },
    getNextPageParam: (last) => last.nextSkip,
    enabled: !!decodedTag,
  });

  // ── Reels query ──
  const reelsQuery = useInfiniteQuery({
    queryKey: ['hashtag-reels', decodedTag],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get(`/reels?hashtag=${encodeURIComponent(decodedTag)}&skip=${pageParam}&limit=21`);
      const reels = res?.reels || res?.items || res || [];
      return { reels, nextSkip: reels.length === 21 ? pageParam + 21 : undefined };
    },
    getNextPageParam: (last) => last.nextSkip,
    enabled: !!decodedTag && activeTab === 'reels',
  });

  // ── Recipes query ──
  const recipesQuery = useQuery({
    queryKey: ['hashtag-recipes', decodedTag],
    queryFn: async () => {
      const res = await apiClient.get(`/recipes?hashtag=${encodeURIComponent(decodedTag)}&limit=30`);
      return Array.isArray(res) ? res : res?.recipes || res?.items || [];
    },
    enabled: !!decodedTag && activeTab === 'recipes',
  });

  const allPosts = postsQuery.data?.pages?.flatMap(p => p.posts) || [];
  const allReels = reelsQuery.data?.pages?.flatMap(p => p.reels) || [];
  const allRecipes = recipesQuery.data || [];

  const totalCount = allPosts.length;

  // Infinite scroll sentinel for posts — stable ref, reads latest state via closure refs
  const postsHasNextPage = postsQuery.hasNextPage;
  const postsIsFetching = postsQuery.isFetchingNextPage;
  const postsFetchNext = postsQuery.fetchNextPage;
  const postsSentinelRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && postsHasNextPage && !postsIsFetching) postsFetchNext();
    }, { threshold: 0.5 });
    observer.observe(node);
    // Callback ref cleanup (React 19+); in earlier React this is ignored but harmless
    return () => observer.disconnect();
  }, [postsHasNextPage, postsIsFetching, postsFetchNext]);

  // Infinite scroll sentinel for reels
  const reelsHasNextPage = reelsQuery.hasNextPage;
  const reelsIsFetching = reelsQuery.isFetchingNextPage;
  const reelsFetchNext = reelsQuery.fetchNextPage;
  const reelsSentinelRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && reelsHasNextPage && !reelsIsFetching) reelsFetchNext();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reelsHasNextPage, reelsIsFetching, reelsFetchNext]);

  const isInitialLoading = postsQuery.isLoading;
  const isError = postsQuery.isError;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-100 px-4 py-3">
          <div className="max-w-[975px] mx-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
            <div className="h-5 w-32 rounded-xl bg-stone-100 animate-pulse" />
          </div>
        </div>
        <div className="max-w-[975px] mx-auto px-4 py-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-sm bg-stone-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-8">
        <AlertTriangle className="w-10 h-10 text-stone-300" />
        <p className="text-base font-semibold text-stone-950">Error al cargar</p>
        <p className="text-sm text-stone-500 text-center">Comprueba tu conexión e inténtalo de nuevo</p>
        <button onClick={() => postsQuery.refetch()} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO title={`#${decodedTag} — HispaloShop`} description={`Publicaciones con #${decodedTag}`} />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="max-w-[975px] mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-stone-950" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
              <Hash className="w-5 h-5 text-stone-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-stone-950 truncate">#{decodedTag}</h1>
              <p className="text-xs text-stone-500">{totalCount > 0 ? `${totalCount}${postsQuery.hasNextPage ? '+' : ''} publicaciones` : 'Publicaciones'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[975px] mx-auto flex px-4">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-2.5 text-[13px] font-semibold text-center border-none bg-transparent cursor-pointer transition-colors ${
                  isActive ? 'text-stone-950' : 'text-stone-400'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="hashtag-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950"
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[975px] mx-auto px-4 py-4">

        {/* ── Posts tab ── */}
        {activeTab === 'posts' && (
          <>
            {allPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Hash className="w-12 h-12 text-stone-300" />
                <p className="text-base font-semibold text-stone-950">Sin publicaciones</p>
                <p className="text-sm text-stone-500">Aún no hay publicaciones con #{decodedTag}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {allPosts.map((post, idx) => {
                  const img = post.image_url || post.media?.[0]?.url || post.images?.[0];
                  return (
                    <button
                      key={post.post_id || post.id || idx}
                      onClick={() => navigate(`/posts/${post.post_id || post.id}`)}
                      className="relative aspect-square bg-stone-100 overflow-hidden group cursor-pointer border-none p-0"
                    >
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-stone-300" />
                        </div>
                      )}
                      {(post.images?.length || 0) > 1 && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 6h12v12H4z" opacity="0.5" /><path d="M8 2h12v12H8z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
            {postsQuery.hasNextPage && <div ref={postsSentinelRef} className="h-20" />}
            {postsQuery.isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {/* ── Reels tab ── */}
        {activeTab === 'reels' && (
          <>
            {reelsQuery.isLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-[9/16] rounded-sm bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : allReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Play className="w-12 h-12 text-stone-300" />
                <p className="text-base font-semibold text-stone-950">Sin reels</p>
                <p className="text-sm text-stone-500">Aún no hay reels con #{decodedTag}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {allReels.map((reel, idx) => {
                  const thumb = reel.thumbnail || reel.thumbnail_url || reel.cover_image;
                  const reelId = reel.reel_id || reel.id || reel.post_id;
                  if (!reelId) return null;
                  return (
                    <button
                      key={reelId}
                      onClick={() => navigate(`/posts/${reelId}`)}
                      className="relative aspect-[9/16] bg-stone-100 overflow-hidden group cursor-pointer border-none p-0"
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-900">
                          <Play className="w-8 h-8 text-stone-500" />
                        </div>
                      )}
                      {/* Play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Play size={24} className="text-white drop-shadow-lg" fill="white" />
                      </div>
                      {/* Views count */}
                      {(reel.views_count || reel.views || reel.view_count) > 0 && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[10px] text-white font-semibold drop-shadow-md">
                          <Play size={10} fill="white" />
                          {(() => {
                            const v = reel.views_count || reel.views || reel.view_count;
                            return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
                          })()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
            {reelsQuery.hasNextPage && <div ref={reelsSentinelRef} className="h-20" />}
            {reelsQuery.isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {/* ── Recipes tab ── */}
        {activeTab === 'recipes' && (
          <>
            {recipesQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] rounded-2xl bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : allRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <ChefHat className="w-12 h-12 text-stone-300" strokeWidth={1.5} />
                <p className="text-base font-semibold text-stone-950">Sin recetas</p>
                <p className="text-sm text-stone-500">Aún no hay recetas con #{decodedTag}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allRecipes.map((recipe, idx) => {
                  const recipeId = recipe.recipe_id || recipe.id;
                  const cookTime = recipe.cook_time || recipe.time_minutes || 0;
                  if (!recipeId) return null;
                  return (
                    <button
                      key={recipeId}
                      onClick={() => navigate(`/recipes/${recipeId}`)}
                      className="text-left bg-white overflow-hidden rounded-2xl border-none p-0 cursor-pointer"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                        {recipe.image_url ? (
                          <img src={recipe.image_url} alt={recipe.title || ''} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat size={32} className="text-stone-300" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 pt-2 pb-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-950">
                          {recipe.title}
                        </p>
                        {cookTime > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                            <Clock size={11} /> {cookTime} min
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
