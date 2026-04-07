import React, { useMemo, useState, useCallback, useRef, Component } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';
import FeedSkeleton from './FeedSkeleton';
import { useForYouFeed, useLikePost, feedKeys } from '../../features/feed/queries';
import { AlertCircle, Check } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import PullIndicator from '../../components/ui/PullIndicator';

/**
 * ForYouFeed — Feed "Para ti" puramente social
 * 
 * Según ROADMAP 1.11:
 * - Solo contenido social: Posts, Reels
 * - Sin widgets, sin injections, sin weekly summaries
 * - Sin SponsoredProductCard inline (se moverá a ads sutiles cada 20 items en V2)
 * - Infinite scroll optimizado
 */

/** Lightweight error boundary that silently hides a single broken feed item. */
class FeedItemBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.warn('[ForYouFeed] Item render error:', err); }
  render() { return this.state.hasError ? null : this.props.children; }
}

export default function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedQuery = useForYouFeed();
  const likeMutation = useLikePost();
  const { trigger } = useHaptics();

  // Flatten and dedupe posts
  const allPosts = useMemo(() => {
    const raw = (feedQuery.data?.pages || []).flatMap((page) => page?.items || []).filter((p) => p?.id);
    const seen = new Set();
    return raw.filter((p) => {
      const key = String(p.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feedQuery.data]);

  // Pre-compute next reel video URL for each index
  const nextReelUrlByIndex = useMemo(() => {
    const map = {};
    for (let i = allPosts.length - 2; i >= 0; i--) {
      const next = allPosts.slice(i + 1).find(p => p.video_url || p.type === 'reel');
      map[i] = next?.video_url || null;
    }
    return map;
  }, [allPosts]);

  const hasMore = Boolean(feedQuery.hasNextPage);
  const isInitialLoading = feedQuery.isLoading;
  const error = feedQuery.error;

  // Post detail modal state
  const [modalPost, setModalPost] = useState(null);
  const handleCloseModal = useCallback(() => setModalPost(null), []);

  const virtuosoRef = useRef(null);

  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await queryClient.refetchQueries({ queryKey: feedKeys.forYou, type: 'active' }); }
  );

  const handleLike = useCallback(async (postId) => {
    const pages = queryClient.getQueryData(feedKeys.forYou)?.pages || [];
    let currentLiked = false;
    for (const page of pages) {
      const found = (page?.items || []).find(
        (p) => String(p.id) === String(postId) || String(p.post_id) === String(postId)
      );
      if (found) {
        currentLiked = Boolean(found.is_liked || found.liked);
        break;
      }
    }

    try {
      await likeMutation.mutateAsync({ postId, liked: currentLiked });
    } catch {
      // Query layer handles rollback
    }
  }, [likeMutation, queryClient]);

  const handleComment = useCallback((postId) => {
    const post = allPosts.find((p) => p.id === postId);
    if (post) setModalPost(post);
    else navigate(`/posts/${postId}`);
  }, [allPosts, navigate]);

  const handleShare = useCallback(() => {}, []);

  // "New content" pill
  const showNewContentPill = feedQuery.isFetching && !feedQuery.isFetchingNextPage && allPosts.length > 0;

  const handleNewContentClick = useCallback(() => {
    trigger('light');
    virtuosoRef.current?.scrollToIndex({ index: 0, behavior: 'smooth' });
    queryClient.invalidateQueries({ queryKey: feedKeys.forYou });
  }, [queryClient, trigger]);

  if (error) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-stone-400" />
        <p className="text-[14px] font-medium text-stone-700">
          {t('feed.error', 'Error al cargar el feed')}
        </p>
        <p className="mt-1 text-[13px] text-stone-400">
          {t('feed.errorDescription', 'No hemos podido cargar las publicaciones ahora mismo.')}
        </p>
        <button
          type="button"
          onClick={() => feedQuery.refetch()}
          className="mt-5 rounded-full bg-stone-950 px-6 py-3 min-h-[44px] text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:scale-95"
        >
          {t('common.retry', 'Reintentar')}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="relative overscroll-none"
      {...handlers}
    >
      {/* "New content available" floating pill */}
      <AnimatePresence>
        {showNewContentPill && (
          <motion.button
            key="new-content-pill"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={handleNewContentClick}
            type="button"
            className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-stone-950 text-white text-xs font-semibold px-5 py-3 min-h-[44px] rounded-full shadow-lg cursor-pointer border-none"
            aria-live="polite"
            aria-label="Cargar nuevo contenido"
          >
            {t('feed.newContent', 'Nuevo contenido')}
          </motion.button>
        )}
      </AnimatePresence>

      <PullIndicator progress={progress} isRefreshing={refreshing} />

      {isInitialLoading && allPosts.length === 0 ? (
        <div aria-busy="true" aria-label="Cargando publicaciones">
          <FeedSkeleton count={3} />
        </div>
      ) : allPosts.length === 0 ? (
        <div className="px-4 py-8 space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-950">
              {t('feed.welcome', 'Bienvenido a HispaloShop')}
            </p>
            <p className="text-sm text-stone-500 mt-1">
              {t('feed.followToSee', 'Sigue productores para ver su contenido aquí')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="w-full py-3 bg-stone-950 text-white rounded-full text-sm font-semibold"
          >
            {t('feed.exploreProducts', 'Explorar productos')}
          </button>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={allPosts}
          defaultItemHeight={460}
          itemContent={(index, post) => {
            // ROADMAP 1.11: Eliminadas inyecciones de:
            // - WeeklySummaryCard
            // - SuggestedUsersCard
            // - SponsoredProductCard inline
            // - FeedRecipeCard
            // 
            // Solo Posts y Reels puros, sin widgets

            const isReel = post.video_url || post.type === 'reel';
            const shouldAnimate = index < 5;
            const animDelay = shouldAnimate ? index * 0.05 : 0;

            const motionProps = shouldAnimate
              ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0, 0, 0.2, 1], delay: animDelay } }
              : {};

            // Build safe user object
            const safeUser = (post.user && typeof post.user === 'object')
              ? { ...post.user, has_story: post.user_has_story ?? post.user.has_story ?? false }
              : {
                  id: post.user_id,
                  name: post.user_name || post.author_name || 'Usuario',
                  username: post.username || post.author_username,
                  avatar: post.user_profile_image || post.author_avatar,
                  avatar_url: post.user_profile_image || post.author_avatar,
                  verified: post.user_verified ?? false,
                  has_story: post.user_has_story ?? false,
                };

            if (isReel) {
              return (
                <FeedItemBoundary>
                  <div className="mb-2">
                    <motion.div {...motionProps}>
                      <ReelCard
                        reel={{
                          id: post.id,
                          post_id: post.id,
                          user: safeUser,
                          videoUrl: post.video_url || post.media?.[0]?.url,
                          video_url: post.video_url || post.media?.[0]?.url,
                          thumbnail: post.thumbnail || post.image_url,
                          caption: post.caption || '',
                          likes_count: post.likes_count || 0,
                          likes: post.likes_count || 0,
                          liked: post.is_liked || post.liked || false,
                          is_saved: post.is_saved ?? post.saved ?? false,
                          saved: post.is_saved ?? post.saved ?? false,
                          comments_count: post.comments_count || 0,
                          comments: post.comments_count || 0,
                          shares: post.shares_count || 0,
                          productTag: post.product_tag,
                          products: Array.isArray(post.products) ? post.products : Array.isArray(post.tagged_products) ? post.tagged_products : [],
                          created_at: post.created_at || null,
                          timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                          liked_by_sample: post.liked_by_sample || post.liked_by || null,
                          is_following: post.is_following ?? safeUser?.is_followed_by_me ?? false,
                        }}
                        embedded
                        onLike={() => handleLike(post.id)}
                        onComment={() => handleComment(post.id)}
                        onShare={() => handleShare(post.id)}
                        onExpand={() => navigate(`/reels?id=${post.id}`)}
                        priority={index < 2}
                        nextVideoUrl={nextReelUrlByIndex[index]}
                      />
                    </motion.div>
                  </div>
                </FeedItemBoundary>
              );
            }

            return (
              <FeedItemBoundary>
                <div className="mb-2">
                  <motion.div {...motionProps}>
                    <PostCard
                      post={{
                        id: post.id,
                        user: safeUser,
                        user_has_story: post.user_has_story ?? false,
                        media: post.media || (post.image_url ? [{ url: post.image_url, ratio: '1:1' }] : post.images?.map(url => ({ url, ratio: '1:1' })) || []),
                        caption: post.caption || '',
                        likes: post.likes_count || 0,
                        liked: post.is_liked || post.liked || false,
                        is_saved: post.is_saved ?? post.saved ?? false,
                        saved: post.is_saved ?? post.saved ?? false,
                        comments: post.comments_count || 0,
                        productTag: post.product_tag,
                        tagged_products: post.tagged_products,
                        products: post.products,
                        timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                      }}
                      onLike={() => handleLike(post.id)}
                      onComment={() => handleComment(post.id)}
                      onShare={() => handleShare(post.id)}
                      priority={index < 2}
                    />
                  </motion.div>
                </div>
              </FeedItemBoundary>
            );
          }}
          endReached={() => {
            if (hasMore && !feedQuery.isFetchingNextPage) {
              feedQuery.fetchNextPage();
            }
          }}
          overscan={3}
          increaseViewportBy={{ top: 0, bottom: 1500 }}
          style={{ height: 'calc(100vh - 52px - 64px - 48px)' }} // Ajustado por tabs
          components={{
            Footer: () => {
              if (feedQuery.isFetchingNextPage) return <FeedSkeleton count={2} />;
              if (!hasMore && allPosts.length > 0) return (
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-stone-200">
                    <Check className="h-7 w-7 text-stone-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-stone-950">
                    {t('feed.caughtUp.title', 'Estás al día')}
                  </p>
                  <p className="text-[13px] text-stone-400">
                    {t('feed.caughtUp.description', 'Has visto todas las publicaciones nuevas')}
                  </p>
                </div>
              );
              return null;
            },
          }}
        />
      )}

      {/* Post detail modal overlay */}
      {modalPost && (
        <PostDetailModal
          postId={modalPost.id || modalPost.post_id}
          post={modalPost}
          onClose={handleCloseModal}
        />
      )}
    </motion.div>
  );
}
