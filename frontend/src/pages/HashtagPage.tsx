// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Hash, AlertTriangle, Image } from 'lucide-react';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const decodedTag = decodeURIComponent(tag || '');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['hashtag-posts', decodedTag],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get(`/posts?hashtag=${encodeURIComponent(decodedTag)}&skip=${pageParam}&limit=21`);
      const posts = res?.posts || res || [];
      return { posts, nextSkip: posts.length === 21 ? pageParam + 21 : undefined };
    },
    getNextPageParam: (last) => last.nextSkip,
    enabled: !!decodedTag,
  });

  const allPosts = data?.pages?.flatMap(p => p.posts) || [];
  const postCount = allPosts.length;

  // Infinite scroll sentinel
  const sentinelRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
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
        <button onClick={() => refetch()} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors">
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
              <p className="text-xs text-stone-500">{postCount} publicaciones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[975px] mx-auto px-4 py-4">
        {allPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Hash className="w-12 h-12 text-stone-300" />
            <p className="text-base font-semibold text-stone-950">Sin publicaciones</p>
            <p className="text-sm text-stone-500">Aún no hay publicaciones con #{decodedTag}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {allPosts.map((post, idx) => {
              const img = post.images?.[0] || post.thumbnail || post.media_url;
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
                  {/* Multi-image indicator */}
                  {(post.images?.length || 0) > 1 && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h12v12H4z" opacity="0.5" /><path d="M8 2h12v12H8z" />
                      </svg>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              );
            })}
          </div>
        )}

        {/* Sentinel */}
        {hasNextPage && <div ref={sentinelRef} className="h-20" />}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
